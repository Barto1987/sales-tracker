const money=v=>Number(v||0).toLocaleString('it-IT',{style:'currency',currency:'EUR'});

function monthAdd(month,n){
  const [y,m]=String(month||'').split('-').map(Number);
  if(!y||!m)return '';
  const d=new Date(y,m-1+n,1,12,0,0);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function categoryOf(r){
  const x=String(r.component||r.rule||'');
  if(/Gara Agenzia/i.test(x))return 'Gara Agenzia';
  if(/Gara individuale|Target individuale/i.test(x))return 'Target individuale';
  if(/Rush/i.test(x))return 'Rush';
  if(/Prospect/i.test(x))return 'Prospect';
  if(/Community/i.test(x))return 'Community';
  if(/Excellent/i.test(x))return 'Excellent';
  if(/Extra base/i.test(x))return 'Extra base differito';
  if(/Easy Rent/i.test(x))return 'Easy Rent';
  return 'Base';
}
function excellentPaymentMonth(period){
  const m=String(period||'').match(/^(\d{4})\s+Q([1-4])$/);
  if(!m)return '';
  const y=Number(m[1]),q=Number(m[2]);
  return monthAdd(`${y}-${String(q*3).padStart(2,'0')}`,3);
}
function currentQuarterPaymentMonth(start){
  const [y,m]=String(start||'').slice(0,7).split('-').map(Number);
  if(!y||!m)return '';
  const q=Math.ceil(m/3);
  return monthAdd(`${y}-${String(q*3).padStart(2,'0')}`,3);
}

export function communityPrizeForPosition(position){
  const p=Number(position||0);
  if(p===1)return 1700;
  if(p===2)return 1400;
  if(p===3)return 1200;
  if(p>=4&&p<=7)return 1000;
  if(p>=8&&p<=12)return 800;
  if(p>=13&&p<=18)return 600;
  if(p>=19&&p<=23)return 500;
  return 0;
}

export function buildReceivables(store,commissionData,excellentSnapshot=null,periodStart='2026-07-01'){
  const currentMonth=new Date().toISOString().slice(0,7);
  const rows=[];

  for(const r of commissionData?.rows||[]){
    if(r.status!=='calculated'||!r.paymentMonth||Number(r.estimated||0)<=0)continue;
    if(r.paymentMonth<currentMonth)continue; // mesi passati considerati già liquidati
    rows.push({...r,category:categoryOf(r)});
  }

  // Excellent storico: usa i dati già salvati nell'app, nessun importo manuale.
  for(const h of store.excellentHistory||[]){
    if(!h.won||Number(h.total||0)<=0)continue;
    const paymentMonth=excellentPaymentMonth(h.period);
    if(!paymentMonth||paymentMonth<currentMonth)continue;
    rows.push({
      contractId:`excellent-${h.period}`,client:`Excellent ${h.period}`,
      service:'Excellent',product:h.label||h.period,component:'Excellent trimestrale',
      category:'Excellent',productionMonth:String(h.period||''),
      paymentMonth,estimated:Number(h.total||0),status:'calculated',
      detail:`Premio già maturato · ${h.label||h.period}`
    });
  }

  // Excellent trimestre corrente: solo se i target sono già tutti raggiunti.
  if(excellentSnapshot?.won && Number(excellentSnapshot.totalPrize||0)>0){
    const paymentMonth=currentQuarterPaymentMonth(periodStart);
    const qMatch=String(periodStart).match(/^(\d{4})-(\d{2})/);
    const qKey=qMatch?`${qMatch[1]} Q${Math.ceil(Number(qMatch[2])/3)}`:'Trimestre corrente';
    const duplicate=rows.some(r=>r.category==='Excellent'&&String(r.client).includes(qKey));
    if(!duplicate && paymentMonth>=currentMonth){
      rows.push({
        contractId:`excellent-current-${qKey}`,client:`Excellent ${qKey}`,
        service:'Excellent',product:'Target trimestrali raggiunti',
        component:'Excellent trimestrale',category:'Excellent',
        paymentMonth,estimated:Number(excellentSnapshot.totalPrize||0),
        status:'calculated',detail:'Calcolato automaticamente dai target Excellent'
      });
    }
  }

  // Community: l'unico dato manuale è la posizione mensile.
  for(const [month,position] of Object.entries(store.settings?.communityRankings||{})){
    const amount=communityPrizeForPosition(position);
    if(amount<=0)continue;
    const paymentMonth=monthAdd(month,3);
    if(paymentMonth<currentMonth)continue;
    rows.push({
      contractId:`community-${month}`,client:`Community ${month}`,
      service:'Community',product:`Area Nord Est · posizione ${position}`,
      component:'Premio Community mensile',category:'Community',
      productionMonth:month,paymentMonth,estimated:amount,status:'calculated',
      detail:`Posizione ${position} · fascia premio Agente Excellent`
    });
  }

  const byMonth={},byCategory={};
  for(const r of rows){
    (byMonth[r.paymentMonth] ||= []).push(r);
    (byCategory[r.category] ||= []).push(r);
  }
  const total=rows.reduce((a,r)=>a+Number(r.estimated||0),0);
  return {rows,byMonth,byCategory,total,currentMonth};
}

export function receivablesHtml(data){
  const byMonth=Object.entries(data?.byMonth||{}).sort(([a],[b])=>a.localeCompare(b));
  const byCategory=Object.entries(data?.byCategory||{}).sort(([a],[b])=>a.localeCompare(b));
  return `
  <div class="card commission-receivables-card">
    <small class="receivable-eyebrow">DA RICEVERE</small>
    <h3>Per mese di pagamento</h3>
    ${byMonth.map(([month,items])=>{
      const total=items.reduce((a,r)=>a+Number(r.estimated||0),0);
      const cats=items.reduce((g,r)=>{(g[r.category] ||= []).push(r);return g},{});
      return `<details class="receivable-group">
        <summary><span>${month}</span><b>${money(total)}</b></summary>
        ${Object.entries(cats).map(([cat,rows])=>`<details class="receivable-subgroup">
          <summary><span>${cat}</span><b>${money(rows.reduce((a,r)=>a+Number(r.estimated||0),0))}</b></summary>
          ${rows.map(r=>`<div class="receivable-line"><div><strong>${r.client}</strong><small>${r.component||''}${r.product?' · '+r.product:''}</small></div><b>${money(r.estimated)}</b></div>`).join('')}
        </details>`).join('')}
      </details>`;
    }).join('')||'<p class="muted">Nessun pagamento certo pianificato.</p>'}
  </div>
  <div class="card commission-receivables-card">
    <small class="receivable-eyebrow">TIPOLOGIA</small>
    <h3>Boost, gare e premi</h3>
    ${byCategory.map(([cat,items])=>`<details class="receivable-group">
      <summary><span>${cat}</span><b>${money(items.reduce((a,r)=>a+Number(r.estimated||0),0))}</b></summary>
      ${items.sort((a,b)=>String(a.paymentMonth).localeCompare(String(b.paymentMonth))).map(r=>`<div class="receivable-line"><div><strong>${r.client}</strong><small>Pagamento ${r.paymentMonth}${r.detail?' · '+r.detail:''}</small></div><b>${money(r.estimated)}</b></div>`).join('')}
    </details>`).join('')}
  </div>`;
}
