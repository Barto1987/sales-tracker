
window.addEventListener('error',(e)=>{
 try{
  const box=document.getElementById('cloudDiagnostics');
  if(box){
   box.classList.remove('hidden');
   box.innerHTML='<div class="cloud-diag-row cloud-diag-ko"><span>✕</span><div><strong>Errore JavaScript</strong><small>'+String(e.message||'Errore sconosciuto')+'</small></div></div>';
  }
 }catch(_){}
});
window.addEventListener('unhandledrejection',(e)=>{
 try{
  const msg=e.reason?.message||String(e.reason||'Promise rejected');
  const box=document.getElementById('cloudDiagnostics');
  if(box){
   box.classList.remove('hidden');
   box.innerHTML='<div class="cloud-diag-row cloud-diag-ko"><span>✕</span><div><strong>Errore Cloud</strong><small>'+msg+'</small></div></div>';
  }
 }catch(_){}
});


import {loadStore,saveStore,importBackupObject} from './storage.js?v=3106';
import {TARGETS,generalStats,agencyStats,agencyBreakdown,excellentStats,excellentBreakdown,communityStats,communityBreakdown,teamStats,teamBreakdown,availableMonths,customerList,customerDashboard,customerKey,inflowOf,communityRulesForMonth} from './engines.js?v=3106';
import {savePdf,openPdf,deletePdf} from './pdf-store.js?v=3106';
import {initParser,parsePDF} from './parser.js?v=3106';
import {createAutoBackup,getAutoBackupMeta,getFullBackupMeta,downloadDatabaseBackup,downloadCompleteBackup,restoreCompleteBackup,getArchiveStats,formatBytes,formatDate} from './backup.js?v=3106';
import {exportSync,readSyncFile,previewMerge,applyMerge,getSyncMeta} from './sync.js?v=3106';
import {regulationGroups} from './regulations.js?v=3106';
import {currentMonthKey,monthLabel,quarterFromMonth,availablePeriodMonths,ensurePeriodState,periodStatusLabel,periodStatusIcon,applyGlobalMonth} from './periods.js?v=3106';
import {cloudLogin,cloudLogout,cloudInfo,uploadLocalFirst,downloadAndMerge,syncNow,bootstrapLinkedCloud,queueCloudPush,getCloudMeta,isCloudLinked,getCloudSession,getCloudEmail,setCloudEmail,runCloudDiagnostics} from './cloud.js?v=3106';

let store=loadStore(),parsed=null,pendingPdf=null;
applyGlobalMonth(store,store.settings.activeMonth||store.settings.currentMonth||currentMonthKey());
function persistStore(){
  saveStore(store);
  createAutoBackup(store);
  const device=localStorage.getItem('smartTrackerCloudDeviceName')||localStorage.getItem('salesTrackerDeviceName')||'Dispositivo';
  queueCloudPush(()=>store,device);
}
createAutoBackup(store);
const $=id=>document.getElementById(id),money=v=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(v||0);
const pct=(v,t)=>Math.min((v/t)*100,100);

const pad=n=>String(n).padStart(2,'0');
const APP_START_QUARTER_START='2026-07-01';
const APP_START_QUARTER_KEY='2026-Q3';
function monthKey(d=new Date()){return `${d.getFullYear()}-${pad(d.getMonth()+1)}`}
function quarterInfo(d=new Date()){
 const y=d.getFullYear(),q=Math.floor(d.getMonth()/3)+1,m=(q-1)*3;
 return {key:`${y}-Q${q}`,label:`${['Gen–Mar','Apr–Giu','Lug–Set','Ott–Dic'][q-1]} ${y}`,start:`${y}-${pad(m+1)}-01`,end:new Date(y,m+3,0).toISOString().slice(0,10)}
}
function quarterFromDate(date){
 const d=new Date(date+'T12:00:00');return quarterInfo(d)
}
function ensureAutomaticPeriods(){
 const mk=monthKey(),q=quarterInfo();
 store.settings=store.settings||{};

 if(store.settings.lastAutoMonth!==mk){
   store.settings.currentMonth=mk;
   store.settings.teamMonth=mk;
   store.settings.communityMonth=mk;
   store.settings.lastAutoMonth=mk;
 }

 // L'app non consente periodi operativi precedenti a luglio 2026.
 const validQuarter=q.start>=APP_START_QUARTER_START
   ?q
   :quarterFromDate(APP_START_QUARTER_START);

 const agencyStart=store.settings.agencyPeriod?.start||'';
 const excellentStart=store.settings.excellentPeriod?.start||'';

 if(store.settings.lastAutoQuarter!==validQuarter.key || agencyStart<APP_START_QUARTER_START || excellentStart<APP_START_QUARTER_START){
   store.settings.agencyPeriod={start:validQuarter.start,end:validQuarter.end};
   store.settings.excellentPeriod={start:validQuarter.start,end:validQuarter.end};
   store.settings.lastAutoQuarter=validQuarter.key;
 }

 persistStore();
}
function quarterOptions(){
 const map=new Map();

 // Lo storico operativo dell'app parte dal trimestre luglio-settembre 2026.
 // I trimestri precedenti non sono selezionabili perché non contengono
 // pratiche caricate nell'app.
 for(const c of store.contracts||[]){
   if(c.date){
     const q=quarterFromDate(c.date);
     if(q.start>=APP_START_QUARTER_START)map.set(q.key,q);
   }
 }

 const current=quarterInfo();
 if(current.start>=APP_START_QUARTER_START)map.set(current.key,current);

 // Garantisce sempre la presenza del trimestre iniziale dell'app.
 const startQuarter=quarterFromDate(APP_START_QUARTER_START);
 map.set(APP_START_QUARTER_KEY,startQuarter);

 return [...map.values()].sort((a,b)=>b.start.localeCompare(a.start));
}
function periodKey(period){return quarterFromDate(period.start).key}
ensureAutomaticPeriods();

function kpi(label,v,t,euro=false,detailKey='',section='excellent'){
 const clickable=detailKey&&Number(v)>0;
 return `<div class="card kpi${clickable?' metric-clickable':''}"${clickable?` data-${section}-detail="${detailKey}" role="button" tabindex="0"`:''}><small>${label}</small><strong>${euro?money(v):v} / ${euro?money(t):t}</strong><div class="progress"><span style="width:${pct(v,t)}%"></span></div><small>Residuo: ${euro?money(Math.max(t-v,0)):Math.max(t-v,0)}</small></div>`
}
function allInflow(c){return c.services.reduce((a,s)=>a+inflowOf(s),0)}
function renderHome(){
 const customerCount=customerList(store).length;
 const g=generalStats(store),a=agencyStats(store),e=excellentStats(store),c=communityStats(store);
 const activeMonth=store.settings.activeMonth||store.settings.currentMonth;
 const monthContracts=(store.contracts||[])
   .filter(x=>x.status!=='Annullato'&&String(x.date||'').startsWith(activeMonth))
   .sort((x,y)=>String(y.date||'').localeCompare(String(x.date||'')))
   .slice(0,3);

 $('homeTop').innerHTML=`
 <div class="dashboard-summary">
   <div class="summary-main">
     <div class="summary-label">${monthLabel(activeMonth)}</div>
     <div class="summary-value">${money(g.inflow)}</div>
     <div class="summary-caption">Inflow del mese · ${g.contracts} contratti · ${g.pieces} prodotti/servizi</div>
   </div>
   <div class="summary-mini-grid">
     <div class="summary-mini"><small>V-Coin</small><strong>${Math.round(c.vcoins)}</strong><span>${c.ability?'Ability OK':'Ability in corso'}</span></div>
     <div class="summary-mini"><small>Excellent extra</small><strong>${money(e.variable)}</strong><span>${e.won?'Trimestre vinto':'Obiettivo in corso'}</span></div>
     <div class="summary-mini"><small>Clienti</small><strong>${customerCount}</strong><span>schede censite</span></div>
   </div>
 </div>
 ${monthContracts.length?`<div class="card recent-card">
   <div class="card-heading-row"><div><div class="section-kicker">ATTIVITÀ RECENTE</div><h3>Ultimi contratti</h3></div><button class="ghost-link" data-go="archive">Vedi tutti ›</button></div>
   ${monthContracts.map(x=>`<div class="recent-row"><div class="recent-dot"></div><div class="recent-copy"><strong>${x.client}</strong><span>${x.services?.[0]?.product||x.services?.[0]?.service||x.offer||'Contratto'}</span></div><time>${x.date?.split('-').reverse().join('/')||''}</time></div>`).join('')}
 </div>`:''}`;

 $('homeCards').innerHTML=`
 <div class="card section-link goal-card" data-go="community"><div class="goal-top"><div><small>COMMUNITY</small><strong>${Math.round(c.vcoins)} <em>V-Coin</em></strong></div><span class="status-pill ${c.ability?'ok-pill':'work-pill'}">${c.ability?'Ability OK':'In corso'}</span></div><div class="goal-progress"><span style="width:${Math.min(100,pct(c.inflow,communityRulesForMonth(activeMonth).abilityInflow))}%"></span></div><div class="goal-foot">Inflow ${money(c.inflow)} · Link ${money(c.link)}</div></div>
 <div class="card section-link goal-card" data-go="excellent"><div class="goal-top"><div><small>EXCELLENT</small><strong>${money(e.variable)} <em>extra</em></strong></div><span class="status-pill ${e.won?'ok-pill':'work-pill'}">${e.won?'Vinto':'Q3'}</span></div><div class="goal-progress"><span style="width:${Math.min(100,pct(e.variable,1000))}%"></span></div><div class="goal-foot">${e.won?'Soglia trimestre raggiunta':'Mancano '+money(Math.max(1000-e.variable,0))}</div></div>
 <div class="card section-link goal-card" data-go="agency"><div class="goal-top"><div><small>GARA AGENZIA</small><strong>${Math.round(pct(a.coreInflow,TARGETS.agency.coreInflow))}%</strong></div><span class="goal-arrow">›</span></div><div class="goal-progress"><span style="width:${pct(a.coreInflow,TARGETS.agency.coreInflow)}%"></span></div><div class="goal-foot">Inflow Core ${money(a.coreInflow)}</div></div>
 <div class="card section-link goal-card" data-go="team"><div class="goal-top"><div><small>SQUADRA</small><strong>${money(teamStats(store).Totale.inflow)}</strong></div><span class="goal-arrow">›</span></div><div class="goal-foot">Inflow del mese</div></div>
 <div class="card section-link goal-card compact-goal" data-go="archive"><div><small>ARCHIVIO</small><strong>${store.contracts.length}</strong><div class="goal-foot">contratti totali</div></div><span class="goal-arrow">›</span></div>
 <div class="card section-link goal-card compact-goal" data-go="regulations"><div><small>REGOLAMENTI</small><strong>4</strong><div class="goal-foot">campagne e storico</div></div><span class="goal-arrow">›</span></div>`;

 document.querySelectorAll('[data-go]').forEach(x=>x.onclick=()=>go(x.dataset.go));
 const hc=$('homeCustomerCount');if(hc)hc.textContent=customerCount;
}

