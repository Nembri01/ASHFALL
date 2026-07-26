/* ============================================================
   ASHFALL — Wasteland Survival  ·  main game
   endless · weapons & abilities · biomes · bosses · rewarded ads
   ============================================================ */
'use strict';

/* ---------------------- CONSTANTS ---------------------- */
const WORLD = 2400, WALL = 60;   // tighter arena → enemies stay engaged, less running through empty void
let VW = innerWidth, VH = innerHeight, DPR = Math.min(devicePixelRatio||1, 2);
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

/* ---------------------- ENEMY ARCHETYPES ---------------------- */
// THREAT-CLASS EYE COLOUR (the brightest, most-legible pixel on a phone carries the player's required response):
//   RED #ff4d57 = melee/contact ("just shoot it") · CYAN #4fd6ff = ranged ("dodge the projectile")
//   ORANGE #ff8a1e = exploder ("get clear") · GREEN #6bff9e = support, kill-first · MAGENTA #e07bff = mobile/teleport/charge ("unpredictable")
const ETYPE = {
  walker  : {hp:32,  speed:58,  dmg:13, r:17, color:'#84c75e', eye:'#ff4d57', score:10,  drop:0.07, melee:true,  contact:true},
  runner  : {hp:20,  speed:138, dmg:9,  r:13, color:'#c47a4a', eye:'#ff4d57', score:14,  drop:0.06, melee:true,  contact:true},
  spitter : {hp:26,  speed:64,  dmg:0,  r:16, color:'#a86bd6', eye:'#4fd6ff', score:18,  drop:0.10, ranged:true, keepDist:300, fireRate:1.1, projDmg:11, projSpeed:300},
  brute   : {hp:160, speed:46,  dmg:24, r:30, color:'#9a6357', eye:'#ff4d57', score:40,  drop:0.18, melee:true,  contact:true, heavy:true},
  // new types
  bomber  : {hp:34,  speed:120, dmg:0,  r:16, color:'#d68a3a', eye:'#ff8a1e', score:22, drop:0.10, contact:false, bomber:true, fuseDist:60, blastR:96, blastDmg:34, fuse:0.55},
  shielder: {hp:120, speed:50,  dmg:18, r:22, color:'#5f7a8c', eye:'#ff4d57', score:34, drop:0.14, melee:true, contact:true, shield:true, shieldArc:1.4, shieldMul:0.10},
  swarmer : {hp:70,  speed:42,  dmg:10, r:19, color:'#7fae5a', eye:'#ff4d57', score:30, drop:0.12, melee:true, contact:true, swarmer:true, broodCd:3.2, broodN:2, broodType:'mite'},
  mite    : {hp:9,   speed:150, dmg:6,  r:9,  color:'#9ccb6a', eye:'#ff4d57', score:4,  drop:0.02, melee:true, contact:true, mini:true},
  leaper  : {hp:44,  speed:96,  dmg:22, r:15, color:'#b85c8a', eye:'#e07bff', score:26, drop:0.10, melee:true, contact:true, leaper:true, leapDist:330, windup:0.5, leapDur:0.4, leapSpeed:680},
  healer  : {hp:60,  speed:70,  dmg:0,  r:17, color:'#46c7a5', eye:'#6bff9e', score:38, drop:0.16, contact:false, healer:true, keepDist:340, healCd:1.7, healRadius:185, healAmt:0.06, healCap:6},
  sniper  : {hp:40,  speed:60,  dmg:0,  r:15, color:'#7a8fb0', eye:'#4fd6ff', score:34, drop:0.13, contact:false, sniper:true, keepDist:480, aimTime:1.1, shotSpeed:900, shotDmg:26},
  // --- expansion pack: 6 new normal types ---
  blinker : {hp:46,  speed:70,  dmg:18, r:15, color:'#6c5ce7', eye:'#e07bff', score:30, drop:0.12, melee:true, contact:true, blinker:true, blinkCd:2.6, blinkRange:360, blinkMin:120, blinkTele:0.45},
  bubbler : {hp:90,  speed:48,  dmg:16, r:21, color:'#3f8fa6', eye:'#ff4d57', score:36, drop:0.14, melee:true, contact:true, bubble:true, bubbleHp:60, bubbleRegen:10, bubbleBreakT:3.4, bubbleMul:0.12},
  summoner: {hp:80,  speed:54,  dmg:0,  r:19, color:'#7a5230', eye:'#6bff9e', score:42, drop:0.16, contact:false, summoner:true, keepDist:360, sumCd:4.2, sumType:'walker', sumN:2, sumCap:10, sumTele:0.7},
  zealot  : {hp:24,  speed:172, dmg:0,  r:13, color:'#d04545', eye:'#ff8a1e', score:24, drop:0.08, contact:false, kamikaze:true, blastR:84, blastDmg:30, armT:0.9, flyer:true},
  rammer  : {hp:140, speed:44,  dmg:14, r:26, color:'#8a6d3b', eye:'#e07bff', score:44, drop:0.18, melee:true, contact:true, heavy:true, rammer:true, chargeRange:340, windup:0.6, chargeDur:0.5, chargeSpeed:720, ramDmg:30, ramKnock:560},
  wraith  : {hp:54,  speed:88,  dmg:14, r:16, color:'#5b6b7a', eye:'#e07bff', score:28, drop:0.11, melee:true, contact:true, flyer:true, wraith:true, driftAmp:1.7, fadeMin:0.35},
  gunner  : {hp:40,  speed:64,  dmg:0,  r:15, color:'#cf8a4a', eye:'#4fd6ff', score:26, drop:0.11, ranged:true, keepDist:380, fireRate:0.62, projDmg:12, projSpeed:380, burst:3},
  brawler : {hp:120, speed:48,  dmg:18, r:23, color:'#647079', eye:'#ff4d57', score:32, drop:0.13, melee:true, contact:true, heavy:true, slammer:true},
  looter  : {hp:80,  speed:158, dmg:0,  r:16, color:'#ffd24d', eye:'#fff3b0', score:60, drop:0,    contact:false, looter:true},   // special encounter: flees, drops big loot if caught before it escapes
  boss    : {hp:1400,speed:52,  dmg:30, r:54, color:'#9c4b4b', eye:'#ffe14d', score:500, drop:1.0, boss:true},
};

/* boss roster — cycles every 5 sectors, scaling up each cycle */
const BOSSES = [
  {key:'butcher',    name:'IL MACELLAIO',          color:'#c0392b', eye:'#ffd24d', r:50, hp:1500, speed:74},
  {key:'bloated',    name:'IL GONFIO',             color:'#8e44ad', eye:'#e6b3ff', r:62, hp:2050, speed:46},
  {key:'warlord',    name:'SIGNORE DELLA GUERRA',  color:'#6f8a4d', eye:'#ffea00', r:50, hp:1800, speed:56},
  {key:'colossus',   name:'IL COLOSSO',            color:'#5d6d7e', eye:'#46e6ff', r:72, hp:2900, speed:38},
  {key:'necromancer',name:'IL NECROMANTE',         color:'#4b7a6b', eye:'#7affd0', r:52, hp:2200, speed:50},
  {key:'twins',      name:'I GEMELLI',             color:'#b5612e', eye:'#ffd24d', r:42, hp:1150, speed:96, twins:true},
  {key:'artillery',  name:"L'ARTIGLIERE",          color:'#8a7d4d', eye:'#ffea00', r:58, hp:2400, speed:30},
  {key:'splitter',  name:'LA SCISSIONE',         color:'#7d3c98', eye:'#e0a6ff', r:56, hp:2300, speed:54, splitter:true},
  {key:'hivequeen', name:'LA REGINA SCIAME',     color:'#5a7d2a', eye:'#d6ff7a', r:60, hp:2600, speed:42},
  {key:'duelist',   name:'IL DUELLANTE SPECCHIO',color:'#7a8fb0', eye:'#ff5b5b', r:46, hp:2100, speed:104, duelist:true},
  {key:'reaver',    name:'IL RAZZIATORE',        color:'#a06bd6', eye:'#ffd24d', r:48, hp:2300, speed:88},
  {key:'overseer',  name:'IL SORVEGLIANTE',      color:'#4d7a8a', eye:'#7affe0', r:52, hp:2500, speed:70},
  {key:'quaker',    name:'IL SISMICO',           color:'#8a6a3a', eye:'#ffb347', r:64, hp:3000, speed:38},
  {key:'aegis',     name:"L'EGIDA",              color:'#3f6e7a', eye:'#7fe9ff', r:58, hp:2500, speed:52},
];
/* boss affixes — applied from sector 15, add infinite variety */
const BOSS_MODS = [
  {key:'swift',   name:'Veloce',     apply:e=>{ e.speed*=1.35; e.attackCd*=0.8; }},
  {key:'armored', name:'Corazzato',  apply:e=>{ e.maxHp*=1.6; e.hp=e.maxHp; e.dmgTakenMul=0.7; }},
  {key:'volatile',name:'Esplosivo',  apply:e=>{ e.volatile=true; }},
  {key:'undying', name:'Rigenerante',apply:e=>{ e.regenPS=e.maxHp*0.012; }},
  {key:'frenzied',name:'Frenetico',  apply:e=>{ e.enrageAt=0.4; }},
  {key:'colossal',name:'Colossale',  apply:e=>{ e.maxHp*=2.0; e.hp=e.maxHp; e.r*=1.25; e.speed*=0.82; e.score=Math.round((e.score||0)*1.4); }},
  {key:'vengeful',name:'Vendicativo', apply:e=>{ e.dmg*=1.4; e.attackCd*=0.85; e.enrageAt=Math.max(e.enrageAt||0,0.5); }},
  {key:'leech',   name:'Sanguisuga', apply:e=>{ e.regenPS=(e.regenPS||0)+e.maxHp*0.018; e.dmgTakenMul=(e.dmgTakenMul||1)*0.88; }},
  {key:'erratic', name:'Imprevedibile',apply:e=>{ e.speed*=1.5; e.attackCd*=0.7; e.maxHp*=1.2; e.hp=e.maxHp; e.dmg*=0.9; }},
  {key:'spectral',name:'Spettrale',  apply:e=>{ e.dmgTakenMul=(e.dmgTakenMul||1)*0.8; e.speed*=1.2; }},
  {key:'titanic', name:'Titanico',   apply:e=>{ e.maxHp*=1.7; e.hp=e.maxHp; e.dmg*=1.2; e.r*=1.15; }},
  {key:'savage',  name:'Feroce',     apply:e=>{ e.dmg*=1.35; e.speed*=1.2; e.attackCd*=0.85; }},
  {key:'obsidian',name:'Ossidiana',  apply:e=>{ e.maxHp*=1.8; e.hp=e.maxHp; e.dmgTakenMul=(e.dmgTakenMul||1)*0.75; e.r*=1.1; }},
];

/* ---------------------- WEAPONS & ABILITIES ---------------------- */
const WEAPONS = [
  { id:'pistol', name:'Vagabonda', ico:'🔫', price:0, pattern:'single', desc:'Pistola affidabile. Equilibrata, perfora coi perk.',
    rateMul:1.0,  dmgMul:1.0,  speedMul:1.0,  lifeMul:1.0,  bulletR:5, pellets:1, spreadMul:1.0, color:'#ffe0a0', sfx:'wPistol' },
  { id:'shotgun', name:'Spazzino', ico:'💢', price:260, pattern:'spread', desc:'Ventaglio di 6 pallini. Devastante da vicino.',
    rateMul:0.42, dmgMul:0.46, speedMul:0.92, lifeMul:0.55, bulletR:4, pellets:6, spreadMul:0, fanArc:0.62, color:'#ffb84d', sfx:'wShotgun', knock:1.8 },
  { id:'smg', name:'Crepitio', ico:'⚡', price:340, pattern:'single', desc:'Cadenza altissima, danno basso. Tritacarne.',
    rateMul:2.35, dmgMul:0.40, speedMul:1.05, lifeMul:0.85, bulletR:3.5, pellets:1, spreadMul:2.4, color:'#9be8ff', sfx:'wSmg' },
  { id:'railgun', name:'Lancia di Ferro', ico:'🎯', price:520, pattern:'charge', desc:'A carica: trapassa tutto in linea retta.',
    rateMul:0.30, dmgMul:3.4,  speedMul:2.2,  lifeMul:1.8,  bulletR:6, pellets:1, spreadMul:0, pierceBonus:99, chargeTime:0.55, color:'#46e6ff', sfx:'wRail', beam:true },
  { id:'flamer', name:'Forno', ico:'🔥', price:440, pattern:'cone', desc:'Cono di fiamme corto. Incendia i nemici.',
    rateMul:3.2,  dmgMul:0.30, speedMul:0.5,  lifeMul:0.48, bulletR:7, pellets:2, spreadMul:0, fanArc:0.55, color:'#ff7a2d', sfx:'wFlame', burn:true },
  { id:'launcher', name:'Tuono', ico:'☢️', price:600, pattern:'single', desc:'Granate ad area. Folle contro le orde.',
    rateMul:0.55, dmgMul:1.7,  speedMul:0.7,  lifeMul:1.3,  bulletR:8, pellets:1, spreadMul:0.5, forceExplosive:true, blastR:95, color:'#ffd24d', sfx:'wLauncher' },
  { id:'tesla', name:'Folgore', ico:'🌩️', price:560, pattern:'single', desc:'Saette che rimbalzano tra i nemici vicini.',
    rateMul:1.2,  dmgMul:0.72, speedMul:1.4,  lifeMul:0.9,  bulletR:4, pellets:1, spreadMul:1.0, color:'#5db8ff', sfx:'wTesla', chain:3 },
  { id:'cryo', name:'Brina', ico:'❄️', price:480, pattern:'single', desc:'Proiettili che congelano e rallentano i nemici.',
    rateMul:1.5,  dmgMul:0.60, speedMul:1.0,  lifeMul:1.0,  bulletR:5, pellets:1, spreadMul:1.2, color:'#7fefff', sfx:'wCryo', chill:1.6 },
  { id:'minigun', name:'Vendetta', ico:'🔩', price:720, pattern:'single', desc:'Si surriscalda: la cadenza sale a raffica continua.',
    rateMul:1.4,  dmgMul:0.55, speedMul:1.1,  lifeMul:0.9,  bulletR:4, pellets:1, spreadMul:2.0, color:'#ffd27a', sfx:'wMinigun', ramp:true },
  { id:'scythe', name:'Falce', ico:'🌗', price:500, pattern:'spread', desc:'Lame rotanti a corto raggio. Tagliano in ventaglio.',
    rateMul:0.85, dmgMul:1.05, speedMul:0.78, lifeMul:0.6, bulletR:7, pellets:3, spreadMul:0, fanArc:0.9, color:'#c9b3ff', sfx:'wScythe', knock:1.2 },
  { id:'swarm', name:'Sciame', ico:'🐝', price:560, pattern:'single', desc:'Sciame di dardi rapidi che saturano l’area.',
    rateMul:1.8, dmgMul:0.42, speedMul:1.2, lifeMul:0.9, bulletR:3, pellets:3, spreadMul:1.8, color:'#a6ff5b', sfx:'wSwarm' },
  { id:'prism', name:'Prisma', ico:'🔷', price:640, pattern:'single', desc:'Raggio di luce che perfora in linea retta.',
    rateMul:0.9, dmgMul:1.5, speedMul:1.9, lifeMul:1.4, bulletR:5, pellets:1, spreadMul:0.2, pierceBonus:2, color:'#c98bff', sfx:'wPrism' },
  { id:'marksman', name:'Tiratore Scelto', ico:'🎯', price:680, pattern:'single', desc:'Fucile di precisione: colpi rari ma devastanti e perforanti.',
    rateMul:0.5, dmgMul:2.3, speedMul:1.9, lifeMul:1.7, bulletR:5, pellets:1, spreadMul:0.15, pierceBonus:2, color:'#ff5a4d', sfx:'wMarks' },
  { id:'hailstorm', name:'Tempesta di Schegge', ico:'🧊', price:560, pattern:'spread', desc:'Raffica ad arco di schegge gelide. Rallenta le orde.',
    rateMul:0.62, dmgMul:0.52, speedMul:1.0, lifeMul:0.7, bulletR:4, pellets:5, spreadMul:0, fanArc:0.95, color:'#9fe9ff', sfx:'wHail', chill:1.0, knock:1.2 },
  { id:'ricochet', name:'Rimbalzo', ico:'🔆', price:620, pattern:'single', desc:'Dischi che rimbalzano da un nemico all’altro: puliscono le orde.',
    rateMul:0.82, dmgMul:0.98, speedMul:1.2, lifeMul:1.6, bulletR:5, pellets:1, spreadMul:0.5, color:'#ff7ae0', sfx:'wRicochet', bounce:3 },
];
// per-weapon PROJECTILE LOOK so guns read distinctly (not all the same colored blob). Drawn in Bullet.draw.
const WEAPON_STYLE = {
  pistol:'bolt', shotgun:'pellet', smg:'tracer', railgun:'lance', flamer:'flame', launcher:'orb',
  tesla:'elec', cryo:'shard', minigun:'slug', scythe:'crescent', swarm:'dart', prism:'ray',
  marksman:'needle', hailstorm:'sliver', ricochet:'disc',
};
// friendly names for the "killed by X" line on the death screen
const NAME_ENEMY={ walker:'un Deforme', runner:'un Fulmineo', spitter:'uno Sputatore', brute:'un Bruto', bomber:'un Esplosivo', shielder:'uno Scudato', swarmer:'un Nido', mite:'uno Sciamante', leaper:'un Saltatore', healer:'un Guaritore', sniper:'un Cecchino', blinker:'un Lampo', bubbler:'un Incapsulato', summoner:'un Evocatore', zealot:'uno Zelota', rammer:'un Demolitore', wraith:'uno Spettro', gunner:'un Fuciliere', brawler:'un Picchiatore', looter:'uno Sciacallo' };
const NAME_ENEMY_EN={ walker:'a Shambler', runner:'a Sprinter', spitter:'a Spitter', brute:'a Brute', bomber:'a Bomber', shielder:'a Shielder', swarmer:'a Brood', mite:'a Mite', leaper:'a Leaper', healer:'a Healer', sniper:'a Sniper', blinker:'a Blinker', bubbler:'a Bubbler', summoner:'a Summoner', zealot:'a Zealot', rammer:'a Rammer', wraith:'a Wraith', gunner:'a Gunner', brawler:'a Brawler', looter:'a Scavenger' };
const ABILITIES = [
  { id:'turret', name:'Sentinella',  ico:'🛰️', price:0,   cd:14, desc:'Piazza una torretta che spara 8s.', sfx:'aTurret' },
  { id:'shock',  name:'Onda d’Urto', ico:'💥', price:300, cd:9,  desc:'Esplosione AoE che respinge e danneggia.', sfx:'aShock' },
  { id:'slow',   name:'Distorsione', ico:'⏳', price:380, cd:18, desc:'Rallenta i nemici del 70% per 4s.', sfx:'aSlow' },
  { id:'shield', name:'Barriera',    ico:'🛡️', price:340, cd:16, desc:'Invulnerabile 3s.', sfx:'aShield' },
  { id:'bunker', name:'Riparo', ico:'🧱', price:420, cd:20, desc:'Erige un muro che blocca i nemici per 6s.', sfx:'aShield' },
  { id:'rally',  name:'Richiamo', ico:'📡', price:460, cd:22, desc:'Evoca 2 sentinelle e ti cura del 25%.', sfx:'aTurret' },
  { id:'nova',   name:'Supernova', ico:'☄️', price:500, cd:20, desc:'Detonazione ad ampio raggio: danno enorme e respinge.', sfx:'aNova' },
  { id:'singularity', name:'Singolarità', ico:'🌀', price:540, cd:22, desc:'Crea un pozzo gravitazionale: risucchia le orde, poi implode.', sfx:'aSing' },
];
// per-ability activation flair: distinct colour + a shockwave RING sized to the effect radius (shows reach & feels unique)
const AB_FX = {
  turret:{ col:'#9be8ff', ring:64 },
  shock: { col:'#ffae42', ring:220, shake:[13,0.35] },
  slow:  { col:'#c77bff', ring:300 },
  shield:{ col:'#7fc9ff', ring:54 },
  bunker:{ col:'#bfe6ff', ring:96 },
  rally: { col:'#ffd24d', ring:84 },
  nova:  { col:'#ff7a2d', ring:340, shake:[18,0.5] },
  singularity:{ col:'#b06bff', ring:330 },
};

/* ---------------------- WEAPON MASTERY (permanent, cross-run) ---------------------- */
// Per-level cumulative XP thresholds. 0 kills = L0. L10 = evolved.
const MASTERY_XP = [0, 80, 220, 460, 820, 1350, 2100, 3150, 4600, 6600, 9500];
const MASTERY_MAX = 10;
const WEAPON_UP_MAX = 5;     // scrap-purchasable per-weapon power levels (on top of kill-mastery)
const WEAPON_UP_DMG = 0.08;  // +8% weapon damage per level → +40% at max
const ABILITY_UP_MAX = 3;    // scrap-purchasable per-ability levels
const ABILITY_UP_POW = 0.10; // +10% ability potency per level (damage/duration/heal) → +30% at max
const ABILITY_UP_CD  = 0.08; // -8% ability cooldown per level → -24% at max
// Per-level passive growth + milestone tags (m4/m7) per weapon, applied in applyMastery().
const MASTERY_GROWTH = {
  pistol:   { dmg:0.030, rate:0.020, m4:'pierce', m7:'pierce' },
  shotgun:  { dmg:0.028, rate:0.012, m4:'pellet', m7:'pellet' },
  smg:      { dmg:0.022, rate:0.030, m4:'rate',   m7:'rate'   },
  railgun:  { dmg:0.040, rate:0.010, m4:'pierce', m7:'dmg'    },
  flamer:   { dmg:0.026, rate:0.018, m4:'pellet', m7:'burn'   },
  launcher: { dmg:0.034, rate:0.012, m4:'blast',  m7:'blast'  },
  tesla:    { dmg:0.026, rate:0.016, m4:'chain',  m7:'chain'  },
  cryo:     { dmg:0.024, rate:0.018, m4:'chill',  m7:'chill'  },
  minigun:  { dmg:0.022, rate:0.026, m4:'rate',   m7:'dmg'    },
  scythe:   { dmg:0.030, rate:0.016, m4:'pellet', m7:'dmg'    },
  swarm:    { dmg:0.024, rate:0.020, m4:'pellet', m7:'pellet' },
  prism:    { dmg:0.034, rate:0.012, m4:'pierce', m7:'pierce' },
  marksman:  { dmg:0.040, rate:0.012, m4:'pierce', m7:'dmg'    },
  hailstorm: { dmg:0.026, rate:0.014, m4:'pellet', m7:'chill'  },
  ricochet:  { dmg:0.028, rate:0.016, m4:'bounce', m7:'dmg'    },
};
// Evolution at L10. apply() mutates the per-run weapon CLONE (wc) and/or player (p).
const EVOLUTIONS = {
  pistol:   { evo:'pistol_burst', name:'Tripletta',     desc:'Raffica da 3 colpi rapidi.',
    apply:(wc,p)=>{ wc.pellets=(wc.pellets||1)+2; wc.spreadMul=(wc.spreadMul||1)*0.5; wc.dmgMul*=0.62; } },
  shotgun:  { evo:'shotgun_double', name:'Doppia Canna', desc:'+4 pallini, arco piu ampio.',
    apply:(wc,p)=>{ wc.pellets+=4; wc.fanArc=(wc.fanArc||0.62)*1.25; wc.dmgMul*=0.78; wc.knock=(wc.knock||1)*1.3; } },
  smg:      { evo:'smg_dual', name:'Doppia',            desc:'Spara da due canne (raddoppia i colpi).',
    apply:(wc,p)=>{ wc.pellets=(wc.pellets||1)*2; wc.dmgMul*=0.62; wc.spreadMul=(wc.spreadMul||1)*1.2; } },
  railgun:  { evo:'rail_beam', name:'Raggio Continuo',  desc:'Carica piu veloce, raggio perforante.',
    apply:(wc,p)=>{ wc.chargeTime=(wc.chargeTime||0.55)*0.55; wc.dmgMul*=0.55; wc.bulletR+=2; } },
  flamer:   { evo:'flame_inferno', name:'Inferno',      desc:'Cono piu ampio, incendio devastante.',
    apply:(wc,p)=>{ wc.fanArc=(wc.fanArc||0.5)*1.6; wc.pellets+=2; wc.evoBurnMul=2.0; } },
  launcher: { evo:'launch_cluster', name:'Grappolo',    desc:'La granata si frammenta in 4 schegge.',
    apply:(wc,p)=>{ wc.cluster=4; wc.dmgMul*=0.86; wc.blastR=(wc.blastR||95)*0.9; } },
  tesla:    { evo:'tesla_storm', name:'Tempesta',       desc:'Le saette rimbalzano su molti piu nemici.',
    apply:(wc,p)=>{ wc.chain=(wc.chain||3)+4; wc.dmgMul*=0.82; } },
  cryo:     { evo:'cryo_absolute', name:'Zero Assoluto', desc:'Congela del tutto: i nemici gelati si infrangono.',
    apply:(wc,p)=>{ wc.chill=(wc.chill||1.6)*1.4; wc.shatter=true; wc.dmgMul*=0.9; } },
  minigun:  { evo:'mini_overdrive', name:'Sovraccarico', desc:'Si surriscalda prima e colpisce piu forte a regime.',
    apply:(wc,p)=>{ wc.rampMax=2.6; wc.dmgMul*=0.92; } },
  scythe:   { evo:'scythe_reaper', name:'Mietitrice',   desc:'Le lame tornano indietro come boomerang.',
    apply:(wc,p)=>{ wc.boomerang=true; wc.pellets+=1; wc.dmgMul*=0.88; } },
  swarm:    { evo:'swarm_hive', name:'Alveare',         desc:'Sciame piu fitto, cerca i nemici.',
    apply:(wc,p)=>{ wc.pellets+=2; wc.homing=1.0; wc.dmgMul*=0.8; } },
  prism:    { evo:'prism_split', name:'Rifrazione',     desc:'Ogni raggio perfora di piu.',
    apply:(wc,p)=>{ wc.refract=true; wc.pierceBonus=(wc.pierceBonus||0)+2; wc.dmgMul*=0.85; } },
  marksman: { evo:'marksman_pierce', name:'Penetratore', desc:'Il colpo trapassa ogni nemico in linea.',
    apply:(wc,p)=>{ wc.pierceBonus=(wc.pierceBonus||0)+6; wc.bulletR+=1; wc.dmgMul*=0.72; } },
  hailstorm:{ evo:'hail_blizzard', name:'Bufera',        desc:'Sciame piu fitto: i gelati si infrangono.',
    apply:(wc,p)=>{ wc.pellets+=3; wc.chill=(wc.chill||1)*1.4; wc.shatter=true; wc.dmgMul*=0.82; } },
  ricochet: { evo:'ricochet_chaos', name:'Caos',          desc:'Rimbalza tra molti piu nemici.',
    apply:(wc,p)=>{ wc.bounce=(wc.bounce||0)+3; wc.dmgMul*=0.9; } },
};

/* ---------------------- CHARACTERS (sopravvissuti) ---------------------- */
const CHARACTERS = [
  { id:'drifter', name:'VAGABONDO', ico:'🧭', tint:'#8b94a3', style:'Equilibrato · tuttofare',
    desc:'Nessun punto debole. +8% rottami raccolti.', cost:0, req:null,
    stat:{}, weapon:null, ability:null, apply:p=>{ p.charScrapMul=1.08; } },
  { id:'jackal', name:'SCIACALLO', ico:'🦊', tint:'#ffd24d', style:'Glass cannon · evasivo',
    desc:'-25% HP, +22% danno, +15% velocità. Schivata 12%.', cost:1200, req:null,
    stat:{ maxHp:0.75, damage:1.22, speed:1.15, dashCd:0.8 }, weapon:'smg', ability:null, apply:p=>{ p.dodge=0.12; } },
  { id:'bulwark', name:'BASTIONE', ico:'🛡️', tint:'#4f86b0', style:'Tank · mischia',
    desc:'+40% HP, +20% riduzione danni, -12% velocità, -10% cadenza. Spine.', cost:2000, req:null,
    stat:{ maxHp:1.40, speed:0.88, fireRate:0.90 }, weapon:'shotgun', ability:'shield',
    apply:p=>{ p.dr=Math.min(0.85,p.dr+0.20); p.thorns=true; } },
  { id:'pyre', name:'PIROMANE', ico:'🔥', tint:'#ff7a2d', style:'Fuoco · controllo orde',
    desc:'Proiettili incendiari. Più nemici bruciano, più danno (fino +40%).', cost:0, req:{stat:'kills',goal:5000},
    stat:{}, weapon:'flamer', ability:'shock', apply:p=>{ p.burnBonus=true; p.furnace=true; } },
  { id:'warden', name:'RANGER', ico:'🎯', tint:'#46e6ff', style:'Precisione · critico',
    desc:'-10% cadenza, +18% velocità colpo, +1 perforazione, crit 14%. Crit più forti, curano.', cost:0, req:{stat:'bosses',goal:15},
    stat:{ fireRate:0.90, bulletSpeed:1.18 }, weapon:'railgun', ability:null, apply:p=>{ p.pierce+=1; p.crit=0.14; p.steadyEye=true; } },
  { id:'revenant', name:'REVENANT', ico:'☠️', tint:'#c0394a', style:'Berserker · rischio',
    desc:'-20% HP, cura 2 HP per uccisione. Più ferito → più danno (fino +60%). +1 rinascita.', cost:0, req:{stat:'maxLevel',goal:50},
    stat:{ maxHp:0.80 }, weapon:'minigun', ability:'turret', apply:p=>{ p.lifesteal=Math.max(p.lifesteal,2); p.bloodRage=true; p.revives+=1; } },
  { id:'engineer', name:'TECNICO', ico:'🛠️', tint:'#3fc7a0', style:'Droni · supporto',
    desc:'Inizia ogni partita con un drone da guerra alleato. +10% cadenza.', cost:0, req:{stat:'bosses',goal:20},
    stat:{ fireRate:1.10 }, weapon:null, ability:'turret', apply:p=>{ p.startDrones=(p.startDrones||0)+1; } },
  { id:'demo', name:'ARTIFICIERE', ico:'💣', tint:'#b5b03a', style:'Esplosioni · area',
    desc:'Ogni proiettile esplode all impatto. +8% danno, -10% cadenza.', cost:0, req:{stat:'nukes',goal:25},
    stat:{ fireRate:0.90 }, weapon:'launcher', ability:'shock', apply:p=>{ p.explosive=true; p.damage*=1.08; } },
];
function CHAR(id){ return CHARACTERS.find(c=>c.id===id) || CHARACTERS[0]; }

/* ---------------------- COSMETICS (procedural · no assets) ---------------------- */
const COSMETIC_SKINS = [
  { id:'default', name:'STANDARD',     ico:'🧍', tint:null,      aura:null,      desc:'Aspetto originale del sopravvissuto.', unlock:{free:true} },
  { id:'ash',     name:'CENERE',       ico:'🌫️', tint:'#9aa0a6', aura:null,      desc:'Tuta grigio cenere, sobria e funzionale.', unlock:{free:true} },
  { id:'rust',    name:'RUGGINE',      ico:'🟤', tint:'#b5612e', aura:null,      desc:'Lamiera ossidata dal deserto tossico.', unlock:{core:3} },
  { id:'toxic',   name:'CONTAMINATO',  ico:'☢️', tint:'#8fdc3a', aura:'#8fdc3a', desc:'Tuta corrosa, alone radioattivo verde.', unlock:{core:5} },
  { id:'ember',   name:'BRACE',        ico:'🔥', tint:'#ff6a2d', aura:'#ff8a3d', desc:'Armatura incandescente, alone di brace.', unlock:{ach:'imp_wf'} },
  { id:'frost',   name:'GELO',         ico:'❄️', tint:'#7fc9ff', aura:'#bfe9ff', desc:'Corazza brinata, alone glaciale.', unlock:{ach:'imp_wc'} },
  { id:'void',    name:'VUOTO',        ico:'🟣', tint:'#7a4ddb', aura:'#b18cff', desc:'Tessuto del Vuoto, alone violaceo.', unlock:{threat:5} },
  { id:'gold',    name:'CATACLISMA',   ico:'👑', tint:'#ffcf4d', aura:'#ffe39a', desc:'Lega aurea: per chi ha visto il Cataclisma.', unlock:{threat:10} },
  { id:'crimson', name:'CREMISI',      ico:'🟥', tint:'#c0392b', aura:'#ff5b5b', desc:'Corazza cremisi, alone di sangue.', unlock:{core:4} },
  { id:'spectral',name:'SPETTRALE',    ico:'👻', tint:'#bfffe6', aura:'#bfffe6', desc:'Tessuto spettrale traslucido.', unlock:{ach:'imp_b2'} },
  { id:'obsidian',name:'OSSIDIANA',    ico:'🔻', tint:'#3a3550', aura:'#7a4ddb', desc:'Lega di ossidiana, riflessi violacei.', unlock:{core:5} },
  { id:'solar',   name:'SOLARE',       ico:'🌞', tint:'#ffb347', aura:'#ffd86a', desc:'Armatura solare, alone dorato ardente.', unlock:{ach:'imp_l2'} },
  { id:'magma',   name:'MAGMA',        ico:'🌋', tint:'#e8552b', aura:'#ff7a2d', desc:'Corazza incandescente, vene di magma.', unlock:{core:5} },
  { id:'azure',   name:'AZZURRO',      ico:'🔹', tint:'#3a8fd6', aura:'#6ec3ff', desc:'Lega azzurra, riflessi di cielo terso.', unlock:{ach:'imp_b1'} },
];
const COSMETIC_TRAILS = [
  { id:'default', name:'STANDARD',  ico:'•', color:null,      desc:'Proiettili dell’arma equipaggiata.', unlock:{free:true} },
  { id:'amber',   name:'AMBRA',     ico:'🟡', color:'#ffd27a', desc:'Scia ambrata calda.', unlock:{free:true} },
  { id:'cyan',    name:'IONICO',    ico:'🔵', color:'#46e6ff', desc:'Scia ciano elettrica.', unlock:{core:3} },
  { id:'tox',     name:'ACIDO',     ico:'🟢', color:'#8fdc3a', desc:'Scia acida fosforescente.', unlock:{core:4} },
  { id:'plasma',  name:'PLASMA',    ico:'🟣', color:'#c77bff', desc:'Scia di plasma viola.', unlock:{ach:'imp_warm'} },
  { id:'blood',   name:'EMORRAGIA', ico:'🔴', color:'#ff4d57', desc:'Scia rosso sangue.', unlock:{ach:'imp_k2'} },
  { id:'gold',    name:'AUREO',     ico:'🟠', color:'#ffcf4d', desc:'Scia dorata luminosa.', unlock:{threat:7} },
  { id:'violet',  name:'VIOLA',     ico:'🟣', color:'#b07bff', desc:'Scia viola del Vuoto.', unlock:{core:4} },
  { id:'white',   name:'SPETTRO',   ico:'⚪', color:'#eef2f6', desc:'Scia bianca abbagliante.', unlock:{threat:9} },
  { id:'mint',    name:'MENTA',     ico:'🟩', color:'#7affb0', desc:'Scia verde menta luminosa.', unlock:{core:3} },
  { id:'rose',    name:'ROSA',      ico:'🌸', color:'#ff8ad0', desc:'Scia rosa elettrica.', unlock:{core:4} },
  { id:'ruby',    name:'RUBINO',    ico:'🔻', color:'#e02b4a', desc:'Scia rosso rubino profonda.', unlock:{core:5} },
];
const COSMETIC_FX = [
  { id:'default', name:'STANDARD',  ico:'💥', color:'#ff3b3b', style:'burst', desc:'Esplosione di morte classica.', unlock:{free:true} },
  { id:'cinder',  name:'TIZZONE',   ico:'🔥', color:'#ff7a2d', style:'burst', desc:'Esplosione di braci arancioni.', unlock:{free:true} },
  { id:'cryo',    name:'IMPLOSIONE',ico:'❄️', color:'#7fc9ff', style:'ring',  desc:'Onda d’urto glaciale ad anello.', unlock:{core:5} },
  { id:'rad',     name:'FALLOUT',   ico:'☢️', color:'#8fdc3a', style:'ring',  desc:'Detonazione radioattiva ad anello.', unlock:{ach:'imp_b1'} },
  { id:'void',    name:'COLLASSO',  ico:'🕳️', color:'#b18cff', style:'burst', desc:'Collasso del Vuoto, scintille viola.', unlock:{threat:6} },
  { id:'super',   name:'SUPERNOVA', ico:'🌟', color:'#ffcf4d', style:'ring',  desc:'Supernova dorata accecante.', unlock:{threat:10} },
  { id:'shatter', name:'FRANTUMI',  ico:'💠', color:'#7fefff', style:'ring',  desc:'Implosione di schegge di ghiaccio.', unlock:{core:6} },
  { id:'inferno', name:'INFERNO',   ico:'🔥', color:'#ff5b2d', style:'ring',  desc:'Detonazione infernale arancione.', unlock:{ach:'imp_k3'} },
  { id:'quake',   name:'SISMA',     ico:'🟫', color:'#d9a066', style:'ring',  desc:'Onda sismica che squarcia il terreno.', unlock:{core:6} },
  { id:'prism',   name:'PRISMA',    ico:'🔮', color:'#7fefff', style:'burst', desc:'Frammentazione prismatica iridescente.', unlock:{threat:8} },
  { id:'bloom',   name:'FIORITURA', ico:'🌿', color:'#8fdc3a', style:'burst', desc:'Esplosione di spore verdi.', unlock:{core:5} },
];
function COSMETIC(kind,id){
  const tbl = kind==='skin'?COSMETIC_SKINS : kind==='trail'?COSMETIC_TRAILS : COSMETIC_FX;
  return tbl.find(c=>c.id===id) || tbl[0];
}
const COSMETIC_TABS = [
  { kind:'skin',  list:()=>COSMETIC_SKINS,  sel:()=>SaveData.data.cosmetics.skin,  label:'CORPO'  },
  { kind:'trail', list:()=>COSMETIC_TRAILS, sel:()=>SaveData.data.cosmetics.trail, label:'SCIA'   },
  { kind:'fx',    list:()=>COSMETIC_FX,     sel:()=>SaveData.data.cosmetics.fx,    label:'MORTE'  },
];

/* ---------------------- HUB NAV (UI scaffolding) ---------------------- */
const HUB_TILES = [
  { id:'shop',     ico:'⬢',  label:'NEGOZIO',       open:'openShop' },
  { id:'chars',    ico:'☣',  label:'SOPRAVVISSUTI', open:'openChars' },
  { id:'progress', ico:'🏆', label:'PROGRESSI',     open:'openProgress' },
  { id:'settings', ico:'⚙',  label:'IMPOSTAZIONI',  open:'openSettings' },
];
const PROGRESS_ITEMS = [
  { id:'challenges',   ico:'🎯', name:'SFIDE',       desc:'Obiettivi a lungo termine',    open:'openChallenges',
    badge:()=> (typeof Store.challClaimable==='function' ? Store.challClaimable() : 0) },
  { id:'achievements', ico:'🏅', name:'ACHIEVEMENT', desc:'Imprese da sbloccare',         open:'openAchievements',
    badge:()=> (typeof Store.achUnclaimed==='function' ? Store.achUnclaimed() : 0) },
  { id:'codex',        ico:'📖', name:'CODEX',       desc:'Nemici, boss e biomi scoperti', open:'openCodex',
    badge:()=> 0 },
  { id:'market',       ico:'🜲', name:'MERCATO NERO', desc:'Spendi i Nuclei in perk permanenti', open:'openMarket',
    badge:()=> 0 },
  { id:'cosmetics',    ico:'🎨', name:'ASPETTO',     desc:'Skin, scie e finisher', open:'openCosmetics',
    badge:()=> (typeof Store.cosmeticUnclaimed==='function' ? Store.cosmeticUnclaimed() : 0) },
  { id:'stats',        ico:'📊', name:'STATISTICHE', desc:'Record personali e storico run', open:'openStats',
    badge:()=> 0 },
];

/* ---------------------- BIOMES ---------------------- */
const BIOMES = [
  { id:'ash',   name:'CENERE GRIGIA',
    bg:[[21,20,15],[12,11,10],[5,5,7]], grid:[255,180,90], gridA:0.04,
    wall:[255,140,26], wallGlow:18, fog:[[255,140,40],[120,120,110],[90,90,95]], fogA:0.07,
    amb:{col:[200,195,180], a:0.42, v:30, drift:-8, size:[0.6,2.4], n:90, dir:'down'},
    grade:[1.00,0.98,0.92], vate:0.72, decorTint:[120,110,95], hazard:null,
    weights:{walker:3,runner:2,brute:2,swarmer:1} },
  { id:'toxic', name:'DISTESA TOSSICA',
    bg:[[15,26,16],[8,18,10],[3,8,6]], grid:[120,255,140], gridA:0.05,
    wall:[60,230,90], wallGlow:20, fog:[[120,220,80],[80,180,70],[50,120,60]], fogA:0.09,
    amb:{col:[150,230,120], a:0.45, v:-22, drift:10, size:[0.8,2.6], n:70, dir:'up'},
    grade:[0.90,1.06,0.92], vate:0.74, decorTint:[90,150,90], hazard:'acid',
    weights:{spitter:3,swarmer:2,mite:3,healer:2,walker:1} },
  { id:'blood', name:'NOTTE DI SANGUE',
    bg:[[26,13,13],[18,6,6],[7,2,2]], grid:[255,80,80], gridA:0.05,
    wall:[230,40,50], wallGlow:22, fog:[[200,40,40],[150,30,30],[90,20,25]], fogA:0.10,
    amb:{col:[255,90,70], a:0.40, v:-18, drift:6, size:[0.7,2.2], n:80, dir:'up'},
    grade:[1.10,0.86,0.84], vate:0.78, decorTint:[120,60,60], hazard:'pulse',
    weights:{runner:3,leaper:3,walker:2,swarmer:1} },
  { id:'sand',  name:'TEMPESTA DI SABBIA',
    bg:[[28,22,16],[20,16,10],[10,8,5]], grid:[240,200,130], gridA:0.06,
    wall:[220,170,80], wallGlow:16, fog:[[230,200,140],[200,170,110],[160,130,80]], fogA:0.12,
    amb:{col:[230,205,160], a:0.5, v:40, drift:140, size:[0.6,2.0], n:120, dir:'side'},
    grade:[1.08,1.02,0.86], vate:0.80, decorTint:[170,140,90], hazard:'haze',
    weights:{sniper:3,runner:2,spitter:2,walker:1} },
  { id:'rad',   name:'ZONA RADIOATTIVA',
    bg:[[12,16,24],[7,11,18],[3,5,10]], grid:[90,160,255], gridA:0.05,
    wall:[40,150,255], wallGlow:24, fog:[[80,140,255],[60,110,220],[100,200,255]], fogA:0.09,
    amb:{col:[120,220,255], a:0.45, v:-10, drift:8, size:[0.8,2.4], n:90, dir:'up'},
    grade:[0.88,0.94,1.12], vate:0.76, decorTint:[80,110,160], hazard:'rad',
    weights:{spitter:2,bomber:2,healer:2,swarmer:2,mite:2} },
  { id:'ice',   name:'GELO ETERNO',
    bg:[[16,22,30],[10,15,22],[4,7,12]], grid:[150,210,255], gridA:0.05,
    wall:[120,200,255], wallGlow:22, fog:[[170,210,255],[130,180,240],[100,150,210]], fogA:0.10,
    amb:{col:[200,225,255], a:0.5, v:34, drift:18, size:[0.7,2.6], n:110, dir:'down'},
    grade:[0.92,0.98,1.14], vate:0.74, decorTint:[110,150,185], hazard:'frost',
    weights:{brute:3,walker:2,shielder:2,sniper:1} },
  { id:'swamp', name:'PALUDE MARCIA',
    bg:[[16,21,15],[10,15,11],[4,7,6]], grid:[120,180,110], gridA:0.045,
    wall:[90,170,110], wallGlow:16, fog:[[110,150,90],[80,120,70],[55,85,55]], fogA:0.13,
    amb:{col:[150,190,130], a:0.38, v:-8, drift:14, size:[0.9,3.0], n:60, dir:'up'},
    grade:[0.94,1.02,0.90], vate:0.82, decorTint:[80,120,80], hazard:'tar',
    weights:{swarmer:3,mite:3,leaper:2,healer:1,spitter:1} },
  { id:'ruins', name:'CITTÀ IN ROVINA',
    bg:[[20,20,23],[13,13,16],[6,6,8]], grid:[180,190,210], gridA:0.06,
    wall:[150,165,195], wallGlow:14, fog:[[160,170,190],[120,130,150],[80,90,110]], fogA:0.08,
    amb:{col:[190,195,210], a:0.4, v:24, drift:-22, size:[0.6,2.2], n:85, dir:'side'},
    grade:[0.98,0.98,1.04], vate:0.84, decorTint:[120,125,140], hazard:null,
    weights:{sniper:3,shielder:3,bomber:2,walker:1} },
  { id:'lava',  name:'CALDERA INFERNALE',
    bg:[[28,14,8],[18,8,5],[8,3,2]], grid:[255,120,40], gridA:0.06,
    wall:[255,90,30], wallGlow:28, fog:[[255,130,40],[220,80,30],[150,50,25]], fogA:0.11,
    amb:{col:[255,160,80], a:0.5, v:-44, drift:10, size:[0.7,2.4], n:100, dir:'up'},
    grade:[1.18,0.88,0.78], vate:0.80, decorTint:[150,70,45], hazard:'lava',
    weights:{brute:3,bomber:3,leaper:2,runner:1} },
  { id:'snowrad', name:'NEVE RADIOATTIVA',
    bg:[[14,20,22],[9,14,16],[4,7,9]], grid:[140,255,200], gridA:0.055,
    wall:[90,255,180], wallGlow:24, fog:[[150,255,210],[110,220,180],[80,170,150]], fogA:0.10,
    amb:{col:[190,255,230], a:0.52, v:30, drift:30, size:[0.7,2.6], n:115, dir:'down'},
    grade:[0.90,1.10,1.02], vate:0.76, decorTint:[100,160,140], hazard:'fallout',
    weights:{healer:3,swarmer:2,brute:2,shielder:2,sniper:1} },
  { id:'crypt', name:'CRIPTA DIMENTICATA',
    bg:[[18,15,22],[11,9,15],[5,4,8]], grid:[170,140,220], gridA:0.05,
    wall:[150,90,220], wallGlow:20, fog:[[150,110,200],[110,80,160],[70,50,110]], fogA:0.11,
    amb:{col:[180,150,220], a:0.42, v:-14, drift:6, size:[0.6,2.2], n:75, dir:'up'},
    grade:[1.00,0.92,1.10], vate:0.86, decorTint:[110,90,140], hazard:'crypt',
    weights:{healer:3,walker:3,leaper:2,swarmer:2,shielder:1} },
  { id:'flood', name:'PIANA ALLAGATA',
    bg:[[12,18,24],[7,12,18],[3,6,10]], grid:[110,180,210], gridA:0.05,
    wall:[80,170,210], wallGlow:18, fog:[[120,180,210],[90,140,180],[60,100,140]], fogA:0.12,
    amb:{col:[160,200,225], a:0.4, v:18, drift:40, size:[0.7,2.4], n:80, dir:'side'},
    grade:[0.92,1.00,1.08], vate:0.78, decorTint:[90,130,155], hazard:'flood',
    weights:{spitter:3,runner:2,leaper:2,bomber:2,mite:1} },
  { id:'storm', name:'TEMPESTA ELETTRICA',
    bg:[[14,16,28],[8,10,20],[3,4,10]], grid:[120,140,255], gridA:0.06,
    wall:[100,120,255], wallGlow:24, fog:[[120,140,255],[90,110,220],[140,160,255]], fogA:0.10,
    amb:{col:[160,180,255], a:0.46, v:20, drift:60, size:[0.6,2.2], n:100, dir:'side'},
    grade:[0.92,0.94,1.16], vate:0.78, decorTint:[90,100,160], hazard:'rad',
    weights:{blinker:3,sniper:2,spitter:2,zealot:2,runner:1} },
  { id:'bone', name:'OSSARIO',
    bg:[[22,20,18],[14,13,11],[6,6,5]], grid:[220,210,190], gridA:0.05,
    wall:[200,190,160], wallGlow:14, fog:[[210,200,180],[170,160,140],[120,115,100]], fogA:0.09,
    amb:{col:[220,212,196], a:0.42, v:18, drift:-12, size:[0.6,2.2], n:80, dir:'down'},
    grade:[1.04,1.00,0.92], vate:0.84, decorTint:[150,145,128], hazard:'crypt',
    weights:{brute:3,bubbler:2,summoner:2,healer:2,walker:1} },
  { id:'glass', name:'DESERTO DI VETRO',
    bg:[[20,24,28],[12,15,19],[5,7,10]], grid:[150,220,255], gridA:0.06,
    wall:[120,210,255], wallGlow:22, fog:[[180,225,255],[140,190,220],[90,130,160]], fogA:0.09,
    amb:{col:[200,230,255], a:0.40, v:14, drift:6, size:[0.5,2.0], n:70, dir:'down'},
    grade:[0.96,1.00,1.10], vate:0.80, decorTint:[120,150,175], hazard:'haze',
    weights:{sniper:2,blinker:2,runner:2,walker:1,wraith:1} },
  { id:'fungal', name:'FORESTA FUNGINA',
    bg:[[16,20,16],[10,14,12],[4,7,6]], grid:[160,255,170], gridA:0.06,
    wall:[120,230,150], wallGlow:22, fog:[[150,230,150],[120,180,200],[80,120,150]], fogA:0.10,
    amb:{col:[170,255,180], a:0.46, v:-16, drift:8, size:[0.7,2.6], n:80, dir:'up'},
    grade:[0.92,1.08,1.00], vate:0.78, decorTint:[100,150,110], hazard:'acid',
    weights:{swarmer:3,mite:3,spitter:2,healer:1,bubbler:1} },
];
const BIOME_CYCLE = 3;
function mix3(a,b,t){ return [Math.round(U.lerp(a[0],b[0],t)),Math.round(U.lerp(a[1],b[1],t)),Math.round(U.lerp(a[2],b[2],t))]; }
function rgb(c,a){ return a===undefined ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
const Biome = {
  cur:BIOMES[0], prev:BIOMES[0], t:1, dur:1.2, c:{},
  pickFor(level){ return BIOMES[Math.floor((level-1)/BIOME_CYCLE) % BIOMES.length]; },
  setLevel(level){ const next=this.pickFor(level); if(next!==this.cur){ this.prev=this.cur; this.cur=next; this.t=0; } },
  update(dt){
    if(this.t<1) this.t=Math.min(1,this.t+dt/this.dur);
    const k=this.t<1?U.smooth(this.t):1, A=this.prev, B=this.cur, c=this.c;
    c.bg=[mix3(A.bg[0],B.bg[0],k),mix3(A.bg[1],B.bg[1],k),mix3(A.bg[2],B.bg[2],k)];
    c.grid=mix3(A.grid,B.grid,k); c.gridA=U.lerp(A.gridA,B.gridA,k);
    c.wall=mix3(A.wall,B.wall,k); c.wallGlow=U.lerp(A.wallGlow,B.wallGlow,k);
    c.fog=[mix3(A.fog[0],B.fog[0],k),mix3(A.fog[1],B.fog[1],k),mix3(A.fog[2],B.fog[2],k)];
    c.fogA=U.lerp(A.fogA,B.fogA,k);
    c.grade=[U.lerp(A.grade[0],B.grade[0],k),U.lerp(A.grade[1],B.grade[1],k),U.lerp(A.grade[2],B.grade[2],k)];
    c.vate=U.lerp(A.vate,B.vate,k); c.decorTint=mix3(A.decorTint,B.decorTint,k);
    c.hazard=B.hazard; c.amb=B.amb;
  },
};

/* ---------------------- BIOME GAMEPLAY EFFECTS ---------------------- */
// Beyond the localized hazard pools, each themed biome gets ONE always-on signature mechanic so a
// sector actually PLAYS differently — not just a recolor. Resolved per-sector in G.startLevel and
// read by the player (slip/mire/lowvis/healCut), the spawner (fury), and updateBiomeFx (strikes/spores).
const BIOME_FX = {
  toxic:   { kind:'spores',  desc:'Spore corrosive',         en:'Corrosive spores' },
  blood:   { kind:'nomercy', heal:0.45, desc:'Nessuna pietà · cure dimezzate', en:'No mercy · healing halved' },
  sand:    { kind:'lowvis',  vis:0.60, wind:30, desc:'Visibilità ridotta · vento', en:'Low visibility · wind' },
  rad:     { kind:'fury',    spd:1.13, rate:1.16, desc:'Radiazioni · nemici in furia', en:'Radiation · enemies enraged' },
  ice:     { kind:'slip',    grip:0.075, desc:'Ghiaccio · scivoli', en:'Black ice · you slide' },
  swamp:   { kind:'mire',    move:0.84, desc:'Fango · movimento rallentato', en:'Mud · slowed movement' },
  lava:    { kind:'erupt',   period:2.5, desc:'Eruzioni di fuoco', en:'Fire eruptions' },
  snowrad: { kind:'fury',    spd:1.10, rate:1.10, slip:true, grip:0.065, desc:'Furia · ghiaccio', en:'Frenzy · ice' },
  crypt:   { kind:'raise',   chance:0.22, desc:'I morti risorgono', en:'The dead rise' },
  flood:   { kind:'slip',    grip:0.09, move:0.92, desc:'Acqua · deriva', en:'Water · drift' },
  storm:   { kind:'storm',   period:2.8, rate:1.08, desc:'Fulmini', en:'Lightning strikes' },
  bone:    { kind:'raise',   chance:0.20, desc:'Ossario · risorgono', en:'Ossuary · they rise' },
  glass:   { kind:'lowvis',  vis:0.66, desc:'Riverbero accecante', en:'Blinding glare' },
  fungal:  { kind:'spores',  heal:0.8, desc:'Spore tossiche', en:'Toxic spores' },
};
// short HUD tag per active biome rule → the player always sees WHY the controls/rules 'fight' them, not just on biome entry
const BFX_TAG = { spores:['SPORE','SPORES'], nomercy:['½ CURE','½ HEAL'], lowvis:['BUIO','LOW VIS'], fury:['FURIA','FURY'], slip:['GHIACCIO','SLIP'], mire:['FANGO','MUD'], erupt:['ERUZIONI','ERUPT'], storm:['FULMINI','STORM'], raise:['RISORGONO','RAISE'] };

// per-biome GROUND DECOR profile → the floor reads distinctly per biome (crystals on ice, lava veins,
// bones in the crypt, mushrooms in the swamp), not just a recolor. Kinds drawn in drawFloor (0-8).
const BIOME_DECOR = {
  ash:[0,0,1,4], toxic:[8,8,1,2], blood:[3,3,2,0], sand:[5,2,0,0], rad:[3,1,4,3], ice:[5,5,5,1],
  swamp:[8,8,1,3], ruins:[0,0,2,4], lava:[7,7,0,3], snowrad:[5,3,1,4], crypt:[6,6,3,2], flood:[1,1,3,8],
  storm:[3,4,1,2], bone:[6,6,6,3], glass:[5,5,2,0], fungal:[8,8,8,1],
};
function decorKind(){ const k=(typeof BIOME_DECOR!=='undefined'&&BIOME_DECOR[Biome.cur.id])||[0,1,2,3,4]; return U.pick(k); }

/* ---------------------- ZONE THEMES (the readable skeleton) ---------------------- */
// A "zone" = 5 sectors, the last one is the boss. Each zone has a DETERMINISTIC theme (so the player
// LEARNS what each zone does) that changes how it plays — not a random mutator. Zone 1 is a gentle intro,
// then zones 2..9 cycle through the roster in a fixed order, then repeat. The boss is always the climax.
const ZONE_THEMES = [
  { id:'outpost',   name:'AVAMPOSTO',   en:'OUTPOST',   desc:'Ondate regolari.',                 descEn:'Steady waves.' },
  { id:'snipers',   name:'TIRATORI',    en:'MARKSMEN',  desc:'Nemici a distanza ovunque.',        descEn:'Ranged foes everywhere.',  ranged:0.6 },
  { id:'swarm',     name:'SCIAME',      en:'SWARM',     desc:'Marea di nemici veloci.',           descEn:'A tide of fast enemies.',  qMul:1.6, capAdd:18, intMul:0.7, spd:1.06 },
  { id:'siege',     name:'ASSEDIO',     en:'SIEGE',     desc:'Pressione costante, niente tregua.',descEn:'Relentless pressure.',     qMul:1.35, intMul:0.62, capAdd:14 },
  { id:'veterans',  name:'VETERANI',    en:'VETERANS',  desc:'Pochi ma corazzati: élite.',        descEn:'Few but armored: elites.', qMul:0.65, elite:0.8, hp:1.2 },
  { id:'hunt',      name:'CACCIA',      en:'THE HUNT',  desc:'Nemici furiosi: veloci e cattivi.', descEn:'Enraged: fast and vicious.',spd:1.2, rate:1.22 },
  { id:'champions', name:'CAMPIONI',    en:'CHAMPIONS', desc:'Mini-boss in agguato.',             descEn:'Mini-bosses lurk.',        champ:0.3 },
  { id:'minefield', name:'CAMPO MINATO',en:'MINEFIELD', desc:'Insidie ambientali ovunque.',       descEn:'Hazards everywhere.',      hazards:2.0 },
  { id:'cache',     name:'RIFORNIMENTI',en:'SUPPLY',    desc:'Bottino abbondante: fai scorta.',   descEn:'Rich loot: stock up.',     bounty:true, qMul:0.85 },
  { id:'blackout',  name:'OSCURITÀ',    en:'BLACKOUT',  desc:'Visibilità ridotta · bottino ricco.',descEn:'Low sight · rich loot.',  dark:0.58, bounty:true, qMul:0.82, capAdd:-6 },
  { id:'treasure',  name:'CACCIA AL TESORO',en:'TREASURE RUN',desc:'Sciacalli ovunque: insegui il bottino.',descEn:'Scavengers everywhere: chase the loot.', treasure:true, bounty:true, qMul:0.8 },
];
function zoneTheme(zone){ return (zone<=1) ? ZONE_THEMES[0] : ZONE_THEMES[1 + ((zone-2) % (ZONE_THEMES.length-1))]; }

/* biome-weighted enemy pick */
Biome._wkey=''; Biome._wpool=null;
function weightedType(types){
  const w=Biome.cur.weights; if(!w) return U.pick(types);
  const key=Biome.cur.id+'|'+types.join(',');
  if(Biome._wkey!==key){ const pool=[]; for(const t of types){ const n=Math.max(1,w[t]||1); for(let i=0;i<n;i++) pool.push(t); } Biome._wpool=pool; Biome._wkey=key; }
  return U.pick(Biome._wpool);
}

/* ---------------------- PER-RUN UPGRADES ---------------------- */
const UPGRADES = [
  {id:'rate',  name:'Grilletto Rapido', ico:'⚡', desc:'+22% cadenza di fuoco', apply:p=>p.fireRate*=1.22},
  {id:'dmg',   name:'Calibro Pesante',  ico:'💥', desc:'+28% danno proiettile', apply:p=>p.damage*=1.28},
  {id:'multi', name:'Raffica',          ico:'🔱', desc:'+1 proiettile per colpo', apply:p=>p.multishot+=1},
  {id:'pierce',name:'Perforanti',       ico:'🎯', desc:'I proiettili trapassano +1 nemico', apply:p=>p.pierce+=1},
  {id:'speed', name:'Adrenalina',       ico:'🏃', desc:'+14% velocità di movimento', apply:p=>p.speed*=1.14},
  {id:'hp',    name:'Vitalità',         ico:'❤️', desc:'+30 HP max e cura completa', apply:p=>{p.maxHp+=30;p.hp=p.maxHp;}},
  {id:'range', name:'Canna Lunga',      ico:'📡', desc:'+25% gittata e velocità colpo', apply:p=>{p.bulletLife*=1.25;p.bulletSpeed*=1.18;}},
  {id:'crit',  name:'Punte Cave',       ico:'✴️', desc:'+12% probabilità di critico (x2,5)', apply:p=>p.crit+=0.12},
  {id:'regen', name:'Rigenerazione',    ico:'🧬', desc:'Recuperi 1.5 HP/s', apply:p=>p.regen+=1.5},
  {id:'cool',  name:'Riflessi',         ico:'💨', desc:'-22% ricarica abilità e scatto', apply:p=>{p.dashCd*=0.78; p.abCdMul=(p.abCdMul||1)*0.78;}},
  {id:'swift', name:'Passo Felino',      ico:'🐾', desc:'+18% velocità e -20% ricarica scatto', apply:p=>{p.speed*=1.18;p.dashCd*=0.8;}},
  {id:'hardy', name:'Pelle Dura',        ico:'🧱', desc:'-15% danno subìto', apply:p=>p.dr=Math.min(0.6,(p.dr||0)+0.15)},
  {id:'chillp',name:'Munizioni Crio',    ico:'❄️', desc:'I proiettili rallentano i nemici', apply:p=>p.chillBonus=1.2},
  {id:'burnp', name:'Munizioni Incendiarie', ico:'🔥', desc:'I proiettili incendiano i nemici', apply:p=>p.burnBonus=true},
  {id:'chainp',name:'Conduttore',        ico:'🌩️', desc:'I proiettili rimbalzano su +1 nemico', apply:p=>p.chainBonus=(p.chainBonus||0)+1},
  {id:'glass', name:'Cannone di Vetro',  ico:'🔮', rare:true, desc:'+45% danno, -20% HP max', apply:p=>{p.damage*=1.45;p.maxHp*=0.8;p.hp=Math.min(p.hp,p.maxHp);}},
  {id:'exec',  name:'Esecuzione',        ico:'🔪', rare:true, desc:'Uccidi i nemici comuni sotto il 10% di vita', apply:p=>p.execute=0.10},
  {id:'vamp',  name:'Sanguisuga',  ico:'🩸', rare:true, desc:'Curi 2 HP per nemico ucciso', apply:p=>p.lifesteal+=2},
  {id:'boom',  name:'Esplosivi',   ico:'☢️', rare:true, desc:'I proiettili esplodono all’impatto', apply:p=>p.explosive=true},
  {id:'thorn', name:'Corazza Spinata', ico:'🛡️', rare:true, desc:'+20 HP max e rifletti danno da contatto', apply:p=>{p.maxHp+=20;p.hp+=20;p.thorns=true;}},
  {id:'scav',  name:'Recupero',        ico:'🧲', desc:'Cura HP per rottame raccolto (scala con la salute max)', apply:p=>{ p.scrapHeal=(p.scrapHeal||0)+1; }},
  {id:'focus', name:'Mira Stabile',    ico:'🔭', desc:'-30% dispersione, +12% velocità colpo', apply:p=>{ p.spread*=0.7; p.bulletSpeed*=1.12; }},
  {id:'second',name:'Seconda Pelle',   ico:'🦴', desc:'+18 HP max e 2s di invulnerabilità a inizio settore', apply:p=>{ p.maxHp+=18; p.hp+=18; p.sectorGuard=2; }},
  {id:'overcharge',name:'Sovraccarico', ico:'⚛️', rare:true, desc:'+10% critico; potenzia incendio, gelo e catena se attivi', apply:p=>{ p.crit+=0.10; if(p.burnBonus) p.burnMul=(p.burnMul||1)*1.5; if(p.chillBonus) p.chillBonus*=1.3; if(p.chainBonus) p.chainBonus+=1; }},
  {id:'splinter',name:'Scheggia',      ico:'🔱', desc:'+1 proiettile per colpo', apply:p=>{ p.multishot+=1; }},
  {id:'siphon',  name:'Sifone',        ico:'🧛', desc:'Cura 1 HP per nemico ucciso', apply:p=>{ p.lifesteal=(p.lifesteal||0)+1; }},
  {id:'juggvest',name:'Corazza Pesante',ico:'🦺', rare:true, desc:'+25 HP max e -10% danno subito', apply:p=>{ p.maxHp+=25; p.hp+=25; p.dr=Math.min(0.6,(p.dr||0)+0.10); }},
];

/* ---------------------- RELIQUIE (per-run artifacts) ---------------------- */
const RELICS = [
  { id:'orbit', name:'Lame Orbitanti', ico:'🌀', rarity:'common',
    desc:'Tre lame ruotano attorno a te infliggendo danno da contatto.',
    apply(p){ p.relOrbit=(p.relOrbit||0)+3; } },
  { id:'predator', name:'Istinto Predatore', ico:'🦅', rarity:'common',
    desc:'+45% danno contro nemici a vita piena.',
    apply(p){ p.relFullHpDmg=(p.relFullHpDmg||0)+0.45; } },
  { id:'sharpshot', name:'Colpo Marchiato', ico:'🎯', rarity:'common',
    desc:'Ogni 5° colpo è un critico garantito.',
    apply(p){ p.relNthCrit = p.relNthCrit ? Math.max(3, p.relNthCrit-1) : 5; } },
  { id:'magvac', name:'Vortice Avido', ico:'🧲', rarity:'common',
    desc:'+120% raggio di raccolta e +20% rottami raccolti.',
    apply(p){ p.magnet=(p.magnet||1)+1.2; p.relGreed=(p.relGreed||0)+0.20; } },
  { id:'momentum', name:'Slancio', ico:'💨', rarity:'common',
    desc:'Dopo uno scatto: +35% danno per 2,5s.',
    apply(p){ p.relDashDmg=Math.min(0.7,(p.relDashDmg||0)+0.35); } },
  { id:'overheat', name:'Surriscaldo', ico:'🔥', rarity:'common',
    desc:'I proiettili incendiano e infliggono +25% danno da fuoco.',
    apply(p){ p.burnBonus=true; p.relBurnAmp=Math.min(2.0,(p.relBurnAmp||1)+0.25); } },
  { id:'bulwark', name:'Bastione', ico:'🛡️', rarity:'common',
    desc:'+40 HP max e rifletti il 60% del danno da contatto.',
    apply(p){ p.maxHp+=40; p.hp+=40; p.thorns=true; p.thornsMul=Math.max(p.thornsMul||0.6,0.6); p.relReflect=Math.min(0.9,(p.relReflect||0)+0.6); } },   // 60% reflect (thorns), matches desc
  { id:'leech', name:'Sanguisuga Critica', ico:'🩸', rarity:'common',
    desc:'Ogni critico ti cura 4 HP.',
    apply(p){ p.relCritHeal=(p.relCritHeal||0)+4; } },
  { id:'splitshot', name:'Sciame Spettrale', ico:'🔱', rarity:'common',
    desc:'+1 proiettile e +10% probabilità critico.',
    apply(p){ p.multishot+=1; p.crit+=0.10; } },
  { id:'detonator', name:'Detonatore', ico:'💥', rarity:'rare',
    desc:'I critici fanno esplodere i nemici in un raggio.',
    apply(p){ p.relCritBoom=Math.min(3,(p.relCritBoom||0)+1); } },
  { id:'phantom', name:'Falce Fantasma', ico:'👻', rarity:'rare',
    desc:'Uccidere un nemico fa trapassare il proiettile.',
    apply(p){ p.relPierceOnKill=true; } },
  { id:'reaper', name:'Mietitore', ico:'🔪', rarity:'rare',
    desc:'Esegui i nemici comuni sotto il 18% di vita; +15% danno ai boss.',
    apply(p){ p.execute=Math.max(p.execute||0,0.18); p.relBossDmg=Math.min(0.6,(p.relBossDmg||0)+0.15); } },
  { id:'timewarp', name:'Distorsione', ico:'⏳', rarity:'rare',
    desc:'Sotto il 30% di vita il tempo rallenta attorno a te.',
    apply(p){ p.relTimeDilate=true; } },
  { id:'thunder', name:'Tempesta Statica', ico:'🌩️', rarity:'rare',
    desc:'I proiettili rimbalzano su +2 nemici e rallentano.',
    apply(p){ p.chainBonus=(p.chainBonus||0)+2; p.chillBonus=Math.max(p.chillBonus||0,1.2); } },
  { id:'glasscannon', name:'Cuore di Vetro', ico:'🔮', rarity:'rare',
    desc:'+70% danno ma -30% HP max. Alto rischio, alta ricompensa.',
    apply(p){ p.damage*=1.7; p.maxHp=Math.round(p.maxHp*0.7); p.hp=Math.min(p.hp,p.maxHp); } },
  { id:'secondwind', name:'Ultimo Respiro', ico:'💀', rarity:'rare', locked:true,
    desc:'Rinasci una volta in più con invulnerabilità prolungata.',
    apply(p){ p.revives+=1; p.relReviveInvuln=4.0; } },
  { id:'berserk', name:'Furia di Sangue', ico:'😡', rarity:'rare', locked:true,
    desc:'Più sei ferito, più colpisci forte (fino a +60% danno e +30% cadenza).',
    apply(p){ p.bloodRage=true; p.relRageRate=Math.min(0.3,(p.relRageRate||0)+0.3); } },
  { id:'avarice', name:'Avidità', ico:'💎', rarity:'rare', locked:true,
    desc:'+50% rottami, +25% danno, ma -25% HP max.',
    apply(p){ p.relGreed=(p.relGreed||0)+0.5; p.damage*=1.25; p.maxHp=Math.round(p.maxHp*0.75); p.hp=Math.min(p.hp,p.maxHp); } },
  { id:'twincore', name:'Nucleo Gemello', ico:'🔱', rarity:'common',
    desc:'+1 proiettile e +12% velocità colpo.',
    apply(p){ p.multishot+=1; p.bulletSpeed*=1.12; } },
  { id:'titanheart', name:'Cuore di Titano', ico:'🫀', rarity:'common',
    desc:'+60 HP max e +2 HP/s di rigenerazione.',
    apply(p){ p.maxHp+=60; p.hp+=60; p.regen+=2; } },
  { id:'venomgland', name:'Ghiandola Velenosa', ico:'🧪', rarity:'common',
    desc:'I proiettili incendiano e rallentano i nemici.',
    apply(p){ p.burnBonus=true; p.chillBonus=Math.max(p.chillBonus||0,1.0); } },
  { id:'duelblade', name:'Lama del Duellante', ico:'⚔️', rarity:'rare',
    desc:'+30% danno e +15% cadenza, ma -1 perforazione.',
    apply(p){ p.damage*=1.30; p.fireRate*=1.15; p.pierce=Math.max(0,p.pierce-1); } },
  { id:'gravwell', name:'Pozzo Gravitazionale', ico:'🌌', rarity:'rare',
    desc:'+200% raggio di raccolta; i tuoi colpi rallentano.',
    apply(p){ p.magnet=(p.magnet||1)+2; p.chillBonus=Math.max(p.chillBonus||0,1.4); } },
  { id:'overclock', name:'Overclock', ico:'⏱️', rarity:'rare',
    desc:'+40% cadenza e +1 proiettile, ma -15% danno.',
    apply(p){ p.fireRate*=1.40; p.damage*=0.85; p.multishot+=1; } },
  { id:'wardrone', name:'Drone da Guerra', ico:'🛸', rarity:'common',
    desc:'Un drone alleato ti segue e spara ai nemici per tutta la partita.',
    apply(p){ if(G.companions) G.companions.push(new Companion('gun')); } },
  { id:'medidrone', name:'Drone Medico', ico:'🚁', rarity:'rare',
    desc:'Un drone curativo ti segue e rigenera i tuoi HP nel tempo.',
    apply(p){ if(G.companions) G.companions.push(new Companion('heal')); } },
  { id:'scrapdrone', name:'Drone Recuperatore', ico:'🛰️', rarity:'common',
    desc:'Un drone attira a te i rottami da grande distanza.',
    apply(p){ if(G.companions) G.companions.push(new Companion('scrap')); } },
  { id:'juggernaut', name:'Giuggernaut', ico:'🦾', rarity:'rare',
    desc:'+55 HP max, -15% danno subito e riflette il 50% del danno da contatto.',
    apply(p){ p.maxHp+=55; p.hp+=55; p.dr=Math.min(0.6,(p.dr||0)+0.15); p.relReflect=(p.relReflect||0)+0.5; } },
  { id:'assassin', name:'Istinto Assassino', ico:'🗡️', rarity:'common',
    desc:'+22% probabilità di critico e +15% danno.',
    apply(p){ p.crit+=0.22; p.damage*=1.15; } },
  { id:'pyroclasm', name:'Piroclasto', ico:'🌋', rarity:'rare',
    desc:'I proiettili incendiano e il danno da fuoco è amplificato del 60%.',
    apply(p){ p.burnBonus=true; p.relBurnAmp=(p.relBurnAmp||1)*1.6; } },
  { id:'permafrost', name:'Permafrost', ico:'🧊', rarity:'common',
    desc:'I colpi rallentano fortemente i nemici e +1 perforazione.',
    apply(p){ p.chillBonus=Math.max(p.chillBonus||0,1.5); p.pierce+=1; } },
  { id:'bloodpact', name:'Patto di Sangue', ico:'🩸', rarity:'rare',
    desc:'+35% danno e cura 2 HP per uccisione, ma -25% HP max.',
    apply(p){ p.damage*=1.35; p.lifesteal=(p.lifesteal||0)+2; p.maxHp=Math.round(p.maxHp*0.75); p.hp=Math.min(p.hp,p.maxHp); } },
  { id:'executioner', name:'Carnefice', ico:'🪓', rarity:'rare',
    desc:'Giustizia i nemici comuni sotto il 15% HP e +20% danno ai boss.',
    apply(p){ p.execute=Math.max(p.execute||0,0.15); p.relBossDmg=(p.relBossDmg||0)+0.20; } },
  { id:'vortex', name:'Vortice Magnetico', ico:'🧲', rarity:'common',
    desc:'+150% raggio di raccolta e +10% probabilità di critico.',
    apply(p){ p.magnet=(p.magnet||1)+1.5; p.crit+=0.10; } },
  { id:'phoenix', name:'Cuore di Fenice', ico:'🔥', rarity:'rare',
    desc:'+1 rinascita con invulnerabilità prolungata e +1.5 HP/s.',
    apply(p){ p.revives+=1; p.regen+=1.5; p.relReviveInvuln=Math.max(p.relReviveInvuln||0,3.5); } },
  { id:'hivemind', name:'Mente Alveare', ico:'🧠', rarity:'rare',
    desc:'Evoca un drone da guerra e tutti i tuoi droni sparano il 40% più veloci.',
    apply(p){ p.droneRateMul=(p.droneRateMul||1)*0.6; if(G.companions) G.companions.push(new Companion('gun')); } },
  { id:'decapitator', name:'Mannaia del Boia', ico:'🪓', rarity:'rare',
    desc:'+15% critico e giustizia i nemici (non boss) sotto il 22% di vita.',
    apply(p){ p.crit+=0.15; p.execute=Math.max(p.execute||0,0.22); } },
  { id:'elementalist', name:'Elementalista', ico:'🌈', rarity:'rare',
    desc:'I tuoi colpi incendiano, rallentano E rimbalzano. Danno da fuoco +30%.',
    apply(p){ p.burnBonus=true; p.chillBonus=Math.max(p.chillBonus||0,1.0); p.chainBonus=(p.chainBonus||0)+1; p.relBurnAmp=(p.relBurnAmp||1)*1.3; } },
  // ── KEYSTONES: rule-bending picks that DEFINE a build (one flag + one hook each) ──
  { id:'conflag', name:'Conflagrazione', ico:'🔥', rarity:'keystone',
    desc:'I tuoi colpi incendiano. I nemici che bruciano ESPLODONO alla morte, propagando il fuoco.',
    apply(p){ p.burnBonus=true; p.relConflag=true; } },
  { id:'glassstorm', name:'Tempesta di Vetro', ico:'💥', rarity:'keystone',
    desc:'+5% critico. Ogni 6° critico scatena una RAFFICA a 360°.',
    apply(p){ p.crit+=0.05; p.relGlassStorm=true; } },
  { id:'staticfield', name:'Campo Statico', ico:'⚡', rarity:'keystone',
    desc:'+2 rimbalzi catena. La catena salta anche ai nemici con status e i suoi colpi possono fare critico.',
    apply(p){ p.chainBonus=(p.chainBonus||0)+2; p.relStatic=true; } },
  { id:'bloodengine', name:'Motore di Sangue', ico:'🩸', rarity:'keystone',
    desc:'+1 cura per uccisione. Curarti ti carica: danno crescente finché continui a uccidere (max +30%).',
    apply(p){ p.lifesteal=(p.lifesteal||0)+1; p.relBloodEngine=true; } },
];
/* locked relics unlocked by claiming these achievements */
const RELIC_ACH_UNLOCK = { imp_bn:'secondwind', imp_c1:'berserk', imp_s1:'avarice' };
function unlockedRelics(){ const u=(SaveData.data.relicsUnlocked)||{}; return RELICS.filter(r=>!r.locked||u[r.id]); }
function unlockRelic(id){
  if(!SaveData.data.relicsUnlocked) SaveData.data.relicsUnlocked={};
  if(SaveData.data.relicsUnlocked[id]) return false;
  SaveData.data.relicsUnlocked[id]=1; SaveData.save();
  if(typeof toast==='function') toast(UL('RELIQUIA SBLOCCATA','RELIC UNLOCKED')); return true;
}
function hasRelic(id){ return !!(G.relics && G.relics.find(r=>r.id===id)); }
function grantRandomRelic(p){
  const owned=new Set((G.relics||[]).map(r=>r.id));
  const pool=unlockedRelics().filter(r=>!owned.has(r.id));
  if(!pool.length) return false;
  const r=U.pick(pool); if(!G.relics) G.relics=[];
  G.relics.push(r); if(r.apply) r.apply(p); banner(TN(EN_RELIC,r),'reliquia'); syncRelicHud(); return true;
}
function buildRelicChoice(){
  const wrap=el('relicCards'); if(!wrap) return; wrap.innerHTML='';
  const owned=new Set((G.relics||[]).map(r=>r.id));
  const pool=unlockedRelics().filter(r=>!owned.has(r.id) && !(G.banished&&G.banished.has(r.id)));
  const picks=[];
  while(picks.length<3 && pool.length){
    let idx;
    for(let tries=0;tries<8;tries++){ idx=U.randInt(0,pool.length-1); const ra=pool[idx].rarity; if((ra!=='rare'&&ra!=='keystone') || U.chance(ra==='keystone'?0.22:0.35)) break; }
    picks.push(pool.splice(idx,1)[0]);
  }
  if(!picks.length){ G.closeRelicChoice(); return; }
  for(const r of picks){
    const isK=r.rarity==='keystone';
    const card=document.createElement('div'); card.className='up-card'+(r.rarity==='rare'?' rare':'')+(isK?' keystone':'');
    const tag = isK?(_T()?'◆ KEYSTONE':'◆ CARDINE') : (r.rarity==='rare'?(_T()?'★ RARE RELIC':'★ RELIQUIA RARA'):(_T()?'RELIC':'RELIQUIA'));
    card.innerHTML=`<div class="ico">${r.ico}</div><div class="name">${TN(EN_RELIC,r)}</div><div class="desc">${TD(EN_RELIC,r)}</div><div class="tag">${tag}</div>`;
    if(isK){ card.style.borderColor='#c77bff'; card.style.boxShadow='0 0 18px rgba(199,123,255,0.5)'; }   // keystones POP
    card.addEventListener('click',()=>{ Audio2.upgrade(); G.takeRelic(r); });
    if(G.banishLeft>0){ const bz=document.createElement('button'); bz.className='banish-btn'; bz.textContent='🚫'; bz.setAttribute('aria-label','Banish');
      bz.addEventListener('click',(ev)=>{ ev.stopPropagation(); if(!G.banished) G.banished=new Set(); G.banished.add(r.id); G.banishLeft--; if(window.Audio2&&Audio2.hurt) Audio2.hurt(); buildRelicChoice(); }); card.appendChild(bz); }
    wrap.appendChild(card);
  }
}
function syncRelicHud(){
  const w=el('relicHud'); if(!w) return;
  const list=G.relics||[];
  w.innerHTML=list.map((r,i)=>`<span class="relic-pip" data-i="${i}">${r.ico}</span>`).join('');
  w.classList.toggle('hidden', list.length===0);
  if(!w._wired){ w._wired=true; w.addEventListener('click',(e)=>{ const pip=e.target.closest&&e.target.closest('.relic-pip'); if(!pip) return; const r=(G.relics||[])[+pip.dataset.i]; if(r && typeof toast==='function') toast(TN(EN_RELIC,r)+' — '+TD(EN_RELIC,r)); }); }   // tap a relic pip → read its effect (title= tooltips don't exist on touch)
}
function updateRelicOrbit(dt){
  const p=G.player; if(!p||!p.relOrbit) return;
  p._orbA=(p._orbA||0)+dt*3.2;
  const n=p.relOrbit, R=p.r+46, dmg=p.damage*0.55*(p.rageMul||1);
  if(U.chance(0.5) && !G.lowFx){ const a=p._orbA, ox=p.x+Math.cos(a)*R, oy=p.y+Math.sin(a)*R; Particles.emit(ox,oy,0,0,0.12,3,'#cfe0ff',{drag:0.8}); }
  p._orbTick=(p._orbTick||0)+dt;
  if(p._orbTick>=0.18){ p._orbTick=0;
    for(const e of G.enemies){ if(e.dead) continue;
      for(let i=0;i<n;i++){ const a=p._orbA+i/n*TAU, ox=p.x+Math.cos(a)*R, oy=p.y+Math.sin(a)*R;
        if(U.dist2(ox,oy,e.x,e.y) < (16+e.r)*(16+e.r)){ e.damage(dmg,ox,oy,false);
          if(!e.boss){ const an=U.angle(p.x,p.y,e.x,e.y); e.kbx=(e.kbx||0)+Math.cos(an)*120; e.kby=(e.kby||0)+Math.sin(an)*120; } break; }
      }
    }
  }
}
function drawRelicOrbit(ctx){
  const p=G.player; if(!p||!p.relOrbit) return;
  const n=p.relOrbit, R=p.r+46;
  for(let i=0;i<n;i++){ const a=(p._orbA||0)+i/n*TAU, ox=p.x+Math.cos(a)*R, oy=p.y+Math.sin(a)*R;
    ctx.save(); ctx.translate(ox,oy); ctx.rotate(a+1.2);
    ctx.shadowBlur=G.lowFx?0:12; ctx.shadowColor='#9be8ff'; ctx.fillStyle='#cfe0ff';
    ctx.beginPath(); ctx.moveTo(0,-9); ctx.lineTo(5,0); ctx.lineTo(0,9); ctx.lineTo(-5,0); ctx.closePath(); ctx.fill();
    ctx.restore(); ctx.shadowBlur=0;
  }
}

/* ---------------------- PERMANENT SHOP (META) ---------------------- */
const META = [
  {id:'armor', name:'Corazza',        ico:'🦺', max:12, base:40,  desc:l=>'+'+(l*18)+' HP massimi',      apply:(p,l)=>{p.maxHp+=l*18;p.hp=p.maxHp;}},
  {id:'power', name:'Munizioni',      ico:'💢', max:10, base:48,  desc:l=>'+'+(l*7)+'% danno',           apply:(p,l)=>{p.damage*=1+l*0.07;}},
  {id:'trig',  name:'Grilletto',      ico:'⚙️', max:10, base:55,  desc:l=>'+'+(l*5)+'% cadenza',         apply:(p,l)=>{p.fireRate*=1+l*0.05;}},
  {id:'burst', name:'Raffica',        ico:'🔱', max:2,  base:240, desc:l=>'Inizi con +'+l+' proiettile', apply:(p,l)=>{p.multishot+=l;}},
  {id:'speed', name:'Stivali',        ico:'🥾', max:8,  base:45,  desc:l=>'+'+(l*4)+'% velocità',        apply:(p,l)=>{p.speed*=1+l*0.04;}},
  {id:'dash',  name:'Riflessi',       ico:'💨', max:5,  base:60,  desc:l=>'-'+(l*9)+'% ricarica scatto', apply:(p,l)=>{p.dashCd*=Math.pow(0.91,l);}},
  {id:'magnet',name:'Magnete',        ico:'🧲', max:5,  base:40,  desc:l=>'+'+(l*22)+'% raggio raccolta',apply:(p,l)=>{p.magnet=1+l*0.22;}},
  {id:'regen', name:'Nanomedi',       ico:'🧬', max:5,  base:70,  desc:l=>'+'+(l*0.4).toFixed(1)+' HP/s',apply:(p,l)=>{p.regen+=l*0.4;}},
  {id:'greed', name:'Saccheggiatore', ico:'💰', max:8,  base:50,  desc:l=>'+'+(l*12)+'% rottami',        apply:(p,l)=>{}},
  {id:'aim',   name:'Mirino',         ico:'🔭', max:6,  base:65,  desc:l=>'+'+(l*3)+'% critico',         apply:(p,l)=>{p.crit+=l*0.03;}},
  {id:'pen',   name:'Penetratore',    ico:'🏹', max:3,  base:100, desc:l=>'I proiettili perforano +'+l+' nemico', apply:(p,l)=>{p.pierce+=l;}},
  {id:'revive',name:'Seconda Vita',   ico:'💀', max:1,  base:320, desc:l=>'Rinasci 1 volta a partita',   apply:(p,l)=>{p.revives+=l;}},
];

const CORE_SHOP = [
  { id:'cs_relic', kind:'perk', ico:'🜲', max:1, name:'Patto del Mercante',
    desc:l=>'Inizi ogni partita con una reliquia casuale',
    cost:l=>14, apply:(p,l)=>{ p.relicBonus=(p.relicBonus||0)+l; } },
  { id:'cs_reroll', kind:'perk', ico:'🎲', max:2, name:'Mano Fortunata',
    desc:l=>'+'+l+' ri-tiro gratuito dei potenziamenti a partita',
    cost:l=>l<=0?12:22, apply:(p,l)=>{ p.freeRerolls=(p.freeRerolls||0)+l; } },
  { id:'cs_cores', kind:'perk', ico:'⬡', max:5, name:'Raffinatore',
    desc:l=>'+'+(l*8)+'% Nuclei guadagnati',
    cost:l=>[10,16,24,34,46][l]||46, apply:(p,l)=>{ p.coreGainMul=(p.coreGainMul||1)*(1+l*0.08); } },
  { id:'cs_scrap', kind:'perk', ico:'💰', max:5, name:'Contrabbandiere',
    desc:l=>'+'+(l*10)+'% rottami guadagnati',
    cost:l=>[8,12,18,26,36][l]||36, apply:(p,l)=>{ p.coreScrapMul=(p.coreScrapMul||1)*(1+l*0.10); } },
  { id:'cs_head', kind:'perk', ico:'🚩', max:4, name:'Vantaggio',
    desc:l=>'Inizi gratis dal settore '+(1+l*2),
    cost:l=>[12,18,26,36][l]||36, apply:(p,l)=>{ p.startSector=Math.max(p.startSector||1,1+l*2); } },
  { id:'cs_life', kind:'perk', ico:'💀', max:1, name:'Anima di Riserva',
    desc:l=>'Rinasci +1 volta a partita',
    cost:l=>40, apply:(p,l)=>{ p.coreRevives=(p.coreRevives||0)+l; } },
  { id:'cs_evo', kind:'perk', ico:'★', max:3, name:'Gettone d’Evoluzione',
    desc:l=>'Arma piu forte a inizio partita (+'+(l*25)+'% danno, +'+(l*15)+'% cadenza)',
    cost:l=>[18,28,40][l]||40, apply:(p,l)=>{ p.evoTokenMul=(p.evoTokenMul||0)+l; } },
  { id:'cs_drone', kind:'perk', ico:'🛸', max:2, name:'Drone da Guerra',
    desc:l=>'Inizi ogni partita con '+l+' drone'+(l>1?'i':'')+' alleat'+(l>1?'i':'o')+' che spara'+(l>1?'no':''),
    cost:l=>[28,48][l]||48, apply:(p,l)=>{ p.startDrones=(p.startDrones||0)+l; } },
  { id:'cs_dronemed', kind:'perk', ico:'🚁', max:1, name:'Drone Medico',
    desc:l=>'Inizi ogni partita con un drone curativo alleato',
    cost:l=>44, apply:(p,l)=>{ p.startDroneHeal=l; } },
  { id:'cs_dronescrap', kind:'perk', ico:'🛰️', max:1, name:'Drone Recuperatore',
    desc:l=>'Inizi ogni partita con un drone che raccoglie i rottami',
    cost:l=>34, apply:(p,l)=>{ p.startDroneScrap=l; } },
  { id:'cs_unl_secondwind', kind:'relic', ico:'💀', max:1, name:'Sblocca: Ultimo Respiro',
    desc:l=>'Aggiunge la reliquia Ultimo Respiro al banco offerte', cost:l=>20, unlock:'secondwind' },
  { id:'cs_unl_berserk', kind:'relic', ico:'😡', max:1, name:'Sblocca: Furia di Sangue',
    desc:l=>'Aggiunge la reliquia Furia di Sangue al banco offerte', cost:l=>20, unlock:'berserk' },
  { id:'cs_unl_avarice', kind:'relic', ico:'💎', max:1, name:'Sblocca: Avidità',
    desc:l=>'Aggiunge la reliquia Avidità al banco offerte', cost:l=>20, unlock:'avarice' },
];

/* ---------------------- CHALLENGES (long-term goals) ---------------------- */
const CHALLENGES = [
  {id:'k1', name:'Sterminatore I',  ico:'💀', stat:'kills',     goal:1000,  reward:300},
  {id:'k2', name:'Sterminatore II', ico:'💀', stat:'kills',     goal:10000, reward:1500},
  {id:'b1', name:'Cacciatore I',    ico:'☢️', stat:'bosses',    goal:10,    reward:500},
  {id:'b2', name:'Cacciatore II',   ico:'☢️', stat:'bosses',    goal:50,    reward:2000},
  {id:'l1', name:'Esploratore I',   ico:'🗺️', stat:'maxLevel',  goal:25,    reward:600},
  {id:'l2', name:'Esploratore II',  ico:'🗺️', stat:'maxLevel',  goal:50,    reward:2000},
  {id:'l3', name:'Esploratore III', ico:'🗺️', stat:'maxLevel',  goal:75,    reward:5000},
  {id:'c1', name:'Catena di Morte', ico:'🔥', stat:'maxCombo',  goal:30,    reward:700},
  {id:'s1', name:'Avido',           ico:'💎', stat:'scrapLifetime', goal:5000, reward:1000},
  {id:'n1', name:'Atomico',         ico:'☢️', stat:'nukes',     goal:20,    reward:800},
  {id:'r1', name:'Veterano',        ico:'🎖️', stat:'runs',      goal:50,    reward:900},
  {id:'a2', name:'Asceso II',       ico:'⭐', stat:'ascensions', goal:5,     reward:9000},
  {id:'s2c',name:'Tesoriere',       ico:'💎', stat:'scrapLifetime', goal:25000, reward:2500},
  {id:'bn1',name:'Intoccabile',     ico:'🛡️', stat:'bossNoHit',  goal:3,     reward:1200},
  {id:'pt1',name:'Maratoneta',      ico:'⏱️', stat:'playtime',   goal:3600,  reward:800},
  {id:'r2', name:'Leggenda Vivente',ico:'🎖️', stat:'runs',       goal:200,   reward:3000},
  {id:'k3', name:'Sterminatore III',ico:'💀', stat:'kills',      goal:50000, reward:5000},
  {id:'b3c',name:'Cacciatore III',  ico:'☢️', stat:'bosses',     goal:120,   reward:4500},
  {id:'l4c',name:'Esploratore IV',  ico:'🗺️', stat:'maxLevel',   goal:110,   reward:9000},
];

/* per-run objectives — 3 random each run, reward scrap on completion */
const OBJECTIVES = [
  {id:'k50',  text:'Elimina 50 nemici',      goal:50,  get:()=>G.kills,        reward:40},
  {id:'k120', text:'Elimina 120 nemici',     goal:120, get:()=>G.kills,        reward:80},
  {id:'lv5',  text:'Raggiungi il settore 5', goal:5,   get:()=>G.level,        reward:40},
  {id:'lv8',  text:'Raggiungi il settore 8', goal:8,   get:()=>G.level,        reward:70},
  {id:'boss', text:'Uccidi un boss',         goal:1,   get:()=>G.bossesKilled, reward:60},
  {id:'scr',  text:'Raccogli 8 rottami',     goal:8,   get:()=>G.scrap,        reward:40},
  {id:'ab',   text:'Usa 10 abilità',         goal:10,  get:()=>G.abilityUses,  reward:40},
  {id:'cmb',  text:'Combo da 15',            goal:15,  get:()=>G.maxCombo,     reward:50},
  {id:'surv', text:'Sopravvivi 3 minuti',    goal:180, get:()=>G.runTime,      reward:70},
];

/* between-sector choice nodes */
const EVENTS = [
  { id:'shrine', name:'SANTUARIO', ico:'⛩️', take:'OFFRI SANGUE', skip:'LASCIA STARE',
    desc:'Subisci -25% HP massimi ma ottieni +35% danno permanente per questa partita.',
    apply(p){ p.maxHp=Math.max(20,Math.round(p.maxHp*0.75)); p.hp=Math.min(p.hp,p.maxHp); p.damage*=1.35; } },
  { id:'merchant', name:'MERCANTE', ico:'🏪', take:'COMPRA (40 ⬢)', skip:'PROSEGUI',
    desc:'Spendi 40 rottami: cura completa + 1 vita extra.',
    can(){ return G.scrap>=40; },
    apply(p){ G.scrap-=40; p.hp=p.maxHp; p.revives+=1; } },
  { id:'cache', name:'STANZA TESORO', ico:'💰', take:'RACCOGLI', skip:null, autoGood:true,
    desc:'+30 rottami e una cura del 40%.',
    apply(p){ G.scrap+=30; G.updateScrapUI(); p.hp=Math.min(p.maxHp,p.hp+p.maxHp*0.4); } },
  { id:'forge', name:'FORGIA', ico:'🔧', take:'POTENZIA', skip:'NO GRAZIE',
    desc:'+18% cadenza di fuoco permanente per questa partita.',
    apply(p){ p.fireRate*=1.18; } },
  { id:'medic', name:'POSTO DI MEDICAZIONE', ico:'➕', take:'CURATI', skip:null, autoGood:true,
    desc:'Cura completa + 1.5 HP/s di rigenerazione per il resto della partita.',
    apply(p){ p.hp=p.maxHp; p.regen+=1.5; } },
  { id:'gamble', name:'SCOMMESSA', ico:'🎲', take:'PUNTA (25 ⬢)', skip:'NON RISCHIARE',
    desc:'Punta 25 rottami: 60% di vincere +50% danno permanente, 40% di perderli e basta.',
    can(){ return G.scrap>=25; },
    apply(p){ G.scrap-=25;
      if(U.chance(0.6)){ p.damage*=1.5; banner('VINTO','+50% danno'); Audio2.levelup(); }
      else { banner('PERSO','rottami svaniti'); Audio2.hurt(); } } },
  { id:'swap', name:'ARMERIA ABBANDONATA', ico:'🎰', take:'IMBRACCIA', skip:'TIENI LA TUA',
    desc:'Sostituisci l’arma con una a caso (con la sua maestria) per il resto della partita. Azzardo puro.',
    apply(p){ const cur=p.weapon&&p.weapon.id; const pool=WEAPONS.filter(w=>w.id!==cur);
      const nw=U.pick(pool); const lv=(typeof masteryLevel==='function')?masteryLevel(nw.id):0;
      const wc=Object.assign({},nw); p.weapon=wc; p.evo=null; p.masteryLv=lv;
      if(typeof MASTERY_GROWTH!=='undefined'){ const g=MASTERY_GROWTH[nw.id];
        if(g&&lv>0){ wc.dmgMul=wc.dmgMul*(1+g.dmg*lv); wc.rateMul=wc.rateMul*(1+g.rate*lv); } }
      if(lv>=MASTERY_MAX && typeof EVOLUTIONS!=='undefined' && EVOLUTIONS[nw.id]){ const ev=EVOLUTIONS[nw.id]; p.evo=ev.evo; ev.apply(wc,p); }
      banner(TN(EN_WEAPON,nw),'nuova arma'); } },
  { id:'cursed', name:'BENEDIZIONE MALEDETTA', ico:'😈', take:'ACCETTA IL PATTO', skip:'RIFIUTA',
    desc:'+40% cadenza e +20% velocità, ma -20% HP massimi. Il rischio dei disperati.',
    apply(p){ p.fireRate*=1.40; p.speed*=1.20; p.maxHp=Math.max(20,Math.round(p.maxHp*0.8)); p.hp=Math.min(p.hp,p.maxHp); } },
  { id:'altar', name:'ALTARE DELLE RELIQUIE', ico:'🗿', take:'OFFRI (60 ⬢)', skip:'IGNORA',
    desc:'Un altare dimenticato. Offri 60 rottami per una reliquia... se le reliquie esistono.',
    can(){ return typeof grantRandomRelic==='function' && G.scrap>=60; },
    apply(p){ G.scrap-=60;
      try{ grantRandomRelic(p); banner('RELIQUIA','ottenuta'); Audio2.levelup(); }catch(e){ p.damage*=1.15; p.maxHp+=15; p.hp+=15; banner('ECO DI POTERE','+danno +HP'); } } },
  { id:'recycler', name:'RICICLATORE', ico:'♻️', take:'CONVERTI (30 ⬢)', skip:'NO',
    desc:'Converti 30 rottami in +20% velocità di movimento permanente.',
    can(){ return G.scrap>=30; },
    apply(p){ G.scrap-=30; p.speed*=1.20; } },
  { id:'oracle', name:'ORACOLO', ico:'🔮', take:'ASCOLTA', skip:'IGNORA',
    desc:'+15% critico e +12% velocità colpo per il resto della partita.',
    apply(p){ p.crit+=0.15; p.bulletSpeed*=1.12; } },
  { id:'butchery', name:'MATTATOIO', ico:'🪓', take:'IMBRACCIA', skip:'LASCIA',
    desc:'+35% danno ma -10% HP massimi. Solo per i temerari.',
    apply(p){ p.damage*=1.35; p.maxHp=Math.max(20,Math.round(p.maxHp*0.9)); p.hp=Math.min(p.hp,p.maxHp); } },
  { id:'armory', name:'DEPOSITO ARMI', ico:'🎖️', take:'PRENDI', skip:'LASCIA',
    desc:'+1 proiettile per ogni colpo, per il resto della partita.',
    apply(p){ p.multishot+=1; } },
  { id:'gunsmith', name:'ARMAIOLO', ico:'🔩', take:'POTENZIA', skip:'NO GRAZIE',
    desc:'+15% velocità colpo e +1 perforazione per il resto della partita.',
    apply(p){ p.bulletSpeed*=1.15; p.pierce+=1; } },
  { id:'beacon', name:'FARO DI SOCCORSO', ico:'🛸', take:'ATTIVA (35 ⬢)', skip:'IGNORA',
    desc:'Spendi 35 rottami: un drone alleato da guerra si unisce a te per la partita.',
    can(){ return G.scrap>=35; },
    apply(p){ G.scrap-=35; if(G.companions) G.companions.push(new Companion('gun')); } },
  { id:'reactor', name:'REATTORE INSTABILE', ico:'☢️', take:'SOVRACCARICA', skip:'STABILIZZA',
    desc:'+25% danno e +15% velocità colpo, ma -1 HP/s di rigenerazione per il resto della partita.',
    apply(p){ p.damage*=1.25; p.bulletSpeed*=1.15; p.regen-=1; } },
  { id:'sanctum', name:'SANTUARIO RUNICO', ico:'🔯', take:'MEDITA', skip:null, autoGood:true,
    desc:'Cura completa e +20 HP massimi per il resto della partita.',
    apply(p){ p.maxHp+=20; p.hp=p.maxHp; } },
];

/* ---------------------- THREAT TIERS ---------------------- */
const THREAT_TIERS = [
  { t:0,  name:'Standard',  hp:1.00, spd:1.00, dmg:1.00, elite:0.00, spawn:1.00, heal:1.00, start:1,  unlock:0,  reward:1.00, cores:0 },
  { t:1,  name:'Minaccia I',   hp:1.15, spd:1.03, dmg:1.08, elite:0.03, spawn:0.96, heal:0.95, start:1,  unlock:5,  reward:1.20, cores:1 },
  { t:2,  name:'Minaccia II',  hp:1.32, spd:1.06, dmg:1.16, elite:0.06, spawn:0.92, heal:0.90, start:1,  unlock:7,  reward:1.40, cores:1 },
  { t:3,  name:'Minaccia III', hp:1.52, spd:1.09, dmg:1.24, elite:0.09, spawn:0.88, heal:0.85, start:3,  unlock:9,  reward:1.65, cores:2 },
  { t:4,  name:'Minaccia IV',  hp:1.75, spd:1.12, dmg:1.33, elite:0.12, spawn:0.85, heal:0.80, start:3,  unlock:11, reward:1.90, cores:2 },
  { t:5,  name:'Minaccia V',   hp:2.02, spd:1.15, dmg:1.42, elite:0.15, spawn:0.82, heal:0.75, start:5,  unlock:13, reward:2.15, cores:3 },
  { t:6,  name:'Minaccia VI',  hp:2.33, spd:1.18, dmg:1.52, elite:0.18, spawn:0.79, heal:0.70, start:5,  unlock:15, reward:2.40, cores:3 },
  { t:7,  name:'Minaccia VII', hp:2.68, spd:1.21, dmg:1.62, elite:0.21, spawn:0.76, heal:0.66, start:7,  unlock:17, reward:2.65, cores:4 },
  { t:8,  name:'Minaccia VIII',hp:3.08, spd:1.24, dmg:1.73, elite:0.24, spawn:0.74, heal:0.62, start:7,  unlock:19, reward:2.85, cores:5 },
  { t:9,  name:'Minaccia IX',  hp:3.54, spd:1.27, dmg:1.84, elite:0.27, spawn:0.72, heal:0.58, start:10, unlock:21, reward:3.20, cores:6 },
  { t:10, name:'Cataclisma',   hp:3.86, spd:1.29, dmg:1.88, elite:0.29, spawn:0.71, heal:0.56, start:10, unlock:23, reward:3.45, cores:8 },
];
function THREAT(t){ return THREAT_TIERS[U.clamp(t,0,THREAT_TIERS.length-1)] || THREAT_TIERS[0]; }

/* ---------------------- GAME MODES ---------------------- */
const GAME_MODES = [
  { id:'endless',  name:'Senza Fine',  ico:'∞',  desc:'La corsa classica. Settori infiniti, difficolta crescente.', nameEn:'Endless', descEn:'The classic run. Infinite sectors, rising difficulty.', reward:1.00, bossEvery:false, seeded:false, noRevive:false },
  { id:'bossrush', name:'Assalto Boss',ico:'☠', desc:'Ogni settore e un boss. Niente respiro.', nameEn:'Boss Rush', descEn:'Every sector is a boss. No breathing room.', reward:1.35, bossEvery:true,  seeded:false, noRevive:false },
  { id:'horde',    name:'Orda',        ico:'🌊', desc:'Ondate infinite a tempo. Sopravvivi a ogni assalto per potenziarti.', nameEn:'Horde', descEn:'Endless timed waves. Survive each onslaught to power up.', reward:1.30, bossEvery:false, seeded:false, noRevive:false, horde:true },
  { id:'daily',    name:'Sfida del Giorno', ico:'📅', desc:'Stesso seed per tutti, oggi. Un solo tentativo al giorno.', nameEn:'Daily Challenge', descEn:'Same seed for everyone today. One attempt per day.', reward:1.25, bossEvery:false, seeded:true,  noRevive:false },
  { id:'hardcore', name:'Inferno',     ico:'🔥', desc:'Una sola vita. Nessuna rinascita. Ricompensa maggiorata.', nameEn:'Inferno', descEn:'One life. No revives. Boosted reward.', reward:1.50, bossEvery:false, seeded:false, noRevive:true  },
  { id:'frenzy',   name:'Frenesia',    ico:'🌀', desc:'Orde più fitte e nemici più rapidi. Ricompensa maggiorata.', nameEn:'Frenzy', descEn:'Denser hordes and faster enemies. Boosted reward.', reward:1.40, bossEvery:false, seeded:false, noRevive:false, frenzy:true },
];
function GMODE(id){ return GAME_MODES.find(m=>m.id===id) || GAME_MODES[0]; }

/* ======================================================================
   THREAT / MODE — seeded RNG layer + setup screen
   ====================================================================== */
function mulberry32(seed){
  let a = seed>>>0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function dailySeed(dateStr){
  let h = 0x811c9dc5;
  for(let i=0;i<dateStr.length;i++){ h ^= dateStr.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h>>>0;
}
function dailyKey(){
  const d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
const RNG = {
  _orig:null,
  install(seed){
    if(this._orig) this.restore();
    const r = mulberry32(seed);
    this._orig = { rand:U.rand, randInt:U.randInt, pick:U.pick, chance:U.chance, shuffle:U.shuffle };
    U.rand   = (a=1,b)=> b===undefined ? r()*a : a+r()*(b-a);
    U.randInt= (a,b)=> Math.floor(a + r()*(b-a+1));
    U.pick   = arr=> arr[Math.floor(r()*arr.length)];
    U.chance = p=> r()<p;
    U.shuffle= a=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
  },
  restore(){
    if(!this._orig) return;
    U.rand=this._orig.rand; U.randInt=this._orig.randInt; U.pick=this._orig.pick;
    U.chance=this._orig.chance; U.shuffle=this._orig.shuffle;
    this._orig=null;
  },
  get active(){ return !!this._orig; },
};
function dailyDone(){ return SaveData.data.dailyDate===dailyKey() && !!SaveData.data.dailyUsed; }

// Populates the play-setup controls (mounted by the hub inside #playModeMount). Safe no-op if DOM absent.
function buildPlaySetup(){
  const mg = el('setupModes');
  if(mg){ mg.innerHTML='';
    for(const m of GAME_MODES){
      const sel = G.mode===m.id;
      const locked = (m.id==='daily' && dailyDone());
      const card=document.createElement('div'); card.className='shop-card'+(sel?' sel':'')+(locked?' maxed':'');
      const sub = locked ? UL('✓ GIÀ GIOCATA','✓ DONE TODAY') : (sel?UL('SELEZIONATA ✓','SELECTED ✓'):UL('SCEGLI','SELECT'));
      const _en=(typeof I18N!=='undefined' && I18N.lang==='en');
      const bm=((SaveData.data&&SaveData.data.bestByMode)||{})[m.id];
      const bestLine = (bm&&bm.score>0) ? `<div class="mode-best">🏆 ${UL('record','best')} ${bm.score} · ${UL('set.','sec.')} ${bm.level||0}</div>` : `<div class="mode-best dim">${UL('nessun record','no record')}</div>`;
      card.innerHTML=`<div class="ico">${m.ico}</div><div class="name">${_en&&m.nameEn?m.nameEn:m.name}</div><div class="desc">${_en&&m.descEn?m.descEn:m.desc}</div>${bestLine}<button class="shop-buy" ${locked?'disabled':''}>${sub}</button>`;
      if(!locked) card.addEventListener('click',()=>{ G.mode=m.id; Audio2.pickup(); buildPlaySetup(); });
      mg.appendChild(card);
    }
  }
  const max = SaveData.data.threat||0;
  G.threat = U.clamp(G.threat, 0, max);
  const cfg = THREAT(G.threat);
  if(el('threatVal')) el('threatVal').textContent = G.threat;
  if(el('threatName')) el('threatName').textContent = (_T()&&EN_THREAT[G.threat]!=null)?EN_THREAT[G.threat]:cfg.name;
  if(el('threatRec')){ const rec=(SaveData.data.threatRec||{})[G.threat]||0; el('threatRec').textContent = rec>0?(UL('record settore ','best sector ')+rec):UL('nessun record','no record'); }
  if(el('threatMods')) el('threatMods').innerHTML =
    `<span>+${Math.round((cfg.hp-1)*100)}% HP</span>`+
    `<span>+${Math.round((cfg.dmg-1)*100)}% ${UL('danno','damage')}</span>`+
    `<span>+${Math.round(cfg.elite*100)}% ${UL('elite','elite')}</span>`+
    (cfg.start>1?`<span>${UL('parti dal settore ','start from sector ')}${cfg.start}</span>`:'');
  if(el('threatReward')){
    const tot = cfg.reward * GMODE(G.mode).reward;
    el('threatReward').innerHTML = `<b>×${tot.toFixed(2)}</b> ${UL('rottami','scrap')} · <b>${cfg.cores}+</b> ⬡ ${UL('nuclei','cores')}`;
  }
  if(el('threatDec')){ el('threatDec').disabled = G.threat<=0;
    el('threatDec').onclick=()=>{ if(G.threat>0){ G.threat--; Audio2.blip(440,0.04,'sine',0.12); buildPlaySetup(); } }; }
  if(el('threatInc')){ el('threatInc').disabled = G.threat>=max;
    el('threatInc').onclick=()=>{ if(G.threat<max){ G.threat++; Audio2.blip(660,0.04,'sine',0.12); buildPlaySetup(); } }; }
  if(el('threatNextHint')){
    if(G.threat>=max && max<THREAT_TIERS.length-1){
      const next=THREAT(max+1);
      const nextNm=(_T()&&EN_THREAT[next.t]!=null)?EN_THREAT[next.t]:next.name;
      el('threatNextHint').textContent = UL(`Raggiungi il settore ${next.unlock} per sbloccare ${nextNm}`,`Reach sector ${next.unlock} to unlock ${nextNm}`);
    } else el('threatNextHint').textContent='';
  }
}

function recordThreatProgress(){
  const t = G.threat|0;
  if(!SaveData.data.threatRec) SaveData.data.threatRec={};
  if(G.level > (SaveData.data.threatRec[t]||0)) SaveData.data.threatRec[t]=G.level;
  const max = SaveData.data.threat||0;
  if(t>=max && max<THREAT_TIERS.length-1){
    const next = THREAT(max+1);
    if(G.level >= next.unlock){ SaveData.data.threat = max+1; banner('MINACCIA SBLOCCATA', (_T()&&EN_THREAT[next.t]!=null)?EN_THREAT[next.t]:next.name, true); }
  }
  const cfg = THREAT(t);
  if(cfg.cores>0){
    const depth = Math.max(0, G.level - cfg.start);
    const cores = cfg.cores + Math.floor(depth/5);
    const cm=(G.player&&G.player.coreGainMul)||1; const coresM=Math.round(cores*cm);
    SaveData.data.cores = (SaveData.data.cores||0) + coresM;
    G.coresEarned = coresM;
  } else G.coresEarned = 0;
  if(G.mode==='daily'){ SaveData.data.dailyDate=dailyKey(); SaveData.data.dailyUsed=true; }
}

/* ---------------------- CODEX / BESTIARIO ---------------------- */
const CODEX_ENEMIES = [
  {id:'walker',   ico:'🧟', name:'Errante',      lore:'Carne in marcia senza mente. Lento ma instancabile: dove cade uno, due si rialzano.'},
  {id:'runner',   ico:'🏃', name:'Scattante',    lore:'Un tempo umano, ora solo fame veloce. Ti raggiunge prima che tu senta il suo respiro.'},
  {id:'spitter',  ico:'🤮', name:'Sputatore',    lore:'Sacche tossiche al posto dei polmoni. Tiene le distanze e annaffia di acido.'},
  {id:'brute',    ico:'🦍', name:'Bruto',        lore:'Montagna di muscoli mutati. Ogni colpo spezza ossa; ogni passo fa tremare la cenere.'},
  {id:'bomber',   ico:'💣', name:'Detonatore',   lore:'Corre verso di te con un sorriso instabile. La sua unica arma e la propria fine.'},
  {id:'shielder', ico:'🛡️', name:'Scudaio',      lore:'Trascina una lastra di metallo arrugginito. Colpiscilo alle spalle, o non lo scalfisci.'},
  {id:'swarmer',  ico:'🐛', name:'Covata',       lore:'Una madre gonfia che partorisce orrori in miniatura senza mai fermarsi.'},
  {id:'mite',     ico:'🦟', name:'Acaro',        lore:'Piccolo, rapido, innumerevole. Singolarmente nulla; in sciame, una marea.'},
  {id:'leaper',   ico:'🦗', name:'Saltatore',    lore:'Si accuccia, si carica, e ti piomba addosso da dieci metri. Non restare fermo.'},
  {id:'healer',   ico:'💊', name:'Sanatore',     lore:'Pulsa di energia maligna e rimette in piedi i caduti. Uccidilo per primo.'},
  {id:'sniper',   ico:'🎯', name:'Cecchino',     lore:'Prende la mira nell ombra. Quando il raggio si fissa, hai un battito per spostarti.'},
  {id:'blinker',  ico:'🌀', name:'Tralucente',   lore:'Esiste a sprazzi. Sparisce dove miri e riappare dove non vorresti.'},
  {id:'bubbler',  ico:'🫧', name:'Incapsulato',  lore:'Una bolla di energia lo riveste e si riforma. Spezzala in fretta, prima che torni.'},
  {id:'summoner', ico:'📿', name:'Evocatore',    lore:'Apre crepe nell aria e ne tira fuori altri. La sua morte placa l orda.'},
  {id:'zealot',   ico:'😈', name:'Fanatico',     lore:'Vola dritto verso la fine come una preghiera esplosiva. Non lasciarti abbracciare.'},
  {id:'rammer',   ico:'🐗', name:'Ariete',       lore:'Una carica di muscoli corazzati. Quando abbassa la testa, togliti di mezzo.'},
  {id:'wraith',   ico:'👻', name:'Spettro',      lore:'Fluttua dove gli altri annegano. Lo vedi solo quando e gia troppo vicino.'},
  {id:'gunner',   ico:'🔫', name:'Fuciliere',    lore:'Tiene le distanze e scarica colpi mirati. Chiudi la distanza o trova riparo.'},
  {id:'brawler',  ico:'🪨', name:'Picchiatore',  lore:'Un bruto di medio rango, lento ma duro. Resiste alle spinte e martella senza sosta.'},
  {id:'looter',   ico:'💰', name:'Sciacallo',    lore:'Non combatte: scappa col bottino in spalla. Inseguilo e abbattilo prima che sparisca, o il tesoro è perso.'},
];
const CODEX_BOSSES = [
  {id:'butcher',    ico:'🔪', name:'Il Macellaio',         lore:'Indossa i grembiuli delle sue vittime. Carica come un toro impazzito di sangue.'},
  {id:'bloated',    ico:'🎈', name:'Il Gonfio',            lore:'Una sacca ambulante di gas e larve. Quando scoppia, lascia eredi ovunque.'},
  {id:'warlord',    ico:'⚔️', name:'Signore della Guerra', lore:'Comanda le orde con disciplina militare. Richiama rinforzi a ogni ferita.'},
  {id:'colossus',   ico:'🗿', name:'Il Colosso',           lore:'Un relitto industriale animato. Lento come una glaciazione, duro come l acciaio.'},
  {id:'necromancer',ico:'🦴', name:'Il Necromante',        lore:'Sussurra ai morti e i morti obbediscono. La sua armata non finisce mai.'},
  {id:'twins',      ico:'👯', name:'I Gemelli',            lore:'Condividono un cuore solo. Finche ne resta uno, l altro non muore davvero.'},
  {id:'artillery',  ico:'💥', name:'L Artigliere',         lore:'Bombarda l orizzonte da fermo. Sopravvivere significa non smettere mai di correre.'},
  {id:'splitter',   ico:'🪓', name:'La Scissione',         lore:'Colpita, non muore: si sdoppia. Due meta affamate al posto di una.'},
  {id:'hivequeen',  ico:'🐝', name:'La Regina Sciame',     lore:'Un alveare con la corona. Genera figli finche il suo trono non crolla.'},
  {id:'duelist',    ico:'🤺', name:'Il Duellante Specchio',lore:'Veloce come un riflesso. Balena al tuo fianco e taglia prima che tu giri.'},
  {id:'reaver',     ico:'🟣', name:'Il Razziatore',       lore:'Non si avvicina mai: orbita e ti annega in raffiche di proiettili. Non smettere di muoverti.'},
  {id:'overseer',   ico:'🌀', name:'Il Sorvegliante',     lore:'Tesse spirali di proiettili che inghiottono l arena. Leggi il ritmo e scivola tra le braccia.'},
  {id:'quaker',     ico:'🗿', name:'Il Sismico',          lore:'Un golem di pietra che squarcia il suolo. Ogni schianto manda onde di scheggie: salta via prima che si chiudano.'},
  {id:'aegis',      ico:'🛡️', name:"L'Egida",             lore:'Un bastione semovente. Lo scudo frontale respinge ogni colpo: gira intorno e colpisci il reattore scoperto sulla schiena.'},
];
const CODEX_BIOMES = [
  {id:'ash',     ico:'🌫️', name:'Cenere Grigia',        lore:'Dove tutto e cominciato a bruciare. La cenere non smette mai di cadere.'},
  {id:'toxic',   ico:'☣️', name:'Distesa Tossica',       lore:'Pozze verdi che mangiano gli stivali. L aria stessa e una lenta condanna.'},
  {id:'blood',   ico:'🩸', name:'Notte di Sangue',       lore:'Il cielo e una ferita aperta. Qui i predatori cacciano piu veloci.'},
  {id:'sand',    ico:'🏜️', name:'Tempesta di Sabbia',    lore:'Il vento accieca e nasconde i cecchini. Fidati delle orecchie, non degli occhi.'},
  {id:'rad',     ico:'☢️', name:'Zona Radioattiva',      lore:'I contatori impazziscono. Qualcosa sotto la sabbia blu e ancora sveglio.'},
  {id:'ice',     ico:'❄️', name:'Gelo Eterno',           lore:'Il freddo conserva i mostri come reliquie. I Bruti prosperano nel ghiaccio.'},
  {id:'swamp',   ico:'🪲', name:'Palude Marcia',         lore:'Fango che risucchia e nasconde. Ogni bolla e un nido che si schiude.'},
  {id:'ruins',   ico:'🏚️', name:'Citta in Rovina',       lore:'Lo scheletro della vecchia civilta. Cecchini e scudaii pattugliano le macerie.'},
  {id:'lava',    ico:'🌋', name:'Caldera Infernale',     lore:'La terra crepa e sanguina fuoco. Solo i piu duri osano scendere qui.'},
  {id:'snowrad', ico:'🌨️', name:'Neve Radioattiva',      lore:'Fiocchi che brillano di veleno. La bellezza piu letale del continente.'},
  {id:'crypt',   ico:'⚰️', name:'Cripta Dimenticata',    lore:'Sepolcri profanati e magia nera. I morti qui non riposano mai.'},
  {id:'flood',   ico:'🌊', name:'Piana Allagata',        lore:'L acqua ha inghiottito tutto. Sotto la superficie qualcosa si muove ancora.'},
  {id:'storm',   ico:'⛈️', name:'Tempesta Elettrica',   lore:'Fulmini che non toccano mai terra. L aria ronza di morte statica.'},
  {id:'bone',    ico:'💀', name:'Ossario',              lore:'Una pianura di ossa calcificate. Cammini sui resti di chi ha ceduto prima.'},
  {id:'glass',   ico:'🔷', name:'Deserto di Vetro',     lore:'La sabbia fusa dal vecchio fuoco in lastre taglienti. Tutto qui riflette e ferisce.'},
  {id:'fungal',  ico:'🍄', name:'Foresta Fungina',      lore:'Spore bioluminescenti coprono ogni cosa. Respirare troppo a lungo significa diventarne parte.'},
];
const CODEX_TOTAL = CODEX_ENEMIES.length + CODEX_BOSSES.length + CODEX_BIOMES.length;

/* ---------------------- ACHIEVEMENTS (Imprese) ---------------------- */
const ACHIEVEMENTS = [
  {id:'imp_k1',  name:'Battesimo di Cenere', ico:'🩸', desc:'Elimina 500 nemici',            cat:'guerra',  goal:500,   rs:200,  rc:0, cond:S=>S.stat('kills')},
  {id:'imp_k2',  name:'Mietitore',           ico:'☠️', desc:'Elimina 25.000 nemici',         cat:'guerra',  goal:25000, rs:2500, rc:2, cond:S=>S.stat('kills')},
  {id:'imp_k3',  name:'Apocalisse Personale',ico:'💀', desc:'Elimina 100.000 nemici',        cat:'guerra',  goal:100000,rs:6000, rc:6, cond:S=>S.stat('kills')},
  {id:'imp_wp',  name:'Fedele alla Vagabonda',ico:'🔫', desc:'1.500 uccisioni con la Pistola', cat:'arsenale',goal:1500, rs:300, rc:0, cond:S=>S.wkill('pistol')},
  {id:'imp_ws',  name:'A Bruciapelo',        ico:'💢', desc:'1.500 uccisioni col Fucile',     cat:'arsenale',goal:1500, rs:300, rc:0, cond:S=>S.wkill('shotgun')},
  {id:'imp_wm',  name:'Tritacarne',          ico:'⚡', desc:'2.500 uccisioni con l SMG',      cat:'arsenale',goal:2500, rs:300, rc:0, cond:S=>S.wkill('smg')},
  {id:'imp_wr',  name:'Linea Retta',         ico:'🎯', desc:'800 uccisioni col Railgun',      cat:'arsenale',goal:800,  rs:350, rc:0, cond:S=>S.wkill('railgun')},
  {id:'imp_wf',  name:'Furia Ardente',       ico:'🔥', desc:'2.000 uccisioni col Lanciafiamme',cat:'arsenale',goal:2000,rs:300, rc:0, cond:S=>S.wkill('flamer')},
  {id:'imp_wl',  name:'Pioggia di Fuoco',    ico:'☢️', desc:'1.000 uccisioni col Lanciagranate',cat:'arsenale',goal:1000,rs:350,rc:0, cond:S=>S.wkill('launcher')},
  {id:'imp_wt',  name:'Conduttore',          ico:'🌩️', desc:'1.200 uccisioni col Tesla',      cat:'arsenale',goal:1200, rs:300, rc:0, cond:S=>S.wkill('tesla')},
  {id:'imp_wc',  name:'A Sangue Freddo',     ico:'❄️', desc:'1.200 uccisioni col Cryo',       cat:'arsenale',goal:1200, rs:300, rc:0, cond:S=>S.wkill('cryo')},
  {id:'imp_wg',  name:'Surriscaldamento',    ico:'🔩', desc:'3.000 uccisioni col Minigun',    cat:'arsenale',goal:3000, rs:350, rc:0, cond:S=>S.wkill('minigun')},
  {id:'imp_warm',name:'Arsenale Completo',   ico:'🏅', desc:'Almeno 200 kill con ogni arma',  cat:'arsenale',goal:WEAPONS.length,   rs:1500,rc:3, cond:S=>S.weaponsAt(200)},
  {id:'imp_b1',  name:'Cacciatore di Titani',ico:'☢️', desc:'Abbatti 25 boss',               cat:'boss',    goal:25,   rs:800,  rc:1, cond:S=>S.stat('bosses')},
  {id:'imp_b2',  name:'Sterminio dei Re',    ico:'👑', desc:'Abbatti 150 boss',              cat:'boss',    goal:150,  rs:3500, rc:3, cond:S=>S.stat('bosses')},
  {id:'imp_bn',  name:'Senza un Graffio',    ico:'🛡️', desc:'Uccidi un boss senza subire danni',cat:'boss', goal:1,    rs:1200, rc:2, cond:S=>S.stat('bossNoHit')},
  {id:'imp_bn3', name:'Intoccabile',         ico:'✨', desc:'5 boss uccisi senza danni',      cat:'boss',    goal:5,    rs:3000, rc:4, cond:S=>S.stat('bossNoHit')},
  {id:'imp_bcyc',name:'Giro Completo',       ico:'🔁', desc:'Sconfiggi ogni boss diverso',     cat:'boss', goal:CODEX_BOSSES.length, rs:2000, rc:3, cond:S=>S.bossKindsSeen()},
  {id:'imp_l1',  name:'Nelle Profondita',    ico:'🗺️', desc:'Raggiungi il settore 30',        cat:'profondita',goal:30, rs:700, rc:0, cond:S=>S.stat('maxLevel')},
  {id:'imp_l2',  name:'Oltre la Soglia',     ico:'🌌', desc:'Raggiungi il settore 60',        cat:'profondita',goal:60, rs:2500,rc:2, cond:S=>S.stat('maxLevel')},
  {id:'imp_l3',  name:'L Abisso Chiama',     ico:'🕳️', desc:'Raggiungi il settore 100',       cat:'profondita',goal:100,rs:7000,rc:6, cond:S=>S.stat('maxLevel')},
  {id:'imp_t1',  name:'Minaccia 3',          ico:'⚠️', desc:'Sblocca la fascia minaccia 3',   cat:'profondita',goal:3,  rs:600, rc:1, cond:S=>S.threat()},
  {id:'imp_t2',  name:'Minaccia 6',          ico:'🔺', desc:'Sblocca la fascia minaccia 6',   cat:'profondita',goal:6,  rs:1800,rc:2, cond:S=>S.threat()},
  {id:'imp_t3',  name:'Codice Rosso',        ico:'🟥', desc:'Sblocca la fascia minaccia 10',  cat:'profondita',goal:10, rs:5000,rc:5, cond:S=>S.threat()},
  {id:'imp_c1',  name:'Furia Incatenata',    ico:'🔥', desc:'Raggiungi una combo di 50',      cat:'maestria',goal:50,   rs:900,  rc:0, cond:S=>S.stat('maxCombo')},
  {id:'imp_c2',  name:'Danza della Morte',   ico:'💃', desc:'Raggiungi una combo di 100',     cat:'maestria',goal:100,  rs:2200, rc:2, cond:S=>S.stat('maxCombo')},
  {id:'imp_sc',  name:'Centomila',           ico:'🏆', desc:'Totalizza 100.000 punti in una run',cat:'maestria',goal:100000,rs:1500,rc:1,cond:S=>S.stat('bestScore')},
  {id:'imp_run', name:'Sopravvissuto Nato',  ico:'🎖️', desc:'Completa 100 run',               cat:'maestria',goal:100,  rs:1500, rc:1, cond:S=>S.stat('runs')},
  {id:'imp_pt',  name:'Insonne',             ico:'⏱️', desc:'Gioca per 2 ore totali',         cat:'maestria',goal:7200, rs:1000, rc:1, cond:S=>S.stat('playtime')},
  {id:'imp_nuke',name:'Fungo Atomico',       ico:'☢️', desc:'Usa 50 atomiche',                cat:'maestria',goal:50,   rs:900,  rc:0, cond:S=>S.stat('nukes')},
  {id:'imp_s1',  name:'Sciacallo',           ico:'💎', desc:'Accumula 25.000 rottami totali', cat:'economia',goal:25000,rs:1500, rc:1, cond:S=>S.stat('scrapLifetime')},
  {id:'imp_s2',  name:'Magnate del Deserto', ico:'🤑', desc:'Accumula 200.000 rottami totali',cat:'economia',goal:200000,rs:6000,rc:5, cond:S=>S.stat('scrapLifetime')},
  {id:'imp_asc1',name:'Asceso',              ico:'⭐', desc:'Ascendi una volta',              cat:'economia',goal:1,    rs:1500, rc:2, cond:S=>S.stat('ascensions')},
  {id:'imp_asc2',name:'Trascendenza',        ico:'🌟', desc:'Ascendi 10 volte',               cat:'economia',goal:10,   rs:9000, rc:8, cond:S=>S.stat('ascensions')},
  {id:'imp_chr', name:'Compagnia di Sventura',ico:'☣', desc:'Sblocca 4 sopravvissuti',        cat:'economia',goal:4,    rs:1200, rc:1, cond:S=>S.charsOwned()},
  {id:'imp_cx1', name:'Naturalista',         ico:'📖', desc:'Scopri 10 voci del codex',       cat:'codex',   goal:10,   rs:500,  rc:0, cond:S=>S.codexSeen()},
  {id:'imp_cx2', name:'Archivista',          ico:'📚', desc:'Scopri 20 voci del codex',       cat:'codex',   goal:20,   rs:1500, rc:2, cond:S=>S.codexSeen()},
  {id:'imp_cx3', name:'Onnisciente',         ico:'🧠', desc:'Completa il codex',              cat:'codex',   goal:CODEX_TOTAL, rs:5000, rc:6, cond:S=>S.codexSeen()},
  {id:'imp_l4',  name:'Sprofondato',         ico:'🌑', desc:'Raggiungi il settore 150',       cat:'profondita',goal:150, rs:12000,rc:8, cond:S=>S.stat('maxLevel')},
  {id:'imp_k4',  name:'Leggenda del Deserto',ico:'☄️', desc:'Elimina 500.000 nemici',         cat:'guerra',  goal:500000,rs:15000,rc:10,cond:S=>S.stat('kills')},
  {id:'imp_b3',  name:'Re dei Re',           ico:'👑', desc:'Abbatti 500 boss',               cat:'boss',    goal:500,  rs:9000, rc:6, cond:S=>S.stat('bosses')},
  {id:'imp_c3',  name:'Trance di Morte',     ico:'🌀', desc:'Raggiungi una combo di 200',     cat:'maestria',goal:200,  rs:5000, rc:5, cond:S=>S.stat('maxCombo')},
  {id:'imp_k5',  name:'Annientatore',        ico:'🌑', desc:'Elimina 1.000.000 nemici',       cat:'guerra',  goal:1000000,rs:30000,rc:15,cond:S=>S.stat('kills')},
  {id:'imp_run2',name:'Immortale del Deserto',ico:'🏵️', desc:'Completa 250 run',               cat:'maestria',goal:250,  rs:4000, rc:3, cond:S=>S.stat('runs')},
  {id:'imp_nuke2',name:'Inverno Nucleare',   ico:'☢️', desc:'Usa 200 atomiche',               cat:'maestria',goal:200,  rs:3000, rc:3, cond:S=>S.stat('nukes')},
];

/* ---------------------- DAILY REWARDS ---------------------- */
const DAILY_REWARDS = [
  {day:1, scrap:60,   cores:0},
  {day:2, scrap:100,  cores:0},
  {day:3, scrap:160,  cores:0},
  {day:4, scrap:240,  cores:1},
  {day:5, scrap:320,  cores:0},
  {day:6, scrap:450,  cores:0},
  {day:7, scrap:700,  cores:2},
];
const CORE_REROLL_COST = 1;
const CORE_INSTANT_CHAR = 6;

/* ===================== CODEX runtime ===================== */
function codexName(id){
  if(typeof EN_CODEX!=='undefined' && _T() && EN_CODEX[id] && EN_CODEX[id].name) return EN_CODEX[id].name;
  for(const t of [CODEX_ENEMIES,CODEX_BOSSES,CODEX_BIOMES]){ const o=t.find(x=>x.id===id); if(o) return o.name; }
  return id;
}
function codexMark(kind,id){
  if(!id) return;
  const cx=SaveData.data.codex;
  if(!cx[id]){ cx[id]=1; SaveData.save();
    if(typeof G!=='undefined' && G.state==='playing'){
      if(kind==='enemy') banner(UL('NUOVO','NEW')+': '+codexName(id), UL('voce codex','codex entry'), false);
      else banner('CODEX', UL('nuova voce','new entry'), false);
    }
  }
}
function codexSeenCount(){
  const cx=SaveData.data.codex||{}; let n=0;
  for(const e of CODEX_ENEMIES) if(cx[e.id]) n++;
  for(const b of CODEX_BOSSES)  if(cx[b.id]) n++;
  for(const m of CODEX_BIOMES)  if(cx[m.id]) n++;
  return n;
}
function bossKindsSeen(){ const cx=SaveData.data.codex||{}; let n=0; for(const b of CODEX_BOSSES) if(cx[b.id]) n++; return n; }

/* ===================== ACHIEVEMENTS context ===================== */
const ACH_CTX = {
  stat:k=>Store.stat(k),
  wkill:id=>SaveData.data.stats['wkill_'+id]||0,
  weaponsAt:n=>WEAPONS.reduce((c,w)=>c+(((SaveData.data.stats['wkill_'+w.id]||0)>=n)?1:0),0),
  threat:()=>SaveData.data.threat||0,
  codexSeen:()=>codexSeenCount(),
  bossKindsSeen:()=>bossKindsSeen(),
  charsOwned:()=>CHARACTERS.reduce((c,ch)=>c+(Store.ownsC(ch.id)?1:0),0),
};
function achProgress(a){ return Math.min(a.cond(ACH_CTX), a.goal); }
function achDone(a){ return a.cond(ACH_CTX) >= a.goal; }

/* ===================== Daily helpers ===================== */
function dailyAvailable(){ const d=SaveData.data.daily; return !d || d.last!==new Date().toDateString(); }
function dailyTodayReward(){
  const d=SaveData.data.daily||{streak:0};
  const last=d.last;
  let nextStreak;
  if(!last) nextStreak=1;
  else { const y=new Date(); y.setDate(y.getDate()-1); nextStreak = (last===y.toDateString()) ? (d.streak%7)+1 : 1; }
  return DAILY_REWARDS[nextStreak-1] || DAILY_REWARDS[0];
}

/* ===================== Screen builders ===================== */
const EN_ACH={
  imp_k1:{name:'Ash Baptism',desc:'Kill 500 enemies'},
  imp_k2:{name:'Reaper',desc:'Kill 25,000 enemies'},
  imp_k3:{name:'Personal Apocalypse',desc:'Kill 100,000 enemies'},
  imp_wp:{name:'Loyal to the Drifter',desc:'1,500 kills with the Pistol'},
  imp_ws:{name:'Point Blank',desc:'1,500 kills with the Shotgun'},
  imp_wm:{name:'Meat Grinder',desc:'2,500 kills with the SMG'},
  imp_wr:{name:'Straight Line',desc:'800 kills with the Railgun'},
  imp_wf:{name:'Burning Fury',desc:'2,000 kills with the Flamethrower'},
  imp_wl:{name:'Rain of Fire',desc:'1,000 kills with the Launcher'},
  imp_wt:{name:'Conductor',desc:'1,200 kills with the Tesla'},
  imp_wc:{name:'Cold Blooded',desc:'1,200 kills with the Cryo'},
  imp_wg:{name:'Overheat',desc:'3,000 kills with the Minigun'},
  imp_warm:{name:'Full Arsenal',desc:'At least 200 kills with every weapon'},
  imp_b1:{name:'Titan Hunter',desc:'Defeat 25 bosses'},
  imp_b2:{name:'Kingslayer',desc:'Defeat 150 bosses'},
  imp_bn:{name:'Without a Scratch',desc:'Kill a boss without taking damage'},
  imp_bn3:{name:'Untouchable',desc:'5 bosses killed without damage'},
  imp_bcyc:{name:'Full Circle',desc:'Defeat all 10 different bosses'},
  imp_l1:{name:'Into the Depths',desc:'Reach sector 30'},
  imp_l2:{name:'Beyond the Threshold',desc:'Reach sector 60'},
  imp_l3:{name:'The Abyss Calls',desc:'Reach sector 100'},
  imp_t1:{name:'Threat 3',desc:'Unlock threat tier 3'},
  imp_t2:{name:'Threat 6',desc:'Unlock threat tier 6'},
  imp_t3:{name:'Code Red',desc:'Unlock threat tier 10'},
  imp_c1:{name:'Chained Fury',desc:'Reach a combo of 50'},
  imp_c2:{name:'Death Dance',desc:'Reach a combo of 100'},
  imp_sc:{name:'One Hundred Thousand',desc:'Score 100,000 points in a run'},
  imp_run:{name:'Born Survivor',desc:'Complete 100 runs'},
  imp_pt:{name:'Sleepless',desc:'Play for 2 total hours'},
  imp_nuke:{name:'Mushroom Cloud',desc:'Use 50 nukes'},
  imp_s1:{name:'Jackal',desc:'Accumulate 25,000 total scrap'},
  imp_s2:{name:'Desert Tycoon',desc:'Accumulate 200,000 total scrap'},
  imp_asc1:{name:'Ascended',desc:'Ascend once'},
  imp_asc2:{name:'Transcendence',desc:'Ascend 10 times'},
  imp_chr:{name:'Company of Misfortune',desc:'Unlock 4 survivors'},
  imp_cx1:{name:'Naturalist',desc:'Discover 10 codex entries'},
  imp_cx2:{name:'Archivist',desc:'Discover 20 codex entries'},
  imp_cx3:{name:'Omniscient',desc:'Complete the codex'},
  imp_l4:{name:'Sunken',desc:'Reach sector 150'},
  imp_k4:{name:'Desert Legend',desc:'Kill 500,000 enemies'},
  imp_b3:{name:'King of Kings',desc:'Defeat 500 bosses'},
  imp_c3:{name:'Death Trance',desc:'Reach a combo of 200'},
  imp_k5:{name:'Annihilator',desc:'Kill 1,000,000 enemies'},
  imp_run2:{name:'Desert Immortal',desc:'Complete 250 runs'},
  imp_nuke2:{name:'Nuclear Winter',desc:'Use 200 nukes'},
};
const EN_CHALLENGE={
  k1:{name:'Exterminator I'}, k2:{name:'Exterminator II'}, b1:{name:'Hunter I'}, b2:{name:'Hunter II'},
  l1:{name:'Explorer I'}, l2:{name:'Explorer II'}, l3:{name:'Explorer III'}, c1:{name:'Death Chain'},
  s1:{name:'Greedy'}, n1:{name:'Atomic'}, r1:{name:'Veteran'}, a2:{name:'Ascended II'},
  s2c:{name:'Treasurer'}, bn1:{name:'Untouchable'}, pt1:{name:'Marathoner'}, r2:{name:'Living Legend'},
  k3:{name:'Exterminator III'}, b3c:{name:'Hunter III'}, l4c:{name:'Explorer IV'},
};
const EN_CODEX={
  walker:{name:'Wanderer',lore:'Mindless marching flesh. Slow but tireless: where one falls, two rise.'},
  runner:{name:'Sprinter',lore:'Once human, now only fast hunger. It reaches you before you hear its breath.'},
  spitter:{name:'Spitter',lore:'Toxic sacs instead of lungs. Keeps its distance and showers acid.'},
  brute:{name:'Brute',lore:'A mountain of mutated muscle. Every blow breaks bone; every step shakes the ash.'},
  bomber:{name:'Detonator',lore:'It runs at you with an unstable grin. Its only weapon is its own end.'},
  shielder:{name:'Shieldbearer',lore:'Drags a slab of rusted metal. Hit it from behind, or you will not scratch it.'},
  swarmer:{name:'Brood',lore:'A bloated mother birthing miniature horrors without ever stopping.'},
  mite:{name:'Mite',lore:'Small, fast, countless. Alone nothing; in a swarm, a tide.'},
  leaper:{name:'Leaper',lore:'It crouches, charges, and lunges at you from ten meters. Do not stand still.'},
  healer:{name:'Healer',lore:'It pulses with malign energy and raises the fallen. Kill it first.'},
  sniper:{name:'Sniper',lore:'It takes aim in the shadows. When the beam locks, you have one beat to move.'},
  blinker:{name:'Translucent',lore:'It exists in flickers. Vanishes where you aim and reappears where you do not want.'},
  bubbler:{name:'Encased',lore:'A bubble of energy coats it and reforms. Break it fast, before it returns.'},
  summoner:{name:'Summoner',lore:'It tears rifts in the air and pulls out more. Its death calms the horde.'},
  zealot:{name:'Zealot',lore:'It flies straight to its end like an explosive prayer. Do not let it embrace you.'},
  rammer:{name:'Rammer',lore:'A charge of armored muscle. When it lowers its head, get out of the way.'},
  wraith:{name:'Wraith',lore:'It drifts where others drown. You see it only when it is already too close.'},
  gunner:{name:'Gunner',lore:'It keeps its distance and unloads aimed shots. Close the gap or find cover.'},
  brawler:{name:'Brawler',lore:'A mid-rank brute, slow but tough. It resists knockback and pounds relentlessly.'},
  looter:{name:'Scavenger',lore:'It does not fight: it flees with loot on its back. Chase it down before it vanishes, or the treasure is gone.'},
  butcher:{name:'The Butcher',lore:'It wears the aprons of its victims. Charges like a bull drunk on blood.'},
  bloated:{name:'The Bloated',lore:'A walking sack of gas and larvae. When it bursts, it leaves heirs everywhere.'},
  warlord:{name:'Warlord',lore:'It commands the hordes with military discipline. Calls reinforcements at every wound.'},
  colossus:{name:'The Colossus',lore:'An animated industrial wreck. Slow as an ice age, hard as steel.'},
  necromancer:{name:'The Necromancer',lore:'It whispers to the dead and the dead obey. Its army never ends.'},
  twins:{name:'The Twins',lore:'They share a single heart. While one remains, the other does not truly die.'},
  artillery:{name:'The Artillerist',lore:'It bombards the horizon from afar. To survive means never stopping running.'},
  splitter:{name:'The Schism',lore:'Struck, it does not die: it splits. Two hungry halves instead of one.'},
  hivequeen:{name:'The Swarm Queen',lore:'A hive with a crown. It spawns children until its throne falls.'},
  duelist:{name:'The Mirror Duelist',lore:'Fast as a reflex. It flashes to your side and cuts before you turn.'},
  reaver:{name:'The Reaver',lore:'It never closes in: it orbits and drowns you in barrages of bullets. Do not stop moving.'},
  overseer:{name:'The Overseer',lore:'It weaves spirals of bullets that swallow the arena. Read the rhythm and slip between the arms.'},
  quaker:{name:'The Quaker',lore:'A stone golem that tears the ground open. Every slam sends waves of shrapnel: leap clear before they close.'},
  aegis:{name:'The Aegis',lore:'A walking bastion. Its frontal shield deflects every shot: circle around and strike the exposed reactor on its back.'},
  ash:{name:'Grey Ash',lore:'Where it all began to burn. The ash never stops falling.'},
  toxic:{name:'Toxic Expanse',lore:'Green pools that eat your boots. The air itself is a slow sentence.'},
  blood:{name:'Blood Night',lore:'The sky is an open wound. Here predators hunt faster.'},
  sand:{name:'Sandstorm',lore:'The wind blinds and hides snipers. Trust your ears, not your eyes.'},
  rad:{name:'Radioactive Zone',lore:'The counters go wild. Something under the blue sand is still awake.'},
  ice:{name:'Eternal Frost',lore:'The cold preserves monsters like relics. Brutes thrive in the ice.'},
  swamp:{name:'Rotting Swamp',lore:'Mud that sucks and hides. Every bubble is a hatching nest.'},
  ruins:{name:'City in Ruins',lore:'The skeleton of the old civilization. Snipers and shieldbearers patrol the rubble.'},
  lava:{name:'Infernal Caldera',lore:'The earth cracks and bleeds fire. Only the toughest dare descend here.'},
  snowrad:{name:'Radioactive Snow',lore:'Flakes that glow with poison. The deadliest beauty on the continent.'},
  crypt:{name:'Forgotten Crypt',lore:'Desecrated tombs and black magic. The dead here never rest.'},
  flood:{name:'Flooded Plain',lore:'The water swallowed everything. Beneath the surface something still moves.'},
  storm:{name:'Electric Storm',lore:'Lightning that never touches the ground. The air hums with static death.'},
  bone:{name:'Ossuary',lore:'A plain of calcified bones. You walk on the remains of those who fell before.'},
  glass:{name:'Glass Desert',lore:'Sand fused by the old fire into razor sheets. Everything here reflects, and cuts.'},
  fungal:{name:'Fungal Forest',lore:'Bioluminescent spores blanket everything. Breathe too long and you become part of it.'},
};
const EN_EVENT={
  shrine:{name:'SHRINE',desc:'Take -25% max HP but gain +35% permanent damage this run.',take:'OFFER BLOOD',skip:'LEAVE IT'},
  merchant:{name:'MERCHANT',desc:'Spend 40 scrap: full heal + 1 extra life.',take:'BUY (40 ⬢)',skip:'MOVE ON'},
  cache:{name:'TREASURE ROOM',desc:'+30 scrap and a 40% heal.',take:'COLLECT'},
  forge:{name:'FORGE',desc:'+18% permanent fire rate this run.',take:'UPGRADE',skip:'NO THANKS'},
  medic:{name:'MEDIC STATION',desc:'Full heal + 1.5 HP/s regen for the rest of the run.',take:'HEAL'},
  gamble:{name:'GAMBLE',desc:'Bet 25 scrap: 60% to win +50% permanent damage, 40% to just lose them.',take:'BET (25 ⬢)',skip:'DO NOT RISK'},
  swap:{name:'ABANDONED ARMORY',desc:'Swap your weapon for a random one (with its mastery) for the rest of the run. Pure gamble.',take:'TAKE IT',skip:'KEEP YOURS'},
  cursed:{name:'CURSED BLESSING',desc:'+40% rate and +20% speed, but -20% max HP. The gamble of the desperate.',take:'ACCEPT THE PACT',skip:'REFUSE'},
  altar:{name:'RELIC ALTAR',desc:'A forgotten altar. Offer 60 scrap for a relic... if relics exist.',take:'OFFER (60 ⬢)',skip:'IGNORE'},
  recycler:{name:'RECYCLER',desc:'Convert 30 scrap into +20% permanent movement speed.',take:'CONVERT (30 ⬢)',skip:'NO'},
  oracle:{name:'ORACLE',desc:'+15% crit and +12% bullet speed for the rest of the run.',take:'LISTEN',skip:'IGNORE'},
  butchery:{name:'SLAUGHTERHOUSE',desc:'+35% damage but -10% max HP. For the reckless only.',take:'TAKE IT',skip:'LEAVE'},
  armory:{name:'WEAPON CACHE',desc:'+1 projectile per shot for the rest of the run.',take:'TAKE',skip:'LEAVE'},
  gunsmith:{name:'GUNSMITH',desc:'+15% bullet speed and +1 pierce for the rest of the run.',take:'UPGRADE',skip:'NO THANKS'},
  beacon:{name:'RESCUE BEACON',desc:'Spend 35 scrap: an allied war drone joins you for the run.',take:'ACTIVATE (35 ⬢)',skip:'IGNORE'},
  reactor:{name:'UNSTABLE REACTOR',desc:'+25% damage and +15% bullet speed, but -1 HP/s regen for the rest of the run.',take:'OVERLOAD',skip:'STABILIZE'},
  sanctum:{name:'RUNIC SANCTUM',desc:'Full heal and +20 max HP for the rest of the run.',take:'MEDITATE'},
};

function buildAchievements(){
  const grid=el('achGrid'); if(!grid) return; grid.innerHTML='';
  if(el('achCores')) el('achCores').textContent=Store.cores;
  const total=ACHIEVEMENTS.length, got=ACHIEVEMENTS.filter(a=>SaveData.data.claimed[a.id]).length;
  if(el('achProgLbl')) el('achProgLbl').textContent=got+'/'+total;
  for(const a of ACHIEVEMENTS){
    const cur=achProgress(a), done=SaveData.data.claimed[a.id], can=Store.achClaimable(a);
    const card=document.createElement('div'); card.className='shop-card'+(done?' maxed':'');
    const pct=Math.round(cur/a.goal*100);
    const rwd = (a.rs?('⬢ '+a.rs):'') + (a.rs&&a.rc?'  ':'') + (a.rc?('⬡ '+a.rc):'');
    const btn = done ? `<button class="shop-buy" disabled>${UL('RISCOSSO ✓','CLAIMED ✓')}</button>`
                     : `<button class="shop-buy ${can?'':'cant'}" ${can?'':'disabled'}>${rwd}</button>`;
    card.innerHTML=`<div class="ico">${a.ico}</div><div class="name">${TN(EN_ACH,a)}</div>`+
      `<div class="desc">${TD(EN_ACH,a)}</div><div class="desc">${cur}/${a.goal}</div>`+
      `<div class="prog"><div style="width:${pct}%"></div></div>${btn}`;
    const b=card.querySelector('.shop-buy');
    if(can) b.addEventListener('click',()=>{
      const r=Store.achClaim(a);
      if(r){ Audio2.levelup(); G.updateScrapUI();
        banner('IMPRESA', (r.scrap?('+'+r.scrap+' ⬢'):'')+(r.cores?('  +'+r.cores+' ⬡'):''));
        buildAchievements(); }
    });
    grid.appendChild(card);
  }
}
function buildCodex(){
  const grid=el('codexGrid'); if(!grid) return; grid.innerHTML='';
  const cx=SaveData.data.codex||{};
  if(el('codexProgLbl')) el('codexProgLbl').textContent=codexSeenCount()+'/'+CODEX_TOTAL;
  const section=(title,list)=>{
    const h=document.createElement('h3'); h.className='shop-sec'; h.textContent=title; grid.appendChild(h);
    const sub=document.createElement('div'); sub.className='shop-grid';
    for(const it of list){
      const seen=!!cx[it.id];
      const card=document.createElement('div'); card.className='shop-card'+(seen?'':' locked');
      card.innerHTML = seen
        ? `<div class="ico">${it.ico}</div><div class="name">${TN(EN_CODEX,it)}</div><div class="desc">${TL(EN_CODEX,it)}</div>`
        : `<div class="ico">❔</div><div class="name">???</div><div class="desc">${_T()?'Not yet discovered.':'Non ancora scoperto.'}</div>`;
      sub.appendChild(card);
    }
    grid.appendChild(sub);
  };
  section(_T()?'ENEMIES':'NEMICI', CODEX_ENEMIES);
  section(_T()?'BOSSES':'BOSS',   CODEX_BOSSES);
  section(_T()?'BIOMES':'BIOMI',  CODEX_BIOMES);
}
function buildMarket(){
  const grid=el('marketGrid'); if(!grid) return; grid.innerHTML='';
  if(el('marketCores')) el('marketCores').textContent=Store.cores;
  for(const it of CORE_SHOP){
    const lvl=Store.coreLvl(it.id), maxed=lvl>=it.max, cost=Store.coreCost(it);
    const card=document.createElement('div'); card.className='shop-card'+(maxed?' maxed':'');
    let dots=''; for(let i=0;i<it.max;i++) dots+=`<span class="dot${i<lvl?' on':''}"></span>`;
    const tag = it.kind==='relic' ? `<div class="cstyle" style="color:var(--amber)">${UL('RELIQUIA','RELIC')}</div>` : '';
    const btn = maxed ? `<button class="shop-buy" disabled>${it.kind==='perk'?UL('MASSIMO','MAX'):UL('SBLOCCATO ✓','UNLOCKED ✓')}</button>`
      : `<button class="shop-buy core ${Store.cores<cost?'cant':''}">⬡ ${cost}</button>`;
    card.innerHTML=`<div class="ico">${it.ico}</div><div class="name">${TN(EN_CORESHOP,it)}</div><div class="desc">${TDF(EN_CORESHOP,it,maxed?lvl:lvl+1)}</div>${tag}`+
                   (it.max>1?`<div class="dots">${dots}</div>`:'')+btn;
    const bb=card.querySelector('.shop-buy');
    if(!maxed) bb.addEventListener('click',()=>{
      if(Store.buyCore(it)){ Audio2.upgrade(); G.updateScrapUI(); buildMarket();
        banner(it.kind==='perk'?'ACQUISTATO':'RELIQUIA SBLOCCATA'); } else Audio2.hurt(); });
    grid.appendChild(card);
  }
  if(typeof buildCurrencyPacks==='function') buildCurrencyPacks();
}
function applyCosmetics(p){
  const co = (SaveData.data.cosmetics)||{};
  const sk = COSMETIC('skin', co.skin), tr = COSMETIC('trail', co.trail), fx = COSMETIC('fx', co.fx);
  if(sk.id!=='default' && sk.tint) p.charTint = sk.tint;
  p.auraColor = (sk.id!=='default') ? (sk.aura||null) : null;
  p.trailColor = (tr.id!=='default') ? (tr.color||null) : null;
  p.deathFx = { color: fx.color||'#ff3b3b', style: fx.style||'burst' };
}
let _cosmeticTab='skin';
function buildCosmetics(){
  const grid=el('cosmeticsGrid'); if(!grid) return; grid.innerHTML='';
  if(el('cosmCores')) el('cosmCores').textContent=Store.cores;
  const tabs=el('cosmeticsTabs');
  if(tabs){ tabs.innerHTML='';
    for(const t of COSMETIC_TABS){
      const b=document.createElement('button');
      b.className='seg-b'+(t.kind===_cosmeticTab?' on':''); b.dataset.kind=t.kind; b.textContent=_T()?({CORPO:'BODY',SCIA:'TRAIL',MORTE:'DEATH'}[t.label]||t.label):t.label;
      b.addEventListener('click',()=>{ _cosmeticTab=t.kind; buildCosmetics(); });
      tabs.appendChild(b);
    }
  }
  const tab=COSMETIC_TABS.find(t=>t.kind===_cosmeticTab)||COSMETIC_TABS[0];
  const selId=tab.sel();
  for(const c of tab.list()){
    const owned=Store.ownsCosmetic(tab.kind,c.id), sel=(c.id===selId); const u=c.unlock||{};
    const card=document.createElement('div'); card.className='shop-card'+(sel?' sel':'')+(owned?'':' locked');
    const swatch = (tab.kind==='trail') ? (c.color||'#ffe0a0') : (tab.kind==='skin') ? (c.tint||'#8b94a3') : (c.color||'#ff3b3b');
    let btn;
    if(sel)            btn=`<button class="shop-buy" disabled>${UL('EQUIPAGGIATO ✓','EQUIPPED ✓')}</button>`;
    else if(owned)     btn=`<button class="shop-buy">${UL('EQUIPAGGIA','EQUIP')}</button>`;
    else if(u.core!=null){ const can=Store.cores>=u.core; btn=`<button class="shop-buy core ${can?'':'cant'}" ${can?'':'disabled'}>⬡ ${u.core}</button>`; }
    else if(u.threat!=null) btn=`<button class="shop-buy cant" disabled>${UL('MINACCIA','THREAT')} ${u.threat}</button>`;
    else if(u.ach)          btn=`<button class="shop-buy cant" disabled>${UL('IMPRESA','ACHIEVEMENT')}</button>`;
    else                    btn=`<button class="shop-buy cant" disabled>${UL('BLOCCATO','LOCKED')}</button>`;
    card.innerHTML=`<div class="ico" style="color:${swatch};text-shadow:0 0 10px ${swatch}">${c.ico}</div><div class="name">${TC(tab.kind,c,'name')}</div><div class="desc">${TC(tab.kind,c,'desc')}</div>`+btn;
    const b=card.querySelector('.shop-buy');
    if(b && !sel){
      if(owned) b.addEventListener('click',()=>{ Store.selectCosmetic(tab.kind,c.id); Audio2.upgrade(); buildCosmetics(); });
      else if(u.core!=null && Store.cores>=u.core) b.addEventListener('click',()=>{
        if(Store.unlockCosmetic(c,tab.kind)){ Audio2.levelup(); G.updateScrapUI(); Store.selectCosmetic(tab.kind,c.id);
          banner('SBLOCCATO', TC(tab.kind,c,'name')+'  -'+u.core+' ⬡'); buildCosmetics(); }
        else { Audio2.hurt(); banner('NUCLEI INSUFFICIENTI'); } });
    }
    grid.appendChild(card);
  }
}
function buildDaily(){
  const grid=el('dailyGrid'); if(!grid) return; grid.innerHTML='';
  const d=SaveData.data.daily||{streak:0};
  const avail=dailyAvailable();
  const todayDay=avail?dailyTodayReward().day:((d.streak-1)%7)+1;
  for(const r of DAILY_REWARDS){
    const claimedSlot = r.day < todayDay || (!avail && r.day===todayDay);
    const isToday = avail && r.day===todayDay;
    const card=document.createElement('div');
    card.className='shop-card daily-cell'+(claimedSlot?' maxed':'')+(isToday?' sel':'');
    const rwd=(r.scrap?('⬢'+r.scrap):'')+(r.cores?(' ⬡'+r.cores):'');
    card.innerHTML=`<div class="name">G${r.day}</div><div class="desc">${rwd}</div>`+
      (claimedSlot?`<div class="ico">✓</div>`:(isToday?`<div class="ico">🎁</div>`:`<div class="ico">🔒</div>`));
    grid.appendChild(card);
  }
  const btn=el('dailyClaimBtn');
  if(btn){ btn.disabled=!avail; btn.textContent = avail?UL('RISCUOTI','CLAIM'):UL('GIÀ RISCOSSO OGGI','ALREADY CLAIMED TODAY'); }
}
function openDaily(){ buildDaily(); show('dailyModal'); }
function claimDaily(){
  const r=Store.dailyClaim();
  if(r){ Audio2.levelup(); G.updateScrapUI();
    banner('GIORNO '+r.day, '+'+r.scrap+' ⬢'+(r.cores?('  +'+r.cores+' ⬡'):''));
    buildDaily(); if(typeof refreshDailyPill==='function') refreshDailyPill(); }
}

/* ---------------------- STORE (wraps SaveData blob) ---------------------- */
const Store = {
  load(){ if(!SaveData.data) SaveData.load(); },
  get scrap(){ return SaveData.data.devCheat ? 9999999 : SaveData.data.scrap; }, set scrap(v){ SaveData.data.scrap=Math.max(0,Math.round(v)); },
  get meta(){ return SaveData.data.meta; },
  get prestige(){ return SaveData.data.prestige; }, set prestige(v){ SaveData.data.prestige=v; },
  get weapon(){ return SaveData.data.weapon; }, set weapon(v){ SaveData.data.weapon=v; },
  get ability(){ return SaveData.data.ability; }, set ability(v){ SaveData.data.ability=v; },
  save(){ SaveData.save(); },
  lvl(id){ return SaveData.data.meta[id]||0; },
  costOf(item){ const l=this.lvl(item.id); return Math.round(item.base*(l<=8?Math.pow(1.6,l):Math.pow(1.6,8)*Math.pow(1.42,l-8))); },
  buy(item){ const c=this.costOf(item); if(this.lvl(item.id)>=item.max||this.scrap<c) return false; this.scrap-=c; SaveData.data.meta[item.id]=this.lvl(item.id)+1; this.save(); return true; },
  applyTo(p){
    // CHARACTER first → multipliers compose with META & prestige
    const ch=CHAR(this.character);
    if(ch.stat){ const s=ch.stat;
      if(s.maxHp){ p.maxHp*=s.maxHp; p.hp=p.maxHp; }
      if(s.damage) p.damage*=s.damage;
      if(s.speed) p.speed*=s.speed;
      if(s.fireRate) p.fireRate*=s.fireRate;
      if(s.bulletSpeed) p.bulletSpeed*=s.bulletSpeed;
      if(s.dashCd) p.dashCd*=s.dashCd; }
    if(ch.apply) ch.apply(p);
    p.charId=ch.id; p.charTint=ch.tint;
    for(const it of META){ const l=this.lvl(it.id); if(l>0) it.apply(p,l); }
    const pr=this.prestige; p.prestige=pr;
    if(pr>0){ p.maxHp*=1+Math.min(pr*0.06,0.6); p.hp=p.maxHp; p.damage*=1+Math.min(pr*0.06,0.6);
      p.fireRate*=1+Math.min(pr*0.04,0.4); p.speed*=1+Math.min(pr*0.03,0.3); }
    p.weapon = WEAPONS.find(w=>w.id===this.weapon) || WEAPONS[0];
    p.ability= ABILITIES.find(a=>a.id===this.ability) || ABILITIES[0];
    if(ch.weapon) p.weapon = WEAPONS.find(w=>w.id===ch.weapon) || p.weapon;   // character keeps its signature WEAPON (free)
    // NB: the ABILITY is always the player's own pick — characters no longer override it (was forcing the turret)
    if(typeof applyMastery==='function') applyMastery(p);   // permanent weapon mastery bonuses
    if(typeof applyCoreShop==='function') applyCoreShop(p);   // permanent MERCATO NERO perks
  },
  // characters
  get character(){ return SaveData.data.character; }, set character(v){ SaveData.data.character=v; },
  ownsC(id){ const c=CHAR(id); return (c.cost===0 && !c.req) ? true : !!SaveData.data.ownedC[id]; },
  buyC(c){
    if(this.ownsC(c.id)) return false;
    if(c.req){ if(this.stat(c.req.stat)<c.req.goal) return false; }
    else { if(this.scrap<c.cost) return false; this.scrap-=c.cost; }
    SaveData.data.ownedC[c.id]=1; this.save(); return true;
  },
  selC(id){ if(this.ownsC(id)){ this.character=id; this.save(); return true; } return false; },
  scrapMul(){ return (1 + 0.12*this.lvl('greed')) * (1 + 0.10*this.prestige) * (this.character==='drifter'?1.08:1); },
  // weapons / abilities
  ownsW(id){ return !!SaveData.data.ownedW[id]; }, ownsA(id){ return !!SaveData.data.ownedA[id]; },
  buyW(w){ if(this.ownsW(w.id)||this.scrap<w.price) return false; this.scrap-=w.price; SaveData.data.ownedW[w.id]=1; this.save(); return true; },
  selW(id){ this.weapon=id; this.save(); },
  // per-weapon permanent power upgrade (scrap)
  weaponLvl(id){ return (SaveData.data.weaponLvl&&SaveData.data.weaponLvl[id])||0; },
  weaponUpCost(id){ const l=this.weaponLvl(id); return Math.round(180*Math.pow(1.7,l)); },
  buyWeaponUp(id){ const l=this.weaponLvl(id); if(l>=WEAPON_UP_MAX) return false; const c=this.weaponUpCost(id); if(this.scrap<c) return false;
    this.scrap-=c; if(!SaveData.data.weaponLvl) SaveData.data.weaponLvl={}; SaveData.data.weaponLvl[id]=l+1; this.save(); return true; },
  abilityLvl(id){ return (SaveData.data.abilityLvl&&SaveData.data.abilityLvl[id])||0; },
  abilityUpCost(id){ const l=this.abilityLvl(id); return Math.round(220*Math.pow(1.8,l)); },
  buyAbilityUp(id){ const l=this.abilityLvl(id); if(l>=ABILITY_UP_MAX) return false; const c=this.abilityUpCost(id); if(this.scrap<c) return false;
    this.scrap-=c; if(!SaveData.data.abilityLvl) SaveData.data.abilityLvl={}; SaveData.data.abilityLvl[id]=l+1; this.save(); return true; },
  buyA(a){ if(this.ownsA(a.id)||this.scrap<a.price) return false; this.scrap-=a.price; SaveData.data.ownedA[a.id]=1; this.save(); return true; },
  selA(id){ this.ability=id; this.save(); },
  // prestige
  canAscend(){ return META.every(it=>this.lvl(it.id)>=it.max); },
  ascend(){ if(!this.canAscend()) return false; SaveData.data.meta={}; this.prestige++; SaveData.data.stats.ascensions=(SaveData.data.stats.ascensions||0)+1; this.save(); return true; },
  // stats / challenges
  stat(k){ return SaveData.data.stats[k]||0; },
  addStat(k,n){ SaveData.data.stats[k]=(SaveData.data.stats[k]||0)+n; },
  setStatMax(k,v){ if(v>(SaveData.data.stats[k]||0)) SaveData.data.stats[k]=v; },
  claimable(ch){ return this.stat(ch.stat)>=ch.goal && !SaveData.data.claimed[ch.id]; },
  claim(ch){ if(!this.claimable(ch)) return 0; SaveData.data.claimed[ch.id]=true; this.scrap+=ch.reward; this.save(); return ch.reward; },
  // ---- achievements (Imprese) ----
  achClaimable(a){ return achDone(a) && !SaveData.data.claimed[a.id]; },
  achClaim(a){ if(!this.achClaimable(a)) return null; SaveData.data.claimed[a.id]=true;
    if(typeof RELIC_ACH_UNLOCK!=='undefined' && RELIC_ACH_UNLOCK[a.id] && typeof unlockRelic==='function') unlockRelic(RELIC_ACH_UNLOCK[a.id]);
    if(a.rs) this.scrap+=a.rs; if(a.rc) SaveData.data.cores=(SaveData.data.cores||0)+a.rc; this.save();
    return {scrap:a.rs||0, cores:a.rc||0}; },
  achUnclaimed(){ return ACHIEVEMENTS.filter(a=>this.achClaimable(a)).length; },
  challClaimable(){ return CHALLENGES.filter(c=>this.claimable(c)).length; },
  // ---- cores (Nuclei) ----
  get cores(){ return SaveData.data.devCheat ? 99999 : (SaveData.data.cores||0); }, set cores(v){ SaveData.data.cores=Math.max(0,v|0); },
  spendCores(n){ if(this.cores<n) return false; SaveData.data.cores=this.cores-n; this.save(); return true; },
  addCores(n){ SaveData.data.cores=this.cores+n; this.save(); },
  buyCharWithCores(c){ if(this.ownsC(c.id)) return false; if(!this.spendCores(CORE_INSTANT_CHAR)) return false; SaveData.data.ownedC[c.id]=1; this.save(); return true; },
  coreLvl(id){ const cs=SaveData.data.coreShop; return (cs&&cs[id])||0; },
  coreCost(item){ const l=this.coreLvl(item.id); return (l>=item.max)?0:item.cost(l); },
  buyCore(item){ const l=this.coreLvl(item.id); if(l>=item.max) return false;
    const c=item.cost(l); if(this.cores<c) return false; if(!this.spendCores(c)) return false;
    if(!SaveData.data.coreShop) SaveData.data.coreShop={}; SaveData.data.coreShop[item.id]=l+1;
    if(item.kind==='relic' && item.unlock){ if(!SaveData.data.relicsUnlocked) SaveData.data.relicsUnlocked={}; SaveData.data.relicsUnlocked[item.unlock]=1; }
    this.save(); return true; },
  ownsCosmetic(kind,id){ const c=COSMETIC(kind,id), u=c.unlock||{};
    if(u.free) return true;
    if(u.threat!=null && (SaveData.data.threat||0)>=u.threat) return true;
    if(u.ach && SaveData.data.claimed[u.ach]) return true;
    const o=SaveData.data.cosmeticsOwned||{}; return !!(o[kind] && o[kind][id]); },
  unlockCosmetic(c, kind){ if(this.ownsCosmetic(kind,c.id)) return false;
    const u=c.unlock||{}; if(u.core==null) return false;
    if(!this.spendCores(u.core)) return false;
    const o=SaveData.data.cosmeticsOwned; (o[kind]=o[kind]||{})[c.id]=1; this.save(); return true; },
  selectCosmetic(kind,id){ if(!this.ownsCosmetic(kind,id)) return false; SaveData.data.cosmetics[kind]=id; this.save(); return true; },
  cosmeticUnclaimed(){ let n=0; for(const t of COSMETIC_TABS){ for(const c of t.list()){ const u=c.unlock||{};
    if(u.core!=null && !this.ownsCosmetic(t.kind,c.id) && this.cores>=u.core) n++; } } return n; },
  // ---- daily ----
  dailyClaim(){ if(!dailyAvailable()) return null; const r=dailyTodayReward();
    const d=SaveData.data.daily||{streak:0}; const y=new Date(); y.setDate(y.getDate()-1);
    const newStreak = (d.last===y.toDateString()) ? (d.streak%7)+1 : 1;
    SaveData.data.daily={ last:new Date().toDateString(), streak:newStreak };
    this.scrap+=r.scrap; if(r.cores) SaveData.data.cores=(SaveData.data.cores||0)+r.cores; this.save();
    return {scrap:r.scrap, cores:r.cores||0, day:newStreak}; },
};

/* ---------------------- DRAW HELPERS ---------------------- */
function rrect(ctx,x,y,w,h,r){
  r=Math.min(r,Math.abs(w)/2,Math.abs(h)/2);
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); ctx.fill();
}
function shade(hex,f){
  const n=parseInt(hex.slice(1),16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  r=Math.round(U.clamp(r*f,0,255)); g=Math.round(U.clamp(g*f,0,255)); b=Math.round(U.clamp(b*f,0,255));
  return 'rgb('+r+','+g+','+b+')';
}

/* ---------------------- WEAPON MASTERY runtime ---------------------- */
function masteryXp(id){ const m=SaveData.data.mastery; return (m&&m[id])||0; }
function masteryLevel(id){
  const xp=masteryXp(id); let lv=0;
  for(let i=1;i<MASTERY_XP.length;i++){ if(xp>=MASTERY_XP[i]) lv=i; else break; }
  return lv;
}
function masteryProgress(id){
  const lv=masteryLevel(id); if(lv>=MASTERY_MAX) return 1;
  const xp=masteryXp(id), a=MASTERY_XP[lv], b=MASTERY_XP[lv+1];
  return U.clamp((xp-a)/(b-a),0,1);
}
function isEvolved(id){ return masteryLevel(id)>=MASTERY_MAX; }
// Per-run SHALLOW CLONE of the weapon with mastery+evo baked in; never mutates shared WEAPONS.
function applyMastery(p){
  const w=p.weapon; if(!w) return;
  const id=w.id, lv=masteryLevel(id);
  const wc=Object.assign({}, w);
  p.weapon=wc; p.evo=null; p.masteryLv=lv;
  const wlv=(typeof Store!=='undefined'&&Store.weaponLvl)?Store.weaponLvl(id):0;   // permanent scrap upgrade
  if(wlv>0) wc.dmgMul = wc.dmgMul * (1 + wlv*WEAPON_UP_DMG);
  const g=MASTERY_GROWTH[id];
  if(g && lv>0){
    wc.dmgMul  = wc.dmgMul  * (1 + g.dmg*lv);
    wc.rateMul = wc.rateMul * (1 + g.rate*lv);
    const grantM=(tag)=>{
      if(tag==='pellet') wc.pellets=(wc.pellets||1)+1;
      else if(tag==='chain') wc.chain=(wc.chain||0)+1;
      else if(tag==='pierce') wc.pierceBonus=(wc.pierceBonus||0)+1;
      else if(tag==='chill') wc.chill=(wc.chill||0)+0.3;
      else if(tag==='burn') wc.evoBurnMul=(wc.evoBurnMul||1)*1.4;
      else if(tag==='blast') wc.blastR=(wc.blastR||70)*1.15;
      else if(tag==='rate') wc.rateMul*=1.06;
      else if(tag==='bounce') wc.bounce=(wc.bounce||0)+1;
      else if(tag==='dmg')  wc.dmgMul*=1.10;
    };
    if(lv>=4) grantM(g.m4);
    if(lv>=7) grantM(g.m7);
  }
  if(lv>=MASTERY_MAX && EVOLUTIONS[id]){ const ev=EVOLUTIONS[id]; p.evo=ev.evo; ev.apply(wc,p); }
}
// Bake permanent MERCATO NERO (Nuclei shop) perks into the player at run start.
function applyCoreShop(p){
  for(const it of CORE_SHOP){ if(it.kind!=='perk') continue; const l=Store.coreLvl(it.id); if(l>0 && it.apply) it.apply(p,l); }
  if(p.startSector && p.startSector>1) G._coreStartSector=p.startSector;
  if(p.evoTokenMul && p.weapon){ p.weapon=Object.assign({},p.weapon);
    p.weapon.dmgMul=(p.weapon.dmgMul||1)*(1+p.evoTokenMul*0.25); p.weapon.rateMul=(p.weapon.rateMul||1)*(1+p.evoTokenMul*0.15); }
}
// Award mastery XP to the EQUIPPED weapon. Elites/bosses worth more.
function awardMasteryXp(amount){
  const id=Store.weapon; if(!id) return;
  const m=SaveData.data.mastery; const before=masteryLevel(id);
  m[id]=(m[id]||0)+amount;
  const after=masteryLevel(id);
  if(after>before){
    if(after>=MASTERY_MAX && before<MASTERY_MAX){ banner('ARMA EVOLUTA!'); Audio2.levelup(); }
    else { G.addFloat(G.player.x, G.player.y-56, UL('MAESTRIA L','MASTERY L')+after, true, '#c9b3ff'); Audio2.upgrade(); }
  }
  Store.save();
}

/* ---------------------- PLAYER ---------------------- */
class Player{
  constructor(){
    this.x=WORLD/2; this.y=WORLD/2; this.r=16;
    this.maxHp=100; this.hp=100; this.speed=232;
    this.fireRate=3.6; this.damage=13;
    this.bulletSpeed=640; this.bulletLife=0.95; this.bulletR=5;
    this.multishot=1; this.pierce=0; this.crit=0.04; this.spread=0.06;
    this.regen=0; this.lifesteal=0; this.explosive=false; this.thorns=false;
    this.magnet=1; this.revives=0;
    this.execute=0; this.chillBonus=0; this.burnBonus=false; this.chainBonus=0; this.dr=0;
    this.cd=0; this.aim=-Math.PI/2; this.invuln=0; this.hitFlash=0;
    this.dashCd=3.0; this.dashTimer=0; this.dashActive=0; this.dashDir={x:0,y:0};
    this.muzzle=0; this.walkPhase=0;
    this.weapon=WEAPONS[0]; this.ability=ABILITIES[0]; this.abCd=0; this.abCdMul=1; this.charge=0; this.heat=0;
    // character passives (default neutral)
    this.charScrapMul=1; this.dodge=0; this.thornsMul=0.6;
    this.furnace=false; this.steadyEye=false; this.bloodRage=false; this.rageMul=1; this.charTint=null;
    this.auraColor=null; this.trailColor=null; this.deathFx=null;
    this.evo=null; this.masteryLv=0;
    this.relicBonus=0; this.freeRerolls=0; this.coreGainMul=1; this.coreScrapMul=1; this.startSector=1; this.coreRevives=0; this.evoTokenMul=0; this.startDrones=0; this.startDroneHeal=0; this.startDroneScrap=0; this.droneRateMul=1;
    this.relOrbit=0; this.relFullHpDmg=0; this.relNthCrit=0; this._shotN=0; this.relGreed=0;
    this.relDashDmg=0; this._dashBuff=0; this.relBurnAmp=1; this.relReflect=0; this.relCritHeal=0;
    this.relCritBoom=0; this.relPierceOnKill=false; this.relBossDmg=0; this.relTimeDilate=false;
    this.relReviveInvuln=0; this.relRageRate=0;
  }
  get dashReady(){ return this.dashTimer<=0; }

  update(dt){
    Input.update();
    let mx=Input.move.x, my=Input.move.y, sp=this.speed*(this._hazSlow||1);
    this._hazSlow=1;   // consumed each frame; updateHazards re-applies if standing in a field
    const bfx=this.bfx;
    if(bfx && bfx.move) sp*=bfx.move;   // mire: sucking mud / deep water slows you
    if(this.dashActive>0){
      this.dashActive-=dt; sp=760; mx=this.dashDir.x; my=this.dashDir.y;
      if(U.chance(0.7)) Particles.emit(this.x,this.y,U.rand(-40,40),U.rand(-40,40),0.35,5,'#7ad7ff',{drag:0.9});
      (this.ghosts||(this.ghosts=[])).push({x:this.x,y:this.y,life:0.22});
    }
    if(this.ghosts && this.ghosts.length){ for(const g of this.ghosts) g.life-=dt; if(this.ghosts[0] && this.ghosts[0].life<=0) this.ghosts=this.ghosts.filter(g=>g.life>0); }
    // movement: most biomes move you directly; ice/flood give you MOMENTUM so you slide (low grip)
    if(bfx && (bfx.kind==='slip'||bfx.slip) && this.dashActive<=0){
      const grip=bfx.grip||0.08;
      this.vx=U.lerp(this.vx||0, mx*sp, grip); this.vy=U.lerp(this.vy||0, my*sp, grip);
    } else { this.vx=mx*sp; this.vy=my*sp; }
    const wx=(bfx&&bfx.wind)?Math.cos(G._windA||0)*bfx.wind:0, wy=(bfx&&bfx.wind)?Math.sin(G._windA||0)*bfx.wind:0;
    this.x=U.clamp(this.x+(this.vx+wx)*dt,WALL+this.r,WORLD-WALL-this.r);
    this.y=U.clamp(this.y+(this.vy+wy)*dt,WALL+this.r,WORLD-WALL-this.r);
    if(mx||my) this.walkPhase+=dt*12;

    if(this.dashTimer>0) this.dashTimer-=dt;
    if(this.invuln>0) this.invuln-=dt;
    if(this._fieldGrace>0) this._fieldGrace-=dt;
    if(this.hitFlash>0) this.hitFlash-=dt;
    if(this.muzzle>0) this.muzzle-=dt;
    if(this.abCd>0) this.abCd-=dt;
    if(this._dashBuff>0) this._dashBuff-=dt;
    if(this.regen>0 && this.hp<this.maxHp){ const hm=(this.bfx&&this.bfx.heal)||1; this.hp=Math.min(this.maxHp,this.hp+this.regen*hm*dt); }
    if(this.furnace){ let burning=0; for(const e of G.enemies){ if(e.burnT>0) burning++; } this.rageMul=U.lerp(this.rageMul,1+Math.min(0.40,burning*0.05),Math.min(1,dt*4)); }
    else if(this.bloodRage){ const wr=(1-this.hp/this.maxHp); this.rageMul=1+Math.min(0.60,wr*0.84); this._rageRate = this.relRageRate?(1+Math.min(this.relRageRate,wr*this.relRageRate)):1; }
    // OVERDRIVE: a kill-streak ESCALATES your damage & fire-rate (separate from character rage, so it stacks). Ramps in smoothly, decays when the streak drops.
    { const c=G.combo||0, od=U.clamp((c-25)/125,0,1);   // 0 at combo 25 → 1 at combo 150
      this._odMul=U.lerp(this._odMul||1, 1+od*0.45, Math.min(1,dt*5));   // up to +45% damage
      this._odRate=U.lerp(this._odRate||1, 1+od*0.50, Math.min(1,dt*5)); // up to +50% fire rate
      this._odTier = c>=100?3 : c>=50?2 : c>=25?1 : 0; }
    // elemental reactions arm only once you run 2+ element sources (early runs stay simple)
    { const w=this.weapon; this._elemCount=((this.burnBonus||this.furnace||(w&&w.burn))?1:0)+((this.chillBonus||(w&&(w.chill||w.shatter)))?1:0)+((this.chainBonus||(w&&w.chain))?1:0); }
    if(this._gsCd>0) this._gsCd-=dt;   // GLASS STORM volley cooldown
    if(this._bloodT>0){ this._bloodT-=dt; if(this._bloodT<=0) this._bloodStacks=0; }   // BLOOD ENGINE stacks decay if you stop killing
    this._bloodMul = 1 + Math.min(0.30,(this._bloodStacks||0)*0.02);

    if(Input.consumeDash()) this.tryDash(mx,my);
    this.resolveAim();

    // fire (weapon-aware, with railgun charge)
    const w=this.weapon;
    if(w.pattern==='charge'){
      if(G.enemies.length && this.aimTarget()){ this.charge+=dt; if(this.charge>=w.chargeTime){ this.shoot(); this.charge=0; } }
      else this.charge=Math.max(0,this.charge-dt*2);
    } else {
      this.cd-=dt;
      const firing = G.enemies.length && this.aimTarget();
      if(w.ramp){ this.heat = firing ? Math.min(1,this.heat+dt*0.7) : Math.max(0,this.heat-dt*1.5); }
      else this.heat=0;
      if(this.cd<=0 && firing){ this.shoot(); const rampMul = w.ramp ? (1+this.heat*(w.rampMax||1.8)) : 1; this.cd=1/(this.fireRate*w.rateMul*rampMul*(this._rageRate||1)*(this._odRate||1)); }
    }
  }

  tryDash(mx,my){
    if(this.dashTimer>0) return;
    let dx=mx,dy=my; if(!dx&&!dy){ dx=Math.cos(this.aim); dy=Math.sin(this.aim); }
    const l=Math.hypot(dx,dy)||1; this.dashDir={x:dx/l,y:dy/l};
    this.dashActive=0.18; this.dashTimer=this.dashCd; this.invuln=Math.max(this.invuln,0.28);
    if(this.relDashDmg) this._dashBuff=2.5;
    Audio2.dash(); Camera.shake(6,0.15); Haptic.light();
  }

  useAbility(){
    if(this.abCd>0) return; const a=this.ability;
    const abLv=(typeof Store!=='undefined'&&Store.abilityLvl)?Store.abilityLvl(a.id):0;
    const pow=1+abLv*ABILITY_UP_POW;   // permanent shop upgrade: potency on damage/duration/heal
    this.abCd=a.cd*(this.abCdMul||1)*(1-abLv*ABILITY_UP_CD);
    this.abCdMax=this.abCd;            // HUD ring counts down from the EFFECTIVE cooldown
    if(a.id==='turret'){ G.turrets.push(new Turret(this.x,this.y,pow)); }
    else if(a.id==='shock'){
      G.explode(this.x,this.y,220,this.damage*2.2*pow);
      for(const e of G.enemies){ if(U.dist(this.x,this.y,e.x,e.y)<240){ const an=U.angle(this.x,this.y,e.x,e.y); e.kbx=(e.kbx||0)+Math.cos(an)*400; e.kby=(e.kby||0)+Math.sin(an)*400; } }
    }
    else if(a.id==='slow'){ G.slowT=4*pow; }
    else if(a.id==='shield'){ this.invuln=Math.max(this.invuln,3*pow); }
    else if(a.id==='bunker'){ G.walls=G.walls||[]; const fa=this.aim; for(let i=-1;i<=1;i++){ G.walls.push({x:this.x+Math.cos(fa)*70+Math.cos(fa+Math.PI/2)*i*40, y:this.y+Math.sin(fa)*70+Math.sin(fa+Math.PI/2)*i*40, r:26, life:6*pow}); } }
    else if(a.id==='rally'){ G.turrets.push(new Turret(this.x+30,this.y,pow)); G.turrets.push(new Turret(this.x-30,this.y,pow)); this.hp=Math.min(this.maxHp,this.hp+this.maxHp*0.25*pow); }
    else if(a.id==='nova'){ G.explode(this.x,this.y,320,this.damage*3.4*pow);
      for(const e of G.enemies){ if(U.dist(this.x,this.y,e.x,e.y)<340){ const an=U.angle(this.x,this.y,e.x,e.y); e.kbx=(e.kbx||0)+Math.cos(an)*560; e.kby=(e.kby||0)+Math.sin(an)*560; } }
      Camera.shake(16,0.45); }
    else if(a.id==='singularity'){   // deploy a gravity well AHEAD of the player → clusters the horde away from you, then implodes
      const gx=U.clamp(this.x+Math.cos(this.aim)*220, WALL+40, WORLD-WALL-40), gy=U.clamp(this.y+Math.sin(this.aim)*220, WALL+40, WORLD-WALL-40);
      (G.singularities||(G.singularities=[])).push({x:gx,y:gy,t:0,life:2.2,r:330,dmg:this.damage*2.8*pow}); }
    G.abilityUses=(G.abilityUses||0)+1;
    // ability-specific activation: a SHOCKWAVE ring sized to the effect radius (shows reach) in the power's colour
    const fx=(typeof AB_FX!=='undefined'&&AB_FX[a.id])||{col:'#bfe6ff',ring:60};
    const n=Math.min(46,14+Math.round(fx.ring/11)), sp=fx.ring/0.42;
    for(let i=0;i<n;i++){ const an=i/n*TAU; Particles.emit(this.x+Math.cos(an)*this.r,this.y+Math.sin(an)*this.r,Math.cos(an)*sp,Math.sin(an)*sp,0.42,5,fx.col,{drag:0.86,shrink:true,glow:true}); }
    Particles.burst(this.x,this.y,14,fx.col,{speed:180,life:0.35,size:5,glow:true});
    if(fx.shake) Camera.shake(fx.shake[0],fx.shake[1]); else Camera.shake(8,0.2);
    (Audio2[a.sfx]||Audio2.dash).call(Audio2); Haptic.medium();
  }

  resolveAim(){
    if(Input.aimTouch.active){
      const dx=Input.aimTouch.x-Input.aimTouch.ox, dy=Input.aimTouch.y-Input.aimTouch.oy;
      if(Math.hypot(dx,dy)>8){ this.aim=Math.atan2(dy,dx); return; }
    }
    if(Input.mouse.active && Input.mouse.moved && !('ontouchstart' in window)){
      const wx=Input.mouse.x+Camera.x, wy=Input.mouse.y+Camera.y;
      this.aim=Math.atan2(wy-this.y,wx-this.x);
    }
    const t=this.aimTarget();
    if(t && !Input.aimTouch.active) this.aim=U.angleLerp(this.aim, Math.atan2(t.y-this.y,t.x-this.x), 0.5);
  }
  aimTarget(){ let best=null,bd=1e9; for(const e of G.enemies){ if(e.dead) continue; const d=U.dist2(this.x,this.y,e.x,e.y); if(d<bd){bd=d;best=e;} } return best; }

  shoot(){
    const w=this.weapon;
    const n=(w.pellets||1)*this.multishot;
    const dmg0=this.damage*(this.rageMul||1)*(this._odMul||1)*(this._bloodMul||1)*w.dmgMul, spd=this.bulletSpeed*w.speedMul, life=this.bulletLife*w.lifeMul, br=w.bulletR;
    const pierce=this.pierce+(w.pierceBonus||0);
    let explo=this.explosive||w.forceExplosive; if(w.beam) explo=false;
    const bstyle=(typeof WEAPON_STYLE!=='undefined'&&WEAPON_STYLE[w.id])||'bolt';
    const baseSpread=this.spread*(w.spreadMul!=null?w.spreadMul:1);
    const fire=(ang)=>{
      let crit=U.chance(this.crit);
      if(this.relNthCrit){ this._shotN=(this._shotN||0)+1; if(this._shotN>=this.relNthCrit){ this._shotN=0; crit=true; } }
      const critMul = crit?(this.steadyEye?3.5:2.5):1;
      let dmg=dmg0*critMul*(1+(this._dashBuff>0?this.relDashDmg:0));
      if(crit&&this.steadyEye) this.hp=Math.min(this.maxHp,this.hp+1);
      if(crit&&this.relCritHeal) this.hp=Math.min(this.maxHp,this.hp+this.relCritHeal);
      G.bullets.push(new Bullet(this.x+Math.cos(ang)*this.r, this.y+Math.sin(ang)*this.r,
        Math.cos(ang)*spd, Math.sin(ang)*spd, dmg, pierce, life, br, crit, explo,
        {color:this.trailColor||w.color, blastR:w.blastR||(explo?70:0), burn:w.burn||this.burnBonus, burnMul:(w.evoBurnMul||1)*(this.burnMul||1), knock:w.knock||1,
         chill:w.chill||this.chillBonus, chain:(((w.chain||0)+(this.chainBonus||0))?((w.chain||0)+(this.chainBonus||0)+Math.floor(((this.multishot||1)-1)/2)):0),
         critBoom:crit?this.relCritBoom:0, fullHpDmg:this.relFullHpDmg, pierceOnKill:this.relPierceOnKill, bossDmg:this.relBossDmg, burnAmp:this.relBurnAmp, bounce:w.bounce||0,
         homing:w.homing||0, boomerang:w.boomerang||false, cluster:w.cluster||0, shatter:w.shatter||false, refract:w.refract||false, style:bstyle}));
      if(crit && this.relGlassStorm){ this._gsCrit=(this._gsCrit||0)+1; if(this._gsCrit>=6 && (this._gsCd||0)<=0){ this._gsCrit=0; this._gsCd=0.8;   // KEYSTONE Glass Storm: every 6th crit → 360° volley
        for(let k=0;k<12;k++){ const va=k/12*TAU; G.bullets.push(new Bullet(this.x,this.y,Math.cos(va)*spd*0.9,Math.sin(va)*spd*0.9,dmg0*1.2,pierce,life*0.9,br,true,explo,{color:'#bfe9ff',burn:w.burn||this.burnBonus,chill:w.chill||this.chillBonus,style:bstyle})); }
        Particles.burst(this.x,this.y,20,'#bfe9ff',{speed:300,life:0.4,glow:true}); if(window.Audio2&&Audio2.critHit) Audio2.critHit(); } } }; // L10 evolution flags now actually reach the bullet
    if(w.pattern==='spread'||w.pattern==='cone'){
      const arc=w.fanArc||0.6;
      for(let i=0;i<n;i++){ const t=n===1?0.5:i/(n-1); fire(this.aim-arc/2+arc*t+U.rand(-0.04,0.04)); }
    } else {
      const total=(n-1)*baseSpread*2;
      for(let i=0;i<n;i++){ const off=n===1?0:-total/2+i*(baseSpread*2)+U.rand(-baseSpread*0.4,baseSpread*0.4); fire(this.aim+off); }
    }
    this.muzzle=0.06;
    // weapon-scaled recoil KICK so heavy guns feel heavy (rapid weapons stay smooth — no nausea)
    let kick = w.beam?5 : (w.forceExplosive||w.blastR)?4 : (w.knock||0)>=1.5?3 : (w.pellets>=3?1.5:0);
    const mz = 3 + kick*1.6;
    Particles.burst(this.x+Math.cos(this.aim)*this.r, this.y+Math.sin(this.aim)*this.r, w.pattern==='spread'?Math.round(mz*1.6):Math.round(mz), this.trailColor||w.color, {speed:140+kick*30,life:0.18,size:3+kick*0.4,dir:this.aim,spread:w.fanArc||0.7});
    (Audio2[w.sfx]||Audio2.shoot).call(Audio2);
    if(kick && !G.lowFx) Camera.shake(kick, 0.10);
  }

  hurt(dmg,fromX,fromY,src){
    if(this.invuln>0||this.dashActive>0) return;
    if(this.dodge && U.chance(this.dodge)){ this.invuln=0.3; G.addFloat(this.x,this.y-20,UL('SCHIVA!','DODGE!'),false,'#ffd24d'); Audio2.dash(); return; }
    if(src) G._dmgSrc=src;   // remember the last thing to hit us → "killed by X" on the death screen
    if(fromX!=null && fromY!=null){ G._hitDir=Math.atan2(fromY-this.y,fromX-this.x); G._hitDirT=0.7; }   // directional damage tell: edge arc points at the threat
    if(this.dr) dmg*=(1-this.dr);
    this.hp-=dmg; this.invuln=0.6; this.hitFlash=0.3;
    if(G.bossLevel && G.bossAlive) G.bossDamageTaken=true;
    if(G.surge && G.surge.active) G.surge.noHit=false;   // Blood Moon flawless bonus forfeited
    Camera.shake(10,0.3); Audio2.hurt(); Haptic.heavy();
    Particles.burst(this.x,this.y,12,'#ff3b3b',{speed:200,life:0.5,size:4}); G.flash=0.5; G.flashColor='255,40,40';
    if(this.hp<=0){
      if(this.revives>0){
        this.revives--; this.hp=this.maxHp*0.6; this.invuln=Math.max(2.4,this.relReviveInvuln||0); this._fieldGrace=1.5; G.flash=1; G.flashColor='255,210,120';
        Particles.burst(this.x,this.y,40,'#46e6ff',{speed:340,life:0.8,size:5});
        Camera.shake(16,0.5); Audio2.levelup(); banner('RINATO','seconda vita'); return;
      }
      this.hp=0; G.die();
    }
  }
  // environmental DoT (acid/lava/spore fields): ticks RELIABLY — does NOT grant the 0.6s melee-invuln
  // (so standing in a field can't make you immune to enemies, and it actually drains you). Dash still saves you.
  fieldDamage(dmg,src){
    if(this.dashActive>0 || this._fieldGrace>0) return;   // _fieldGrace: brief immunity right after a revive so a field can't instantly re-kill
    if(src) G._dmgSrc=src;
    if(this.dr) dmg*=(1-this.dr);
    this.hp-=dmg; this.hitFlash=Math.max(this.hitFlash,0.22);
    if(G.bossLevel && G.bossAlive) G.bossDamageTaken=true;   // hazard DoT during a boss fight breaks the flawless-kill achievement too (parity with hurt())
    if(G.surge && G.surge.active) G.surge.noHit=false;
    G.flash=Math.max(G.flash||0,0.13); G.flashColor='210,95,40';   // faint orange pulse each tick → standing in a hazard field reads as dangerous
    if(this.hp<=0){
      if(this.revives>0){
        this.revives--; this.hp=this.maxHp*0.6; this.invuln=Math.max(2.4,this.relReviveInvuln||0); this._fieldGrace=1.5; G.flash=1; G.flashColor='255,210,120';
        Particles.burst(this.x,this.y,40,'#46e6ff',{speed:340,life:0.8,size:5}); Camera.shake(16,0.5); Audio2.levelup(); banner('RINATO','seconda vita'); return;
      }
      this.hp=0; G.die();
    }
  }

  draw(ctx){
    const a=this.aim, r=this.r;
    if(this.ghosts && this.ghosts.length){ ctx.save();
      for(const g of this.ghosts){ ctx.globalAlpha=U.clamp(g.life/0.22,0,1)*0.35; ctx.fillStyle=this.trailColor||this.charTint||'#7ad7ff';
        ctx.beginPath(); ctx.arc(g.x,g.y,r*0.85,0,TAU); ctx.fill(); }
      ctx.restore(); ctx.globalAlpha=1; }
    if(this.auraColor){
      const ar = r*2.4 + Math.sin(G.time*3)*r*0.25;
      const ag = ctx.createRadialGradient(this.x,this.y,r*0.6,this.x,this.y,ar);
      ag.addColorStop(0,'rgba(0,0,0,0)'); ag.addColorStop(0.7, this.auraColor); ag.addColorStop(1,'rgba(0,0,0,0)');
      ctx.save(); ctx.globalAlpha=0.20; ctx.globalCompositeOperation='lighter';
      ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(this.x,this.y,ar,0,TAU); ctx.fill(); ctx.restore();
    }
    const lg=ctx.createRadialGradient(this.x,this.y,8,this.x,this.y,190);
    lg.addColorStop(0,'rgba(255,200,130,0.16)'); lg.addColorStop(1,'rgba(255,200,130,0)');
    ctx.fillStyle=lg; ctx.beginPath(); ctx.arc(this.x,this.y,190,0,TAU); ctx.fill();
    // prestige flex: one orbiting golden star per ascension (cosmetic reward for prestiging)
    if(this.prestige>0){ const n=Math.min(this.prestige,6); ctx.save(); ctx.fillStyle='#ffd24d'; if(!(window.G&&G.lowFx)){ ctx.shadowBlur=8; ctx.shadowColor='#ffd24d'; }
      for(let i=0;i<n;i++){ const a2=G.time*1.2+i/n*TAU, sx=this.x+Math.cos(a2)*r*2.2, sy=this.y+Math.sin(a2)*r*2.2;
        ctx.beginPath(); for(let k=0;k<10;k++){ const ang=k/10*TAU-Math.PI/2, rad=(k%2?r*0.11:r*0.26); const px=sx+Math.cos(ang)*rad, py=sy+Math.sin(ang)*rad; k?ctx.lineTo(px,py):ctx.moveTo(px,py); } ctx.closePath(); ctx.fill(); }
      ctx.restore(); ctx.shadowBlur=0; }

    ctx.save(); ctx.translate(this.x,this.y);
    ctx.fillStyle='rgba(0,0,0,0.42)'; ctx.beginPath(); ctx.ellipse(0,r*0.45,r*1.25,r*0.7,0,0,TAU); ctx.fill();
    ctx.rotate(a);
    const blink=this.invuln>0 && Math.floor(this.invuln*20)%2===0;
    ctx.globalAlpha=blink?0.45:1;
    const sw=Math.sin(this.walkPhase)*r*0.45; ctx.lineCap='round';
    // legs
    ctx.strokeStyle='#2f3744'; ctx.lineWidth=r*0.38;
    ctx.beginPath(); ctx.moveTo(-r*0.05,-r*0.45); ctx.lineTo(-r*0.55+sw,-r*0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r*0.05, r*0.45); ctx.lineTo(-r*0.55-sw, r*0.6); ctx.stroke();
    ctx.fillStyle='#1c2230';
    ctx.beginPath(); ctx.arc(-r*0.55+sw,-r*0.6,r*0.2,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-r*0.55-sw, r*0.6,r*0.2,0,TAU); ctx.fill();
    // backpack
    ctx.fillStyle='#5a4427'; rrect(ctx,-r*1.05,-r*0.5,r*0.65,r*1.0,5);
    ctx.fillStyle='#6e5430'; rrect(ctx,-r*0.95,-r*0.32,r*0.42,r*0.62,3);
    // chest holster pouch (the real weapon is drawn IN-HAND after the head — see drawWeapon, so it's visible & per-weapon)
    ctx.fillStyle='#0f1115'; rrect(ctx,r*0.0,r*0.06,r*0.5,r*0.5,3);
    // torso
    ctx.shadowBlur=16; ctx.shadowColor='#ffb24d';
    const tc=this.charTint||'#8b94a3';
    const g=ctx.createLinearGradient(-r,-r,r,r); g.addColorStop(0,shade(tc,0.78)); g.addColorStop(.5,tc); g.addColorStop(1,shade(tc,0.66));
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,r*1.0,r*0.82,0,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='#3a4150'; rrect(ctx,-r*0.15,-r*0.72,r*0.22,r*1.44,2);
    ctx.fillStyle='rgba(255,255,255,.10)'; rrect(ctx,-r*0.5,-r*0.55,r*0.9,r*0.18,3);
    // arms
    ctx.strokeStyle='#7a828f'; ctx.lineWidth=r*0.32;
    ctx.beginPath(); ctx.moveTo(r*0.1,-r*0.55); ctx.lineTo(r*1.05,-r*0.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r*0.15, r*0.5); ctx.lineTo(r*0.85, r*0.12); ctx.stroke();
    ctx.fillStyle='#23272f';
    ctx.beginPath(); ctx.arc(r*1.05,-r*0.05,r*0.16,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(r*0.85, r*0.12,r*0.16,0,TAU); ctx.fill();
    // head
    ctx.fillStyle='#caa472'; ctx.beginPath(); ctx.arc(r*0.42,0,r*0.55,0,TAU); ctx.fill();
    ctx.fillStyle='#39414f'; ctx.beginPath(); ctx.arc(r*0.34,0,r*0.62,Math.PI*0.55,Math.PI*1.45); ctx.fill();
    ctx.fillStyle='#2b313c'; rrect(ctx,r*0.0,-r*0.6,r*0.5,r*0.22,3);
    ctx.shadowBlur=12; ctx.shadowColor='#46e6ff'; ctx.fillStyle='#46e6ff'; rrect(ctx,r*0.66,-r*0.3,r*0.2,r*0.6,3); ctx.shadowBlur=0;
    this.drawWeapon(ctx,r);   // distinct, boldly-coloured gun held in-hand → you can SEE which weapon you have
    // ── per-survivor silhouette features (so each character reads as a different person, not a recolour) ──
    const cid=this.charId;
    if(cid==='jackal'){            // lean predator: big sharp ears + a snout (fast/evasive)
      ctx.fillStyle='#2b313c'; for(const s of [-1,1]){ ctx.beginPath(); ctx.moveTo(r*0.38,s*r*0.34); ctx.lineTo(r*0.1,s*r*1.18); ctx.lineTo(r*0.68,s*r*0.5); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle=tc; ctx.beginPath(); ctx.moveTo(r*0.92,0); ctx.lineTo(r*0.5,-r*0.22); ctx.lineTo(r*0.5,r*0.22); ctx.closePath(); ctx.fill();   // snout
      ctx.fillStyle='#15151a'; ctx.beginPath(); ctx.arc(r*0.82,0,r*0.07,0,TAU); ctx.fill(); }
    else if(cid==='bulwark'){      // heavy tank: big riot shield + helmet dome
      ctx.fillStyle=shade(tc,0.7); ctx.beginPath(); ctx.arc(r*0.36,0,r*0.62,Math.PI*0.5,Math.PI*1.5); ctx.fill();   // helmet
      ctx.fillStyle='#586475'; rrect(ctx,r*0.5,-r*1.08,r*0.58,r*2.16,r*0.14);
      ctx.fillStyle='#9aa7b6'; rrect(ctx,r*0.62,-r*0.8,r*0.34,r*1.6,r*0.1);
      ctx.fillStyle=tc; if(!(window.G&&G.lowFx)){ctx.shadowBlur=10;ctx.shadowColor=tc;} ctx.beginPath(); ctx.arc(r*0.79,0,r*0.2,0,TAU); ctx.fill(); ctx.shadowBlur=0; }
    else if(cid==='pyre'){         // firestarter: gas-mask snout + flame crown
      ctx.fillStyle='#2a2118'; ctx.beginPath(); ctx.arc(r*0.62,0,r*0.22,0,TAU); ctx.fill();   // mask filter
      ctx.shadowBlur=16; ctx.shadowColor='#ffae3a';
      for(const o of [[-0.55,-0.45],[-0.92,-0.05],[-0.55,0.4]]){ const fl=1+Math.sin(G.time*10+o[1]*6)*0.3;
        ctx.fillStyle='#ff4d1a'; ctx.beginPath(); ctx.moveTo(r*o[0],r*o[1]-r*0.5*fl); ctx.lineTo(r*o[0]-r*0.46,r*o[1]); ctx.lineTo(r*o[0],r*o[1]+r*0.4*fl); ctx.lineTo(r*o[0]+r*0.24,r*o[1]); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#ffe14d'; ctx.beginPath(); ctx.moveTo(r*o[0],r*o[1]-r*0.3*fl); ctx.lineTo(r*o[0]-r*0.2,r*o[1]); ctx.lineTo(r*o[0],r*o[1]+r*0.22*fl); ctx.lineTo(r*o[0]+r*0.12,r*o[1]); ctx.closePath(); ctx.fill(); }
      ctx.shadowBlur=0; }
    else if(cid==='warden'){       // marksman: sleek visor band across the eyes + targeting line
      ctx.fillStyle='#0e1014'; rrect(ctx,r*0.16,-r*0.5,r*0.55,r*1.0,r*0.1);   // visor band
      ctx.fillStyle=tc; if(!(window.G&&G.lowFx)){ctx.shadowBlur=12;ctx.shadowColor=tc;} ctx.fillRect(r*0.3,-r*0.34,r*0.34,r*0.12);
      ctx.strokeStyle='rgba(70,230,255,0.5)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(r*1.0,-r*0.0); ctx.lineTo(r*2.8,-r*0.0); ctx.stroke(); ctx.shadowBlur=0; }
    else if(cid==='revenant'){     // undead berserker: bleached skull + two horns
      ctx.fillStyle='#e8e2d4'; ctx.beginPath(); ctx.arc(r*0.42,0,r*0.46,0,TAU); ctx.fill();
      ctx.fillStyle='#15151a'; ctx.beginPath(); ctx.arc(r*0.5,-r*0.17,r*0.13,0,TAU); ctx.arc(r*0.5,r*0.17,r*0.13,0,TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r*0.66,-r*0.08); ctx.lineTo(r*0.8,0); ctx.lineTo(r*0.66,r*0.08); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#d8cfc0'; for(const s of [-1,1]){ ctx.beginPath(); ctx.moveTo(r*0.2,s*r*0.4); ctx.lineTo(r*0.0,s*r*0.95); ctx.lineTo(r*0.42,s*r*0.5); ctx.closePath(); ctx.fill(); } }   // horns
    else if(cid==='engineer'){     // tech support: hard hat + antenna + orbiting drone
      ctx.fillStyle='#ffd24d'; ctx.beginPath(); ctx.arc(r*0.4,0,r*0.5,Math.PI*0.5,Math.PI*1.5); ctx.fill(); ctx.fillRect(r*0.36,-r*0.5,r*0.1,r*1.0);   // hard hat
      ctx.strokeStyle='#7d8896'; ctx.lineWidth=r*0.08; ctx.beginPath(); ctx.moveTo(r*0.2,-r*0.45); ctx.lineTo(r*0.3,-r*1.05); ctx.stroke();
      ctx.fillStyle=tc; if(!(window.G&&G.lowFx)){ctx.shadowBlur=8;ctx.shadowColor=tc;} ctx.beginPath(); ctx.arc(r*0.3,-r*1.1,r*0.1,0,TAU); ctx.fill();
      const da=G.time*2; ctx.beginPath(); ctx.arc(r*0.2+Math.cos(da)*r*0.95,-r*0.85+Math.sin(da)*r*0.4,r*0.16,0,TAU); ctx.fill(); ctx.shadowBlur=0; }
    else if(cid==='demo'){         // sapper: dome helmet + big bomb bandolier + lit fuse
      ctx.fillStyle=shade(tc,0.7); ctx.beginPath(); ctx.arc(r*0.36,0,r*0.58,Math.PI*0.55,Math.PI*1.45); ctx.fill();   // helmet
      ctx.fillStyle='#16161a'; for(const o of [[-0.1,-0.55],[0.0,-0.1],[-0.1,0.4]]){ ctx.beginPath(); ctx.arc(r*o[0],r*o[1],r*0.24,0,TAU); ctx.fill(); }
      ctx.fillStyle=tc; ctx.shadowBlur=10; ctx.shadowColor=tc; ctx.beginPath(); ctx.arc(r*0.0+Math.sin(G.time*20)*r*0.05,-r*0.78,r*0.1,0,TAU); ctx.fill(); ctx.shadowBlur=0; }
    else {                          // drifter — wide-brim hat + trailing scarf
      ctx.fillStyle='#3a3026'; ctx.beginPath(); ctx.ellipse(r*0.3,0,r*0.4,r*0.78,0,0,TAU); ctx.fill(); ctx.fillStyle='#4a3f30'; ctx.beginPath(); ctx.arc(r*0.42,0,r*0.34,0,TAU); ctx.fill();   // hat
      ctx.fillStyle='#b5612e'; ctx.beginPath(); ctx.moveTo(-r*0.2,-r*0.25); ctx.quadraticCurveTo(-r*1.1,-r*0.1+Math.sin(G.time*4)*r*0.22,-r*1.45,r*0.12); ctx.lineTo(-r*1.32,r*0.4); ctx.quadraticCurveTo(-r*0.8,r*0.12,-r*0.2,r*0.22); ctx.closePath(); ctx.fill(); }
    // charge glow (railgun)
    if(this.charge>0){ const cf=U.clamp(this.charge/(this.weapon.chargeTime||1),0,1);
      ctx.fillStyle='rgba(70,230,255,'+(cf*0.8)+')'; ctx.shadowBlur=18; ctx.shadowColor='#46e6ff';
      ctx.beginPath(); ctx.arc(r*1.9,0,3+cf*6,0,TAU); ctx.fill(); ctx.shadowBlur=0; }
    if(this.muzzle>0){
      const mx=this._gunTip||r*2.0, mc=this.weapon.color;   // flash coloured by the weapon + at its actual muzzle
      ctx.shadowBlur=24; ctx.shadowColor=mc; ctx.fillStyle='#ffffff';
      ctx.beginPath(); ctx.arc(mx,0,8,0,TAU); ctx.fill();
      ctx.fillStyle=mc; ctx.globalAlpha=0.8;
      ctx.beginPath(); ctx.moveTo(mx-r*0.15,-8); ctx.lineTo(mx+r*0.9,0); ctx.lineTo(mx-r*0.15,8); ctx.closePath(); ctx.fill(); ctx.globalAlpha=1; ctx.shadowBlur=0;
    }
    ctx.globalAlpha=1; ctx.restore();
  }
  // distinct in-hand gun per weapon, drawn in the player's rotated frame (+x = aim/forward).
  // Each has its own silhouette AND is boldly tinted with the weapon colour, so a switch is OBVIOUS.
  drawWeapon(ctx,r){
    const w=this.weapon, id=w.id, col=w.color;
    const dk='#15171c', lf=window.G&&G.lowFx;
    ctx.save();
    if(this.muzzle>0) ctx.translate(-r*0.24*(this.muzzle/0.06), 0);   // recoil kick
    // cbar = COLOURED bar (dominant mass → the gun reads as its weapon colour even when tiny); dbar = dark detail
    const cbar=(x0,len,hw)=>{ ctx.fillStyle=col; rrect(ctx,x0,-hw,len,hw*2,Math.min(4,hw*0.9)); };
    const dbar=(x0,len,hw)=>{ ctx.fillStyle=dk;  rrect(ctx,x0,-hw,len,hw*2,Math.min(4,hw*0.9)); };
    if(!lf){ ctx.shadowBlur=8; ctx.shadowColor=col; }
    let tip=r*1.8;
    ctx.fillStyle=dk; rrect(ctx,r*0.3,-r*0.12,r*0.4,r*0.62,3);   // dark grip/receiver near the hands
    if(id==='pistol'){ cbar(r*0.5,r*1.05,r*0.18); dbar(r*1.0,r*0.55,r*0.1); tip=r*1.6; }                                   // SHORT
    else if(id==='shotgun'){ cbar(r*0.45,r*1.6,r*0.16); ctx.fillStyle=col; rrect(ctx,r*0.45,-r*0.36,r*1.65,r*0.26,3); rrect(ctx,r*0.45,r*0.1,r*1.65,r*0.26,3); dbar(r*0.32,r*0.55,r*0.32); tip=r*2.1; }   // WIDE double barrel
    else if(id==='smg'){ ctx.fillStyle=col; rrect(ctx,r*0.35,-r*0.26,r*0.7,r*0.52,4); cbar(r*1.0,r*0.7,r*0.12); ctx.fillStyle=dk; rrect(ctx,r*0.55,r*0.2,r*0.2,r*0.72,3); tip=r*1.72; }   // BOXY body + mag
    else if(id==='railgun'){ cbar(r*0.4,r*1.9,r*0.12); for(const cx of [r*0.7,r*1.05,r*1.4,r*1.75]) dbar(cx,r*0.1,r*0.26); if(!lf){ctx.shadowBlur=18;ctx.shadowColor=col;} ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(r*2.3,0,r*0.16,0,TAU); ctx.fill(); tip=r*2.35; }   // LONG rail + coils
    else if(id==='flamer'){ ctx.fillStyle=dk; ctx.beginPath(); ctx.arc(0,r*0.05,r*0.5,0,TAU); ctx.fill(); cbar(r*0.5,r*1.0,r*0.2); ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(r*1.4,-r*0.36); ctx.lineTo(r*2.0,0); ctx.lineTo(r*1.4,r*0.36); ctx.closePath(); ctx.fill(); tip=r*1.95; }   // FAT tank + flared nozzle
    else if(id==='launcher'){ ctx.fillStyle=col; rrect(ctx,r*0.4,-r*0.3,r*1.5,r*0.6,5); ctx.fillStyle=dk; ctx.beginPath(); ctx.arc(r*0.7,0,r*0.36,0,TAU); ctx.fill(); ctx.beginPath(); ctx.arc(r*1.9,0,r*0.26,0,TAU); ctx.fill(); tip=r*2.05; }   // FAT tube + drum + bore
    else if(id==='tesla'){ cbar(r*0.4,r*1.0,r*0.14); if(!lf){ctx.shadowBlur=16;ctx.shadowColor=col;} ctx.strokeStyle=col; ctx.lineWidth=r*0.16; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(r*1.3,-r*0.08); ctx.lineTo(r*2.1,-r*0.42); ctx.moveTo(r*1.3,r*0.08); ctx.lineTo(r*2.1,r*0.42); ctx.stroke(); ctx.lineCap='butt'; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(r*2.1,-r*0.42,r*0.1,0,TAU); ctx.arc(r*2.1,r*0.42,r*0.1,0,TAU); ctx.fill(); tip=r*2.15; }   // big FORK
    else if(id==='cryo'){ cbar(r*0.4,r*1.0,r*0.14); if(!lf){ctx.shadowBlur=14;ctx.shadowColor=col;} ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(r*1.35,0); ctx.lineTo(r*1.75,-r*0.4); ctx.lineTo(r*2.15,0); ctx.lineTo(r*1.75,r*0.4); ctx.closePath(); ctx.fill(); ctx.fillStyle='#fff'; ctx.globalAlpha=0.5; ctx.beginPath(); ctx.arc(r*1.75,0,r*0.16,0,TAU); ctx.fill(); ctx.globalAlpha=1; tip=r*2.0; }   // big CRYSTAL
    else if(id==='minigun'){ ctx.fillStyle=col; rrect(ctx,r*0.3,-r*0.4,r*0.7,r*0.8,5); for(const oy of [-0.26,-0.09,0.09,0.26]){ ctx.fillStyle=dk; rrect(ctx,r*0.9,r*oy-r*0.06,r*1.3,r*0.12,2); } tip=r*2.2; }   // WIDEST, 4 barrels
    else if(id==='scythe'){ ctx.fillStyle=dk; rrect(ctx,r*0.3,-r*0.12,r*0.8,r*0.24,2); if(!lf){ctx.shadowBlur=14;ctx.shadowColor=col;} ctx.strokeStyle=col; ctx.lineWidth=r*0.42; ctx.lineCap='round'; ctx.beginPath(); ctx.arc(r*1.1,0,r*1.0,-1.2,1.2); ctx.stroke(); ctx.lineCap='butt'; tip=r*1.7; }   // big BLADE
    else if(id==='swarm'){ for(const oy of [-0.3,-0.1,0.1,0.3]){ ctx.fillStyle=col; rrect(ctx,r*0.5,r*oy-r*0.07,r*1.15,r*0.14,2); ctx.fillStyle=dk; ctx.beginPath(); ctx.arc(r*1.65,r*oy,r*0.09,0,TAU); ctx.fill(); } tip=r*1.75; }   // CLUSTER of 4 tubes
    else if(id==='prism'){ dbar(r*0.35,r*0.7,r*0.1); if(!lf){ctx.shadowBlur=18;ctx.shadowColor=col;} ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(r*0.95,-r*0.46); ctx.lineTo(r*2.1,0); ctx.lineTo(r*0.95,r*0.46); ctx.closePath(); ctx.fill(); ctx.fillStyle='#fff'; ctx.globalAlpha=0.5; ctx.beginPath(); ctx.moveTo(r*1.2,-r*0.2); ctx.lineTo(r*1.8,0); ctx.lineTo(r*1.2,r*0.2); ctx.closePath(); ctx.fill(); ctx.globalAlpha=1; tip=r*2.15; }   // big CRYSTAL body
    else if(id==='marksman'){ cbar(r*0.4,r*2.1,r*0.1); ctx.fillStyle=dk; rrect(ctx,r*0.75,-r*0.4,r*0.65,r*0.2,3); ctx.fillStyle=col; ctx.beginPath(); ctx.arc(r*1.05,-r*0.3,r*0.1,0,TAU); ctx.fill(); ctx.strokeStyle=dk; ctx.lineWidth=r*0.07; ctx.beginPath(); ctx.moveTo(r*1.5,r*0.1); ctx.lineTo(r*1.7,r*0.55); ctx.moveTo(r*1.72,r*0.1); ctx.lineTo(r*1.9,r*0.55); ctx.stroke(); tip=r*2.55; }   // LONGEST + scope + bipod
    else if(id==='hailstorm'){ cbar(r*0.4,r*1.3,r*0.2); ctx.fillStyle=col; for(const oy of [-0.28,0,0.28]){ ctx.beginPath(); ctx.moveTo(r*1.55,oy*r); ctx.lineTo(r*2.05,oy*r-r*0.16); ctx.lineTo(r*2.05,oy*r+r*0.16); ctx.closePath(); ctx.fill(); } tip=r*2.1; }   // WIDE + shard fan
    else if(id==='ricochet'){ cbar(r*0.4,r*1.0,r*0.13); if(!lf){ctx.shadowBlur=16;ctx.shadowColor=col;} ctx.strokeStyle=col; ctx.lineWidth=r*0.18; ctx.beginPath(); ctx.arc(r*1.8,0,r*0.42,0,TAU); ctx.stroke(); ctx.fillStyle=col; ctx.globalAlpha=0.45; ctx.beginPath(); ctx.arc(r*1.8,0,r*0.28,0,TAU); ctx.fill(); ctx.globalAlpha=1; tip=r*2.2; }   // big disc RING
    else { cbar(r*0.5,r*1.05,r*0.18); tip=r*1.6; }
    ctx.restore(); ctx.shadowBlur=0;
    // forward hand wraps the gun (drawn on top so it reads as held)
    ctx.fillStyle='#23272f'; ctx.beginPath(); ctx.arc(r*0.92,-r*0.02,r*0.17,0,TAU); ctx.fill();
    this._gunTip=tip;
  }
}

/* ---------------------- BULLET ---------------------- */
class Bullet{
  constructor(x,y,vx,vy,dmg,pierce,life,r,crit,explosive,opt){
    opt=opt||{};
    this.x=x;this.y=y;this.vx=vx;this.vy=vy;this.dmg=dmg;this.pierce=pierce;
    this.life=life;this.r=r;this.crit=crit;this.explosive=explosive;this.dead=false;this.hitSet=new Set();
    this.color=opt.color||(crit?'#fff3c0':'#ffe0a0'); this.blastR=opt.blastR||70; this.burn=opt.burn||false; this.knock=opt.knock||1;
    this.chill=opt.chill||0; this.chain=opt.chain||0;
    this.burnMul=opt.burnMul||1; this.homing=opt.homing||0; this.boomerang=opt.boomerang||false; this.bounce=opt.bounce||0;
    this.refract=opt.refract||false; this.cluster=opt.cluster||0; this.shatter=opt.shatter||false;
    this.critBoom=opt.critBoom||0; this.fullHpDmg=opt.fullHpDmg||0; this.pierceOnKill=opt.pierceOnKill||false; this.bossDmg=opt.bossDmg||0; this.burnAmp=opt.burnAmp||1;
    this.style=opt.style||'bolt'; this.seed=(x*7+y*13)&255;
  }
  update(dt){
    this.life-=dt; if(this.life<=0){this.dead=true;return;}
    this.x+=this.vx*dt; this.y+=this.vy*dt;
    if(this.homing){ let best=null,bd=1e9; for(const e of G.enemies){ if(e.dead)continue; const dd=U.dist2(this.x,this.y,e.x,e.y); if(dd<bd&&dd<320*320){bd=dd;best=e;} }
      if(best){ const sp=Math.hypot(this.vx,this.vy)||1, ta=U.angle(this.x,this.y,best.x,best.y), ca=Math.atan2(this.vy,this.vx), na=U.angleLerp(ca,ta,this.homing*dt*4); this.vx=Math.cos(na)*sp; this.vy=Math.sin(na)*sp; } }
    if(this.boomerang){ this.vx-=this.vx*dt*1.6; this.vy-=this.vy*dt*1.6; }
    if(this.x<WALL||this.x>WORLD-WALL||this.y<WALL||this.y>WORLD-WALL){ this.dead=true; if(this.explosive) G.explode(this.x,this.y,this.blastR,this.dmg*0.6); }
    // weapon-flavoured TRAIL — the main thing that makes guns feel different while firing (fire/ice/sparks/smoke...)
    const st=this.style, r=this.r;
    if(st==='flame'){ if(U.chance(0.7)) Particles.emit(this.x,this.y,U.rand(-26,26),U.rand(-46,-12),0.34,r*1.3,U.chance(0.5)?'#ff7a2d':'#ffcf4d',{drag:0.9,grav:-26,shrink:true,glow:true}); }
    else if(st==='elec'){ if(U.chance(0.85)) Particles.emit(this.x+U.rand(-r,r),this.y+U.rand(-r,r),U.rand(-60,60),U.rand(-60,60),0.16,r*0.7,'#cde0ff',{drag:0.82,shrink:true,glow:true}); }
    else if(st==='shard'){ if(U.chance(0.7)) Particles.emit(this.x,this.y,U.rand(-14,14),U.rand(-14,14),0.42,r*0.85,'#cfeeff',{drag:0.92,grav:10,shrink:true,glow:true}); }
    else if(st==='orb'){ if(U.chance(0.7)) Particles.emit(this.x,this.y,U.rand(-10,10),U.rand(-10,10),0.55,r*1.0,U.chance(0.5)?'#6b6b6b':'#48413a',{drag:0.9,shrink:true,glow:false}); }
    else if(st==='lance'){ if(U.chance(0.85)) Particles.emit(this.x,this.y,U.rand(-12,12),U.rand(-12,12),0.14,r*0.8,'#ffffff',{drag:0.7,shrink:true,glow:true}); }
    else if(st==='tracer'){ if(U.chance(0.5)) Particles.emit(this.x,this.y,0,0,0.1,r*0.55,this.color,{drag:0.6,shrink:true,glow:true}); }
    else if(st==='crescent'){ if(U.chance(0.55)) Particles.emit(this.x,this.y,U.rand(-20,20),U.rand(-20,20),0.22,r*0.7,this.color,{drag:0.85,shrink:true,glow:true}); }
    else { if(U.chance(0.5)) Particles.emit(this.x,this.y,0,0,0.18,r*0.7,this.color,{drag:0.8,shrink:true}); }
  }
  draw(ctx){
    const st=this.style, r=this.r, glow=!(window.G&&G.lowFx), t=(window.G?G.time:0);
    if(glow){ ctx.shadowBlur=st==='lance'?24:(st==='flame'?18:14); ctx.shadowColor=this.color; }
    ctx.fillStyle=this.color;
    ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(Math.atan2(this.vy,this.vx));
    if(st==='lance'){                                   // railgun/prism/marksman: long bright lance + outer halo + white core
      if(glow){ ctx.globalAlpha=0.35; ctx.fillRect(-r*6, -r*0.9, r*12, r*1.8); ctx.globalAlpha=1; }
      ctx.fillRect(-r*5, -r*0.42, r*10, r*0.84);
      ctx.fillStyle='#ffffff'; ctx.fillRect(-r*4.2, -r*0.16, r*8.4, r*0.32);
    } else if(st==='tracer'){                           // smg/minigun/swarm: thin fast streak w/ bright head
      ctx.fillRect(-r*3.0, -r*0.38, r*6.0, r*0.76);
      ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(r*2.6,0,r*0.5,0,TAU); ctx.fill();
    } else if(st==='pellet'){                            // shotgun: small round pellet + bright core
      ctx.beginPath(); ctx.arc(0,0,r*1.05,0,TAU); ctx.fill();
      ctx.fillStyle='#fff'; ctx.globalAlpha=0.7; ctx.beginPath(); ctx.arc(-r*0.2,-r*0.2,r*0.4,0,TAU); ctx.fill(); ctx.globalAlpha=1;
    } else if(st==='orb'){                               // launcher: chunky tumbling grenade
      ctx.rotate(t*7+this.seed);
      ctx.beginPath(); ctx.arc(0,0,r*1.4,0,TAU); ctx.fill();
      ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(-r*1.5,-r*0.22,r*3,r*0.44);
      ctx.fillStyle='#fff'; ctx.globalAlpha=0.6; ctx.beginPath(); ctx.arc(-r*0.4,-r*0.4,r*0.4,0,TAU); ctx.fill(); ctx.globalAlpha=1;
    } else if(st==='flame'){                             // flamer: big flickering fire, hot core
      const f=0.8+(((this.seed+(((t*45)|0)))&7)/7)*0.7; ctx.globalAlpha=0.85;
      ctx.beginPath(); ctx.ellipse(0,0,r*2.0*f,r*1.4*f,0,0,TAU); ctx.fill();
      ctx.fillStyle='#ffe07a'; ctx.globalAlpha=0.8; ctx.beginPath(); ctx.arc(0,0,r*0.8*f,0,TAU); ctx.fill();
      ctx.fillStyle='#fff'; ctx.globalAlpha=0.55; ctx.beginPath(); ctx.arc(0,0,r*0.4*f,0,TAU); ctx.fill(); ctx.globalAlpha=1;
    } else if(st==='elec'){                              // tesla: jagged electric bolt that jitters each frame
      ctx.strokeStyle=this.color; ctx.lineWidth=r*0.75; ctx.lineJoin='round'; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-r*3.4,0);
      for(let i=-2;i<=2;i++){ const jl=((this.seed+i+(t*60|0))&3)/3; ctx.lineTo(i*r*1.6, (i&1?1:-1)*r*(0.6+jl*0.6)); } ctx.lineTo(r*3.4,0); ctx.stroke();
      ctx.lineWidth=r*0.3; ctx.strokeStyle='#fff'; ctx.stroke(); ctx.lineCap='butt';
    } else if(st==='shard'){                             // cryo/hailstorm: spinning ice crystal
      ctx.rotate(t*9+this.seed);
      ctx.beginPath(); ctx.moveTo(r*1.9,0); ctx.lineTo(0,r*0.95); ctx.lineTo(-r*1.3,0); ctx.lineTo(0,-r*0.95); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#fff'; ctx.globalAlpha=0.6; ctx.beginPath(); ctx.arc(0,0,r*0.5,0,TAU); ctx.fill(); ctx.globalAlpha=1;
    } else if(st==='crescent'){                          // scythe: spinning curved blade
      ctx.rotate(t*11+this.seed); ctx.lineWidth=r*0.85; ctx.strokeStyle=this.color; ctx.lineCap='round';
      ctx.beginPath(); ctx.arc(0,0,r*1.7,-1.2,1.2); ctx.stroke(); ctx.lineCap='butt';
    } else if(st==='disc'){                              // ricochet: fast-spinning ringed disc (reads as a bouncing projectile)
      ctx.rotate(t*16+this.seed);
      ctx.lineWidth=r*0.5; ctx.strokeStyle=this.color; ctx.beginPath(); ctx.arc(0,0,r*1.5,0,TAU); ctx.stroke();
      ctx.fillStyle=this.color; for(let i=0;i<3;i++){ const a=i/3*TAU; ctx.beginPath(); ctx.arc(Math.cos(a)*r*1.5,Math.sin(a)*r*1.5,r*0.5,0,TAU); ctx.fill(); }
      ctx.fillStyle='#fff'; ctx.globalAlpha=0.8; ctx.beginPath(); ctx.arc(0,0,r*0.55,0,TAU); ctx.fill(); ctx.globalAlpha=1;
    } else if(st==='slug'){                              // minigun: fat heavy round + bright core (chunky, not a thin streak)
      ctx.beginPath(); ctx.ellipse(0,0,r*1.7,r*1.05,0,0,TAU); ctx.fill();
      ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(-r*1.8,-r*0.18,r*1.4,r*0.36);
      ctx.fillStyle='#fff'; ctx.globalAlpha=0.85; ctx.beginPath(); ctx.arc(r*0.7,-r*0.2,r*0.5,0,TAU); ctx.fill(); ctx.globalAlpha=1;
    } else if(st==='dart'){                              // swarm: tiny sharp arrowhead
      ctx.beginPath(); ctx.moveTo(r*1.9,0); ctx.lineTo(-r*0.9,-r*0.85); ctx.lineTo(-r*0.2,0); ctx.lineTo(-r*0.9,r*0.85); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#fff'; ctx.globalAlpha=0.7; ctx.beginPath(); ctx.arc(r*0.5,0,r*0.3,0,TAU); ctx.fill(); ctx.globalAlpha=1;
    } else if(st==='ray'){                               // prism: a split triple-line refracted beam
      for(const oy of [-r*0.55,0,r*0.55]){ ctx.globalAlpha=(oy===0)?1:0.55; ctx.fillRect(-r*4.5,oy-r*0.16,r*9,r*0.32); }
      ctx.globalAlpha=1; ctx.fillStyle='#fff'; ctx.fillRect(-r*3.4,-r*0.12,r*6.8,r*0.24);
    } else if(st==='needle'){                            // marksman: very long, very thin precision round + sharp tip
      ctx.fillRect(-r*6.5,-r*0.2,r*13,r*0.4);
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(r*7.4,0); ctx.lineTo(r*5.6,-r*0.55); ctx.lineTo(r*5.6,r*0.55); ctx.closePath(); ctx.fill();
    } else if(st==='sliver'){                            // hailstorm: small fast ice sliver (thin, not the chunky cryo crystal)
      ctx.rotate(t*8+this.seed);
      ctx.beginPath(); ctx.moveTo(r*1.7,0); ctx.lineTo(0,r*0.42); ctx.lineTo(-r*0.9,0); ctx.lineTo(0,-r*0.42); ctx.closePath(); ctx.fill();
    } else {                                             // 'bolt' default: plasma droplet + core
      ctx.beginPath(); ctx.ellipse(0,0,r*1.9,r*0.85,0,0,TAU); ctx.fill();
      ctx.fillStyle='#fff'; ctx.globalAlpha=0.55; ctx.beginPath(); ctx.arc(r*0.4,0,r*0.45,0,TAU); ctx.fill(); ctx.globalAlpha=1;
    }
    ctx.restore(); ctx.shadowBlur=0; ctx.globalAlpha=1;
  }
}

/* ---------------------- TURRET (ability) ---------------------- */
class Turret{
  constructor(x,y,lifeMul){ this.x=U.clamp(x,WALL,WORLD-WALL); this.y=U.clamp(y,WALL,WORLD-WALL); this.life=8*(lifeMul||1); this.cd=0; this.aim=0; this.dead=false; }
  update(dt){
    this.life-=dt; if(this.life<=0){this.dead=true;return;} this.cd-=dt;
    let best=null,bd=1e9; for(const e of G.enemies){ if(e.dead)continue; const d=U.dist2(this.x,this.y,e.x,e.y); if(d<bd&&d<360*360){bd=d;best=e;} }
    if(best){ this.aim=U.angle(this.x,this.y,best.x,best.y);
      if(this.cd<=0){ this.cd=0.25; const a=this.aim, sp=640;
        G.bullets.push(new Bullet(this.x+Math.cos(a)*14,this.y+Math.sin(a)*14,Math.cos(a)*sp,Math.sin(a)*sp,G.player.damage*0.7,1,0.9,4,false,false,{color:'#9be8ff'})); Audio2.shoot(); } }
  }
  draw(ctx){
    ctx.save(); ctx.translate(this.x,this.y);
    ctx.fillStyle='rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(0,6,14,7,0,0,TAU); ctx.fill();
    ctx.fillStyle='#2b313c'; ctx.beginPath(); ctx.arc(0,0,10,0,TAU); ctx.fill();
    ctx.rotate(this.aim); ctx.fillStyle='#9be8ff'; ctx.shadowBlur=10; ctx.shadowColor='#9be8ff';
    rrect(ctx,0,-3,18,6,2); ctx.shadowBlur=0; ctx.restore();
  }
}

/* ---------------------- COMPANION (permanent run-long ally drone) ---------------------- */
class Companion{
  constructor(type){
    this.type=type||'gun';
    const p=G.player; this.x=p?p.x:WORLD/2; this.y=p?p.y:WORLD/2;
    this.ang=U.rand(0,TAU); this.cd=0; this.aim=0; this.dead=false; this.bob=U.rand(0,TAU);
    const C={ gun:{color:'#9be8ff',orbit:46,rate:0.5,dmg:0.5}, heal:{color:'#7affb0',orbit:52,rate:1.0}, scrap:{color:'#ffd24d',orbit:58} };
    this.cfg=C[this.type]||C.gun;
  }
  update(dt){
    const p=G.player; if(!p) return;
    this.bob+=dt*3; this.ang+=dt*0.7;
    const ox=Math.cos(this.ang)*this.cfg.orbit, oy=Math.sin(this.ang)*this.cfg.orbit*0.7 - 10 + Math.sin(this.bob)*3;
    this.x=U.lerp(this.x,p.x+ox,Math.min(1,dt*6));
    this.y=U.lerp(this.y,p.y+oy,Math.min(1,dt*6));
    this.cd-=dt;
    if(this.type==='gun'){
      let best=null,bd=1e9; for(const e of G.enemies){ if(e.dead)continue; const d=U.dist2(this.x,this.y,e.x,e.y); if(d<bd&&d<460*460){bd=d;best=e;} }
      if(best){ this.aim=U.angle(this.x,this.y,best.x,best.y);
        if(this.cd<=0){ this.cd=this.cfg.rate*((p.droneRateMul)||1); const a=this.aim, sp=700;
          G.bullets.push(new Bullet(this.x+Math.cos(a)*12,this.y+Math.sin(a)*12,Math.cos(a)*sp,Math.sin(a)*sp,(p.damage||10)*this.cfg.dmg,1,0.9,4,false,false,{color:this.cfg.color})); Audio2.shoot(); } }
    } else if(this.type==='heal'){
      if(this.cd<=0){ this.cd=this.cfg.rate; if(p.hp<p.maxHp){ const h=Math.max(1,Math.round(p.maxHp*0.012)); p.hp=Math.min(p.maxHp,p.hp+h); if(U.chance(0.5)) Particles.emit(p.x,p.y,U.rand(-20,20),U.rand(-30,-10),0.5,4,this.cfg.color,{drag:0.9}); } }
    } else if(this.type==='scrap'){
      for(const pk of G.pickups){ if(pk.dead)continue; const d=U.dist(this.x,this.y,pk.x,pk.y); if(d<300){ const an=U.angle(pk.x,pk.y,p.x,p.y); pk.x+=Math.cos(an)*240*dt; pk.y+=Math.sin(an)*240*dt; } }
    }
  }
  draw(ctx){
    const c=this.cfg.color;
    ctx.save(); ctx.translate(this.x,this.y);
    ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0,8,9,4,0,0,TAU); ctx.fill();
    ctx.shadowBlur=10; ctx.shadowColor=c; ctx.fillStyle=c;
    ctx.beginPath(); ctx.arc(0,0,6,0,TAU); ctx.fill();
    ctx.fillStyle='#0c0e12'; ctx.beginPath(); ctx.arc(0,0,2.6,0,TAU); ctx.fill();
    if(this.type==='gun'){ ctx.save(); ctx.rotate(this.aim); ctx.fillStyle=c; rrect(ctx,2,-1.6,10,3.2,1.5); ctx.restore(); }
    ctx.shadowBlur=0; ctx.restore();
  }
}

/* ---------------------- ENEMY ---------------------- */
class Enemy{
  constructor(type,x,y,elite){
    const c=ETYPE[type]; this.type=type; this.cfg=c;
    if(type!=='boss' && typeof codexMark==='function') codexMark('enemy', type);
    this.x=x;this.y=y;this.r=c.r;this.color=c.color;this.eye=c.eye||'#ff4d57';
    const mul=G.diff;
    this.maxHp=c.hp*mul.hp; this.hp=this.maxHp;
    this.speed=c.speed*mul.speed; this.dmg=c.dmg*mul.dmg;
    this.score=c.score; this.dead=false; this.fireCd=U.rand(0.5,1.5);
    this.hitFlash=0; this.phase=U.rand(TAU); this.spawnT=0.35; this.boss=!!c.boss;
    this.attackCd=U.rand(1.6,2.6); this.face=0; this.elite=false;
    // per-instance TEMPERAMENT — so a crowd of one type doesn't move as a single identical mass.
    // jitters speed, adds a serpentine weave, and a small aggressive/cautious lean. (Bosses override speed below.)
    this.spdJit=U.rand(0.86,1.16); this.weaveAmp=U.rand(0,0.55); this.weaveFreq=U.rand(0.7,2.0);
    this.temper=U.chance(0.28)?'aggressive':(U.chance(0.22)?'cautious':'normal');
    if(this.temper==='aggressive'){ this.spdJit*=1.14; this.weaveAmp*=0.5; }
    else if(this.temper==='cautious'){ this.spdJit*=0.92; this.weaveAmp=Math.max(this.weaveAmp,0.35); }
    this.speed*=this.spdJit;
    if(this.boss){
      // boss-rush: a different boss EVERY sector (cycles all 10); normal: one new boss per 5 sectors
      const tier=(G.gmode && G.gmode.bossEvery) ? Math.max(0,G.level-1) : Math.max(0,Math.floor(G.level/5)-1);
      const bd=BOSSES[tier%BOSSES.length], cycle=Math.floor(tier/BOSSES.length);
      this.bdef=bd; this.bossKind=bd.key; this.bossName=bd.name;
      if(typeof codexMark==='function') codexMark('boss', bd.key);
      this.color=bd.color; this.eye=bd.eye; this.r=bd.r;
      this.maxHp=bd.hp*mul.hp*(1+cycle*0.5); this.hp=this.maxHp;
      // bosses PRESS the player: a flat movement bump + depth scaling so they close distance, plus an
      // aggression factor that speeds up their attack-cooldown countdown (see bossAI) → no more sitting idle.
      this.aggr=1+cycle*0.16+Math.max(0,G.level-20)*0.012;
      this.speed=bd.speed*(1.12+cycle*0.06)*(1+Math.max(0,G.level-25)*0.008); this.dmg=(26+cycle*8)*mul.dmg; this.score=600*(1+cycle);
      this.bstate='idle'; this.bstateT=2.2; this.cdir={x:1,y:0};
      if(bd.key==='aegis'){ this.shieldArc=1.25; this.shieldTurn=1.05; this.shieldDir=Math.PI; }   // rotating frontal shield: must be flanked
      if(G.level>=15 && U.chance(0.6)){ this.mod=U.pick(BOSS_MODS); this.mod.apply(this); this.bossName=this.bossName+' ['+this.mod.name+']'; }
    } else if(elite==='champion'){
      this.makeChampion();
    } else if(elite){
      this.elite=true; this.maxHp*=2.6; this.hp=this.maxHp; this.r*=1.28; this.dmg*=1.3; this.speed*=0.94; this.score*=3;
    }
  }

  update(dt){
    if(this.spawnT>0) this.spawnT-=dt;
    if(this.hitFlash>0) this.hitFlash-=dt;
    if(G.slowT>0 && !this.boss) dt*=0.3;
    if(this._reactT>0) this._reactT-=dt;
    if(this.frozen>0){ this.frozen-=dt; dt=0; if(U.chance(0.4)) Particles.emit(this.x,this.y,U.rand(-8,8),U.rand(-8,8),0.3,3,'#cfeeff',{drag:0.9}); }   // FROZEN: fully stopped (and takes +50% in damage())
    else if(this.chillT>0){ this.chillT-=dt; if(!this.boss) dt*=0.5; if(U.chance(0.18)) Particles.emit(this.x,this.y,0,0,0.3,3,'#bfeaff',{drag:0.9}); }
    // burn DoT
    if(this.burnT>0){ this.burnT-=dt; this.hp-=this.burnDmg*dt; if(U.chance(0.3)) Particles.emit(this.x,this.y,0,U.rand(-30,-10),0.4,4,'#ff7a2d',{grav:-40}); if(this.hp<=0){ this.kill(); return; } }
    const p=G.player;
    const ang=Math.atan2(p.y-this.y,p.x-this.x);
    const d=U.dist(this.x,this.y,p.x,p.y);
    this.face=ang;

    if(this.champion && this.champUpdate(dt,ang,d)){ /* casting: skip base move */ }
    else if(this.boss){
      this.bossAI(dt,ang,d);
      if(this.bstate==='charge'||this.bstate==='telegraph') this.face=Math.atan2(this.cdir.y,this.cdir.x);
    } else if(this.cfg.ranged){
      const want=this.cfg.keepDist; let mv=d>want+40?1:d<want-40?-1:0;
      this.x+=Math.cos(ang)*this.speed*mv*dt; this.y+=Math.sin(ang)*this.speed*mv*dt;
      this.x+=Math.cos(ang+1.57)*this.speed*0.4*Math.sin(this.phase+G.time*1.5)*dt;
      this.y+=Math.sin(ang+1.57)*this.speed*0.4*Math.sin(this.phase+G.time*1.5)*dt;
      if(this.cfg.burst){
        // gunner: telegraphed burst — brief aim windup, then a fan along the LOCKED angle (dodgeable)
        if(this.gunState==='aim'){ this.aimT-=dt; this.face=this.lockAng;   // angle LOCKED at aim start → dodgeable
          if(U.chance(0.5)) Particles.emit(this.x+Math.cos(this.lockAng)*16,this.y+Math.sin(this.lockAng)*16,0,0,0.2,3,this.eye,{drag:0.9});
          if(this.aimT<=0){ const pd=this.cfg.projDmg*(this.elite?1.4:1), n=this.cfg.burst, sp=0.34;
            for(let s=0;s<n;s++){ const a=this.lockAng+(n>1?(-sp/2+sp*(s/(n-1))):0);
              G.enemyBullets.push(new EnemyBullet(this.x,this.y,Math.cos(a)*this.cfg.projSpeed,Math.sin(a)*this.cfg.projSpeed,pd*G.diff.dmg,this.eye,5)); }
            Particles.burst(this.x,this.y,5,this.color,{speed:110,life:0.25,dir:this.lockAng,spread:0.6}); Audio2.shoot&&Audio2.shoot();
            this.gunState=''; this.fireCd=1/(this.cfg.fireRate*(G.diff.rate||1)); } }
        else { this.fireCd-=dt; if(this.fireCd<=0 && d<560 && this.spawnT<=0){ this.gunState='aim'; this.aimT=Math.max(0.22,0.4/(G.diff.rate||1)); this.lockAng=ang; } }
      } else {
        this.fireCd-=dt;
        if(this.fireCd<=0 && d<560 && this.spawnT<=0){ this.fireCd=1/(this.cfg.fireRate*(G.diff.rate||1));
          const pd=this.cfg.projDmg*(this.elite?1.4:1);
          G.enemyBullets.push(new EnemyBullet(this.x,this.y,Math.cos(ang)*this.cfg.projSpeed,Math.sin(ang)*this.cfg.projSpeed,pd*G.diff.dmg,this.eye,5));
          Particles.burst(this.x,this.y,4,this.color,{speed:90,life:0.25,dir:ang,spread:0.6}); }
      }
    }
    else if(this.cfg.bomber) this.aiBomber(dt,ang,d);
    else if(this.cfg.swarmer) this.aiSwarmer(dt,ang,d);
    else if(this.cfg.leaper) this.aiLeaper(dt,ang,d);
    else if(this.cfg.healer) this.aiHealer(dt,ang,d);
    else if(this.cfg.sniper) this.aiSniper(dt,ang,d);
    else if(this.cfg.blinker) this.aiBlinker(dt,ang,d);
    else if(this.cfg.bubble) this.aiBubbler(dt,ang,d);
    else if(this.cfg.summoner) this.aiSummoner(dt,ang,d);
    else if(this.cfg.kamikaze) this.aiZealot(dt,ang,d);
    else if(this.cfg.rammer) this.aiRammer(dt,ang,d);
    else if(this.cfg.wraith) this.aiWraith(dt,ang,d);
    else if(this.cfg.slammer) this.aiBrawler(dt,ang,d);
    else if(this.cfg.looter) this.aiLooter(dt,ang,d);
    else { this.x+=Math.cos(ang)*this.speed*dt; this.y+=Math.sin(ang)*this.speed*dt;
      if(this.weaveAmp){ const wv=Math.sin(G.time*this.weaveFreq+this.phase)*this.speed*this.weaveAmp; this.x+=Math.cos(ang+1.57)*wv*dt; this.y+=Math.sin(ang+1.57)*wv*dt; } }   // serpentine, not a straight beeline

    if(this.kbx||this.kby){ this.x+=this.kbx*dt; this.y+=this.kby*dt; this.kbx*=0.85; this.kby*=0.85; if(Math.abs(this.kbx)<3)this.kbx=0; if(Math.abs(this.kby)<3)this.kby=0; }

    if(!this.boss && this.cfg.contact && this.spawnT<=0 && d<this.r+p.r){
      p.hurt(this.dmg,this.x,this.y,this);
      if(p.thorns) this.damage(this.dmg*(p.thornsMul||0.6),this.x,this.y);
      else if(p.relReflect) this.damage(this.dmg*p.relReflect,this.x,this.y);
      this.x-=Math.cos(ang)*14; this.y-=Math.sin(ang)*14;
    }
    this.x=U.clamp(this.x,WALL,WORLD-WALL); this.y=U.clamp(this.y,WALL,WORLD-WALL);
  }

  /* ---- normal AI ---- */
  aiBomber(dt,ang,d){
    if(this.fuseT===undefined){
      this.x+=Math.cos(ang)*this.speed*dt; this.y+=Math.sin(ang)*this.speed*dt;
      if(d<this.cfg.fuseDist+G.player.r){ this.fuseT=this.cfg.fuse; }
    } else {
      this.fuseT-=dt;
      if(U.chance(0.6)) Particles.emit(this.x,this.y,0,0,0.2,this.r*0.6,'#ff5b2d',{drag:0.85});
      if(this.fuseT<=0){
        G.explode(this.x,this.y,this.cfg.blastR,0);
        if(U.dist(this.x,this.y,G.player.x,G.player.y)<this.cfg.blastR+G.player.r) G.player.hurt(this.cfg.blastDmg*G.diff.dmg,this.x,this.y,this);
        this.despawn();
      }
    }
  }
  aiSwarmer(dt,ang,d){
    this.x+=Math.cos(ang)*this.speed*dt; this.y+=Math.sin(ang)*this.speed*dt;
    this.broodT=(this.broodT||this.cfg.broodCd)-dt;
    if(this.broodT<=0 && this.spawnT<=0){ this.broodT=this.cfg.broodCd;
      const minis=G.enemies.reduce((n,e)=>n+(e.cfg.mini?1:0),0);
      if(minis<40){ for(let i=0;i<this.cfg.broodN;i++){ const a=U.rand(TAU); G.enemies.push(new Enemy(this.cfg.broodType,this.x+Math.cos(a)*this.r*1.4,this.y+Math.sin(a)*this.r*1.4)); }
        Particles.burst(this.x,this.y,10,this.color,{speed:160,life:0.4}); Audio2.enemyDie(); } }
  }
  aiLeaper(dt,ang,d){
    if(!this.lstate) this.lstate='chase';
    if(this.lstate==='chase'){
      this.x+=Math.cos(ang)*this.speed*dt; this.y+=Math.sin(ang)*this.speed*dt;
      if(d<this.cfg.leapDist && d>70){ this.lstate='windup'; this.lstateT=this.cfg.windup;
        const p=G.player; this.tx=p.x+Input.move.x*p.speed*this.cfg.leapDur; this.ty=p.y+Input.move.y*p.speed*this.cfg.leapDur; this.ldir={x:Math.cos(ang),y:Math.sin(ang)}; }
    } else if(this.lstate==='windup'){
      this.lstateT-=dt; const a=Math.atan2(this.ty-this.y,this.tx-this.x); this.ldir={x:Math.cos(a),y:Math.sin(a)};
      if(U.chance(0.5)) Particles.emit(this.x,this.y,0,0,0.2,3,this.eye,{drag:0.8});
      if(this.lstateT<=0){ this.lstate='leap'; this.lstateT=this.cfg.leapDur; Audio2.dash(); }
    } else {
      this.lstateT-=dt; this.x+=this.ldir.x*this.cfg.leapSpeed*dt; this.y+=this.ldir.y*this.cfg.leapSpeed*dt;
      if(this.lstateT<=0) this.lstate='chase';
    }
  }
  aiHealer(dt,ang,d){
    const want=this.cfg.keepDist; let mv=d>want+40?1:d<want-40?-1:0;
    this.x+=Math.cos(ang)*this.speed*mv*dt; this.y+=Math.sin(ang)*this.speed*mv*dt;
    this.x+=Math.cos(ang+1.57)*this.speed*0.5*Math.sin(G.time*1.5+this.phase)*dt;
    this.y+=Math.sin(ang+1.57)*this.speed*0.5*Math.sin(G.time*1.5+this.phase)*dt;
    this.healT=(this.healT||this.cfg.healCd)-dt;
    if(this.healT<=0){ this.healT=this.cfg.healCd/(G.diff.rate||1); this.healPulse=0.4;
      let healed=0; const cap=this.cfg.healCap||999;
      for(const e of G.enemies){ if(e===this||e.dead||e.boss) continue;
        if(U.dist(this.x,this.y,e.x,e.y)<this.cfg.healRadius){ e.hp=Math.min(e.maxHp,e.hp+e.maxHp*this.cfg.healAmt); Particles.emit(e.x,e.y,0,-30,0.5,3,'#7affe0',{drag:0.9}); if(++healed>=cap) break; } } }
    if(this.healPulse>0) this.healPulse-=dt;
  }
  aiSniper(dt,ang,d){
    const c=this.cfg, want=c.keepDist;
    if(this.sniperState==='aim'){
      this.face=this.lockAng;                          // lock aim while charging
      this.aimT-=dt;
      this.x+=Math.cos(ang+1.57)*this.speed*0.3*Math.sin(G.time*2)*dt;
      this.y+=Math.sin(ang+1.57)*this.speed*0.3*Math.sin(G.time*2)*dt;
      if(this.aimT<=0){
        const a=this.lockAng;
        G.enemyBullets.push(new EnemyBullet(this.x,this.y,Math.cos(a)*c.shotSpeed,Math.sin(a)*c.shotSpeed,c.shotDmg*G.diff.dmg,'#ff5b5b',6));
        Particles.burst(this.x,this.y,8,'#ff5b5b',{speed:160,life:0.25,dir:a,spread:0.4}); Audio2.wRail();
        this.sniperState='cool'; this.fireCd=U.rand(1.4,2.2)/(G.diff.rate||1);
      }
    } else {
      let mv=d>want+60?1:d<want-120?-1:0;
      this.x+=Math.cos(ang)*this.speed*mv*dt; this.y+=Math.sin(ang)*this.speed*mv*dt;
      this.fireCd-=dt;
      if(this.fireCd<=0 && d<660 && this.spawnT<=0){ this.sniperState='aim'; this.aimT=c.aimTime; this.lockAng=ang; }
    }
  }

  /* ---- boss AI ---- */
  bossAI(dt,ang,d){
    const p=G.player; this.attackCd-=dt*(this.aggr||1);   // deeper bosses attack MORE often (no idle waiting)
    if(this._shieldHitT>0) this._shieldHitT-=dt;
    if(this.regenPS && this.hp<this.maxHp) this.hp=Math.min(this.maxHp,this.hp+this.regenPS*dt);
    if(this.enrageAt && !this.enraged && this.hp/this.maxHp<this.enrageAt){ this.enraged=true; this.speed*=1.5; this.attackCd*=0.7; }
    if(this.volatile){ this.volT=(this.volT||1.5)-dt; if(this.volT<=0){ this.volT=1.5; this.ring(10,200,U.rand(TAU),12); } }
    if(this.spawnT>0) return;
    if(this._castT>0){   // mid-telegraph: rooted wind-up, no new attack decision this frame
      this._castT-=dt;
      if(d<this.r+p.r) p.hurt(this.dmg,this.x,this.y,this);
      if(this._castT<=0){ const fn=this._castFn; this._castFn=null; if(fn) fn(); }
      return;
    }
    const k=this.bossKind;
    if(k==='butcher') this.aiButcher(dt,ang,d);
    else if(k==='bloated') this.aiBloated(dt,ang,d);
    else if(k==='warlord') this.aiWarlord(dt,ang,d);
    else if(k==='colossus') this.aiColossus(dt,ang,d);
    else if(k==='necromancer') this.aiNecromancer(dt,ang,d);
    else if(k==='twins') this.aiTwins(dt,ang,d);
    else if(k==='artillery') this.aiArtillery(dt,ang,d);
    else if(k==='splitter') this.aiSplitter(dt,ang,d);
    else if(k==='hivequeen') this.aiHiveQueen(dt,ang,d);
    else if(k==='duelist') this.aiDuelist(dt,ang,d);
    else if(k==='reaver') this.aiReaver(dt,ang,d);
    else if(k==='overseer') this.aiOverseer(dt,ang,d);
    else if(k==='quaker') this.aiQuaker(dt,ang,d);
    else if(k==='aegis') this.aiAegis(dt,ang,d);
    if(d<this.r+p.r) p.hurt(this.dmg*(this.bstate==='charge'||this.bashT>0?1.5:1),this.x,this.y,this);
  }
  ring(n,speed,off,dmg){ if(G.enemyBullets.length>320) return; for(let i=0;i<n;i++){ const a=off+i/n*TAU; G.enemyBullets.push(new EnemyBullet(this.x,this.y,Math.cos(a)*speed,Math.sin(a)*speed,(dmg||13)*G.diff.dmg,this.eye,6)); } }
  spray(ang,n,spread,speed,dmg){ for(let k=0;k<n;k++){ const a=ang-spread/2+spread*(n===1?0.5:k/(n-1))+U.rand(-0.03,0.03); G.enemyBullets.push(new EnemyBullet(this.x,this.y,Math.cos(a)*speed,Math.sin(a)*speed,(dmg||12)*G.diff.dmg,this.eye,5)); } }
  summon(type,n){ for(let i=0;i<n;i++){ const a=U.rand(TAU), dd=this.r+34; G.enemies.push(new Enemy(type,this.x+Math.cos(a)*dd,this.y+Math.sin(a)*dd)); } Particles.burst(this.x,this.y,16,this.color,{speed:200,life:0.5}); }
  // generic attack telegraph: root the boss for a short wind-up (drawn as an expanding warning ring), then fire fn() → big bursts become readable & dodgeable
  charge(time,fn,col){ this._castT=time; this._castMax=time; this._castFn=fn; this._castCol=col||this.eye; Audio2.blip(280,Math.min(0.4,time),'sawtooth',0.2,560); }
  aiButcher(dt,ang,d){
    if(this.bstate==='idle'){ this.x+=Math.cos(ang)*this.speed*dt; this.y+=Math.sin(ang)*this.speed*dt;
      if(this.attackCd<=0 && d<560){ this.bstate='telegraph'; this.bstateT=0.75; this.cdir={x:Math.cos(ang),y:Math.sin(ang)}; } }
    else if(this.bstate==='telegraph'){ this.bstateT-=dt; if(this.bstateT<=0){ this.bstate='charge'; this.bstateT=0.55; Camera.shake(7,0.2); Audio2.explosion(); } }
    else if(this.bstate==='charge'){ this.bstateT-=dt; this.x+=this.cdir.x*760*dt; this.y+=this.cdir.y*760*dt;
      if(U.chance(0.7)) Particles.emit(this.x,this.y,U.rand(-70,70),U.rand(-70,70),0.4,5,this.color,{}); if(this.bstateT<=0){ this.bstate='recover'; this.bstateT=0.7; } }
    else { this.bstateT-=dt; if(this.bstateT<=0){ this.bstate='idle'; this.attackCd=U.rand(2.0,3.0); if(U.chance(0.6)) this.summon('runner',2); } }
  }
  aiBloated(dt,ang,d){
    const want=320; let mv=d>want+60?1:d<want-60?-1:0;
    this.x+=Math.cos(ang)*this.speed*mv*dt; this.y+=Math.sin(ang)*this.speed*mv*dt;
    this.x+=Math.cos(ang+1.57)*this.speed*0.5*Math.sin(G.time*1.2+this.phase)*dt; this.y+=Math.sin(ang+1.57)*this.speed*0.5*Math.sin(G.time*1.2+this.phase)*dt;
    if(this.attackCd<=0){ this.attackCd=U.rand(2.2,3.0);
      if(U.chance(0.5)) this.charge(0.4,()=>{ this.ring(18,200,0); this.ring(18,260,Math.PI/18); Camera.shake(5,0.2); Audio2.explosion(); });
      else { const aim=ang; this.charge(0.35,()=>{ this.spray(aim,7,1.1,300,14); Camera.shake(5,0.2); Audio2.explosion(); }); } }
  }
  aiWarlord(dt,ang,d){
    const want=360; let mv=d>want+70?1:d<want-110?-1:0;
    this.x+=Math.cos(ang)*this.speed*mv*dt; this.y+=Math.sin(ang)*this.speed*mv*dt;
    if(this.attackCd<=0){ this.attackCd=U.rand(1.6,2.4);
      if(U.chance(0.66)){ this.spray(ang,5,0.6,360,12); Audio2.enemyDie(); }   // light 5-shot spray stays instant (already easy to read/dodge)
      else this.charge(0.36,()=>{ this.summon('walker',3); this.ring(12,200,0); Audio2.enemyDie(); }); }   // summon+ring burst telegraphed
  }
  aiColossus(dt,ang,d){
    if(d>150){ this.x+=Math.cos(ang)*this.speed*dt; this.y+=Math.sin(ang)*this.speed*dt; }
    if(this.attackCd<=0){ this.attackCd=U.rand(2.6,3.4);
      if(d<380) this.charge(0.5,()=>{ Camera.shake(16,0.5); Particles.burst(this.x,this.y,30,this.eye,{speed:300,life:0.6,size:7}); this.ring(26,260,0); this.ring(26,180,Math.PI/26); Audio2.explosion(); });
      else this.charge(0.42,()=>{ this.ring(20,220,0); Audio2.explosion(); }); }
  }
  aiNecromancer(dt,ang,d){
    const want=380; let mv=d>want+70?1:d<want-90?-1:0;
    this.x+=Math.cos(ang)*this.speed*mv*dt; this.y+=Math.sin(ang)*this.speed*mv*dt;
    if(this.attackCd<=0){ this.attackCd=U.rand(2.4,3.2);
      const minis=G.enemies.reduce((n,e)=>n+(e.cfg.mini?1:0),0), r=U.rand();
      if(r<0.45 && minis<28){ this.bstate='telegraph'; this.bstateT=0.6; this.pendingCast='horde'; }
      else if(r<0.8) this.charge(0.4,()=>{ this.ring(16,210,0,14); this.ring(16,150,Math.PI/16,14); Audio2.explosion(); });
      else { this.bstate='telegraph'; this.bstateT=0.7; this.pendingCast='nova'; } }
    if(this.bstate==='telegraph'){ this.bstateT-=dt;
      if(U.chance(0.5)) Particles.emit(this.x,this.y,U.rand(-40,40),U.rand(-40,40),0.4,4,this.eye,{drag:0.9});
      if(this.bstateT<=0){ this.bstate='idle';
        if(this.pendingCast==='horde'){ this.summon('mite',5); this.summon('runner',2); Audio2.enemyDie(); }
        else { this.ring(28,240,0,12); this.ring(28,170,Math.PI/28,12); Camera.shake(10,0.3); Audio2.explosion(); } } }
  }
  aiTwins(dt,ang,d){
    const want=300; let mv=d>want+50?1:d<want-50?-1:0;
    this.x+=Math.cos(ang)*this.speed*mv*dt; this.y+=Math.sin(ang)*this.speed*mv*dt;
    const orbit=this.phase<Math.PI?1:-1;
    this.x+=Math.cos(ang+1.57*orbit)*this.speed*0.8*dt; this.y+=Math.sin(ang+1.57*orbit)*this.speed*0.8*dt;
    if(this.attackCd<=0){ this.attackCd=U.rand(1.4,2.0); if(U.chance(0.6)) this.spray(ang,5,0.7,340,11); else this.ring(10,220,this.phase,11); Audio2.enemyDie(); }
  }
  aiArtillery(dt,ang,d){
    if(d>520){ this.x+=Math.cos(ang)*this.speed*dt; this.y+=Math.sin(ang)*this.speed*dt; }
    this.mortars=this.mortars||[];
    if(this.attackCd<=0){ this.attackCd=U.rand(1.8,2.6); const salvo=U.chance(0.5)?3:1;
      for(let i=0;i<salvo;i++){ const tx=G.player.x+U.rand(-160,160), ty=G.player.y+U.rand(-160,160); this.mortars.push({x:U.clamp(tx,WALL,WORLD-WALL),y:U.clamp(ty,WALL,WORLD-WALL),t:1.1,r:90}); }
      Audio2.explosion(); if(U.chance(0.3)) this.ring(14,200,0,12); }
    for(const m of this.mortars){ m.t-=dt;
      if(m.t<=0 && !m.done){ m.done=true; G.explode(m.x,m.y,m.r,0);
        if(U.dist(m.x,m.y,G.player.x,G.player.y)<m.r+G.player.r) G.player.hurt(this.dmg*0.8,m.x,m.y);
        Particles.burst(m.x,m.y,20,'#ffae42',{speed:300,life:0.5,size:6}); Camera.shake(8,0.25); } }
    this.mortars=this.mortars.filter(m=>m.t>-0.3);
  }

  /* champion = mini-boss in a normal wave: buffed elite with a telegraphed special + own bar */
  makeChampion(){
    this.champion=true; this.elite=true;
    this.maxHp*=6.5; this.hp=this.maxHp;
    this.r*=1.42; this.dmg*=1.45; this.speed*=0.9; this.score*=8;
    this.champCd=U.rand(3.0,4.5); this.champState='';
    this.eye=shade(this.eye,1.15);
  }
  aiBlinker(dt,ang,d){
    const c=this.cfg;
    if(this.blinkState==='tele'){
      this.blinkT-=dt;
      if(U.chance(0.6)) Particles.emit(this.bx,this.by,U.rand(-30,30),U.rand(-30,30),0.4,4,this.eye,{drag:0.9});
      if(this.blinkT<=0){
        Particles.burst(this.x,this.y,12,this.color,{speed:220,life:0.35});
        this.x=this.bx; this.y=this.by;
        Particles.burst(this.x,this.y,14,this.eye,{speed:240,life:0.4}); Audio2.dash();
        this.blinkState=''; this.blinkCd=c.blinkCd;
      }
      return;
    }
    this.x+=Math.cos(ang)*this.speed*0.5*dt; this.y+=Math.sin(ang)*this.speed*0.5*dt;
    this.blinkCd=(this.blinkCd===undefined?c.blinkCd:this.blinkCd)-dt;
    if(this.blinkCd<=0 && d>c.blinkMin && d<c.blinkRange+260 && this.spawnT<=0){
      const p=G.player, off=U.rand(-0.6,0.6);
      this.bx=U.clamp(p.x-Math.cos(ang+off)*c.blinkMin, WALL,WORLD-WALL);
      this.by=U.clamp(p.y-Math.sin(ang+off)*c.blinkMin, WALL,WORLD-WALL);
      this.blinkState='tele'; this.blinkT=c.blinkTele;
    }
  }
  aiBubbler(dt,ang,d){
    const c=this.cfg;
    if(this.bubHp===undefined){ this.bubHp=c.bubbleHp; this.bubBroke=0; }
    if(this.bubBroke>0){ this.bubBroke-=dt; if(this.bubBroke<=0){ this.bubHp=c.bubbleHp*0.5; this.bubPop=0.4; } }
    else if(this.bubHp<c.bubbleHp){ this.bubHp=Math.min(c.bubbleHp, this.bubHp+c.bubbleRegen*dt); }
    if(this.bubPop>0) this.bubPop-=dt;
    this.x+=Math.cos(ang)*this.speed*dt; this.y+=Math.sin(ang)*this.speed*dt;
  }
  aiSummoner(dt,ang,d){
    const c=this.cfg, want=c.keepDist; let mv=d>want+40?1:d<want-40?-1:0;
    this.x+=Math.cos(ang)*this.speed*mv*dt; this.y+=Math.sin(ang)*this.speed*mv*dt;
    this.x+=Math.cos(ang+1.57)*this.speed*0.4*Math.sin(G.time*1.4+this.phase)*dt;
    this.y+=Math.sin(ang+1.57)*this.speed*0.4*Math.sin(G.time*1.4+this.phase)*dt;
    if(this.sumState==='cast'){
      this.sumT-=dt;
      if(U.chance(0.5)) Particles.emit(this.x,this.y,U.rand(-50,50),U.rand(-50,50),0.4,4,this.eye,{drag:0.9});
      if(this.sumT<=0){
        this.sumState='';
        const adds=G.enemies.reduce((n,e)=>n+(e.summoned?1:0),0);
        if(adds<c.sumCap){ for(let i=0;i<c.sumN;i++){ const a=U.rand(TAU);
          const m=new Enemy(c.sumType,this.x+Math.cos(a)*this.r*1.5,this.y+Math.sin(a)*this.r*1.5);
          m.summoned=true; G.enemies.push(m); }
          Particles.burst(this.x,this.y,14,this.eye,{speed:180,life:0.5}); Audio2.enemyDie(); }
      }
      return;
    }
    this.sumCd=(this.sumCd===undefined?c.sumCd:this.sumCd)-dt;
    if(this.sumCd<=0 && this.spawnT<=0 && d<620){ this.sumCd=c.sumCd; this.sumState='cast'; this.sumT=c.sumTele; }
  }
  aiZealot(dt,ang,d){
    const c=this.cfg;
    this.x+=Math.cos(ang)*this.speed*dt; this.y+=Math.sin(ang)*this.speed*dt;
    if(this.armT===undefined){
      if(d<c.blastR*1.6+G.player.r) this.armT=c.armT;
    } else {
      this.armT-=dt;
      if(U.chance(0.7)) Particles.emit(this.x,this.y,0,0,0.2,this.r*0.7,this.eye,{drag:0.85});
      if(this.armT<=0 || d<this.r+G.player.r){
        G.explode(this.x,this.y,c.blastR,0);
        if(U.dist(this.x,this.y,G.player.x,G.player.y)<c.blastR+G.player.r) G.player.hurt(c.blastDmg*G.diff.dmg,this.x,this.y);
        this.despawn();
      }
    }
  }
  aiRammer(dt,ang,d){
    const c=this.cfg;
    if(!this.rState) this.rState='chase';
    if(this.rState==='chase'){
      this.x+=Math.cos(ang)*this.speed*dt; this.y+=Math.sin(ang)*this.speed*dt;
      this.attackCd-=dt;
      if(d<c.chargeRange && this.attackCd<=0 && this.spawnT<=0){ this.rState='wind'; this.rT=c.windup; this.rdir={x:Math.cos(ang),y:Math.sin(ang)}; }
    } else if(this.rState==='wind'){
      this.rT-=dt; const a=Math.atan2(G.player.y-this.y,G.player.x-this.x); this.rdir={x:Math.cos(a),y:Math.sin(a)};
      if(U.chance(0.5)) Particles.emit(this.x,this.y,0,0,0.25,4,this.eye,{drag:0.85});
      if(this.rT<=0){ this.rState='charge'; this.rT=c.chargeDur; Camera.shake(5,0.15); Audio2.dash(); }
    } else if(this.rState==='charge'){
      this.rT-=dt; this.x+=this.rdir.x*c.chargeSpeed*dt; this.y+=this.rdir.y*c.chargeSpeed*dt;
      if(U.chance(0.8)) Particles.emit(this.x,this.y,U.rand(-50,50),U.rand(-50,50),0.3,5,this.color,{});
      const p=G.player;
      if(U.dist(this.x,this.y,p.x,p.y)<this.r+p.r){
        p.hurt(c.ramDmg*G.diff.dmg,this.x,this.y);
        const a=Math.atan2(p.y-this.y,p.x-this.x);
        p.x+=Math.cos(a)*c.ramKnock*dt*6; p.y+=Math.sin(a)*c.ramKnock*dt*6;
        Camera.shake(9,0.25); this.rState='recover'; this.rT=0.6;
      }
      if(this.rT<=0){ this.rState='recover'; this.rT=0.6; }
    }
    if(this.rState==='recover'){ this.rT-=dt; if(this.rT<=0){ this.rState='chase'; this.attackCd=U.rand(2.2,3.2); } }
  }
  aiWraith(dt,ang,d){
    const c=this.cfg;
    const wobble=Math.sin(G.time*2.3+this.phase)*c.driftAmp + Math.sin(G.time*0.7+this.phase*2)*0.6;
    const a=ang+wobble*0.5;
    this.x+=Math.cos(a)*this.speed*dt; this.y+=Math.sin(a)*this.speed*dt;
    this.x+=Math.cos(ang+1.57)*this.speed*0.6*Math.sin(G.time*1.8+this.phase)*dt;
    this.y+=Math.sin(ang+1.57)*this.speed*0.6*Math.sin(G.time*1.8+this.phase)*dt;
    this.fade=c.fadeMin+(1-c.fadeMin)*(0.5+0.5*Math.sin(G.time*1.6+this.phase));
    if(U.chance(0.12)) Particles.emit(this.x,this.y,0,0,0.4,3,this.eye,{drag:0.9});
  }
  aiBrawler(dt,ang,d){
    this.attackCd=(this.attackCd||0)-dt;
    if(this.bstate==='slam'){ this.bstateT-=dt;
      if(U.chance(0.6)) Particles.emit(this.x,this.y,U.rand(-26,26),U.rand(-26,26),0.25,4,this.eye,{});
      if(this.bstateT<=0){
        if(U.dist(this.x,this.y,G.player.x,G.player.y)<160) G.player.hurt(this.dmg*1.3,this.x,this.y);
        Particles.burst(this.x,this.y,16,this.eye,{speed:230,life:0.4}); Camera.shake(6,0.25);
        this.bstate=''; this.attackCd=U.rand(3,4.5);
      }
      return;   // rooted during the wind-up → telegraphed, dodgeable
    }
    this.x+=Math.cos(ang)*this.speed*dt; this.y+=Math.sin(ang)*this.speed*dt;
    if(d<130 && this.attackCd<=0){ this.bstate='slam'; this.bstateT=0.55; }
  }
  // SCIACALLO/Scavenger special encounter: never attacks, flees with a weave, steers toward open space (no easy cornering),
  // and ESCAPES (no reward) if its timer runs out or it gets too far. Catch & kill it for a big payout (see onKill).
  aiLooter(dt,ang,d){
    this.lootLife=(this.lootLife==null?13:this.lootLife)-dt;
    let fx=Math.cos(ang+Math.PI), fy=Math.sin(ang+Math.PI);           // run directly away from the player
    const wv=Math.sin(G.time*4.5+this.phase)*0.85;                    // weave so it's not a straight line
    fx+=Math.cos(ang+1.57)*wv; fy+=Math.sin(ang+1.57)*wv;
    const cx=WORLD/2, cy=WORLD/2, edge=420;                            // steer back toward the arena centre near walls → harder to trap
    if(this.x<WALL+edge||this.x>WORLD-WALL-edge||this.y<WALL+edge||this.y>WORLD-WALL-edge){ const ca=Math.atan2(cy-this.y,cx-this.x); fx+=Math.cos(ca)*0.9; fy+=Math.sin(ca)*0.9; }
    const m=Math.hypot(fx,fy)||1; fx/=m; fy/=m;
    this.x+=fx*this.speed*dt; this.y+=fy*this.speed*dt;
    this.face=Math.atan2(fy,fx);
    if(!(window.G&&G.lowFx) && U.chance(0.7)) Particles.emit(this.x,this.y,U.rand(-26,26),U.rand(-26,26),0.45,3,'#ffd24d',{drag:0.9,grav:-20});   // glittering loot trail
    if(this.lootLife<=0 || d>1350){                                   // got away → vanish with NO reward
      this.dead=true;
      Particles.burst(this.x,this.y,18,'#ffd24d',{speed:240,life:0.5,size:4});
      banner('FUGGITO!', 'il bottino è perso', false); Audio2.hurt();
    }
  }
  champUpdate(dt,ang,d){
    if(this.champState==='nova'){
      this.champT-=dt;
      if(U.chance(0.6)) Particles.emit(this.x,this.y,U.rand(-60,60),U.rand(-60,60),0.4,5,this.eye,{drag:0.9});
      if(this.champT<=0){
        this.champState='';
        this.ring(16,240,U.rand(TAU),14); this.ring(16,180,Math.PI/16,14);
        Camera.shake(8,0.25); Audio2.explosion();
        this.champCd=U.rand(4.5,6.5);
      }
      return true;
    }
    this.champCd-=dt;
    if(this.champCd<=0 && this.spawnT<=0 && d<560){ this.champState='nova'; this.champT=0.7; }
    return false;
  }
  aiSplitter(dt,ang,d){
    const hpr=this.hp/this.maxHp;
    if(!this.didSplit && hpr<0.5 && !this.splitChild){
      this.didSplit=true;
      this.maxHp*=0.55; this.hp=this.maxHp; this.r*=0.72; this.splitChild=true; this.speed*=1.25;
      const child=new Enemy('boss',this.x+U.rand(-40,40),this.y+U.rand(-40,40));
      child.bossKind='splitter'; child.bossName=this.bossName; child.bdef=this.bdef;
      child.color=this.color; child.eye=this.eye; child.r=this.r;
      child.maxHp=this.maxHp; child.hp=this.maxHp; child.speed=this.speed; child.dmg=this.dmg;
      child.splitChild=true; child.didSplit=true; child.phase=Math.PI;
      G.enemies.push(child);
      Particles.burst(this.x,this.y,40,this.eye,{speed:340,life:0.7,size:6}); Camera.shake(14,0.4); Audio2.explosion();
      banner('SI DIVIDE!',this.bossName,true);
    }
    const enraged=this.splitChild && hpr<0.5;
    const want=300; let mv=d>want+50?1:d<want-50?-1:0;
    this.x+=Math.cos(ang)*this.speed*mv*dt; this.y+=Math.sin(ang)*this.speed*mv*dt;
    this.x+=Math.cos(ang+1.57)*this.speed*0.6*Math.sin(G.time*1.4+this.phase)*dt;
    this.y+=Math.sin(ang+1.57)*this.speed*0.6*Math.sin(G.time*1.4+this.phase)*dt;
    if(this.attackCd<=0){ this.attackCd=U.rand(enraged?0.9:1.6, enraged?1.4:2.2);
      if(U.chance(0.6)) this.spray(ang,enraged?7:5,0.7,330,12); else this.ring(enraged?14:10,220,this.phase,12);
      Audio2.enemyDie(); }
  }
  aiHiveQueen(dt,ang,d){
    const hpr=this.hp/this.maxHp, phase=hpr>0.66?1:hpr>0.33?2:3;
    const want=380; let mv=d>want+70?1:d<want-90?-1:0;
    this.x+=Math.cos(ang)*this.speed*mv*dt; this.y+=Math.sin(ang)*this.speed*mv*dt;
    if(this.attackCd<=0){
      const adds=G.enemies.reduce((n,e)=>n+(e.summoned?1:0),0);
      if(phase===1){ this.attackCd=U.rand(2.6,3.4);
        if(adds<22){ for(const t of ['mite','mite','swarmer']){ const m=new Enemy(t,this.x+U.rand(-40,40),this.y+U.rand(-40,40)); m.summoned=true; G.enemies.push(m);} }
        Particles.burst(this.x,this.y,18,this.color,{speed:200,life:0.5}); Audio2.enemyDie();
      } else if(phase===2){ this.attackCd=U.rand(2.0,2.8);
        this.charge(0.42,()=>{ this.ring(18,230,0,13); this.ring(18,170,Math.PI/18,13); Camera.shake(7,0.25); Audio2.explosion(); });   // 36-bullet double-ring → telegraphed
      } else { this.attackCd=U.rand(1.4,2.0);
        this.charge(0.3,()=>{ this.ring(14,250,U.rand(TAU),13);
          if(adds<18){ for(let i=0;i<3;i++){ const m=new Enemy('mite',this.x+U.rand(-40,40),this.y+U.rand(-40,40)); m.summoned=true; G.enemies.push(m);} }
          Camera.shake(6,0.2); Audio2.explosion(); });
      }
    }
  }
  aiDuelist(dt,ang,d){
    const hpr=this.hp/this.maxHp;
    if(this.bstate==='blink'){ this.bstateT-=dt;
      if(U.chance(0.6)) Particles.emit(this.bx,this.by,U.rand(-30,30),U.rand(-30,30),0.4,4,this.eye,{drag:0.9});
      if(this.bstateT<=0){ Particles.burst(this.x,this.y,16,this.color,{speed:260,life:0.4});
        this.x=this.bx; this.y=this.by; Particles.burst(this.x,this.y,16,this.eye,{speed:260,life:0.4}); Audio2.dash();
        this.bstate='slash'; this.bstateT=0.35; }
      return;
    }
    if(this.bstate==='slash'){ this.bstateT-=dt;
      this.x+=Math.cos(ang)*420*dt; this.y+=Math.sin(ang)*420*dt;
      if(this.bstateT<=0){ this.bstate='idle'; this.attackCd=U.rand(hpr<0.5?0.7:1.1, hpr<0.5?1.2:1.8); }
      return;
    }
    this.x+=Math.cos(ang+1.57)*this.speed*0.7*Math.sin(G.time*2+this.phase)*dt;
    this.y+=Math.sin(ang+1.57)*this.speed*0.7*Math.sin(G.time*2+this.phase)*dt;
    if(d>240){ this.x+=Math.cos(ang)*this.speed*0.5*dt; this.y+=Math.sin(ang)*this.speed*0.5*dt; }
    if(this.attackCd<=0){
      if(hpr<0.5 && U.chance(0.4)){ this.ring(12,300,this.phase,12); Audio2.explosion(); this.attackCd=U.rand(1.0,1.6); }
      else { const p=G.player, off=U.rand(-1,1)>0?1.4:-1.4;
        this.bx=U.clamp(p.x+Math.cos(ang+off)*150, WALL,WORLD-WALL);
        this.by=U.clamp(p.y+Math.sin(ang+off)*150, WALL,WORLD-WALL);
        this.bstate='blink'; this.bstateT=0.4; }
    }
  }
  aiReaver(dt,ang,d){
    const hpr=this.hp/this.maxHp, want=300;
    const mv = d>want+60?1 : d<want-50?-1 : 0;
    this.x += (Math.cos(ang)*mv*0.7 + Math.cos(ang+1.57)*0.8)*this.speed*dt;
    this.y += (Math.sin(ang)*mv*0.7 + Math.sin(ang+1.57)*0.8)*this.speed*dt;
    this.x=U.clamp(this.x,WALL,WORLD-WALL); this.y=U.clamp(this.y,WALL,WORLD-WALL);
    if(this.attackCd<=0){
      this.attackCd=U.rand(hpr<0.4?0.8:1.3, hpr<0.4?1.4:2.0);
      const roll=U.rand(0,1);
      if(roll<0.5){ this.spray(ang,hpr<0.4?9:7,1.0,300,12); Audio2.explosion(); }   // signature barrage spray stays instant
      else if(roll<0.85){ const nn=hpr<0.4?16:12; this.charge(0.32,()=>{ this.ring(nn,240,U.rand(TAU),11); Audio2.explosion(); }); }
      else { this.summon('runner',2); Audio2.explosion(); }
    }
  }
  aiOverseer(dt,ang,d){
    const hpr=this.hp/this.maxHp, want=340;
    const mv = d>want+50?1 : d<want-50?-1 : 0;
    this.x += (Math.cos(ang)*mv*0.6 + Math.cos(ang+1.57)*0.5)*this.speed*dt;
    this.y += (Math.sin(ang)*mv*0.6 + Math.sin(ang+1.57)*0.5)*this.speed*dt;
    this.x=U.clamp(this.x,WALL,WORLD-WALL); this.y=U.clamp(this.y,WALL,WORLD-WALL);
    this._spiral=(this._spiral||0)+dt*(hpr<0.5?3.4:2.4);
    this.fireCd2=(this.fireCd2||0)-dt;
    if(this.fireCd2<=0 && G.enemyBullets.length<300){ this.fireCd2=hpr<0.5?0.16:0.13;
      const arms=2;   // capped at 2 arms → always a readable gap to slip through
      for(let a=0;a<arms;a++){ const an=this._spiral + a/arms*TAU;
        G.enemyBullets.push(new EnemyBullet(this.x,this.y,Math.cos(an)*220,Math.sin(an)*220,12*G.diff.dmg,this.eye,5)); }
    }
    if(this.attackCd<=0){ this.attackCd=U.rand(4,6); this.summon('runner',3); }
  }
  aiQuaker(dt,ang,d){
    const hpr=this.hp/this.maxHp;
    if(this.bstate==='wind'){ this.bstateT-=dt;
      if(U.chance(0.7)) Particles.emit(this.x,this.y,U.rand(-50,50),U.rand(-50,50),0.3,5,this.eye,{});
      if(this.bstateT<=0){ const rings=hpr<0.5?3:2;
        for(let k=0;k<rings;k++){ this.ring(18, 180+k*70, U.rand(TAU), 13); }
        Camera.shake(14,0.4); Audio2.explosion(); this.bstate='idle'; this.attackCd=U.rand(2.4,3.4); }
      return;
    }
    this.x+=Math.cos(ang)*this.speed*dt; this.y+=Math.sin(ang)*this.speed*dt;
    if(this.attackCd<=0){
      if(U.chance(0.7)){ this.bstate='wind'; this.bstateT=0.8; }
      else { this.summon('brawler',2); this.attackCd=U.rand(2.5,3.5); }
    }
  }
  aiAegis(dt,ang,d){
    // SHIELD turns toward the player but at a LIMITED rate → out-circle it (get close & strafe hard, or dash) to expose the rear core
    if(this.shieldDir==null){ this.shieldDir=ang; this.shieldArc=this.shieldArc||1.25; this.shieldTurn=this.shieldTurn||1.05; }
    let dd=((ang-this.shieldDir+Math.PI*3)%(Math.PI*2))-Math.PI;
    const step=this.shieldTurn*dt; this.shieldDir+=U.clamp(dd,-step,step);
    this.face=this.shieldDir;   // body faces where the shield points (lags the player → flankable)
    // executing a shield-bash dash?
    if(this.bashT>0){ this.bashT-=dt; this.x+=this.bashV.x*640*dt; this.y+=this.bashV.y*640*dt;
      this.x=U.clamp(this.x,WALL,WORLD-WALL); this.y=U.clamp(this.y,WALL,WORLD-WALL);
      if(!G.lowFx&&U.chance(0.6)) Particles.emit(this.x,this.y,U.rand(-60,60),U.rand(-60,60),0.4,5,this.eye,{}); return; }
    // keep mid-range, drift sideways so it's a moving target too
    const want=300, mv=d>want+60?1:d<want-70?-1:0;
    this.x+=Math.cos(ang)*this.speed*mv*dt; this.y+=Math.sin(ang)*this.speed*mv*dt;
    this.x+=Math.cos(ang+1.57)*this.speed*0.45*Math.sin(G.time*1.1+this.phase)*dt;
    this.y+=Math.sin(ang+1.57)*this.speed*0.45*Math.sin(G.time*1.1+this.phase)*dt;
    if(this.attackCd<=0){ this.attackCd=U.rand(2.4,3.4);
      if(Math.abs(dd)>1.5)   // player is BEHIND the shield (hitting the core) → punish rear-camping with a telegraphed back-cone
        this.charge(0.45,()=>{ this.spray(this.shieldDir+Math.PI,9,1.4,330,13); Audio2.explosion(); }, '#7fe9ff');
      else                    // player is up front → telegraphed SHIELD BASH along the shield direction
        this.charge(0.5,()=>{ this.bashV={x:Math.cos(this.shieldDir),y:Math.sin(this.shieldDir)}; this.bashT=0.42; Camera.shake(8,0.25); Audio2.explosion(); }, '#bfe9ff');
    }
  }
  drawBlinker(ctx,skin,flash){
    const r=this.r, dk=shade(skin,0.5), lt=shade(skin,1.4), tele=this.blinkState==='tele';
    if(tele){ ctx.globalAlpha=0.5+0.3*Math.sin(G.time*30); }
    ctx.shadowBlur=18; ctx.shadowColor=skin;
    const g=ctx.createRadialGradient(-r*0.2,-r*0.2,r*0.2,0,0,r); g.addColorStop(0,lt); g.addColorStop(1,dk);
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,r*0.78,r*0.7,0,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle=lt; for(let i=0;i<5;i++){ const a=i/5*TAU+G.time*1.5; ctx.beginPath();
      ctx.moveTo(Math.cos(a)*r*0.5,Math.sin(a)*r*0.5); ctx.lineTo(Math.cos(a)*r*1.0,Math.sin(a)*r*1.0);
      ctx.lineTo(Math.cos(a+0.3)*r*0.55,Math.sin(a+0.3)*r*0.55); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle='#16102b'; ctx.beginPath(); ctx.arc(r*0.35,0,r*0.3,0,TAU); ctx.fill();
    this.eyes(ctx,r*0.42,r*0.13,r*0.09);
    ctx.globalAlpha=1;
  }
  drawBubbler(ctx,skin,flash){
    const r=this.r, dk=shade(skin,0.5), bubFrac=this.cfg.bubbleHp?(this.bubHp||0)/this.cfg.bubbleHp:0;
    ctx.shadowBlur=14; ctx.shadowColor=skin;
    const g=ctx.createRadialGradient(-r*0.2,-r*0.2,r*0.2,0,0,r); g.addColorStop(0,shade(skin,1.2)); g.addColorStop(1,dk);
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,r*0.66,r*0.62,0,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle=shade(skin,0.85); ctx.beginPath(); ctx.arc(r*0.25,0,r*0.28,0,TAU); ctx.fill();
    this.eyes(ctx,r*0.35,r*0.12,r*0.08);
    ctx.restore(); ctx.save(); ctx.translate(this.x,this.y);
    if(bubFrac>0.02){ const pop=this.bubPop>0?this.bubPop/0.4:0;
      ctx.strokeStyle='rgba(159,240,255,'+(0.25+0.45*bubFrac)+')'; ctx.lineWidth=2.5+1.5*bubFrac; ctx.shadowBlur=10; ctx.shadowColor='#9ff0ff';
      ctx.beginPath(); ctx.arc(0,0,r*1.18+pop*r*0.4,0,TAU); ctx.stroke(); ctx.shadowBlur=0;
      ctx.fillStyle='rgba(159,240,255,'+(0.06+0.08*bubFrac)+')'; ctx.beginPath(); ctx.arc(0,0,r*1.18,0,TAU); ctx.fill();
    }
  }
  drawSummoner(ctx,skin,flash){
    const r=this.r, dk=shade(skin,0.5), lt=shade(skin,1.3), cast=this.sumState==='cast', bob=Math.sin(G.time*2+this.phase)*r*0.12;
    if(cast){ ctx.shadowBlur=22; ctx.shadowColor=this.eye; }
    const g=ctx.createLinearGradient(0,-r,0,r); g.addColorStop(0,lt); g.addColorStop(1,dk);
    ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(-r*0.7,r*0.8+bob); ctx.lineTo(0,-r*0.8+bob); ctx.lineTo(r*0.7,r*0.8+bob); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='#1a1206'; ctx.beginPath(); ctx.arc(r*0.05,-r*0.3+bob,r*0.34,0,TAU); ctx.fill();
    ctx.fillStyle=this.eye; ctx.shadowBlur=cast?16:8; ctx.shadowColor=this.eye;
    this.eyes(ctx,r*0.15,r*0.12,cast?r*0.1:r*0.07); ctx.shadowBlur=0;
    if(cast){ ctx.strokeStyle='rgba(255,207,110,'+(0.4+0.4*Math.sin(G.time*20))+')'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(0,0,r*1.3,0,TAU); ctx.stroke();
      for(let i=0;i<3;i++){ const a=i/3*TAU+G.time; ctx.beginPath(); ctx.arc(Math.cos(a)*r*1.3,Math.sin(a)*r*1.3,r*0.12,0,TAU); ctx.stroke(); } }
  }
  drawZealot(ctx,skin,flash){
    const r=this.r, dk=shade(skin,0.5), arm=this.armT!==undefined, pulse=arm?(0.5+0.5*Math.sin(G.time*36)):0, sw=Math.sin(G.time*20+this.phase)*r*0.5;
    ctx.strokeStyle=dk; ctx.lineWidth=r*0.28;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-r*0.9,-r*0.7+sw); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-r*0.9, r*0.7-sw); ctx.stroke();
    ctx.shadowBlur=arm?22:10; ctx.shadowColor=arm?'#ff5b2d':skin;
    ctx.fillStyle=arm?shade('#ff5b2d',1+pulse*0.4):skin; ctx.beginPath(); ctx.ellipse(0,0,r*0.7,r*0.6,0,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    this.eye=arm?'#ff3b2d':this.cfg.eye; this.eyes(ctx,r*0.4,r*0.14,r*0.09+pulse*r*0.04);
    if(arm){ ctx.strokeStyle='rgba(255,91,45,'+(0.3+pulse*0.4)+')'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,this.cfg.blastR,0,TAU); ctx.stroke(); }
  }
  drawRammer(ctx,skin,flash){
    const r=this.r, dk=shade(skin,0.5), lt=shade(skin,1.2), charging=this.rState==='charge', wind=this.rState==='wind';
    if(charging) skin='#fff7e0';
    ctx.strokeStyle=dk; ctx.lineWidth=r*0.4;
    ctx.beginPath(); ctx.moveTo(-r*0.1,-r*0.35); ctx.lineTo(-r*0.5,-r*0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r*0.1, r*0.35); ctx.lineTo(-r*0.5, r*0.6); ctx.stroke();
    ctx.shadowBlur=wind?20:14; ctx.shadowColor=wind?this.eye:skin;
    const g=ctx.createRadialGradient(-r*0.2,-r*0.2,r*0.2,0,0,r); g.addColorStop(0,lt); g.addColorStop(1,dk);
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,r*0.92,r*0.84,0,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle=shade(skin,0.75);
    ctx.beginPath(); ctx.moveTo(r*0.6,-r*0.55); ctx.lineTo(r*1.25,-r*0.18); ctx.lineTo(r*1.25,r*0.18); ctx.lineTo(r*0.6,r*0.55); ctx.closePath(); ctx.fill();
    ctx.fillStyle=lt; ctx.beginPath(); ctx.moveTo(r*0.7,-r*0.4); ctx.lineTo(r*1.35,-r*0.3); ctx.lineTo(r*0.95,-r*0.1); ctx.closePath();
    ctx.moveTo(r*0.7,r*0.4); ctx.lineTo(r*1.35,r*0.3); ctx.lineTo(r*0.95,r*0.1); ctx.closePath(); ctx.fill();
    this.eyes(ctx,r*0.45,r*0.12,r*0.09);
  }
  drawWraith(ctx,skin,flash){
    const r=this.r, dk=shade(skin,0.5), lt=shade(skin,1.4);
    ctx.globalAlpha=this.fade!==undefined?this.fade:0.7;
    ctx.shadowBlur=18; ctx.shadowColor=this.eye;
    const g=ctx.createLinearGradient(0,-r,0,r); g.addColorStop(0,lt); g.addColorStop(1,dk);
    ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(0,-r*0.8);
    for(let i=0;i<=6;i++){ const t=i/6, yy=r*(0.8 - 1.6*t), tw=Math.sin(G.time*4+i+this.phase)*r*0.12;
      ctx.lineTo(r*0.7*(1-t*0.2)+tw, yy); }
    for(let i=6;i>=0;i--){ const t=i/6, yy=r*(0.8 - 1.6*t), tw=Math.sin(G.time*4-i+this.phase)*r*0.12;
      ctx.lineTo(-r*0.7*(1-t*0.2)+tw, yy); }
    ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
    this.eyes(ctx,r*0.0,r*0.18,r*0.1);
    ctx.globalAlpha=1;
  }
  damage(dmg,fx,fy,crit){
    if(this.dead) return;
    if(this.frozen>0) dmg*=1.5;   // frozen enemies are brittle (+50%)
    if(this.shieldArc && fx!=null && ((fx-this.x)*(fx-this.x)+(fy-this.y)*(fy-this.y))>9){   // L'Egida: directional shots into the frontal arc are deflected. AoE centered on the boss (nuke) has origin≈center → not blocked.
      const hitAng=Math.atan2(fy-this.y,fx-this.x);
      let dd=((hitAng-(this.shieldDir||0)+Math.PI*3)%(Math.PI*2))-Math.PI;
      if(Math.abs(dd)<this.shieldArc){
        this._shieldHitT=0.12;
        if(!(window.G&&G.lowFx)&&U.chance(0.5)){ const sx=this.x+Math.cos(hitAng)*this.r*1.3, sy=this.y+Math.sin(hitAng)*this.r*1.3; Particles.burst(sx,sy,3,'#bfe9ff',{speed:120,life:0.2,size:2}); }
        if(U.chance(0.1)) Audio2.blip(1500,0.04,'sine',0.05,1900);   // sparse deflect ping (not per-bullet → no spam)
        dmg*=0.12;   // 88% blocked — soft wall, not a hard immunity (you can still chip if you refuse to move)
      } else dmg*=1.25;   // exposed reactor core: bonus damage for flanking (feedback = big vs tiny damage numbers)
    }
    if(this.dmgTakenMul) dmg*=this.dmgTakenMul;
    this.hp-=dmg; this.hitFlash=0.1;
    G.addFloat(this.x,this.y-this.r,Math.round(dmg),crit);
    Particles.burst(this.x,this.y,crit?Math.min(12,7+Math.round(dmg/40)):4, crit?'#fff1a0':this.color,{speed:crit?190:140,life:0.3,size:crit?3:2.5});
    // NO per-hit hit-stop: it was firing on every crit against a boss/elite → constant micro-freezes
    // that read as LAG during a sustained boss fight. The boss-KILL still gets its single dramatic freeze.
    if(this.hp<=0) this.kill();
  }
  despawn(){ // removed without crediting the player (e.g. bomber self-detonation)
    if(this.dead) return; this.dead=true;
    Particles.burst(this.x,this.y,14,this.color,{speed:240,life:0.5,size:4}); Audio2.enemyDie();
  }
  kill(){
    if(this.dead) return; this.dead=true;
    const big = !this.boss && (this.elite||this.champion);
    Particles.burst(this.x,this.y, this.boss?100:(big?30:14), this.color,{speed:this.boss?460:(big?330:240),life:this.boss?1.1:0.5,size:this.boss?7:(big?6:4),glow:true});
    Particles.burst(this.x,this.y, this.boss?42:6, '#1a1a1a',{speed:this.boss?160:120,life:0.85,size:this.boss?6:5,grav:60,glow:false});
    if(!this.boss) Particles.burst(this.x,this.y, big?10:4, '#ffffff',{speed:big?270:190,life:0.16,size:3,glow:true});   // bright POP — makes every kill feel crisp
    if(big) Camera.shake(4,0.16);
    if(this.boss){ const rr=this.r*1.4; for(let i=0;i<18;i++){ const a=i/18*TAU; Particles.emit(this.x+Math.cos(a)*rr,this.y+Math.sin(a)*rr,Math.cos(a)*380,Math.sin(a)*380,0.75,6,this.eye,{drag:0.92}); } }
    G.onKill(this);
    if(this.boss){
      // cinematic finish: long hit-stop freeze, golden screen flash, layered shockwave rings
      Camera.shake(36,0.95); G.hitStop=0.34; G.flash=Math.max(G.flash,0.6); G.flashColor='255,225,150';
      Audio2.explosion(); G.explode(this.x,this.y,200,0);
      for(let i=0;i<3;i++){ const rr=this.r*(1.1+i*0.55), sp=280+i*130;
        for(let k=0;k<24;k++){ const a=k/24*TAU; Particles.emit(this.x+Math.cos(a)*rr,this.y+Math.sin(a)*rr,Math.cos(a)*sp,Math.sin(a)*sp,0.9,5,this.eye,{drag:0.9,shrink:true}); } }
    } else Audio2.enemyDie(this.elite||this.champion||this.r>=26);   // bigger enemies die with a deeper, longer sound (a mite ≠ a brute)
  }

  draw(ctx){
    const face=this.face||0, flash=this.hitFlash>0;
    ctx.save(); ctx.translate(this.x,this.y);
    ctx.fillStyle='rgba(0,0,0,0.42)'; ctx.beginPath(); ctx.ellipse(0,this.r*0.5,this.r*1.1,this.r*0.6,0,0,TAU); ctx.fill();
    if(this.elite){ ctx.strokeStyle='rgba(255,210,90,0.7)'; ctx.lineWidth=2; ctx.shadowBlur=14; ctx.shadowColor='#ffd24d';
      ctx.beginPath(); ctx.arc(0,0,this.r*1.25+Math.sin(G.time*4+this.phase)*2,0,TAU); ctx.stroke(); ctx.shadowBlur=0; }
    if(this.enraged){ ctx.strokeStyle='rgba(255,60,60,'+(0.4+0.3*Math.sin(G.time*8))+')'; ctx.lineWidth=2.5; ctx.shadowBlur=12; ctx.shadowColor='#ff3b3b';
      ctx.beginPath(); ctx.arc(0,0,this.r*1.15,0,TAU); ctx.stroke(); ctx.shadowBlur=0; }
    if(this._castT>0 && this._castMax>0){   // attack wind-up tell: brightening core ring + an expanding shockwave-warning
      const f=U.clamp(1-this._castT/this._castMax,0,1), col=this._castCol||this.eye;
      ctx.save(); if(!G.lowFx){ ctx.shadowBlur=16; ctx.shadowColor=col; }
      ctx.strokeStyle=col; ctx.globalAlpha=0.4+0.5*f; ctx.lineWidth=2+3*f;
      ctx.beginPath(); ctx.arc(0,0,this.r*1.2,0,TAU); ctx.stroke();
      ctx.globalAlpha=0.5-0.42*f; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(0,0,this.r*(1.25+f*2.1),0,TAU); ctx.stroke();
      ctx.restore(); ctx.globalAlpha=1; ctx.shadowBlur=0; }
    const sc=this.spawnT>0?U.clamp(1-this.spawnT/0.35,0,1):1; ctx.scale(sc,sc);
    ctx.rotate(face); ctx.lineCap='round';
    const skin=flash?'#ffffff':(this.elite?shade(this.color,1.15):this.color);
    if(this.boss) this.drawBoss(ctx,skin,flash);
    else if(this.type==='brute') this.drawBrute(ctx,skin,flash);
    else if(this.type==='spitter') this.drawSpitter(ctx,skin,flash);
    else if(this.type==='bomber') this.drawBomber(ctx,skin,flash);
    else if(this.type==='shielder') this.drawShielder(ctx,skin,flash);
    else if(this.type==='swarmer') this.drawSwarmer(ctx,skin,flash);
    else if(this.type==='mite') this.drawMite(ctx,skin,flash);
    else if(this.type==='leaper') this.drawLeaper(ctx,skin,flash);
    else if(this.type==='healer') this.drawHealer(ctx,skin,flash);
    else if(this.type==='sniper') this.drawSniper(ctx,skin,flash);
    else if(this.type==='blinker') this.drawBlinker(ctx,skin,flash);
    else if(this.type==='bubbler') this.drawBubbler(ctx,skin,flash);
    else if(this.type==='summoner') this.drawSummoner(ctx,skin,flash);
    else if(this.type==='zealot') this.drawZealot(ctx,skin,flash);
    else if(this.type==='rammer') this.drawRammer(ctx,skin,flash);
    else if(this.type==='wraith') this.drawWraith(ctx,skin,flash);
    else if(this.type==='gunner') this.drawGunner(ctx,skin,flash);
    else if(this.type==='brawler') this.drawBrawler(ctx,skin,flash);
    else if(this.type==='looter') this.drawLooter(ctx,skin,flash);
    else this.drawZombie(ctx,skin,flash);
    ctx.restore();
    // persistent STATUS overlay (world space) so burning/chilled enemies are legible EVERY frame, not just on a random-particle frame
    if(this.burnT>0 && !(window.G&&G.lowFx)){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=0.25+0.2*Math.sin(G.time*12+this.phase);
      ctx.fillStyle='#ff7a2d'; ctx.beginPath(); ctx.arc(this.x,this.y,this.r*1.05,0,TAU); ctx.fill(); ctx.restore(); }
    if(this.frozen>0){ ctx.save(); ctx.globalAlpha=0.45; ctx.fillStyle='#bfeaff'; if(!(window.G&&G.lowFx)){ctx.shadowBlur=10;ctx.shadowColor='#dff4ff';} ctx.beginPath(); ctx.arc(this.x,this.y,this.r*1.05,0,TAU); ctx.fill(); ctx.restore(); ctx.shadowBlur=0; }   // frozen solid = bright ice fill
    else if(this.chillT>0){ ctx.save(); ctx.strokeStyle='rgba(150,230,255,0.85)'; ctx.lineWidth=2.5; if(!(window.G&&G.lowFx)){ctx.shadowBlur=8;ctx.shadowColor='#bfeaff';}
      ctx.beginPath(); ctx.arc(this.x,this.y,this.r*1.08,0,TAU); ctx.stroke(); ctx.restore(); ctx.shadowBlur=0; }
    // mortar markers
    if(this.mortars){ for(const m of this.mortars){ if(m.done) continue; const a=1-m.t/1.1;
      ctx.strokeStyle='rgba(255,80,90,'+(0.35+0.45*a)+')'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(m.x,m.y,m.r*(0.4+0.6*a),0,TAU); ctx.stroke(); } }   // danger-hue impact ring (was amber, clashed with loot)
    // sniper telegraph beam
    if(this.type==='sniper' && this.sniperState==='aim'){
      const a=this.lockAng, len=1100, p=U.clamp(1-this.aimT/this.cfg.aimTime,0,1);
      ctx.strokeStyle='rgba(255,60,60,'+(0.22+0.5*p)+')'; ctx.lineWidth=1+2.5*p; ctx.shadowBlur=8; ctx.shadowColor='#ff3b3b';
      ctx.beginPath(); ctx.moveTo(this.x,this.y); ctx.lineTo(this.x+Math.cos(a)*len,this.y+Math.sin(a)*len); ctx.stroke(); ctx.shadowBlur=0;
    }
    // champion marker (mini-boss): aura ring + name tag
    if(this.champion && !this.dead){
      ctx.strokeStyle='rgba(255,91,45,0.85)'; ctx.lineWidth=2.5; ctx.shadowBlur=16; ctx.shadowColor='#ff5b2d';
      ctx.beginPath(); ctx.arc(this.x,this.y,this.r*1.35+Math.sin(G.time*5+this.phase)*3,0,TAU); ctx.stroke(); ctx.shadowBlur=0;
      ctx.fillStyle='#ffd24d'; ctx.font='700 11px '+(getComputedStyle(document.documentElement).getPropertyValue('--head')||'sans-serif');
      ctx.textAlign='center'; ctx.fillText(trChamp(this.champName||'CAMPIONE'), this.x, this.y-this.r-22); ctx.textAlign='left';
    }
    if(this.hunter && !this.dead){   // HUNTER marker: pulsing magenta aura + name + a thin line of intent toward the player
      ctx.strokeStyle='rgba(224,123,255,0.9)'; ctx.lineWidth=2.5; ctx.shadowBlur=18; ctx.shadowColor='#e07bff';
      ctx.beginPath(); ctx.arc(this.x,this.y,this.r*1.4+Math.sin(G.time*6+this.phase)*3,0,TAU); ctx.stroke(); ctx.shadowBlur=0;
      ctx.fillStyle='#e07bff'; ctx.font='700 11px '+(getComputedStyle(document.documentElement).getPropertyValue('--head')||'sans-serif');
      ctx.textAlign='center'; ctx.fillText('☠ '+trChamp(this.hunterName||'CACCIATORE'), this.x, this.y-this.r-22); ctx.textAlign='left';
    }
    // hp bar
    if(this.hp<this.maxHp && !this.boss){
      const big=this.champion, w=big?Math.max(64,this.r*2.2):Math.max(28,this.r*2), hpr=U.clamp(this.hp/this.maxHp,0,1), by=this.y-this.r-(big?16:13), hh=big?7:5;
      ctx.fillStyle='rgba(0,0,0,0.6)'; rrect(ctx,this.x-w/2,by,w,hh,2);
      ctx.fillStyle=big?'#ff7a2d':(this.elite?'#ffd24d':(hpr>0.4?'#a6ff5b':'#ffb24d')); rrect(ctx,this.x-w/2,by,w*hpr,hh,2);
    }
  }

  drawLooter(ctx,skin,flash){   // scurrying loot-carrier — small body + bulging glittering sack on its back
    const r=this.r, lf=window.G&&G.lowFx;
    const sw=Math.sin(G.time*18+this.phase)*r*0.34;   // fast little legs
    ctx.strokeStyle='#5e4a22'; ctx.lineWidth=r*0.16; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-r*0.18,r*0.45); ctx.lineTo(-r*0.28+sw,r*0.85); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r*0.18,r*0.45); ctx.lineTo(r*0.28-sw,r*0.85); ctx.stroke();
    // body
    ctx.fillStyle=flash?'#ffffff':'#8a6a2e'; ctx.beginPath(); ctx.ellipse(0,r*0.08,r*0.5,r*0.58,0,0,TAU); ctx.fill();
    ctx.fillStyle=this.eye; ctx.beginPath(); ctx.arc(r*0.26,-r*0.02,r*0.1,0,TAU); ctx.fill();
    // big loot sack on the back (-x, since it runs toward +x)
    const bob=Math.sin(G.time*11+this.phase)*r*0.08;
    ctx.save(); ctx.translate(-r*0.5,-r*0.32+bob);
      if(!lf){ ctx.shadowBlur=15; ctx.shadowColor='#ffd24d'; }
      ctx.fillStyle=flash?'#ffffff':'#caa23a'; ctx.beginPath(); ctx.ellipse(0,0,r*0.62,r*0.58,0.3,0,TAU); ctx.fill(); ctx.shadowBlur=0;
      ctx.fillStyle='#7a5e22'; rrect(ctx,-r*0.12,-r*0.74,r*0.24,r*0.2,2);   // sack tie
      ctx.fillStyle='#fff3b0'; for(let i=0;i<3;i++){ const a=G.time*2.4+i*2.1; ctx.beginPath(); ctx.arc(Math.cos(a)*r*0.26,-r*0.26+Math.sin(a)*r*0.16,r*0.11,0,TAU); ctx.fill(); }   // coins glinting
    ctx.restore();
  }
  drawZombie(ctx,skin,flash){
    const r=this.r, fast=this.type==='runner', lf=window.G&&G.lowFx;
    const sw=Math.sin(G.time*(fast?17:8)+this.phase)*r*0.5, aw=Math.sin(G.time*(fast?17:6)+this.phase)*r*0.22, dk=shade(skin,0.55);
    ctx.strokeStyle=dk; ctx.lineWidth=r*0.32;
    ctx.beginPath(); ctx.moveTo(-r*0.1,-r*0.3); ctx.lineTo((fast?r*0.15:-r*0.5)+sw,-r*0.55); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r*0.1, r*0.3); ctx.lineTo((fast?r*0.15:-r*0.5)-sw, r*0.55); ctx.stroke();
    if(!lf){ ctx.shadowBlur=12; ctx.shadowColor=skin;   // when swarmed (lowFx) skip the gradient + blur — the two costliest canvas ops, ×70 enemies
      const g=ctx.createLinearGradient(-r,0,r,0); g.addColorStop(0,dk); g.addColorStop(1,skin); ctx.fillStyle=g; }
    else ctx.fillStyle=skin;
    ctx.beginPath(); ctx.ellipse(0,0,r*0.82,r*0.66,0,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.arc(-r*0.12,r*0.18,r*0.26,0,TAU); ctx.fill();
    ctx.strokeStyle=skin; ctx.lineWidth=r*0.26;
    if(fast){ ctx.beginPath(); ctx.moveTo(r*0.05,-r*0.45); ctx.lineTo(-r*0.5-aw,-r*0.35); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r*0.05, r*0.45); ctx.lineTo(-r*0.5+aw, r*0.35); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(r*0.15,-r*0.4); ctx.lineTo(r*1.0,-r*0.16+aw); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r*0.15, r*0.4); ctx.lineTo(r*1.0, r*0.16-aw); ctx.stroke();
      ctx.fillStyle=dk; ctx.beginPath(); ctx.arc(r*1.0,-r*0.16+aw,r*0.12,0,TAU); ctx.fill(); ctx.beginPath(); ctx.arc(r*1.0, r*0.16-aw,r*0.12,0,TAU); ctx.fill(); }
    if(!lf){ ctx.shadowBlur=10; ctx.shadowColor=skin; } ctx.fillStyle=shade(skin,0.88);
    ctx.beginPath(); ctx.arc(r*0.48,0,r*0.4,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    this.eyes(ctx,r*0.58,r*0.13,r*0.09);
  }
  drawBrute(ctx,skin,flash){
    const r=this.r, dk=shade(skin,0.5), sw=Math.sin(G.time*5+this.phase)*r*0.28;
    ctx.strokeStyle=dk; ctx.lineWidth=r*0.46;
    ctx.beginPath(); ctx.moveTo(-r*0.1,-r*0.35); ctx.lineTo(-r*0.45+sw,-r*0.62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r*0.1, r*0.35); ctx.lineTo(-r*0.45-sw, r*0.62); ctx.stroke();
    ctx.shadowBlur=18; ctx.shadowColor=skin;
    const g=ctx.createRadialGradient(-r*0.2,-r*0.2,r*0.2,0,0,r); g.addColorStop(0,skin); g.addColorStop(1,dk);
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,r*0.95,r*0.85,0,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle=shade(skin,1.25); for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.arc(-r*0.25,i*r*0.38,r*0.14,0,TAU); ctx.fill(); }
    ctx.strokeStyle=skin; ctx.lineWidth=r*0.4;
    ctx.beginPath(); ctx.moveTo(r*0.1,-r*0.65); ctx.lineTo(r*0.92,-r*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r*0.1, r*0.65); ctx.lineTo(r*0.92, r*0.5); ctx.stroke();
    ctx.fillStyle=dk; ctx.beginPath(); ctx.arc(r*1.0,-r*0.5,r*0.26,0,TAU); ctx.fill(); ctx.beginPath(); ctx.arc(r*1.0, r*0.5,r*0.26,0,TAU); ctx.fill();
    ctx.fillStyle=shade(skin,0.82); ctx.beginPath(); ctx.arc(r*0.42,0,r*0.32,0,TAU); ctx.fill();
    this.eyes(ctx,r*0.52,r*0.11,r*0.08);
  }
  drawSpitter(ctx,skin,flash){
    const r=this.r, dk=shade(skin,0.55), pulse=1+Math.sin(G.time*4+this.phase)*0.07, sw=Math.sin(G.time*7+this.phase)*r*0.25;
    ctx.strokeStyle=dk; ctx.lineWidth=r*0.18;
    for(let i=0;i<3;i++){ const yy=(i-1)*r*0.45; ctx.beginPath(); ctx.moveTo(-r*0.1,yy*0.4); ctx.lineTo(-r*0.62,yy+sw*(i-1)); ctx.stroke(); }
    ctx.shadowBlur=16; ctx.shadowColor=skin;
    const g=ctx.createRadialGradient(-r*0.1,0,r*0.2,-r*0.1,0,r); g.addColorStop(0,skin); g.addColorStop(1,dk);
    ctx.fillStyle=g; ctx.save(); ctx.scale(pulse,pulse); ctx.beginPath(); ctx.arc(-r*0.1,0,r*0.74,0,TAU); ctx.fill(); ctx.restore(); ctx.shadowBlur=0;
    ctx.fillStyle=shade(skin,1.3); ctx.beginPath(); ctx.arc(-r*0.3,-r*0.3,r*0.15,0,TAU); ctx.arc(-r*0.38,r*0.22,r*0.12,0,TAU); ctx.fill();
    ctx.fillStyle='#1a0a26'; ctx.beginPath(); ctx.arc(r*0.5,0,r*0.32,0,TAU); ctx.fill();
    // cyan spit-port that CHARGES (brightens & grows) as the next shot nears → ranged 'about to fire' tell
    const ch=U.clamp(1-(this.fireCd||0)*(this.cfg.fireRate||1),0,1);
    ctx.fillStyle=this.eye; ctx.shadowBlur=8+16*ch; ctx.shadowColor=this.eye; ctx.beginPath(); ctx.arc(r*0.5,0,r*0.15*(1+ch*0.55),0,TAU); ctx.fill(); ctx.shadowBlur=0;
  }
  drawBomber(ctx,skin,flash){
    const r=this.r, dk=shade(skin,0.55), fuse=this.fuseT!==undefined, pulse=fuse?(0.5+0.5*Math.sin(G.time*30)):0, sw=Math.sin(G.time*14+this.phase)*r*0.4;
    ctx.strokeStyle=dk; ctx.lineWidth=r*0.3;
    ctx.beginPath(); ctx.moveTo(-r*0.1,-r*0.3); ctx.lineTo(r*0.1+sw,-r*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r*0.1, r*0.3); ctx.lineTo(r*0.1-sw, r*0.5); ctx.stroke();
    ctx.shadowBlur=fuse?22:12; ctx.shadowColor=fuse?'#ff5b2d':skin;
    const g=ctx.createRadialGradient(-r*0.2,-r*0.2,r*0.2,0,0,r); g.addColorStop(0,fuse?shade('#ff5b2d',1+pulse*0.4):skin); g.addColorStop(1,dk);
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,r*0.86,r*0.78,0,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle=dk; rrect(ctx,-r*0.5,-r*0.6,r*0.3,r*1.2,3); rrect(ctx,r*0.2,-r*0.6,r*0.3,r*1.2,3);
    ctx.strokeStyle=skin; ctx.lineWidth=r*0.24;
    ctx.beginPath(); ctx.moveTo(r*0.2,-r*0.4); ctx.lineTo(r*0.9,-r*0.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r*0.2, r*0.4); ctx.lineTo(r*0.9, r*0.2); ctx.stroke();
    ctx.fillStyle=shade(skin,0.85); ctx.beginPath(); ctx.arc(r*0.45,0,r*0.34,0,TAU); ctx.fill();
    this.eye=fuse?'#ff3b2d':this.cfg.eye; this.eyes(ctx,r*0.55,r*0.12,r*0.09+pulse*r*0.04);
    if(fuse){ ctx.strokeStyle='rgba(255,91,45,'+(0.3+pulse*0.4)+')'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,this.cfg.blastR,0,TAU); ctx.stroke(); }
  }
  drawShielder(ctx,skin,flash){
    const r=this.r, dk=shade(skin,0.5), lt=shade(skin,1.2), sw=Math.sin(G.time*5+this.phase)*r*0.2;
    ctx.strokeStyle=dk; ctx.lineWidth=r*0.4;
    ctx.beginPath(); ctx.moveTo(-r*0.1,-r*0.35); ctx.lineTo(-r*0.4+sw,-r*0.62); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-r*0.1, r*0.35); ctx.lineTo(-r*0.4-sw, r*0.62); ctx.stroke();
    ctx.shadowBlur=14; ctx.shadowColor=skin;
    const g=ctx.createRadialGradient(-r*0.2,-r*0.2,r*0.2,0,0,r); g.addColorStop(0,skin); g.addColorStop(1,dk);
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,r*0.8,r*0.74,0,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle=shade(skin,0.85); ctx.beginPath(); ctx.arc(r*0.3,0,r*0.3,0,TAU); ctx.fill(); this.eyes(ctx,r*0.4,r*0.1,r*0.07);
    ctx.fillStyle=lt; ctx.shadowBlur=10; ctx.shadowColor='#cfe0ff'; ctx.save(); ctx.translate(r*0.95,0);
    rrect(ctx,-r*0.18,-r*0.85,r*0.36,r*1.7,5); ctx.shadowBlur=0;
    ctx.fillStyle=dk; for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.arc(0,i*r*0.5,r*0.1,0,TAU); ctx.fill(); } ctx.restore();
  }
  drawSwarmer(ctx,skin,flash){
    const r=this.r, dk=shade(skin,0.5), lt=shade(skin,1.3), pulse=1+Math.sin(G.time*3+this.phase)*0.06;
    ctx.shadowBlur=16; ctx.shadowColor=skin;
    const g=ctx.createRadialGradient(0,0,r*0.2,0,0,r); g.addColorStop(0,lt); g.addColorStop(1,dk);
    ctx.fillStyle=g; ctx.save(); ctx.scale(pulse,pulse); ctx.beginPath(); ctx.arc(0,0,r*0.8,0,TAU); ctx.fill(); ctx.restore(); ctx.shadowBlur=0;
    ctx.fillStyle=lt; for(const[px,py] of [[-0.3,-0.3],[0.25,0.2],[-0.1,0.35],[0.3,-0.25]]){ ctx.beginPath(); ctx.arc(r*px,r*py,r*0.13,0,TAU); ctx.fill(); }
    ctx.strokeStyle=dk; ctx.lineWidth=r*0.12;
    for(let i=0;i<4;i++){ const a=Math.PI*0.5+i*0.4-0.6, wig=Math.sin(G.time*8+i)*0.2;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a+wig)*r*1.1,Math.sin(a+wig)*r*1.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(-a-wig)*r*1.1,Math.sin(-a-wig)*r*1.1); ctx.stroke(); }
    ctx.fillStyle='#10240f'; ctx.beginPath(); ctx.arc(r*0.45,0,r*0.24,0,TAU); ctx.fill(); this.eyes(ctx,r*0.5,r*0.18,r*0.08);
  }
  drawMite(ctx,skin,flash){
    const r=this.r, dk=shade(skin,0.55), sw=Math.sin(G.time*22+this.phase)*r*0.5;
    ctx.strokeStyle=dk; ctx.lineWidth=r*0.3;
    for(let i=-1;i<=1;i+=2){ ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-r*0.6, i*r*0.6+sw*i); ctx.stroke(); }
    ctx.shadowBlur=8; ctx.shadowColor=skin; ctx.fillStyle=skin; ctx.beginPath(); ctx.arc(0,0,r*0.7,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    this.eyes(ctx,r*0.3,r*0.18,r*0.16);
  }
  drawLeaper(ctx,skin,flash){
    const r=this.r, dk=shade(skin,0.5), wind=this.lstate==='windup', leap=this.lstate==='leap', crouch=wind?0.7:1;
    ctx.strokeStyle=dk; ctx.lineWidth=r*0.34; const lf=leap?r*0.2:-r*0.4;
    ctx.beginPath(); ctx.moveTo(-r*0.1,-r*0.3); ctx.lineTo(lf,-r*0.7*crouch); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-r*0.1, r*0.3); ctx.lineTo(lf, r*0.7*crouch); ctx.stroke();
    ctx.shadowBlur=wind?20:12; ctx.shadowColor=wind?this.eye:skin;
    const g=ctx.createLinearGradient(-r,0,r,0); g.addColorStop(0,dk); g.addColorStop(1,skin);
    ctx.fillStyle=g; ctx.save(); ctx.scale(1,crouch); ctx.beginPath(); ctx.ellipse(0,0,r*0.78,r*0.62,0,0,TAU); ctx.fill(); ctx.restore(); ctx.shadowBlur=0;
    ctx.strokeStyle=skin; ctx.lineWidth=r*0.22; const af=leap?r*1.1:r*0.7;
    ctx.beginPath(); ctx.moveTo(r*0.1,-r*0.4); ctx.lineTo(af,-r*0.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r*0.1, r*0.4); ctx.lineTo(af, r*0.2); ctx.stroke();
    ctx.fillStyle=shade(skin,0.85); ctx.beginPath(); ctx.arc(r*0.4,0,r*0.32,0,TAU); ctx.fill(); this.eyes(ctx,r*0.5,r*0.13,r*0.09);
  }
  drawHealer(ctx,skin,flash){
    const r=this.r, dk=shade(skin,0.5), lt=shade(skin,1.3);
    if(this.healPulse>0){ const a=this.healPulse/0.4; ctx.strokeStyle='rgba(122,255,224,'+(a*0.4)+')'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,this.cfg.healRadius*(1-a),0,TAU); ctx.stroke(); }
    const bob=Math.sin(G.time*2+this.phase)*r*0.15;
    ctx.shadowBlur=16; ctx.shadowColor=this.eye;
    const g=ctx.createLinearGradient(0,-r,0,r); g.addColorStop(0,lt); g.addColorStop(1,dk);
    ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(-r*0.6,r*0.8+bob); ctx.lineTo(0,-r*0.7+bob); ctx.lineTo(r*0.6,r*0.8+bob); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle=dk; ctx.beginPath(); ctx.arc(0,-r*0.35+bob,r*0.4,0,TAU); ctx.fill();
    ctx.fillStyle=shade(skin,0.9); ctx.beginPath(); ctx.arc(r*0.1,-r*0.35+bob,r*0.26,0,TAU); ctx.fill();
    ctx.strokeStyle=dk; ctx.lineWidth=r*0.12; ctx.beginPath(); ctx.moveTo(r*0.5,r*0.6+bob); ctx.lineTo(r*0.6,-r*0.6+bob); ctx.stroke();
    ctx.fillStyle=this.eye; ctx.shadowBlur=14; ctx.shadowColor=this.eye; ctx.beginPath(); ctx.arc(r*0.6,-r*0.7+bob,r*0.16,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    this.eyes(ctx,r*0.2,r*0.1,r*0.07);
  }
  drawSniper(ctx,skin,flash){
    const r=this.r, dk=shade(skin,0.55), aiming=this.sniperState==='aim';
    ctx.strokeStyle=dk; ctx.lineWidth=r*0.28;
    ctx.beginPath(); ctx.moveTo(-r*0.1,-r*0.3); ctx.lineTo(-r*0.5,-r*0.55); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r*0.1, r*0.3); ctx.lineTo(-r*0.5, r*0.55); ctx.stroke();
    // long rifle
    ctx.fillStyle='#15171b'; rrect(ctx,r*0.2,-r*0.1,r*2.0,r*0.2,2);
    if(aiming){ ctx.fillStyle='#ff5b5b'; ctx.shadowBlur=10; ctx.shadowColor='#ff5b5b'; ctx.beginPath(); ctx.arc(r*2.25,0,r*0.16,0,TAU); ctx.fill(); ctx.shadowBlur=0; }
    // torso
    ctx.shadowBlur=12; ctx.shadowColor=skin;
    const g=ctx.createLinearGradient(-r,0,r,0); g.addColorStop(0,dk); g.addColorStop(1,skin);
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,r*0.78,r*0.6,0,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    // arms
    ctx.strokeStyle=skin; ctx.lineWidth=r*0.22;
    ctx.beginPath(); ctx.moveTo(r*0.1,-r*0.3); ctx.lineTo(r*0.9,-r*0.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r*0.1, r*0.3); ctx.lineTo(r*0.6, r*0.05); ctx.stroke();
    // head
    ctx.fillStyle=shade(skin,0.85); ctx.beginPath(); ctx.arc(r*0.4,0,r*0.32,0,TAU); ctx.fill();
    this.eyes(ctx,r*0.5,r*0.12,r*0.09);
  }
  drawGunner(ctx,skin,flash){
    this.drawSniper(ctx,skin,flash);
    const r=this.r;
    // diagonal ammo belt across the chest → reads 'soldier', not 'sniper'
    ctx.strokeStyle='#241c12'; ctx.lineWidth=r*0.2; ctx.beginPath(); ctx.moveTo(-r*0.55,-r*0.5); ctx.lineTo(r*0.45,r*0.5); ctx.stroke();
    ctx.fillStyle='#ffcf6e'; for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.arc(-r*0.05+i*r*0.2,-r*0.05+i*r*0.2,r*0.055,0,TAU); ctx.fill(); }
    // wide TWIN barrels (vs the sniper's single thin one)
    ctx.fillStyle='#15171b'; rrect(ctx,r*0.35,-r*0.27,r*1.45,r*0.17,2); rrect(ctx,r*0.35,r*0.1,r*1.45,r*0.17,2);
    if(this.gunState==='aim'){ const p=U.clamp(1-this.aimT/0.4,0,1);   // honest aim-line telegraph (face is locked)
      ctx.strokeStyle='rgba(79,214,255,'+(0.25+0.5*p)+')'; ctx.lineWidth=1+2*p; ctx.shadowBlur=8; ctx.shadowColor=this.eye;
      ctx.beginPath(); ctx.moveTo(r*1.6,0); ctx.lineTo(r*1.6+360,0); ctx.stroke(); ctx.shadowBlur=0; }
  }
  drawBrawler(ctx,skin,flash){
    this.drawBrute(ctx,skin,flash);
    const r=this.r, slam=this.bstate==='slam';
    // big two-handed CLUB held forward (permanent silhouette, not a small fist) → reads totally different from the bare-fisted brute
    ctx.save(); ctx.rotate(slam? -0.5 : -0.15);
      ctx.strokeStyle=shade(skin,0.5); ctx.lineWidth=r*0.22; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(r*0.5,0); ctx.lineTo(r*1.35,0); ctx.stroke();   // haft
      ctx.fillStyle=shade(skin,0.78); rrect(ctx,r*1.2,-r*0.42,r*0.7,r*0.84,r*0.18);   // big head
      ctx.fillStyle=shade(skin,0.5); for(const sx of [r*1.3,r*1.55,r*1.8]) for(const sy of [-r*0.28,r*0.28]){ ctx.beginPath(); ctx.arc(sx,sy,r*0.07,0,TAU); ctx.fill(); }   // studs
    ctx.restore();
    if(slam){ ctx.strokeStyle=this.eye; ctx.lineWidth=r*0.12; ctx.shadowBlur=12; ctx.shadowColor=this.eye; ctx.globalAlpha=0.5+0.4*Math.sin(G.time*28);
      ctx.beginPath(); ctx.arc(0,0,r*1.0,0,TAU); ctx.stroke(); ctx.globalAlpha=1; ctx.shadowBlur=0; }
  }
  drawBoss(ctx,skin,flash){
    const r=this.r, kind=this.bossKind, eye=this.eye;
    let dk=shade(skin,0.5), lt=shade(skin,1.2);
    if(this.bstate==='telegraph'){ ctx.fillStyle='rgba(255,60,60,'+(0.18+0.18*Math.sin(G.time*30))+')';
      ctx.beginPath(); ctx.moveTo(0,-r*0.5); ctx.lineTo(r*9,-r*0.2); ctx.lineTo(r*9,r*0.2); ctx.lineTo(0,r*0.5); ctx.closePath(); ctx.fill(); }
    if(this.bstate==='charge'){ skin='#ffffff'; dk='#cfd6dd'; lt='#ffffff'; }
    const grad=()=>{ const g=ctx.createRadialGradient(-r*0.25,-r*0.25,r*0.2,0,0,r*1.05); g.addColorStop(0,lt); g.addColorStop(1,dk); return g; };
    const eyesAt=(cx,cy,sep,er)=>{ ctx.fillStyle=eye; if(!(window.G&&G.lowFx)){ ctx.shadowBlur=er*9; ctx.shadowColor=eye; } ctx.beginPath(); ctx.arc(cx,cy-sep,er,0,TAU); ctx.arc(cx,cy+sep,er,0,TAU); ctx.fill(); ctx.shadowBlur=0; };
    const sway=Math.sin(G.time*2+this.phase)*r*0.06;
    ctx.lineCap='round'; ctx.lineJoin='round'; ctx.shadowBlur=0;

    if(kind==='bloated'){                              // gas blob — no limbs, wobbling sack
      ctx.shadowBlur=24; ctx.shadowColor=eye; ctx.fillStyle=grad(); ctx.beginPath();
      for(let k=0;k<=16;k++){ const a=k/16*TAU, wob=1+Math.sin(a*3+G.time*2)*0.08, x=Math.cos(a)*r*1.06*wob, y=Math.sin(a)*r*0.96*wob; k?ctx.lineTo(x,y):ctx.moveTo(x,y); }
      ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
      ctx.fillStyle=lt; for(const c of [[-0.3,-0.4,0.16],[0.25,0.32,0.2],[-0.42,0.18,0.13],[0.36,-0.26,0.15]]) { ctx.beginPath(); ctx.arc(r*c[0],r*c[1],r*c[2],0,TAU); ctx.fill(); }
      eyesAt(r*0.2,0,r*0.24,r*0.12);
    }
    else if(kind==='colossus'){                        // blocky industrial mech
      ctx.fillStyle=dk; rrect(ctx,-r*0.92,-r*0.96,r*1.84,r*1.92,r*0.18);
      ctx.fillStyle=grad(); rrect(ctx,-r*0.72,-r*0.8,r*1.5,r*1.6,r*0.12);
      ctx.strokeStyle=dk; ctx.lineWidth=r*0.08; for(let k=-1;k<=1;k++){ ctx.beginPath(); ctx.moveTo(-r*0.72,k*r*0.5); ctx.lineTo(r*0.78,k*r*0.5); ctx.stroke(); }
      ctx.fillStyle=shade(skin,0.7); for(const c of [[-0.5,-0.6],[0.5,-0.6],[-0.5,0.6],[0.5,0.6]]) { ctx.beginPath(); ctx.arc(r*c[0],r*c[1],r*0.1,0,TAU); ctx.fill(); }
      ctx.fillStyle=shade(skin,0.85); rrect(ctx,r*0.55,-r*0.32,r*0.5,r*0.64,r*0.1);
      eyesAt(r*0.8,0,r*0.14,r*0.1);
    }
    else if(kind==='necromancer'){                     // hooded robe wraith — pointed hood at front, flared robe, no legs
      ctx.shadowBlur=16; ctx.shadowColor=eye; ctx.fillStyle=grad(); ctx.beginPath();
      ctx.moveTo(r*0.95,0);                                  // hood tip (front)
      ctx.quadraticCurveTo(r*0.2,-r*1.0,-r*0.7,-r*0.78);     // up & back over the shoulder
      for(let k=0;k<=5;k++){ const t=k/5, y=-r*0.78+t*r*1.56; ctx.lineTo(-r*0.7+Math.sin(G.time*3+k)*r*0.14, y); }  // wispy hem
      ctx.quadraticCurveTo(r*0.2,r*1.0,r*0.95,0); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
      // robe seam + dark hood opening with glowing eyes
      ctx.strokeStyle=dk; ctx.lineWidth=r*0.07; ctx.beginPath(); ctx.moveTo(r*0.5,-r*0.2); ctx.lineTo(-r*0.3,r*0.7); ctx.stroke();
      ctx.fillStyle='#0c0c12'; ctx.beginPath(); ctx.ellipse(r*0.42,0,r*0.3,r*0.36,0,0,TAU); ctx.fill();
      eyesAt(r*0.48,0,r*0.13,r*0.085);
      // staff with glowing orb
      ctx.strokeStyle=dk; ctx.lineWidth=r*0.1; ctx.beginPath(); ctx.moveTo(r*0.55,r*0.4); ctx.lineTo(r*1.05,r*1.05); ctx.stroke();
      ctx.fillStyle=eye; ctx.shadowBlur=14; ctx.shadowColor=eye; ctx.beginPath(); ctx.arc(r*1.05,r*1.05,r*0.17,0,TAU); ctx.fill();
      // floating soul orbs
      for(let k=0;k<3;k++){ const a=G.time*1.5+k/3*TAU; ctx.beginPath(); ctx.arc(Math.cos(a)*r*0.7-r*0.15,Math.sin(a)*r*0.55,r*0.07,0,TAU); ctx.fill(); } ctx.shadowBlur=0;
    }
    else if(kind==='twins'){                           // two separate bodies + energy tether
      const off=r*0.62;
      ctx.strokeStyle=eye; ctx.lineWidth=r*0.1; ctx.shadowBlur=10; ctx.shadowColor=eye; ctx.globalAlpha=0.6;
      ctx.beginPath(); ctx.moveTo(0,-off); ctx.lineTo(0,off); ctx.stroke(); ctx.globalAlpha=1; ctx.shadowBlur=0;
      for(const sgn of [-1,1]){ ctx.save(); ctx.translate(0,sgn*off);
        ctx.fillStyle=grad(); ctx.beginPath(); ctx.arc(0,0,r*0.5,0,TAU); ctx.fill();
        ctx.fillStyle='#cfd6dd'; ctx.save(); ctx.translate(r*0.38,0); ctx.rotate(sgn*0.3); rrect(ctx,0,-r*0.04,r*0.72,r*0.08,3); ctx.restore();
        ctx.fillStyle=eye; ctx.shadowBlur=8; ctx.shadowColor=eye; ctx.beginPath(); ctx.arc(r*0.16,0,r*0.1,0,TAU); ctx.fill(); ctx.shadowBlur=0; ctx.restore(); }
    }
    else if(kind==='artillery'){                       // siege engine — wide tracked base + huge cannon
      ctx.fillStyle=dk; rrect(ctx,-r*0.95,r*0.2,r*1.9,r*0.66,r*0.14);
      ctx.fillStyle=shade(skin,0.6); for(let k=-3;k<=3;k++){ ctx.beginPath(); ctx.arc(k*r*0.27,r*0.78,r*0.13,0,TAU); ctx.fill(); }
      ctx.fillStyle=grad(); ctx.beginPath(); ctx.ellipse(0,-r*0.05,r*0.7,r*0.55,0,0,TAU); ctx.fill();
      ctx.fillStyle='#2b2f36'; ctx.save(); ctx.translate(r*0.1,-r*0.12); ctx.rotate(-0.45); rrect(ctx,0,-r*0.2,r*1.7,r*0.4,4); ctx.restore();
      ctx.fillStyle=eye; ctx.shadowBlur=12; ctx.shadowColor=eye; ctx.beginPath(); ctx.arc(r*1.32,-r*0.72,r*0.13,0,TAU); ctx.fill(); ctx.shadowBlur=0;
      eyesAt(r*0.4,0,r*0.16,r*0.08);
    }
    else if(kind==='splitter'){                        // sharp faceted crystal
      ctx.shadowBlur=16; ctx.shadowColor=eye; ctx.fillStyle=grad(); ctx.beginPath();
      ctx.moveTo(r*1.05,0); ctx.lineTo(0,-r*1.0); ctx.lineTo(-r*1.05,0); ctx.lineTo(0,r*1.0); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
      ctx.strokeStyle=lt; ctx.lineWidth=r*0.05; ctx.beginPath(); ctx.moveTo(0,-r*1.0); ctx.lineTo(0,r*1.0); ctx.moveTo(-r*1.05,0); ctx.lineTo(r*1.05,0); ctx.moveTo(r*0.5,-r*0.5); ctx.lineTo(-r*0.5,r*0.5); ctx.moveTo(-r*0.5,-r*0.5); ctx.lineTo(r*0.5,r*0.5); ctx.stroke();
      ctx.strokeStyle=eye; ctx.lineWidth=r*0.06; ctx.shadowBlur=10; ctx.shadowColor=eye; ctx.setLineDash([5,4]); ctx.beginPath(); ctx.moveTo(0,-r*0.9); ctx.lineTo(0,r*0.9); ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur=0;
      eyesAt(r*0.26,0,r*0.18,r*0.1);
    }
    else if(kind==='hivequeen'){                       // insectoid — segmented abdomen + radiating legs
      ctx.strokeStyle=dk; ctx.lineWidth=r*0.08;
      for(let k=0;k<3;k++){ const a=0.55+k*0.42; for(const sgn of [-1,1]){ const mx=-r*0.55, my=sgn*Math.sin(a)*r*0.55; ctx.beginPath(); ctx.moveTo(-r*0.2,sgn*r*0.1); ctx.lineTo(mx,my); ctx.lineTo(mx-r*0.35,sgn*Math.sin(a)*r*1.2); ctx.stroke(); } }
      ctx.fillStyle=grad(); ctx.beginPath(); ctx.ellipse(-r*0.28,0,r*0.85,r*0.7,0,0,TAU); ctx.fill();
      ctx.strokeStyle=dk; ctx.lineWidth=r*0.05; for(let k=1;k<=3;k++){ ctx.beginPath(); ctx.ellipse(-r*0.28,0,r*0.85*(1-k*0.22),r*0.7*(1-k*0.22),0,0,TAU); ctx.stroke(); }
      ctx.fillStyle=shade(skin,0.9); ctx.beginPath(); ctx.arc(r*0.55,0,r*0.32,0,TAU); ctx.fill();
      ctx.fillStyle=eye; for(let k=-2;k<=2;k++){ ctx.beginPath(); ctx.moveTo(r*0.55+k*r*0.1,-r*0.3); ctx.lineTo(r*0.55+k*r*0.1,-r*0.58); ctx.lineTo(r*0.55+k*r*0.1+r*0.07,-r*0.3); ctx.closePath(); ctx.fill(); }
      eyesAt(r*0.6,0,r*0.13,r*0.07);
    }
    else if(kind==='reaver'){                          // hexagonal core + orbiting orbs + barrels
      ctx.fillStyle=grad(); ctx.beginPath(); for(let k=0;k<6;k++){ const a=k/6*TAU+G.time*0.3, x=Math.cos(a)*r*0.72, y=Math.sin(a)*r*0.72; k?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.closePath(); ctx.fill();
      ctx.fillStyle='#2b2f36'; rrect(ctx,r*0.5,-r*0.4,r*0.95,r*0.16,3); rrect(ctx,r*0.5,r*0.24,r*0.95,r*0.16,3);
      ctx.fillStyle=eye; ctx.shadowBlur=12; ctx.shadowColor=eye; for(let k=0;k<5;k++){ const a=G.time*1.6+k/5*TAU; ctx.beginPath(); ctx.arc(Math.cos(a)*r*1.2,Math.sin(a)*r*1.2,r*0.13,0,TAU); ctx.fill(); }
      ctx.beginPath(); ctx.arc(0,0,r*0.22,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    }
    else if(kind==='overseer'){                        // floating eye + rotating spiral arms
      ctx.save(); ctx.rotate(this._spiral||G.time);
      ctx.strokeStyle=eye; ctx.lineWidth=r*0.14; ctx.shadowBlur=12; ctx.shadowColor=eye;
      for(let a=0;a<3;a++){ const an=a/3*TAU; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(an)*r*1.35,Math.sin(an)*r*1.35); ctx.stroke(); }
      ctx.restore(); ctx.shadowBlur=0;
      ctx.fillStyle=grad(); ctx.beginPath(); ctx.arc(0,0,r*0.7,0,TAU); ctx.fill();
      ctx.fillStyle='#f0f4ff'; ctx.beginPath(); ctx.arc(0,0,r*0.42,0,TAU); ctx.fill();
      ctx.fillStyle=eye; ctx.shadowBlur=16; ctx.shadowColor=eye; ctx.beginPath(); ctx.arc(0,0,r*0.22,0,TAU); ctx.fill();
      ctx.fillStyle='#101015'; ctx.beginPath(); ctx.arc(0,0,r*0.1,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    }
    else if(kind==='quaker'){                          // rocky golem — asymmetric stone chunks + glowing cracks
      const pulse=this.bstate==='wind'?(0.6+0.4*Math.sin(G.time*30)):0.4;
      ctx.fillStyle=dk; for(const c of [[-0.3,-0.4,0.55],[0.4,-0.2,0.5],[-0.2,0.45,0.5],[0.45,0.4,0.42],[0.0,0.0,0.72]]) { ctx.beginPath(); ctx.arc(r*c[0],r*c[1],r*c[2],0,TAU); ctx.fill(); }
      ctx.fillStyle=grad(); ctx.beginPath(); ctx.arc(0,0,r*0.78,0,TAU); ctx.fill();
      ctx.strokeStyle=eye; ctx.lineWidth=r*0.08; ctx.shadowBlur=14*pulse+5; ctx.shadowColor=eye; ctx.globalAlpha=Math.min(1,pulse+0.4);
      for(const seg of [[[-0.5,-0.3],[0.05,0],[0.5,0.35]],[[-0.2,0.5],[0.05,0],[0.4,-0.5]]]){ ctx.beginPath(); ctx.moveTo(r*seg[0][0],r*seg[0][1]); ctx.lineTo(r*seg[1][0],r*seg[1][1]); ctx.lineTo(r*seg[2][0],r*seg[2][1]); ctx.stroke(); }
      ctx.globalAlpha=1; ctx.shadowBlur=0;
      ctx.fillStyle=shade(skin,0.8); ctx.beginPath(); ctx.arc(r*0.95,-r*0.5,r*0.34,0,TAU); ctx.arc(r*0.95,r*0.5,r*0.34,0,TAU); ctx.fill();
      eyesAt(r*0.2,0,r*0.22,r*0.1);
    }
    else if(kind==='warlord'){                         // armored commander — boxy, pauldrons, horns
      ctx.strokeStyle=dk; ctx.lineWidth=r*0.32; ctx.beginPath(); ctx.moveTo(-r*0.1,r*0.3); ctx.lineTo(-r*0.4,r*0.88); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r*0.15,r*0.3); ctx.lineTo(r*0.4,r*0.88); ctx.stroke();
      ctx.fillStyle=grad(); rrect(ctx,-r*0.55,-r*0.6,r*1.1,r*1.2,r*0.1);
      ctx.fillStyle=shade(skin,0.7); ctx.beginPath(); ctx.arc(-r*0.55,-r*0.42,r*0.4,0,TAU); ctx.arc(r*0.55,-r*0.42,r*0.4,0,TAU); ctx.fill();
      ctx.fillStyle=shade(skin,0.9); rrect(ctx,r*0.28,-r*0.42,r*0.55,r*0.84,r*0.1);
      ctx.fillStyle=eye; ctx.beginPath(); ctx.moveTo(r*0.3,-r*0.42); ctx.lineTo(r*0.02,-r*0.85); ctx.lineTo(r*0.46,-r*0.46); ctx.closePath(); ctx.moveTo(r*0.84,-r*0.42); ctx.lineTo(r*1.12,-r*0.85); ctx.lineTo(r*0.68,-r*0.46); ctx.closePath(); ctx.fill();
      eyesAt(r*0.55,0,r*0.12,r*0.08);
    }
    else if(kind==='duelist'){                         // slim agile fencer + long blade
      ctx.strokeStyle=dk; ctx.lineWidth=r*0.2; ctx.beginPath(); ctx.moveTo(0,r*0.2); ctx.lineTo(-r*0.4,r*0.9); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r*0.12,r*0.2); ctx.lineTo(r*0.5,r*0.86); ctx.stroke();
      ctx.fillStyle=grad(); ctx.beginPath(); ctx.ellipse(r*0.08,-r*0.05,r*0.5,r*0.64,0.25,0,TAU); ctx.fill();
      ctx.strokeStyle=skin; ctx.lineWidth=r*0.16; ctx.beginPath(); ctx.moveTo(r*0.2,-r*0.2); ctx.lineTo(r*0.8,-r*0.3); ctx.stroke();
      ctx.fillStyle='#eaf2ff'; ctx.shadowBlur=12; ctx.shadowColor='#fff'; ctx.save(); ctx.translate(r*0.8,-r*0.3); ctx.rotate(-0.12); rrect(ctx,0,-r*0.05,r*1.6,r*0.1,3); ctx.restore(); ctx.shadowBlur=0;
      ctx.fillStyle=shade(skin,0.9); ctx.beginPath(); ctx.arc(r*0.34,-r*0.4,r*0.26,0,TAU); ctx.fill();
      eyesAt(r*0.4,-r*0.4,r*0.1,r*0.08);
    }
    else if(kind==='aegis'){                           // walking bulwark — octagonal hull, frontal energy shield (+x), exposed reactor core at the back (-x)
      // exposed reactor core at the BACK first (so the hull overlaps its near edge)
      const pulse=0.6+0.4*Math.sin(G.time*5+this.phase);
      ctx.save(); ctx.translate(-r*0.58,0);
        if(!G.lowFx){ ctx.shadowBlur=20*pulse; ctx.shadowColor=eye; }
        ctx.fillStyle=eye; ctx.globalAlpha=0.45+0.5*pulse; ctx.beginPath(); ctx.arc(0,0,r*0.34,0,TAU); ctx.fill();
        ctx.globalAlpha=1; ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(0,0,r*0.15,0,TAU); ctx.fill();
      ctx.restore(); ctx.shadowBlur=0;
      // armored octagonal hull
      ctx.fillStyle=grad(); ctx.beginPath();
      for(let i=0;i<8;i++){ const a=i/8*TAU+0.39, rr=r*(0.74+0.05*(i%2)), px=Math.cos(a)*rr, py=Math.sin(a)*rr; i?ctx.lineTo(px,py):ctx.moveTo(px,py); }
      ctx.closePath(); ctx.fill(); ctx.strokeStyle=dk; ctx.lineWidth=r*0.1; ctx.stroke();
      ctx.fillStyle=shade(skin,0.78); ctx.beginPath(); ctx.arc(r*0.15,0,r*0.4,0,TAU); ctx.fill();   // front plating boss
      eyesAt(r*0.34,0,r*0.26,r*0.1);
      // frontal energy shield arc (+x) — bright; flashes white on deflect
      const sa=this.shieldArc||1.25, hit=this._shieldHitT>0;
      ctx.save(); if(!G.lowFx){ ctx.shadowBlur=hit?24:13; ctx.shadowColor='#bfe9ff'; }
        ctx.strokeStyle=hit?'#ffffff':'#bfe9ff'; ctx.globalAlpha=hit?0.95:0.72; ctx.lineWidth=r*0.17;
        ctx.beginPath(); ctx.arc(0,0,r*1.34,-sa,sa); ctx.stroke();
        ctx.globalAlpha=0.28; ctx.lineWidth=r*0.05; ctx.beginPath(); ctx.arc(0,0,r*1.52,-sa*0.96,sa*0.96); ctx.stroke();
      ctx.restore(); ctx.globalAlpha=1; ctx.shadowBlur=0;
    }
    else {                                             // butcher (+ fallback) — hulking brute with cleaver
      ctx.strokeStyle=dk; ctx.lineWidth=r*0.36; ctx.beginPath(); ctx.moveTo(-r*0.15,r*0.3); ctx.lineTo(-r*0.5,r*0.9); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r*0.15,r*0.3); ctx.lineTo(r*0.4,r*0.9); ctx.stroke();
      ctx.fillStyle=grad(); ctx.beginPath(); ctx.ellipse(0,-r*0.02,r*0.92,r*0.78,0.12,0,TAU); ctx.fill();
      ctx.strokeStyle=skin; ctx.lineWidth=r*0.42; ctx.beginPath(); ctx.moveTo(r*0.2,-r*0.1); ctx.lineTo(r*1.0,r*0.25); ctx.stroke();
      ctx.fillStyle='#cfd6dd'; ctx.shadowBlur=8; ctx.shadowColor='#fff'; ctx.save(); ctx.translate(r*1.05,r*0.35); ctx.rotate(0.5); rrect(ctx,0,-r*0.62,r*0.9,r*0.62,5); ctx.restore(); ctx.shadowBlur=0;
      ctx.fillStyle=shade(skin,0.85); ctx.beginPath(); ctx.arc(r*0.38,-r*0.28,r*0.3,0,TAU); ctx.fill();
      eyesAt(r*0.46,-r*0.28,r*0.12,r*0.09);
    }
  }
  eyes(ctx,ex,ey,er){ ctx.fillStyle=this.eye; if(!(window.G&&G.lowFx)){ ctx.shadowBlur=er*9; ctx.shadowColor=this.eye; } ctx.beginPath(); ctx.arc(ex,-ey,er,0,TAU); ctx.arc(ex,ey,er,0,TAU); ctx.fill(); ctx.shadowBlur=0; }
}

/* ---------------------- ENEMY BULLET ---------------------- */
class EnemyBullet{
  constructor(x,y,vx,vy,dmg,color,r){this.x=x;this.y=y;this.vx=vx;this.vy=vy;this.dmg=dmg;this.color='#ff3b6b';this.r=r;this.dead=false;this.life=4;}   // ALL enemy fire uses one reserved DANGER hue (never amber/cyan/green) → 'a coloured streak that will hurt me' is one learnable rule
  update(dt){
    this.life-=dt; this.x+=this.vx*dt;this.y+=this.vy*dt;
    if(this.life<=0||this.x<WALL||this.x>WORLD-WALL||this.y<WALL||this.y>WORLD-WALL) this.dead=true;
    const p=G.player; if(U.dist(this.x,this.y,p.x,p.y)<this.r+p.r){ p.hurt(this.dmg,this.x,this.y,'ranged'); this.dead=true; }
    if(U.chance(0.3)) Particles.emit(this.x,this.y,0,0,0.2,this.r*0.7,this.color,{drag:0.8});
  }
  draw(ctx){
    const lf=window.G&&G.lowFx;
    if(!lf){ ctx.shadowBlur=14; ctx.shadowColor=this.color; }
    ctx.fillStyle=this.color; ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,TAU);ctx.fill();
    ctx.shadowBlur=0;
    // hostile tell: white-hot core + thin warning ring → enemy fire never reads as a friendly bullet in the chaos
    ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.beginPath();ctx.arc(this.x,this.y,this.r*0.42,0,TAU);ctx.fill();
    if(!lf){ ctx.globalAlpha=0.5; ctx.strokeStyle=this.color; ctx.lineWidth=2; ctx.beginPath();ctx.arc(this.x,this.y,this.r+2.5,0,TAU);ctx.stroke(); ctx.globalAlpha=1; }
  }
}

/* ---------------------- PICKUP ---------------------- */
class Pickup{
  constructor(x,y,kind){this.x=x;this.y=y;this.kind=kind;this.dead=false;this.life=12;this.bob=U.rand(TAU);this.r=11;}
  update(dt){
    this.life-=dt; if(this.life<=0)this.dead=true; this.bob+=dt*4;
    const p=G.player, d=U.dist(this.x,this.y,p.x,p.y), mag=90*(p.magnet||1);
    if(d<mag){ const a=Math.atan2(p.y-this.y,p.x-this.x), pull=U.lerp(40,440,1-d/mag); this.x+=Math.cos(a)*pull*dt; this.y+=Math.sin(a)*pull*dt; }
    if(d<p.r+this.r){ this.collect(); this.dead=true; }
  }
  collect(){
    const p=G.player;
    if(this.kind==='hp'){ let h=Math.max(25,Math.round(p.maxHp*0.12))*(G.mods?G.mods.heal:1); if(G.bfx&&G.bfx.heal) h*=G.bfx.heal; h=Math.max(6,Math.round(h)); p.hp=Math.min(p.maxHp,p.hp+h); G.addFloat(p.x,p.y-20,'+'+h,false,'#9bff5b'); if(Audio2.heal) Audio2.heal(); else Audio2.pickup(); }
    else if(this.kind==='nuke'){ G.detonateNuke(); }
    else { G.addScore(25); G.scrap+=2; if(p.scrapHeal && p.hp<p.maxHp){ const h=Math.ceil(p.scrapHeal*(1+p.maxHp*0.006)); p.hp=Math.min(p.maxHp,p.hp+h); } G._coinStreak=(G._coinStreak||0)+1; G._coinStreakT=0.45; Audio2.coin(G._coinStreak); }   // ascending coin-run on a scrap shower (streak decays in the loop)
    Particles.burst(this.x,this.y,8,this.kind==='hp'?'#9bff5b':(this.kind==='nuke'?'#46e6ff':'#ffd27a'),{speed:140,life:0.4});
  }
  draw(ctx){
    const y=this.y+Math.sin(this.bob)*4, blink=this.life<3 && Math.floor(this.life*8)%2===0; if(blink) return;
    ctx.save(); ctx.translate(this.x,y);
    if(this.kind==='hp'){ ctx.shadowBlur=16;ctx.shadowColor='#9bff5b';ctx.fillStyle='#9bff5b'; ctx.fillRect(-3,-9,6,18); ctx.fillRect(-9,-3,18,6); }
    else if(this.kind==='nuke'){
      ctx.strokeStyle='rgba(255,255,255,'+(0.45+0.35*Math.sin(G.time*4))+')'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,14+Math.sin(G.time*4)*2.5,0,TAU); ctx.stroke();   // bright pulsing white ring → unmistakably a PICKUP, not stray fire
      ctx.rotate(this.bob*0.5); ctx.shadowBlur=20;ctx.shadowColor='#46e6ff';ctx.fillStyle='#46e6ff'; ctx.beginPath();ctx.arc(0,0,10,0,TAU);ctx.fill();
      ctx.fillStyle='#0a0c12'; ctx.beginPath();ctx.arc(0,0,4,0,TAU);ctx.fill();
      for(let i=0;i<3;i++){ ctx.save(); ctx.rotate(i/3*TAU); ctx.fillStyle='#46e6ff'; ctx.beginPath(); ctx.moveTo(0,-3); ctx.arc(0,0,11,-1.0,1.0); ctx.lineTo(0,3); ctx.closePath(); ctx.fill(); ctx.restore(); } }
    else { ctx.shadowBlur=16;ctx.shadowColor='#ffd27a';ctx.fillStyle='#ffd27a'; ctx.beginPath();for(let i=0;i<6;i++){const a=i/6*TAU;ctx.lineTo(Math.cos(a)*8,Math.sin(a)*8);}ctx.closePath();ctx.fill(); }
    ctx.restore(); ctx.shadowBlur=0;
  }
}

/* ---------------------- GAME STATE ---------------------- */
const G = {
  state:'title',
  player:null, enemies:[], bullets:[], enemyBullets:[], pickups:[], floats:[], turrets:[], companions:[],
  level:1, time:0, score:0, scrap:0, kills:0, runTime:0, bossesKilled:0,
  combo:0, comboTimer:0, flash:0, slowT:0, lowFx:false, titleTick:0,
  hitStop:0, abilityUses:0, maxCombo:0, objectives:[],
  diff:{hp:1,speed:1,dmg:1},
  toSpawn:0, spawnTimer:0, spawnInterval:1, aliveCap:8, bossLevel:false, bossAlive:false, bossRef:null,
  special:null, dropBonus:0,
  mode:'endless', threat:0, gmode:GAME_MODES[0], mods:THREAT_TIERS[0], dailyRng:false, coresEarned:0,
  champSpawned:false, walls:[],
  decor:[], ash:[], fog:[], hazards:[], strikes:[], bfx:null, _pendingRaise:[],
  best:{score:0,level:0},
  adRevivesUsed:0, adRerollUsed:false, adDoubleUsed:false, gamesPlayed:0, lastEarned:0,

  init(){
    Store.load();
    Biome.setLevel(1); Biome.update(0.001);
    this.loadBest(); this.updateScrapUI();
    this.genDecor(); this.genFog(); this.genAsh();
    Settings.apply();
    buildHubTiles(); refreshDailyPill();
    resize();
    requestAnimationFrame(loop);
  },
  updateScrapUI(){
    if(el('scrapTotal')) el('scrapTotal').textContent=Store.scrap;
    if(el('shopScrap')) el('shopScrap').textContent=Store.scrap;
    if(el('coresTotal')) el('coresTotal').textContent=Store.cores;
    if(el('achCores')) el('achCores').textContent=Store.cores;
  },
  openShop(){ this.state='shop'; this._ascendArmed=false; hideAllScreens(); buildShop(); show('shopScreen'); this.updateScrapUI(); },   // disarm ascend on (re)entry
  openMarket(){ this.state='market'; hideAllScreens(); buildMarket(); show('marketScreen'); this.updateScrapUI(); },
  openChallenges(){ this.state='challenges'; hideAllScreens(); buildChallenges(); show('challengesScreen'); },
  openChars(){ this.state='chars'; hideAllScreens(); buildCharacters(); show('charScreen'); },
  openAchievements(){ this.state='ach'; hideAllScreens(); buildAchievements(); show('achScreen'); this.updateScrapUI(); },
  openCodex(){ this.state='codex'; hideAllScreens(); buildCodex(); show('codexScreen'); },
  openProgress(){ this.state='progress'; hideAllScreens(); buildProgress(); show('progressScreen'); },
  openCosmetics(){ this.state='cosmetics'; hideAllScreens(); buildCosmetics(); show('cosmeticsScreen'); this.updateScrapUI(); },
  openStats(){ this.state='stats'; hideAllScreens(); if(typeof buildStats==='function') buildStats(); show('statsScreen'); },
  openSettings(){ if(window.Settings){ Settings._returnTo='titleScreen'; } hideAllScreens(); buildSettings(); show('settingsScreen'); },
  openPlaySetup(){ this.state='playsetup'; hideAllScreens();
    this.mode = SaveData.data.lastMode||this.mode||'endless';
    this.threat = U.clamp((SaveData.data.lastThreat!=null?SaveData.data.lastThreat:this.threat)||0, 0, SaveData.data.threat||0);
    if(this.mode==='daily' && typeof dailyDone==='function' && dailyDone()) this.mode='endless';
    renderPlaySummary(); if(typeof buildPlaySetup==='function') buildPlaySetup();
    show('playSetupScreen'); this.updateScrapUI(); },
  hubGo(method){ if(typeof this[method]==='function'){ this[method](); } else { toast(UL('In arrivo','Coming soon')); } },
  openRelicChoice(){ this.state='relic'; this.enemies.length=0; this.enemyBullets.length=0;
    buildRelicChoice(); hide('hud'); show('relicScreen'); Audio2.bossWarn(); },
  takeRelic(r){ if(!hasRelic(r.id)){ this.relics.push(r); if(r.apply) r.apply(this.player); banner(TN(EN_RELIC,r),'reliquia'); if(typeof toast==='function' && typeof TD==='function') toast(TD(EN_RELIC,r)); Audio2.pickup(); syncRelicHud(); } this.closeRelicChoice(); },   // state the effect once at pickup too
  closeRelicChoice(){ hide('relicScreen'); show('hud'); this.state='playing'; this._relicPending=false; this.startLevel(); syncHud(); },
  rerollWithCore(){ if(this.state!=='upgrade') return;
    if(this._freeRerollsLeft>0){ this._freeRerollsLeft--; buildUpgradeCards(); Audio2.upgrade(); banner('RI-TIRO GRATIS', this._freeRerollsLeft+' rimasti'); const _cr=el('coreRerollBtn'); if(_cr) _cr.textContent = this._freeRerollsLeft>0?(UL('🎲 RI-TIRA GRATIS (','🎲 FREE REROLL (')+this._freeRerollsLeft+')'):(UL('⬡ RI-TIRA (','⬡ REROLL (')+CORE_REROLL_COST+')'); return; }
    if(!Store.spendCores(CORE_REROLL_COST)){ Audio2.hurt(); banner('NUCLEI INSUFFICIENTI'); return; }
    buildUpgradeCards(); Audio2.upgrade(); this.updateScrapUI(); banner('RI-TIRO','-1 ⬡ nucleo'); },
  loadBest(){
    this.best.score=SaveData.data.best.score; this.best.level=SaveData.data.best.level;
    if(el('bestScore')) el('bestScore').textContent=this.best.score;
    if(el('bestLevel')) el('bestLevel').textContent=this.best.level;
    const ng=el('nextGoal');
    if(ng){ const h=(typeof nextUnlockHint==='function')?nextUnlockHint():null;
      if(h){ const nm=(typeof TN==='function'&&typeof EN_CHAR!=='undefined')?TN(EN_CHAR,h.c):h.c.name;
        const sl=UL(STAT_LABEL[h.stat]||h.stat, STAT_LABEL_EN[h.stat]||h.stat);
        ng.innerHTML=`<span class="ng-label">${UL('PROSSIMO SBLOCCO','NEXT UNLOCK')}</span> <b>${nm}</b> · ${Math.min(h.cur,h.goal)}/${h.goal} ${sl}`;
        ng.classList.remove('hidden');
      } else ng.classList.add('hidden'); }
  },
  saveBest(){
    let rec=false;
    if(this.score>this.best.score){this.best.score=this.score;rec=true;}
    if(this.level>this.best.level)this.best.level=this.level;
    SaveData.data.best.score=this.best.score; SaveData.data.best.level=this.best.level;
    // per-mode records (shown on each mode card in the play-setup screen)
    const bm = SaveData.data.bestByMode || (SaveData.data.bestByMode={});
    const cur = bm[this.mode] || {score:0,level:0};
    if(this.score>cur.score) cur.score=this.score;
    if(this.level>cur.level) cur.level=this.level;
    bm[this.mode]=cur;
    Store.setStatMax('maxLevel',this.level);
    Store.setStatMax('bestScore', this.score);
    return rec;
  },

  genDecor(){ this.decor=[]; for(let i=0;i<290;i++) this.decor.push({x:U.rand(WALL,WORLD-WALL),y:U.rand(WALL,WORLD-WALL),r:U.rand(6,32),rot:U.rand(TAU),kind:decorKind(),shade:U.rand(0.06,0.18)}); },
  genFog(){ this.fog=[]; for(let i=0;i<7;i++) this.fog.push({x:U.rand(0,WORLD),y:U.rand(0,WORLD),r:U.rand(220,420),vx:U.rand(-8,8),vy:U.rand(-6,6),hi:U.randInt(0,2),a:U.rand(0.04,0.09)}); },
  genAsh(){ this.ash=[]; const a=Biome.cur.amb, n=a?a.n:90;
    for(let i=0;i<n;i++) this.ash.push({x:U.rand(0,VW),y:U.rand(0,VH),s:U.rand(a?a.size[0]:0.6,a?a.size[1]:2.4),base:U.rand(0.7,1.3),a:U.rand(0.1,0.5)}); },

  start(){
    // interstitial BEFORE the run starts (never during 'playing'); wait for dismiss, then begin
    this.gamesPlayed=(this.gamesPlayed||0)+1;
    this.state='loading'; hideAllScreens();
    if(this.gamesPlayed>1 && window.Ads && Ads.ready('interstitial')){
      Ads.showInterstitial().then(()=>this._beginRun());
    } else this._beginRun();
  },
  _beginRun(){
    this.gmode=GMODE(this.mode); this.mods=THREAT(this.threat); this.coresEarned=0;
    SaveData.data.lastMode=this.mode; SaveData.data.lastThreat=this.threat;
    if(this.gmode.seeded){ RNG.install(dailySeed(dailyKey())); this.dailyRng=true; } else { RNG.restore(); this.dailyRng=false; }
    this.player=new Player(); Store.applyTo(this.player); applyCosmetics(this.player);
    this.enemies.length=0; this.bullets.length=0; this.enemyBullets.length=0; this.pickups.length=0; this.floats.length=0; this.turrets.length=0; this.companions.length=0; this.walls=[];
    this.hazards.length=0; this.strikes.length=0; this.bfx=null; this._pendingRaise.length=0; this._dmgSrc=null; this._hitDirT=0; this._looterCd=U.rand(20,34); this._hunterCd=U.rand(40,60); this.surge=null; this._surgePrev=false; this.zoneDark=0; this.zoneTreasure=false; this.singularities=[]; this._coinStreak=0; this._coinStreakT=0; this.banished=new Set(); this.banishLeft=2; this._ascendArmed=false;
    this.relics=[]; this._relicPending=false;
    if(this.player.startDrones){ for(let i=0;i<this.player.startDrones;i++) this.companions.push(new Companion('gun')); }
    if(this.player.startDroneHeal) this.companions.push(new Companion('heal'));
    if(this.player.startDroneScrap) this.companions.push(new Companion('scrap'));
    if(this.player.relicBonus && typeof grantRandomRelic==='function'){ for(let i=0;i<this.player.relicBonus;i++) grantRandomRelic(this.player); }
    Particles.clear();
    this.level=this.mods.start; this.score=0; this.scrap=0; this.kills=0; this.runTime=0; this.bossesKilled=0;
    if(this._coreStartSector && this._coreStartSector>this.level) this.level=this._coreStartSector; this._coreStartSector=0;
    this.combo=0; this.comboTimer=0; this.flash=0; this.slowT=0;
    this.adRevivesUsed=0; this.adRerollUsed=false; this.adDoubleUsed=false; this.lastEarned=0;
    if(this.player.coreRevives) this.player.revives+=this.player.coreRevives;
    if(this.gmode.noRevive){ this.player.revives=0; this.adRevivesUsed=1; }
    this.abilityUses=0; this.maxCombo=0; this.hitStop=0;
    this.objectives=U.shuffle(OBJECTIVES.slice()).slice(0,3).map(o=>Object.assign({},o,{done:false}));
    updateObjectivesHud();
    Camera.x=this.player.x-VW/2; Camera.y=this.player.y-VH/2;
    this.startLevel();
    // run-start: announce the MODE + its rule so the player knows what's different (endless = default, skip)
    { const gm=this.gmode; if(gm && gm.id!=='endless') banner(UL(gm.name,gm.nameEn||gm.name), UL(gm.desc,gm.descEn||gm.desc), true); }
    this.state='playing'; hideAllScreens(); show('hud'); Audio2.setMusic(true);   // hide all THEN show hud (hideAllScreens now includes 'hud')
    if(window.SaveData && !SaveData.data.tutorialSeen){
      SaveData.data.tutorialSeen=true; SaveData.save();
      this.spawnTimer=Math.max(this.spawnTimer||0, 3.4);   // a few CALM seconds to actually read the controls before the first wave
      const t=el('tutorial'); if(t){ t.classList.remove('hidden'); setTimeout(()=>{ if(t) t.classList.add('hidden'); },11000); }
    }
    Store.addStat('runs',1); Store.save();
    syncRelicHud();
  },

  startLevel(){
    const L=this.level;
    if(this.player && this.player.sectorGuard){ this.player.invuln=Math.max(this.player.invuln,this.player.sectorGuard); }
    // Early game is UNCHANGED (fresh players still wall ~sector 10-16). The bite is a SUPER-LINEAR late
    // term keyed past ~sector 22 — territory only a strong/maxed build reaches — so endless keeps
    // escalating instead of plateauing. A maxed player should start sweating around sector 28-40.
    const late = Math.max(0, L-22);
    const hpMul    = Math.pow(1.088, L-1) * (1 + Math.pow(late,1.5)*0.017);   // enemies survive maxed DPS → they pile up
    const speedMul = 1 + 0.75*(1-Math.exp(-(L-1)/55)) + Math.max(0,L-20)*0.010; // can't kite forever
    // damage saturates early, then climbs HARD late so even a tanky high-HP/regen build keeps LOSING health
    const dmgMul   = 1 + 1.30*(1-Math.exp(-(L-1)/45)) + Math.pow(Math.max(0,L-24),1.25)*0.046;
    // enemy ATTACK SPEED ramps with depth (ranged fire faster, healers/snipers recharge faster)
    const rateMul  = 1 + Math.max(0,L-12)*0.010 + Math.max(0,L-25)*0.022;
    this.diff={ hp:hpMul, speed:speedMul, dmg:dmgMul, rate:rateMul };
    const M=this.mods; this.diff.hp*=M.hp; this.diff.speed*=M.spd; this.diff.dmg*=M.dmg;
    if(this.gmode && this.gmode.frenzy){ this.diff.speed*=1.14; this.diff.rate*=1.12; }
    Biome.setLevel(L); if(Biome.t<1) this.genAsh();
    const biomeChanged = (Biome.t===0);
    if(biomeChanged) this.genDecor();   // refresh ground scatter to the new biome's characteristic shapes
    codexMark('biome', Biome.cur.id);
    // resolve this sector's biome signature effect (read by player movement, spawner, updateBiomeFx)
    this.bfx = (typeof BIOME_FX!=='undefined') ? (BIOME_FX[Biome.cur.id]||null) : null;
    if(this.bfx){ if(this.bfx.spd) this.diff.speed*=this.bfx.spd; if(this.bfx.rate) this.diff.rate*=this.bfx.rate; }
    if(this.player) this.player.bfx=this.bfx;
    this._bfxT = (this.bfx && (this.bfx.kind==='erupt'||this.bfx.kind==='storm'||this.bfx.kind==='spores')) ? U.rand(0.8,1.8) : 0;
    if(this.bfx && this.bfx.wind) this._windA=U.rand(TAU);
    // ZONE THEME — the readable skeleton: every zone has its own identity that changes how it plays.
    const zone=Math.ceil(L/5);
    const th=(typeof ZONE_THEMES!=='undefined')?zoneTheme(zone):null;
    this.zoneTheme=th;
    this.bountySector=!!(th&&th.bounty);
    this.rangedQuota=(th&&th.ranged!=null)?th.ranged:null;   // null → default growth formula
    this.champZone=!!(th&&th.champ);
    this.hazardMul=(th&&th.hazards)||1;
    this.zoneDark=(th&&th.dark && L%5!==0)?th.dark:0;   // BLACKOUT zone → reduced sight (never on the boss sector)
    this.zoneTreasure=!!(th&&th.treasure && L%5!==0);   // TREASURE zone → frequent fleeing-loot spawns
    if(this.zoneTreasure) this._looterCd=Math.min(this._looterCd||99, U.rand(2,5));   // get the first one out quickly
    if(th){ if(th.spd) this.diff.speed*=th.spd; if(th.rate) this.diff.rate*=th.rate; if(th.hp) this.diff.hp*=th.hp; }
    this.special=null;   // (random specials retired; horde MODE still sets this below)
    genHazards();
    document.documentElement.style.setProperty('--accent', rgb(Biome.cur.wall));
    this.bossLevel=(L%5===0) || (this.gmode && this.gmode.bossEvery); this.bossAlive=false; this.bossRef=null; hideBossBar();

    if(this.bossLevel){
      // boss fights get a steady stream of adds (more, sooner, deeper) so the boss isn't fought in an empty room
      this.toSpawn=4+Math.floor(L/3); this.spawnInterval=Math.max(1.0, 3.0*Math.exp(-L*0.02)); this.aliveCap=Math.min(16, 5+Math.floor(L/7));
      const pos=this.edgeSpawn(); const boss=new Enemy('boss',pos.x,pos.y);
      this.enemies.push(boss); this.bossAlive=true; this.bossRef=boss;
      this.bossDamageTaken=false;
      if(boss.bossKind==='twins'){ boss.maxHp*=0.5; boss.hp=boss.maxHp; boss.phase=0;
        const p2=this.edgeSpawn(); const t2=new Enemy('boss',p2.x,p2.y); t2.maxHp=boss.maxHp; t2.hp=t2.maxHp; t2.phase=Math.PI; this.enemies.push(t2); }
      Audio2.bossWarn(); Camera.shake(16,0.5); G.flash=0.4; G.flashColor='255,225,150';   // entrance sting (amber: not damage/nuke)
      Particles.burst(boss.x,boss.y,28,boss.eye,{speed:300,life:0.7,size:6});
      banner(boss.bossName,'SETTORE '+L,true); showBossBar(boss);
    } else {
      // spawn shape driven by the ZONE THEME (swarm = many/fast, veterans = few, siege = relentless, etc.)
      const qMul=(th&&th.qMul)||1, capAdd=(th&&th.capAdd)||0, intMul=(th&&th.intMul)||1;
      this.toSpawn=Math.round(Math.min(440, 6+L*3.0)*qMul);
      this.spawnInterval=Math.max(0.11, 1.25*Math.exp(-L*0.045))*intMul*this.mods.spawn;
      this.aliveCap=Math.min(112, 7+Math.floor(L*1.7)+Math.max(0,L-25))+capAdd;
      if(this.gmode && this.gmode.frenzy){ this.toSpawn=Math.round(this.toSpawn*1.5); this.aliveCap=Math.min(126,this.aliveCap+14); this.spawnInterval*=0.7; }
      // BLOOD MOON: a telegraphed risk/reward SURGE inside an otherwise-normal sector (never two in a row, not pre-boss, not while hurt)
      this.surge=null;
      if(L>=10 && L%5!==4 && this.player.hp>this.player.maxHp*0.35 && !this._surgePrev && U.chance(0.25)){ this.surge={t:0,warn:3,dur:12,active:false,noHit:true}; this._surgePrev=true; }
      else this._surgePrev=false;
      const tn = th?UL(th.name,th.en):'';
      if(L%5===1) banner(UL('ZONA','ZONE')+' '+zone+(tn?' · '+tn:''), Biome.cur.name, true);   // new zone → announce its theme
      else if(L%5===4) banner(UL('PROSSIMO: BOSS','NEXT: BOSS'), UL('preparati','get ready'), true);   // heads-up the sector BEFORE the boss so you can heal/save dash
      else banner('SETTORE '+L, tn||Biome.cur.name);                                            // theme stays visible under the sector
    }
    // PERSISTENT structure readout: zone · theme · sectors-until-boss (boss = end of each zone)
    { const si=el('sectorInfo'); if(si){ const toBoss=zone*5-L, tn=th?UL(th.name,th.en):'';
        const bf=(this.bfx && BFX_TAG[this.bfx.kind]) ? ` · <span class="bfx-tag">${UL(BFX_TAG[this.bfx.kind][0],BFX_TAG[this.bfx.kind][1])}</span>` : '';
        si.innerHTML = this.bossLevel ? `<span class="boss-soon">⚔ ${UL('BOSS','BOSS')}</span>${bf}`
          : `${UL('ZONA','ZONE')} ${zone}${tn?' · '+tn:''} · <span class="${toBoss<=1?'boss-soon':''}">⚔ ${toBoss}</span>${bf}`; } }
    // announce the biome's signature effect on ENTRY so the player knows the rules just changed
    if(biomeChanged && this.bfx && this.bfx.desc && typeof toast==='function') toast(UL(this.bfx.desc,this.bfx.en));
    if(L%5===1 && th && th.desc && th.id!=='outpost' && typeof toast==='function') toast(UL(th.desc,th.descEn));   // spell out EVERY meaningful zone's rule on entry (was only blackout/treasure), so 'VETERANS' etc. explain themselves
    this.champSpawned=false;
    this.dropBonus=Math.floor(L/3);
    if(this.gmode && this.gmode.horde && !this.bossLevel){ this.special='horde'; this.toSpawn=99999; this.aliveCap=Math.min(95,this.aliveCap+12); this.spawnInterval=Math.max(0.12,this.spawnInterval*0.6); this._waveStart=this.runTime; }
    this.spawnTimer=0.6; updateWaveBar(); el('lvlNum').textContent=L; Audio2.levelup();
  },

  availableTypes(){
    const L=this.level; const t=['walker'];
    if(L>=2) t.push('runner');
    if(L>=3) t.push('spitter');
    if(L>=4) t.push('bomber','walker');
    if(L>=5) t.push('leaper','runner');
    if(L>=6) t.push('shielder');
    if(L>=7) t.push('swarmer');
    if(L>=8) t.push('brute','healer');
    if(L>=9) t.push('sniper');
    if(L>=10) t.push('gunner');
    if(L>=11) t.push('brute','shielder','leaper');
    if(L>=12) t.push('rammer');
    if(L>=13) t.push('brawler');
    if(L>=14) t.push('zealot');
    if(L>=16) t.push('blinker');
    if(L>=18) t.push('wraith','runner');
    if(L>=20) t.push('bubbler');
    if(L>=22) t.push('summoner');
    if(L>=24) t.push('blinker','rammer','summoner');
    return t;
  },
  champName(type){
    const N={ walker:'IL DEFORME', runner:'IL FULMINE', spitter:'IL VELENOSO', brute:'IL TITANO',
      shielder:'IL BASTIONE', swarmer:'IL NIDO', leaper:'IL PREDATORE', healer:'IL PROFETA',
      sniper:'IL CECCHINO', rammer:'IL DEMOLITORE', blinker:'IL FANTASMA', wraith:'IL VELO', bubbler:'IL GUSCIO' };
    return N[type]||'CAMPIONE';
  },
  edgeSpawn(){
    const side=U.randInt(0,3); let x,y; const m=120;
    if(side===0){ x=U.rand(WALL,WORLD-WALL); y=Camera.y-m; }
    else if(side===1){ x=Camera.x+VW+m; y=U.rand(WALL,WORLD-WALL); }
    else if(side===2){ x=U.rand(WALL,WORLD-WALL); y=Camera.y+VH+m; }
    else { x=Camera.x-m; y=U.rand(WALL,WORLD-WALL); }
    return {x:U.clamp(x,WALL,WORLD-WALL), y:U.clamp(y,WALL,WORLD-WALL)};
  },

  updateSpawning(dt){
    if(this.state!=='playing') return;
    let aliveNonBoss=0; if(this.toSpawn>0){ for(const e of this.enemies) if(!e.boss) aliveNonBoss++; }
    if(this.toSpawn>0 && aliveNonBoss<this.aliveCap){
      this.spawnTimer-=dt;
      if(this.spawnTimer<=0){
        this.spawnTimer=this.spawnInterval;
        const types=this.availableTypes();
        let type=weightedType(types); const p=this.edgeSpawn();
        // RANGED QUOTA: a growing share of spawns shoot at you (boosted hard in a SNIPERS zone)
        const rq = this.rangedQuota!=null ? this.rangedQuota : Math.min(0.42, 0.10+this.level*0.013);
        if(this.level>=4 && !ETYPE[type].ranged && U.chance(rq)){
          const rp=types.filter(t=>ETYPE[t]&&ETYPE[t].ranged); if(rp.length) type=U.pick(rp);
        }
        const champOk = this.level>=12 && !this.bossLevel && !this.champSpawned
          && !['mite','bomber','zealot','summoner'].includes(type)
          && !this.enemies.some(e=>e.champion)
          && U.chance(Math.min(0.6, 0.18 + (this.level-12)*0.01 + (this.champZone?0.30:0)));   // CHAMPIONS zone → mini-bosses common
        if(champOk){
          const champ=new Enemy(type,p.x,p.y,'champion'); champ.champName=this.champName(type);
          this.enemies.push(champ); this.champSpawned=true;
          Particles.burst(p.x,p.y,22,'#ff7a2d',{speed:170,life:0.5}); Camera.shake(6,0.2);
          Audio2.bossWarn(); banner('CAMPIONE',champ.champName,true);
          this.toSpawn--; updateWaveBar();
        } else {
          const eChance = (this.zoneTheme && this.zoneTheme.elite) ? this.zoneTheme.elite : Math.min(0.85, 0.10 + Math.max(0,this.level-30)*0.004 + this.mods.elite);   // VETERANS zone → elites everywhere
          const elite = this.level>=6 && !['spitter','bomber','mite','healer','sniper'].includes(type) && U.chance(eChance);
          this.enemies.push(new Enemy(type,p.x,p.y,elite));
          Particles.burst(p.x,p.y,elite?14:8, elite?'#ffd24d':'#ff3b3b',{speed:elite?140:90,life:0.4});
          this.toSpawn--; updateWaveBar();
        }
      }
    }
    const done = (this.gmode && this.gmode.horde && !this.bossLevel) ? ((this.runTime-(this._waveStart||0))>=35)
      : (this.bossLevel ? (!this.bossAlive) : (this.toSpawn<=0 && !this.enemies.some(e=>!((e.cfg&&e.cfg.looter)||e.hunter))));   // looter & hunter are optional bonus content → never block sector completion
    if(done) this.completeLevel();
  },

  // SPECIAL ENCOUNTER: occasionally a fleeing loot-carrier appears mid-sector. Breaks the moment-to-moment
  // routine — drop what you're doing and chase it for a big payout, or let it escape.
  updateLooter(dt){
    if(this.bossLevel || this.state!=='playing' || this.level<2) return;
    if(this._looterCd==null) this._looterCd=U.rand(20,34);
    this._looterCd-=dt;
    if(this._looterCd>0) return;
    if(this.enemies.some(e=>!e.dead && e.cfg && e.cfg.looter)){ this._looterCd=this.zoneTreasure?2:4; return; }   // never two at once
    this._looterCd=this.zoneTreasure?U.rand(7,12):U.rand(28,46);   // TREASURE zone → a steady parade of loot to chase
    this.spawnLooter();
  },
  spawnLooter(){
    const p=this.player, a=U.rand(TAU), dist=440;
    const x=U.clamp(p.x+Math.cos(a)*dist, WALL+50, WORLD-WALL-50);
    const y=U.clamp(p.y+Math.sin(a)*dist, WALL+50, WORLD-WALL-50);
    const e=new Enemy('looter', x, y);
    e.maxHp=Math.round(80+this.level*9); e.hp=e.maxHp; e.spawnT=0.3; e.lootLife=13;   // fixed-ish HP (NOT the compounding curve) so it stays a catchable chase
    this.enemies.push(e);
    banner('BOTTINO IN FUGA!','inseguilo!',true); if(window.Audio2&&Audio2.upgrade) Audio2.upgrade(); Camera.shake(4,0.2);
  },
  // THE HUNTER: a named, elite-tier stalker that spawns mid-sector and comes STRAIGHT for you — a duel within the horde.
  updateHunter(dt){
    if(this.state!=='playing' || this.level<8) return;
    const h=this.enemies.find(e=>e.hunter && !e.dead);
    if(h){ h.hunterLife-=dt; if(h.hunterLife<=0){ h.dead=true; if(!G.lowFx) Particles.burst(h.x,h.y,18,h.eye,{speed:240,life:0.5}); banner(UL('IL CACCIATORE SI RITIRA','THE HUNTER RETREATS'),'',false); } return; }   // one at a time
    if(this.bossLevel || this.bossAlive) return;
    if(this._hunterCd==null) this._hunterCd=U.rand(35,55);
    this._hunterCd-=dt;
    if(this._hunterCd>0) return;
    if(this.enemies.some(e=>e.champion)){ this._hunterCd=4; return; }
    const huntZone=this.zoneTheme && (this.zoneTheme.champ||this.zoneTheme.id==='hunt');
    this._hunterCd = huntZone?U.rand(22,34):U.rand(45,70);   // CHAMPIONS/HUNT zones → it stalks you twice as often
    this.spawnHunter();
  },
  spawnHunter(){
    const p=this.player, a=U.rand(TAU), dist=520;
    const x=U.clamp(p.x+Math.cos(a)*dist, WALL+60, WORLD-WALL-60), y=U.clamp(p.y+Math.sin(a)*dist, WALL+60, WORLD-WALL-60);
    const type=U.pick(['rammer','leaper','blinker','wraith']);   // an aggressive type → varies the threat each time
    const e=new Enemy(type, x, y, 'elite');
    e.hunter=true; e.maxHp=Math.round(e.maxHp*1.5); e.hp=e.maxHp; e.speed*=1.15; e.dmg=Math.round(e.dmg*1.1); e.hunterLife=25; e.spawnT=0.4;
    e.hunterName=this.champName(type); e.eye='#e07bff';
    this.enemies.push(e);
    banner(UL('IL CACCIATORE','THE HUNTER'), e.hunterName, true); if(window.Audio2&&Audio2.bossWarn) Audio2.bossWarn(); Camera.shake(8,0.4);
  },
  // SINGOLARITÀ ability: drag non-boss enemies toward each well, then implode for clustered AoE damage
  updateSingularities(dt){
    if(!this.singularities || !this.singularities.length) return;
    for(const s of this.singularities){
      s.t+=dt; const remain=s.life-s.t;
      for(const e of this.enemies){ if(e.dead||e.boss) continue; const d=U.dist(e.x,e.y,s.x,s.y);
        if(d<s.r && d>6){ const a=Math.atan2(s.y-e.y,s.x-e.x), pull=(e.cfg.heavy||e.champion)?95:210; e.x+=Math.cos(a)*pull*dt; e.y+=Math.sin(a)*pull*dt; } }
      if(remain<=0){   // IMPLODE: big AoE on the clustered crowd + outward blowback
        this.explode(s.x,s.y, s.r*0.62, s.dmg);
        for(const e of this.enemies){ if(e.dead||e.boss) continue; if(U.dist(e.x,e.y,s.x,s.y)<s.r*0.7){ const a=Math.atan2(e.y-s.y,e.x-s.x); e.kbx=(e.kbx||0)+Math.cos(a)*520; e.kby=(e.kby||0)+Math.sin(a)*520; } }
        Particles.burst(s.x,s.y,52,'#c79bff',{speed:380,life:0.7,size:5,glow:true}); Camera.shake(12,0.35); if(window.Audio2&&Audio2.explosion) Audio2.explosion(); s.dead=true;
      } else if(!this.lowFx && U.chance(0.9)){   // inward-spiraling accretion particles
        const a=U.rand(TAU), rr=s.r*U.rand(0.5,1.0), px=s.x+Math.cos(a)*rr, py=s.y+Math.sin(a)*rr;
        Particles.emit(px,py,(s.x-px)*2.3,(s.y-py)*2.3,0.4,3,'#b388ff',{drag:0.8,glow:true});
      }
    }
    this.singularities=this.singularities.filter(s=>!s.dead);
  },

  vacuumPickups(){
    // sector cleared → sweep up everything you earned (scrap/HP) so nothing is left behind; nukes are kept to use later
    const p=this.player; let n=0;
    for(const pk of this.pickups){ if(pk.dead||pk.kind==='nuke') continue;
      Particles.emit(pk.x,pk.y,(p.x-pk.x)*1.8,(p.y-pk.y)*1.8,0.35,3,pk.kind==='hp'?'#9bff5b':'#ffd27a',{drag:0.9});
      pk.collect(); pk.dead=true; n++; }
    this.pickups=this.pickups.filter(pk=>!pk.dead);
  },
  completeLevel(){
    this.vacuumPickups();
    this.enemies.length=0; this.enemyBullets.length=0; this.strikes.length=0; this._pendingRaise.length=0; this.bossRef=null; hideBossBar();
    this.addScore(50*this.level);
    // a BOSS's signature reward is a RELIC (instead of the normal upgrade — one reward per sector, not two).
    // Falls back to the upgrade screen if there's no relic left to offer.
    if(this.bossLevel && this._relicPending){ this._relicPending=false; this.level++; this.openRelicChoice(); return; }
    this.state='upgrade'; Audio2.upgrade();
    el('upLvl').textContent=this.level;
    buildUpgradeCards();
    this.adRerollUsed=false;
    const rr=el('adRerollBtn'); if(rr){ rr.classList.remove('hidden'); rr.disabled=false; rr.textContent=I18N.t('rerollUp'); }
    this._freeRerollsLeft=(this.player&&this.player.freeRerolls)||0;
    const cr=el('coreRerollBtn'); if(cr){ const fr=this._freeRerollsLeft||0; cr.classList.toggle('hidden', fr<=0 && Store.cores<CORE_REROLL_COST); cr.disabled=false; cr.textContent= fr>0?(UL('🎲 RI-TIRA GRATIS (','🎲 FREE REROLL (')+fr+')'):(UL('⬡ RI-TIRA (','⬡ REROLL (')+CORE_REROLL_COST+')'); }
    hide('hud'); show('upgradeScreen');
  },
  chooseUpgrade(up){
    up.apply(this.player); this.level++; hide('upgradeScreen');
    const ev=this.rollEvent(this.level);
    if(ev){ this.openEvent(ev); } else { show('hud'); this.state='playing'; this.startLevel(); }
    syncHud();
  },
  rollEvent(L){ if(L<4 || L%5===0 || L%4!==0) return null; return U.pick(EVENTS); },
  openEvent(ev){ this.state='event'; this.event=ev; this.enemies.length=0; this.enemyBullets.length=0; buildEventCard(ev); hide('hud'); show('eventScreen'); Audio2.upgrade(); },
  resolveEvent(take){
    const ev=this.event, p=this.player;
    if(take && ev){ if(ev.can && !ev.can()){ Audio2.hurt(); return; } ev.apply(p); banner(TN(EN_EVENT,ev),'fatto'); Audio2.pickup(); }
    this.event=null; hide('eventScreen'); show('hud'); this.state='playing'; this.startLevel(); syncHud();
  },

  onKill(e){
    this.kills++; Store.addStat('kills',1);
    if(this.player && this.player.weapon){ Store.addStat('wkill_'+this.player.weapon.id, 1); }
    if(typeof awardMasteryXp==='function') awardMasteryXp(e.boss?180:(e.elite?28:6));
    if(e.boss){
      if((e.bossKind==='twins'||e.bossKind==='splitter') && this.enemies.some(x=>x.boss&&!x.dead&&x!==e)){
        this.bossRef=this.enemies.find(x=>x.boss&&!x.dead&&x!==e);   // follow the surviving twin
      } else {
        this.bossesKilled++; Store.addStat('bosses',1);              // count the encounter once
        if(!this.bossDamageTaken) Store.addStat('bossNoHit',1);
        this.bossAlive=false; this.bossRef=null; hideBossBar(); banner('SETTORE RIPULITO');
        if(unlockedRelics().filter(r=>!(this.relics||[]).some(o=>o.id===r.id)).length) this._relicPending=true;
      }
    }
    this.combo++; this.comboTimer=2.6;
    if(this.combo>this.maxCombo){ this.maxCombo=this.combo; Store.setStatMax('maxCombo',this.maxCombo); }
    if(this.combo===25||this.combo===50||this.combo===100){   // OVERDRIVE tier crossed → escalating fanfare
      const lvl=this.combo===100?3:this.combo===50?2:1;
      banner('OVERDRIVE '+['I','II','III'][lvl-1], UL('potenza in salita','power rising'), true);
      G.flash=Math.max(G.flash||0,0.4); G.flashColor=lvl>=3?'255,120,40':'255,180,60';
      Camera.shake(6+lvl*3,0.32); if(window.Audio2&&Audio2.levelup) Audio2.levelup(); if(typeof Haptic!=='undefined'&&Haptic.heavy) Haptic.heavy();
      Particles.burst(this.player.x,this.player.y,28+lvl*10,'#ff9b2d',{speed:300,life:0.6,size:5,glow:true});
    }
    if(this.combo>=5 && this.combo%5===0){
      const tier=Math.floor(this.combo/5);
      this.addFloat(this.player.x,this.player.y-40,'COMBO x'+(1+tier*0.5).toFixed(1),true,'#ffd24d');
      if(window.Audio2&&Audio2.blip) Audio2.blip(360+Math.min(tier,12)*65,0.08,'triangle',0.16);   // pitch climbs each combo tier
      if(typeof Haptic!=='undefined'&&Haptic.light) Haptic.light();   // a tactile tick on every streak milestone — mobile's strongest positive-feedback channel
    }
    if(this.combo>0 && this.combo%10===0){ Camera.shake(6,0.22); Particles.burst(this.player.x,this.player.y,16+Math.min(this.combo,44),'#ffd24d',{speed:250,life:0.55,size:5}); if(window.Audio2&&Audio2.levelup) Audio2.levelup(); if(typeof Haptic!=='undefined'&&Haptic.medium) Haptic.medium();
      if(this.combo>=30) banner(UL('IN FIAMME','ON FIRE')+' x'+(1+Math.floor(this.combo/5)*0.5).toFixed(1)); }   // big streaks get a shout
    const mult=1+Math.floor(this.combo/5)*0.5;
    this.addScore(Math.round(e.score*mult));
    if(this.player.lifesteal){ const hm=(this.bfx&&this.bfx.heal)||1; this.player.hp=Math.min(this.player.maxHp,this.player.hp+this.player.lifesteal*hm);
      if(this.player.relBloodEngine){ this.player._bloodT=5; this.player._bloodStacks=Math.min(15,(this.player._bloodStacks||0)+1); } }   // KEYSTONE Blood Engine: healing → rising damage
    if(this.player.relConflag && e.burnT>0 && !e.boss){   // KEYSTONE Conflagration: a burning enemy DETONATES on death, spreading fire
      G.explode(e.x,e.y,95, e.maxHp*0.10+18);
      for(const o of this.enemies){ if(o.dead||o.boss) continue; if(U.dist2(e.x,e.y,o.x,o.y)<110*110){ o.burnT=2; o.burnDmg=Math.max(o.burnDmg||0, (e.burnDmg||8)*0.8); } }
      if(!G.lowFx) Particles.burst(e.x,e.y,22,'#ff7a2d',{speed:300,life:0.5,size:5,glow:true}); }
    // crypt/bone biome: the slain claw their way back up ONCE as a faster, weaker husk (no re-raising).
    // DEFERRED to G._pendingRaise (flushed in the main loop AFTER bulletCollisions) so the killing
    // bullet's leftover pierce/explosion can't instantly re-kill the husk the same frame it's born.
    if(this.bfx && this.bfx.kind==='raise' && e && !e.boss && !e.husk && !e.champion && !e.elite && !e.cfg.mini
       && U.chance(this.bfx.chance||0.2) && this.enemies.length < this.aliveCap+10){
      (this._pendingRaise||(this._pendingRaise=[])).push({x:e.x, y:e.y});
    }
    if(e.cfg && e.cfg.looter){
      // caught the fleeing loot → a big payout: a scrap shower, a heal, bonus scrap, and a chance at a core
      const n=8+Math.floor(this.level*0.4);
      for(let i=0;i<n;i++){ const a=U.rand(TAU),dd=U.rand(14,86); this.pickups.push(new Pickup(U.clamp(e.x+Math.cos(a)*dd,WALL,WORLD-WALL),U.clamp(e.y+Math.sin(a)*dd,WALL,WORLD-WALL),'scrap')); }
      this.pickups.push(new Pickup(e.x,e.y,'hp'));
      if(U.chance(0.4)){ const cg=Math.max(1,Math.round(this.player.coreGainMul||1)); SaveData.data.cores=(SaveData.data.cores||0)+cg; SaveData.save(); this.addFloat(e.x,e.y-e.r,UL('+1 NUCLEO','+1 CORE'),true,'#ff7a2d'); }
      const bonus=24+this.level*4; this.scrap+=bonus;
      Particles.burst(e.x,e.y,44,'#ffd24d',{speed:300,life:0.7,size:5,glow:true}); Camera.shake(7,0.3);
      banner('BOTTINO!','+'+bonus+' rottami',true); if(window.Audio2&&Audio2.levelup) Audio2.levelup(); this.updateScrapUI();
    } else if(e.hunter){   // HUNTER down → champion-tier payout
      for(let i=0;i<3;i++) this.pickups.push(new Pickup(e.x+U.rand(-40,40),e.y+U.rand(-40,40),U.chance(0.5)?'hp':'scrap'));
      this.pickups.push(new Pickup(e.x,e.y,'nuke'));
      const hc=Math.max(1,Math.round(this.player.coreGainMul||1)); SaveData.data.cores=(SaveData.data.cores||0)+hc; SaveData.save();
      this.addFloat(e.x,e.y-e.r,UL('+1 NUCLEO','+1 CORE'),true,'#ff7a2d'); banner(UL('CACCIATORE ABBATTUTO','HUNTER DOWN'),'+1 nucleo',true);
      if(window.Audio2&&Audio2.championDie) Audio2.championDie(); Camera.shake(8,0.3);
    } else if(e.boss){
      for(let i=0;i<5;i++) this.pickups.push(new Pickup(e.x+U.rand(-50,50),e.y+U.rand(-50,50),U.chance(0.5)?'hp':'scrap'));
      this.pickups.push(new Pickup(e.x,e.y,'nuke'));
    } else if(e.champion){
      for(let i=0;i<3;i++) this.pickups.push(new Pickup(e.x+U.rand(-40,40),e.y+U.rand(-40,40),U.chance(0.5)?'hp':'scrap'));
      if(U.chance(0.5)) this.pickups.push(new Pickup(e.x,e.y,'nuke'));
      const champCores=Math.max(1,Math.round((this.player.coreGainMul||1))); SaveData.data.cores=(SaveData.data.cores||0)+champCores; SaveData.save();
      this.addFloat(e.x,e.y-e.r,UL('+1 NUCLEO','+1 CORE'),true,'#ff7a2d'); banner('CAMPIONE ABBATTUTO','+1 nucleo'); if(window.Audio2&&Audio2.championDie) Audio2.championDie();
    } else if(e.elite){
      this.pickups.push(new Pickup(e.x,e.y,'hp')); this.pickups.push(new Pickup(e.x+U.rand(-20,20),e.y+U.rand(-20,20),'scrap'));
      this.pickups.push(new Pickup(e.x+U.rand(-20,20),e.y+U.rand(-20,20),'scrap'));
      if(U.chance(0.15)) this.pickups.push(new Pickup(e.x,e.y,'nuke'));
      Particles.burst(e.x,e.y,22,'#ffd24d',{speed:250,life:0.5,size:5}); Camera.shake(5,0.2);   // elites now feel worth killing
      if(window.Audio2&&Audio2.eliteDie) Audio2.eliteDie(); this.addFloat(e.x,e.y-e.r-6,UL('ÉLITE!','ELITE!'),true,'#ffd24d');   // its own kill sound, not the menu chime
    } else if(U.chance(e.cfg.drop + this.dropBonus*0.002 + (this.bountySector?0.13:0))){
      this.pickups.push(new Pickup(e.x,e.y, U.chance(0.5)?'hp':'scrap'));
      if(this.bountySector) this.pickups.push(new Pickup(e.x+U.rand(-14,14),e.y+U.rand(-14,14),'scrap'));   // SETTORE RICCO: extra loot
    }
    if(this.surge && this.surge.active && !e.boss && U.chance(0.55)) this.pickups.push(new Pickup(e.x+U.rand(-12,12),e.y+U.rand(-12,12),'scrap'));   // BLOOD MOON → double loot
  },

  checkObjectives(){
    if(!this.objectives) return;
    for(const o of this.objectives){
      if(o.done) continue;
      if(o.get()>=o.goal){ o.done=true; this.scrap+=o.reward; banner('OBIETTIVO','+'+o.reward+' rottami'); Audio2.upgrade(); updateObjectivesHud(); }
    }
  },

  explode(x,y,radius,dmg){
    Particles.burst(x,y,24,'#ffae42',{speed:360,life:0.6,size:6});
    Particles.burst(x,y,10,'#ff5b2d',{speed:200,life:0.5,size:8}); Camera.shake(10,0.25);
    if(dmg>0){ for(const e of this.enemies){ if(!e.dead && U.dist(x,y,e.x,e.y)<radius+e.r) e.damage(dmg,x,y); } }
  },
  detonateNuke(){
    // reads as YOUR triumphant power move (not damage): cyan flash, softer shake, MEDIUM haptic (heavy = hurt),
    // a victory chime + a clear "ATOMICA" banner + an expanding cyan shockwave ring.
    G.flash=1; G.flashColor='120,210,255'; Audio2.explosion(); if(Audio2.levelup) Audio2.levelup(); Haptic.light(); Store.addStat('nukes',1);   // NO camera shake → never reads as damage
    banner('ATOMICA','schermo ripulito');
    Particles.burst(this.player.x,this.player.y,60,'#46e6ff',{speed:520,life:0.9,size:7});
    for(let i=0;i<32;i++){ const a=i/32*TAU; Particles.emit(this.player.x,this.player.y,Math.cos(a)*640,Math.sin(a)*640,0.6,6,'#7fefff',{drag:0.9,shrink:true,glow:true}); }
    for(const e of this.enemies){ if(e.dead) continue;
      const on=e.x>Camera.x-100&&e.x<Camera.x+VW+100&&e.y>Camera.y-100&&e.y<Camera.y+VH+100;
      if(on) e.damage(e.boss?600:99999,e.x,e.y); }
    for(const b of this.enemyBullets) b.dead=true;
  },

  addScore(n){ this.score+=n; },
  addFloat(x,y,val,crit,color){ const n=parseFloat(val)||0, isNum=n>0 && (''+val)===(''+Math.round(n));
    const cmb=Math.min(0.4,(this.combo||0)/250), mag=isNum?Math.min(1.5,n/220):0;   // big damage & high combo → big numbers
    let col=color;
    if(!col && isNum){ col = crit ? (n>2000?'#ffffff':n>700?'#ffe27a':'#fff1a0') : (n>900?'#ffae42':n>350?'#ffd24d':'#ffe0a0'); }   // white→gold→orange heat with magnitude
    this.floats.push({x,y,val:''+val,life:0.9,crit,color:col||(crit?'#fff1a0':'#ffe0a0'),
      vx:crit?U.rand(-52,52):U.rand(-14,14), vy:crit?-80:-40, sz:Math.min(2.8,1+mag+cmb+(crit?0.3:0))}); },

  quitToMenu(){
    // voluntary exit mid-run: bank the scrap earned so far (not a total loss), record it, go to menu
    if(this.state!=='playing' && this.state!=='paused'){ hide('pauseScreen'); this.toMenu(); return; }
    let earned = this.scrap + Math.floor(this.score/60) + this.kills + this.level*2;
    earned = Math.round(earned * Store.scrapMul() * this.mods.reward * this.gmode.reward * (1+(this.player&&this.player.relGreed||0)) * ((this.player&&this.player.coreScrapMul)||1));
    Store.scrap += earned;
    Store.addStat('playtime',Math.round(this.runTime)); Store.addStat('scrapLifetime',earned);
    this.saveBest();
    if(typeof recordRunHistory==='function') recordRunHistory();
    recordThreatProgress();
    if(this.dailyRng){ RNG.restore(); this.dailyRng=false; }
    Store.save();
    hide('pauseScreen');
    if(earned>0 && typeof toast==='function') toast(UL('Abbandonata · +'+earned+' ⬢','Abandoned · +'+earned+' ⬢'));
    this.toMenu();
  },
  deathCause(){
    const s=this._dmgSrc;
    if(!s) return UL('le lande desolate','the wastes');
    if(typeof s==='string'){ const M={ ranged:UL('un colpo nemico','enemy fire'), hazard:UL('le insidie del terreno','ground hazards'), storm:UL('un fulmine','lightning'), erupt:UL('un’eruzione di lava','a lava eruption') }; return M[s]||s; }
    if(s.boss) return (typeof trBoss==='function')?trBoss(s.bossName):(s.bossName||UL('un boss','a boss'));
    if(s.champion) return (s.champName&&typeof trChamp==='function')?trChamp(s.champName):(s.champName||UL('un campione','a champion'));
    const nm=(NAME_ENEMY[s.type])?UL(NAME_ENEMY[s.type], NAME_ENEMY_EN[s.type]||NAME_ENEMY[s.type]):UL('un nemico','an enemy');
    return s.elite?(UL('un’élite — ','an elite — ')+nm):nm;
  },
  die(){
    if(this.state==='gameover') return;
    this.state='gameover'; hideBossBar();
    this.strikes.length=0; this.hazards.length=0;   // no telegraph rings / pools frozen behind the menus
    Audio2.gameover(); Audio2.setMusic(false); Camera.shake(30,0.8); Haptic.heavy();
    const dfx=(this.player&&this.player.deathFx)||{color:'#ff3b3b',style:'burst'};
    Particles.burst(this.player.x,this.player.y,40,dfx.color,{speed:300,life:0.8});
    if(dfx.style==='ring'){
      for(let i=0;i<28;i++){ const an=i/28*TAU; Particles.emit(this.player.x,this.player.y,Math.cos(an)*360,Math.sin(an)*360,0.7,5,dfx.color,{drag:0.92,shrink:true}); }
      Camera.shake(34,0.9);
    }
    const rec=this.saveBest();
    let earned = this.scrap + Math.floor(this.score/60) + this.kills + this.level*2;
    earned = Math.round(earned * Store.scrapMul() * this.mods.reward * this.gmode.reward * (1+(this.player&&this.player.relGreed||0)) * ((this.player&&this.player.coreScrapMul)||1));
    this.lastEarned=earned;
    Store.scrap += earned;
    Store.addStat('deaths',1); Store.addStat('playtime',Math.round(this.runTime)); Store.addStat('scrapLifetime',earned);
    if(typeof recordRunHistory==='function') recordRunHistory();
    recordThreatProgress();
    if(this.dailyRng){ RNG.restore(); this.dailyRng=false; }
    Store.save(); this.updateScrapUI();
    { const gc=el('goCause'); if(gc) gc.innerHTML=UL('Ucciso da ','Slain by ')+'<b>'+this.deathCause()+'</b>'+UL(' · settore ',' · sector ')+this.level; }
    el('goLevel').textContent=this.level; el('goScore').textContent=this.score;
    el('goKills').textContent=this.kills; el('goTime').textContent=fmtTime(this.runTime);
    el('goScrap').textContent=earned;
    if(el('goCores')) el('goCores').textContent=this.coresEarned||0;
    // BUILD RECAP — admire the monster you assembled (loadout + relics + highlights)
    { const gb=el('goBuild'); if(gb){ const p=this.player||{};
        const w=p.weapon, wIco=w?w.ico:'', wName=w?TN(EN_WEAPON,w):'';
        const evo=(w&&p.evo&&typeof EVOLUTIONS!=='undefined'&&EVOLUTIONS[w.id])?(' <span class="gb-evo">★'+TN(EN_EVO,{id:w.id,name:EVOLUTIONS[w.id].name})+'</span>'):'';
        const cIco=(typeof CHAR==='function'&&Store.character)?CHAR(Store.character).ico:'';
        const relics=(this.relics||[]).map(r=>r.ico).join('');
        const bestC=(SaveData.data.stats&&SaveData.data.stats.maxCombo)||0, comboStar=(this.maxCombo>=bestC&&this.maxCombo>0)?' ★':'';
        gb.innerHTML = `<div class="gb-loadout">${cIco} ${wIco} <b>${wName}</b>${evo}</div>`
          + (relics?`<div class="gb-relics">${relics}</div>`:'')
          + `<div class="gb-high">${UL('COMBO MAX','MAX COMBO')} <b>${this.maxCombo||0}</b>${comboStar} · ${UL('BOSS','BOSSES')} <b>${this.bossesKilled||0}</b></div>`;
    } }
    el('newRecord').classList.toggle('hidden',!rec);
    const dbEl=el('goDailyBest');
    if(dbEl){ if(this.mode==='daily'){ dbEl.classList.remove('hidden'); dbEl.innerHTML=UL('RECORD DI OGGI · <b>',"TODAY'S BEST · <b>")+(typeof todayDailyBest==='function'?todayDailyBest():0)+'</b>'; } else dbEl.classList.add('hidden'); }
    if(typeof buildStats==='function') buildStats();
    setTimeout(()=>{
      if(this.state!=='gameover') return;   // back/menu pressed during the 900ms delay → don't pop the death screen over the menu
      hide('hud');
      const rb=el('adReviveBtn'); if(rb){ rb.classList.toggle('hidden', this.adRevivesUsed>=1 || (this.gmode&&this.gmode.seeded)); rb.disabled=false; rb.textContent=I18N.t('watchReviveAd'); }   // no ad-revive in seeded Daily (would desync the shared seed)
      const db=el('adDoubleBtn'); if(db){ db.classList.toggle('hidden', this.adDoubleUsed); db.disabled=false; db.textContent=I18N.t('doubleScrap'); }
      show('gameoverScreen');
    }, 900);
  },

  /* ---- rewarded ads hooks ---- */
  reviveFromAd(){
    const rb=el('adReviveBtn'); if(rb){ rb.disabled=true; rb.textContent=UL('CARICAMENTO…','LOADING…'); }
    Ads.showRewarded('revive').then(r=>{
      if(!r.rewarded){ if(rb){ rb.disabled=false; rb.textContent=UL('▶ ANNUNCIO NON DISPONIBILE','▶ AD UNAVAILABLE'); } return; }
      this.adRevivesUsed++;
      // UNDO the run-end banking that die() applied — otherwise reviving DOUBLE-credits scrap + premium
      // cores (and stats) when the run finally ends. Only the final death should pay out.
      const _back=(this.lastEarned||0)*(this.adDoubleUsed?2:1);
      Store.scrap=Math.max(0, Store.scrap-_back);
      SaveData.data.cores=Math.max(0,(SaveData.data.cores||0)-(this.coresEarned||0));
      if(SaveData.data.stats){ const st=SaveData.data.stats;
        st.deaths=Math.max(0,(st.deaths||0)-1);
        st.scrapLifetime=Math.max(0,(st.scrapLifetime||0)-(this.lastEarned||0));
        st.playtime=Math.max(0,(st.playtime||0)-Math.round(this.runTime)); }
      this.lastEarned=0; this.coresEarned=0; this.adDoubleUsed=false; Store.save();
      hide('gameoverScreen'); show('hud'); this.state='playing';
      this.player.hp=Math.max(1,Math.round(this.player.maxHp*0.6)); this.player.invuln=2.4;
      if(this.bossLevel && this.bossRef && !this.bossRef.dead) showBossBar(this.bossRef);   // boss bar was hidden by die()
      for(const b of this.enemyBullets) b.dead=true;
      Camera.shake(14,0.4); Audio2.pickup(); banner('RINATO'); Audio2.setMusic(true); syncHud();
    });
  },
  doubleScrapFromAd(){
    const db=el('adDoubleBtn'); if(db){ db.disabled=true; db.textContent=UL('CARICAMENTO…','LOADING…'); }
    Ads.showRewarded('double').then(r=>{
      if(!r.rewarded){ if(db){ db.disabled=false; db.textContent=UL('▶ ANNUNCIO NON DISPONIBILE','▶ AD UNAVAILABLE'); } return; }
      this.adDoubleUsed=true; const extra=this.lastEarned||0;
      Store.scrap+=extra; Store.save(); this.updateScrapUI();
      el('goScrap').textContent=(extra*2); if(db) db.textContent=UL('RADDOPPIATO ✓','DOUBLED ✓'); Audio2.upgrade();
    });
  },
  rerollFromAd(){
    if(this.adRerollUsed) return;
    const rr=el('adRerollBtn'); if(rr){ rr.disabled=true; rr.textContent=UL('CARICAMENTO…','LOADING…'); }
    Ads.showRewarded('reroll').then(r=>{
      if(!r.rewarded){ if(rr){ rr.disabled=false; rr.textContent=UL('▶ ANNUNCIO NON DISPONIBILE','▶ AD UNAVAILABLE'); } return; }
      this.adRerollUsed=true; buildUpgradeCards(); if(rr) rr.classList.add('hidden');
    });
  },
  bonusFromAd(){
    const bb=el('adBonusBtn'); if(!bb) return;
    bb.disabled=true; bb.textContent=UL('CARICAMENTO…','LOADING…');
    Ads.showRewarded('bonus').then(r=>{
      if(r.rewarded){ const g=U.randInt(8,15); Store.scrap+=g; Store.save(); Ads.markBonusUsed(); this.updateScrapUI(); banner('+'+g+' ROTTAMI'); }
      bb.disabled=false; bb.textContent=I18N.t('bonusScrap');
    });
  },

  toMenu(){
    if(typeof RNG!=='undefined' && RNG.active){ RNG.restore(); this.dailyRng=false; }
    this.state='title'; hideBossBar(); hideAllScreens(); show('titleScreen');
    this.loadBest(); this.updateScrapUI(); Audio2.setMusic(false);
    if(el('adBonusBtn') && window.Ads) el('adBonusBtn').classList.toggle('hidden', !Ads.bonusReady());
    buildHubTiles(); refreshDailyPill();
  },
};

/* ---------------------- COLLISIONS ---------------------- */
function bulletImpact(b){
  if(window.G&&G.lowFx) return;   // skip extra hit fx when the screen is swarmed
  const st=b.style, x=b.x, y=b.y, r=b.r||5;
  if(st==='flame')        Particles.burst(x,y,6,U.chance(0.5)?'#ff7a2d':'#ffcf4d',{speed:170,life:0.35,size:r*1.2,grav:-40,glow:true});
  else if(st==='shard')   Particles.burst(x,y,7,'#cfeeff',{speed:250,life:0.3,size:r*0.85,glow:true});
  else if(st==='elec')    Particles.burst(x,y,6,'#cde0ff',{speed:320,life:0.16,size:r*0.7,glow:true});
  else if(st==='lance')   Particles.burst(x,y,8,'#ffffff',{speed:300,life:0.2,size:r*0.7,glow:true});
  else if(st==='crescent')Particles.burst(x,y,5,b.color,{speed:210,life:0.25,size:r*0.7,glow:true});
  else if(st==='pellet'||st==='tracer') Particles.burst(x,y,3,b.color,{speed:150,life:0.18,size:r*0.6});
  else if(st!=='orb')     Particles.burst(x,y,4,b.color,{speed:170,life:0.22,size:r*0.7,glow:true});   // orb: explosion handles fx
}
// ELEMENTAL REACTION: burn meets chill → THERMAL SHOCK (consume both, burst damage). The signature combo dopamine.
function thermalShock(e,rd){
  e.burnT=0; e.chillT=0; e.frozen=0; e._reactT=0.5;
  e.damage(rd*1.2 + e.maxHp*0.14, e.x, e.y);   // % portion is safe — reactions never fire on bosses
  if(!(window.G&&G.lowFx)){ Particles.burst(e.x,e.y,18,'#ff7a2d',{speed:280,life:0.4,size:4,glow:true}); Particles.burst(e.x,e.y,14,'#bfeaff',{speed:240,life:0.4,size:3,glow:true}); }
  if(typeof G!=='undefined') G.addFloat(e.x,e.y-e.r-8,'SHOCK!',true,'#ffd24d');
  if(window.Audio2&&Audio2.explosion) Audio2.explosion();
}
function bulletCollisions(){
  for(const b of G.bullets){
    if(b.dead) continue;
    for(const e of G.enemies){
      if(e.dead||b.hitSet.has(e)) continue;
      if(U.dist2(b.x,b.y,e.x,e.y) < (b.r+e.r)*(b.r+e.r)){
        // damage for THIS target only — shield/bubble reductions apply to a LOCAL copy, never mutate b.dmg
        // (otherwise a piercing shot through shielders kept the reduced damage for every enemy behind them).
        let _rd=b.dmg;
        if(e.cfg.shield){
          const toBullet=Math.atan2(b.y-e.y,b.x-e.x);
          let diff=Math.abs(((toBullet-e.face+Math.PI)%TAU)-Math.PI);
          if(diff<e.cfg.shieldArc){ _rd*=e.cfg.shieldMul; Particles.burst(b.x,b.y,3,'#cfe0ff',{speed:120,life:0.2}); }
        }
        if(e.cfg.bubble && e.bubHp>0){
          const absorbed=Math.min(e.bubHp, _rd*(1-e.cfg.bubbleMul));
          e.bubHp-=absorbed; _rd-=absorbed;
          Particles.burst(b.x,b.y,3,'#9ff0ff',{speed:120,life:0.2});
          if(e.bubHp<=0){ e.bubHp=0; e.bubBroke=e.cfg.bubbleBreakT; e.bubPop=0.4; Particles.burst(e.x,e.y,16,'#9ff0ff',{speed:220,life:0.4}); Audio2.hit(); }
        }
        if(b.fullHpDmg && e.hp>=e.maxHp-0.01) _rd*=1+b.fullHpDmg;
        if(b.bossDmg && e.boss) _rd*=1+b.bossDmg;
        const _wasAlive=!e.dead;
        e.damage(_rd,b.x,b.y,b.crit);
        bulletImpact(b);   // weapon-flavoured hit fx (fire splat / ice shatter / spark / smoke...)
        if(b.crit && b.critBoom && _wasAlive){ G.explode(e.x,e.y,70+b.critBoom*30, _rd*0.5); }
        if(b.pierceOnKill && _wasAlive && e.dead && !e.boss){ b.pierce++; }
        const _react=G.player._elemCount>=2 && !e.boss && !e.dead;
        if(b.burn){ if(_react && e.chillT>0 && !(e._reactT>0)) thermalShock(e,_rd); e.burnT=2; e.burnDmg=_rd*0.4*(b.burnMul||1)*(b.burnAmp||1); }
        if(b.chill && !e.boss){ if(_react && e.burnT>0 && !(e._reactT>0)) thermalShock(e,_rd); e.chillT=Math.max(e.chillT||0,b.chill); if(e.chillT>=2.2) e.frozen=Math.max(e.frozen||0,0.6); }   // DEEP FREEZE (cryo evo / permafrost) → frozen solid
        if(b.shatter && _wasAlive && e.dead && !e.boss){   // EVO cryo_absolute/hail_blizzard: a slain (frozen) enemy SHATTERS — icy nova
          const ex=e.x, ey=e.y;
          if(!(window.G&&G.lowFx)) Particles.burst(ex,ey,16,'#bfeaff',{speed:300,life:0.45,size:4,glow:true});
          for(const o of G.enemies){ if(o.dead||o.boss) continue; if(U.dist2(ex,ey,o.x,o.y)<130*130){ o.damage(_rd*0.5,ex,ey); if(!o.dead) o.chillT=Math.max(o.chillT||0,1.3); } }
          if(window.Audio2&&Audio2.wCryo) Audio2.wCryo();
        }
        if(b.chain){
          let n=b.chain, from=e; const hit=new Set([e]);
          while(n-->0){
            let best=null,bd=180*180;
            for(const o of G.enemies){ if(o.dead||hit.has(o)) continue; const dd=U.dist2(from.x,from.y,o.x,o.y); if(dd<bd){bd=dd;best=o;} }
            if(!best) break;
            const _cc = G.player.relStatic && U.chance(G.player.crit||0);   // KEYSTONE Static Field: chained hits can CRIT
            best.damage(b.dmg*(_cc?1.5:0.6),best.x,best.y,_cc);
            if(b.burn && !best.dead){ best.burnT=2; best.burnDmg=b.dmg*0.24*(b.burnMul||1)*(b.burnAmp||1); }   // CHAIN SPREADS STATUS → chain+burn/chill ignites/freezes the whole arc
            if(b.chill && !best.boss && !best.dead){ best.chillT=Math.max(best.chillT||0,b.chill); }
            for(let s=1;s<5;s++){ const t=s/5; Particles.emit(U.lerp(from.x,best.x,t),U.lerp(from.y,best.y,t),U.rand(-25,25),U.rand(-25,25),0.18,3,'#9be8ff',{drag:0.8}); }
            hit.add(best); from=best;
          }
        }
        if(G.player.execute && !e.boss && !e.dead && e.hp>0 && e.hp<e.maxHp*G.player.execute){ e.kill(); }
        b.hitSet.add(e);
        if(!e.boss && !e.dead){ const kbf=(e.cfg.heavy?70:e.elite?90:200)*(b.knock||1), il=Math.hypot(b.vx,b.vy)||1; e.kbx=(e.kbx||0)+b.vx/il*kbf; e.kby=(e.kby||0)+b.vy/il*kbf; }
        if(b.crit) Audio2.critHit(); else Audio2.hit();   // a crit now SOUNDS like a crit
        if(b.explosive){ G.explode(b.x,b.y,b.blastR,b.dmg*0.6);
          if(b.cluster){ for(let k=0;k<b.cluster;k++){ const ca=k/b.cluster*TAU;
            G.bullets.push(new Bullet(b.x,b.y,Math.cos(ca)*420,Math.sin(ca)*420,b.dmg*0.4,1,0.4,4,false,true,{color:b.color,blastR:b.blastR*0.5})); } }
          b.dead=true; break; }
        if(b.bounce>0){   // RICOCHET: redirect toward the nearest not-yet-hit enemy instead of dying
          let best=null,bd=560*560;
          for(const o of G.enemies){ if(o.dead||b.hitSet.has(o)) continue; const dd=U.dist2(b.x,b.y,o.x,o.y); if(dd<bd){bd=dd;best=o;} }
          if(best){ const sp=Math.hypot(b.vx,b.vy)||1, a2=U.angle(b.x,b.y,best.x,best.y); b.vx=Math.cos(a2)*sp; b.vy=Math.sin(a2)*sp; b.bounce--; b.life=Math.max(b.life,0.55); if(!(window.G&&G.lowFx)) Particles.burst(b.x,b.y,4,b.color,{speed:170,life:0.2,glow:true}); break; }
          b.dead=true; break;
        }
        if(b.pierce>0){ b.pierce--;
          if(b.refract && !b._refracted){ b._refracted=true;   // EVO prism_split: the beam REFRACTS into two angled splinters on its first pierce
            const sp=Math.hypot(b.vx,b.vy)||1, a=Math.atan2(b.vy,b.vx);
            for(const off of [-0.36,0.36]){ const nb=new Bullet(b.x,b.y,Math.cos(a+off)*sp,Math.sin(a+off)*sp,b.dmg*0.6,1,b.life*0.7,b.r*0.82,b.crit,false,{color:b.color,style:b.style}); nb.hitSet.add(e); G.bullets.push(nb); }
          }
        } else { b.dead=true; break; }
      }
    }
  }
}

/* ---------------------- MAIN LOOP ---------------------- */
let last=0;
function loop(ts){
  requestAnimationFrame(loop);
  const raw=(ts-last)/1000; let dt=Math.min(0.04,raw)||0; last=ts;
  if(raw>0 && raw<0.5) G._ft = G._ft ? G._ft*0.9+raw*0.1 : raw;   // smoothed frame time → auto-lowFx on a struggling device
  if(G.hitStop>0){ G.hitStop-=dt; dt*=0.18; }   // brief slow-mo (boss kill / nuke) for impact
  if(G.state==='playing' && G.player && G.player.relTimeDilate && G.player.hp<G.player.maxHp*0.30){ dt*=0.78; }
  if(G.state==='playing'){
    G.time+=dt; G.runTime+=dt;
    if(G.slowT>0) G.slowT-=dt;
    if(G._coinStreakT>0){ G._coinStreakT-=dt; if(G._coinStreakT<=0) G._coinStreak=0; }   // reset the ascending-coin streak after a brief gap
    if(G.surge){ const s=G.surge; s.t+=dt;
      if(!s.active && s.t>=s.warn){ s.active=true; banner(UL('LUNA DI SANGUE','BLOOD MOON'),UL('sopravvivi · bottino doppio','survive · double loot'),true); G.flash=Math.max(G.flash||0,0.6); G.flashColor='200,30,40'; if(window.Audio2&&Audio2.bossWarn) Audio2.bossWarn();
        G.spawnInterval=Math.max(0.1,G.spawnInterval*0.5); G.aliveCap=Math.min(130,G.aliveCap+18); G.toSpawn+=70; }   // wall of enemies (reuses the spawn knobs)
      else if(!s.active){ if(((s.warn-s.t)|0)!==G._surgeWarnTick){ G._surgeWarnTick=(s.warn-s.t)|0; } }
      if(s.active){ G._envHaz=[210,30,45]; G._envHazT=0.3;   // red danger edge while it rages
        if(s.t>=s.warn+s.dur){ if(s.noHit){ const bonus=40+G.level*5; G.scrap+=bonus; SaveData.data.cores=(SaveData.data.cores||0)+1; SaveData.save(); banner(UL('INCOLUME!','UNTOUCHED!'),'+'+bonus+UL(' rottami +1 nucleo',' scrap +1 core'),true); if(window.Audio2&&Audio2.levelup) Audio2.levelup(); G.updateScrapUI(); }
          else banner(UL('LUNA CALANTE','MOON WANES'),'',false); G.surge=null; } } }
    if(G.walls&&G.walls.length){ for(const wl of G.walls){ wl.life-=dt; if(wl.life<=0){wl.dead=true;continue;}
        for(const e of G.enemies){ if(e.dead||e.boss)continue; const wd=U.dist(wl.x,wl.y,e.x,e.y); if(wd<wl.r+e.r){ const wa=U.angle(wl.x,wl.y,e.x,e.y); e.x=wl.x+Math.cos(wa)*(wl.r+e.r); e.y=wl.y+Math.sin(wa)*(wl.r+e.r); } } }
      G.walls=G.walls.filter(w=>!w.dead); }
    G.player.update(dt);
    updateRelicOrbit(dt);
    updateHazards(dt);
    updateBiomeFx(dt);
    G.updateSpawning(dt);
    G.updateLooter(dt);
    G.updateHunter(dt);
    G.updateSingularities(dt);
    G.checkObjectives();
    for(const e of G.enemies) e.update(dt);
    for(const t of G.turrets) t.update(dt);
    for(const c of G.companions) c.update(dt);
    for(const b of G.bullets) b.update(dt);
    for(const b of G.enemyBullets) b.update(dt);
    for(const p of G.pickups) p.update(dt);
    bulletCollisions();
    G.enemies=G.enemies.filter(e=>!e.dead);
    // flush deferred husk reanimations (crypt/bone biome) now that this frame's collisions are resolved
    if(G._pendingRaise && G._pendingRaise.length){
      for(const r of G._pendingRaise){ if(G.enemies.length>=G.aliveCap+10) break;
        const h=new Enemy('walker', r.x, r.y); h.husk=true; h.maxHp*=0.55; h.hp=h.maxHp; h.speed*=1.12; h.color='#9a8d72'; h.eye='#d8c9a0'; h.spawnT=0.25;
        G.enemies.push(h); Particles.burst(r.x,r.y,9,'#b9a98c',{speed:120,life:0.45}); }
      G._pendingRaise.length=0;
    }
    G.turrets=G.turrets.filter(t=>!t.dead);
    G.companions=G.companions.filter(c=>!c.dead);
    G.bullets=G.bullets.filter(b=>!b.dead);
    G.enemyBullets=G.enemyBullets.filter(b=>!b.dead);
    G.pickups=G.pickups.filter(p=>!p.dead);
    for(const f of G.floats){ f.life-=dt; f.y+=(f.vy||-40)*dt; if(f.vx){ f.x+=f.vx*dt; f.vx*=0.9; } }
    G.floats=G.floats.filter(f=>f.life>0);
    if(G.comboTimer>0){ G.comboTimer-=dt; if(G.comboTimer<=0){ if(G.player&&G.player._odTier>=1){ if(window.Audio2&&Audio2.blip) Audio2.blip(420,0.28,'sawtooth',0.2,80); Camera.shake(4,0.22); }   // losing a high streak STINGS (de-spool)
      G.combo=0; } }
    if(G.flash>0) G.flash-=dt;
    if(G._envHazT>0) G._envHazT-=dt;
    // dynamic music: ramp tension with danger (boss alive / low HP / how crowded the screen is)
    if(window.Audio2 && Audio2.setIntensity){ G._musI=(G._musI||0)-dt; if(G._musI<=0){ G._musI=0.45;
      let I = (G.bossAlive?0.55:0) + ((G.player && G.player.hp/G.player.maxHp<0.35)?0.4:0) + Math.min(0.35, G.enemies.length/70) + Math.min(0.3,(G.combo||0)/40);   // music also swells on a hot kill-streak, not only danger
      Audio2.setIntensity(I>1?1:I); } }
    if(G._ft>0.027) G._ftLow=true; else if(G._ft<0.020) G._ftLow=false;   // hysteresis so it can't flicker around the threshold
    G.lowFx = G.forceLowFx || ((G.enemies.length + G.enemyBullets.length) > 70) || !!G._ftLow;
    Particles.update(dt);
    Camera.follow(G.player.x,G.player.y,VW,VH,dt);
    syncHud();
  } else {
    Particles.update(dt);
    if(window.Audio2 && Audio2.setIntensity) Audio2.setIntensity(0);   // calm music on menus / between sectors
    if(G.state==='title' && window.Ads){ G.titleTick+=dt; if(G.titleTick>2){ G.titleTick=0; const bb=el('adBonusBtn'); if(bb) bb.classList.toggle('hidden', !Ads.bonusReady()); } }
  }
  render(dt);
}

/* ---------------------- RENDER ---------------------- */
let hazPulse=0, _bgGrad=null, _bgKey='', _vigGrad=null, _vigKey='';
function bgGrad(C){
  const key=VW+'x'+VH+'|'+C.bg.join('-');
  if(Biome.t>=1 && _bgGrad && _bgKey===key) return _bgGrad;
  const g=ctx.createRadialGradient(VW/2,VH*0.42,40, VW/2,VH*0.5,Math.max(VW,VH)*0.85);
  g.addColorStop(0,rgb(C.bg[0])); g.addColorStop(0.6,rgb(C.bg[1])); g.addColorStop(1,rgb(C.bg[2]));
  _bgGrad=g; _bgKey=key; return g;
}
function render(dt){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  Biome.update(dt); const C=Biome.c;
  ctx.fillStyle=bgGrad(C); ctx.fillRect(0,0,VW,VH);
  ctx.save(); Camera.apply(ctx);
  drawFloor(); drawFog(dt); drawWalls(); drawHazardFields(); drawHazard(dt);
  if(G.singularities && G.singularities.length) drawSingularities(ctx);
  // viewport cull: skip drawing entities fully off-camera (WORLD is 2400² but the screen is ~900px → most of a 100+ horde is off-screen)
  const vis=(x,y,m)=>x>=Camera.x-m && x<=Camera.x+VW+m && y>=Camera.y-m && y<=Camera.y+VH+m;
  for(const p of G.pickups){ if(!vis(p.x,p.y,40)) continue; p.draw(ctx); }
  for(const b of G.bullets){ if(!vis(b.x,b.y,40)) continue; b.draw(ctx); }
  for(const t of G.turrets) t.draw(ctx);
  for(const c of G.companions) c.draw(ctx);
  if(G.walls) for(const wl of G.walls){ ctx.save(); ctx.globalAlpha=U.clamp(wl.life/6,0,1)*0.85; ctx.fillStyle='rgba(120,200,255,0.42)'; ctx.strokeStyle='rgba(180,230,255,0.85)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(wl.x,wl.y,wl.r,0,TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
  // cull only simple off-screen fodder — NEVER cull a boss/champion or anything mid-telegraph (sniper beam / mortar markers / boss wind-up reach across the screen)
  for(const e of G.enemies){ if(!vis(e.x,e.y,e.r+40) && !e.boss && !e.champion && !(e.type==='sniper'&&e.sniperState==='aim') && !(e.mortars&&e.mortars.length) && !e._castT) continue; e.draw(ctx); }
  if(G.player){ G.player.draw(ctx); drawRelicOrbit(ctx); }   // player drawn LAST over the horde → never occluded in chaos (readability)
  if(G.state==='playing' && G.player){ const _t=G.player.aimTarget(); if(_t) drawReticle(_t); }
  for(const b of G.enemyBullets){ if(!vis(b.x,b.y,40)) continue; b.draw(ctx); }
  if(G.strikes && G.strikes.length) drawStrikes();
  Particles.draw(ctx); drawFloats();
  ctx.restore();
  drawAmbient(dt); drawGrade(); drawHazardScreen();
  if(G.state==='playing'){ const vis = G.zoneDark || ((G.bfx&&G.bfx.kind==='lowvis')?(G.bfx.vis||0.62):0); if(vis) drawLowVis(vis); }
  if(G.state==='playing'){ drawHitDir(dt); drawIndicators(); drawTouchUI(); }
  if(G.state==='playing' && G.player && G.player._odTier>=1) drawOverdrive(G.player._odTier);
  drawVignette();
  if(G.flash>0){ ctx.fillStyle=`rgba(${G.flashColor||'255,40,40'},${G.flash*0.5})`; ctx.fillRect(0,0,VW,VH); }
  // standing-in-a-damaging-field edge tint (acid/lava/spore) — makes environmental damage unmistakable
  if(G._envHazT>0 && G._envHaz){ const c=G._envHaz, a=0.22*U.clamp(G._envHazT/0.3,0,1);
    const v=ctx.createRadialGradient(VW/2,VH/2,Math.min(VW,VH)*0.32, VW/2,VH/2,Math.max(VW,VH)*0.7);
    v.addColorStop(0,`rgba(${c[0]},${c[1]},${c[2]},0)`); v.addColorStop(1,`rgba(${c[0]},${c[1]},${c[2]},${a})`);
    ctx.fillStyle=v; ctx.fillRect(0,0,VW,VH); }
  // low-HP danger edges (pulses faster + heartbeat audio as HP drops; intensifies in the critical band)
  if(G.state==='playing' && G.player && G.player.hp/G.player.maxHp<0.35){
    const crit=G.player.hp/G.player.maxHp<0.18;
    const a=(crit?0.22:0.16)+0.14*Math.sin(G.time*(crit?11:8));
    const v=ctx.createRadialGradient(VW/2,VH/2,Math.min(VW,VH)*0.30, VW/2,VH/2,Math.max(VW,VH)*0.72);
    v.addColorStop(0,'rgba(255,0,0,0)'); v.addColorStop(1,'rgba(255,0,0,'+a+')');
    ctx.fillStyle=v; ctx.fillRect(0,0,VW,VH);
    G._hb=(G._hb||0)-dt; if(G._hb<=0){ G._hb=crit?0.55:0.85; if(window.Audio2&&Audio2.blip) Audio2.blip(crit?120:90,0.09,'sine',0.16); }
  }
}
function drawGrade(){
  const g=Biome.c.grade; if(!g) return; ctx.save();
  ctx.globalCompositeOperation='multiply';
  ctx.fillStyle=`rgb(${Math.round(255*Math.min(1,g[0]))},${Math.round(255*Math.min(1,g[1]))},${Math.round(255*Math.min(1,g[2]))})`;
  ctx.globalAlpha=0.5; ctx.fillRect(0,0,VW,VH);
  ctx.globalCompositeOperation='screen';
  ctx.fillStyle=`rgb(${Math.round(255*Math.max(0,g[0]-1))},${Math.round(255*Math.max(0,g[1]-1))},${Math.round(255*Math.max(0,g[2]-1))})`;
  ctx.globalAlpha=0.45; ctx.fillRect(0,0,VW,VH); ctx.restore();
}
function drawFloor(){
  const C=Biome.c;
  const x0=Math.floor(Camera.x/120)*120, y0=Math.floor(Camera.y/120)*120;
  ctx.strokeStyle=rgb(C.grid,C.gridA); ctx.lineWidth=1; ctx.beginPath();
  for(let x=x0;x<Camera.x+VW+120;x+=120){ ctx.moveTo(x,Camera.y-10); ctx.lineTo(x,Camera.y+VH+10); }
  for(let y=y0;y<Camera.y+VH+120;y+=120){ ctx.moveTo(Camera.x-10,y); ctx.lineTo(Camera.x+VW+10,y); }
  ctx.stroke();
  const dt=C.decorTint;
  for(const d of G.decor){
    if(d.x<Camera.x-40||d.x>Camera.x+VW+40||d.y<Camera.y-40||d.y>Camera.y+VH+40) continue;
    ctx.save(); ctx.translate(d.x,d.y); ctx.rotate(d.rot);
    const tint=`rgba(${dt[0]},${dt[1]},${dt[2]},${d.shade})`;
    if(d.kind===0){ ctx.fillStyle=tint; ctx.fillRect(-d.r,-d.r*0.5,d.r*2,d.r); }
    else if(d.kind===1){ ctx.fillStyle=tint; ctx.beginPath(); ctx.arc(0,0,d.r,0,TAU); ctx.fill(); }
    else if(d.kind===2){ ctx.fillStyle=tint; ctx.beginPath(); ctx.moveTo(-d.r,d.r*0.6);ctx.lineTo(0,-d.r);ctx.lineTo(d.r,d.r*0.6);ctx.closePath();ctx.fill(); }
    else if(d.kind===3){ ctx.fillStyle=`rgba(0,0,0,${d.shade*1.6})`; ctx.beginPath(); ctx.arc(0,0,d.r,0,TAU); ctx.fill(); ctx.strokeStyle=tint; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,d.r*0.8,0,TAU); ctx.stroke(); }
    else if(d.kind===5){ ctx.fillStyle=tint; for(let k=-1;k<=1;k++){ const h=d.r*(1.25-Math.abs(k)*0.45); ctx.beginPath(); ctx.moveTo(k*d.r*0.55-d.r*0.28,d.r*0.4); ctx.lineTo(k*d.r*0.55,-h); ctx.lineTo(k*d.r*0.55+d.r*0.28,d.r*0.4); ctx.closePath(); ctx.fill(); } }   // crystals (ice/glass/sand)
    else if(d.kind===6){ ctx.fillStyle=tint; ctx.strokeStyle=tint; ctx.lineWidth=d.r*0.36; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(-d.r*0.7,0); ctx.lineTo(d.r*0.7,0); ctx.stroke(); for(const s of [-1,1]){ ctx.beginPath(); ctx.arc(s*d.r*0.72,-d.r*0.26,d.r*0.26,0,TAU); ctx.fill(); ctx.beginPath(); ctx.arc(s*d.r*0.72,d.r*0.26,d.r*0.26,0,TAU); ctx.fill(); } ctx.lineCap='butt'; }   // bones (crypt/bone)
    else if(d.kind===7){ const w=Biome.c.wall||[255,120,40]; ctx.strokeStyle=`rgba(${w[0]},${w[1]},${w[2]},${Math.min(0.4,d.shade*2.4)})`; ctx.lineWidth=2; ctx.beginPath(); let vx=-d.r,vy=0; ctx.moveTo(vx,vy); for(let k=0;k<4;k++){ vx+=d.r*0.5; vy=(k%2?1:-1)*d.r*0.32; ctx.lineTo(vx,vy); } ctx.stroke(); }   // glowing veins (lava)
    else if(d.kind===8){ ctx.fillStyle=`rgba(${dt[0]},${dt[1]},${dt[2]},${d.shade*0.55})`; ctx.fillRect(-d.r*0.16,0,d.r*0.32,d.r*0.55); ctx.fillStyle=tint; ctx.beginPath(); ctx.arc(0,0,d.r*0.85,Math.PI,0); ctx.closePath(); ctx.fill(); }   // mushroom caps (swamp/toxic/fungal)
    else { ctx.strokeStyle=`rgba(${dt[0]*0.4|0},${dt[1]*0.4|0},${dt[2]*0.4|0},${d.shade*1.8})`; ctx.lineWidth=2; for(let k=0;k<4;k++){ ctx.beginPath(); ctx.moveTo(0,0); const a=k/4*TAU+d.rot; ctx.lineTo(Math.cos(a)*d.r,Math.sin(a)*d.r); ctx.stroke(); } }
    ctx.restore();
  }
}
function drawFog(dt){
  const C=Biome.c;
  for(const f of G.fog){
    f.x+=f.vx*dt; f.y+=f.vy*dt;
    if(f.x<-f.r)f.x=WORLD+f.r; if(f.x>WORLD+f.r)f.x=-f.r; if(f.y<-f.r)f.y=WORLD+f.r; if(f.y>WORLD+f.r)f.y=-f.r;
    if(f.x<Camera.x-f.r||f.x>Camera.x+VW+f.r||f.y<Camera.y-f.r||f.y>Camera.y+VH+f.r) continue;
    const col=C.fog[f.hi];
    const g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r);
    g.addColorStop(0,`rgba(${col[0]},${col[1]},${col[2]},${C.fogA})`); g.addColorStop(1,`rgba(${col[0]},${col[1]},${col[2]},0)`);
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,TAU); ctx.fill();
  }
}
function drawWalls(){
  const C=Biome.c, w=C.wall;
  ctx.strokeStyle=rgb(w,0.5); ctx.lineWidth=4; ctx.shadowBlur=C.wallGlow; ctx.shadowColor=rgb(w);
  ctx.strokeRect(WALL,WALL,WORLD-WALL*2,WORLD-WALL*2); ctx.shadowBlur=0;
  ctx.strokeStyle=rgb(w,0.12); ctx.lineWidth=2; ctx.strokeRect(WALL-12,WALL-12,WORLD-(WALL-12)*2,WORLD-(WALL-12)*2);
}
function genHazards(){
  G.hazards.length=0;
  const hm=(G.hazardMul||1);
  let h=Biome.cur.hazard;
  if(!h && hm>1) h='acid';   // MINEFIELD zone: ensure there ARE hazards even in an otherwise clean biome
  if(!h) return;
  const spec = {
    acid:   {kind:'pool',   n:5, r:[70,120], dps:18, slow:0.55, col:[156,210,40]},
    rad:    {kind:'zone',   n:3, r:[110,170], dps:18, slow:1,    col:[120,220,255]},
    lava:   {kind:'pillar', n:6, r:[40,60],  dps:55, slow:1,    col:[255,120,40], period:[2.4,3.6]},
    frost:  {kind:'pool',   n:4, r:[90,140], dps:10, slow:0.4,  col:[160,210,255]},
    tar:    {kind:'pool',   n:6, r:[80,150], dps:6,  slow:0.35, col:[80,110,70]},
    embers: {kind:'pillar', n:4, r:[36,52],  dps:44, slow:1,    col:[255,150,60], period:[2.8,4.0]},
    fallout:{kind:'zone',   n:4, r:[100,150],dps:22, slow:0.7,  col:[150,255,200]},
    crypt:  {kind:'pool',   n:5, r:[70,120], dps:18, slow:0.6,  col:[170,140,220]},
    flood:  {kind:'pool',   n:5, r:[120,200],dps:0,  slow:0.5,  col:[110,180,210]},
    haze:null, pulse:null,
  }[h];
  if(!spec) return;
  const n=Math.round(spec.n*hm);   // MINEFIELD zone packs the field with more of them
  for(let i=0;i<n;i++){
    const r=U.rand(spec.r[0],spec.r[1]);
    G.hazards.push({ kind:spec.kind, x:U.rand(WALL+r,WORLD-WALL-r), y:U.rand(WALL+r,WORLD-WALL-r),
      r, dps:spec.dps, slow:spec.slow, col:spec.col, phase:U.rand(TAU),
      period: spec.period?U.rand(spec.period[0],spec.period[1]):0, on:true, t:0 });
  }
}
function updateHazards(dt){
  if(!G.hazards.length) return; const p=G.player; if(!p) return;
  for(const z of G.hazards){
    if(z.kind==='pillar'){ z.t+=dt; z.on=(z.t%z.period)<1.1;
      if(z.on && U.chance(0.5) && !G.lowFx) Particles.emit(z.x+U.rand(-z.r,z.r),z.y,0,U.rand(-120,-60),U.rand(0.4,0.7),U.rand(3,6),rgb(z.col),{glow:true,grav:-30}); }
    else if(z.kind==='zone'){ z.x=U.clamp(z.x+Math.cos(z.phase)*48*dt,WALL+z.r,WORLD-WALL-z.r); z.y=U.clamp(z.y+Math.sin(z.phase)*48*dt,WALL+z.r,WORLD-WALL-z.r); z.phase+=dt*0.3; }
    if(!z.on) continue;
    if(U.dist(z.x,z.y,p.x,p.y) < z.r+p.r){
      if(z.slow<1) p._hazSlow=Math.min(p._hazSlow||1, z.slow);
      if(z.dps>0 && p.dashActive<=0){
        // reliable ticking field damage (own cooldown, NOT throttled by the melee-invuln) + clear feedback
        z._acc=(z._acc||0)+z.dps*dt; z._tk=(z._tk||0)-dt;
        if(z._tk<=0 && z._acc>=2){ z._tk=0.35; const d=Math.round(z._acc); z._acc=0;
          p.fieldDamage(d*G.diff.dmg, 'hazard');
          if(window.Audio2&&Audio2.blip) Audio2.blip(140,0.04,'sawtooth',0.10);
          if(!G.lowFx) Particles.emit(p.x+U.rand(-12,12),p.y+U.rand(-8,8),U.rand(-26,26),U.rand(-50,-14),0.4,3,rgb(z.col),{drag:0.92,glow:true});
          G._envHaz=[255,80,70]; G._envHazT=0.3;   // 'you're taking field damage' edge tint is ALWAYS the danger hue (not the field's own colour, which could be cyan/green = friendly)
        }
      }
    }
  }
}
function drawHazardFields(){
  for(const z of G.hazards){
    if(z.x<Camera.x-z.r||z.x>Camera.x+VW+z.r||z.y<Camera.y-z.r||z.y>Camera.y+VH+z.r) continue;
    const a=z.on ? (z.kind==='pillar'?0.5:0.22) : 0.06;
    const g=ctx.createRadialGradient(z.x,z.y,z.r*0.2,z.x,z.y,z.r);
    g.addColorStop(0,`rgba(${z.col[0]},${z.col[1]},${z.col[2]},${a})`); g.addColorStop(1,`rgba(${z.col[0]},${z.col[1]},${z.col[2]},0)`);
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(z.x,z.y,z.r,0,TAU); ctx.fill();
    if(z.dps>0){   // DAMAGING field → dashed red 'stay out' rim (reserved danger hue, independent of the field's own colour)
      ctx.save(); ctx.setLineDash([9,7]); ctx.lineWidth=2.5; ctx.strokeStyle=`rgba(255,80,90,${0.4+(z.on?0.25:0)})`;
      ctx.beginPath(); ctx.arc(z.x,z.y,z.r*0.92,0,TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    } else if(z.kind==='pool'){   // SAFE water (flood, dps 0) → soft solid rim, reads as harmless
      ctx.strokeStyle=`rgba(${z.col[0]},${z.col[1]},${z.col[2]},${a*1.2})`; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(z.x,z.y,z.r*0.9+Math.sin(G.time*2+z.phase)*4,0,TAU); ctx.stroke();
    }
  }
}
function drawHazard(dt){
  const h=Biome.c.hazard; if(!h) return; hazPulse+=dt;
  if(h==='rad'){ if(U.chance(0.5)){ const x=Camera.x+U.rand(0,VW), y=Camera.y+U.rand(0,VH); Particles.emit(x,y,U.rand(-10,10),U.rand(-30,-10),U.rand(0.3,0.6),U.rand(1,2),'#79e4ff',{glow:true,drag:0.96}); } }
  else if(h==='acid'){ if(U.chance(0.4)){ const d=U.pick(G.decor); if(d && d.x>Camera.x&&d.x<Camera.x+VW&&d.y>Camera.y&&d.y<Camera.y+VH) Particles.emit(d.x,d.y,U.rand(-6,6),U.rand(-26,-12),U.rand(0.4,0.8),U.rand(1,3),'#7bff5a',{glow:true,grav:-20,drag:0.97}); } }
}
function drawHazardScreen(){
  const h=Biome.c.hazard; if(!h) return;
  if(h==='haze'){ const a=0.10+0.05*Math.sin(hazPulse*0.8); const g=ctx.createLinearGradient(0,0,VW,0); g.addColorStop(0,`rgba(210,180,120,${a})`); g.addColorStop(0.5,`rgba(210,180,120,${a*0.4})`); g.addColorStop(1,`rgba(210,180,120,${a})`); ctx.fillStyle=g; ctx.fillRect(0,0,VW,VH); }
  else if(h==='pulse'){ const a=0.04+0.035*Math.sin(hazPulse*2.2); ctx.fillStyle=`rgba(180,20,30,${a})`; ctx.fillRect(0,0,VW,VH); }
}
/* ---------------------- BIOME FX RUNTIME (strikes + spores + filtered hazards) ---------------------- */
function updateBiomeFx(dt){
  const fx=G.bfx; const p=G.player; if(!p) return;
  if(fx){
    // periodic telegraphed area attacks: lava ERUPTIONS, storm LIGHTNING, toxic/fungal SPORE pools
    if(fx.kind==='erupt' || fx.kind==='storm' || fx.kind==='spores'){
      G._bfxT=(G._bfxT||0)-dt;
      if(G._bfxT<=0){
        if(fx.kind==='spores'){
          G._bfxT=U.rand(1.6,2.8);
          if(G.hazards.length<16){ const a=U.rand(TAU), dist=U.rand(40,200);
            const x=U.clamp(p.x+Math.cos(a)*dist,WALL+90,WORLD-WALL-90), y=U.clamp(p.y+Math.sin(a)*dist,WALL+90,WORLD-WALL-90);
            G.hazards.push({ kind:'pool', x, y, r:U.rand(70,108), dps:22, slow:0.62, col:[156,210,40], phase:U.rand(TAU), period:0, on:true, t:0, life:7 }); }
        } else {
          G._bfxT=(fx.period||3)*U.rand(0.75,1.25);
          const a=U.rand(TAU), dist=fx.kind==='storm'?U.rand(0,300):U.rand(60,250);
          const x=U.clamp(p.x+Math.cos(a)*dist,WALL+60,WORLD-WALL-60), y=U.clamp(p.y+Math.sin(a)*dist,WALL+60,WORLD-WALL-60);
          G.strikes.push({ kind:fx.kind, x, y, r:fx.kind==='storm'?64:76, tele:fx.kind==='storm'?0.5:0.8, t:0, hit:false, dmg:fx.kind==='storm'?22:30, seed:(G.strikes.length*53)%97 });
          if(fx.kind==='storm' && window.Audio2&&Audio2.blip) Audio2.blip(200,0.05,'square',0.08);
        }
      }
    }
  }
  // advance strikes: telegraph → detonate once → fade
  if(G.strikes.length){
    for(const s of G.strikes){ s.t+=dt;
      if(!s.hit && s.t>=s.tele){ s.hit=true;
        const _sd=U.dist(s.x,s.y,p.x,p.y); if(_sd<260) Camera.shake((s.kind==='storm'?7:6)*(1-_sd/260),0.2);   // only shake if the eruption/bolt is NEAR you (distant = no shake, so it never reads as damage)
        if(window.Audio2&&Audio2.explosion) Audio2.explosion();
        Particles.burst(s.x,s.y, s.kind==='storm'?26:30, s.kind==='storm'?'#bcd2ff':'#ff7a2d',{speed:280,life:0.5,size:5});
        if(p.invuln<=0 && p.dashActive<=0 && U.dist(s.x,s.y,p.x,p.y)<s.r+p.r) p.hurt(s.dmg*G.diff.dmg,s.x,s.y,s.kind);
        for(const e of G.enemies){ if(!e.boss && !e.dead && U.dist(s.x,s.y,e.x,e.y)<s.r+e.r) e.damage(s.dmg*1.3,s.x,s.y); }   // lava/bolts burn enemies too
      }
    }
    G.strikes=G.strikes.filter(s=> s.t < s.tele+0.45);
  }
  // decay timed spore pools (genHazards pools have no life and persist the whole sector)
  if(G.hazards.length) G.hazards=G.hazards.filter(z=> z.life===undefined || (z.life-=dt)>0);
}
function drawStrikes(){
  for(const s of G.strikes){
    const col=s.kind==='storm'?'120,160,255':'255,120,40';
    if(!s.hit){ const k=U.clamp(s.t/s.tele,0,1);
      ctx.strokeStyle=`rgba(${col},${0.30+0.55*k})`; ctx.lineWidth=2+3*k;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r*(1.12-0.4*k),0,TAU); ctx.stroke();
      ctx.fillStyle=`rgba(${col},${0.08+0.18*k})`; ctx.beginPath(); ctx.arc(s.x,s.y,s.r*0.55*k+4,0,TAU); ctx.fill();
      if(s.kind==='storm' && k>0.4){ ctx.strokeStyle=`rgba(${col},${0.5+0.4*k})`; ctx.lineWidth=2;
        ctx.beginPath(); let xx=s.x, yy=s.y-s.r*2.4; ctx.moveTo(xx,yy);
        for(let i=0;i<5;i++){ xx += (i%2?-1:1)*(5+((s.seed+i*7)%10)); yy+=s.r*0.5; ctx.lineTo(xx,yy); } ctx.stroke(); }
    } else { const k=U.clamp((s.t-s.tele)/0.45,0,1);   // detonation: expanding shockwave ring + soft core
      ctx.fillStyle=`rgba(${col},${0.30*(1-k)})`; ctx.beginPath(); ctx.arc(s.x,s.y,s.r*(0.55+0.55*k),0,TAU); ctx.fill();
      ctx.strokeStyle=`rgba(${col},${0.75*(1-k)})`; ctx.lineWidth=3+5*(1-k); ctx.beginPath(); ctx.arc(s.x,s.y,s.r*(0.7+0.6*k),0,TAU); ctx.stroke(); }
  }
}
// OVERDRIVE screen feedback: a warm pulsing edge-glow that intensifies with the kill-streak tier
function drawOverdrive(tier){
  const a=(0.10+tier*0.06)*(0.8+0.2*Math.sin(G.time*9));
  const g=ctx.createRadialGradient(VW/2,VH/2,Math.min(VW,VH)*0.42, VW/2,VH/2,Math.max(VW,VH)*0.72);
  g.addColorStop(0,'rgba(255,150,40,0)'); g.addColorStop(1,`rgba(255,${130-tier*20},30,${a})`);
  ctx.fillStyle=g; ctx.fillRect(0,0,VW,VH);
}
function drawSingularities(ctx){
  for(const s of G.singularities){
    const remain=s.life-s.t, lf=window.G&&G.lowFx;
    ctx.save(); ctx.translate(s.x,s.y);
    ctx.strokeStyle='rgba(176,107,255,0.22)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,s.r,0,TAU); ctx.stroke();   // pull radius
    if(!lf){ ctx.shadowBlur=26; ctx.shadowColor='#b06bff'; }
    const core=18+(1-U.clamp(remain/s.life,0,1))*8;
    ctx.fillStyle='#180a2e'; ctx.beginPath(); ctx.arc(0,0,core,0,TAU); ctx.fill();   // event horizon
    ctx.strokeStyle='#c79bff'; ctx.lineWidth=3;
    for(let i=0;i<3;i++){ const a0=G.time*3.2+i/3*TAU; ctx.beginPath(); ctx.arc(0,0,core+7+i*5,a0,a0+1.7); ctx.stroke(); }   // accretion arcs
    if(remain<0.45){ const k=1-remain/0.45; ctx.strokeStyle='rgba(255,255,255,'+(0.75*k)+')'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0, s.r*0.6*(1-k)+core, 0, TAU); ctx.stroke(); }   // implosion telegraph: contracting ring
    ctx.restore(); ctx.shadowBlur=0;
  }
}
function drawLowVis(vis){
  const p=G.player; if(!p) return; const sx=p.x-Camera.x, sy=p.y-Camera.y;
  const rad=Math.min(VW,VH)*0.5*U.clamp(vis,0.4,0.9);
  const g=ctx.createRadialGradient(sx,sy,rad*0.5,sx,sy,rad*1.7);
  g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,0.78)');
  ctx.fillStyle=g; ctx.fillRect(0,0,VW,VH);
}
function drawFloats(){
  ctx.textAlign='center';
  for(const f of G.floats){ ctx.globalAlpha=U.clamp(f.life/0.9,0,1); ctx.fillStyle=f.color;
    const punch=1+U.clamp((f.life-0.78)/0.12,0,1)*0.45;   // brief ease-out 'pop' on spawn
    if(!G.lowFx && f.sz>1.6){ ctx.shadowBlur=10; ctx.shadowColor=f.color; } else { ctx.shadowBlur=8; ctx.shadowColor='#000'; }
    ctx.font=`bold ${Math.round((f.crit?24:16)*(f.sz||1)*punch)}px system-ui, sans-serif`; ctx.fillText(f.val,f.x,f.y); }
  ctx.globalAlpha=1; ctx.shadowBlur=0;
}
function drawAmbient(dt){
  const a=Biome.c.amb; if(!a) return; const col=a.col, dir=a.dir;
  ctx.fillStyle=`rgba(${col[0]},${col[1]},${col[2]},1)`;
  for(const p of G.ash){
    const v=a.v*p.base, drift=a.drift*p.base; p.y+=v*dt; p.x+=drift*dt;
    if(dir==='side'){ if(p.x>VW){p.x=-4;p.y=U.rand(0,VH);} if(p.x<-6)p.x=VW; }
    else { if(p.y>VH){p.y=-4;p.x=U.rand(0,VW);} if(p.y<-6){p.y=VH;p.x=U.rand(0,VW);} if(p.x<0)p.x=VW; if(p.x>VW)p.x=0; }
    ctx.globalAlpha=p.a*a.a;
    if(dir==='side'){ ctx.fillRect(p.x,p.y,p.s*3,p.s*0.7); } else { ctx.beginPath(); ctx.arc(p.x,p.y,p.s,0,TAU); ctx.fill(); }
  }
  ctx.globalAlpha=1;
}
function drawVignette(){
  const vate=Biome.c.vate||0.72, key=VW+'x'+VH+'|'+vate.toFixed(3);
  if(!(Biome.t>=1 && _vigGrad && _vigKey===key)){
    const v=ctx.createRadialGradient(VW/2,VH/2,Math.min(VW,VH)*0.35, VW/2,VH/2,Math.max(VW,VH)*0.75);
    v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,`rgba(0,0,0,${vate})`);
    _vigGrad=v; _vigKey=key;
  }
  ctx.fillStyle=_vigGrad; ctx.fillRect(0,0,VW,VH);
}
function drawIndicators(){
  const cx=VW/2, cy=VH/2, mx=VW/2-30, my=VH/2-30;
  const arrow=(wx,wy,color,size)=>{
    const sx=wx-Camera.x, sy=wy-Camera.y; if(sx>=-8&&sx<=VW+8&&sy>=-8&&sy<=VH+8) return false;
    const ang=Math.atan2(sy-cy,sx-cx), ex=cx+Math.cos(ang)*mx, ey=cy+Math.sin(ang)*my;
    ctx.save(); ctx.translate(ex,ey); ctx.rotate(ang); ctx.fillStyle=color; ctx.shadowBlur=10; ctx.shadowColor=color;
    ctx.beginPath(); ctx.moveTo(size,0); ctx.lineTo(-size*0.7,-size*0.7); ctx.lineTo(-size*0.7,size*0.7); ctx.closePath(); ctx.fill(); ctx.restore(); return true;
  };
  // PRIORITY first (never crowded out): boss → fleeing loot → champion → elite, THEN a few generic so the edge isn't a ring of noise
  if(G.bossRef && !G.bossRef.dead) arrow(G.bossRef.x,G.bossRef.y,'#ff2d3a',16);
  for(const e of G.enemies){ if(e.cfg&&e.cfg.looter&&!e.dead) arrow(e.x,e.y,'#ffd24d',13); }
  for(const e of G.enemies){ if(e.champion&&!e.dead&&!e.boss) arrow(e.x,e.y,'rgba(255,91,45,0.95)',13); }
  for(const e of G.enemies){ if(e.elite&&!e.champion&&!e.boss) arrow(e.x,e.y,'rgba(255,210,77,0.9)',11); }
  let drawn=0;
  for(const e of G.enemies){ if(e.boss||e.elite||e.champion||(e.cfg&&e.cfg.looter)) continue; if(drawn>=6) break; if(arrow(e.x,e.y,'rgba(255,90,90,0.6)',8)) drawn++; }
  ctx.shadowBlur=0;
}
// directional damage tell: a red arc on the screen edge pointing at whatever just hurt you (fades ~0.7s)
function drawHitDir(dt){
  if(!G._hitDirT || G._hitDirT<=0) return;
  G._hitDirT-=dt;
  const k=U.clamp(G._hitDirT/0.7,0,1), ang=G._hitDir||0;
  const cx=VW/2, cy=VH/2, rad=Math.min(VW,VH)*0.5-18, span=0.5;
  ctx.save();
  ctx.lineCap='round'; ctx.lineWidth=10;
  ctx.strokeStyle=`rgba(255,60,60,${0.7*k})`;
  if(!G.lowFx){ ctx.shadowBlur=18; ctx.shadowColor='rgba(255,40,40,0.9)'; }
  ctx.beginPath(); ctx.arc(cx,cy,rad,ang-span,ang+span); ctx.stroke();
  ctx.restore(); ctx.shadowBlur=0;
}
// targeting bracket on the auto-aimed enemy (world space)
function drawReticle(e){
  const r=e.r+9, wob=Math.sin(G.time*4)*0.08, g=r*0.5;
  ctx.save(); ctx.translate(e.x,e.y); ctx.rotate(wob);
  ctx.strokeStyle='rgba(255,210,90,0.85)'; ctx.lineWidth=2;
  if(!G.lowFx){ ctx.shadowBlur=6; ctx.shadowColor='#ffd24d'; }
  for(const [sx,sy] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
    ctx.beginPath(); ctx.moveTo(sx*r, sy*r-sy*g); ctx.lineTo(sx*r, sy*r); ctx.lineTo(sx*r-sx*g, sy*r); ctx.stroke();
  }
  ctx.restore(); ctx.shadowBlur=0;
}
// visible virtual joysticks (mobile)
function drawTouchUI(){
  if(Input.joyActive){
    const ox=Input.joyOX, oy=Input.joyOY, R=Input.joyRadius;
    let kx=Input.joyX-ox, ky=Input.joyY-oy; const len=Math.hypot(kx,ky); if(len>R){ kx=kx/len*R; ky=ky/len*R; }
    ctx.fillStyle='rgba(8,12,18,0.28)'; ctx.beginPath(); ctx.arc(ox,oy,R,0,TAU); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.20)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(ox,oy,R,0,TAU); ctx.stroke();
    ctx.fillStyle='rgba(255,179,77,0.42)'; ctx.beginPath(); ctx.arc(ox+kx,oy+ky,R*0.44,0,TAU); ctx.fill();
    ctx.strokeStyle='rgba(255,179,77,0.85)'; ctx.beginPath(); ctx.arc(ox+kx,oy+ky,R*0.44,0,TAU); ctx.stroke();
  }
  if(Input.aimTouch.active){
    const ox=Input.aimTouch.ox, oy=Input.aimTouch.oy, R=58;
    let kx=Input.aimTouch.x-ox, ky=Input.aimTouch.y-oy; const len=Math.hypot(kx,ky); if(len>R){ kx=kx/len*R; ky=ky/len*R; }
    ctx.strokeStyle='rgba(70,230,255,0.22)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(ox,oy,R,0,TAU); ctx.stroke();
    ctx.fillStyle='rgba(70,230,255,0.32)'; ctx.beginPath(); ctx.arc(ox+kx,oy+ky,R*0.42,0,TAU); ctx.fill();
  }
}

/* ---------------------- HUD / DOM ---------------------- */
function el(id){ return document.getElementById(id); }
function show(id){ const e=el(id); if(e) e.classList.remove('hidden'); }
function hide(id){ const e=el(id); if(e) e.classList.add('hidden'); }
function hideAllScreens(){ ['hud','titleScreen','shopScreen','challengesScreen','charScreen','settingsScreen','upgradeScreen','eventScreen','pauseScreen','gameoverScreen','confirmWipe','playSetupScreen','progressScreen','statsScreen','achScreen','codexScreen','cosmeticsScreen','relicScreen','dailyModal','marketScreen'].forEach(hide); }
function buildEventCard(ev){
  const c=el('eventCard'); if(!c) return;
  const _e=_T()&&EN_EVENT[ev.id];
  // cost events spend RUN scrap (G.scrap); the in-game HUD is hidden here, so show the player's balance on the card
  const wallet = ev.can ? `<div class="ev-wallet"><span class="hex">⬢</span> ${UL('hai','you have')} <b>${G.scrap}</b> ${UL('rottami','scrap')}</div>` : '';
  c.innerHTML=`<div class="ev-ico">${ev.ico}</div><div class="ev-name">${TN(EN_EVENT,ev)}</div><div class="ev-desc">${TD(EN_EVENT,ev)}</div>${wallet}`;
  const tk=el('evTake'); if(tk){ tk.textContent=(_e&&_e.take)||ev.take||(_T()?'CHOOSE':'SCEGLI');
    const afford=!(ev.can && !ev.can()); tk.disabled=!afford; tk.classList.toggle('cant', !afford); }   // grey out when unaffordable
  const sk=el('evSkip'); if(sk) sk.classList.toggle('hidden', !!ev.autoGood);
  if(sk && ev.skip) sk.textContent=(_e&&_e.skip)||ev.skip;
}

function syncHud(){
  const p=G.player; if(!p) return;
  { const hr=p.hp/p.maxHp, hf=el('hpFill'); hf.style.width=(hr*100)+'%'; hf.classList.toggle('low', hr<0.35); hf.classList.toggle('crit', hr<0.18); el('hpText').textContent=Math.ceil(p.hp); }   // bar turns amber in the low band, pulses red in the critical band
  el('score').textContent=G.score;
  { const rs=el('runScrap'); if(rs){ const b=rs.querySelector('b'); if(b) b.textContent=G.scrap; } }   // run-scrap counter (events spend this)
  const c=el('combo'); if(G.combo>=5){ c.classList.remove('hidden'); c.textContent='x'+(1+Math.floor(G.combo/5)*0.5).toFixed(1); } else c.classList.add('hidden');
  el('dashFill').style.width=(U.clamp(1-(p.dashTimer/p.dashCd),0,1)*100)+'%';
  el('dashBtn').classList.toggle('cooling', p.dashTimer>0);
  if(el('weaponIco')) el('weaponIco').textContent=p.weapon.ico;
  if(el('weaponName')) el('weaponName').textContent=(typeof TN==='function'&&typeof EN_WEAPON!=='undefined')?TN(EN_WEAPON,p.weapon):p.weapon.name;
  if(el('abRing')){ const cd=p.abCdMax||p.ability.cd*(p.abCdMul||1); const ar=U.clamp(1-(p.abCd/cd),0,1); el('abRing').style.strokeDasharray=`${ar*107} 107`; el('abilityBtn').classList.toggle('ready', p.abCd<=0); el('abilityIco').textContent=p.ability.ico; }
  if(el('abilityName')) el('abilityName').textContent=(typeof TN==='function'&&typeof EN_ABILITY!=='undefined')?TN(EN_ABILITY,p.ability):p.ability.name;   // ability label like the weapon chip (8+ abilities → easy to forget what tapping does)
  if(G.bossRef && !G.bossRef.dead){ const hr=U.clamp(G.bossRef.hp/G.bossRef.maxHp,0,1); el('bossHpFill').style.width=hr*100+'%';
    const bb=el('bossBar'); if(bb) bb.style.boxShadow = hr<0.25 ? ('0 0 '+(8+7*Math.sin(G.time*10))+'px rgba(255,60,60,0.85)') : ''; }
}
function showBossBar(boss){ const b=el('bossBar'); if(!b) return; el('bossName').textContent=trBoss(boss.bossName); el('bossHpFill').style.width='100%'; b.classList.remove('hidden'); }
function hideBossBar(){ const b=el('bossBar'); if(b) b.classList.add('hidden'); }
function updateWaveBar(){
  if(G.gmode && G.gmode.horde && !G.bossLevel){ const fr=U.clamp((G.runTime-(G._waveStart||0))/35,0,1); el('waveFill').style.width=(fr*100)+'%'; return; }
  if(G.bossLevel){ const boss=G.enemies.find(e=>e.boss); el('waveFill').style.width=boss?(1-boss.hp/boss.maxHp)*100+'%':'100%'; return; }
  const total=Math.round(Math.min(440,6+G.level*3.0)*((G.zoneTheme&&G.zoneTheme.qMul)||1));
  const killedFrac=1-(G.toSpawn+G.enemies.length)/total;
  el('waveFill').style.width=U.clamp(killedFrac*100,0,100)+'%';
}
let _bannerT;
function banner(big,small,warn){ if(typeof bannerTr==='function'){ big=bannerTr(big); small=bannerTr(small); } const w=el('bannerWrap'); w.innerHTML=`<div class="banner ${warn?'warn':''}">${big}<small>${small||''}</small></div>`; clearTimeout(_bannerT); _bannerT=setTimeout(()=>{w.innerHTML='';},1800); }   // tracked timer → back-to-back banners don't wipe each other early
function fmtTime(s){ const m=Math.floor(s/60),ss=Math.floor(s%60); return m+':'+(ss<10?'0':'')+ss; }
let _toastT;
function toast(msg){ const t=el('toast'); if(!t) return; t.textContent=msg; t.classList.remove('hidden'); clearTimeout(_toastT); _toastT=setTimeout(()=>t.classList.add('hidden'),1800); }
function openUrl(url){ try{ if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Browser) Capacitor.Plugins.Browser.open({url}); else window.open(url,'_blank'); }catch(e){ window.open(url,'_blank'); } }

function UL(it,en){ return _T()?en:it; }
function TDF(map,o,arg){ const e=_T()&&o&&map[o.id]; return (e&&e.desc)?e.desc(arg):o.desc(arg); }
function TC(kind,c,field){ const e=_T()&&EN_COSMETIC[kind+'_'+c.id]; return (e&&e[field])||c[field]; }
const EN_META={
  armor:{name:'Armor',desc:l=>'+'+(l*18)+' max HP'},
  power:{name:'Ammo',desc:l=>'+'+(l*7)+'% damage'},
  trig:{name:'Trigger',desc:l=>'+'+(l*5)+'% rate'},
  burst:{name:'Burst',desc:l=>'Start with +'+l+' projectile'},
  speed:{name:'Boots',desc:l=>'+'+(l*4)+'% speed'},
  dash:{name:'Reflexes',desc:l=>'-'+(l*9)+'% dash cooldown'},
  magnet:{name:'Magnet',desc:l=>'+'+(l*22)+'% pickup radius'},
  regen:{name:'Nanomeds',desc:l=>'+'+(l*0.4).toFixed(1)+' HP/s'},
  greed:{name:'Looter',desc:l=>'+'+(l*12)+'% scrap'},
  aim:{name:'Scope',desc:l=>'+'+(l*3)+'% crit'},
  pen:{name:'Penetrator',desc:l=>'Bullets pierce +'+l+' enemy'},
  revive:{name:'Second Life',desc:l=>'Revive 1 time per run'},
};
const EN_CORESHOP={
  cs_relic:{name:'Merchant Pact',desc:l=>'Start each run with a random relic'},
  cs_reroll:{name:'Lucky Hand',desc:l=>'+'+l+' free upgrade reroll per run'},
  cs_cores:{name:'Refiner',desc:l=>'+'+(l*8)+'% Cores earned'},
  cs_scrap:{name:'Smuggler',desc:l=>'+'+(l*10)+'% scrap earned'},
  cs_head:{name:'Head Start',desc:l=>'Start free from sector '+(1+l*2)},
  cs_life:{name:'Spare Soul',desc:l=>'Revive +1 time per run'},
  cs_evo:{name:'Evolution Token',desc:l=>'Stronger weapon at run start (+'+(l*25)+'% damage, +'+(l*15)+'% rate)'},
  cs_drone:{name:'War Drone',desc:l=>'Start each run with '+l+' allied combat drone'+(l>1?'s':'')},
  cs_dronemed:{name:'Medic Drone',desc:l=>'Start each run with an allied healing drone'},
  cs_dronescrap:{name:'Salvage Drone',desc:l=>'Start each run with a scrap-collecting drone'},
  cs_unl_secondwind:{name:'Unlock: Last Breath',desc:l=>'Adds the Last Breath relic to the offer pool'},
  cs_unl_berserk:{name:'Unlock: Blood Fury',desc:l=>'Adds the Blood Fury relic to the offer pool'},
  cs_unl_avarice:{name:'Unlock: Avarice',desc:l=>'Adds the Avarice relic to the offer pool'},
};
const EN_EVO={
  pistol:{name:'Triplet'}, shotgun:{name:'Double Barrel'}, smg:{name:'Dual'}, railgun:{name:'Continuous Beam'},
  flamer:{name:'Inferno'}, launcher:{name:'Cluster'}, tesla:{name:'Storm'}, cryo:{name:'Absolute Zero'},
  minigun:{name:'Overload'}, scythe:{name:'Reaper'}, swarm:{name:'Hive'}, prism:{name:'Refraction'},
  marksman:{name:'Penetrator'}, hailstorm:{name:'Blizzard'}, ricochet:{name:'Chaos'},
};
const EN_THREAT={0:'Standard',1:'Threat I',2:'Threat II',3:'Threat III',4:'Threat IV',5:'Threat V',6:'Threat VI',7:'Threat VII',8:'Threat VIII',9:'Threat IX',10:'Cataclysm'};
const EN_COSMETIC={
  skin_default:{name:'STANDARD',desc:'Original survivor look.'},
  skin_ash:{name:'ASH',desc:'Ash-grey suit, plain and functional.'},
  skin_rust:{name:'RUST',desc:'Metal plating oxidized by the toxic desert.'},
  skin_toxic:{name:'CONTAMINATED',desc:'Corroded suit, green radioactive halo.'},
  skin_ember:{name:'EMBER',desc:'Glowing armor, halo of embers.'},
  skin_frost:{name:'FROST',desc:'Frosted armor, glacial halo.'},
  skin_void:{name:'VOID',desc:'Void fabric, violet halo.'},
  skin_gold:{name:'CATACLYSM',desc:'Gold alloy: for those who have seen the Cataclysm.'},
  skin_crimson:{name:'CRIMSON',desc:'Crimson armor, halo of blood.'},
  skin_spectral:{name:'SPECTRAL',desc:'Translucent spectral fabric.'},
  trail_default:{name:'STANDARD',desc:'Bullets of the equipped weapon.'},
  trail_amber:{name:'AMBER',desc:'Warm amber trail.'},
  trail_cyan:{name:'IONIC',desc:'Electric cyan trail.'},
  trail_tox:{name:'ACID',desc:'Phosphorescent acid trail.'},
  trail_plasma:{name:'PLASMA',desc:'Violet plasma trail.'},
  trail_blood:{name:'HEMORRHAGE',desc:'Blood-red trail.'},
  trail_gold:{name:'GOLDEN',desc:'Bright golden trail.'},
  trail_violet:{name:'VIOLET',desc:'Violet Void trail.'},
  trail_white:{name:'SPECTRE',desc:'Blinding white trail.'},
  fx_default:{name:'STANDARD',desc:'Classic death explosion.'},
  fx_cinder:{name:'CINDER',desc:'Burst of orange embers.'},
  fx_cryo:{name:'IMPLOSION',desc:'Glacial shockwave ring.'},
  fx_rad:{name:'FALLOUT',desc:'Radioactive ring detonation.'},
  fx_void:{name:'COLLAPSE',desc:'Void collapse, violet sparks.'},
  fx_super:{name:'SUPERNOVA',desc:'Blinding golden supernova.'},
  fx_shatter:{name:'SHATTER',desc:'Implosion of ice shards.'},
  fx_inferno:{name:'INFERNO',desc:'Orange infernal detonation.'},
  skin_obsidian:{name:'OBSIDIAN',desc:'Obsidian alloy with violet highlights.'},
  skin_solar:{name:'SOLAR',desc:'Solar armor, burning golden halo.'},
  trail_mint:{name:'MINT',desc:'Bright mint-green trail.'},
  trail_rose:{name:'ROSE',desc:'Electric pink trail.'},
  fx_quake:{name:'QUAKE',desc:'Seismic wave that tears the ground.'},
  fx_prism:{name:'PRISM',desc:'Iridescent prismatic shatter.'},
  skin_magma:{name:'MAGMA',desc:'Molten armor with veins of magma.'},
  skin_azure:{name:'AZURE',desc:'Azure alloy with clear-sky highlights.'},
  trail_ruby:{name:'RUBY',desc:'Deep ruby-red trail.'},
  fx_bloom:{name:'BLOOM',desc:'A burst of green spores.'},
};

function buildShop(){
  buildArsenal();
  const grid=el('shopGrid'); grid.innerHTML='';
  for(const it of META){
    const lvl=Store.lvl(it.id), maxed=lvl>=it.max, cost=Store.costOf(it);
    const card=document.createElement('div'); card.className='shop-card'+(maxed?' maxed':'');
    let dots=''; for(let i=0;i<it.max;i++) dots+=`<span class="dot${i<lvl?' on':''}"></span>`;
    const btn = maxed ? `<button class="shop-buy" disabled>${UL('MASSIMO','MAX')}</button>` : `<button class="shop-buy ${Store.scrap<cost?'cant':''}">⬢ ${cost}</button>`;
    card.innerHTML=`<div class="ico">${it.ico}</div><div class="name">${TN(EN_META,it)}</div><div class="desc">${TDF(EN_META,it,lvl+(maxed?0:1))}</div><div class="dots">${dots}</div>${btn}`;
    const bb=card.querySelector('.shop-buy');
    if(!maxed) bb.addEventListener('click',()=>{ if(Store.buy(it)){ Audio2.upgrade(); G.updateScrapUI(); buildShop(); } else Audio2.hurt(); });
    grid.appendChild(card);
  }
  // ascend / PRESTIGE — make it crystal-clear what it does (resets the shop, grants permanent %), with a confirm step
  const pr=Store.prestige, can=Store.canAscend();
  const asc=el('ascendBtn'); if(asc){ asc.classList.toggle('hidden', !can);
    asc.textContent = G._ascendArmed ? UL('⚠️ CONFERMA — azzeri il negozio','⚠️ CONFIRM — resets the shop')
                                     : UL('⭐ ASCENDI → Prestige '+(pr+1),'⭐ ASCEND → Prestige '+(pr+1)); }
  if(el('prestigeTag')) el('prestigeTag').textContent = pr>0 ? ('PRESTIGE '+pr) : '';
  const ai=el('ascendInfo');
  if(ai){
    const now = pr>0 ? (UL('Bonus attuale','Current')+': +'+Math.round(Math.min(pr*6,60))+'% HP/'+UL('danno','dmg')+', +'+Math.round(Math.min(pr*4,40))+'% '+UL('cadenza','rate')+', +'+Math.round(Math.min(pr*3,30))+'% '+UL('vel.','spd')+', +'+Math.round(pr*10)+'% '+UL('rottami','scrap')) : '';
    const what = UL('<b>ASCENDERE</b> azzera i potenziamenti del negozio ma dà <b>+1 Prestige</b> per sempre: +6% HP/danno, +4% cadenza, +3% velocità, +10% rottami a livello. I rottami restano.',
                    '<b>ASCENDING</b> resets your shop upgrades but grants <b>+1 Prestige</b> forever: +6% HP/dmg, +4% rate, +3% speed, +10% scrap per level. You keep your scrap.');
    ai.innerHTML = can ? (what + (pr>0?'<br>'+now:'')) : (pr>0 ? now+'<br>'+UL('Massimizza tutto il negozio per ascendere di nuovo.','Max out the whole shop to ascend again.') : UL('Massimizza tutti i potenziamenti per sbloccare l’<b>ASCESA</b>.','Max out every upgrade to unlock <b>ASCENSION</b>.'));
    ai.classList.remove('hidden');
  }
  buildCurrencyPacks();
}
// Real-money currency packs (consumable IAP). Mock grants instantly in browser; native billing hook lives in iap.js.
function buildCurrencyPacks(){
  const mk=(containerId,kind)=>{ const grid=el(containerId); if(!grid||!window.IAP||!IAP.packs) return; grid.innerHTML='';
    const ico = kind==='scrap'?'⬢':'⬡', col = kind==='scrap'?'#ffb24d':'#46e6ff';
    for(const p of IAP.packs){ if(p.kind!==kind) continue;
      const card=document.createElement('div'); card.className='shop-card';
      card.innerHTML=`<div class="ico" style="color:${col};text-shadow:0 0 10px ${col}">${ico}</div>`+
        `<div class="name">+${p.amount.toLocaleString()}</div>`+
        `<button class="shop-buy">${p.price}</button>`;
      const b=card.querySelector('.shop-buy');
      b.addEventListener('click',()=>{ b.disabled=true; b.textContent='…';
        IAP.buyPack(p.id).then(ok=>{ b.disabled=false; b.textContent=p.price;
          if(ok){ Audio2.levelup(); G.updateScrapUI(); buildShop(); if(typeof buildMarket==='function') buildMarket(); if(typeof toast==='function') toast('+'+p.amount+' '+ico); }
          else if(typeof toast==='function') toast(I18N.t('buyFail')); }); });
      grid.appendChild(card);
    }
  };
  mk('scrapPacks','scrap'); mk('corePacks','cores');
}
/* ---------------------- I18N CONTENT (EN per-id name/desc maps + helpers) ---------------------- */
function _T(){ return (typeof I18N!=='undefined' && I18N.lang==='en'); }
function TN(map,o){ const e=_T()&&o&&map[o.id]; return (e&&e.name)||o.name; }
function TD(map,o){ const e=_T()&&o&&map[o.id]; return (e&&e.desc)||o.desc; }
function TS(map,o){ const e=_T()&&o&&map[o.id]; return (e&&e.style)||o.style; }
function TL(map,o){ const e=_T()&&o&&map[o.id]; return (e&&e.lore)||o.lore; }
const EN_WEAPON={
  pistol:{name:'Drifter',desc:'Reliable pistol. Balanced, pierces with perks.'},
  shotgun:{name:'Scrapper',desc:'A fan of 6 pellets. Devastating up close.'},
  smg:{name:'Crackle',desc:'Very high rate, low damage. A meat grinder.'},
  railgun:{name:'Iron Lance',desc:'Charged: pierces everything in a straight line.'},
  flamer:{name:'Furnace',desc:'Short cone of flames. Ignites enemies.'},
  launcher:{name:'Thunder',desc:'Area grenades. Insane against hordes.'},
  tesla:{name:'Bolt',desc:'Lightning that arcs between nearby enemies.'},
  cryo:{name:'Frost',desc:'Bullets that freeze and slow enemies.'},
  minigun:{name:'Vendetta',desc:'Overheats: fire rate ramps to a continuous spray.'},
  scythe:{name:'Scythe',desc:'Short-range spinning blades. Cut in a fan.'},
  swarm:{name:'Swarm',desc:'A swarm of fast darts saturating the area.'},
  prism:{name:'Prism',desc:'A beam of light piercing in a straight line.'},
  marksman:{name:'Marksman',desc:'Precision rifle: rare but devastating, piercing shots.'},
  hailstorm:{name:'Hailstorm',desc:'A fan of icy shards. Slows hordes.'},
  ricochet:{name:'Ricochet',desc:'Discs that bounce from enemy to enemy: they clear hordes.'},
};
const EN_ABILITY={
  turret:{name:'Sentinel',desc:'Deploys a turret that fires for 8s.'},
  shock:{name:'Shockwave',desc:'AoE blast that knocks back and damages.'},
  slow:{name:'Distortion',desc:'Slows enemies by 70% for 4s.'},
  shield:{name:'Barrier',desc:'Invulnerable for 3s.'},
  bunker:{name:'Bunker',desc:'Raises a wall that blocks enemies for 6s.'},
  rally:{name:'Rally',desc:'Summons 2 sentinels and heals you 25%.'},
  nova:{name:'Supernova',desc:'Wide-radius detonation: massive damage and knockback.'},
  singularity:{name:'Singularity',desc:'Creates a gravity well: sucks in hordes, then implodes.'},
};
const EN_CHAR={
  drifter:{name:'DRIFTER',style:'Balanced · all-rounder',desc:'No weakness. +8% scrap collected.'},
  jackal:{name:'JACKAL',style:'Glass cannon · evasive',desc:'-25% HP, +22% damage, +15% speed. 12% dodge.'},
  bulwark:{name:'BULWARK',style:'Tank · melee',desc:'+40% HP, +20% damage reduction, -12% speed, -10% rate. Thorns.'},
  pyre:{name:'PYRE',style:'Fire · horde control',desc:'Incendiary bullets. The more enemies burn, the more damage (up to +40%).'},
  warden:{name:'WARDEN',style:'Precision · crit',desc:'-10% rate, +18% bullet speed, +1 pierce, 14% crit. Stronger crits heal.'},
  revenant:{name:'REVENANT',style:'Berserker · risk',desc:'-20% HP, heal 2 HP per kill. More hurt means more damage (up to +60%). +1 revive.'},
  engineer:{name:'ENGINEER',style:'Drones · support',desc:'Start each run with an allied war drone. +10% fire rate.'},
  demo:{name:'DEMOLITIONIST',style:'Explosions · area',desc:'Every bullet explodes on impact. +8% damage, -10% fire rate.'},
};
const EN_UPGRADE={
  rate:{name:'Rapid Trigger',desc:'+22% fire rate'},
  dmg:{name:'Heavy Caliber',desc:'+28% bullet damage'},
  multi:{name:'Burst',desc:'+1 projectile per shot'},
  pierce:{name:'Piercing',desc:'Bullets pierce +1 enemy'},
  speed:{name:'Adrenaline',desc:'+14% movement speed'},
  hp:{name:'Vitality',desc:'+30 max HP and full heal'},
  range:{name:'Long Barrel',desc:'+25% range and bullet speed'},
  crit:{name:'Hollow Points',desc:'+12% crit chance (x2.5)'},
  regen:{name:'Regeneration',desc:'Recover 1.5 HP/s'},
  cool:{name:'Reflexes',desc:'-22% ability and dash cooldown'},
  swift:{name:'Feline Step',desc:'+18% speed and -20% dash cooldown'},
  hardy:{name:'Tough Skin',desc:'-15% damage taken'},
  chillp:{name:'Cryo Rounds',desc:'Bullets slow enemies'},
  burnp:{name:'Incendiary Rounds',desc:'Bullets ignite enemies'},
  chainp:{name:'Conductor',desc:'Bullets arc to +1 enemy'},
  glass:{name:'Glass Cannon',desc:'+45% damage, -20% max HP'},
  exec:{name:'Execution',desc:'Execute common enemies below 10% HP'},
  vamp:{name:'Leech',desc:'Heal 2 HP per kill'},
  boom:{name:'Explosive',desc:'Bullets explode on impact'},
  thorn:{name:'Spiked Armor',desc:'+20 max HP and reflect contact damage'},
  scav:{name:'Salvage',desc:'Heal HP per scrap collected (scales with max HP)'},
  focus:{name:'Steady Aim',desc:'-30% spread, +12% bullet speed'},
  second:{name:'Second Skin',desc:'+18 max HP and 2s invulnerability at sector start'},
  overcharge:{name:'Overcharge',desc:'+10% crit; boosts burn, chill and chain if active'},
  splinter:{name:'Splinter',desc:'+1 projectile per shot'},
  siphon:{name:'Siphon',desc:'Heal 1 HP per kill'},
  juggvest:{name:'Heavy Vest',desc:'+25 max HP and -10% damage taken'},
};
const EN_RELIC={
  orbit:{name:'Orbiting Blades',desc:'Three blades orbit you, dealing contact damage.'},
  predator:{name:'Predator Instinct',desc:'+45% damage vs full-HP enemies.'},
  sharpshot:{name:'Marked Shot',desc:'Every 5th shot is a guaranteed crit.'},
  magvac:{name:'Greedy Vortex',desc:'+120% pickup radius and +20% scrap collected.'},
  momentum:{name:'Momentum',desc:'After a dash: +35% damage for 2.5s.'},
  overheat:{name:'Overheat',desc:'Bullets ignite and deal +25% fire damage.'},
  bulwark:{name:'Bulwark',desc:'+40 max HP and reflect 60% of contact damage.'},
  leech:{name:'Critical Leech',desc:'Each crit heals you 4 HP.'},
  splitshot:{name:'Spectral Swarm',desc:'+1 projectile and +10% crit chance.'},
  detonator:{name:'Detonator',desc:'Crits make enemies explode in a radius.'},
  phantom:{name:'Phantom Scythe',desc:'Killing an enemy lets the bullet pierce on.'},
  reaper:{name:'Reaper',desc:'Execute common enemies below 18% HP; +15% boss damage.'},
  timewarp:{name:'Time Warp',desc:'Below 30% HP, time slows around you.'},
  thunder:{name:'Static Storm',desc:'Bullets arc to +2 enemies and slow.'},
  glasscannon:{name:'Glass Heart',desc:'+70% damage but -30% max HP. High risk, high reward.'},
  secondwind:{name:'Last Breath',desc:'Revive one more time with extended invulnerability.'},
  berserk:{name:'Blood Fury',desc:'The more hurt you are, the harder you hit (up to +60% damage and +30% rate).'},
  avarice:{name:'Avarice',desc:'+50% scrap, +25% damage, but -25% max HP.'},
  twincore:{name:'Twin Core',desc:'+1 projectile and +12% bullet speed.'},
  titanheart:{name:'Titan Heart',desc:'+60 max HP and +2 HP/s regen.'},
  venomgland:{name:'Venom Gland',desc:'Bullets ignite and slow enemies.'},
  duelblade:{name:'Duelist Blade',desc:'+30% damage and +15% rate, but -1 pierce.'},
  gravwell:{name:'Gravity Well',desc:'+200% pickup radius; your shots slow.'},
  overclock:{name:'Overclock',desc:'+40% rate and +1 projectile, but -15% damage.'},
  wardrone:{name:'War Drone',desc:'An allied drone follows you and fires at enemies for the whole run.'},
  medidrone:{name:'Repair Drone',desc:'A support drone follows you and regenerates your HP over time.'},
  scrapdrone:{name:'Salvage Drone',desc:'A drone pulls scrap toward you from a long distance.'},
  juggernaut:{name:'Juggernaut',desc:'+55 max HP, -15% damage taken and reflect 50% of contact damage.'},
  assassin:{name:'Assassin Instinct',desc:'+22% crit chance and +15% damage.'},
  pyroclasm:{name:'Pyroclasm',desc:'Bullets ignite and fire damage is amplified by 60%.'},
  permafrost:{name:'Permafrost',desc:'Shots heavily slow enemies and +1 pierce.'},
  bloodpact:{name:'Blood Pact',desc:'+35% damage and heal 2 HP per kill, but -25% max HP.'},
  executioner:{name:'Executioner',desc:'Execute common enemies below 15% HP and +20% boss damage.'},
  vortex:{name:'Magnetic Vortex',desc:'+150% pickup radius and +10% crit chance.'},
  phoenix:{name:'Phoenix Heart',desc:'+1 revive with extended invulnerability and +1.5 HP/s.'},
  hivemind:{name:'Hive Mind',desc:'Summon a war drone and all your drones fire 40% faster.'},
  decapitator:{name:'Headsman',desc:'+15% crit and execute non-boss enemies below 22% HP.'},
  elementalist:{name:'Elementalist',desc:'Your shots ignite, slow AND chain. +30% fire damage.'},
  conflag:{name:'Conflagration',desc:'Your shots ignite. Burning enemies EXPLODE on death, spreading fire.'},
  glassstorm:{name:'Glass Storm',desc:'+5% crit. Every 6th crit unleashes a 360° volley.'},
  staticfield:{name:'Static Field',desc:'+2 chain bounces. Chain also leaps to status-afflicted enemies and its hits can crit.'},
  bloodengine:{name:'Blood Engine',desc:'+1 heal per kill. Healing charges you: rising damage while you keep killing (up to +30%).'},
};
/* ---------- EN content — extra maps (boss/biome/objective/hub/champion/banner) ---------- */
const EN_BIOME={
  ash:'GREY ASH', toxic:'TOXIC EXPANSE', blood:'BLOOD NIGHT', sand:'SANDSTORM',
  rad:'RADIOACTIVE ZONE', ice:'ETERNAL FROST', swamp:'ROTTING SWAMP', ruins:'CITY IN RUINS',
  lava:'INFERNAL CALDERA', snowrad:'RADIOACTIVE SNOW', crypt:'FORGOTTEN CRYPT', flood:'FLOODED PLAIN',
  storm:'ELECTRIC STORM', bone:'OSSUARY', glass:'GLASS DESERT', fungal:'FUNGAL FOREST',
};
const EN_OBJECTIVE={
  k50:'Kill 50 enemies', k120:'Kill 120 enemies', lv5:'Reach sector 5', lv8:'Reach sector 8',
  boss:'Kill a boss', scr:'Collect 8 scrap', ab:'Use 10 abilities', cmb:'15-hit combo', surv:'Survive 3 minutes',
};
const EN_HUBTILE={ shop:'SHOP', chars:'SURVIVORS', progress:'PROGRESS', settings:'SETTINGS' };
const EN_PROGRESS={
  challenges:{name:'CHALLENGES',desc:'Long-term goals'},
  achievements:{name:'ACHIEVEMENTS',desc:'Feats to unlock'},
  codex:{name:'CODEX',desc:'Enemies, bosses and biomes discovered'},
  market:{name:'BLACK MARKET',desc:'Spend Cores on permanent perks'},
  cosmetics:{name:'APPEARANCE',desc:'Skins, trails and finishers'},
  stats:{name:'STATISTICS',desc:'Personal records and run history'},
};
const BOSS_NAME_EN={
  'IL MACELLAIO':'THE BUTCHER', 'IL GONFIO':'THE BLOATED', 'SIGNORE DELLA GUERRA':'WARLORD',
  'IL COLOSSO':'THE COLOSSUS', 'IL NECROMANTE':'THE NECROMANCER', 'I GEMELLI':'THE TWINS',
  "L'ARTIGLIERE":'THE ARTILLERIST', 'LA SCISSIONE':'THE SCHISM', 'LA REGINA SCIAME':'THE SWARM QUEEN',
  'IL DUELLANTE SPECCHIO':'THE MIRROR DUELIST', 'IL RAZZIATORE':'THE REAVER', 'IL SORVEGLIANTE':'THE OVERSEER',
  'IL SISMICO':'THE QUAKER', "L'EGIDA":'THE AEGIS',
};
const BOSS_MOD_EN={
  'Veloce':'Swift','Corazzato':'Armored','Esplosivo':'Volatile','Rigenerante':'Regenerating',
  'Frenetico':'Frenzied','Colossale':'Colossal','Vendicativo':'Vengeful','Sanguisuga':'Leech',
  'Imprevedibile':'Erratic','Spettrale':'Spectral','Titanico':'Titanic',
  'Feroce':'Savage','Ossidiana':'Obsidian',
};
const CHAMP_NAME_EN={
  'IL DEFORME':'THE MISSHAPEN','IL FULMINE':'THE BOLT','IL VELENOSO':'THE VENOMOUS','IL TITANO':'THE TITAN',
  'IL BASTIONE':'THE BASTION','IL NIDO':'THE NEST','IL PREDATORE':'THE PREDATOR','IL PROFETA':'THE PROPHET',
  'IL CECCHINO':'THE MARKSMAN','IL DEMOLITORE':'THE DEMOLISHER','IL FANTASMA':'THE PHANTOM','IL VELO':'THE VEIL',
  'IL GUSCIO':'THE SHELL','CAMPIONE':'CHAMPION',
};
const MODE_LABEL_EN={ endless:'Endless', bossrush:'Boss Rush', daily:'Challenge', hardcore:'Inferno', horde:'Horde', frenzy:'Frenzy' };
const BIOME_NAME_EN={};
try{ BIOMES.forEach(b=>{ BIOME_NAME_EN[b.name]=EN_BIOME[b.id]||b.name; }); }catch(e){}
/* home-screen "next goal": the closest stat-gated character unlock, to give the grind a clear target */
const STAT_LABEL   ={ kills:'uccisioni', bosses:'boss', maxLevel:'settore max', nukes:'atomiche' };
const STAT_LABEL_EN={ kills:'kills', bosses:'bosses', maxLevel:'max sector', nukes:'nukes' };
function nextUnlockHint(){
  if(typeof CHARACTERS==='undefined'||typeof Store==='undefined') return null;
  let best=null;
  for(const c of CHARACTERS){
    if(!c.req || Store.ownsC(c.id)) continue;
    const cur=Store.stat(c.req.stat), goal=c.req.goal, frac=goal>0?cur/goal:1;
    if(frac<1 && (!best||frac>best.frac)) best={c,cur,goal,frac,stat:c.req.stat};
  }
  return best;
}
const BANNER_EN={
  'reliquia':'relic', 'VINTO':'WON', 'PERSO':'LOST', '+50% danno':'+50% damage',
  'rottami svaniti':'scrap gone', 'nuova arma':'new weapon', 'RELIQUIA':'RELIC', 'ottenuta':'obtained',
  'ECO DI POTERE':'ECHO OF POWER', '+danno +HP':'+damage +HP', 'MINACCIA SBLOCCATA':'THREAT UNLOCKED',
  'CODEX':'CODEX', 'nuova voce':'new entry', 'IMPRESA':'ACHIEVEMENT', 'ACQUISTATO':'PURCHASED',
  'RELIQUIA SBLOCCATA':'RELIC UNLOCKED', 'SBLOCCATO':'UNLOCKED', 'ARMA EVOLUTA!':'WEAPON EVOLVED!',
  'RINATO':'REBORN', 'seconda vita':'second life', 'SI DIVIDE!':'IT SPLITS!',
  'RI-TIRO GRATIS':'FREE REROLL', 'NUCLEI INSUFFICIENTI':'NOT ENOUGH CORES', 'RI-TIRO':'REROLL',
  '-1 ⬡ nucleo':'-1 ⬡ core', 'VALANGA':'AVALANCHE', 'ÉLITE':'ELITE', 'SETTORE BUIO':'DARK SECTOR',
  'FRENESIA':'FRENZY', 'COLOSSI':'JUGGERNAUTS', 'SETTORE RICCO':'BOUNTY SECTOR',
  'fatto':'done', 'SETTORE RIPULITO':'SECTOR CLEARED', 'CAMPIONE':'CHAMPION',
  'ATOMICA':'NUKE', 'schermo ripulito':'screen cleared',
  'CAMPIONE ABBATTUTO':'CHAMPION DOWN', '+1 nucleo':'+1 core', 'OBIETTIVO':'OBJECTIVE', 'ASCESO':'ASCENDED',
  'BOTTINO IN FUGA!':'LOOT ON THE RUN!', 'inseguilo!':'chase it down!', 'BOTTINO!':'LOOT!',
  'FUGGITO!':'ESCAPED!', 'il bottino è perso':'the loot got away',
};
function trBoss(s){
  if(!_T()||!s) return s;
  let base=s, suf='';
  const m=/^(.*?)\s*\[(.*)\]$/.exec(s);
  if(m){ base=m[1]; suf=m[2]; }
  let out = BOSS_NAME_EN[base] || CHAMP_NAME_EN[base] || base;
  if(suf) out += ' ['+(BOSS_MOD_EN[suf]||suf)+']';
  return out;
}
function trChamp(s){ return _T() ? (CHAMP_NAME_EN[s]||s) : s; }
function bannerTr(s){
  if(!_T() || s==null || s==='') return s;
  s=String(s);
  if(BANNER_EN[s]!=null) return BANNER_EN[s];
  if(BIOME_NAME_EN[s]!=null) return BIOME_NAME_EN[s];
  if(CHAMP_NAME_EN[s]!=null) return CHAMP_NAME_EN[s];
  if(BOSS_NAME_EN[s]!=null || /\[/.test(s)){ const b=trBoss(s); if(b!==s) return b; }
  let r;
  if((r=/^SETTORE (\d+)$/.exec(s))) return 'SECTOR '+r[1];
  if((r=/^ZONA (\d+)$/.exec(s))) return 'ZONE '+r[1];
  if((r=/^GIORNO (\d+)$/.exec(s))) return 'DAY '+r[1];
  if((r=/^\+(\d+) ROTTAMI$/.exec(s))) return '+'+r[1]+' SCRAP';
  if((r=/^\+(\d+) rottami$/.exec(s))) return '+'+r[1]+' scrap';
  if((r=/^(\d+) rimasti$/.exec(s))) return r[1]+' left';
  return s;
}

function buildArsenal(){
  const wg=el('weaponGrid'); if(wg){ wg.innerHTML='';
    for(const w of WEAPONS){
      const owned=Store.ownsW(w.id), sel=Store.weapon===w.id;
      const card=document.createElement('div'); card.className='shop-card'+(sel?' sel':'');
      const btn = sel?`<button class="shop-buy" disabled>${UL('EQUIPAGGIATA','EQUIPPED')}</button>` : owned?`<button class="shop-buy eq">${UL('EQUIPAGGIA','EQUIP')}</button>` : `<button class="shop-buy ${Store.scrap<w.price?'cant':''}">⬢ ${w.price}</button>`;
      const mlv=masteryLevel(w.id), mevo=isEvolved(w.id), mprog=Math.round(masteryProgress(w.id)*100);
      const mdots=Array.from({length:MASTERY_MAX},(_,i)=>`<span class="dot${i<mlv?' on':''}"></span>`).join('');
      const mtag = mevo ? `<div class="cstyle" style="color:var(--amber)">${UL('★ EVOLUTA','★ EVOLVED')} · ${TN(EN_EVO,{id:w.id,name:(EVOLUTIONS[w.id]?EVOLUTIONS[w.id].name:'')})}</div>` : `<div class="cstyle">${UL('MAESTRIA','MASTERY')} L${mlv}/${MASTERY_MAX}</div>`;
      const mbar = mevo ? '' : `<div class="prog"><div style="width:${mprog}%"></div></div>`;
      const wlv=Store.weaponLvl(w.id), wmax=wlv>=WEAPON_UP_MAX, wupCost=Store.weaponUpCost(w.id);
      const wupHtml = owned ? (
        `<div class="cstyle" style="color:var(--cyan)">${UL('POTENZA','POWER')} +${Math.round(wlv*WEAPON_UP_DMG*100)}% (${wlv}/${WEAPON_UP_MAX})</div>`+
        (wmax ? `<button class="shop-buy wup" disabled>${UL('POTENZA MAX','POWER MAX')}</button>`
              : `<button class="shop-buy wup ${Store.scrap<wupCost?'cant':''}">⬢ ${wupCost} · ${UL('POTENZIA','UPGRADE')}</button>`)
      ) : '';
      card.innerHTML=`<div class="ico">${w.ico}</div><div class="name">${TN(EN_WEAPON,w)}</div><div class="desc">${TD(EN_WEAPON,w)}</div>${mtag}<div class="dots">${mdots}</div>${mbar}${btn}${wupHtml}`;
      if(mevo) card.classList.add('maxed');
      const b=card.querySelector('.shop-buy:not(.wup)');
      if(b && !sel) b.addEventListener('click',()=>{ if(owned){ Store.selW(w.id); Audio2.pickup(); } else if(Store.buyW(w)){ Store.selW(w.id); Audio2.upgrade(); G.updateScrapUI(); } else { Audio2.hurt(); return; } buildShop(); });
      const wub=card.querySelector('.wup');
      if(wub && owned && !wmax) wub.addEventListener('click',(e)=>{ e.stopPropagation(); if(Store.buyWeaponUp(w.id)){ Audio2.upgrade(); G.updateScrapUI(); buildShop(); } else Audio2.hurt(); });
      wg.appendChild(card);
    }
  }
  const ag=el('abilityGrid'); if(ag){ ag.innerHTML='';
    for(const a of ABILITIES){
      const owned=Store.ownsA(a.id), sel=Store.ability===a.id;
      const card=document.createElement('div'); card.className='shop-card'+(sel?' sel':'');
      const btn = sel?`<button class="shop-buy" disabled>${UL('EQUIPAGGIATA','EQUIPPED')}</button>` : owned?`<button class="shop-buy eq">${UL('EQUIPAGGIA','EQUIP')}</button>` : `<button class="shop-buy ${Store.scrap<a.price?'cant':''}">⬢ ${a.price}</button>`;
      const alv=Store.abilityLvl(a.id), amax=alv>=ABILITY_UP_MAX, aupCost=Store.abilityUpCost(a.id);
      const aupHtml = owned ? (
        `<div class="cstyle" style="color:var(--cyan)">${UL('POTENZA','POWER')} +${Math.round(alv*ABILITY_UP_POW*100)}% · ${UL('RICARICA','COOLDOWN')} −${Math.round(alv*ABILITY_UP_CD*100)}% (${alv}/${ABILITY_UP_MAX})</div>`+
        (amax ? `<button class="shop-buy wup" disabled>${UL('POTENZA MAX','POWER MAX')}</button>`
              : `<button class="shop-buy wup ${Store.scrap<aupCost?'cant':''}">⬢ ${aupCost} · ${UL('POTENZIA','UPGRADE')}</button>`)
      ) : '';
      card.innerHTML=`<div class="ico">${a.ico}</div><div class="name">${TN(EN_ABILITY,a)}</div><div class="desc">${TD(EN_ABILITY,a)}</div>${btn}${aupHtml}`;
      const b=card.querySelector('.shop-buy:not(.wup)');
      if(!sel) b.addEventListener('click',()=>{ if(owned){ Store.selA(a.id); Audio2.pickup(); } else if(Store.buyA(a)){ Store.selA(a.id); Audio2.upgrade(); G.updateScrapUI(); } else { Audio2.hurt(); return; } buildShop(); });
      const aub=card.querySelector('.wup');
      if(aub && owned && !amax) aub.addEventListener('click',(e)=>{ e.stopPropagation(); if(Store.buyAbilityUp(a.id)){ Audio2.upgrade(); G.updateScrapUI(); buildShop(); } else Audio2.hurt(); });
      ag.appendChild(card);
    }
  }
}
function buildChallenges(){
  const grid=el('challengeGrid'); if(!grid) return; grid.innerHTML='';
  for(const ch of CHALLENGES){
    const cur=Math.min(Store.stat(ch.stat),ch.goal), done=SaveData.data.claimed[ch.id], can=Store.claimable(ch);
    const card=document.createElement('div'); card.className='shop-card'+(done?' maxed':'');
    const pct=Math.round(cur/ch.goal*100);
    const btn = done?`<button class="shop-buy" disabled>${UL('RISCOSSO ✓','CLAIMED ✓')}</button>` : `<button class="shop-buy ${can?'':'cant'}" ${can?'':'disabled'}>⬢ ${ch.reward}</button>`;
    card.innerHTML=`<div class="ico">${ch.ico}</div><div class="name">${TN(EN_CHALLENGE,ch)}</div><div class="desc">${cur}/${ch.goal}</div><div class="prog"><div style="width:${pct}%"></div></div>${btn}`;
    const b=card.querySelector('.shop-buy');
    if(can) b.addEventListener('click',()=>{ const r=Store.claim(ch); if(r){ Audio2.levelup(); G.updateScrapUI(); buildChallenges(); banner('+'+r+' ROTTAMI'); } });
    grid.appendChild(card);
  }
}
function buildCharacters(){
  const grid=el('charGrid'); if(!grid) return; grid.innerHTML='';
  const act=CHAR(Store.character);
  if(el('charActive')) el('charActive').textContent=TN(EN_CHAR,act);
  for(const c of CHARACTERS){
    const owned=Store.ownsC(c.id), sel=Store.character===c.id;
    const card=document.createElement('div'); card.className='shop-card'+(sel?' sel':'');
    let btn;
    if(sel) btn=`<button class="shop-buy" disabled>${UL('SELEZIONATO','SELECTED')}</button>`;
    else if(owned) btn=`<button class="shop-buy eq">${UL('SELEZIONA','SELECT')}</button>`;
    else if(c.req){ const cur=Store.stat(c.req.stat), can=cur>=c.req.goal;
      if(can) btn=`<button class="shop-buy">${UL('SBLOCCA','UNLOCK')}</button>`;
      else btn=`<button class="shop-buy core ${Store.cores<CORE_INSTANT_CHAR?'cant':''}" data-core="1">⬡ ${CORE_INSTANT_CHAR} · ${cur}/${c.req.goal}</button>`; }
    else btn=`<button class="shop-buy ${Store.scrap<c.cost?'cant':''}">⬢ ${c.cost}</button>`;
    card.innerHTML=`<div class="ico">${c.ico}</div><div class="name">${TN(EN_CHAR,c)}</div>`+
      `<div class="cstyle">${TS(EN_CHAR,c)}</div><div class="desc">${TD(EN_CHAR,c)}</div>${btn}`;
    const b=card.querySelector('.shop-buy');
    if(!sel) b.addEventListener('click',()=>{
      if(owned){ Store.selC(c.id); Audio2.pickup(); }
      else if(b.dataset.core && Store.buyCharWithCores(c)){ Store.selC(c.id); Audio2.upgrade(); G.updateScrapUI(); }
      else if(Store.buyC(c)){ Store.selC(c.id); Audio2.upgrade(); G.updateScrapUI(); }
      else { Audio2.hurt(); return; }
      buildCharacters();
    });
    grid.appendChild(card);
  }
}
function buildHubTiles(){
  const row=el('hubTiles'); if(!row) return; row.innerHTML='';
  for(const t of HUB_TILES){
    const b=document.createElement('button'); b.className='hub-tile'; b.dataset.open=t.open;
    b.innerHTML=`<span class="ht-ico">${t.ico}</span><span class="ht-label">${(_T()&&EN_HUBTILE[t.id])||t.label}</span>`;
    b.addEventListener('click',()=>{ if(window.Audio2){ Audio2.init(); Audio2.resume(); } G.hubGo(t.open); });
    row.appendChild(b);
  }
}
function buildProgress(){
  const grid=el('progressGrid'); if(!grid) return; grid.innerHTML='';
  for(const it of PROGRESS_ITEMS){
    const n = (typeof it.badge==='function') ? (it.badge()||0) : 0;
    const card=document.createElement('button'); card.className='shop-card prog-card';
    const ep=_T()&&EN_PROGRESS[it.id];
    card.innerHTML=`<div class="ico">${it.ico}</div><div class="name">${(ep&&ep.name)||it.name}</div>`+
                   `<div class="desc">${(ep&&ep.desc)||it.desc}</div>`+
                   (n>0?`<span class="hub-badge">${n>9?'9+':n}</span>`:'');
    card.addEventListener('click',()=>G.hubGo(it.open));
    grid.appendChild(card);
  }
}
function buildPauseSummary(){
  const host=el('pauseBuild'); if(!host) return;
  const p=G&&G.player;
  if(!p){ host.innerHTML=''; host.classList.add('hidden'); return; }
  host.classList.remove('hidden');
  const w=p.weapon||{};
  const wName = w.id ? TN(EN_WEAPON,w) : (w.name||'—');
  const evoBase=(p.evo && typeof EVOLUTIONS!=='undefined') ? (Object.values(EVOLUTIONS).find(e=>e.evo===p.evo)||{}) : null;
  const evoName = evoBase ? ((_T()&&w.id&&EN_EVO[w.id]&&EN_EVO[w.id].name)||evoBase.name||null) : null;
  const wLabel = (w.ico||'')+' '+wName+(evoName?(' <span style="color:var(--amber)">★ '+evoName+'</span>'):'');
  const a=p.ability||{};
  const aName = a.id ? TN(EN_ABILITY,a) : (a.name||'—');
  const rows=[
    [UL('ARMA','WEAPON'), wLabel],
    [UL('ABILITÀ','ABILITY'), (a.ico||'')+' '+aName],
    [UL('HP MAX','MAX HP'), Math.round(p.maxHp)],
    [UL('DANNO','DAMAGE'), Math.round(p.damage*((w.dmgMul)||1))],
    [UL('CADENZA','RATE'), (p.fireRate*((w.rateMul)||1)).toFixed(1)+'/s'],
    [UL('CRITICO','CRIT'), Math.round((p.crit||0)*100)+'%'],
  ];
  if(p.relics && p.relics.length) rows.push([UL('RELIQUIE','RELICS'), p.relics.map(r=>r.ico||r.name||r).join(' ')]);
  const L=G.level||1, zone=Math.ceil(L/5), toBoss=zone*5-L, th=G.zoneTheme;
  const zoneLine = `<div class="pb-zone">${UL('SETTORE','SECTOR')} ${L} · ${UL('ZONA','ZONE')} ${zone}${th?' · '+UL(th.name,th.en):''} · ${G.bossLevel?'⚔ BOSS':'⚔ '+(UL('boss tra ','boss in ')+toBoss)}</div>`;
  host.innerHTML = zoneLine + '<div class="pb-h">'+UL('EQUIPAGGIAMENTO ATTUALE','CURRENT LOADOUT')+'</div>' +
    rows.map(r=>`<div class="set-row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
}
function recordRunHistory(){
  const d=SaveData.data;
  if(!Array.isArray(d.history)) d.history=[];
  const p=G.player||{};
  const rec={ sector:G.level, score:G.score, mode:G.mode||'endless',
    threat:G.threat||0, date:(typeof dailyKey==='function'?dailyKey():''),
    weapon:p.weapon&&p.weapon.id, evo:p.evo||null, char:Store.character, combo:G.maxCombo||0,
    relics:(G.relics||[]).map(r=>r.id) };   // remember the build, not just the score
  d.history.unshift(rec);
  if(d.history.length>10) d.history.length=10;
  if(G.mode==='daily'){
    if(!d.dailyBest||typeof d.dailyBest!=='object') d.dailyBest={};
    const k=rec.date;
    if(!d.dailyBest[k] || G.score>d.dailyBest[k]) d.dailyBest[k]=G.score;
    const keys=Object.keys(d.dailyBest).sort();
    while(keys.length>14){ delete d.dailyBest[keys.shift()]; }
  }
}
function todayDailyBest(){
  const d=SaveData.data, k=(typeof dailyKey==='function'?dailyKey():'');
  return (d.dailyBest&&d.dailyBest[k])||0;
}
const MODE_LABEL={ endless:'Senza Fine', bossrush:'Assalto Boss', daily:'Sfida', hardcore:'Inferno', horde:'Orda', frenzy:'Frenesia' };
function buildStats(){
  const host=el('statsBody'); if(!host) return;
  const d=SaveData.data, s=d.stats||{};
  const top=[
    [UL('RUN GIOCATE','RUNS PLAYED'), s.runs||0],
    [UL('ELIMINAZIONI','KILLS'), s.kills||0],
    [UL('BOSS ABBATTUTI','BOSSES KILLED'), s.bosses||0],
    [UL('SETTORE MAX','MAX SECTOR'), s.maxLevel||0],
    [UL('MIGLIOR PUNTEGGIO','BEST SCORE'), s.bestScore||0],
    [UL('COMBO MAX','MAX COMBO'), s.maxCombo||0],
    [UL('TEMPO TOTALE','TOTAL TIME'), (typeof fmtTime==='function'?fmtTime(s.playtime||0):(s.playtime||0)+'s')],
    [UL('ATOMICHE USATE','NUKES USED'), s.nukes||0],
  ];
  let html='<div class="go-stats">'+top.map(r=>`<div>${r[0]}<br><b>${r[1]}</b></div>`).join('')+'</div>';
  const h=Array.isArray(d.history)?d.history:[];
  const ML=_T()?MODE_LABEL_EN:MODE_LABEL;
  html+='<div class="stats-h">'+UL('ULTIME RUN','RECENT RUNS')+'</div>';
  if(!h.length){ html+='<div class="stats-empty">'+UL('Nessuna run registrata','No runs recorded')+'</div>'; }
  else {
    html+='<div class="stats-runs">'+h.map(r=>
      `<div class="stats-run"><b>S${r.sector||0}</b><span>${r.score||0} pt</span><em>${ML[r.mode]||r.mode||'—'}${r.threat?(' · '+UL('M','T')+r.threat):''}</em></div>`
    ).join('')+'</div>';
  }
  host.innerHTML=html;
}
function refreshDailyPill(){
  const p=el('dailyPill'); if(!p) return;
  const ready = (typeof dailyAvailable==='function') ? dailyAvailable() : false;
  p.classList.toggle('hidden', !ready);
}
function renderPlaySummary(){
  const host=el('playSummary'); if(!host) return;
  const c = CHAR(Store.character);
  host.style.setProperty('--ctint', c.tint||'#8b94a3');
  host.innerHTML =
    `<div class="ps-ico">${c.ico}</div>`+
    `<div class="ps-body">`+
      `<div class="ps-name">${TN(EN_CHAR,c)}</div>`+
      `<div class="ps-style">${TS(EN_CHAR,c)||''}</div>`+
      `<div class="ps-desc">${TD(EN_CHAR,c)||''}</div>`+
    `</div>`+
    `<button id="psChange" class="btn-ghost ps-change">${UL('CAMBIA ›','CHANGE ›')}</button>`;
  const ch=el('psChange'); if(ch) ch.addEventListener('click',()=>G.openChars());
}
// Does this upgrade meaningfully combine with what the player ALREADY has? Drives the green "★ SYNERGY"
// highlight so players LEARN build combos instead of picking blind — adds agency and replay depth.
function upgradeSynergy(up,p){
  if(!p) return false;
  const w=p.weapon||{};
  const burn=!!p.burnBonus||!!w.burn||!!p.furnace, chill=(p.chillBonus||0)>0||!!w.chill, chain=(p.chainBonus||0)>0||!!w.chain;
  const multi=(p.multishot||0)>1, pierce=(p.pierce||0)>0, crit=(p.crit||0)>=0.16||!!p.steadyEye;
  const life=(p.lifesteal||0)>0||!!p.bloodRage, tank=(p.maxHp||0)>=150||(p.dr||0)>0||!!p.thorns, explo=!!p.explosive||!!w.forceExplosive;
  switch(up.id){
    case 'overcharge': return burn||chill||chain;
    case 'chainp':     return chain;
    case 'burnp':      return burn;
    case 'chillp':     return chill;
    case 'boom':       return explo;
    case 'multi': case 'splinter': return multi||pierce||chain;
    case 'pierce':     return multi||pierce;
    case 'crit':       return crit;
    case 'exec':       return crit;
    case 'vamp': case 'siphon': return life;
    case 'thorn':      return tank;
    case 'hardy': case 'juggvest': case 'second': return tank;
    case 'scav':       return (p.magnet||1)>1||(p.relGreed||0)>0;
    case 'regen':      return tank||life;
    case 'focus':      return crit||!!w.beam;
    case 'range':      return !!w.beam||pierce;
    case 'dmg':        return crit||!!w.beam;
    default: return false;
  }
}
function buildUpgradeCards(){
  const wrap=el('upgradeCards'); wrap.innerHTML='';
  const pool=UPGRADES.filter(u=>!(G.banished&&G.banished.has(u.id))), picks=[];
  while(picks.length<3 && pool.length){
    let idx;
    for(let tries=0;tries<8;tries++){ idx=U.randInt(0,pool.length-1); if(!pool[idx].rare || U.chance(0.4)) break; }
    picks.push(pool.splice(idx,1)[0]);
  }
  for(const up of picks){
    const syn = G.player && upgradeSynergy(up,G.player);
    const card=document.createElement('div'); card.className='up-card'+(up.rare?' rare':'')+(syn?' synergy':'');
    const tag = syn ? (_T()?'★ SYNERGY':'★ SINERGIA') : (up.rare?(_T()?'★ RARE':'★ RARO'):(_T()?'UPGRADE':'POTENZIAMENTO'));
    card.innerHTML=`<div class="ico">${up.ico}</div><div class="name">${TN(EN_UPGRADE,up)}</div><div class="desc">${TD(EN_UPGRADE,up)}</div><div class="tag">${tag}</div>`;
    if(syn){ card.style.borderColor='#7bff96'; card.style.boxShadow='0 0 16px rgba(123,255,150,0.45)'; }   // inline so no styles.css dependency
    card.addEventListener('click',()=>{ Audio2.upgrade(); G.chooseUpgrade(up); });
    if(G.banishLeft>0){   // BANISH: sculpt the draft by removing junk from this run's pool (genre-standard agency tool)
      const bz=document.createElement('button'); bz.className='banish-btn'; bz.textContent='🚫'; bz.setAttribute('aria-label','Banish');
      bz.addEventListener('click',(ev)=>{ ev.stopPropagation(); if(!G.banished) G.banished=new Set(); G.banished.add(up.id); G.banishLeft--; if(window.Audio2&&Audio2.hurt) Audio2.hurt(); buildUpgradeCards(); });
      card.appendChild(bz);
    }
    wrap.appendChild(card);
  }
  const bl=el('banishLeft'); if(bl){ bl.classList.toggle('hidden', !(G.banishLeft>0)); const b=bl.querySelector('b'); if(b) b.textContent=G.banishLeft||0; }
}
function buildSettings(){
  el('setMusicVol').value=Settings.s.musicVol; el('setMusicVal').textContent=Settings.s.musicVol;
  el('setSfxVol').value=Settings.s.sfxVol; el('setSfxVal').textContent=Settings.s.sfxVol;
  el('setHaptics').setAttribute('aria-checked', String(!!Settings.s.haptics));
  el('setShake').setAttribute('aria-checked', String(!!Settings.s.shake));
  if(el('setPerf')) el('setPerf').setAttribute('aria-checked', String(!!Settings.s.lowFx));
  document.querySelectorAll('#settingsScreen .seg-lang .seg-b').forEach(b=>b.classList.toggle('on', b.dataset.lang===Settings.s.lang));
  el('setVersion').textContent=`ASHFALL v${APP_VERSION.name} (build ${APP_VERSION.build})`;
  refreshRemoveAds();
}
function updateObjectivesHud(){
  const w=el('objList'); if(!w) return;
  if(!G.objectives || !G.objectives.length){ w.innerHTML=''; return; }
  w.innerHTML=G.objectives.map(o=>`<div class="obj${o.done?' done':''}">${o.done?'✓':'◦'} ${(_T()&&EN_OBJECTIVE[o.id])||o.text}</div>`).join('');
}
function refreshRemoveAds(){
  const b=el('setRemoveAds'); if(!b||!window.IAP) return;
  if(IAP.owned()){ b.textContent=UL('✓ Pubblicità rimosse','✓ Ads removed'); b.disabled=true; b.classList.add('maxed'); }
  else { b.textContent=UL('🚫 Rimuovi pubblicità (','🚫 Remove ads (')+IAP.price+')'; b.disabled=false; b.classList.remove('maxed'); }
}

/* ---------------------- RESIZE ---------------------- */
function resize(){
  VW=innerWidth; VH=innerHeight; DPR=Math.min(devicePixelRatio||1,2);
  canvas.width=VW*DPR; canvas.height=VH*DPR; canvas.style.width=VW+'px'; canvas.style.height=VH+'px';
  if(G.ash) G.genAsh();
}
addEventListener('resize',resize);
addEventListener('orientationchange',()=>setTimeout(resize,200));

/* ---------------------- WIRING ---------------------- */
function wire(){
  Input.init(canvas);
  if(window.Ads) Ads.init();
  if(window.IAP) IAP.init();

  el('playBtn').addEventListener('click',()=>{ Audio2.init(); Audio2.resume(); G.openPlaySetup(); });
  el('shopBack').addEventListener('click',()=>G.toMenu());
  if(el('playBack')) el('playBack').addEventListener('click',()=>G.toMenu());
  if(el('playStartBtn')) el('playStartBtn').addEventListener('click',()=>{ Audio2.init(); Audio2.resume(); G.start(); });
  if(el('progressBack')) el('progressBack').addEventListener('click',()=>G.toMenu());
  if(el('marketBack')) el('marketBack').addEventListener('click',()=>G.openProgress());
  if(el('statsBack')) el('statsBack').addEventListener('click',()=>G.openProgress());
  if(el('dailyPill')) el('dailyPill').addEventListener('click',()=>{ Audio2.init(); Audio2.resume(); openDaily(); });
  el('retryBtn').addEventListener('click',()=>{ Audio2.resume(); if(G.mode==='daily'){ G.mode='endless'; G.openPlaySetup(); } else G.start(); });
  el('menuBtn').addEventListener('click',()=>G.toMenu());
  el('pauseBtn').addEventListener('click',()=>pauseToggle());
  el('resumeBtn').addEventListener('click',()=>pauseToggle());
  el('restartBtn').addEventListener('click',()=>{ hide('pauseScreen'); G.start(); });
  if(el('quitBtn')) el('quitBtn').addEventListener('click',()=>G.quitToMenu());
  if(el('helpBtn')) el('helpBtn').addEventListener('click',()=>{ const t=el('tutorial'); if(t){ t.style.zIndex='60'; t.classList.remove('hidden'); clearTimeout(t._ht); t._ht=setTimeout(()=>{ t.classList.add('hidden'); t.style.zIndex=''; },9000); } });   // controls are recoverable from pause

  el('dashBtn').addEventListener('click',()=>{ if(G.player) G.player.tryDash(Input.move.x,Input.move.y); });
  el('dashBtn').addEventListener('touchstart',e=>{e.preventDefault(); if(G.player) G.player.tryDash(Input.move.x,Input.move.y);},{passive:false});
  const ab=el('abilityBtn');
  if(ab){ ab.addEventListener('click',()=>{ if(G.player) G.player.useAbility(); });
    ab.addEventListener('touchstart',e=>{e.preventDefault(); if(G.player) G.player.useAbility();},{passive:false}); }

  // ads
  if(el('adReviveBtn')) el('adReviveBtn').addEventListener('click',()=>G.reviveFromAd());
  if(el('adDoubleBtn')) el('adDoubleBtn').addEventListener('click',()=>G.doubleScrapFromAd());
  if(el('adRerollBtn')) el('adRerollBtn').addEventListener('click',()=>G.rerollFromAd());
  if(el('evTake')) el('evTake').addEventListener('click',()=>G.resolveEvent(true));
  if(el('evSkip')) el('evSkip').addEventListener('click',()=>G.resolveEvent(false));
  if(el('adBonusBtn')) el('adBonusBtn').addEventListener('click',()=>G.bonusFromAd());

  // challenges + ascend
  if(el('challBtn')) el('challBtn').addEventListener('click',()=>G.openChallenges());
  if(el('challBack')) el('challBack').addEventListener('click',()=>G.openProgress());
  if(el('charBtn')) el('charBtn').addEventListener('click',()=>{ Audio2.init(); Audio2.resume(); G.openChars(); });
  if(el('charBack')) el('charBack').addEventListener('click',()=>G.toMenu());
  if(el('achBack')) el('achBack').addEventListener('click',()=>G.openProgress());
  if(el('codexBack')) el('codexBack').addEventListener('click',()=>G.openProgress());
  if(el('cosmeticsBack')) el('cosmeticsBack').addEventListener('click',()=>G.openProgress());
  if(el('dailyClaimBtn')) el('dailyClaimBtn').addEventListener('click',()=>claimDaily());
  if(el('dailyClose')) el('dailyClose').addEventListener('click',()=>hide('dailyModal'));
  if(el('coreRerollBtn')) el('coreRerollBtn').addEventListener('click',()=>G.rerollWithCore());
  if(el('ascendBtn')) el('ascendBtn').addEventListener('click',()=>{
    if(!Store.canAscend()){ Audio2.hurt(); return; }
    if(!G._ascendArmed){ G._ascendArmed=true; if(window.Audio2&&Audio2.bossWarn) Audio2.bossWarn(); buildShop();   // 2-tap confirm (ascend wipes the shop)
      setTimeout(()=>{ if(G._ascendArmed){ G._ascendArmed=false; buildShop(); } },4000); return; }
    G._ascendArmed=false;
    if(Store.ascend()){ Audio2.levelup(); G.updateScrapUI(); buildShop(); banner('ASCESO','prestige '+Store.prestige); } });

  // settings
  const openSettings=(from)=>{ Settings._returnTo=from; hideAllScreens(); buildSettings(); show('settingsScreen'); };
  if(el('openSettings')) el('openSettings').addEventListener('click',()=>openSettings('titleScreen'));
  if(el('openSettings2')) el('openSettings2').addEventListener('click',()=>openSettings('pauseScreen'));
  if(el('setBack')) el('setBack').addEventListener('click',()=>{ hide('settingsScreen'); show(Settings._returnTo); });
  const bindVol=(id,valId,key)=>{ const r=el(id); if(!r) return; r.addEventListener('input',()=>{ el(valId).textContent=r.value; Settings.set(key,+r.value); }); };
  bindVol('setMusicVol','setMusicVal','musicVol'); bindVol('setSfxVol','setSfxVal','sfxVol');
  const bindSw=(id,key)=>{ const b=el(id); if(!b) return; b.addEventListener('click',()=>{ const on=b.getAttribute('aria-checked')!=='true'; b.setAttribute('aria-checked',on); Settings.set(key,on); if(on)Haptic.light(); }); };
  bindSw('setHaptics','haptics'); bindSw('setShake','shake'); bindSw('setPerf','lowFx');
  if(el('setHaptics') && !Haptic.available) el('setHaptics').disabled=true;
  document.querySelectorAll('#settingsScreen .seg-b').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('#settingsScreen .seg-b').forEach(x=>x.classList.remove('on')); b.classList.add('on'); Settings.set('lang',b.dataset.lang); }));
  if(el('setRemoveAds')) el('setRemoveAds').addEventListener('click',()=>{
    if(!window.IAP || IAP.owned()) return;
    const b=el('setRemoveAds'); b.disabled=true; b.textContent=UL('ACQUISTO…','PURCHASING…');
    IAP.buy().then(ok=>{ refreshRemoveAds(); toast(ok?UL('Grazie! Pubblicità rimosse','Thanks! Ads removed'):UL('Acquisto non riuscito','Purchase failed')); });
  });
  if(el('setRestore')) el('setRestore').addEventListener('click',()=>{
    if(window.IAP) IAP.restore().then(ok=>{ refreshRemoveAds(); toast(ok?UL('Acquisti ripristinati','Purchases restored'):I18N.t('noPurch')); });
    else toast(I18N.t('noPurch'));
  });
  if(el('setWipe')) el('setWipe').addEventListener('click',()=>show('confirmWipe'));
  if(el('wipeCancel')) el('wipeCancel').addEventListener('click',()=>hide('confirmWipe'));
  if(el('wipeYes')) el('wipeYes').addEventListener('click',()=>{ SaveData.wipe(); G.loadBest(); G.updateScrapUI(); Settings.apply(); buildSettings(); hide('confirmWipe'); toast('OK'); });
  if(el('setPrivacy')) el('setPrivacy').addEventListener('click',()=>openUrl('https://zingy-tiramisu-a8f5de.netlify.app'));
  if(el('setCredits')) el('setCredits').addEventListener('click',()=>el('setCreditsBox').classList.toggle('hidden'));
  if(el('setAdsPrivacy')) el('setAdsPrivacy').addEventListener('click',()=>{ if(window.Ads) Ads.showPrivacyOptions(); });

  // soft UI click feedback on menu controls
  document.addEventListener('pointerdown',e=>{
    if(e.target.closest && e.target.closest('.btn,.btn-ghost,.pause-btn,.shop-buy,.seg-b,.sw,.up-card,.shop-card,.hub-tile,.daily-pill')){
      if(window.Audio2){ Audio2.init(); Audio2.blip(620,0.05,'sine',0.10); }
    }
  },true);

  // pause + flush save when the app loses foreground (mobile can kill the webview)
  addEventListener('visibilitychange',()=>{ if(document.hidden){ if(G.state==='playing') pauseToggle(); if(window.SaveData) SaveData.saveNow(); } });
  addEventListener('pagehide',()=>{ if(window.SaveData) SaveData.saveNow(); });
  try{ if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.App){
    Capacitor.Plugins.App.addListener('appStateChange',s=>{ if(!s.isActive && window.SaveData) SaveData.saveNow(); });
    Capacitor.Plugins.App.addListener('backButton',()=>{ try{ gameBack(); }catch(e){} });   // Android hardware back → in-app navigation, not app exit
  } }catch(e){}
}
// hardware/back-gesture navigation: close the topmost screen/modal instead of killing the app
function gameBack(){
  for(const m of ['confirmWipe','dailyModal','settingsScreen']){ const e=el(m); if(e && !e.classList.contains('hidden')){
    if(m==='settingsScreen'){ hide(m); show((window.Settings&&Settings._returnTo)||'titleScreen'); } else hide(m); return; } }
  const st=G.state;
  if(st==='upgrade'||st==='event'||st==='relic'||st==='loading') return;   // mid-run choice / loading interstitial → ignore back
  if(st==='playing'||st==='paused'){ pauseToggle(); return; }
  if(st==='gameover'){ G.toMenu(); return; }
  if(['market','challenges','ach','codex','cosmetics','stats'].indexOf(st)>=0){ G.openProgress(); return; }  // Progress sub-screens
  if(['shop','chars','progress','playsetup'].indexOf(st)>=0){ G.toMenu(); return; }
  if(st==='title'){ try{ if(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.App&&Capacitor.Plugins.App.exitApp) Capacitor.Plugins.App.exitApp(); }catch(e){} return; }
  G.toMenu();
}
function pauseToggle(){
  if(G.state==='playing'){ G.state='paused'; show('pauseScreen'); if(typeof buildPauseSummary==='function') buildPauseSummary(); }
  else if(G.state==='paused'){ G.state='playing'; hide('pauseScreen'); }
}

/* ---------------------- PERSONAL DEV CHEAT (off by default; never auto-enabled) ----------------------
   Open the browser console (F12) and run:  cheat()   → infinite scrap & cores (persists)
   Run  cheat(false)  to turn it off.  Ships OFF — players never get it unless they enable it themselves. */
window.cheat = function(on){
  if(on===undefined) on = !SaveData.data.devCheat;
  SaveData.data.devCheat = !!on; SaveData.saveNow();
  try{ if(G && G.updateScrapUI) G.updateScrapUI(); }catch(e){}
  try{ if(typeof buildShop==='function') buildShop(); }catch(e){}
  try{ if(typeof buildMarket==='function') buildMarket(); }catch(e){}
  try{ if(typeof buildArsenal==='function') buildArsenal(); }catch(e){}
  return on ? '✓ CHEAT ON — rottami e nuclei infiniti (esegui cheat(false) per spegnere)' : '✗ cheat spento';
};
// convenience: press F8 in-game to toggle infinite scrap/cores (with on-screen confirmation)
window.addEventListener('keydown', function(e){
  if(e.key==='F8' || e.keyCode===119){ e.preventDefault(); window.cheat();
    const on=SaveData.data.devCheat; if(typeof toast==='function') toast(on?'⬢ ROTTAMI INFINITI: ON':'rottami infiniti: OFF');
  }
});

/* ---------------------- BOOT ---------------------- */
wire();
G.init();
