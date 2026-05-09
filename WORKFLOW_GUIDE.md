# Reimbursify: Complete Workflow & Navigation Guide

**Date**: April 14, 2026  
**Status**: ✅ All Pages & Routes Complete

---

## 🎯 User Workflow Overview

### **Submitter Workflow** (Regular Users)

```
Login → Dashboard/Trips List → Create Trip → Add Expenses → View Trip Details → Submit for Approval
  ↓
Profile Management → Payment Methods
```

---

## 📱 Submitter Pages & Features

### **1. Trips List** (`/trips`)
- **Purpose**: View all your trips with filtering and search
- **Features**:
  - Filter by: Active, Completed, Archived, All
  - Search by trip name
  - View trip statistics (expense count, totals)
  - **Button**: ➕ New Trip → `/trips/new`
- **Navigation**: Available in sidebar as "✈️ Trips"

### **2. Create New Trip** (`/trips/new`)
- **Purpose**: Create a new trip to track expenses
- **Form Fields**:
  - Trip Title * (required)
  - Start Date
  - Budget Head (cost center/dept code)
  - Purpose
  - Additional Notes
- **Actions**:
  - ✈️ Create Trip → Redirects to `/trips/[id]`
  - Cancel → Returns to Trips List
- **Navigation**: From `/trips` page, click "➕ New Trip" button

### **3. Trip Detail** (`/trips/[id]`)
- **Purpose**: View and manage a specific trip with all expenses
- **Features**:
  - Trip Summary (total expenses, advance drawn, reimbursable amount)
  - Edit trip details (title, budget head, notes, advance drawn)
  - Toggle favorite/completed status
  - List of all expenses with clickable links
  - **Button**: ➕ Add Expense → `/trips/[id]/expenses/new`
- **Buttons**:
  - ⭐ Toggle Favorite
  - ✓ Mark Complete
  - ✏️ Edit Trip Details
  - ➕ Add Expense
- **Expense Navigation**: Click any expense card → `/trips/[id]/expenses/[expenseId]`

### **4. Add New Expense** (`/trips/[id]/expenses/new`)
- **Purpose**: Log a new expense for the trip
- **Form Fields**:
  - Title * (required) - e.g., "Flight ticket"
  - Description
  - Amount (₹) * (required)
  - Currency (INR, USD, EUR, GBP)
  - Category (Transport, Accommodation, Food, Activities, Equipment, Documents, Other)
  - Payment Date
- **Actions**:
  - 💳 Create Expense → Redirects to expense detail page
  - Cancel → Back to Trip Detail
- **Navigation**: From `/trips/[id]`, click "➕ Add Expense" button

### **5. Expense Detail** (`/trips/[id]/expenses/[expenseId]`)
- **Purpose**: View, edit, or delete an individual expense
- **Features**:
  - View expense details (amount, category, date, description)
  - Edit expense information
  - Delete expense with confirmation
- **Buttons**:
  - ✏️ Edit (toggles edit mode)
  - 💾 Save Changes (when editing)
  - 🗑️ Delete
  - Cancel (when editing)
- **Navigation**: From `/trips/[id]` expense list, click any expense card

### **6. Dashboard / Analytics** (`/trips/analytics`)
- **Purpose**: View reimbursement statistics and insights
- **Metrics Displayed**:
  - Total Trips
  - Ongoing Trips
  - Completed Trips
  - Total Expenses Count
  - Total Amount (₹)
  - Approved Amount (₹)
  - Pending Amount (₹)
  - Expenses by Category (with visual breakdown)
- **Quick Actions**:
  - 📋 View All Trips
  - ➕ Create New Trip
- **Navigation**: Available in sidebar as "📊 Analytics"

### **7. User Profile** (`/profile`)
- **Purpose**: Manage personal information and account settings
- **Profile Fields** (Editable):
  - Full Name
  - Email (read-only)
  - Employee Code
  - Grade/Level
  - Designation
  - Department
- **Features**:
  - ✏️ Edit Profile Information
  - 💾 Save Changes
  - Payment Methods Management (view/delete cards)
  - Add Payment Methods button (placeholder)
  - 🚪 Sign Out
- **Navigation**: Available in sidebar as "👤 Profile"

---

## 🗓️ Navigation Sidebar (Submitter)

```
Submitter
├── ✈️ Trips          → /trips
├── 📊 Analytics      → /trips/analytics
├── 👤 Profile        → /profile
```

---

## 📊 API Endpoints

### **Trip APIs**
- `GET /api/trips` - List user's trips with filters
- `POST /api/trips` - Create new trip
- `GET /api/trips/[id]` - Get trip details with expenses
- `PATCH /api/trips/[id]` - Update trip (title, budget head, notes, advance drawn)
- `DELETE /api/trips/[id]` - Delete trip

