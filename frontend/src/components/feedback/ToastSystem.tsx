import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import './ToastSystem.css'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

type ToastItem = {
  id: string
  title?: string
  message: string
  variant: ToastVariant
  durationMs: number
}

type ShowToastInput = {
  title?: string
  message: string
  variant?: ToastVariant
  durationMs?: number
}

type ToastContextValue = {
  showToast: (input: ShowToastInput) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
}

const DEFAULT_DURATION_MS = 3000

const ToastContext = createContext<ToastContextValue | null>(null)

function createToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="toast-viewport" aria-live="polite" aria-label="Thông báo hệ thống">
      {toasts.map((toast) => (
        <article key={toast.id} className={`toast-card toast-${toast.variant}`} role="status">
          <div className="toast-body">
            {toast.title ? <h4>{toast.title}</h4> : null}
            <p>{toast.message}</p>
          </div>
          <button type="button" className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="Đóng thông báo">
            ×
          </button>
        </article>
      ))}
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    ({ title, message, variant = 'info', durationMs = DEFAULT_DURATION_MS }: ShowToastInput) => {
      const nextToast: ToastItem = {
        id: createToastId(),
        title,
        message,
        variant,
        durationMs,
      }

      setToasts((prev) => [...prev, nextToast])
      window.setTimeout(() => {
        dismissToast(nextToast.id)
      }, nextToast.durationMs)
    },
    [dismissToast],
  )

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (message, title) => showToast({ message, title, variant: 'success' }),
      error: (message, title) => showToast({ message, title, variant: 'error', durationMs: 4200 }),
      warning: (message, title) => showToast({ message, title, variant: 'warning' }),
      info: (message, title) => showToast({ message, title, variant: 'info' }),
    }),
    [showToast],
  )

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast phải được dùng bên trong ToastProvider.')
  }

  return context
}
