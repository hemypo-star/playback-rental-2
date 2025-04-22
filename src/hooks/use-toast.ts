
"use client"

import * as React from "react"
import type { ToastActionElement, ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 20
const TOAST_REMOVE_DELAY = 1000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: string
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: string
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action

      // If no id is supplied, dismiss all
      if (toastId === undefined) {
        return {
          ...state,
          toasts: state.toasts.map((t) => ({
            ...t,
            open: false,
          })),
        }
      }

      // Dismiss specific toast
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }

    case actionTypes.REMOVE_TOAST: {
      const { toastId } = action

      if (toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }

      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== toastId),
      }
    }
  }
}

function useToast() {
  const [state, dispatch] = React.useReducer(reducer, {
    toasts: [],
  })

  React.useEffect(() => {
    state.toasts.forEach((toast) => {
      if (toast.open === false && !toastTimeouts.has(toast.id)) {
        const timeout = setTimeout(() => {
          toastTimeouts.delete(toast.id)
          dispatch({
            type: actionTypes.REMOVE_TOAST,
            toastId: toast.id,
          })
        }, TOAST_REMOVE_DELAY)

        toastTimeouts.set(toast.id, timeout)
      }
    })
  }, [state.toasts])

  const toast = React.useCallback(
    ({ ...props }: Omit<ToasterToast, "id">) => {
      const id = genId()
      
      dispatch({
        type: actionTypes.ADD_TOAST,
        toast: {
          ...props,
          id,
          open: true
        },
      })

      return id
    },
    [dispatch]
  )

  const update = React.useCallback(
    (toastId: string, props: Partial<ToasterToast>) => {
      dispatch({
        type: actionTypes.UPDATE_TOAST,
        toast: { ...props, id: toastId },
      })
    },
    [dispatch]
  )

  const dismiss = React.useCallback(
    (toastId?: string) => {
      dispatch({
        type: actionTypes.DISMISS_TOAST,
        toastId,
      })
    },
    [dispatch]
  )

  const remove = React.useCallback(
    (toastId?: string) => {
      dispatch({
        type: actionTypes.REMOVE_TOAST,
        toastId,
      })
    },
    [dispatch]
  )

  return {
    toasts: state.toasts,
    toast,
    update,
    dismiss,
    remove,
  }
}

export { useToast, type ToasterToast }
export type { ToastProps, ToastActionElement }
