SALES TRACKER 2.0

CONTENUTO
- Home generale
- Inserimento PDF
- Prospect e MNP manuali
- Archivio unico
- Gara Agenzia
- Excellent
- Community
- Confronto V-Coin con portale
- Importazione backup v1 e v2
- Catalogo prodotti separato (421 voci)
- Listino Easy Rent aggiornato (297 combinazioni)

COME PUBBLICARE
1. Estrai lo ZIP.
2. Nel repository GitHub sales-tracker carica TUTTI i file.
3. Conferma la sostituzione dei file esistenti.
4. Commit directly to main.
5. Attendi 1-2 minuti.
6. Apri:
   https://barto1987.github.io/sales-tracker/?v=200
7. Dopo il test, elimina la vecchia icona Home e aggiungi nuovamente il sito alla schermata Home.

MIGRAZIONE
- Dalla Home usa Importa backup.
- Puoi importare direttamente sales-tracker-backup.json della versione 1.
- Il sistema raggruppa automaticamente le righe con stesso cliente/offerta/data in un unico contratto con più servizi.

NOTA
La sezione Provvigioni è predisposta a livello dati ma non ancora mostrata come dashboard definitiva.


FIX 2.0.1
- Mobile e SIM Dati senza Easy Rent: usa il Totale Netto Complessivo mensile.
- Non dipende dal nome dello sconto.
- Se ci sono più SIM, divide il totale netto per la quantità.
- Easy Rent resta separato.
- Test: AISI 18,00 €; TECNOCOLORI 2 15,00 €.
- Link test: https://barto1987.github.io/sales-tracker/?v=201


FIX 2.0.2 — CACHE PARSER
- Disattivata la cache del Service Worker durante lo sviluppo.
- Forzato parser.js?v=202.
- Cancellazione automatica delle vecchie cache.
- TECNOCOLORI 2 deve risultare 15,00 €.
- AISI deve risultare 18,00 €.

Dopo il commit aprire:
https://barto1987.github.io/sales-tracker/index.html?v=202
La prima apertura può richiedere un secondo ricaricamento perché deve rimuovere il vecchio Service Worker.


FIX 2.0.3 — FISSA E PAGINE CONTRATTUALI
- Riconoscimento diretto di Fissa Smart, Fissa Comfort e Fissa Extra.
- Per il fisso usa il Totale Netto Complessivo mensile della sezione commerciale.
- Il Catalogo non analizza più le pagine contrattuali/descriptive del PDF.
- Extra Supporto, Extra Qualità, Extra Servizi e altri esempi generici non vengono più proposti se non presenti nel riepilogo costi.
- Test VANESIA: una sola riga ADSL / Fissa Comfort, quantità 1, inflow 35,00 €.

Aprire dopo il commit:
https://barto1987.github.io/sales-tracker/index.html?v=203


FIX 2.0.4 — FAMIGLIA FISSA GENERICA
- Riconosce qualsiasi offerta che inizi con OFFERTA Fissa.
- Compatibile con Fissa Smart, Comfort, Extra, Premium e future denominazioni.
- Inflow = Totale Netto Complessivo mensile meno attivazione ricorrente netta rimasta a carico.
- Gli sconti attivazione compensano automaticamente il contributo.
- I costi una tantum non entrano nell'inflow.
- Le pagine descrittive successive restano escluse.

Esempi:
- Totale netto 35 €, attivazione 5 €, sconto attivazione -5 € => inflow 35 €.
- Totale netto 40 €, attivazione 5 €, nessuno sconto => inflow 35 €.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=204


FIX 2.0.5 — CONNETTIVITÀ, SEMPRE SERVITI E MNP
- OneNet P.IVA Premium e varianti P.IVA riconosciute come ADSL/connettività.
- Sempre Serviti generico a 0 € non crea righe e non richiede verifica.
- Solo Sempre Serviti Core, Critical e FWA 5G con importo > 0 entrano nel calcolo.
- Campo MNP visibile solo se l'offerta contiene SIM Voce o SIM Dati.
- Senza SIM, MNP viene salvato automaticamente come No.
- Test TERMOIDROELETTRICA: una sola riga ADSL / OneNet P.IVA Premium, inflow 50,00 €, semaforo verde.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=205


FIX 2.0.6 — ONENET P.IVA DIRETTO
- OneNet P.IVA, OneNet P.IVA Premium e varianti vengono lette direttamente dal riepilogo economico.
- Il nome prodotto viene preso dalla stessa riga del prezzo.
- Il parser non passa più dal Catalogo per OneNet P.IVA.
- Il Catalogo ignora prodotti con inflow 0 €.
- Il Catalogo ignora Sempre Serviti generico.
- Se la connettività è riconosciuta, il fallback non aggiunge altre righe.
- Semaforo verde per TERMOIDROELETTRICA.

Test atteso:
- 1 sola riga
- Servizio: ADSL
- Prodotto: OneNet P.IVA Premium
- Inflow: 50,00 €
- Affidabilità: verde
- Nessuna riga Sempre Serviti 0 €

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=206


