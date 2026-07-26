# ASHFALL — HANDOFF / Report completo (per continuare in un'altra chat)

> Incolla o allega questo file nella nuova chat. Riassume TUTTO: cos'è, dov'è, com'è fatto, cosa è già fatto e cosa resta.

## 1. Cos'è
**ASHFALL — Wasteland Survival**: survivor-shooter top-down **endless** post-apocalittico, per **iOS/Android + browser**.
Stile a un pollice: ti muovi, **mira e fuoco automatici**, scatto + abilità. Difficoltà infinita, biomi che cambiano, boss, roguelite.
**Vanilla HTML5 Canvas + Capacitor**. NESSUN asset esterno: grafica procedurale, audio WebAudio sintetizzato, font di sistema → funziona offline.

## 2. Dove si trova / come si gioca
- Progetto canonico: **`C:\Progetti\ASHFALL\`**
- Per giocare: doppio clic su **`GIOCA.bat`** (avvia un server locale su `http://localhost:8123` e apre il browser; tieni aperta la finestra). In alternativa: `python -m http.server 8123` nella cartella, poi apri `localhost:8123`. Ricarica forzata = Ctrl+Shift+R.
- Mobile/test in rete: stesso server, da telefono apri `http://<IP-del-PC>:8123`.

## 3. Struttura file
```
ASHFALL/
├── index.html          # HUD + tutte le schermate DOM
├── styles.css          # tema vetro/neon (var --amber/--cyan/--tox/--glass/--head/--body)
├── js/
│   ├── core.js         # U (util), Audio2 (sfx sintetizzati), Input (touch+tastiera), Particles (pool), Camera
│   ├── save.js         # SaveData (blob versionato 'ashfall_save_v1') + Settings + Haptic + I18N
│   ├── ads.js          # window.Ads — rewarded/interstitial, provider mock(browser)/AdMob(nativo)
│   ├── iap.js          # window.IAP — "Rimuovi pubblicità" (mock + hook nativo)
│   └── game.js         # TUTTO il gioco (~125 KB): tabelle dati, classi, stato G, loop, render, UI builders
├── assets/             # icon-only/foreground/background.png, splash(.dark), feature-graphic.png, icon.svg
├── tools/generate_assets.py   # rigenera icone/splash/feature graphic (Pillow): python tools/generate_assets.py
├── capacitor.config.json, manifest.webmanifest, package.json
├── PRIVACY.md, STORE_LISTING.md, README.md, GIOCA.bat
```

## 4. Architettura in game.js (tabelle dati in alto, modificabili facilmente)
- `ETYPE` — 12 nemici: walker, runner, spitter, brute, bomber, shielder, swarmer, mite, leaper, healer, sniper, boss.
- `BOSSES` — 7 boss (butcher/bloated/warlord/colossus/necromancer/twins/artillery), ciclano ogni 5 settori con scaling per ciclo; `BOSS_MODS` = affissi casuali (veloce/corazzato/esplosivo/rigenerante/frenetico) da settore 15.
- `WEAPONS` — 9 armi (pistol, shotgun, smg, railgun a carica, flamer+burn, launcher AoE, tesla a catena, cryo congelante, minigun a rampa). Campi: rateMul/dmgMul/speedMul/lifeMul/pellets/pattern/bulletR + flag chill/chain/ramp/burn/forceExplosive/beam.
- `ABILITIES` — 4: turret, shock, slow, shield (pulsante con cooldown).
- `CHARACTERS` — 6 sopravvissuti (drifter/jackal/bulwark/pyre/warden/revenant): passive uniche, arma/abilità iniziale, stat moltiplicative applicate in `Store.applyTo` PRIMA di META/prestige; sblocco via cost(rottami) o req(achievement). Tint del corpo.
- `BIOMES` — 12 biomi con palette/fog/grade/hazard + `weights` (pesi spawn per tipo). `Biome.pickFor` ogni 3 settori, transizione smoothstep. `weightedType()` sceglie il nemico in base al bioma.
- Hazard ambientali: `G.hazards` + `genHazards()/updateHazards()/drawHazardFields()` (acid/rad/lava/frost/tar/embers/fallout/crypt/flood — pozze/colonne/zone che danno danno e rallentano via `p._hazSlow`).
- `UPGRADES` — 20 perk per-run (scelti a fine settore); effetti: dmg/rate/multi/pierce/crit/hp/regen/range/cool/swift/hardy(dr)/chillp/burnp/chainp + rari glass/exec/vamp/boom/thorn.
- `EVENTS` — 5 bivi tra i settori (santuario/mercante/tesoro/forgia/medico), `G.rollEvent/openEvent/resolveEvent`, ogni 4 settori non-boss.
- `META` — 10 potenziamenti permanenti (negozio Rottami, `Store.costOf` scalabile) + PRESTIGE (`Store.ascend`).
- `CHALLENGES` — sfide permanenti; `OBJECTIVES` — 3 obiettivi per-run con ricompensa.
- Classi: `Player` (stats + weapon/ability + passive personaggio + shoot generalizzato per pattern + useAbility + hurt + draw umanoide), `Bullet` (opt: color/blastR/burn/knock/chill/chain), `Enemy` (AI per tipo + boss + draw), `Turret`, `EnemyBullet`, `Pickup` (hp/scrap/nuke).
- `G` = stato di gioco: start/_beginRun, startLevel (formule scaling endless: **hpMul=1.085^(L-1)** composto, speed/dmg con asintoto + crescita tardiva; boss ogni 5; special waves horde/elite/dark; biome+hazard per settore; prestige), updateSpawning (spawn pesato + élite), completeLevel→upgrade→(evento)→startLevel, onKill (combo/score/stats/drop/nuke), die (rottami guadagnati = collected + score/60 + kills + depth, ×scrapMul), detonateNuke, loop (hit-stop/lowFx), render (biomi+grade+vignette+hazard+indicatori+joystick+mirino+vignetta HP basso).
- Monetizzazione: rewarded ads (revive/double/reroll/bonus + interstitial PRIMA della partita) in ads.js; IAP "Rimuovi pubblicità" in iap.js (flag `noAds`); juice (hit-stop boss, popup combo, low-HP vignette, joystick visibile, mirino).