function renderAgency(){
 const periods=quarterOptions(),selected=periodKey(store.settings.agencyPeriod);
 $('agencyPeriodSelect').innerHTML=periods.map(q=>`<option value="${q.key}" ${q.key===selected?'selected':''}>${q.label}</option>`).join('');
 $('agencyPeriodSelect').onchange=()=>{const q=periods.find(x=>x.key===$('agencyPeriodSelect').value);store.settings.agencyPeriod={start:q.start,end:q.end};persistStore();renderAgency()};
 const a=agencyStats(store);
 $('agencyGrid').innerHTML=
   kpi('SIM + Dati + Easy Rent',a.corePieces,TARGETS.agency.corePieces,false,'corePieces','agency')+
   kpi('Inflow Core',a.coreInflow,TARGETS.agency.coreInflow,true,'coreInflow','agency')+
   kpi('ADSL',a.adsl,TARGETS.agency.adsl,false,'adsl','agency')+
   kpi('One Net',a.oneNet,TARGETS.agency.oneNet,false,'oneNet','agency')+
   kpi('Energia + Gas',a.energyGas,TARGETS.agency.energyGas,false,'energyGas','agency');
 bindMetricDetails('agency');
 $('agencyHistory').innerHTML=periods.map(q=>`<div class="item agency-history-item" data-agency-quarter="${q.key}"><div><strong>${q.label}</strong><div class="muted">${q.key===selected?'Visualizzato':'Apri riepilogo'}</div></div><span>›</span></div>`).join('');
 document.querySelectorAll('[data-agency-quarter]').forEach(x=>x.onclick=()=>{const q=periods.find(p=>p.key===x.dataset.agencyQuarter);store.settings.agencyPeriod={start:q.start,end:q.end};persistStore();renderAgency();window.scrollTo(0,0)});
}
function renderExcellent(){
 const periods=quarterOptions(),selected=periodKey(store.settings.excellentPeriod);
 $('excellentPeriodSelect').innerHTML=periods.map(q=>`<option value="${q.key}" ${q.key===selected?'selected':''}>${q.label}</option>`).join('');
 $('excellentPeriodSelect').onchange=()=>{const q=periods.find(x=>x.key===$('excellentPeriodSelect').value);store.settings.excellentPeriod={start:q.start,end:q.end};persistStore();renderExcellent()};
 const e=excellentStats(store),t=TARGETS.excellent;
 $('excellentSummary').innerHTML=`<div class="card hero"><div class="muted">Premio stimato trimestre</div><strong>${money(e.totalPrize)}</strong><div class="muted">Base 1.000 € + variabile ${money(e.variable)}</div></div>
 <div class="card"><h3>Status ciclo</h3><table class="table-like"><tr><td>Trimestri storici vinti</td><td>${e.historyWon} / 8</td></tr><tr><td>Obiettivo minimo</td><td>6 / 8</td></tr><tr><td>Trimestre corrente</td><td>${e.won?'🟢 Vinto':'🟡 In corso'}</td></tr><tr><td>Ancora necessari</td><td>${e.trimestersNeeded}</td></tr><tr><td>Errori residui consentiti</td><td>2</td></tr></table></div>`;

 $('excellentGrid').innerHTML=
   kpi('Inflow totale',e.totalInflow,t.totalInflow,true,'totalInflow','excellent')+
   kpi('Mobile',e.mobile,t.mobile,false,'mobile','excellent')+
   kpi('Prospect inflow',e.prospectInflow,t.prospectInflow,true,'prospectInflow','excellent')+
   kpi('Link inflow',e.linkInflow,t.linkInflow,true,'linkInflow','excellent')+
   kpi('Solution inflow',e.solutionInflow,t.solutionInflow,true,'solutionInflow','excellent')+
   kpi('Noleggio operativo',e.easyRentPieces,t.easyRentPieces,false,'easyRentPieces','excellent');

 bindMetricDetails('excellent');

 const legacyHistory=(store.excellentHistory||[])
   .filter(h=>{
     const m=(h.period||'').match(/(\d{4}) Q([1-4])/);
     if(!m)return true;
     const q=quarterInfo(new Date(Number(m[1]),(Number(m[2])-1)*3,1));
     return q.start<APP_START_QUARTER_START;
   })
   .map(h=>`<div class="item legacy-history-item"><div><strong>${h.label}</strong><div class="muted">${h.payment}</div></div><div style="text-align:right"><strong>${money(h.total)}</strong><div class="badge ok">Vinto</div></div></div>`)
   .join('');

 const operationalHistory=periods.map(q=>`<div class="item excellent-history-item" data-excellent-quarter="${q.key}"><div><strong>${q.label}</strong><div class="muted">${q.key===selected?'Visualizzato':'Apri riepilogo'}</div></div><div style="text-align:right"><span>›</span></div></div>`).join('');

 $('excellentHistory').innerHTML=legacyHistory+operationalHistory;

 document.querySelectorAll('[data-excellent-quarter]').forEach(x=>x.onclick=()=>{
   const q=periods.find(p=>p.key===x.dataset.excellentQuarter);
   store.settings.excellentPeriod={start:q.start,end:q.end};
   persistStore();
   renderExcellent();
   window.scrollTo(0,0);
 })
}


const excellentDetailLabels={
 totalInflow:'Pratiche incluse nell’inflow totale',
 mobile:'Pratiche incluse nel target Mobile',
 prospectInflow:'Pratiche incluse nell’inflow Prospect',
 linkInflow:'Pratiche incluse nel Link inflow',
 solutionInflow:'Pratiche incluse nel Solution inflow',
 easyRentPieces:'Pratiche incluse nel Noleggio operativo'
};

function bindMetricDetails(section){
 document.querySelectorAll(`[data-${section}-detail]`).forEach(card=>{
   const open=()=>renderMetricDetail(section,card.dataset[`${section}Detail`],card);
   card.onclick=open;
   card.onkeydown=e=>{
     if(e.key==='Enter'||e.key===' '){
       e.preventDefault();
       open();
     }
   };
 });
}


const agencyDetailLabels={
 corePieces:'Pratiche incluse in SIM + Dati + Easy Rent',
 coreInflow:'Pratiche incluse nell’Inflow Core',
 adsl:'Pratiche incluse nel target ADSL',
 oneNet:'Pratiche incluse nel target One Net',
 energyGas:'Pratiche incluse nel target Energia + Gas'
};

const communityDetailLabels={
 totalVcoins:'Composizione dei V-Coin stimati',
 baseVcoins:'V-Coin base derivanti dall’inflow',
 inflow:'Pratiche incluse nell’inflow Community',
 link:'Pratiche incluse nell’inflow Link',
 mnp:'Boost V-Coin MNP',
 prospect:'Boost V-Coin Prospect',
 easyRent:'Boost V-Coin Easy Rent',
 other:'Altri boost V-Coin',manualFlash:'Gare Flash manuali',manualCourses:'Corsi obbligatori manuali'
};

