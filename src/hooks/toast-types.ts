
// All type definitions related to toasts

import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

// Toast types and interfaces
export type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

export type { ToastProps, ToastActionElement };
