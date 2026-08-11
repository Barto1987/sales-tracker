// SmartTracker 3.12.2 — motore Provvigioni Q3 2026
// Regole versionate: Agosto / Q3 2026.
// Principio: una pratica genera eventi economici separati con scadenze diverse.

const active=c=>c.status!=='Annullato';
const inflowOf=s=>Number(s.inflowUnit||0)*Number(s.qty||0);
const inRange=(d,start,end)=>String(d||'')>=start&&String(d||'')<=end;
const pad=n=>String(n).padStart(2,'0');

function ym(date){return String(date||'').slice(0,7)}
function addMonthsToYm(value,n){
  const [y,m]=String(value||'').split('-').map(Number);
  if(!y||!m)return '';
  const d=new Date(y,m-1+n,1);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
}
function paymentFromActivation(date,months){return addMonthsToYm(ym(date),months)}
function quarterPaymentMonth(end){return addMonthsToYm(String(end).slice(0,7),3)}
function textOf(s){return `${s.service||''} ${s.product||''} ${s.category||''}`.toLowerCase().replace(/\s+/g,' ').trim()}
function normalize(s){return textOf(s).replace(/[._:/-]+/g,' ')}

const CORE_PRODUCTS=[
  'mobile extra','mobile comfort','mobile smart','business xs',
  'dati smart','dati comfort','opzione illimitati','opzione dati extra illimitati'
];
const ADSL_PRODUCTS=['fissa smart','fissa comfort','fissa extra','fissa premium'];

function hasAny(txt,list){return list.some(x=>txt.includes(x))}
function isCoreEligible(s){return ['SIM Voce','SIM Dati'].includes(s.service) && hasAny(normalize(s),CORE_PRODUCTS)}
function isM2M(s){return s.service==='SIM M2M'||/\bm2m\b|\biot\b/.test(normalize(s))}
function isAdslEligible(s){return s.service==='ADSL' && hasAny(normalize(s),ADSL_PRODUCTS)}
function isMiniEasyDeal(s){return /mini\s*easy\s*deal/.test(normalize(s))}
function isEasyDeal(s){return s.service==='Easy Deal' && !isMiniEasyDeal(s)}
function isOneNetExcludedComponent(s){return /interno|uc phone|sempre serviti|device|attivazione|alcatel|cisco|adok|opzion/.test(normalize(s))}
function isOneNetLink(s){
  if(!['One Net Ufficio','One Net Azienda'].includes(s.service))return false;
  if(isOneNetExcludedComponent(s))return false;
  // ONU/ONA: FWA 4G/5G, FTTC, FTTH e varianti senza tecnologia esplicita.
  return true;
}
function isEasyRent(s){return s.service==='Easy Rent'}
function isEnergy(s){return s.service==='Energia'}
function isGas(s){return s.service==='Gas'}
function isDigital(s){return /solution|soluzioni digitali|digital|cloud|security|cyber|miia|7layers|7 layers|gdpr|nis2|movylo|sdm|ssc/.test(normalize(s))}
function owner(c){return c.agent||'Francesco'}

function quarterInfo(q='2026-Q3'){
  if(q==='2026-Q3')return {id:q,label:'Q3 2026',start:'2026-07-01',end:'2026-09-30',rule:'Q3-2026'};
  return {id:q,label:q,start:'2026-07-01',end:'2026-09-30',rule:'Q3-2026'};
}

function agentContracts(store,agent,start,end){
  return (store.contracts||[]).filter(c=>active(c)&&owner(c)===agent&&inRange(c.date,start,end));
}
function serviceRows(contracts){
  return contracts.flatMap(c=>(c.services||[]).map(s=>({c,s,inflow:inflowOf(s)})));
}
function monthlyInflowByAgent(store,agent,start,end){
  const map={};
  for(const c of agentContracts(store,agent,start,end)){
    const m=ym(c.date); map[m]=(map[m]||0)+(c.services||[]).reduce((a,s)=>a+inflowOf(s),0);
  }
  return map;
}
function boostAccess(store,agent,start,end){
  const monthly=monthlyInflowByAgent(store,agent,start,end);
  const result={};
  for(const [m,v] of Object.entries(monthly))result[m]=v>=250;
  return result;
}

