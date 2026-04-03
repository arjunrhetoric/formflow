'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PresenceUser {
  userId: string;
  name: string;
  color: string;
}

export function PresenceAvatars({ users }: { users: PresenceUser[] }) {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <AnimatePresence>
        {users.slice(0, 5).map((u) => (
          <motion.div
            key={u.userId}
            initial={{ opacity: 0, scale: 0, x: -8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0, x: -8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            title={u.name}
            className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-background -ml-1 first:ml-0 cursor-default shadow-sm"
            style={{ backgroundColor: u.color }}
          >
            {u.name.charAt(0).toUpperCase()}
          </motion.div>
        ))}
      </AnimatePresence>
      {users.length > 5 && (
        <span className="text-xs text-muted-foreground font-medium ml-1">
          +{users.length - 5}
        </span>
      )}
    </div>
  );
}
