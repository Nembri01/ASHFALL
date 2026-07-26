/* ============================================================
   ASHFALL — core engine
   utility · input · audio · particles · camera
   (classic script, no modules — runs from file:// and Capacitor)
   ============================================================ */
'use strict';

/* ---------------------- MATH / UTIL ---------------------- */
const TAU = Math.PI * 2;
const U = {
  clamp:(v,a,b)=>v<a?a:v>b?b:v,
  lerp:(a,b,t)=>a+(b-a)*t,
  rand:(a=1,b)=> b===undefined ? Math.random()*a : a+Math.random()*(b-a),
  randInt:(a,b)=>Math.floor(a+Math.random()*(b-a+1)),
  pick:arr=>arr[Math.floor(Math.random()*arr.length)],
  dist:(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by),
  dist2:(ax,ay,bx,by)=>{const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy;},
  angle:(ax,ay,bx,by)=>Math.atan2(by-ay,bx-ax),
  angleLerp:(a,b,t)=>{let d=((b-a+Math.PI)%TAU)-Math.PI;return a+d*t;},
  chance:p=>Math.random()<p,
};

/* shuffle in place */
U.shuffle = a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
/* smoothstep */
U.smooth = t=>t*t*(3-2*t);

/* ---------------------- AUDIO ENGINE ---------------------- */
/* fully synthesized — no external sound files */
const Audio2 = {
  ctx:null, master:null, musicGain:null, sfxGain:null,
  enabled:true, started:false, musicTimer:null, step:0, intensity:0,

  init(){
    if(this.started) return;
    try{
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();  this.master.gain.value = 0.9; this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();  this.sfxGain.gain.value = 0.6; this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();this.musicGain.gain.value = 0.0; this.musicGain.connect(this.master);
      this.started = true;
      this.startMusic();
    }catch(e){ this.enabled=false; }
  },
  resume(){ if(this.ctx && this.ctx.state==='suspended') this.ctx.resume(); },

  // generic blip
  blip(freq, dur, type='sine', vol=0.4, slideTo=null, dest=null){
    if(!this.enabled||!this.ctx) return;
    const t=this.ctx.currentTime;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,t);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo), t+dur);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(vol,t+0.005);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(dest||this.sfxGain); o.start(t); o.stop(t+dur+0.02);
  },
  // filtered noise burst (explosions / hits)
  noise(dur, vol=0.5, freq=900, type='lowpass'){
    if(!this.enabled||!this.ctx) return;
    const t=this.ctx.currentTime;
    const n=Math.floor(this.ctx.sampleRate*dur);
    const buf=this.ctx.createBuffer(1,n,this.ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    const src=this.ctx.createBufferSource(); src.buffer=buf;
    const f=this.ctx.createBiquadFilter(); f.type=type; f.frequency.value=freq;
    const g=this.ctx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain); src.start(t);
  },

  shoot(){ this.blip(U.rand(640,760), 0.07, 'square', 0.18, 220); },
  // weapon-specific SFX
  wPistol(){ this.shoot(); },
  wShotgun(){ this.noise(0.12,0.4,1100,'lowpass'); this.blip(180,0.12,'square',0.2,80); },
  wSmg(){ this.blip(U.rand(700,820),0.04,'square',0.12,260); },
  wRail(){ this.blip(180,0.35,'sawtooth',0.35,1600); this.noise(0.3,0.3,2200,'highpass'); },
  wFlame(){ this.noise(0.10,0.18,700,'lowpass'); },
  wLauncher(){ this.blip(140,0.18,'square',0.3,60); this.noise(0.1,0.2,400); },
  wTesla(){ this.noise(0.08,0.22,3000,'highpass'); this.blip(U.rand(900,1300),0.06,'sawtooth',0.14,400); },
  wCryo(){ this.blip(U.rand(1200,1500),0.10,'sine',0.14,700); },
  wMinigun(){ this.blip(U.rand(520,620),0.04,'square',0.12,200); },
  // distinct SFX for weapons that USED to share another gun's sound (scythe/hailstorm≠shotgun, swarm≠smg, prism/marksman≠rail, ricochet≠tesla)
  wScythe(){ this.noise(0.13,0.28,1500,'bandpass'); this.blip(300,0.12,'sawtooth',0.15,150); },
  wSwarm(){ this.blip(U.rand(940,1080),0.035,'square',0.10,380); },
  wPrism(){ this.blip(1500,0.17,'sine',0.16,3200); this.noise(0.10,0.16,4200,'highpass'); },
  wMarks(){ this.blip(240,0.3,'sawtooth',0.32,2000); this.noise(0.22,0.28,2600,'highpass'); },
  wHail(){ this.noise(0.10,0.30,2600,'highpass'); this.blip(U.rand(1300,1600),0.07,'triangle',0.12,920); },
  wRicochet(){ this.blip(U.rand(1000,1300),0.05,'square',0.14,1750); this.blip(720,0.05,'sine',0.08,1450); },
  // ability SFX
  aTurret(){ this.blip(880,0.2,'triangle',0.3,440); this.blip(660,0.15,'sine',0.2); },
  aShock(){ this.explosion(); this.blip(80,0.4,'sawtooth',0.4,30); },
  aSlow(){ this.blip(440,0.5,'sine',0.3,110); },
  aShield(){ this.blip(520,0.3,'triangle',0.3,780); this.blip(780,0.3,'sine',0.2); },
  aSing(){ this.blip(620,0.5,'sine',0.3,80); this.noise(0.45,0.3,520,'lowpass'); },        // singularity: descending implosion whoosh
  aNova(){ this.explosion(); this.blip(68,0.5,'sawtooth',0.45,26); this.blip(150,0.4,'square',0.2,40); },   // supernova: deeper/longer than shock
  hit(){ this.noise(0.06, 0.18, 2200, 'highpass'); },
  critHit(){ this.blip(1240,0.05,'square',0.17,1950); this.noise(0.05,0.16,3200,'highpass'); },   // crisp bright two-tone → a crit SOUNDS like a crit
  enemyDie(big){ this.noise(big?0.24:0.16, 0.32, big?460:700); this.blip(U.rand(160,230)*(big?0.6:1.05), big?0.24:0.16,'sawtooth',0.12,60); },   // scales pitch/length with size → a mite ≠ a brute
  eliteDie(){ [523,784].forEach((f,i)=>setTimeout(()=>this.blip(f,0.14,'square',0.22,f*1.4),i*55)); this.noise(0.2,0.3,560); },                  // its OWN sound (no longer the menu 'upgrade' chime)
  championDie(){ [392,587,784,1175].forEach((f,i)=>setTimeout(()=>this.blip(f,0.16,'sawtooth',0.26,f*1.3),i*60)); this.noise(0.3,0.4,500); },     // richer flourish for the core-dropping mini-boss
  heal(){ this.blip(660,0.12,'sine',0.25,880); this.blip(990,0.14,'sine',0.2); },           // warm rising chime for HP pickups (not the menu ding)
  explosion(){ this.noise(0.4, 0.6, 480); this.blip(90,0.4,'sawtooth',0.2,30); },
  hurt(){ this.blip(220,0.22,'sawtooth',0.35,70); this.noise(0.12,0.2,500); },
  pickup(){ this.blip(880,0.08,'sine',0.3); this.blip(1320,0.09,'sine',0.22); },
  coin(n){ const k=Math.min(n||0,12); this.blip(1100+k*55,0.045,'triangle',0.14,1500+k*55); },   // pitch CLIMBS with the pickup streak → an ascending coin-run, not a flat machine-gun
  dash(){ this.blip(420,0.18,'sine',0.25,1200); },
  levelup(){ [523,659,784,1046].forEach((f,i)=>setTimeout(()=>this.blip(f,0.18,'triangle',0.3),i*70)); },
  upgrade(){ [659,988].forEach((f,i)=>setTimeout(()=>this.blip(f,0.16,'triangle',0.3),i*90)); },
  bossWarn(){ [110,110,110].forEach((f,i)=>setTimeout(()=>{this.blip(f,0.3,'sawtooth',0.4);this.noise(0.3,0.3,300);},i*260)); },
  gameover(){ [392,330,262,196].forEach((f,i)=>setTimeout(()=>this.blip(f,0.4,'sawtooth',0.3),i*180)); },

  // ambient tension loop — slow minor arpeggio + drone, DYNAMIC: tempo & layers ramp with this.intensity (0..1)
  startMusic(){
    if(!this.enabled||!this.ctx) return;
    if(this.musicTimer){ clearTimeout(this.musicTimer); clearInterval(this.musicTimer); this.musicTimer=null; }   // no double loop
    const seq=[55,55,82.4,73.4, 55,55,98,82.4]; // A1 ... tense
    const drone=this.ctx.createOscillator(), dg=this.ctx.createGain();
    drone.type='sawtooth'; drone.frequency.value=27.5;
    dg.gain.value=0.06; drone.connect(dg); dg.connect(this.musicGain); drone.start();
    const tick=()=>{
      const I=this.intensity<0?0:(this.intensity>1?1:this.intensity);
      const f=seq[this.step%seq.length];
      this.blip(f,0.7,'triangle',0.12+I*0.05,null,this.musicGain);
      this.blip(f*2.001,0.5,'sine',0.05+I*0.04,null,this.musicGain);
      if(I>0.45){                                  // tension layers: pulsing high note + on-beat low kick
        this.blip(f*3.0,0.22,'square',0.03*I,null,this.musicGain);
        if(this.step%2===0) this.blip(55,0.16,'square',0.06*I,null,this.musicGain);
      }
      this.step++;
      this.musicTimer=setTimeout(tick, 720 - I*380);   // 720ms calm → 340ms frantic
    };
    this.musicTimer=setTimeout(tick, 600);
  },
  setIntensity(v){ this.intensity = v<0?0:(v>1?1:v); },
  _music:0.6, _sfx:0.7, _musicOn:false,
  setVolumes(music, sfx){
    this._music=music; this._sfx=sfx;
    if(this.sfxGain)   this.sfxGain.gain.value   = sfx*0.6;
    if(this.musicGain) this.musicGain.gain.value = this._musicOn ? music*0.5 : 0;
  },
  setMusic(on){ this._musicOn=on; if(this.musicGain) this.musicGain.gain.value = on ? this._music*0.5 : 0; },
  toggle(){ this.enabled=!this.enabled; if(this.master) this.master.gain.value=this.enabled?0.9:0; return this.enabled; },
};