FIX 2.0.7 — MULTI CONNETTIVITÀ
- Il parser legge le prime 3 pagine commerciali, non solo le prime 2.
- Riconosce offerte di connettività che proseguono nella pagina successiva.
- Le righe identiche vengono accorpate automaticamente.
- Quattro Fissa Smart vengono mostrate come una riga con quantità 4.
- L'inflow unitario esclude l'attivazione ricorrente.
- Test CENTRO CARITAS:
  Servizio ADSL
  Prodotto Fissa Smart
  Quantità 4
  Inflow unitario 30,00 €
  Totale inflow 120,00 €
  Semaforo verde

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=207


FIX 2.0.8 — LETTURA DIRETTA FISSA
- La famiglia Fissa viene letta direttamente dalla riga nome + prezzo.
- Evita la cattura di descrizioni troppo lunghe nel testo PDF.
- Riconosce ogni blocco OFFERTA Fissa separatamente.
- Accorpa automaticamente blocchi identici.
- Non usa il Catalogo quando trova la riga economica.

Test CENTRO CARITAS:
- Servizio ADSL
- Prodotto Fissa Smart
- Quantità 4
- Inflow unitario 30,00 €
- Totale 120,00 €
- Semaforo verde

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=208


FIX 2.0.9 — ATTIVAZIONE FISSA
- Se il parser parte dal Totale Netto Complessivo, sottrae l'attivazione ricorrente netta.
- Se il parser trova solo il canone linea, NON sottrae l'attivazione perché non è inclusa nel canone.
- Corretto nome duplicato tipo "Fissa Smart Fissa Smart".
- Test CENTRO CARITAS:
  Prodotto Fissa Smart
  Quantità 4
  Inflow unitario 30,00 €
  Totale inflow 120,00 €
  Semaforo verde

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=209


SALES TRACKER 2.1.0 — M2M, EASY DEAL E MNP AUTOMATICO

M2M / IoT
- Riconoscimento automatico dei piani M2M e IoT.
- Nuovo servizio SIM M2M.
- L'inflow viene letto dal Totale Netto Complessivo della sezione.
- Le SIM M2M NON contano nei target SIM Voce o SIM Dati.
- Le SIM M2M contribuiscono all'inflow complessivo Excellent e alla Community.
- MNP nascosto/inibito se l'offerta contiene soltanto M2M.

MNP
- Se nel blocco SIM compare la riga MNP, il campo viene precompilato su Sì.
- Se non compare, viene precompilato su No.
- Il campo resta modificabile manualmente.
- MNP compare solo in presenza di SIM Voce o SIM Dati.

EASY DEAL / ONENET ENTERPRISE FIBRA P2P
- Riconosce 100MB, 200MB, 500MB, 1GB, 2.5GB e 5GB.
- Inflow = Totale Netto Complessivo mensile + costo IP una tantum / 36.
- Il costo di attivazione generale della linea resta escluso.
- Interni Relax Top, Condizioni Dedicate e Sempre Serviti sono già inclusi nel totale netto.
- Easy Deal contribuisce all'inflow complessivo Excellent e alla Community.
- Easy Deal NON contribuisce a:
  * Prospect Excellent
  * Link Excellent
  * Solution Excellent
  * target SIM

TEST ATTESI
- TOPPAZZINI: Easy Deal 1.033,33 €.
- ROEFIX Easy Deal: 1.053,33 €.
- BORTOLIN: 2 SIM M2M separate dai target SIM; MNP automatico Sì sulle SIM Voce.
- AISI: MNP automatico Sì; inflow SIM 18,00 €.

Aprire dopo il commit:
https://barto1987.github.io/sales-tracker/index.html?v=210


FIX 2.1.1 — IMPORTI CON MIGLIAIA EASY DEAL
- Corretta lettura degli importi italiani con separatore delle migliaia.
- 1.030,00 € viene letto come 1030,00 €, non 30,00 €.
- 1.050,00 € viene letto come 1050,00 €, non 50,00 €.
- Inflow Easy Deal arrotondato a 2 decimali.

TEST ATTESI
- TOPPAZZINI: 1.033,33 €
- ROEFIX: 1.053,33 €

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=211


SALES TRACKER 2.2.0 — GESTIONE SQUADRA

NUOVI CAMPI CONTRATTO
- Agente di riferimento: Francesco, Jacopo, Luciano.
- Valido per Gara Agenzia: Sì/No.
- Default Francesco + Gara Agenzia Sì.
- Se scegli Jacopo o Luciano, Gara Agenzia passa automaticamente a No.
- Il valore resta modificabile manualmente.

CONTEGGI
- Gara Agenzia usa solo i contratti con Valido per Gara Agenzia = Sì.
- Excellent e Community continuano a conteggiare tutti i contratti validi.
- Archivio, inflow generale e storico mantengono tutto.