function renderMetricDetail(section,key,card){
 if(section==='excellent')return renderExcellentDetail(key,card);
 if(section==='community'&&(key==='manualFlash'||key==='manualCourses')){
   const month=store.settings.communityMonth;
   const manual=store.communityManualExtras?.[month]||{};
   const value=key==='manualFlash'?Number(manual.flashVcoins||0):Number(manual.courseVcoins||0);
   if(value<=0)return;
   const note=key==='manualFlash'?(manual.flashNote||''):(manual.courseNote||'');
   const verified=key==='manualFlash'?!!manual.flashVerified:!!manual.courseVerified;
   const detail=$('communityDetail');
   detail.classList.remove('hidden');
   detail.innerHTML=`<div class="card excellent-detail-card"><div class="excellent-detail-head"><div><h3>${key==='manualFlash'?'Gare Flash manuali':'Corsi obbligatori manuali'}</h3><div class="muted">${month}</div></div><button class="excellent-close metric-close">×</button></div><div class="excellent-detail-row"><div class="excellent-detail-main"><div><div class="excellent-detail-client">Inserimento manuale</div><div class="excellent-detail-product">${note||'Nessuna nota'}</div></div><div class="excellent-detail-value">${value} V-Coin</div></div><div class="excellent-detail-meta">Verificato sul portale: ${verified?'Sì':'No'}</div></div></div>`;
   detail.querySelector('.metric-close').onclick=()=>{detail.classList.add('hidden');detail.innerHTML=''};
   detail.scrollIntoView({behavior:'smooth',block:'start'});return;
 }
 const source=section==='agency'?agencyBreakdown(store):communityBreakdown(store);
 const rows=source[key]||[];
 if(!rows.length)return;

 document.querySelectorAll('.metric-open').forEach(x=>x.classList.remove('metric-open'));
 card.classList.add('metric-open');

 const detail=$(section==='agency'?'agencyDetail':'communityDetail');
 const labels=section==='agency'?agencyDetailLabels:communityDetailLabels;
 const pieceMetric=rows[0]?.metricType==='pieces';
 const vcoinMetric=rows[0]?.metricType==='vcoins';
 const total=rows.reduce((a,r)=>a+Number(r.metricValue||0),0);

 detail.classList.remove('hidden');
 detail.innerHTML=`<div class="card excellent-detail-card">
   <div class="excellent-detail-head">
     <div>
       <h3>${labels[key]||'Dettaglio'}</h3>
       <div class="muted">${rows.length} ${rows.length===1?'voce':'voci'} utilizzate nel calcolo</div>
     </div>
     <button class="excellent-close metric-close" aria-label="Chiudi">×</button>
   </div>
   ${rows.map(r=>`<div class="excellent-detail-row">
     <div class="excellent-detail-main">
       <div>
         <div class="excellent-detail-client">${r.client}</div>
         <div class="excellent-detail-product">${r.product}</div>
       </div>
       <div class="excellent-detail-value">${
         pieceMetric?`${r.metricValue} ${r.metricValue===1?'pezzo':'pezzi'}`:
         vcoinMetric?`${Math.round(r.metricValue*100)/100} V-Coin`:
         money(r.metricValue)
       }</div>
     </div>
     <div class="excellent-detail-meta">P.IVA ${r.vat||'—'} · Codice cliente ${r.customerCode||'—'} · Offerta ${r.offer||'—'}</div>
     <div class="excellent-detail-meta">${r.date} · ${r.service} · quantità ${r.qty} · inflow ${money(r.inflow)} · ${r.agent}${r.allocationShare&&r.allocationShare<1?` · quota ${Math.round(r.allocationShare*100)}%`:''}${r.prospect?' · Prospect':''}${r.mnp?' · MNP':''}</div>
     ${r.pdfStored?`<button class="secondary open-pdf" data-pdf-id="${r.contractId}">📄 Apri PDF</button>`:''}
     ${vcoinMetric?`<div class="excellent-detail-meta">Base ${Math.round((r.basePoints||r.inflow)*100)/100} · moltiplicatore ×${r.multiplier||1} · boost +${Math.round((r.boostPoints||0)*100)/100}${r.boostType?` · ${r.boostType}`:''}</div>`:''}
   </div>`).join('')}
   <div class="excellent-detail-total">
     <span>Totale attribuito</span>
     <span>${
       pieceMetric?`${total} ${total===1?'pezzo':'pezzi'}`:
       vcoinMetric?`${Math.round(total*100)/100} V-Coin`:
       money(total)
     }</span>
   </div>
 </div>`;

 detail.querySelectorAll('.open-pdf').forEach(b=>b.onclick=async()=>{if(!await openPdf(b.dataset.pdfId))alert('PDF non disponibile su questo dispositivo')});
 detail.querySelector('.metric-close').onclick=()=>{
   detail.classList.add('hidden');
   detail.innerHTML='';
   document.querySelectorAll('.metric-open').forEach(x=>x.classList.remove('metric-open'));
 };
 detail.scrollIntoView({behavior:'smooth',block:'start'});
}

function renderExcellentDetail(key,card){
 const rows=excellentBreakdown(store)[key]||[];
 if(!rows.length)return;

 document.querySelectorAll('.metric-open').forEach(x=>x.classList.remove('metric-open'));
 card.classList.add('metric-open');

 const pieceMetric=rows[0]?.metricType==='pieces';
 const total=rows.reduce((a,r)=>a+Number(r.metricValue||0),0);
 const detail=$('excellentDetail');

 detail.classList.remove('hidden');
 detail.innerHTML=`<div class="card excellent-detail-card">
   <div class="excellent-detail-head">
     <div>
       <h3>${excellentDetailLabels[key]||'Dettaglio obiettivo'}</h3>
       <div class="muted">${rows.length} ${rows.length===1?'voce':'voci'} utilizzate nel calcolo</div>
     </div>
     <button id="closeExcellentDetail" class="excellent-close" aria-label="Chiudi">×</button>
   </div>
   ${rows.map(r=>`<div class="excellent-detail-row">
     <div class="excellent-detail-main">
       <div>
         <div class="excellent-detail-client">${r.client}</div>
         <div class="excellent-detail-product">${r.product}</div>
       </div>
       <div class="excellent-detail-value">${pieceMetric?`${r.metricValue} ${r.metricValue===1?'pezzo':'pezzi'}`:money(r.metricValue)}</div>
     </div>
     <div class="excellent-detail-meta">P.IVA ${r.vat||'—'} · Codice cliente ${r.customerCode||'—'} · Offerta ${r.offer||'—'}</div>
     <div class="excellent-detail-meta">${r.date} · ${r.service} · quantità ${r.qty} · inflow pratica ${money(r.inflow)} · ${r.agent}${r.allocationShare&&r.allocationShare<1?` · quota ${Math.round(r.allocationShare*100)}%`:''}${r.prospect?' · Prospect':''}</div>
     ${r.pdfStored?`<button class="secondary open-pdf" data-pdf-id="${r.contractId}">📄 Apri PDF</button>`:''}
   </div>`).join('')}
   <div class="excellent-detail-total">
     <span>Totale attribuito</span>
     <span>${pieceMetric?`${total} ${total===1?'pezzo':'pezzi'}`:money(total)}</span>
   </div>
 </div>`;

 detail.querySelectorAll('.open-pdf').forEach(b=>b.onclick=async()=>{if(!await openPdf(b.dataset.pdfId))alert('PDF non disponibile su questo dispositivo')});
 $('closeExcellentDetail').onclick=()=>{
   detail.classList.add('hidden');
   detail.innerHTML='';
   document.querySelectorAll('.metric-open').forEach(x=>x.classList.remove('metric-open'));
 };

 detail.scrollIntoView({behavior:'smooth',block:'start'});
}

