# Software Requirements Specification (SRS): Multi-Institute Reimbursement PWA
## Project "Reimbursify 2.0"

---

## 1. Project Overview & Architectural Directives

### Application Type
**Offline-First Progressive Web App (PWA)**

### Primary Objective
A multi-tenant platform for managing business trips, logging personal/billable expenses, and generating dynamic reimbursement forms based on strict, institute-specific templates.

### AI Agent Directive
Build this application using a component-based frontend framework (e.g., React/Vue) with robust state management. Implement strict multi-tenant data isolation on the backend. The frontend MUST utilize IndexedDB for offline persistence, syncing with the backend when online.

---

## 2. User Roles & Data Isolation (Multi-Tenancy)

### Administrator (Institute Level)
- Creates form templates
- Views submissions tied to their specific institute
- Defines required fields
- **Data Isolation**: Admins are strictly siloed; they cannot access other institutes' forms or data

### Submitter (End-User)
- Manages personal profiles
- Creates and manages trips
- Logs expenses
- Selects a specific institute's active form template to generate their reimbursement request

---

## 3. Submitter Module: Profile & Trip Management

### 3.1. User Profile & Data Persistence

#### Auto-Fill Data
The profile stores persistent data to auto-populate admin forms:
- Name
- Designation
- Department
- Employee Code
- Grade/Pay Level
- Bank Account Number
- IFSC Code
- Email

#### My Cards (Payment Methods)
A dedicated section to save payment methods (e.g., "Visa ending in 1234", "Corporate Rupay")
- Used as dropdown options when logging an expense
- Can be edited/deleted by the user

---

### 3.2. Trip Management Dashboard

#### Trip Entity
A "Trip" is the core container for expenses. Creating a trip requires:
- **Title**: Name of the trip/project
- **Completion Status**: Yes/No (Has the trip been completed?)
- **Start Date**: When did the trip start?
- **Advance Amount Drawn**: Money drawn from the company
- **Budget Head**: Cost center or department code
- **Notes/Purpose of Journey**: Detailed purpose of the trip

#### Trip Dashboard Features
- **Search**: Find trips by title or keyword
- **Sorting**: By date, name, advance amount, status
- **Filtering**: Active/Archived/Completed trips
- **Favorites**: Mark trips as favorites for quick access
- **Archive**: Archive old trips
- **Delete**: Remove trips
- **Quick Actions**: View, Edit, Generate Form

---

### 3.3. Expense Logging (Within a Trip)

Inside a specific trip, users can log individual expenses categorized into three distinct tabs:

#### Category 1: Travel Expenses

**Fields:**
- Mode of Travel (Airplane, Train, Taxi, Bus, Own Car, etc.)
- From (City/Point 1)
- To (City/Point 2)
- Departure Date & Time
- Arrival Date & Time
- Distance in KM
- Class of Travel (Economy, Business, AC 2-Tier, etc.)
- PNR/Ticket No.
- Fare Amount
- Currency (INR, USD, EUR, etc.)
- Payment Mode (dropdown from saved cards)
- Remarks/Notes
- Receipt Location (Local, Google Drive, URL)
- File Attachment (Bill/Receipt)

#### Category 2: Other/Accommodation Expenses

**Fields:**
- Type dropdown (Stay, Food, Registration Fees, Visa, Conference Materials, etc.)
- Date
- Vendor/Hotel/Restaurant Name
- Bill/GSTIN Number
- Number of Days (if applicable)
- Amount Paid
- Currency
- Payment Mode (dropdown from saved cards)
- Remarks
- File Attachment

#### Category 3: Personal Expenses

**Fields:** Same as "Other" but with critical logic:
- **System Flag**: These expenses are marked and tracked separately
- **Crucial Logic**: Personal expenses are tracked in the user's own ledger but are STRICTLY EXCLUDED from the final reimbursement total calculated on the generated form
- Useful for tracking personal vs. business expenses on the same trip

---

## 4. Multi-Currency & Real-Time Conversion Engine

### Global Currency Support
Every expense entry must include a currency selector (INR, USD, EUR, GBP, JPY, etc.)

### Real-Time Conversion API
- Integrate a live exchange rate API (e.g., Open Exchange Rates, FIXER API, or similar)
- Cache exchange rates for 24 hours to minimize API calls
- Display last-updated timestamp

### Omnipresent UI Updates
The Trip Dashboard must show the total trip cost:

**Multiple Currency Display:**
- If expenses are in multiple currencies, display the sum broken down by currency
  - Example: "Total: INR 17,300 + USD 50.0 + EUR 25.5"
