"use client";

import { Toast } from "@/components/ui/toast";

interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const toast = ({ title, description, variant = "default" }: ToastProps) => {
    console.log("Toast:", { title, description, variant });
    // Por ahora solo logueamos, implementaremos la UI del toast más adelante
  };

  return { toast };
}