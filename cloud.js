const PROJECT_URL='https://exosbflachjzhzjtikah.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_9HWmkG6IFXL9l0F9L_l6tA_lOuecELJ';
export const CLOUD_EMAIL='';

const SESSION_KEY='smartTrackerCloudSessionV1';
const LINKED_KEY='smartTrackerCloudLinkedV1';
const META_KEY='smartTrackerCloudMetaV1';
const ROW_ID='primary';

let bootstrapped=false;
let syncTimer=null;

function nowIso(){return new Date().toISOString()}
function safeParse(raw,fallback=null){try{return JSON.parse(raw)}catch{return fallback}}
function session(){return safeParse(localStorage.getItem(SESSION_KEY),'')||null}
function setSession(s){localStorage.setItem(SESSION_KEY,JSON.stringify(s))}
function clearSession(){localStorage.removeItem(SESSION_KEY)}
function meta(){return safeParse(localStorage.getItem(META_KEY),'')||{}}
function setMeta(patch){localStorage.setItem(META_KEY,JSON.stringify({...meta(),...patch}))}

export function isCloudLinked(){return localStorage.getItem(LINKED_KEY)==='1'}
export function setCloudLinked(v){localStorage.setItem(LINKED_KEY,v?'1':'0')}
export function getCloudMeta(){return meta()}
export function getCloudSession(){return session()}
export function cloudIsBootstrapped(){return bootstrapped}

const SUPABASE_JS_URL='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
let supabasePromise=null;

async function supabaseClient(){
  if(!supabasePromise){
    supabasePromise=import(SUPABASE_JS_URL).then(({createClient})=>createClient(PROJECT_URL,PUBLISHABLE_KEY,{
      auth:{
        persistSession:true,
        autoRefreshToken:true,
        detectSessionInUrl:false,
        storageKey:'smarttracker-supabase-auth-v1'
      }
    }));
  }
  return supabasePromise;
}

function normalizeSdkSession(s){
  if(!s)return null;
  return {
    access_token:s.access_token,
    refresh_token:s.refresh_token,
    expires_at:Number(s.expires_at||0),
    user:s.user?{id:s.user.id,email:s.user.email}:null
  };
}

export async function cloudLogin(email,password){
  const cleanEmail=String(email||'').trim().toLowerCase();
  try{
    const supabase=await supabaseClient();
    const {data,error}=await supabase.auth.signInWithPassword({email:cleanEmail,password});
    if(error)throw error;
    if(!data?.session)throw new Error('Supabase non ha restituito una sessione di accesso.');
    setSession(normalizeSdkSession(data.session));
    return session();
  }catch(e){
    const detail=e?.message||String(e||'Errore sconosciuto');
    throw new Error(`Login Supabase: ${detail}`);
  }
}

async function refreshSession(){
  const s=session();
  if(!s?.refresh_token)throw new Error('Sessione Cloud non disponibile');
  try{
    const supabase=await supabaseClient();
    const {data:setData,error:setError}=await supabase.auth.setSession({
      access_token:s.access_token||'',
      refresh_token:s.refresh_token
    });
    if(setError)throw setError;
    let sdkSession=setData?.session;
    if(!sdkSession){
      const {data,error}=await supabase.auth.refreshSession({refresh_token:s.refresh_token});
      if(error)throw error;
      sdkSession=data?.session;
    }
    if(!sdkSession)throw new Error('Nessuna sessione restituita da Supabase.');
    setSession(normalizeSdkSession(sdkSession));
    return session();
  }catch(e){
    clearSession();
    throw new Error(`Sessione Cloud scaduta: ${e?.message||e}`);
  }
}

async function validSession(){
  let s=session();
  if(!s?.access_token)return null;
  if(Number(s.expires_at||0)-60<=Math.floor(Date.now()/1000)){
    s=await refreshSession();
  }
  return s;
}

async function dbFetch(path,options={}){
  const s=await validSession();
  if(!s)throw new Error('Accedi prima a SmartTracker Cloud');
  const headers={
    'apikey':PUBLISHABLE_KEY,
    'Authorization':`Bearer ${s.access_token}`,
    'Content-Type':'application/json',
    ...(options.headers||{})
  };
  const res=await fetch(PROJECT_URL+'/rest/v1'+path,{...options,headers});
  if(res.status===401){
    await refreshSession();
    return dbFetch(path,options);
  }
  return res;
}

export async function cloudLogout(){
  try{
    const s=await validSession();
    if(s){
      const supabase=await supabaseClient();
      await supabase.auth.signOut({scope:'local'}).catch(()=>{});
    }
  }finally{
    clearSession();
    setCloudLinked(false);
    bootstrapped=false;
    if(syncTimer){clearTimeout(syncTimer);syncTimer=null}
  }
}

export async function cloudRow(){
  const res=await dbFetch(`/smarttracker_data?id=eq.${ROW_ID}&select=id,data,created_at,updated_at`);
  if(!res.ok){
    const body=await res.text();
    throw new Error(`Cloud non leggibile (${res.status}) ${body}`.trim());
  }
  const rows=await res.json();
  return rows?.[0]||null;
}

export async function pushCloudStore(store,deviceName='Dispositivo'){
  const stamped=nowIso();
  const res=await dbFetch('/smarttracker_data?on_conflict=id',{
    method:'POST',
    headers:{Prefer:'resolution=merge-duplicates,return=representation'},
    body:JSON.stringify({
      id:ROW_ID,
      data:store,
      updated_at:stamped
    })
  });
  const body=await res.json().catch(()=>[]);
  if(!res.ok)throw new Error(body?.message||`Salvataggio Cloud non riuscito (${res.status})`);
  const row=body?.[0]||{updated_at:stamped};
  setMeta({
    lastSyncAt:nowIso(),
    cloudUpdatedAt:row.updated_at||stamped,
    deviceName,
    contracts:(store.contracts||[]).length,
    lastAction:'upload',
    lastError:null
  });
  return row;
}

