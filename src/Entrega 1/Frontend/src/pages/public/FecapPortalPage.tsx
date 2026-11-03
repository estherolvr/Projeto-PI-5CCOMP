import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Globe, User, Users, BookOpen, Sparkles, ArrowRight, ChevronDown,
  Check, ShieldCheck, Search, Phone, Mail, MapPin, ExternalLink,
  HelpCircle, Calendar, FileText, Award, DollarSign, Briefcase,
  ChevronRight, X, Clock, Info, CheckCircle2, ChevronUp
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'

interface NavMenuInfo {
  title: string
  subtitle: string
  items: { label: string; desc: string; link?: string }[]
  ctaText?: string
  ctaAction?: () => void
}

interface ServiceDetail {
  id: string
  title: string
  tag: string
  category: string
  desc: string
  fullDesc: string
  sla: string
  requirements: string[]
  ctaText: string
  ctaRoute: string
}

export default function FecapPortalPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'quem-somos' | 'cesta-servicos'>('cesta-servicos')
  const [cookieAccepted, setCookieAccepted] = useState(false)

  // Modals state
  const [selectedService, setSelectedService] = useState<ServiceDetail | null>(null)
  const [activeNavMenu, setActiveNavMenu] = useState<NavMenuInfo | null>(null)
  const [showPortalAlunoModal, setShowPortalAlunoModal] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  const navMenuData: Record<string, NavMenuInfo> = {
    'Institucional': {
      title: 'Institucional FECAP',
      subtitle: 'Tradição centenária e excelência em Educação desde 1902',
      items: [
        { label: 'Nossa História & Tradição', desc: 'Mais de 120 anos formando líderes empresariais e econômicos.' },
        { label: 'Campus & Infraestrutura', desc: 'Campus Liberdade com laboratórios modernos, biblioteca e coworking.' },
        { label: 'Corpo Docente Qualificado', desc: 'Mestres e Doutores atuantes no mercado financeiro e corporativo.' },
        { label: 'Responsabilidade Social & Bolsas', desc: 'Programas de inclusão, bolsas meritórias e apoio estudantil.' }
      ]
    },
    'Colégio': {
      title: 'Colégio FECAP',
      subtitle: 'Ensino Médio e Técnico integrado de alta performance',
      items: [
        { label: 'Ensino Médio Tradicional', desc: 'Foco no ENEM, vestibulares de ponta e desenvolvimento socioemocional.' },
        { label: 'Ensino Médio com Técnico em TI', desc: 'Formação técnica avançada em desenvolvimento de software e IA.' },
        { label: 'Técnico em Administração & Finanças', desc: 'Práticas de negócios, contabilidade e empreendedorismo.' }
      ]
    },
    'Graduação': {
      title: 'Cursos de Graduação FECAP',
      subtitle: 'Reconhecidos com nota máxima pelo MEC',
      items: [
        { label: 'Administração de Empresas', desc: 'Formação executiva com ênfase em estratégia e inovação.' },
        { label: 'Ciências Contábeis', desc: 'O melhor curso de Contabilidade do Brasil pelo Guia da Faculdade.' },
        { label: 'Ciências Econômicas', desc: 'Análise macroeconômica, mercado de capitais e econometria.' },
        { label: 'Análise e Desenvolvimento de Sistemas', desc: 'Programação full-stack, cloud computing e engenharia de dados.' },
        { label: 'Relações Públicas & Publicidade', desc: 'Comunicação corporativa, branding e marketing digital.' }
      ]
    },
    'Pós-Graduação': {
      title: 'Pós-Graduação Lato Sensu',
      subtitle: 'Especializações para alavancar sua carreira executiva',
      items: [
        { label: 'Finanças e Mercado de Capitais', desc: 'Gestão de portfólio, valuation e produtos bancários.' },
        { label: 'Controladoria e Auditoria', desc: 'Compliance, IFRS e gestão tributária estratégica.' },
        { label: 'Gestão de Negócios e Liderança', desc: 'Desenvolvimento de competências gerenciais e inovação.' }
      ]
    },
    'MBA': {
      title: 'MBA Executivo FECAP',
      subtitle: 'Networking de alto nível e visão global de negócios',
      items: [
        { label: 'MBA Executivo em Finanças', desc: 'Para diretores, gerentes e analistas seniores de mercado.' },
        { label: 'MBA em Gestão Estratégica & IA', desc: 'Liderança e transformação digital impulsionada por IA.' },
        { label: 'MBA em ESG & Governança', desc: 'Sustentabilidade corporativa, compliance e relatórios integrados.' }
      ]
    },
    'Mestrado': {
      title: 'Mestrado Profissional',
      subtitle: 'Pesquisa aplicada com rigor acadêmico e impacto empresarial',
      items: [
        { label: 'Mestrado em Administração', desc: 'Linhas em Estratégia, Finanças e Organizações.' },
        { label: 'Mestrado em Ciências Contábeis', desc: 'Contabilidade financeira, gerencial e métodos quantitativos.' }
      ]
    },
    'Extensão': {
      title: 'Cursos de Curta Duração & Extensão',
      subtitle: 'Capacitação rápida e prática com especialistas de mercado',
      items: [
        { label: 'Mercado Financeiro e Investimentos', desc: 'Renda fixa, ações, derivativos e planejamento patrimonial.' },
        { label: 'Excel Avançado e Power BI', desc: 'Dashboards gerenciais e modelagem de dados para negócios.' },
        { label: 'Inteligência Artificial Aplicada a Negócios', desc: 'Ferramentas de IA para tomada de decisão estratégica.' }
      ]
    },
    'Educação Executiva': {
      title: 'Educação Corporativa & In Company',
      subtitle: 'Soluções sob medida para grandes empresas e governos',
      items: [
        { label: 'Treinamento Sob Medida', desc: 'Programas customizados para o desafio da sua organização.' },
        { label: 'Trilhas de Liderança e Gestão', desc: 'Desenvolvimento de alta gerência e sucessão de lideranças.' }
      ]
    },
    'Pesquisa': {
      title: 'Pesquisa e Produção Científica',
      subtitle: 'Geração de conhecimento com aplicabilidade no mercado',
      items: [
        { label: 'Centros de Pesquisa FECAP', desc: 'Índices econômicos, mercado de trabalho e comportamento financeiro.' },
        { label: 'Revista Brasileira de Gestão de Negócios (RBGN)', desc: 'Periódico internacional indexado no Scopus e Web of Science.' }
      ]
    },
    'Alumni': {
      title: 'Comunidade Alumni Alvarista',
      subtitle: 'Rede exclusiva de ex-alunos da FECAP',
      items: [
        { label: 'Clube de Vantagens e Convênios', desc: 'Descontos especiais em cursos, serviços e parceiros.' },
        { label: 'Eventos e Networking', desc: 'Encontros anuais, mentorias e palestras exclusivas.' }
      ]
    }
  }

  const serviceDetails: ServiceDetail[] = [
    {
      id: 'sec-doc',
      title: 'Secretaria Virtual & Documentos Digitais',
      tag: 'Digital',
      category: 'Secretaria',
      desc: 'Solicite e emita declarações de matrícula, históricos, atestados de frequência e passe escolar.',
      fullDesc: 'A Secretaria Virtual permite a emissão instantânea de documentos oficiais com assinatura digital e QR Code autenticado pelo MEC. Sem filas e disponível 24 horas por dia através da plataforma Álvaro AI.',
      sla: 'Imediato (1-Click)',
      requirements: ['Matrícula ativa no semestre corrente', 'Acesso ao login institucional Alvarista'],
      ctaText: 'Emitir Documento no Álvaro AI',
      ctaRoute: '/aluno/documentos'
    },
    {
      id: 'agend-pres',
      title: 'Atendimento Presencial e Online (ASA)',
      tag: 'Agendamento',
      category: 'Atendimento',
      desc: 'Agende horário exclusivo com nossos orientadores acadêmicos e analistas no campus ou por vídeo.',
      fullDesc: 'Sessões individuais de orientação com a equipe do ASA para tratar de planejamento acadêmico, adaptação curricular, orientação pedagógica, mediação ou suporte financeiro.',
      sla: 'Horários para o mesmo dia ou semana seguinte',
      requirements: ['Agendamento prévio pelo sistema', 'Documentos pertinentes ao assunto'],
      ctaText: 'Agendar Horário no ASA',
      ctaRoute: '/aluno/agendamento'
    },
    {
      id: 'prot-cham',
      title: 'Protocolos & Chamados Formais',
      tag: 'SLA Rápido',
      category: 'Requerimentos',
      desc: 'Abertura de requerimentos de aproveitamento de estudos, dispensa de disciplinas e revisões.',
      fullDesc: 'Canal oficial para envio de requerimentos acadêmicos estruturados. Cada solicitação gera um protocolo formal (#1052) com acompanhamento passo a passo e prazo de SLA garantido.',
      sla: '1 a 3 dias úteis conforme categoria',
      requirements: ['Preenchimento do formulário no Álvaro AI', 'Anexação de ementas/comprovantes quando necessário'],
      ctaText: 'Abrir Chamado no Álvaro AI',
      ctaRoute: '/aluno/chamados/novo'
    },
    {
      id: 'fin-bolsas',
      title: 'Financeiro & Bolsas de Estudo',
      tag: 'Financeiro',
      category: 'Financeiro',
      desc: '2ª via de mensalidades, consulta de descontos de pontualidade, FIES, Prouni e acordos.',
      fullDesc: 'Atendimento dedicado para negociação de parcelas, emissão de boletos, simulação de descontos de pontualidade e esclarecimento sobre programas de bolsas governamentais e institucionais.',
      sla: 'Até 24 horas úteis',
      requirements: ['Identificação do RA e semestre letivo'],
      ctaText: 'Consultar no Chat IA',
      ctaRoute: '/aluno/chat?cat=financeiro'
    },
    {
      id: 'carr-estg',
      title: 'Carreiras & Contratos de Estágio',
      tag: 'Carreiras',
      category: 'Carreiras',
      desc: 'Validação de contratos de estágio, feiras de recrutamento e vagas exclusivas para Alvaristas.',
      fullDesc: 'Apoio na inserção no mercado de trabalho, assinatura e validação jurídica de Termos de Compromisso de Estágio (TCE), banco de vagas e eventos de conexão com empresas parceiras.',
      sla: '48 horas úteis para validação de TCE',
      requirements: ['Termo de Compromisso assinado pela empresa', 'Plano de atividades de estágio'],
      ctaText: 'Acessar Carreiras no Álvaro AI',
      ctaRoute: '/aluno/chat?cat=estagio'
    },
    {
      id: 'sup-asaia',
      title: 'Suporte Inteligente Álvaro AI (IA 24/7)',
      tag: '24 Horas',
      category: 'Inteligência Artificial',
      desc: 'Tire qualquer dúvida acadêmica a qualquer hora do dia ou da noite em segundos com nossa IA.',
      fullDesc: 'Assistente virtual treinado nas normas regimentais, calendários acadêmicos, diretrizes de cursos e processos da FECAP. Respostas precisas com encaminhamento automático para atendimento humano quando necessário.',
      sla: 'Respostas em tempo real (< 2 segundos)',
      requirements: ['Disponível para todos os estudantes e comunidade'],
      ctaText: 'Conversar com a Álvaro AI',
      ctaRoute: '/login'
    }
  ]

  const faqs = [
    { q: 'O que é o ASA (Área do Sucesso Alvarista)?', a: 'O ASA é o núcleo central de atendimento e acolhimento da FECAP, responsável por apoiar o estudante em todas as etapas de sua vida acadêmica: matrícula, finanças, carreira, suporte pedagógico e serviços de secretaria.' },
    { q: 'Como a plataforma Álvaro AI me ajuda no dia a dia?', a: 'O Álvaro AI integra um agente conversacional com Inteligência Artificial capaz de responder dúvidas regimentais, emitir declarações de matrícula com validação digital em 1 clique, agendar atendimentos presenciais e monitorar o status dos seus chamados em tempo real.' },
    { q: 'Onde fica localizado o atendimento presencial do ASA?', a: 'No Campus Liberdade da FECAP (Av. da Liberdade, 532), no Bloco B - Térreo. O horário de funcionamento é de segunda a sexta-feira, das 08h às 21h.' },
    { q: 'Como faço para falar com um atendente humano se a IA não resolver minha dúvida?', a: 'Basta clicar na opção "Falar com atendente" dentro do chat da Álvaro AI ou abrir um chamado formal. Seu caso será direcionado imediatamente para a fila de um especialista do ASA com protocolo registrado.' },
  ]

  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col font-sans">
      {/* ── Top Bar (Dark Green Institutional) ── */}
      <div className="bg-[#003822] text-white text-xs py-2 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Social Icons */}
          <div className="flex items-center gap-3.5 text-white/80">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors" title="Facebook">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors" title="Instagram">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors" title="LinkedIn">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors" title="X (Twitter)">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors" title="YouTube">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
          </div>

          {/* Right Links & Portal Button & Álvaro AI CTA */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 font-medium text-white/90">
            <div className="flex items-center gap-1 cursor-pointer hover:text-white">
              <span>🇧🇷 Português</span>
              <ChevronDown size={12} />
            </div>
            <span className="text-white/30">|</span>
            <button
              onClick={() => setActiveNavMenu({
                title: 'Intranet Corporativa FECAP',
                subtitle: 'Acesso restrito para colaboradores, docentes e funcionários',
                items: [
                  { label: 'Portal do Colaborador', desc: 'Holerites, ponto eletrônico e benefícios.' },
                  { label: 'Ambiente Virtual do Professor (AVP)', desc: 'Lançamento de notas, faltas e diário de classe.' },
                  { label: 'Helpdesk de TI', desc: 'Suporte técnico a computadores, Wi-Fi e sistemas internos.' }
                ]
              })}
              className="flex items-center gap-1.5 hover:text-white"
            >
              <User size={13} />
              <span>Intranet</span>
            </button>
            <span className="text-white/30">|</span>
            <button
              onClick={() => setActiveNavMenu({
                title: 'Blogs & Conteúdos FECAP',
                subtitle: 'Artigos, pesquisas, tendências de mercado e podcasts',
                items: [
                  { label: 'Blog de Carreiras e Mercado', desc: 'Dicas de empregabilidade, currículo e liderança.' },
                  { label: 'Blog de Economia e Finanças', desc: 'Análises semanais dos professores e economistas da FECAP.' },
                  { label: 'Podcast Alvarista', desc: 'Entrevistas com executivos e grandes referências do mercado.' }
                ]
              })}
              className="flex items-center gap-1 hover:text-white"
            >
              <span>Blogs</span>
              <ChevronDown size={12} />
            </button>
            <span className="text-white/30">|</span>

            {/* Portal do Aluno Button */}
            <button
              onClick={() => setShowPortalAlunoModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/40 hover:bg-white/10 transition-colors uppercase tracking-wider text-[11px] font-bold"
            >
              <Users size={13} />
              <span>PORTAL DO ALUNO</span>
            </button>

            {/* ── Álvaro AI BUTTON (Redirects to Login / Álvaro AI Platform) ── */}
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#003822] font-black text-xs transition-all shadow-md transform hover:scale-105 active:scale-95"
              title="Acessar plataforma de atendimento Álvaro AI"
            >
              <Sparkles size={14} />
              <span>Álvaro AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Navigation Bar (FECAP White Header) ── */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-6">
          {/* FECAP Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-2xl sm:text-3xl font-black text-[#006633] tracking-tighter uppercase font-sans">
              FECAP
            </span>
          </div>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-3.5 text-xs font-semibold text-gray-700">
            {Object.keys(navMenuData).map((key) => (
              <button
                key={key}
                onClick={() => setActiveNavMenu(navMenuData[key])}
                className="flex items-center gap-0.5 hover:text-[#006633] transition-colors py-1 cursor-pointer"
              >
                <span>{key}</span>
                <ChevronDown size={11} className="text-gray-400" />
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Official ASA Banner (Image from user) ── */}
      <div className="w-full bg-[#f4f4f4] border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <img
            src="/asa-banner.png"
            alt="ASA - Área do Sucesso Alvarista FECAP"
            className="w-full h-auto object-cover max-h-[320px] shadow-sm"
          />
        </div>
      </div>

      {/* ── Breadcrumbs ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 text-xs text-gray-500 w-full text-center sm:text-left">
        <span>Início</span>
        <span className="mx-2">»</span>
        <span className="hover:text-gray-700 cursor-pointer">Asa - Cesta de Serviços</span>
        <span className="mx-2">»</span>
        <span className="hover:text-gray-700 cursor-pointer">Plataformas Digitais</span>
        <span className="mx-2">»</span>
        <strong className="text-gray-800">Acesso ao Portal do Aluno & Álvaro AI</strong>
      </div>

      {/* ── Tabs: QUEM SOMOS / CESTA DE SERVIÇOS (Centered) ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 w-full mb-8 flex justify-center">
        <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
          <button
            onClick={() => setActiveTab('quem-somos')}
            className={`py-3 px-6 rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border text-center shadow-sm ${
              activeTab === 'quem-somos'
                ? 'bg-[#00482B] text-white border-[#00482B] shadow-md scale-[1.02]'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            QUEM SOMOS
          </button>
          <button
            onClick={() => setActiveTab('cesta-servicos')}
            className={`py-3 px-6 rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border text-center shadow-sm ${
              activeTab === 'cesta-servicos'
                ? 'bg-[#00482B] text-white border-[#00482B] shadow-md scale-[1.02]'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            CESTA DE SERVIÇOS
          </button>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 flex-1 w-full space-y-12 pb-16">
        {activeTab === 'cesta-servicos' && (
          <div className="space-y-10">
            {/* ── Highlight Card: Álvaro AI Platform ── */}
            <div className="rounded-3xl bg-gradient-to-br from-[#003822] via-[#004d2f] to-[#002618] text-white p-8 sm:p-10 shadow-xl relative overflow-hidden border border-emerald-500/20">
              <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="space-y-4 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
                    <Sparkles size={14} />
                    <span>NOVIDADE FECAP · ATENDIMENTO INTELIGENTE</span>
                  </div>

                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                    Conheça o <span className="text-emerald-400">Álvaro AI</span> — O seu assistente acadêmico 24/7
                  </h2>

                  <p className="text-emerald-100/80 text-sm sm:text-base leading-relaxed">
                    A Área do Sucesso Alvarista agora conta com uma plataforma integrada com Inteligência Artificial para tirar dúvidas instantâneas, emitir documentos com validação digital, agendar atendimentos e acompanhar chamados em tempo real.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3 pt-2 text-xs text-emerald-100/90 font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400"><Check size={12} /></div>
                      <span>Respostas instantâneas com IA</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400"><Check size={12} /></div>
                      <span>Declaração de matrícula 1-click</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400"><Check size={12} /></div>
                      <span>Carteirinha de estudante digital</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400"><Check size={12} /></div>
                      <span>Acompanhamento de protocolos & SLA</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                  <button
                    onClick={() => navigate('/login')}
                    className="px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-[#003822] font-black text-sm sm:text-base transition-all shadow-lg flex items-center justify-center gap-3 transform hover:scale-105 active:scale-95"
                  >
                    <span>Acessar o Álvaro AI</span>
                    <ArrowRight size={18} />
                  </button>
                  <a
                    href="https://portal.fecap.br/framehtml/web/app/edu/PortalEducacional/login/"
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors text-center border border-white/20 flex items-center justify-center gap-2"
                  >
                    <span>Portal do Aluno Oficial</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            </div>

            {/* ── Services Grid with Detailed Clickable Modals ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 border-l-4 border-[#006633] pl-3">
                  Cesta de Serviços do Aluno
                </h3>
                <span className="text-xs text-gray-500">Clique em qualquer serviço para ver detalhes e solicitar</span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {serviceDetails.map((serv) => (
                  <div
                    key={serv.id}
                    onClick={() => setSelectedService(serv)}
                    className="p-6 rounded-2xl border border-gray-200 hover:border-[#006633] hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between space-y-4 group bg-white hover:-translate-y-0.5"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-2xs font-bold px-2.5 py-0.5 rounded-full bg-green-50 text-[#006633] border border-green-200/60">
                          {serv.tag}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-gray-50 group-hover:bg-[#006633] text-gray-400 group-hover:text-white flex items-center justify-center transition-colors">
                          <ArrowRight size={14} />
                        </div>
                      </div>
                      <h4 className="font-bold text-gray-900 text-base group-hover:text-[#006633] transition-colors leading-snug">
                        {serv.title}
                      </h4>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                        {serv.desc}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-[#006633] font-bold">
                      <span>Ver detalhes do serviço</span>
                      <span>SLA: {serv.sla}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: QUEM SOMOS (Rich Institutional Hub) ── */}
        {activeTab === 'quem-somos' && (
          <div className="space-y-10 max-w-5xl mx-auto">
            {/* Mission & Purpose */}
            <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-10 shadow-sm space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-[#006633] text-xs font-bold">
                <ShieldCheck size={14} />
                <span>EXPERIÊNCIA E SUCESSO DO ESTUDANTE</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
                Área do Sucesso Alvarista (ASA)
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                O <strong>ASA (Área do Sucesso Alvarista)</strong> é o setor da FECAP responsável por acolher, orientar e potencializar a jornada acadêmica e profissional de cada estudante desde o momento do ingresso até a colação de grau.
              </p>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Com uma equipe multidisciplinar formada por especialistas em atendimento universitário, psicopedagogos, analistas financeiros e consultores de carreira, unimos o <strong>calor humano Alvarista</strong> à eficiência do <strong>Álvaro AI</strong> para garantir que você tenha respostas rápidas e suporte integral.
              </p>

              <div className="grid sm:grid-cols-3 gap-4 pt-4">
                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200/70 space-y-1">
                  <MapPin size={20} className="text-[#006633] mb-1" />
                  <h4 className="font-bold text-gray-900 text-sm">Campus Liberdade</h4>
                  <p className="text-xs text-gray-500">Av. da Liberdade, 532 · Bloco B · Térreo</p>
                </div>
                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200/70 space-y-1">
                  <Clock size={20} className="text-[#006633] mb-1" />
                  <h4 className="font-bold text-gray-900 text-sm">Horário de Funcionamento</h4>
                  <p className="text-xs text-gray-500">Segunda a Sexta-feira: 08h às 21h</p>
                </div>
                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200/70 space-y-1">
                  <Phone size={20} className="text-[#006633] mb-1" />
                  <h4 className="font-bold text-gray-900 text-sm">Central de Contato</h4>
                  <p className="text-xs text-gray-500">asa@fecap.br · (11) 3272-2222</p>
                </div>
              </div>
            </div>

            {/* Interactive FAQ Accordion */}
            <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-10 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 border-l-4 border-[#006633] pl-3">
                  Perguntas Frequentes sobre o ASA e o Álvaro AI
                </h3>
              </div>

              <div className="space-y-3">
                {faqs.map((faq, index) => {
                  const isOpen = openFaqIndex === index
                  return (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-2xl overflow-hidden transition-all"
                    >
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        <span>{faq.q}</span>
                        {isOpen ? <ChevronUp size={18} className="text-[#006633] shrink-0" /> : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3 bg-gray-50/50">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#002618] text-white text-xs py-10 px-4 sm:px-8 mt-auto border-t border-emerald-900/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-white/70">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-white tracking-tighter">FECAP</span>
            <span>·</span>
            <span>Fundação Escola de Comércio Álvares Penteado</span>
          </div>
          <p className="text-2xs text-center sm:text-right">
            © 2026 FECAP. Todos os direitos reservados. Plataforma Álvaro AI integrada.
          </p>
        </div>
      </footer>

      {/* ── Modal: Service Detail ── */}
      <Modal
        open={!!selectedService}
        onClose={() => setSelectedService(null)}
        title={selectedService?.title || 'Detalhes do Serviço'}
        description={`Categoria: ${selectedService?.category} · Prazo de Atendimento: ${selectedService?.sla}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setSelectedService(null)}>
              Fechar
            </Button>
            <Button
              variant="primary"
              icon={<Sparkles size={16} />}
              onClick={() => {
                const route = selectedService?.ctaRoute || '/login'
                setSelectedService(null)
                navigate(route)
              }}
            >
              {selectedService?.ctaText || 'Acessar no Álvaro AI'}
            </Button>
          </>
        }
      >
        {selectedService && (
          <div className="space-y-6 text-sm">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-[#006633] font-bold text-xs">
                <Info size={16} />
                <span>Sobre este serviço</span>
              </div>
              <p className="text-gray-700 leading-relaxed text-xs sm:text-sm">
                {selectedService.fullDesc}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                Requisitos e Documentação
              </h4>
              <div className="space-y-2">
                {selectedService.requirements.map((req, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-gray-600">
                    <CheckCircle2 size={16} className="text-[#006633] shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between text-xs">
              <span className="text-gray-500">Tempo estimado de resposta (SLA):</span>
              <span className="font-bold text-[#006633]">{selectedService.sla}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Nav Menu Informational Details ── */}
      <Modal
        open={!!activeNavMenu}
        onClose={() => setActiveNavMenu(null)}
        title={activeNavMenu?.title || 'Informações Acadêmicas'}
        description={activeNavMenu?.subtitle || 'Detalhes da FECAP'}
        size="lg"
        footer={
          <Button variant="primary" onClick={() => setActiveNavMenu(null)} className="w-full">
            Entendido
          </Button>
        }
      >
        {activeNavMenu && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3.5">
              {activeNavMenu.items.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-gray-200 bg-gray-50/60 hover:bg-white hover:border-[#006633] transition-all space-y-1">
                  <h4 className="font-bold text-gray-900 text-sm">{item.label}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Portal do Aluno Hub Selection ── */}
      <Modal
        open={showPortalAlunoModal}
        onClose={() => setShowPortalAlunoModal(false)}
        title="Acesso ao Portal do Estudante"
        description="Escolha como deseja acessar seus serviços acadêmicos"
        size="md"
        footer={
          <Button variant="outline" onClick={() => setShowPortalAlunoModal(false)} className="w-full">
            Voltar
          </Button>
        }
      >
        <div className="space-y-3 p-1">
          {/* Option 1: Official FECAP Portal Educacional */}
          <a
            href="https://portal.fecap.br/framehtml/web/app/edu/PortalEducacional/login/"
            target="_blank"
            rel="noreferrer"
            onClick={() => setShowPortalAlunoModal(false)}
            className="w-full p-4 rounded-2xl border-2 border-[#006633] bg-emerald-50/70 hover:bg-emerald-100/60 text-left transition-all flex items-start gap-4 group block"
          >
            <div className="w-10 h-10 rounded-xl bg-[#006633] text-white flex items-center justify-center shrink-0 shadow-sm">
              <ExternalLink size={20} />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  Portal do Aluno Oficial (FECAP)
                  <ExternalLink size={13} className="text-[#006633]" />
                </h4>
                <Badge variant="success">Oficial</Badge>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Acesse a página oficial do Portal Educacional FECAP para notas, faltas, boletos e rematrícula.
              </p>
              <span className="text-3xs font-mono text-[#006633] block pt-1">portal.fecap.br ↗</span>
            </div>
          </a>

          {/* Option 2: Álvaro AI Platform */}
          <button
            onClick={() => {
              setShowPortalAlunoModal(false)
              navigate('/login')
            }}
            className="w-full p-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-left transition-all flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles size={20} />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900 text-sm">Plataforma Álvaro AI (Atendimento IA)</h4>
                <Badge variant="brand">IA 24/7</Badge>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Ambiente com Inteligência Artificial, autoatendimento, agendamento e chamados.
              </p>
            </div>
          </button>

          {/* Option 3: Aluno Dashboard Demo */}
          <button
            onClick={() => {
              setShowPortalAlunoModal(false)
              navigate('/aluno')
            }}
            className="w-full p-3.5 rounded-2xl border border-gray-100 bg-gray-50/80 hover:bg-gray-100 text-left transition-all flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-200 text-gray-700 flex items-center justify-center shrink-0">
              <Users size={16} />
            </div>
            <div className="flex-1 text-xs">
              <span className="font-semibold text-gray-800 block">Demonstração Visual do Portal Álvaro AI</span>
              <span className="text-gray-500 text-2xs">Navegue pelas telas do estudante</span>
            </div>
            <ArrowRight size={14} className="text-gray-400" />
          </button>
        </div>
      </Modal>

      {/* ── Cookie Notice Bar ── */}
      {!cookieAccepted && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#00E082] text-gray-900 py-3 px-4 sm:px-8 shadow-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-medium">
            A FECAP utiliza cookies para personalizar sua experiência neste website. Ao continuar neste site você concorda com nossa política de cookies.{' '}
            <a href="#" className="underline font-bold hover:text-black">Saiba mais</a>
          </div>
          <button
            onClick={() => setCookieAccepted(true)}
            className="px-5 py-1.5 rounded-full bg-[#003822] text-white font-bold text-xs hover:bg-[#002618] transition-colors"
          >
            Ok
          </button>
        </div>
      )}
    </div>
  )
}