- OR allow the user to select a base currency and instantly recalculate all values on the screen without a page refresh
  - Example: "Convert to INR: ₹18,543 (including USD 50 @ ₹82/USD)"

### Calculation Logic
- Personal expenses are excluded from totals
- Advance drawn is subtracted from the final reimbursable amount
- Display: **Net Reimbursable Amount = Total (Travel + Other) - Advance - Personal Expenses**

---

## 5. Administrator Module: Drag-and-Drop Form Builder

### AI Agent Directive
This is the most complex component. The builder must be capable of recreating complex government/academic forms like the IIT Ropar TA form.

### 5.1. Standard Field Inputs

Admins can drag and drop basic UI elements onto the form canvas:

- **Short Text**: Single-line input (Word/employee code)
- **Long Text**: Multi-line input (Paragraph/Remarks/Purpose)
- **Dropdowns**: Pre-defined options or dynamic options
- **Checkboxes**: Multiple selections
- **Radio Buttons**: Single selection from options
- **Number Input**: For amounts, distances, indices
- **Currency Input**: For monetary values with auto-formatting
- **Date Input**: For date fields with calendar picker
- **File Upload**: For attachments/receipts

### 5.2. Auto-Bind Smart Fields

The builder must include "Smart Fields" that the admin can place on the canvas. These fields automatically pull data from the Submitter's profile or active trip:

#### Profile Binds (Auto-Populated from User Profile)
- Employee Code
- Name
- Designation
- Department
- Bank Account Number
- IFSC Code
- Email
- Grade/Pay Level

#### Trip Binds (Auto-Populated from Selected Trip)
- Purpose of Journey
- Advance Drawn
- Budget Head
- Trip Start Date
- Trip Completion Status
- Trip Notes

#### Smart Field Behavior
- During form generation, these fields are automatically read-only and pre-filled
- Admin can make them display-only (non-editable by submitter)
- Can set rules like "Show only if [condition]"

---

### 5.3. Dynamic Data Tables (Critical Feature)

To recreate complex forms, the admin must be able to drag a "Data Table" onto the form and map it to an expense category.

#### Travel Log Table
- Admin configures columns (e.g., Date, From, To, Mode, Fare, PNR, Remarks)
- When user generates the form, system automatically populates this table with all "Travel" expenses logged in that specific trip
- Can include calculated columns (e.g., Distance/Amount auto-summed)

#### Accommodation/Other Table
- Admin configures columns (e.g., Hotel Name, Check-In/Check-Out, Bill No, Vendor, Amount, Days)
- Auto-populates with "Other" expenses from the trip
- Excludes "Personal" expenses automatically

