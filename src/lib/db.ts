// IndexedDB utilities for offline-first data storage
// This ensures user data is NEVER lost and always accessible offline

const DB_NAME = "reimbursify-db";
const DB_VERSION = 3; // Incremented for trips, expenses refactor, and new entities

interface Reimbursement {
  id: string;
  title: string;
  amount: number;
  category: string;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  localOnly?: boolean;
  syncStatus?: "pending" | "synced" | "error";
}

interface ExpenseForm {
  id: string;
  createdById: string;
  title: string;
  description?: string;
  currency: string;
  status: string;
  requiresApproval: boolean;
  approverEmail?: string;
  createdAt: string;
  updatedAt: string;
  localOnly?: boolean;
  syncStatus?: "pending" | "synced" | "error";
}

interface Expense {
  id: string;
  formId: string;
  submittedById: string;
  title: string;
  amount: number;
  currency: string;
  paymentDate: string;
  category: string;
  transactionNumber?: string;
  paymentMethod?: string;
  description?: string;
  vendor?: string;
  purpose?: string;
  status: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  approverRemarks?: string;
  createdAt: string;
  updatedAt: string;
  localOnly?: boolean;
  syncStatus?: "pending" | "synced" | "error";
}

interface BillFile {
  id: string;
  expenseId: string;
  fileName: string;
  fileData: string; // Base64 encoded
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

// New entities for updated schema
interface Trip {
  id: string;
  userId: string;
  title: string;
  startDate: string;
  isComplete: boolean;
  advanceddrawn: number;
  budgetHead: string;
  notes: string;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus?: "pending" | "synced" | "error";
}

interface PaymentCard {
  id: string;
  userId: string;
  cardLabel: string;
  cardType: string; // DEBIT, CREDIT, OTHER
  maskedNumber: string; // ****1234
  createdAt: string;
  syncStatus?: "pending" | "synced" | "error";
}

interface FormTemplate {
  id: string;
  admin_id: string;
  institute_id: string;
  templateSchema: any; // JSON with fields, tables, bindings
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  syncStatus?: "pending" | "synced" | "error";
}

interface Submission {
  id: string;
  template_id: string;
  user_id: string;
  trip_id: string;
  status: string; // Draft, Submitted, Approved, Rejected
  formData?: any; // JSON form response
  createdAt: string;
  updatedAt: string;
  syncStatus?: "pending" | "synced" | "error";
}

let db: IDBDatabase | null = null;

// Initialize IndexedDB
export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Reimbursements store
      if (!database.objectStoreNames.contains("reimbursements")) {
        const store = database.createObjectStore("reimbursements", {
          keyPath: "id",
        });
        store.createIndex("userId", "userId", { unique: false });
        store.createIndex("syncStatus", "syncStatus", { unique: false });
      }

      // Expense Forms store
      if (!database.objectStoreNames.contains("expenseForms")) {
        const formsStore = database.createObjectStore("expenseForms", {
          keyPath: "id",
        });
        formsStore.createIndex("createdById", "createdById", { unique: false });
        formsStore.createIndex("syncStatus", "syncStatus", { unique: false });
      }

      // Expenses store
      if (!database.objectStoreNames.contains("expenses")) {
        const expStore = database.createObjectStore("expenses", {
          keyPath: "id",
        });
        expStore.createIndex("formId", "formId", { unique: false });
        expStore.createIndex("tripId", "tripId", { unique: false });
        expStore.createIndex("submittedById", "submittedById", { unique: false });
        expStore.createIndex("syncStatus", "syncStatus", { unique: false });
      }

      // Bill Files store
      if (!database.objectStoreNames.contains("billFiles")) {
        const billStore = database.createObjectStore("billFiles", {
          keyPath: "id",
        });
        billStore.createIndex("expenseId", "expenseId", { unique: false });
      }

      // Trips store (new)
      if (!database.objectStoreNames.contains("trips")) {
        const tripStore = database.createObjectStore("trips", {
          keyPath: "id",
        });
        tripStore.createIndex("userId", "userId", { unique: false });
        tripStore.createIndex("syncStatus", "syncStatus", { unique: false });
        tripStore.createIndex("isArchived", "isArchived", { unique: false });
      }

      // Payment Cards store (new)
      if (!database.objectStoreNames.contains("paymentCards")) {
        const cardStore = database.createObjectStore("paymentCards", {
          keyPath: "id",
        });
        cardStore.createIndex("userId", "userId", { unique: false });
        cardStore.createIndex("syncStatus", "syncStatus", { unique: false });
      }

      // Form Templates store (new)
      if (!database.objectStoreNames.contains("formTemplates")) {
        const templateStore = database.createObjectStore("formTemplates", {
          keyPath: "id",
        });
        templateStore.createIndex("admin_id", "admin_id", { unique: false });
        templateStore.createIndex("institute_id", "institute_id", { unique: false });
        templateStore.createIndex("syncStatus", "syncStatus", { unique: false });
      }

