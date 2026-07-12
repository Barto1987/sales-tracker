
import {loadStore,saveStore,importBackupObject} from './storage.js?v=300';
import {TARGETS,generalStats,agencyStats,agencyBreakdown,excellentStats,excellentBreakdown,communityStats,communityBreakdown,teamStats,teamBreakdown,availableMonths,inflowOf} from './engines.js?v=300';
import {savePdf,openPdf,deletePdf} from './pdf-store.js?v=300';
import {initParser,parsePDF} from './parser.js?v=300';

let store=loadStore(),parsed=null,pendingPdf=null;
const $=id=>document.getElementById(id),money=v=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(v||0);
const pct=(v,t)=>Math.min((v/t)*100,100);

const pad=n=>String(n).padStart(2,'0');
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
   store.settings.currentMonth=mk;store.settings.teamMonth=mk;store.settings.communityMonth=mk;store.settings.lastAutoMonth=mk;
 }
 if(store.settings.lastAutoQuarter!==q.key){
   store.settings.agencyPeriod={start:q.start,end:q.end};store.settings.excellentPeriod={start:q.start,end:q.end};store.settings.lastAutoQuarter=q.key;
 }
 saveStore(store);
}
function quarterOptions(){
 const map=new Map();
 for(const c of store.contracts||[]){if(c.date){const q=quarterFromDate(c.date);map.set(q.key,q)}}
 const current=quarterInfo();map.set(current.key,current);
 for(const h of store.excellentHistory||[]){
   const m=(h.period||'').match(/(\d{4}) Q([1-4])/);
   if(m){const y=Number(m[1]),q=Number(m[2]),d=new Date(y,(q-1)*3,1);const info=quarterInfo(d);map.set(info.key,info)}
 }
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
 const g=generalStats(store),a=agencyStats(store),e=excellentStats(store),c=communityStats(store);
 $('homeTop').innerHTML=`<div class="card hero"><div class="muted">Luglio 2026</div><strong>${money(g.inflow)}</strong><div class="muted">${g.contracts} contratti · ${g.pieces} pezzi/servizi</div></div>`;
 $('homeCards').innerHTML=`
 <div class="card section-link" data-go="agency"><div><small>Gara Agenzia</small><strong>${Math.round(pct(a.coreInflow,TARGETS.agency.coreInflow))}%</strong></div><span>›</span></div>
 <div class="card section-link" data-go="excellent"><div><small>Excellent</small><strong>${money(e.variable)} extra</strong><div class="muted">${e.won?'Trimestre vinto':'Mancano '+money(Math.max(1000-e.variable,0))}</div></div><span>›</span></div>
 <div class="card section-link" data-go="community"><div><small>Community</small><strong>${Math.round(c.vcoins)} V-Coin</strong><div class="muted">${c.ability?'Ability OK':'Ability da completare'}</div></div><span>›</span></div>
 <div class="card section-link" data-go="team"><div><small>Squadra</small><strong>${money(teamStats(store).Totale.inflow)}</strong><div class="muted">inflow mese</div></div><span>›</span></div>
 <div class="card section-link" data-go="archive"><div><small>Archivio</small><strong>${store.contracts.length}</strong><div class="muted">contratti totali</div></div><span>›</span></div>`;
 document.querySelectorAll('[data-go]').forEach(x=>x.onclick=()=>go(x.dataset.go))
}
function renderAgency(){
 const periods=quarterOptions(),selected=periodKey(store.settings.agencyPeriod);
 $('agencyPeriodSelect').innerHTML=periods.map(q=>`<option value="${q.key}" ${q.key===selected?'selected':''}>${q.label}</option>`).join('');
 $('agencyPeriodSelect').onchange=()=>{const q=periods.find(x=>x.key===$('agencyPeriodSelect').value);store.settings.agencyPeriod={start:q.start,end:q.end};saveStore(store);renderAgency()};
 const a=agencyStats(store);
 $('agencyGrid').innerHTML=
   kpi('SIM + Dati + Easy Rent',a.corePieces,TARGETS.agency.corePieces,false,'corePieces','agency')+
   kpi('Inflow Core',a.coreInflow,TARGETS.agency.coreInflow,true,'coreInflow','agency')+
   kpi('ADSL',a.adsl,TARGETS.agency.adsl,false,'adsl','agency')+
   kpi('One Net',a.oneNet,TARGETS.agency.oneNet,false,'oneNet','agency')+
   kpi('Energia + Gas',a.energyGas,TARGETS.agency.energyGas,false,'energyGas','agency');
 bindMetricDetails('agency');
 $('agencyHistory').innerHTML=periods.map(q=>`<div class="item agency-history-item" data-agency-quarter="${q.key}"><div><strong>${q.label}</strong><div class="muted">${q.key===selected?'Visualizzato':'Apri riepilogo'}</div></div><span>›</span></div>`).join('');
 document.querySelectorAll('[data-agency-quarter]').forEach(x=>x.onclick=()=>{const q=periods.find(p=>p.key===x.dataset.agencyQuarter);store.settings.agencyPeriod={start:q.start,end:q.end};saveStore(store);renderAgency();window.scrollTo(0,0)});
}
function renderExcellent(){
 const periods=quarterOptions(),selected=periodKey(store.settings.excellentPeriod);
 $('excellentPeriodSelect').innerHTML=periods.map(q=>`<option value="${q.key}" ${q.key===selected?'selected':''}>${q.label}</option>`).join('');
 $('excellentPeriodSelect').onchange=()=>{const q=periods.find(x=>x.key===$('excellentPeriodSelect').value);store.settings.excellentPeriod={start:q.start,end:q.end};saveStore(store);renderExcellent()};
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

 $('excellentHistory').innerHTML=periods.map(q=>{
   const historical=(store.excellentHistory||[]).find(h=>(h.period||'').replace(' ','-')===q.key);
   return `<div class="item excellent-history-item" data-excellent-quarter="${q.key}"><div><strong>${q.label}</strong><div class="muted">${historical?historical.payment:(q.key===selected?'Visualizzato':'Apri riepilogo')}</div></div><div style="text-align:right">${historical?`<strong>${money(historical.total)}</strong><div class="badge ok">Vinto</div>`:'<span>›</span>'}</div></div>`;
 }).join('');
 document.querySelectorAll('[data-excellent-quarter]').forEach(x=>x.onclick=()=>{const q=periods.find(p=>p.key===x.dataset.excellentQuarter);store.settings.excellentPeriod={start:q.start,end:q.end};saveStore(store);renderExcellent();window.scrollTo(0,0)})
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
 other:'Altri boost V-Coin'
};