SEZIONE SQUADRA
- Totale squadra mensile.
- Inflow, contratti e prodotti per agente.
- SIM Voce, SIM Dati, M2M, Connettività, One Net, Easy Rent, Easy Deal.

ARCHIVIO
- Filtro per agente.
- Filtro inclusi/esclusi Gara Agenzia.
- Agente e stato Gara Agenzia visibili su ogni contratto.

DATI ESISTENTI
- I contratti precedenti senza agente vengono interpretati come Francesco.
- I contratti precedenti senza flag vengono considerati inclusi nella Gara Agenzia.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=220


FIX 2.2.1 — FAMIGLIA SIM DATI
- Riconoscimento generico delle offerte che iniziano con OFFERTA Dati.
- Compatibile con Dati Smart, Dati Comfort e future varianti.
- Quantità letta direttamente dalla riga economica.
- Inflow unitario calcolato dal Totale Netto Complessivo diviso quantità.
- Costi una tantum esclusi.
- Semaforo verde quando il riepilogo è completo.

TEST VECAR
- Servizio: SIM Dati
- Prodotto: Dati Smart
- Quantità: 3
- Inflow unitario: 15,00 €
- Inflow totale: 45,00 €
- MNP: No / nascosto se non presente
- Affidabilità: verde

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=221


FIX 2.2.2 — EASY RENT STANDALONE
- Riconosce offerte composte soltanto da Easy Rent.
- Legge modello device, Kasko e durata.
- Cerca il canone inflow nel listino ufficiale Easy Rent.
- Il canone cliente non viene usato come inflow.
- Ogni device Easy Rent vale 1 pezzo.

TEST ANGHIR SRL
- Servizio: Easy Rent
- Prodotto: iPhone 17 256 GB Kasko Comfort 36m
- Quantità: 1
- Inflow unitario: 16,32 €
- Fascia: GOLD
- Affidabilità: verde

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=222


FIX 2.2.3 — MULTI EASY RENT STANDALONE
- Riconosce più dispositivi Easy Rent nello stesso blocco.
- Crea una riga distinta per ogni modello/Kasko/durata.
- Ogni dispositivo mantiene il proprio inflow ufficiale e la propria fascia.
- Il testo "OFFERTA Easy Rent" non entra più nel nome prodotto.
- Prodotti identici vengono comunque accorpati dal consolidamento esistente.

TEST UNIDEA
1) iPhone 17 Pro 256GB Kasko Comfort 30m
   - quantità 1
   - inflow 16,93 €
   - fascia PLATINUM

2) iPadPro 2025 13 256GB Kasko Comfort 30m
   - quantità 1
   - inflow 20,04 €
   - fascia SILVER

Totale:
- 2 pezzi Easy Rent
- inflow complessivo 36,97 €
- affidabilità verde

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=223


FIX 2.2.4 — EASY RENT EXACT MATCH

- Priorità alla corrispondenza esatta nel listino Easy Rent.
- Evitata l'associazione dell'iPad alla variante con suffisso "V".
- Ogni dispositivo mantiene quantità e inflow unitario indipendenti.
- Contatore righe aggiornato immediatamente.
- Messaggio chiaro per PDF scansionati senza testo selezionabile.

TEST UNIDEA MULTI
- iPhone 17 Pro 256 Kasko Comfort 30m: 16,93 €
- iPadPro 2025 13 256GB Kasko Comfort 30m: 20,04 €
- Totale: 2 pezzi e 36,97 € di inflow
- Affidabilità: verde

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=224


FIX 2.2.5 — SEMAFORO EASY RENT

- Normalizzazione capacità: 256 equivale a 256GB.
- Normalizzazione nomi: Pro Max / Pro MAX e iPad Pro / iPadPro.
- Match verde quando modello, capacità, Kasko e durata identificano una voce univoca.
- Nessuna modifica ai valori inflow già corretti.

TEST ATTESI
- iPhone 17 Pro 256 Kasko Comfort 30m: 16,93 €, verde.
- iPadPro 2025 13 256GB Kasko Comfort 30m: 20,04 €, verde.
- Multi Easy Rent UNIDEA: 2 righe, totale 36,97 €, verde.
- iPhone 17 Pro MAX 256 Kasko Comfort 30m: 19,56 €, verde.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=225


SALES TRACKER 2.3.0 — DETTAGLIO OBIETTIVI EXCELLENT

- I sei riquadri Excellent sono cliccabili quando il valore è maggiore di zero.
- I riquadri a zero restano inattivi.
- Il dettaglio si apre sotto alla griglia Excellent.
- Per ogni voce mostra:
  * cliente
  * data
  * prodotto
  * servizio
  * quantità
  * inflow della pratica
  * agente di riferimento
  * stato Prospect
  * contributo attribuito allo specifico obiettivo
- Mobile e Noleggio operativo mostrano i pezzi.
- Gli altri quattro obiettivi mostrano l'inflow.
- È presente il totale attribuito e il pulsante di chiusura.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=230
