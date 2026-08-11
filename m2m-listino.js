// Portafoglio M2M Local 2026 fornito dall'utente.
// Tutte le SIM M2M: 2 canoni secchi a 60 gg dall'attivazione.
// L'inflow concorre al Rush, ma le M2M restano escluse dai target SIM Voce/Dati.
export const M2M_LOCAL_2026 = [
  {name:'Mezzo EU',canone:0.96},
  {name:'Due EU',canone:2.04},
  {name:'Cinque EU',canone:3.36},
  {name:'Venti EU',canone:3.90},
  {name:'Cinquanta EU',canone:5.90},
  {name:'Duecento EU',canone:7.90},
  {name:'Cinquecento EU',canone:7.90},
  {name:'Mille EU',canone:9.90},
  {name:'Diecimila EU',canone:14.90},
  {name:'Free Call',canone:3.00},
  {name:'Free Call MAXI',canone:5.00}
];

const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();

export function recognizeM2MProduct(product=''){
  const p=norm(product).replace(/^m2m\s+/,'');
  return M2M_LOCAL_2026.find(x=>{
    const n=norm(x.name);
    return p===n || p.includes(n) || n.includes(p);
  })||null;
}
