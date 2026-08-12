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


FIX 2.3.1 — ONENET START

- Riconoscimento dedicato delle offerte OFFERTA OneNet Start.
- Classificazione come One Net Azienda.
- Se presente il Totale Netto Complessivo:
  inflow = Totale Netto Complessivo - contributo di attivazione ricorrente.
- Se il totale manca:
  inflow = canone base + promo + Sempre Serviti valorizzati.
- Sempre Serviti a 0 € non genera righe aggiuntive né richiesta manuale.
- Nessun fallback al catalogo.

TEST CLIRE SRL
- Servizio: One Net Azienda
- Prodotto: OneNet Start
- Quantità: 1
- Totale netto: 97,50 €
- Attivazione ricorrente: 10,00 €
- Inflow corretto: 87,50 €
- Affidabilità: verde

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=231


FIX 2.3.2 — ONENET START REGOLA DEFINITIVA

Regola unica:
- Inflow = Totale Netto Complessivo - 10,00 €

Il parser:
- non interpreta il canone base;
- non interpreta promo o sconti;
- non usa il catalogo;
- non crea righe Sempre Serviti a 0 €;
- assegna semaforo verde se trova il Totale Netto Complessivo;
- richiede inserimento manuale solo se il totale non è presente.

TEST CLIRE SRL
- Totale Netto Complessivo: 97,50 €
- Attivazione: 10,00 €
- Inflow corretto: 87,50 €
- Servizio: One Net Azienda
- Prodotto: OneNet Start
- Affidabilità: verde

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=232


FIX 2.3.3 — ONENET START MULTIRIGA
- Legge il Totale Netto Complessivo anche nei vecchi PDF con dicitura intermedia.
- Regola invariata: inflow = Totale Netto Complessivo - 10,00 €.

TEST NATURALMENTE DA LATTE FRIULANO
- Totale netto: 150,00 €
- Inflow: 140,00 €
- Semaforo verde

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=233


FIX 2.3.4 — SUDDIVISIONE BLOCCHI PDF

Problema corretto:
- Il parser trattava anche "Offerta applicata all'Indirizzo" come inizio
  di una nuova offerta.
- Il blocco OneNet Start veniva quindi troncato prima dei totali.

Nuova logica:
- Un nuovo blocco inizia soltanto con la dicitura ufficiale "OFFERTA" maiuscola.
- Il Totale Netto Complessivo rimane nella stessa sezione del prodotto.

TEST NATURALMENTE DA LATTE FRIULANO
- Totale Netto Complessivo: 150,00 €
- Inflow OneNet Start: 140,00 €
- Servizio: One Net Azienda
- Semaforo: verde

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=234


FIX 2.3.5 — TOTALE DI SEZIONE ONENET START

Problema:
- Nei preventivi con più prodotti il parser usava il totale generale
  dell'intera offerta invece del totale della sezione OneNet Start.

Nuova regola:
- Viene preso il primo "Totale netto complessivo" successivo a
  "OFFERTA OneNet Start".
- Il totale generale delle pagine successive viene ignorato.
- Inflow = totale sezione OneNet Start - 10,00 €.

TEST AREAINOX
- Mobile Smart: 15,00 €
- Totale sezione OneNet Start: 115,00 €
- Inflow OneNet Start: 105,00 €
- Totale generale offerta 130,00 € ignorato per il calcolo OneNet Start.
- Semaforo verde.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=235


SALES TRACKER 2.4.0 — MNP PER SINGOLA SIM

- Rimosso il campo MNP globale del contratto.
- MNP è ora salvato sulla singola riga SIM Voce.
- Il selettore compare solo sulle righe SIM Voce.
- Ogni blocco OFFERTA viene analizzato separatamente.
- Promo MNP o voce MNP nel blocco impostano automaticamente MNP = Sì.
- Blocchi senza MNP restano MNP = No.
- Il consolidamento non unisce più SIM MNP e SIM nuove con lo stesso piano.
- Community applica il boost MNP solo alla riga corretta.
- I vecchi contratti vengono migrati trasferendo l'eventuale MNP globale alle righe SIM Voce.

TEST Q S EUREGION SRL
1) Mobile Comfort + Easy Rent
   - SIM Voce: 16,00 €
   - MNP: No
   - Easy Rent iPhone separato

2) Mobile Comfort MNP + Easy Rent
   - SIM Voce: 13,00 €
   - MNP: Sì
   - Easy Rent iPad separato

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=240


SALES TRACKER 2.5.0 — DETTAGLI AGENZIA E COMMUNITY

GARA AGENZIA
- Tutti gli obiettivi con valore maggiore di zero sono cliccabili.
- Dettaglio disponibile per:
  * SIM + Dati + Easy Rent
  * Inflow Core
  * ADSL
  * One Net
  * Energia + Gas