function renderMetricDetail(section,key,card){
 if(section==='excellent')return renderExcellentDetail(key,card);

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
     <div class="excellent-detail-meta">${r.date} · ${r.service} · quantità ${r.qty} · inflow ${money(r.inflow)} · ${r.agent}${r.prospect?' · Prospect':''}${r.mnp?' · MNP':''}</div>
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
     <div class="excellent-detail-meta">${r.date} · ${r.service} · quantità ${r.qty} · inflow pratica ${money(r.inflow)} · ${r.agent}${r.prospect?' · Prospect':''}</div>
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
   </table></div>`;
 }).join('');
 $('teamHistory').innerHTML=months.map(m=>`<div class="item team-history-item" data-team-month="${m}"><div><strong>${new Date(m+'-01T12:00:00').toLocaleDateString('it-IT',{month:'long',year:'numeric'})}</strong></div><span>›</span></div>`).join('');
 $('teamMonthSelect').onchange=()=>{store.settings.teamMonth=$('teamMonthSelect').value;saveStore(store);renderTeam()};
 document.querySelectorAll('[data-team-month]').forEach(x=>x.onclick=()=>{store.settings.teamMonth=x.dataset.teamMonth;saveStore(store);renderTeam();window.scrollTo(0,0)});
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
function renderCommunity(){
 const c=communityStats(store);
 $('communitySummary').innerHTML=`<div class="card hero metric-clickable" data-community-detail="totalVcoins" role="button" tabindex="0"><div class="muted">V-Coin stimati</div><strong>${Math.round(c.vcoins)}</strong><div class="muted">Tocca per vedere la composizione</div></div>
 <div class="card"><h3>Ability</h3><table class="table-like">
 ${communityRow('Inflow minimo 800 €',c.inflow,'inflow',money(c.inflow)+' · ')}
 ${communityRow('Link minimo 350 €',c.link,'link',money(c.link)+' · ')}
 </table></div>`;
 $('communityBoosts').innerHTML=`<div class="card"><h3>V-Coin e boost</h3><table class="table-like">
 ${communityRow('V-Coin base',c.inflow,'baseVcoins')}
 ${communityRow('Boost MNP',c.boosts.mnp,'mnp','+')}
 ${communityRow('Boost Prospect',c.boosts.prospect,'prospect','+')}
 ${communityRow('Boost Easy Rent',c.boosts.easyRent,'easyRent','+')}
 ${communityRow('Altri boost',c.boosts.other,'other','+')}
 </table></div>`;
 $('communityCompare').innerHTML=`<div class="card"><h3>Confronto portale</h3><label>V-Coin ufficiali dichiarati</label><input id="officialVcoins" type="number" value="${store.officialCommunity.vcoins??''}" placeholder="Inserisci dato portale"><button id="saveOfficial" class="secondary" style="margin-top:10px">Salva confronto</button>${c.difference==null?'':`<div class="note" style="margin-top:10px">Differenza portale − app: <strong>${Math.round(c.difference)}</strong> V-Coin</div>`}</div>`;
 bindMetricDetails('community');
 $('saveOfficial').onclick=()=>{store.officialCommunity.vcoins=Number($('officialVcoins').value||0);store.officialCommunity.updatedAt=new Date().toISOString();saveStore(store);renderCommunity()}
}
function archiveItem(c){
 return `<div class="card"><div class="item"><div><strong>${c.client}</strong><div class="muted">${c.offer||'Senza offerta'} · ${c.date}</div><div class="muted">P.IVA ${c.vat||'—'} · Codice cliente ${c.customerCode||'—'}</div><div class="muted">${c.services.map(s=>`${s.service} ×${s.qty}${s.service==='SIM Voce'&&s.mnp?' MNP':''}`).join(' · ')}</div><div class="muted">${c.agent||'Francesco'} · Gara Agenzia ${c.includeAgency===false?'No':'Sì'}</div></div><div style="text-align:right"><strong>${money(allInflow(c))}</strong><br><span class="badge ${c.status==='Valido'?'ok':'warn'}">${c.status}</span></div></div><div class="actions">${c.pdfStored?`<button class="secondary" data-open-pdf="${c.id}">📄 Apri PDF</button>`:''}<button class="secondary" data-edit="${c.id}">Modifica attributi</button><button class="danger" data-del="${c.id}">Elimina</button></div></div>`
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
 document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(confirm('Eliminare il contratto?')){await deletePdf(b.dataset.del).catch(()=>{});store.contracts=store.contracts.filter(c=>c.id!==b.dataset.del);saveStore(store);renderAll()}});
 document.querySelectorAll('[data-open-pdf]').forEach(b=>b.onclick=async()=>{if(!await openPdf(b.dataset.openPdf))alert('PDF non disponibile su questo dispositivo')});
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editAttrs(b.dataset.edit))
}
function editAttrs(id){
 const c=store.contracts.find(x=>x.id===id);if(!c)return;
 const prospect=confirm(`Cliente ${c.client}\n\nImpostare Prospect = SÌ?\nOK = Sì, Annulla = No`);
 const agent=prompt('Agente di riferimento: Francesco, Jacopo o Luciano',c.agent||'Francesco')||c.agent||'Francesco';
 const includeAgency=confirm('Valido per Gara Agenzia?\nOK = Sì, Annulla = No');
 c.prospect=prospect;c.agent=agent;c.includeAgency=includeAgency;saveStore(store);renderAll()
}
function renderPreview(){
 $('previewBox').classList.remove('hidden');
 const badge=$('confidenceBadge');badge.className='badge '+(parsed.confidence==='green'?'ok':parsed.confidence==='yellow'?'warn':'bad');badge.textContent=parsed.confidence==='green'?'🟢 Alta affidabilità':parsed.confidence==='yellow'?'🟡 Verifica richiesta':'🔴 Manuale';
 $('previewMeta').innerHTML=`<strong>${parsed.meta.client||'Cliente da verificare'}</strong><br>P.IVA ${parsed.meta.vat||'—'} · Codice cliente ${parsed.meta.customerCode||'—'} · Offerta ${parsed.meta.offer||'—'}`;
 $('previewRows').innerHTML=parsed.rows.length
   ?parsed.rows.map(r=>`<div class="preview-row"><div class="row"><div><label>Servizio</label><select class="pr-service">${['SIM Voce','SIM Dati','SIM M2M','Easy Rent','Easy Deal','ADSL','One Net Ufficio','One Net Azienda','Energia','Gas','Altro'].map(x=>`<option ${x===r.service?'selected':''}>${x}</option>`).join('')}</select></div><div><label>Quantità</label><input class="pr-qty" type="number" value="${r.qty}"></div></div><label>Prodotto</label><input class="pr-product" value="${r.product}"><label>Categoria</label><input class="pr-category" value="${r.category||''}">${r.service==='SIM Voce'?`<label>MNP</label><select class="pr-mnp"><option ${r.mnp?'':'selected'}>No</option><option ${r.mnp?'selected':''}>Sì</option></select>`:''}<label>Inflow unitario €</label><input class="pr-inflow" type="number" step="0.01" value="${r.inflowUnit||0}"><div class="calc">${r.calc||''}</div></div>`).join('')
   :`<div class="note">${(parsed.warnings&&parsed.warnings[0])||'Inserimento manuale richiesto.'}</div>`;
 $('agent').value='Francesco';
 $('includeAgency').value='Sì';
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
 const contract={id:'C-'+Date.now(),date:$('contractDate').value,offer:parsed.meta.offer,client:parsed.meta.client||'Da verificare',vat:parsed.meta.vat,customerCode:parsed.meta.customerCode||'',prospect,agent,includeAgency,status:'Valido',pdfRef:parsed.filename,pdfStored:false,notes:'Sales Tracker 3.0.0',services:[]};
 for(const el of rows){
   const service=el.querySelector('.pr-service').value;
   const mnpEl=el.querySelector('.pr-mnp');
   contract.services.push({id:'S-'+Math.random().toString(36).slice(2),service,product:el.querySelector('.pr-product').value,category:el.querySelector('.pr-category').value,qty:Number(el.querySelector('.pr-qty').value||1),inflowUnit:Number(el.querySelector('.pr-inflow').value||0),mnp:service==='SIM Voce'&&mnpEl?mnpEl.value==='Sì':false,confidence:parsed.confidence,calc:''});
 }
 if(pendingPdf){
   try{await savePdf(contract.id,pendingPdf);contract.pdfStored=true}catch(e){console.error('PDF non salvato',e)}
 }
 store.contracts.push(contract);saveStore(store);pendingPdf=null;$('previewBox').classList.add('hidden');$('pdfInput').value='';renderAll();go('home');alert(contract.pdfStored?'Contratto e PDF salvati':'Contratto salvato; PDF non disponibile')
}
function go(id){document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));$(id).classList.add('active');document.querySelector(`nav button[data-view="${id}"]`)?.classList.add('active');window.scrollTo(0,0)}
function exportBackup(){const a=document.createElement('a'),blob=new Blob([JSON.stringify(store,null,2)],{type:'application/json'});a.href=URL.createObjectURL(blob);a.download='sales-tracker-2-backup.json';a.click()}
async function importBackup(file){const obj=JSON.parse(await file.text());store=importBackupObject(obj);saveStore(store);renderAll();alert('Backup importato')}
function renderAll(){renderHome();renderAgency();renderExcellent();renderCommunity();renderTeam();renderArchive()}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>go(b.dataset.view));
$('archiveSearch').oninput=renderArchive;
$('pdfInput').onchange=e=>e.target.files[0]&&handlePDF(e.target.files[0]);
$('saveParsed').onclick=saveParsed;
$('exportBtn').onclick=exportBackup;
$('importInput').onchange=e=>e.target.files[0]&&importBackup(e.target.files[0]);
$('agent').onchange=()=>{$('includeAgency').value=$('agent').value==='Francesco'?'Sì':'No'};
$('archiveAgent').onchange=renderArchive;
$('archiveAgency').onchange=renderArchive;

$('contractDate').valueAsDate=new Date();
await initParser();
renderAll();
