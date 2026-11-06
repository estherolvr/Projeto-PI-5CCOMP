import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppStore, type CurrentUser } from '../../store/app-store'
import type { UserRole } from '../../lib/types'
import { api } from '../../lib/api'
import { getAuthToken } from '../../lib/auth-session'

const roleHome: Record<UserRole, string> = {
  aluno: '/aluno',
  asa: '/asa',
  admin: '/admin',
}

function isUserRole(role: unknown): role is UserRole {
  return role === 'aluno' || role === 'asa' || role === 'admin'
}

export default function ProtectedRoute({ allowedRoles }: { allowedRoles?: UserRole[] }) {
  const setCurrentUser = useAppStore(state => state.setCurrentUser)
  const token = getAuthToken()
  const location = useLocation()
  const [verified, setVerified] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active=true
    setLoading(true);setError(null);setVerified(null)
    if(!token){setCurrentUser(null);setLoading(false);return}
    // Do not render any protected layout using browser-persisted identity.
    setCurrentUser(null)
    api.auth.me().then(({user})=>{
      if (!user || !isUserRole(user.role) || typeof user.id !== 'string') {
        throw new Error('O servidor não confirmou um perfil válido para esta sessão.')
      }
      if(active){setVerified(user);setCurrentUser(user)}
    })
      .catch(e=>{if(active)setError(e instanceof Error?e.message:'Não foi possível validar sua sessão.')})
      .finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false}
  },[token,attempt,setCurrentUser])
  if(!token)return <Navigate to="/login" state={{from:location}} replace/>
  if(loading)return <p role="status" className="p-8 text-center text-gray-500">Validando sessão…</p>
  if(error)return <div role="alert" className="p-8 text-red-600"><p>{error}</p><button onClick={()=>setAttempt(n=>n+1)} className="underline mt-3">Tentar novamente</button></div>
  if(!verified)return <Navigate to="/login" replace/>
  if(verified.mustChangePassword)return <Navigate to="/primeiro-acesso" replace/>
  if(allowedRoles && !allowedRoles.includes(verified.role))return <Navigate to={roleHome[verified.role]} replace/>
  return <Outlet/>
}