export function individualTargetForAgent(store,agent,q='2026-Q3'){
  const p=quarterInfo(q);
  const rows=serviceRows(agentContracts(store,agent,p.start,p.end));
  const totalInflow=rows.reduce((a,r)=>a+r.inflow,0);

  // Il target "40 SIM Voce/Dati + Easy Rent" usa i pezzi anche se Easy Rent non è CORE provvigionale.
  const coreTargetRows=rows.filter(r=>['SIM Voce','SIM Dati','Easy Rent'].includes(r.s.service));
  const corePieces=coreTargetRows.reduce((a,r)=>a+Number(r.s.qty||0),0);
  const coreInflow=coreTargetRows.reduce((a,r)=>a+r.inflow,0);

  const adsl=rows.filter(r=>isAdslEligible(r.s)).reduce((a,r)=>a+Number(r.s.qty||0),0);
  const oneNet=rows.filter(r=>isOneNetLink(r.s)).reduce((a,r)=>a+Number(r.s.qty||0),0);

  const checks={
    totalInflow:totalInflow>=1600,
    core:corePieces>=40&&coreInflow>=500,
    adsl:adsl>=8,
    oneNet:oneNet>=8
  };
  return {won:Object.values(checks).every(Boolean),checks,values:{totalInflow,corePieces,coreInflow,adsl,oneNet}};
}

export function agencyResult(store,agent,q='2026-Q3'){
  return store.settings?.commissions?.agencyResults?.[q]?.[agent] ?? null;
}
export function setAgencyResult(store,agent,q,value){
  store.settings=store.settings||{};
  store.settings.commissions=store.settings.commissions||{selectedAgent:agent,selectedQuarter:q,agencyResults:{}};
  store.settings.commissions.agencyResults=store.settings.commissions.agencyResults||{};
  store.settings.commissions.agencyResults[q]=store.settings.commissions.agencyResults[q]||{};
  store.settings.commissions.agencyResults[q][agent]=value;
}

function evt({c,agent,type,label,amount,paymentMonth,status='maturata',note='',service='',product='',inflow=0,source='direct'}){
  return {
    id:`${c?.id||source}-${agent}-${type}-${paymentMonth}-${Math.random().toString(36).slice(2,7)}`,
    contractId:c?.id||'',
    date:c?.date||'',
    client:c?.client||'',
    agent,type,label,amount:Number(amount||0),paymentMonth,status,note,
    service:service||'',product:product||'',inflow:Number(inflow||0),source
  };
}

function productRule(s){
  if(isMiniEasyDeal(s))return {family:'Mini Easy Deal',base60:1.5,extra90:1,prospect90:2,individual:1,agency:0};
  if(isEasyDeal(s))return {family:'Easy Deal',base60:1.5,extra90:.5,prospect90:2,individual:0,agency:0};
  if(isAdslEligible(s))return {family:'ADSL/Fissa',base60:3,extra90:0,prospect90:2,individual:1,agency:1};
  if(isOneNetLink(s))return {family:'ONU/ONA',base60:2,extra90:0,prospect90:2,individual:1,agency:1};
  if(isCoreEligible(s))return {family:'CORE',base60:2,extra90:1,prospect90:2,individual:1,agency:1};
  if(isEasyRent(s))return {family:'Easy Rent',manual:true,note:'Gettone secco a 60 gg: importo dipendente dal profilo Easy Rent, da valorizzare con il listino corrente.'};
  if(isEnergy(s)||isGas(s))return {family:s.service,energy:true};
  if(isDigital(s))return {family:'Digital',manual:true,note:'Regola Digital riconosciuta, ma timing/importo base non ancora completo nel motore. Nessun importo inventato.'};
  return {family:s.service||'Altro',manual:true,note:'Prodotto non ancora mappato nel listino Provvigioni.'};
}

