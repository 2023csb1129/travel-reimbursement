/**
 * Test Utilities for Reimbursify
 * Provides helpers for API testing, database operations, and workflow validation
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Test user credentials
export const TEST_USERS = {
  admin: {
    email: "admin@iitropar.ac.in",
    password: "admin123",
    role: "ADMINISTRATOR",
  },
  submitter: {
    email: "user@iitropar.ac.in",
    password: "submitter123",
    role: "SUBMITTER",
  },
};

/**
 * Create a test trip
 */
export async function createTestTrip(userId: string) {
  return prisma.trip.create({
    data: {
      title: `Test Trip - ${Date.now()}`,
      startDate: new Date(),
      user: { connect: { id: userId } },
      purpose: "Test trip for validation",
      budgetHead: "TEST001",
      advanceDrawn: 5000,
      notes: "Automated test trip",
    },
  });
}

/**
 * Create a test expense
 */
export async function createTestExpense(tripId: string, userId: string) {
  return prisma.expense.create({
    data: {
      trip: { connect: { id: tripId } },
      submittedBy: { connect: { id: userId } },
      category: "Travel",
      expenseType: "Air",
      title: `Test Expense - ${Date.now()}`,
      amount: 10000,
      currency: "INR",
      paymentDate: new Date(),
      status: "DRAFT",
    },
  });
}

/**
 * Create a test form template
 */
export async function createTestFormTemplate(groupId: string, createdById: string) {
  return prisma.formTemplate.create({
    data: {
      title: `Test Form - ${Date.now()}`,
      description: "Automated test form",
      group: { connect: { id: groupId } },
      createdBy: { connect: { id: createdById } },
      templateSchema: JSON.stringify({
        fields: [
          { id: "test1", type: "text", label: "Test Field", required: true },
          {
            id: "test2",
            type: "select",
            label: "Test Select",
            options: ["Option 1", "Option 2"],
          },
        ],
      }),
      version: 1,
      isActive: true,
    },
  });
}

/**
 * Create a test submission
 */
export async function createTestSubmission(
  templateId: string,
  tripId: string,
  userId: string,
  groupId: string
) {
  return prisma.submission.create({
    data: {
      template: { connect: { id: templateId } },
      trip: { connect: { id: tripId } },
      user: { connect: { id: userId } },
      group: { connect: { id: groupId } },
      status: "DRAFT",
    },
  });
}

/**
 * Authenticate and get session token
 */
export async function authenticateTestUser(
  email: string,
  password: string
): Promise<{ sessionToken: string; userId: string } | null> {
  // In actual testing, this would call your auth endpoint
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.password) return null;

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) return null;

  return {
    sessionToken: `test_token_${user.id}`,
    userId: user.id,
  };
}

/**
 * Clean up test data
 */
export async function cleanupTestData() {
  // Delete in order to respect foreign key constraints
  await prisma.submission.deleteMany({
    where: {
      trip: {
        title: { contains: "Test Trip" },
      },
    },
  });

  await prisma.billFile.deleteMany({
    where: {
      expense: {
        title: { contains: "Test Expense" },
      },
    },
  });

  await prisma.expense.deleteMany({
    where: {
      title: { contains: "Test Expense" },
    },
  });

  await prisma.trip.deleteMany({
    where: {
      title: { contains: "Test Trip" },
    },
  });

  await prisma.formTemplate.deleteMany({
    where: {
      title: { contains: "Test Form" },
    },
  });
}

/**
 * Validate expense workflow
 */
export async function validateExpenseWorkflow(
  tripId: string,
  userId: string,
  groupId: string
): Promise<{
  success: boolean;
  errors: string[];
  data?: any;
}> {
  const errors: string[] = [];

  try {
    // 1. Verify trip exists
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      errors.push("Trip not found");
    }

    if (trip?.userId !== userId) {
      errors.push("Trip does not belong to user");
    }

    // 2. Create test expense
    const expense = await createTestExpense(tripId, userId);

    if (!expense) {
      errors.push("Failed to create expense");
    }

    // 3. Verify expense can be submitted
    const submittedExpense = await prisma.expense.update({
      where: { id: expense.id },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });

    if (submittedExpense.status !== "SUBMITTED") {
      errors.push("Failed to submit expense");
    }

    // 4. Verify expense appears in trip totals
    const expensesForTrip = await prisma.expense.findMany({
      where: { tripId },
    });

    const totalAmount = expensesForTrip.reduce((sum, e) => sum + e.amount, 0);

    if (totalAmount < expense.amount) {
      errors.push("Expense total calculation failed");
    }

    return {
      success: errors.length === 0,
      errors,
      data: {
        expense,
        submittedExpense,
        tripTotal: totalAmount,
      },
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Unknown error");
    return {
      success: false,
      errors,
    };
  }
}

/**
 * Validate submission workflow
 */
export async function validateSubmissionWorkflow(
  templateId: string,
  tripId: string,
  userId: string,
  groupId: string
): Promise<{
  success: boolean;
  errors: string[];
  data?: any;
}> {
  const errors: string[] = [];

  try {
    // 1. Create submission
    const submission = await createTestSubmission(
      templateId,
      tripId,
      userId,
      groupId
    );

    if (!submission) {
      errors.push("Failed to create submission");
    }

    // 2. Verify submission status is DRAFT
    if (submission?.status !== "DRAFT") {
      errors.push("Initial submission status should be DRAFT");
    }

    // 3. Submit the form
    const submittedForm = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: "SUBMITTED",
        submissionDate: new Date(),
      },
    });

    if (submittedForm.status !== "SUBMITTED") {
      errors.push("Failed to submit form");
    }

    // 4. Verify submission appears in user's submission list
    const userSubmissions = await prisma.submission.findMany({
      where: { userId },
    });

    const foundSubmission = userSubmissions.find((s) => s.id === submission.id);

    if (!foundSubmission) {
      errors.push("Submission not found in user's submission list");
    }

    return {
      success: errors.length === 0,
      errors,
      data: {
        submission,
        submittedForm,
        totalUserSubmissions: userSubmissions.length,
      },
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Unknown error");
    return {
      success: false,
      errors,
    };
  }
}

export default {
  TEST_USERS,
  createTestTrip,
  createTestExpense,
  createTestFormTemplate,
  createTestSubmission,
  authenticateTestUser,
  cleanupTestData,
  validateExpenseWorkflow,
  validateSubmissionWorkflow,
};
