"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { FormField, FormSection, FieldType, FIELD_CONFIGS, ExpenseType } from "@/types/forms";
import styles from "./FormBuilder.module.css";

interface FormBuilderProps {
  onSave: (sections: FormSection[], metadata?: any) => Promise<void>;
  initialSections?: FormSection[];
  initialMetadata?: any;
  loading?: boolean;
}

export function FormBuilder({
  onSave,
  initialSections = [],
  initialMetadata = {},
  loading = false,
}: FormBuilderProps) {
  const [sections, setSections] = useState<FormSection[]>(
    initialSections.length > 0
      ? initialSections
      : [{ id: "1", title: "Section 1", fields: [], position: 0 }]
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sections[0]?.id || "1");
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(initialMetadata || {});
  const [showFieldMenu, setShowFieldMenu] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [historyState, setHistoryState] = useState({
    stack: [sections],
    index: 0
  });

  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const commitChange = useCallback((newSections: FormSection[], immediate = false) => {
    setSections(newSections);

    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
    }

    const pushToHistory = () => {
      setHistoryState((prev) => {
        const truncated = prev.stack.slice(0, prev.index + 1);
        const nextStack = [...truncated, newSections];
        if (nextStack.length > 50) {
          nextStack.shift();
        }
        return {
          stack: nextStack,
          index: nextStack.length - 1
        };
      });
    };

    if (immediate) {
      pushToHistory();
    } else {
      historyTimeoutRef.current = setTimeout(pushToHistory, 800);
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
    setHistoryState((prev) => {
      if (prev.index > 0) {
        const newIndex = prev.index - 1;
        setSections(prev.stack[newIndex]);
        return { ...prev, index: newIndex };
      }
      return prev;
    });
  }, []);

  const handleRedo = useCallback(() => {
    if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
    setHistoryState((prev) => {
      if (prev.index < prev.stack.length - 1) {
        const newIndex = prev.index + 1;
        setSections(prev.stack[newIndex]);
        return { ...prev, index: newIndex };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if they are actively typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // Only ignore if it is not the escape case? No, actually letting Ctrl+Z happen everywhere is better
        // native inputs have their own undo, so we might want to respect that. BUT we are managing the React state! 
        // If they Ctrl-Z an input, the native input undo happens first, React state won't update, 
        // leading to mismatch if we interfere broadly. Let's let native input undo happen and only capture global undo?
        // Wait, native inputs fire onChange and update React state anyway. 
        // Let's NOT prevent default on inputs, let native input handle pure text undo?
        // BUT FormBuilder is highly granular. A field update triggers `updateField` and thus `commitChange`.
        // So typing 1 char creates a history event! This is very spammy for a global undo.
        // Actually, typing calls `onUpdate` which calls `updateField` which calls `commitChange`.
        // For a sophisticated builder, we shouldn't `commitChange` on every keystroke, but Next.js forms doing it is common.
      }
      
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (!isInput) {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (!isInput) {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const currentSection = sections.find((s) => s.id === selectedSectionId);

  const addField = (fieldType: FieldType) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type: fieldType,
      label: `New ${FIELD_CONFIGS[fieldType].label}`,
      required: false,
      position: (currentSection?.fields.length || 0),
      options: ["option1", "option2", "option3"].filter(
        () => ["checkbox", "multiple_choice", "dropdown"].includes(fieldType)
      ),
    };

    commitChange(
      sections.map((section) => {
        if (section.id === selectedSectionId) {
          return {
            ...section,
            fields: [...section.fields, newField],
          };
        }
        return section;
      }),
      true // Immediate structural change
    );
    setShowFieldMenu(false);
    setExpandedFieldId(newField.id);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    commitChange(
      sections.map((section) => {
        if (section.id === selectedSectionId) {
          return {
            ...section,
            fields: section.fields.map((field) =>
              field.id === fieldId ? { ...field, ...updates } : field
            ),
          };
        }
        return section;
      }),
      false // Debounced for typing
    );
  };

  const deleteField = (fieldId: string) => {
    commitChange(
      sections.map((section) => {
        if (section.id === selectedSectionId) {
          return {
            ...section,
            fields: section.fields.filter((field) => field.id !== fieldId),
          };
        }
        return section;
      }),
      true // Immediate structural change
    );
    setSelectedFieldId(null);
  };

  const addSection = () => {
    const newSection: FormSection = {
      id: `section-${Date.now()}`,
      title: `Section ${sections.length + 1}`,
      fields: [],
      position: sections.length,
    };
    commitChange([...sections, newSection], true);
    setSelectedSectionId(newSection.id);
  };

  const updateSection = (sectionId: string, updates: Partial<FormSection>) => {
    commitChange(
      sections.map((section) =>
        section.id === sectionId ? { ...section, ...updates } : section
      ),
      false // Debounced for typing
    );
  };

  const deleteSection = (sectionId: string) => {
    if (sections.length === 1) {
      setError("Cannot delete the last section");
      return;
    }
    const newSections = sections.filter((s) => s.id !== sectionId);
    commitChange(newSections, true);
    setSelectedSectionId(newSections[0].id);
  };

  const handleSave = async () => {
    try {
      setSavingForm(true);
      setError(null);
      await onSave(sections, metadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save form");
    } finally {
      setSavingForm(false);
    }
  };

  const moveFieldUp = (fieldId: string) => {
    commitChange(
      sections.map((section) => {
        if (section.id === selectedSectionId) {
          const fieldIndex = section.fields.findIndex((f) => f.id === fieldId);
          if (fieldIndex > 0) {
            const newFields = [...section.fields];
            [newFields[fieldIndex - 1], newFields[fieldIndex]] = [
              newFields[fieldIndex],
              newFields[fieldIndex - 1],
            ];
            return {
              ...section,
              fields: newFields.map((f, i) => ({ ...f, position: i })),
            };
          }
        }
        return section;
      }),
      true
    );
  };

  const moveFieldDown = (fieldId: string) => {
    commitChange(
      sections.map((section) => {
        if (section.id === selectedSectionId) {
          const fieldIndex = section.fields.findIndex((f) => f.id === fieldId);
          if (fieldIndex < section.fields.length - 1) {
            const newFields = [...section.fields];
            [newFields[fieldIndex], newFields[fieldIndex + 1]] = [
              newFields[fieldIndex + 1],
              newFields[fieldIndex],
            ];
            return {
              ...section,
              fields: newFields.map((f, i) => ({ ...f, position: i })),
            };
          }
        }
        return section;
      }),
      true
    );
  };

  return (
    <div className={styles.formBuilder}>
      <div className={styles.header}>
        <h2>Form Builder</h2>
        <div style={{ marginLeft: "2rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
          <input
            type="checkbox"
            id="requiresTripLink"
            checked={metadata.requiresTripLink || false}
            onChange={(e) => setMetadata({ ...metadata, requiresTripLink: e.target.checked })}
            style={{ width: "auto" }}
          />
          <label htmlFor="requiresTripLink" style={{ margin: 0, fontWeight: "600", color: "#374151" }}>Require Trip Link (1 entry per trip)</label>
        </div>
        <div style={{ flex: 1 }} />
        
        <div style={{ display: "flex", gap: "0.5rem", marginRight: "1.5rem" }}>
          <button
            onClick={handleUndo}
            disabled={historyState.index <= 0}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              color: historyState.index > 0 ? "var(--primary)" : "#cbd5e1",
              border: `1px solid ${historyState.index > 0 ? "var(--primary)" : "#e2e8f0"}`,
              borderRadius: "0.5rem",
              cursor: historyState.index > 0 ? "pointer" : "not-allowed",
              fontWeight: "600",
              fontSize: "0.85rem",
              transition: "all 0.2s"
            }}
            title="Undo (Ctrl+Z)"
          >
            ↩️ Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={historyState.index >= historyState.stack.length - 1}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              color: historyState.index < historyState.stack.length - 1 ? "var(--primary)" : "#cbd5e1",
              border: `1px solid ${historyState.index < historyState.stack.length - 1 ? "var(--primary)" : "#e2e8f0"}`,
              borderRadius: "0.5rem",
              cursor: historyState.index < historyState.stack.length - 1 ? "pointer" : "not-allowed",
              fontWeight: "600",
              fontSize: "0.85rem",
              transition: "all 0.2s"
            }}
            title="Redo (Ctrl+Y)"
          >
            ↪️ Redo
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={loading || savingForm}
          className={styles.saveBtn}
        >
          {savingForm ? "Saving..." : "Save Form"}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.container}>
        {/* Sidebar with field options */}
        <div className={styles.sidebar}>
          <div className={styles.fieldPanel}>
            <div
              className={styles.fieldPanelHeader}
              onClick={() => setShowFieldMenu(!showFieldMenu)}
            >
              <span>Add Fields</span>
              <span>{showFieldMenu ? "▼" : "▶"}</span>
            </div>

            {showFieldMenu && (
              <div className={styles.fieldMenu}>
                {Object.entries(FIELD_CONFIGS).reduce(
                  (groups, [type, config]) => {
                    const group = config.group;
                    if (!groups[group]) groups[group] = [];
                    groups[group].push({ type: type as FieldType, config });
                    return groups;
                  },
                  {} as Record<string, Array<{ type: FieldType; config: typeof FIELD_CONFIGS[FieldType] }>>
                ) &&
                  Object.entries(
                    Object.entries(FIELD_CONFIGS).reduce(
                      (groups, [type, config]) => {
                        const group = config.group;
                        if (!groups[group]) groups[group] = [];
                        groups[group].push({ type: type as FieldType, config });
                        return groups;
                      },
                      {} as Record<string, Array<{ type: FieldType; config: typeof FIELD_CONFIGS[FieldType] }>>
                    )
                  ).map(([groupLabel, fields]) => (
                    <div key={groupLabel} className={styles.fieldGroup}>
                      <h4>{groupLabel.charAt(0).toUpperCase() + groupLabel.slice(1)}</h4>
                      {fields.map(({ type, config }) => (
                        <button
                          key={type}
                          className={styles.fieldOption}
                          onClick={() => addField(type)}
                        >
                          <span>{config.icon}</span>
                          <span>{config.label}</span>
                        </button>
                      ))}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <button onClick={addSection} className={styles.addSectionBtn}>
            + Add Section
          </button>

          <div className={styles.sectionList}>
            <h3>Sections</h3>
            {sections.map((section) => (
              <div
                key={section.id}
                className={`${styles.sectionItem} ${
                  selectedSectionId === section.id ? styles.active : ""
                }`}
                onClick={() => setSelectedSectionId(section.id)}
              >
                <span>{section.title}</span>
                {sections.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSection(section.id);
                    }}
                    className={styles.deleteBtn}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main editor area */}
        <div className={styles.editor}>
          {currentSection && (
            <>
              <div className={styles.sectionHeader}>
                <input
                  type="text"
                  value={currentSection.title}
                  onChange={(e) =>
                    updateSection(selectedSectionId, { title: e.target.value })
                  }
                  className={styles.sectionTitle}
                  placeholder="Section Title"
                />
                <textarea
                  value={currentSection.description || ""}
                  onChange={(e) =>
                    updateSection(selectedSectionId, { description: e.target.value })
                  }
                  className={styles.sectionDescription}
                  placeholder="Section description (optional)"
                />
              </div>

              <div className={styles.fieldsContainer}>
                {currentSection.fields.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No fields added yet</p>
                    <p style={{ fontSize: "0.9rem", color: "#999" }}>
                      Click "Add Fields" to get started
                    </p>
                  </div>
                ) : (
                  currentSection.fields.map((field) => (
                    <FieldEditor
                      key={field.id}
                      field={field}
                      isSelected={selectedFieldId === field.id}
                      isExpanded={expandedFieldId === field.id}
                      onSelect={() => setSelectedFieldId(field.id)}
                      onToggleExpand={() =>
                        setExpandedFieldId(
                          expandedFieldId === field.id ? null : field.id
                        )
                      }
                      onUpdate={(updates) => updateField(field.id, updates)}
                      onDelete={() => deleteField(field.id)}
                      onMoveUp={() => moveFieldUp(field.id)}
                      onMoveDown={() =>
                        moveFieldDown(field.id)
                      }
                      canMoveUp={currentSection.fields[0]?.id !== field.id}
                      canMoveDown={
                        currentSection.fields[currentSection.fields.length - 1]
                          ?.id !== field.id
                      }
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Preview panel */}
        <div className={styles.preview}>
          <h3>Preview</h3>
          <div className={styles.previewContent}>
            {currentSection && (
              <>
                <h2>{currentSection.title}</h2>
                {currentSection.description && <p>{currentSection.description}</p>}
                {currentSection.fields.map((field) => (
                  <div key={field.id} className={styles.previewField}>
                    <label>
                      {field.label}
                      {field.required && <span style={{ color: "red" }}> *</span>}
                    </label>
                    {field.description && (
                      <p style={{ fontSize: "0.85rem", color: "#666" }}>
                        {field.description}
                      </p>
                    )}
                    <FieldPreview field={field} />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FieldEditorProps {
  field: FormField;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<FormField>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function FieldEditor({
  field,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: FieldEditorProps) {
  // Use fallback so if NEXT js hot reload hasn't picked up the new types in forms.ts, it doesn't crash the sidebar
  const config = FIELD_CONFIGS[field.type] || {
    key: field.type,
    label: field.type,
    icon: "🔧",
    description: "Unknown field",
    group: "advanced"
  };

  return (
    <div
      className={`${styles.fieldEditor} ${isSelected ? styles.selected : ""} ${
        isExpanded ? styles.expanded : ""
      }`}
    >
      <div className={styles.fieldHeader} onClick={onToggleExpand}>
        <div className={styles.fieldInfo} onClick={(e) => e.stopPropagation()}>
          <span>{config.icon}</span>
          <input
            type="text"
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className={styles.fieldLabel}
            placeholder="Field label"
            onClick={() => onSelect()}
          />
        </div>
        <div className={styles.fieldActions}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={!canMoveUp}
            className={styles.moveBtn}
            title="Move up"
          >
            ▲
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={!canMoveDown}
            className={styles.moveBtn}
            title="Move down"
          >
            ▼
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={styles.deleteBtn}
            title="Delete field"
          >
            ✕
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.fieldSettings}>
          <div className={styles.settingGroup}>
            <label>
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => onUpdate({ required: e.target.checked })}
              />
              Required
            </label>
          </div>

          {field.type === "short_text" && (
            <div className={styles.settingGroup}>
              <label htmlFor="placeholder">Placeholder</label>
              <input
                id="placeholder"
                type="text"
                value={field.placeholder || ""}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                placeholder="Placeholder text"
              />
            </div>
          )}

          {field.type === "long_text" && (
            <div className={styles.settingGroup}>
              <label htmlFor="placeholder">Placeholder</label>
              <textarea
                id="placeholder"
                value={field.placeholder || ""}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                placeholder="Placeholder text"
              />
            </div>
          )}

          {field.type === "number" && (
            <>
              <div className={styles.settingGroup}>
                <label htmlFor="minValue">Min Value</label>
                <input
                  id="minValue"
                  type="number"
                  value={field.minValue || ""}
                  onChange={(e) =>
                    onUpdate({ minValue: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
              <div className={styles.settingGroup}>
                <label htmlFor="maxValue">Max Value</label>
                <input
                  id="maxValue"
                  type="number"
                  value={field.maxValue || ""}
                  onChange={(e) =>
                    onUpdate({ maxValue: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
            </>
          )}

          {["checkbox", "multiple_choice", "dropdown"].includes(field.type) && (
            <div className={styles.settingGroup}>
              <label>Options</label>
              {field.options?.map((option, index) => (
                <div key={index} className={styles.optionInput}>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...(field.options || [])];
                      newOptions[index] = e.target.value;
                      onUpdate({ options: newOptions });
                    }}
                    placeholder={`Option ${index + 1}`}
                  />
                  <button
                    onClick={() => {
                      const newOptions = field.options?.filter((_, i) => i !== index) || [];
                      onUpdate({ options: newOptions });
                    }}
                    className={styles.deleteOptionBtn}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newOptions = [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`];
                  onUpdate({ options: newOptions });
                }}
                className={styles.addOptionBtn}
              >
                + Add Option
              </button>
            </div>
          )}

          {field.type === "linear_scale" && (
            <>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div className={styles.settingGroup} style={{ flex: 1 }}>
                  <label htmlFor="scaleStart">Scale Start</label>
                  <input
                    id="scaleStart"
                    type="number"
                    value={field.scaleStart || 1}
                    onChange={(e) => onUpdate({ scaleStart: Number(e.target.value) })}
                  />
                </div>
                <div className={styles.settingGroup} style={{ flex: 1 }}>
                  <label htmlFor="scaleEnd">Scale End</label>
                  <input
                    id="scaleEnd"
                    type="number"
                    value={field.scaleEnd || 10}
                    onChange={(e) => onUpdate({ scaleEnd: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div className={styles.settingGroup} style={{ flex: 1 }}>
                  <label htmlFor="minLabel">Start Label (Optional)</label>
                  <input
                    id="minLabel"
                    type="text"
                    value={field.minLabel || ""}
                    onChange={(e) => onUpdate({ minLabel: e.target.value })}
                    placeholder="e.g., Strongly Disagree"
                  />
                </div>
                <div className={styles.settingGroup} style={{ flex: 1 }}>
                  <label htmlFor="maxLabel">End Label (Optional)</label>
                  <input
                    id="maxLabel"
                    type="text"
                    value={field.maxLabel || ""}
                    onChange={(e) => onUpdate({ maxLabel: e.target.value })}
                    placeholder="e.g., Strongly Agree"
                  />
                </div>
              </div>
            </>
          )}

          {field.type === "expense_type" && (
            <div className={styles.settingGroup}>
              <label>Help Text</label>
              <textarea
                value={field.helpText || ""}
                onChange={(e) => onUpdate({ helpText: e.target.value })}
                placeholder="Help text for users"
              />
            </div>
          )}

          <div className={styles.settingGroup}>
            <label htmlFor="helpText">Help Text</label>
            <textarea
              id="helpText"
              value={field.helpText || ""}
              onChange={(e) => onUpdate({ helpText: e.target.value })}
              placeholder="Additional information for respondents"
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface FieldPreviewProps {
  field: FormField;
}

function FieldPreview({ field }: FieldPreviewProps) {
  switch (field.type) {
    case "short_text":
      return (
        <input
          type="text"
          placeholder={field.placeholder || "Short text"}
          disabled
          style={{ width: "100%", padding: "0.5rem", borderRadius: "0.25rem" }}
        />
      );
    case "long_text":
      return (
        <textarea
          placeholder={field.placeholder || "Long text"}
          disabled
          style={{ width: "100%", minHeight: "100px", padding: "0.5rem", borderRadius: "0.25rem" }}
        />
      );
    case "number":
    case "decimal":
      return (
        <input
          type="number"
          placeholder="0"
          disabled
          style={{ width: "100%", padding: "0.5rem", borderRadius: "0.25rem" }}
        />
      );
    case "email":
      return (
        <input
          type="email"
          placeholder="email@example.com"
          disabled
          style={{ width: "100%", padding: "0.5rem", borderRadius: "0.25rem" }}
        />
      );
    case "phone":
      return (
        <input
          type="tel"
          placeholder="+1234567890"
          disabled
          style={{ width: "100%", padding: "0.5rem", borderRadius: "0.25rem" }}
        />
      );
    case "date":
      return (
        <input
          type="date"
          disabled
          style={{ width: "100%", padding: "0.5rem", borderRadius: "0.25rem" }}
        />
      );
    case "time":
      return (
        <input
          type="time"
          disabled
          style={{ width: "100%", padding: "0.5rem", borderRadius: "0.25rem" }}
        />
      );
    case "datetime":
      return (
        <input
          type="datetime-local"
          disabled
          style={{ width: "100%", padding: "0.5rem", borderRadius: "0.25rem" }}
        />
      );
    case "checkbox":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {field.options?.map((option, idx) => (
            <label key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" disabled />
              {option}
            </label>
          ))}
        </div>
      );
    case "multiple_choice":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {field.options?.map((option, idx) => (
            <label key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="radio" disabled />
              {option}
            </label>
          ))}
        </div>
      );
    case "dropdown":
      return (
        <select disabled style={{ width: "100%", padding: "0.5rem", borderRadius: "0.25rem" }}>
          <option>Select an option</option>
          {field.options?.map((option, idx) => (
            <option key={idx}>{option}</option>
          ))}
        </select>
      );
    case "linear_scale":
      return (
        <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem" }}>
          {field.minLabel && <span style={{ fontSize: "0.85rem", color: "#666", paddingBottom: "0.25rem" }}>{field.minLabel}</span>}
          <div style={{ display: "flex", gap: "1rem", flex: 1, justifyContent: "space-between" }}>
            {Array.from({ length: (field.scaleEnd || 10) - (field.scaleStart || 1) + 1 }).map(
              (_, idx) => (
                <label key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                  <input type="radio" disabled />
                  <span style={{ fontSize: "0.8rem" }}>{(field.scaleStart || 1) + idx}</span>
                </label>
              )
            )}
          </div>
          {field.maxLabel && <span style={{ fontSize: "0.85rem", color: "#666", paddingBottom: "0.25rem" }}>{field.maxLabel}</span>}
        </div>
      );
    case "rating":
      return (
        <div style={{ display: "flex", gap: "0.5rem", fontSize: "1.5rem" }}>
          {Array.from({ length: 5 }).map((_, idx) => (
            <span key={idx} style={{ cursor: "pointer" }}>★</span>
          ))}
        </div>
      );
    case "expense_type":
      return (
        <select disabled style={{ width: "100%", padding: "0.5rem", borderRadius: "0.25rem" }}>
          <option>Select expense type</option>
          <option>Air</option>
          <option>Train</option>
          <option>Taxi</option>
          <option>Bus</option>
          <option>Food</option>
          <option>Lodging</option>
          <option>Registration</option>
          <option>Visa</option>
          <option>Other</option>
        </select>
      );
    case "file_upload":
      return (
        <div style={{ border: "2px dashed #cbd5e1", padding: "1.5rem", textAlign: "center", borderRadius: "0.5rem", background: "#f8fafc", color: "#64748b" }}>
          📎 Click or drag to upload receipt/document
        </div>
      );
    case "data_grid":
      return (
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e2e8f0", borderRadius: "0.5rem", overflow: "hidden" }}>
          <thead style={{ background: "#f1f5f9", fontSize: "0.85rem", color: "#475569" }}>
            <tr>
              <th style={{ borderBottom: "1px solid #e2e8f0", padding: "0.75rem", textAlign: "left" }}>Departure</th>
              <th style={{ borderBottom: "1px solid #e2e8f0", padding: "0.75rem", textAlign: "left" }}>Arrival</th>
              <th style={{ borderBottom: "1px solid #e2e8f0", padding: "0.75rem", textAlign: "left" }}>Distance</th>
              <th style={{ borderBottom: "1px solid #e2e8f0", padding: "0.75rem", textAlign: "left" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "0.75rem", color: "#94a3b8" }}>...</td>
              <td style={{ padding: "0.75rem", color: "#94a3b8" }}>...</td>
              <td style={{ padding: "0.75rem", color: "#94a3b8" }}>...</td>
              <td style={{ padding: "0.75rem", color: "#94a3b8" }}>...</td>
            </tr>
          </tbody>
        </table>
      );
    case "expense_cards_table":
      return (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #d1fae5", borderRadius: "0.5rem", fontSize: "0.78rem" }}>
            <thead style={{ background: "#f0fdf4" }}>
              <tr>
                {["☑", "Date", "From", "To", "Mode", "Class", "Ticket/PNR", "Dist.(km)", "Fare (₹)"].map((h) => (
                  <th key={h} style={{ padding: "0.5rem 0.6rem", textAlign: "left", fontWeight: "600", color: "#1b5e3f", borderBottom: "2px solid #d1fae5", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                {["☐", "15/05", "Delhi", "Mumbai", "Air", "Economy", "6E-301", "1400", "₹4,200"].map((v, i) => (
                  <td key={i} style={{ padding: "0.5rem 0.6rem", color: "#9ca3af" }}>{v}</td>
                ))}
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                {["☐", "18/05", "Mumbai", "Delhi", "Train", "2A", "12952", "1400", "₹1,680"].map((v, i) => (
                  <td key={i} style={{ padding: "0.5rem 0.6rem", color: "#9ca3af" }}>{v}</td>
                ))}
              </tr>
            </tbody>
            <tfoot style={{ background: "#f0fdf4" }}>
              <tr>
                <td colSpan={8} style={{ padding: "0.5rem 0.6rem", textAlign: "right", fontWeight: "700", color: "#166534", fontSize: "0.82rem" }}>Total:</td>
                <td style={{ padding: "0.5rem 0.6rem", fontWeight: "700", color: "#1b5e3f" }}>₹5,880</td>
              </tr>
            </tfoot>
          </table>
          <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.4rem", fontStyle: "italic" }}>✈️ User selects their saved Air / Train / Taxi / Bus expense cards when filling the form</p>
        </div>
      );
    case "accommodation_cards_table":
      return (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #d1fae5", borderRadius: "0.5rem", fontSize: "0.78rem" }}>
            <thead style={{ background: "#f0fdf4" }}>
              <tr>
                {["☑", "Check-in", "Check-out", "Hotel / Guest House", "Bill No.", "Days", "Amount (₹)"].map((h) => (
                  <th key={h} style={{ padding: "0.5rem 0.6rem", textAlign: "left", fontWeight: "600", color: "#1b5e3f", borderBottom: "2px solid #d1fae5", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                {["☐", "15/05", "18/05", "Hotel Leela Palace", "REC-1234", "3", "₹6,000"].map((v, i) => (
                  <td key={i} style={{ padding: "0.5rem 0.6rem", color: "#9ca3af" }}>{v}</td>
                ))}
              </tr>
            </tbody>
            <tfoot style={{ background: "#f0fdf4" }}>
              <tr>
                <td colSpan={6} style={{ padding: "0.5rem 0.6rem", textAlign: "right", fontWeight: "700", color: "#166534", fontSize: "0.82rem" }}>Total:</td>
                <td style={{ padding: "0.5rem 0.6rem", fontWeight: "700", color: "#1b5e3f" }}>₹6,000</td>
              </tr>
            </tfoot>
          </table>
          <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.4rem", fontStyle: "italic" }}>🏨 User selects their saved Lodging expense cards when filling the form</p>
        </div>
      );
    case "other_expenses_table":
      return (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #d1fae5", borderRadius: "0.5rem", fontSize: "0.78rem" }}>
            <thead style={{ background: "#f0fdf4" }}>
              <tr>
                {["☑", "Sr. No.", "Details", "Type", "Amount (₹)"].map((h) => (
                  <th key={h} style={{ padding: "0.5rem 0.6rem", textAlign: "left", fontWeight: "600", color: "#1b5e3f", borderBottom: "2px solid #d1fae5", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                {["☐", "1", "Registration Fee — ICML 2024", "Registration", "₹3,500"].map((v, i) => (
                  <td key={i} style={{ padding: "0.5rem 0.6rem", color: "#9ca3af" }}>{v}</td>
                ))}
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                {["☐", "2", "Visa Fees — US Visa", "Visa", "₹8,000"].map((v, i) => (
                  <td key={i} style={{ padding: "0.5rem 0.6rem", color: "#9ca3af" }}>{v}</td>
                ))}
              </tr>
            </tbody>
            <tfoot style={{ background: "#f0fdf4" }}>
              <tr>
                <td colSpan={4} style={{ padding: "0.5rem 0.6rem", textAlign: "right", fontWeight: "700", color: "#166534", fontSize: "0.82rem" }}>Total:</td>
                <td style={{ padding: "0.5rem 0.6rem", fontWeight: "700", color: "#1b5e3f" }}>₹11,500</td>
              </tr>
            </tfoot>
          </table>
          <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.4rem", fontStyle: "italic" }}>🧾 User selects their saved Registration / Visa / Food / Other expense cards when filling the form</p>
        </div>
      );
    case "signature_authority":
      return (
        <div style={{ marginTop: "2rem", display: "inline-block", textAlign: "center", minWidth: "200px" }}>
          <div style={{ borderBottom: "1px dashed #64748b", height: "40px", marginBottom: "0.5rem", color: "#94a3b8", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "0.2rem", fontSize: "0.85rem", fontStyle: "italic" }}>
             (Will be stamped upon manager approval)
          </div>
          <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "#334155" }}>
            {field.label || "Signature Authority"}
          </div>
        </div>
      );
    case "staticText":
      return (
        <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "0.5rem", color: "#475569", fontSize: "0.95rem", whiteSpace: "pre-wrap", border: "1px solid #e2e8f0" }}>
          {field.description || "Read-only static text block."}
        </div>
      );
    case "yesno":
      return (
        <div style={{ display: "flex", gap: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><input type="radio" disabled />Yes</label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><input type="radio" disabled />No</label>
        </div>
      );
    default:
      return <div>Unsupported field type</div>;
  }
}