      // Submissions store (new)
      if (!database.objectStoreNames.contains("submissions")) {
        const submissionStore = database.createObjectStore("submissions", {
          keyPath: "id",
        });
        submissionStore.createIndex("template_id", "template_id", { unique: false });
        submissionStore.createIndex("user_id", "user_id", { unique: false });
        submissionStore.createIndex("trip_id", "trip_id", { unique: false });
        submissionStore.createIndex("syncStatus", "syncStatus", { unique: false });
      }

      // Metadata store
      if (!database.objectStoreNames.contains("metadata")) {
        database.createObjectStore("metadata", { keyPath: "key" });
      }
    };
  });
}

// Save reimbursements locally
export async function saveReimbursementsLocally(
  reimbursements: Reimbursement[]
): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction(["reimbursements"], "readwrite");
  const store = transaction.objectStore("reimbursements");

  for (const item of reimbursements) {
    await new Promise((resolve, reject) => {
      const request = store.put({
        ...item,
        syncStatus: "synced",
        localOnly: false,
      });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Update last sync time
  await setMetadata("lastSync", new Date().toISOString());
}

// Get all local reimbursements for a user
export async function getLocalReimbursements(
  userId: string
): Promise<Reimbursement[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["reimbursements"], "readonly");
    const store = transaction.objectStore("reimbursements");
    const index = store.index("userId");
    const request = index.getAll(userId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const results = request.result as Reimbursement[];
      // Sort by created date descending
      resolve(results.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    };
  });
}

// Create a local reimbursement (before syncing to server)
export async function createLocalReimbursement(
  reimbursement: Omit<Reimbursement, "id" | "createdAt" | "updatedAt">
): Promise<Reimbursement> {
  const db = await initDB();
  const id = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const newReimbursement: Reimbursement = {
    ...reimbursement,
    id,
    createdAt: now,
    updatedAt: now,
    localOnly: true,
    syncStatus: "pending",
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["reimbursements"], "readwrite");
    const store = transaction.objectStore("reimbursements");
    const request = store.add(newReimbursement);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(newReimbursement);
  });
}

// Update a local reimbursement
export async function updateLocalReimbursement(
  id: string,
  updates: Partial<Reimbursement>
): Promise<Reimbursement> {
  const db = await initDB();

  return new Promise(async (resolve, reject) => {
    const transaction = db.transaction(["reimbursements"], "readwrite");
    const store = transaction.objectStore("reimbursements");
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const existing = getRequest.result as Reimbursement;
      if (!existing) {
        reject(new Error("Reimbursement not found"));
        return;
      }

      const updated: Reimbursement = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
        syncStatus: existing.syncStatus === "synced" ? "pending" : "pending",
      };

      const putRequest = store.put(updated);
      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => resolve(updated);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Copy successfully synced item back to store with correct ID
export async function markAsSynced(
  localId: string,
  serverId: string
): Promise<void> {
  const db = await initDB();

  return new Promise(async (resolve, reject) => {
    const transaction = db.transaction(["reimbursements"], "readwrite");
    const store = transaction.objectStore("reimbursements");
    const getRequest = store.get(localId);

    getRequest.onsuccess = () => {
      const item = getRequest.result as Reimbursement;
      if (!item) {
        reject(new Error("Item not found"));
        return;
      }

      // Delete old local version
      const deleteRequest = store.delete(localId);

      deleteRequest.onsuccess = () => {
        // Add with server ID
        const updated: Reimbursement = {
          ...item,
          id: serverId,
          localOnly: false,
          syncStatus: "synced",
        };

        const putRequest = store.add(updated);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      };

      deleteRequest.onerror = () => reject(deleteRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Get pending sync items
export async function getPendingSyncItems(): Promise<Reimbursement[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["reimbursements"], "readonly");
    const store = transaction.objectStore("reimbursements");
    const index = store.index("syncStatus");
    const request = index.getAll("pending");

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as Reimbursement[]);
  });
}

// Metadata helpers
export async function setMetadata(key: string, value: any): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["metadata"], "readwrite");
    const store = transaction.objectStore("metadata");
    const request = store.put({ key, value });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getMetadata(key: string): Promise<any> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["metadata"], "readonly");
    const store = transaction.objectStore("metadata");
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result as any;
      resolve(result ? result.value : null);
    };
  });
}

// Clear all data (for logout or reset)
export async function clearAllData(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      ["reimbursements", "metadata"],
      "readwrite"
    );

    const reimbStore = transaction.objectStore("reimbursements");
    const metaStore = transaction.objectStore("metadata");

    const reimbClear = reimbStore.clear();
    const metaClear = metaStore.clear();

    reimbClear.onerror = () => reject(reimbClear.error);
    metaClear.onerror = () => reject(metaClear.error);

    transaction.oncomplete = () => resolve();
  });
}