/* ---------------------- INPUT ---------------------- */
/* movement: WASD/arrows OR a single drag joystick on touch
   aim: auto (nearest enemy) overridable by mouse / right-side touch */
const Input = {
  keys:{}, move:{x:0,y:0},          // normalized movement vector
  joyActive:false, joyId:null, joyOX:0, joyOY:0, joyX:0, joyY:0,
  mouse:{x:0,y:0,down:false,moved:false,active:false},
  aimTouch:{active:false,id:null,ox:0,oy:0,x:0,y:0},
  dashRequested:false,
  joyRadius:64,

  init(canvas){
    this.canvas=canvas;
    addEventListener('keydown',e=>{
      this.keys[e.key.toLowerCase()]=true;
      if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) e.preventDefault();
      if(e.key.toLowerCase()==='shift'||e.key===' ') this.dashRequested=true;
      Audio2.resume();
    });
    addEventListener('keyup',e=>{ this.keys[e.key.toLowerCase()]=false; });

    // mouse (desktop)
    canvas.addEventListener('mousemove',e=>{
      this.mouse.x=e.clientX; this.mouse.y=e.clientY; this.mouse.moved=true; this.mouse.active=true;
    });
    canvas.addEventListener('mousedown',e=>{ this.mouse.down=true; Audio2.resume(); });
    addEventListener('mouseup',()=>{ this.mouse.down=false; });

    // touch — left half = move joystick, right half = aim
    const half=()=>innerWidth*0.5;
    canvas.addEventListener('touchstart',e=>{
      Audio2.resume();
      for(const t of e.changedTouches){
        if(t.clientX < half() && !this.joyActive){
          this.joyActive=true; this.joyId=t.identifier;
          this.joyOX=t.clientX; this.joyOY=t.clientY; this.joyX=t.clientX; this.joyY=t.clientY;
        } else if(t.clientX >= half() && !this.aimTouch.active){
          this.aimTouch.active=true; this.aimTouch.id=t.identifier;
          this.aimTouch.ox=t.clientX; this.aimTouch.oy=t.clientY; this.aimTouch.x=t.clientX; this.aimTouch.y=t.clientY;
        }
      }
      e.preventDefault();
    },{passive:false});
    canvas.addEventListener('touchmove',e=>{
      for(const t of e.changedTouches){
        if(t.identifier===this.joyId){ this.joyX=t.clientX; this.joyY=t.clientY; }
        else if(t.identifier===this.aimTouch.id){ this.aimTouch.x=t.clientX; this.aimTouch.y=t.clientY; }
      }
      e.preventDefault();
    },{passive:false});
    const end=e=>{
      for(const t of e.changedTouches){
        if(t.identifier===this.joyId){ this.joyActive=false; this.joyId=null; this.joyX=this.joyOX; this.joyY=this.joyOY; }
        else if(t.identifier===this.aimTouch.id){ this.aimTouch.active=false; this.aimTouch.id=null; }
      }
    };
    canvas.addEventListener('touchend',end);
    canvas.addEventListener('touchcancel',end);
  },

  update(){
    // keyboard movement
    let kx=0,ky=0;
    if(this.keys['a']||this.keys['arrowleft']) kx-=1;
    if(this.keys['d']||this.keys['arrowright']) kx+=1;
    if(this.keys['w']||this.keys['arrowup']) ky-=1;
    if(this.keys['s']||this.keys['arrowdown']) ky+=1;

    if(this.joyActive){
      let dx=this.joyX-this.joyOX, dy=this.joyY-this.joyOY;
      const len=Math.hypot(dx,dy);
      const r=this.joyRadius;
      if(len>4){ const m=Math.min(len,r)/r; dx/=len; dy/=len; this.move.x=dx*m; this.move.y=dy*m; }
      else { this.move.x=0; this.move.y=0; }
    } else if(kx||ky){
      const l=Math.hypot(kx,ky)||1; this.move.x=kx/l; this.move.y=ky/l;
    } else { this.move.x=0; this.move.y=0; }
  },

  consumeDash(){ if(this.dashRequested){ this.dashRequested=false; return true; } return false; },
};

