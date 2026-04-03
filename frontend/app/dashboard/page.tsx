'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getForms, createForm, deleteForm } from '@/lib/api/forms';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/ui/Sidebar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, Plus, Edit2, ExternalLink, Trash2 } from 'lucide-react';

export default function Dashboard() {
  const [forms, setForms] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const router = useRouter();

  const loadForms = async () => {
    try {
      const res = await getForms();
      setForms(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadForms(); }, []);

  const handleCreate = async () => {
    const res = await createForm('Untitled Form');
    router.push(`/builder/${res.data._id}`);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this form?')) {
      await deleteForm(id);
      loadForms();
    }
  };

  const filtered = forms.filter(f => f.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <AuthGuard>
      <Sidebar>
        <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">My Forms</h1>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> New Form
            </Button>
          </div>

          <div className="flex w-full max-w-sm items-center relative">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search forms..." 
              className="pl-9 h-10 w-full" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-24 border-2 border-dashed border-border rounded-xl">
              <p className="text-muted-foreground text-sm mb-4">No forms yet</p>
              <Button onClick={handleCreate} variant="outline">Create your first form</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(f => (
                <div key={f._id} className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow group flex flex-col cursor-pointer" onClick={() => router.push(`/builder/${f._id}`)}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <h2 className="text-base font-semibold truncate">{f.title || 'Untitled Form'}</h2>
                  </div>
                  <div className="text-xs text-muted-foreground mb-6">
                    0 responses · Updated recently
                  </div>
                  <div className="flex items-center gap-2 mt-auto border-t border-border/50 pt-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-foreground" onClick={(e) => { e.stopPropagation(); router.push(`/builder/${f._id}`); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); window.open(`/f/${f.slug}`, '_blank'); }}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive ml-auto" onClick={(e) => { e.stopPropagation(); handleDelete(f._id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Sidebar>
    </AuthGuard>
  );
}
