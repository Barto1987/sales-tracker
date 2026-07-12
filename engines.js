
export const TARGETS={
  agency:{corePieces:40,coreInflow:500,adsl:8,oneNet:8,energyGas:10},
  excellent:{
    totalInflow:3000,mobile:60,prospectInflow:550,linkInflow:1000,solutionInflow:1000,easyRentPieces:12,
    prizes:{totalInflow:400,mobile:250,prospectInflow:400,linkInflow:400,solutionInflow:300,easyRentPieces:250}
  },
  community:{abilityInflow:800,abilityLink:350}
};
const active=c=>c.status!=='Annullato';
const inRange=(date,start,end)=>date>=start&&date<=end;
export const inflowOf=s=>Number(s.inflowUnit||0)*Number(s.qty||0);

function flatServices(store,start,end,agencyOnly=false){
  return store.contracts.filter(c=>active(c)&&inRange(c.date,start,end)&&(!agencyOnly||c.includeAgency!==false)).flatMap(c=>
    c.services.map(s=>({...s,contract:c,totalInflow:inflowOf(s)}))
  )
}
export function generalStats(store){
  const month=store.settings.currentMonth;
  const rows=store.contracts.filter(c=>active(c)&&c.date.startsWith(month));
  const services=rows.flatMap(c=>c.services);
  return {
    contracts:rows.length,
    inflow:services.reduce((a,s)=>a+inflowOf(s),0),
    pieces:services.reduce((a,s)=>a+Number(s.qty||0),0)
  }
}
export function agencyStats(store){
  const {start,end}=store.settings.agencyPeriod, x=flatServices(store,start,end,true);
  const core=x.filter(r=>['SIM Voce','SIM Dati','Easy Rent'].includes(r.service));
  return {
    corePieces:core.reduce((a,r)=>a+Number(r.qty||0),0),
    coreInflow:core.reduce((a,r)=>a+r.totalInflow,0),
    adsl:x.filter(r=>r.service==='ADSL').reduce((a,r)=>a+Number(r.qty||0),0),
    oneNet:x.filter(r=>['One Net Ufficio','One Net Azienda'].includes(r.service)).reduce((a,r)=>a+Number(r.qty||0),0),
    energyGas:x.filter(r=>['Energia','Gas'].includes(r.service)).reduce((a,r)=>a+Number(r.qty||0),0)
  }
}
function excellentFlags(r){
  const cat=(r.category||'').toLowerCase(), name=(r.product||r.service||'').toLowerCase();
  const easyDeal=r.service==='Easy Deal'||/onenet enterprise fibra p2p|easy deal(?!\s*mini)/.test(name);
  const m2m=r.service==='SIM M2M'||/\bm2m\b|\biot\b/.test(cat)||/^m2m|^iot/.test(name);
  const mobile=['SIM Voce','SIM Dati'].includes(r.service);
  const link=!easyDeal&&(
    ['ADSL','One Net Ufficio','One Net Azienda'].includes(r.service)||
    /fissa|backup fwa|mini easy deal|onebusiness/.test(name)||
    (/connettività/.test(cat)&&!m2m)
  );
  const solution=!easyDeal&&!m2m&&(
    /soluzioni? digitali?|digital solution|cloud|security|cyber|miia|7layers|7 layers|gdpr|nis2/.test(cat+' '+name)
  );
  return {mobile,er:r.service==='Easy Rent',link,solution,easyDeal,m2m}
}
export function excellentStats(store){
  const {start,end}=store.settings.excellentPeriod, x=flatServices(store,start,end);
  const totalInflow=x.reduce((a,r)=>a+r.totalInflow,0);
  const mobile=x.filter(r=>excellentFlags(r).mobile).reduce((a,r)=>a+Number(r.qty||0),0);
  const prospectInflow=x.filter(r=>{
    if(!r.contract.prospect)return false;
    const f=excellentFlags(r);
    return f.mobile||f.link;
  }).reduce((a,r)=>a+r.totalInflow,0);
  const linkInflow=x.filter(r=>excellentFlags(r).link).reduce((a,r)=>{
    const n=(r.product||'').toLowerCase();
    if(/sempre serviti/.test(n)) return a;
    return a+r.totalInflow;
  },0);
  const solutionInflow=x.filter(r=>excellentFlags(r).solution).reduce((a,r)=>a+r.totalInflow,0);
  const easyRentPieces=x.filter(r=>excellentFlags(r).er).reduce((a,r)=>a+Number(r.qty||0),0);
  const vals={totalInflow,mobile,prospectInflow,linkInflow,solutionInflow,easyRentPieces};
  let variable=0;
  for(const k of Object.keys(TARGETS.excellent.prizes)){
    if(vals[k]>=TARGETS.excellent[k]) variable+=TARGETS.excellent.prizes[k]
  }
  const won=variable>=1000;
  const historyWon=store.excellentHistory.filter(x=>x.won).length;
  return {...vals,variable,totalPrize:1000+variable,won,historyWon,trimestersNeeded:Math.max(6-historyWon-(won?1:0),0)}
}
function communityMultiplier(row){
  const c=row.contract;
  const name=(row.product||row.service||'').toLowerCase();
  let m=1;
  if(row.service==='SIM Voce'&&row.mnp)m=Math.max(m,3);
  if(c.prospect)m=Math.max(m,3);
  if(row.service==='Easy Rent')m=Math.max(m,2);
  if(/miia/.test(name))m=Math.max(m,3);
  if(/7layers|7 layers/.test(name))m=Math.max(m,2);
  if(/fast cloud/.test(name))m=Math.max(m,2);
  return m
}
export function communityStats(store){
  const month=store.settings.communityMonth;
  const start=month+'-01', end=month+'-31';
  const x=flatServices(store,start,end);
  let inflow=0,vcoins=0,link=0,boosts={mnp:0,prospect:0,easyRent:0,other:0};
  for(const r of x){
    inflow+=r.totalInflow;
    const m=communityMultiplier(r), pts=r.totalInflow*m;
    vcoins+=pts;
    if(excellentFlags(r).link)link+=r.totalInflow;
    const extra=pts-r.totalInflow;
    if(extra>0){
      if(r.service==='SIM Voce'&&r.mnp)boosts.mnp+=extra;
      else if(r.contract.prospect)boosts.prospect+=extra;
      else if(r.service==='Easy Rent')boosts.easyRent+=extra;
      else boosts.other+=extra;
    }
  }
  const official=store.officialCommunity.vcoins;
  return {inflow,link,vcoins,boosts,ability:inflow>=800&&link>=350,official,difference:official==null?null:official-vcoins}
}