- Mostra cliente, data, prodotto, quantità, inflow, agente, Prospect e MNP.
- I valori a zero restano inattivi.
- Sono incluse solo le pratiche valide per Gara Agenzia.

COMMUNITY
- Il riquadro V-Coin stimati è cliccabile e mostra la composizione completa.
- Sono cliccabili:
  * inflow Ability
  * link Ability
  * V-Coin base
  * boost MNP
  * boost Prospect
  * boost Easy Rent
  * altri boost
- Ogni riga mostra:
  * inflow base
  * moltiplicatore applicato
  * V-Coin aggiuntivi
  * V-Coin totali
  * tipo di boost
- I valori a zero restano inattivi.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=250


SALES TRACKER 3.0.0 — PERIODI, SQUADRA E PDF ORIGINALI

SQUADRA
- Visione mensile con selettore mese.
- Ogni voce per agente è espandibile.
- Storico mensile ricostruito dai contratti, senza cancellare dati.

AGENZIA ED EXCELLENT
- Cambio automatico al nuovo trimestre.
- Selettore e storico trimestrale.
- I contratti restano nell'archivio e ogni periodo ricalcola i propri valori.

DETTAGLIO PRATICHE
- Cliente, Partita IVA, codice cliente, numero offerta, data, agente,
  prodotto, quantità, inflow, Prospect, MNP e inclusione Gara Agenzia.

PDF ORIGINALI
- Il PDF caricato viene salvato localmente in IndexedDB.
- Pulsante "Apri PDF" in Archivio e nei dettagli.
- I PDF restano soltanto nel browser/dispositivo in cui sono stati caricati.
- Il backup JSON non contiene i file PDF binari.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=300


SALES TRACKER 3.0.1 — PROSPECT AUTOMATICO

Regola:
- Se il PDF contiene cliente, Partita IVA e numero offerta,
  ma non contiene Codice Cliente/Custcode, Prospect viene proposto su Sì.
- Se il Codice Cliente è presente, Prospect viene proposto su No.
- Il campo resta sempre modificabile manualmente prima del salvataggio.
- Sotto al selettore compare il motivo della proposta automatica.

TEST Q S EUREGION SRL
- Numero offerta presente
- Partita IVA presente
- Cliente presente
- Codice Cliente assente
- Prospect proposto automaticamente: Sì

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=301


SALES TRACKER 3.0.2 — STORICO OPERATIVO DA LUGLIO 2026

PERIODO DI PARTENZA
- Lo storico operativo di Gara Agenzia ed Excellent parte dal trimestre
  luglio-settembre 2026.
- I trimestri precedenti non compaiono nei selettori.
- Non è possibile aprire o modificare trimestri precedenti all'avvio dell'app.

EXCELLENT
- Restano visibili i tre premi storici già vinti:
  * ottobre-dicembre 2025: 2.250 €
  * gennaio-marzo 2026: 2.400 €
  * aprile-giugno 2026: 2.450 €
- Queste tre righe sono solo informative e non cliccabili.
- Dal trimestre luglio-settembre 2026 in avanti lo storico è calcolato
  dalle pratiche effettivamente caricate.

GARA AGENZIA
- Nessuno storico precedente a luglio-settembre 2026.
- Dal trimestre corrente in avanti ogni periodo resta consultabile.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=302


SALES TRACKER 3.1.0 — BACKUP CENTER

BACKUP AUTOMATICO
- Creato all'apertura dell'app.
- Aggiornato dopo ogni salvataggio o modifica.
- Include database, contratti, storico e impostazioni.
- Non include i PDF.
- È locale: cancellando i dati di Safari può essere eliminato.

BACKUP RAPIDO
- Download manuale JSON.
- Non include i PDF.
- Ideale prima di modifiche o pulizia del browser.

BACKUP COMPLETO
- Download ZIP con database.json e cartella pdf/.
- Include tutti i PDF salvati nell'app.
- Da fare prima di cancellare dati/cache Safari o cambiare dispositivo.

RIPRISTINO COMPLETO
- Ripristina database e PDF da un backup ZIP Sales Tracker.

CENTRO SALUTE
- Contratti presenti.
- PDF salvati.
- PDF mancanti.
- Spazio occupato dai PDF.
- Ultimo backup automatico.
- Ultimo backup completo.

IMPORTANTE
- Safari non consente un backup notturno quando la PWA è chiusa.
- Il backup automatico avviene all'apertura e durante l'uso.
- Prima di cancellare dati e cache di Safari, scaricare almeno un backup manuale.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=310


