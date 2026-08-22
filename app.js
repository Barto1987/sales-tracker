import {uploadPdfCloud,openPdfCloud,pdfCloudExists,pdfCloudProbe} from './cloud-pdf-minimal.js?v=31518';
import {buildReceivables,receivablesHtml,communityPrizeForPosition} from './receivables.js?v=31518';

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


import {loadStore,saveStore,importBackupObject} from './storage.js?v=31518';
import {TARGETS,generalStats,agencyStats,agencyBreakdown,excellentStats,excellentBreakdown,communityStats,communityBreakdown,teamStats,teamBreakdown,availableMonths,customerList,customerDashboard,customerKey,inflowOf,communityRulesForMonth} from './engines.js?v=31518';
import {savePdf,openPdf,deletePdf,getPdf} from './pdf-store.js?v=31518';
import {initParser,parsePDF} from './parser.js?v=31518';
import {createAutoBackup,getAutoBackupMeta,getFullBackupMeta,downloadDatabaseBackup,downloadCompleteBackup,restoreCompleteBackup,getArchiveStats,formatBytes,formatDate} from './backup.js?v=31518';
import {exportSync,readSyncFile,previewMerge,applyMerge,getSyncMeta} from './sync.js?v=31518';
import {regulationGroups} from './regulations.js?v=31518';
import {currentMonthKey,monthLabel,quarterFromMonth,availablePeriodMonths,ensurePeriodState,periodStatusLabel,periodStatusIcon,applyGlobalMonth} from './periods.js?v=31518';
import {cloudLogin,cloudLogout,cloudInfo,uploadLocalFirst,downloadAndMerge,syncNow,bootstrapLinkedCloud,queueCloudPush,getCloudMeta,isCloudLinked,getCloudSession,getCloudEmail,setCloudEmail,runCloudDiagnostics,readPrimaryCloudStoreRaw,pushCloudStore} from './cloud.js?v=31518';
import {commissionsForPeriod} from './commissions.js?v=31518';

let store=loadStore(),parsed=null,pendingPdf=null;
let guaranteedPushTimer=null,guaranteedPushInFlight=false,persistRevision=0,pushRequestedWhileBusy=false;
applyGlobalMonth(store,store.settings.activeMonth||store.settings.currentMonth||currentMonthKey());

async function guaranteedCloudPush(expectedRevision){
  if(!getCloudSession()?.access_token)return;
  if(guaranteedPushInFlight){pushRequestedWhileBusy=true;return}
  guaranteedPushInFlight=true;
  pushRequestedWhileBusy=false;

  const device=localStorage.getItem('smartTrackerCloudDeviceName')||localStorage.getItem('salesTrackerDeviceName')||'Dispositivo';
  const localSnapshot=store;
  const revisionAtStart=expectedRevision;

  try{
    // Bypassa il solo gate interno di queueCloudPush e usa la sync stabile già esistente.
    const result=await syncNow(localSnapshot,device,'local');

    // Adotta il merge soltanto se nel frattempo non ci sono stati altri salvataggi locali.
    if(result?.store && persistRevision===revisionAtStart){
      store=result.store;
      saveStore(store);
      createAutoBackup(store);
    }

    // Verifica di lettura: tutti gli ID dello snapshot devono essere davvero nel Cloud.
    const raw=await readPrimaryCloudStoreRaw();
    const cloudIds=new Set((raw?.data?.contracts||[]).map(c=>String(c.id)));
    const missing=(localSnapshot.contracts||[]).filter(c=>c?.id&&!cloudIds.has(String(c.id)));
    if(missing.length){
      throw new Error(`AutoPush incompleto: ${missing.length} contratti non risultano ancora nel Cloud`);
    }

    const status=$('cloudAutoPushLiveStatus');
    if(status)status.textContent=`✓ AutoPush verificato · ${(raw?.data?.contracts||[]).length} contratti · ${new Date().toLocaleTimeString('it-IT')}`;
  }catch(e){
    console.warn('Guaranteed AutoPush',e);
    const status=$('cloudAutoPushLiveStatus');
    if(status)status.textContent=`⚠ AutoPush: ${e.message||e}`;
  }finally{
    guaranteedPushInFlight=false;
    if(pushRequestedWhileBusy || persistRevision>revisionAtStart){
      scheduleGuaranteedCloudPush();
    }
  }
}

function scheduleGuaranteedCloudPush(){
  if(!getCloudSession()?.access_token){
    const status=$('cloudAutoPushLiveStatus');
    if(status)status.textContent='⚠ AutoPush sospeso: sessione Cloud assente';
    return;
  }
  if(guaranteedPushTimer)clearTimeout(guaranteedPushTimer);
  const revision=persistRevision;
  guaranteedPushTimer=setTimeout(()=>guaranteedCloudPush(revision),1200);
}

