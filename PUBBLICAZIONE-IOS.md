# ASHFALL su App Store — cosa manca

Stato: il progetto iOS **esiste** (`ios/`), è configurato in orizzontale, ha icone e
splash generati, gli screenshot pronti e la ricetta di build in cloud (`codemagic.yaml`).

## Il vincolo da cui parte tutto

**Un IPA si compila solo su macOS.** Xcode non esiste per Windows e non c'è modo di
aggirarlo. Quindi o si usa un Mac, o si affitta un runner macOS in cloud.

La strada consigliata è **Codemagic**: si collega il repository, compila su un Mac
loro e carica direttamente su TestFlight. Il piano gratuito dà 500 minuti al mese,
più che sufficienti (un build di questo progetto sta sotto i 10 minuti).
Alternative equivalenti: Bitrise, GitHub Actions con runner `macos-latest`, oppure
un Mac vero (anche un Mac mini usato).

## Cosa serve fare, in ordine

### 1. AdMob — creare l'app iOS  ⚠️ blocca il primo avvio

Gli identificatori Android **non funzionano** su iOS: servono nuovi.
Su apps.admob.com → Aggiungi app → iOS → crea due unità pubblicitarie
(una *Con premio*, una *Interstitial*), poi sostituisci:

- `ios/App/App/Info.plist` → chiave `GADApplicationIdentifier`,
  ora vale `PLACEHOLDER_IOS_ADMOB_APP_ID` (formato: `ca-app-pub-XXXX~YYYY`)
- `js/ads.js` → `PLACEHOLDER_IOS_REWARDED` e `PLACEHOLDER_IOS_INTERSTITIAL`
  (formato: `ca-app-pub-XXXX/ZZZZ`)

Se l'app ID resta il segnaposto, l'SDK Google Mobile Ads **fa crashare l'app
all'avvio** — esattamente come succedeva su Android senza il meta-data nel manifest.

### 2. App Store Connect — creare la scheda

appstoreconnect.apple.com → App → **+** → Nuova app:

| Campo | Valore |
|---|---|
| Piattaforma | iOS |
| Nome | ASHFALL: Wasteland Survival |
| Lingua principale | Inglese (USA) |
| Bundle ID | `com.ashfall.game` (va prima registrato su developer.apple.com → Identifiers) |
| SKU | `ashfall-game` |

Poi servono, come su Google Play: descrizione, categoria (Giochi → Azione),
URL privacy (`https://zingy-tiramisu-a8f5de.netlify.app`), fascia d'età,
e le **etichette privacy** (dichiarare che l'app usa identificatori per la pubblicità).

Screenshot pronti in `store-upload-ios/`:
- `iphone-6.9/` — 2868×1320, il formato iPhone obbligatorio
- `ipad-13/` — 2752×2064, obbligatorio perché l'app gira anche su iPad
- `icona-1024.png` — icona 1024×1024 senza canale alfa

### 3. Codemagic — collegare e compilare

1. codemagic.io → accedi con GitHub/GitLab → aggiungi questo repository
   (se il progetto non è ancora su un repo remoto, va messo: Codemagic parte da lì)
2. App Store Connect → Users and Access → Integrations → genera una **chiave API**
   con ruolo *App Manager*; caricala su Codemagic con il nome `ashfall_asc_key`
3. Su Codemagic crea il gruppo di variabili `appstore` con
   `APP_STORE_APP_ID` = l'ID numerico dell'app (si legge nell'URL di App Store Connect)
4. Avvia il workflow **ios-testflight**: al termine la build compare in TestFlight

### 4. TestFlight, poi la revisione

Su iOS **non c'è** il requisito dei 12 tester per 14 giorni: è una regola solo di
Google Play. Da TestFlight si può passare direttamente alla revisione App Store,
che richiede in genere 1-3 giorni.

## Differenze già gestite rispetto ad Android

- orientamento bloccato in orizzontale (`UISupportedInterfaceOrientations`)
- schermo intero senza barra di stato (`UIStatusBarHidden`, `UIRequiresFullScreen`)
- `NSUserTrackingUsageDescription` presente: serve se si chiede il consenso ATT
  per la pubblicità personalizzata. Senza consenso gli annunci restano
  non personalizzati e l'app funziona lo stesso.
- `SKAdNetworkItems` con l'identificatore di Google. Se in futuro si aggiungono
  altre reti pubblicitarie, la lista va ampliata.