### **Expense APIs**
- `GET /api/trips/[id]/expenses` - List expenses for a trip
- `POST /api/trips/[id]/expenses` - Create new expense
- `GET /api/trips/[id]/expenses/[expenseId]` - Get expense details
- `PATCH /api/trips/[id]/expenses/[expenseId]` - Update expense
- `DELETE /api/trips/[id]/expenses/[expenseId]` - Delete expense

### **Profile APIs**
- `GET /api/profile` - Get user profile
- `PATCH /api/profile` - Update user profile fields
- `GET /api/profile/payment-cards` - List payment cards
- `POST /api/profile/payment-cards` - Add payment card
- `DELETE /api/profile/payment-cards/[id]` - Delete payment card

---

## 🔄 User Journey Flow

### **Typical Submitter Journey**

1. **Login** → `/auth/signin`
2. **View Trips** → `/trips`
   - Filter, search, or view existing trips
3. **Create New Trip** → `/trips/new`
   - Fill in trip details (title, start date, budget head, etc.)
   - Click "✈️ Create Trip"
4. **Trip Detail** → `/trips/[id]`
   - View trip summary and statistics
   - See all expenses
5. **Add Expense** → `/trips/[id]/expenses/new`
   - Log expense details (title, amount, category, date)
   - Click "💳 Create Expense"
6. **Expense Detail** → `/trips/[id]/expenses/[expenseId]`
   - View expense details
   - Edit or delete if needed
7. **View Analytics** → `/trips/analytics`
   - Check expense breakdown by category
   - View total amounts and reimbursement status
8. **Manage Profile** → `/profile`
   - Update personal information
   - Manage payment methods
   - Sign out

---

## ✨ Button Navigation Map

### On Each Page

| Page | Buttons | Links To |
|------|---------|----------|
| `/trips` | ➕ New Trip | `/trips/new` |
| `/trips` | Expense cards | `/trips/[id]` |
| `/trips/new` | ✈️ Create Trip | `/trips/[id]` |
| `/trips/new` | Cancel | `/trips` |
| `/trips/[id]` | ➕ Add Expense | `/trips/[id]/expenses/new` |
| `/trips/[id]` | Expense cards | `/trips/[id]/expenses/[expenseId]` |
| `/trips/[id]` | ✏️ Edit | Edit mode (in-place) |
| `/trips/[id]` | 💾 Save Changes | Save data |
| `/trips/[id]` | ⭐ Favorite | Toggle status |
| `/trips/[id]` | ✓ Complete | Toggle status |
| `/trips/[id]` | ← Back to Trips | `/trips` |
| `/trips/[id]/expenses/new` | 💳 Create Expense | `/trips/[id]/expenses/[expenseId]` |
| `/trips/[id]/expenses/new` | Cancel | `/trips/[id]` |
| `/trips/[id]/expenses/[expenseId]` | ✏️ Edit | Edit mode (in-place) |
| `/trips/[id]/expenses/[expenseId]` | 💾 Save Changes | Save data |
| `/trips/[id]/expenses/[expenseId]` | 🗑️ Delete | Delete with confirmation → `/trips/[id]` |
| `/trips/[id]/expenses/[expenseId]` | ← Back to Trip | `/trips/[id]` |
| `/trips/analytics` | 📋 View All Trips | `/trips` |
| `/trips/analytics` | ➕ Create New Trip | `/trips/new` |
| `/profile` | ✏️ Edit | Edit mode (in-place) |
| `/profile` | 💾 Save Changes | Save data |
| `/profile` | 🚪 Sign Out | `/auth/signin` |
| `/profile` | ← Back to Trips | `/trips` |

---

## 🎨 UI/UX Features Implemented

### **Consistent Styling**
- Primary color buttons for main actions (blue)
- Secondary buttons for alternative actions (gray)
- Danger buttons for destructive actions (red)
- Success buttons for completion (green)
- Warning colors for pending items (orange)

### **User Feedback**
- Loading states on form submissions
- Error messages for failed actions
- Success messages for completed actions
- Confirmation dialogs for destructive actions
- Form validation with required field indicators

### **Responsive Layout**
- Two-column grid layout for forms
- Flexible card layouts for information display
- Mobile-friendly input sizes
- Proper spacing and padding

### **Navigation**
- Sticky sidebar for easy navigation
- Back links on detail pages
- Breadcrumb-style navigation
- Quick filters and search functionality

---

## 🚀 Ready for Production

### ✅ Complete Submitter Section
- All pages created and functional
- All workflows connected with proper navigation
- API endpoints fully implemented
- User authentication and authorization working
- Form validation and error handling in place

### 📋 Next Phase Recommendations
1. Admin approval workflow
2. Reimbursement tracking
3. Multi-currency support UI
4. Offline sync implementation
5. Email notifications
6. Mobile app expansion

---

**All pages are now live and fully integrated with the backend workflow!**
