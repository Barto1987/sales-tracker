import {matchEasyRent} from './easy-rent-listino.js?v=3143';
import {recognizeM2MProduct} from './m2m-listino.js?v=3143';
import {COMMISSION_RULE_SETS,commissionRuleSetForDate,activeCommissionRuleSet} from './commission-rules.js?v=3143';
// SmartTracker 3.14.3 — prima base del motore Provvigioni.
// Q3 2026: calcoliamo solo le parti supportate dalle regole già raccolte.
// Le voci ancora ambigue restano esplicitamente "da confermare".

const active=c=>c.status!=='Annullato';
const inflowOf=s=>Number(s.inflowUnit||0)*Number(s.qty||0);
const inRange=(d,start,end)=>String(d||'')>=start&&String(d||'')<=end;
const monthKey=d=>String(d||'').slice(0,7);
const agentOf=c=>c.agent||'Francesco';
const monthStart=k=>`${k}-01`;
function addMonthsToDate(date,months){
  const [y,m,d]=String(date||'').split('-').map(Number);
  if(!y||!m)return '';
  const x=new Date(y,m-1+months,Math.min(d||1,28));
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
}
function paymentMonth(date,delayMonths){return monthKey(addMonthsToDate(date,delayMonths))}
function quarterPaymentMonth(date){
  const [y,m]=String(date||'').slice(0,7).split('-').map(Number);
  if(!y||!m)return '';
  const qEnd=Math.floor((m-1)/3)*3+3;
  const x=new Date(y,qEnd+2,1); // 3 mesi dopo il mese di chiusura trimestre
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`;
}
function monthIsClosed(store,k){
  const st=store.periodStates?.[k]?.status;
  if(st==='closed')return true;
  return k<monthKey(new Date().toISOString());
}
function validMonthlyInflow(store,agent,month){
  return (store.contracts||[])
    .filter(c=>active(c)&&agentOf(c)===agent&&monthKey(c.date)===month)
    .flatMap(c=>c.services||[])
    .reduce((a,s)=>a+inflowOf(s),0);
}
export function monthlyBoostAccess(store,agent,month){
  const inflow=validMonthlyInflow(store,agent,month);
  const rs=commissionRuleSetForDate(`${month}-01`)||activeCommissionRuleSet();
  const threshold=Number(rs?.monthlyBoostAccess||250);
  const unlocked=inflow>=threshold;
  const closed=monthIsClosed(store,month);
  return {agent,month,inflow,target:threshold,unlocked,closed,ko:closed&&!unlocked,inProgress:!closed&&!unlocked,remaining:Math.max(threshold-inflow,0),ruleSetId:rs?.id||null};
}

function textOf(s){
  return `${s.service||''} ${s.product||''} ${s.category||''}`.toLowerCase();
}
function isMiniEasyDeal(s){return /mini\s*easy\s*deal/.test(textOf(s))}
function isEasyRent(s){return s.service==='Easy Rent'}
function isDigital(s){return /solution|soluzioni digitali|digital|cloud|security|cyber|miia|7layers|7 layers|gdpr|nis2|movylo|sdm|m365|microsoft 365/.test(textOf(s))}
function isM365(s){return /m365\s+business\s+(?:basic|standard|premium)|microsoft\s*365\s+business\s+(?:basic|standard|premium)/i.test(`${s.product||''} ${s.service||''}`)}
function quarterKeyFromDate(date){
  const [y,m]=String(date||'').slice(0,7).split('-').map(Number);
  if(!y||!m)return '';
  return `${y}-Q${Math.ceil(m/3)}`;
}
function agencyResult(store,date,key){
  const q=quarterKeyFromDate(date);
  return store.settings?.agencyQuarterResults?.[q]?.[key]||'pending';
}
function isEnergyGas(s){return ['Energia','Gas'].includes(s.service)}
function isOneNetExcludedComponent(s){return /interno|uc phone|sempre serviti|device|attivazione|alcatel|cisco|adok/.test(textOf(s))}

export function individualAgencyTargetWon(store,agent='Francesco',periodStart=null){
  const p=store.settings?.agencyPeriod||{start:'2026-07-01',end:'2026-09-30'};
  const start=periodStart||p.start;
  const rs=commissionRuleSetForDate(start)||activeCommissionRuleSet();
  const period={start:rs?.start||p.start,end:rs?.end||p.end};
  const rows=(store.contracts||[]).filter(c=>active(c)&&agentOf(c)===agent&&c.includeAgency!==false&&inRange(c.date,period.start,period.end))
    .flatMap(c=>(c.services||[]).map(s=>({c,s,inflow:inflowOf(s)})));

  const totalInflow=rows.reduce((a,r)=>a+r.inflow,0);
  const core=rows.filter(r=>['SIM Voce','SIM Dati','Easy Rent'].includes(r.s.service));
  const corePieces=core.reduce((a,r)=>a+Number(r.s.qty||0),0);
  const coreInflow=core.reduce((a,r)=>a+r.inflow,0);
  const adsl=rows.filter(r=>r.s.service==='ADSL').reduce((a,r)=>a+Number(r.s.qty||0),0);
  const oneNet=rows.filter(r=>['One Net Ufficio','One Net Azienda'].includes(r.s.service)&&!isOneNetExcludedComponent(r.s))
    .reduce((a,r)=>a+Number(r.s.qty||0),0);

  const tr=rs?.targetIndividual||{};
  const checks={
    totalInflow:tr.totalInflow==null?true:totalInflow>=Number(tr.totalInflow),
    core:corePieces>=Number(tr.corePieces||0)&&coreInflow>=Number(tr.coreInflow||0),
    adsl:adsl>=Number(tr.adsl||0),
    oneNet:oneNet>=Number(tr.oneNet||0)
  };

  let potentialIndividual=0;
  const potentialRows=[];
  for(const r of rows){
    const rule=ruleFor(r.s,r.c.date);
    const access=monthlyBoostAccess(store,agent,monthKey(r.c.date));
    const amount=access.unlocked?r.inflow*Number(rule.individualCanons||0):0;
    if(amount>0){
      potentialIndividual+=amount;
      potentialRows.push({
        contractId:r.c.id,client:r.c.client||'Cliente',date:r.c.date,
        service:r.s.service||'',product:r.s.product||'',amount
      });
    }
  }

  return {
    won:Object.values(checks).every(Boolean),
    checks,
    values:{totalInflow,corePieces,coreInflow,adsl,oneNet},
    thresholds:tr,
    potentialIndividual,
    potentialRows,
    ruleSet:rs
  };
}

function ruleFor(s,date='2026-07-01'){
  const rs=commissionRuleSetForDate(date)||activeCommissionRuleSet();
  const f=rs?.families||{};
  const cv=x=>({
    base60Canons:Number(x?.base60||0),
    deferred90Canons:Number(x?.deferred90||0),
    individualCanons:Number(x?.individual||0),
    prospectCanons:Number(x?.prospect||0),
    agencyCanons:Number(x?.agency||0),
    rushEligible:!!x?.rush
  });

  if(isEasyRent(s)) return {type:'Easy Rent',easyRent:true,rushEligible:!!f.easyRent?.rush,ruleSetId:rs?.id};
  if(isMiniEasyDeal(s)&&f.miniEasyDeal) return {type:'Mini Easy Deal',...cv(f.miniEasyDeal),ruleSetId:rs?.id};
  if(s.service==='Easy Deal') return {type:'Easy Deal',...cv(f.easyDeal),ruleSetId:rs?.id};
  if(s.service==='ADSL') return {type:'ADSL',...cv(f.adsl),ruleSetId:rs?.id};
  if(['One Net Ufficio','One Net Azienda'].includes(s.service)&&!isOneNetExcludedComponent(s))
    return {type:s.service,...cv(f.onet),ruleSetId:rs?.id};
  if(s.service==='SIM M2M')
    return {type:'M2M',...cv(f.m2m),m2m:true,ruleSetId:rs?.id};
  if(['SIM Voce','SIM Dati'].includes(s.service))
    return {type:'Core',...cv(f.core),ruleSetId:rs?.id};
  if(isEnergyGas(s)) return {type:s.service,manual:true,rushEligible:true,ruleSetId:rs?.id,reason:'Premio Energia/Gas da valorizzare con la regola dedicata; l’inflow resta valido per il Rush.'};
  if(isM365(s)) return {type:'M365',base60Canons:Number(f.m365?.base60||2),deferred90Canons:0,individualCanons:0,prospectCanons:0,agencyCanons:Number(f.m365?.agency||.5),agencyGroup:'digital',rushEligible:false,ruleSetId:rs?.id};
  if(isDigital(s)) return {type:'Digital',manual:true,ruleSetId:rs?.id,reason:'Prodotto Digital riconosciuto, ma manca ancora la specifica regola provvigionale base per questo prodotto.'};
  return {type:s.service||'Altro',manual:true,ruleSetId:rs?.id,reason:'Regola provvigionale non ancora censita.'};
}

export function commissionsForPeriod(store,start,end,agent='Francesco'){
  const target=individualAgencyTargetWon(store,agent,start);
  const rows=[];
  for(const c of (store.contracts||[]).filter(c=>active(c)&&agentOf(c)===agent&&inRange(c.date,start,end))){
    for(const s of c.services||[]){
      const inflow=inflowOf(s);
      const rule=ruleFor(s,c.date);

      if(rule.easyRent){
        const er=matchEasyRent(s);
        const qty=Math.max(1,Number(s.qty||1));
        if(er){
          const amount=Number(er.provvigione||0)*qty;
          rows.push({
            contractId:c.id,date:c.date,client:c.client||'Cliente',
            service:s.service||'Easy Rent',product:s.product||'',
            inflow,base:amount,deterministicExtra:0,estimated:amount,
            status:'calculated',rule:'Easy Rent',
            easyRentBand:er.fascia,easyRentPlan:er.piano,
            easyRentUnit:Number(er.provvigione||0),qty,pending:[],
            paymentMonth:paymentMonth(c.date,2),productionMonth:monthKey(c.date),component:'Gettone Easy Rent',note:`${er.fascia} · ${Number(er.provvigione||0).toLocaleString('it-IT',{style:'currency',currency:'EUR'})} a pezzo · gettone secco a 60 gg dall’attivazione`
          });
        }else{
          rows.push({
            contractId:c.id,date:c.date,client:c.client||'Cliente',
            service:s.service||'Easy Rent',product:s.product||'',
            inflow,base:0,deterministicExtra:0,estimated:0,status:'manual',
            rule:'Easy Rent',pdfStored:!!c.pdfStored,canReparse:true,
            note:'Profilo Easy Rent non trovato nel listino del 20/04/2026. Puoi scegliere l’offerta PDF da File/iCloud Drive e farla rileggere a SmartTracker.'
          });
        }
        continue;
      }

      if(rule.manual){
        rows.push({
          contractId:c.id,date:c.date,client:c.client||'Cliente',service:s.service||'',product:s.product||'',
          inflow,base:0,deterministicExtra:0,estimated:0,status:'manual',note:rule.reason,rule:rule.type
        });
        continue;
      }

      const base60=inflow*Number(rule.base60Canons||0);
      const deferred90=inflow*Number(rule.deferred90Canons||0);
      const access=monthlyBoostAccess(store,agent,monthKey(c.date));
      const prospectExtra=(access.unlocked&&c.prospect) ? inflow*Number(rule.prospectCanons||0) : 0;
      const individualExtra=(access.unlocked&&target.won) ? inflow*Number(rule.individualCanons||0) : 0;

      const agencyGroup=rule.agencyGroup||(rule.type==='Core'?'core':(['ADSL','One Net Ufficio','One Net Azienda'].includes(rule.type)?'fixed':null));
      const agencyState=agencyGroup?agencyResult(store,c.date,agencyGroup):'pending';
      const agencyAccessOk=agencyGroup==='digital'?true:access.unlocked;
      const agencyExtra=(agencyAccessOk&&agencyState==='yes') ? inflow*Number(rule.agencyCanons||0) : 0;
      const deterministicExtra=deferred90+prospectExtra+individualExtra+agencyExtra;

      const pending=[];
      if(!access.unlocked && (rule.prospectCanons||rule.individualCanons||(rule.agencyCanons&&agencyGroup!=='digital'))){
        pending.push(`boost ${monthKey(c.date)} bloccati: ${access.inflow.toFixed(2)} € / 250 €`);
      }
      if(rule.individualCanons && access.unlocked && !target.won)pending.push(`+${rule.individualCanons} canone target individuale`);
      if(rule.agencyCanons && agencyState==='pending')pending.push(`Gara Agenzia ${agencyGroup==='digital'?'Digital':agencyGroup==='fixed'?'ADSL + One Net':'CORE'} da confermare (+${rule.agencyCanons} canone)`);
      if(rule.agencyCanons && agencyState==='no')pending.push(`Gara Agenzia ${agencyGroup==='digital'?'Digital':agencyGroup==='fixed'?'ADSL + One Net':'CORE'}: non raggiunta`);
      const common={contractId:c.id,date:c.date,productionMonth:monthKey(c.date),client:c.client||'Cliente',service:s.service||'',product:s.product||'',inflow,status:'calculated',rule:rule.type,pending,rushEligible:!!rule.rushEligible,boostAccess:access,m2mProduct:rule.m2m?recognizeM2MProduct(s.product||''):null,agencyGroup,agencyState};
      if(base60>0)rows.push({...common,component:rule.type==='M2M'?'2 canoni M2M':'Base 60gg',paymentMonth:paymentMonth(c.date,2),base:base60,base60,deterministicExtra:0,estimated:base60,note60:rule.base60Canons?`${rule.base60Canons} canoni base · pagamento a 60 gg dall’attivazione`:''});
      if(deferred90>0)rows.push({...common,component:'Extra base differito',paymentMonth:paymentMonth(c.date,3),base:0,base60:0,deferred90,deterministicExtra:deferred90,estimated:deferred90,note90:`${rule.deferred90Canons} canone extra base · pagamento circa 90 gg dall’attivazione`});
      if(prospectExtra>0)rows.push({...common,component:'Premio Prospect',paymentMonth:paymentMonth(c.date,3),base:0,base60:0,prospectExtra,deterministicExtra:prospectExtra,estimated:prospectExtra});
      if(individualExtra>0)rows.push({...common,component:'Gara individuale trimestrale',paymentMonth:quarterPaymentMonth(c.date),base:0,base60:0,individualExtra,deterministicExtra:individualExtra,estimated:individualExtra});
      if(agencyExtra>0)rows.push({...common,component:`Gara Agenzia ${agencyGroup==='digital'?'Digital':agencyGroup==='fixed'?'ADSL + One Net':'CORE'}`,paymentMonth:quarterPaymentMonth(c.date),base:0,base60:0,agencyExtra,deterministicExtra:agencyExtra,estimated:agencyExtra});
    }
  }

  const calculated=rows.filter(r=>r.status==='calculated');
  return {
    rows,
    base:calculated.reduce((a,r)=>a+r.base,0),
    deterministicExtra:calculated.reduce((a,r)=>a+r.deterministicExtra,0),
    estimated:calculated.reduce((a,r)=>a+r.estimated,0),
    manualCount:rows.filter(r=>r.status==='manual').length,
    target,
    potentialIndividual:target.potentialIndividual||0,
    ruleSet:target.ruleSet||commissionRuleSetForDate(start)||activeCommissionRuleSet(),
    ruleSets:COMMISSION_RULE_SETS,
    agent,
    boostMonths:[...new Set(rows.map(r=>r.productionMonth||monthKey(r.date)).filter(Boolean))].sort().map(m=>monthlyBoostAccess(store,agent,m)),
    paymentMonths:[...new Set(rows.map(r=>r.paymentMonth).filter(Boolean))].sort().map(month=>({month,rows:rows.filter(r=>r.paymentMonth===month),total:rows.filter(r=>r.paymentMonth===month&&r.status==='calculated').reduce((a,r)=>a+r.estimated,0)}))
  };
}
