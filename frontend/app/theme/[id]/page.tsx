'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getForm, updateForm } from '@/lib/api/forms';
import { Button } from '@/components/ui/Button';
import { ChevronLeft } from 'lucide-react';

const PRESETS = [
  { id: 'minimal', label: 'Minimal', css: '' },
  { id: 'bold', label: 'Bold', css: 'body { background: #09090b; color: white; }' },
  { id: 'glassmorphism', label: 'Glassmorphism', css: '.ff-stage-card { backdrop-filter: blur(12px); background: rgba(255,255,255,0.7); }' },
  { id: 'corporate', label: 'Corporate', css: 'body { font-family: Georgia, serif; }' }
];

export default function ThemeEditor() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  const [css, setCss] = useState('');
  const [activePreset, setActivePreset] = useState('minimal');

  useEffect(() => {
    getForm(id).then((r) => {
      const nextForm = r.data.form;
      setForm(nextForm);
      setActivePreset(nextForm.theme?.preset || 'minimal');
      setCss(nextForm.theme?.custom_css || '');
    });
  }, [id]);

  const handleApply = async () => {
    const response = await updateForm(id, {
      theme: {
        preset: activePreset,
        custom_css: css,
      },
    });
    setForm(response.data.form);
  };

  if (!form) return null;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="flex h-14 items-center px-4 border-b border-border bg-card shrink-0 gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/builder/${id}`)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-bold text-lg">{form.title}</span>

        <div className="flex items-center mx-auto bg-muted/50 p-1 rounded-md border border-border">
          <Button variant="ghost" className="h-8 px-4 text-muted-foreground" onClick={() => router.push(`/builder/${id}`)}>Workshop</Button>
          <Button variant="ghost" className="h-8 px-4 text-muted-foreground" onClick={() => router.push(`/logic/${id}`)}>Logic</Button>
          <Button variant="ghost" className="h-8 bg-background shadow-sm px-4">Theme</Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[400px] border-r border-border bg-card flex flex-col p-6 overflow-y-auto shrink-0">
          <h3 className="font-bold text-lg mb-4">Preset Themes</h3>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {PRESETS.map((preset) => (
              <div
                key={preset.id}
                onClick={() => {
                  setActivePreset(preset.id);
                  if (!css.trim()) {
                    setCss(preset.css);
                  }
                }}
                className={`flex flex-col items-center justify-center h-24 rounded-lg bg-muted border-2 cursor-pointer transition-all ${activePreset === preset.id ? 'border-primary shadow-sm' : 'border-transparent hover:border-border'}`}
              >
                <div className="w-8 h-8 rounded-full mb-2 bg-gradient-to-br from-background to-muted border border-border" />
                <span className="text-xs font-semibold">{preset.label}</span>
              </div>
            ))}
          </div>

          <h3 className="font-bold text-lg mb-4">Custom CSS</h3>
          <textarea
            className="flex-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            value={css}
            onChange={(e) => setCss(e.target.value)}
          />
          <Button className="w-full mt-6" onClick={handleApply}>Apply Theme</Button>
        </div>

        <div className="flex-1 bg-muted p-12 overflow-y-auto relative flex flex-col items-center">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">Live Preview Simulation</div>

          <div className={`w-full max-w-2xl rounded-2xl shadow-xl border border-border p-12 ${activePreset === 'bold' ? 'bg-zinc-950 text-white' : 'bg-card'}`}>
            <h1 className="text-3xl font-bold mb-8">{form.title}</h1>
            <div className="space-y-6 opacity-80 pointer-events-none">
              <div className="space-y-2">
                <div className="h-4 w-24 bg-current opacity-20 rounded" />
                <div className="h-10 w-full bg-current opacity-10 rounded-md border border-current/20" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-current opacity-20 rounded" />
                <div className="h-10 w-full bg-current opacity-10 rounded-md border border-current/20" />
              </div>
              <div className="pt-6">
                <div className="h-12 w-full bg-primary rounded-md opacity-90" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
