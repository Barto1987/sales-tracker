const PROJECT_URL='https://exosbflachjzhzjtikah.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_9HWmkG6IFXL9l0F9L_l6tA_lOuecELJ';

const SESSION_KEY='smartTrackerCloudSessionV2';
const LINKED_KEY='smartTrackerCloudLinkedV2';
const META_KEY='smartTrackerCloudMetaV2';
const EMAIL_KEY='smartTrackerCloudEmail';
const ROW_ID='primary';

let bootstrapped=false;
let syncTimer=null;

const nowIso=()=>new Date().toISOString();
const parse=(v,f=null)=>{try{return JSON.parse(v)}catch{return f}};
const getSession=()=>parse(localStorage.getItem(SESSION_KEY),null);
const setSession=s=>localStorage.setItem(SESSION_KEY,JSON.stringify(s));
const clearSession=()=>localStorage.removeItem(SESSION_KEY);
const getMeta=()=>parse(localStorage.getItem(META_KEY),{})||{};
const setMeta=p=>localStorage.setItem(META_KEY,JSON.stringify({...getMeta(),...p}));

export function getCloudEmail(){return localStorage.getItem(EMAIL_KEY)||''}
export function setCloudEmail(v){localStorage.setItem(EMAIL_KEY,String(v||'').trim())}
export function isCloudLinked(){return localStorage.getItem(LINKED_KEY)==='1'}
export function setCloudLinked(v){localStorage.setItem(LINKED_KEY,v?'1':'0')}
export function getCloudMeta(){return getMeta()}
export function getCloudSession(){return getSession()}

async function timedFetch(url,options={},timeoutMs=12000){
  const ctrl=new AbortController();
  const t=setTimeout(()=>ctrl.abort(),timeoutMs);
  try{
    return await fetch(url,{...options,signal:ctrl.signal});
  }finally{clearTimeout(t)}
}

async function rawAuth(path,options={}){
  const headers={
    apikey:PUBLISHABLE_KEY,
    'Content-Type':'application/json',
    ...(options.headers||{})
  };
  return timedFetch(PROJECT_URL+path,{...options,headers});
}

async function refreshSession(){
  const s=getSession();
  if(!s?.refresh_token)throw new Error('Sessione Cloud non disponibile');
  const res=await rawAuth('/auth/v1/token?grant_type=refresh_token',{
    method:'POST',
    body:JSON.stringify({refresh_token:s.refresh_token})
  });
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(body?.msg||body?.message||body?.error_description||'Refresh sessione fallito');
  const next={
    access_token:body.access_token,
    refresh_token:body.refresh_token||s.refresh_token,
    expires_at:Math.floor(Date.now()/1000)+Number(body.expires_in||3600),
    user:body.user||s.user
  };
  setSession(next);
  return next;
}

async function validSession(){
  let s=getSession();
  if(!s?.access_token)return null;
  if(Number(s.expires_at||0)-60<=Math.floor(Date.now()/1000))s=await refreshSession();
  return s;
}

async function dbFetch(path,options={}){
  let s=await validSession();
  if(!s)throw new Error('Accedi prima a SmartTracker Cloud');
  const headers={
    apikey:PUBLISHABLE_KEY,
    Authorization:`Bearer ${s.access_token}`,
    'Content-Type':'application/json',
    ...(options.headers||{})
  };
  let res=await timedFetch(PROJECT_URL+'/rest/v1'+path,{...options,headers});
  if(res.status===401){
    s=await refreshSession();
    res=await timedFetch(PROJECT_URL+'/rest/v1'+path,{
      ...options,
      headers:{...headers,Authorization:`Bearer ${s.access_token}`}
    });
  }
  return res;
}

