'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getForm, updateForm } from '@/lib/api/forms';
import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/Button';
import { FieldComponents } from '@/components/fields';
import { ChevronLeft, Loader2, Check, Palette, Code } from 'lucide-react';

import { THEME_PRESETS_ARRAY, THEME_PRESETS } from '@/lib/themes';

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

  const currentPreset = THEME_PRESETS[activePreset] || THEME_PRESETS_ARRAY[0];

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
                {THEME_PRESETS_ARRAY.map((preset) => (
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
              className={`ff-stage p-8 flex flex-col items-center min-h-full ${currentPreset.bodyClass}`}
            >
              {/* Inject preset + custom CSS into the live preview */}
              <style dangerouslySetInnerHTML={{ __html: currentPreset.css + '\n' + css }} />

              <div className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: currentPreset.preview.text, opacity: 0.5 }}>
                Live Preview — {currentPreset.label}
              </div>

              <div className="w-full max-w-2xl">
                <div className={`shadow-xl border rounded-2xl p-8 sm:p-12 ${currentPreset.cardClass}`}>
                  <h1 className="text-3xl font-bold tracking-tight mb-8 break-words">
                    {form.title}
                  </h1>

                  {/* Render ALL form fields in preview */}
                  <form className="flex flex-col gap-7" onSubmit={(e) => e.preventDefault()}>
                    {(form.fields || []).map((f: any) => {
                      const Comp = FieldComponents[f.type] || FieldComponents.short_text;
                      const options = Array.isArray(f.config?.options)
                        ? f.config.options.map((o: any) => typeof o === 'string' ? { label: o, value: o } : o)
                        : [];
                      return (
                        <div key={f.id} className="overflow-hidden">
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
                    
                    {/* Submit button preview */}
                    <div className="pt-6 mt-2 border-t border-border/50 flex justify-end">
                      <Button type="submit" size="lg" className="w-full sm:w-auto h-12 px-8 text-base shadow-md disabled:opacity-50 gap-2" disabled>
                         Submit
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
