import { useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigured } from './supabase.js'

const number = new Intl.NumberFormat('pt-BR')

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '—'
}

function formatDate(value) {
  if (!value) return '—'
  const [y, m, d] = value.split('-')
  return `${d}/${m}/${y}`
}

function DashboardIcon({ type }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (type === 'notes') return <svg {...common}><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h5"/><path d="M8 12h8M8 16h6"/></svg>
  if (type === 'user') return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 3.5-6 8-6s7.2 2 8 6"/></svg>
  if (type === 'shift') return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
  if (type === 'trend') return <svg {...common}><path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/></svg>
  if (type === 'filter') return <svg {...common}><path d="M4 5h16M7 12h10M10 19h4"/></svg>
  return null
}

export default function App() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userFilter, setUserFilter] = useState('todos')
  const [yearFilter, setYearFilter] = useState('todos')
  const [shiftFilter, setShiftFilter] = useState('todos')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    async function load() {
      if (!supabaseConfigured || !supabase) {
        setLoading(false)
        setError('As variáveis do Supabase ainda não estão disponíveis neste ambiente.')
        return
      }
      const { data, error } = await supabase
        .from('nota_metricas_diarias')
        .select('id,data,usuario,turno,quantidade_notas,arquivo_origem')
        .order('data', { ascending: true })
      if (error) setError(error.message)
      else setRows(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const users = useMemo(() => [...new Set(rows.map((r) => r.usuario).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [rows])
  const years = useMemo(() => [...new Set(rows.map((r) => r.data?.slice(0, 4)).filter(Boolean))].sort().reverse(), [rows])
  const shifts = useMemo(() => [...new Set(rows.map((r) => r.turno).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [rows])

  const filtered = useMemo(() => rows.filter((r) => {
    if (userFilter !== 'todos' && r.usuario !== userFilter) return false
    if (yearFilter !== 'todos' && r.data?.slice(0, 4) !== yearFilter) return false
    if (shiftFilter !== 'todos' && r.turno !== shiftFilter) return false
    if (dateFrom && r.data < dateFrom) return false
    if (dateTo && r.data > dateTo) return false
    return true
  }), [rows, userFilter, yearFilter, shiftFilter, dateFrom, dateTo])

  const totalNotes = useMemo(() => filtered.reduce((sum, r) => sum + Number(r.quantidade_notas || 0), 0), [filtered])

  const userRanking = useMemo(() => {
    const map = new Map()
    filtered.forEach((r) => map.set(r.usuario, (map.get(r.usuario) || 0) + Number(r.quantidade_notas || 0)))
    return [...map.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR'))
  }, [filtered])

  const shiftRanking = useMemo(() => {
    const map = new Map()
    filtered.forEach((r) => map.set(r.turno, (map.get(r.turno) || 0) + Number(r.quantidade_notas || 0)))
    return [...map.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total)
  }, [filtered])

  const bestByShift = useMemo(() => {
    const grouped = new Map()
    filtered.forEach((r) => {
      if (!grouped.has(r.turno)) grouped.set(r.turno, new Map())
      const usersMap = grouped.get(r.turno)
      usersMap.set(r.usuario, (usersMap.get(r.usuario) || 0) + Number(r.quantidade_notas || 0))
    })
    return [...grouped.entries()].map(([shift, map]) => {
      const list = [...map.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total)
      return { shift, winner: list[0], runnerUp: list[1] }
    }).sort((a, b) => a.shift.localeCompare(b.shift, 'pt-BR'))
  }, [filtered])

  const trend = useMemo(() => {
    const map = new Map()
    filtered.forEach((r) => map.set(r.data, (map.get(r.data) || 0) + Number(r.quantidade_notas || 0)))
    return [...map.entries()].map(([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date))
  }, [filtered])

  const topUser = userRanking[0]
  const topShift = shiftRanking[0]
  const activeDays = new Set(filtered.map((r) => r.data)).size
  const avgPerDay = activeDays ? Math.round(totalNotes / activeDays) : 0
  const maxTrend = Math.max(1, ...trend.map((x) => x.total))

  function clearFilters() {
    setUserFilter('todos')
    setYearFilter('todos')
    setShiftFilter('todos')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SM</div>
          <div><strong>Dashboard SM</strong><span>Controle de produtividade</span></div>
        </div>
        <nav>
          <button className="nav-item active"><span>▦</span> Visão geral</button>
          <button className="nav-item"><span>♙</span> Usuários</button>
          <button className="nav-item"><span>◷</span> Turnos</button>
          <button className="nav-item"><span>⌁</span> Períodos</button>
        </nav>
        <div className="sidebar-foot">
          <span className={supabaseConfigured ? 'dot ok' : 'dot'} />
          {supabaseConfigured ? 'Base conectada' : 'Base não conectada'}
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">CONTROLE OPERACIONAL</span>
            <h1>Produtividade de notas</h1>
            <p>Compare desempenho, turnos e evolução da digitação em um único painel.</p>
          </div>
          <div className="live-badge"><span /> Dados consolidados</div>
        </header>

        <section className="filters">
          <div className="filter-title"><DashboardIcon type="filter" /><strong>Filtros</strong><span>{filtered.length} registro(s)</span></div>
          <div className="filter-grid">
            <label><span>Usuário</span><select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}><option value="todos">Todos os usuários</option>{users.map((u) => <option key={u}>{u}</option>)}</select></label>
            <label><span>Ano</span><select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}><option value="todos">Todos os anos</option>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
            <label><span>Turno</span><select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}><option value="todos">Todos os turnos</option>{shifts.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label><span>De</span><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
            <label><span>Até</span><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
            <button className="clear" onClick={clearFilters}>Limpar filtros</button>
          </div>
        </section>

        {loading ? <div className="state-card">Carregando indicadores...</div> : error ? <div className="state-card error">{error}</div> : (
          <>
            <section className="kpis">
              <article className="kpi"><div className="kpi-icon"><DashboardIcon type="notes" /></div><div><span>Total de notas</span><strong>{number.format(totalNotes)}</strong><small>{activeDays} dia(s) no período</small></div></article>
              <article className="kpi highlight"><div className="kpi-icon"><DashboardIcon type="user" /></div><div><span>Quem mais digitou</span><strong className="name">{topUser?.name ?? 'Sem dados'}</strong><small>{topUser ? `${number.format(topUser.total)} notas` : 'Aguardando importação'}</small></div></article>
              <article className="kpi"><div className="kpi-icon"><DashboardIcon type="shift" /></div><div><span>Melhor turno</span><strong className="name">{topShift?.name ?? 'Sem dados'}</strong><small>{topShift ? `${number.format(topShift.total)} notas` : 'Aguardando importação'}</small></div></article>
              <article className="kpi"><div className="kpi-icon"><DashboardIcon type="trend" /></div><div><span>Média por dia</span><strong>{number.format(avgPerDay)}</strong><small>notas/dia no filtro atual</small></div></article>
            </section>

            <section className="dashboard-grid">
              <article className="panel ranking-panel">
                <div className="panel-head"><div><span className="eyebrow">RANKING GERAL</span><h2>Quem digitou mais notas?</h2></div><span className="pill">{userRanking.length} usuários</span></div>
                {userRanking.length ? <div className="ranking">
                  {userRanking.map((item, i) => {
                    const max = userRanking[0]?.total || 1
                    return <div className="rank-row" key={item.name}>
                      <span className={`position p${i + 1}`}>{i + 1}</span>
                      <span className="avatar">{initials(item.name)}</span>
                      <div className="rank-person"><strong>{item.name}</strong><div className="bar"><i style={{ width: `${(item.total / max) * 100}%` }} /></div></div>
                      <strong className="rank-total">{number.format(item.total)}<small>notas</small></strong>
                    </div>
                  })}
                </div> : <Empty />}
              </article>

              <article className="panel">
                <div className="panel-head"><div><span className="eyebrow">POR TURNO</span><h2>Melhores do turno</h2></div></div>
                {bestByShift.length ? <div className="shift-winners">{bestByShift.map((group) => (
                  <div className="winner-card" key={group.shift}>
                    <div className="winner-top"><span className="shift-label">{group.shift}</span><span className="medal">★</span></div>
                    <div className="winner-person"><span className="avatar large">{initials(group.winner?.name)}</span><div><strong>{group.winner?.name ?? '—'}</strong><span>{number.format(group.winner?.total ?? 0)} notas</span></div></div>
                    {group.runnerUp && <div className="runner"><span>2º {group.runnerUp.name}</span><b>{number.format(group.runnerUp.total)}</b></div>}
                  </div>
                ))}</div> : <Empty />}
              </article>
            </section>

            <section className="dashboard-grid lower">
              <article className="panel">
                <div className="panel-head"><div><span className="eyebrow">EVOLUÇÃO</span><h2>Notas por dia</h2></div><span className="pill">{trend.length} dias</span></div>
                {trend.length ? <div className="trend-chart">
                  {trend.map((item) => <div className="trend-col" key={item.date} title={`${formatDate(item.date)} · ${item.total} notas`}>
                    <span>{number.format(item.total)}</span><div className="trend-bar"><i style={{ height: `${Math.max(6, (item.total / maxTrend) * 100)}%` }} /></div><small>{formatDate(item.date).slice(0, 5)}</small>
                  </div>)}
                </div> : <Empty />}
              </article>

              <article className="panel">
                <div className="panel-head"><div><span className="eyebrow">DISTRIBUIÇÃO</span><h2>Volume por turno</h2></div></div>
                {shiftRanking.length ? <div className="shift-list">{shiftRanking.map((item) => (
                  <div className="shift-row" key={item.name}><div><strong>{item.name}</strong><span>{totalNotes ? Math.round(item.total / totalNotes * 100) : 0}% do volume</span></div><b>{number.format(item.total)} notas</b></div>
                ))}</div> : <Empty />}
              </article>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function Empty() {
  return <div className="empty"><strong>Ainda não há dados neste filtro.</strong><span>Assim que as planilhas forem importadas, os indicadores aparecerão aqui automaticamente.</span></div>
}