export async function runCloudDiagnostics(email,password){
  const steps=[];
  const push=(ok,label,detail='')=>steps.push({ok,label,detail});
  try{
    const health=await timedFetch(PROJECT_URL+'/auth/v1/health',{headers:{apikey:PUBLISHABLE_KEY}},10000);
    push(health.ok,'Supabase raggiungibile',`HTTP ${health.status}`);
    if(!health.ok)return {ok:false,steps,error:`Health endpoint HTTP ${health.status}`};
  }catch(e){
    push(false,'Supabase raggiungibile',e.name==='AbortError'?'Timeout di rete':e.message);
    return {ok:false,steps,error:'Connessione a Supabase non riuscita'};
  }

  try{
    const settings=await timedFetch(PROJECT_URL+'/auth/v1/settings',{headers:{apikey:PUBLISHABLE_KEY}},10000);
    push(settings.ok,'Publishable key accettata',`HTTP ${settings.status}`);
    if(!settings.ok)return {ok:false,steps,error:`API key rifiutata: HTTP ${settings.status}`};
  }catch(e){
    push(false,'Publishable key accettata',e.message);
    return {ok:false,steps,error:'Impossibile verificare la publishable key'};
  }

  try{
    const res=await rawAuth('/auth/v1/token?grant_type=password',{
      method:'POST',
      body:JSON.stringify({email:String(email||'').trim(),password:String(password||'')})
    });
    const text=await res.text();
    let body={}; try{body=JSON.parse(text)}catch{body={raw:text}}
    if(!res.ok){
      push(false,'Login Auth',body?.msg||body?.message||body?.error_description||`HTTP ${res.status}`);
      return {ok:false,steps,error:body?.msg||body?.message||body?.error_description||`Login fallito (${res.status})`,status:res.status,body};
    }
    push(true,'Login Auth',body?.user?.email||'Autenticazione riuscita');
    const s={
      access_token:body.access_token,
      refresh_token:body.refresh_token,
      expires_at:Math.floor(Date.now()/1000)+Number(body.expires_in||3600),
      user:body.user
    };
    setSession(s);
    setCloudEmail(email);
    return {ok:true,steps,session:s};
  }catch(e){
    push(false,'Login Auth',e.name==='AbortError'?'Timeout':e.message);
    return {ok:false,steps,error:e.message};
  }
}

export async function cloudLogin(email,password){
  const result=await runCloudDiagnostics(email,password);
  if(!result.ok)throw new Error(result.error||'Accesso Cloud non riuscito');
  return result.session;
}

export async function cloudLogout(){
  try{
    const s=await validSession();
    if(s){
      await rawAuth('/auth/v1/logout',{method:'POST',headers:{Authorization:`Bearer ${s.access_token}`}}).catch(()=>{});
    }
  }finally{
    clearSession();setCloudLinked(false);bootstrapped=false;
    if(syncTimer){clearTimeout(syncTimer);syncTimer=null}
  }
}

export async function cloudRow(){
  const res=await dbFetch(`/smarttracker_data?id=eq.${ROW_ID}&select=id,data,created_at,updated_at`);
  if(!res.ok)throw new Error(`Cloud DB HTTP ${res.status}: ${await res.text()}`);
  const rows=await res.json();
  return rows?.[0]||null;
}

export async function pushCloudStore(store,deviceName='Dispositivo'){
  const stamped=nowIso();
  const res=await dbFetch('/smarttracker_data?on_conflict=id',{
    method:'POST',
    headers:{Prefer:'resolution=merge-duplicates,return=representation'},
    body:JSON.stringify({id:ROW_ID,data:store,updated_at:stamped})
  });
  const body=await res.json().catch(()=>[]);
  if(!res.ok)throw new Error(body?.message||`Cloud DB HTTP ${res.status}`);
  const row=body?.[0]||{updated_at:stamped};
  setMeta({lastSyncAt:nowIso(),cloudUpdatedAt:row.updated_at||stamped,deviceName,contracts:(store.contracts||[]).length,lastAction:'upload',lastError:null});
  return row;
}

