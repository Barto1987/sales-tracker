// SmartTracker 3.12.1 — prima base del motore Provvigioni.
// Q3 2026: calcoliamo solo le parti supportate dalle regole già raccolte.
// Le voci ancora ambigue restano esplicitamente "da confermare".

const active=c=>c.status!=='Annullato';
const inflowOf=s=>Number(s.inflowUnit||0)*Number(s.qty||0);
const inRange=(d,start,end)=>String(d||'')>=start&&String(d||'')<=end;

function textOf(s){
  return `${s.service||''} ${s.product||''} ${s.category||''}`.toLowerCase();
}
function isMiniEasyDeal(s){return /mini\s*easy\s*deal/.test(textOf(s))}
function isDigital(s){return /solution|soluzioni digitali|digital|cloud|security|cyber|miia|7layers|7 layers|gdpr|nis2|movylo|sdm/.test(textOf(s))}
function isEnergyGas(s){return ['Energia','Gas'].includes(s.service)}
function isOneNetExcludedComponent(s){return /interno|uc phone|sempre serviti|device|attivazione|alcatel|cisco|adok/.test(textOf(s))}

export function individualAgencyTargetWon(store){
  const p=store.settings?.agencyPeriod||{start:'2026-07-01',end:'2026-09-30'};
  const rows=(store.contracts||[]).filter(c=>active(c)&&c.includeAgency!==false&&inRange(c.date,p.start,p.end))
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
  if(isMiniEasyDeal(s)) return {type:'Mini Easy Deal',baseCanons:2.5,individualCanons:1,prospectCanons:2,agencyCanons:0,rushCanons:0};
  if(s.service==='Easy Deal') return {type:'Easy Deal',baseCanons:2,individualCanons:0,prospectCanons:2,agencyCanons:0,rushCanons:0};
  if(s.service==='ADSL') return {type:'ADSL',baseCanons:3,individualCanons:1,prospectCanons:2,agencyCanons:1,rushCanons:.3};
  if(['One Net Ufficio','One Net Azienda'].includes(s.service) && !isOneNetExcludedComponent(s))
    return {type:s.service,baseCanons:2,individualCanons:1,prospectCanons:2,agencyCanons:1,rushCanons:.3};
  if(['SIM Voce','SIM Dati','Easy Rent'].includes(s.service))
    return {type:'Core',baseCanons:3,individualCanons:1,prospectCanons:2,agencyCanons:1,rushCanons:.3};
  if(isEnergyGas(s)) return {type:s.service,manual:true,reason:'Premio in euro con scaglioni/T6/T12: regola da confermare prima del calcolo automatico.'};
  if(isDigital(s)) return {type:'Digital',manual:true,reason:'Manca ancora il listino base completo; gli extra Digital verranno aggiunti con la prossima tabella provvigionale.'};
  return {type:s.service||'Altro',manual:true,reason:'Regola provvigionale non ancora censita.'};
}

export function commissionsForPeriod(store,start,end){
  const target=individualAgencyTargetWon(store);
  const rows=[];
  for(const c of (store.contracts||[]).filter(c=>active(c)&&inRange(c.date,start,end))){
    for(const s of c.services||[]){
      const inflow=inflowOf(s);
      const rule=ruleFor(s);
      if(rule.manual){
        rows.push({
          contractId:c.id,date:c.date,client:c.client||'Cliente',service:s.service||'',product:s.product||'',
          inflow,base:0,deterministicExtra:0,estimated:0,status:'manual',note:rule.reason,rule:rule.type
        });
        continue;
      }

      const base=inflow*Number(rule.baseCanons||0);
      const prospectExtra=c.prospect ? inflow*Number(rule.prospectCanons||0) : 0;
      const individualExtra=target.won ? inflow*Number(rule.individualCanons||0) : 0;
      const deterministicExtra=prospectExtra+individualExtra;

      const pending=[];
      if(rule.individualCanons && !target.won)pending.push(`+${rule.individualCanons} canone target individuale`);
      if(rule.agencyCanons)pending.push(`+${rule.agencyCanons} canone target Agenzia`);
      if(rule.rushCanons)pending.push(`+${rule.rushCanons} rush`);
      rows.push({
        contractId:c.id,date:c.date,client:c.client||'Cliente',service:s.service||'',product:s.product||'',
        inflow,base,prospectExtra,individualExtra,deterministicExtra,estimated:base+deterministicExtra,
        status:'calculated',rule:rule.type,pending
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
    target
  };
}
