"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function BottomSheet({ open, onClose, children, title }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const content = (
    <div
      className="fixed inset-0"
      style={{ zIndex: 9998 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Sheet - bottom sheet on mobile, centered modal on desktop */}
      <div className="absolute inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full">
        <div
          ref={sheetRef}
          className="bg-card rounded-t-2xl md:rounded-2xl max-h-[85vh] md:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 md:fade-in-0 md:zoom-in-95 duration-200"
        >
          {/* Drag handle - mobile only */}
          <div className="flex justify-center pt-3 pb-1 md:hidden">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {title && (
            <div className="px-5 pt-2 pb-3 md:pt-5">
              <h3 className="text-xl md:text-lg font-bold">{title}</h3>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5 pb-6 md:pb-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(content, document.body);
}
