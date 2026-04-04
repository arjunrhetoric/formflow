'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Loader2, LogIn, Send, ShieldCheck, UserPlus } from 'lucide-react';
import * as authApi from '@/lib/api/auth';
import { getPublicForm, submitForm, validateForm } from '@/lib/api/public';
import { FieldComponents } from '@/components/fields';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { THEME_PRESETS } from '@/lib/themes';

function evaluateCondition(answer: any, condition: any): boolean {
  const answerIsArray = Array.isArray(answer);
  const conditionIsArray = Array.isArray(condition.value);

  switch (condition.op) {
    case 'equals':
      if (answerIsArray) {
        if (conditionIsArray) {
          return answer.length === condition.value.length && condition.value.every((value: any) => answer.includes(value));
        }
        return answer.includes(condition.value);
      }
      return answer === condition.value;
    case 'not_equals':
      if (answerIsArray) {
        if (conditionIsArray) {
          return !(answer.length === condition.value.length && condition.value.every((value: any) => answer.includes(value)));
        }
        return !answer.includes(condition.value);
      }
      return answer !== condition.value;
    case 'contains':
      if (typeof answer === 'string') return answer.includes(String(condition.value ?? ''));
      if (answerIsArray) {
        if (conditionIsArray) return condition.value.every((value: any) => answer.includes(value));
        return answer.includes(condition.value);
      }
      return false;
    case 'starts_with':
      return typeof answer === 'string' && answer.startsWith(condition.value);
    case 'gt':
      return Number(answer) > Number(condition.value);
    case 'gte':
      return Number(answer) >= Number(condition.value);
    case 'lt':
      return Number(answer) < Number(condition.value);
    case 'lte':
      return Number(answer) <= Number(condition.value);
    case 'is_empty':
      return answer === undefined || answer === null || answer === '' || (Array.isArray(answer) && answer.length === 0);
    case 'in_list':
      if (!conditionIsArray) return false;
      if (answerIsArray) return condition.value.some((value: any) => answer.includes(value));
      return condition.value.includes(answer);
    default:
      return false;
  }
}

function evaluateLogic(fields: any[], answers: Record<string, any>): Set<string> {
  const hidden = new Set<string>();

  for (const field of fields) {
    for (const rule of field.logic || []) {
      if (rule.action.type === 'show') {
        (rule.action.targets || []).forEach((target: string) => hidden.add(target));
      }
    }
  }

  for (const field of fields) {
    for (const rule of field.logic || []) {
      const refFieldId = rule.condition.field === 'self' ? field.id : rule.condition.field;
      const answer = answers[refFieldId];
      if (!evaluateCondition(answer, rule.condition)) continue;

      if (rule.action.type === 'hide') {
        (rule.action.targets || []).forEach((target: string) => hidden.add(target));
      }

      if (rule.action.type === 'show') {
        (rule.action.targets || []).forEach((target: string) => hidden.delete(target));
      }
    }
  }

  return hidden;
}

function normalizeAnswersForSubmit(form: any, answers: Record<string, any>) {
  const normalized = { ...answers };

  for (const field of form?.fields || []) {
    const answer = normalized[field.id];

    if (answer === undefined || answer === null || answer === '') {
      continue;
    }

    if ((field.type === 'number' || field.type === 'rating') && typeof answer === 'string') {
      const numericValue = Number(answer);
      normalized[field.id] = Number.isNaN(numericValue) ? answer : numericValue;
    }
  }

  return normalized;
}

function extractApiErrors(err: any) {
  const payload = err?.response?.data;
  const fieldErrors = payload?.errors || payload?.details?.errors;

  if (fieldErrors && typeof fieldErrors === 'object') {
    return fieldErrors;
  }

  return {
    _form: payload?.message || 'We could not submit your form. Please review your answers and try again.',
  };
}