SALES TRACKER 3.3.0 — DASHBOARD CLIENTE
- Ricerca globale per cliente, P.IVA, codice cliente, offerta e prodotto.
- Scheda cliente con inflow, contratti, pezzi, V-Coin, Excellent e Gara Agenzia.
- Timeline delle pratiche con filtri per anno e servizio.
- Apertura PDF originale quando disponibile.
- Opportunità automatiche: One Net, Easy Rent, Energia/Gas.
- Tutte le funzioni Backup Center della 3.1.0 restano incluse.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=330


SALES TRACKER 3.3.1 — HOME CLIENTI E BACKUP

HOME
- Nuovo riquadro Clienti con conteggio schede.
- Accesso diretto alla Dashboard Clienti dalla prima pagina.
- Backup Center spostato interamente nella Home.
- Stato archivio, backup automatico, backup rapido, backup completo e ripristino ora sono tutti nella prima pagina.

NAVIGAZIONE
- Rimossi Clienti e Backup dalla barra inferiore.
- Barra inferiore nuovamente compatta con sole sezioni operative.
- Clienti resta raggiungibile dalla Home e dall'Archivio.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=331


SALES TRACKER 3.4.0 — CENTRO DATI E SINCRONIZZAZIONE

SYNC TRA DISPOSITIVI
- Esporta un file JSON leggero.
- Salvalo in iCloud Drive.
- Importalo su iPhone, iPad o iMac.
- Il sistema confronta i database prima di importare.
- Mostra pratiche nuove, aggiornate e già presenti.
- Unisce i contratti usando l'ID univoco.
- Non duplica le pratiche già presenti.
- Se una pratica importata è più recente, aggiorna quella locale.

PDF
- Il file Sync non include i PDF.
- Per trasferire anche i PDF usa Backup completo ZIP.
- I PDF già presenti sul dispositivo restano invariati.

CENTRO DATI
- Backup rapido JSON.
- Backup completo ZIP con PDF.
- Esporta Sync.
- Importa Sync.
- Ripristino completo.

FLUSSO CONSIGLIATO
1. Dopo aver lavorato su un dispositivo: Esporta Sync.
2. Salva il file nella cartella Sales Tracker di iCloud Drive.
3. Sugli altri dispositivi: Importa Sync.
4. Per trasferire anche i PDF, usa occasionalmente il Backup completo.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=340


SALES TRACKER 3.4.1 — HOME BACKUP PULITA

- Eliminato il vecchio riquadro duplicato “Backup e migrazione”.
- Rimane un unico Backup Center completo sotto la sezione Clienti.
- Un solo titolo “Backup Center”.
- Restano disponibili:
  * stato archivio;
  * backup automatico;
  * backup rapido JSON;
  * backup completo con PDF;
  * sincronizzazione dispositivi;
  * ripristino completo.
- Corrette anche le vecchie associazioni JavaScript ai pulsanti rimossi.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=341


SALES TRACKER 3.5.0 — DIGITAL SOLUTIONS & SPLIT 50/50

SOLUZIONI DIGITALI
- Smart Digital Marketing Start, Expert e Pro.
- Movylo Exclusive.
- Lookout for Business.
- Lookout Mobile.
- Lettura del Totale Netto Complessivo già al netto degli sconti.
- SDM + Movylo vengono uniti in una sola riga Solution.
- Lookout viene mantenuto separato come Solution Security.
- Compatibile con offerte che presentano uno o più blocchi “OFFERTA Soluzioni Digitali”.

TARGET
- Excellent: inflow totale al 100% e Solution Inflow al 100%.
- Community: inflow e V-Coin al 100% attribuiti a Francesco.
- Le Solution non entrano nel Prospect Excellent, Mobile o Link.
- Gara Agenzia e Squadra possono usare la ripartizione interna 50/50.

CONDIVISIONE
- Nessuna condivisione.
- 50% Francesco + 50% Jacopo.
- 50% Jacopo + 50% Luciano.
- Il contratto e il PDF restano unici.
- Excellent e Community restano sempre al 100% su Francesco.
- Squadra ripartisce inflow, pezzi e quota contratto.
- Gara Agenzia usa le quote interne senza modificare il totale complessivo.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=350


SALES TRACKER 3.5.1 — RUNTIME FIX

- Corretto errore JavaScript nel calcolo delle quantità allocate 50/50.
- Ripristinato caricamento completo della Home.
- Ripristinata navigazione dei menu inferiori.
- Restano attive tutte le novità della 3.5.0:
  * SDM Start, Expert e Pro;
  * Movylo Exclusive;
  * Lookout;
  * Totale Netto Complessivo;
  * condivisione Squadra/Gara Agenzia 50/50;
  * Excellent e Community sempre al 100% su Francesco.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=351


SALES TRACKER 3.5.2 — SOLUTION SPLIT FIX

