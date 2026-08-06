
export const REGULATIONS=[
  {
    id:'community-2026-07',
    type:'Community',
    title:'Community luglio 2026',
    periodLabel:'1–31 luglio 2026',
    start:'2026-07-01',
    end:'2026-07-31',
    status:'active',
    cadence:'Mensile',
    summary:'Ability, prodotti validi e boost V-Coin del mese.',
    sections:[
      {
        title:'Soglie di accesso — Ability',
        items:[
          'Inflow mensile minimo: 800 €.',
          'Starter: 250 € per i primi 3 mesi di accesso alla gara.',
          'Link mensile minimo: 350 €.',
          'Superamento dei corsi obbligatori con dicitura “COPPA”.'
        ]
      },
      {
        title:'Prodotti validi',
        items:[
          'SIM Voce attivate, abbonamento e ricaricabili.',
          'SIM Dati a canone con traffico incluso.',
          'Rete Fissa P.IVA: solo VIK, compreso OneBusiness.',
          'One Net Ufficio e One Net Azienda: link e interni.',
          'Easy Deal: esclusi interni addizionali su Easy Deal già attivi.',
          'Easy Rent: inflow pari al solo valore Kasko.',
          'Soluzioni Digitali Standard.',
          'Custom Solution, consuntivate a chiusura mese.'
        ]
      },
      {
        title:'V-Coin',
        items:[
          'Regola base: 1 € inflow = 1 V-Coin.',
          'SIM Voce MNP: 1 € = 3 V-Coin.',
          'Inflow Prospect: 1 € = 3 V-Coin.',
          'Easy Rent: 1 € = 2 V-Coin.',
          'MIIA: 1 € = 3 V-Coin.',
          '7Layers: 1 € = 2 V-Coin.',
          'Fast Cloud: 1 € = 2 V-Coin.'
        ]
      },
      {
        title:'Note operative',
        items:[
          'I preventivi TIT devono essere creati dall’agente che chiude la trattativa.',
          'Per clienti in CB, il cliente deve essere assegnato all’agente.',
          'Nell’app ogni contratto inserito è considerato già attivo / OK ACA.'
        ]
      }
    ]
  },
  {
    id:'excellent-2026-q3',
    type:'Excellent',
    title:'Excellent Q3 2026',
    periodLabel:'1 luglio–30 settembre 2026',
    start:'2026-07-01',
    end:'2026-09-30',
    status:'active',
    cadence:'Trimestrale',
    summary:'Premio base 1.000 € e variabile massimo 2.000 €.',
    targets:[
      {label:'Inflow totale',target:'3.000 €',prize:'400 €'},
      {label:'Mobile — SIM Voce + Dati',target:'60 SIM',prize:'250 €'},
      {label:'Inflow Prospect fisso + mobile, escluso ED',target:'550 €',prize:'400 €'},
      {label:'Link inflow',target:'1.000 €',prize:'400 €'},
      {label:'Solution inflow, incluse custom',target:'1.000 €',prize:'300 €'},
      {label:'Noleggio operativo',target:'12',prize:'250 €'}
    ],
    sections:[
      {
        title:'Premi',
        items:[
          'Premio base trimestrale: 1.000 €.',
          'Premio variabile massimo: 2.000 €.',
          'Un trimestre è vinto con almeno 1.000 € di premio variabile.'
        ]
      },
      {
        title:'Prospect',
        items:[
          'Valgono SIM Voce, SIM Dati e connettività ammessa.',
          'Easy Deal / OneNet Enterprise Fibra P2P è escluso.',
          'Le Solution Digitali non concorrono al target Prospect.'
        ]
      },
      {
        title:'Regola Link inflow',
        items:[
          'Non si contano i pezzi.',
          'Si conteggiano solo il canone del link al netto degli sconti e gli interni al netto degli sconti.',
          'Lo sconto grandi clienti sugli interni va sottratto.',
          'Sono esclusi Sempre Serviti Core, Critical, FWA 5G e pacchetti analoghi.',
          'Sono esclusi UC Phone / UC Phone Pro, device e attivazioni.',
          'I servizi esclusi dal Link possono comunque contribuire all’inflow totale Excellent.'
        ]
      },
      {
        title:'Altre regole',
        items:[
          'Le SIM M2M concorrono solo all’inflow totale, non al target Mobile.',
          'Easy Rent viene conteggiato come numero di noleggi.',
          'SDM, Movylo, Lookout e altre Solution concorrono al Solution inflow.'
        ]
      }
    ]
  },
  {
    id:'agency-2026-q3',
    type:'Gara Agenzia',
    title:'Gara Agenzia Q3 2026',
    periodLabel:'1 luglio–30 settembre 2026',
    start:'2026-07-01',
    end:'2026-09-30',
    status:'active',
    cadence:'Trimestrale',
    summary:'Target individuale trimestrale e premio Energia/Gas.',
    targets:[
      {label:'Inflow personale',target:'1.600 €',prize:'Accesso al premio'},
      {label:'SIM Voce/Dati + Easy Rent',target:'40',prize:'Con inflow Core ≥ 500 €'},
      {label:'ADSL New',target:'8',prize:'—'},
      {label:'OA/OU New, escluso ED',target:'8',prize:'—'},
      {label:'Fastweb Energia e/o Gas',target:'10 contratti',prize:'Ray-Ban Meta o zaino Campo Marzio'}
    ],
    sections:[
      {
        title:'Regole operative',
        items:[
          'Le pratiche escluse tramite “Valido per Gara Agenzia: No” non concorrono.',
          'Le pratiche condivise possono essere ripartite 50/50 solo per Squadra e Gara Agenzia.',
          'Excellent e Community restano attribuiti al 100% a Francesco.',
          'Le soglie sono valutate sul trimestre luglio–settembre 2026.'
        ]
      }
    ]
  }
];

export function regulationGroups(){
  return ['Excellent','Community','Gara Agenzia'].map(type=>({
    type,
    items:REGULATIONS.filter(r=>r.type===type).sort((a,b)=>b.start.localeCompare(a.start))
  }));
}

export const COMMUNITY_AUGUST_2026={
 month:'2026-08',label:'Agosto 2026',
 ability:{inflowMin:400,linkInflowMin:150,mandatoryCourses:false,starterRuleApplied:false},
 vcoin:{base:1,simVoiceMnp:3,prospect:3,easyRent:2,miia:3,sevenLayers:2,fastCloud:2},
 manualExtras:{flashRaces:true,courses:true}
};
