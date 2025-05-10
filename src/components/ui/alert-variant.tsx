
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "./alert"
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react"

const alertVariantStyles = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        warning:
          "border-yellow-500/50 text-yellow-600 dark:text-yellow-500 dark:border-yellow-500/50 [&>svg]:text-yellow-600 dark:text-yellow-500",
        success:
          "border-green-500/50 text-green-600 dark:border-green-500/50 [&>svg]:text-green-600 dark:text-green-500",
        info:
          "border-blue-500/50 text-blue-600 dark:border-blue-500/50 [&>svg]:text-blue-600 dark:text-blue-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface AlertVariantProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariantStyles> {}

export function AlertVariant({
  className,
  variant,
  children,
  ...props
}: AlertVariantProps) {
  let Icon = Info;
  
  switch (variant) {
    case "destructive":
      Icon = AlertCircle;
      break;
    case "warning":
      Icon = AlertTriangle;
      break;
    case "success":
      Icon = CheckCircle;
      break;
    case "info":
      Icon = Info;
      break;
  }
  
  return (
    <Alert className={cn(alertVariantStyles({ variant }), className)} {...props}>
      <Icon className="h-4 w-4" />
      {children}
    </Alert>
  )
}

export { AlertTitle, AlertDescription }
