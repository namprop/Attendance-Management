'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useRightSidebarStore } from '@/app/store/rightSidebarStore';

export default function GlobalRightSidebar() {
  const { isOpen, title, content, footer, width, showCloseButton, closeSidebar } = useRightSidebarStore();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeSidebar]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (Overlay) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeSidebar}
            className="fixed inset-0 z-[2000] bg-slate-900/40 backdrop-blur-sm cursor-pointer"
          />

          {/* Sidebar Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0.5, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: '100%', opacity: 0.5, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ width: width || 450 }}
            className="fixed top-0 right-0 bottom-0 z-[2001] bg-white shadow-2xl flex flex-col border-l border-slate-200 sm:max-w-full max-w-[100vw]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white z-10 shrink-0">
              <h3 className="text-lg font-semibold text-slate-800 m-0">
                {title}
              </h3>
              {showCloseButton && (
                <button
                  onClick={closeSidebar}
                  className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 relative bg-slate-50/30">
              {content}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-slate-100 bg-white shrink-0 z-10">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