function teamMetricRow(agent,label,value,key,euro=false){
 const clickable=Number(value)>0;
 return `<tr class="${clickable?'metric-table-row':''}"${clickable?` data-team-agent="${agent}" data-team-key="${key}" role="button" tabindex="0"`:''}><td>${label}</td><td>${euro?money(value):value}${clickable?' ›':''}</td></tr>`;
}
function renderTeam(){
 const months=availableMonths(store),selected=store.settings.teamMonth||months[0];
 $('teamMonthSelect').innerHTML=months.map(m=>`<option value="${m}" ${m===selected?'selected':''}>${new Date(m+'-01T12:00:00').toLocaleDateString('it-IT',{month:'long',year:'numeric'})}</option>`).join('');
 const t=teamStats(store,selected),total=t.Totale;
 $('teamSummary').innerHTML=`<div class="card hero"><div class="muted">Totale squadra — ${new Date(selected+'-01T12:00:00').toLocaleDateString('it-IT',{month:'long',year:'numeric'})}</div><strong>${money(total.inflow)}</strong><div class="muted">${total.contracts} contratti · ${total.products} prodotti/pezzi</div></div>`;
 $('teamCards').innerHTML=(store.settings.agents||['Francesco','Jacopo','Luciano']).map(agent=>{
   const x=t[agent];
   return `<div class="card"><h3>${agent}</h3><table class="table-like">
   ${teamMetricRow(agent,'Inflow',x.inflow,'inflow',true)}
   ${teamMetricRow(agent,'Contratti',x.contracts,'contracts')}
   ${teamMetricRow(agent,'Prodotti/pezzi',x.products,'products')}
   ${teamMetricRow(agent,'SIM Voce',x.simVoice,'simVoice')}
   ${teamMetricRow(agent,'SIM Dati',x.simData,'simData')}
   ${teamMetricRow(agent,'M2M',x.m2m,'m2m')}
   ${teamMetricRow(agent,'Connettività',x.adsl,'adsl')}
   ${teamMetricRow(agent,'One Net',x.oneNet,'oneNet')}
   ${teamMetricRow(agent,'Easy Rent',x.easyRent,'easyRent')}
   ${teamMetricRow(agent,'Easy Deal',x.easyDeal,'easyDeal')}
   ${teamMetricRow(agent,'Digitali',x.digital||0,'digital',true)}
   </table></div>`;
 }).join('');
 $('teamHistory').innerHTML=months.map(m=>`<div class="item team-history-item" data-team-month="${m}"><div><strong>${new Date(m+'-01T12:00:00').toLocaleDateString('it-IT',{month:'long',year:'numeric'})}</strong></div><span>›</span></div>`).join('');
 $('teamMonthSelect').onchange=()=>{store.settings.teamMonth=$('teamMonthSelect').value;persistStore();renderTeam()};
 document.querySelectorAll('[data-team-month]').forEach(x=>x.onclick=()=>{store.settings.teamMonth=x.dataset.teamMonth;persistStore();renderTeam();window.scrollTo(0,0)});
 document.querySelectorAll('[data-team-agent]').forEach(row=>row.onclick=()=>renderTeamDetail(row.dataset.teamAgent,row.dataset.teamKey,row));
}
function renderTeamDetail(agent,key,row){
 const month=store.settings.teamMonth,rows=teamBreakdown(store,month,agent,key);
 if(!rows.length)return;
 document.querySelectorAll('.metric-open').forEach(x=>x.classList.remove('metric-open'));row.classList.add('metric-open');
 const detail=$('teamDetail'),piece=rows[0].metricType==='pieces',contracts=rows[0].metricType==='contracts';
 const total=rows.reduce((a,r)=>a+Number(r.metricValue||0),0);
 detail.classList.remove('hidden');
 detail.innerHTML=`<div class="card excellent-detail-card"><div class="excellent-detail-head"><div><h3>${agent} — dettaglio ${key}</h3><div class="muted">${rows.length} voci</div></div><button class="excellent-close">×</button></div>
 ${rows.map(r=>`<div class="excellent-detail-row"><div class="excellent-detail-main"><div><div class="excellent-detail-client">${r.client}</div><div class="excellent-detail-product">${r.product}</div></div><div class="excellent-detail-value">${contracts?'1 pratica':piece?`${r.metricValue} pezzi`:money(r.metricValue)}</div></div>
 <div class="excellent-detail-meta">P.IVA ${r.vat||'—'} · Codice cliente ${r.customerCode||'—'} · Offerta ${r.offer||'—'}</div>
 <div class="excellent-detail-meta">${r.date} · ${r.service} · quantità ${r.qty} · inflow ${money(r.inflow)} · Gara Agenzia ${r.includeAgency===false?'No':'Sì'}${r.prospect?' · Prospect':''}${r.mnp?' · MNP':''}</div>
 ${r.pdfStored?`<button class="secondary open-pdf" data-pdf-id="${r.contractId}">📄 Apri PDF</button>`:''}</div>`).join('')}
 <div class="excellent-detail-total"><span>Totale</span><span>${contracts?`${total} pratiche`:piece?`${total} pezzi`:money(total)}</span></div></div>`;
 detail.querySelectorAll('.open-pdf').forEach(b=>b.onclick=async()=>{if(!await openPdf(b.dataset.pdfId))alert('PDF non disponibile su questo dispositivo')});
 detail.querySelector('.excellent-close').onclick=()=>{detail.classList.add('hidden');detail.innerHTML='';row.classList.remove('metric-open')};
 detail.scrollIntoView({behavior:'smooth',block:'start'});
}

function communityRow(label,value,key,suffix=''){
 const clickable=Number(value)>0;
 return `<tr class="${clickable?'metric-table-row':''}"${clickable?` data-community-detail="${key}" role="button" tabindex="0"`:''}><td>${label}</td><td>${suffix}${Math.round(value*100)/100}${clickable?' ›':''}</td></tr>`;
}
function communityAbilityRow(label,value,key){
 const clickable=Number(value)>0;
 return `<tr class="${clickable?'metric-table-row':''}"${clickable?` data-community-detail="${key}" role="button" tabindex="0"`:''}><td>${label}</td><td>${money(value)}${clickable?' ›':''}</td></tr>`;
}
function renderCommunity(){
 const c=communityStats(store);
 const communityMonth=store.settings.communityMonth||store.settings.activeMonth;
 const rules=communityRulesForMonth(communityMonth);
 const courseStatus=rules.mandatoryCourses?'Corsi obbligatori previsti':'Nessun corso obbligatorio previsto';
 $('communitySummary').innerHTML=`<div class="card hero metric-clickable" data-community-detail="totalVcoins" role="button" tabindex="0"><div class="muted">V-Coin stimati · ${monthLabel(communityMonth)}</div><strong>${Math.round(c.vcoins)}</strong><div class="muted">Automatici ${Math.round(c.automaticVcoins)} · Extra manuali ${Math.round(c.manualExtras)}</div></div>
 <div class="card"><h3>Ability · ${monthLabel(communityMonth)}</h3><table class="table-like">
 ${communityAbilityRow(`Inflow minimo ${rules.abilityInflow} €`,c.inflow,'inflow')}
 ${communityAbilityRow(`Link minimo ${rules.abilityLinkInflow} €`,c.link,'link')}
 <tr><td>${courseStatus}</td><td>${rules.mandatoryCourses?'Da verificare':'✓'}</td></tr>
 </table></div>`;
 $('communityBoosts').innerHTML=`<div class="card"><h3>V-Coin e boost</h3><table class="table-like">
 ${communityRow('V-Coin base',c.inflow,'baseVcoins')}
 ${communityRow('Boost MNP',c.boosts.mnp,'mnp','+')}
 ${communityRow('Boost Prospect',c.boosts.prospect,'prospect','+')}
 ${communityRow('Boost Easy Rent ×2',c.boosts.easyRent,'easyRent','+')}<tr><td><strong>Easy Rent · V-Coin totali</strong><div class="muted">Base + boost ×2</div></td><td><strong>${Math.round(c.boosts.easyRent*2*100)/100}</strong></td></tr>
 ${communityRow('Altri boost',c.boosts.other,'other','+')} ${communityRow('Gare Flash manuali',c.flashVcoins,'manualFlash','+')} ${communityRow('Corsi obbligatori manuali',c.courseVcoins,'manualCourses','+')}
 </table></div>`;
 $('communityCompare').innerHTML=`<div class="card"><h3>Confronto portale</h3><label>V-Coin ufficiali dichiarati</label><input id="officialVcoins" type="number" value="${store.officialCommunity.vcoins??''}" placeholder="Inserisci dato portale"><button id="saveOfficial" class="secondary" style="margin-top:10px">Salva confronto</button>${c.difference==null?'':`<div class="note" style="margin-top:10px">Differenza portale − app: <strong>${Math.round(c.difference)}</strong> V-Coin</div>`}</div>`;
 const month=store.settings.communityMonth;
 const manual=store.communityManualExtras?.[month]||{};
 $('communityFlashVcoins').value=Number(manual.flashVcoins||0);
 $('communityCourseVcoins').value=Number(manual.courseVcoins||0);
 $('communityFlashNote').value=manual.flashNote||'';
 $('communityCourseNote').value=manual.courseNote||'';
 $('communityFlashVerified').checked=!!manual.flashVerified;
 $('communityCourseVerified').checked=!!manual.courseVerified;
 $('communityExtrasStatus').textContent=`Mese: ${month} · Extra totali ${Math.round(c.manualExtras)} V-Coin`;
 $('saveCommunityExtras').onclick=()=>{
   store.communityManualExtras=store.communityManualExtras||{};
   store.communityManualExtras[month]={
     flashVcoins:Number($('communityFlashVcoins').value||0),
     courseVcoins:Number($('communityCourseVcoins').value||0),
     flashNote:$('communityFlashNote').value.trim(),
     courseNote:$('communityCourseNote').value.trim(),
     flashVerified:$('communityFlashVerified').checked,
     courseVerified:$('communityCourseVerified').checked,
     updatedAt:new Date().toISOString()
   };
   persistStore();renderCommunity();alert('Extra Community salvati per '+month);
 };
 bindMetricDetails('community');
 $('saveOfficial').onclick=()=>{store.officialCommunity.vcoins=Number($('officialVcoins').value||0);store.officialCommunity.updatedAt=new Date().toISOString();persistStore();renderCommunity()}
}
function archiveItem(c){
 return `<div class="card"><div class="item"><div><strong>${c.client}</strong><div class="muted">${c.offer||'Senza offerta'} · ${c.date}</div><div class="muted">P.IVA ${c.vat||'—'} · Codice cliente ${c.customerCode||'—'}</div><div class="muted">${c.services.map(s=>`${s.service} ×${s.qty}${s.service==='SIM Voce'&&s.mnp?' MNP':''}`).join(' · ')}</div><div class="muted">${(c.teamAllocations||[{agent:c.agent||'Francesco',share:1}]).map(a=>`${a.agent} ${Math.round(Number(a.share||0)*100)}%`).join(' + ')} · Gara Agenzia ${c.includeAgency===false?'No':'Sì'}</div></div><div style="text-align:right"><strong>${money(allInflow(c))}</strong><br><span class="badge ${c.status==='Valido'?'ok':'warn'}">${c.status}</span></div></div><div class="actions">${c.pdfStored?`<button class="secondary" data-open-pdf="${c.id}">📄 Apri PDF</button>`:''}<button class="secondary" data-edit="${c.id}">Modifica attributi</button><button class="danger" data-del="${c.id}">Elimina</button></div></div>`
}

