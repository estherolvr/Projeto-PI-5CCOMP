import { useState, useEffect } from 'react'
import { Search, Filter, Download, User, RefreshCw, X, ChevronLeft, ChevronRight, Ticket, Calendar, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { exportCsv } from '@/lib/admin-utils'

interface Student {
  id: string
  name: string
  ra: string
  email: string
  course: string
  semester: number
  period: string
  status: string
  phone?: string
  createdAt: string
  _count?: {
    tickets: number
    appointments: number
    conversations: number
  }
}

export default function AdminAlunos() {

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [page, setPage] = useState(1)

  // Details Modal
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [statusChanging, setStatusChanging] = useState(false)

  const { data, loading, error, refresh } = useAdminQuery(() => api.admin.getStudents({
    search: submittedSearch || undefined,
    course: courseFilter !== 'todos' ? courseFilter : undefined,
    status: statusFilter !== 'todos' ? statusFilter : undefined,
    page, limit: 15,
  }), [submittedSearch, courseFilter, statusFilter, page])
  const students: Student[] = data?.students || []
  const totalStudents = data?.total || 0
  const totalPages = data?.totalPages || 1
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages)
  }, [data, page, totalPages])
  const loadStudents = async (targetPage = page) => {
    if (targetPage !== page) setPage(targetPage)
    else await refresh()
  }
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSubmittedSearch(searchTerm.trim())
    if (page === 1 && submittedSearch === searchTerm.trim()) void refresh()
  }

  const handleUpdateStatus = async (studentId: string, newStatus: string) => {
    setStatusChanging(true)
    try {
      await api.admin.updateStudentStatus(studentId, newStatus)
      await refresh()
      if (selectedStudent?.id === studentId) {
        setSelectedStudent({ ...selectedStudent, status: newStatus })
      }
    } catch (err: any) {
      alert('Erro ao alterar status: ' + err.message)
    } finally {
      setStatusChanging(false)
    }
  }

  const handleExportCSV = () => {
    if (students.length === 0) {
      alert('Não há dados para exportar.')
      return
    }

    exportCsv(`alunos_fecap_pagina_${page}.csv`, ['Nome', 'RA', 'Email', 'Curso', 'Semestre', 'Turno', 'Status', 'Chamados'],
      students.map(s => [s.name, s.ra, s.email, s.course, s.semester, s.period, s.status, s._count?.tickets || 0]))
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Base de Alunos</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              {totalStudents} Alunos encontrados
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Cadastros acadêmicos integrados com chamados, agendamentos e interações da IA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadStudents(page)}
            disabled={loading}
            className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg transition-colors"
            title="Atualizar lista"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin text-brand-600')} />
          </button>
          <button
            onClick={handleExportCSV}
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exportar página CSV
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, RA ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-slate-200"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-medium"
            >
              Buscar
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Curso:</span>
              <select
                value={courseFilter}
                onChange={(e) => { setCourseFilter(e.target.value); setPage(1) }}
                className="text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-2.5 py-1.5 text-gray-700 dark:text-slate-300 outline-none"
              >
                <option value="todos">Todos os cursos</option>
                {(data?.courses || []).map(course => <option key={course} value={course}>{course}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                className="text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-2.5 py-1.5 text-gray-700 dark:text-slate-300 outline-none"
              >
                <option value="todos">Todos os status</option>
                <option value="regular">Regular</option>
                <option value="trancado">Trancado</option>
                <option value="irregular">Irregular</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
            Carregando base de alunos...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">
            {error}
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <User className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Nenhum aluno encontrado</p>
            <p className="text-xs text-gray-400 mt-1">Tente ajustar os termos de busca ou remover os filtros aplicados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Nome / RA</th>
                  <th className="px-6 py-3 font-medium">Curso</th>
                  <th className="px-6 py-3 font-medium">Semestre / Turno</th>
                  <th className="px-6 py-3 font-medium">Chamados</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedStudent(student)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{student.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">RA: {student.ra}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900 dark:text-slate-200">{student.course}</p>
                      <p className="text-xs text-gray-400">{student.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-900 dark:text-slate-200 font-medium">{student.semester}º Semestre</span>
                      <span className="text-xs text-gray-400 block capitalize">Turno: {student.period}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                        <Ticket className="w-3 h-3 text-brand-600" />
                        {student._count?.tickets || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-semibold capitalize',
                          student.status === 'regular'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : student.status === 'trancado'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800'
                        )}
                      >
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedStudent(student)
                        }}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium hover:underline"
                      >
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between text-xs text-gray-500">
          <span>Página {page} de {totalPages} ({totalStudents} registros)</span>
          <div className="flex gap-2">
            <button
              onClick={() => loadStudents(page - 1)}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => loadStudents(page + 1)}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full max-w-lg p-6 shadow-xl relative animate-in fade-in">
            <button
              onClick={() => setSelectedStudent(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl uppercase">
                {selectedStudent.name.slice(0, 2)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">{selectedStudent.name}</h3>
                <p className="text-xs text-gray-500 font-mono">RA: {selectedStudent.ra}</p>
                <p className="text-xs text-gray-400">{selectedStudent.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4 text-center">
              <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                <Ticket className="w-4 h-4 text-brand-600 mx-auto mb-1" />
                <span className="text-base font-bold text-gray-900 dark:text-slate-100">{selectedStudent._count?.tickets || 0}</span>
                <p className="text-[10px] text-gray-400">Chamados</p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                <span className="text-base font-bold text-gray-900 dark:text-slate-100">{selectedStudent._count?.appointments || 0}</span>
                <p className="text-[10px] text-gray-400">Agendamentos</p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                <MessageSquare className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                <span className="text-base font-bold text-gray-900 dark:text-slate-100">{selectedStudent._count?.conversations || 0}</span>
                <p className="text-[10px] text-gray-400">Conversas IA</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs py-3 border-y border-gray-100 dark:border-slate-700 text-gray-700 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-gray-500">Curso:</span>
                <span className="font-semibold">{selectedStudent.course}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Semestre e Turno:</span>
                <span className="font-medium">{selectedStudent.semester}º Semestre · {selectedStudent.period}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Telefone / Contato:</span>
                <span className="font-medium">{selectedStudent.phone || 'Não informado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status da Matrícula:</span>
                <span className="font-semibold capitalize">{selectedStudent.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cadastrado em:</span>
                <span className="font-medium">{new Date(selectedStudent.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {/* Change Status Controls */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Alterar Status:</span>
                <select
                  value={selectedStudent.status}
                  disabled={statusChanging}
                  onChange={(e) => handleUpdateStatus(selectedStudent.id, e.target.value)}
                  className="text-xs rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-2 py-1 text-gray-700 dark:text-slate-300 outline-none"
                >
                  <option value="regular">Regular</option>
                  <option value="trancado">Trancado</option>
                  <option value="irregular">Irregular</option>
                </select>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-slate-600"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
