
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

function allocationsOf(c){
  if(Array.isArray(c.teamAllocations)&&c.teamAllocations.length){
    const valid=c.teamAllocations
      .map(x=>({agent:x.agent,share:Number(x.share||0)}))
      .filter(x=>x.agent&&x.share>0);
    const sum=valid.reduce((a,x)=>a+x.share,0);
    if(sum>0)return valid.map(x=>({...x,share:x.share/sum}));
  }
  return [{agent:c.agent||'Francesco',share:1}];
}
function allocatedServices(store,start,end,agencyOnly=false){
  return store.contracts
    .filter(c=>active(c)&&inRange(c.date,start,end)&&(!agencyOnly||c.includeAgency!==false))
    .flatMap(c=>allocationsOf(c).flatMap(a=>
      c.services.map(s=>({...s,contract:c,allocatedAgent:a.agent,allocationShare:a.share,totalInflow:inflowOf(s)*a.share,allocatedQty:Number(s.qty||0)*a.share}))
    ));
}


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
  const {start,end}=store.settings.agencyPeriod, x=allocatedServices(store,start,end,true);
  const core=x.filter(r=>['SIM Voce','SIM Dati','Easy Rent'].includes(r.service));
  return {
    corePieces:core.reduce((a,r)=>a+Number((r.allocatedQty ?? r.qty) || 0),0),
    coreInflow:core.reduce((a,r)=>a+r.totalInflow,0),
    adsl:x.filter(r=>r.service==='ADSL').reduce((a,r)=>a+Number((r.allocatedQty ?? r.qty) || 0),0),
    oneNet:x.filter(r=>['One Net Ufficio','One Net Azienda'].includes(r.service)).reduce((a,r)=>a+Number((r.allocatedQty ?? r.qty) || 0),0),
    energyGas:x.filter(r=>['Energia','Gas'].includes(r.service)).reduce((a,r)=>a+Number((r.allocatedQty ?? r.qty) || 0),0)
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

function excellentLinkValue(r){
  if(!excellentFlags(r).link)return 0;

  const name=((r.product||'')+' '+(r.category||'')).toLowerCase();

  // Explicit components excluded from the Excellent Link target.
  if(/sempre serviti|core pack|critical pack|uc phone|device|attivazione/.test(name))return 0;

  // New parser versions save the exact eligible component.
  if(r.excellentLinkUnit!=null){
    return Number(r.excellentLinkUnit||0)*Number(r.qty||0);
  }

  // Backward compatibility for older saved contracts.
  return Number(r.totalInflow||0);
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
  const linkInflow=x.reduce((a,r)=>a+excellentLinkValue(r),0);
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


export function teamStats(store,month=store.settings.teamMonth||store.settings.currentMonth){
  const agents=store.settings.agents||['Francesco','Jacopo','Luciano'];
  const out={};
  const monthContracts=store.contracts.filter(c=>active(c)&&c.date.startsWith(month));

  for(const agent of agents){
    const allocations=monthContracts.flatMap(c=>
      allocationsOf(c)
        .filter(a=>a.agent===agent)
        .map(a=>({contract:c,share:a.share}))
    );
    const rows=allocations.flatMap(({contract,share})=>
      contract.services.map(s=>({...s,contract,share,allocatedQty:Number(s.qty||0)*share,allocatedInflow:inflowOf(s)*share}))
    );
    const countBy=service=>rows.filter(s=>s.service===service).reduce((a,s)=>a+s.allocatedQty,0);
    out[agent]={
      contracts:allocations.reduce((a,x)=>a+x.share,0),
      inflow:rows.reduce((a,s)=>a+s.allocatedInflow,0),
      products:rows.reduce((a,s)=>a+s.allocatedQty,0),
      simVoice:countBy('SIM Voce'),
      simData:countBy('SIM Dati'),
      m2m:countBy('SIM M2M'),
      adsl:countBy('ADSL'),
      oneNet:countBy('One Net Ufficio')+countBy('One Net Azienda'),
      easyRent:countBy('Easy Rent'),
      easyDeal:countBy('Easy Deal'),
      digital:rows.filter(s=>
        s.service==='Solution' ||
        /soluzioni digitali|solution security/i.test(s.category||'') ||
        /smart digital marketing|movylo|lookout/i.test(s.product||'')
      ).reduce((a,s)=>a+s.allocatedInflow,0)
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
    vat:r.contract.vat||'',
    customerCode:r.contract.customerCode||'',
    pdfStored:!!r.contract.pdfStored,
    date:r.contract.date||'',
    agent:r.allocatedAgent||r.contract.agent||'Francesco',
    allocationShare:Number(r.allocationShare||1),
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
    .map(r=>({r,value:excellentLinkValue(r)}))
    .filter(x=>x.value>0)
    .map(x=>mapRow(x.r,x.value,'inflow'));

  const solutionInflow=x
    .filter(r=>excellentFlags(r).solution && r.totalInflow>0)
    .map(r=>mapRow(r,r.totalInflow,'inflow'));

  const easyRentPieces=x
    .filter(r=>excellentFlags(r).er && Number(r.qty||0)>0)
    .map(r=>mapRow(r,Number(r.qty||0),'pieces'));

  return {totalInflow,mobile,prospectInflow,linkInflow,solutionInflow,easyRentPieces};
}


function detailRow(r,metricValue,metricType='inflow',extra={}){
  return {
    contractId:r.contract.id,
    client:r.contract.client||'Cliente',
    offer:r.contract.offer||'',
    vat:r.contract.vat||'',
    customerCode:r.contract.customerCode||'',
    pdfStored:!!r.contract.pdfStored,
    includeAgency:r.contract.includeAgency!==false,
    date:r.contract.date||'',
    agent:r.contract.agent||'Francesco',
    prospect:!!r.contract.prospect,
    service:r.service||'',
    product:r.product||r.service||'',
    qty:Number(r.qty||0),
    inflow:Number(r.totalInflow||0),
    mnp:!!r.mnp,
    metricValue:Number(metricValue||0),
    metricType,
    ...extra
  };
}

export function agencyBreakdown(store){
  const {start,end}=store.settings.agencyPeriod;
  const x=allocatedServices(store,start,end,true);
  const core=x.filter(r=>['SIM Voce','SIM Dati','Easy Rent'].includes(r.service));

  return {
    corePieces:core
      .filter(r=>Number((r.allocatedQty ?? r.qty) || 0)>0)
      .map(r=>detailRow(r,Number((r.allocatedQty ?? r.qty) || 0),'pieces')),
    coreInflow:core
      .filter(r=>r.totalInflow>0)
      .map(r=>detailRow(r,r.totalInflow,'inflow')),
    adsl:x
      .filter(r=>r.service==='ADSL'&&Number((r.allocatedQty ?? r.qty) || 0)>0)
      .map(r=>detailRow(r,Number((r.allocatedQty ?? r.qty) || 0),'pieces')),
    oneNet:x
      .filter(r=>['One Net Ufficio','One Net Azienda'].includes(r.service)&&Number((r.allocatedQty ?? r.qty) || 0)>0)
      .map(r=>detailRow(r,Number((r.allocatedQty ?? r.qty) || 0),'pieces')),
    energyGas:x
      .filter(r=>['Energia','Gas'].includes(r.service)&&Number((r.allocatedQty ?? r.qty) || 0)>0)
      .map(r=>detailRow(r,Number((r.allocatedQty ?? r.qty) || 0),'pieces'))
  };
}

export function communityBreakdown(store){
  const month=store.settings.communityMonth;
  const start=month+'-01',end=month+'-31';
  const x=flatServices(store,start,end);

  const totalVcoins=[];
  const baseVcoins=[];
  const inflow=[];
  const link=[];
  const mnp=[];
  const prospect=[];
  const easyRent=[];
  const other=[];

  for(const r of x){
    const multiplier=communityMultiplier(r);
    const points=r.totalInflow*multiplier;
    const extra=Math.max(points-r.totalInflow,0);

    if(r.totalInflow>0){
      inflow.push(detailRow(r,r.totalInflow,'inflow'));
      baseVcoins.push(detailRow(r,r.totalInflow,'vcoins',{
        multiplier:1,
        basePoints:r.totalInflow,
        boostPoints:0,
        totalPoints:r.totalInflow,
        boostType:'Base'
      }));
      totalVcoins.push(detailRow(r,points,'vcoins',{
        multiplier,
        basePoints:r.totalInflow,
        boostPoints:extra,
        totalPoints:points,
        boostType:
          extra<=0?'Nessun boost':
          r.service==='SIM Voce'&&r.mnp?'MNP':
          r.contract.prospect?'Prospect':
          r.service==='Easy Rent'?'Easy Rent':
          /miia/i.test(r.product||'')?'MIIA':
          /7layers|7 layers/i.test(r.product||'')?'7Layers':
          /fast cloud/i.test(r.product||'')?'Fast Cloud':'Altro'
      }));
    }

    if(excellentFlags(r).link&&r.totalInflow>0){
      link.push(detailRow(r,r.totalInflow,'inflow'));
    }

    if(extra>0){
      const row=detailRow(r,extra,'vcoins',{
        multiplier,
        basePoints:r.totalInflow,
        boostPoints:extra,
        totalPoints:points
      });
      if(r.service==='SIM Voce'&&r.mnp)mnp.push({...row,boostType:'MNP'});
      else if(r.contract.prospect)prospect.push({...row,boostType:'Prospect'});
      else if(r.service==='Easy Rent')easyRent.push({...row,boostType:'Easy Rent'});
      else other.push({...row,boostType:'Altro'});
    }
  }

  return {totalVcoins,baseVcoins,inflow,link,mnp,prospect,easyRent,other};
}


export function teamBreakdown(store,month,agent,key){
  const allocations=store.contracts
    .filter(c=>active(c)&&c.date.startsWith(month))
    .flatMap(c=>allocationsOf(c).filter(a=>a.agent===agent).map(a=>({contract:c,share:a.share})));

  if(key==='contracts')return allocations.map(({contract:c,share})=>({
    contractId:c.id,client:c.client||'Cliente',offer:c.offer||'',vat:c.vat||'',customerCode:c.customerCode||'',
    pdfStored:!!c.pdfStored,date:c.date||'',agent,prospect:!!c.prospect,includeAgency:c.includeAgency!==false,
    service:'Contratto',product:(c.services||[]).map(s=>s.product||s.service).join(' · '),
    qty:(c.services||[]).reduce((a,s)=>a+Number(s.qty||0)*share,0),
    inflow:(c.services||[]).reduce((a,s)=>a+inflowOf(s)*share,0),
    metricValue:share,metricType:'contracts',allocationShare:share
  }));

  const rows=allocations.flatMap(({contract,share})=>
    contract.services.map(s=>({...s,contract,allocationShare:share,allocatedAgent:agent,totalInflow:inflowOf(s)*share,allocatedQty:Number(s.qty||0)*share}))
  );
  const base=r=>detailRow(
    r,
    (key==='inflow'||key==='digital')?r.totalInflow:Number(r.allocatedQty||0),
    (key==='inflow'||key==='digital')?'inflow':'pieces'
  );
  const filters={
    inflow:r=>r.totalInflow>0,
    products:r=>Number(r.allocatedQty||0)>0,
    simVoice:r=>r.service==='SIM Voce',
    simData:r=>r.service==='SIM Dati',
    m2m:r=>r.service==='SIM M2M',
    adsl:r=>r.service==='ADSL',
    oneNet:r=>['One Net Ufficio','One Net Azienda'].includes(r.service),
    easyRent:r=>r.service==='Easy Rent',
    easyDeal:r=>r.service==='Easy Deal',
    digital:r=>
      r.service==='Solution' ||
      /soluzioni digitali|solution security/i.test(r.category||'') ||
      /smart digital marketing|movylo|lookout/i.test(r.product||'')
  };
  return rows.filter(filters[key]||(()=>false)).map(base);
}


export function availableMonths(store){
  const set=new Set((store.contracts||[]).map(c=>(c.date||'').slice(0,7)).filter(Boolean));
  const now=new Date(), current=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  set.add(current);
  return [...set].sort().reverse();
}

export function customerKey(c){
  if(c.vat)return `vat:${String(c.vat).trim()}`;
  if(c.customerCode)return `code:${String(c.customerCode).trim().toLowerCase()}`;
  return `name:${String(c.client||'Cliente').trim().toLowerCase()}`;
}
export function customerDashboard(store,key){
  const contracts=(store.contracts||[]).filter(c=>c.status!=='Eliminato'&&customerKey(c)===key).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(!contracts.length)return null;
  const rows=contracts.flatMap(c=>(c.services||[]).map(s=>({...s,contract:c,totalInflow:inflowOf(s)})));
  const inflow=rows.reduce((a,r)=>a+r.totalInflow,0);
  const pieces=rows.reduce((a,r)=>a+Number(r.qty||0),0);
  const vcoins=rows.reduce((a,r)=>a+r.totalInflow*communityMultiplier(r),0);
  const agencyInflow=rows.filter(r=>r.contract.includeAgency!==false).reduce((a,r)=>a+r.totalInflow,0);
  const mix={}; rows.forEach(r=>mix[r.service]=(mix[r.service]||0)+Number(r.qty||0));
  const first=[...contracts].sort((a,b)=>(a.date||'').localeCompare(b.date||''))[0],last=contracts[0];
  return {key,client:last.client||first.client||'Cliente',vat:last.vat||first.vat||'',customerCode:last.customerCode||first.customerCode||'',prospect:contracts.some(c=>c.prospect),firstDate:first.date||'',lastDate:last.date||'',inflow,contracts:contracts.length,pieces,vcoins,excellentInflow:inflow,agencyInflow,productMix:mix,contractsList:contracts};
}
export function customerList(store){
  const keys=[...new Set((store.contracts||[]).filter(c=>c.status!=='Eliminato').map(customerKey))];
  return keys.map(k=>customerDashboard(store,k)).filter(Boolean).sort((a,b)=>b.inflow-a.inflow);
}
