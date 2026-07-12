
import {loadStore,saveStore,importBackupObject} from './storage.js?v=250';
import {TARGETS,generalStats,agencyStats,agencyBreakdown,excellentStats,excellentBreakdown,communityStats,communityBreakdown,teamStats,inflowOf} from './engines.js?v=250';
import {initParser,parsePDF} from './parser.js?v=250';

let store=loadStore(),parsed=null;
const $=id=>document.getElementById(id),money=v=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(v||0);
const pct=(v,t)=>Math.min((v/t)*100,100);
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
 const a=agencyStats(store);
 $('agencyGrid').innerHTML=
   kpi('SIM + Dati + Easy Rent',a.corePieces,TARGETS.agency.corePieces,false,'corePieces','agency')+
   kpi('Inflow Core',a.coreInflow,TARGETS.agency.coreInflow,true,'coreInflow','agency')+
   kpi('ADSL',a.adsl,TARGETS.agency.adsl,false,'adsl','agency')+
   kpi('One Net',a.oneNet,TARGETS.agency.oneNet,false,'oneNet','agency')+
   kpi('Energia + Gas',a.energyGas,TARGETS.agency.energyGas,false,'energyGas','agency');
 bindMetricDetails('agency');
}
function renderExcellent(){
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

 $('excellentHistory').innerHTML=store.excellentHistory.map(x=>`<div class="item"><div><strong>${x.label}</strong><div class="muted">${x.payment}</div></div><div style="text-align:right"><strong>${money(x.total)}</strong><div class="badge ok">Vinto</div></div></div>`).join('')
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
     <div class="excellent-detail-meta">${r.date} · ${r.service} · quantità ${r.qty} · inflow ${money(r.inflow)} · ${r.agent}${r.prospect?' · Prospect':''}${r.mnp?' · MNP':''}</div>
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
     <div class="excellent-detail-meta">${r.date} · ${r.service} · quantità ${r.qty} · inflow pratica ${money(r.inflow)} · ${r.agent}${r.prospect?' · Prospect':''}</div>
   </div>`).join('')}
   <div class="excellent-detail-total">
     <span>Totale attribuito</span>
     <span>${pieceMetric?`${total} ${total===1?'pezzo':'pezzi'}`:money(total)}</span>
   </div>
 </div>`;

 $('closeExcellentDetail').onclick=()=>{
   detail.classList.add('hidden');
   detail.innerHTML='';
   document.querySelectorAll('.metric-open').forEach(x=>x.classList.remove('metric-open'));
 };

 detail.scrollIntoView({behavior:'smooth',block:'start'});
}

