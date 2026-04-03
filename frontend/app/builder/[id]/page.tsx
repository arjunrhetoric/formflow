'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { nanoid } from 'nanoid';
import { getForm, updateForm } from '@/lib/api/forms';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { FieldComponents } from '@/components/fields';
import { ChevronLeft, CheckCircle, Loader2, Link as LinkIcon, Settings, GripVertical, Pencil, Trash2 } from 'lucide-react';

const PALETTE = [
  { type: 'short_text', label: 'Short Text' },
  { type: 'long_text', label: 'Long Text' },
  { type: 'number', label: 'Number' },
  { type: 'single_select', label: 'Single Select' },
  { type: 'multi_select', label: 'Multi Select' },
  { type: 'date_range', label: 'Date Range' },
  { type: 'file_upload', label: 'File Upload' },
  { type: 'rating', label: 'Rating' },
  { type: 'signature', label: 'Signature Pad' },
];

export default function WorkshopBuilder() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuth();
  const { emit, on } = useSocket(id);

  const [form, setForm] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getForm(id).then(r => {
      setForm(r.data);
      setFields(r.data.fields || []);
    });
    emit('join_form', { form_id: id, user_id: user?._id, cursor_color: user?.cursorColor });
    const offPatch = on('patch_field', (p: any) => { /* Sync logic here */ });
    return () => offPatch();
  }, [id, user, emit, on]);

  const saveForm = useCallback(async (newFields: any[], newTitle?: string) => {
    setSaving(true);
    await updateForm(id, { fields: newFields, title: newTitle || form?.title });
    setSaving(false);
  }, [id, form]);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    if (active.id !== over.id) {
      setFields((items) => {
        const oldI = items.findIndex(i => i.id === active.id);
        const newI = items.findIndex(i => i.id === over.id);
        const newArr = arrayMove(items, oldI, newI);
        saveForm(newArr);
        return newArr;
      });
    }
  };

  const addField = (type: string, label: string) => {
    const newField = { id: `field_${nanoid(8)}`, type, label, required: false };
    const newFields = [...fields, newField];
    setFields(newFields);
    setSelectedId(newField.id);
    saveForm(newFields);
  };

  const updateSelectedField = (changes: any) => {
    const newFields = fields.map(f => f.id === selectedId ? { ...f, ...changes } : f);
    setFields(newFields);
    saveForm(newFields);
  };

  const deleteField = (fid: string) => {
    const newFields = fields.filter(f => f.id !== fid);
    setFields(newFields);
    if (selectedId === fid) setSelectedId(null);
    saveForm(newFields);
  };

  const selField = fields.find(f => f.id === selectedId);

  if (!form) return <div className="p-8">Loading builder...</div>;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* TopBar */}
      <div className="flex h-14 items-center px-4 border-b border-border bg-card shrink-0 gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Input 
          className="w-64 border-transparent hover:border-border font-bold text-lg px-2 h-9 -ml-2 bg-transparent" 
          value={form.title} 
          onChange={(e) => { setForm({ ...form, title: e.target.value }); saveForm(fields, e.target.value); }}
        />
        <div className="bg-muted px-2 py-0.5 rounded-full text-xs font-semibold text-muted-foreground border border-border">v{form.version || 1}</div>
        
        <div className="flex items-center mx-auto bg-muted/50 p-1 rounded-md border border-border">
          <Button variant="ghost" className="h-8 bg-background shadow-sm px-4">Workshop</Button>
          <Button variant="ghost" className="h-8 px-4 text-muted-foreground" onClick={() => router.push(`/logic/${id}`)}>Logic</Button>
          <Button variant="ghost" className="h-8 px-4 text-muted-foreground" onClick={() => router.push(`/theme/${id}`)}>Theme</Button>
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
        {/* Palette */}
        <div className="w-64 border-r border-border bg-card flex flex-col p-4 overflow-y-auto shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Add Fields</h3>
          <div className="flex flex-col gap-2">
            {PALETTE.map(p => (
              <div 
                key={p.type} 
                onClick={() => addField(p.type, p.label)}
                className="flex items-center px-3 py-2.5 rounded-md border border-border bg-background text-sm cursor-pointer hover:bg-muted font-medium transition-colors"
              >
                {p.label}
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 dot-grid overflow-y-auto p-8 relative">
          <div className="max-w-2xl mx-auto bg-card rounded-xl shadow-sm border border-border min-h-[500px] p-8 pb-16 relative">
            <h1 className="text-3xl font-bold tracking-tight mb-8 break-words leading-tight">{form.title}</h1>
            
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-6">
                  {fields.map(f => {
                    const Comp = FieldComponents[f.type] || FieldComponents.short_text;
                    const isSel = selectedId === f.id;
                    return (
                      <div 
                        key={f.id} 
                        className={`relative p-5 rounded-xl border-2 transition-colors cursor-pointer group ${isSel ? 'border-primary bg-muted/20' : 'border-transparent hover:border-border'}`}
                        onClick={() => setSelectedId(f.id)}
                      >
                        <div className={`absolute -left-3 top-1/2 -translate-y-1/2 p-1 bg-background border border-border rounded-md shadow-sm opacity-0 transition-opacity ${isSel ? 'opacity-100' : 'group-hover:opacity-100'}`}>
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        </div>
                        <div className="pointer-events-none">
                          <Comp label={f.label} required={f.required} disabled />
                        </div>
                        {isSel && (
                          <div className="absolute top-2 right-2 flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); deleteField(f.id); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
            
            <div className="mt-8 border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-muted-foreground opacity-60">
              <span className="text-sm font-medium">Click a field on the left to add it here.</span>
            </div>
          </div>
        </div>

        {/* Properties */}
        <div className="w-80 border-l border-border bg-card p-5 overflow-y-auto shrink-0">
          {!selField ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 opacity-70">
              <Settings className="h-8 w-8" />
              <p className="text-sm font-medium">Select a field to edit</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <h3 className="font-bold text-lg">Field Config</h3>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Label</label>
                <Input value={selField.label} onChange={e => updateSelectedField({ label: e.target.value })} />
              </div>
              
              {(selField.type === 'single_select' || selField.type === 'multi_select') && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Options (comma separated)</label>
                  <Input 
                    value={selField.config?.options?.map((o:any)=>o.label).join(',') || ''} 
                    onChange={e => {
                      const opts = e.target.value.split(',').map(s => ({ label: s.trim(), value: s.trim() }));
                      updateSelectedField({ config: { ...selField.config, options: opts } });
                    }} 
                  />
                </div>
              )}

              <div className="h-px bg-border w-full" />

              <h3 className="font-bold text-lg">Validation</h3>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Required</label>
                <Switch checked={selField.required} onCheckedChange={c => updateSelectedField({ required: c })} />
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
  );
}
