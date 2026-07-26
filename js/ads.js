/* ============================================================
   ASHFALL — AdManager (rewarded ads)
   Provider 'mock' (browser/dev) + 'admob' (Capacitor native).
   API:
     Ads.init()
     Ads.ready('rewarded'|'interstitial') -> bool
     Ads.showRewarded('revive'|'double'|'reroll'|'bonus') -> Promise<{rewarded,reason}>
     Ads.showInterstitial() -> Promise<bool>
     Ads.bonusReady() -> bool ; Ads.markBonusUsed()
     Ads.showPrivacyOptions()
   Never throws; degrades to mock / {rewarded:false} if the plugin is missing.
   ============================================================ */
(function () {
  'use strict';

  // ---- CONFIG ----------------------------------------------------------
  var IS_NATIVE = !!(window.Capacitor &&
    (window.Capacitor.isNativePlatform ? window.Capacitor.isNativePlatform() : window.Capacitor.isNative));
  var PLATFORM = (window.Capacitor && window.Capacitor.getPlatform) ? window.Capacitor.getPlatform() : 'web';

  // Official Google TEST ad units (DEV). Replace with your own before publishing.
  var TEST = {
    rewarded:     PLATFORM === 'ios' ? 'ca-app-pub-3940256099942544/1712485313'
                                     : 'ca-app-pub-3940256099942544/5224354917',
    interstitial: PLATFORM === 'ios' ? 'ca-app-pub-3940256099942544/4411468910'
                                     : 'ca-app-pub-3940256099942544/1033173712'
  };
  // PRODUCTION units. Two separate AdMob apps — the IDs are NOT interchangeable:
  //   Android  app ca-app-pub-8282887482969580~2335827751  (AndroidManifest meta-data)
  //   iOS      app ca-app-pub-8282887482969580~4250478995  (Info.plist GADApplicationIdentifier)
  var PROD = {
    rewarded:     PLATFORM === 'ios' ? 'ca-app-pub-8282887482969580/2112500890'
                                     : 'ca-app-pub-8282887482969580/6889436421',
    interstitial: PLATFORM === 'ios' ? 'ca-app-pub-8282887482969580/8524765928'
                                     : 'ca-app-pub-8282887482969580/8047319439'
  };
  var USE_TEST = false; // production ads ON (browser dev builds still use the mock provider)
  var UNIT = USE_TEST ? TEST : PROD;

  var LOAD_TIMEOUT = 8000;        // ms to wait for an on-demand load at show time
  var INTERSTITIAL_MIN_GAP = 120; // min seconds between interstitials
  var BONUS_COOLDOWN = 90;        // seconds cooldown for the scrap-bonus ad

  function now() { return Date.now() / 1000; }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // ---- OVERLAY UI (spinner during mock / on-demand load) ---------------
  function overlay(show, label) {
    var id = 'adOverlay', o = document.getElementById(id);
    if (!o && show) {
      o = document.createElement('div');
      o.id = id;
      o.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;background:rgba(6,8,12,.92);' +
        'color:#cfe;font:600 16px system-ui;backdrop-filter:blur(4px);';
      o.innerHTML = '<div style="width:46px;height:46px;border:3px solid #1b3a44;' +
        'border-top-color:#46e6ff;border-radius:50%;animation:adspin .8s linear infinite"></div>' +
        '<div id="adOverlayLbl" style="margin-top:14px;letter-spacing:.04em"></div>' +
        '<style>@keyframes adspin{to{transform:rotate(360deg)}}</style>';
      document.body.appendChild(o);
    }
    if (o) {
      o.style.display = show ? 'flex' : 'none';
      var l = document.getElementById('adOverlayLbl');
      if (l) l.textContent = label || 'ANNUNCIO…';
    }
  }

  // ---- MOCK PROVIDER (browser/dev) -------------------------------------
  var MockProvider = {
    name: 'mock',
    _rw: false, _it: false,
    init: function () { this._rw = true; this._it = true; return Promise.resolve(); },
    preloadRewarded: function () { var s = this; return new Promise(function (r) { setTimeout(function () { s._rw = true; r(); }, 200); }); },
    preloadInterstitial: function () { var s = this; return new Promise(function (r) { setTimeout(function () { s._it = true; r(); }, 200); }); },
    readyRewarded: function () { return this._rw; },
    readyInterstitial: function () { return this._it; },
    showRewarded: function () {
      var s = this;
      return new Promise(function (resolve) {
        overlay(true, 'ANNUNCIO DI PROVA…');
        setTimeout(function () { overlay(false); s._rw = false; resolve({ rewarded: true, reason: 'ok' }); }, 1500);
      });
    },
    showInterstitial: function () {
      var s = this;
      return new Promise(function (resolve) {
        overlay(true, 'ANNUNCIO…');
        setTimeout(function () { overlay(false); s._it = false; resolve(true); }, 1200);
      });
    }
  };

  // ---- ADMOB PROVIDER (Capacitor native) -------------------------------
  function AdMobProvider() {
    this.name = 'admob'; this.AdMob = null; this.Events = null;
    this._rwReady = false; this._itReady = false; this._npa = false;
  }
  AdMobProvider.prototype._plugin = function () {
    var P = window.Capacitor && window.Capacitor.Plugins;
    return P && P.AdMob ? P.AdMob : null;
  };
  AdMobProvider.prototype.init = function () {
    var self = this;
    self.AdMob = self._plugin();
    if (!self.AdMob) return Promise.reject(new Error('AdMob plugin missing'));
    self.Events = (window.RewardAdPluginEvents) || {
      Loaded: 'onRewardedVideoAdLoaded', Rewarded: 'onRewarded',
      FailedToLoad: 'onRewardedVideoAdFailedToLoad', FailedToShow: 'onRewardedVideoAdFailedToShow',
      Dismissed: 'onRewardedVideoAdDismissed'
    };
    return self.AdMob.initialize({ initializeForTesting: USE_TEST, testingDevices: [], tagForUnderAgeOfConsent: false })
      .then(function () { return self._consent(); })
      .then(function () {
        self.AdMob.addListener(self.Events.Loaded, function () { self._rwReady = true; });
        self.AdMob.addListener(self.Events.FailedToLoad, function () { self._rwReady = false; });
        self.AdMob.addListener(self.Events.Dismissed, function () { self._rwReady = false; });
      });
  };
  AdMobProvider.prototype._consent = function () {
    var self = this;
    return self.AdMob.requestConsentInfo({ debugGeography: USE_TEST ? 1 : 0, testDeviceIdentifiers: [] })
      .then(function (info) {
        if (info && info.isConsentFormAvailable && info.status === 'REQUIRED') {
          return self.AdMob.showConsentForm().then(function (res) {
            self._npa = !(res && res.status === 'OBTAINED');
          }).catch(function () { self._npa = true; });
        }
      }).catch(function () { self._npa = true; });
  };
  AdMobProvider.prototype.preloadRewarded = function () {
    var self = this; if (!self.AdMob) return Promise.resolve();
    return self.AdMob.prepareRewardVideoAd({ adId: UNIT.rewarded, isTesting: USE_TEST, npa: self._npa })
      .then(function () { self._rwReady = true; }).catch(function () { self._rwReady = false; });
  };
  AdMobProvider.prototype.preloadInterstitial = function () {
    var self = this; if (!self.AdMob) return Promise.resolve();
    return self.AdMob.prepareInterstitial({ adId: UNIT.interstitial, isTesting: USE_TEST, npa: self._npa })
      .then(function () { self._itReady = true; }).catch(function () { self._itReady = false; });
  };
  AdMobProvider.prototype.readyRewarded = function () { return this._rwReady; };
  AdMobProvider.prototype.readyInterstitial = function () { return this._itReady; };
  AdMobProvider.prototype.showRewarded = function () {
    var self = this;
    if (!self.AdMob) return Promise.resolve({ rewarded: false, reason: 'error' });
    return new Promise(function (resolve) {
      var done = false, sub = [];
      function cleanup() { sub.forEach(function (h) { try { h.remove && h.remove(); } catch (e) {} }); }
      Promise.all([
        self.AdMob.addListener(self.Events.Rewarded, function () { if (done) return; done = true; self._rwReady = false; cleanup(); resolve({ rewarded: true, reason: 'ok' }); }),
        self.AdMob.addListener(self.Events.Dismissed, function () { if (done) return; done = true; self._rwReady = false; cleanup(); resolve({ rewarded: false, reason: 'dismissed' }); }),
        self.AdMob.addListener(self.Events.FailedToShow, function () { if (done) return; done = true; self._rwReady = false; cleanup(); resolve({ rewarded: false, reason: 'error' }); })
      ]).then(function (handles) { sub = handles; return self.AdMob.showRewardVideoAd(); })
        .catch(function () { if (!done) { done = true; cleanup(); resolve({ rewarded: false, reason: 'error' }); } });
    });
  };
  AdMobProvider.prototype.showInterstitial = function () {
    var self = this; if (!self.AdMob) return Promise.resolve(false);
    return self.AdMob.showInterstitial().then(function () { self._itReady = false; return true; })
      .catch(function () { self._itReady = false; return false; });
  };

  // ---- FACADE: window.Ads ----------------------------------------------
  var provider = null, inited = false, initPromise = null;

  function withTimeout(p, ms, onTimeout) {
    return new Promise(function (resolve) {
      var t = setTimeout(function () { resolve(onTimeout()); }, ms);
      p.then(function (v) { clearTimeout(t); resolve(v); }, function () { clearTimeout(t); resolve(onTimeout()); });
    });
  }

  var Ads = {
    provider: 'none',
    init: function () {
      if (initPromise) return initPromise;
      var pickAdmob = IS_NATIVE;
      var build = function () {
        if (pickAdmob) {
          var ap = new AdMobProvider();
          return ap.init().then(function () { provider = ap; Ads.provider = 'admob'; })
            .catch(function () { provider = MockProvider; Ads.provider = 'mock'; return MockProvider.init(); });
        }
        provider = MockProvider; Ads.provider = 'mock'; return MockProvider.init();
      };
      initPromise = build().then(function () {
        inited = true;
        provider.preloadRewarded && provider.preloadRewarded();
        provider.preloadInterstitial && provider.preloadInterstitial();
      }).catch(function () {
        provider = MockProvider; Ads.provider = 'mock'; inited = true; return MockProvider.init();
      });
      return initPromise;
    },
    ready: function (placement) {
      if (!provider) return false;
      return placement === 'interstitial'
        ? !!provider.readyInterstitial && provider.readyInterstitial()
        : !!provider.readyRewarded && provider.readyRewarded();
    },
    showRewarded: function (placement) {
      if (!inited) return Ads.init().then(function () { return Ads.showRewarded(placement); });
      if (!provider) return Promise.resolve({ rewarded: false, reason: 'error' });
      var go = function () {
        return withTimeout(provider.showRewarded(), LOAD_TIMEOUT + 60000, function () { return { rewarded: false, reason: 'timeout' }; })
          .then(function (res) { provider.preloadRewarded && provider.preloadRewarded(); return res; });
      };
      if (provider.readyRewarded && provider.readyRewarded()) return go();
      overlay(true, 'CARICAMENTO ANNUNCIO…');
      return withTimeout((provider.preloadRewarded ? provider.preloadRewarded() : Promise.resolve()), LOAD_TIMEOUT, function () { return 'TO'; })
        .then(function (r) {
          overlay(false);
          if (provider.readyRewarded && provider.readyRewarded()) return go();
          provider.preloadRewarded && provider.preloadRewarded();
          return { rewarded: false, reason: r === 'TO' ? 'timeout' : 'no-fill' };
        });
    },
    showInterstitial: function () {
      if (!inited || !provider) return Promise.resolve(false);
      if (window.SaveData && SaveData.data && SaveData.data.noAds) return Promise.resolve(false); // "Remove ads" IAP
      var last = parseFloat(lsGet('ashfall_ad_inter_ts', '0')) || 0;
      if (now() - last < INTERSTITIAL_MIN_GAP) return Promise.resolve(false);
      if (!(provider.readyInterstitial && provider.readyInterstitial())) {
        provider.preloadInterstitial && provider.preloadInterstitial();
        return Promise.resolve(false);
      }
      return provider.showInterstitial().then(function (ok) {
        if (ok) lsSet('ashfall_ad_inter_ts', String(now()));
        provider.preloadInterstitial && provider.preloadInterstitial();
        return ok;
      });
    },
    bonusReady: function () {
      var last = parseFloat(lsGet('ashfall_ad_bonus_ts', '0')) || 0;
      return Ads.ready('rewarded') && (now() - last >= BONUS_COOLDOWN);
    },
    markBonusUsed: function () { lsSet('ashfall_ad_bonus_ts', String(now())); },
    showPrivacyOptions: function () {
      if (provider && provider.AdMob && provider.AdMob.showPrivacyOptionsForm) {
        return provider.AdMob.showPrivacyOptionsForm().catch(function () {});
      }
      return Promise.resolve();
    }
  };

  window.Ads = Ads;
})();
