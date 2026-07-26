/* ============================================================
   ASHFALL — save & settings (versioned single blob)
   classic script · loaded AFTER core.js, BEFORE game.js
   Single source of truth: SaveData.data (Store wraps it).
   ============================================================ */
'use strict';

const APP_VERSION = { name:'1.0.0', build:1 };   // keep in sync with package.json / native
const SAVE_KEY = 'ashfall_save_v1';
const SAVE_SCHEMA = 1;

const SaveData = {
  data:null, _t:null,

  defaults(){
    return {
      v: SAVE_SCHEMA,
      best:{ score:0, level:0 },
      scrap:0,
      meta:{},                              // permanent upgrades id->lvl
      weapon:'pistol', ability:'turret',
      ownedW:{ pistol:1 }, ownedA:{ turret:1 },
      character:'drifter', ownedC:{ drifter:1 },
      mastery:{},            // weapon id -> kill XP (permanent)
      weaponLvl:{},          // weapon id -> purchased power level (scrap upgrades, permanent)
      codex:{},              // entity/biome id -> seen
      threat:0,              // highest unlocked threat tier
      cores:0,               // premium currency
      threatRec:{},          // threat tier -> best sector record
      coreShop:{},           // MERCATO NERO: id -> purchased level
      dailyDate:null,        // last daily-CHALLENGE-mode date played (YYYY-MM-DD)
      dailyUsed:false,       // daily-mode attempt consumed today
      daily:{ last:null, streak:0 },  // login-reward (date string + streak)
      cosmetics:{ skin:'default', trail:'default', fx:'default' },  // equipped cosmetic slots
      cosmeticsOwned:{ skin:{}, trail:{}, fx:{} },                  // core-purchased cosmetics per kind
      lastMode:'endless', lastThreat:0,  // remembered pre-run selection
      prestige:0,
      claimed:{},                           // challenge id -> true
      noAds:false,                           // "Remove ads" IAP (suppresses interstitials)
      devCheat:false,                        // personal dev cheat: infinite scrap & cores (off by default, never shipped on)
      tutorialSeen:false,                    // first-run control hint shown
      settings:{ musicVol:60, sfxVol:70, haptics:true, shake:true, lang:'it', lowFx:false },
      stats:{ runs:0, kills:0, bosses:0, playtime:0, nukes:0, deaths:0, maxLevel:0, ascensions:0, bossNoHit:0, bestScore:0 },
      history:[],            // last ~10 runs {sector,score,mode,threat,date}
      dailyBest:{},          // daily-mode best score per date
      bestByMode:{},         // mode id -> {score,level} best record per mode
      relicsUnlocked:{},     // relic id -> 1 (locked relics added to the offer pool)
    };
  },

  load(){
    let raw=null;
    try{ raw=localStorage.getItem(SAVE_KEY); }catch(e){}
    if(raw){ try{ this.data=this.migrate(JSON.parse(raw)); }catch(e){ this.data=this.defaults(); } }
    else { this.data=this.migrateLegacy(); }
    this.data=this._applyDefaults(this.data);
    this._persist();
    return this.data;
  },

  _applyDefaults(d){
    const def=this.defaults();
    d.best     = Object.assign({}, def.best, d.best||{});
    d.settings = Object.assign({}, def.settings, d.settings||{});
    d.stats    = Object.assign({}, def.stats, d.stats||{});
    if(typeof d.scrap!=='number') d.scrap=0;
    if(!d.meta||typeof d.meta!=='object') d.meta={};
    if(!d.ownedW||typeof d.ownedW!=='object') d.ownedW={pistol:1};
    if(!d.ownedA||typeof d.ownedA!=='object') d.ownedA={turret:1};
    if(!d.claimed||typeof d.claimed!=='object') d.claimed={};
    if(typeof d.weapon!=='string') d.weapon='pistol';
    if(typeof d.ability!=='string') d.ability='turret';
    if(typeof d.prestige!=='number') d.prestige=0;
    if(typeof d.noAds!=='boolean') d.noAds=false;
    if(typeof d.devCheat!=='boolean') d.devCheat=false;
    if(typeof d.tutorialSeen!=='boolean') d.tutorialSeen=false;
    if(typeof d.character!=='string') d.character='drifter';
    if(!d.ownedC||typeof d.ownedC!=='object') d.ownedC={drifter:1};
    if(!d.mastery||typeof d.mastery!=='object') d.mastery={};
    if(!d.weaponLvl||typeof d.weaponLvl!=='object') d.weaponLvl={};
    if(!d.codex||typeof d.codex!=='object') d.codex={};
    if(typeof d.threat!=='number') d.threat=0;
    if(typeof d.cores!=='number') d.cores=0;
    if(!d.threatRec||typeof d.threatRec!=='object') d.threatRec={};
    if(!d.coreShop||typeof d.coreShop!=='object') d.coreShop={};
    if(typeof d.dailyDate!=='string' && d.dailyDate!==null) d.dailyDate=null;
    if(typeof d.dailyUsed!=='boolean') d.dailyUsed=false;
    if(!d.daily||typeof d.daily!=='object') d.daily={last:null,streak:0};
    if(typeof d.daily.last==='undefined') d.daily.last=null;
    if(typeof d.daily.streak!=='number') d.daily.streak=0;
    if(d.lastMode===undefined) d.lastMode='endless';
    if(d.lastThreat===undefined) d.lastThreat=0;
    if(!d.cosmetics||typeof d.cosmetics!=='object') d.cosmetics={};
    if(typeof d.cosmetics.skin!=='string')  d.cosmetics.skin='default';
    if(typeof d.cosmetics.trail!=='string') d.cosmetics.trail='default';
    if(typeof d.cosmetics.fx!=='string')    d.cosmetics.fx='default';
    if(!d.cosmeticsOwned||typeof d.cosmeticsOwned!=='object') d.cosmeticsOwned={};
    if(!d.cosmeticsOwned.skin)  d.cosmeticsOwned.skin={};
    if(!d.cosmeticsOwned.trail) d.cosmeticsOwned.trail={};
    if(!d.cosmeticsOwned.fx)    d.cosmeticsOwned.fx={};
    if(typeof d.settings.lowFx!=='boolean') d.settings.lowFx=false;
    if(!Array.isArray(d.history)) d.history=[];
    if(!d.dailyBest||typeof d.dailyBest!=='object') d.dailyBest={};
    if(!d.bestByMode||typeof d.bestByMode!=='object') d.bestByMode={};
    if(!d.relicsUnlocked||typeof d.relicsUnlocked!=='object') d.relicsUnlocked={};
    d.ownedW.pistol=1; d.ownedA.turret=1; d.ownedC.drifter=1;   // starters always owned
    d.v=SAVE_SCHEMA;
    return d;
  },

  migrate(d){ if(!d||typeof d!=='object') return this.defaults(); return d; },

  migrateLegacy(){
    const d=this.defaults();
    try{
      const s=+localStorage.getItem('ashfall_scrap');
      const m=localStorage.getItem('ashfall_meta');
      const sc=+localStorage.getItem('ashfall_score');
      const lv=+localStorage.getItem('ashfall_level');
      if(!isNaN(s)&&s) d.scrap=s;
      if(m){ try{ d.meta=JSON.parse(m)||{}; }catch(e){} }
      if(!isNaN(sc)&&sc) d.best.score=sc;
      if(!isNaN(lv)&&lv) d.best.level=lv;
      ['ashfall_scrap','ashfall_meta','ashfall_score','ashfall_level'].forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} });
    }catch(e){}
    return d;
  },

  _persist(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); }catch(e){} },
  save(){ clearTimeout(this._t); this._t=setTimeout(()=>this._persist(),250); },
  saveNow(){ clearTimeout(this._t); this._persist(); },
  wipe(){ this.data=this.defaults();
    ['ashfall_ad_bonus_ts','ashfall_ad_inter_ts'].forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} });
    this.saveNow(); },
};