function persistStore(){
  saveStore(store);
  createAutoBackup(store);
  persistRevision++;
  const device=localStorage.getItem('smartTrackerCloudDeviceName')||localStorage.getItem('salesTrackerDeviceName')||'Dispositivo';
  // Manteniamo il percorso storico e aggiungiamo una seconda garanzia esplicita.
  queueCloudPush(()=>store,device);
  scheduleGuaranteedCloudPush();
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
 const team=teamStats(store).Totale;
 const communityRule=communityRulesForMonth(activeMonth);

 $('homeCards').innerHTML=`
 <div class="card section-link goal-card home-goal-compact" data-go="community">
   <div class="goal-top"><div><small>COMMUNITY</small><strong>${Math.round(c.vcoins)} <em>V-Coin</em></strong></div><span class="status-pill ${c.ability?'ok-pill':'work-pill'}">${c.ability?'Ability OK':'In corso'}</span></div>
   <div class="goal-foot">Inflow ${money(c.inflow)} · Link ${money(c.link)}</div>
 </div>
 <div class="card section-link goal-card home-goal-compact" data-go="excellent">
   <div class="goal-top"><div><small>EXCELLENT</small><strong>${money(e.variable)} <em>extra</em></strong></div><span class="status-pill ${e.won?'ok-pill':'work-pill'}">${e.won?'Vinto':'Q3'}</span></div>
   <div class="goal-foot">${e.won?'Soglia trimestre raggiunta':'Mancano '+money(Math.max(1000-e.variable,0))}</div>
 </div>
 <div class="card section-link goal-card home-goal-compact" data-go="agency">
   <div class="goal-top"><div><small>GARA AGENZIA</small><strong>${Math.round(pct(a.coreInflow,TARGETS.agency.coreInflow))}%</strong></div><span class="goal-arrow">›</span></div>
   <div class="goal-foot">Inflow Core ${money(a.coreInflow)}</div>
 </div>
 <div class="card section-link goal-card home-goal-compact" data-go="team">
   <div class="goal-top"><div><small>SQUADRA</small><strong>${money(team.inflow)}</strong></div><span class="goal-arrow">›</span></div>
   <div class="goal-foot">Inflow del mese</div>
 </div>`;

 $('homeQuickLinks').innerHTML=`
   <div class="home-quick-row section-link" data-go="archive">
     <span class="home-quick-icon" aria-hidden="true">▤</span>
     <div><strong>ARCHIVIO</strong><span>${store.contracts.length} contratti totali</span></div><b>›</b>
   </div>
   <div class="home-quick-row section-link" data-go="regulations">
     <span class="home-quick-icon" aria-hidden="true">◉</span>
     <div><strong>REGOLAMENTI</strong><span>Regole attive e storico</span></div><b>›</b>
   </div>
   <div class="home-quick-row section-link" data-go="customers">
     <span class="home-quick-icon" aria-hidden="true">♙</span>
     <div><strong>CLIENTI</strong><span>${customerCount} schede cliente</span></div><b>›</b>
   </div>`;

 document.querySelectorAll('[data-go]').forEach(x=>x.onclick=()=>go(x.dataset.go));
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

function openCommunityPrizeRegulation(){
  go('regulations');
  setTimeout(()=>openRegulation('community-prizes-fixed'),60);
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
const communityRank=store.settings.communityRankings?.[communityMonth]||'';
const communityPrize=communityPrizeForPosition(communityRank);
$('communitySummary').insertAdjacentHTML('beforeend',`<div class="card community-rank-card">
  <div class="muted">Premio Community mensile</div>
  <h3>Posizione Area Nord Est</h3>
  <p class="muted">Inserisci solo la posizione quando esce la classifica. La fascia economica usata è quella “Agente Excellent”, ma il premio resta Community.</p>
  <div class="row"><label>Posizione ${monthLabel(communityMonth)}<input id="communityRankPosition" type="number" min="1" value="${communityRank}" placeholder="Es. 6"></label>
  <button id="saveCommunityRank" class="secondary">Salva posizione</button></div>
  <div class="note" style="margin-top:10px">Premio calcolato: <strong>${money(communityPrize)}</strong> · pagamento previsto +90 gg dalla chiusura mese${communityRank?` · <button type="button" class="link-button" data-open-community-prizes>Posizione ${communityRank}° → verifica premi</button>`:''}</div>
</div>`);
$('saveCommunityRank').onclick=()=>{
  store.settings.communityRankings=store.settings.communityRankings||{};
  const v=Number($('communityRankPosition').value||0);
  if(v>0)store.settings.communityRankings[communityMonth]=v;else delete store.settings.communityRankings[communityMonth];
  persistStore();renderCommunity();renderCommissions();
};
 const communityPrizeLink=document.querySelector('[data-open-community-prizes]');
 if(communityPrizeLink)communityPrizeLink.onclick=()=>openCommunityPrizeRegulation();

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

async function choosePdfCloudFile(){
 return new Promise(resolve=>{const i=document.createElement('input');i.type='file';i.accept='application/pdf,.pdf';i.style.display='none';document.body.appendChild(i);
 i.onchange=()=>{const f=i.files?.[0]||null;i.remove();resolve(f)};i.oncancel=()=>{i.remove();resolve(null)};i.click()})
}
async function addPdfCloudMinimal(id){
 const c=store.contracts.find(x=>x.id===id);if(!c)return;
 const f=await choosePdfCloudFile();if(!f)return;
 try{
  const info=await uploadPdfCloud(id,f);
  c.cloudPdf=info;
  c.updatedAt=new Date().toISOString();
  saveStore(store);createAutoBackup(store);
  const device=localStorage.getItem('smartTrackerCloudDeviceName')||localStorage.getItem('salesTrackerDeviceName')||'Dispositivo';
  try{
    const synced=await syncNow(store,device,'local');
    if(synced?.store){store=synced.store;saveStore(store)}
  }catch(syncErr){
    console.warn('PDF reference immediate sync',syncErr);
    queueCloudPush(()=>store,device);
  }
  renderArchive();
  alert('PDF caricato nel Cloud e riferimento sincronizzato.');
}
 catch(e){console.error(e);alert('PDF Cloud: '+(e.message||e))}
}
async function openPdfCloudMinimal(id){
 try{await openPdfCloud(id)}catch(e){console.error(e);alert('PDF Cloud: '+(e.message||e))}
}


let pdfCloudReconcileRunning=false;
let pdfCloudReconciledThisSession=false;
async function reconcilePdfCloudRefs(){
 if(pdfCloudReconcileRunning||pdfCloudReconciledThisSession||!isCloudLinked()||!getCloudSession()?.access_token)return;
 pdfCloudReconcileRunning=true;
 pdfCloudReconciledThisSession=true;
 let changed=false;
 try{
   const missing=(store.contracts||[]).filter(c=>c.status!=='deleted'&&!c.cloudPdf?.path);
   for(const c of missing){
     try{
       if(await pdfCloudExists(c.id)){
         c.cloudPdf={bucket:'contract-pdfs',path:'storage-confirmed',reconciledAt:new Date().toISOString()};
         c.updatedAt=new Date().toISOString();
         changed=true;
       }
     }catch(e){console.warn('PDF Cloud reconcile',c.id,e)}
   }
   if(changed){
     saveStore(store);createAutoBackup(store);
     const device=localStorage.getItem('smartTrackerCloudDeviceName')||localStorage.getItem('salesTrackerDeviceName')||'Dispositivo';
     try{
       const synced=await syncNow(store,device,'local');
       if(synced?.store){store=synced.store;saveStore(store)}
     }catch(e){console.warn('PDF reconcile sync',e)}
     renderArchive();
   }
 }finally{pdfCloudReconcileRunning=false}
}


async function diagnosePdfCloud(contractId){
  const c=(store.contracts||[]).find(x=>x.id===contractId);
  if(!c)return;

  const result={
    contractId,
    client:c.client||'Cliente',
    localCloudPdf:c.cloudPdf||null,
    storage:null,
    cloudDb:null,
    checkedAt:new Date().toISOString()
  };

  try{
    result.storage=await pdfCloudProbe(contractId);
  }catch(e){
    result.storage={error:e.message||String(e)};
  }

  try{
    const raw=await readPrimaryCloudStoreRaw();
    const cloudContracts=raw?.data?.contracts||[];
    const cc=cloudContracts.find(x=>x.id===contractId)||null;
    result.cloudDb={
      rowUpdatedAt:raw?.updated_at||null,
      contractFound:!!cc,
      cloudPdf:cc?.cloudPdf||null,
      contractUpdatedAt:cc?.updatedAt||null
    };
  }catch(e){
    result.cloudDb={error:e.message||String(e)};
  }

  const host=$('pdfDiagnosticPanel');
  if(host){
    host.innerHTML=`
      <div class="card pdf-diag-card">
        <div class="pdf-diag-head">
          <div><small>DIAGNOSTICA PDF CLOUD</small><h3>${result.client}</h3></div>
          <button id="closePdfDiag" class="secondary">Chiudi</button>
        </div>

        <div class="pdf-diag-grid">
          <div class="${result.localCloudPdf?'diag-ok':'diag-ko'}">
            <b>1. Contratto locale</b>
            <span>${result.localCloudPdf?'cloudPdf presente':'cloudPdf assente'}</span>
          </div>
          <div class="${result.storage?.exists?'diag-ok':'diag-ko'}">
            <b>2. Supabase Storage</b>
            <span>${result.storage?.exists?'PDF trovato':'PDF non trovato / non leggibile'}</span>
          </div>
          <div class="${result.cloudDb?.cloudPdf?'diag-ok':'diag-ko'}">
            <b>3. Database Cloud</b>
            <span>${result.cloudDb?.cloudPdf?'cloudPdf presente':'cloudPdf assente'}</span>
          </div>
        </div>

        <details class="pdf-diag-details">
          <summary>Dettaglio tecnico</summary>
          <pre>${JSON.stringify(result,null,2)}</pre>
        </details>
      </div>`;
    host.scrollIntoView({behavior:'smooth',block:'start'});
    $('closePdfDiag').onclick=()=>host.innerHTML='';
  }
  console.log('SmartTracker PDF diagnostic',result);
}

function archiveItem(c){
 return `<div class="card"><div class="item"><div><strong>${c.client}</strong><div class="muted">${c.offer||'Senza offerta'} · ${c.date}</div><div class="muted">P.IVA ${c.vat||'—'} · Codice cliente ${c.customerCode||'—'}</div><div class="muted">${c.services.map(s=>`${s.service} ×${s.qty}${s.service==='SIM Voce'&&s.mnp?' MNP':''}`).join(' · ')}</div><div class="muted">${(c.teamAllocations||[{agent:c.agent||'Francesco',share:1}]).map(a=>`${a.agent} ${Math.round(Number(a.share||0)*100)}%`).join(' + ')} · Gara Agenzia ${c.includeAgency===false?'No':'Sì'}</div></div><div style="text-align:right"><strong>${money(allInflow(c))}</strong><br><span class="badge ${c.status==='Valido'?'ok':'warn'}">${c.status}</span></div></div><div class="actions">${c.cloudPdf?.path?`<button class="secondary" data-open-cloud-pdf="${c.id}">☁️ Apri PDF Cloud</button>`:`<button class="secondary" data-add-cloud-pdf="${c.id}">☁️ Carica PDF Cloud</button>`}<button class="secondary" data-edit="${c.id}">Modifica attributi</button><button class="danger" data-del="${c.id}">Elimina</button></div></div>`
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
 $('customerTimeline').innerHTML=cs.length?cs.map(c=>{const total=(c.services||[]).reduce((a,x)=>a+inflowOf(x),0);return `<div class="customer-timeline-item"><div class="customer-head"><div><strong>${c.date||'—'} · ${c.offer||'Senza numero offerta'}</strong><div class="muted">${c.agent||'Francesco'} · Gara Agenzia ${c.includeAgency===false?'No':'Sì'}${c.prospect?' · Prospect':''}</div></div><strong>${money(total)}</strong></div>${(c.services||[]).map(x=>`<div class="customer-product-row"><span>${x.product||x.service} · ${x.qty||1}${x.service==='SIM Voce'&&x.mnp?' · MNP':''}</span><strong>${money(inflowOf(x))}</strong></div>`).join('')}${c.cloudPdf?.path?`<button class="secondary open-customer-cloud-pdf" data-pdf-id="${c.id}" style="margin-top:10px">☁️ Apri PDF Cloud</button>`:''}</div>`}).join(''):'<div class="muted">Nessuna pratica con questi filtri.</div>';
 dash.querySelectorAll('.open-customer-cloud-pdf').forEach(b=>b.onclick=()=>openPdfCloudMinimal(b.dataset.pdfId))};
 $('customerYearFilter').onchange=timeline;$('customerServiceFilter').onchange=timeline;timeline();dash.scrollIntoView({behavior:'smooth',block:'start'});
}
function archiveUploadMonth(c){
 const raw=c?.createdAt||c?.updatedAt||c?.date||'';
 const m=String(raw).match(/^(\d{4})-(\d{2})/);
 return m?`${m[1]}-${m[2]}`:'';
}
function archiveMonthLabel(key){
 if(!key)return 'Senza data';
 return monthLabel(key);
}
function renderArchive(){
 const search=$('archiveSearch'),monthSel=$('archiveMonth');
 const q=(search?.value||'').toLowerCase();
 const agent=$('archiveAgent')?.value||'Tutti';

 if(monthSel){
   const current=monthSel.value||'Tutti';
   const months=[...new Set((store.contracts||[]).map(archiveUploadMonth).filter(Boolean))].sort().reverse();
   monthSel.innerHTML=`<option value="Tutti">Tutti i mesi</option>${months.map(m=>`<option value="${m}">${archiveMonthLabel(m)}</option>`).join('')}`;
   monthSel.value=months.includes(current)?current:'Tutti';
 }
 const month=monthSel?.value||'Tutti';
 const rows=[...store.contracts].reverse().filter(c=>{
   const text=(c.client+' '+c.offer+' '+c.vat+' '+(c.customerCode||'')+' '+c.services.map(s=>s.product).join(' ')).toLowerCase();
   const agentOk=agent==='Tutti'||(c.agent||'Francesco')===agent;
   const monthOk=month==='Tutti'||archiveUploadMonth(c)===month;
   return text.includes(q)&&agentOk&&monthOk;
 });
 $('archiveList').innerHTML=rows.length?rows.map(archiveItem).join(''):'<div class="card muted">Nessun contratto con questi filtri.</div>';
 document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(confirm('Eliminare il contratto?')){const id=b.dataset.del;await deletePdf(id).catch(()=>{});store.deletedContracts=store.deletedContracts||{};store.deletedContracts[id]=new Date().toISOString();store.contracts=store.contracts.filter(c=>c.id!==id);persistStore();renderAll()}});
 document.querySelectorAll('[data-add-cloud-pdf]').forEach(b=>b.onclick=()=>addPdfCloudMinimal(b.dataset.addCloudPdf));
 document.querySelectorAll('[data-open-cloud-pdf]').forEach(b=>b.onclick=()=>openPdfCloudMinimal(b.dataset.openCloudPdf));
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editAttrs(b.dataset.edit));
 setTimeout(()=>reconcilePdfCloudRefs(),250);
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
 const contract={
   id:'C-'+Date.now(),
   createdAt:nowIso,
   updatedAt:nowIso,
   date:$('contractDate').value,
   offer:parsed.meta.offer,
   client:parsed.meta.client||'Da verificare',
   vat:parsed.meta.vat,
   customerCode:parsed.meta.customerCode||'',
   prospect,agent,includeAgency,teamAllocations,
   status:'Valido',
   pdfRef:parsed.filename,
   pdfStored:false,
   notes:'SmartTracker 3.15.18',
   services:[]
 };

 for(const el of rows){
   const service=el.querySelector('.pr-service').value;
   const mnpEl=el.querySelector('.pr-mnp');
   contract.services.push({
     id:'S-'+Math.random().toString(36).slice(2),
     service,
     product:el.querySelector('.pr-product').value,
     category:el.querySelector('.pr-category').value,
     qty:Number(el.querySelector('.pr-qty').value||1),
     inflowUnit:Number(el.querySelector('.pr-inflow').value||0),
     mnp:service==='SIM Voce'&&mnpEl?mnpEl.value==='Sì':false,
     confidence:parsed.confidence,
     calc:''
   });
 }

 let pdfState='none';
 let pdfError='';

 // CLOUD-FIRST: il PDF viene caricato direttamente nello Storage Cloud.
 // Nessuna copia locale permanente viene creata se l'upload Cloud riesce.
 if(pendingPdf){
   if(getCloudSession()?.access_token){
     try{
       const info=await uploadPdfCloud(contract.id,pendingPdf);
       contract.cloudPdf=info;
       contract.pdfStored=false;
       contract.updatedAt=new Date().toISOString();
       pdfState='cloud';
     }catch(e){
       console.error('Upload PDF Cloud automatico',e);
       pdfError=e.message||String(e);
     }
   }else{
     pdfError='Sessione Cloud assente';
   }

   // Rete di sicurezza: se il Cloud fallisce, salva SOLO temporaneamente/localmente
   // il PDF per non perdere il documento. La diagnostica completa lo segnalerà.
   if(pdfState!=='cloud'){
     try{
       await savePdf(contract.id,pendingPdf);
       contract.pdfStored=true;
       contract.pdfCloudPending=true;
       contract.pdfCloudPendingError=pdfError||'Upload Cloud non riuscito';
       pdfState='local-fallback';
     }catch(e){
       console.error('Fallback PDF locale non riuscito',e);
       pdfState='failed';
       pdfError=pdfError||e.message||String(e);
     }
   }
 }

 store.contracts.push(contract);
 persistStore();

 // Se il PDF Cloud è già stato caricato, forza anche una sync immediata del riferimento.
 if(pdfState==='cloud'){
   try{
     const device=localStorage.getItem('smartTrackerCloudDeviceName')||localStorage.getItem('salesTrackerDeviceName')||'Dispositivo';
     const synced=await syncNow(store,device,'local');
     if(synced?.store){
       store=synced.store;
       saveStore(store);
       createAutoBackup(store);
     }
   }catch(e){
     console.warn('Sync immediata riferimento PDF Cloud',e);
     // L'AutoPush 3.15.7+ resta attivo e ritenterà.
   }
 }

 pendingPdf=null;
 $('previewBox').classList.add('hidden');
 $('pdfInput').value='';
 renderAll();
 go('home');

 if(pdfState==='cloud'){
   alert('Contratto salvato e PDF caricato automaticamente nel Cloud.');
 }else if(pdfState==='local-fallback'){
   alert(`Contratto salvato.\n\nIl PDF non è arrivato nel Cloud ed è stato conservato localmente come copia di sicurezza.\nLa diagnostica PDF completa lo segnalerà tra i documenti da caricare.${pdfError?`\n\nDettaglio: ${pdfError}`:''}`);
 }else if(pdfState==='failed'){
   alert(`Contratto salvato, ma il PDF non è stato archiviato.\n\n${pdfError||'Errore sconosciuto'}`);
 }else{
   alert('Contratto salvato.');
 }
}
let currentViewId=document.querySelector('.view.active')?.id||'home';
const viewHistory=[];
const VIEW_TITLES={
 home:'SmartTracker',settings:'Cloud e strumenti',customers:'Clienti',new:'Nuovo contratto',agency:'Agenzia',excellent:'Excellent',community:'Community',team:'Squadra',commissions:'Provvigioni',regulations:'Regolamenti',archive:'Archivio'
};
function updateHeaderTitle(id){
 const title=document.querySelector('.smart-header .title'),sub=document.querySelector('.smart-header .sub');
 if(!title||!sub)return;
 if(id==='home'){
   title.textContent='SmartTracker 3.15.18';
   sub.textContent='Cruscotto commerciale personale';
 }else{
   title.textContent=VIEW_TITLES[id]||'SmartTracker';
   sub.textContent='SmartTracker 3.15.18';
 }
}
function syncHeaderNavigation(){
 const backBtn=$('headerBack');
 if(backBtn){
   const show=currentViewId!=='home';
   backBtn.classList.toggle('hidden',!show);
   backBtn.disabled=!show;
 }
 updateHeaderTitle(currentViewId);
}
function setActiveView(id,direction='forward'){
 const target=$(id);if(!target)return;
 const current=document.querySelector('.view.active');
 if(current&&current!==target){
   current.classList.add(direction==='back'?'view-exit-back':'view-exit-forward');
   setTimeout(()=>current.classList.remove('view-exit-back','view-exit-forward'),210);
 }
 document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
 document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));
 target.classList.add('active',direction==='back'?'view-enter-back':'view-enter-forward');
 setTimeout(()=>target.classList.remove('view-enter-back','view-enter-forward'),220);
 document.querySelector(`nav button[data-view="${id}"]`)?.classList.add('active');
 currentViewId=id;syncHeaderNavigation();window.scrollTo(0,0);
}
function go(id,opts={}){
 if(!$(id))return;
 if(opts.fromBack){setActiveView(id,'back');return}
 if(id!==currentViewId){if(viewHistory[viewHistory.length-1]!==currentViewId)viewHistory.push(currentViewId);setActiveView(id,'forward')}
 else if(opts.force)setActiveView(id,'forward');
}
function goBack(fallback='home'){
 while(viewHistory.length){const prev=viewHistory.pop();if(prev&&prev!==currentViewId&&$(prev)){setActiveView(prev,'back');return}}
 setActiveView(fallback,'back');
}
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



