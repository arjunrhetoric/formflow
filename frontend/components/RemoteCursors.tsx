'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CursorData {
  userId: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

interface RemoteCursorsProps {
  cursors: Record<string, CursorData>;
  currentUserId?: string;
}

export function RemoteCursors({ cursors, currentUserId }: RemoteCursorsProps) {
  const entries = Object.values(cursors).filter(
    (c) => c.userId !== currentUserId && c.x !== undefined && c.y !== undefined
  );

  return (
    <AnimatePresence>
      {entries.map((cursor) => (
        <motion.div
          key={cursor.userId}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed pointer-events-none z-50"
          style={{ left: cursor.x, top: cursor.y }}
        >
          {/* SVG cursor arrow */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-md"
          >
            <path
              d="M3 2L17 10L10 11.5L7 18L3 2Z"
              fill={cursor.color}
              stroke="white"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          {/* Name label */}
          <div
            className="absolute left-4 top-4 text-[11px] font-semibold text-white px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name}
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