function customerSearchText(d){
 return [d.client,d.vat,d.customerCode,...(d.contractsList||[]).flatMap(c=>[c.offer,c.pdfRef,...(c.services||[]).flatMap(x=>[x.service,x.product,x.category])])].join(' ').toLowerCase();
}
function renderCustomers(){
 const list=$('customerList'),dash=$('customerDashboard');if(!list||!dash)return;
 const q=($('globalCustomerSearch')?.value||'').trim().toLowerCase();
 const rows=customerList(store).filter(d=>!q||customerSearchText(d).includes(q));
 list.classList.remove('hidden');dash.classList.add('hidden');
 list.innerHTML=rows.length?rows.map(d=>`<div class="card customer-list-card" data-customer-key="${encodeURIComponent(d.key)}"><div class="customer-head"><div><div class="customer-name">${d.client}</div><div class="muted">P.IVA ${d.vat||'—'} · Codice cliente ${d.customerCode||'—'}</div></div><strong>${money(d.inflow)}</strong></div><div class="muted" style="margin-top:8px">${d.contracts} contratti · ${d.pieces} pezzi/servizi · ${Math.round(d.vcoins)} V-Coin</div></div>`).join(''):'<div class="card"><div class="note">Nessun cliente trovato.</div></div>';
 document.querySelectorAll('[data-customer-key]').forEach(x=>x.onclick=()=>openCustomerDashboard(decodeURIComponent(x.dataset.customerKey)));
 const search=$('globalCustomerSearch');if(search&&!search.dataset.bound){search.dataset.bound='1';search.addEventListener('input',renderCustomers)}
}
function opportunitySuggestions(d){
 const m=d.productMix||{},mobile=(m['SIM Voce']||0)+(m['SIM Dati']||0)+(m['SIM M2M']||0),tips=[];
 if(mobile>=3&&!((m['One Net Ufficio']||0)+(m['One Net Azienda']||0)))tips.push('Cliente mobile senza One Net.');
 if(mobile>=3&&!(m['Easy Rent']||0))tips.push('Cliente con più SIM ma senza Easy Rent.');
 if(!((m['Energia']||0)+(m['Gas']||0)))tips.push('Nessuna fornitura Energia/Gas registrata.');
 return tips;
}
function openCustomerDashboard(key){
 const d=customerDashboard(store,key);if(!d)return;
 const list=$('customerList'),dash=$('customerDashboard');list.classList.add('hidden');dash.classList.remove('hidden');
 const years=[...new Set(d.contractsList.map(c=>(c.date||'').slice(0,4)).filter(Boolean))].sort().reverse();
 const services=[...new Set(d.contractsList.flatMap(c=>(c.services||[]).map(x=>x.service)).filter(Boolean))].sort();
 const tips=opportunitySuggestions(d);
 dash.innerHTML=`<button class="secondary customer-back">← Torna ai clienti</button><div class="card"><div class="customer-head"><div><h3 style="margin:0">${d.client}</h3><div class="muted">P.IVA ${d.vat||'—'} · Codice cliente ${d.customerCode||'—'}</div><div class="muted">${d.prospect?'Prospect rilevato':'Cliente censito'} · Prima ${d.firstDate||'—'} · Ultima ${d.lastDate||'—'}</div></div></div><div class="customer-kpis"><div class="customer-kpi"><small>Inflow totale</small><strong>${money(d.inflow)}</strong></div><div class="customer-kpi"><small>Contratti</small><strong>${d.contracts}</strong></div><div class="customer-kpi"><small>Pezzi/servizi</small><strong>${d.pieces}</strong></div><div class="customer-kpi"><small>V-Coin stimati</small><strong>${Math.round(d.vcoins)}</strong></div><div class="customer-kpi"><small>Excellent inflow</small><strong>${money(d.excellentInflow)}</strong></div><div class="customer-kpi"><small>Gara Agenzia</small><strong>${money(d.agencyInflow)}</strong></div></div></div>
 <div class="card customer-opportunities"><h3>Opportunità rilevate</h3>${tips.length?tips.map(t=>`<div class="note" style="margin-top:8px">${t}</div>`).join(''):'<div class="muted">Nessuna opportunità automatica evidente.</div>'}</div>
 <div class="card"><h3>Filtri timeline</h3><div class="customer-filters"><div><label>Anno</label><select id="customerYearFilter"><option value="">Tutti</option>${years.map(y=>`<option>${y}</option>`).join('')}</select></div><div><label>Servizio</label><select id="customerServiceFilter"><option value="">Tutti</option>${services.map(x=>`<option>${x}</option>`).join('')}</select></div></div></div><div class="card"><h3>Timeline pratiche</h3><div id="customerTimeline"></div></div>`;
 dash.querySelector('.customer-back').onclick=()=>{dash.classList.add('hidden');list.classList.remove('hidden')};
 const timeline=()=>{const y=$('customerYearFilter').value,sv=$('customerServiceFilter').value,cs=d.contractsList.filter(c=>(!y||(c.date||'').startsWith(y))&&(!sv||(c.services||[]).some(x=>x.service===sv)));
 $('customerTimeline').innerHTML=cs.length?cs.map(c=>{const total=(c.services||[]).reduce((a,x)=>a+inflowOf(x),0);return `<div class="customer-timeline-item"><div class="customer-head"><div><strong>${c.date||'—'} · ${c.offer||'Senza numero offerta'}</strong><div class="muted">${c.agent||'Francesco'} · Gara Agenzia ${c.includeAgency===false?'No':'Sì'}${c.prospect?' · Prospect':''}</div></div><strong>${money(total)}</strong></div>${(c.services||[]).map(x=>`<div class="customer-product-row"><span>${x.product||x.service} · ${x.qty||1}${x.service==='SIM Voce'&&x.mnp?' · MNP':''}</span><strong>${money(inflowOf(x))}</strong></div>`).join('')}${c.pdfStored?`<button class="secondary open-customer-pdf" data-pdf-id="${c.id}" style="margin-top:10px">📄 Apri PDF</button>`:''}</div>`}).join(''):'<div class="muted">Nessuna pratica con questi filtri.</div>';
 dash.querySelectorAll('.open-customer-pdf').forEach(b=>b.onclick=async()=>{if(!await openPdf(b.dataset.pdfId))alert('PDF non disponibile su questo dispositivo')})};
 $('customerYearFilter').onchange=timeline;$('customerServiceFilter').onchange=timeline;timeline();dash.scrollIntoView({behavior:'smooth',block:'start'});
}
function renderArchive(){
 const q=($('archiveSearch').value||'').toLowerCase();
 const agent=$('archiveAgent')?.value||'Tutti';
 const agency=$('archiveAgency')?.value||'Tutti';
 const rows=[...store.contracts].reverse().filter(c=>{
   const text=(c.client+' '+c.offer+' '+c.vat+' '+(c.customerCode||'')+' '+c.services.map(s=>s.product).join(' ')).toLowerCase();
   const agentOk=agent==='Tutti'||(c.agent||'Francesco')===agent;
   const included=c.includeAgency!==false;
   const agencyOk=agency==='Tutti'||(agency==='Inclusi'&&included)||(agency==='Esclusi'&&!included);
   return text.includes(q)&&agentOk&&agencyOk;
 });
 $('archiveList').innerHTML=rows.length?rows.map(archiveItem).join(''):'<div class="card muted">Nessun contratto.</div>';
 document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(confirm('Eliminare il contratto?')){await deletePdf(b.dataset.del).catch(()=>{});store.contracts=store.contracts.filter(c=>c.id!==b.dataset.del);persistStore();renderAll()}});
 document.querySelectorAll('[data-open-pdf]').forEach(b=>b.onclick=async()=>{if(!await openPdf(b.dataset.openPdf))alert('PDF non disponibile su questo dispositivo')});
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editAttrs(b.dataset.edit))
}
function editAttrs(id){
 const c=store.contracts.find(x=>x.id===id);if(!c)return;
 const prospect=confirm(`Cliente ${c.client}\n\nImpostare Prospect = SÌ?\nOK = Sì, Annulla = No`);
 const agent=prompt('Agente di riferimento: Francesco, Jacopo o Luciano',c.agent||'Francesco')||c.agent||'Francesco';
 const includeAgency=confirm('Valido per Gara Agenzia?\nOK = Sì, Annulla = No');
 c.prospect=prospect;c.agent=agent;c.includeAgency=includeAgency;c.updatedAt=new Date().toISOString();persistStore();renderAll()
}
function renderPreview(){
 $('previewBox').classList.remove('hidden');
 const hasDigitalSolution=(parsed.rows||[]).some(r=>
   r.service==='Solution' ||
   /soluzioni digitali|solution security/i.test(r.category||'') ||
   /smart digital marketing|movylo|lookout/i.test(r.product||'')
 );
 const splitBox=$('digitalSplitBox');
 splitBox.classList.toggle('hidden',!hasDigitalSolution);
 splitBox.style.display=hasDigitalSolution?'block':'none';
 $('teamSplit').value='none';

 const badge=$('confidenceBadge');badge.className='badge '+(parsed.confidence==='green'?'ok':parsed.confidence==='yellow'?'warn':'bad');badge.textContent=parsed.confidence==='green'?'🟢 Alta affidabilità':parsed.confidence==='yellow'?'🟡 Verifica richiesta':'🔴 Manuale';
 $('previewMeta').innerHTML=`<strong>${parsed.meta.client||'Cliente da verificare'}</strong><br>P.IVA ${parsed.meta.vat||'—'} · Codice cliente ${parsed.meta.customerCode||'—'} · Offerta ${parsed.meta.offer||'—'}`;
 $('previewRows').innerHTML=parsed.rows.length
   ?parsed.rows.map(r=>`<div class="preview-row"><div class="row"><div><label>Servizio</label><select class="pr-service">${['SIM Voce','SIM Dati','SIM M2M','Easy Rent','Easy Deal','ADSL','One Net Ufficio','One Net Azienda','Solution','Energia','Gas','Altro'].map(x=>`<option ${x===r.service?'selected':''}>${x}</option>`).join('')}</select></div><div><label>Quantità</label><input class="pr-qty" type="number" value="${r.qty}"></div></div><label>Prodotto</label><input class="pr-product" value="${r.product}"><label>Categoria</label><input class="pr-category" value="${r.category||''}">${r.service==='SIM Voce'?`<label>MNP</label><select class="pr-mnp"><option ${r.mnp?'':'selected'}>No</option><option ${r.mnp?'selected':''}>Sì</option></select>`:''}<label>Inflow unitario €</label><input class="pr-inflow" type="number" step="0.01" value="${r.inflowUnit||0}"><div class="calc">${r.calc||''}</div></div>`).join('')
   :`<div class="note">${(parsed.warnings&&parsed.warnings[0])||'Inserimento manuale richiesto.'}</div>`;
 const suggestedProspect=!!parsed.meta.prospectSuggested;
 $('prospect').value=suggestedProspect?'Sì':'No';
 const prospectHint=$('prospectHint');
 if(prospectHint){
   prospectHint.className='field-hint '+(suggestedProspect?'prospect-auto-yes':'prospect-auto-no');
   prospectHint.textContent=parsed.meta.prospectReason||'Prospect modificabile manualmente';
 }
 $('agent').value='Francesco';
 $('includeAgency').value='Sì';
 $('teamSplit').value='none';
}
async function handlePDF(file){
 pendingPdf=file;
 $('pdfLoader').style.display='block';
 $('pdfStatus').textContent='Analisi in corso…';
 $('previewBox').classList.add('hidden');
 try{
   parsed=await parsePDF(file);
   renderPreview();
   $('pdfStatus').textContent=parsed.imageOnly
     ?'PDF scansionato: testo non leggibile automaticamente.'
     :`${parsed.rows.length} ${parsed.rows.length===1?'riga proposta':'righe proposte'}.`;
 }catch(e){
   console.error(e);
   $('pdfStatus').textContent='Errore durante la lettura del PDF.';
 }finally{
   $('pdfLoader').style.display='none';
 }
}
async function saveParsed(){
 if(!parsed)return;
 const rows=[...document.querySelectorAll('.preview-row')];
 const prospect=$('prospect').value==='Sì';
 const agent=$('agent').value||'Francesco';
 const includeAgency=$('includeAgency').value==='Sì';
 const splitMode=$('teamSplit')?.value||'none';
 const teamAllocations=splitMode==='fj'
   ?[{agent:'Francesco',share:.5},{agent:'Jacopo',share:.5}]
   :splitMode==='jl'
     ?[{agent:'Jacopo',share:.5},{agent:'Luciano',share:.5}]
     :[{agent,share:1}];
 const nowIso=new Date().toISOString();
 const contract={id:'C-'+Date.now(),createdAt:nowIso,updatedAt:nowIso,date:$('contractDate').value,offer:parsed.meta.offer,client:parsed.meta.client||'Da verificare',vat:parsed.meta.vat,customerCode:parsed.meta.customerCode||'',prospect,agent,includeAgency,teamAllocations,status:'Valido',pdfRef:parsed.filename,pdfStored:false,notes:'SmartTracker 3.10.6',services:[]};
 for(const el of rows){
   const service=el.querySelector('.pr-service').value;
   const mnpEl=el.querySelector('.pr-mnp');
   contract.services.push({id:'S-'+Math.random().toString(36).slice(2),service,product:el.querySelector('.pr-product').value,category:el.querySelector('.pr-category').value,qty:Number(el.querySelector('.pr-qty').value||1),inflowUnit:Number(el.querySelector('.pr-inflow').value||0),mnp:service==='SIM Voce'&&mnpEl?mnpEl.value==='Sì':false,confidence:parsed.confidence,calc:''});
 }
 if(pendingPdf){
   try{await savePdf(contract.id,pendingPdf);contract.pdfStored=true}catch(e){console.error('PDF non salvato',e)}
 }
 store.contracts.push(contract);persistStore();pendingPdf=null;$('previewBox').classList.add('hidden');$('pdfInput').value='';renderAll();go('home');alert(contract.pdfStored?'Contratto e PDF salvati':'Contratto salvato; PDF non disponibile')
}
function go(id){document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));$(id).classList.add('active');document.querySelector(`nav button[data-view="${id}"]`)?.classList.add('active');window.scrollTo(0,0)}
function exportBackup(){const a=document.createElement('a'),blob=new Blob([JSON.stringify(store,null,2)],{type:'application/json'});a.href=URL.createObjectURL(blob);a.download='sales-tracker-2-backup.json';a.click()}
async function importBackup(file){const obj=JSON.parse(await file.text());store=importBackupObject(obj);persistStore();renderAll();alert('Backup importato')}