function renderTeam(){
 const t=teamStats(store);
 const total=t.Totale;
 $('teamSummary').innerHTML=`<div class="card hero"><div class="muted">Totale squadra — mese corrente</div><strong>${money(total.inflow)}</strong><div class="muted">${total.contracts} contratti · ${total.products} prodotti/pezzi</div></div>`;
 $('teamCards').innerHTML=(store.settings.agents||['Francesco','Jacopo','Luciano']).map(agent=>{
   const x=t[agent];
   return `<div class="card"><h3>${agent}</h3><table class="table-like">
   <tr><td>Inflow</td><td>${money(x.inflow)}</td></tr>
   <tr><td>Contratti</td><td>${x.contracts}</td></tr>
   <tr><td>SIM Voce</td><td>${x.simVoice}</td></tr>
   <tr><td>SIM Dati</td><td>${x.simData}</td></tr>
   <tr><td>M2M</td><td>${x.m2m}</td></tr>
   <tr><td>Connettività</td><td>${x.adsl}</td></tr>
   <tr><td>One Net</td><td>${x.oneNet}</td></tr>
   <tr><td>Easy Rent</td><td>${x.easyRent}</td></tr>
   <tr><td>Easy Deal</td><td>${x.easyDeal}</td></tr>
   </table></div>`;
 }).join('');
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
 return `<div class="card"><div class="item"><div><strong>${c.client}</strong><div class="muted">${c.offer||'Senza offerta'} · ${c.date}</div><div class="muted">${c.services.map(s=>`${s.service} ×${s.qty}${s.service==='SIM Voce'&&s.mnp?' MNP':''}`).join(' · ')}</div><div class="muted">${c.agent||'Francesco'} · Gara Agenzia ${c.includeAgency===false?'No':'Sì'}</div></div><div style="text-align:right"><strong>${money(allInflow(c))}</strong><br><span class="badge ${c.status==='Valido'?'ok':'warn'}">${c.status}</span></div></div><div class="actions"><button class="secondary" data-edit="${c.id}">Modifica attributi</button><button class="danger" data-del="${c.id}">Elimina</button></div></div>`
}
function renderArchive(){
 const q=($('archiveSearch').value||'').toLowerCase();
 const agent=$('archiveAgent')?.value||'Tutti';
 const agency=$('archiveAgency')?.value||'Tutti';
 const rows=[...store.contracts].reverse().filter(c=>{
   const text=(c.client+' '+c.offer+' '+c.vat+' '+c.services.map(s=>s.product).join(' ')).toLowerCase();
   const agentOk=agent==='Tutti'||(c.agent||'Francesco')===agent;
   const included=c.includeAgency!==false;
   const agencyOk=agency==='Tutti'||(agency==='Inclusi'&&included)||(agency==='Esclusi'&&!included);
   return text.includes(q)&&agentOk&&agencyOk;
 });
 $('archiveList').innerHTML=rows.length?rows.map(archiveItem).join(''):'<div class="card muted">Nessun contratto.</div>';
 document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{if(confirm('Eliminare il contratto?')){store.contracts=store.contracts.filter(c=>c.id!==b.dataset.del);saveStore(store);renderAll()}});
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
 $('previewMeta').innerHTML=`<strong>${parsed.meta.client||'Cliente da verificare'}</strong><br>P.IVA ${parsed.meta.vat||'—'} · Offerta ${parsed.meta.offer||'—'}`;
 $('previewRows').innerHTML=parsed.rows.length
   ?parsed.rows.map(r=>`<div class="preview-row"><div class="row"><div><label>Servizio</label><select class="pr-service">${['SIM Voce','SIM Dati','SIM M2M','Easy Rent','Easy Deal','ADSL','One Net Ufficio','One Net Azienda','Energia','Gas','Altro'].map(x=>`<option ${x===r.service?'selected':''}>${x}</option>`).join('')}</select></div><div><label>Quantità</label><input class="pr-qty" type="number" value="${r.qty}"></div></div><label>Prodotto</label><input class="pr-product" value="${r.product}"><label>Categoria</label><input class="pr-category" value="${r.category||''}">${r.service==='SIM Voce'?`<label>MNP</label><select class="pr-mnp"><option ${r.mnp?'':'selected'}>No</option><option ${r.mnp?'selected':''}>Sì</option></select>`:''}<label>Inflow unitario €</label><input class="pr-inflow" type="number" step="0.01" value="${r.inflowUnit||0}"><div class="calc">${r.calc||''}</div></div>`).join('')
   :`<div class="note">${(parsed.warnings&&parsed.warnings[0])||'Inserimento manuale richiesto.'}</div>`;
 $('agent').value='Francesco';
 $('includeAgency').value='Sì';
}
async function handlePDF(file){
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
function saveParsed(){
 if(!parsed)return;
 const rows=[...document.querySelectorAll('.preview-row')];
 const prospect=$('prospect').value==='Sì';
 const agent=$('agent').value||'Francesco';
 const includeAgency=$('includeAgency').value==='Sì';
 const contract={id:'C-'+Date.now(),date:$('contractDate').value,offer:parsed.meta.offer,client:parsed.meta.client||'Da verificare',vat:parsed.meta.vat,prospect,agent,includeAgency,status:'Valido',pdfRef:parsed.filename,notes:'Sales Tracker 2.5.0',services:[]};
 for(const el of rows){
   const service=el.querySelector('.pr-service').value;
   const mnpEl=el.querySelector('.pr-mnp');
   contract.services.push({id:'S-'+Math.random().toString(36).slice(2),service,product:el.querySelector('.pr-product').value,category:el.querySelector('.pr-category').value,qty:Number(el.querySelector('.pr-qty').value||1),inflowUnit:Number(el.querySelector('.pr-inflow').value||0),mnp:service==='SIM Voce'&&mnpEl?mnpEl.value==='Sì':false,confidence:parsed.confidence,calc:''});
 }
 store.contracts.push(contract);saveStore(store);$('previewBox').classList.add('hidden');$('pdfInput').value='';renderAll();go('home');alert('Contratto salvato')
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
