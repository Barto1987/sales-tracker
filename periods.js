
const MONTH_NAMES=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
export function currentMonthKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
export function monthLabel(k){if(!/^\d{4}-\d{2}$/.test(k||''))return k||'';const [y,m]=k.split('-').map(Number);return `${MONTH_NAMES[m-1]} ${y}`}
function lastDay(y,m){return `${y}-${String(m).padStart(2,'0')}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`}
export function quarterFromMonth(k){const [y,m]=k.split('-').map(Number),q=Math.floor((m-1)/3)+1,s=(q-1)*3+1,e=s+2;return {year:y,quarter:q,label:`Q${q} ${y}`,start:`${y}-${String(s).padStart(2,'0')}-01`,end:lastDay(y,e)}}
export function availablePeriodMonths(store){const keys=new Set([currentMonthKey(),store.settings?.activeMonth,store.settings?.communityMonth,store.settings?.teamMonth,...(store.contracts||[]).map(c=>(c.date||'').slice(0,7)),...Object.keys(store.communityManualExtras||{}),...Object.keys(store.periodStates||{})].filter(Boolean));keys.add('2026-07');return [...keys].filter(k=>/^\d{4}-\d{2}$/.test(k)).sort().reverse()}
export function ensurePeriodState(store,k){store.periodStates=store.periodStates||{};if(!store.periodStates[k])store.periodStates[k]={status:'working',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};return store.periodStates[k]}
export function periodStatusLabel(s){return s==='closed'?'Chiuso':s==='verified'?'Verificato':'In lavorazione'}
export function periodStatusIcon(s){return s==='closed'?'🔒':s==='verified'?'🟢':'🟡'}
export function applyGlobalMonth(store,k){store.settings.activeMonth=k;store.settings.currentMonth=k;store.settings.communityMonth=k;store.settings.teamMonth=k;const q=quarterFromMonth(k);store.settings.excellentPeriod={start:q.start,end:q.end};store.settings.agencyPeriod={start:q.start,end:q.end};ensurePeriodState(store,k);return q}
