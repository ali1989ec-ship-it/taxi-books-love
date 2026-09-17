import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE = 'cab-ledger-v1'
const today = () => new Date().toLocaleDateString('en-CA')
const money = n => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n || 0)
const parseAmount = value => Math.round(Number(value) * 100) / 100
const dateLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const initial = { entries: [], methods: ['Cash', 'Card', 'Bank transfer'], accounts: [], templates: [] }
function readData() {
  try { const value = JSON.parse(localStorage.getItem(STORAGE)); return value && Array.isArray(value.entries) ? { ...initial, ...value } : initial }
  catch { return initial }
}
function download(filename, content, type) {
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([content], { type })); link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}
function csvCell(v) { return `"${String(v ?? '').replaceAll('"', '""')}"` }
function periodKey(date, period) {
  if (period === 'day') return date
  if (period === 'month') return date.slice(0, 7)
  if (period === 'year') return date.slice(0, 4)
  const d = new Date(`${date}T12:00:00`); const weekday = (d.getDay() + 6) % 7; d.setDate(d.getDate() - weekday); return d.toLocaleDateString('en-CA')
}
function blankEntry(type = 'fare', date = today()) { return { type, date, description: type === 'fare' ? 'Fare' : '', amount: '', method: 'Cash', account: '', details: '', notes: '', tags: '', flagged: false } }
function Icon({ name, size = 20 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 16 4-4 3 2 5-7"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    arrow: <path d="m15 18-6-6 6-6"/>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 17v4h16v-4"/></>,
    car: <><path d="M5 17h14l1-6-2-5H6l-2 5 1 6Z"/><path d="M5 11h14M7 17v2m10-2v2"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/></>,
    receipt: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M8 8h8M8 12h8"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
export default function App() {
  const [data, setData] = useState(readData)
  const [page, setPage] = useState('overview')
  const [date, setDate] = useState(today)
  const [period, setPeriod] = useState('week')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(null)
  const [draft, setDraft] = useState(blankEntry())
  const [error, setError] = useState('')
  const [newMethod, setNewMethod] = useState('')
  const [newAccount, setNewAccount] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => { localStorage.setItem(STORAGE, JSON.stringify(data)) }, [data])
  const sorted = useMemo(() => [...data.entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [data.entries])
  const dayEntries = sorted.filter(e => e.date === date)
  const totals = entries => entries.reduce((sum, e) => sum + (e.type === 'fare' ? e.amount : -e.amount), 0)
  const sumType = (entries, type) => entries.filter(e => e.type === type).reduce((sum, e) => sum + e.amount, 0)
  const todayFares = sumType(dayEntries, 'fare'), todayExpenses = sumType(dayEntries, 'expense')
  const grouped = useMemo(() => {
    const map = new Map()
    for (const e of sorted) { const key = periodKey(e.date, period); if (!map.has(key)) map.set(key, []); map.get(key).push(e) }
    return [...map].sort((a, b) => b[0].localeCompare(a[0]))
  }, [sorted, period])
  const matches = sorted.filter(e => (filter === 'all' || e.type === filter) && [e.description, e.details, e.notes, e.tags, e.account, e.method, e.date].join(' ').toLowerCase().includes(query.toLowerCase()))
  function moveDate(days) { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + days); setDate(d.toLocaleDateString('en-CA')) }
  function openEntry(type = 'fare', entry = null) { setDraft(entry ? { ...entry } : blankEntry(type, date)); setError(''); setModal('entry') }
  function saveEntry(event) {
    event.preventDefault()
    const amount = parseAmount(draft.amount)
    if (!draft.date || !draft.description.trim() || !Number.isFinite(amount) || amount <= 0) { setError('Add a date, description and an amount greater than zero.'); return }
    const entry = { ...draft, amount, description: draft.description.trim(), details: draft.details.trim(), notes: draft.notes.trim(), tags: draft.tags.trim(), account: draft.account.trim(), id: draft.id || crypto.randomUUID(), createdAt: draft.createdAt || new Date().toISOString() }
    setData(current => ({ ...current, entries: current.entries.some(e => e.id === entry.id) ? current.entries.map(e => e.id === entry.id ? entry : e) : [...current.entries, entry], accounts: entry.account && !current.accounts.includes(entry.account) ? [...current.accounts, entry.account] : current.accounts }))
    setDate(entry.date); setModal(null); setNotice('Entry saved'); setTimeout(() => setNotice(''), 3000)
  }
  function deleteEntry() { if (!confirm('Delete this entry?')) return; setData(current => ({ ...current, entries: current.entries.filter(e => e.id !== draft.id) })); setModal(null) }
  function addItem(kind) {
    const value = (kind === 'methods' ? newMethod : newAccount).trim()
    if (!value) return
    setData(current => ({ ...current, [kind]: current[kind].some(x => x.toLowerCase() === value.toLowerCase()) ? current[kind] : [...current[kind], value] }))
    if (kind === 'methods') setNewMethod('')
    else setNewAccount('')
  }
  function saveTemplate() {
    const name = prompt('Name this regular entry:', draft.description)
    if (!name?.trim()) return
    const template = { ...draft, id: crypto.randomUUID(), name: name.trim(), amount: parseAmount(draft.amount) || 0 }
    setData(current => ({ ...current, templates: [...current.templates, template] })); setNotice('Regular entry saved'); setTimeout(() => setNotice(''), 3000)
  }
  function exportCsv() {
    const rows = [['Date', 'Type', 'Description', 'Amount GBP', 'Payment method', 'Account', 'Details', 'Notes', 'Tags', 'Flagged'], ...sorted.map(e => [e.date, e.type, e.description, e.amount.toFixed(2), e.method, e.account, e.details, e.notes, e.tags, e.flagged ? 'Yes' : 'No'])]
    download('cab-ledger-entries.csv', rows.map(row => row.map(csvCell).join(',')).join('\r\n'), 'text/csv;charset=utf-8')
  }
  function backup() { download(`cab-ledger-backup-${today()}.json`, JSON.stringify({ version: 1, ...data }, null, 2), 'application/json') }
  async function restore(event) {
    const file = event.target.files?.[0]; if (!file) return
    try { const parsed = JSON.parse(await file.text()); if (!Array.isArray(parsed.entries) || !Array.isArray(parsed.methods)) throw Error(); if (!confirm(`Replace current data with ${parsed.entries.length} entries from this backup?`)) return; setData({ ...initial, ...parsed }); setNotice('Backup restored') }
    catch { alert('This file is not a valid Cab Ledger backup.') }
    event.target.value = ''
  }
  const navigation = [['overview', 'Overview', 'grid'], ['entries', 'Entries', 'list'], ['totals', 'Totals', 'chart'], ['find', 'Find', 'search'], ['settings', 'Settings', 'settings']]
  const entryRow = e => <button key={e.id} className="entry-row" onClick={() => openEntry(e.type, e)}><span className={`entry-icon ${e.type}`}><Icon name={e.type === 'fare' ? 'car' : 'receipt'} size={18}/></span><span className="entry-copy"><strong>{e.description}</strong><small>{e.details || e.account || e.method}{e.flagged ? ' · ★ Flagged' : ''}</small></span><span className={`entry-amount ${e.type}`}>{e.type === 'expense' ? '−' : '+'}{money(e.amount)}</span></button>
  return <div className="shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><Icon name="car" size={24}/></div><div><strong>Cab Ledger</strong><span>Driver finances, made simple</span></div></div><div className="nav-label">WORKSPACE</div><nav aria-label="Main navigation">{navigation.map(([key, label, icon]) => <button key={key} className={page === key ? 'active' : ''} onClick={() => setPage(key)}><Icon name={icon}/>{label}</button>)}</nav><div className="sidebar-foot"><div className="privacy-dot"/> Saved on this device <small>Your data stays in this browser.</small></div></aside>
    <main className="main"><header className="topbar"><div className="mobile-brand">Cab Ledger</div><span className="topbar-date">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span><button className="primary top-add" onClick={() => openEntry('fare')}><Icon name="plus" size={18}/> New entry</button></header>
      <div className="content">
      {page === 'overview' && <><div className="page-heading"><div><div className="eyebrow">YOUR WORKDAY AT A GLANCE</div><h1>Overview</h1><p>Keep your fares, expenses and earnings in one place.</p></div></div><div className="date-control"><button aria-label="Previous day" onClick={() => moveDate(-1)}>‹</button><div><span>Viewing</span><input aria-label="Selected date" type="date" value={date} onChange={e => setDate(e.target.value)}/></div><button aria-label="Next day" onClick={() => moveDate(1)}>›</button><button className="today-button" onClick={() => setDate(today())}>Today</button></div><div className="stat-grid"><div className="stat-card"><span>FARES</span><strong>{money(todayFares)}</strong><small>{dayEntries.filter(e => e.type === 'fare').length} recorded</small></div><div className="stat-card"><span>EXPENSES</span><strong>{money(todayExpenses)}</strong><small>{dayEntries.filter(e => e.type === 'expense').length} recorded</small></div><div className="stat-card accent"><span>TAKE HOME</span><strong>{money(todayFares - todayExpenses)}</strong><small>Fares less expenses</small></div></div><div className="two-col"><section className="panel"><div className="panel-title"><div><h2>{date === today() ? "Today's activity" : dateLabel(date)}</h2><p>Every journey and cost, in order.</p></div><button className="text-button" onClick={() => setPage('entries')}>View all →</button></div>{dayEntries.length ? <div>{dayEntries.map(entryRow)}</div> : <div className="empty"><span className="empty-icon"><Icon name="list" size={28}/></span><h3>No entries for this day</h3><p>Add your first fare or expense to start your record.</p><button className="primary" onClick={() => openEntry('fare')}><Icon name="plus" size={17}/> Add a fare</button></div>}</section><section className="panel quick-panel"><h2>Quick actions</h2><p>Keep your books up to date as you work.</p><button onClick={() => openEntry('fare')}><span className="quick-icon fare"><Icon name="car"/></span><span><strong>Add a fare</strong><small>Record a journey and payment</small></span><span>→</span></button><button onClick={() => openEntry('expense')}><span className="quick-icon expense"><Icon name="receipt"/></span><span><strong>Add an expense</strong><small>Track fuel, fees and more</small></span><span>→</span></button><button onClick={() => setPage('totals')}><span className="quick-icon chart"><Icon name="chart"/></span><span><strong>View totals</strong><small>See your daily or yearly figures</small></span><span>→</span></button></section></div></>}
      {page === 'entries' && <><div className="page-heading split"><div><div className="eyebrow">YOUR RECORDS</div><h1>Entries</h1><p>Every fare and expense you’ve logged.</p></div><button className="primary" onClick={() => openEntry('fare')}><Icon name="plus" size={18}/> Add entry</button></div><div className="toolbar"><div className="segmented">{[['all','All'],['fare','Fares'],['expense','Expenses']].map(([k,l])=><button className={filter===k?'selected':''} key={k} onClick={()=>setFilter(k)}>{l}</button>)}</div><button className="secondary" onClick={exportCsv}><Icon name="download" size={17}/> Export CSV</button></div><section className="panel list-panel">{sorted.filter(e=>filter==='all'||e.type===filter).length ? sorted.filter(e=>filter==='all'||e.type===filter).map((e,i,arr)=><div key={e.id}>{(i===0||arr[i-1].date!==e.date)&&<div className="group-title">{dateLabel(e.date)}</div>}{entryRow(e)}</div>) : <div className="empty"><h3>No entries yet</h3><p>Record a fare or expense to see it here.</p></div>}</section></>}
      {page === 'totals' && <><div className="page-heading"><div className="eyebrow">THE BIG PICTURE</div><h1>Totals</h1><p>See what you earned and spent over time.</p></div><div className="toolbar"><div className="segmented">{[['day','Days'],['week','Weeks'],['month','Months'],['year','Years']].map(([k,l])=><button className={period===k?'selected':''} key={k} onClick={()=>setPeriod(k)}>{l}</button>)}</div><button className="secondary" onClick={exportCsv}><Icon name="download" size={17}/> Export CSV</button></div>{grouped.length ? <><div className="stat-grid"><div className="stat-card"><span>ALL FARES</span><strong>{money(sumType(sorted,'fare'))}</strong></div><div className="stat-card"><span>ALL EXPENSES</span><strong>{money(sumType(sorted,'expense'))}</strong></div><div className="stat-card accent"><span>NET BALANCE</span><strong>{money(totals(sorted))}</strong></div></div><section className="panel totals-panel">{grouped.map(([key,entries])=><details key={key}><summary><strong>{period==='day'?dateLabel(key):period==='week'?`Week of ${dateLabel(key)}`:period==='month'?new Date(`${key}-01T12:00:00`).toLocaleDateString('en-GB',{month:'long',year:'numeric'}):key}</strong><span>{money(sumType(entries,'fare'))} fares <i>− {money(sumType(entries,'expense'))} expenses</i><b>{money(totals(entries))}</b></span></summary><div className="breakdown"><div><strong>Payment methods</strong>{[...new Set(entries.map(e=>e.method))].map(method=><p key={method}>{method}<span>{money(sumType(entries.filter(e=>e.method===method),'fare'))}</span></p>)}</div><div><strong>Accounts</strong>{[...new Set(entries.filter(e=>e.account).map(e=>e.account))].length ? [...new Set(entries.filter(e=>e.account).map(e=>e.account))].map(account=><p key={account}>{account}<span>{money(sumType(entries.filter(e=>e.account===account),'fare'))}</span></p>) : <p>No account fares</p>}</div></div></details>)}</section></> : <section className="panel empty"><h3>No totals yet</h3><p>Your totals will appear once you add a fare or expense.</p></section>}</>}
      {page === 'find' && <><div className="page-heading"><div className="eyebrow">FIND ANYTHING</div><h1>Find entries</h1><p>Search descriptions, details, tags, accounts or payment methods.</p></div><label className="search-field"><Icon name="search"/><input autoFocus placeholder="Search your records…" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="toolbar"><div className="segmented">{[['all','All'],['fare','Fares'],['expense','Expenses']].map(([k,l])=><button className={filter===k?'selected':''} key={k} onClick={()=>setFilter(k)}>{l}</button>)}</div><span className="result-count">{matches.length} results</span></div><section className="panel list-panel">{matches.length ? matches.map(entryRow) : <div className="empty"><h3>No matching entries</h3><p>Try a different word, tag or payment method.</p></div>}</section></>}
      {page === 'settings' && <><div className="page-heading"><div className="eyebrow">MAKE IT YOURS</div><h1>Settings & data</h1><p>Manage your lists and keep a copy of your records.</p></div><div className="settings-grid"><section className="panel settings-panel"><h2>Payment methods</h2><p>Use these when you add a fare or expense.</p><div className="chips">{data.methods.map(item=><span key={item}>{item}<button aria-label={`Remove ${item}`} onClick={()=>setData(current=>({...current,methods:current.methods.filter(x=>x!==item)}))}>×</button></span>)}</div><form onSubmit={e=>{e.preventDefault();addItem('methods')}}><input aria-label="New payment method" placeholder="Add a method" value={newMethod} onChange={e=>setNewMethod(e.target.value)}/><button className="secondary">Add</button></form></section><section className="panel settings-panel"><h2>Accounts</h2><p>Group fares from regular customers or firms.</p><div className="chips">{data.accounts.length?data.accounts.map(item=><span key={item}>{item}<button aria-label={`Remove ${item}`} onClick={()=>setData(current=>({...current,accounts:current.accounts.filter(x=>x!==item)}))}>×</button></span>):<small>No accounts yet</small>}</div><form onSubmit={e=>{e.preventDefault();addItem('accounts')}}><input aria-label="New account" placeholder="Add an account" value={newAccount} onChange={e=>setNewAccount(e.target.value)}/><button className="secondary">Add</button></form></section><section className="panel settings-panel"><h2>Regular entries</h2><p>Tap a saved entry to add it again.</p>{data.templates.length?<div className="templates">{data.templates.map(t=><div key={t.id}><button onClick={()=>{setPage('overview');setDraft({...t,id:undefined,createdAt:undefined,date:today()});setModal('entry')}}>{t.name} <span>{money(t.amount)}</span></button><button aria-label={`Remove ${t.name}`} onClick={()=>setData(current=>({...current,templates:current.templates.filter(x=>x.id!==t.id)}))}>×</button></div>)}</div>:<small>No regular entries saved yet. Save one from the entry form.</small>}</section><section className="panel settings-panel"><h2>Export & backup</h2><p>Keep a copy outside this browser. CSV opens in spreadsheets; JSON restores everything.</p><div className="stack-actions"><button className="secondary" onClick={exportCsv}>Download entries as CSV</button><button className="secondary" onClick={backup}>Download full backup</button><label className="secondary upload">Restore a backup<input type="file" accept="application/json,.json" onChange={restore}/></label></div><small>Browser storage can be cleared by your browser or device. Download regular backups.</small></section></div></>}
      </div></main><nav className="mobile-nav" aria-label="Mobile navigation">{navigation.map(([key,label,icon])=><button key={key} className={page===key?'active':''} onClick={()=>setPage(key)}><Icon name={icon} size={20}/><span>{label}</span></button>)}</nav>
    {notice&&<div className="toast" role="status">{notice}</div>}
    {modal==='entry'&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="entry-title"><div className="modal-header"><div><div className="eyebrow">QUICK RECORD</div><h2 id="entry-title">{draft.id?'Edit':draft.type==='expense'?'Add an':'Add a'} {draft.type}</h2></div><button className="close" aria-label="Close" onClick={()=>setModal(null)}>×</button></div><form onSubmit={saveEntry}><div className="form-body"><div className="segmented type-select"><button type="button" className={draft.type==='fare'?'selected':''} onClick={()=>setDraft({...draft,type:'fare',description:draft.description||'Fare'})}>Fare</button><button type="button" className={draft.type==='expense'?'selected':''} onClick={()=>setDraft({...draft,type:'expense',description:draft.description==='Fare'?'':draft.description})}>Expense</button></div><div className="form-grid"><label>Date<input type="date" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})} required/></label><label>Amount (£)<input type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" value={draft.amount} onChange={e=>setDraft({...draft,amount:e.target.value})} required/></label></div><label>Description<input placeholder={draft.type==='fare'?'e.g. Airport transfer':'e.g. Fuel'} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} required/></label><div className="form-grid"><label>Payment method<select value={draft.method} onChange={e=>setDraft({...draft,method:e.target.value})}>{[...new Set([...data.methods,draft.method])].map(m=><option key={m}>{m}</option>)}</select></label><label>Account (optional)<input list="account-options" placeholder="Choose or enter" value={draft.account} onChange={e=>setDraft({...draft,account:e.target.value})}/><datalist id="account-options">{data.accounts.map(a=><option key={a} value={a}/>)}</datalist></label></div><label>Journey or details<input placeholder="e.g. Station → High Street" value={draft.details} onChange={e=>setDraft({...draft,details:e.target.value})}/></label><div className="form-grid"><label>Tags<input placeholder="e.g. airport, evening" value={draft.tags} onChange={e=>setDraft({...draft,tags:e.target.value})}/></label><label>Notes<input placeholder="Optional notes" value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label></div><label className="check"><input type="checkbox" checked={draft.flagged} onChange={e=>setDraft({...draft,flagged:e.target.checked})}/> Flag for follow-up</label>{error&&<p className="error" role="alert">{error}</p>}</div><div className="modal-footer">{draft.id?<button type="button" className="danger-link" onClick={deleteEntry}>Delete</button>:<button type="button" className="text-button" onClick={saveTemplate}>Save as regular</button>}<div><button type="button" className="secondary" onClick={()=>setModal(null)}>Cancel</button><button className="primary" type="submit">Save entry</button></div></div></form></div></div>}
  </div>
}