function smartDefaultDeviceName(){
  const ua=navigator.userAgent||'',platform=navigator.platform||'';
  if(/iPhone/i.test(ua))return 'iPhone';
  if(/iPad/i.test(ua)||(platform==='MacIntel'&&navigator.maxTouchPoints>1))return 'iPad';
  if(/Macintosh|Mac OS X/i.test(ua))return 'Mac';
  return 'Dispositivo';
}
function ensureSmartDeviceName(){
  let name=localStorage.getItem('smartTrackerCloudDeviceName')||localStorage.getItem('salesTrackerDeviceName')||'';
  if(!name||name==='Dispositivo'){
    name=smartDefaultDeviceName();
    localStorage.setItem('smartTrackerCloudDeviceName',name);
  }
  const input=$('cloudDeviceName');if(input)input.value=name;
  return name;
}
function setHeaderCloudLight(state,detail=''){
  const el=$('headerCloudStatus');if(!el)return;
  el.className=`header-cloud-status header-cloud-${state}`;
  const label=state==='online'?'Cloud online':state==='warn'?'Cloud da verificare':state==='offline'?'Cloud offline':'Verifica Cloud';
  el.setAttribute('aria-label',`${label}${detail?': '+detail:''}`);
  el.title=`${label}${detail?' · '+detail:''}`;
  const alert=$('headerCloudAlert');
  if(alert)alert.classList.toggle('hidden',!(state==='warn'||state==='offline'));
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
   setHeaderCloudLight('offline','login richiesto');
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
 const localCount=(store.contracts||[]).length;
 const cloudCount=Number(row?.data?.contracts?.length||0);
 setHeaderCloudLight(err?'offline':hasCloud&&cloudCount===localCount?'online':'warn',err||`${cloudCount}/${localCount} contratti`);

 $('cloudInfo').innerHTML=hasCloud
   ?`<strong>Cloud pronto</strong><br>${row.data?.contracts?.length||0} contratti · aggiornato ${formatDate(row.updated_at)}`
   :'<strong>Cloud vuoto</strong><br>Questo può diventare il dispositivo master per la prima migrazione.';

 $('cloudEmptyActions').classList.toggle('hidden',hasCloud);
 $('cloudExistingActions').classList.toggle('hidden',!hasCloud);

 ensureSmartDeviceName();

 const m=info.meta||getCloudMeta();
 $('cloudLastStatus').textContent=err
   ?`Cloud non raggiungibile: ${err}. I dati locali continuano a funzionare.`
   :m?.lastSyncAt
     ?`Ultima sincronizzazione: ${formatDate(m.lastSyncAt)} · ${m.contracts||0} contratti`
     :'Nessuna sincronizzazione Cloud completata';
}


function cloudDiagLabel(c){return `${c?.client||'Cliente'}${c?.id?` · ${c.id}`:''}`;}
function cloudDiagLatest(list,limit=8){
  return [...(list||[])].sort((a,b)=>String(b?.updatedAt||b?.date||'').localeCompare(String(a?.updatedAt||a?.date||''))).slice(0,limit);
}
function cloudDiagLatestDate(obj){
  const vals=(obj?.contracts||[]).map(c=>c?.updatedAt||c?.date).filter(Boolean).sort();
  return vals.at(-1)||null;
}
async function runDeviceCloudDiagnostic(){
  const host=$('cloudDeviceDiagnosticResult'),btn=$('cloudRunDeviceDiagnostic');
  if(!host||!btn)return;
  btn.disabled=true;btn.textContent='Analisi…';
  host.classList.remove('hidden');
  host.innerHTML='<div class="muted">Lettura dati locali e Cloud…</div>';
  try{
    const session=getCloudSession(),meta=getCloudMeta(),raw=await readPrimaryCloudStoreRaw();
    const cloudStore=raw?.data||{},localContracts=store.contracts||[],cloudContracts=cloudStore.contracts||[];
    const lm=new Map(localContracts.map(c=>[String(c.id),c])),cm=new Map(cloudContracts.map(c=>[String(c.id),c]));
    const onlyLocal=localContracts.filter(c=>c?.id&&!cm.has(String(c.id)));
    const onlyCloud=cloudContracts.filter(c=>c?.id&&!lm.has(String(c.id)));
    const meaningfulContract=c=>({
      client:String(c?.client||'').trim(),date:String(c?.date||''),offer:String(c?.offer||''),
      vat:String(c?.vat||''),customerCode:String(c?.customerCode||''),prospect:!!c?.prospect,
      agent:String(c?.agent||'Francesco'),includeAgency:c?.includeAgency!==false,
      status:String(c?.status||'Valido'),deletedAt:c?.deletedAt||null,cloudPdf:!!c?.cloudPdf,
      services:(c?.services||[]).map(s=>({
        id:String(s?.id||''),service:String(s?.service||''),product:String(s?.product||''),
        category:String(s?.category||''),qty:Number(s?.qty||0),inflowUnit:Number(s?.inflowUnit||0),mnp:!!s?.mnp
      }))
    });
    const differing=[];
    for(const [id,l] of lm){
      const c=cm.get(id); if(!c)continue;
      if(JSON.stringify(meaningfulContract(l))!==JSON.stringify(meaningfulContract(c))){
        differing.push({id,local:l,cloud:c});
      }
    }
    const same=!onlyLocal.length&&!onlyCloud.length&&!differing.length;
    const expiry=session?.expires_at?new Date(Number(session.expires_at)*1000).toLocaleString('it-IT'):'n/d';
    host.innerHTML=`
      <div class="cloud-diag-summary ${same?'diag-ok':'diag-ko'}"><strong>${same?'✓ Locale e Cloud coincidono':'⚠ Trovate differenze'}</strong><small>${new Date().toLocaleString('it-IT')}</small></div>
      <div class="cloud-diag-grid cloud-device-grid">
        <div><b>Contratti locali</b><span>${localContracts.length}</span></div>
        <div><b>Contratti Cloud</b><span>${cloudContracts.length}</span></div>
        <div><b>Solo locali</b><span>${onlyLocal.length}</span></div>
        <div><b>Solo Cloud</b><span>${onlyCloud.length}</span></div>
        <div><b>Comuni ma diversi</b><span>${differing.length}</span></div>
        <div><b>PDF Cloud marcati locale</b><span>${localContracts.filter(c=>c?.cloudPdf).length}</span></div>
        <div><b>PDF Cloud marcati DB</b><span>${cloudContracts.filter(c=>c?.cloudPdf).length}</span></div>
        <div><b>Ultimo sync dispositivo</b><span>${meta?.lastSyncAt?formatDate(meta.lastSyncAt):'mai'}</span></div>
        <div><b>Riga Cloud aggiornata</b><span>${raw?.updated_at?formatDate(raw.updated_at):'n/d'}</span></div>
        <div><b>Ultima modifica locale</b><span>${cloudDiagLatestDate(store)?formatDate(cloudDiagLatestDate(store)):'n/d'}</span></div>
        <div><b>Ultima modifica Cloud</b><span>${cloudDiagLatestDate(cloudStore)?formatDate(cloudDiagLatestDate(cloudStore)):'n/d'}</span></div>
        <div><b>Sessione</b><span>${session?.access_token?'presente':'assente'}</span></div>
        <div><b>Scadenza sessione</b><span>${expiry}</span></div>
        <div><b>Utente</b><span>${session?.user?.email||getCloudEmail()||'n/d'}</span></div>
        <div><b>Dispositivo</b><span>${localStorage.getItem('smartTrackerCloudDeviceName')||localStorage.getItem('salesTrackerDeviceName')||'non nominato'}</span></div>
      </div>
      ${onlyLocal.length?`<details class="cloud-diff-block" open><summary><strong>Solo su questo dispositivo (${onlyLocal.length})</strong></summary>${onlyLocal.slice(0,20).map(c=>`<div class="cloud-diff-line"><span>${cloudDiagLabel(c)}</span><small>${c.date||''}</small></div>`).join('')}</details>`:''}
      ${onlyCloud.length?`<details class="cloud-diff-block" open><summary><strong>Solo nel Cloud (${onlyCloud.length})</strong></summary>${onlyCloud.slice(0,20).map(c=>`<div class="cloud-diff-line"><span>${cloudDiagLabel(c)}</span><small>${c.date||''}</small></div>`).join('')}</details>`:''}
      ${differing.length?`<details class="cloud-diff-block"><summary><strong>Presenti in entrambi ma diversi (${differing.length})</strong></summary>${differing.slice(0,20).map(x=>`<div class="cloud-diff-line"><span>${cloudDiagLabel(x.local)}</span><small>locale ${x.local?.updatedAt||'n/d'} · cloud ${x.cloud?.updatedAt||'n/d'}</small></div>`).join('')}</details>`:''}
      <details class="cloud-diff-block"><summary><strong>Ultimi contratti locali</strong></summary>${cloudDiagLatest(localContracts).map(c=>`<div class="cloud-diff-line"><span>${cloudDiagLabel(c)}</span><small>${c.updatedAt||c.date||''}</small></div>`).join('')}</details>
      <details class="cloud-diff-block"><summary><strong>Ultimi contratti Cloud</strong></summary>${cloudDiagLatest(cloudContracts).map(c=>`<div class="cloud-diff-line"><span>${cloudDiagLabel(c)}</span><small>${c.updatedAt||c.date||''}</small></div>`).join('')}</details>
      <div class="field-hint">Sola lettura: nessun upload, merge, refresh forzato o modifica dati.</div>`;
  }catch(e){
    console.error('Cloud diagnostic',e);
    host.innerHTML=`<div class="cloud-diag-row cloud-diag-ko"><span>✕</span><div><strong>Diagnostica non riuscita</strong><small>${e.message||e}</small></div></div>`;
  }finally{
    btn.disabled=false;btn.textContent='Esegui diagnostica Cloud';
  }
}


