/**
 * Workflow Testing Suite
 * Validates complete expense and submission workflows
 * Run: npm test or npx jest __tests__/workflows.test.ts
 */

import {
  createTestTrip,
  createTestExpense,
  createTestFormTemplate,
  validateExpenseWorkflow,
  validateSubmissionWorkflow,
  authenticateTestUser,
  cleanupTestData,
  TEST_USERS,
} from "@/lib/test-utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("Reimbursify Workflows", () => {
  let testUserId: string;
  let testGroupId: string;
  let testTripId: string;
  let testTemplateId: string;

  beforeAll(async () => {
    // Get test user
    const user = await prisma.user.findFirst({
      where: { email: TEST_USERS.submitter.email },
      include: { groupMemberships: true },
    });

    testUserId = user?.id || "";

    // Get test group from memberships
    if (user && user.groupMemberships.length > 0) {
      testGroupId = user.groupMemberships[0].groupId;
    } else {
      const group = await prisma.group.findFirst();
      testGroupId = group?.id || "";
    }
  });

  beforeEach(async () => {
    // Create fresh test data for each test
    if (testUserId) {
      const trip = await createTestTrip(testUserId);
      testTripId = trip.id;

      const template = await createTestFormTemplate(testGroupId, testUserId);
      testTemplateId = template.id;
    }
  });

  afterEach(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  describe("Expense Submission Workflow", () => {
    test("Should create a trip", async () => {
      const trip = await prisma.trip.findUnique({
        where: { id: testTripId },
      });

      expect(trip).toBeDefined();
      expect(trip?.title).toContain("Test Trip");
      expect(trip?.userId).toBe(testUserId);
    });

    test("Should create and submit an expense", async () => {
      const result = await validateExpenseWorkflow(testTripId, testUserId, testGroupId);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data?.expense).toBeDefined();
      expect(result.data?.submittedExpense.status).toBe("SUBMITTED");
    });

    test("Should calculate trip total expenses", async () => {
      // Create multiple expenses
      const expense1 = await createTestExpense(testTripId, testUserId);
      const expense2 = await createTestExpense(testTripId, testUserId);

      const expenses = await prisma.expense.findMany({
        where: { tripId: testTripId },
      });

      const total = expenses.reduce((sum, e) => sum + e.amount, 0);

      expect(total).toBe(expense1.amount + expense2.amount);
      expect(expenses).toHaveLength(2);
    });

    test("Should track expense status changes", async () => {
      const expense = await createTestExpense(testTripId, testUserId);

      // Draft -> Submitted
      const submitted = await prisma.expense.update({
        where: { id: expense.id },
        data: { status: "SUBMITTED", submittedAt: new Date() },
      });

      expect(submitted.status).toBe("SUBMITTED");

      // Submitted -> Approved
      const approved = await prisma.expense.update({
        where: { id: expense.id },
        data: { status: "APPROVED", approvedAt: new Date() },
      });

      expect(approved.status).toBe("APPROVED");
    });
  });

  describe("Form Submission Workflow", () => {
    test("Should create a form template", async () => {
      const template = await prisma.formTemplate.findUnique({
        where: { id: testTemplateId },
      });

      expect(template).toBeDefined();
      expect(template?.isActive).toBe(true);
      expect(template?.templateSchema).toBeDefined();
    });

    test("Should submit a form", async () => {
      const result = await validateSubmissionWorkflow(
        testTemplateId,
        testTripId,
        testUserId,
        testGroupId
      );

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data?.submittedForm.status).toBe("SUBMITTED");
    });

    test("Should track submission status", async () => {
      const submission = await prisma.submission.create({
        data: {
          template: { connect: { id: testTemplateId } },
          trip: { connect: { id: testTripId } },
          user: { connect: { id: testUserId } },
          group: { connect: { id: testGroupId } },
          status: "DRAFT",
        },
      });

      // Draft -> Submitted
      const submitted = await prisma.submission.update({
        where: { id: submission.id },
        data: { status: "SUBMITTED", submissionDate: new Date() },
      });

      expect(submitted.status).toBe("SUBMITTED");

      // Submitted -> Under Review
      const reviewed = await prisma.submission.update({
        where: { id: submission.id },
        data: { status: "UNDER_REVIEW" },
      });

      expect(reviewed.status).toBe("UNDER_REVIEW");

      // Under Review -> Approved
      const approved = await prisma.submission.update({
        where: { id: submission.id },
        data: {
          status: "APPROVED",
          reviewNotes: "Looks good!",
        },
      });

      expect(approved.status).toBe("APPROVED");
      expect(approved.reviewNotes).toBe("Looks good!");
    });

    test("Should retrieve user's submissions", async () => {
      // Create multiple submissions
      await prisma.submission.create({
        data: {
          template: { connect: { id: testTemplateId } },
          trip: { connect: { id: testTripId } },
          user: { connect: { id: testUserId } },
          group: { connect: { id: testGroupId } },
          status: "DRAFT",
        },
      });

      const template2 = await createTestFormTemplate(testGroupId, testUserId);

      await prisma.submission.create({
        data: {
          template: { connect: { id: template2.id } },
          trip: { connect: { id: testTripId } },
          user: { connect: { id: testUserId } },
          group: { connect: { id: testGroupId } },
          status: "SUBMITTED",
        },
      });

      const submissions = await prisma.submission.findMany({
        where: { userId: testUserId },
      });

      expect(submissions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Multi-Step Workflow", () => {
    test("Should complete full expense -> submission workflow", async () => {
      // Step 1: Create expense
      const expense = await createTestExpense(testTripId, testUserId);
      expect(expense).toBeDefined();

      // Step 2: Submit expense
      const submittedExpense = await prisma.expense.update({
        where: { id: expense.id },
        data: { status: "SUBMITTED", submittedAt: new Date() },
      });

      expect(submittedExpense.status).toBe("SUBMITTED");

      // Step 3: Create form submission
      const submission = await prisma.submission.create({
        data: {
          template: { connect: { id: testTemplateId } },
          trip: { connect: { id: testTripId } },
          user: { connect: { id: testUserId } },
          group: { connect: { id: testGroupId } },
          status: "DRAFT",
        },
      });

      expect(submission).toBeDefined();

      // Step 4: Submit form
      const submittedForm = await prisma.submission.update({
        where: { id: submission.id },
        data: {
          status: "SUBMITTED",
          submissionDate: new Date(),
        },
      });

      expect(submittedForm.status).toBe("SUBMITTED");

      // Verify both are connected to the trip
      const trip = await prisma.trip.findUnique({
        where: { id: testTripId },
        include: {
          expenses: true,
          submissions: true,
        },
      });

      expect(trip?.expenses).toContainEqual(expect.objectContaining({ id: expense.id }));
      expect(trip?.submissions).toContainEqual(expect.objectContaining({ id: submission.id }));
    });
  });

  describe("Authentication", () => {
    test("Should authenticate valid user", async () => {
      const auth = await authenticateTestUser(
        TEST_USERS.submitter.email,
        TEST_USERS.submitter.password
      );

      expect(auth).not.toBeNull();
      expect(auth?.userId).toBeDefined();
      expect(auth?.sessionToken).toBeDefined();
    });

    test("Should reject invalid password", async () => {
      const auth = await authenticateTestUser(TEST_USERS.submitter.email, "wrongpassword");

      expect(auth).toBeNull();
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