function fullBackupTrafficLight(meta){
  if(!meta?.createdAt){
    return {
      level:'red',
      label:'Backup necessario',
      detail:'Nessun backup completo eseguito'
    };
  }

  const created=new Date(meta.createdAt);
  const now=new Date();
  const diffMs=Math.max(0,now-created);
  const days=Math.floor(diffMs/86400000);

  if(days<=3){
    return {
      level:'green',
      label:'Aggiornato',
      detail:days===0?'Backup fatto oggi':`Backup fatto ${days} ${days===1?'giorno':'giorni'} fa`
    };
  }

  if(days<=7){
    return {
      level:'yellow',
      label:'Da aggiornare',
      detail:`Ultimo backup completo ${days} giorni fa`
    };
  }

  return {
    level:'red',
    label:'Backup necessario',
    detail:`Ultimo backup completo ${days} giorni fa`
  };
}


function cloudStatusView(info){
 const badge=$('cloudBadge'),badgeText=$('cloudBadgeText');
 const login=$('cloudLoginBox'),connected=$('cloudConnectedBox');
 if(!badge||!login||!connected)return;

 if(!info.loggedIn){
   badge.className='cloud-status cloud-status-off';
   badgeText.textContent='Non collegato';
   login.classList.remove('hidden');
   connected.classList.add('hidden');
   return;
 }

 login.classList.add('hidden');
 connected.classList.remove('hidden');

 const row=info.row;
 const linked=info.linked;
 const hasCloud=!!row?.data;
 const err=info.error||info.meta?.lastError;

 badge.className=`cloud-status ${err?'cloud-status-warn':linked?'cloud-status-on':'cloud-status-ready'}`;
 badgeText.textContent=err?'Offline':linked?'Sincronizzato':'Accesso OK';

 $('cloudInfo').innerHTML=hasCloud
   ?`<strong>Cloud pronto</strong><br>${row.data?.contracts?.length||0} contratti · aggiornato ${formatDate(row.updated_at)}`
   :'<strong>Cloud vuoto</strong><br>Questo può diventare il dispositivo master per la prima migrazione.';

 $('cloudEmptyActions').classList.toggle('hidden',hasCloud);
 $('cloudExistingActions').classList.toggle('hidden',!hasCloud);

 const deviceInput=$('cloudDeviceName');
 if(deviceInput&&!deviceInput.value){
   deviceInput.value=localStorage.getItem('smartTrackerCloudDeviceName')||localStorage.getItem('salesTrackerDeviceName')||'';
 }

 const m=info.meta||getCloudMeta();
 $('cloudLastStatus').textContent=err
   ?`Cloud non raggiungibile: ${err}. I dati locali continuano a funzionare.`
   :m?.lastSyncAt
     ?`Ultima sincronizzazione: ${formatDate(m.lastSyncAt)} · ${m.contracts||0} contratti`
     :'Nessuna sincronizzazione Cloud completata';
}

