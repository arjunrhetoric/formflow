'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getForm, updateForm } from '@/lib/api/forms';
import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/Button';
import { FieldComponents } from '@/components/fields';
import { ChevronLeft, Loader2, Check, Palette, Code } from 'lucide-react';

const PRESETS = [
  {
    id: 'minimal',
    label: 'Minimal',
    desc: 'Clean, white Notion-style',
    css: '',
    preview: { bg: '#ffffff', accent: '#18181b', text: '#09090b' },
  },
  {
    id: 'bold',
    label: 'Bold',
    desc: 'Dark bg, vivid colors, large type',
    css: 'body { background: #09090b; color: white; }',
    preview: { bg: '#09090b', accent: '#8b5cf6', text: '#ffffff' },
  },
  {
    id: 'glassmorphism',
    label: 'Glassmorphism',
    desc: 'Frosted glass, gradient backdrop',
    css: '.ff-stage-card { backdrop-filter: blur(12px); background: rgba(255,255,255,0.7); }',
    preview: { bg: 'linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4)', accent: '#ffffff', text: '#ffffff' },
  },
  {
    id: 'corporate',
    label: 'Corporate',
    desc: 'Navy + white, serif typography',
    css: 'body { font-family: Georgia, serif; }',
    preview: { bg: '#f0f2f5', accent: '#1e3a5f', text: '#1e3a5f' },
  },
];

export default function ThemeEditor() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  const [css, setCss] = useState('');
  const [activePreset, setActivePreset] = useState('minimal');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getForm(id).then((r) => {
      const nextForm = r.data.form;
      setForm(nextForm);
      setActivePreset(nextForm.theme?.preset || 'minimal');
      setCss(nextForm.theme?.custom_css || '');
    });
  }, [id]);

  const handleApply = async () => {
    setSaving(true);
    const response = await updateForm(id, {
      theme: { preset: activePreset, custom_css: css },
    });
    setForm(response.data.form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

  const currentPreset = PRESETS.find((p) => p.id === activePreset) || PRESETS[0];

  return (
    <AuthGuard>
      <div className="flex flex-col h-screen bg-background overflow-hidden">
        {/* Toolbar */}
        <div className="flex h-14 items-center px-4 border-b border-border bg-card shrink-0 gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/builder/${id}`)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-bold text-lg">{form.title}</span>

          <div className="flex items-center mx-auto bg-muted/50 p-1 rounded-lg border border-border">
            <Button variant="ghost" className="h-8 px-4 text-xs text-muted-foreground" onClick={() => router.push(`/builder/${id}`)}>Workshop</Button>
            <Button variant="ghost" className="h-8 px-4 text-xs text-muted-foreground" onClick={() => router.push(`/logic/${id}`)}>Logic</Button>
            <Button variant="ghost" className="h-8 bg-background shadow-sm px-4 text-xs font-semibold">Theme</Button>
            <Button variant="ghost" className="h-8 px-4 text-xs text-muted-foreground" onClick={() => router.push(`/history/${id}`)}>History</Button>
            <Button variant="ghost" className="h-8 px-4 text-xs text-muted-foreground" onClick={() => router.push(`/vault/${id}`)}>Vault</Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Controls */}
          <div className="w-[380px] border-r border-border bg-card flex flex-col overflow-y-auto shrink-0">
            {/* Preset selector */}
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm">Preset Themes</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setActivePreset(preset.id)}
                    className={`relative flex flex-col items-center rounded-xl p-3 border-2 transition-all cursor-pointer text-left ${
                      activePreset === preset.id
                        ? 'border-primary shadow-sm'
                        : 'border-transparent hover:border-border bg-muted/50'
                    }`}
                  >
                    {/* Color preview */}
                    <div
                      className="w-full h-12 rounded-lg mb-2 border border-border/50 overflow-hidden"
                      style={{ background: preset.preview.bg }}
                    >
                      <div className="flex items-center justify-center h-full gap-1.5 px-2">
                        <div className="h-1.5 flex-1 rounded-full opacity-50" style={{ backgroundColor: preset.preview.text }} />
                        <div className="h-4 w-12 rounded" style={{ backgroundColor: preset.preview.accent }} />
                      </div>
                    </div>
                    <span className="text-xs font-semibold">{preset.label}</span>
                    <span className="text-[10px] text-muted-foreground">{preset.desc}</span>
                    {activePreset === preset.id && (
                      <div className="absolute top-1.5 right-1.5 h-5 w-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom CSS */}
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Code className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm">Custom CSS</h3>
              </div>
              <textarea
                className="flex-1 w-full rounded-xl border border-input bg-muted/30 px-4 py-3 text-xs font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none min-h-[200px]"
                value={css}
                onChange={(e) => setCss(e.target.value)}
                placeholder="/* Add your custom CSS here */&#10;body { }&#10;.ff-stage { }"
                spellCheck={false}
              />
              <Button className="w-full mt-4" onClick={handleApply} disabled={saving}>
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Applying...</>
                ) : saved ? (
                  <><Check className="h-4 w-4 mr-2" /> Applied!</>
                ) : (
                  'Apply Theme'
                )}
              </Button>
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="flex-1 bg-muted p-8 overflow-y-auto flex flex-col items-center">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">
              Live Preview — {currentPreset.label}
            </div>

            <div
              className="w-full max-w-2xl rounded-2xl p-8 min-h-[400px]"
              style={{
                background: currentPreset.preview.bg,
                border: `1px solid ${activePreset === 'bold' ? '#27272a' : '#e4e4e7'}`,
                boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
              }}
            >
              <h1
                className="text-3xl font-bold mb-8"
                style={{ color: currentPreset.preview.text, fontFamily: activePreset === 'corporate' ? 'Georgia, serif' : 'Inter, sans-serif' }}
              >
                {form.title}
              </h1>

              {/* Render actual form fields in preview */}
              <div className="space-y-6 pointer-events-none opacity-80">
                {(form.fields || []).slice(0, 4).map((f: any) => {
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
                {(form.fields || []).length === 0 && (
                  <div className="text-center py-12 opacity-50" style={{ color: currentPreset.preview.text }}>
                    Add fields in the Workshop to preview them here
                  </div>
                )}
              </div>

              {/* Submit button preview */}
              <div className="mt-8 pt-6 border-t" style={{ borderColor: activePreset === 'bold' ? '#3f3f46' : '#e4e4e7' }}>
                <div
                  className="h-12 w-full rounded-xl flex items-center justify-center text-sm font-semibold"
                  style={{ backgroundColor: currentPreset.preview.accent, color: activePreset === 'minimal' || activePreset === 'corporate' ? '#ffffff' : currentPreset.preview.bg.startsWith('#') ? currentPreset.preview.bg : '#000' }}
                >
                  Submit
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
