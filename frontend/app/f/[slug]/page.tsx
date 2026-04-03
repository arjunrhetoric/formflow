'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getPublicForm, submitForm } from '@/lib/api/public';
import { Button } from '@/components/ui/Button';
import { FieldComponents } from '@/components/fields';
import { CheckCircle, Loader2, Send } from 'lucide-react';

/* ───── Theme Preset CSS ───── */
const THEME_PRESETS: Record<string, { bodyClass: string; cardClass: string; css: string }> = {
  minimal: {
    bodyClass: 'bg-[#fafafa]',
    cardClass: 'bg-white border-[#e4e4e7]',
    css: '',
  },
  bold: {
    bodyClass: 'bg-[#09090b]',
    cardClass: 'bg-[#18181b] border-[#27272a] text-white',
    css: `
      .ff-stage label { color: #fafafa; }
      .ff-stage .text-muted-foreground { color: #a1a1aa; }
      .ff-stage input, .ff-stage textarea, .ff-stage select {
        background: #27272a; border-color: #3f3f46; color: #fafafa;
      }
      .ff-stage input::placeholder, .ff-stage textarea::placeholder { color: #71717a; }
    `,
  },
  glassmorphism: {
    bodyClass: 'bg-gradient-to-br from-purple-600 via-blue-500 to-cyan-400',
    cardClass: 'bg-white/20 backdrop-blur-xl border-white/30 text-white shadow-2xl',
    css: `
      .ff-stage label { color: #ffffff; }
      .ff-stage .text-muted-foreground { color: rgba(255,255,255,0.7); }
      .ff-stage input, .ff-stage textarea, .ff-stage select {
        background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); color: #ffffff;
      }
      .ff-stage input::placeholder, .ff-stage textarea::placeholder { color: rgba(255,255,255,0.5); }
      .ff-stage button[type="submit"] { background: rgba(255,255,255,0.25); backdrop-filter: blur(8px); }
    `,
  },
  corporate: {
    bodyClass: 'bg-[#f0f2f5]',
    cardClass: 'bg-white border-[#1e3a5f] border-2',
    css: `
      .ff-stage { font-family: Georgia, 'Times New Roman', serif; }
      .ff-stage h1 { color: #1e3a5f; }
      .ff-stage button[type="submit"] { background: #1e3a5f; }
    `,
  },
};

/* ───── Logic Evaluation Engine (mirrors backend logicEngine.js) ───── */
function evaluateCondition(answer: any, condition: any): boolean {
  switch (condition.op) {
    case 'equals':
      return answer === condition.value;
    case 'not_equals':
      return answer !== condition.value;
    case 'contains':
      return typeof answer === 'string' && answer.includes(condition.value);
    case 'gt':
      return Number(answer) > Number(condition.value);
    case 'lt':
      return Number(answer) < Number(condition.value);
    case 'is_empty':
      return answer === undefined || answer === null || answer === '' || (Array.isArray(answer) && answer.length === 0);
    case 'in_list':
      return Array.isArray(answer) && Array.isArray(condition.value) && condition.value.some((v: any) => answer.includes(v));
    default:
      return false;
  }
}

function evaluateLogic(fields: any[], answers: Record<string, any>): Set<string> {
  const hidden = new Set<string>();
  for (const field of fields) {
    for (const rule of field.logic || []) {
      const refFieldId = rule.condition.field === 'self' ? field.id : rule.condition.field;
      const answer = answers[refFieldId];
      if (!evaluateCondition(answer, rule.condition)) continue;

      if (rule.action.type === 'hide') {
        (rule.action.targets || []).forEach((t: string) => hidden.add(t));
      }
      if (rule.action.type === 'show') {
        (rule.action.targets || []).forEach((t: string) => hidden.delete(t));
      }
    }
  }
  return hidden;
}

