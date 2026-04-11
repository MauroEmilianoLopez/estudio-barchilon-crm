"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function BottomSheet({ open, onClose, children, title }: BottomSheetProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)));
      document.body.style.overflow = "hidden";
    } else {
      setAnimating(false);
      const timer = setTimeout(() => { setVisible(false); }, 300);
      document.body.style.overflow = "";
      return () => clearTimeout(timer);
    }
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!visible || !mounted) return null;

  const content = (
    <div className="fixed inset-0" style={{ zIndex: 9998 }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        style={{ opacity: animating ? 1 : 0 }}
        onClick={onClose}
      />

      {/* Mobile: bottom sheet / Desktop: centered modal */}
      {/* Mobile */}
      <div
        className="md:hidden absolute inset-x-0 bottom-0 transition-transform duration-300 ease-out"
        style={{ transform: animating ? "translateY(0)" : "translateY(100%)" }}
      >
        <div className="bg-card rounded-t-2xl flex flex-col" style={{ height: "85vh" }}>
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>
          {title && (
            <div className="px-5 pt-1 pb-3 shrink-0">
              <h3 className="text-xl font-bold">{title}</h3>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-5 pb-8">
            {children}
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div
        className="hidden md:flex absolute inset-0 items-center justify-center transition-opacity duration-200"
        style={{ opacity: animating ? 1 : 0 }}
      >
        <div
          className="bg-card rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-xl transition-transform duration-200"
          style={{ transform: animating ? "scale(1)" : "scale(0.95)" }}
        >
          {title && (
            <div className="px-6 pt-6 pb-3 shrink-0">
              <h3 className="text-lg font-bold">{title}</h3>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