// Export for testing/debugging
export async function getAllData(): Promise<{
  reimbursements: Reimbursement[];
  metadata: any;
}> {
  const db = await initDB();
  const reimbursements = await new Promise<Reimbursement[]>((resolve, reject) => {
    const transaction = db.transaction(["reimbursements"], "readonly");
    const store = transaction.objectStore("reimbursements");
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as Reimbursement[]);
  });

  return {
    reimbursements,
    metadata: await getMetadata("lastSync"),
  };
}

// ===== EXPENSE FORMS =====

export async function createLocalForm(form: Omit<ExpenseForm, "id" | "createdAt" | "updatedAt">): Promise<ExpenseForm> {
  const db = await initDB();
  const id = `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const newForm: ExpenseForm = {
    ...form,
    id,
    createdAt: now,
    updatedAt: now,
    localOnly: true,
    syncStatus: "pending",
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["expenseForms"], "readwrite");
    const store = transaction.objectStore("expenseForms");
    const request = store.add(newForm);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(newForm);
  });
}

export async function getLocalForms(userId: string): Promise<ExpenseForm[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["expenseForms"], "readonly");
    const store = transaction.objectStore("expenseForms");
    const index = store.index("createdById");
    const request = index.getAll(userId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const results = request.result as ExpenseForm[];
      resolve(results.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    };
  });
}

export async function updateLocalForm(id: string, updates: Partial<ExpenseForm>): Promise<ExpenseForm> {
  const db = await initDB();

  return new Promise(async (resolve, reject) => {
    const transaction = db.transaction(["expenseForms"], "readwrite");
    const store = transaction.objectStore("expenseForms");
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const existing = getRequest.result as ExpenseForm;
      if (!existing) {
        reject(new Error("Form not found"));
        return;
      }

      const updated: ExpenseForm = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const putRequest = store.put(updated);
      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => resolve(updated);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

// ===== EXPENSES =====

export async function createLocalExpense(expense: Omit<Expense, "id" | "createdAt" | "updatedAt">): Promise<Expense> {
  const db = await initDB();
  const id = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const newExpense: Expense = {
    ...expense,
    id,
    createdAt: now,
    updatedAt: now,
    localOnly: true,
    syncStatus: "pending",
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["expenses"], "readwrite");
    const store = transaction.objectStore("expenses");
    const request = store.add(newExpense);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(newExpense);
  });
}

export async function getLocalExpenses(formId: string): Promise<Expense[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["expenses"], "readonly");
    const store = transaction.objectStore("expenses");
    const index = store.index("formId");
    const request = index.getAll(formId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const results = request.result as Expense[];
      resolve(results.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    };
  });
}

export async function updateLocalExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
  const db = await initDB();

  return new Promise(async (resolve, reject) => {
    const transaction = db.transaction(["expenses"], "readwrite");
    const store = transaction.objectStore("expenses");
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const existing = getRequest.result as Expense;
      if (!existing) {
        reject(new Error("Expense not found"));
        return;
      }

      const updated: Expense = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const putRequest = store.put(updated);
      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => resolve(updated);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

// ===== BILL FILES =====

export async function uploadBillFile(file: File, expenseId: string): Promise<BillFile> {
  const db = await initDB();
  const id = `bill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Read file as base64
  const fileData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const bill: BillFile = {
    id,
    expenseId,
    fileName: file.name,
    fileData,
    fileType: file.type,
    fileSize: file.size,
    uploadedAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["billFiles"], "readwrite");
    const store = transaction.objectStore("billFiles");
    const request = store.add(bill);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(bill);
  });
}

export async function getBillsForExpense(expenseId: string): Promise<BillFile[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["billFiles"], "readonly");
    const store = transaction.objectStore("billFiles");
    const index = store.index("expenseId");
    const request = index.getAll(expenseId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as BillFile[]);
  });
}

export async function deleteBillFile(billId: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["billFiles"], "readwrite");
    const store = transaction.objectStore("billFiles");
    const request = store.delete(billId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Save forms and expenses locally
export async function saveFormsLocally(forms: ExpenseForm[]): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction(["expenseForms"], "readwrite");
  const store = transaction.objectStore("expenseForms");

  for (const form of forms) {
    await new Promise((resolve, reject) => {
      const request = store.put({
        ...form,
        syncStatus: "synced",
        localOnly: false,
      });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
}

export async function saveExpensesLocally(expenses: Expense[]): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction(["expenses"], "readwrite");
  const store = transaction.objectStore("expenses");

  for (const expense of expenses) {
    await new Promise((resolve, reject) => {
      const request = store.put({
        ...expense,
        syncStatus: "synced",
        localOnly: false,
      });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
}

// Get pending sync items for forms and expenses
export async function getPendingForms(): Promise<ExpenseForm[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["expenseForms"], "readonly");
    const store = transaction.objectStore("expenseForms");
    const index = store.index("syncStatus");
    const request = index.getAll("pending");

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as ExpenseForm[]);
  });
}

export async function getPendingExpenses(): Promise<Expense[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["expenses"], "readonly");
    const store = transaction.objectStore("expenses");
    const index = store.index("syncStatus");
    const request = index.getAll("pending");

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as Expense[]);
  });
}

