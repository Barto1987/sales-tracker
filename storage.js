
export const STORAGE_KEY='salesTracker2Data';
export const LEGACY_KEY='salesTrackerContracts';

export function emptyStore(){
  return {
    version:2,
    contracts:[],
    settings:{
      currentMonth:'2026-07',
      agencyPeriod:{start:'2026-07-01',end:'2026-09-30'},
      excellentPeriod:{start:'2026-07-01',end:'2026-09-30'},
      communityMonth:'2026-07',
      agents:['Francesco','Jacopo','Luciano']
    },
    officialCommunity:{vcoins:null,updatedAt:null},
    excellentHistory:[
      {period:'2025 Q4',label:'Ott–Dic 2025',won:true,total:2250,variable:1250,payment:'Marzo 2026'},
      {period:'2026 Q1',label:'Gen–Mar 2026',won:true,total:2400,variable:1400,payment:'Giugno 2026'},
      {period:'2026 Q2',label:'Apr–Giu 2026',won:true,total:2450,variable:1450,payment:'Settembre 2026'}
    ]
  }
}
export function loadStore(){
  const v2=localStorage.getItem(STORAGE_KEY);
  if(v2){
    try{
      const store=JSON.parse(v2);
      store.contracts=(store.contracts||[]).map(c=>({
        ...c,
        services:(c.services||[]).map(s=>({
          ...s,
          mnp:s.mnp!=null?!!s.mnp:(s.service==='SIM Voce'?!!c.mnp:false)
        }))
      }));
      return store;
    }catch{}
  }
  const legacy=localStorage.getItem(LEGACY_KEY);
  const store=emptyStore();
  if(legacy){
    try{store.contracts=migrateLegacy(JSON.parse(legacy))}catch{}
  }
  saveStore(store); return store;
}
export function saveStore(store){localStorage.setItem(STORAGE_KEY,JSON.stringify(store))}
export function migrateLegacy(rows){
  const grouped={};
  for(const r of rows||[]){
    const key=(r.offer||'')+'|'+(r.client||'')+'|'+(r.date||'');
    if(!grouped[key]) grouped[key]={
      id:'C-'+Date.now()+'-'+Math.random().toString(36).slice(2),
      date:r.date||new Date().toISOString().slice(0,10),
      offer:r.offer||'',client:r.client||'Da verificare',vat:r.vat||'',
      prospect:false,mnp:false,agent:'Francesco',includeAgency:true,status:r.status||'Valido',pdfRef:r.pdfRef||'',
      notes:'Migrato da backup/versione 1',services:[]
    };
    grouped[key].services.push({
      id:'S-'+Math.random().toString(36).slice(2),
      service:r.service||'Altro',
      product:r.service||'Altro',
      qty:Number(r.qty||1),
      inflowUnit:Number(r.manual!==''&&r.manual!=null?r.manual:r.monthly||0),
      confidence:'legacy',
      mnp:false,
      calc:'Dato migrato dalla versione 1'
    });
  }
  return Object.values(grouped)
}
export function importBackupObject(obj){
  const store=emptyStore();
  if(Array.isArray(obj)) store.contracts=migrateLegacy(obj);
  else if(obj&&obj.version===2&&Array.isArray(obj.contracts)){
    obj.contracts=obj.contracts.map(c=>({
      ...c,
      services:(c.services||[]).map(s=>({
        ...s,
        mnp:s.mnp!=null?!!s.mnp:(s.service==='SIM Voce'?!!c.mnp:false)
      }))
    }));
    return obj;
  }
  else throw new Error('Formato backup non riconosciuto');
  return store
}
