# ☢️ ASHFALL — Wasteland Survival

**Survivor-shooter post-apocalittico per Android, iOS e browser, scritto in JavaScript puro su Canvas.**
Nessun motore di gioco e nessun asset esterno: grafica procedurale, audio sintetizzato con WebAudio, si gioca anche offline.

*Post-apocalyptic survivor-shooter for Android, iOS and the browser, written in plain JavaScript on Canvas. No game engine, no external assets: procedural graphics, WebAudio-synthesised sound, plays offline.*

**Stato:** Android pubblicato in test chiuso su Google Play · build iOS pronta (CI su Codemagic)

![Partita in modalità Orda](https://nembri01.github.io/assets/ashfall-horde.webp)

| | |
|---|---|
| ![Boss](https://nembri01.github.io/assets/ashfall-boss.webp) | ![Arsenale](https://nembri01.github.io/assets/ashfall-arsenal.webp) |

---

## Contenuti

- **6 modalità:** Senza Fine, Assalto Boss, Orda, Sfida del Giorno (seed giornaliero), Inferno, Frenesia
- **15 armi evolvibili:** maestria per arma, a livello 10 un'evoluzione unica
- **8 abilità** potenziabili e **8 sopravvissuti** con passive uniche
- **14 boss** con affissi, più élite, campioni, cacciatori e l'evento Luna di Sangue
- **12 biomi** con pericoli ambientali e **11 livelli di minaccia**
- **Meta-progressione:** reliquie, sinergie elementali, Overdrive a combo, negozio permanente, prestigio, mercato nero, cosmetici
- **42 imprese**, bestiario con 39 voci di lore, ricompense giornaliere
- Italiano e inglese, salvataggi versionati, tutorial

## Come è fatto

| Area | Tecnologia |
|---|---|
| Gioco | JavaScript vanilla, HTML5 Canvas (luci, glow, particellari, biomi e color grading generati via codice) |
| Audio | WebAudio, effetti e musica sintetizzati a runtime |
| Mobile | Capacitor 6 (Android e iOS), Haptics |
| Monetizzazione | AdMob rewarded e interstitial (sempre facoltativi), acquisto in-app "Rimuovi pubblicità" |
| CI | Codemagic per la build iOS |
| Grafica store | Python + Pillow genera icone, splash e feature graphic |

### Qualità e test

Il gioco ha un harness separato in Node.js + Puppeteer che lo carica headless e verifica:

- **29 test** automatici e **8 audit** (economia, logica di combattimento, copertura delle traduzioni, riciclo degli oggetti, flusso delle ricompense)
- **simulazione del bilanciamento** prima di ogni modifica ai numeri
- **screenshot automatici** per gli store in tutte le risoluzioni richieste

## Comandi

| Azione | Mobile | Desktop |
|---|---|---|
| Muoversi | Trascina il dito | WASD / frecce |
| Mira e fuoco | Automatici | Automatici |
| Scatto | Pulsante ⤢ | Spazio / Shift |
| Abilità | Pulsante in basso a destra | Clic sul pulsante |

## Provarlo nel browser

```bash
npx serve -l 5173 .
# poi apri http://localhost:5173
```

## Build Android / iOS

Prerequisiti: Node 18+, Android Studio (Android), Mac con Xcode e CocoaPods (iOS).

```bash
npm install
npm run cap:sync        # dopo ogni modifica al gioco
npm run open:android    # Android Studio -> Build AAB
npm run open:ios        # Xcode -> Archive
```

Per rigenerare icone e splash: `python tools/generate_assets.py`, poi `npm run assets`.

## Struttura

```
ASHFALL/
├── index.html              # HUD e tutte le schermate
├── styles.css
├── js/
│   ├── core.js             # utilità, input, audio sintetizzato, particellari, camera
│   ├── save.js             # salvataggio versionato, impostazioni, haptics, i18n
│   ├── ads.js              # AdMob (mock nel browser)
│   ├── iap.js              # acquisto in-app (mock nel browser)
│   └── game.js             # entità, armi, nemici, boss, biomi, progressione, render
├── assets/                 # icone, splash, feature graphic
├── tools/generate_assets.py
├── capacitor.config.json · codemagic.yaml
└── PRIVACY.md · STORE_LISTING.md
```

---

Progetto personale di **Riccardo Nembri** · [Portfolio](https://nembri01.github.io) · [LinkedIn](https://www.linkedin.com/in/riccardo-nembri)