- Aggiunta la voce “Solution” nel menu Servizio dell’anteprima.
- Le Soluzioni Digitali non vengono più trasformate automaticamente in SIM Voce.
- Il campo “Condivisione Squadra / Gara Agenzia” compare quando vengono riconosciuti:
  * Smart Digital Marketing Start, Expert o Pro;
  * Movylo Exclusive;
  * Lookout for Business o Lookout Mobile.
- Opzioni disponibili:
  * Nessuna condivisione;
  * 50% Francesco + 50% Jacopo;
  * 50% Jacopo + 50% Luciano.
- Excellent e Community restano sempre attribuiti a Francesco al 100%.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=352


SALES TRACKER 3.6.0 — STABLE RELEASE

BASE STABILE
- Ripartenza dalla 3.5.2 funzionante.
- Consolidamento senza catena di patch successive.
- Home, menu, archivio, backup e sincronizzazione mantenuti.

SOLUZIONI DIGITALI
- Smart Digital Marketing Start, Expert e Pro.
- Movylo Exclusive.
- Lookout for Business e Lookout Mobile.
- Servizio classificato correttamente come Solution.
- Inflow letto dal Totale Netto Complessivo.
- SDM + Movylo uniti in una sola riga.
- Lookout separato quando presente in blocco distinto.

CONDIVISIONE 50/50
- Campo sempre visibile quando è presente una Solution digitale.
- Nessuna condivisione.
- 50% Francesco + 50% Jacopo.
- 50% Jacopo + 50% Luciano.
- Il contratto e il PDF restano unici.
- Excellent e Community sempre 100% Francesco.
- Squadra e Gara Agenzia ripartite secondo le quote selezionate.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=360


SALES TRACKER 3.6.1 — COMMUNITY & TEAM DIGITAL

COMMUNITY
- Nelle due righe Ability vengono mostrati solo i valori inflow in euro.
- Rimossi i valori numerici duplicati dopo l'importo.
- Restano cliccabili per vedere la composizione.

SQUADRA
- Aggiunta la voce Digitali per Francesco, Jacopo e Luciano.
- Digitali comprende:
  * Smart Digital Marketing Start, Expert e Pro;
  * Movylo Exclusive;
  * Lookout for Business e Lookout Mobile;
  * altre righe classificate come Solution / Soluzioni Digitali / Solution Security.
- Il valore Digitali è espresso in euro di inflow.
- Il dettaglio mostra i singoli contratti e prodotti.
- Le quote 50/50 restano applicate solo a Squadra e Gara Agenzia.
- Excellent e Community restano sempre 100% Francesco.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=361


SALES TRACKER 3.6.2 — COMMUNITY & TEAM FIX

COMMUNITY
- Nelle righe Ability ora compare solo il valore inflow in euro.
- Eliminato il valore numerico duplicato dopo il pallino.
- Le righe restano cliccabili.

SQUADRA
- Aggiunta la voce Digitali in fondo a ogni agente.
- Digitali mostra l'inflow attribuito all'agente.
- Comprende SDM, Movylo, Lookout e tutte le righe Solution.
- La voce è cliccabile e apre il dettaglio.
- Le quote 50/50 restano applicate a Squadra e Gara Agenzia.
- Excellent e Community restano al 100% su Francesco.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=362


SALES TRACKER 3.6.3 — BACKUP SEMAFORO

BACKUP COMPLETO
- Aggiunto semaforo accanto al titolo.
- Verde: backup completo negli ultimi 3 giorni.
- Giallo: backup completo tra 4 e 7 giorni fa.
- Rosso: backup completo più vecchio di 7 giorni o mai eseguito.
- Visualizzata anche la data/ora dell'ultimo backup completo.
- Lo stato si aggiorna subito dopo la creazione del backup completo.

IMPORTANTE
- Il semaforo riguarda il backup completo con PDF.
- Il backup automatico database resta separato.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=363


SALES TRACKER 3.6.4 — FULL BACKUP FIX

- Inclusa JSZip direttamente nell'app.
- Il backup completo non dipende più da una libreria esterna/CDN.
- Corretto l'errore “JSZip non disponibile”.
- Backup completo ZIP con:
  * database.json;
  * tutti i PDF presenti nell'app.
- Ripristino completo ZIP mantenuto.
- Il semaforo si aggiorna dopo il download riuscito.
- In caso di errore viene mostrato anche il motivo tecnico.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=364


SALES TRACKER 3.7.0 — CENTRO REGOLAMENTI

CENTRO REGOLAMENTI
- Nuova sezione accessibile dalla Home.
- Storico iniziale:
  * Community luglio 2026;
  * Excellent Q3 2026;
  * Gara Agenzia Q3 2026.
