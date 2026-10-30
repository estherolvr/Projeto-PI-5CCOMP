import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Download, Eye, CheckCircle2, ShieldCheck, QrCode,
  Calendar, Award, CreditCard, Clock, FileCheck, ArrowRight, X, Printer
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'

interface DocumentItem {
  id: string
  title: string
  category: 'Academico' | 'Financeiro' | 'Secretaria'
  description: string
  readyIn: string
  code: string
  icon: typeof FileText
  badge: string
}

const mockDocuments: DocumentItem[] = [
  {
    id: 'doc-1',
    title: 'Declaração de Matrícula Ativa',
    category: 'Academico',
    description: 'Comprova vínculo acadêmico regular com a FECAP para o semestre letivo vigente.',
    readyIn: 'Instantâneo',
    code: 'FECAP-MAT-2026-89412',
    icon: FileCheck,
    badge: 'Mais solicitado',
  },
  {
    id: 'doc-2',
    title: 'Histórico Escolar Parcial',
    category: 'Academico',
    description: 'Relatório completo de disciplinas cursadas, notas, créditos obtidos e frequência acumulada.',
    readyIn: 'Instantâneo',
    code: 'FECAP-HIS-2026-11409',
    icon: Award,
    badge: 'Autenticado',
  },
  {
    id: 'doc-3',
    title: 'Declaração de Quitação Financeira',
    category: 'Financeiro',
    description: 'Documento comprobatório de adimplência de mensalidades e taxas escolares.',
    readyIn: 'Instantâneo',
    code: 'FECAP-FIN-2026-55018',
    icon: CreditCard,
    badge: 'Financeiro',
  },
  {
    id: 'doc-4',
    title: 'Atestado de Horários e Disciplinas',
    category: 'Secretaria',
    description: 'Grade horária semanal com salas de aula, professores e matriz curricular do semestre.',
    readyIn: 'Instantâneo',
    code: 'FECAP-HOR-2026-33921',
    icon: Calendar,
    badge: 'Semestral',
  },
  {
    id: 'doc-5',
    title: 'Declaração para Passe Escolar (SPTrans/EMTU)',
    category: 'Secretaria',
    description: 'Formulário padrão para cadastro e renovação do benefício de transporte estudantil.',
    readyIn: 'Instantâneo',
    code: 'FECAP-TRN-2026-77820',
    icon: FileText,
    badge: 'Transporte',
  },
  {
    id: 'doc-6',
    title: 'Certidão de Horas Complementares',
    category: 'Academico',
    description: 'Comprovante das atividades complementares validadas e registradas no sistema (85h validadas).',
    readyIn: 'Instantâneo',
    code: 'FECAP-ACC-2026-99014',
    icon: Award,
    badge: 'Atividades',
  },
]