async function renderCloud(){
 const email=$('cloudEmail');if(!email)return;
 email.value=getCloudEmail()||email.value||'';
 const info=await cloudInfo();
 cloudStatusView(info);

 $('cloudLogin').dataset.cloudBound='1';
 $('cloudLogin').onclick=async()=>{
   const btn=$('cloudLogin');
   const email=($('cloudEmail').value||'').trim();
   const password=$('cloudPassword').value;
   if(!email)return alert('Inserisci l’email Cloud.');
   if(!password)return alert('Inserisci la password Supabase.');
   setCloudEmail(email);
   btn.disabled=true;btn.textContent='Test Cloud…';

   const diagBox=$('cloudDiagnostics');
   if(diagBox){
     diagBox.classList.remove('hidden');
     diagBox.innerHTML='<div class="muted">Verifica connessione in corso…</div>';
   }

   try{
     const result=await runCloudDiagnostics(email,password);
     if(diagBox){
       diagBox.innerHTML=result.steps.map(s=>`
         <div class="cloud-diag-row ${s.ok?'cloud-diag-ok':'cloud-diag-ko'}">
           <span>${s.ok?'✓':'✕'}</span>
           <div><strong>${s.label}</strong>${s.detail?`<small>${s.detail}</small>`:''}</div>
         </div>`).join('');
     }
     if(!result.ok){
       alert(`SmartTracker Cloud: ${result.error}`);
       return;
     }

     $('cloudPassword').value='';
     alert('Login Cloud riuscito.');
     await renderCloud();
   }catch(e){
     console.error(e);
     if(diagBox)diagBox.innerHTML+=`<div class="cloud-diag-row cloud-diag-ko"><span>✕</span><div><strong>Errore inatteso</strong><small>${e.message||e}</small></div></div>`;
     alert(e.message||'Test Cloud non riuscito.');
   }finally{
     btn.disabled=false;btn.textContent='Accedi a SmartTracker Cloud';
   }
 };

 $('cloudUploadFirst').onclick=async()=>{
   const device=($('cloudDeviceName').value||'Dispositivo').trim();
   localStorage.setItem('smartTrackerCloudDeviceName',device);
   if(!confirm(`Caricare nel Cloud i ${store.contracts.length} contratti presenti su questo dispositivo?`))return;
   const btn=$('cloudUploadFirst');btn.disabled=true;btn.textContent='Caricamento…';
   try{
     await uploadLocalFirst(store,device);
     alert(`Cloud inizializzato con ${store.contracts.length} contratti.`);
     await renderCloud();
   }catch(e){console.error(e);alert(e.message||'Caricamento Cloud non riuscito.')}
   finally{btn.disabled=false;btn.textContent='Carica i dati locali nel Cloud'}
 };

 $('cloudDownloadMerge').onclick=async()=>{
   const device=($('cloudDeviceName').value||'Dispositivo').trim();
   localStorage.setItem('smartTrackerCloudDeviceName',device);
   const btn=$('cloudDownloadMerge');btn.disabled=true;btn.textContent='Sincronizzazione…';
   try{
     const result=await downloadAndMerge(store,device);
     store=result.store;
     saveStore(store);createAutoBackup(store);
     renderAll();
     alert(`Cloud unito con successo. Totale: ${store.contracts.length} contratti.`);
   }catch(e){console.error(e);alert(e.message||'Sincronizzazione Cloud non riuscita.')}
   finally{btn.disabled=false;btn.textContent='Scarica e unisci dal Cloud'}
 };

 $('cloudSyncNow').onclick=async()=>{
   const device=($('cloudDeviceName').value||'Dispositivo').trim();
   localStorage.setItem('smartTrackerCloudDeviceName',device);
   const btn=$('cloudSyncNow');btn.disabled=true;btn.textContent='Sync…';
   try{
     const result=await syncNow(store,device,'local');
     store=result.store;
     saveStore(store);createAutoBackup(store);
     renderAll();
     alert('SmartTracker Cloud sincronizzato.');
   }catch(e){console.error(e);alert(e.message||'Sincronizzazione Cloud non riuscita.')}
   finally{btn.disabled=false;btn.textContent='Sincronizza ora'}
 };

 $('cloudLogout').onclick=async()=>{
   if(!confirm('Disconnettere SmartTracker Cloud da questo dispositivo? I dati locali resteranno disponibili.'))return;
   await cloudLogout();
   await renderCloud();
 };
}


function ensureCloudButtonDiagnosticFallback(){
 const btn=$('cloudLogin');
 if(!btn || btn.dataset.cloudBound==='1')return;
 btn.addEventListener('click',()=>{
   setTimeout(()=>{
     if(btn.dataset.cloudBound!=='1'){
       const box=$('cloudDiagnostics');
       if(box){
         box.classList.remove('hidden');
         box.innerHTML='<div class="cloud-diag-row cloud-diag-ko"><span>✕</span><div><strong>Interfaccia Cloud non inizializzata</strong><small>Ricarica la pagina: SmartTracker mostrerà l’errore di inizializzazione.</small></div></div>';
       }
     }
   },150);
 });
}

async function renderBackup(){
 renderCloud().catch(e=>console.error('Cloud UI',e));
 const health=$('backupHealth');
 if(!health)return;

 try{
   const stats=await getArchiveStats(store);
   health.innerHTML=`<div class="card"><h3>Stato archivio</h3><div class="backup-health-grid">
     <div class="backup-health-item"><small>Contratti</small><strong>${stats.contracts}</strong></div>
     <div class="backup-health-item"><small>PDF salvati</small><strong>${stats.pdfs}</strong></div>
     <div class="backup-health-item"><small>PDF mancanti</small><strong>${stats.missing}</strong></div>
     <div class="backup-health-item"><small>Spazio PDF</small><strong>${formatBytes(stats.bytes)}</strong></div>
   </div></div>`;

   const auto=getAutoBackupMeta();
   $('autoBackupInfo').innerHTML=`<div class="note"><strong>${auto?.name||'SmartTrackerLocal'}</strong><br>Ultimo aggiornamento: <strong>${formatDate(auto?.createdAt)}</strong><br>Contratti inclusi: ${auto?.contracts??0} · Dimensione: ${formatBytes(auto?.bytes||0)}</div>`;

   const full=getFullBackupMeta();
   $('fullBackupInfo').textContent=`Ultimo backup completo: ${formatDate(full?.createdAt)}${full?` · ${full.pdfs} PDF · ${formatBytes(full.bytes)}`:''}`;

   const backupState=fullBackupTrafficLight(full);
   const badge=$('fullBackupBadge');
   badge.className=`backup-status backup-status-${backupState.level}`;
   $('fullBackupStatusText').textContent=backupState.label;
   $('fullBackupAgeInfo').textContent=backupState.detail;

   const syncMeta=getSyncMeta();
   const deviceInput=$('syncDeviceName');
   if(deviceInput&&!deviceInput.value){
     deviceInput.value=localStorage.getItem('salesTrackerDeviceName')||'';
   }
   const syncStatus=$('syncStatus');
   if(syncStatus){
     syncStatus.textContent=syncMeta
       ?`Ultima Sync: ${formatDate(syncMeta.exportedAt||syncMeta.importedAt)} · ${syncMeta.contracts||0} contratti`
       :'Nessuna sincronizzazione eseguita';
   }
 }catch(e){
   console.error(e);
   health.innerHTML='<div class="card"><div class="note">Impossibile leggere lo stato dell’archivio.</div></div>';
 }

 $('downloadDbBackup').onclick=()=>{
   const when=downloadDatabaseBackup(store);
   alert(`Backup rapido creato: ${formatDate(when)}`);
   renderBackup();
 };

 $('downloadFullBackup').onclick=async()=>{
   const btn=$('downloadFullBackup');
   btn.disabled=true;
   btn.textContent='Creazione backup…';
   try{
     const meta=await downloadCompleteBackup(store);
     alert(`Backup completo creato con ${meta.pdfs} PDF.`);
   }catch(e){
     console.error(e);
     alert(`Errore durante la creazione del backup completo: ${e?.message||'errore sconosciuto'}`);
   }finally{
     btn.disabled=false;
     btn.textContent='Scarica SmartTrackerBkpCompleto';
     renderBackup();
   }
 };


 $('exportSync').onclick=()=>{
   const device=($('syncDeviceName').value||'Dispositivo').trim();
   localStorage.setItem('salesTrackerDeviceName',device);
   const payload=exportSync(store,device);
   $('syncStatus').textContent=`Sync esportata: ${formatDate(payload.exportedAt)} · ${payload.store.contracts.length} contratti`;
 };

 $('importSyncInput').onchange=async()=>{
   const file=$('importSyncInput').files?.[0];
   if(!file)return;

   try{
     const payload=await readSyncFile(file);
     const preview=previewMerge(store,payload.store);
     const box=$('syncPreview');
     box.classList.remove('hidden');
     box.innerHTML=`<div class="sync-preview-card">
       <strong>Confronto sincronizzazione</strong>
       <div class="muted">File da ${payload.deviceName||'altro dispositivo'} · ${formatDate(payload.exportedAt)}</div>
       <div class="sync-preview-grid">
         <div class="sync-preview-item"><small>Nuove pratiche</small><strong>${preview.added}</strong></div>
         <div class="sync-preview-item"><small>Da aggiornare</small><strong>${preview.updated}</strong></div>
         <div class="sync-preview-item"><small>Già presenti</small><strong>${preview.unchanged}</strong></div>
         <div class="sync-preview-item"><small>Totale finale</small><strong>${preview.finalContracts}</strong></div>
       </div>
       <button id="confirmSyncImport" style="margin-top:12px">Conferma sincronizzazione</button>
     </div>`;

     $('confirmSyncImport').onclick=()=>{
       const result=applyMerge(store,payload.store);
       store=result.store;
       persistStore();
       alert(`Sincronizzazione completata. Nuove: ${result.added} · Aggiornate: ${result.updated}`);
       box.classList.add('hidden');
       box.innerHTML='';
       $('importSyncInput').value='';
       renderAll();
     };
   }catch(e){
     console.error(e);
     alert('File Sync non valido o non leggibile.');
     $('importSyncInput').value='';
   }
 };

 $('restoreFullBackup').onclick=async()=>{
   const file=$('restoreFullInput').files?.[0];
   if(!file)return alert('Seleziona prima un file ZIP di backup.');
   if(!confirm('Il ripristino sostituirà il database attuale. Continuare?'))return;

   const btn=$('restoreFullBackup');
   btn.disabled=true;
   btn.textContent='Ripristino…';

   try{
     const result=await restoreCompleteBackup(file);
     store=result.store;
     persistStore();
     alert(`Ripristino completato. PDF ripristinati: ${result.restored}`);
     renderAll();
     go('home');
   }catch(e){
     console.error(e);
     alert('Backup non valido o ripristino non riuscito.');
   }finally{
     btn.disabled=false;
     btn.textContent='Ripristina backup completo';
   }
 };
}