async function safeMasterRealignFromThisDevice(){
  const btn=$('cloudMasterRealign');
  const status=$('cloudMasterRealignStatus');
  const password=$('cloudMasterPassword')?.value||'';
  const email=getCloudEmail()||'';

  if(!btn||!status)return;
  if(!email)return alert('Email Cloud non disponibile. Accedi prima a SmartTracker Cloud.');
  if(!password)return alert('Inserisci la password Supabase per creare una sessione nuova.');

  btn.disabled=true;
  btn.textContent='Verifica sicurezza…';
  status.textContent='Controllo database locale e Cloud…';

  try{
    // 1) Fresh login/session using the already stable login diagnostic routine.
    const auth=await runCloudDiagnostics(email,password);
    if(!auth?.ok)throw new Error(auth?.error||'Rinnovo sessione non riuscito');

    // 2) Read Cloud after fresh auth, before any write.
    const before=await readPrimaryCloudStoreRaw();
    const localContracts=store.contracts||[];
    const cloudContracts=before?.data?.contracts||[];

    const localIds=new Set(localContracts.map(c=>String(c.id)));
    const cloudIds=new Set(cloudContracts.map(c=>String(c.id)));
    const onlyLocal=localContracts.filter(c=>c?.id&&!cloudIds.has(String(c.id)));
    const onlyCloud=cloudContracts.filter(c=>c?.id&&!localIds.has(String(c.id)));

    // Safety guard: this device must clearly be the superset/master.
    if(localContracts.length<=cloudContracts.length){
      throw new Error(`Blocco sicurezza: locale ${localContracts.length}, Cloud ${cloudContracts.length}. Il dispositivo master deve avere più contratti del Cloud.`);
    }
    if(onlyCloud.length>0){
      throw new Error(`Blocco sicurezza: il Cloud contiene ${onlyCloud.length} contratti assenti su questo dispositivo. Nessuna scrittura eseguita.`);
    }

    const sample=onlyLocal.slice(0,8).map(c=>c.client||c.id).join(', ');
    const msg=`Riallineare il Cloud usando QUESTO dispositivo come master?\n\nLocale: ${localContracts.length} contratti\nCloud: ${cloudContracts.length} contratti\nDa aggiungere al Cloud: ${onlyLocal.length}${sample?`\n${sample}`:''}\n\nPrima della scrittura SmartTracker crea un backup locale automatico e dopo verifica nuovamente tutti gli ID.`;

    if(!confirm(msg)){
      status.textContent='Operazione annullata. Nessun dato modificato.';
      return;
    }

    // 3) Local automatic backup before Cloud write.
    createAutoBackup(store);

    // 4) Directly upload the complete local store. No merge with stale Cloud.
    btn.textContent='Caricamento master…';
    status.textContent=`Caricamento protetto di ${localContracts.length} contratti…`;
    const device=localStorage.getItem('smartTrackerCloudDeviceName')||localStorage.getItem('salesTrackerDeviceName')||'iPhone master';
    await pushCloudStore(store,device);

    // 5) Read-back verification: count and every local ID must exist.
    btn.textContent='Verifica Cloud…';
    const after=await readPrimaryCloudStoreRaw();
    const afterContracts=after?.data?.contracts||[];
    const afterIds=new Set(afterContracts.map(c=>String(c.id)));
    const missingAfter=localContracts.filter(c=>c?.id&&!afterIds.has(String(c.id)));

    if(afterContracts.length!==localContracts.length || missingAfter.length){
      throw new Error(`Verifica finale fallita: locale ${localContracts.length}, Cloud ${afterContracts.length}, mancanti ${missingAfter.length}. Non usare ancora l’iPad.`);
    }

    $('cloudMasterPassword').value='';
    status.innerHTML=`<strong>✓ Cloud riallineato e verificato</strong><br>${afterContracts.length} contratti presenti · aggiornato ${after?.updated_at?formatDate(after.updated_at):'ora'}. Ora puoi aggiornare l’iPad con “Scarica e unisci dal Cloud”.`;
    // Riattiva immediatamente il normale percorso AutoSync dopo il riallineamento master.
    scheduleGuaranteedCloudPush();

    alert(`Riallineamento completato.\n\nCloud verificato: ${afterContracts.length} contratti.\n\nOra passa all’iPad e usa “Scarica e unisci dal Cloud”.`);
    await renderCloud();
  }catch(e){
    console.error('Safe master realign',e);
    status.innerHTML=`<strong>Operazione interrotta</strong><br>${e.message||e}`;
    alert(`Riallineamento NON completato.\n\n${e.message||e}\n\nI dati locali non sono stati sostituiti.`);
  }finally{
    btn.disabled=false;
    btn.textContent='Rinnova sessione e riallinea Cloud';
  }
}