/* ---------- HAPTICS wrapper (Capacitor optional) ---------- */
const Haptic = {
  get plugin(){ return (window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Haptics)||null; },
  get available(){ return !!this.plugin; },
  _on(){ return SaveData.data && SaveData.data.settings.haptics && this.available; },
  impact(style){ if(this._on()){ try{ this.plugin.impact({style:style||'MEDIUM'}); }catch(e){} } },
  light(){ this.impact('LIGHT'); }, medium(){ this.impact('MEDIUM'); }, heavy(){ this.impact('HEAVY'); },
  vibrate(ms){ if(this._on()){ try{ this.plugin.vibrate({duration:ms||120}); }catch(e){} } },
};

/* ---------- SETTINGS controller ---------- */
const Settings = {
  _returnTo:'titleScreen',
  get s(){ return SaveData.data.settings; },
  apply(){
    Audio2.setVolumes(this.s.musicVol/100, this.s.sfxVol/100);
    Camera.shakeEnabled = this.s.shake;
    if(typeof G!=='undefined') G.forceLowFx = !!this.s.lowFx;
    I18N.applyLang(this.s.lang);
  },
  set(k,v){
    this.s[k]=v;
    if(k==='musicVol'||k==='sfxVol') Audio2.setVolumes(this.s.musicVol/100, this.s.sfxVol/100);
    if(k==='shake') Camera.shakeEnabled=v;
    if(k==='lowFx' && typeof G!=='undefined') G.forceLowFx=!!v;
    if(k==='lang') I18N.applyLang(v);
    SaveData.save();
  },
};

