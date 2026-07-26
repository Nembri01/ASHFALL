# ☢️ ASHFALL — Wasteland Survival

Sparatutto **post-apocalittico endless** per **iOS e Android** (e browser), stile *survivor-shooter* a un pollice:
ti muovi, **mira e fuoco sono automatici**, schivi con lo scatto e usi un'**abilità** attiva. La difficoltà
sale **all'infinito**, i biomi cambiano, e ogni 5 settori arriva un **boss gigante**.

Tutto generato via codice su **Canvas** (luci, glow, particellari, biomi, screen-shake): **nessun asset esterno**,
audio sintetizzato con WebAudio, font di sistema → funziona **offline**. Monetizzazione con **rewarded ads** (AdMob).

---

## 🎮 Come si gioca
| Azione | Mobile | Desktop |
|---|---|---|
| Muoversi | Trascina il dito | `WASD` / frecce |
| Mira + fuoco | Automatici | Automatici (mouse per mirare) |
| Scatto (schivata) | Pulsante ⤢ | `Spazio` / `Shift` |
| Abilità attiva | Pulsante in basso a destra | clic sul pulsante |
| Pausa | ⏸ in alto a destra | — |

---

## ✨ Contenuti
- **Endless reale:** HP nemici senza tetto (servono sempre più DPS), velocità/danno con asintoto (resta leggibile), più ostili e spawn più fitti col passare dei settori.
- **6 armi** sbloccabili: Vagabonda (pistola), Spazzino (shotgun), Crepitio (SMG), Lancia di Ferro (railgun a carica), Forno (lanciafiamme + burn), Tuono (lanciagranate AoE).
- **4 abilità:** Sentinella (torretta), Onda d'Urto (AoE+spinta), Distorsione (slow), Barriera (invuln).
- **11 tipi di nemico** (zombie, corridori, sputatori, bruti, **bomber, corazzati, sciamatori, saltatori, stregoni curatori, mini**) + variante **élite**.
- **7 boss** con pattern unici (Macellaio, Gonfio, Signore della Guerra, Colosso, Necromante, **Gemelli**, Artigliere) + **affissi** (veloce, corazzato, esplosivo, rigenerante, frenetico) → varietà infinita.
- **5 biomi** che cambiano ogni 3 settori (cenere, tossico, sangue, sabbia, radioattivo) con palette, nebbia, hazard e color-grading propri.
- **Ondate speciali:** Valanga (orda), Élite-rush, Settore Buio.
- **Meta-progressione:** negozio permanente (Rottami), **PRESTIGE/ascensione** infinita, **sfide** a lungo termine, record locali, statistiche.
- **Impostazioni** complete: volumi musica/effetti, vibrazione (haptics), tremolio schermo, lingua IT/EN, azzera progressi, privacy.

---

## 💰 Pubblicità con ricompensa (monetizzazione)
Gli annunci sono **sempre facoltativi** (rewarded) + interstitial leggeri tra le partite. Astrazione in [js/ads.js](js/ads.js):
- nel **browser** usa un provider *mock* (annuncio finto di prova);
- nell'**app** usa **Google AdMob** via `@capacitor-community/admob`.

Placement: **Rinasci** (1/partita), **Raddoppia rottami** (a fine partita), **Ri-tira potenziamenti** (1/settore), **+Rottami bonus** (cooldown), **interstitial** tra le partite (cap 120s).