export default function StagePage() {
  const { slug } = useParams() as { slug: string };
  const [form, setForm] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAuthed, setIsAuthed] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    getPublicForm(slug)
      .then((response) => setForm(response.data.form))
      .catch(console.error);

    startTimeRef.current = Date.now();

    const token = typeof window !== 'undefined' ? localStorage.getItem('formflow_token') : null;
    if (token) {
      setIsAuthed(true);
    }
  }, [slug]);

  const hiddenFields = useMemo(() => {
    if (!form?.fields) return new Set<string>();
    return evaluateLogic(form.fields, answers);
  }, [form?.fields, answers]);

  const visibleFields = useMemo(() => {
    return (form?.fields || []).filter((field: any) => !hiddenFields.has(field.id));
  }, [form?.fields, hiddenFields]);

  const progress = useMemo(() => {
    if (!visibleFields.length) return 0;
    const answered = visibleFields.filter((field: any) => {
      const value = answers[field.id];
      return value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0);
    }).length;
    return Math.round((answered / visibleFields.length) * 100);
  }, [answers, visibleFields]);

  const requiredCount = useMemo(() => {
    return visibleFields.filter((field: any) => field.validation?.required).length;
  }, [visibleFields]);

  const preset = form?.theme?.preset || 'minimal';
  const theme = THEME_PRESETS[preset] || THEME_PRESETS.minimal;
  const customCss = form?.theme?.custom_css || '';

  const updateAnswer = (fieldId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      if (!prev[fieldId] && !prev._form) return prev;
      const next = { ...prev };
      delete next[fieldId];
      delete next._form;
      return next;
    });
  };

  const performSubmission = async () => {
    const normalizedAnswers = normalizeAnswersForSubmit(form, answers);
    const validation = await validateForm(slug, normalizedAnswers);

    if (!validation.data?.isValid) {
      setErrors(validation.data?.errors || { _form: 'Please review the highlighted fields and try again.' });
      return false;
    }

    const completionTime = Math.round((Date.now() - startTimeRef.current) / 1000);
    await submitForm(slug, normalizedAnswers, completionTime);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form?.requireSignupToSubmit && !isAuthed) {
      setShowAuth(true);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const success = await performSubmission();
      if (success) {
        setSubmitted(true);
      }
    } catch (err: any) {
      if (err.response?.status === 401 && form?.requireSignupToSubmit) {
        setShowAuth(true);
      } else {
        setErrors(extractApiErrors(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const response =
        authMode === 'login'
          ? await authApi.login(authEmail, authPassword)
          : await authApi.register(authName, authEmail, authPassword);

      localStorage.setItem('formflow_token', response.data.token);
      setIsAuthed(true);
      setShowAuth(false);
      setLoading(true);
      setErrors({});

      try {
        const success = await performSubmission();
        if (success) {
          setSubmitted(true);
        }
      } catch (submitErr: any) {
        setErrors(extractApiErrors(submitErr));
      } finally {
        setLoading(false);
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={`ff-stage min-h-screen flex flex-col items-center justify-center p-8 text-center ${theme.bodyClass}`}>
        <style dangerouslySetInnerHTML={{ __html: theme.css + '\n' + customCss }} />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={`ff-panel max-w-md w-full rounded-[1.75rem] border p-12 shadow-xl ${theme.cardClass}`}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 280, damping: 22 }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-green-600"
          >
            <CheckCircle className="h-8 w-8" />
          </motion.div>
          <h2 className="mb-3 text-2xl font-bold">Response Submitted</h2>
          <p className="mb-8 text-muted-foreground">Thank you. Your response has been securely recorded.</p>
          {form.allowMultipleResponses ? (
            <Button
              variant="outline"
              onClick={() => {
                setSubmitted(false);
                setAnswers({});
                setErrors({});
                startTimeRef.current = Date.now();
              }}
            >
              Submit another
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              This form accepts one response per network. Additional submissions are blocked.
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`ff-stage min-h-screen px-4 py-10 sm:px-8 ${theme.bodyClass}`}>
      <style dangerouslySetInnerHTML={{ __html: theme.css + '\n' + customCss }} />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="ff-panel rounded-[1.5rem] border border-border/60 px-5 py-4 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Public form</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground break-words">{form.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {form.allowMultipleResponses
                  ? 'Complete the required fields below. Multiple responses are allowed for this form.'
                  : 'Complete the required fields below. You can submit once from the same network.'}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              {form.allowMultipleResponses ? 'Multiple responses enabled' : 'One submission per network'}
            </div>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted/70">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{progress}% complete</span>
            <span>{requiredCount} required of {visibleFields.length} visible fields</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`ff-panel rounded-[1.75rem] border p-6 shadow-xl sm:p-10 ${theme.cardClass}`}
        >
          {errors._form && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errors._form}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-7">
            <AnimatePresence mode="popLayout">
              {visibleFields.map((field: any) => {
                const Comp = FieldComponents[field.type] || FieldComponents.short_text;
                const options = Array.isArray(field.config?.options)
                  ? field.config.options.map((option: any) => (typeof option === 'string' ? { label: option, value: option } : option))
                  : [];

                return (
                  <motion.div
                    key={field.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <Comp
                      label={field.label}
                      required={!!field.validation?.required}
                      value={answers[field.id]}
                      onChange={(value: any) => updateAnswer(field.id, value)}
                      error={errors[field.id]}
                      options={options}
                      placeholder={field.config?.placeholder}
                      min={field.config?.min}
                      max={field.config?.max}
                      step={field.config?.step}
                      maxStars={field.config?.max_stars}
                      maxSizeMb={field.config?.max_size_mb}
                      allowedTypes={field.config?.allowed_types}
                      prefix={field.config?.prefix}
                      suffix={field.config?.suffix}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <div className="mt-2 flex justify-end border-t border-border/50 pt-6">
              <Button type="submit" size="lg" className="h-12 w-full gap-2 px-8 text-base shadow-md sm:w-auto" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>

        <div className="text-center text-xs text-muted-foreground/80">
          Powered by <span className="font-semibold text-foreground">FormFlow</span>
        </div>
      </div>

      <AnimatePresence>
        {showAuth && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowAuth(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="w-full max-w-md rounded-[1.75rem] border border-border/70 bg-card p-8 text-card-foreground shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  {authMode === 'login' ? <LogIn className="h-5 w-5 text-primary" /> : <UserPlus className="h-5 w-5 text-primary" />}
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  {authMode === 'login' ? 'Sign in to submit' : 'Create account to submit'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  This form requires an account before your response can be submitted.
                </p>
              </div>

              {authError && (
                <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuth} className="flex flex-col gap-3">
                {authMode === 'register' && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Name</label>
                    <Input
                      placeholder="Your name"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
                  <Input
                    type="password"
                    placeholder="Enter at least 6 characters"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <Button type="submit" disabled={authLoading} className="mt-2 h-11 w-full">
                  {authLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : authMode === 'login' ? (
                    'Sign In & Submit'
                  ) : (
                    'Create Account & Submit'
                  )}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm">
                <span className="text-muted-foreground">
                  {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                </span>{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setAuthError('');
                  }}
                  className="font-semibold text-foreground hover:underline"
                >
                  {authMode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
