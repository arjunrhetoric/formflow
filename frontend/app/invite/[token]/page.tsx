'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { joinByToken } from '@/lib/api/forms';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Loader2, Users, CheckCircle, AlertCircle, Layers, ArrowRight } from 'lucide-react';

export default function InvitePage() {
  const params = useParams() as { token: string };
  const token = decodeURIComponent(params.token);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'joined' | 'already' | 'error' | 'needLogin'>('loading');
  const [formInfo, setFormInfo] = useState<{ _id: string; title: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Store the invite token so we can redirect after login
      localStorage.setItem('formflow_pending_invite', token);
      setStatus('needLogin');
      return;
    }

    // Try to join
    joinByToken(token)
      .then((res) => {
        setFormInfo(res.data.form);
        setStatus(res.data.alreadyMember ? 'already' : 'joined');
        localStorage.removeItem('formflow_pending_invite');
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Invalid invite link');
        setStatus('error');
      });
  }, [token, user, authLoading]);

  if (authLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm font-medium">Joining form...</p>
        </div>
      </div>
    );
  }

  if (status === 'needLogin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="inline-flex h-16 w-16 rounded-2xl bg-primary/10 items-center justify-center mb-6">
            <Layers className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-3">You&apos;re invited to collaborate</h1>
          <p className="text-muted-foreground mb-8">
            Sign in or create an account to join this form as a collaborator.
          </p>
          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full" onClick={() => router.push('/login')}>
              Sign In / Sign Up <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full text-center"
      >
        {status === 'error' ? (
          <>
            <div className="inline-flex h-16 w-16 rounded-full bg-destructive/10 items-center justify-center mb-6">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-3">Invalid Invite</h1>
            <p className="text-muted-foreground mb-8">{errorMsg}</p>
            <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
          </>
        ) : (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
              className="inline-flex h-16 w-16 rounded-full bg-green-500/10 items-center justify-center mb-6"
            >
              <CheckCircle className="h-8 w-8 text-green-600" />
            </motion.div>
            <h1 className="text-2xl font-bold tracking-tight mb-3">
              {status === 'already' ? 'Already a Member' : 'Welcome to the Team!'}
            </h1>
            <p className="text-muted-foreground mb-2">
              {status === 'already'
                ? `You're already a collaborator on "${formInfo?.title}".`
                : `You've been added as a collaborator on "${formInfo?.title}".`}
            </p>
            <p className="text-xs text-muted-foreground mb-8">
              You can now edit this form in real-time with the team.
            </p>
            <Button size="lg" onClick={() => router.push(`/builder/${formInfo?._id}`)}>
              <Users className="h-4 w-4 mr-2" /> Open Builder
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}