### Attivare AdMob (per pubblicare e guadagnare)
1. Crea un account [AdMob](https://admob.google.com), registra l'app e crea le unità **Rewarded** e **Interstitial** (Android e iOS).
2. In [js/ads.js](js/ads.js): metti i tuoi ID in `PROD` e imposta `USE_TEST = false`.
3. Inserisci l'**App ID** reale:
   - Android → `android/app/src/main/AndroidManifest.xml` (`com.google.android.gms.ads.APPLICATION_ID`)
   - iOS → `ios/App/App/Info.plist` (`GADApplicationIdentifier` + `NSUserTrackingUsageDescription` + lista `SKAdNetworkItems`)
4. Configura il **consenso UMP** (messaggio GDPR EEA/UK) nella console AdMob.
5. **iOS, annunci personalizzati:** aggiungi un plugin **ATT** (es. `@capacitor-community/app-tracking-transparency`) e chiama il prompt in `AdMobProvider.init()` di [js/ads.js](js/ads.js) prima del consenso. Senza ATT l'app serve solo annunci **non personalizzati** (comunque funzionante).
> ⚠️ Non cliccare mai i tuoi annunci (traffico non valido = ban). Tieni i test ID in sviluppo.

### Rimuovi pubblicità (acquisto in-app)
In Impostazioni → Dati c'è **"Rimuovi pubblicità"** (toglie gli interstitial; i rewarded restano, sono opzionali). La logica è in [js/iap.js](js/iap.js) con un *mock* per il browser. Per renderlo reale:
1. Crea un prodotto **non-consumabile** `ashfall_remove_ads` in App Store Connect e Google Play Console.
2. Aggiungi un plugin di billing (es. `cordova-plugin-purchase`/`@capacitor-community/in-app-purchases` o RevenueCat) e cabla `IAP.buy()`/`IAP.restore()` ai punti marcati `// NATIVE:` in `js/iap.js` (imposta `noAds` solo su acquisto verificato).
3. Il flag `noAds` è salvato nel blob di salvataggio e sopprime gli interstitial ovunque.

---

## ▶️ Provarlo subito (browser)
```bash
cd ASHFALL
npx serve -l 5173 .
# apri http://localhost:5173
```

## 📱 Build iOS / Android (Capacitor)
**Prerequisiti:** Node 18+, Android Studio (Android), Mac+Xcode+CocoaPods (iOS).
```bash
cd ASHFALL
npm install
npm run cap:add:android      # crea ./android
npm run cap:add:ios          # crea ./ios (solo Mac)
npm run cap:sync             # dopo ogni modifica al gioco
npm run open:android         # Android Studio -> Build AAB
npm run open:ios             # Xcode -> Archive
```
**Icone, splash e grafica store** sono già generate in `assets/` (`icon-only.png`, `icon-foreground.png`, `icon-background.png`, `splash.png`, `splash-dark.png`, `feature-graphic.png` 1024×500 per Google Play, `icon-1024.png` per lo store). Per rigenerarle dopo modifiche: `python tools/generate_assets.py`. Poi `npm run assets` crea automaticamente tutte le densità native per iOS/Android.

---

## ✅ Checklist pre-pubblicazione
- [ ] `USE_TEST=false` in `js/ads.js` + ID reali; App ID nei file nativi
- [ ] Privacy policy ([PRIVACY.md](PRIVACY.md)) pubblicata a un URL e linkata nello store e in `js/game.js` (`setPrivacy`)
- [ ] Play Console → Data Safety: Advertising/Device ID; App Store → App Privacy: Identifiers/Usage Data
- [ ] iOS: `NSUserTrackingUsageDescription` + SKAdNetwork; UMP consent configurato
- [ ] Versione/build allineati: `package.json`, `js/save.js` (`APP_VERSION`), `build.gradle`, `Info.plist`
- [ ] Prodotto IAP `ashfall_remove_ads` (non-consumabile) creato e `IAP.buy/restore` cablati in `js/iap.js`
- [ ] Icone/splash generati (`assets/`) + `npm run assets`; feature graphic 1024×500; 5 screenshot store; testi da [STORE_LISTING.md](STORE_LISTING.md); rating IARC (12+)

---

## 🗂 Struttura
```
ASHFALL/
├── index.html              # HUD + tutte le schermate (titolo, negozio, sfide, impostazioni, upgrade, pausa, game over)
├── styles.css              # tema vetro/neon, HUD, negozio, impostazioni
├── js/
│   ├── core.js             # util, input, audio sintetizzato, particellari, camera
│   ├── save.js             # salvataggio versionato unico, impostazioni, haptics, i18n
│   ├── ads.js              # AdManager (mock + AdMob), rewarded/interstitial
│   ├── iap.js              # acquisto in-app "Rimuovi pubblicità" (mock + hook nativo)
│   └── game.js             # entità, armi/abilità, nemici/boss, biomi, progressione, negozio, loop, render
├── assets/                 # icon-only/foreground/background, splash(-dark), feature-graphic, icon.svg
├── tools/generate_assets.py# rigenera icone/splash/feature graphic (Pillow)
├── manifest.webmanifest    # PWA
├── capacitor.config.json   # config build + AdMob/Splash
├── PRIVACY.md · STORE_LISTING.md
└── package.json
```

## 🔧 Bilanciamento rapido (in cima a `js/game.js`)
`ETYPE` (nemici) · `BOSSES`/`BOSS_MODS` (boss+affissi) · `WEAPONS`/`ABILITIES` · `BIOMES` · `UPGRADES` (perk per-run) ·
`META` (negozio) · `CHALLENGES` · `G.startLevel()` (formule scaling endless e ondate speciali).

Buona sopravvivenza, sopravvissuto. ☢️