export default function StagePage() {
  const { slug } = useParams() as { slug: string };
  const [form, setForm] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    getPublicForm(slug).then((r) => setForm(r.data.form)).catch(console.error);
    startTimeRef.current = Date.now();
  }, [slug]);

  const hiddenFields = useMemo(() => {
    if (!form?.fields) return new Set<string>();
    return evaluateLogic(form.fields, answers);
  }, [form?.fields, answers]);

  const visibleFields = useMemo(() => {
    return (form?.fields || []).filter((f: any) => !hiddenFields.has(f.id));
  }, [form?.fields, hiddenFields]);

  const progress = useMemo(() => {
    if (!visibleFields.length) return 0;
    const answered = visibleFields.filter((f: any) => {
      const v = answers[f.id];
      return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
    }).length;
    return Math.round((answered / visibleFields.length) * 100);
  }, [visibleFields, answers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const completionTime = Math.round((Date.now() - startTimeRef.current) / 1000);
      await submitForm(slug, answers, completionTime);
      setSubmitted(true);
    } catch (err: any) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors && typeof serverErrors === 'object') {
        setErrors(serverErrors);
      } else {
        setErrors({ _form: err.response?.data?.message || 'Error submitting form' });
      }
    }
    setLoading(false);
  };

  // Theme
  const preset = form?.theme?.preset || 'minimal';
  const theme = THEME_PRESETS[preset] || THEME_PRESETS.minimal;
  const customCss = form?.theme?.custom_css || '';

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 text-center ${theme.bodyClass}`}>
        <style dangerouslySetInnerHTML={{ __html: theme.css + customCss }} />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={`max-w-md w-full p-12 rounded-2xl shadow-xl border ${theme.cardClass}`}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
            className="w-16 h-16 bg-green-500/20 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="h-8 w-8" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-3">Response Submitted</h2>
          <p className="text-muted-foreground mb-8">Thank you! Your response has been securely recorded.</p>
          <Button onClick={() => { setSubmitted(false); setAnswers({}); startTimeRef.current = Date.now(); }} variant="outline">
            Submit another
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`ff-stage min-h-screen py-12 px-4 sm:px-8 flex flex-col items-center ${theme.bodyClass}`}>
      <style dangerouslySetInnerHTML={{ __html: theme.css + customCss }} />

      {/* Progress bar */}
      <div className="w-full max-w-2xl mb-6">
        <div className="h-1 w-full bg-border/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-muted-foreground">{progress}% complete</span>
          <span className="text-xs text-muted-foreground">{visibleFields.length} fields</span>
        </div>
      </div>

      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`shadow-xl border rounded-2xl p-8 sm:p-12 ${theme.cardClass}`}
        >
          <h1 className="text-3xl font-bold tracking-tight mb-8 break-words">{form.title}</h1>

          {errors._form && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-medium">
              {errors._form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-7">
            <AnimatePresence mode="popLayout">
              {visibleFields.map((f: any) => {
                const Comp = FieldComponents[f.type] || FieldComponents.short_text;
                const options = Array.isArray(f.config?.options)
                  ? f.config.options.map((o: any) => typeof o === 'string' ? { label: o, value: o } : o)
                  : [];
                return (
                  <motion.div
                    key={f.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <Comp
                      label={f.label}
                      required={!!f.validation?.required}
                      value={answers[f.id]}
                      onChange={(v: any) => setAnswers((prev) => ({ ...prev, [f.id]: v }))}
                      error={errors[f.id]}
                      options={options}
                      placeholder={f.config?.placeholder}
                      maxStars={f.config?.max_stars}
                      prefix={f.config?.prefix}
                      suffix={f.config?.suffix}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <div className="pt-6 mt-2 border-t border-border/50 flex justify-end">
              <Button type="submit" size="lg" className="w-full sm:w-auto h-12 px-8 text-base shadow-md disabled:opacity-50 gap-2" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                ) : (
                  <><Send className="h-4 w-4" /> Submit</>
                )}
              </Button>
            </div>
          </form>
        </motion.div>

        <div className="mt-8 text-center text-xs text-muted-foreground opacity-60">
          Powered by <span className="font-semibold">FormFlow</span>
        </div>
      </div>
    </div>
  );
}
