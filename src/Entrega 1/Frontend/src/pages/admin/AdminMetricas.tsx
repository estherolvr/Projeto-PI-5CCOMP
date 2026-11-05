import { useMemo, useState } from 'react'
import { Activity, AlertTriangle, BarChart3, Bot, CalendarRange, CheckCircle2, Clock3, GraduationCap, Lightbulb, RefreshCw, Ticket, TrendingDown, TrendingUp, Users, WalletCards } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
import { api } from '@/lib/api'
import { useAdminQuery } from '@/lib/use-admin-query'
import { AdminDataState } from '@/components/admin/AdminDataState'
import { ticketCategoryLabels } from '@/lib/admin-utils'

const COLORS = ['#07865b', '#3984c6', '#e4a129', '#8b64c7', '#d95d5d', '#57a98b']
const statusLabels: Record<string,string> = { openTickets:'Abertos', inProgressTickets:'Em atendimento', waitingTickets:'Aguardando aluno', resolvedTickets:'Resolvidos', closedTickets:'Fechados' }
const priorityLabels: Record<string,string> = { baixa:'Baixa', media:'Média', alta:'Alta', critica:'Crítica', urgente:'Urgente' }

function iso(date: Date) { return date.toISOString().slice(0, 10) }
function rangeFor(id: string) {
  const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (id === 'today') return { start: iso(today), end: iso(today) }
  if (id === 'month') return { start: iso(new Date(now.getFullYear(), now.getMonth(), 1)), end: iso(today) }
  if (id === 'previous') return { start: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), end: iso(new Date(now.getFullYear(), now.getMonth(), 0)) }
  const days = Number(id)
  return { start: iso(new Date(+today - (days - 1) * 86400000)), end: iso(today) }
}
function number(value: unknown, suffix = '') { return typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${suffix}` : '—' }
function Delta({ current, previous, inverse = false }: { current: unknown; previous: unknown; inverse?: boolean }) {
  if (typeof current !== 'number' || typeof previous !== 'number' || previous === 0) return <span className="bi-no-comparison">Comparação insuficiente</span>
  const delta = (current - previous) / Math.abs(previous) * 100, good = inverse ? delta <= 0 : delta >= 0
  return <span className={good ? 'bi-delta positive' : 'bi-delta negative'}>{delta >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>} {Math.abs(delta).toFixed(1)}% vs. período anterior</span>
}
function EmptyChart({ text }: { text: string }) { return <div className="bi-empty"><BarChart3 size={28}/><strong>Dados insuficientes</strong><p>{text}</p></div> }
function Panel({ title, subtitle, children, className = '' }: any) { return <section className={`bi-panel ${className}`}><header><div><h2>{title}</h2><p>{subtitle}</p></div></header>{children}</section> }

export default function AdminMetricas() {
  const [preset, setPreset] = useState('30')
  const [custom, setCustom] = useState(rangeFor('30'))
  const selected = preset === 'custom' ? custom : rangeFor(preset)
  const query = useAdminQuery(() => api.metrics.overview(selected), [selected.start, selected.end])
  const data = query.data, summary = data?.summary, previous = data?.comparison?.summary, sample = data?.sampleCounts
  const statuses = summary ? Object.keys(statusLabels).map(key => ({ name: statusLabels[key], value: summary[key] || 0 })) : []
  const categories = (data?.categoryDistribution ?? []).map((item:any) => ({ ...item, label: ticketCategoryLabels[item.name] || item.name })).sort((a:any,b:any)=>b.value-a.value)
  const financial = categories.find((item:any) => item.name === 'financeiro')?.value || 0
  const periodLabel = new Intl.DateTimeFormat('pt-BR').format(new Date(`${selected.start}T12:00:00`)) + ' — ' + new Intl.DateTimeFormat('pt-BR').format(new Date(`${selected.end}T12:00:00`))
  const insights = useMemo(() => {
    if (!summary || !summary.totalTickets) return []
    const result:string[] = [], top = categories[0]
    if (top) result.push(`${top.label} concentrou ${top.value} chamado${top.value === 1 ? '' : 's'}, a maior demanda do período.`)
    if (summary.totalTickets > summary.resolvedTickets + summary.closedTickets) result.push('O volume recebido foi superior ao total de chamados concluídos da mesma coorte.')
    if (typeof previous?.avgResolutionHours === 'number' && typeof summary.avgResolutionHours === 'number' && summary.avgResolutionHours > previous.avgResolutionHours) result.push(`O tempo médio de resolução aumentou ${number((summary.avgResolutionHours / previous.avgResolutionHours - 1) * 100, '%')} frente ao período anterior.`)
    if (summary.activeSlaBreachedTickets > 0) result.push(`${summary.activeSlaBreachedTickets} chamado${summary.activeSlaBreachedTickets === 1 ? '' : 's'} ativo${summary.activeSlaBreachedTickets === 1 ? '' : 's'} já ultrapassou o SLA.`)
    const peak = [...(data.hourlyDistribution ?? [])].sort((a:any,b:any)=>b.value-a.value)[0]
    if (peak?.value) result.push(`${peak.hour} foi o horário com maior entrada de solicitações (${peak.value}).`)
    return result
  }, [summary, previous, categories, data?.hourlyDistribution])

  return <div className="bi-dashboard">
    <header className="bi-header"><div><div className="section-kicker"><Activity size={15}/> INTELIGÊNCIA OPERACIONAL</div><h1>Métricas e Analytics</h1><p>Indicadores reais para acompanhar demanda, eficiência, SLA e utilização da inteligência artificial.</p></div><button onClick={() => void query.refresh()} aria-label="Atualizar métricas"><RefreshCw size={16}/> Atualizar</button></header>
    <section className="bi-filterbar"><div className="bi-presets">{[{id:'today',label:'Hoje'},{id:'7',label:'7 dias'},{id:'30',label:'30 dias'},{id:'90',label:'90 dias'},{id:'month',label:'Este mês'},{id:'previous',label:'Mês anterior'},{id:'custom',label:'Personalizado'}].map(item=><button key={item.id} aria-pressed={preset===item.id} onClick={()=>setPreset(item.id)}>{item.label}</button>)}</div>{preset==='custom'&&<div className="bi-custom-range"><label>De<input aria-label="Data inicial" type="date" value={custom.start} max={custom.end} onChange={e=>setCustom({...custom,start:e.target.value})}/></label><label>Até<input aria-label="Data final" type="date" value={custom.end} min={custom.start} onChange={e=>setCustom({...custom,end:e.target.value})}/></label></div>}<div className="bi-period"><CalendarRange size={16}/><span><strong>Período analisado</strong>{periodLabel}</span><small>Comparado ao intervalo anterior equivalente</small></div></section>

    <AdminDataState loading={query.loading} error={query.error} onRetry={query.refresh}>{summary && <div className="bi-content">
      <section className="bi-kpis" aria-label="Indicadores executivos">
        <article><span className="bi-kpi-icon blue"><Ticket/></span><p>Chamados recebidos</p><strong>{number(summary.totalTickets)}</strong><Delta current={summary.totalTickets} previous={previous?.totalTickets}/></article>
        <article><span className="bi-kpi-icon green"><CheckCircle2/></span><p>Taxa de resolução</p><strong>{number(summary.resolutionRate,'%')}</strong><Delta current={summary.resolutionRate} previous={previous?.resolutionRate}/></article>
        <article><span className="bi-kpi-icon amber"><Clock3/></span><p>Tempo médio de resolução</p><strong>{number(summary.avgResolutionHours,'h')}</strong><Delta current={summary.avgResolutionHours} previous={previous?.avgResolutionHours} inverse/></article>
        <article><span className="bi-kpi-icon violet"><Activity/></span><p>Cumprimento do SLA</p><strong>{number(summary.slaAdherence,'%')}</strong><Delta current={summary.slaAdherence} previous={previous?.slaAdherence}/></article>
      </section>

      <div className="bi-section-heading"><span>01</span><div><h2>Performance operacional</h2><p>Entrada, conclusão e composição atual das solicitações.</p></div></div>
      <div className="bi-grid wide">
        <Panel title="Evolução dos chamados" subtitle="Recebidos e resolvidos por dia" className="bi-span-2">{data.chartData?.some((p:any)=>p.criados||p.resolvidos)?<div className="bi-chart large"><ResponsiveContainer><AreaChart data={data.chartData}><defs><linearGradient id="createdFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3984c6" stopOpacity=".3"/><stop offset="95%" stopColor="#3984c6" stopOpacity="0"/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Area type="monotone" dataKey="criados" name="Recebidos" stroke="#3984c6" fill="url(#createdFill)"/><Area type="monotone" dataKey="resolvidos" name="Resolvidos" stroke="#07865b" fill="#07865b" fillOpacity=".08"/></AreaChart></ResponsiveContainer></div>:<EmptyChart text="Nenhum chamado foi criado ou resolvido neste período."/>}</Panel>
        <Panel title="Distribuição por status" subtitle="Situação dos chamados criados no período">{statuses.some(i=>i.value)?<div className="bi-chart donut"><ResponsiveContainer><PieChart><Pie data={statuses} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={2}>{statuses.map((_:any,i:number)=><Cell key={i} fill={COLORS[i]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="bi-legend">{statuses.filter(i=>i.value).map((i,index)=><span key={i.name}><i style={{background:COLORS[index]}}/>{i.name}<strong>{i.value}</strong></span>)}</div></div>:<EmptyChart text="Não há registros para distribuir por status."/>}</Panel>
        <Panel title="Prioridades" subtitle="Pressão operacional por criticidade">{data.priorityDistribution?.length?<div className="bi-chart"><ResponsiveContainer><BarChart data={data.priorityDistribution.map((i:any)=>({...i,label:priorityLabels[i.name]||i.name}))} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="label" width={70}/><Tooltip/><Bar dataKey="value" name="Chamados" fill="#e4a129" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer></div>:<EmptyChart text="Nenhuma prioridade está disponível no período."/>}</Panel>
        <Panel title="Horários de maior demanda" subtitle="Entradas por hora no fuso de São Paulo">{data.hourlyDistribution?.some((i:any)=>i.value)?<div className="bi-chart"><ResponsiveContainer><BarChart data={data.hourlyDistribution}><XAxis dataKey="hour" interval={3}/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="value" name="Chamados" fill="#3984c6" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div>:<EmptyChart text="Ainda não há volume suficiente para identificar horários de pico."/>}</Panel>
      </div>

      <div className="bi-section-heading"><span>02</span><div><h2>Inteligência do atendimento</h2><p>Categorias, equipe e velocidade de resposta.</p></div></div>
      <div className="bi-grid thirds">
        <Panel title="Categorias mais frequentes" subtitle="Assuntos que mais geraram demanda">{categories.length?<div className="bi-ranking">{categories.slice(0,7).map((item:any,index:number)=><div key={item.name}><span>{index+1}</span><div><strong>{item.label}</strong><i><b style={{width:`${item.value/categories[0].value*100}%`}}/></i></div><em>{item.value}</em></div>)}</div>:<EmptyChart text="Nenhuma categoria possui chamados no período."/>}</Panel>
        <Panel title="Carga atual por atendente" subtitle="Chamados ativos em todos os períodos">{data.attendantsWorkload?.length?<div className="bi-ranking">{[...data.attendantsWorkload].sort((a:any,b:any)=>b.activeTickets-a.activeTickets).map((person:any,index:number)=><div key={person.id}><span>{index+1}</span><div><strong>{person.name}</strong><small>Equipe ASA</small></div><em>{person.activeTickets}</em></div>)}</div>:<EmptyChart text="Nenhum atendente ativo foi encontrado."/>}</Panel>
        <Panel title="Velocidade do atendimento" subtitle="Base estatística dos tempos registrados"><div className="bi-stat-list"><div><span>Primeira resposta humana</span><strong>{number(summary.avgResponseMinutes,' min')}</strong><small>{number(sample?.responseTimes)} respostas medidas</small></div><div><span>Resolução</span><strong>{number(summary.avgResolutionHours,'h')}</strong><small>{number(sample?.resolutionTimes)} resoluções medidas</small></div><div><span>Média diária de entradas</span><strong>{number(summary.totalTickets/(data.period?.days||1))}</strong><small>Chamados por dia</small></div></div></Panel>
      </div>

      <div className="bi-section-heading"><span>03</span><div><h2>SLA e gargalos</h2><p>Conformidade calculada pelas regras efetivamente aplicadas aos chamados.</p></div></div>
      <div className="bi-kpis compact"><article><span className="bi-kpi-icon green"><CheckCircle2/></span><p>Dentro do SLA</p><strong>{number((sample?.slaMeasured||0)-(summary.breachedTickets||0))}</strong></article><article><span className="bi-kpi-icon red"><AlertTriangle/></span><p>Fora do SLA</p><strong>{number(summary.breachedTickets)}</strong></article><article><span className="bi-kpi-icon amber"><Clock3/></span><p>Próximos do vencimento</p><strong>{number(summary.activeSlaRiskTickets)}</strong></article><article><span className="bi-kpi-icon violet"><BarChart3/></span><p>Base mensurada</p><strong>{number(sample?.slaMeasured)}</strong><span className="bi-no-comparison">{number(sample?.slaUnknown)} sem medição</span></article></div>

      <div className="bi-section-heading"><span>04</span><div><h2>Demandas acadêmicas e financeiras</h2><p>Leitura das solicitações reais, sem inferir valores monetários.</p></div></div>
      <div className="bi-grid halves"><Panel title="Demanda acadêmica" subtitle="Alunos, recorrência e distribuição por curso"><div className="bi-mini-kpis"><div><Users/><span>Alunos atendidos<strong>{number(summary.uniqueStudents)}</strong></span></div><div><GraduationCap/><span>Alunos recorrentes<strong>{number(data.recurringStudents)}</strong></span></div></div>{data.courseDistribution?.length?<div className="bi-course-list">{data.courseDistribution.sort((a:any,b:any)=>b.value-a.value).slice(0,6).map((item:any)=><span key={item.name}>{item.name}<strong>{item.value}</strong></span>)}</div>:<EmptyChart text="Os chamados do período não possuem cursos associados para análise."/>}</Panel><Panel title="Demandas financeiras" subtitle="Ocorrências categorizadas como Financeiro"><div className="bi-financial"><WalletCards/><strong>{financial}</strong><span>solicitações financeiras no período</span><p>Este indicador representa volume de atendimento. O sistema não registra valores financeiros confiáveis nesta base.</p></div></Panel></div>

      <div className="bi-section-heading"><span>05</span><div><h2>Inteligência artificial</h2><p>Participação da IA e avaliações registradas pelos alunos.</p></div></div>
      <div className="bi-grid halves"><Panel title="Utilização da IA" subtitle="Análises vinculadas aos chamados do período"><div className="bi-mini-kpis"><div><Bot/><span>Chamados analisados<strong>{number(summary.aiAnalysedTickets)}</strong></span></div><div><Activity/><span>Participação<strong>{number(summary.totalTickets?summary.aiAnalysedTickets/summary.totalTickets*100:null,'%')}</strong></span></div></div><p className="bi-footnote">A base não registra separadamente recomendação aceita, rejeitada ou efetivamente aplicada.</p></Panel><Panel title="Avaliações da IA" subtitle="Feedback explícito enviado pelos alunos"><div className="bi-csat"><strong>{number(summary.csat)}</strong><span>/ 5</span><p>Nota média em {number(sample?.feedbackRatings)} avaliações válidas.</p></div></Panel></div>

      <div className="bi-section-heading"><span>06</span><div><h2>Insights da operação</h2><p>Conclusões produzidas somente quando há evidência nos dados selecionados.</p></div></div>
      <section className="bi-insights">{insights.length?insights.map((insight,index)=><article key={insight}><span><Lightbulb size={17}/></span><div><small>INSIGHT {String(index+1).padStart(2,'0')}</small><p>{insight}</p></div></article>):<EmptyChart text="O período selecionado não possui dados suficientes para gerar insights objetivos."/>}</section>
    </div>}</AdminDataState>
  </div>
}
