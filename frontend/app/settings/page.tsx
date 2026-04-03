'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { updateProfile, changePassword } from '@/lib/api/auth';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/ui/Sidebar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  User, Lock, Palette, Check, Loader2, AlertCircle, Eye, EyeOff
} from 'lucide-react';

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#6C5CE7', '#FD79A8', '#00B894', '#E17055',
];

export default function SettingsPage() {
  const { user, login } = useAuth();

  // Profile
  const [name, setName] = useState(user?.name || '');
  const [selectedColor, setSelectedColor] = useState(user?.cursorColor || '#2563eb');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await updateProfile({ name: name.trim(), cursorColor: selectedColor });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwdMsg(null);

    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPwd.length < 6) {
      setPwdMsg({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }

    setPwdSaving(true);
    try {
      await changePassword(currentPwd, newPwd);
      setPwdMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setTimeout(() => setPwdMsg(null), 3000);
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err.response?.data?.message || 'Failed to change password' });
    } finally {
      setPwdSaving(false);
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    : 'FF';

  return (
    <AuthGuard>
      <Sidebar>
        <div className="p-8 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-2xl font-bold tracking-tight mb-1">Settings</h1>
            <p className="text-muted-foreground text-sm mb-8">Manage your account and preferences</p>

            {/* Profile Section */}
            <div className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Profile</h2>
                  <p className="text-xs text-muted-foreground">Your personal information</p>
                </div>
              </div>

              {/* Avatar preview */}
              <div className="flex items-center gap-5 mb-6 p-4 rounded-xl bg-muted/30 border border-border/50">
                <div
                  className="h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-md transition-colors duration-300"
                  style={{ backgroundColor: selectedColor }}
                >
                  {initials}
                </div>
                <div>
                  <p className="font-semibold">{name || user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              {/* Name */}
              <div className="mb-5">
                <label className="text-sm font-medium mb-1.5 block">Display Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              {/* Email (read-only) */}
              <div className="mb-5">
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input value={user?.email || ''} disabled className="opacity-60" />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>

              {/* Cursor Color */}
              <div className="mb-5">
                <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                  <Palette className="h-3.5 w-3.5 text-primary" />
                  Cursor Color
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                  This color is shown to collaborators in the builder
                </p>
                <div className="flex flex-wrap gap-2">
                  {CURSOR_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`h-9 w-9 rounded-xl transition-all duration-200 border-2 hover:scale-110 ${
                        selectedColor === color
                          ? 'border-foreground scale-110 shadow-md'
                          : 'border-transparent hover:border-border'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {selectedColor === color && (
                        <Check className="h-4 w-4 text-white mx-auto drop-shadow-sm" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {profileMsg && (
                <div className={`mb-4 p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
                  profileMsg.type === 'success'
                    ? 'bg-green-500/10 text-green-700 border border-green-500/20'
                    : 'bg-destructive/10 text-destructive border border-destructive/20'
                }`}>
                  {profileMsg.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {profileMsg.text}
                </div>
              )}

              <Button onClick={handleProfileSave} disabled={profileSaving} className="w-full sm:w-auto">
                {profileSaving ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>

            {/* Password Section */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Lock className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Password</h2>
                  <p className="text-xs text-muted-foreground">Update your password</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium mb-1.5 block">Current Password</label>
                <div className="relative">
                  <Input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium mb-1.5 block">New Password</label>
                <div className="relative">
                  <Input
                    type={showNew ? 'text' : 'password'}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="mb-5">
                <label className="text-sm font-medium mb-1.5 block">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {pwdMsg && (
                <div className={`mb-4 p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
                  pwdMsg.type === 'success'
                    ? 'bg-green-500/10 text-green-700 border border-green-500/20'
                    : 'bg-destructive/10 text-destructive border border-destructive/20'
                }`}>
                  {pwdMsg.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {pwdMsg.text}
                </div>
              )}

              <Button
                onClick={handlePasswordChange}
                disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}
                className="w-full sm:w-auto"
              >
                {pwdSaving ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Changing...</>
                ) : (
                  'Change Password'
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      </Sidebar>
    </AuthGuard>
  );
}
