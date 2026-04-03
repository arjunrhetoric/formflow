'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getForm } from '@/lib/api/forms';
import { getResponses, exportCSV, exportJSON } from '@/lib/api/responses';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/ui/Sidebar';
import { Button } from '@/components/ui/Button';
import { Download, Table as TableIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function ResponseVault() {
  const { id } = useParams() as { id: string };
  const [form, setForm] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);

  useEffect(() => {
    getForm(id).then((r) => setForm(r.data.form));
    getResponses(id).then((r) => setResponses(r.data.responses || []));
  }, [id]);

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

  if (!form) return null;

  return (
    <AuthGuard>
      <Sidebar>
        <div className="p-8 max-w-[1400px] mx-auto flex flex-col gap-8 h-screen overflow-hidden">
          <div className="flex items-center justify-between shrink-0">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Response Vault</h1>
              <p className="text-muted-foreground font-medium">{form.title} - {responses.length} responses</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => handleExport('csv')}><Download className="mr-2 h-4 w-4" /> CSV</Button>
              <Button variant="outline" onClick={() => handleExport('json')}><Download className="mr-2 h-4 w-4" /> JSON</Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
            {responses.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground opacity-60">
                <TableIcon className="h-12 w-12 mb-4" />
                <p>No responses collected yet.</p>
              </div>
            ) : (
              <div className="overflow-auto w-full h-full">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-muted text-muted-foreground sticky top-0 z-10 font-semibold shadow-sm">
                    <tr>
                      <th className="py-3 px-4 w-48 border-b border-border">Submitted At</th>
                      {form.fields?.map((f: any) => (
                        <th key={f.id} className="py-3 px-4 border-b border-border truncate max-w-[200px]">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((r, i) => (
                      <tr key={r._id} className={`border-b border-border hover:bg-muted/50 transition-colors ${i % 2 === 0 ? 'bg-background' : 'bg-secondary/20'}`}>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {format(new Date(r.createdAt), 'MMM d, yyyy HH:mm')}
                        </td>
                        {form.fields?.map((f: any) => {
                          const value = r.answers?.[f.id];
                          const display = Array.isArray(value)
                            ? value.join(', ')
                            : (typeof value === 'string' && value.startsWith('data:image'))
                              ? '[Signature Image]'
                              : value ?? '-';
                          return (
                            <td key={f.id} className="py-3 px-4 truncate max-w-[300px]">
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Sidebar>
    </AuthGuard>
  );
}
