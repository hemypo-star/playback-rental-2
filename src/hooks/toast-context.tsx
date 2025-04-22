
"use client";

import * as React from "react";
import { reducer, actionTypes, toastTimeouts, TOAST_REMOVE_DELAY, State, Action } from "./toast-reducer";
import type { ToastProps, ToastActionElement, ToasterToast } from "./toast-types";

// Utility for generating IDs
let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

type ToastContextType = {
  toasts: ToasterToast[];
  toast: (props: Omit<ToasterToast, "id">) => string;
  dismiss: (toastId?: string) => void;
  remove: (toastId?: string) => void;
  update: (toastId: string, props: Partial<ToasterToast>) => void;
} | undefined;

const ToastContext = React.createContext<ToastContextType>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, { toasts: [] });

  React.useEffect(() => {
    state.toasts.forEach((toast) => {
      if (toast.open === false && !toastTimeouts.has(toast.id)) {
        const timeout = setTimeout(() => {
          toastTimeouts.delete(toast.id);
          dispatch({
            type: actionTypes.REMOVE_TOAST,
            toastId: toast.id,
          });
        }, TOAST_REMOVE_DELAY);

        toastTimeouts.set(toast.id, timeout);
      }
    });
  }, [state.toasts]);

  const toast = React.useCallback(
    (props: Omit<ToasterToast, "id">) => {
      const id = genId();
      dispatch({
        type: actionTypes.ADD_TOAST,
        toast: {
          ...props,
          id,
          open: true,
        },
      });
      return id;
    },
    []
  );

  const update = React.useCallback(
    (toastId: string, props: Partial<ToasterToast>) => {
      dispatch({
        type: actionTypes.UPDATE_TOAST,
        toast: { ...props, id: toastId },
      });
    },
    []
  );

  const dismiss = React.useCallback(
    (toastId?: string) => {
      dispatch({
        type: actionTypes.DISMISS_TOAST,
        toastId,
      });
    },
    []
  );

  const remove = React.useCallback(
    (toastId?: string) => {
      dispatch({
        type: actionTypes.REMOVE_TOAST,
        toastId,
      });
    },
    []
  );

  const value = React.useMemo(
    () => ({
      toasts: state.toasts,
      toast,
      dismiss,
      remove,
      update,
    }),
    [state.toasts, toast, dismiss, remove, update]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
