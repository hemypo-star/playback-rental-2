
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
  // This is just a placeholder for external usage
  // The actual implementation happens in the useToast hook
  // (for SSR, old-style imports, etc)
  console.warn(
    "toast() was called outside of a component. Please use useToast() hook inside a component instead."
  );
  return "";
}

export { type ToasterToast };
export type { ToastProps, ToastActionElement };
