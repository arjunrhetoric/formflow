'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getForm } from '@/lib/api/forms';
import { getResponses, exportCSV, exportJSON } from '@/lib/api/responses';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/ui/Sidebar';
import { Button } from '@/components/ui/Button';
import { useCollaborativeArea } from '@/hooks/useCollaborativeArea';
import { RemoteCursors } from '@/components/RemoteCursors';
import { PresenceAvatars } from '@/components/PresenceAvatars';
import {
  Download, Table as TableIcon, ChevronLeft, ChevronRight,
  BarChart2, Clock, Users, Loader2, ArrowLeft
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function ResponseVault() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const { canvasRef, remoteCursors, presenceList, socketId } = useCollaborativeArea(id);

  useEffect(() => {
    getForm(id).then((r) => setForm(r.data.form));
  }, [id]);

  useEffect(() => {
    setLoading(true);
    getResponses(id, page, 20).then((r) => {
      setResponses(r.data.responses || []);
      setTotal(r.data.total || 0);
      setPages(r.data.pages || 1);
    }).finally(() => setLoading(false));
  }, [id, page]);

  const handleExport = async (type: 'csv' | 'json') => {
    const res = type === 'csv' ? await exportCSV(id) : await exportJSON(id);
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${form?.title || 'form'}_responses.${type}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (!form) {
    return (
      <AuthGuard>
        <Sidebar>
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </Sidebar>
      </AuthGuard>
    );
  }

  // Calculate avg completion time
  const avgTime = responses.length
    ? Math.round(responses.reduce((s, r) => s + (r.respondentMeta?.completionTime || 0), 0) / responses.length)
    : 0;

  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <AuthGuard>
      <Sidebar>
        <div ref={canvasRef} className="p-8 max-w-[1400px] mx-auto flex flex-col gap-6 h-screen overflow-hidden relative">
          <RemoteCursors cursors={remoteCursors} currentSocketId={socketId} />
          {/* Header */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push(`/builder/${id}`)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Response Vault</h1>
                <p className="text-muted-foreground text-sm font-medium">{form.title}</p>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <PresenceAvatars users={presenceList} />
              <Button variant="outline" onClick={() => handleExport('csv')} disabled={total === 0}>
                <Download className="mr-2 h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" onClick={() => handleExport('json')} disabled={total === 0}>
                <Download className="mr-2 h-4 w-4" /> JSON
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 shrink-0">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">Total Responses</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
            >
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <BarChart2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(form.fields || []).length}</p>
                <p className="text-xs text-muted-foreground">Fields</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
            >
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgTime ? `${avgTime}s` : '—'}</p>
                <p className="text-xs text-muted-foreground">Avg. Completion</p>
              </div>
            </motion.div>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : responses.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground opacity-60">
                <TableIcon className="h-12 w-12 mb-4" />
                <p className="font-medium">No responses collected yet.</p>
                <p className="text-xs mt-1">Share your form to start collecting responses.</p>
              </div>
            ) : (
              <>
                <div className="overflow-auto w-full flex-1">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-muted text-muted-foreground sticky top-0 z-10 font-semibold">
                      <tr>
                        <th className="py-3 px-4 w-12 border-b border-border">#</th>
                        <th className="py-3 px-4 w-44 border-b border-border">Submitted</th>
                        {form.fields?.map((f: any) => (
                          <th key={f.id} className="py-3 px-4 border-b border-border truncate max-w-[200px]">{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {responses.map((r, i) => (
                        <tr key={r._id} className={`border-b border-border hover:bg-muted/50 transition-colors ${i % 2 === 0 ? 'bg-background' : 'bg-secondary/20'}`}>
                          <td className="py-3 px-4 text-muted-foreground text-xs">{(page - 1) * 20 + i + 1}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="text-sm">{format(new Date(r.createdAt), 'MMM d, HH:mm')}</div>
                            <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</div>
                          </td>
                          {form.fields?.map((f: any) => {
                            const value = r.answers?.[f.id];
                            let display: any = '—';
                            if (value !== undefined && value !== null) {
                              if (Array.isArray(value)) display = value.join(', ');
                              else if (typeof value === 'object' && value.url) {
                                const fileName = value.original_name || 'uploaded-file';
                                display = (
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="truncate max-w-[180px]" title={fileName}>{fileName}</span>
                                    <a
                                      href={value.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs font-medium text-primary hover:underline shrink-0"
                                    >
                                      View
                                    </a>
                                    <a
                                      href={value.url}
                                      download={fileName}
                                      className="text-xs font-medium text-primary hover:underline shrink-0"
                                    >
                                      Download
                                    </a>
                                  </div>
                                );
                              } else if (typeof value === 'string' && value.startsWith('data:image')) {
                                display = (
                                  <button
                                    type="button"
                                    onClick={() => downloadDataUrl(value, `${f.label || 'signature'}-${r._id}.png`)}
                                    className="text-xs font-medium text-primary hover:underline"
                                  >
                                    Download signature
                                  </button>
                                );
                              }
                              else display = String(value);
                            }
                            return (
                              <td key={f.id} className="py-3 px-4 truncate max-w-[300px]">{display}</td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((p) => (
                        <Button
                          key={p}
                          variant={p === page ? 'primary' : 'outline'}
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      ))}
                      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Sidebar>
    </AuthGuard>
  );
}