function pdfAuditEsc(v){
  return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

async function runPdfCloudAudit(){
  const host=$('cloudPdfAuditResult'),btn=$('cloudRunPdfAudit');
  if(!host||!btn)return;
  if(!getCloudSession()?.access_token){
    alert('Accedi prima a SmartTracker Cloud.');
    return;
  }

  btn.disabled=true;
  btn.textContent='Analisi PDF…';
  host.classList.remove('hidden');
  host.innerHTML='<div class="muted">Controllo database Cloud e Storage PDF in corso…</div>';

  try{
    const active=(store.contracts||[]).filter(c=>c?.status!=='deleted');
    const raw=await readPrimaryCloudStoreRaw();
    const cloudContracts=raw?.data?.contracts||[];
    const cloudMap=new Map(cloudContracts.map(c=>[String(c.id),c]));

    const results=[];
    const batchSize=4;

    for(let i=0;i<active.length;i+=batchSize){
      const batch=active.slice(i,i+batchSize);
      const partial=await Promise.all(batch.map(async c=>{
        const cloudC=cloudMap.get(String(c.id))||null;
        let storage={exists:false,status:null,error:null,path:null};
        try{
          const probe=await pdfCloudProbe(c.id);
          storage={
            exists:!!probe?.exists,
            status:probe?.status??null,
            error:null,
            path:probe?.path||null
          };
        }catch(e){
          storage={exists:false,status:null,error:e.message||String(e),path:null};
        }

        const localRef=!!c?.cloudPdf;
        const dbRef=!!cloudC?.cloudPdf;
        let state='ok',label='OK';

        if(storage.error){
          state='error';label='Errore verifica Storage';
        }else if(!storage.exists){
          state='missing';label='PDF da caricare';
        }else if(storage.exists && (!localRef||!dbRef)){
          state='ref';label='PDF presente, riferimento da riallineare';
        }

        return {
          id:c.id,
          client:c.client||'Cliente',
          date:c.date||'',
          localRef,
          dbRef,
          cloudContractFound:!!cloudC,
          storage,
          state,
          label
        };
      }));
      results.push(...partial);
      host.innerHTML=`<div class="muted">Controllate ${Math.min(i+batch.length,active.length)} di ${active.length} pratiche…</div>`;
    }

    const missing=results.filter(r=>r.state==='missing');
    const ref=results.filter(r=>r.state==='ref');
    const errors=results.filter(r=>r.state==='error');
    const ok=results.filter(r=>r.state==='ok');
    if(missing.length||ref.length||errors.length)setHeaderCloudLight('warn',`${missing.length+ref.length+errors.length} PDF da controllare`);

    try{
      localStorage.setItem('smartTrackerPdfAuditLastV1',JSON.stringify({
        checkedAt:new Date().toISOString(),
        active:results.length,
        ok:ok.length,
        missing:missing.length,
        ref:ref.length,
        errors:errors.length,
        storagePresent:results.filter(r=>r.storage.exists).length
      }));
    }catch(_){}

    const row=r=>`
      <div class="cloud-diag-row ${r.state==='ok'?'cloud-diag-ok':'cloud-diag-ko'}">
        <span>${r.state==='ok'?'✓':r.state==='ref'?'↻':r.state==='error'?'!':'○'}</span>
        <div>
          <strong>${pdfAuditEsc(r.client)}</strong>
          <small>${pdfAuditEsc(r.date||'Data n/d')} · Locale ${r.localRef?'✓':'✕'} · DB ${r.dbRef?'✓':'✕'} · Storage ${r.storage.exists?'✓':'✕'}${r.storage.status?` · HTTP ${r.storage.status}`:''}</small>
          <small><b>${pdfAuditEsc(r.label)}</b>${r.storage.error?` · ${pdfAuditEsc(r.storage.error)}`:''}</small>
        </div>
      </div>`;

    const section=(title,list,cls='')=>list.length?`
      <div style="margin-top:12px"><strong>${title} (${list.length})</strong></div>
      <div class="${cls}">${list.map(row).join('')}</div>`:'';

    host.innerHTML=`
      <div class="cloud-diag-summary ${missing.length||ref.length||errors.length?'diag-ko':'diag-ok'}">
        <strong>${missing.length||ref.length||errors.length?'⚠ Controllo PDF completato':'✓ Tutti i PDF risultano corretti'}</strong>
        <small>${new Date().toLocaleString('it-IT')}</small>
      </div>
      <div class="cloud-diag-grid cloud-device-grid">
        <div><b>Pratiche attive</b><span>${results.length}</span></div>
        <div><b>PDF OK</b><span>${ok.length}</span></div>
        <div><b>Da caricare</b><span>${missing.length}</span></div>
        <div><b>Riferimento da riallineare</b><span>${ref.length}</span></div>
        <div><b>Errori verifica</b><span>${errors.length}</span></div>
        <div><b>PDF presenti Storage</b><span>${results.filter(r=>r.storage.exists).length}</span></div>
      </div>
      ${section('PDF DA CARICARE',missing)}
      ${section('PDF PRESENTE MA RIFERIMENTO DA RIALLINEARE',ref)}
      ${section('ERRORI DI VERIFICA',errors)}
      ${section('PDF OK',ok)}
      <div class="field-hint prospect-auto-no" style="margin-top:10px">Diagnostica sola lettura: nessun PDF o dato è stato modificato.</div>
    `;
  }catch(e){
    console.error('PDF Cloud audit',e);
    host.innerHTML=`<div class="cloud-diag-summary diag-ko"><strong>⚠ Diagnostica PDF non completata</strong><small>${pdfAuditEsc(e.message||e)}</small></div>`;
  }finally{
    btn.disabled=false;
    btn.textContent='Diagnostica PDF completa';
    renderBackup().catch(()=>{});
  }
}


async function simulateNewDeviceForRecoveryTest(){
  const raw=await readPrimaryCloudStoreRaw().catch(()=>null);
  const cloudContracts=raw?.data?.contracts||[];

  if(!cloudContracts.length){
    alert('Test bloccato: il Cloud non contiene contratti verificabili.');
    return;
  }

  const first=confirm(
    `TEST RIPRISTINO CLOUD\n\n`+
    `Cloud rilevato: ${cloudContracts.length} contratti.\n\n`+
    `Questa operazione cancellerà SOLO i dati locali di SmartTracker su questo dispositivo e poi ricaricherà l’app.\n`+
    `I dati Cloud non verranno modificati.\n\n`+
    `Continuare?`
  );
  if(!first)return;

  const second=confirm(
    `ULTIMA CONFERMA\n\n`+
    `Esegui questo test solo sul dispositivo secondario.\n\n`+
    `Dopo il riavvio SmartTracker apparirà vuoto/non collegato: accedi nuovamente al Cloud e dovrà ricostruire automaticamente i ${cloudContracts.length} contratti.\n\n`+
    `Azzero adesso SOLO SmartTracker locale?`
  );
  if(!second)return;

  try{
    // Rimuove solamente lo storage del dominio SmartTracker corrente.
    localStorage.clear();

    // Rimuove il vecchio archivio PDF locale di emergenza, senza toccare lo Storage Cloud.
    await new Promise(resolve=>{
      try{
        const req=indexedDB.deleteDatabase('salesTrackerPdfDB');
        req.onsuccess=()=>resolve();
        req.onerror=()=>resolve();
        req.onblocked=()=>resolve();
      }catch(_){resolve()}
    });

    location.reload();
  }catch(e){
    console.error('Recovery test reset',e);
    alert('Azzeramento locale non completato: '+(e.message||e));
  }
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
   btn.disabled=true;btn.textContent='Connessione…';

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
       alert(`SmartTracker Cloud\n\n${result.error}\n\nGuarda il riquadro diagnostico per il punto esatto.`);
       return;
     }

     $('cloudPassword').value='';

     // CLOUD-FIRST RECOVERY: dopo cache/reinstallazione, se il locale è vuoto
     // ricostruisce automaticamente SmartTracker dal database Cloud.
     try{
       const raw=await readPrimaryCloudStoreRaw();
       const cloudCount=raw?.data?.contracts?.length||0;
       const localCount=store.contracts?.length||0;
       if(localCount===0 && cloudCount>0){
         const device=localStorage.getItem('smartTrackerCloudDeviceName')||'Dispositivo ripristinato';
         const restored=await downloadAndMerge(store,device);
         if(restored?.store){
           store=restored.store;
           saveStore(store);
           createAutoBackup(store);
           renderAll();
           alert(`Login Cloud riuscito. SmartTracker ripristinato automaticamente dal Cloud: ${store.contracts.length} contratti.`);
           await renderCloud();
           return;
         }
       }
     }catch(restoreErr){
       console.warn('Ripristino automatico Cloud',restoreErr);
     }

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
   finally{btn.disabled=false;btn.textContent='Forza sincronizzazione'}
 };

 const cloudMasterBtn=$('cloudMasterRealign');
  if(cloudMasterBtn)cloudMasterBtn.onclick=()=>safeMasterRealignFromThisDevice();

  const cloudDeviceDiagBtn=$('cloudRunDeviceDiagnostic');
  if(cloudDeviceDiagBtn)cloudDeviceDiagBtn.onclick=()=>runDeviceCloudDiagnostic();

  const cloudPdfAuditBtn=$('cloudRunPdfAudit');
  if(cloudPdfAuditBtn)cloudPdfAuditBtn.onclick=()=>runPdfCloudAudit();

  const recoveryTestBtn=$('cloudSimulateNewDevice');
  if(recoveryTestBtn)recoveryTestBtn.onclick=()=>simulateNewDeviceForRecoveryTest();

  $('cloudLogout').onclick=async()=>{
   if(!confirm('Disconnettere SmartTracker Cloud da questo dispositivo? I dati locali resteranno disponibili.'))return;
   await cloudLogout();
   await renderCloud();
 };
 return info;
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


const CLOUD_HEARTBEAT_KEY='smartTrackerCloudHeartbeatV1';
const PDF_AUDIT_LAST_KEY='smartTrackerPdfAuditLastV1';

function readJsonLocal(key){
  try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}
}

function heartbeatFromCloudInfo(info){
  const previous=readJsonLocal(CLOUD_HEARTBEAT_KEY);
  const row=info?.row;
  const err=info?.error||info?.meta?.lastError||'';
  const transient=/aborted|aborterror|fetch is aborted/i.test(String(err));
  if(transient && previous?.ok){
    return {...previous,transient:true,transientAt:new Date().toISOString()};
  }
  const result={
    ok:!!info?.loggedIn && !!row?.data && !err,
    checkedAt:new Date().toISOString(),
    contracts:row?.data?.contracts?.length||0,
    cloudUpdatedAt:row?.updated_at||null,
    error:err||(!info?.loggedIn?'Sessione Cloud assente':'')
  };
  localStorage.setItem(CLOUD_HEARTBEAT_KEY,JSON.stringify(result));
  const same=Number(result.contracts||0)===(store.contracts||[]).length;
  setHeaderCloudLight(result.ok?(same?'online':'warn'):'offline',result.ok?`${result.contracts}/${(store.contracts||[]).length} contratti`:result.error||'');
  return result;
}

async function runCloudHeartbeat(force=false){
  const cached=readJsonLocal(CLOUD_HEARTBEAT_KEY);
  if(!force&&cached?.checkedAt&&(Date.now()-new Date(cached.checkedAt).getTime())<60000){
    const same=Number(cached.contracts||0)===(store.contracts||[]).length;
    setHeaderCloudLight(cached.ok?(same?'online':'warn'):'offline',cached.ok?`${cached.contracts||0}/${(store.contracts||[]).length} contratti`:cached.error||'');
    return cached;
  }
  try{
    const info=await cloudInfo();
    return heartbeatFromCloudInfo(info);
  }catch(e){
    const msg=e?.message||String(e);
    if(/aborted|aborterror|fetch is aborted/i.test(msg) && cached?.ok){
      return {...cached,transient:true,transientAt:new Date().toISOString()};
    }
    const result={ok:false,checkedAt:new Date().toISOString(),error:msg};
    localStorage.setItem(CLOUD_HEARTBEAT_KEY,JSON.stringify(result));
    setHeaderCloudLight('offline',msg);
    return result;
  }
}

function cloudSecurityHtml({heartbeat,pdfAudit,info}){
  const localCount=(store.contracts||[]).length;
  const cloudCount=Number(heartbeat?.contracts??info?.row?.data?.contracts?.length??0);
  const dbOk=!!heartbeat?.ok && cloudCount===localCount;
  const sessionOk=!!getCloudSession()?.access_token;

  const localPdfRefs=(store.contracts||[]).filter(c=>c?.status!=='deleted'&&c?.cloudPdf).length;
  const activeCount=(store.contracts||[]).filter(c=>c?.status!=='deleted').length;

  const pdfAuditFresh=pdfAudit?.checkedAt && (Date.now()-new Date(pdfAudit.checkedAt).getTime())<7*86400000;
  const pdfOk=!!pdfAuditFresh && Number(pdfAudit?.ok||0)===activeCount && Number(pdfAudit?.missing||0)===0 && Number(pdfAudit?.errors||0)===0 && Number(pdfAudit?.ref||0)===0;

  const protectedOk=dbOk && sessionOk && pdfOk;
  const protectedLabel=protectedOk?'Cloud protetto e ripristinabile':dbOk?'Cloud attivo · verifica PDF consigliata':'Controllo Cloud richiesto';

  const statusIcon=protectedOk?'✓':dbOk?'●':'!';
  const hbText=heartbeat?.checkedAt?formatDate(heartbeat.checkedAt):'Mai';
  const pdfText=pdfAuditFresh
    ?`${pdfAudit.ok||0}/${activeCount} verificati · ${formatDate(pdfAudit.checkedAt)}`
    :`${localPdfRefs}/${activeCount} riferimenti · diagnostica completa consigliata`;

  return `<div class="card cloud-security-overview">
    <div class="cloud-security-head">
      <div>
        <div class="section-kicker">SICUREZZA CLOUD</div>
        <h3>${statusIcon} ${protectedLabel}</h3>
      </div>
      <span class="cloud-security-pill ${protectedOk?'cloud-security-ok':dbOk?'cloud-security-warn':'cloud-security-ko'}">${protectedOk?'PROTETTO':dbOk?'ONLINE':'VERIFICA'}</span>
    </div>
    <div class="cloud-security-grid">
      <div><small>Database Cloud</small><strong>${dbOk?'✓':'!'} ${cloudCount}/${localCount}</strong><span>contratti</span></div>
      <div><small>PDF Cloud</small><strong>${pdfOk?'✓':'●'} ${pdfText}</strong><span>${pdfOk?'Storage verificato':'riferimenti Cloud'}</span></div>
      <div><small>Sessione</small><strong>${sessionOk?'✓ Attiva':'! Login richiesto'}</strong><span>${getCloudSession()?.user?.email||''}</span></div>
      <div><small>Ultimo controllo</small><strong>${heartbeat?.ok?'✓ '+hbText:hbText}</strong><span>${heartbeat?.ok?'Cloud raggiungibile':heartbeat?.error||'Non eseguito'}</span></div>
    </div>
    <div class="field-hint">I dati locali sono una cache. Dopo la cancellazione dei dati browser basta effettuare nuovamente il login per ricostruire SmartTracker dal Cloud.</div>
  </div>`;
}

