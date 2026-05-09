// Expense type configurations — fields match IIT Ropar TA Bill columns exactly
export const EXPENSE_TYPES = {

  // ── Section 12: Travel (Air/Bus/Train/Taxi/Auto) ──────────────────────────
  // Columns: Date | Time (Dep) | Place (From) | Date (Arr) | Time (Arr) | Place (To)
  //          | Distance (km) | Mode | Class of Travel | Ticket No./PNR | Fare Amount

  AIRWAYS: {
    category: "Travel",
    label: "Airways (Air Travel)",
    icon: "✈️",
    outlineIcon: "🛫",
    proofFields: [
      { key: "departureTime",  label: "Departure Time (am/pm)",       type: "text" },
      { key: "from",           label: "Departure Place (From)",        type: "text" },
      { key: "arrivalDate",    label: "Arrival Date",                  type: "date" },
      { key: "arrivalTime",    label: "Arrival Time (am/pm)",          type: "text" },
      { key: "to",             label: "Arrival Place (To)",            type: "text" },
      { key: "distance",       label: "Distance (Kms)",                type: "number" },
      { key: "class",          label: "Class of Travel (Economy/Business)", type: "text" },
      { key: "pnr",            label: "Ticket No. / PNR No.",          type: "text" },
    ],
  },

  TRAIN: {
    category: "Travel",
    label: "Train",
    icon: "🚂",
    outlineIcon: "🚆",
    proofFields: [
      { key: "departureTime",  label: "Departure Time (am/pm)",       type: "text" },
      { key: "from",           label: "Departure Place (From)",        type: "text" },
      { key: "arrivalDate",    label: "Arrival Date",                  type: "date" },
      { key: "arrivalTime",    label: "Arrival Time (am/pm)",          type: "text" },
      { key: "to",             label: "Arrival Place (To)",            type: "text" },
      { key: "distance",       label: "Distance (Kms)",                type: "number" },
      { key: "class",          label: "Class of Travel (SL/3A/2A/1A/CC)", type: "text" },
      { key: "pnr",            label: "Ticket No. / PNR No.",          type: "text" },
    ],
  },

  BUS: {
    category: "Travel",
    label: "Bus",
    icon: "🚌",
    outlineIcon: "🚐",
    proofFields: [
      { key: "departureTime",  label: "Departure Time (am/pm)",       type: "text" },
      { key: "from",           label: "Departure Place (From)",        type: "text" },
      { key: "arrivalDate",    label: "Arrival Date",                  type: "date" },
      { key: "arrivalTime",    label: "Arrival Time (am/pm)",          type: "text" },
      { key: "to",             label: "Arrival Place (To)",            type: "text" },
      { key: "distance",       label: "Distance (Kms)",                type: "number" },
      { key: "class",          label: "Class / Type of Bus (AC/Non-AC/Sleeper)", type: "text" },
      { key: "pnr",            label: "Ticket No.",                    type: "text" },
    ],
  },

  TAXI: {
    category: "Travel",
    label: "Taxi / Auto / Cab",
    icon: "🚕",
    outlineIcon: "🚗",
    proofFields: [
      { key: "departureTime",  label: "Departure Time (am/pm)",       type: "text" },
      { key: "from",           label: "Pickup Location (From)",        type: "text" },
      { key: "arrivalDate",    label: "Arrival / Drop Date",           type: "date" },
      { key: "arrivalTime",    label: "Arrival Time (am/pm)",          type: "text" },
      { key: "to",             label: "Drop Location (To)",            type: "text" },
      { key: "distance",       label: "Distance (Kms)",                type: "number" },
      { key: "class",          label: "Mode (Taxi/Auto/App Cab)",      type: "text" },
      { key: "pnr",            label: "Receipt / Invoice No.",         type: "text" },
    ],
  },

  OWN_CAR: {
    category: "Travel",
    label: "Own Car / Two Wheeler",
    icon: "🚗",
    outlineIcon: "🛻",
    proofFields: [
      { key: "departureTime",  label: "Departure Time (am/pm)",       type: "text" },
      { key: "from",           label: "Departure Place (From)",        type: "text" },
      { key: "arrivalDate",    label: "Arrival Date",                  type: "date" },
      { key: "arrivalTime",    label: "Arrival Time (am/pm)",          type: "text" },
      { key: "to",             label: "Arrival Place (To)",            type: "text" },
      { key: "distance",       label: "Distance (Kms)",                type: "number" },
      { key: "class",          label: "Vehicle Type (Car/Two Wheeler)", type: "text" },
      { key: "pnr",            label: "Vehicle Registration No.",      type: "text" },
    ],
  },

  // ── Section 13: Accommodation ─────────────────────────────────────────────
  // Columns: Period of Stay (From–To) | Hotel/Guest House Name & Address | Bill No. | No of Days | Amount

  LODGING: {
    category: "Accommodation",
    label: "Hotel (Commercial)",
    icon: "🏨",
    outlineIcon: "🏨",
    proofFields: [
      { key: "from",      label: "Stay From (Date)",              type: "date" },
      { key: "to",        label: "Stay To (Date)",                type: "date" },
      { key: "hotelName", label: "Name & Address of Hotel",       type: "text" },
      { key: "billNo",    label: "Bill No.",                      type: "text" },
      { key: "numNights", label: "Number of Days/Nights",         type: "number" },
    ],
  },

  GUEST_HOUSE: {
    category: "Accommodation",
    label: "Guest House / Govt. Transit",
    icon: "🏡",
    outlineIcon: "🏡",
    proofFields: [
      { key: "from",           label: "Stay From (Date)",              type: "date" },
      { key: "to",             label: "Stay To (Date)",                type: "date" },
      { key: "guestHouseName", label: "Name & Address of Guest House", type: "text" },
      { key: "billNo",         label: "Bill No.",                      type: "text" },
      { key: "numNights",      label: "Number of Days/Nights",         type: "number" },
    ],
  },

  // ── Section 15: Other Expenses ────────────────────────────────────────────
  // Sr.1: Registration Fee | Sr.2: Visa Fees/Insurance | Sr.3: Any Other

  REGISTRATION_FEE: {
    category: "Other",
    label: "Registration Fee (Conference/Seminar)",
    icon: "📋",
    outlineIcon: "📋",
    proofFields: [
      { key: "eventName",    label: "Conference / Seminar Name",  type: "text" },
      { key: "eventDate",    label: "Event Date",                 type: "date" },
      { key: "invoiceNo",    label: "Invoice / Receipt No.",      type: "text" },
      { key: "organizer",    label: "Organizer / Institution",    type: "text" },
    ],
  },

  VISA_INSURANCE: {
    category: "Other",
    label: "Visa Fees / Insurance Charges",
    icon: "🛂",
    outlineIcon: "🛂",
    proofFields: [
      { key: "feeType",      label: "Type (Visa Fee / Insurance / Both)", type: "text" },
      { key: "country",      label: "Country / Coverage Details",          type: "text" },
      { key: "invoiceNo",    label: "Invoice / Receipt No.",               type: "text" },
      { key: "validFrom",    label: "Valid From (Date)",                   type: "date" },
      { key: "validTo",      label: "Valid To (Date)",                     type: "date" },
    ],
  },

  OTHER: {
    category: "Other",
    label: "Any Other Charges",
    icon: "📌",
    outlineIcon: "📌",
    proofFields: [
      { key: "details", label: "Details / Description of Expense", type: "textarea" },
      { key: "invoiceNo", label: "Invoice / Receipt No. (if any)", type: "text" },
    ],
  },

  // ── Personal (not on official form, kept for reference) ───────────────────

  PERSONAL_STAY: {
    category: "Personal",
    label: "Personal Stay (Own / Relative's Place)",
    icon: "🏠",
    proofFields: [
      { key: "placeName",  label: "Place / Host Name",          type: "text" },
      { key: "from",       label: "Check-in Date",              type: "date" },
      { key: "to",         label: "Check-out Date",             type: "date" },
      { key: "numNights",  label: "Number of Nights",           type: "number" },
    ],
  },

  PERSONAL_FOOD: {
    category: "Personal",
    label: "Food & Groceries",
    icon: "🍕",
    proofFields: [
      { key: "merchant",   label: "Store / Restaurant Name",    type: "text" },
      { key: "items",      label: "Items Purchased",            type: "text" },
    ],
  },

  PERSONAL_SERVICES: {
    category: "Personal",
    label: "Laundry / Personal Services",
    icon: "👔",
    proofFields: [
      { key: "serviceName",  label: "Service Name",             type: "text" },
      { key: "description",  label: "Description",              type: "text" },
    ],
  },
};

export const DOCUMENT_TYPES = [
  "Invoice",
  "Receipt",
  "Bill",
  "Ticket",
  "Boarding Pass",
  "Hotel Confirmation",
  "Purchase Order",
  "Other",
];
