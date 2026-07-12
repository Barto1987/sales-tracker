
let PDFJS=null, catalog=[], easyRent=[];
export async function initParser(){
  PDFJS=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
  PDFJS.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
  catalog=await fetch('./catalog.json?v=210').then(r=>r.json());
  easyRent=await fetch('./easy-rent-list.json?v=210').then(r=>r.json());
}
const num=s=>Number(String(s||'0').replace(/\./g,'').replace(',','.').replace(/[^\d.-]/g,''))||0;
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')}
function tokens(s){return String(s||'').toLowerCase().match(/[a-z]+|\d+/g)||[]}
function findER(desc){
 const nd=norm(desc); let exact=easyRent.find(x=>nd.includes(norm(x.plan))||norm(x.plan).includes(nd));
 if(exact)return {...exact,confidence:'green'};
 let ds=new Set(tokens(desc)),best=null,score=0;
 for(const x of easyRent){
  let ps=new Set(tokens(x.plan)),common=[...ps].filter(t=>ds.has(t)).length,sc=common/Math.max(ps.size,1);
  let k=['smart','comfort','extra'].some(v=>desc.toLowerCase().includes(v)&&x.plan.toLowerCase().includes(v));
  let d=['24','30','36'].some(v=>desc.toLowerCase().includes(v+'m')&&x.plan.toLowerCase().includes(v+'m'));
  if(k&&d&&sc>score){best=x;score=sc}
 }
 return best&&score>=.68?{...best,confidence:'yellow'}:null
}
async function extract(file){
 const data=await file.arrayBuffer(),pdf=await PDFJS.getDocument({data}).promise;let pages=[];
 for(let i=1;i<=Math.min(pdf.numPages,8);i++){const p=await pdf.getPage(i),c=await p.getTextContent();pages.push(c.items.map(x=>x.str).join(' ').replace(/\s+/g,' '))}
 return pages
}
function common(text){
 const offer=(text.match(/Numero Offerta\s*([A-Z0-9]{8,})/i)||text.match(/\b(20\d{2}[A-Z0-9]{7,})\b/)||[])[1]||'';
 const vat=(text.match(/Partita IVA\s*([0-9]{11})/i)||[])[1]||'';
 let client=(text.match(/per\s+([A-Z0-9À-Ü&'.\- ]{3,80}?)(?:Pagina|pagina|Numero Offerta|Riepilogo|$)/i)||[])[1]||'';
 return {offer,vat,client:client.trim().replace(/\s{2,}/g,' ')}
}
function add(rows,r){rows.push({id:'S-'+Math.random().toString(36).slice(2),qty:1,confidence:'green',category:'',product:r.service,...r})}
function consolidateRows(rows){
 const out=[],map=new Map();
 for(const r of rows){
  const key=[r.service,r.product,r.category,Number(r.inflowUnit||0).toFixed(6),r.confidence||'green'].join('|');
  if(map.has(key)){
    map.get(key).qty+=Number(r.qty||1);
  }else{
    const copy={...r,qty:Number(r.qty||1)};
    map.set(key,copy);out.push(copy);
  }
 }
 return out;
}
function line(section,re){const m=section.match(new RegExp(re.source+'\\s+(?:(\\d+)\\s*x\\s*)?([+-]?\\d+[,.]\\d{2})\\s*€','i'));return m?{q:Number(m[1]||1),v:num(m[2])}:null}
function totalNetMonthly(section){
 const m=section.match(/Totale\s+Netto\s+Complessivo[\s\S]{0,120}?\(Al mese IVA esclusa\)\s*([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+[,.]\d{2})\s*€/i)
   || section.match(/Totale\s+Netto\s+Complessivo[\s\S]{0,150}?([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+[,.]\d{2})\s*€/i)
   || section.match(/Totale\s+netto\s+attivazione\s*([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+[,.]\d{2})\s*€/i);
 return m?num(m[1]):null
}
function recurringActivationNet(section){
 let activation=0,discount=0;
 for(const m of section.matchAll(/(?:Contributo|Costo)\s+(?:di\s+)?Attivazione(?:\s+\d+\s*mesi)?\s+([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+[,.]\d{2})\s*€/gi)){
   activation+=num(m[1]);
 }
 for(const m of section.matchAll(/Sconto[^€\n]{0,100}Attivazione[^€\n]{0,40}\s+(-[0-9]+[,.]\d{2})\s*€/gi)){
   discount+=num(m[1]);
 }
 return Math.max(activation+discount,0);
}
function hasMnpLine(section){
 return /(?:^|\s)MNP\s+(?:(\d+)\s*x\s*)?0[,.]00\s*€/i.test(section);
}
function ipActivationMonthly(section){
 const m=section.match(/(?:8|16|24|32)\s+indirizzi\s+IP[\s\S]{0,120}?Costo\s+di\s+Attivazione\s*\(una\s+tantum\)\s+([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+[,.]\d{2})\s*€/i);
 return m?num(m[1])/36:0;
}
function catalogHints(text,rows){
 const known=new Set(rows.map(r=>norm(r.product)));
 for(const p of catalog){
  const kw=p.parser_keyword||p.name;
  const ref=Number(p.reference_inflow||0);
  const pname=String(p.name||'');
  if(!kw||kw.length<5)continue;
  if(ref<=0)continue;
  if(/^Sempre Serviti$/i.test(pname))continue;
  if(/OneNet\s+P\.IVA/i.test(pname))continue;
  if(text.toLowerCase().includes(String(kw).toLowerCase())&&!known.has(norm(p.name))){
    add(rows,{service:'Altro',product:p.name,category:p.category,qty:1,inflowUnit:ref,confidence:'yellow',calc:'Prodotto riconosciuto dal catalogo. Verificare quantità e inflow dal PDF.'})
    known.add(norm(p.name));
    if(rows.length>20)break
  }
 }
}
export async function parsePDF(file){
 const pages=await extract(file),text=pages.join(' '),summaryText=pages.slice(0,3).join(' '),meta=common(text),warnings=[];let rows=[],detectedMnp=false;
 const blocks=summaryText.split(/(?=OFFERTA\s+)/i).filter(b=>/^OFFERTA\s+/i.test(b));
 for(const b of blocks){
  if(/Mobile Comfort - Easy Rent/i.test(b)){
   const base=line(b,/Mobile Comfort - Easy Rent SoHo SME/i),promo=line(b,/Promo Mobile Comfort \+ Easy Rent/i);
   if(base){
    if(hasMnpLine(b))detectedMnp=true;
    add(rows,{service:'SIM Voce',product:'Mobile Comfort',category:'Mobile',qty:base.q,inflowUnit:base.v+(promo?promo.v:0),calc:'SIM = canone base meno promo'});
    const dm=b.match(/([A-Za-z0-9+ ._-]{4,110}Kasko\s+(?:Smart|Comfort|Extra)\s+(?:24|30|36)m)/i),desc=dm?dm[1].trim():'',er=findER(desc);
    add(rows,{service:'Easy Rent',product:desc||'Easy Rent',category:'Noleggio',qty:base.q,inflowUnit:er?er.inflow:0,confidence:er?er.confidence:'red',calc:er?`Listino ${er.plan} · ${er.tier}`:'Easy Rent non trovato: inserire inflow manualmente'});
   }
  }else if(/OFFERTA\s+Easy Rent/i.test(b)){
   const erPattern=/(?:OFFERTA\s+Easy Rent|Vincolo\s+\d+\s+mesi)\s+(.+?Kasko\s+(?:Smart|Comfort|Extra)\s+(?:24|30|36)m)\s+(?:(\d+)\s*x\s*)?([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+[,.]\d{2})\s*€/gi;
   let found=0;
   for(const m of b.matchAll(erPattern)){
     const desc=m[1].replace(/^OFFERTA\s+Easy Rent\s*/i,'').replace(/\s+/g,' ').trim();
     const qty=Number(m[2]||1);
     const er=findER(desc);
     add(rows,{
       service:'Easy Rent',
       product:desc||'Easy Rent',
       category:'Noleggio',
       qty,
       inflowUnit:er?Math.round(Number(er.inflow||0)*100)/100:0,
       confidence:er?er.confidence:'red',
       calc:er
         ?`Listino ufficiale Easy Rent: ${er.plan} · fascia ${er.tier}`
         :'Easy Rent non trovato nel listino: inserire inflow manualmente'
     });
     found++;
   }
   if(!found){
     add(rows,{
       service:'Easy Rent',
       product:'Easy Rent da verificare',
       category:'Noleggio',
       qty:1,
       inflowUnit:0,
       confidence:'red',
       calc:'Nessun device Easy Rent riconosciuto: inserire i dati manualmente'
     })
   }
  }else if(/OFFERTA\s+(?:M2M|IoT)\b/i.test(b)){
   const head=b.match(/OFFERTA\s+([^\n€]{3,90})/i);
   const price=b.match(/(?:^|\s)((?:M2M|IoT)[^€]{1,80}?)\s+(?:(\d+)\s*x\s*)?([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+[,.]\d{2})\s*€/i);
   const qty=Number(price?.[2]||1);
   const net=totalNetMonthly(b);
   const product=(price?.[1]||head?.[1]||'SIM M2M').replace(/\s+/g,' ').trim();
   const unit=net!=null?net/Math.max(qty,1):num(price?.[3]||0);
   if(unit||net!=null)add(rows,{service:'SIM M2M',product,category:'Mobile M2M / IoT',qty,inflowUnit:unit,confidence:'green',calc:net!=null?'Inflow dal Totale Netto Complessivo della sezione M2M; esclusa dai target SIM':'Canone M2M letto dalla riga economica; esclusa dai target SIM'})
  }else if(/Zero:\s*RED Business XS/i.test(b)){
   const x=line(b,/Zero:\s*RED Business XS/i);if(x){if(hasMnpLine(b))detectedMnp=true;add(rows,{service:'SIM Voce',product:'Zero: RED Business XS',category:'Mobile',qty:x.q,inflowUnit:x.v,calc:'Conteggiata come SIM Voce'})}
  }else if(/OFFERTA\s+Mobile\s+/i.test(b)){
   const head=b.match(/OFFERTA\s+(Mobile\s+[^\n€]{2,60})/i);
   const price=b.match(/\b(Mobile\s+[A-Za-z0-9._+-]+(?:\s+[A-Za-z0-9._+-]+){0,2})\s+(?:(\d+)\s*x\s*)?([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+[,.]\d{2})\s*€/i);
   const product=(price?.[1]||head?.[1]||'Mobile').replace(/\s+/g,' ').trim();
   const qty=Number(price?.[2]||1),net=totalNetMonthly(b);
   const unit=net!=null?net/Math.max(qty,1):num(price?.[3]||0);
   if(hasMnpLine(b))detectedMnp=true;
   if(unit||net!=null)add(rows,{service:'SIM Voce',product,category:'Mobile',qty,inflowUnit:unit,confidence:'green',calc:net!=null?'Inflow dalla voce Totale Netto Complessivo mensile della sezione':'Canone mobile letto dalla riga economica'})
  }else if(/OFFERTA\s+Dati\s+/i.test(b)){
   const head=b.match(/OFFERTA\s+(Dati\s+[^\n€]{2,60})/i);
   const price=b.match(/\b(Dati\s+[A-Za-z0-9._+-]+(?:\s+[A-Za-z0-9._+-]+){0,2})\s+(?:(\d+)\s*x\s*)?([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+[,.]\d{2})\s*€/i);
   const product=(price?.[1]||head?.[1]||'Dati').replace(/\s+/g,' ').trim();
   const qty=Number(price?.[2]||1),net=totalNetMonthly(b);
   const unit=net!=null?net/Math.max(qty,1):num(price?.[3]||0);
   if(hasMnpLine(b))detectedMnp=true;
   if(unit||net!=null)add(rows,{
     service:'SIM Dati',
     product,
     category:'Mobile',
     qty,
     inflowUnit:Math.round(unit*100)/100,
     confidence:'green',
     calc:net!=null
       ?'Inflow dalla voce Totale Netto Complessivo mensile della sezione; device e costi una tantum esclusi'
       :'Canone SIM Dati letto dalla riga economica'
   })
  }else if(/OFFERTA\s+Fissa\s+/i.test(b)){
   const header=b.match(/OFFERTA\s+(Fissa\s+[A-Za-z0-9._-]+)/i);
   const priceLine=b.match(/\b(Fissa\s+[A-Za-z0-9._-]+)\s+([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+[,.]\d{2})\s*€/i);
   const product=(priceLine?.[1]||header?.[1]||'Fissa').replace(/\s+/g,' ').trim();
   const base=priceLine?num(priceLine[2]):null;
   const net=totalNetMonthly(b);
   const activationNet=recurringActivationNet(b);
   if(base!=null||net!=null){
    const inflow=net!=null?Math.max(net-activationNet,0):base;
    add(rows,{
      service:'ADSL',
      product,
      category:'Connettività',
      qty:1,
      inflowUnit:inflow,
      confidence:'green',
      calc:net!=null
        ?`Totale netto del singolo blocco ${net.toFixed(2)} € − attivazione ricorrente netta ${activationNet.toFixed(2)} €`
        :`Canone linea ${base.toFixed(2)} €; attivazione non sottratta perché non inclusa nel canone`
    })
   }
  }else if(/OFFERTA\s+OneNet\s+Enterprise\s+Fibra\s+P2P/i.test(b)){
   const head=b.match(/OFFERTA\s+(OneNet\s+Enterprise\s+Fibra\s+P2P\s+(?:100MB|200MB|500MB|1GB|2[.,]5GB|5GB))/i);
   const product=(head?.[1]||'OneNet Enterprise Fibra P2P').replace(/\s+/g,' ').trim();
   const net=totalNetMonthly(b);
   const ipMonthly=ipActivationMonthly(b);
   if(net!=null){
     add(rows,{
       service:'Easy Deal',
       product,
       category:'Easy Deal / Connettività Custom',
       qty:1,
       inflowUnit:Math.round((net+ipMonthly)*100)/100,
       confidence:'green',
       calc:`Totale Netto Complessivo ${net.toFixed(2)} € + quota IP ${ipMonthly.toFixed(2)} € (una tantum ÷ 36). Attivazione generale esclusa`
     })
   }
  }else if(/OFFERTA\s+OneNet\s+P\.IVA/i.test(b)){
   const header=b.match(/OFFERTA\s+(OneNet\s+P\.IVA(?:\s+[A-Za-z0-9._-]+){0,4})/i);
   const priceLine=b.match(/(OneNet\s+P\.IVA(?:\s+[A-Za-z0-9._-]+){0,4})\s+([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+[,.]\d{2})\s*€/i);
   const product=(priceLine?.[1]||header?.[1]||'OneNet P.IVA').replace(/\s+/g,' ').trim();
   const base=priceLine?num(priceLine[2]):null;
   const net=totalNetMonthly(b);
   const activationNet=recurringActivationNet(b);
   if(base!=null||net!=null){
     const source=net!=null?net:base;
     const inflow=Math.max(source-activationNet,0);
     add(rows,{
       service:'ADSL',
       product,
       category:'Connettività',
       qty:1,
       inflowUnit:inflow,
       confidence:'green',
       calc:net!=null
         ?`Totale Netto Complessivo ${net.toFixed(2)} € − attivazione ricorrente netta ${activationNet.toFixed(2)} €`
         :`Canone piano ${base.toFixed(2)} € − attivazione ricorrente netta ${activationNet.toFixed(2)} €`
     })
   }
  }else if(/OFFERTA\s+OneNet|OFFERTA\s+One Net/i.test(b)){
   const isU=/Ufficio/i.test(b),service=isU?'One Net Ufficio':'One Net Azienda';
   const bm=b.match(/(?:OneNet|One Net)\s+(?:Azienda|Ufficio)[^€]{0,80}?\s+([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+[,.]\d{2})\s*€/i);if(!bm)continue;
   const base=num(bm[1]),pm=b.match(/(?:Promo|Sconto)[^€]{0,120}connettivit[^€]{0,40}\s+(-[0-9]+[,.]\d{2})\s*€/i);
   let promo=pm?num(pm[1]):0,interni=0,uc=0,sempre=0,discount=0;
   for(const m of b.matchAll(/Interno\s+(?:Red|Black)\s+(?:(\d+)\s*x\s*)?([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+[,.]\d{2})\s*€/gi))interni+=Number(m[1]||1)*num(m[2]);
   for(const m of b.matchAll(/UC Phone(?: Pro)?\s+(?:(\d+)\s*x\s*)?([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+[,.]\d{2})\s*€/gi))uc+=Number(m[1]||1)*num(m[2]);
   for(const m of b.matchAll(/Sempre Serviti\s+(Core|Critical|FWA\s*5G)\s+([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+[,.]\d{2})\s*€/gi)){
     const value=num(m[2]);
     if(value>0)sempre+=value;
   }
   const d=text.match(/Sconto grandi clienti\s+(-[0-9]+[,.]\d{2})\s*€/i);if(d)discount=num(d[1]);
   add(rows,{service,product:service,category:'Connettività',qty:1,inflowUnit:base+promo+interni+uc+sempre+discount,calc:'Canone − promo + interni − sconto grandi clienti + UC + Sempre Serviti; attivazione e device esclusi'})
  }
 }
 if(rows.length===0)catalogHints(summaryText,rows);
 rows=consolidateRows(rows);
 if(!rows.length)warnings.push('Nessun prodotto gestito riconosciuto.');
 const confidence=rows.length===0?'red':rows.some(r=>r.confidence!=='green')?'yellow':'green';
 return {meta,rows,warnings,confidence,filename:file.name,detectedMnp}
}
