
import * as React from "react"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast as useToastOriginal } from "@/components/ui/use-toast"

export type ToasterToast = React.ComponentPropsWithoutRef<typeof Toast>

export const useToast = useToastOriginal;

interface ToasterProps {
  toasts: ToasterToast[]
  onRemove: (toastId?: string) => void
}

export function Toaster({ toasts, onRemove }: ToasterProps) {
  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

// Re-export toast object from the original use-toast
export const { toast } = useToastOriginal()
