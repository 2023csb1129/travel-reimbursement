const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding pixel-perfect IIT Ropar TA Bill from physical form (all 3 pages)...");

  const admin = await prisma.user.findFirst({
    where: { role: "ADMINISTRATOR" },
  });

  if (!admin) {
    console.error("No admin user found. Run the main seed first.");
    return;
  }

  const templateSchema = {
    sections: [
      // ── PAGE 1 ──
      // Section 1-11: Personal & Bank Details
      {
        id: "sec_personal",
        title: "Personal & Bank Details",
        description: "भारतीय प्रौद्योगिकी संस्थान रोपड़ — INDIAN INSTITUTE OF TECHNOLOGY ROPAR — TRAVELLING ALLOWANCE REIMBURSEMENT/SETTLEMENT FORM",
        position: 1,
        fields: [
          { id: "f_name",     type: "short_text", label: "1) Name",                         required: true,  position: 1 },
          { id: "f_emp",      type: "short_text", label: "2) Emp. Code",                    required: true,  position: 2 },
          { id: "f_pay",      type: "short_text", label: "3) Pay Level",                    required: true,  position: 3 },
          { id: "f_desig",    type: "short_text", label: "4) Designation",                  required: true,  position: 4 },
          { id: "f_dept",     type: "short_text", label: "5) Department",                   required: true,  position: 5 },
          { id: "f_adv",      type: "number",     label: "6) Advance drawn (₹)",            required: false, position: 6 },
          { id: "f_adv_date", type: "date",       label: "7) Advance drawn date",           required: false, position: 7 },
          { id: "f_acc",      type: "short_text", label: "8) Bank Account No. (SBI/Any other)", required: true, position: 8 },
          { id: "f_ifsc",     type: "short_text", label: "9) IFSC Code",                   required: true,  position: 9 },
          { id: "f_purpose",  type: "long_text",  label: "10) Purpose of Journey",          required: true,  position: 10 },
          { id: "f_budget",   type: "short_text", label: "11) Budget Head",                 required: false, position: 11 },
        ],
      },

      // Important Instructions (static)
      {
        id: "sec_instructions",
        title: "Important Instructions",
        position: 2,
        fields: [
          {
            id: "f_inst", type: "staticText", label: "Instructions", position: 1,
            value: "1. Claim must be properly filled in and submitted within due dates after completion of journey. Due dates are: within 15 days if advance is drawn and within 60 days if no advance is drawn. Failure to do so cause forfeit of TA Claim.\n2. Enclosed the original documents/Invoices/Boarding Passes/Approval/Tickets/Hotel Bills/Food bills Copy of Air/Train tickets in sequence wise from travelling details to Other Expenses with self attestation.\n3. GST invoice is required when journey is performed through Taxi and Toll Tax receipts in case of Own Car.",
          }
        ],
      },

      // Section 12: Journey Details (Travel expenses → this table)
      {
        id: "sec_travel",
        title: "12) Details of journey(s) performed: Start to End",
        description: "Add all Travel expenses (Air/Train/Bus/Taxi) to populate this table. Columns: Date | Time | Place (Departure) → Date | Time | Place (Arrival) | Distance (Kms) | Mode of Travel | Class of Travel | Ticket No./PNR No. | Fare Amount",
        position: 3,
        fields: [
          { id: "f_travel_table", type: "expense_cards_table", label: "Journey Table (from Travel expenses)", required: true, position: 1 },
        ],
      },

      // Section 13: Accommodation (Accommodation expenses → this table)
      {
        id: "sec_acc",
        title: "13) Particulars to be furnished for Accommodation Details",
        description: "Add all Accommodation expenses (Hotel/Guest House) to populate this table. Columns: Period of Stay (From–To) | Name and Address | Bill No. | No of Days | Amount paid",
        position: 4,
        fields: [
          { id: "f_acc_table",  type: "accommodation_cards_table", label: "Accommodation Table (from Accommodation expenses)", required: false, position: 1 },
          { id: "f_breakfast",  type: "yesno", label: "If, Breakfast complementary in Hotel Stay/Guest House, Please tick (YES / NO)", required: false, position: 2 },
        ],
      },

      // ── PAGE 2 ──
      // Section 14: Daily Allowances
      {
        id: "sec_da",
        title: "14) Daily Allowances",
        position: 5,
        fields: [
          { id: "f_da_hdr",      type: "staticText",  label: "(a) Please mentioned dates for which Food is provided by Host", value: "", position: 1 },
          { id: "f_da_bkfst",   type: "short_text",  label: "Breakfast — Mention the dates", required: false, position: 2 },
          { id: "f_da_lunch",   type: "short_text",  label: "Lunch — Mention the dates",     required: false, position: 3 },
          { id: "f_da_dinner",  type: "short_text",  label: "Dinner — Mention the dates",    required: false, position: 4 },
          { id: "f_da_b_hdr",   type: "staticText",  label: "(b) Indicate the period and number of days if any, for which the claimant wants DA:", value: "", position: 5 },
          { id: "f_da_from",    type: "date",        label: "From",        required: false, position: 6 },
          { id: "f_da_to",      type: "date",        label: "To",          required: false, position: 7 },
          { id: "f_da_days",    type: "number",      label: "No. of Days", required: false, position: 8 },
          { id: "f_leave_yn",   type: "yesno",       label: "Whether the claimant was on leave during official Tour? (YES / NO)", required: false, position: 9 },
          { id: "f_leave_det",  type: "long_text",   label: "If YES, please mention the period of Leave during tour", required: false, position: 10 },
        ],
      },

      // Section 15: Other Expenses (Other expenses → this table)
      {
        id: "sec_other",
        title: "15) Other expenses incurred in Journey",
        description: "Add all Other expenses (Registration/Visa/Misc) to populate this table. Sr.1: Registration Fee for conference/Seminar | Sr.2: Visa Fees/Insurance charges | Sr.3: Any Other Charges",
        position: 6,
        fields: [
          { id: "f_other_table", type: "other_expenses_table", label: "Other Expenses Table (from Other expenses)", required: false, position: 1 },
        ],
      },

      // Certification & HOD Approval
      {
        id: "sec_cert",
        title: "Total Amount Claimed & Certification",
        position: 7,
        fields: [
          { id: "f_total",      type: "number",     label: "Total Amount Claimed (Sr.No:-12+13+15) ₹", required: false, position: 1 },
          {
            id: "f_cert_txt", type: "staticText", label: "Certification:", position: 2,
            value: "1) Certified That I was on Tour from (dt) ________ to ________ (dt) for the purpose as per approval and indicate above Sr. No. 10\n2) All claims mentioned in this form correspond to actual expenditure incurred by me for which no reimbursement/claims have been made from any other source (Govt./Private/Others)\n3) I was not provided with any free boarding/lodging/conveyance/registration fee/ travel coupon for which claim has been made",
          },
          { id: "f_cert_dp",    type: "short_text",         label: "Date & Place",                     required: false, position: 3 },
          { id: "f_sig_emp",    type: "short_text",         label: "Signature of Employee",            required: true,  position: 4 },
          { id: "f_j_verified", type: "staticText",         label: "Journey verified and forwarded",   value: "",       position: 5 },
          { id: "f_sig_hod",    type: "signature_authority", label: "Signature of HOD with date",      required: false, position: 6 },
        ],
      },

      // ── PAGE 3: UNDERTAKING ──
      {
        id: "sec_undertaking",
        title: "UNDERTAKING",
        description: "To be submitted in all cases of air travel where the Government of India bears the cost of air passage",
        position: 8,
        fields: [
          {
            id: "f_und_ref", type: "staticText", label: "Reference & Declaration", position: 1,
            value: "Ref: Dept. of Expenditure, Ministry of Finance, Govt of India O.M. No. 19024/03/2021-E.IV dated 31-12-2021, O.M. No. 19024/03/2021-E.IV dated 16-02-2022 and O.M.No. 19024/03/2021-E.IV dated 16-06-2022, as amended from time to time.\n\nI certify that:",
          },
          { id: "f_und_a1", type: "yesno", label: "a) i) I have purchased the air tickets from M/s Balmer Lawrie & Company Limited (BLCL)", required: false, position: 2 },
          { id: "f_und_a2", type: "yesno", label: "a) ii) I have purchased the air tickets from M/s Ashok Travels & Tours (ATT)",           required: false, position: 3 },
          { id: "f_und_a3", type: "yesno", label: "a) iii) I have purchased the air tickets from Indian Railways Catering and Tourism Corporation Ltd. (IRCTC)", required: false, position: 4 },
          { id: "f_und_b",  type: "yesno", label: "b) I have opted for the 'Best available fare' on the date of booking on the basis of tour programmed as per my entitlement.", required: false, position: 5 },
          { id: "f_und_c",  type: "yesno", label: "c) I have booked the Non-stop flight in a given slot at the time of booking.",            required: false, position: 6 },
          { id: "f_und_d",  type: "yesno", label: "d) I have not booked the tickets within less than 72 hours of intended travel on Tour, if booked self declared justification is provided.", required: false, position: 7 },
          { id: "f_und_e",  type: "yesno", label: "e) I have fulfilled other terms and conditions mentioned in above referred Govt. of India instructions on the matter, as amended from time to time.", required: false, position: 8 },
          { id: "f_und_sig",   type: "short_text", label: "Signature of claimant", required: false, position: 9 },
          { id: "f_und_name",  type: "short_text", label: "Name",        required: false, position: 10 },
          { id: "f_und_desig", type: "short_text", label: "Designation", required: false, position: 11 },
          { id: "f_und_place", type: "short_text", label: "Place",       required: false, position: 12 },
          { id: "f_und_date",  type: "date",       label: "Date",        required: false, position: 13 },
        ],
      },

      // For Use by Accounts Section
      {
        id: "sec_accounts",
        title: "(For use by Accounts Section)",
        position: 9,
        fields: [
          { id: "f_ac1",  type: "number",     label: "1)  Air Fare/ Train Fare/Bus",                    required: false, position: 1  },
          { id: "f_ac2",  type: "number",     label: "2)  Local Mileage (Taxi/Auto/Own Car)",           required: false, position: 2  },
          { id: "f_ac3",  type: "number",     label: "3)  Daily Allowance",                             required: false, position: 3  },
          { id: "f_ac4",  type: "number",     label: "4)  Hotel Charges",                               required: false, position: 4  },
          { id: "f_ac5",  type: "number",     label: "5)  Visa Fees/Insurance",                         required: false, position: 5  },
          { id: "f_ac6",  type: "number",     label: "6)  Other Expenses",                              required: false, position: 6  },
          { id: "f_ac7",  type: "number",     label: "7)  Total ( 1 to 6)",                             required: false, position: 7  },
          { id: "f_ac8",  type: "number",     label: "8)  Advance if any to be deducted",               required: false, position: 8  },
          { id: "f_ac9",  type: "number",     label: "9)  Net amount to be reimbursed",                 required: false, position: 9  },
          { id: "f_ac10", type: "number",     label: "10) Net amount to be reimbursed to the Travel Agent", required: false, position: 10 },
          { id: "f_ac11", type: "number",     label: "11) To the claimant",                             required: false, position: 11 },
          { id: "f_acpass", type: "number",   label: "Passed for payment as per Sr.No 7 of Rs/-",       required: false, position: 12 },
          { id: "f_acdebit", type: "short_text", label: "Debitable to",                                 required: false, position: 13 },
          { id: "f_acbudget", type: "short_text", label: "Budget Head: Project/ Institute/ Any other",  required: false, position: 14 },
          { id: "f_sig_ja",    type: "signature_authority", label: "JA/SAA.",      required: false, position: 15 },
          { id: "f_sig_jao",   type: "signature_authority", label: "JAO/AO",       required: false, position: 16 },
          { id: "f_sig_ar",    type: "signature_authority", label: "AR/DR/JR",     required: false, position: 17 },
          { id: "f_sig_audit", type: "signature_authority", label: "Audit Section",required: false, position: 18 },
          { id: "f_sig_reg",   type: "signature_authority", label: "Registrar",    required: false, position: 19 },
        ],
      },
    ],
    metadata: {
      autoFillEnabled: true,
      categoryMapping: {
        "Travel":        "expense_cards_table",
        "Accommodation": "accommodation_cards_table",
        "Other":         "other_expenses_table",
      },
    },
  };

  await prisma.formTemplate.deleteMany({
    where: { title: "Complete IIT Ropar TA Bill" },
  });

  const formTemplate = await prisma.formTemplate.create({
    data: {
      title: "Complete IIT Ropar TA Bill",
      description: "भारतीय प्रौद्योगिकी संस्थान रोपड़ — INDIAN INSTITUTE OF TECHNOLOGY ROPAR — Travelling Allowance Reimbursement/Settlement Form (All 3 pages)",
      instituteId: admin.instituteId,
      createdById: admin.id,
      templateSchema: JSON.stringify(templateSchema),
      version: 6,
      isActive: true,
    },
  });

  console.log("✅ Successfully seeded pixel-perfect Complete IIT Ropar TA Bill (v6) — ID:", formTemplate.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