function updatedAtOf(c){return c?.updatedAt||c?.createdAt||c?.date||''}
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
    const l=out[k];
    const lt=l?.updatedAt||'', rt=r?.updatedAt||'';
    if(!l||rt>lt||(rt===lt&&prefer==='remote'))out[k]=r;
  }
  return out;
}
function mergeExcellentHistory(local=[],remote=[]){
  const map=new Map();
  for(const item of [...(local||[]),...(remote||[])]){
    const key=item.period||item.label||JSON.stringify(item);
    const old=map.get(key);
    if(!old||Number(item.total||0)>Number(old.total||0))map.set(key,item);
  }
  return [...map.values()];
}
function newerOfficial(local={},remote={},prefer='remote'){
  const l=local?.updatedAt||'',r=remote?.updatedAt||'';
  if(r>l||(r===l&&prefer==='remote'))return {...local,...remote};
  return {...remote,...local};
}
function mergeManual(local={},remote={},prefer='remote'){
  return prefer==='remote'?{...local,...remote}:{...remote,...local};
}

export function mergeStores(local={},remote={},prefer='remote'){
  return {
    ...local,
    ...remote,
    version:Math.max(Number(local.version||0),Number(remote.version||0)),
    contracts:mergeContracts(local.contracts||[],remote.contracts||[]),
    settings:prefer==='remote'
      ?{...(local.settings||{}),...(remote.settings||{}),
        agents:[...new Set([...(local.settings?.agents||[]),...(remote.settings?.agents||[])])]}
      :{...(remote.settings||{}),...(local.settings||{}),
        agents:[...new Set([...(remote.settings?.agents||[]),...(local.settings?.agents||[])])]},
    officialCommunity:newerOfficial(local.officialCommunity||{},remote.officialCommunity||{},prefer),
    communityManualExtras:mergeManual(local.communityManualExtras||{},remote.communityManualExtras||{},prefer),
    periodStates:mergePeriodStates(local.periodStates||{},remote.periodStates||{},prefer),
    excellentHistory:mergeExcellentHistory(local.excellentHistory||[],remote.excellentHistory||[])
  };
}

export async function uploadLocalFirst(store,deviceName='Dispositivo'){
  const row=await cloudRow();
  if(row)throw new Error('Il Cloud contiene già dati. Usa “Scarica e unisci”.');
  const saved=await pushCloudStore(store,deviceName);
  setCloudLinked(true);
  bootstrapped=true;
  return saved;
}

export async function downloadAndMerge(localStore,deviceName='Dispositivo'){
  const row=await cloudRow();
  if(!row?.data)throw new Error('Il Cloud è ancora vuoto.');
  const merged=mergeStores(localStore,row.data,'remote');
  await pushCloudStore(merged,deviceName);
  setCloudLinked(true);
  bootstrapped=true;
  setMeta({...meta(),lastAction:'merge-download',lastError:null});
  return {store:merged,row};
}

export async function syncNow(localStore,deviceName='Dispositivo',prefer='local'){
  const row=await cloudRow();
  if(!row?.data){
    await pushCloudStore(localStore,deviceName);
    setCloudLinked(true);
    bootstrapped=true;
    return {store:localStore,created:true};
  }
  const merged=mergeStores(localStore,row.data,prefer);
  await pushCloudStore(merged,deviceName);
  setCloudLinked(true);
  bootstrapped=true;
  return {store:merged,created:false,row};
}

export async function cloudInfo(){
  const s=session();
  if(!s?.access_token)return {loggedIn:false,linked:isCloudLinked(),row:null,meta:meta()};
  try{
    await validSession();
    const row=await cloudRow();
    return {loggedIn:true,linked:isCloudLinked(),row,meta:meta(),user:session()?.user};
  }catch(e){
    return {loggedIn:true,linked:isCloudLinked(),row:null,meta:{...meta(),lastError:e.message},user:s.user,error:e.message};
  }
}

export async function bootstrapLinkedCloud(localStore,deviceName='Dispositivo'){
  if(!isCloudLinked()||!session()?.access_token){
    bootstrapped=false;
    return {store:localStore,changed:false};
  }
  try{
    const row=await cloudRow();
    if(!row?.data){
      await pushCloudStore(localStore,deviceName);
      bootstrapped=true;
      return {store:localStore,changed:false};
    }
    const merged=mergeStores(localStore,row.data,'remote');
    const changed=JSON.stringify(merged)!==JSON.stringify(localStore);
    if(changed)await pushCloudStore(merged,deviceName);
    else setMeta({...meta(),lastSyncAt:nowIso(),cloudUpdatedAt:row.updated_at,lastAction:'check',lastError:null});
    bootstrapped=true;
    return {store:merged,changed};
  }catch(e){
    bootstrapped=true; // local app must continue to work offline
    setMeta({...meta(),lastError:e.message,lastAction:'offline'});
    return {store:localStore,changed:false,error:e.message};
  }
}

export function queueCloudPush(getStore,deviceName='Dispositivo'){
  if(!bootstrapped||!isCloudLinked()||!session()?.access_token)return;
  if(syncTimer)clearTimeout(syncTimer);
  syncTimer=setTimeout(async()=>{
    try{
      const localStore=getStore();
      await syncNow(localStore,deviceName,'local');
    }catch(e){
      setMeta({...meta(),lastError:e.message,lastAction:'offline'});
    }
  },900);
}
