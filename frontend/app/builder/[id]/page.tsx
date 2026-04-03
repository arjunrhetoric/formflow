'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { nanoid } from 'nanoid';
import { getForm, updateForm } from '@/lib/api/forms';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/context/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { FieldComponents } from '@/components/fields';
import { ChevronLeft, CheckCircle, Loader2, Link as LinkIcon, Settings, GripVertical, Trash2 } from 'lucide-react';

const PALETTE = [
  { type: 'short_text', label: 'Short Text' },
  { type: 'long_text', label: 'Long Text' },
  { type: 'number', label: 'Number' },
  { type: 'single_select', label: 'Single Select' },
  { type: 'multi_select', label: 'Multi Select' },
  { type: 'date_range', label: 'Date Range' },
  { type: 'file_upload', label: 'File Upload' },
  { type: 'rating', label: 'Rating' },
  { type: 'signature_pad', label: 'Signature Pad' },
];

function buildField(type: string, label: string, order: number) {
  return {
    id: `field_${nanoid(8)}`,
    type,
    order,
    label,
    config: type === 'single_select' || type === 'multi_select'
      ? { options: ['Option 1', 'Option 2'] }
      : {},
    validation: { required: false },
    logic: [],
  };
}

function SortableFieldCard({
  field,
  isSelected,
  onSelect,
  onDelete,
}: {
  field: any;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const Component = FieldComponents[field.type] || FieldComponents.short_text;
  const options = Array.isArray(field.config?.options)
    ? field.config.options.map((option: any) =>
        typeof option === 'string'
          ? { label: option, value: option }
          : option
      )
    : [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative p-5 rounded-xl border-2 transition-colors cursor-pointer group ${isSelected ? 'border-primary bg-muted/20' : 'border-transparent hover:border-border'}`}
      onClick={onSelect}
    >
      <div
        {...attributes}
        {...listeners}
        className={`absolute -left-3 top-1/2 -translate-y-1/2 p-1 bg-background border border-border rounded-md shadow-sm opacity-0 transition-opacity ${isSelected ? 'opacity-100' : 'group-hover:opacity-100'}`}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
      </div>
      <div className="pointer-events-none">
        <Component
          label={field.label}
          required={!!field.validation?.required}
          disabled
          options={options}
          placeholder={field.config?.placeholder}
          maxStars={field.config?.max_stars}
        />
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function WorkshopBuilder() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuth();
  const { emit, on } = useSocket(id);

  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadForm = useCallback(async () => {
    const response = await getForm(id);
    const nextForm = response.data.form;
    const nextFields = (nextForm.fields || []).slice().sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    setForm(nextForm);
    setFields(nextFields);
    setSelectedId((current) => current && nextFields.some((field: any) => field.id === current) ? current : nextFields[0]?.id || null);
  }, [id]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  useEffect(() => {
    if (!user?._id) {
      return;
    }

    emit('form:join', { formId: id });

    const offPatched = on('form:patched', (payload: any) => {
      if (payload?.actorId && payload.actorId === user._id) {
        return;
      }
      loadForm();
    });

    return () => offPatched();
  }, [emit, id, loadForm, on, user?._id]);

  const saveForm = useCallback(async (nextFields: any[], newTitle?: string, socketEvent?: { type: string; payload: any }) => {
    if (!form) {
      return;
    }

    const orderedFields = nextFields.map((field, index) => ({
      ...field,
      order: index + 1,
      config: field.config || {},
      validation: field.validation || { required: false },
      logic: field.logic || [],
    }));

    setSaving(true);
    const response = await updateForm(id, {
      title: newTitle ?? form.title,
      fields: orderedFields,
    });
    setForm(response.data.form);
    setFields(response.data.form.fields || []);
    setSaving(false);

    if (socketEvent) {
      emit(socketEvent.type, socketEvent.payload);
    }
  }, [emit, form, id]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    setFields((currentFields) => {
      const oldIndex = currentFields.findIndex((field) => field.id === active.id);
      const newIndex = currentFields.findIndex((field) => field.id === over.id);
      const reorderedFields = arrayMove(currentFields, oldIndex, newIndex).map((field, index) => ({
        ...field,
        order: index + 1,
      }));
      void saveForm(reorderedFields, undefined, {
        type: 'field:reorder',
        payload: { fieldOrder: reorderedFields.map((field) => field.id), version: form?.version },
      });
      return reorderedFields;
    });
  };

  const addField = (type: string, label: string) => {
    const nextField = buildField(type, label, fields.length + 1);
    const nextFields = [...fields, nextField];
    setFields(nextFields);
    setSelectedId(nextField.id);
    void saveForm(nextFields, undefined, {
      type: 'field:add',
      payload: { field: nextField, version: form?.version },
    });
  };

  const updateSelectedField = (changes: any) => {
    const nextFields = fields.map((field) => field.id === selectedId ? { ...field, ...changes } : field);
    setFields(nextFields);
    const updatedField = nextFields.find((field) => field.id === selectedId);
    void saveForm(nextFields, undefined, {
      type: 'field:update',
      payload: { fieldId: selectedId, patch: updatedField, version: form?.version },
    });
  };

  const deleteField = (fieldId: string) => {
    const nextFields = fields.filter((field) => field.id !== fieldId);
    setFields(nextFields);
    if (selectedId === fieldId) {
      setSelectedId(nextFields[0]?.id || null);
    }
    void saveForm(nextFields, undefined, {
      type: 'field:delete',
      payload: { fieldId, version: form?.version },
    });
  };

  const selectedField = fields.find((field) => field.id === selectedId);

  return (
    <AuthGuard>
      {!form ? (
        <div className="p-8">Loading builder...</div>
      ) : (
        <div className="flex flex-col h-screen bg-background overflow-hidden">
          <div className="flex h-14 items-center px-4 border-b border-border bg-card shrink-0 gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Input
              className="w-64 border-transparent hover:border-border font-bold text-lg px-2 h-9 -ml-2 bg-transparent"
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm({ ...form, title });
                void saveForm(fields, title, {
                  type: 'form:patch',
                  payload: { formPatch: { title }, version: form.version },
                });
              }}
            />
            <div className="bg-muted px-2 py-0.5 rounded-full text-xs font-semibold text-muted-foreground border border-border">v{form.version || 1}</div>

            <div className="flex items-center mx-auto bg-muted/50 p-1 rounded-md border border-border">
              <Button variant="ghost" className="h-8 bg-background shadow-sm px-4">Workshop</Button>
              <Button variant="ghost" className="h-8 px-4 text-muted-foreground" onClick={() => router.push(`/logic/${id}`)}>Logic</Button>
              <Button variant="ghost" className="h-8 px-4 text-muted-foreground" onClick={() => router.push(`/theme/${id}`)}>Theme</Button>
              <Button variant="ghost" className="h-8 px-4 text-muted-foreground" onClick={() => router.push(`/history/${id}`)}>History</Button>
              <Button variant="ghost" className="h-8 px-4 text-muted-foreground" onClick={() => router.push(`/vault/${id}`)}>Vault</Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center text-xs text-muted-foreground gap-1.5 font-medium">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 text-primary" />}
                {saving ? 'Saving...' : 'Saved'}
              </div>
              <Button variant="outline" className="h-8" onClick={() => { navigator.clipboard.writeText(window.location.origin + `/f/${form.slug}`); }}>
                <LinkIcon className="h-3 w-3 mr-2" /> Share
              </Button>
              <Button className="h-8" onClick={() => window.open(`/f/${form.slug}`, '_blank')}>Preview</Button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-64 border-r border-border bg-card flex flex-col p-4 overflow-y-auto shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Add Fields</h3>
              <div className="flex flex-col gap-2">
                {PALETTE.map((item) => (
                  <div
                    key={item.type}
                    onClick={() => addField(item.type, item.label)}
                    className="flex items-center px-3 py-2.5 rounded-md border border-border bg-background text-sm cursor-pointer hover:bg-muted font-medium transition-colors"
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 dot-grid overflow-y-auto p-8 relative">
              <div className="max-w-2xl mx-auto bg-card rounded-xl shadow-sm border border-border min-h-[500px] p-8 pb-16 relative">
                <h1 className="text-3xl font-bold tracking-tight mb-8 break-words leading-tight">{form.title}</h1>

                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-6">
                      {fields.map((field) => {
                        return (
                          <SortableFieldCard
                            key={field.id}
                            field={field}
                            isSelected={selectedId === field.id}
                            onSelect={() => setSelectedId(field.id)}
                            onDelete={() => deleteField(field.id)}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>

                {fields.length === 0 && (
                  <div className="mt-8 border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-muted-foreground opacity-60">
                    <span className="text-sm font-medium">Click a field on the left to add it here.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="w-80 border-l border-border bg-card p-5 overflow-y-auto shrink-0">
              {!selectedField ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 opacity-70">
                  <Settings className="h-8 w-8" />
                  <p className="text-sm font-medium">Select a field to edit</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <h3 className="font-bold text-lg">Field Config</h3>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Label</label>
                    <Input value={selectedField.label} onChange={(e) => updateSelectedField({ label: e.target.value })} />
                  </div>

                  {(selectedField.type === 'single_select' || selectedField.type === 'multi_select') && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Options (comma separated)</label>
                      <Input
                        value={(selectedField.config?.options || []).map((option: any) => typeof option === 'string' ? option : option.label).join(', ')}
                        onChange={(e) => {
                          const options = e.target.value
                            .split(',')
                            .map((value) => value.trim())
                            .filter(Boolean);
                          updateSelectedField({ config: { ...selectedField.config, options } });
                        }}
                      />
                    </div>
                  )}

                  <div className="h-px bg-border w-full" />

                  <h3 className="font-bold text-lg">Validation</h3>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Required</label>
                    <Switch
                      checked={!!selectedField.validation?.required}
                      onCheckedChange={(checked) => updateSelectedField({
                        validation: {
                          ...selectedField.validation,
                          required: checked,
                        },
                      })}
                    />
                  </div>

                  <div className="h-px bg-border w-full" />

                  <h3 className="font-bold text-lg">Logic</h3>
                  <Button variant="outline" className="w-full" onClick={() => router.push(`/logic/${id}`)}>
                    Open Logic Map
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
