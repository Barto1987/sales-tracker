
const DB_NAME='salesTrackerPdfDB';
const STORE='pdfs';
const VERSION=1;

function db(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,VERSION);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
export async function savePdf(id,file){
  if(!id||!file)return false;
  const database=await db();
  return new Promise((resolve,reject)=>{
    const tx=database.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(file,id);
    tx.oncomplete=()=>resolve(true);
    tx.onerror=()=>reject(tx.error);
  });
}
export async function getPdf(id){
  const database=await db();
  return new Promise((resolve,reject)=>{
    const tx=database.transaction(STORE,'readonly');
    const req=tx.objectStore(STORE).get(id);
    req.onsuccess=()=>resolve(req.result||null);
    req.onerror=()=>reject(req.error);
  });
}
export async function deletePdf(id){
  const database=await db();
  return new Promise((resolve,reject)=>{
    const tx=database.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete=()=>resolve(true);
    tx.onerror=()=>reject(tx.error);
  });
}
export async function openPdf(id){
  const file=await getPdf(id);
  if(!file)return false;
  const url=URL.createObjectURL(file);
  window.open(url,'_blank','noopener');
  setTimeout(()=>URL.revokeObjectURL(url),120000);
  return true;
}


export async function listPdfs(){
  const database=await db();
  return new Promise((resolve,reject)=>{
    const tx=database.transaction(STORE,'readonly');
    const store=tx.objectStore(STORE);
    const req=store.openCursor();
    const rows=[];
    req.onsuccess=()=>{
      const cursor=req.result;
      if(!cursor){ resolve(rows); return; }
      const file=cursor.value;
      rows.push({
        id:String(cursor.key),
        file,
        name:file?.name||`${cursor.key}.pdf`,
        size:Number(file?.size||0),
        type:file?.type||'application/pdf'
      });
      cursor.continue();
    };
    req.onerror=()=>reject(req.error);
  });
}

export async function restorePdf(id,file){
  return savePdf(id,file);
}
