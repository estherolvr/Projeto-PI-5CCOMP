import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/app-store'
import type { UserRole } from '../../lib/mock-data'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
}

/**
 * Componente de proteção de rotas privadas (Guarda de Rotas).
 * Exige que o usuário possua um token JWT válido e sessão ativa.
 * Redireciona para /login caso a sessão não exista ou tenha sido encerrada.
 */
export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { currentUser } = useAppStore()
  const token = typeof window !== 'undefined' ? localStorage.getItem('asaia_auth_token') : null
  const location = useLocation()

  // Se não houver token ou usuário na store, bloqueia o acesso e vai para login
  if (!token || !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Se a rota exige papéis específicos e o perfil atual não tiver autorização
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={`/${currentUser.role}`} replace />
  }

  return <Outlet />
}
