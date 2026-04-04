'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getCollaborators, addCollaborator, removeCollaborator,
  regenerateToken, updateFormSettings
} from '@/lib/api/forms';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import {
  UserPlus, Link as LinkIcon, Copy, Check, Trash2,
  Crown, Users, RefreshCw, Loader2, Globe, Lock, Mail, Shield
} from 'lucide-react';

interface Collaborator {
  _id: string;
  name: string;
  email: string;
  cursorColor: string;
  avatar_url: string;
  role: 'owner' | 'collaborator';
}

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  formId: string;
  formSlug: string;
  currentUserId?: string;
}

export function ShareDialog({ open, onClose, formId, formSlug, currentUserId }: ShareDialogProps) {
  const [owner, setOwner] = useState<Collaborator | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [shareToken, setShareToken] = useState('');
  const [requireSignup, setRequireSignup] = useState(false);
  const [allowMultipleResponses, setAllowMultipleResponses] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [copiedLink, setCopiedLink] = useState<'public' | 'collab' | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'collaborate' | 'publish'>('collaborate');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCollaborators(formId);
      setOwner(res.data.owner);
      setCollaborators(res.data.collaborators || []);
      setShareToken(res.data.shareToken || '');
      setRequireSignup(res.data.requireSignupToSubmit || false);
      setAllowMultipleResponses(res.data.allowMultipleResponses || false);
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      const res = await addCollaborator(formId, email.trim());
      setCollaborators((prev) => [...prev, res.data.collaborator]);
      setInviteSuccess(`${res.data.collaborator.name} added as collaborator!`);
      setEmail('');
      setTimeout(() => setInviteSuccess(''), 3000);
    } catch (err: any) {
      setInviteError(err.response?.data?.message || 'Failed to add collaborator');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await removeCollaborator(formId, userId);
      setCollaborators((prev) => prev.filter((c) => c._id !== userId));
    } catch (err: any) {
      setInviteError(err.response?.data?.message || 'Failed to remove collaborator');
    }
  };

  const handleRegenerateToken = async () => {
    setRegenerating(true);
    try {
      const res = await regenerateToken(formId);
      setShareToken(res.data.shareToken);
    } finally {
      setRegenerating(false);
    }
  };

  const handleToggleSignup = async (checked: boolean) => {
    const previous = requireSignup;
    setRequireSignup(checked);
    setSettingsError('');
    setSettingsSaving(true);
    try {
      await updateFormSettings(formId, { requireSignupToSubmit: checked });
      await load();
    } catch (err: any) {
      setRequireSignup(previous);
      setSettingsError(err.response?.data?.message || 'Could not update submission settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleToggleMultipleResponses = async (checked: boolean) => {
    const previous = allowMultipleResponses;
    setAllowMultipleResponses(checked);
    setSettingsError('');
    setSettingsSaving(true);
    try {
      await updateFormSettings(formId, { allowMultipleResponses: checked });
      await load();
    } catch (err: any) {
      setAllowMultipleResponses(previous);
      setSettingsError(err.response?.data?.message || 'Could not update submission settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const copyToClipboard = (text: string, type: 'public' | 'collab') => {
    navigator.clipboard.writeText(text);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/f/${formSlug}`
    : `/f/${formSlug}`;

  const collabUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/invite/${shareToken}`
    : `/invite/${shareToken}`;

  const isOwner = owner?._id === currentUserId;

  const initials = (name: string) =>
    name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-[560px] !p-0 !gap-0 overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          <DialogTitle className="text-lg font-bold">Share Form</DialogTitle>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors ${
              activeTab === 'collaborate'
                ? 'text-foreground border-b-2 border-primary bg-background'
                : 'text-muted-foreground hover:text-foreground bg-muted/30'
            }`}
            onClick={() => setActiveTab('collaborate')}
          >
            <Users className="h-4 w-4" />
            Collaborate
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors ${
              activeTab === 'publish'
                ? 'text-foreground border-b-2 border-primary bg-background'
                : 'text-muted-foreground hover:text-foreground bg-muted/30'
            }`}
            onClick={() => setActiveTab('publish')}
          >
            <Globe className="h-4 w-4" />
            Publish
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === 'collaborate' ? (
          <div className="p-5 flex flex-col gap-5">
            {/* Invite by email */}
            <div>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Invite by Email
              </h3>
              <form onSubmit={handleInvite} className="flex items-stretch gap-2 min-w-0">
                <Input
                  placeholder="colleague@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 min-w-0 h-9"
                />
                <Button type="submit" disabled={inviteLoading || !email.trim()} className="shrink-0 h-9 px-3">
                  {inviteLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <><UserPlus className="h-4 w-4 mr-1.5" /> Invite</>
                  )}
                </Button>
              </form>

              <AnimatePresence>
                {inviteError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-destructive mt-2 font-medium overflow-hidden"
                  >
                    {inviteError}
                  </motion.p>
                )}
                {inviteSuccess && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-green-600 mt-2 font-medium overflow-hidden"
                  >
                    ✓ {inviteSuccess}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Shareable builder link */}
            <div>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-primary" />
                Shareable Invite Link
              </h3>
              <p className="text-xs text-muted-foreground mb-2">
                Anyone with this link can join as a collaborator (requires login).
              </p>
              <div className="flex items-stretch gap-2 min-w-0">
                <div className="flex-1 flex items-center bg-muted rounded-lg px-3 h-9 text-xs font-mono text-muted-foreground truncate border border-border">
                  {collabUrl}
                </div>
                <Button
                  variant="outline"
                  className="shrink-0 h-9"
                  onClick={() => copyToClipboard(collabUrl, 'collab')}
                >
                  {copiedLink === 'collab' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                {isOwner && (
                  <Button
                    variant="ghost"
                    className="shrink-0 h-9 w-9 p-0"
                    onClick={handleRegenerateToken}
                    disabled={regenerating}
                    title="Regenerate link (invalidates old link)"
                  >
                    <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
            </div>

            {/* Team members list */}
            <div>
              <h3 className="text-sm font-bold mb-3">
                Team ({1 + collaborators.length})
              </h3>
              <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                {/* Owner */}
                {owner && (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/40">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: owner.cursorColor || '#18181b' }}
                    >
                      {initials(owner.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{owner.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{owner.email}</p>
                    </div>
                    <div className="ml-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                      <Crown className="h-3 w-3" /> Owner
                    </div>
                  </div>
                )}

                {/* Collaborators */}
                <AnimatePresence>
                  {collaborators.map((c) => (
                    <motion.div
                      key={c._id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8, height: 0 }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors group overflow-hidden"
                    >
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                        style={{ backgroundColor: c.cursorColor || '#6C5CE7' }}
                      >
                        {initials(c.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium shrink-0">Editor</span>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => handleRemove(c._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        ) : (
          /* Publish tab */
          <div className="p-5 flex flex-col gap-5">
            {/* Public form link */}
            <div>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Public Form Link
              </h3>
              <p className="text-xs text-muted-foreground mb-2">
                Share this link with respondents to fill out the form.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-muted rounded-lg px-3 h-9 text-xs font-mono text-muted-foreground truncate border border-border">
                  {publicUrl}
                </div>
                <Button
                  variant="outline"
                  className="shrink-0 h-9"
                  onClick={() => copyToClipboard(publicUrl, 'public')}
                >
                  {copiedLink === 'public' ? (
                    <><Check className="h-4 w-4 text-green-600 mr-1.5" /> Copied!</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-1.5" /> Copy</>
                  )}
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={() => window.open(publicUrl, '_blank')}
              >
                Open in new tab
              </Button>
            </div>

            {/* Submission settings */}
            <div className="border-t border-border pt-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Submission Settings
                </h3>
                {settingsSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Lock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Require Sign Up</p>
                    <p className="text-xs text-muted-foreground">
                      Respondents must create an account to submit
                    </p>
                  </div>
                </div>
                <Switch
                  checked={requireSignup}
                  onCheckedChange={handleToggleSignup}
                  disabled={settingsSaving}
                />
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Allow Multiple Responses</p>
                    <p className="text-xs text-muted-foreground">
                      If off, one response per IP/network is allowed. If on, repeat submissions are accepted.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={allowMultipleResponses}
                  onCheckedChange={handleToggleMultipleResponses}
                  disabled={settingsSaving}
                />
              </div>
              {settingsError && (
                <p className="mt-2 text-xs font-medium text-destructive">{settingsError}</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
