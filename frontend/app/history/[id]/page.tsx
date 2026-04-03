'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getForm, getHistory, restoreVersion } from '@/lib/api/forms';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, RotateCcw, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function TimeTravel() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedVer, setSelectedVer] = useState<any>(null);

  useEffect(() => {
    getForm(id).then((r) => setForm(r.data.form));
    getHistory(id).then((r) => {
      const items = r.data.history || [];
      setHistory(items);
      if (items.length > 0) setSelectedVer(items[0]);
    });
  }, [id]);

  const handleRestore = async () => {
    if (!selectedVer) return;
    if (confirm(`Restore to version ${selectedVer.version}?`)) {
      await restoreVersion(id, selectedVer._id);
      router.push(`/builder/${id}`);
    }
  };

  if (!form) return null;

  const snapshotFields = selectedVer?.snapshot?.fields || [];

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="flex h-14 items-center px-4 border-b border-border bg-card shrink-0 gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/builder/${id}`)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-bold text-lg">{form.title}</span>
        <div className="text-muted-foreground text-sm flex items-center bg-muted px-3 py-1 rounded-full"><Clock className="w-4 h-4 mr-2" /> Time Travel</div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r border-border bg-card overflow-y-auto shrink-0 divide-y divide-border">
          {history.map((h, i) => (
            <div
              key={h._id}
              className={`p-4 cursor-pointer transition-colors ${selectedVer?._id === h._id ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-muted border-l-4 border-l-transparent'}`}
              onClick={() => setSelectedVer(h)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm">Version {h.version} {i === 0 && '(Latest saved snapshot)'}</span>
                <span className="text-xs text-muted-foreground">{format(new Date(h.createdAt), 'MMM d, HH:mm')}</span>
              </div>
              <p className="text-xs text-muted-foreground">Updated by {String(h.actorId || 'System')}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 bg-muted p-12 overflow-y-auto flex flex-col">
          {selectedVer && (
            <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold">Version {selectedVer.version} Preview</h2>
                  <p className="text-muted-foreground mt-1">Snapshot taken on {format(new Date(selectedVer.createdAt), 'PPP p')}</p>
                </div>
                <Button onClick={handleRestore}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Restore this version
                </Button>
              </div>

              <div className="bg-card rounded-2xl shadow-xl border border-border p-12 flex-1 pointer-events-none opacity-80">
                <h1 className="text-3xl font-bold mb-8">{selectedVer.snapshot?.title || form.title}</h1>
                <div className="space-y-8">
                  {snapshotFields.map((f: any) => (
                    <div key={f.id} className="w-full">
                      <label className="text-sm font-medium">{f.label} {f.validation?.required && '*'}</label>
                      <div className="h-10 w-full bg-muted rounded-md mt-2 border border-border" />
                    </div>
                  ))}
                  {snapshotFields.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">Empty form</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
