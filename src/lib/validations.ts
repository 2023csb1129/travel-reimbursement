import { z } from "zod";

export const reimbursementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.number().positive("Amount must be positive"),
  category: z.enum(["Travel", "Meals", "Supplies", "Tools", "Training"]),
  receiptNotes: z.string().optional(),
  description: z.string().optional(),
});

export const approvalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  remarks: z.string().optional(),
});

export type ReimbursementInput = z.infer<typeof reimbursementSchema>;
export type ApprovalInput = z.infer<typeof approvalSchema>;