function directEvents(store,agent,q='2026-Q3'){
  const p=quarterInfo(q);
  const target=individualTargetForAgent(store,agent,q);
  const agency=agencyResult(store,agent,q);
  const access=boostAccess(store,agent,p.start,p.end);
  const events=[],manual=[];

  for(const c of agentContracts(store,agent,p.start,p.end)){
    const boostOk=!!access[ym(c.date)];
    for(const s of c.services||[]){
      if(isM2M(s))continue;
      const inflow=inflowOf(s),r=productRule(s);
      if(r.energy)continue;
      if(r.manual){
        manual.push({contractId:c.id,date:c.date,client:c.client,agent,service:s.service,product:s.product,inflow,note:r.note,family:r.family});
        continue;
      }

      if(r.base60)events.push(evt({c,agent,type:'base60',label:`${r.base60} canoni base`,amount:inflow*r.base60,paymentMonth:paymentFromActivation(c.date,2),service:s.service,product:s.product,inflow,note:r.family}));
      if(r.extra90)events.push(evt({c,agent,type:'extra90',label:`+${r.extra90} canone extra`,amount:inflow*r.extra90,paymentMonth:paymentFromActivation(c.date,3),service:s.service,product:s.product,inflow,note:r.family}));

      // I boost richiedono l'accesso minimo di 250 € inflow nel mese.
      if(c.prospect&&r.prospect90&&boostOk){
        events.push(evt({c,agent,type:'prospect',label:`Prospect +${r.prospect90} canoni`,amount:inflow*r.prospect90,paymentMonth:paymentFromActivation(c.date,3),service:s.service,product:s.product,inflow,note:r.family}));
      }
      if(r.individual&&target.won&&boostOk){
        events.push(evt({c,agent,type:'individual',label:'Gara individuale +1 canone',amount:inflow*r.individual,paymentMonth:quarterPaymentMonth(p.end),service:s.service,product:s.product,inflow,note:`${r.family} · target Q3 raggiunto`}));
      }
      if(r.agency&&agency===true&&boostOk){
        events.push(evt({c,agent,type:'agency',label:'Gara Agenzia +1 canone',amount:inflow*r.agency,paymentMonth:quarterPaymentMonth(p.end),service:s.service,product:s.product,inflow,note:`${r.family} · gara Agenzia confermata`}));
      }
    }
  }
  return {events,manual,target,agency,access};
}

function rushEvents(store,agent,q='2026-Q3'){
  const p=quarterInfo(q),events=[],months={};
  for(const c of agentContracts(store,agent,p.start,p.end)){
    const m=ym(c.date);
    months[m]=months[m]||{inflow:0,prospects:new Set(),energy:0};
    for(const s of c.services||[]){
      // Rush: Easy Deal escluso; gli altri servizi concorrono all'inflow.
      if(!isEasyDeal(s))months[m].inflow+=inflowOf(s);
      if(isEnergy(s)||isGas(s))months[m].energy+=Number(s.qty||1);
    }
    if(c.prospect)months[m].prospects.add((c.vat||c.client||c.id).toLowerCase());
  }
  const details={};
  for(const [m,x] of Object.entries(months)){
    const prospectCount=x.prospects.size;
    const won=x.inflow>=700&&prospectCount>=3&&x.energy>=2;
    details[m]={inflow:x.inflow,prospects:prospectCount,energy:x.energy,won};
    if(won){
      events.push(evt({
        c:{id:`RUSH-${m}-${agent}`,date:`${m}-01`,client:`Rush ${m}`},
        agent,type:'rush',label:'Rush mensile +30% inflow',amount:x.inflow*.30,
        paymentMonth:addMonthsToYm(m,2),status:'maturata',note:`${x.inflow.toFixed(2)} € inflow · ${prospectCount} Prospect · ${x.energy} Energia/Gas`,source:'rush'
      }));
    }
  }
  return {events,details};
}

