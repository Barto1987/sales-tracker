// SmartTracker — Registro storico regole provvigionali.
// Ogni versione è immutabile: quando cambia un trimestre si aggiunge una nuova voce.
// I contratti vengono associati alla versione in base alla data di produzione/attivazione.

export const COMMISSION_RULE_SETS = [
  {
    id:'2026-Q2',
    label:'Q2 2026 · Aprile–Giugno',
    start:'2026-04-01',
    end:'2026-06-30',
    status:'archived',
    source:'Rush Aprile 2026 / trimestre Apr–Giu',
    monthlyBoostAccess:250,
    targetIndividual:{
      totalInflow:null,
      corePieces:40,
      coreInflow:500,
      adsl:9,
      oneNet:10
    },
    families:{
      core:{base60:2,deferred90:1,individual:1,agency:1,prospect:2,rush:true},
      adsl:{base60:3,deferred90:0,individual:1,agency:1,prospect:2,rush:true},
      onet:{base60:2,deferred90:0,individual:1,agency:1,prospect:1,rush:true},
      easyDeal:{base60:1.5,deferred90:1,individual:0,agency:0,prospect:1,rush:false},
      miniEasyDeal:null,
      m2m:{base60:2,deferred90:0,individual:0,agency:0,prospect:0,rush:true},
      easyRent:{gettone:true,rush:true}
    },
    notes:[
      'Snapshot storico Q2: non modificare retroattivamente.',
      'ONA/ONU Prospect +1 nel materiale Aprile 2026.',
      'Easy Deal 1,5 + 1 base/extra + 1 Prospect; niente gara Agenzia/Rush.',
      'Target individuale Q2: 40 Core con almeno 500 € inflow, 9 ADSL, 10 OA/OU.'
    ]
  },
  {
    id:'2026-Q3',
    label:'Q3 2026 · Luglio–Settembre',
    start:'2026-07-01',
    end:'2026-09-30',
    status:'active',
    source:'Regole Q3 2026 confermate in SmartTracker',
    monthlyBoostAccess:250,
    targetIndividual:{
      totalInflow:1600,
      corePieces:40,
      coreInflow:500,
      adsl:8,
      oneNet:8
    },
    families:{
      core:{base60:2,deferred90:1,individual:1,agency:1,prospect:2,rush:true},
      adsl:{base60:3,deferred90:0,individual:1,agency:1,prospect:2,rush:true},
      onet:{base60:2,deferred90:0,individual:1,agency:1,prospect:2,rush:true},
      easyDeal:{base60:1.5,deferred90:.5,individual:0,agency:0,prospect:2,rush:false},
      miniEasyDeal:{base60:1.5,deferred90:1,individual:1,agency:0,prospect:2,rush:false},
      m2m:{base60:2,deferred90:0,individual:0,agency:0,prospect:0,rush:true},
      easyRent:{gettone:true,rush:true},m365:{base60:2,agency:.5}
    },
    notes:[
      'Soglia accesso boost: 250 € inflow per agente e per mese.',
      'CORE: 2 canoni a 60 gg + 1 canone a circa 90 gg.',
      'Prospect: pagamento a 90 gg.',
      'Gara individuale e Gara Agenzia: extra distinti, pagamento a 90 gg dalla chiusura trimestre.',
      'M2M: 2 canoni secchi a 60 gg, inflow valido Rush, escluse dai target SIM Voce/Dati.',
      'Easy Rent: gettone secco a 60 gg, listino versionato separatamente.'
    ]
  }
];

export function commissionRuleSetForDate(date){
  const d=String(date||'');
  return COMMISSION_RULE_SETS.find(r=>d>=r.start&&d<=r.end)||null;
}

export function activeCommissionRuleSet(){
  return COMMISSION_RULE_SETS.find(r=>r.status==='active')||COMMISSION_RULE_SETS.at(-1)||null;
}
