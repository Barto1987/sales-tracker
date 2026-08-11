import {matchEasyRent} from './easy-rent-listino.js?v=3127';
import {recognizeM2MProduct} from './m2m-listino.js?v=3127';
// SmartTracker 3.12.7 — prima base del motore Provvigioni.
// Q3 2026: calcoliamo solo le parti supportate dalle regole già raccolte.
// Le voci ancora ambigue restano esplicitamente "da confermare".

const active=c=>c.status!=='Annullato';
const inflowOf=s=>Number(s.inflowUnit||0)*Number(s.qty||0);
const inRange=(d,start,end)=>String(d||'')>=start&&String(d||'')<=end;
const monthKey=d=>String(d||'').slice(0,7);
const agentOf=c=>c.agent||'Francesco';
function validMonthlyInflow(store,agent,month){
  return (store.contracts||[])
    .filter(c=>active(c)&&agentOf(c)===agent&&monthKey(c.date)===month)
    .flatMap(c=>c.services||[])
    .reduce((a,s)=>a+inflowOf(s),0);
}
export function monthlyBoostAccess(store,agent,month){
  const inflow=validMonthlyInflow(store,agent,month);
  return {agent,month,inflow,target:250,unlocked:inflow>=250,remaining:Math.max(250-inflow,0)};
}

function textOf(s){
  return `${s.service||''} ${s.product||''} ${s.category||''}`.toLowerCase();
}
function isMiniEasyDeal(s){return /mini\s*easy\s*deal/.test(textOf(s))}
function isEasyRent(s){return s.service==='Easy Rent'}
function isDigital(s){return /solution|soluzioni digitali|digital|cloud|security|cyber|miia|7layers|7 layers|gdpr|nis2|movylo|sdm/.test(textOf(s))}
function isEnergyGas(s){return ['Energia','Gas'].includes(s.service)}
function isOneNetExcludedComponent(s){return /interno|uc phone|sempre serviti|device|attivazione|alcatel|cisco|adok/.test(textOf(s))}

export function individualAgencyTargetWon(store,agent='Francesco'){
  const p=store.settings?.agencyPeriod||{start:'2026-07-01',end:'2026-09-30'};
  const rows=(store.contracts||[]).filter(c=>active(c)&&agentOf(c)===agent&&c.includeAgency!==false&&inRange(c.date,p.start,p.end))
    .flatMap(c=>(c.services||[]).map(s=>({c,s,inflow:inflowOf(s)})));

  const totalInflow=rows.reduce((a,r)=>a+r.inflow,0);
  const core=rows.filter(r=>['SIM Voce','SIM Dati','Easy Rent'].includes(r.s.service));
  const corePieces=core.reduce((a,r)=>a+Number(r.s.qty||0),0);
  const coreInflow=core.reduce((a,r)=>a+r.inflow,0);
  const adsl=rows.filter(r=>r.s.service==='ADSL').reduce((a,r)=>a+Number(r.s.qty||0),0);
  const oneNet=rows.filter(r=>['One Net Ufficio','One Net Azienda'].includes(r.s.service) && !isOneNetExcludedComponent(r.s))
    .reduce((a,r)=>a+Number(r.s.qty||0),0);

  const checks={
    totalInflow: totalInflow>=1600,
    core: corePieces>=40 && coreInflow>=500,
    adsl: adsl>=8,
    oneNet: oneNet>=8
  };
  return {
    won:Object.values(checks).every(Boolean),
    checks,
    values:{totalInflow,corePieces,coreInflow,adsl,oneNet}
  };
}

function ruleFor(s){
  if(isEasyRent(s)) return {type:'Easy Rent',easyRent:true,rushEligible:true};
  if(isMiniEasyDeal(s)) return {type:'Mini Easy Deal',base60Canons:1.5,deferred90Canons:1,individualCanons:1,prospectCanons:2,agencyCanons:0,rushEligible:false};
  if(s.service==='Easy Deal') return {type:'Easy Deal',base60Canons:1.5,deferred90Canons:.5,individualCanons:0,prospectCanons:2,agencyCanons:0,rushEligible:false};
  if(s.service==='ADSL') return {type:'ADSL',base60Canons:3,deferred90Canons:0,individualCanons:1,prospectCanons:2,agencyCanons:1,rushEligible:true};
  if(['One Net Ufficio','One Net Azienda'].includes(s.service) && !isOneNetExcludedComponent(s))
    return {type:s.service,base60Canons:2,deferred90Canons:0,individualCanons:1,prospectCanons:2,agencyCanons:1,rushEligible:true};
  if(s.service==='SIM M2M')
    return {type:'M2M',base60Canons:2,deferred90Canons:0,individualCanons:0,prospectCanons:0,agencyCanons:0,rushEligible:true,m2m:true};
  if(['SIM Voce','SIM Dati'].includes(s.service))
    return {type:'Core',base60Canons:2,deferred90Canons:1,individualCanons:1,prospectCanons:2,agencyCanons:1,rushEligible:true};
  if(isEnergyGas(s)) return {type:s.service,manual:true,rushEligible:true,reason:'Premio Energia/Gas da valorizzare con la regola dedicata; l’inflow resta valido per il Rush.'};
  if(isDigital(s)) return {type:'Digital',manual:true,reason:'Manca ancora il listino base completo; gli extra Digital verranno aggiunti con la prossima tabella provvigionale.'};
  return {type:s.service||'Altro',manual:true,reason:'Regola provvigionale non ancora censita.'};
}

export function commissionsForPeriod(store,start,end,agent='Francesco'){
  const target=individualAgencyTargetWon(store,agent);
  const rows=[];
  for(const c of (store.contracts||[]).filter(c=>active(c)&&agentOf(c)===agent&&inRange(c.date,start,end))){
    for(const s of c.services||[]){
      const inflow=inflowOf(s);
      const rule=ruleFor(s);

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
            note:`${er.fascia} · ${Number(er.provvigione||0).toLocaleString('it-IT',{style:'currency',currency:'EUR'})} a pezzo · gettone secco a 60 gg dall’attivazione`
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
      const deterministicExtra=deferred90+prospectExtra+individualExtra;

      const pending=[];
      if(!access.unlocked && (rule.prospectCanons||rule.individualCanons||rule.agencyCanons)){
        pending.push(`boost ${monthKey(c.date)} bloccati: ${access.inflow.toFixed(2)} € / 250 €`);
      }
      if(rule.individualCanons && access.unlocked && !target.won)pending.push(`+${rule.individualCanons} canone target individuale`);
      if(rule.agencyCanons && access.unlocked)pending.push(`+${rule.agencyCanons} canone target Agenzia`);
      rows.push({
        contractId:c.id,date:c.date,client:c.client||'Cliente',service:s.service||'',product:s.product||'',
        inflow,base:base60,base60,deferred90,prospectExtra,individualExtra,deterministicExtra,
        estimated:base60+deterministicExtra,status:'calculated',rule:rule.type,pending,
        rushEligible:!!rule.rushEligible,boostAccess:access,
        m2mProduct:rule.m2m?recognizeM2MProduct(s.product||''):null,
        note60:rule.base60Canons?`${rule.base60Canons} canoni base · pagamento a 60 gg dall’attivazione`:'',
        note90:rule.deferred90Canons?`${rule.deferred90Canons} canone extra base · pagamento circa 90 gg dall’attivazione`:''
      });
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
    agent,
    boostMonths:[...new Set(rows.map(r=>monthKey(r.date)).filter(Boolean))].sort().map(m=>monthlyBoostAccess(store,agent,m))
  };
}
