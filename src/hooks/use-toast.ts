
import { type ToastProps } from "@/components/ui/toast"
import {
  useToast as useToastOriginal,
  type ToastActionElement,
} from "@/components/ui/use-toast"

export type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

export const useToast = useToastOriginal

// Re-export toast object from the original use-toast
export const { toast } = useToastOriginal()
