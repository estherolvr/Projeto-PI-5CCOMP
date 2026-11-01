import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { DataState } from '@/components/common/DataState'
export default function AsaAgenteIA() {
  const query=useApiQuery(async()=>{const [tickets,health]=await Promise.all([api.tickets.list(),api.admin.getHealth()]);return {tickets,health}})
  const suggestions=(query.data?.tickets??[]).filter(t=>t.aiSuggestion)
  const gemini=query.data?.health.checks.find(c=>c.id==='gemini')
  return <div className="p-4 md:p-6 space-y-6"><h1 className="text-2xl font-bold dark:text-white">Assistência de IA</h1><DataState loading={query.loading} error={query.error} onRetry={query.refresh}><section className="border rounded-xl p-5 bg-white dark:bg-slate-800 dark:border-slate-700"><h2 className="font-semibold dark:text-white">Google Gemini: {gemini?.status ?? 'Sem dados'}</h2><p className="text-sm text-gray-500 mt-2">{gemini?.detail ?? 'Não há diagnóstico disponível.'}</p><p className="text-sm text-gray-500 mt-2">As recomendações abaixo foram registradas nos chamados. São estimativas de apoio, sujeitas à revisão da equipe.</p></section><h2 className="font-semibold dark:text-white">Recomendações registradas ({suggestions.length})</h2><DataState loading={false} error={null} onRetry={query.refresh} empty={!suggestions.length}>{suggestions.map(t=><Link to={'/asa/chamados/'+t.id} key={t.id} className="block bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-5 mb-3"><h3 className="font-semibold dark:text-white">#{t.number} · {t.title}</h3><p className="text-sm text-gray-500 mt-2">{t.aiSuggestion?.recommendation}</p></Link>)}</DataState></DataState></div>
}