// ===== TRIPS (NEW) =====

export async function createLocalTrip(trip: Omit<Trip, "id" | "createdAt" | "updatedAt">): Promise<Trip> {
  const db = await initDB();
  const id = `trip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const newTrip: Trip = {
    ...trip,
    id,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["trips"], "readwrite");
    const store = transaction.objectStore("trips");
    const request = store.add(newTrip);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(newTrip);
  });
}

export async function getLocalTrips(userId: string): Promise<Trip[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["trips"], "readonly");
    const store = transaction.objectStore("trips");
    const index = store.index("userId");
    const request = index.getAll(userId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as Trip[]).filter(t => !t.isArchived));
  });
}

export async function saveTripsLocally(trips: Trip[]): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction(["trips"], "readwrite");
  const store = transaction.objectStore("trips");

  for (const trip of trips) {
    await new Promise((resolve, reject) => {
      const request = store.put({
        ...trip,
        syncStatus: "synced",
      });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
}

// ===== PAYMENT CARDS (NEW) =====

export async function createLocalPaymentCard(card: Omit<PaymentCard, "id" | "createdAt">): Promise<PaymentCard> {
  const db = await initDB();
  const id = `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const newCard: PaymentCard = {
    ...card,
    id,
    createdAt: now,
    syncStatus: "pending",
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["paymentCards"], "readwrite");
    const store = transaction.objectStore("paymentCards");
    const request = store.add(newCard);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(newCard);
  });
}

export async function getLocalPaymentCards(userId: string): Promise<PaymentCard[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["paymentCards"], "readonly");
    const store = transaction.objectStore("paymentCards");
    const index = store.index("userId");
    const request = index.getAll(userId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as PaymentCard[]);
  });
}

export async function savePaymentCardsLocally(cards: PaymentCard[]): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction(["paymentCards"], "readwrite");
  const store = transaction.objectStore("paymentCards");

  for (const card of cards) {
    await new Promise((resolve, reject) => {
      const request = store.put({
        ...card,
        syncStatus: "synced",
      });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
}

// ===== FORM TEMPLATES (NEW) =====

export async function createLocalFormTemplate(template: Omit<FormTemplate, "id" | "createdAt" | "updatedAt">): Promise<FormTemplate> {
  const db = await initDB();
  const id = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const newTemplate: FormTemplate = {
    ...template,
    id,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["formTemplates"], "readwrite");
    const store = transaction.objectStore("formTemplates");
    const request = store.add(newTemplate);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(newTemplate);
  });
}

export async function getLocalFormTemplates(instituteId: string): Promise<FormTemplate[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["formTemplates"], "readonly");
    const store = transaction.objectStore("formTemplates");
    const index = store.index("institute_id");
    const request = index.getAll(instituteId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as FormTemplate[]).filter(t => t.isActive));
  });
}

export async function saveFormTemplatesLocally(templates: FormTemplate[]): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction(["formTemplates"], "readwrite");
  const store = transaction.objectStore("formTemplates");

  for (const template of templates) {
    await new Promise((resolve, reject) => {
      const request = store.put({
        ...template,
        syncStatus: "synced",
      });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
}

// ===== SUBMISSIONS (NEW) =====

export async function createLocalSubmission(submission: Omit<Submission, "id" | "createdAt" | "updatedAt">): Promise<Submission> {
  const db = await initDB();
  const id = `submission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const newSubmission: Submission = {
    ...submission,
    id,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["submissions"], "readwrite");
    const store = transaction.objectStore("submissions");
    const request = store.add(newSubmission);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(newSubmission);
  });
}

export async function getLocalSubmissions(userId: string): Promise<Submission[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["submissions"], "readonly");
    const store = transaction.objectStore("submissions");
    const index = store.index("user_id");
    const request = index.getAll(userId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as Submission[]);
  });
}

export async function saveSubmissionsLocally(submissions: Submission[]): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction(["submissions"], "readwrite");
  const store = transaction.objectStore("submissions");

  for (const submission of submissions) {
    await new Promise((resolve, reject) => {
      const request = store.put({
        ...submission,
        syncStatus: "synced",
      });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
}
