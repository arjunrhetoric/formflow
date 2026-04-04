'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { nanoid } from 'nanoid';
import { motion, AnimatePresence } from 'framer-motion';
import { getForm, updateForm } from '@/lib/api/forms';
import { useAuth } from '@/context/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { THEME_PRESETS } from '@/lib/themes';
import { RemoteCursors } from '@/components/RemoteCursors';
import { PresenceAvatars } from '@/components/PresenceAvatars';
import { ShareDialog } from '@/components/ShareDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { FieldComponents } from '@/components/fields';
import {
  ChevronLeft, CheckCircle, Loader2, Link as LinkIcon,
  Settings, GripVertical, Trash2, Undo2, Redo2,
  Type, FileText, Hash, Mail, Phone, CheckSquare,
  List, Star, Calendar, Upload, PenTool, Copy
} from 'lucide-react';

const PALETTE = [
  { type: 'short_text', label: 'Short Text', icon: Type },
  { type: 'long_text', label: 'Long Text', icon: FileText },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'phone', label: 'Phone', icon: Phone },
  { type: 'single_select', label: 'Single Select', icon: CheckSquare },
  { type: 'multi_select', label: 'Multi Select', icon: List },
  { type: 'rating', label: 'Rating', icon: Star },
  { type: 'date_range', label: 'Date Range', icon: Calendar },
  { type: 'file_upload', label: 'File Upload', icon: Upload },
  { type: 'signature_pad', label: 'Signature Pad', icon: PenTool },
];

function buildField(type: string, label: string, order: number) {
  const base: any = {
    id: `field_${nanoid(8)}`,
    type,
    order,
    label,
    config: {},
    validation: { required: false },
    logic: [],
  };
  if (type === 'single_select' || type === 'multi_select') {
    base.config = { options: ['Option 1', 'Option 2', 'Option 3'] };
  }
  if (type === 'rating') {
    base.config = { max_stars: 5 };
  }
  return base;
}

