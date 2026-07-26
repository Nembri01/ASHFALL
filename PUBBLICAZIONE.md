# ASHFALL — Guida passo-passo alla pubblicazione

> **Stato 2026-07-24: quasi tutto il lavoro tecnico è GIÀ FATTO.**
> ✔ Progetto Android nativo generato (`android/`) con icone e splash nativi
> ✔ JDK 17 + Android SDK installati (portabili, in `C:\Progetti\AndroidTools`)
> ✔ Keystore di firma creato: `keystore\ashfall-release.keystore` — **password in `keystore\CREDENZIALI-KEYSTORE.txt` → FANNE SUBITO 2 BACKUP**
> ✔ Firma release collegata alla build (keystore.properties + build.gradle)
> ✔ Build con doppio clic: **`COSTRUISCI-AAB.bat`** → produce `android\app\build\outputs\bundle\release\app-release.aab`
> ✔ Pagina privacy pronta da caricare: cartella **`privacy\`** (index.html IT+EN)
> ✔ Testi store aggiornati (`STORE_LISTING.md`), icona 512 (`assets/icon-512.png`), feature graphic
>
> **Restano SOLO i passi con i TUOI account**, segnati 👤 qui sotto.

---

## FASE 0 — Account (una volta sola)

| Account | Costo | Dove |
|---|---|---|
| Google Play Console | $25 una tantum | https://play.google.com/console |
| Apple Developer Program | €99/anno | https://developer.apple.com/programs |
| Google AdMob | gratis | https://admob.google.com |

⚠️ **iOS richiede un Mac con Xcode** (vedi Fase C). Consiglio: pubblica PRIMA su Android
(fattibile al 100% dal tuo PC Windows), iOS in un secondo momento.

---

## FASE A — Preparazione comune

### A1. Strumenti — ✔ FATTO (JDK+SDK portabili in `C:\Progetti\AndroidTools`, niente Android Studio necessario)
### A2. Dipendenze — ✔ FATTO (`npm install` eseguito, progetto android/ generato e sincronizzato)

### A3. 👤 Privacy policy online (obbligatoria: ci sono gli annunci)
La pagina è GIÀ PRONTA nella cartella `privacy\` (index.html, IT+EN). Devi solo metterla online, a scelta:
- **Netlify Drop** (più facile): vai su https://app.netlify.com/drop e trascina la cartella `privacy` → URL immediato
- **GitHub Pages**: repo nuovo → carica `privacy/index.html` → Settings → Pages → attiva
Segna l'URL: serve in **Play Console**, **App Store Connect**, **AdMob** e dentro l'app
(dì l'URL a Claude e aggiorna lui il bottone Privacy in-app).

### A4. AdMob — ID veri (ora l'app usa gli ID di TEST di Google)
1. Su admob.com: **App → Aggiungi app** → Android (e poi di nuovo per iOS quando servirà)
2. Crea le unità pubblicitarie: **1 Rewarded** + **1 Interstitial** (per piattaforma)
3. Copia: **App ID** (ca-app-pub-XXXX~YYYY) e gli **Unit ID** (ca-app-pub-XXXX/ZZZZ)
4. Configura il **messaggio di consenso UE (UMP)**: Privacy e messaggistica → GDPR → crea messaggio
5. Passa gli ID a Claude, oppure a mano:
   - `js/ads.js`: blocco `PROD` con gli unit ID veri + `USE_TEST = false`
   - `capacitor.config.json`: `plugins.AdMob.appId` con l'App ID vero
6. Nella scheda AdMob dell'app, collega l'URL della privacy policy (A3)

---

## FASE B — Google Play

### B1. Progetto nativo Android — ✔ FATTO
### B2. Keystore di firma — ✔ FATTO
👤 Unica cosa tua: **backup della cartella `keystore\`** (chiavetta + cloud). Se la perdi,
non potrai MAI più aggiornare l'app pubblicata.

### B3. Build del bundle firmato (AAB) — ✔ AUTOMATIZZATA
Doppio clic su **`COSTRUISCI-AAB.bat`** → esce
`android\app\build\outputs\bundle\release\app-release.aab` già firmato.
(Per gli aggiornamenti futuri: prima aumenta `versionCode` in `android\app\build.gradle`.)

👤 Per provare sul TUO telefono prima di pubblicare: collega il telefono via USB
(Opzioni sviluppatore → Debug USB) e chiedi a Claude di fare la build APK di test,
oppure installa l'APK da `gradlew.bat assembleRelease`.

### B4. Scheda su Play Console
1. **Crea app**: nome `ASHFALL: Wasteland Survival`, gratis, gioco
2. **Scheda dello store** — tutto già pronto:
   - Testi: copia da `STORE_LISTING.md` (IT + EN)
   - Icona 512×512: `assets/icon-512.png`
   - Feature graphic 1024×500: `assets/feature-graphic.png`
   - Screenshot: almeno 2 (telefono, es. 1080×1920) — falli sul telefono o emulatore
     nei momenti indicati in fondo a `STORE_LISTING.md`
3. **Questionari obbligatori** (sezione "Contenuti dell'app"):
   - Privacy policy: URL di A3
   - Classificazione contenuti (IARC): violenza fantasy lieve → esce ~PEGI 12
   - Pubblico target: 13+ (NON selezionare bambini: ci sono annunci)
   - **Annunci**: SÌ, l'app contiene annunci
   - **Sicurezza dei dati**: dichiara che l'app (tramite AdMob) raccoglie
     *ID dispositivo/annunci* e *dati su interazioni* per pubblicità — vedi PRIVACY.md
   - App access: nessun login richiesto
4. **Prodotti in-app** (Monetizza → Prodotti): crea con QUESTI ID esatti (da `iap.js`):
   - `ashfall_remove_ads` (non consumabile) — Rimuovi pubblicità
   - `ashfall_scrap_small` €0,99 · `ashfall_scrap_big` €3,99 (consumabili)
   - `ashfall_cores_small` €1,99 · `ashfall_cores_big` €6,99 (consumabili)
5. **Test interno**: carica l'AAB in "Test interno", aggiungi la tua email come tester,
   installa dal link e verifica: annunci veri, acquisti in sandbox, salvataggi, crash-guard
6. **Produzione**: promuovi la release → invia in revisione (di solito 1–7 giorni)

---

## FASE C — App Store (serve un Mac)

Da Windows NON si può compilare per iOS. Opzioni:
- **Mac fisico** (anche un Mac mini usato/di un amico) — la via più semplice
- **Cloud CI** (build iOS dal cloud senza Mac): Codemagic (https://codemagic.io) ha un
  piano gratuito e supporta Capacitor; firma gestita caricando i certificati Apple

### Sul Mac:
1. Installa **Xcode** (App Store del Mac), poi `sudo xcode-select --install`
2. Copia la cartella `C:\Progetti\ASHFALL` sul Mac
3. ```bash
   cd ASHFALL
   npm install
   npx cap add ios
   npm run assets
   npx cap sync
   npx cap open ios
   ```
4. In Xcode: seleziona il tuo **Team** (firma automatica), Bundle ID `com.ashfall.game`
5. **App Store Connect** (appstoreconnect.apple.com):
   - Crea l'app con lo stesso Bundle ID
   - Prodotti in-app: gli stessi 5 ID di B4 (stessi identici!)
   - Privacy "nutrition labels": Identificatori + Dati d'uso, per pubblicità (AdMob)
   - Screenshot 6.7" (1290×2796) — falli dal simulatore Xcode
   - Testi da `STORE_LISTING.md`
6. Nota annunci iOS: l'app mostra annunci **non personalizzati** di default (niente
   prompt ATT necessario). Se un domani vorrai annunci personalizzati, va aggiunto
   il plugin App Tracking Transparency.
7. Product → **Archive** → Distribute → App Store Connect → invia in revisione (1–3 giorni)

---

## FASE D — Dopo la pubblicazione
- Ogni aggiornamento: incrementa `versionCode`/`versionName` (Android, in
  `android/app/build.gradle`) e Build/Version (iOS) → nuovo AAB/Archive → carica
- Tieni d'occhio: crash nel Play Console (Android Vitals) + il log interno
  dell'app (`ashfall_errlog` in localStorage, ultimi 5 errori)
- Il flag `USE_TEST` in ads.js deve restare **false** in produzione
- Backup del keystore B2 in DUE posti diversi

## Checklist finale prima dell'invio
- [ ] `ads.js`: USE_TEST=false + unit ID veri
- [ ] `capacitor.config.json`: AdMob appId vero
- [ ] Privacy policy online e linkata (store + AdMob + in-app)
- [ ] Prodotti IAP creati con gli ID esatti di `iap.js`
- [ ] AAB firmato col keystore (e keystore al sicuro)
- [ ] Testato su telefono vero: partita completa, annunci, acquisto sandbox, riavvio
- [ ] Screenshot + testi da STORE_LISTING.md caricati