function regulationVisualStatus(r){
 const month=(r.start||'').slice(0,7);
 if(r.cadence==='Mensile'){
   const status=store.periodStates?.[month]?.status;
   if(status==='closed')return {label:'Chiuso',cls:'closed'};
   if(status==='verified')return {label:'Verificato',cls:'verified'};
 }
 return {label:'Attivo',cls:'active'};
}

function renderRegulations(){
 const list=$('regulationsList'),detail=$('regulationDetail');
 if(!list||!detail)return;

 const groups=regulationGroups();
 list.classList.remove('hidden');
 detail.classList.add('hidden');

 list.innerHTML=groups.map(group=>`<div class="regulation-group">
   <h3>${group.type}</h3>
   ${group.items.map(r=>{
     const rs=regulationVisualStatus(r);
     return `<div class="card regulation-card" data-regulation-id="${r.id}">
       <div class="regulation-head">
         <div>
           <div class="regulation-type">${r.cadence}</div>
           <strong>${r.title}</strong>
           <div class="muted">${r.periodLabel}</div>
         </div>
         <div class="regulation-status regulation-status-${rs.cls}">${rs.label}</div>
       </div>
       <div class="muted" style="margin-top:10px">${r.summary}</div>
     </div>`;
   }).join('')}
 </div>`).join('');

 document.querySelectorAll('[data-regulation-id]').forEach(card=>{
   card.onclick=()=>openRegulation(card.dataset.regulationId);
 });
}

function openRegulation(id){
 const all=regulationGroups().flatMap(g=>g.items);
 const r=all.find(x=>x.id===id);
 if(!r)return;
 const rs=regulationVisualStatus(r);

 const list=$('regulationsList'),detail=$('regulationDetail');
 list.classList.add('hidden');
 detail.classList.remove('hidden');

 detail.innerHTML=`<button class="secondary regulation-back">← Torna ai regolamenti</button>
 <div class="card">
   <div class="regulation-head">
     <div>
       <div class="regulation-type">${r.type} · ${r.cadence}</div>
       <h3 style="margin:5px 0">${r.title}</h3>
       <div class="muted">${r.periodLabel}</div>
     </div>
     <div class="regulation-status regulation-status-${rs.cls}">${rs.label}</div>
   </div>
   <p>${r.summary}</p>
 </div>
 ${r.targets?.length?`<div class="card">
   <h3>Target e premi</h3>
   <table class="table-like regulation-target-table">
     <tr><td><strong>Obiettivo</strong></td><td><strong>Target</strong></td><td><strong>Premio / nota</strong></td></tr>
     ${r.targets.map(t=>`<tr><td>${t.label}</td><td>${t.target}</td><td>${t.prize}</td></tr>`).join('')}
   </table>
 </div>`:''}
 <div class="card">
   ${r.sections.map(s=>`<div class="regulation-section">
     <h3>${s.title}</h3>
     <ul>${s.items.map(i=>`<li>${i}</li>`).join('')}</ul>
   </div>`).join('')}
 </div>`;

 detail.querySelector('.regulation-back').onclick=()=>{
   detail.classList.add('hidden');
   list.classList.remove('hidden');
 };
 detail.scrollIntoView({behavior:'smooth',block:'start'});
}


function renderPeriodManager(){
 const select=$('globalMonthSelect');if(!select)return;
 const active=store.settings.activeMonth||store.settings.currentMonth||currentMonthKey();
 const months=availablePeriodMonths(store);if(!months.includes(active))months.unshift(active);
 select.innerHTML=months.map(m=>`<option value="${m}"${m===active?' selected':''}>${monthLabel(m)}</option>`).join('');
 const state=ensurePeriodState(store,active),q=quarterFromMonth(active);
 $('activePeriodLabel').textContent=monthLabel(active);
 const badge=$('activePeriodStatus');badge.className=`period-status period-status-${state.status}`;badge.textContent=`${periodStatusIcon(state.status)} ${periodStatusLabel(state.status)}`;
 $('activeQuarterInfo').textContent=`Excellent e Gara Agenzia: ${q.label} · ${q.start} → ${q.end}`;
 $('markPeriodWorking').disabled=state.status==='working';$('markPeriodVerified').disabled=state.status==='verified';$('togglePeriodClosed').textContent=state.status==='closed'?'Riapri mese':'Chiudi mese';
 select.onchange=()=>{applyGlobalMonth(store,select.value);persistStore();renderAll()};
 $('markPeriodWorking').onclick=()=>{const x=ensurePeriodState(store,active);x.status='working';x.updatedAt=new Date().toISOString();persistStore();renderAll()};
 $('markPeriodVerified').onclick=()=>{const x=ensurePeriodState(store,active);x.status='verified';x.updatedAt=new Date().toISOString();persistStore();renderAll()};
 $('togglePeriodClosed').onclick=()=>{const x=ensurePeriodState(store,active);x.status=x.status==='closed'?'working':'closed';x.updatedAt=new Date().toISOString();persistStore();renderAll()};
}
function selectedPeriodIsClosed(){const a=store.settings.activeMonth||store.settings.currentMonth;return ensurePeriodState(store,a).status==='closed'}
function renderAll(){renderPeriodManager();renderHome();renderAgency();renderExcellent();renderCommunity();renderTeam();renderCustomers();renderRegulations();renderArchive();renderBackup()}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>go(b.dataset.view));
$('archiveSearch').oninput=renderArchive;
$('pdfInput').onchange=e=>e.target.files[0]&&handlePDF(e.target.files[0]);
$('saveParsed').onclick=saveParsed;
if($('exportBtn'))$('exportBtn').onclick=exportBackup;
if($('importInput'))$('importInput').onchange=e=>e.target.files[0]&&importBackup(e.target.files[0]);
$('agent').onchange=()=>{$('includeAgency').value=$('agent').value==='Francesco'?'Sì':'No'};
$('archiveAgent').onchange=renderArchive;
$('archiveAgency').onchange=renderArchive;

$('contractDate').valueAsDate=new Date();
await initParser();
ensureCloudButtonDiagnosticFallback();

const cloudDevice=localStorage.getItem('smartTrackerCloudDeviceName')||localStorage.getItem('salesTrackerDeviceName')||'Dispositivo';
const cloudBoot=await bootstrapLinkedCloud(store,cloudDevice);
if(cloudBoot?.store){
  store=cloudBoot.store;
  saveStore(store);
  createAutoBackup(store);
}
renderAll();

// Leggero controllo periodico: se un altro dispositivo ha aggiornato il Cloud,
// scarica e unisce senza interrompere il lavoro locale.
setInterval(async()=>{
  if(!isCloudLinked()||!getCloudSession()?.access_token)return;
  try{
    const result=await bootstrapLinkedCloud(store,localStorage.getItem('smartTrackerCloudDeviceName')||'Dispositivo');
    if(result?.changed){
      store=result.store;
      saveStore(store);createAutoBackup(store);renderAll();
    }
  }catch(e){console.warn('Cloud background check',e)}
},45000);