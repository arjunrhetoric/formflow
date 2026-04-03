'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function AuthPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') await login(email, password);
      else await register(name, email, password);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Unable to continue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-[#09090b] lg:flex flex-col justify-center items-center relative overflow-hidden text-center select-none">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none flex flex-col gap-6 p-12 custom-shapes">
          <div className="w-[300px] h-[100px] bg-white rounded-xl blur-sm transform -rotate-6 shadow-2xl"></div>
          <div className="w-[400px] h-[80px] bg-white rounded-xl blur-sm transform translate-x-12"></div>
          <div className="w-[200px] h-[150px] bg-white rounded-xl blur-sm transform rotate-3"></div>
        </div>
        <div className="z-10 flex flex-col items-center">
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">FormFlow</h1>
          <p className="text-[#a1a1aa] text-lg font-medium">The Architect's Canvas</p>
        </div>
      </div>
      
      <div className="flex w-full lg:w-1/2 flex-col justify-center items-center bg-background px-8">
        <div className="w-full max-w-sm">
          <div className="flex border-b border-border w-full mb-8">
            <button
              className={`flex-1 pb-3 text-sm font-medium transition-colors ${tab === 'login' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setTab('login')}
            >
              Login
            </button>
            <button
              className={`flex-1 pb-3 text-sm font-medium transition-colors ${tab === 'register' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setTab('register')}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {tab === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Jane Doe" />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@example.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-foreground">Password</label>
                {tab === 'login' && <a href="#" className="text-xs text-muted-foreground hover:underline">Forgot password?</a>}
              </div>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" error={!!error} />
              {error && <span className="text-xs text-destructive">{error}</span>}
            </div>
            <Button type="submit" className="w-full mt-4 h-10" disabled={loading}>
              {loading ? 'Working...' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