- Schede complete con periodo, target, premi, boost, prodotti ed eccezioni.
- Struttura predisposta per aggiungere i nuovi mesi/trimestri senza sovrascrivere lo storico.

EXCELLENT — LINK INFLOW
- Non si contano i pezzi.
- Si conteggiano solo:
  * canone link al netto degli sconti;
  * interni al netto degli sconti;
  * sconto grandi clienti sottratto.
- Esclusi dal target Link:
  * Sempre Serviti Core, Critical, FWA 5G e analoghi;
  * UC Phone / UC Phone Pro;
  * device;
  * attivazioni.
- Questi servizi possono comunque concorrere all'inflow totale Excellent.
- I nuovi contratti One Net salvano separatamente inflow totale e inflow valido per il target Link.

COMMUNITY
- Easy Rent = valore Kasko.
- Ability luglio: Inflow 800 €, Link 350 €, corsi COPPA.
- Boost luglio inclusi nella scheda regolamento.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=370


SALES TRACKER 3.7.1 — COMMUNITY EXTRA MANUALI
- Gare Flash: V-Coin e nota manuale per mese.
- Corsi obbligatori: V-Coin e nota manuale per mese.
- Spunte di verifica sul portale.
- Totale Community = automatici + extra manuali.
- Confronto portale aggiornato sul totale completo.
- Storico separato per ogni mese Community.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=371


SALES TRACKER 3.7.2 — BACKUP NAMING

- SmartTrackerBkpCompleto_YYYY-MM-DD_HH-mm.zip
- SmartTrackerSync_YYYY-MM-DD_HH-mm.json
- SmartTrackerLocal_YYYY-MM-DD_HH-mm.json
- Il backup automatico interno è mostrato come SmartTrackerLocal con data/ora, contratti e dimensione.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=372


SALES TRACKER 3.7.3 — SAFFRON THEME

- Nuovo colore principale ispirato a Pantone 14-1064 TCX Saffron.
- Equivalente web utilizzato: #FFA500.
- Aggiornati:
  * intestazione;
  * card hero;
  * gradienti;
  * pulsanti principali;
  * barre di avanzamento;
  * menu attivi;
  * focus dei campi;
  * colore tema Safari/PWA.
- I colori funzionali dei semafori restano invariati.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=373


SALES TRACKER 3.8.0 — GESTIONE PERIODI
- Selettore mese globale nella Home.
- Community e Squadra seguono il mese selezionato.
- Excellent e Gara Agenzia seguono automaticamente il trimestre.
- Mesi precedenti consultabili e modificabili.
- Stati: In lavorazione, Verificato, Chiuso.
- Un mese chiuso può essere riaperto.
- Nessun azzeramento distruttivo dello storico.

Aprire:
https://barto1987.github.io/sales-tracker/index.html?v=380

SALES TRACKER 3.8.1 — COMMUNITY AGOSTO 2026
- Ability inflow: 400 €
- Ability Link: 150 €
- Nessun corso obbligatorio
- Profilo personale: regola Starter non applicata
- Boost invariati: MNP x3, Prospect x3, Easy Rent x2, MIIA x3, 7Layers x2, Fast Cloud x2
- Extra manuali Gare Flash e Corsi mantenuti
- Luglio storico invariato: 800 € / 350 €
Deploy tramite GitHub Actions > Deploy SmartTracker.

SALES TRACKER 3.8.2 — FIX COMMUNITY AGOSTO
- Community agosto inserita nel Centro Regolamenti.
- Scheda Community usa le soglie del mese selezionato.
- Agosto: Ability 400 €, Link 150 €, nessun corso obbligatorio.
- Luglio resta 800 €, Link 350 €, corsi obbligatori.
- Calcolo Ability usa ora le soglie mensili reali.

SALES TRACKER 3.8.3 — HOLIDAY STABLE

- Tema rosso ripristinato.
- Community Easy Rent: riconoscimento robusto tramite servizio/prodotto/Kasko.
- Agosto 2026: Easy Rent = 2 V-Coin per ogni € di inflow Kasko.
- Esempio Tavano: inflow Kasko 268,50 € => 537 V-Coin.
- Microsoft 365 Business Basic/Standard/Premium riconosciuto come Soluzione Digitale.
- M365 singolo: inflow letto dal Totale Netto Complessivo della sezione.
- CORAM HOLDING M365 Business Standard: 127,40 € di inflow digitale.
- Centro Regolamenti: un mese Community chiuso viene visualizzato come Chiuso.
- Luglio resta consultabile nello storico.

SALES TRACKER 3.8.4 — COMMUNITY FIX

