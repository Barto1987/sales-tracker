
export const STORAGE_KEY='salesTracker2Data';
export const LEGACY_KEY='salesTrackerContracts';

export function emptyStore(){
  return {
    version:3,
    contracts:[],
    deletedContracts:{},
    settings:{
      currentMonth:'2026-07',
      activeMonth:'2026-07',
      teamMonth:'2026-07',
      agencyPeriod:{start:'2026-07-01',end:'2026-09-30'},
      excellentPeriod:{start:'2026-07-01',end:'2026-09-30'},
      communityMonth:'2026-07',
      lastAutoMonth:'2026-07',
      lastAutoQuarter:'2026-Q3',
      agents:['Francesco','Jacopo','Luciano'],agencyQuarterResults:{'2026-Q3':{core:'pending',fixed:'pending',digital:'pending',updatedAt:null}},communityRankings:{}
    },
    officialCommunity:{vcoins:null,updatedAt:null},
    communityManualExtras:{},
    periodStates:{},
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
      store.settings=store.settings||emptyStore().settings;
      store.deletedContracts=store.deletedContracts||{};
      store.communityManualExtras=store.communityManualExtras||{};
      store.periodStates=store.periodStates||{};
      store.settings.activeMonth=store.settings.activeMonth||store.settings.currentMonth||'2026-07';
      store.settings.agents=store.settings.agents||['Francesco','Jacopo','Luciano'];store.settings.agencyQuarterResults=store.settings.agencyQuarterResults||{};store.settings.agencyQuarterResults['2026-Q3']=store.settings.agencyQuarterResults['2026-Q3']||{core:'pending',fixed:'pending',digital:'pending',updatedAt:null};store.settings.communityRankings=store.settings.communityRankings||{};
      store.settings.teamMonth=store.settings.teamMonth||store.settings.currentMonth||'2026-07';
      store.contracts=(store.contracts||[]).map(c=>({
        ...c,
        createdAt:c.createdAt||c.date||new Date().toISOString(),
        updatedAt:c.updatedAt||c.createdAt||c.date||new Date().toISOString(),
        teamAllocations:Array.isArray(c.teamAllocations)&&c.teamAllocations.length?c.teamAllocations:[{agent:c.agent||'Francesco',share:1}],
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
  else if(obj&&(obj.version===2||obj.version===3)&&Array.isArray(obj.contracts)){
    obj.deletedContracts=obj.deletedContracts||{};
    obj.contracts=obj.contracts.map(c=>({
      ...c,
      createdAt:c.createdAt||c.date||new Date().toISOString(),
      updatedAt:c.updatedAt||c.createdAt||c.date||new Date().toISOString(),
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