const updatedAtOf=c=>c?.updatedAt||c?.createdAt||c?.date||'';
function mergeContracts(local=[],remote=[]){
  const map=new Map();
  for(const c of local||[])map.set(c.id,c);
  for(const r of remote||[]){
    const l=map.get(r.id);
    if(!l||updatedAtOf(r)>updatedAtOf(l))map.set(r.id,r);
  }
  return [...map.values()];
}
function mergePeriodStates(local={},remote={},prefer='remote'){
  const out={...local};
  for(const [k,r] of Object.entries(remote||{})){
    const l=out[k],lt=l?.updatedAt||'',rt=r?.updatedAt||'';
    if(!l||rt>lt||(rt===lt&&prefer==='remote'))out[k]=r;
  }
  return out;
}
function mergeExcellentHistory(local=[],remote=[]){
  const map=new Map();
  for(const item of [...(local||[]),...(remote||[])]){
    const key=item.period||item.label||JSON.stringify(item),old=map.get(key);
    if(!old||Number(item.total||0)>Number(old.total||0))map.set(key,item);
  }
  return [...map.values()];
}
function newerOfficial(local={},remote={},prefer='remote'){
  const l=local?.updatedAt||'',r=remote?.updatedAt||'';
  return (r>l||(r===l&&prefer==='remote'))?{...local,...remote}:{...remote,...local};
}
export function mergeStores(local={},remote={},prefer='remote'){
  return {
    ...local,...remote,
    version:Math.max(Number(local.version||0),Number(remote.version||0)),
    contracts:mergeContracts(local.contracts||[],remote.contracts||[]),
    settings:prefer==='remote'?{...(local.settings||{}),...(remote.settings||{})}:{...(remote.settings||{}),...(local.settings||{})},
    officialCommunity:newerOfficial(local.officialCommunity||{},remote.officialCommunity||{},prefer),
    communityManualExtras:prefer==='remote'?{...(local.communityManualExtras||{}),...(remote.communityManualExtras||{})}:{...(remote.communityManualExtras||{}),...(local.communityManualExtras||{})},
    periodStates:mergePeriodStates(local.periodStates||{},remote.periodStates||{},prefer),
    excellentHistory:mergeExcellentHistory(local.excellentHistory||[],remote.excellentHistory||[])
  };
}
export async function uploadLocalFirst(store,deviceName='Dispositivo'){
  const row=await cloudRow();
  if(row)throw new Error('Il Cloud contiene già dati. Usa “Scarica e unisci”.');
  const saved=await pushCloudStore(store,deviceName);setCloudLinked(true);bootstrapped=true;return saved;
}
export async function downloadAndMerge(localStore,deviceName='Dispositivo'){
  const row=await cloudRow();
  if(!row?.data)throw new Error('Il Cloud è ancora vuoto.');
  const merged=mergeStores(localStore,row.data,'remote');
  await pushCloudStore(merged,deviceName);setCloudLinked(true);bootstrapped=true;
  return {store:merged,row};
}
export async function syncNow(localStore,deviceName='Dispositivo',prefer='local'){
  const row=await cloudRow();
  if(!row?.data){
    await pushCloudStore(localStore,deviceName);setCloudLinked(true);bootstrapped=true;
    return {store:localStore,created:true};
  }
  const merged=mergeStores(localStore,row.data,prefer);
  await pushCloudStore(merged,deviceName);setCloudLinked(true);bootstrapped=true;
  return {store:merged,created:false,row};
}
export async function cloudInfo(){
  const s=getSession();
  if(!s?.access_token)return {loggedIn:false,linked:isCloudLinked(),row:null,meta:getMeta()};
  try{
    await validSession();
    const row=await cloudRow();
    return {loggedIn:true,linked:isCloudLinked(),row,meta:getMeta(),user:getSession()?.user};
  }catch(e){
    return {loggedIn:true,linked:isCloudLinked(),row:null,meta:{...getMeta(),lastError:e.message},user:s.user,error:e.message};
  }
}
export async function bootstrapLinkedCloud(localStore,deviceName='Dispositivo'){
  if(!isCloudLinked()||!getSession()?.access_token){bootstrapped=false;return {store:localStore,changed:false}}
  try{
    const row=await cloudRow();
    if(!row?.data){await pushCloudStore(localStore,deviceName);bootstrapped=true;return {store:localStore,changed:false}}
    const merged=mergeStores(localStore,row.data,'remote');
    const changed=JSON.stringify(merged)!==JSON.stringify(localStore);
    if(changed)await pushCloudStore(merged,deviceName);
    else setMeta({...getMeta(),lastSyncAt:nowIso(),cloudUpdatedAt:row.updated_at,lastAction:'check',lastError:null});
    bootstrapped=true;return {store:merged,changed};
  }catch(e){
    bootstrapped=true;setMeta({...getMeta(),lastError:e.message,lastAction:'offline'});
    return {store:localStore,changed:false,error:e.message};
  }
}
export function queueCloudPush(getStore,deviceName='Dispositivo'){
  if(!bootstrapped||!isCloudLinked()||!getSession()?.access_token)return;
  if(syncTimer)clearTimeout(syncTimer);
  syncTimer=setTimeout(async()=>{
    try{await syncNow(getStore(),deviceName,'local')}
    catch(e){setMeta({...getMeta(),lastError:e.message,lastAction:'offline'})}
  },900);
}