- Community agosto 2026: Easy Rent/Kasko applica 2 V-Coin per ogni euro di inflow.
- Riconoscimento Easy Rent centralizzato anche per contratti già presenti.
- Tavano: 268,50 € inflow Kasko = 537 V-Coin totali (268,50 base + 268,50 boost).
- Dashboard Community: voce esplicita “Boost Easy Rent ×2” e totale V-Coin Easy Rent.
- Centro Regolamenti: stato “Chiuso” con pallino grigio.
- Restano invariati tema rosso e riconoscimento Microsoft 365 introdotti nella 3.8.3.

SMARTTRACKER 3.9.0 — REDESIGN

RESTYLING GRAFICO
- Nuova identità SmartTracker e nuova icona app bersaglio/freccia.
- Header moderno con branding SmartTracker.
- Home ridisegnata con riepilogo inflow, V-Coin, Excellent e clienti.
- Card obiettivi più leggibili con stato e barre di avanzamento.
- Attività recenti in Home.
- Navigazione inferiore ridisegnata in stile app.
- Card, moduli, tabelle, regolamenti e backup uniformati.
- Tema rosso mantenuto e reso più moderno.

SICUREZZA
- Nessuna modifica intenzionale alle logiche di calcolo, parser, backup o dati.
- Mantiene le correzioni funzionali della 3.8.4, incluso Easy Rent Community x2.

SMARTTRACKER 3.10.0 — CLOUD SYNC

CLOUD
- Collegamento al progetto Supabase SmartTracker.
- Login personale con email preimpostata e password NON salvata nel codice.
- Publishable key frontend; nessuna service_role/secret key inclusa.
- Primo dispositivo: pulsante “Carica i dati locali nel Cloud”.
- Altri dispositivi: “Scarica e unisci dal Cloud”.
- Dopo la prima migrazione, ogni salvataggio locale viene accodato al Cloud.
- Controllo periodico ogni 45 secondi per ricevere aggiornamenti dagli altri dispositivi.
- Se internet non è disponibile, SmartTracker continua a lavorare localmente.
- I contratti vengono uniti per ID usando updatedAt per scegliere la versione più recente.
- Stato dei periodi e storico Excellent vengono uniti senza eliminare lo storico.

PDF
- I PDF restano locali in questa prima release Cloud.
- I riferimenti ai PDF sono sincronizzati, ma il documento si apre solo sul dispositivo dove è conservato.
- SmartTrackerBkpCompleto resta il backup indipendente consigliato.

MIGRAZIONE CONSIGLIATA
1. Fare SmartTrackerBkpCompleto sul dispositivo con i dati completi.
2. Installare/pubblicare 3.10.0.
3. Sul dispositivo master: login Cloud > Carica i dati locali nel Cloud.
4. Sugli altri dispositivi: login Cloud > Scarica e unisci dal Cloud.


SMARTTRACKER 3.10.3 — CLOUD AUTH FIX
- Email Cloud normalizzata in minuscolo.
- Login Auth reso coerente con l’utente Supabase configurato.
- Messaggio diagnostico esplicito se viene usata la password del pannello Supabase invece della password dell’utente Auth.
- Nessuna modifica ai dati, alle regole di calcolo o alle policy RLS.

SMARTTRACKER 3.10.4 — CLOUD DIAGNOSTIC FIX

- Nessuna dipendenza CDN per il login.
- Test Cloud visibile direttamente nell'app:
  1. raggiungibilità Supabase;
  2. validità publishable key;
  3. risposta reale Supabase Auth.
- L'email Cloud resta modificabile e viene ricordata localmente.
- Nessun upload automatico finché il login non riesce.
- Database, parser, calcoli e dati locali invariati.

SMARTTRACKER 3.10.5 — CLOUD BUTTON FIX
- Corretto errore runtime CLOUD_EMAIL che impediva l'inizializzazione della sezione Cloud.
- Il pulsante "Accedi a SmartTracker Cloud" ora riceve correttamente il gestore click.
- Diagnostica Cloud 3.10.4 mantenuta integralmente.

SMARTTRACKER 3.10.6 — CLOUD ERROR DETAILS
- Nessuna modifica ai dati o alla sincronizzazione.
- Mostra il messaggio reale dell'errore di connessione/login Supabase.
- Aggiunta cattura errori JavaScript e Promise per evitare errori silenziosi su iOS/PWA.

SMARTTRACKER 3.10.8 — CONNECTION FIX
- Diagnostica Cloud aggiornata con endpoint browser-safe.
- Header apikey + Authorization Bearer publishable key su gateway Supabase.
- Test esplicito: REST raggiungibile -> Auth raggiungibile -> login.
- Nessuna modifica a dati, parser, calcoli o sincronizzazione.


