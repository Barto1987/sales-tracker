import {storageFetch,cloudUser} from './cloud.js?v=3141';
export const PDF_BUCKET='contract-pdfs';
const safe=v=>String(v||'').replace(/[^a-zA-Z0-9_-]/g,'_');
async function uid(){const u=await cloudUser();if(!u?.id)throw new Error('Accedi a SmartTracker Cloud');return u.id}
export async function pdfPath(id){return `${await uid()}/${safe(id)}/offerta.pdf`}
export async function uploadContractPdf(id,file){
 const path=await pdfPath(id),body=file instanceof Blob?file:new Blob([file],{type:'application/pdf'});
 const res=await storageFetch(`/object/${PDF_BUCKET}/${path}`,{method:'POST',headers:{'Content-Type':'application/pdf','x-upsert':'true'},body});
 if(!res.ok){const x=await res.json().catch(()=>({}));throw new Error(x.message||x.error||`Storage HTTP ${res.status}`)}
 return {path,size:body.size||0,uploadedAt:new Date().toISOString()}
}
export async function openContractPdfCloud(id){
 const path=await pdfPath(id);
 const res=await storageFetch(`/object/sign/${PDF_BUCKET}/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:300})});
 const x=await res.json().catch(()=>({}));if(!res.ok)throw new Error(x.message||x.error||`Storage HTTP ${res.status}`);
 const signed=x.signedURL||x.signedUrl;if(!signed)throw new Error('Link PDF non disponibile');
 const base='https://exosbflachizhzjtjkah.supabase.co/storage/v1';
 window.open(signed.startsWith('http')?signed:base+signed,'_blank','noopener')
}