/* ---------- minimal I18N (DOM via data-i18n) ---------- */
const I18N = {
  lang:'it',
  dict:{
    it:{ play:'INIZIA', shop:'NEGOZIO', settings:'IMPOSTAZIONI', resume:'RIPRENDI',
         restart:'RICOMINCIA', quitRun:'🚪 ESCI AL MENU', howToPlay:'COME SI GIOCA', back:'← INDIETRO', audio:'AUDIO', music:'Musica', sfx:'Effetti',
         game:'GIOCO', vibration:'Vibrazione', screenShake:'Tremolio schermo', language:'Lingua',
         data:'DATI', restorePurch:'Ripristina acquisti', wipe:'Azzera progressi', info:'INFO',
         privacy:'Privacy Policy', credits:'Crediti',
         wipeConfirm:'Cancellerai rottami, record e potenziamenti. Sicuro?',
         cancel:'ANNULLA', wipeYes:'CANCELLA TUTTO', noPurch:'Nessun acquisto da ripristinare',
         performance:'Prestazioni', perfHint:'Riduce effetti grafici', aimHint:'Mira e fuoco sempre automatici',
         sector:'SETTORE', scrap:'ROTTAMI', cores:'NUCLEI', playBtn:'GIOCA', dailyReward:'🎁 RICOMPENSA GIORNALIERA',
         record:'RECORD', maxSector:'SETTORE MAX', hint:'Trascina per muoverti · mira e fuoco automatici · scatto e abilità per sopravvivere',
         howTo:'COME SI GIOCA', tut1:'Trascina ovunque per muoverti · miri e spari da solo', tut2:'⤢ Scatto per schivare (invulnerabile) · 🛰️ abilità a fianco', tut3:'5 settori = 1 ZONA, l’ultimo è il BOSS · ogni zona cambia', tut4:'Evita le pozze colorate (fanno male) · raccogli ⬢ e ❤️',
         prepRaid:'PREPARA LA SORTITA', setupSub:'SOPRAVVISSUTO · MODALITÀ · MINACCIA', modes:'MODALITÀ', threatL:'MINACCIA', start2:'INIZIA ▸',
         arsenal:'ARSENALE', abilities:'ABILITÀ', permUpgrades:'POTENZIAMENTI PERMANENTI',
         challengesT:'SFIDE', challengesSub:'OBIETTIVI A LUNGO TERMINE', survivors:'SOPRAVVISSUTI', activeLbl:'ATTIVO:',
         progressT:'PROGRESSI', progressSub:'SFIDE · ACHIEVEMENT · CODEX', market:'MERCATO NERO', marketSub:'PERK PERMANENTI · CIMELI',
         statsT:'RECORD PERSONALE', statsSub:'STATISTICHE · STORICO RUN', achT:'IMPRESE', aspect:'ASPETTO',
         unlockedLbl:'SBLOCCATE', discoveredLbl:'SCOPERTE', customizeSurv:'personalizza il sopravvissuto', clearedLbl:'RIPULITO',
         dailyT:'RICOMPENSA GIORNALIERA', dailySub:'TORNA OGNI GIORNO PER BONUS CRESCENTI', claim:'RISCUOTI', close:'← CHIUDI',
         chooseUpgrade:'SCEGLI UN POTENZIAMENTO', rerollUp:'▶ RI-TIRA POTENZIAMENTI', relicT:'RELIQUIA', relicSub:'RICOMPENSA BOSS · SCEGLI UN ARTEFATTO',
         crossroads:'BIVIO', choose:'SCEGLI', skip:'SALTA', paused:'IN PAUSA',
         youFell:'SEI CADUTO', sectorReached:'SETTORE RAGGIUNTO', score2:'PUNTEGGIO', kills2:'ELIMINAZIONI', time2:'TEMPO',
         newRecord:'★ NUOVO RECORD ★', retry:'RIPROVA', menu:'MENU', watchReviveAd:'▶ GUARDA ANNUNCIO — RINASCI',
         doubleScrap:'▶ RADDOPPIA ROTTAMI', bonusScrap:'▶ +ROTTAMI', removeAds:'🚫 Rimuovi pubblicità', adsPrivacy:'Privacy annunci', getScrap:'💳 OTTIENI ROTTAMI', getCores:'💳 OTTIENI NUCLEI', buyFail:'Acquisto non riuscito' },
    en:{ play:'PLAY', shop:'SHOP', settings:'SETTINGS', resume:'RESUME',
         restart:'RESTART', quitRun:'🚪 QUIT TO MENU', howToPlay:'HOW TO PLAY', back:'← BACK', audio:'AUDIO', music:'Music', sfx:'Effects',
         game:'GAME', vibration:'Vibration', screenShake:'Screen shake', language:'Language',
         data:'DATA', restorePurch:'Restore purchases', wipe:'Reset progress', info:'INFO',
         privacy:'Privacy Policy', credits:'Credits',
         wipeConfirm:'This erases scrap, records and upgrades. Sure?',
         cancel:'CANCEL', wipeYes:'ERASE ALL', noPurch:'No purchases to restore',
         performance:'Performance', perfHint:'Reduces visual effects', aimHint:'Aiming and firing are always automatic',
         sector:'SECTOR', scrap:'SCRAP', cores:'CORES', playBtn:'PLAY', dailyReward:'🎁 DAILY REWARD',
         record:'BEST', maxSector:'MAX SECTOR', hint:'Drag to move · auto aim & fire · dash and ability to survive',
         howTo:'HOW TO PLAY', tut1:'Drag anywhere to move · you aim and fire automatically', tut2:'⤢ Dash to dodge (i-frames) · 🛰️ ability beside it', tut3:'5 sectors = 1 ZONE, the last is the BOSS · each zone differs', tut4:'Avoid colored pools (they hurt) · grab ⬢ and ❤️',
         prepRaid:'PREPARE THE RAID', setupSub:'SURVIVOR · MODE · THREAT', modes:'MODE', threatL:'THREAT', start2:'START ▸',
         arsenal:'ARSENAL', abilities:'ABILITIES', permUpgrades:'PERMANENT UPGRADES',
         challengesT:'CHALLENGES', challengesSub:'LONG-TERM GOALS', survivors:'SURVIVORS', activeLbl:'ACTIVE:',
         progressT:'PROGRESS', progressSub:'CHALLENGES · ACHIEVEMENTS · CODEX', market:'BLACK MARKET', marketSub:'PERMANENT PERKS · RELICS',
         statsT:'PERSONAL RECORDS', statsSub:'STATS · RUN HISTORY', achT:'ACHIEVEMENTS', aspect:'APPEARANCE',
         unlockedLbl:'UNLOCKED', discoveredLbl:'DISCOVERED', customizeSurv:'customize your survivor', clearedLbl:'CLEARED',
         dailyT:'DAILY REWARD', dailySub:'COME BACK EVERY DAY FOR GROWING BONUSES', claim:'CLAIM', close:'← CLOSE',
         chooseUpgrade:'CHOOSE AN UPGRADE', rerollUp:'▶ REROLL UPGRADES', relicT:'RELIC', relicSub:'BOSS REWARD · CHOOSE AN ARTIFACT',
         crossroads:'CROSSROADS', choose:'CHOOSE', skip:'SKIP', paused:'PAUSED',
         youFell:'YOU FELL', sectorReached:'SECTOR REACHED', score2:'SCORE', kills2:'KILLS', time2:'TIME',
         newRecord:'★ NEW RECORD ★', retry:'RETRY', menu:'MENU', watchReviveAd:'▶ WATCH AD — REVIVE',
         doubleScrap:'▶ DOUBLE SCRAP', bonusScrap:'▶ +SCRAP', removeAds:'🚫 Remove ads', adsPrivacy:'Ads privacy', getScrap:'💳 GET SCRAP', getCores:'💳 GET CORES', buyFail:'Purchase failed' },
  },
  t(k){ return (this.dict[this.lang]&&this.dict[this.lang][k]) || (this.dict.it[k]||k); },
  applyLang(lang){
    this.lang = this.dict[lang]?lang:'it';
    document.documentElement.lang=this.lang;
    document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent=this.t(el.getAttribute('data-i18n')); });
  },
};

window.SaveData=SaveData; window.Settings=Settings; window.Haptic=Haptic; window.I18N=I18N; window.APP_VERSION=APP_VERSION;