PATCH 3.10.8
- Corretto Project URL Supabase con il valore verificato dal dashboard.
- Publishable key verificata.
- Cache-busting aggiornato a 3108.

SMARTTRACKER 3.11.3 — STABLE AUTOSYNC

Questa release riparte direttamente dalla 3.10.8, l'ultima versione Cloud verificata funzionante.

- Login Cloud lasciato invariato rispetto alla 3.10.8.
- Push automatico già presente in 3.10.8: ogni persistStore invia al Cloud dopo ~0,9 s.
- Pull Cloud ogni 15 secondi mentre l'app è aperta.
- Pull immediato quando l'app torna in primo piano.
- Eliminazioni protette da tombstone, per evitare che un contratto cancellato ricompaia da un dispositivo vecchio.
- Backup rapido e SmartTrackerSync nascosti dall'interfaccia ma mantenuti tecnicamente nel DOM per non introdurre regressioni.
- Backup completo ZIP e ripristino completo restano disponibili.
- Pulsante manuale rinominato "Forza sincronizzazione".

SMARTTRACKER 3.11.4 — LOGO UPDATE
- Nessuna modifica funzionale rispetto alla 3.11.3.
- Nuova icona rossa piena con bersaglio e freccia.
- Aggiornate icone PWA 192x192, 512x512 e Apple Touch Icon.

SMARTTRACKER 3.12.0 — PROVVIGIONI

NOVITÀ
- Nuova sezione "Provvigioni" nella barra inferiore.
- Prima stima Q3 2026 con base calcolabile ed extra già determinabili.
- Core / ADSL / One Net / Easy Deal gestiti con le regole già raccolte.
- Digital, Energy/Gas e bonus non ancora certi restano visibili come "da completare", senza inventare importi.
- Fix definitivo stato mese: uno stato "working" creato automaticamente su un nuovo device non può più riaprire un mese verificato/chiuso nel Cloud.
- Le azioni manuali In lavorazione / Verificato / Chiudi / Riapri vengono marcate come manuali e sincronizzate.
- Fix barra inferiore: la voce selezionata è ora bianca con icona/testo rossi, quindi sempre leggibile.
- Nessuna modifica a Supabase Storage/PDF Cloud in questa release.

SMARTTRACKER 3.12.1 — MENU IPHONE

- Rimossa la voce "Nuovo" dalla barra inferiore.
- Aggiunto pulsante + bianco/rosso a destra del titolo SmartTracker.
- Il + apre direttamente la schermata "Nuovo contratto".
- Barra inferiore fissata a 6 sezioni: Home, Agenzia, Excellent, Community, Squadra, Provvigioni.
- Eliminato lo scorrimento orizzontale del menu su iPhone.
- Nessuna modifica ai dati, al Cloud AutoSync o al motore Provvigioni della 3.12.0.

SMARTTRACKER 3.12.3 — EASY RENT LISTINO
- Integrato lo sheet PROVVIGIONI del listino Easy Rent del 20/04/2026.
- 297 profili censiti con fascia e gettone.
- Easy Rent valorizzato automaticamente come gettone secco a 60 giorni.
- Quantità multiple moltiplicano automaticamente il gettone.
- Easy Rent escluso dalla normale remunerazione CORE a canoni.
- Match tollerante a spazi, maiuscole, 'GB', suffisso V ed EE.
- Se il profilo non è nel listino, nessun importo viene inventato.
- I futuri listini saranno aggiunti come nuove versioni senza alterare lo storico.

SMARTTRACKER 3.12.4 — PROVVIGIONI / EASY RENT FIX
- SIM Voce/Dati non vengono più scambiate per Easy Rent solo perché il nome commerciale contiene "Easy Rent".
- CORE: 2 canoni base a 60 gg + 1 canone extra circa a 90 gg.
- ONU/ONA: 2 canoni base a 60 gg.
- ADSL: 3 canoni base a 60 gg.
- Easy Deal/Mini Easy Deal: separata la quota base dalla quota dopo il "+".
- Prospect resta extra separato a 90 gg.
- Rush non viene più mostrato come +0,3 canone sul singolo contratto: l'inflow valido viene marcato come concorrente al premio Rush mensile.
- Easy Rent: gettone secco a 60 gg e inflow valido per la soglia Rush.
- Migliorato il parser delle offerte Mobile + Easy Rent per leggere il vero device Kasko.
- Per Easy Rent storici non riconosciuti, se il PDF è presente localmente compare "Rileggi Easy Rent dal PDF", senza dover eliminare il contratto.

