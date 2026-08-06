
import {listPdfs,restorePdf} from './pdf-store.js?v=380';

const AUTO_KEY='salesTrackerAutoBackupV1';
const AUTO_META_KEY='salesTrackerAutoBackupMetaV1';
const FULL_META_KEY='salesTrackerFullBackupMetaV1';

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

export function createAutoBackup(store){
  try{
    const payload={type:'sales-tracker-auto',version:1,createdAt:new Date().toISOString(),store};
    const raw=JSON.stringify(payload);
    localStorage.setItem(AUTO_KEY,raw);
    localStorage.setItem(AUTO_META_KEY,JSON.stringify({
      name:'SmartTrackerLocal',
      createdAt:payload.createdAt,
      contracts:(store.contracts||[]).length,
      bytes:new Blob([raw]).size
    }));
    return true;
  }catch(e){
    console.error('Auto backup failed',e);
    return false;
  }
}

export function getAutoBackupMeta(){
  try{return JSON.parse(localStorage.getItem(AUTO_META_KEY)||'null')}catch{return null}
}

export function getFullBackupMeta(){
  try{return JSON.parse(localStorage.getItem(FULL_META_KEY)||'null')}catch{return null}
}

export function downloadDatabaseBackup(store){
  const payload={type:'sales-tracker-database',version:1,createdAt:new Date().toISOString(),store};
  downloadBlob(
    new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),
    `SmartTrackerLocal_${stamp()}.json`
  );
  return payload.createdAt;
}

export async function getArchiveStats(store){
  const pdfs=await listPdfs();
  const contractIds=new Set((store.contracts||[]).map(c=>String(c.id)));
  const linked=pdfs.filter(p=>contractIds.has(String(p.id)));
  const missing=(store.contracts||[]).filter(c=>c.pdfStored&&!linked.some(p=>String(p.id)===String(c.id))).length;
  return {
    contracts:(store.contracts||[]).length,
    pdfs:linked.length,
    missing,
    bytes:linked.reduce((a,p)=>a+p.size,0),
    files:linked
  };
}

export async function downloadCompleteBackup(store){
  if(typeof JSZip==='undefined')throw new Error('JSZip non disponibile');
  const zip=new JSZip();
  const manifest={
    type:'sales-tracker-complete',
    version:1,
    createdAt:new Date().toISOString(),
    store
  };
  zip.file('database.json',JSON.stringify(manifest,null,2));
  const pdfs=await listPdfs();
  for(const p of pdfs){
    const safe=(p.name||`${p.id}.pdf`).replace(/[\\/:*?"<>|]+/g,'_');
    zip.file(`pdf/${p.id}__${safe}`,p.file);
  }
  const blob=await zip.generateAsync({
    type:'blob',
    compression:'DEFLATE',
    compressionOptions:{level:4}
  });
  downloadBlob(blob,`SmartTrackerBkpCompleto_${stamp()}.zip`);
  const meta={createdAt:manifest.createdAt,pdfs:pdfs.length,bytes:blob.size};
  localStorage.setItem(FULL_META_KEY,JSON.stringify(meta));
  return meta;
}

export async function restoreCompleteBackup(file){
  if(typeof JSZip==='undefined')throw new Error('JSZip non disponibile');
  const zip=await JSZip.loadAsync(file);
  const dbEntry=zip.file('database.json');
  if(!dbEntry)throw new Error('database.json non trovato');
  const payload=JSON.parse(await dbEntry.async('string'));
  if(!payload.store)throw new Error('Database non valido');

  const entries=Object.values(zip.files).filter(e=>!e.dir&&e.name.startsWith('pdf/'));
  let restored=0;
  for(const entry of entries){
    const base=entry.name.split('/').pop();
    const sep=base.indexOf('__');
    if(sep<1)continue;
    const id=base.slice(0,sep);
    const filename=base.slice(sep+2);
    const blob=await entry.async('blob');
    const pdf=new File([blob],filename,{type:'application/pdf'});
    await restorePdf(id,pdf);
    restored++;
  }
  return {store:payload.store,restored};
}

export function formatBytes(bytes){
  if(!bytes)return '0 MB';
  const units=['B','KB','MB','GB'];
  let n=bytes,i=0;
  while(n>=1024&&i<units.length-1){n/=1024;i++}
  return `${n.toFixed(i<2?0:1)} ${units[i]}`;
}

export function formatDate(iso){
  if(!iso)return 'Mai';
  return new Date(iso).toLocaleString('it-IT');
}
