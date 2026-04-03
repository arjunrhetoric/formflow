'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getForms, createForm, deleteForm } from '@/lib/api/forms';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/ui/Sidebar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Search, Plus, Edit2, ExternalLink, Trash2,
  FileText, BarChart2, Clock, Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const [forms, setForms] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadForms = async () => {
    try {
      const res = await getForms();
      setForms(res.data.forms || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadForms(); }, []);

  const handleCreate = async () => {
    const res = await createForm('Untitled Form');
    router.push(`/builder/${res.data.form._id}`);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this form and all its responses?')) {
      await deleteForm(id);
      loadForms();
    }
  };

  const filtered = forms.filter((f) =>
    f.title?.toLowerCase().includes(search.toLowerCase())
  );

  const totalResponses = forms.reduce((sum, f) => sum + (f.responseCount || 0), 0);

  return (
    <AuthGuard>
      <Sidebar>
        <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Forms</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {forms.length} form{forms.length !== 1 ? 's' : ''} · {totalResponses} total response{totalResponses !== 1 ? 's' : ''}
              </p>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> New Form
            </Button>
          </div>

          {/* Search */}
          <div className="flex w-full max-w-sm items-center relative">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search forms..."
              className="pl-9 h-10 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center p-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-24 border-2 border-dashed border-border rounded-xl">
              <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
              <p className="text-muted-foreground text-sm mb-4 font-medium">
                {search ? 'No forms match your search' : 'No forms yet'}
              </p>
              {!search && (
                <Button onClick={handleCreate} variant="outline">Create your first form</Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((f, i) => (
                <motion.div
                  key={f._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  className="rounded-xl border border-border bg-card p-5 hover-lift group flex flex-col cursor-pointer hover:border-primary/30"
                  onClick={() => router.push(`/builder/${f._id}`)}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-semibold truncate leading-tight">{f.title || 'Untitled Form'}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">/{f.slug}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <BarChart2 className="h-3 w-3" />
                      {f.responseCount || 0} response{(f.responseCount || 0) !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {f.updatedAt ? formatDistanceToNow(new Date(f.updatedAt), { addSuffix: true }) : 'recently'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="secondary">{(f.fields || []).length} fields</Badge>
                    <Badge variant="secondary">v{f.version || 1}</Badge>
                    {f.theme?.preset && f.theme.preset !== 'minimal' && (
                      <Badge variant="secondary">{f.theme.preset}</Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-auto border-t border-border/50 pt-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-foreground" onClick={(e) => { e.stopPropagation(); router.push(`/builder/${f._id}`); }} title="Edit">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); window.open(`/f/${f.slug}`, '_blank'); }} title="Open public form">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); router.push(`/vault/${f._id}`); }} title="View responses">
                      <BarChart2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive ml-auto" onClick={(e) => { e.stopPropagation(); handleDelete(f._id); }} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </Sidebar>
    </AuthGuard>
  );
}
