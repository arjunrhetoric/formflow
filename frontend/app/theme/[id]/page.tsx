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
    css: `
      .ff-stage label { color: #fafafa; }
      .ff-stage .text-muted-foreground { color: #a1a1aa; }
      .ff-stage input, .ff-stage textarea, .ff-stage select {
        background: #27272a; border-color: #3f3f46; color: #fafafa;
      }
      .ff-stage input::placeholder, .ff-stage textarea::placeholder { color: #71717a; }
    `,
    preview: { bg: '#09090b', accent: '#8b5cf6', text: '#ffffff' },
  },
  {
    id: 'glassmorphism',
    label: 'Glassmorphism',
    desc: 'Frosted glass, gradient backdrop',
    css: `
      .ff-stage label { color: #ffffff; }
      .ff-stage .text-muted-foreground { color: rgba(255,255,255,0.7); }
      .ff-stage input, .ff-stage textarea, .ff-stage select {
        background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); color: #ffffff;
      }
      .ff-stage input::placeholder, .ff-stage textarea::placeholder { color: rgba(255,255,255,0.5); }
      .ff-stage button[type="submit"] { background: rgba(255,255,255,0.25); backdrop-filter: blur(8px); }
    `,
    preview: { bg: 'linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4)', accent: '#ffffff', text: '#ffffff' },
  },
  {
    id: 'corporate',
    label: 'Corporate',
    desc: 'Navy + white, serif typography',
    css: `
      .ff-stage { font-family: Georgia, 'Times New Roman', serif; }
      .ff-stage h1 { color: #1e3a5f; }
      .ff-stage button[type="submit"] { background: #1e3a5f; }
    `,
    preview: { bg: '#f0f2f5', accent: '#1e3a5f', text: '#1e3a5f' },
  },
];

const CSS_PLACEHOLDER = `/* ─── FormFlow CSS Reference ───
 *
 * Available selectors:
 *   .ff-stage              → outer page wrapper
 *   .ff-stage h1           → form title
 *   .ff-stage label        → field labels
 *   .ff-stage input        → text / number inputs
 *   .ff-stage textarea     → long text fields
 *   .ff-stage select       → dropdown selects
 *   .ff-stage button[type="submit"] → submit button
 *   .ff-stage .text-muted-foreground → helper text
 *
 * Example:
 *   .ff-stage { font-family: 'Comic Sans MS'; }
 *   .ff-stage h1 { color: hotpink; }
 *   .ff-stage input { border-radius: 999px; }
 */
`;

import { useCollaborativeArea } from '@/hooks/useCollaborativeArea';
import { RemoteCursors } from '@/components/RemoteCursors';
import { PresenceAvatars } from '@/components/PresenceAvatars';

export default function ThemeEditor() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  const [css, setCss] = useState('');
  const [activePreset, setActivePreset] = useState('minimal');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { canvasRef, remoteCursors, presenceList, socketId } = useCollaborativeArea(id);

  useEffect(() => {
    getForm(id).then((r) => {
      const nextForm = r.data.form;
      setForm(nextForm);
      setActivePreset(nextForm.theme?.preset || 'minimal');
      setCss(nextForm.theme?.custom_css || CSS_PLACEHOLDER);
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
      <div ref={canvasRef} className="flex flex-col h-screen bg-background overflow-hidden relative">
        <RemoteCursors cursors={remoteCursors} currentSocketId={socketId} />
        {/* Toolbar */}
        <div className="flex h-14 items-center px-4 border-b border-border bg-card shrink-0 gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/builder/${id}`)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-bold text-lg">{form.title}</span>

          <div className="toolbar-nav mx-auto">
            <button className="toolbar-nav-item" onClick={() => router.push(`/builder/${id}`)}>Workshop</button>
            <button className="toolbar-nav-item" onClick={() => router.push(`/logic/${id}`)}>Logic</button>
            <button className="toolbar-nav-item active">Theme</button>
            <button className="toolbar-nav-item" onClick={() => router.push(`/history/${id}`)}>History</button>
            <button className="toolbar-nav-item" onClick={() => router.push(`/vault/${id}`)}>Vault</button>
          </div>

          <div className="ml-auto w-48 flex justify-end">
            <PresenceAvatars users={presenceList} />
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
          <div className="flex-1 overflow-y-auto">
            <div
              className="p-8 flex flex-col items-center min-h-full"
              style={{ background: currentPreset.preview.bg }}
            >
              {/* Inject preset + custom CSS into the live preview */}
              <style dangerouslySetInnerHTML={{ __html: currentPreset.css + '\n' + css }} />

              <div className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: currentPreset.preview.text, opacity: 0.5 }}>
                Live Preview — {currentPreset.label}
              </div>

              <div
                className="ff-stage w-full max-w-2xl rounded-2xl p-8 sm:p-12 min-h-[400px]"
                style={{
                  background: activePreset === 'glassmorphism' ? 'rgba(255,255,255,0.2)' : activePreset === 'bold' ? '#18181b' : '#ffffff',
                  backdropFilter: activePreset === 'glassmorphism' ? 'blur(16px)' : undefined,
                  border: `1px solid ${activePreset === 'bold' ? '#27272a' : activePreset === 'glassmorphism' ? 'rgba(255,255,255,0.3)' : '#e4e4e7'}`,
                  boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
                }}
              >
                <h1
                  className="text-3xl font-bold mb-8"
                  style={{ color: currentPreset.preview.text, fontFamily: activePreset === 'corporate' ? 'Georgia, serif' : 'Inter, sans-serif' }}
                >
                  {form.title}
                </h1>

                {/* Render ALL form fields in preview */}
                <div className="space-y-6">
                  {(form.fields || []).map((f: any) => {
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
                  <button
                    type="submit"
                    className="h-12 w-full rounded-xl flex items-center justify-center text-sm font-semibold"
                    style={{ backgroundColor: currentPreset.preview.accent, color: activePreset === 'minimal' || activePreset === 'corporate' ? '#ffffff' : currentPreset.preview.bg.startsWith('#') ? currentPreset.preview.bg : '#000' }}
                    disabled
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