## 5. Salvataggio (SaveData.data, chiave localStorage 'ashfall_save_v1', versionato + _applyDefaults additivo)
`best{score,level}, scrap, meta{id:lvl}, weapon, ability, ownedW, ownedA, character, ownedC, mastery{}, codex{}, threat, cores, prestige, claimed{}, noAds, tutorialSeen, settings{musicVol,sfxVol,haptics,shake,lang}, stats{runs,kills,bosses,playtime,nukes,deaths,maxLevel,ascensions,maxCombo,scrapLifetime}`
(`mastery/codex/threat/cores` sono già nei default ma NON ancora usati — riservati ai sistemi pendenti.)

## 6. STATO: cosa è FATTO ✅
- Core gameplay completo, controllo a un pollice, mobile-first.
- 12 nemici, 7 boss + affissi, 9 armi, 4 abilità, 20 perk, 12 biomi + hazard, eventi tra settori.
- 6 personaggi giocabili con passive.
- Endless bilanciato (validato via simulazione: fresco ~settore 10-14, con meta ~16-17, nessun muro).
- Negozio permanente + prestige + sfide + obiettivi per-run.
- Rewarded ads (AdMob+mock) + IAP rimuovi-ads, settings, salvataggio versionato, tutorial primo avvio.
- Pacchetto store: icone/splash/feature-graphic generati, PRIVACY.md, STORE_LISTING.md, README con checklist, GIOCA.bat.
- Passato per revisione avversariale (35 agenti, 22 fix applicati).

