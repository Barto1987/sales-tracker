
const SYNC_META_KEY='salesTrackerSyncMetaV1';

function stamp(){
  const d=new Date();
  const pad=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}
function downloadBlob(blob,filename){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function updatedAtOf(contract){
  return contract.updatedAt||contract.createdAt||contract.date||'';
}
function mergeContracts(localContracts=[],remoteContracts=[]){
  const map=new Map(localContracts.map(c=>[c.id,c]));
  let added=0,updated=0,unchanged=0;

  for(const remote of remoteContracts){
    const local=map.get(remote.id);
    if(!local){
      map.set(remote.id,remote);
      added++;
      continue;
    }

    const localStamp=updatedAtOf(local);
    const remoteStamp=updatedAtOf(remote);

    if(remoteStamp>localStamp){
      map.set(remote.id,{...local,...remote});
      updated++;
    }else{
      unchanged++;
    }
  }

  return {
    contracts:[...map.values()],
    added,
    updated,
    unchanged
  };
}
function mergeExcellentHistory(local=[],remote=[]){
  const map=new Map();
  for(const item of [...local,...remote]){
    const key=item.period||item.label||JSON.stringify(item);
    const existing=map.get(key);
    if(!existing||Number(item.total||0)>Number(existing.total||0))map.set(key,item);
  }
  return [...map.values()];
}
function mergeSettings(local={},remote={}){
  return {
    ...local,
    ...remote,
    agents:[...new Set([...(local.agents||[]),...(remote.agents||[])])]
  };
}
export function exportSync(store,deviceName='Dispositivo'){
  const payload={
    type:'sales-tracker-sync',
    schemaVersion:1,
    exportedAt:new Date().toISOString(),
    deviceName,
    store:{
      ...store,
      contracts:(store.contracts||[]).map(c=>({...c})),
      excellentHistory:[...(store.excellentHistory||[])]
    }
  };

  downloadBlob(
    new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),
    `SmartTrackerSync_${stamp()}.json`
  );

  localStorage.setItem(SYNC_META_KEY,JSON.stringify({
    exportedAt:payload.exportedAt,
    deviceName,
    contracts:payload.store.contracts.length
  }));

  return payload;
}
export async function readSyncFile(file){
  const text=await file.text();
  const payload=JSON.parse(text);
  if(payload?.type!=='sales-tracker-sync'||!payload.store||!Array.isArray(payload.store.contracts)){
    throw new Error('File Sync non valido');
  }
  return payload;
}
export function previewMerge(localStore,remoteStore){
  const result=mergeContracts(localStore.contracts||[],remoteStore.contracts||[]);
  return {
    added:result.added,
    updated:result.updated,
    unchanged:result.unchanged,
    localContracts:(localStore.contracts||[]).length,
    remoteContracts:(remoteStore.contracts||[]).length,
    finalContracts:result.contracts.length
  };
}
export function applyMerge(localStore,remoteStore){
  const contracts=mergeContracts(localStore.contracts||[],remoteStore.contracts||[]);
  const merged={
    ...localStore,
    version:Math.max(Number(localStore.version||0),Number(remoteStore.version||0)),
    contracts:contracts.contracts,
    settings:mergeSettings(localStore.settings||{},remoteStore.settings||{}),
    excellentHistory:mergeExcellentHistory(localStore.excellentHistory||[],remoteStore.excellentHistory||[]),
    officialCommunity:{
      ...(localStore.officialCommunity||{}),
      ...(remoteStore.officialCommunity||{})
    }
  };

  const importedAt=new Date().toISOString();
  localStorage.setItem(SYNC_META_KEY,JSON.stringify({
    importedAt,
    contracts:merged.contracts.length,
    added:contracts.added,
    updated:contracts.updated
  }));

  return {
    store:merged,
    importedAt,
    added:contracts.added,
    updated:contracts.updated,
    unchanged:contracts.unchanged
  };
}
export function getSyncMeta(){
  try{return JSON.parse(localStorage.getItem(SYNC_META_KEY)||'null')}catch{return null}
}
