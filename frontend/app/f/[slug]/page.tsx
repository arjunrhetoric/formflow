'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPublicForm, submitForm } from '@/lib/api/public';
import { Button } from '@/components/ui/Button';
import { FieldComponents } from '@/components/fields';

export default function StagePage() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPublicForm(slug).then(r => setForm(r.data.form)).catch(console.error);
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submitForm(slug, answers);
      setSubmitted(true);
    } catch(e) {
      console.error(e);
      alert('Error submitting form');
    }
    setLoading(false);
  };

  if (!form) return <div className="min-h-screen flex items-center justify-center bg-background"><span className="animate-pulse">Loading...</span></div>;

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center">
        <div className="max-w-md w-full bg-card p-12 rounded-2xl shadow-xl border border-border">
          <div className="w-16 h-16 bg-[#dcfce7] text-[#166534] rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">✓</div>
          <h2 className="text-2xl font-bold mb-3">Response Submitted</h2>
          <p className="text-muted-foreground mb-8">Thank you! Your response has been securely recorded.</p>
          <Button onClick={() => setSubmitted(false)} variant="outline">Submit another</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-16 px-4 sm:px-8 flex justify-center">
      <div className="w-full max-w-2xl">
        <div className="bg-card shadow-xl border border-border rounded-2xl p-8 sm:p-12">
          <h1 className="text-3xl font-bold tracking-tight mb-8 break-words text-foreground">{form.title}</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            {form.fields?.map((f: any) => {
              const Comp = FieldComponents[f.type] || FieldComponents.short_text;
              return (
                <div key={f.id} className="w-full">
                  <Comp 
                    label={f.label} 
                    required={!!f.validation?.required} 
                    value={answers[f.id]}
                    onChange={(v:any) => setAnswers(prev => ({ ...prev, [f.id]: v }))}
                  />
                </div>
              );
            })}
            <div className="pt-6 mt-4 border-t border-border flex justify-end">
              <Button type="submit" size="lg" className="w-full sm:w-auto h-12 px-8 text-base shadow-md disabled:opacity-50" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </form>
        </div>
        <div className="mt-8 text-center text-xs text-muted-foreground opacity-60">
          Powered by <span className="font-semibold">FormFlow</span>
        </div>
      </div>
    </div>
  );
}
