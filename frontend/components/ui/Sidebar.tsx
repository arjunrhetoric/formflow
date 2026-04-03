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
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light'|'dark'>('light');

  useEffect(() => {
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
    { href: '#', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className={`border-r border-border bg-muted/30 flex flex-col transition-all overflow-hidden ${collapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex h-14 items-center justify-between px-4 border-b border-border">
          {!collapsed && <span className="font-bold text-lg cursor-default">FormFlow</span>}
          <Button variant="ghost" onClick={() => setCollapsed(!collapsed)} className="h-8 w-8 p-0 ml-auto">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {links.map((li) => {
            const active = pathname === li.href;
            return (
              <Link key={li.label} href={li.href} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${active ? 'bg-secondary text-primary font-semibold' : 'text-muted-foreground hover:bg-secondary/50'}`}>
                <li.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{li.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="p-0 h-8 w-8 shrink-0 rounded-full bg-secondary text-foreground" onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            {!collapsed && <span className="text-xs text-muted-foreground">Dark Mode</span>}
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0" style={user.cursorColor ? { backgroundColor: user.cursorColor } : {}}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">{user.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                </div>
              )}
              {!collapsed && (
                <Button variant="ghost" className="h-8 w-8 p-0" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  );
}
