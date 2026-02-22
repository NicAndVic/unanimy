"use client";

import { useEffect, useState } from "react";

import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

type SimpleToastProps = {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: "default" | "destructive";
};

export function SimpleToast({ title, description, open, onOpenChange, variant = "default" }: SimpleToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <ToastProvider>
      <Toast open={open} onOpenChange={onOpenChange} variant={variant}>
        <div>
          <ToastTitle>{title}</ToastTitle>
          {description ? <ToastDescription>{description}</ToastDescription> : null}
        </div>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