/* ---------------------- PARTICLES ---------------------- */
class Particle{
  constructor(){ this.dead=true; }
  spawn(x,y,vx,vy,life,size,color,opts={}){
    this.x=x;this.y=y;this.vx=vx;this.vy=vy;
    this.life=life;this.maxLife=life;this.size=size;this.color=color;
    this.drag=opts.drag??0.92; this.grav=opts.grav??0;
    this.shrink=opts.shrink??true; this.glow=opts.glow??true;
    this.fade=opts.fade??true; this.spin=opts.spin??0; this.rot=0;
    this.shape=opts.shape??'circle'; this.dead=false;
    return this;
  }
  update(dt){
    this.life-=dt;
    if(this.life<=0){this.dead=true;return;}
    this.vx*=this.drag; this.vy*=this.drag; this.vy+=this.grav*dt;
    this.x+=this.vx*dt; this.y+=this.vy*dt; this.rot+=this.spin*dt;
  }
  draw(ctx){
    const t=this.life/this.maxLife;
    const a=this.fade?t:1;
    const s=this.shrink?this.size*t:this.size;
    ctx.globalAlpha=a;
    if(this.glow && s>2.4 && !(window.G&&G.lowFx)){ ctx.shadowBlur=s*2.2; ctx.shadowColor=this.color; }
    ctx.fillStyle=this.color;
    if(this.shape==='circle'){
      ctx.beginPath(); ctx.arc(this.x,this.y,Math.max(0.2,s),0,TAU); ctx.fill();
    } else if(this.shape==='spark'){
      ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(Math.atan2(this.vy,this.vx));
      ctx.fillRect(-s*2,-s*0.4,s*4,s*0.8); ctx.restore();
    } else if(this.shape==='square'){
      ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(this.rot);
      ctx.fillRect(-s,-s,s*2,s*2); ctx.restore();
    }
    ctx.globalAlpha=1; ctx.shadowBlur=0;
  }
}

