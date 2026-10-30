/** Export persisted data as Excel-compatible UTF-8 CSV with safe cells. */
export function exportCsv(filename: string, headers: string[], rows: unknown[][]) {
  const cell = (value: unknown) => {
    let text = value == null ? '' : String(value)
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`
    return `"${text.replace(/"/g, '""')}"`
  }
  const content = [headers, ...rows].map(row => row.map(cell).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const ticketStatusLabels: Record<string, string> = {
  aberto: 'Aberto', em_atendimento: 'Em atendimento', aguardando_aluno: 'Aguardando aluno', resolvido: 'Resolvido', fechado: 'Fechado',
}

export const ticketCategoryLabels: Record<string, string> = {
  matricula: 'Matrícula', financeiro: 'Financeiro', academico: 'Acadêmico', documentos: 'Documentos',
  infraestrutura: 'Infraestrutura', cancelamento: 'Cancelamento', outros: 'Outros',
}

export const ticketPriorityLabels: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' }
