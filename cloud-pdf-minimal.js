import {cloudStorageRequest,currentCloudUser} from './cloud.js?v=31517';
const BUCKET='contract-pdfs',safe=v=>String(v||'').replace(/[^a-zA-Z0-9_-]/g,'_');
async function pathFor(id){const u=await currentCloudUser();if(!u?.id)throw new Error('Sessione Cloud non disponibile');return `${u.id}/${safe(id)}/offerta.pdf`}
export async function uploadPdfCloud(id,file){
 const path=await pathFor(id);
 const res=await cloudStorageRequest(`/object/${BUCKET}/${path}`,{method:'POST',headers:{'Content-Type':'application/pdf','x-upsert':'true'},body:file});
 if(!res.ok){const x=await res.json().catch(()=>({}));throw new Error(x.message||x.error||`Upload HTTP ${res.status}`)}
 return {bucket:BUCKET,path,uploadedAt:new Date().toISOString(),size:Number(file.size||0)}
}
export async function openPdfCloud(id){
 const path=await pathFor(id);
 const res=await cloudStorageRequest(`/object/sign/${BUCKET}/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:300})});
 const x=await res.json().catch(()=>({}));if(!res.ok)throw new Error(x.message||x.error||`Apertura HTTP ${res.status}`);
 const signed=x.signedURL||x.signedUrl;if(!signed)throw new Error('URL firmato non ricevuto');
 const base='https://exosbflachizhzjtjkah.supabase.co/storage/v1';window.open(signed.startsWith('http')?signed:base+signed,'_blank','noopener')
}


export async function pdfCloudExists(id){
 const path=await pathFor(id);
 const res=await cloudStorageRequest(`/object/sign/${BUCKET}/${path}`,{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({expiresIn:60})
 });
 if(res.ok)return true;
 if(res.status===400||res.status===404)return false;
 return false;
}

export async function pdfCloudProbe(id){
  const path=await pathFor(id);
  const res=await cloudStorageRequest(`/object/sign/${BUCKET}/${path}`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({expiresIn:60})
  });
  const body=await res.json().catch(()=>({}));
  return {exists:res.ok,status:res.status,path,response:body};
}