export function teamStats(store){
  const month=store.settings.currentMonth;
  const agents=store.settings.agents||['Francesco','Jacopo','Luciano'];
  const out={};
  for(const agent of agents){
    const contracts=store.contracts.filter(c=>active(c)&&c.date.startsWith(month)&&(c.agent||'Francesco')===agent);
    const services=contracts.flatMap(c=>c.services);
    const countBy=service=>services.filter(s=>s.service===service).reduce((a,s)=>a+Number(s.qty||0),0);
    out[agent]={
      contracts:contracts.length,
      inflow:services.reduce((a,s)=>a+inflowOf(s),0),
      products:services.reduce((a,s)=>a+Number(s.qty||0),0),
      simVoice:countBy('SIM Voce'),
      simData:countBy('SIM Dati'),
      m2m:countBy('SIM M2M'),
      adsl:countBy('ADSL'),
      oneNet:countBy('One Net Ufficio')+countBy('One Net Azienda'),
      easyRent:countBy('Easy Rent'),
      easyDeal:countBy('Easy Deal')
    };
  }
  out.Totale=Object.values(out).reduce((acc,x)=>{
    for(const k of Object.keys(x))acc[k]=(acc[k]||0)+x[k];
    return acc;
  },{});
  return out;
}


export function excellentBreakdown(store){
  const {start,end}=store.settings.excellentPeriod;
  const x=flatServices(store,start,end);

  const mapRow=(r,metricValue,metricType='inflow')=>({
    contractId:r.contract.id,
    client:r.contract.client||'Cliente',
    offer:r.contract.offer||'',
    date:r.contract.date||'',
    agent:r.contract.agent||'Francesco',
    prospect:!!r.contract.prospect,
    service:r.service||'',
    product:r.product||r.service||'',
    qty:Number(r.qty||0),
    inflow:Number(r.totalInflow||0),
    metricValue:Number(metricValue||0),
    metricType
  });

  const totalInflow=x
    .filter(r=>r.totalInflow>0)
    .map(r=>mapRow(r,r.totalInflow,'inflow'));

  const mobile=x
    .filter(r=>excellentFlags(r).mobile && Number(r.qty||0)>0)
    .map(r=>mapRow(r,Number(r.qty||0),'pieces'));

  const prospectInflow=x
    .filter(r=>{
      if(!r.contract.prospect)return false;
      const f=excellentFlags(r);
      return (f.mobile||f.link) && r.totalInflow>0;
    })
    .map(r=>mapRow(r,r.totalInflow,'inflow'));

  const linkInflow=x
    .filter(r=>{
      if(!excellentFlags(r).link || r.totalInflow<=0)return false;
      const n=(r.product||'').toLowerCase();
      return !/sempre serviti/.test(n);
    })
    .map(r=>mapRow(r,r.totalInflow,'inflow'));

  const solutionInflow=x
    .filter(r=>excellentFlags(r).solution && r.totalInflow>0)
    .map(r=>mapRow(r,r.totalInflow,'inflow'));

  const easyRentPieces=x
    .filter(r=>excellentFlags(r).er && Number(r.qty||0)>0)
    .map(r=>mapRow(r,Number(r.qty||0),'pieces'));

  return {totalInflow,mobile,prospectInflow,linkInflow,solutionInflow,easyRentPieces};
}