export default function AlunoDocumentos() {
  const { show } = useToast()
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null)
  const [showIdCard, setShowIdCard] = useState(false)
  const [activeCategory, setActiveCategory] = useState<'Todos' | 'Academico' | 'Financeiro' | 'Secretaria'>('Todos')

  const filteredDocs = activeCategory === 'Todos'
    ? mockDocuments
    : mockDocuments.filter(d => d.category === activeCategory)

  const handleDownload = (doc: DocumentItem) => {
    show(`Download iniciado: ${doc.title}`, 'success')
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-teal-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-sm text-green-300">
              <ShieldCheck size={14} />
              Autenticação Digital Integrada
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Secretaria & Documentos Digitais
            </h1>
            <p className="text-green-100/80 text-sm leading-relaxed">
              Emita declarações oficiais e atestados acadêmicos assinados digitalmente com código de verificação instantâneo.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => setShowIdCard(true)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
              icon={<QrCode size={18} />}
            >
              Carteirinha Digital
            </Button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-700 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {(['Todos', 'Academico', 'Financeiro', 'Secretaria'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-100 dark:border-slate-700'
              }`}
            >
              {cat === 'Academico' ? 'Acadêmico' : cat}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500 dark:text-slate-400 font-medium hidden sm:inline">
          {filteredDocs.length} documentos disponíveis
        </span>
      </div>

      {/* Document Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDocs.map((doc, idx) => {
          const Icon = doc.icon
          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-2xl p-5 shadow-card hover:shadow-card-md transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Icon size={20} />
                  </div>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
                    {doc.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-snug">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {doc.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-2xs text-brand-700 dark:text-brand-400 font-medium">
                  <CheckCircle2 size={13} />
                  <span>Emissão Online</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedDoc(doc)}
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    title="Visualizar documento"
                  >
                    <Eye size={16} />
                  </button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleDownload(doc)}
                    icon={<Download size={14} />}
                  >
                    Emitir
                  </Button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Info Callout */}
      <div className="bg-brand-50/50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/30 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={22} />
        </div>
        <div className="flex-1 text-sm text-gray-700 dark:text-slate-300">
          <p className="font-semibold text-gray-900 dark:text-white">Validade e Autenticidade Digital</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Todos os documentos emitidos pelo portal Álvaro AI possuem assinatura digital e código de verificação válido conforme portaria do MEC.
          </p>
        </div>
      </div>

      {/* Modal: Document Preview */}
      <Modal
        open={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title={selectedDoc?.title || 'Visualizar Documento'}
        description="Pré-visualização do documento com certificado digital"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setSelectedDoc(null)}>
              Fechar
            </Button>
            <Button
              variant="primary"
              icon={<Download size={16} />}
              onClick={() => {
                if (selectedDoc) handleDownload(selectedDoc)
                setSelectedDoc(null)
              }}
            >
              Baixar PDF Oficial
            </Button>
          </>
        }
      >
        {selectedDoc && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-6 sm:p-8 space-y-6 text-gray-800 dark:text-slate-200 font-sans shadow-sm">
              {/* Header do Documento Oficial */}
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-4">
                <div className="flex items-center gap-3">
                  <img src="/fecap-green.png" alt="FECAP" className="w-10 h-10 object-contain dark:hidden" />
                  <img src="/fecap-white.png" alt="FECAP" className="w-10 h-10 object-contain hidden dark:block" />
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wide">
                      Fundação Escola de Comércio Álvares Penteado
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Secretaria Geral e Atendimento Acadêmico (ASA)</p>
                  </div>
                </div>
                <Badge variant="success">OFICIAL</Badge>
              </div>

              {/* Corpo */}
              <div className="space-y-4 text-sm leading-relaxed">
                <div className="text-center py-2">
                  <h3 className="text-base font-bold uppercase tracking-wider text-brand-700 dark:text-brand-400">
                    {selectedDoc.title}
                  </h3>
                </div>

                <p>
                  Declaramos para os devidos fins de direito que a aluna <strong>Esther Rodrigues</strong>,
                  portadora do RA <strong>24001523</strong>, está regularmente matriculada no curso de{' '}
                  <strong>Administração de Empresas</strong>, cursando o <strong>4º Semestre Letivo</strong>, no período{' '}
                  <strong>Noturno</strong>, no ano acadêmico de 2026.
                </p>

                <div className="bg-gray-50 dark:bg-slate-800/80 rounded-xl p-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-slate-400">Situação:</span>
                    <p className="font-semibold text-brand-700 dark:text-brand-400">Matriculada / Regular</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-slate-400">Data de Emissão:</span>
                    <p className="font-semibold text-gray-900 dark:text-white">30 de Agosto de 2026</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-slate-400">Código de Autenticação:</span>
                    <p className="font-mono font-semibold text-gray-900 dark:text-white">{selectedDoc.code}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-slate-400">Validade:</span>
                    <p className="font-semibold text-gray-900 dark:text-white">90 dias a partir da emissão</p>
                  </div>
                </div>
              </div>

              {/* Assinatura */}
              <div className="border-t border-gray-200 dark:border-slate-700 pt-4 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-brand-600" />
                  <span>Assinado digitalmente pela Secretaria Geral FECAP</span>
                </div>
                <span className="font-mono">{selectedDoc.code}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Carteirinha de Estudante Digital */}
      <Modal
        open={showIdCard}
        onClose={() => setShowIdCard(false)}
        title="Carteirinha de Estudante Digital"
        description="Documento de identificação estudantil oficial da FECAP"
        size="md"
        footer={
          <Button variant="primary" onClick={() => setShowIdCard(false)} className="w-full">
            Fechar
          </Button>
        }
      >
        <div className="flex justify-center p-2">
          {/* Card Digital Style */}
          <div className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 text-white p-6 shadow-2xl relative overflow-hidden border border-brand-700/40 space-y-6">
            {/* Background Glow */}
            <div className="absolute -top-16 -right-16 w-44 h-44 bg-teal-500/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-asa-purple-500/20 rounded-full blur-2xl" />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <img src="/fecap-white.png" alt="FECAP" className="w-8 h-8 object-contain" />
                <div>
                  <span className="font-bold text-sm tracking-tight text-white">FECAP · ASA</span>
                  <p className="text-[10px] text-green-300">Identidade Estudantil</p>
                </div>
              </div>
              <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-brand-500/30 text-green-300 border border-green-400/30">
                2026
              </span>
            </div>

            {/* Student Info */}
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-xl font-bold text-white shadow-inner flex-shrink-0">
                ER
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-white leading-tight">Esther Rodrigues</h3>
                <p className="text-xs text-green-200">Administração de Empresas</p>
                <p className="text-2xs text-gray-300">RA: <strong>24001523</strong> · 4º Semestre</p>
              </div>
            </div>

            {/* QR Code & Code */}
            <div className="relative z-10 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-2xs text-gray-400 uppercase font-semibold">Código de Validação</span>
                <p className="text-xs font-mono font-bold text-brand-700 dark:text-brand-400">FECAP-RA-24001523-2026</p>
                <p className="text-3xs text-gray-400">Válido até 31/12/2026</p>
              </div>
              <div className="w-14 h-14 bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700">
                <QrCode size={36} />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
