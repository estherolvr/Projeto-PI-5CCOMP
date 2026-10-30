import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '../../lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} })

const typeStyles: Record<ToastType, { icon: ReactNode; className: string }> = {
  success: {
    icon: <CheckCircle className="w-4 h-4 text-brand-600" />,
    className: 'border-brand-200 dark:border-brand-800',
  },
  error: {
    icon: <XCircle className="w-4 h-4 text-red-500" />,
    className: 'border-red-200 dark:border-red-800',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    className: 'border-amber-200 dark:border-amber-800',
  },
  info: {
    icon: <Info className="w-4 h-4 text-blue-500" />,
    className: 'border-blue-200 dark:border-blue-800',
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
          <AnimatePresence>
            {toasts.map((toast) => {
              const style = typeStyles[toast.type]
              return (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl',
                    'bg-white dark:bg-slate-800 border shadow-lg',
                    style.className
                  )}
                >
                  {style.icon}
                  <p className="flex-1 text-sm text-gray-800 dark:text-slate-200">{toast.message}</p>
                  <button
                    onClick={() => dismiss(toast.id)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
