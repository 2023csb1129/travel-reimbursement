"use client";

import { useState, useRef } from "react";
import { EXPENSE_TYPES } from "@/lib/expense-config";

interface FormField {
  id: string;
  type: "signature" | "yesno" | "date" | "text" | "expenseTable" | "number" | "staticText";
  label: string;
  required: boolean;
  position: { x: number; y: number };
  width: number;
  height: number;
  properties?: Record<string, any>;
}

export const FormBuilder = ({ onSave }: { onSave: (schema: FormField[]) => void }) => {
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("New Reimbursement Form");
  const [formDescription, setFormDescription] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);

  const fieldTypes: { type: FormField["type"]; icon: string; label: string }[] = [
    { type: "text", icon: "📝", label: "Text" },
    { type: "number", icon: "🔢", label: "Number" },
    { type: "date", icon: "📅", label: "Date" },
    { type: "yesno", icon: "✓✗", label: "Yes/No" },
    { type: "signature", icon: "✍️", label: "Signature" },
    { type: "expenseTable", icon: "📊", label: "Expense Table" },
    { type: "staticText", icon: "📄", label: "Static Text" },
  ];

  const addField = (type: FormField["type"]) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: `${type} Field`,
      required: false,
      position: { x: 20 + fields.length * 10, y: 20 + fields.length * 10 },
      width: type === "expenseTable" ? 400 : 200,
      height: type === "expenseTable" ? 300 : 40,
      properties: {},
    };
    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const deleteField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
    if (selectedField === id) setSelectedField(null);
  };

  const handleCanvasDrag = (e: React.DragEvent, fieldId: string) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left);
    const y = Math.max(0, e.clientY - rect.top);

    updateField(fieldId, { position: { x, y } });
  };

  const saveForm = async () => {
    const response = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formTitle,
        description: formDescription,
        templateSchema: JSON.stringify(fields),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      alert(`Form saved successfully: ${data.id}`);
      onSave(fields);
    }
  };

  return (
    <div style={{ display: "flex", height: "100%", gap: "2rem", padding: "2rem", background: "#f9fafb" }}>
      {/* Toolbar */}
      <div
        style={{
          width: "300px",
          background: "white",
          borderRadius: "0.75rem",
          padding: "1.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          overflowY: "auto",
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>
            Form Title
          </label>
          <input
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              fontSize: "0.9rem",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>
            Description
          </label>
          <textarea
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              fontSize: "0.9rem",
              minHeight: "80px",
            }}
          />
        </div>

        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
          <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem", fontWeight: "600" }}>
            Add Fields
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {fieldTypes.map((ft) => (
              <button
                key={ft.type}
                onClick={() => addField(ft.type)}
                style={{
                  padding: "0.75rem",
                  background: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  textAlign: "center",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e5e7eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                }}
              >
                <div style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>{ft.icon}</div>
                <div>{ft.label}</div>
              </button>
            ))}
          </div>
        </div>

        {selectedField && (
          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
            <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem", fontWeight: "600" }}>
              Field Properties
            </h4>
            {fields
              .filter((f) => f.id === selectedField)
              .map((field) => (
                <div key={field.id} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: "600" }}>Label</label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: "1px solid #e5e7eb",
                        borderRadius: "0.4rem",
                        fontSize: "0.85rem",
                      }}
                    />
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(field.id, { required: e.target.checked })}
                    />
                    Required field
                  </label>
                  <button
                    onClick={() => deleteField(field.id)}
                    style={{
                      padding: "0.5rem",
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "0.4rem",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    Delete Field
                  </button>
                </div>
              ))}
          </div>
        )}

        <button
          onClick={saveForm}
          style={{
            padding: "0.75rem",
            background: "#1b5e3f",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontWeight: "600",
            marginTop: "auto",
          }}
        >
          Save Form
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        style={{
          flex: 1,
          background: "white",
          borderRadius: "0.75rem",
          padding: "2rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          position: "relative",
          overflow: "auto",
          minHeight: "600px",
          border: "2px dashed #d1d5db",
        }}
      >
        <h3 style={{ margin: "0 0 1rem 0", color: "#1a3a2e", fontSize: "1.25rem", fontWeight: "700" }}>
          {formTitle}
        </h3>

        {fields.length === 0 ? (
          <p style={{ color: "#9ca3af", textAlign: "center", marginTop: "2rem" }}>
            Drag fields from the left panel or click them to add to form
          </p>
        ) : (
          fields.map((field) => (
            <div
              key={field.id}
              draggable
              onDragEnd={(e) => handleCanvasDrag(e, field.id)}
              onClick={() => setSelectedField(field.id)}
              style={{
                position: "absolute",
                left: `${field.position.x}px`,
                top: `${field.position.y}px`,
                width: `${field.width}px`,
                minHeight: `${field.height}px`,
                padding: "0.75rem",
                background: selectedField === field.id ? "#f0f9f7" : "white",
                border: selectedField === field.id ? "2px solid #1b5e3f" : "1px solid #d1d5db",
                borderRadius: "0.5rem",
                cursor: "move",
                userSelect: "none",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#1a3a2e" }}>
                {field.label}
                {field.required && <span style={{ color: "#ef4444" }}> *</span>}
              </div>
              {field.type === "expenseTable" && (
                <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.5rem" }}>
                  (Users will select expenses here)
                </div>
              )}
              {field.type === "signature" && (
                <div style={{ fontSize: "0.8rem", color: "#6b7280", height: "60px", borderTop: "2px solid #d1d5db", marginTop: "0.75rem" }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
