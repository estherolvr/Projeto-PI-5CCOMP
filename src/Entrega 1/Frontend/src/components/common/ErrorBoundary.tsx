import React, { Component, ErrorInfo, ReactNode } from 'react'
import FecapLogo from '../ui/FecapLogo'
import { AlertTriangle, RefreshCw, Home, LogIn } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  private handleClearAndLogin = () => {
    try {
      localStorage.removeItem('asaia_auth_token')
      localStorage.removeItem('asaia-app-store')
    } catch {}
    window.location.href = '/login'
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 dark:border-slate-700 text-center space-y-6">
            <div className="flex justify-center">
              <FecapLogo size={48} />
            </div>

            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Ops, algo inesperado aconteceu
              </h1>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                Ocorreu uma falha inesperada na visualização da página. Você pode recarregar ou reiniciar sua sessão com segurança.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-colors shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar Página
              </button>

              <button
                onClick={() => { window.location.href = '/' }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-medium text-sm transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Ir para o Início
              </button>

              <button
                onClick={this.handleClearAndLogin}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Limpar Sessão e Fazer Login
              </button>
            </div>

            {this.state.error && (
              <details className="text-left bg-gray-50 dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-800 text-[11px] font-mono text-gray-600 dark:text-slate-400">
                <summary className="cursor-pointer font-sans font-semibold text-gray-500 hover:text-gray-700 select-none">
                  Detalhes técnicos do erro
                </summary>
                <p className="mt-2 text-red-600 dark:text-red-400 whitespace-pre-wrap break-all">
                  {this.state.error.toString()}
                </p>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