#### Personal Tracker Table (Optional)
- Shows personal expenses separately (for user's records, not for reimbursement)
- Helps submitter track what they spent personally

#### Calculated Totals
- The builder must allow the admin to place a "Grand Total" field that:
  - Automatically sums specific tables
  - Subtracts any "Advance Drawn"
  - Excludes "Personal Expenses"
  - Shows net reimbursable amount
  - Formula Example: **(Travel Total + Other Total) - Advance - Personal = Net Reimbursable**

---

### 5.4. Static Text & Undertakings

The builder must support:
- **Static Text Blocks**: For legal undertakings, declarations, and instructions
- **Legal Declarations**: Standard text like "I hereby declare that the expenses mentioned are true and correct"
- **Mandatory Checkbox**: "I Agree to the Terms" or similar
- **Digital Signature Block**: Date & signature field for user confirmation
- **Conditional Display**: Show certain declarations only if certain conditions are met

---

## 6. Form Generation & Export Engine

### Fulfillment Process
1. User selects a **Trip**
2. User selects an **Admin Form Template** (from their institute)
3. User clicks **"Generate"**
4. System maps the Trip's expenses and Profile data into the Admin's template
5. User downloads or previews the result

### Data Mapping
- Automatically inject Profile data into Smart Fields
- Iterate through Trip expenses and populate Data Tables
- Calculate totals and grand totals
- Exclude Personal expenses from final reimbursable totals

### Export Formats

#### PDF Export
- Use library like **PDF-lib** or **jsPDF**
- Generate professional, printer-ready PDF
- Include all expenses in tables
- Show calculated totals with proper formatting
- Embed digital signature placeholder

#### Excel Export
- Use library like **SheetJS** or **ExcelJS**
- Create multi-sheet workbook:
  - Sheet 1: Form summary (header, profile data, totals)
  - Sheet 2: Travel expenses table
  - Sheet 3: Other expenses table
  - Sheet 4: Personal expenses (for reference)
- Auto-sized columns, formatted cells with currency/date formats

#### ZIP Bundle
- Create a ZIP file containing:
  - Generated PDF
  - Generated Excel file
  - All uploaded receipt/bill attachments (organized by category)
  - A text file listing all expenses with metadata
- Allow user to download as single file for complete submission package

---

## 7. PWA, Offline, & Technical Requirements

### Offline-First Architecture

#### Service Worker
- Register a Service Worker with network-first strategy for APIs
- Cache-first strategy for static assets
- Offline fallback page for unavailable resources

#### IndexedDB Persistence
- Store all user data locally: Profiles, Trips, Expenses, Payment Cards
- Store generated forms (PDF as blobs, Excel as base64)
- Sync queue for pending form submissions
- Define object stores for: Users, Trips, Expenses, BillFiles, PaymentCards, FormTemplates

#### Offline Capabilities
- Users can log expenses completely offline
- Users can attach receipt files offline (stored as binary in IndexedDB)
- Users can generate forms offline (using cached template data)
- All changes are automatically synced when online

#### Sync Engine
- Background sync when connectivity is restored
- Conflict resolution (server-wins or user-wins strategy)
- Notification to user when sync completes
- Retry queue for failed syncs

---

### Manual Import/Export (Backup)

Provide tools in the **Settings** to:
- **Export Entire Local Database**: Download a JSON file with all trips, expenses, cards, and settings
- **Import from Backup**: Upload previously exported JSON to restore data
- **Device-to-Device Transfer**: Enable data portability across devices

---

### PWA Manifest

Must include a valid **manifest.json** with:
- App name: "Reimbursify 2.0"
- Short name: "Reimbursify"
- Icons: Multiple sizes (192px, 512px, maskable variants)
- Theme color: Brand color (e.g., purple #8b5cf6)
- Background color: Light/dark variant
- Display: "standalone" (full-screen app mode)
- Orientation: "portrait-primary"
- Categories: ["business", "productivity"]
- Screenshots: For app store listings

---

### Mobile-First Responsiveness

#### Touch-Friendly UI
- Large tap targets (minimum 48px)
- Bottom sheets for dropdowns and modals
- Floating Action Buttons (FAB) for primary actions:
  - "+ Add Trip" FAB on Trip Dashboard
  - "+ Add Expense" FAB on Trip Detail screen
  - "+ Add Card" FAB on Payment Methods screen

#### Mobile Interactions
- Swipe-to-delete gesture for expense cards
- Swipe-open to reveal quick actions (Edit, Duplicate, Delete)
- Pinch-to-zoom on data tables for better readability
- Long-press for context menus
- Pull-to-refresh for syncing with server

#### Responsive Breakpoints
- Mobile: < 640px (Single column, stack all elements)
- Tablet: 640px – 1024px (Two columns where appropriate)
- Desktop: > 1024px (Full layout with sidebars)

---

## 8. Required Database Entities (AI Agent Guide)

### Users Table
```
Fields:
  - id (UUID, PK)
  - institute_id (FK to Institutes, for multi-tenancy)
  - email (unique)
  - role (Administrator, Submitter)
  - name
  - emp_code
  - designation
  - department
  - grade_level
  - bank_account_number
  - ifsc_code
  - payment_cards (JSON array of card objects)
  - created_at
  - updated_at
```

### Institutes Table
```
Fields:
  - id (UUID, PK)
  - name (unique, e.g., "IIT Ropar", "Adobe India")
  - abbrev (e.g., "IITRPR", "ADOBE")
  - country
  - timezone
  - currency (default, e.g., "INR")
  - created_at
  - updated_at
```

### Trips Table
```
Fields:
  - id (UUID, PK)
  - user_id (FK to Users)
  - title
  - start_date
  - is_complete (boolean)
  - advance_drawn (float)
  - budget_head (string)
  - notes / purpose_of_journey (text)
  - is_archived (boolean)
  - is_favorite (boolean)
  - created_at
  - updated_at
```

### Expenses Table
```
Fields:
  - id (UUID, PK)
  - trip_id (FK to Trips)
  - category (Travel, Other, Personal)
  - expense_type (Air, Train, Taxi, Food, Lodging, Registration, Visa, etc.)
  - date
  - amount (float)
  - currency (INR, USD, EUR, etc.)
  - payment_mode_id (FK to PaymentCards, nullable if cash)
  - description / remarks (text)
  - metadata (JSON: varies by type)
    - Travel: {from, to, mode, pnr, class, distance_km, departure_time, arrival_time}
    - Other: {vendor_name, bill_no, num_days, gstin}
  - receipt_file_id (FK to BillFiles, nullable)
  - created_at
  - updated_at
```

### BillFiles Table
```
Fields:
  - id (UUID, PK)
  - expense_id (FK to Expenses)
  - file_name (string)
  - file_data (BLOB / binary)  [CRITICAL: Direct storage, not reference URL]
  - file_type (MIME type: application/pdf, image/jpeg, etc.)
  - file_size (int, in bytes)
  - uploaded_at
```

### PaymentCards Table
```
Fields:
  - id (UUID, PK)
  - user_id (FK to Users)
  - card_label (user-given name: "Visa ending 1234")
  - card_type (Visa, Mastercard, RuPay, Bank Transfer, etc.)
  - masked_number (e.g., "****1234")
  - created_at
```

### FormTemplates Table
```
Fields:
  - id (UUID, PK)
  - admin_id (FK to Users, must be Administrator role)
  - institute_id (FK to Institutes)
  - title (e.g., "TA Form - IIT Ropar")
  - description
  - template_schema (JSON: drag-drop layout, data bindings, table configs)
    Includes:
      - Array of fields (type, label, binding, position)
      - Array of tables (columns, category mapping, position)
      - Static text blocks
      - Calculation rules
  - is_active (boolean)
  - version (int, incremented on edit)
  - created_at
  - updated_at
```

### Submissions Table
```
Fields:
  - id (UUID, PK)
  - template_id (FK to FormTemplates)
  - user_id (FK to Users, submitter)
  - trip_id (FK to Trips)
  - institute_id (FK to Institutes)
  - generated_pdf_url (string or BLOB, PDF data)
  - generated_excel_url (string or BLOB, Excel data)
  - generated_zip_url (string or BLOB, ZIP bundle)
  - status (Draft, Submitted, Under Review, Approved, Rejected, Reimbursed)
  - submission_date
  - review_notes (text)
  - created_at
  - updated_at
```

### ExchangeRates Table (Optional, for caching)
```
Fields:
  - id (UUID, PK)
  - from_currency (INR)
  - to_currency (USD)
  - rate (float)
  - last_updated (timestamp)
  - expires_at (timestamp, TTL 24 hours)
```

---

## 9. API Endpoints (Backend Services)

### Authentication
- `POST /api/auth/register` – Create account
- `POST /api/auth/login` – Login
- `POST /api/auth/logout` – Logout
- `POST /api/auth/refresh` – Refresh token

### User Profile
- `GET /api/profile` – Get current user profile
- `PATCH /api/profile` – Update profile data
- `GET /api/profile/payment-cards` – List saved cards
- `POST /api/profile/payment-cards` – Add new card
- `DELETE /api/profile/payment-cards/:id` – Delete card

### Trips
- `GET /api/trips` – List all trips (with filters, sort)
- `POST /api/trips` – Create trip
- `GET /api/trips/:id` – Get trip details
- `PATCH /api/trips/:id` – Update trip
- `DELETE /api/trips/:id` – Delete trip
- `PATCH /api/trips/:id/favorite` – Toggle favorite
- `PATCH /api/trips/:id/archive` – Archive trip

### Expenses
- `GET /api/trips/:tripId/expenses` – List expenses in trip
- `POST /api/trips/:tripId/expenses` – Create expense
- `PATCH /api/expenses/:id` – Update expense
- `DELETE /api/expenses/:id` – Delete expense
- `GET /api/expenses/:id/bill` – Download bill/receipt

### Bills/Receipts
- `POST /api/expenses/:id/bill` – Upload bill file
- `GET /api/expenses/:id/bill` – Download bill
- `DELETE /api/expenses/:id/bill` – Delete bill

### Form Templates
- `GET /api/forms` – List form templates for user's institute
- `GET /api/forms/:id` – Get template schema
- `POST /api/forms` (Admin only) – Create new template
- `PATCH /api/forms/:id` (Admin only) – Update template
- `DELETE /api/forms/:id` (Admin only) – Delete template

### Form Generation & Export
- `POST /api/forms/:templateId/generate` – Generate form for a trip
- `GET /api/submissions/:id` – Get generated submission
- `GET /api/submissions/:id/pdf` – Download PDF
- `GET /api/submissions/:id/excel` – Download Excel
- `GET /api/submissions/:id/zip` – Download ZIP bundle
- `POST /api/submissions` – Submit form for review

### Real-Time Exchange Rates
- `GET /api/exchange-rates?from=INR&to=USD` – Get current rate
- `GET /api/exchange-rates/bulk?pairs=INR-USD,INR-EUR` – Bulk rates

### Sync & Backup (for PWA Offline)
- `POST /api/sync` – Sync local changes with server
- `POST /api/backup/export` – Export user data as JSON
- `POST /api/backup/import` – Import from JSON backup

---

## 10. Frontend Components (React/Vue)

### Submitter UI
- **Layout**: Bottom tab navigation (Profile, Trips, Forms, Settings)
- **Trip Dashboard**: Search, filter, sort, FAB, trip cards
- **Trip Detail**: Expense tabs (Travel, Other, Personal), FAB, expense list
- **Expense Form**: Dynamic form based on category, file upload, auto-currency
- **Payment Cards Manager**: List, add, delete cards
- **Profile Settings**: Auto-fill data, preferences, offline mode status
- **Form Generator**: Select trip, select template, preview, download options
- **Backup Manager**: Export/Import DB, show storage usage

### Administrator UI
- **Form Builder Canvas**: Drag-drop designer for templates
- **Field Palette**: Sidebar with available fields
- **Smart Field Library**: Pre-built bindings
- **Data Table Config**: Columns, sorting, filtering rules
- **Template Preview**: WYSIWYG preview of form
- **Submissions Dashboard**: View, review, approve/reject user submissions
- **Institute Settings**: Multi-tenant config, approver emails, branding

---

## 11. Security & Compliance Considerations

- **Multi-Tenancy Isolation**: Strict database-level row-level security by institute_id
- **Authentication**: JWT tokens with refresh mechanism
- **Authorization**: Role-based access control (RBAC) - Admin vs Submitter
- **Data Encryption**: Store sensitive data (bank details) encrypted at rest
- **HTTPS Only**: All API calls over TLS
- **CORS**: Strict CORS policies
- **File Uploads**: Validate file types, size limits, scan for malware
- **Audit Logging**: Log all form submissions, deletions, admin actions

---

## 12. Non-Functional Requirements

### Performance
- Form generation completes in < 2 seconds
- Offline IndexedDB queries complete in < 500ms
- Sync engine processes 100+ expenses in < 5 seconds

### Scalability
- Support 10,000+ institutes
- 100,000+ concurrent users
- Horizontal scaling with load balancer

### Availability
- 99.5% uptime SLA
- Graceful degradation when offline
- Auto-recovery on network reconnection

### Compatibility
- Modern browsers: Chrome, Firefox, Safari, Edge
- iOS Safari 13.4+, Android Chrome 51+
- Responsive on screens from 320px to 2560px

---

## 13. Development & Deployment

### Tech Stack (Recommended)
- **Frontend**: React 19, TypeScript, Vite (build tool)
- **State Management**: Redux or Zustand
- **Offline**: IndexedDB, Service Workers, Workbox
- **UI**: Tailwind CSS, Material UI / Shadcn/UI
- **PDF**: PDF-lib or jsPDF
- **Excel**: SheetJS
- **File Handling**: JSZip
- **Backend**: Node.js/Express or Python/FastAPI
- **Database**: PostgreSQL (multi-tenant design)

### Deployment
- **Frontend**: Vercel, Netlify, or AWS Amplify
- **Backend**: AWS EC2, Google Cloud Run, or DigitalOcean
- **Database**: AWS RDS PostgreSQL or managed PostgreSQL
- **File Storage**: AWS S3 or Google Cloud Storage (for bill backups)
- **CDN**: CloudFront or Cloudflare

---

## 14. Testing Strategy

### Unit Tests
- Business logic: calculation of reimbursable amounts, currency conversion
- Component tests: form fields, expense categorization

### Integration Tests
- Trip creation with multiple expenses
- Form generation end-to-end
- Sync engine with offline/online transitions

### E2E Tests
- Complete user flow: Create trip → Log expenses → Generate form → Download PDF
- Admin flow: Create template → Publish → User generates form

### Performance Tests
- Load testing with 1000+ concurrent users
- Sync performance with large datasets
- PDF generation with 100+ expenses

### Accessibility
- WCAG 2.1 AA compliance
- Screen reader testing
- Keyboard navigation

---

## 15. Rollout & Maintenance

### Phased Rollout
- **Phase 1**: Beta with 5-10 pilot institutes
- **Phase 2**: Full rollout to 50 institutes
- **Phase 3**: Public release, 1000+ institutes

### Maintenance
- Weekly security patches
- Monthly feature updates
- Quarterly performance audits
- Annual compliance reviews

---

## End of SRS: Reimbursify 2.0

**Document Version**: 1.0  
**Last Updated**: April 14, 2026  
**Status**: Ready for Development  
**AI Agent Ready**: YES ✓
