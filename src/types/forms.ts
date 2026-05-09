/**
 * Form Template and Field Type Definitions
 */

export type FieldType =
  | "text"
  | "short_text"
  | "long_text"
  | "number"
  | "decimal"
  | "email"
  | "phone"
  | "date"
  | "time"
  | "datetime"
  | "checkbox"
  | "multiple_choice"
  | "dropdown"
  | "linear_scale"
  | "rating"
  | "expense_type"
  | "file_upload"
  | "expense_cards_table"        // Travel/journey expense rows (Section 12)
  | "accommodation_cards_table"  // Lodging expense rows (Section 13)
  | "other_expenses_table"       // Registration/Visa/Other rows (Section 15)
  | "signature_authority"        // Manager signature placeholder
  | "staticText"
  | "data_grid"
  | "yesno";

export type ExpenseType =
  | "Air"
  | "Train"
  | "Taxi"
  | "Bus"
  | "Food"
  | "Lodging"
  | "Registration"
  | "Visa"
  | "Other";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  
  // Options for choice-based fields
  options?: string[];
  
  // Validation constraints
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string; // regex pattern for validation
  
  // Scale/Rating configuration
  minLabel?: string;
  maxLabel?: string;
  scaleStart?: number;
  scaleEnd?: number;
  
  // Positioning
  position: number;
}

export interface ExpenseTypeField extends FormField {
  type: "expense_type";
  allowedExpenseTypes?: ExpenseType[];
  defaultExpenseType?: ExpenseType;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  position: number;
}

export interface FormTemplate {
  id: string;
  instituteId: string;
  createdById: string;
  title: string;
  description?: string;
  
  // Form structure
  sections: FormSection[];
  
  // Settings
  isActive: boolean;
  version: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface FormTemplateSchema {
  sections: FormSection[];
  metadata?: {
    description?: string;
    instructions?: string;
    maxAttempts?: number;
    allowMultipleSubmissions?: boolean;
    requiresTripLink?: boolean;
  };
}

export interface FormFieldConfig {
  key: string;
  label: string;
  icon?: string;
  description: string;
  group: "text" | "choice" | "scale" | "date" | "advanced";
}

export const FIELD_CONFIGS: Record<FieldType, FormFieldConfig> = {
  short_text: {
    key: "short_text",
    label: "Short Answer",
    icon: "📝",
    description: "Single line text response",
    group: "text",
  },
  long_text: {
    key: "long_text",
    label: "Paragraph",
    icon: "📄",
    description: "Multi-line text response",
    group: "text",
  },
  text: {
    key: "text",
    label: "Text",
    icon: "✏️",
    description: "Text input field",
    group: "text",
  },
  number: {
    key: "number",
    label: "Whole Number",
    icon: "🔢",
    description: "Integer input",
    group: "text",
  },
  decimal: {
    key: "decimal",
    label: "Decimal",
    icon: "🔢",
    description: "Decimal number input",
    group: "text",
  },
  email: {
    key: "email",
    label: "Email",
    icon: "📧",
    description: "Email address",
    group: "text",
  },
  phone: {
    key: "phone",
    label: "Phone Number",
    icon: "📱",
    description: "Phone number",
    group: "text",
  },
  date: {
    key: "date",
    label: "Date",
    icon: "📅",
    description: "Date picker",
    group: "date",
  },
  time: {
    key: "time",
    label: "Time",
    icon: "⏰",
    description: "Time picker",
    group: "date",
  },
  datetime: {
    key: "datetime",
    label: "Date & Time",
    icon: "🕐",
    description: "Date and time picker",
    group: "date",
  },
  checkbox: {
    key: "checkbox",
    label: "Checkboxes",
    icon: "☑️",
    description: "Multiple select with checkboxes",
    group: "choice",
  },
  multiple_choice: {
    key: "multiple_choice",
    label: "Multiple Choice",
    icon: "⭕",
    description: "Single select radio buttons",
    group: "choice",
  },
  dropdown: {
    key: "dropdown",
    label: "Dropdown",
    icon: "▼",
    description: "Dropdown selector",
    group: "choice",
  },
  linear_scale: {
    key: "linear_scale",
    label: "Linear Scale",
    icon: "📊",
    description: "1-10 rating scale",
    group: "scale",
  },
  rating: {
    key: "rating",
    label: "Star Rating",
    icon: "⭐",
    description: "Star rating",
    group: "scale",
  },
  expense_type: {
    key: "expense_type",
    label: "Expense Type",
    icon: "💰",
    description: "Predefined expense categories",
    group: "advanced",
  },
  file_upload: {
    key: "file_upload",
    label: "File Upload",
    icon: "📎",
    description: "Upload receipts or documents",
    group: "advanced",
  },
  data_grid: {
    key: "data_grid",
    label: "Data Grid",
    icon: "🧮",
    description: "Table for multiple entries (e.g. details of journey)",
    group: "advanced",
  },
  expense_cards_table: {
    key: "expense_cards_table",
    label: "Travel Expenses Table",
    icon: "✈️",
    description: "Attach Air/Train/Taxi/Bus expense cards from a trip (Section 12 - Journey Details)",
    group: "advanced",
  },
  accommodation_cards_table: {
    key: "accommodation_cards_table",
    label: "Accommodation Table",
    icon: "🏨",
    description: "Attach lodging/hotel expense cards from a trip (Section 13 - Accommodation)",
    group: "advanced",
  },
  other_expenses_table: {
    key: "other_expenses_table",
    label: "Other Expenses Table",
    icon: "🧾",
    description: "Attach registration, visa, food and other expense cards (Section 15 - Other Expenses)",
    group: "advanced",
  },
  signature_authority: {
    key: "signature_authority",
    label: "Signature Authority",
    icon: "✍️",
    description: "A placeholder for a manager/approver signature",
    group: "advanced",
  },
  staticText: {
    key: "staticText",
    label: "Static Text",
    icon: "📜",
    description: "Read-only instructional text or legal declarations",
    group: "text",
  },
  yesno: {
    key: "yesno",
    label: "Yes / No Question",
    icon: "🔘",
    description: "A simple binary Choice",
    group: "choice",
  },
};
