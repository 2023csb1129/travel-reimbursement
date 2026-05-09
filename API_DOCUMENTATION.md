# Reimbursify API Documentation

**Base URL**: `http://localhost:3000/api` (development)  
**API Version**: 1.0  
**Last Updated**: April 15, 2026

---

## Table of Contents

1. [Authentication](#authentication)
2. [Trips API](#trips-api)
3. [Expenses API](#expenses-api)
4. [Forms API](#forms-api)
5. [Submissions API](#submissions-api)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)

---

## Authentication

All API endpoints (except `/api/auth/*`) require authentication. Use NextAuth.js session management.

### Login

```bash
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@iitropar.ac.in",
  "password": "password123"
}
```

**Response**: Redirects or returns session token

### Get Current Session

```bash
GET /api/auth/session
```

**Response**:
```json
{
  "user": {
    "id": "user_123",
    "email": "user@iitropar.ac.in",
    "name": "Dhruv Yadav",
    "role": "SUBMITTER"
  },
  "expires": "2024-05-15T10:00:00Z"
}
```

---

## Trips API

### List User's Trips

```bash
GET /api/trips
Authorization: Bearer <session_token>

# Query Parameters
?archived=false          # Exclude archived trips (default: false)
?favorites=true          # Only favorites
?sort=date              # Sort by: createdAt (default) or date
?search=conference      # Search in title
```

**Response**:
```json
{
  "trips": [
    {
      "id": "trip_123",
      "title": "Conference Visit - Delhi",
      "startDate": "2024-05-15T00:00:00Z",
      "userId": "user_123",
      "isCompleted": false,
      "advanceDrawn": 10000,
      "budgetHead": "Conference Travel",
      "purpose": "Research conference attendance",
      "notes": "3-day conference",
      "isFavorite": true,
      "isArchived": false,
      "totalAmount": 45000,
      "netReimbursable": 35000,
      "expenseCount": 3,
      "createdAt": "2024-04-15T10:00:00Z",
      "updatedAt": "2024-04-15T10:00:00Z"
    }
  ]
}
```

### Create Trip

```bash
POST /api/trips
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "title": "Conference Visit - Delhi",
  "startDate": "2024-05-15T00:00:00Z",
  "purpose": "Research conference attendance",
  "budgetHead": "CONF001",
  "advanceDrawn": 10000,
  "notes": "3-day conference"
}
```

**Response**: `201 Created`
```json
{
  "trip": {
    "id": "trip_123",
    "title": "Conference Visit - Delhi",
    ...
  }
}
```

### Get Trip Details

```bash
GET /api/trips/:id
Authorization: Bearer <session_token>
```

**Response**:
```json
{
  "trip": { /* full trip object */ },
  "expenses": [ /* all expenses for this trip */ ],
  "submissions": [ /* all submissions for this trip */ ]
}
```

### Update Trip

```bash
PATCH /api/trips/:id
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "title": "Conference Visit - Delhi (Updated)",
  "isCompleted": true,
  "isFavorite": true
}
```

### Delete Trip

```bash
DELETE /api/trips/:id
Authorization: Bearer <session_token>
```

**Response**: `204 No Content`

---

## Expenses API

### List Expenses

```bash
GET /api/expenses
Authorization: Bearer <session_token>

# Query Parameters
?tripId=trip_123       # Filter by trip
?status=SUBMITTED      # Filter by status: DRAFT, SUBMITTED, APPROVED, REJECTED, REIMBURSED
?category=Travel       # Filter by category: Travel, Other, Personal
```

**Response**:
```json
{
  "expenses": [
    {
      "id": "exp_123",
      "tripId": "trip_123",
      "submittedById": "user_123",
      "category": "Travel",
      "expenseType": "Air",
      "title": "Flight to Delhi",
      "amount": 15000,
      "currency": "INR",
      "paymentDate": "2024-05-15T00:00:00Z",
      "status": "SUBMITTED",
      "submittedAt": "2024-04-15T10:00:00Z",
      "approvedAt": null,
      "approverRemarks": null,
      "bills": [
        {
          "id": "bill_123",
          "fileName": "receipt.pdf",
          "fileType": "application/pdf",
          "fileSize": 250000,
          "uploadedAt": "2024-04-15T10:00:00Z"
        }
      ]
    }
  ]
}
```

### Create Expense

```bash
POST /api/expenses
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "tripId": "trip_123",
  "category": "Travel",
  "expenseType": "Air",
  "title": "Flight to Delhi",
  "amount": 15000,
  "currency": "INR",
  "paymentDate": "2024-05-15T00:00:00Z",
  "paymentMethod": "Credit Card",
  "vendor": "IndiGo",
  "billNumber": "INV123456",
  "description": "Flight ticket for conference"
}
```

**Response**: `201 Created`

### Update Expense

```bash
PATCH /api/expenses/:id
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "status": "SUBMITTED",
  "description": "Updated description"
}
```

### Delete Expense

```bash
DELETE /api/expenses/:id
Authorization: Bearer <session_token>
```

### Upload Bill

```bash
POST /api/expenses/:id/bills
Authorization: Bearer <session_token>
Content-Type: multipart/form-data

FormData:
- file: <binary file>
```

**Response**: `201 Created`
```json
{
  "bill": {
    "id": "bill_123",
    "fileName": "receipt.pdf",
    "fileType": "application/pdf",
    "fileSize": 250000,
    "uploadedAt": "2024-04-15T10:00:00Z"
  }
}
```

---

## Forms API

### List Form Templates

```bash
GET /api/forms
Authorization: Bearer <session_token>

# Query Parameters
?active=true           # Only active forms
?search=travel         # Search in title
```

**Response**:
```json
{
  "forms": [
    {
      "id": "form_123",
      "title": "Business Trip Reimbursement Form",
      "description": "Standard form for submitting business trip expenses",
      "version": 1,
      "isActive": true,
      "createdById": "user_admin",
      "instituteId": "inst_123",
      "createdAt": "2024-04-15T10:00:00Z",
      "updatedAt": "2024-04-15T10:00:00Z"
    }
  ],
  "total": 1
}
```

### Get Form Details

```bash
GET /api/forms/:id
Authorization: Bearer <session_token>
```

**Response**:
```json
{
  "form": {
    "id": "form_123",
    "title": "Business Trip Reimbursement Form",
    "templateSchema": {
      "fields": [
        {
          "id": "travel_details",
          "type": "section",
          "title": "Travel Details",
          "fields": [
            {
              "id": "from",
              "type": "text",
              "label": "From",
              "required": true
            }
          ]
        }
      ]
    },
    ...
  }
}
```

### Create Form (Admin Only)

```bash
POST /api/forms
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "title": "New Form Template",
  "description": "Description of form",
  "templateSchema": {
    "fields": [
      {
        "id": "field1",
        "type": "text",
        "label": "Field Label",
        "required": true
      }
    ]
  }
}
```

**Response**: `201 Created`

### Update Form (Admin Only)

```bash
PATCH /api/forms/:id
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "title": "Updated Title",
  "isActive": false
}
```

---

## Submissions API

### List Submissions

```bash
GET /api/submissions
Authorization: Bearer <session_token>

# Query Parameters
?status=SUBMITTED      # Filter by status
?tripId=trip_123       # Filter by trip
?templateId=form_123   # Filter by form template
```

**Response**:
```json
{
  "submissions": [
    {
      "id": "sub_123",
      "templateId": "form_123",
      "tripId": "trip_123",
      "userId": "user_123",
      "instituteId": "inst_123",
      "status": "SUBMITTED",
      "submissionDate": "2024-04-15T10:00:00Z",
      "reviewNotes": null,
      "generatedPdf": "base64_encoded_pdf_data",
      "generatedExcel": null,
      "generatedZip": null,
      "template": {
        "title": "Business Trip Reimbursement Form"
      },
      "trip": {
        "title": "Conference Visit - Delhi"
      },
      "createdAt": "2024-04-15T09:00:00Z",
      "updatedAt": "2024-04-15T10:00:00Z"
    }
  ],
  "total": 1
}
```

### Create Submission

```bash
POST /api/submissions
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "templateId": "form_123",
  "tripId": "trip_123"
}
```

**Response**: `201 Created`
```json
{
  "submission": {
    "id": "sub_123",
    "status": "DRAFT",
    ...
  },
  "message": "Submission created successfully"
}
```

### Get Submission

```bash
GET /api/submissions/:id
Authorization: Bearer <session_token>
```

**Response**:
```json
{
  "submission": { /* full submission object */ }
}
```

### Update Submission Status

```bash
PATCH /api/submissions/:id
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "status": "SUBMITTED",
  "submissionDate": "2024-04-15T10:00:00Z"
}
```

### Approve/Reject Submission (Admin Only)

```bash
PATCH /api/submissions/:id
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "status": "APPROVED",
  "reviewNotes": "Approved - all documents verified"
}
```

Or for rejection:

```json
{
  "status": "REJECTED",
  "reviewNotes": "Please resubmit with correct bank details"
}
```

### Download Submission Files

```bash
GET /api/submissions/:id/download?format=pdf
Authorization: Bearer <session_token>

# Formats: pdf, excel, zip
```

**Response**: File download (stream)

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "status": 400,
  "timestamp": "2024-04-15T10:00:00Z"
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200  | Success |
| 201  | Created |
| 204  | No Content |
| 400  | Bad Request (validation error) |
| 401  | Unauthorized (not logged in) |
| 403  | Forbidden (permission denied) |
| 404  | Not Found |
| 409  | Conflict (duplicate, etc) |
| 500  | Server Error |

### Error Examples

**Validation Error**:
```json
{
  "error": "Validation failed",
  "issues": [
    {
      "field": "amount",
      "message": "Amount must be positive"
    }
  ]
}
```

**Authentication Error**:
```json
{
  "error": "Unauthorized",
  "message": "Please log in to continue"
}
```

**Permission Error**:
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to perform this action"
}
```

---

## Rate Limiting

Currently no rate limiting is enforced. For production, implement:

- **Authenticated users**: 100 requests per minute
- **Bulk operations**: 10 requests per minute
- **File uploads**: 50 MB per request, 500 MB per hour

---

## Example Workflows

### Complete Expense Submission

```bash
# 1. Create trip
POST /api/trips
{
  "title": "Conference",
  "startDate": "2024-05-15"
}
# Returns: trip_123

# 2. Create expense
POST /api/expenses
{
  "tripId": "trip_123",
  "title": "Flight",
  "amount": 15000
}
# Returns: exp_123

# 3. Upload bill
POST /api/expenses/exp_123/bills
# Upload PDF file

# 4. Update expense status
PATCH /api/expenses/exp_123
{
  "status": "SUBMITTED"
}

# 5. Create form submission
POST /api/submissions
{
  "templateId": "form_123",
  "tripId": "trip_123"
}
# Returns: sub_123

# 6. Submit form
PATCH /api/submissions/sub_123
{
  "status": "SUBMITTED"
}
```

---

## Support

For API issues or questions:
- Email: support@reimbursify.local
- Documentation: See `README.md`
- Issues: Report via GitHub
