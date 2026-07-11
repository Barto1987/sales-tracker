
import {loadStore,saveStore,importBackupObject} from './storage.js?v=202';
import {TARGETS,generalStats,agencyStats,excellentStats,communityStats,inflowOf} from './engines.js?v=202';
import {initParser,parsePDF} from './parser.js?v=202';

let store=loadStore(),parsed=null;
const $=id=>document.getElementById(id),money=v=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(v||0);
const pct=(v,t)=>Math.min((v/t)*100,100);
function kpi(label,v,t,euro=false){
 return `<div class="card kpi"><small>${label}</small><strong>${euro?money(v):v} / ${euro?money(t):t}</strong><div class="progress"><span style="width:${pct(v,t)}%"></span></div><small>Residuo: ${euro?money(Math.max(t-v,0)):Math.max(t-v,0)}</small></div>`
}
function allInflow(c){return c.services.reduce((a,s)=>a+inflowOf(s),0)}
function renderHome(){
 const g=generalStats(store),a=agencyStats(store),e=excellentStats(store),c=communityStats(store);
 $('homeTop').innerHTML=`<div class="card hero"><div class="muted">Luglio 2026</div><strong>${money(g.inflow)}</strong><div class="muted">${g.contracts} contratti · ${g.pieces} pezzi/servizi</div></div>`;
 $('homeCards').innerHTML=`
 <div class="card section-link" data-go="agency"><div><small>Gara Agenzia</small><strong>${Math.round(pct(a.coreInflow,TARGETS.agency.coreInflow))}%</strong></div><span>›</span></div>
 <div class="card section-link" data-go="excellent"><div><small>Excellent</small><strong>${money(e.variable)} extra</strong><div class="muted">${e.won?'Trimestre vinto':'Mancano '+money(Math.max(1000-e.variable,0))}</div></div><span>›</span></div>
 <div class="card section-link" data-go="community"><div><small>Community</small><strong>${Math.round(c.vcoins)} V-Coin</strong><div class="muted">${c.ability?'Ability OK':'Ability da completare'}</div></div><span>›</span></div>
 <div class="card section-link" data-go="archive"><div><small>Archivio</small><strong>${store.contracts.length}</strong><div class="muted">contratti totali</div></div><span>›</span></div>`;
 document.querySelectorAll('[data-go]').forEach(x=>x.onclick=()=>go(x.dataset.go))
}
function renderAgency(){
 const a=agencyStats(store);
 $('agencyGrid').innerHTML=kpi('SIM + Dati + Easy Rent',a.corePieces,TARGETS.agency.corePieces)+kpi('Inflow Core',a.coreInflow,TARGETS.agency.coreInflow,true)+kpi('ADSL',a.adsl,TARGETS.agency.adsl)+kpi('One Net',a.oneNet,TARGETS.agency.oneNet)+kpi('Energia + Gas',a.energyGas,TARGETS.agency.energyGas)
}
function renderExcellent(){
 const e=excellentStats(store),t=TARGETS.excellent;
 $('excellentSummary').innerHTML=`<div class="card hero"><div class="muted">Premio stimato trimestre</div><strong>${money(e.totalPrize)}</strong><div class="muted">Base 1.000 € + variabile ${money(e.variable)}</div></div>
 <div class="card"><h3>Status ciclo</h3><table class="table-like"><tr><td>Trimestri storici vinti</td><td>${e.historyWon} / 8</td></tr><tr><td>Obiettivo minimo</td><td>6 / 8</td></tr><tr><td>Trimestre corrente</td><td>${e.won?'🟢 Vinto':'🟡 In corso'}</td></tr><tr><td>Ancora necessari</td><td>${e.trimestersNeeded}</td></tr><tr><td>Errori residui consentiti</td><td>2</td></tr></table></div>`;
 $('excellentGrid').innerHTML=kpi('Inflow totale',e.totalInflow,t.totalInflow,true)+kpi('Mobile',e.mobile,t.mobile)+kpi('Prospect inflow',e.prospectInflow,t.prospectInflow,true)+kpi('Link inflow',e.linkInflow,t.linkInflow,true)+kpi('Solution inflow',e.solutionInflow,t.solutionInflow,true)+kpi('Noleggio operativo',e.easyRentPieces,t.easyRentPieces);
 $('excellentHistory').innerHTML=store.excellentHistory.map(x=>`<div class="item"><div><strong>${x.label}</strong><div class="muted">${x.payment}</div></div><div style="text-align:right"><strong>${money(x.total)}</strong><div class="badge ok">Vinto</div></div></div>`).join('')
}
function renderCommunity(){
 const c=communityStats(store);
 $('communitySummary').innerHTML=`<div class="card hero"><div class="muted">V-Coin stimati</div><strong>${Math.round(c.vcoins)}</strong><div class="muted">Inflow ${money(c.inflow)} · Link ${money(c.link)}</div></div>
 <div class="card"><h3>Ability</h3><table class="table-like"><tr><td>Inflow minimo 800 €</td><td>${c.inflow>=800?'🟢':'🔴'}</td></tr><tr><td>Link minimo 350 €</td><td>${c.link>=350?'🟢':'🔴'}</td></tr></table></div>`;
 $('communityBoosts').innerHTML=`<div class="card"><h3>Boost maturati</h3><table class="table-like"><tr><td>MNP</td><td>+${Math.round(c.boosts.mnp)}</td></tr><tr><td>Prospect</td><td>+${Math.round(c.boosts.prospect)}</td></tr><tr><td>Easy Rent</td><td>+${Math.round(c.boosts.easyRent)}</td></tr><tr><td>Altri boost</td><td>+${Math.round(c.boosts.other)}</td></tr></table></div>`;
 $('communityCompare').innerHTML=`<div class="card"><h3>Confronto portale</h3><label>V-Coin ufficiali dichiarati</label><input id="officialVcoins" type="number" value="${store.officialCommunity.vcoins??''}" placeholder="Inserisci dato portale"><button id="saveOfficial" class="secondary" style="margin-top:10px">Salva confronto</button>${c.difference==null?'':`<div class="note" style="margin-top:10px">Differenza portale − app: <strong>${Math.round(c.difference)}</strong> V-Coin</div>`}</div>`;
 $('saveOfficial').onclick=()=>{store.officialCommunity.vcoins=Number($('officialVcoins').value||0);store.officialCommunity.updatedAt=new Date().toISOString();saveStore(store);renderCommunity()}
}
function archiveItem(c){
 return `<div class="card"><div class="item"><div><strong>${c.client}</strong><div class="muted">${c.offer||'Senza offerta'} · ${c.date}</div><div class="muted">${c.services.map(s=>`${s.service} ×${s.qty}`).join(' · ')}</div></div><div style="text-align:right"><strong>${money(allInflow(c))}</strong><br><span class="badge ${c.status==='Valido'?'ok':'warn'}">${c.status}</span></div></div><div class="actions"><button class="secondary" data-edit="${c.id}">Modifica attributi</button><button class="danger" data-del="${c.id}">Elimina</button></div></div>`
}
function renderArchive(){
 const q=($('archiveSearch').value||'').toLowerCase();
 const rows=[...store.contracts].reverse().filter(c=>(c.client+' '+c.offer+' '+c.vat+' '+c.services.map(s=>s.product).join(' ')).toLowerCase().includes(q));
 $('archiveList').innerHTML=rows.length?rows.map(archiveItem).join(''):'<div class="card muted">Nessun contratto.</div>';
 document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{if(confirm('Eliminare il contratto?')){store.contracts=store.contracts.filter(c=>c.id!==b.dataset.del);saveStore(store);renderAll()}});
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editAttrs(b.dataset.edit))
}
function editAttrs(id){
 const c=store.contracts.find(x=>x.id===id);if(!c)return;
 const prospect=confirm(`Cliente ${c.client}\n\nImpostare Prospect = SÌ?\nOK = Sì, Annulla = No`);
 const mnp=confirm('Il contratto contiene SIM MNP?\nOK = Sì, Annulla = No');
 c.prospect=prospect;c.mnp=mnp;saveStore(store);renderAll()
}
function renderPreview(){
 $('previewBox').classList.remove('hidden');
 const badge=$('confidenceBadge');badge.className='badge '+(parsed.confidence==='green'?'ok':parsed.confidence==='yellow'?'warn':'bad');badge.textContent=parsed.confidence==='green'?'🟢 Alta affidabilità':parsed.confidence==='yellow'?'🟡 Verifica richiesta':'🔴 Manuale';
 $('previewMeta').innerHTML=`<strong>${parsed.meta.client||'Cliente da verificare'}</strong><br>P.IVA ${parsed.meta.vat||'—'} · Offerta ${parsed.meta.offer||'—'}`;
 $('previewRows').innerHTML=parsed.rows.map(r=>`<div class="preview-row"><div class="row"><div><label>Servizio</label><select class="pr-service">${['SIM Voce','SIM Dati','Easy Rent','ADSL','One Net Ufficio','One Net Azienda','Energia','Gas','Altro'].map(x=>`<option ${x===r.service?'selected':''}>${x}</option>`).join('')}</select></div><div><label>Quantità</label><input class="pr-qty" type="number" value="${r.qty}"></div></div><label>Prodotto</label><input class="pr-product" value="${r.product}"><label>Categoria</label><input class="pr-category" value="${r.category||''}"><label>Inflow unitario €</label><input class="pr-inflow" type="number" step="0.01" value="${r.inflowUnit||0}"><div class="calc">${r.calc||''}</div></div>`).join('')
}
async function handlePDF(file){
 $('pdfLoader').style.display='block';$('pdfStatus').textContent='Analisi in corso…';$('previewBox').classList.add('hidden');
 try{parsed=await parsePDF(file);renderPreview();$('pdfStatus').textContent=`${parsed.rows.length} righe proposte.`}
 catch(e){console.error(e);$('pdfStatus').textContent='Errore durante la lettura del PDF.'}
 finally{$('pdfLoader').style.display='none'}
}
function saveParsed(){
 if(!parsed)return;
 const rows=[...document.querySelectorAll('.preview-row')];
 const prospect=$('prospect').value==='Sì',mnp=$('mnp').value==='Sì';
 const contract={id:'C-'+Date.now(),date:$('contractDate').value,offer:parsed.meta.offer,client:parsed.meta.client||'Da verificare',vat:parsed.meta.vat,prospect,mnp,status:'Valido',pdfRef:parsed.filename,notes:'Sales Tracker 2.0',services:[]};
 for(const el of rows)contract.services.push({id:'S-'+Math.random().toString(36).slice(2),service:el.querySelector('.pr-service').value,product:el.querySelector('.pr-product').value,category:el.querySelector('.pr-category').value,qty:Number(el.querySelector('.pr-qty').value||1),inflowUnit:Number(el.querySelector('.pr-inflow').value||0),confidence:parsed.confidence,calc:''});
 store.contracts.push(contract);saveStore(store);$('previewBox').classList.add('hidden');$('pdfInput').value='';renderAll();go('home');alert('Contratto salvato')
}
function go(id){document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));$(id).classList.add('active');document.querySelector(`nav button[data-view="${id}"]`)?.classList.add('active');window.scrollTo(0,0)}
function exportBackup(){const a=document.createElement('a'),blob=new Blob([JSON.stringify(store,null,2)],{type:'application/json'});a.href=URL.createObjectURL(blob);a.download='sales-tracker-2-backup.json';a.click()}
async function importBackup(file){const obj=JSON.parse(await file.text());store=importBackupObject(obj);saveStore(store);renderAll();alert('Backup importato')}
function renderAll(){renderHome();renderAgency();renderExcellent();renderCommunity();renderArchive()}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>go(b.dataset.view));
$('archiveSearch').oninput=renderArchive;
$('pdfInput').onchange=e=>e.target.files[0]&&handlePDF(e.target.files[0]);
$('saveParsed').onclick=saveParsed;
$('exportBtn').onclick=exportBackup;
$('importInput').onchange=e=>e.target.files[0]&&importBackup(e.target.files[0]);
$('contractDate').valueAsDate=new Date();
await initParser();
renderAll();