## 7. STATO: i 5 sistemi pendenti sono FATTI ✅ (implementati + verificati 2026-06-23)
Tutti integrati nel file canonico e verificati con simulazione a step in `preview_eval` (blueprint + patcher Python in `C:\Progetti\ashfall_blueprints\`).
1. **Maestria armi permanente + EVO** ✅: `MASTERY_XP`/`MASTERY_GROWTH`/`EVOLUTIONS`; `applyMastery(p)` clona l'arma per-run (mai muta WEAPONS), bonus per-livello + evoluzione a L10; XP via `awardMasteryXp()` in onKill. +3 armi (Falce/Sciame/Prisma → 12) +2 abilità (Riparo/Richiamo → 6). Card arsenale con dots + "EVOLUTA".
2. **Nuovi nemici + campioni + boss** ✅: +6 ETYPE (blinker/bubbler/summoner/zealot/rammer/wraith → 18), CAMPIONI mini-boss da sett.12 (barra propria, +1 nucleo), +3 boss multi-fase (splitter/hivequeen/duelist → 10). availableTypes sett.12-24.
3. **Ascensioni/Minaccia + Modalità** ✅: `THREAT_TIERS` (0-10, ×reward 1→3, nuclei), `GAME_MODES` (endless/bossrush/daily-seeded/hardcore), RNG seeded (mulberry32) per il daily. UI in #playSetupScreen.
4. **Achievement + Codex + Nuclei + Daily** ✅: 38 imprese, codex 39 voci con lore IT, nuclei (Store.cores + reroll + sblocco-istantaneo personaggi), ricompense 7 giorni. #achScreen/#codexScreen/#dailyModal.
5. **Hub UX** ✅: titolo → GIOCA (apre setup sopravvissuto+modalità+minaccia) + riga 4 tile + sub-hub PROGRESSI + pill giornaliera + badge nuclei.

**PHASE 2 (fatta 2026-06-23)** ✅: fix Boss-Rush (ora un boss diverso ogni settore); **Reliquie** (18 artefatti per-run, scelta di 3 dopo ogni boss, build roguelite); **+4 eventi, +4 affissi boss, +4 potenziamenti, +4 sfide**; riepilogo build in pausa; **storico run + record giornaliero locale** (#statsScreen in PROGRESSI); toggle **Prestazioni** (low-fx). Tutto verificato.

**PHASE 2b (fatta 2026-06-23)** ✅: **Mercato Nero** (negozio permanente in Nuclei: perk + sblocco reliquie, raggiungibile da PROGRESSI) e **Cosmetici/Skin** (skin corpo + aura, scie proiettili, finisher di morte — procedurali, schermata ASPETTO con tab). Tutto verificato in regressione completa.

**PHASE 2c (fatta 2026-06-23)** ✅: pacchetto contenuti (+6 reliquie→24, +2 biomi, +2 affissi boss, +4 imprese→42, +3 eventi, +6 cosmetici); bilanciamento validato via simulazione (curva sana); **selettore lingua IT/EN in Impostazioni** + traduzione inglese di tutta l'interfaccia statica (menu, schermate, HUD, bottoni) e delle modalità di gioco.

**PHASE 2d (fatta 2026-06-23)** ✅: nuova modalità **ORDA** (sopravvivenza a ondate a tempo: 35s per ondata, spawn infiniti, sopravvivi per potenziarti; le ondate-boss spezzano il ritmo). 5 modalità totali. Verificata + smoke di coesione su tutte le modalità.

**DA FARE / idee future**: tradurre in EN anche i testi di contenuto (nomi/descrizioni di armi, nemici, reliquie, imprese, lore codex — ora restano in italiano); bilanciamento fine su partite reali; compagno/drone; IAP nuclei (stub `G.buyCoresIAP`); altre modalità.

## 8. Note tecniche importanti
- **Verifica**: nell'ambiente di anteprima Claude lo *screenshot/snapshot* si incaglia (il loop `requestAnimationFrame` continuo non va mai idle) → testare SEMPRE con **simulazione manuale a step** dentro `preview_eval` (chiamando player.update/updateSpawning/enemy.update/bulletCollisions/render in un loop), non con screenshot. Gate di sintassi prima di ricaricare: `node --check js/game.js`.
- **Cache anteprima**: un normale reload NON prende i file modificati (il browser cachea `game.js`). Usa il server **no-cache** `C:\Progetti\ashfall_blueprints\devserver.py` (già impostato in `.claude/launch.json` config "ashfall"); dopo un edit fai `location.reload()` e ricarica i globali.
- **Pattern editing**: game.js è grande; modificare ancorandosi a stringhe di codice uniche. Tabelle dati in cima al file per il bilanciamento.
- **Pubblicazione (TODO per incassare davvero)**: in `js/ads.js` mettere ID AdMob reali in `PROD` e `USE_TEST=false`; App ID nei file nativi; per iOS personalizzati serve plugin ATT; in `js/iap.js` cablare un plugin di billing reale per il prodotto `ashfall_remove_ads`; `npm install` + `npx cap add android/ios` + build (vedi README.md checklist).
- **Memoria persistente**: c'è già una memoria di progetto (`project-ashfall`) che riassume tutto questo e passa tra le chat.

## 9. Prossimo passo consigliato
I 5 sistemi pendenti sono fatti e verificati. Prossimi passi suggeriti: **giocarci davvero** (GIOCA.bat) per il game-feel, poi rifinire il bilanciamento ai tier di Minaccia alti su run reali, aggiungere sink per i Nuclei e localizzare in EN i nuovi testi. La struttura dati resta in cima a `game.js` (THREAT_TIERS, GAME_MODES, MASTERY_*, EVOLUTIONS, ETYPE, BOSSES, ACHIEVEMENTS, CODEX_*, DAILY_REWARDS, HUB_TILES) per ritocchi rapidi.
