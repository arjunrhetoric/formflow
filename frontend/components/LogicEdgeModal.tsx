'use client';
import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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
  { value: 'hide', label: 'Hide Fields' },
  { value: 'show', label: 'Show Fields' },
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configure Logic Rule</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 mt-2">
          {/* Source field info */}
          <div className="bg-muted rounded-xl p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">When</p>
            <p className="font-semibold text-sm">{sourceField?.label || 'Unknown Field'}</p>
          </div>

          {/* Operator */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Condition</label>
            <select
              value={op}
              onChange={(e) => setOp(e.target.value)}
              className="flex h-9 w-full rounded-[0.625rem] border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {OPERATORS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Value (hidden for is_empty) */}
          {op !== 'is_empty' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Value</label>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={op === 'in_list' ? 'Enter comma separated values...' : 'Enter comparison value...'}
              />
            </div>
          )}

          {/* Action type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Then</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="flex h-9 w-full rounded-[0.625rem] border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {ACTION_TYPES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Target fields */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {actionType === 'jump' ? 'Jump to' : `${actionType === 'hide' ? 'Hide' : 'Show'} this field`}
            </label>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-input p-2 flex flex-col gap-1">
              {availableTargets.map((f) => (
                <label key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="logic-target"
                    checked={targets.includes(f.id)}
                    onChange={(e) => {
                      if (e.target.checked) setTargets([f.id]);
                    }}
                    className="accent-primary"
                  />
                  {f.label}
                </label>
              ))}
              {availableTargets.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No other fields available</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            {onDelete && (
              <Button variant="destructive" className="mr-auto" onClick={() => { onDelete(); onClose(); }}>
                Delete Rule
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveDisabled}>Save Rule</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
