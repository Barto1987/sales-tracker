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
