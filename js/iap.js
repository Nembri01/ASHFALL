/* ============================================================
   ASHFALL — In-App Purchase ("Remove Ads")
   Mock (browser/dev) + hook for a native billing plugin.
   "Remove ads" suppresses INTERSTITIALS only; optional rewarded
   ads (revive / double / reroll / bonus) stay available.
   API: IAP.init(), IAP.owned(), IAP.buy()->Promise<bool>, IAP.restore()->Promise<bool>
   ============================================================ */
(function () {
  'use strict';

  var IS_NATIVE = !!(window.Capacitor &&
    (window.Capacitor.isNativePlatform ? window.Capacitor.isNativePlatform() : window.Capacitor.isNative));

  var PRODUCT_ID = 'ashfall_remove_ads';   // create this NON-consumable product in App Store Connect / Play Console

  // CONSUMABLE currency packs — create each as a CONSUMABLE product in App Store Connect / Play Console.
  var CURRENCY_PACKS = [
    { id: 'ashfall_scrap_small', kind: 'scrap', amount: 5000,   price: '€0,99' },
    { id: 'ashfall_scrap_big',   kind: 'scrap', amount: 30000,  price: '€3,99' },
    { id: 'ashfall_cores_small', kind: 'cores', amount: 60,     price: '€1,99' },
    { id: 'ashfall_cores_big',   kind: 'cores', amount: 350,    price: '€6,99' },
  ];
  function grantPack(p) {
    // NB: Store/G are lexical globals from game.js (NOT on window) — reference them bare with a typeof guard.
    if (!p || typeof Store === 'undefined') return;
    if (p.kind === 'scrap') Store.scrap = Store.scrap + p.amount; else Store.cores = (Store.cores || 0) + p.amount;
    if (Store.save) Store.save();
    if (typeof G !== 'undefined' && G.updateScrapUI) G.updateScrapUI();
  }

  function setOwned(v) { if (window.SaveData && SaveData.data) { SaveData.data.noAds = !!v; SaveData.saveNow(); } }

  var IAP = {
    productId: PRODUCT_ID,
    price: '€2,99',            // display fallback; a real plugin overrides with the localized store price
    packs: CURRENCY_PACKS,
    ready: false,

    // Buy a consumable currency pack. Resolves true on a verified purchase (grants the currency).
    buyPack: function (id) {
      var p = null; for (var i = 0; i < CURRENCY_PACKS.length; i++) if (CURRENCY_PACKS[i].id === id) p = CURRENCY_PACKS[i];
      if (!p) return Promise.resolve(false);
      // NATIVE: order the consumable product, verify, then grant + finish/consume it, e.g.
      //   return Capacitor.Plugins.CdvPurchase.order(id).then(ok => { if(ok){ grantPack(p); /* consume */ } return ok; });
      // MOCK (browser/dev): simulate a successful purchase and grant immediately.
      return new Promise(function (res) { setTimeout(function () { grantPack(p); res(true); }, 500); });
    },

    init: function () {
      this.ready = true;
      // NATIVE: initialise your billing plugin here and read the localized price, e.g.
      //   const store = Capacitor.Plugins.CdvPurchase; store.register({id:PRODUCT_ID, type:'non consumable'}); ...
      //   then set IAP.price = product.pricing.price and call setOwned(product.owned).
      return Promise.resolve();
    },

    owned: function () { return !!(window.SaveData && SaveData.data && SaveData.data.noAds); },

    buy: function () {
      var self = this;
      if (self.owned()) return Promise.resolve(true);
      // NATIVE: trigger the real purchase flow and resolve true only on a verified purchase.
      //   return Capacitor.Plugins.CdvPurchase.order(PRODUCT_ID).then(ok => { if(ok) setOwned(true); return ok; });
      // MOCK (browser/dev): simulate a successful purchase.
      return new Promise(function (res) { setTimeout(function () { setOwned(true); res(true); }, 600); });
    },

    restore: function () {
      // NATIVE: query past purchases and setOwned(true) if the product is owned.
      //   return Capacitor.Plugins.CdvPurchase.restorePurchases().then(()=>{ ... return IAP.owned(); });
      return Promise.resolve(this.owned());
    },
  };

  window.IAP = IAP;
})();
