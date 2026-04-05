'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Settings, LogOut, Sun, Moon, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from './Button';

export function Sidebar({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [theme, setTheme] = useState<'light'|'dark'>('light');

  useEffect(() => {
    if (window.innerWidth >= 768) {
      setCollapsed(false);
    }
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
      setTheme('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    if (next === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard', label: 'My Forms', icon: FileText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'FF';

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background text-foreground">
      {/* Mobile Backdrop */}
      {!collapsed && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" 
          onClick={() => setCollapsed(true)} 
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 border-r border-border bg-gradient-to-b from-background via-background to-muted/30 flex flex-col transition-all overflow-hidden md:relative md:translate-x-0 ${
          collapsed ? '-translate-x-full md:w-20' : 'translate-x-0 w-[280px] md:w-72'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <span className="text-sm font-bold tracking-wide">FF</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-base font-bold tracking-tight">FormFlow</div>
                <div className="truncate text-xs text-muted-foreground">Collaborative form studio</div>
              </div>
            )}
          </div>
          <Button variant="ghost" onClick={() => setCollapsed(!collapsed)} className="h-8 w-8 p-0 ml-auto hidden md:flex">
            <Menu className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={() => setCollapsed(true)} className="h-8 w-8 p-0 ml-auto md:hidden">
            <Menu className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {links.map((li) => {
            const active = pathname === li.href;
            return (
              <Link key={li.label} href={li.href} onClick={() => { if(window.innerWidth < 768) setCollapsed(true) }} className={`flex items-center gap-3 rounded-[0.5rem] px-3 py-2.5 text-sm font-medium transition-all duration-200 ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground hover:shadow-xs hover:-translate-y-[1px]'}`}>
                <li.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{li.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border/80 flex flex-col gap-4 bg-muted/20">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <Button variant="outline" className="p-0 h-10 w-10 shrink-0 rounded-full" onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            {!collapsed && <span className="text-sm text-muted-foreground font-medium">Toggle theme</span>}
          </div>
          {user && (
            <div className={`rounded-2xl border border-border bg-card/90 p-3 shadow-sm ${collapsed ? 'flex flex-col items-center gap-3' : 'flex items-center gap-3'}`}>
              <div className="h-11 w-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0 shadow-sm ring-2 ring-background" style={user.cursorColor ? { backgroundColor: user.cursorColor } : {}}>
                {initials}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-semibold">{user.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                </div>
              )}
              <Button variant={collapsed ? 'outline' : 'ghost'} className="h-9 w-9 p-0 shrink-0" onClick={logout} title="Log out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {/* Mobile Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:hidden">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2" onClick={() => setCollapsed(false)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="font-bold text-[15px] tracking-tight">FormFlow</div>
          </div>
        </div>
        <div className="flex-1 overflow-auto flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
