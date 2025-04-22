
"use client";

import { ToastProvider } from "./toast-context";
import { useToastContext } from "./toast-context";
import type { ToasterToast, ToastProps, ToastActionElement } from "./toast-types";

// Re-export provider
export { ToastProvider };

// Main hook
export function useToast() {
  return useToastContext();
}

// Standalone function for external/legacy use
export function toast(props: Omit<ToasterToast, "id">) {
  const context = useToastContext();
  if (context) {
    return context.toast(props);
  }
  
  console.warn(
    "toast() was called outside of a component. Please use useToast() hook inside a component instead."
  );
  return "";
}

export { type ToasterToast };
export type { ToastProps, ToastActionElement };