SMARTTRACKER 3.12.5 — EASY RENT PDF REPAIR
- Per un Easy Rent non riconosciuto compare "Carica e rileggi offerta PDF".
- Il PDF può essere scelto direttamente da File/iCloud Drive anche se non era già salvato in SmartTracker.
- La rilettura aggiorna solo le righe Easy Rent del contratto.
- Restano invariati cliente, data, agente, Prospect e tutti gli altri prodotti già presenti.
- Il nuovo inflow Easy Rent viene ricalcolato dal PDF selezionato.
- Dopo il salvataggio la correzione passa nel normale AutoSync Cloud.
- Nessuna modifica al listino Easy Rent o alle altre regole provvigionali della 3.12.4.

SMARTTRACKER 3.12.6 — MIXED EASY RENT FIX
- Corretto il parser dei bundle Mobile Smart / Mobile Comfort / Mobile Extra + Easy Rent.
- Il caso OKTIMA ora riconosce:
  SIM Voce Mobile Smart con inflow 10,00 €;
  iPhone 17 256 GB Kasko Comfort 36m come Easy Rent;
  inflow Easy Rent 16,32 € dal listino;
  fascia GOLD / gettone 130 €.
- Nei bundle misti l'inflow SIM viene ricavato dal Totale Netto Complessivo meno il canone commerciale del/dei device.
- Il device Easy Rent usa invece l'inflow ufficiale del listino Easy Rent, non il canone pagato dal cliente.
- La funzione "Carica e rileggi offerta PDF" può quindi correggere i contratti storici Mobile + Easy Rent.

SMARTTRACKER 3.12.7 — AGENTI / SOGLIA BOOST / M2M

- Provvigioni ora filtrabili per agente: Francesco, Jacopo, Luciano.
- Il filtro resta memorizzato sul dispositivo.
- Soglia accesso boost calcolata per singolo agente e singolo mese: 250 € inflow.
- Sotto 250 €: gli extra boost del mese non vengono conteggiati automaticamente.
- Sopra 250 €: il motore può applicare Prospect / target individuale secondo le altre regole.
- SIM M2M: 2 canoni secchi a 60 giorni dall’attivazione.
- SIM M2M: inflow valido per la gara Rush.
- SIM M2M: sempre escluse dai target SIM Voce / SIM Dati.
- Integrato il portafoglio M2M Local 2026 fornito:
  Mezzo EU, Due EU, Cinque EU, Venti EU, Cinquanta EU, Duecento EU,
  Cinquecento EU, Mille EU, Diecimila EU, Free Call, Free Call MAXI.
- Migliorato il riconoscimento parser dei nomi M2M ufficiali.


SMARTTRACKER 3.12.8 — PROVVIGIONI PER MESE DI PAGAMENTO
- Provvigioni raggruppate per agente e mese di pagamento previsto.
- Ogni movimento mostra mese produzione, componente, importo e mese pagamento.
- Base/gettoni a 60 gg -> +2 mesi.
- Extra base e Prospect a circa 90 gg -> +3 mesi.
- Gara individuale trimestrale -> 3 mesi dopo la chiusura del trimestre.
- Mesi di produzione restano rappresentati finché generano movimenti futuri.
- Soglia 250 € mensile: mese chiuso sotto soglia = BOOST KO definitivo; base invariata.
- Mese corrente sotto soglia resta in corso con residuo.

SMARTTRACKER 3.12.9 — DETTAGLIO PAGAMENTI
- Stima Provvigioni, Base calcolabile ed Extra determinabili cliccabili.
- Riepilogo per mese previsto di pagamento.
- Mese espandibile per tipologia di pagamento.
- Secondo livello con pratiche, cliente, prodotto, mese produzione e importo.

SMARTTRACKER 3.13.0 — REGOLE PROVVIGIONALI VERSIONATE

- Target individuale: se ancora "In corso", mostra l'extra potenziale che verrebbe sbloccato sulle pratiche già caricate.
- Il potenziale considera solo i mesi che hanno già superato la soglia mensile di accesso ai boost.
- Toccando il riquadro Target individuale si apre il dettaglio delle pratiche che compongono il potenziale.
- Creato il registro storico delle regole provvigionali per trimestre.
- Q2 2026 salvato come versione storica; Q3 2026 salvato come versione attiva.
- Ogni contratto usa automaticamente il set di regole relativo alla propria data.
- I futuri trimestri verranno aggiunti come nuove versioni senza modificare lo storico.
- Nella sezione Provvigioni è visibile "Storico regole provvigionali", espandibile e in sola lettura.

SMARTTRACKER 3.14.0 — MINIMAL PDF CLOUD
- Ricostruita direttamente dalla 3.13.0 stabile.
- Login e AutoSync non modificati.
- Nessuna migrazione automatica.
- Solo in Archivio: Aggiungi PDF Cloud / Apri PDF Cloud sul singolo contratto.
- Primo test consigliato su un solo contratto.