const Particles = {
  pool:[], active:[], free:[], max:520,
  // free-list recycling → O(1) get and no per-emit active.includes() scan (both were O(n) on the hottest path)
  get(){
    if(this.free.length) return this.free.pop();                                  // a dead particle, guaranteed NOT in active
    if(this.pool.length<this.max){ const p=new Particle(); this.pool.push(p); return p; }
    return null;                                                                  // pool exhausted
  },
  emit(x,y,vx,vy,life,size,color,opts){
    let p=this.get();
    if(p){ p.spawn(x,y,vx,vy,life,size,color,opts); this.active.push(p); return p; }   // free/new → safe to push
    p=this.active[0]; if(!p){ p=new Particle(); this.pool.push(p); this.active.push(p); }   // pool full: recycle oldest IN PLACE (already active)
    p.spawn(x,y,vx,vy,life,size,color,opts); return p;
  },
  burst(x,y,count,color,opts={}){
    const spd=opts.speed??220, life=opts.life??0.5, size=opts.size??3, spread=opts.spread??TAU, baseA=opts.dir??0;
    for(let i=0;i<count;i++){
      const a= spread>=TAU ? U.rand(TAU) : baseA + U.rand(-spread/2,spread/2);
      const s=U.rand(spd*0.3,spd);
      this.emit(x,y,Math.cos(a)*s,Math.sin(a)*s, U.rand(life*0.5,life), U.rand(size*0.6,size*1.4), color, opts);
    }
  },
  update(dt){
    for(let i=this.active.length-1;i>=0;i--){
      const p=this.active[i]; p.update(dt);
      if(p.dead){ this.active.splice(i,1); this.free.push(p); }   // return dead particle to the free-list
    }
  },
  draw(ctx){ for(const p of this.active) p.draw(ctx); },
  clear(){ for(const p of this.active) p.dead=true; this.active.length=0; this.free=this.pool.slice(); },
};

/* ---------------------- CAMERA ---------------------- */
const Camera = {
  x:0,y:0, shakeT:0, shakeMag:0, ox:0, oy:0, shakeEnabled:true,
  follow(tx,ty,w,h,dt){
    this.x = U.lerp(this.x, tx - w/2, U.clamp(dt*6,0,1));
    this.y = U.lerp(this.y, ty - h/2, U.clamp(dt*6,0,1));
    if(this.shakeT>0){
      this.shakeT-=dt;
      const m=this.shakeMag*(this.shakeT>0?1:0);
      this.ox=U.rand(-m,m); this.oy=U.rand(-m,m);
    } else { this.ox=0; this.oy=0; }
  },
  shake(mag,time=0.3){ if(!this.shakeEnabled) return; this.shakeMag=Math.max(this.shakeMag*0.6,mag); this.shakeT=Math.max(this.shakeT,time); },
  apply(ctx){ ctx.translate(-Math.round(this.x+this.ox), -Math.round(this.y+this.oy)); },
};

/* expose */
window.U=U; window.Audio2=Audio2; window.Input=Input; window.Particles=Particles; window.Camera=Camera; window.TAU=TAU;
