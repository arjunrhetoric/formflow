'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getForm, getHistory, restoreVersion } from '@/lib/api/forms';
import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/Button';
import { FieldComponents } from '@/components/fields';
import { useCollaborativeArea } from '@/hooks/useCollaborativeArea';
import { RemoteCursors } from '@/components/RemoteCursors';
import { PresenceAvatars } from '@/components/PresenceAvatars';
import { ChevronLeft, RotateCcw, Clock, Loader2, History, ArrowLeft } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function TimeTravel() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedVer, setSelectedVer] = useState<any>(null);
  const [restoring, setRestoring] = useState(false);

  const { canvasRef, remoteCursors, presenceList, socketId } = useCollaborativeArea(id);

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
    if (confirm(`Restore to version ${selectedVer.version}? This will create a new version from the snapshot.`)) {
      setRestoring(true);
      await restoreVersion(id, selectedVer._id);
      router.push(`/builder/${id}`);
    }
  };

  if (!form) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AuthGuard>
    );
  }

  const snapshotFields = selectedVer?.snapshot?.fields || [];

  return (
    <AuthGuard>
      <div ref={canvasRef} className="flex flex-col h-screen bg-background overflow-hidden relative">
        <RemoteCursors cursors={remoteCursors} currentSocketId={socketId} />
        {/* Toolbar */}
        <div className="flex h-14 items-center px-3 md:px-4 border-b border-border bg-card shrink-0 gap-2 md:gap-3 overflow-x-auto no-scrollbar relative z-10 w-full">
          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => router.push(`/builder/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-bold text-sm md:text-base shrink-0 truncate max-w-[120px] md:max-w-none">{form.title}</span>

          <div className="toolbar-nav mx-auto flex items-center shrink-0">
            <button className="toolbar-nav-item" onClick={() => router.push(`/builder/${id}`)}>Workshop</button>
            <button className="toolbar-nav-item" onClick={() => router.push(`/logic/${id}`)}>Logic</button>
            <button className="toolbar-nav-item" onClick={() => router.push(`/theme/${id}`)}>Theme</button>
            <button className="toolbar-nav-item active">History</button>
            <button className="toolbar-nav-item" onClick={() => router.push(`/vault/${id}`)}>Vault</button>
          </div>

          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground shrink-0 pr-2">
            <div className="hidden sm:block">
              <PresenceAvatars users={presenceList} />
            </div>
            <History className="h-4 w-4 ml-0 sm:ml-2" />
            {history.length} ver{history.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left: Timeline */}
          <div className="w-full md:w-80 h-[40%] md:h-auto border-b md:border-b-0 md:border-r border-border bg-card overflow-y-auto shrink-0">
            <div className="p-4 border-b border-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Version Timeline</h3>
            </div>

            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground opacity-60">
                <Clock className="h-8 w-8 mb-3" />
                <p className="text-sm font-medium">No history yet</p>
                <p className="text-xs mt-1">Make changes in the builder to create versions.</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

                {history.map((h, i) => {
                  const isSelected = selectedVer?._id === h._id;
                  const isLatest = i === 0;
                  return (
                    <motion.div
                      key={h._id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`relative pl-12 pr-4 py-4 cursor-pointer transition-colors border-b border-border/50 ${
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedVer(h)}
                    >
                      {/* Timeline dot */}
                      <div className={`absolute left-[18px] top-5 w-3 h-3 rounded-full border-2 ${
                        isSelected ? 'bg-primary border-primary' : 'bg-background border-border'
                      }`} />

                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">
                          v{h.version}
                          {isLatest && <span className="text-xs text-primary ml-2">(Latest)</span>}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(h.createdAt), 'MMM d, yyyy · HH:mm')}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(h.createdAt), { addSuffix: true })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {(h.snapshot?.fields || []).length} fields
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Snapshot Preview */}
          <div className="flex-1 bg-muted/50 p-4 md:p-8 overflow-y-auto flex flex-col">
            {selectedVer ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedVer._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex-1 flex flex-col max-w-3xl mx-auto w-full"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 gap-4">
                    <div>
                      <h2 className="text-lg md:text-xl font-bold">Version {selectedVer.version} Preview</h2>
                      <p className="text-muted-foreground text-xs md:text-sm mt-1">
                        Snapshot from {format(new Date(selectedVer.createdAt), 'PPP · p')}
                      </p>
                    </div>
                    <Button onClick={handleRestore} disabled={restoring} className="w-full md:w-auto">
                      {restoring ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Restoring...</>
                      ) : (
                        <><RotateCcw className="w-4 h-4 mr-2" /> Restore this version</>
                      )}
                    </Button>
                  </div>

                  {/* Form Preview Card */}
                  <div className="bg-card rounded-2xl shadow-xl border border-border p-6 md:p-10 flex-1">
                    <h1 className="text-3xl font-bold mb-8">{selectedVer.snapshot?.title || form.title}</h1>
                    <div className="space-y-6 pointer-events-none opacity-80">
                      {snapshotFields.map((f: any) => {
                        const Comp = FieldComponents[f.type] || FieldComponents.short_text;
                        const options = Array.isArray(f.config?.options)
                          ? f.config.options.map((o: any) => typeof o === 'string' ? { label: o, value: o } : o)
                          : [];
                        return (
                          <div key={f.id}>
                            <Comp
                              label={f.label}
                              required={!!f.validation?.required}
                              disabled
                              options={options}
                              placeholder={f.config?.placeholder}
                              maxStars={f.config?.max_stars}
                            />
                          </div>
                        );
                      })}
                      {snapshotFields.length === 0 && (
                        <div className="text-center text-muted-foreground py-12">
                          Empty form at this version
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-60">
                <Clock className="h-12 w-12 mb-4" />
                <p className="font-medium">Select a version to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