async function renderBackup(){
 const health=$('backupHealth');
 if(!health)return;

 try{
   const info=await renderCloud().catch(e=>{console.error('Cloud UI',e);return null});
   const heartbeat=info?heartbeatFromCloudInfo(info):readJsonLocal(CLOUD_HEARTBEAT_KEY);
   const pdfAudit=readJsonLocal(PDF_AUDIT_LAST_KEY);
   health.innerHTML=cloudSecurityHtml({heartbeat,pdfAudit,info});

   const auto=getAutoBackupMeta();
   $('autoBackupInfo').innerHTML=`<div class="note"><strong>${auto?.name||'SmartTrackerLocal'}</strong><br>Ultimo aggiornamento: <strong>${formatDate(auto?.createdAt)}</strong><br>Contratti inclusi: ${auto?.contracts??0} · Dimensione: ${formatBytes(auto?.bytes||0)}</div>`;

   const full=getFullBackupMeta();
   $('fullBackupInfo').textContent=`Ultimo backup completo: ${formatDate(full?.createdAt)}${full?` · ${full.pdfs} PDF · ${formatBytes(full.bytes)}`:''}`;

   const backupState=fullBackupTrafficLight(full);
   const badge=$('fullBackupBadge');
   badge.className=`backup-status backup-status-${backupState.level}`;
   $('fullBackupStatusText').textContent=full?'Backup disponibile':'Opzionale';
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



function regulationPeriodState(r){
 const active=store.settings.activeMonth||store.settings.currentMonth||currentMonthKey();
 const probe=`${active}-15`;
 const isReference=r.cadence==='Riferimento';
 const isActive=isReference||((!r.start||probe>=r.start)&&(!r.end||probe<=r.end));
 if(isActive)return {label:isReference?'Riferimento':'Attivo',cls:'active',active:true};
 return {label:'Chiuso',cls:'closed',active:false};
}
function regulationVisualStatus(r){return regulationPeriodState(r)}
function regulationCardHtml(r){
 const rs=regulationVisualStatus(r);
 return `<div class="card regulation-card" data-regulation-id="${r.id}">
   <div class="regulation-head">
     <div>
       <div class="regulation-type">${r.type} · ${r.cadence}</div>
       <strong>${r.title}</strong>
       <div class="muted">${r.periodLabel}</div>
     </div>
     <div class="regulation-status regulation-status-${rs.cls}">${rs.label}</div>
   </div>
   <div class="muted" style="margin-top:10px">${r.summary}</div>
 </div>`;
}
function renderRegulations(){
 const list=$('regulationsList'),detail=$('regulationDetail');
 if(!list||!detail)return;
 const all=regulationGroups().flatMap(g=>g.items);
 const active=all.filter(r=>regulationPeriodState(r).active).sort((a,b)=>a.type.localeCompare(b.type)||b.start.localeCompare(a.start));
 const closed=all.filter(r=>!regulationPeriodState(r).active);
 const closedTypes=['Excellent','Community','Gara Agenzia'].filter(type=>closed.some(r=>r.type===type));
 list.classList.remove('hidden');detail.classList.add('hidden');
 list.innerHTML=`
   <div class="regulations-active-section">
     <div class="regulations-section-head"><div><div class="section-kicker">IN CORSO</div><h3>Regolamenti attivi</h3></div><span class="reg-count">${active.length}</span></div>
     ${active.length?active.map(regulationCardHtml).join(''):'<div class="card muted">Nessun regolamento attivo per il periodo selezionato.</div>'}
   </div>
   <div class="regulations-history-section">
     <div class="regulations-section-head"><div><div class="section-kicker">ARCHIVIO REGOLE</div><h3>Regolamenti chiusi</h3></div><span class="reg-count">${closed.length}</span></div>
     ${closedTypes.length?closedTypes.map(type=>{
       const items=closed.filter(r=>r.type===type).sort((a,b)=>b.start.localeCompare(a.start));
       return `<details class="reg-history-group"><summary><span>${type}</span><b>${items.length}</b></summary><div class="reg-history-items">${items.map(regulationCardHtml).join('')}</div></details>`;
     }).join(''):'<div class="card muted">Lo storico comparirà qui quando termineranno i periodi attivi.</div>'}
   </div>`;
 document.querySelectorAll('[data-regulation-id]').forEach(card=>card.onclick=()=>openRegulation(card.dataset.regulationId));
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


let selectedCommissionAgent=localStorage.getItem('smartTrackerCommissionAgent')||'Francesco';


function commissionPaymentBuckets(data){
 const buckets={};
 const add=(month,type,amount,row)=>{
   amount=Number(amount||0); if(!month||!amount)return;
   buckets[month]=buckets[month]||{total:0,items:[]};
   buckets[month].total+=amount;buckets[month].items.push({type,amount,row});
 };
 const addMonths=(date,n)=>{const d=new Date(`${date}T12:00:00`);d.setMonth(d.getMonth()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`};
 for(const r of data.rows||[]){
   if(r.status!=='calculated')continue;
   if(r.rule==='Easy Rent'){add(addMonths(r.date,2),'Easy Rent · gettone 60 gg',r.base,r);continue}
   add(addMonths(r.date,2),r.rule==='M2M'?'M2M · 2 canoni 60 gg':'Base · 60 gg',r.base60??r.base,r);
   add(addMonths(r.date,3),'Canone extra differito',r.deferred90,r);
   add(addMonths(r.date,3),'Prospect · 90 gg',r.prospectExtra,r);
   if(Number(r.individualExtra||0)>0){
     const qm=Math.ceil(Number(String(r.date).slice(5,7))/3)*3;
     let y=Number(String(r.date).slice(0,4)),m=qm+3;if(m>12){y++;m-=12}
     add(`${y}-${String(m).padStart(2,'0')}`,'Gara individuale · 90 gg chiusura trimestre',r.individualExtra,r);
   }
 }
 return buckets;
}
function monthLabelIT(k){const [y,m]=k.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('it-IT',{month:'long',year:'numeric'})}
function renderCommissionDrilldown(kind,data){
 const host=$('commissionDrilldown');if(!host)return;
 const buckets=commissionPaymentBuckets(data),months=Object.keys(buckets).sort();
 let title='Stima provvigioni per mese di pagamento',filter=()=>true;
 if(kind==='base'){title='Base calcolabile per mese di pagamento';filter=i=>/Base|Easy Rent|M2M/.test(i.type)}
 if(kind==='extra'){title='Extra determinabili per mese di pagamento';filter=i=>!/Base|Easy Rent|M2M/.test(i.type)}
 const blocks=[];
 for(const month of months){
   const items=buckets[month].items.filter(filter),total=items.reduce((a,i)=>a+i.amount,0);if(!items.length||!total)continue;
   const groups={};for(const i of items)groups[i.type]=(groups[i.type]||0)+i.amount;
   blocks.push(`<details class="commission-month-detail" ${blocks.length===0?'open':''}>
    <summary><span>${monthLabelIT(month)}</span><strong>${money(total)}</strong></summary>
    <div class="commission-month-types">${Object.entries(groups).map(([t,a])=>`<div><span>${t}</span><b>${money(a)}</b></div>`).join('')}</div>
    <details class="commission-practice-detail"><summary>Vedi pratiche incluse (${items.length})</summary>
    ${items.map(i=>`<div class="commission-practice-line"><span>${i.row.client}<small>${i.row.service}${i.row.product?' · '+i.row.product:''} · produzione ${String(i.row.date).slice(0,7)}</small></span><b>${money(i.amount)}</b></div>`).join('')}</details>
   </details>`);
 }
 host.innerHTML=`<div class="card commission-drill-card"><div class="commission-drill-head"><h3>${title}</h3><button id="closeCommissionDrill" class="secondary">Chiudi</button></div>${blocks.join('')||'<p class="muted">Nessun pagamento determinabile.</p>'}</div>`;
 host.scrollIntoView({behavior:'smooth',block:'start'});$('closeCommissionDrill').onclick=()=>host.innerHTML='';
}

function renderCommissions(){
 const box=$('commissionsSummary'),list=$('commissionsList'),ruleBox=$('commissionsRules');
 if(!box||!list||!ruleBox)return;

 const q=store.settings.agencyPeriod||{start:'2026-07-01',end:'2026-09-30'};
 const data=commissionsForPeriod(store,q.start,q.end,selectedCommissionAgent);
 const t=data.target;
 const excellentForCommission=selectedCommissionAgent==='Francesco'
   ?excellentStats({...store,settings:{...store.settings,excellentPeriod:{start:q.start,end:q.end}}})
   :null;
 const receivables=buildReceivables(store,data,excellentForCommission,q.start,selectedCommissionAgent);
 const agencyQuarterKey=data.ruleSet?.id||'2026-Q3';
 store.settings.agencyQuarterLocks=store.settings.agencyQuarterLocks||{};
 const agencyQuarterLock=store.settings.agencyQuarterLocks[agencyQuarterKey]||null;
 const agencyQuarterLocked=!!agencyQuarterLock?.locked;

 const currentMonth=receivables.currentMonth;
 const nextMonth=(()=>{const [y,m]=currentMonth.split('-').map(Number),d=new Date(y,m,1,12);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`})();
 const monthTotal=k=>(receivables.byMonth?.[k]||[]).reduce((a,r)=>a+Number(r.estimated||0),0);
 const laterTotal=Object.entries(receivables.byMonth||{}).filter(([k])=>k>nextMonth).reduce((a,[,rows])=>a+rows.reduce((x,r)=>x+Number(r.estimated||0),0),0);
 const potentialIndividual=t.won?0:Number(t.potentialIndividual||0);
 const agencyResult=store.settings.agencyQuarterResults?.[agencyQuarterKey]||{core:'pending',fixed:'pending',digital:'pending'};
 const agencyLabel=v=>v==='yes'?'Raggiunta':v==='no'?'Non raggiunta':'Da definire';
 box.innerHTML=`
 <div class="commission-agent-compact">
   <label>Agente</label>
   <select id="commissionAgentSelect">${(store.settings.agents||['Francesco','Jacopo','Luciano']).map(a=>`<option ${a===selectedCommissionAgent?'selected':''}>${a}</option>`).join('')}</select>
 </div>
 <div class="card commission-receivable-hero commission-clickable" data-commission-drill="all">
   <small>DA RICEVERE</small><strong>${money(receivables.total)}</strong>
   <div class="commission-hero-meta"><span>Certe ${money(receivables.total)}</span><span>Potenziali ${money(potentialIndividual)}</span></div>
 </div>
 <div class="commission-payment-mini-grid">
   <button class="card commission-mini-card commission-clickable" data-commission-drill="all"><small>Questo mese</small><strong>${money(monthTotal(currentMonth))}</strong><span>${monthLabelIT(currentMonth)}</span></button>
   <button class="card commission-mini-card commission-clickable" data-commission-drill="all"><small>Prossimo mese</small><strong>${money(monthTotal(nextMonth))}</strong><span>${monthLabelIT(nextMonth)}</span></button>
   <button class="card commission-mini-card commission-clickable" data-commission-drill="all"><small>Più avanti</small><strong>${money(laterTotal)}</strong><span>pagamenti futuri</span></button>
 </div>
 <div class="card commission-boost-compact">
   <div class="commission-compact-head"><strong>Accesso boost</strong><span>Soglia € 250/mese</span></div>
   ${(data.boostMonths||[]).map(x=>`<div class="commission-boost-line ${x.unlocked?'ok':'warn'}"><span><b>${monthLabelIT(x.month)}</b><small>${money(x.inflow)} / € 250</small></span><strong>${x.unlocked?'✓ BOOST OK':x.ko?'✕ BOOST KO':'-'+money(x.remaining)}</strong></div>`).join('')||'<div class="muted">Nessun mese con inflow nel trimestre.</div>'}
 </div>
 ${selectedCommissionAgent==='Francesco'?`<details class="card commission-agency-summary">
   <summary><span><small>GARA AGENZIA · ${agencyQuarterKey}</small><strong>${agencyQuarterLocked?'🔒 Esito chiuso':'Gestisci esito'}</strong></span><b>›</b></summary>
   <div class="commission-agency-status-row"><span>CORE</span><b>${agencyLabel(agencyResult.core)}</b></div>
   <div class="commission-agency-status-row"><span>ADSL + One Net</span><b>${agencyLabel(agencyResult.fixed)}</b></div>
   <div class="commission-agency-status-row"><span>Digital</span><b>${agencyLabel(agencyResult.digital)}</b></div>
   <div class="agency-outcome-grid compact-agency-controls">
   ${[['core','CORE'],['fixed','ADSL + One Net'],['digital','Digital']].map(([key,label])=>{const v=agencyResult[key]||'pending';return `<label><span>${label}</span><select data-agency-outcome="${key}" data-quarter="${agencyQuarterKey}" ${agencyQuarterLocked?'disabled':''}><option value="pending" ${v==='pending'?'selected':''}>Da definire</option><option value="yes" ${v==='yes'?'selected':''}>Raggiunta</option><option value="no" ${v==='no'?'selected':''}>Non raggiunta</option></select></label>`}).join('')}
   </div>
   <div class="agency-lock-box compact-lock-box"><button id="${agencyQuarterLocked?'reopenAgencyQuarter':'closeAgencyQuarter'}" class="${agencyQuarterLocked?'secondary':'primary'}">${agencyQuarterLocked?'Riapri trimestre':'Chiudi esito gare trimestrali'}</button></div>
 </details>`:''}
 <div class="commission-access-grid">
   <button class="card commission-access-card" data-commission-drill="all"><span>Per mese di pagamento</span><b>›</b></button>
   <button class="card commission-access-card" id="commissionByType"><span>Per tipologia</span><b>›</b></button>
   <button class="card commission-access-card" data-commission-target><span>Target individuale</span><b>${t.won?'Raggiunto':'In corso'} ›</b></button>
   <button class="card commission-access-card" data-commission-manual><span>Voci da completare</span><b>${data.manualCount} ›</b></button>
 </div>`;
 box.insertAdjacentHTML('beforeend',`<details id="commissionTypeDetails" class="commission-hidden-details"><summary>Dettaglio per tipologia</summary>${receivablesHtml(receivables)}</details>`);
 box.querySelectorAll('[data-open-community-prizes]').forEach(el=>el.onclick=()=>openCommunityPrizeRegulation());
 const byTypeBtn=$('commissionByType'),typeDetails=$('commissionTypeDetails');if(byTypeBtn&&typeDetails)byTypeBtn.onclick=()=>{typeDetails.open=true;typeDetails.scrollIntoView({behavior:'smooth',block:'start'})};

 let drill=$('commissionDrilldown');
 if(!drill){drill=document.createElement('div');drill.id='commissionDrilldown';box.insertAdjacentElement('afterend',drill)}
 document.querySelectorAll('[data-commission-drill]').forEach(el=>el.onclick=()=>renderCommissionDrilldown(el.dataset.commissionDrill,data));

 const activeRule=data.ruleSet;
 ruleBox.innerHTML=`<details class="card commission-rules-card commission-rules-collapsed"><summary><span>Regole provvigionali applicate</span><b>${activeRule?.id||'—'} ›</b></summary><div class="commission-rules-inner">
   <div class="commission-rules-title">
     <div><small>VERSIONE REGOLE APPLICATA</small><h3>${activeRule?.label||'Regole non disponibili'}</h3></div>
     <span class="rule-version-badge">${activeRule?.id||'—'}</span>
   </div>
   <p class="muted">Ogni contratto usa automaticamente le regole valide nella propria data di produzione. Le versioni chiuse restano nello storico e non vengono sovrascritte.</p>
   <h3>Motore provvigionale — stato attuale</h3>
   <div class="commission-rule-row"><span>Core / ADSL / One Net / Easy Deal</span><b class="ok-text">Calcolo base attivo</b></div>
   <div class="commission-rule-row"><span>Prospect</span><b class="ok-text">Calcolato quando presente</b></div>
   <div class="commission-rule-row"><span>Target individuale Q3</span><b>${t.won?'Applicato':'Non ancora applicato'}</b></div>
   <div class="commission-rule-row"><span>Target Agenzia + Rush</span><b class="pending-text">Da confermare</b></div>
   <div class="commission-rule-row"><span>Digital / Energy / Gas</span><b class="pending-text">Listino da completare</b></div>
   <p class="muted" style="margin-top:12px">La prima versione evita di attribuire automaticamente importi non ancora supportati da una regola certa.</p>
   <div class="commission-rule-history">
     <h3>Storico regole provvigionali</h3>
     ${(data.ruleSets||[]).slice().reverse().map(rs=>`
       <details class="rule-history-item" ${rs.status==='active'?'open':''}>
         <summary><span>${rs.label}</span><b>${rs.status==='active'?'ATTIVA':'STORICO'}</b></summary>
         <div class="rule-history-body">
           <div><strong>Validità:</strong> ${rs.start} → ${rs.end}</div>
           <div><strong>Soglia boost mensile:</strong> ${money(rs.monthlyBoostAccess||0)}</div>
           <div><strong>Target individuale:</strong> ${rs.targetIndividual?.totalInflow?money(rs.targetIndividual.totalInflow)+' inflow · ':''}${rs.targetIndividual?.corePieces||0} Core / ${money(rs.targetIndividual?.coreInflow||0)} · ${rs.targetIndividual?.adsl||0} ADSL · ${rs.targetIndividual?.oneNet||0} One Net</div>
           ${(rs.notes||[]).map(n=>`<div class="rule-note">• ${n}</div>`).join('')}
         </div>
       </details>`).join('')}
   </div>
</div></details>`;

 const paymentGroups=(data.paymentMonths||[]).filter(g=>g.rows.length);
 list.innerHTML=paymentGroups.length?`<details class="commission-practice-details"><summary>Dettaglio pratiche e movimenti</summary>${paymentGroups.map(g=>`
   <div class="commission-payment-month">
     <div class="commission-payment-title"><div><small>MESE DI PAGAMENTO</small><h3>${g.month}</h3></div><strong>${money(g.total)}</strong></div>
     ${g.rows.map(r=>`<div class="card commission-row">
       <div class="commission-row-head">
         <div><strong>${r.client}</strong><div class="muted">Produzione ${r.productionMonth||String(r.date).slice(0,7)} · ${r.service}${r.product&&r.product!==r.service?' · '+r.product:''}</div></div>
         <div class="commission-amount">${r.status==='calculated'?money(r.estimated):'—'}</div>
       </div>
       ${r.status==='calculated'
         ?`<div class="commission-breakdown"><span>${r.component||'Provvigione'}</span><span>Pagamento ${r.paymentMonth||'—'}</span><span>Inflow ${money(r.inflow)}</span></div>
           ${r.note60?`<div class="commission-easyrent">${r.rule==='M2M'?'M2M · ':''}${r.note60}${r.rushEligible?' · inflow valido Rush':''}${r.rule==='M2M'?' · esclusa dai target SIM Voce/Dati':''}</div>`:''}
           ${r.note90?`<div class="commission-easyrent">${r.note90}</div>`:''}
           ${r.rule==='Easy Rent'&&r.note?`<div class="commission-easyrent">${r.note} · inflow valido Rush</div>`:''}
           ${r.noteAgency?`<div class="commission-easyrent">${r.noteAgency}</div>`:''}
           ${r.pending?.length?`<div class="commission-pending">${r.pending.join(' · ')}</div>`:''}`
         :`<div class="commission-pending">${r.note}</div>${r.canReparse?`<button class="secondary er-reparse-btn" data-er-reparse="${r.contractId}" style="margin-top:10px">Carica e rileggi offerta PDF</button>`:''}`}
     </div>`).join('')}
   </div>`).join('')}</details>`
   :'<div class="card"><p class="muted">Nessun pagamento provvigionale calcolabile nel periodo.</p></div>';
 const manualCard=document.querySelector('[data-commission-manual]');
 if(manualCard)manualCard.onclick=()=>{
   let host=$('commissionDrilldown');
   if(!host){host=document.createElement('div');host.id='commissionDrilldown';box.insertAdjacentElement('afterend',host)}
   const missing=(data.rows||[]).filter(r=>r.status==='manual');
   host.innerHTML=`<div class="card commission-drill-card"><div class="commission-drill-head"><h3>Voci da completare</h3><button id="closeCommissionManual" class="secondary">Chiudi</button></div>${missing.length?missing.map(r=>`<div class="commission-missing-row"><strong>${r.client}</strong><small>${r.service}${r.product?' · '+r.product:''} · inflow ${money(r.inflow)}</small><div>${r.note||'Regola provvigionale mancante'}</div></div>`).join(''):'<p class="muted">Nessuna voce da completare.</p>'}</div>`;
   $('closeCommissionManual').onclick=()=>host.innerHTML='';
 };
 document.querySelectorAll('[data-agency-outcome]').forEach(sel=>sel.onchange=()=>{
   const q=sel.dataset.quarter||'2026-Q3',key=sel.dataset.agencyOutcome;
   if(store.settings.agencyQuarterLocks?.[q]?.locked){renderCommissions();return}
   store.settings.agencyQuarterResults=store.settings.agencyQuarterResults||{};
   store.settings.agencyQuarterResults[q]=store.settings.agencyQuarterResults[q]||{core:'pending',fixed:'pending',digital:'pending',updatedAt:null};
   store.settings.agencyQuarterResults[q][key]=sel.value;
   store.settings.agencyQuarterResults[q].updatedAt=new Date().toISOString();
   persistStore();renderCommissions();
 });
 const closeAgencyQuarter=$('closeAgencyQuarter');
 if(closeAgencyQuarter)closeAgencyQuarter.onclick=()=>{
   const result=store.settings.agencyQuarterResults?.[agencyQuarterKey]||{core:'pending',fixed:'pending',digital:'pending'};
   const labels={pending:'Da definire',yes:'Raggiunta',no:'Non raggiunta'};
   const summary=`CORE: ${labels[result.core]||result.core}\nADSL + One Net: ${labels[result.fixed]||result.fixed}\nDigital: ${labels[result.digital]||result.digital}`;
   if(!confirm(`Chiudere ${agencyQuarterKey}?\n\n${summary}\n\nDopo la chiusura le scelte saranno bloccate.`))return;
   store.settings.agencyQuarterLocks[agencyQuarterKey]={locked:true,closedAt:new Date().toISOString()};
   persistStore();renderCommissions();
 };
 const reopenAgencyQuarter=$('reopenAgencyQuarter');
 if(reopenAgencyQuarter)reopenAgencyQuarter.onclick=()=>{
   if(!confirm(`Riaprire ${agencyQuarterKey}? Gli esiti torneranno modificabili.`))return;
   delete store.settings.agencyQuarterLocks[agencyQuarterKey];
   persistStore();renderCommissions();
 };
 const targetCard=document.querySelector('[data-commission-target]');
 if(targetCard)targetCard.onclick=()=>{
   let host=$('commissionDrilldown');
   if(!host){host=document.createElement('div');host.id='commissionDrilldown';box.insertAdjacentElement('afterend',host)}
   const rows=t.potentialRows||[];
   host.innerHTML=`<div class="card commission-drill-card">
     <div class="commission-drill-head"><h3>${t.won?'Extra target individuale applicato':'Potenziale target individuale'}</h3><button id="closeCommissionTarget" class="secondary">Chiudi</button></div>
     <div class="commission-potential-total"><small>${t.won?'TOTALE APPLICATO':'SE IL TARGET FOSSE RAGGIUNTO OGGI'}</small><strong>${money(t.potentialIndividual||0)}</strong></div>
     <p class="muted">Sono incluse solo le pratiche dei mesi che hanno già sbloccato la soglia mensile di accesso ai boost.</p>
     ${rows.length?rows.map(r=>`<div class="commission-practice-line"><span>${r.client}<small>${r.service}${r.product?' · '+r.product:''} · ${r.date}</small></span><b>${money(r.amount)}</b></div>`).join(''):'<p class="muted">Nessun extra individuale potenziale sulle pratiche attualmente eleggibili.</p>'}
   </div>`;
   host.scrollIntoView({behavior:'smooth',block:'start'});
   $('closeCommissionTarget').onclick=()=>host.innerHTML='';
 };

 const commissionAgentSelect=$('commissionAgentSelect');
 if(commissionAgentSelect)commissionAgentSelect.onchange=()=>{
   selectedCommissionAgent=commissionAgentSelect.value;
   localStorage.setItem('smartTrackerCommissionAgent',selectedCommissionAgent);
   renderCommissions();
 };

 document.querySelectorAll('[data-er-reparse]').forEach(btn=>btn.onclick=async()=>{
   const id=btn.dataset.erReparse;
   const c=store.contracts.find(x=>x.id===id);
   if(!c)return;

   const input=document.createElement('input');
   input.type='file';
   input.accept='application/pdf,.pdf';
   input.style.display='none';
   document.body.appendChild(input);

   input.onchange=async()=>{
     const pdf=input.files?.[0];
     input.remove();
     if(!pdf)return;

     btn.disabled=true;
     const oldLabel=btn.textContent;
     btn.textContent='Analisi offerta…';

     try{
       const reparsed=await parsePDF(pdf);
       const erRows=(reparsed.rows||[]).filter(x=>
         x.service==='Easy Rent' &&
         x.product &&
         !/da verificare/i.test(x.product)
       );

       if(!erRows.length){
         alert('Nel PDF selezionato non ho riconosciuto un device Easy Rent.');
         return;
       }

       // Aggiorniamo SOLO le righe Easy Rent.
       // Cliente, data, agente, Prospect e le altre righe del contratto restano invariati.
       const keep=(c.services||[]).filter(x=>x.service!=='Easy Rent');
       const fixedRows=erRows.map(x=>({
         ...x,
         id:'S-'+Math.random().toString(36).slice(2)
       }));

       c.services=[...keep,...fixedRows];
       c.updatedAt=new Date().toISOString();

       // Se dal PDF viene letto un inflow Easy Rent valido, quello diventa il valore tecnico corretto.
       // Non tocchiamo gli altri prodotti del contratto.
       persistStore();
       renderAll();

       const found=fixedRows.map(x=>`${x.product} · inflow ${money((Number(x.inflowUnit||0)*Number(x.qty||1)))}`).join('\n');
       alert('Offerta riletta e Easy Rent aggiornato:\n'+found);
     }catch(e){
       console.error(e);
       alert('Rilettura PDF non riuscita: '+(e.message||e));
     }finally{
       btn.disabled=false;
       btn.textContent=oldLabel;
     }
   };

   input.oncancel=()=>input.remove();
   input.click();
 });
}

function renderPeriodManager(){
 const select=$('globalMonthSelect');if(!select)return;
 const active=store.settings.activeMonth||store.settings.currentMonth||currentMonthKey();
 const months=availablePeriodMonths(store);if(!months.includes(active))months.unshift(active);
 select.innerHTML=months.map(m=>`<option value="${m}"${m===active?' selected':''}>${monthLabel(m)}</option>`).join('');
 const state=ensurePeriodState(store,active),q=quarterFromMonth(active);
 $('activePeriodLabel').textContent=monthLabel(active);
 const badge=$('activePeriodStatus');
 badge.className=`period-status period-status-${state.status}`;
 badge.textContent=`${periodStatusIcon(state.status)} ${periodStatusLabel(state.status)}`;
 badge.disabled=state.status==='closed';
 badge.title=state.status==='working'?'Tocca per segnare il mese come Verificato':state.status==='verified'?'Tocca per rimettere il mese In lavorazione':'Mese chiuso';
 $('activeQuarterInfo').textContent=`Community: ${monthLabel(active)} · Excellent/Gara: ${q.label}`;
 const closeBtn=$('togglePeriodClosed');
 closeBtn.textContent=state.status==='closed'?'Riapri mese':'Chiudi mese';
 closeBtn.classList.toggle('period-reopen-button',state.status==='closed');
 select.onchange=()=>{applyGlobalMonth(store,select.value);persistStore();renderAll()};
 badge.onclick=()=>{
   if(state.status==='closed')return;
   const next=state.status==='verified'?'working':'verified';
   const label=next==='verified'?'Verificato':'In lavorazione';
   if(!confirm(`Impostare ${monthLabel(active)} come “${label}”?`))return;
   const x=ensurePeriodState(store,active);x.status=next;x.manual=true;x.updatedAt=new Date().toISOString();persistStore();renderAll();
 };
 closeBtn.onclick=()=>{
   const closing=state.status!=='closed';
   const question=closing?`Chiudere ${monthLabel(active)}? Potrai riaprirlo in seguito.`:`Riaprire ${monthLabel(active)} e rimetterlo In lavorazione?`;
   if(!confirm(question))return;
   const x=ensurePeriodState(store,active);x.status=closing?'closed':'working';x.manual=true;x.updatedAt=new Date().toISOString();persistStore();renderAll();
 };
}
function selectedPeriodIsClosed(){const a=store.settings.activeMonth||store.settings.currentMonth;return ensurePeriodState(store,a).status==='closed'}
function renderAll(){renderPeriodManager();renderHome();renderAgency();renderExcellent();renderCommunity();renderTeam();renderCommissions();renderCustomers();renderRegulations();renderArchive();if(currentViewId==='settings')renderBackup()}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>go(b.dataset.view));
$('headerBack').onclick=()=>goBack();
$('headerNewContract').onclick=()=>go('new');
const __headerSettings=$('headerSettings'); if(__headerSettings)__headerSettings.onclick=()=>go('settings');
$('headerCloudStatus').onclick=()=>go('settings');
syncHeaderNavigation();
$('archiveSearch').oninput=renderArchive;
$('archiveMonth').onchange=renderArchive;
$('pdfInput').onchange=e=>e.target.files[0]&&handlePDF(e.target.files[0]);
$('saveParsed').onclick=saveParsed;
if($('exportBtn'))$('exportBtn').onclick=exportBackup;
if($('importInput'))$('importInput').onchange=e=>e.target.files[0]&&importBackup(e.target.files[0]);
$('agent').onchange=()=>{$('includeAgency').value=$('agent').value==='Francesco'?'Sì':'No'};
$('archiveAgent').onchange=renderArchive;

$('contractDate').valueAsDate=new Date();
await initParser();
ensureCloudButtonDiagnosticFallback();

const cloudDevice=ensureSmartDeviceName();
setHeaderCloudLight(getCloudSession()?.access_token?'checking':'offline',getCloudSession()?.access_token?'controllo in corso':'login richiesto');
const cloudBoot=await bootstrapLinkedCloud(store,cloudDevice);
if(cloudBoot?.store){
  store=cloudBoot.store;
  saveStore(store);
  createAutoBackup(store);
}
renderAll();

// Leggero controllo periodico: se un altro dispositivo ha aggiornato il Cloud,
// scarica e unisce senza interrompere il lavoro locale.
const pullCloudChanges=async()=>{
  if(!isCloudLinked()||!getCloudSession()?.access_token)return;
  try{
    const result=await bootstrapLinkedCloud(store,localStorage.getItem('smartTrackerCloudDeviceName')||'Dispositivo');
    if(result?.changed){
      store=result.store;
      saveStore(store);
      createAutoBackup(store);
      renderAll();
    }
    setHeaderCloudLight('online',`${(store.contracts||[]).length} contratti`);
  }catch(e){
    console.warn('Cloud auto pull',e);
  }
};
setInterval(pullCloudChanges,15000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pullCloudChanges()});
window.addEventListener('focus',pullCloudChanges);
window.addEventListener('pageshow',pullCloudChanges);