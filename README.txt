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