function energyEvents(store,agent,q='2026-Q3'){
  const p=quarterInfo(q),contracts=agentContracts(store,agent,p.start,p.end);
  const energy=[],gas=[];
  for(const c of contracts){
    for(const s of c.services||[]){
      const qty=Math.max(1,Number(s.qty||1));
      for(let i=0;i<qty;i++){
        if(isEnergy(s))energy.push({c,s});
        if(isGas(s))gas.push({c,s});
      }
    }
  }
  const events=[];
  // Energia: primi 2 = 130 cad.; al 3° i primi tre diventano 500 complessivi; dal 4° 160 cad.
  if(energy.length){
    const baseTotal=energy.length===1?130:energy.length===2?260:500+Math.max(0,energy.length-3)*160;
    events.push(evt({
      c:{id:`ENERGY-${q}-${agent}`,date:p.end,client:'Fastweb Energia'},
      agent,type:'energy',label:`Energia · ${energy.length} contratti`,amount:baseTotal,paymentMonth:'',
      status:'timing-da-confermare',note:'Importo Superboost calcolato; mese di pagamento base non ancora confermato.',source:'energy'
    }));
    for(const {c} of energy){
      events.push(evt({c,agent,type:'energyT6',label:'Energia T6',amount:20,paymentMonth:paymentFromActivation(c.date,6),status:'potenziale',note:'Da riconoscere solo se cliente ancora attivo.',source:'energy'}));
      events.push(evt({c,agent,type:'energyT12',label:'Energia T12',amount:20,paymentMonth:paymentFromActivation(c.date,12),status:'potenziale',note:'Da riconoscere solo se cliente ancora attivo.',source:'energy'}));
    }
  }
  if(gas.length){
    events.push(evt({
      c:{id:`GAS-${q}-${agent}`,date:p.end,client:'Fastweb Gas'},
      agent,type:'gas',label:`Gas · ${gas.length} contratti`,amount:gas.length*100,paymentMonth:'',
      status:'timing-da-confermare',note:'100 € a contratto; mese di pagamento base non ancora confermato.',source:'gas'
    }));
    for(const {c} of gas){
      events.push(evt({c,agent,type:'gasT6',label:'Gas T6',amount:20,paymentMonth:paymentFromActivation(c.date,6),status:'potenziale',note:'Da riconoscere solo se cliente ancora attivo.',source:'gas'}));
      events.push(evt({c,agent,type:'gasT12',label:'Gas T12',amount:20,paymentMonth:paymentFromActivation(c.date,12),status:'potenziale',note:'Da riconoscere solo se cliente ancora attivo.',source:'gas'}));
    }
  }
  return events;
}

function seIndirectEvents(store,agent,q='2026-Q3'){
  if(agent!=='Francesco')return [];
  const p=quarterInfo(q),events=[];
  for(const junior of ['Jacopo','Luciano']){
    const byMonth={};
    for(const c of agentContracts(store,junior,p.start,p.end)){
      const m=ym(c.date);
      byMonth[m]=(byMonth[m]||0)+(c.services||[]).reduce((a,s)=>a+inflowOf(s),0);
    }
    for(const [m,inflow] of Object.entries(byMonth)){
      if(inflow<=0)continue;
      events.push(evt({
        c:{id:`SE-${junior}-${m}`,date:`${m}-01`,client:`Override SE · ${junior}`},
        agent:'Francesco',type:'se30',label:`30% inflow ${junior}`,amount:inflow*.30,
        paymentMonth:addMonthsToYm(m,2),status:'maturata',
        note:`Inflow ${junior}: ${inflow.toFixed(2)} €`,source:'se'
      }));
    }
  }
  return events;
}

export function commissionReport(store,agent='Francesco',q='2026-Q3'){
  const p=quarterInfo(q);
  const direct=directEvents(store,agent,q);
  const rush=rushEvents(store,agent,q);
  const energy=energyEvents(store,agent,q);
  const se=seIndirectEvents(store,agent,q);
  const events=[...direct.events,...rush.events,...energy,...se];

  const certain=events.filter(e=>e.status==='maturata').reduce((a,e)=>a+e.amount,0);
  const potential=events.filter(e=>e.status==='potenziale').reduce((a,e)=>a+e.amount,0);
  const unknownTiming=events.filter(e=>e.status==='timing-da-confermare').reduce((a,e)=>a+e.amount,0);

  const calendar={};
  for(const e of events.filter(e=>e.paymentMonth)){
    calendar[e.paymentMonth]=calendar[e.paymentMonth]||{certain:0,potential:0,events:[]};
    if(e.status==='potenziale')calendar[e.paymentMonth].potential+=e.amount;
    else calendar[e.paymentMonth].certain+=e.amount;
    calendar[e.paymentMonth].events.push(e);
  }

  return {
    agent,quarter:p,certain,potential,unknownTiming,
    events:events.sort((a,b)=>String(a.paymentMonth||'9999').localeCompare(String(b.paymentMonth||'9999'))||String(a.date).localeCompare(String(b.date))),
    calendar,manual:direct.manual,target:direct.target,agency:direct.agency,rush:rush.details
  };
}

export const commissionRulesVersion='Q3-2026';
