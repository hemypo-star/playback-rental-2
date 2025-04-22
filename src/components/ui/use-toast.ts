
// Re-export from the hooks directory
import { useToast, toast, type ToasterToast } from "@/hooks/use-toast"

export { useToast, toast, type ToasterToast }

// For compatibility with existing code
export type ToastActionElement = React.ReactElement
