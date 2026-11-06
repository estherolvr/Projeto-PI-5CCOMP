import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/app-store';
import { Eye, EyeOff, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import FecapLogo from '../../components/ui/FecapLogo';
import { api } from '../../lib/api';
import { setAuthToken } from '../../lib/auth-session';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');

  const navigate = useNavigate();
  const setCurrentUser = useAppStore(state => state.setCurrentUser);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await api.auth.login(email, password);
      if (!res?.token || !res?.user || !['aluno', 'asa', 'admin'].includes(res.user.role)) {
        throw new Error('O servidor retornou uma sessão inválida. Tente entrar novamente.')
      }
      setAuthToken(res.token);
      setCurrentUser(res.user);
      navigate(res.user.mustChangePassword ? '/primeiro-acesso' : `/${res.user.role}`, { replace: true });
    } catch (err: any) {
      console.error('Erro ao fazer login:', err);
      setErrorMessage(err.message || 'E-mail institucional ou senha incorretos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecovery = async () => {
    if (!email.trim()) { setErrorMessage('Informe seu e-mail antes de solicitar a recuperação.'); return }
    setRecovering(true); setErrorMessage(''); setRecoveryMessage('')
    try { const result = await api.auth.recoverPassword(email.trim()); setRecoveryMessage(result.message) }
    catch (error: any) { setErrorMessage(error.message || 'Não foi possível solicitar a recuperação.') }
    finally { setRecovering(false) }
  };

  return (
    <div className="flex min-h-screen w-full">

      {/* ── LEFT SIDE — Hero ASA ── */}
      <div
        className="hidden lg:flex w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{ background: '#111419' }}
      >
        {/* Grade de fundo sutil */}
        <div className="absolute inset-0 opacity-[0.04]">
          <svg className="w-full h-full" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="500" height="500" fill="url(#grid)" />
          </svg>
        </div>

        {/* Orb roxo — canto superior direito */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-25 blur-3xl"
          style={{ background: '#7B3FBE' }}
        />

        {/* Orb teal — canto inferior esquerdo */}
        <div
          className="absolute -bottom-32 -left-20 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
          style={{ background: '#00A878' }}
        />

        {/* Círculo teal decorativo (como no banner ASA) */}
        <div
          className="absolute bottom-32 right-8 w-48 h-48 rounded-full opacity-30 border-4"
          style={{ borderColor: '#00A878' }}
        />

        {/* Pontos roxos decorativos (como no banner ASA) */}
        <div className="absolute top-1/3 right-12 grid grid-cols-4 gap-2.5 opacity-40">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#7B3FBE' }} />
          ))}
        </div>

        {/* Arco amarelo (como no banner ASA) */}
        <div
          className="absolute bottom-16 right-20 w-32 h-32 rounded-full opacity-20"
          style={{ border: '3px solid #F5C000' }}
        />

        {/* CONTEÚDO */}
        <div className="relative z-10">
          {/* Accent bar tricolor */}
          <div className="flex gap-1 mb-10">
            <div className="h-1 w-8 rounded-full" style={{ background: '#7B3FBE' }} />
            <div className="h-1 w-8 rounded-full" style={{ background: '#F5C000' }} />
            <div className="h-1 w-8 rounded-full" style={{ background: '#00A878' }} />
          </div>

          {/* Logo */}
          <div className="flex items-center gap-3.5 mb-12">
            <FecapLogo variant="white" size={48} />
            <div>
              <span className="text-3xl font-black tracking-tight text-white">iÁlvaro</span>
              <p className="text-xs tracking-widest uppercase font-semibold" style={{ color: '#00A878' }}>
                Área do Sucesso do Aluno · Inteligência Artificial
              </p>
            </div>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-white max-w-sm">
            Atendimento<br />
            <span style={{ color: '#00A878' }}>inteligente</span><br />
            para você.
          </h1>

          <p className="mt-5 text-base max-w-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Tire dúvidas, abra chamados e acompanhe seu histórico — tudo em um só lugar.
          </p>

          {/* Feature pills */}
          <div className="mt-8 flex flex-col gap-2.5">
            {[
              { dot: '#00A878', label: 'Agente de IA 24/7' },
              { dot: '#7B3FBE', label: 'Chamados rastreáveis' },
              { dot: '#F5C000', label: 'Atendimento humano integrado' },
            ].map(({ dot, label }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>FECAP</span>
            <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
            <span className="text-sm font-semibold" style={{ color: '#00A878' }}>ASA</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDE — Formulário ── */}
      <div className="relative w-full lg:w-1/2 flex flex-col p-8 sm:p-12 lg:p-20 bg-white dark:bg-slate-900 justify-center">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="absolute left-6 top-6 sm:left-10 sm:top-8 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-brand-700 dark:hover:text-emerald-300 transition-colors"
          aria-label="Voltar para a página inicial"
        >
          <ArrowLeft size={17} />
          Voltar para o portal
        </button>
        <div className="w-full max-w-sm mx-auto">

          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <div className="flex gap-1 mb-4">
              <div className="h-1 w-6 rounded-full" style={{ background: '#7B3FBE' }} />
              <div className="h-1 w-6 rounded-full" style={{ background: '#F5C000' }} />
              <div className="h-1 w-6 rounded-full" style={{ background: '#00A878' }} />
            </div>
            <div className="flex items-center gap-2.5">
              <FecapLogo size={36} />
              <span className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">iÁlvaro</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Bem-vindo ao iÁlvaro
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
              Faça login com seu e-mail institucional.
            </p>

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center gap-2.5 text-sm text-red-700 dark:text-red-300"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
            {recoveryMessage && <div role="status" className="mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">{recoveryMessage}</div>}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  E-mail institucional
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@aluno.fecap.br"
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg
                             text-sm focus:ring-2 focus:ring-brand-600 focus:border-brand-600
                             dark:bg-slate-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500
                             transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg
                               text-sm focus:ring-2 focus:ring-brand-600 focus:border-brand-600
                               dark:bg-slate-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500
                               transition-all outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full text-white font-semibold py-2.5 rounded-lg
                           transition-all duration-150 flex items-center justify-center gap-2 shadow-md
                           disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #007A4D, #00A878)' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </button>

              <div className="text-center">
                <button type="button" disabled={recovering} onClick={handleRecovery} className="text-sm text-brand-700 hover:underline disabled:opacity-50">{recovering?'Enviando…':'Esqueci minha senha'}</button>
              </div>
            </form>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
