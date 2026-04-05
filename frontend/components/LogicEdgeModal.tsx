'use client';
import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ChevronDown, Check, Trash2, ArrowRight } from 'lucide-react';

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'gt', label: 'Greater Than' },
  { value: 'gte', label: 'Greater Than or Equal' },
  { value: 'lt', label: 'Less Than' },
  { value: 'lte', label: 'Less Than or Equal' },
  { value: 'in_list', label: 'In List' },
  { value: 'is_empty', label: 'Is Empty' },
];

const ACTION_TYPES = [
  { value: 'hide', label: 'Hide Field' },
  { value: 'show', label: 'Show Field' },
  { value: 'jump', label: 'Jump To Field' },
];

interface LogicEdgeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (rule: any) => void;
  onDelete?: () => void;
  sourceField: { id: string; label: string; type: string } | null;
  targetFields: { id: string; label: string }[];
  allFields: { id: string; label: string }[];
  initialRule?: any;
}

const CustomSelect = ({ value, onChange, options, prefix }: { value: string, onChange: (v: string) => void, options: any[], prefix?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) || options[0];
  
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-card px-4 py-2 text-sm font-medium shadow-sm hover:border-primary/50 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <div className="flex items-center gap-2 truncate">
          {prefix}
          <span>{selected?.label}</span>
        </div>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-12 left-0 z-50 w-full rounded-xl border border-border bg-card p-1.5 shadow-xl max-h-60 overflow-auto animate-in fade-in zoom-in-95">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted ${value === o.value ? 'bg-primary/10 text-primary font-semibold' : ''}`}
              >
                {o.label}
                {value === o.value && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export function LogicEdgeModal({
  open,
  onClose,
  onSave,
  onDelete,
  sourceField,
  targetFields,
  allFields,
  initialRule,
}: LogicEdgeModalProps) {
  const availableTargets = useMemo(
    () => allFields.filter((f) => f.id !== sourceField?.id),
    [allFields, sourceField?.id]
  );

  const [op, setOp] = useState(() => initialRule?.condition?.op || 'equals');
  const [value, setValue] = useState(() => {
    const rawValue = initialRule?.condition?.value;
    return Array.isArray(rawValue) ? rawValue.join(', ') : String(rawValue ?? '');
  });
  const [actionType, setActionType] = useState(() => initialRule?.action?.type || 'hide');
  const [targets, setTargets] = useState<string[]>(() => {
    const nextActionType = initialRule?.action?.type || 'hide';
    if (nextActionType === 'jump') {
      return initialRule?.action?.destination
        ? [initialRule.action.destination]
        : targetFields.map((f) => f.id);
    }
    if (initialRule?.action?.targets?.length) {
      return [initialRule.action.targets[0]];
    }
    return targetFields[0]?.id ? [targetFields[0].id] : [];
  });

  const handleSave = () => {
    const normalizedValue =
      op === 'is_empty'
        ? ''
        : op === 'in_list'
          ? value.split(',').map((v) => v.trim()).filter(Boolean)
          : value;

    const normalizedTargets = targets.filter(Boolean);

    onSave({
      condition: {
        field: 'self',
        op,
        value: normalizedValue,
      },
      action: {
        type: actionType,
        targets: actionType === 'jump' ? [] : [normalizedTargets[0]].filter(Boolean),
        destination: actionType === 'jump' ? normalizedTargets[0] || '' : undefined,
      },
    });
    onClose();
  };

  const saveDisabled =
    (actionType === 'jump' && targets.length === 0) ||
    (actionType !== 'jump' && targets.length === 0) ||
    (op !== 'is_empty' && value.trim() === '');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-border/80 shadow-2xl rounded-2xl">
        <div className="bg-muted/10">
          <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-background/50 backdrop-blur-sm">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              Logic Rule
            </DialogTitle>
             <p className="text-sm text-muted-foreground">Set up a conditional action between fields.</p>
          </DialogHeader>

          <div className="p-6 flex flex-col gap-6">
            {/* Condition Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 items-center rounded bg-primary/10 px-2 text-[10px] font-bold uppercase tracking-widest text-primary">If</span>
                <span className="text-sm font-semibold truncate text-foreground">{sourceField?.label || 'Unknown Field'}</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2 sm:pl-4 border-l-2 border-border/50 py-1">
                <CustomSelect value={op} onChange={setOp} options={OPERATORS} />
                {op !== 'is_empty' && (
                  <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="h-11 rounded-xl bg-card border-input shadow-sm focus-visible:ring-primary/20"
                    placeholder={op === 'in_list' ? 'item1, item2...' : 'value...'}
                  />
                )}
              </div>
            </div>

            <div className="h-px bg-border/60 relative w-full my-2">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-border px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground shadow-sm">
                Then
              </div>
            </div>

            {/* Action Section */}
            <div className="space-y-4">
              <CustomSelect 
                value={actionType} 
                onChange={setActionType} 
                options={ACTION_TYPES} 
                prefix={<span className="text-muted-foreground mr-1 text-sm font-normal">Action:</span>}
              />
              
              <div className="space-y-2">
                 <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-1">Target Field</p>
                 <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto p-1 py-1 pr-2 no-scrollbar">
                   {availableTargets.map((f) => {
                     const isSelected = targets.includes(f.id);
                     return (
                       <button
                         key={f.id}
                         type="button"
                         onClick={() => setTargets([f.id])}
                         className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${
                           isSelected 
                             ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm' 
                             : 'border-input bg-card hover:border-primary/40 hover:bg-muted/50'
                         }`}
                       >
                         <span className="font-medium truncate pr-4 text-foreground">{f.label}</span>
                         <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${isSelected ? 'border-primary bg-primary text-primary-foreground scale-110' : 'border-input bg-muted max-w-[20px]'}`}>
                           {isSelected && <Check className="h-3 w-3" />}
                         </div>
                       </button>
                     );
                   })}
                   {availableTargets.length === 0 && (
                     <div className="text-center py-8 border border-dashed rounded-xl border-border bg-muted/20">
                       <p className="text-sm text-muted-foreground font-medium">No other fields available</p>
                     </div>
                   )}
                 </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 p-4 px-6 border-t border-border bg-card/50 backdrop-blur-sm rounded-b-2xl">
            {onDelete ? (
              <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 px-3" onClick={() => { onDelete(); onClose(); }}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            ) : <div />}
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onClose} className="px-4">Cancel</Button>
              <Button onClick={handleSave} disabled={saveDisabled} className="px-6 rounded-xl shadow-md">Save Rule</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