function SortableFieldCard({ field, isSelected, onSelect, onDelete }: {
  field: any; isSelected: boolean; onSelect: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const Component = FieldComponents[field.type] || FieldComponents.short_text;
  const options = Array.isArray(field.config?.options)
    ? field.config.options.map((option: any) => typeof option === 'string' ? { label: option, value: option } : option)
    : [];

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className={`relative p-5 rounded-xl border-2 transition-colors cursor-pointer group ${isSelected ? 'border-primary bg-primary/[0.02] shadow-sm' : 'border-transparent hover:border-border'}`}
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
          prefix={field.config?.prefix}
          suffix={field.config?.suffix}
        />
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}

/* ───── Properties Panel by field type ───── */
function PropertiesPanel({ field, onChange, onOpenLogic }: {
  field: any; onChange: (changes: any) => void; onOpenLogic: () => void;
}) {
  const config = field.config || {};

  return (
    <div className="flex flex-col gap-5">
      <h3 className="font-bold text-base">Properties</h3>

      {/* Label */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Label</label>
        <Input value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
      </div>

      {/* Placeholder (text types) */}
      {(['short_text', 'long_text', 'email', 'phone', 'number'] as string[]).includes(field.type) && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Placeholder</label>
          <Input
            value={config.placeholder || ''}
            placeholder="Enter placeholder text..."
            onChange={(e) => onChange({ config: { ...config, placeholder: e.target.value } })}
          />
        </div>
      )}

      {/* Max length (text types) */}
      {(['short_text', 'long_text'] as string[]).includes(field.type) && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max Length</label>
          <Input
            type="number"
            value={config.max_length || ''}
            placeholder="No limit"
            onChange={(e) => onChange({ config: { ...config, max_length: e.target.value ? Number(e.target.value) : undefined } })}
          />
        </div>
      )}

      {/* Number config */}
      {field.type === 'number' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Min</label>
              <Input type="number" value={config.min ?? ''} placeholder="—" onChange={(e) => onChange({ config: { ...config, min: e.target.value ? Number(e.target.value) : undefined } })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max</label>
              <Input type="number" value={config.max ?? ''} placeholder="—" onChange={(e) => onChange({ config: { ...config, max: e.target.value ? Number(e.target.value) : undefined } })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prefix</label>
              <Input value={config.prefix || ''} placeholder="$" onChange={(e) => onChange({ config: { ...config, prefix: e.target.value } })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suffix</label>
              <Input value={config.suffix || ''} placeholder="kg" onChange={(e) => onChange({ config: { ...config, suffix: e.target.value } })} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Step</label>
            <Input type="number" value={config.step ?? ''} placeholder="1" onChange={(e) => onChange({ config: { ...config, step: e.target.value ? Number(e.target.value) : undefined } })} />
          </div>
        </>
      )}

      {/* Select options */}
      {(field.type === 'single_select' || field.type === 'multi_select') && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Options (comma separated)</label>
            <Input
              value={config._rawOptions ?? (config.options || []).map((o: any) => typeof o === 'string' ? o : o.label).join(', ')}
              onChange={(e) => {
                const raw = e.target.value;
                const options = raw.split(',').map((v) => v.trim()).filter(Boolean);
                onChange({ config: { ...config, options, _rawOptions: raw } });
              }}
              onBlur={() => {
                const clean = { ...config };
                delete clean._rawOptions;
                onChange({ config: clean });
              }}
            />
          </div>
          {field.type === 'multi_select' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Min Select</label>
                <Input type="number" value={config.min_select ?? ''} placeholder="—" onChange={(e) => onChange({ config: { ...config, min_select: e.target.value ? Number(e.target.value) : undefined } })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max Select</label>
                <Input type="number" value={config.max_select ?? ''} placeholder="—" onChange={(e) => onChange({ config: { ...config, max_select: e.target.value ? Number(e.target.value) : undefined } })} />
              </div>
            </div>
          )}
        </>
      )}

      {/* Rating config */}
      {field.type === 'rating' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max Stars</label>
          <Input type="number" min={1} max={10} value={config.max_stars || 5} onChange={(e) => onChange({ config: { ...config, max_stars: Math.min(10, Math.max(1, Number(e.target.value))) } })} />
        </div>
      )}

      {/* File upload config */}
      {field.type === 'file_upload' && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max Size (MB)</label>
            <Input type="number" value={config.max_size_mb ?? ''} placeholder="10" onChange={(e) => onChange({ config: { ...config, max_size_mb: e.target.value ? Number(e.target.value) : undefined } })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Allowed Types (comma separated)</label>
            <Input
              value={config._rawAllowedTypes ?? (config.allowed_types || []).join(', ')}
              placeholder="pdf, jpg, png"
              onChange={(e) => {
                const raw = e.target.value;
                const types = raw.split(',').map((v) => v.trim()).filter(Boolean);
                onChange({ config: { ...config, allowed_types: types, _rawAllowedTypes: raw } });
              }}
              onBlur={() => {
                const clean = { ...config };
                delete clean._rawAllowedTypes;
                onChange({ config: clean });
              }}
            />
          </div>
        </>
      )}

      {/* Email/Phone validate_format */}
      {(field.type === 'email' || field.type === 'phone') && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Validate Format</label>
          <Switch
            checked={config.validate_format !== false}
            onCheckedChange={(checked) => onChange({ config: { ...config, validate_format: checked } })}
          />
        </div>
      )}

      {/* Signature pad config */}
      {field.type === 'signature_pad' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pen Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={config.stroke_color || '#18181b'} onChange={(e) => onChange({ config: { ...config, stroke_color: e.target.value } })} className="h-8 w-8 rounded cursor-pointer border border-input" />
              <span className="text-xs text-muted-foreground font-mono">{config.stroke_color || '#18181b'}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Background</label>
            <div className="flex items-center gap-2">
              <input type="color" value={config.bg_color || '#ffffff'} onChange={(e) => onChange({ config: { ...config, bg_color: e.target.value } })} className="h-8 w-8 rounded cursor-pointer border border-input" />
              <span className="text-xs text-muted-foreground font-mono">{config.bg_color || '#ffffff'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-border w-full" />

      {/* Validation */}
      <h3 className="font-bold text-base">Validation</h3>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Required</label>
        <Switch
          checked={!!field.validation?.required}
          onCheckedChange={(checked) => onChange({
            validation: { ...field.validation, required: checked },
          })}
        />
      </div>
      {field.validation?.required && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Error Message</label>
          <Input
            value={field.validation?.error_message || ''}
            placeholder="This field is required"
            onChange={(e) => onChange({ validation: { ...field.validation, error_message: e.target.value } })}
          />
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-border w-full" />

      {/* Logic */}
      <h3 className="font-bold text-base">Conditional Logic</h3>
      <div className="text-xs text-muted-foreground mb-1">
        {(field.logic || []).length} rule{(field.logic || []).length !== 1 ? 's' : ''} configured
      </div>
      <Button variant="outline" className="w-full" onClick={onOpenLogic}>
        Open Logic Map
      </Button>
    </div>
  );
}

import { useCollaborativeArea } from '@/hooks/useCollaborativeArea';

export default function WorkshopBuilder() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuth();


  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Extract Theme Configuration
  const preset = form?.theme?.preset || 'minimal';
  const theme = THEME_PRESETS[preset] || THEME_PRESETS.minimal;
  const customCss = form?.theme?.custom_css || '';

  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<any[][]>([]);
  const [redoStack, setRedoStack] = useState<any[][]>([]);

  const pushUndo = useCallback((snapshot: any[]) => {
    setUndoStack((s) => [...s.slice(-49), snapshot]);
    setRedoStack([]);
  }, []);

  const loadForm = useCallback(async () => {
    const response = await getForm(id);
    const nextForm = response.data.form;
    const nextFields = (nextForm.fields || []).slice().sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    setForm(nextForm);
    setFields(nextFields);
    setSelectedId((current) => current && nextFields.some((f: any) => f.id === current) ? current : nextFields[0]?.id || null);
  }, [id]);

  useEffect(() => { loadForm(); }, [loadForm]);

  const { canvasRef, remoteCursors, presenceList, socketId, emit } = useCollaborativeArea(id, loadForm);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleUndo = () => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) return prevUndo;
      const newUndo = [...prevUndo];
      const prev = newUndo.pop()!;
      setRedoStack((r) => [...r, fields]);
      setFields(prev);
      void saveForm(prev);
      return newUndo;
    });
  };

  const handleRedo = () => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;
      const newRedo = [...prevRedo];
      const next = newRedo.pop()!;
      setUndoStack((u) => [...u, fields]);
      setFields(next);
      void saveForm(next);
      return newRedo;
    });
  };

  const saveForm = useCallback(async (nextFields: any[], newTitle?: string, socketEvent?: { type: string; payload: any }) => {
    if (!form) return;

    const orderedFields = nextFields.map((field, index) => ({
      ...field,
      order: index + 1,
      config: field.config || {},
      validation: field.validation || { required: false },
      logic: field.logic || [],
    }));

    setSaving(true);
    try {
      const response = await updateForm(id, {
        title: newTitle ?? form.title,
        fields: orderedFields,
      });
      setForm(response.data.form);
      setFields(response.data.form.fields || []);
    } finally {
      setSaving(false);
    }

    if (socketEvent) emit(socketEvent.type, socketEvent.payload);
  }, [emit, form, id]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setFields((currentFields) => {
      pushUndo(currentFields);
      const oldIndex = currentFields.findIndex((f) => f.id === active.id);
      const newIndex = currentFields.findIndex((f) => f.id === over.id);
      const reordered = arrayMove(currentFields, oldIndex, newIndex).map((f, i) => ({ ...f, order: i + 1 }));
      void saveForm(reordered, undefined, {
        type: 'field:reorder',
        payload: { fieldOrder: reordered.map((f) => f.id), version: form?.version },
      });
      return reordered;
    });
  };

  const addField = (type: string, label: string) => {
    pushUndo(fields);
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
    pushUndo(fields);
    const nextFields = fields.map((f) => f.id === selectedId ? { ...f, ...changes } : f);
    setFields(nextFields);
    const updatedField = nextFields.find((f) => f.id === selectedId);
    void saveForm(nextFields, undefined, {
      type: 'field:update',
      payload: { fieldId: selectedId, patch: updatedField, version: form?.version },
    });
  };

  const duplicateField = (fieldId: string) => {
    pushUndo(fields);
    const source = fields.find((f) => f.id === fieldId);
    if (!source) return;
    const dup = { ...JSON.parse(JSON.stringify(source)), id: `field_${nanoid(8)}`, order: fields.length + 1 };
    const nextFields = [...fields, dup];
    setFields(nextFields);
    setSelectedId(dup.id);
    void saveForm(nextFields, undefined, {
      type: 'field:add',
      payload: { field: dup, version: form?.version },
    });
  };

  const deleteField = (fieldId: string) => {
    pushUndo(fields);
    const nextFields = fields.filter((f) => f.id !== fieldId);
    setFields(nextFields);
    if (selectedId === fieldId) setSelectedId(nextFields[0]?.id || null);
    void saveForm(nextFields, undefined, {
      type: 'field:delete',
      payload: { fieldId, version: form?.version },
    });
  };

  const selectedField = fields.find((f) => f.id === selectedId);



  return (
    <AuthGuard>
      {!form ? (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div ref={canvasRef} className="flex flex-col h-screen bg-background overflow-hidden">
          <RemoteCursors cursors={remoteCursors} currentSocketId={socketId} />
          {/* ─── Toolbar ─── */}
          <div className="flex h-14 items-center px-4 border-b border-border bg-card shrink-0 gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Input
              className="w-56 border-transparent hover:border-border font-bold text-base px-2 h-9 bg-transparent"
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
            <div className="bg-muted px-2 py-0.5 rounded-full text-xs font-semibold text-muted-foreground border border-border">
              v{form.version || 1}
            </div>

            {/* Nav tabs */}
            <div className="toolbar-nav mx-auto">
              <button className="toolbar-nav-item active">Workshop</button>
              <button className="toolbar-nav-item" onClick={() => router.push(`/logic/${id}`)}>Logic</button>
              <button className="toolbar-nav-item" onClick={() => router.push(`/theme/${id}`)}>Theme</button>
              <button className="toolbar-nav-item" onClick={() => router.push(`/history/${id}`)}>History</button>
              <button className="toolbar-nav-item" onClick={() => router.push(`/vault/${id}`)}>Vault</button>
            </div>

            {/* Undo/Redo */}
            <div className="flex items-center gap-1 border-r border-border pr-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={undoStack.length === 0} onClick={handleUndo} title="Undo (Ctrl+Z)">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={redoStack.length === 0} onClick={handleRedo} title="Redo (Ctrl+Y)">
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Presence */}
            <PresenceAvatars users={presenceList} />

            {/* Save status + actions */}
            <div className="flex items-center gap-3">
              <div className="flex items-center text-xs text-muted-foreground gap-1.5 font-medium">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 text-green-600" />}
                {saving ? 'Saving...' : 'Saved'}
              </div>
              <Button variant="outline" className="h-8 text-xs" onClick={() => setShareOpen(true)}>
                <LinkIcon className="h-3 w-3 mr-1.5" />
                Share
              </Button>
              <Button className="h-8 text-xs" onClick={() => window.open(`/f/${form.slug}`, '_blank')}>
                Preview
              </Button>
            </div>
          </div>

          {/* ─── Three-panel layout ─── */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Field Palette */}
            <div className="w-60 border-r border-border bg-card flex flex-col overflow-y-auto shrink-0">
              <div className="p-4 border-b border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add Fields</h3>
              </div>
              <div className="flex flex-col gap-1 p-3">
                {PALETTE.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      onClick={() => addField(item.type, item.label)}
                      className="palette-item group"
                    >
                      <div className="palette-item-icon">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                      </div>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Center: Canvas */}
            <div className={`flex-1 dot-grid overflow-y-auto p-8 relative ${theme.bodyClass}`}>
              <style dangerouslySetInnerHTML={{ __html: theme.css + '\n' + customCss }} />
              <div className={`ff-stage max-w-2xl mx-auto rounded-xl shadow-xl border min-h-[500px] p-8 pb-16 relative ${theme.cardClass}`}>
                <h1 className="text-3xl font-bold tracking-tight mb-8 break-words leading-tight">{form.title}</h1>


                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                    <AnimatePresence mode="popLayout">
                      <div className="flex flex-col gap-5">
                        {fields.map((field) => (
                          <SortableFieldCard
                            key={field.id}
                            field={field}
                            isSelected={selectedId === field.id}
                            onSelect={() => setSelectedId(field.id)}
                            onDelete={() => deleteField(field.id)}
                          />
                        ))}
                      </div>
                    </AnimatePresence>
                  </SortableContext>
                </DndContext>

                {fields.length === 0 && (
                  <div className="mt-8 border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-muted-foreground opacity-60">
                    <Upload className="h-8 w-8 mb-3" />
                    <span className="text-sm font-medium">Click a field on the left to add it here</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Properties Panel */}
            <div className="w-80 border-l border-border bg-card p-5 overflow-y-auto shrink-0">
              {!selectedField ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 opacity-60">
                  <Settings className="h-8 w-8" />
                  <p className="text-sm font-medium">Select a field to edit</p>
                  <p className="text-xs text-center">Click on any field in the canvas to configure its properties</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded-full">
                      {selectedField.type.replace('_', ' ')}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={() => duplicateField(selectedField.id)} title="Duplicate field">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteField(selectedField.id)} title="Delete field">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <PropertiesPanel
                    field={selectedField}
                    onChange={updateSelectedField}
                    onOpenLogic={() => router.push(`/logic/${id}`)}
                  />
                </>
              )}
            </div>
          </div>

          {/* Share Dialog */}
          <ShareDialog
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            formId={id}
            formSlug={form.slug}
            currentUserId={user?._id}
          />
        </div>
      )}
    </AuthGuard>
  );
}
