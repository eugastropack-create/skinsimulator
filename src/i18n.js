import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// ============================================================
// ÇOKLU DİL DESTEĞİ (i18n)
// ============================================================
// TEK SÖZLÜK KAYNAĞI. Arayüzde görünen HİÇBİR metin bileşenlerin içine
// gömülmez — hepsi buradaki `DICT`ten `t('anahtar')` ile çekilir.
//
// KURALLAR:
//   1. VARSAYILAN DİL İNGİLİZCE'dir (`DEFAULT_LANG = 'en'`). Site uluslararası
//      bir kitleye açık; Türkçe ikinci dildir.
//   2. Yeni bir metin eklerken HER İKİ dile de ekle. Eksik anahtar durumunda
//      `t()` önce İngilizce'ye, o da yoksa anahtarın kendisine düşer — böylece
//      arayüz asla boş/patlamış görünmez (sessiz bozulma yerine görünür anahtar).
//   3. Kod içi YORUMLAR Türkçe kalır (proje kuralı); yalnızca KULLANICIYA
//      GÖRÜNEN metinler sözlüğe girer.
//
// DEĞİŞKEN ARAYÜZÜ: `t('key', { n: 5 })` → sözlükte `{n}` yer tutucusu.

export const DEFAULT_LANG = 'en';

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', flag: '🇬🇧' },
  { code: 'tr', label: 'Türkçe', short: 'TR', flag: '🇹🇷' }
];

const DICT = {
  // ==========================================================
  // İNGİLİZCE (varsayılan)
  // ==========================================================
  en: {
    // --- Üst yardımcı çubuk ---
    'util.inventory': '🎒 Inventory ({n})',
    'util.wallet': '💼 Wallet',
    'util.unlimited': '♾️ Unlimited',
    'util.reset': '🔄 Reset',
    'util.buyPass': '🎟️ +40 ⭐ · $16.00',
    'util.unlimitedBalance': '♾️ Unlimited Balance',
    'util.virtualEarnings': '🧪 virtual: ${n}',
    'util.language': 'Language',
    'util.blog': '📖 Guides',

    // --- Logo / fiyat kaynağı ---
    'app.priceLive': '🟢 Live market prices',
    'app.priceMock': '🟡 Simulated prices (live source unreachable)',

    // --- Arama ---
    'search.placeholder': 'Search Cases or Items',
    'search.empty': 'No results found',
    'search.inside': 'inside: {name}',

    // --- Navigasyon ---
    'nav.tradeup': 'Trade Up',
    'nav.cases': 'Cases',
    'nav.terminals': 'Terminals',
    'nav.armory': 'Armory',
    'nav.souvenirs': 'Souvenirs',
    'nav.stickers': 'Stickers',

    // --- Kutu türü rozetleri ---
    'kind.case': 'Case',
    'kind.terminal': 'Terminal',
    'kind.armory': 'Armory',
    'kind.souvenir': 'Souvenir',
    'kind.sticker': 'Sticker',
    'kind.charm': 'Charm',

    // --- Liste / sıralama ---
    'sort.default': 'Default',
    'sort.roi': '📈 Most Profitable',
    'sort.expensive': '💎 Most Expensive',
    'sort.cheap': '🪙 Cheapest',
    'sort.popular': '🔥 Most Popular',
    'list.results': '{n} results',
    'list.empty': 'No content found in this category.',
    'list.loading': 'Loading live CS2 data…',
    'list.contents': '🔍 Contents',
    'list.opened': '🔥 {n}x',

    // --- Ortak ---
    'common.back': '‹ Back',
    'common.wallet': 'Wallet: ${n}',
    'common.unlimitedMode': '♾️ Unlimited Mode',
    'common.opened': 'Opened',
    'common.spent': 'Spent',
    'common.won': 'Won',
    'common.profit': 'Profit/Loss',
    'common.keep': 'Add to Inventory',
    'common.keepAll': 'Add All to Inventory',
    'common.sellNow': 'Sell Now (${n})',
    'common.sellAll': 'Sell All (${n})',
    'common.close': 'Close',
    'common.cancel': 'Cancel',
    'common.expectedValue': 'Expected Value',
    'common.roi': 'ROI',
    'common.maxWin': 'Max Win',
    'common.multiOpen': 'Multi Open',
    'common.openX': '{n}x Open',
    'common.insufficientBalance': 'Insufficient balance! (${n} required)',
    'common.insufficientCredits': 'Insufficient credits! ({n} ⭐ required)',
    'common.contentsUnreadable': 'Could not read this container’s contents.',

    // --- Kasa / Souvenir ---
    'case.openCase': 'OPEN CASE',
    'case.openPackage': 'OPEN PACKAGE',
    'case.costBreakdown': 'Case: ${case} + 🔑 Key: ${key}',
    'case.costSouvenir': 'Package: ${n} · no key required',
    'case.batchOpening': '🎰 Opening {n}x…',
    'case.batchSequential': '🎁 Opening {n}x — {done}/{total}',
    'case.batchDone': '✅ {n}x Opened!',
    'case.instantShow': '⏩ Show Now',

    // --- Terminal ---
    'terminal.subtitle': 'Armory Terminal · pay in USD · no key required',
    'terminal.start': 'START TERMINAL',
    'terminal.ready': '> TERMINAL READY',
    'terminal.readyHint': 'Start to scan modules and receive offers',
    'terminal.statusReady': 'READY',
    'terminal.statusOffers': 'OFFERS READY',
    'terminal.offersTitle': 'Choose Your Item',
    'terminal.claim': '✓ Claim Item',
    'terminal.skipNext': 'Skip →',
    'terminal.optionOf': 'Option {i} / {n}',
    'terminal.lastOption': 'Last option — skipping is no longer possible.',
    'terminal.noGoingBack': 'Skipped items cannot be recovered.',
    'terminal.stepHint': 'Claim this item, or skip to see the next offer.',
    'terminal.offersHint': 'Offers are shown one at a time. Claim one to end the session — the last option cannot be skipped.',
    'terminal.offerCount': '{n} offers generated',
    'terminal.bonusSlot': '⚡ BONUS SLOT UNLOCKED',
    'terminal.bonusHint': 'A rare 6th offer appeared in this session!',
    'terminal.float': 'Float',
    'terminal.pattern': 'Pattern',
    'terminal.price': 'Price',
    'terminal.buy': 'Buy',
    'terminal.skip': 'Skip',
    'terminal.skipped': 'Skipped',
    'terminal.skipAll': 'Skip All & Close',
    'terminal.prev': '‹ Previous',
    'terminal.next': 'Next ›',
    'terminal.offerOf': 'Offer {i} / {n}',
    'terminal.purchased': 'ITEM DISPENSED',
    'terminal.purchasedToast': '{name} claimed — ${n} spent',
    'terminal.offerWord': 'OFFER',
    'terminal.skippedToast': 'Session closed — no item claimed.',
    'terminal.allSkipped': 'All offers skipped.',
    'terminal.creditCost': '{n} ⭐',
    'terminal.sessionCost': 'Session cost: {n} ⭐',
    'terminal.credits': 'Credits',

    // --- Sticker kapsülü ---
    'capsule.subtitle': 'Sticker Capsule',
    'capsule.open': 'OPEN CAPSULE',
    'capsule.opening': 'Opening capsule…',
    'capsule.tearing': 'Tearing…',

    // --- Armory ---
    'armory.charmCapsule': '🔗 Charm Capsule',
    'armory.stickerCapsule': '🏷️ Sticker Capsule',
    'armory.limitedTag': '🔥 Limited Edition Item — Guaranteed Special Item (25⭐)',
    'armory.mintCost': 'Mint Cost',
    'armory.floatRange': 'Float Range',
    'armory.rarity': 'Rarity',
    'armory.spendStars': 'Spend Credits ({n}⭐)',
    'armory.mint': 'Mint ({n}⭐)',
    'armory.minting': 'Minting…',
    'armory.extracting': 'Extracting item…',
    'armory.mintedTitle': 'Special Item Minted!',
    'armory.stickerTitle': 'You got a Sticker!',
    'armory.charmTitle': 'You got a Charm!',
    'armory.itemTitle': 'Armory Item!',
    'armory.cost': 'Cost',
    'armory.marketValue': 'Market Value',
    'armory.profitRoi': 'Profit/Loss (%ROI)',
    'armory.batchDone': '✅ {n}x Opened!',
    'armory.insufficientStars': 'Insufficient credits! ({n}⭐ required)',

    // --- İçerik önizlemesi ---
    'contents.title': 'Contents & Drop Rates',
    'contents.inlineTitle': 'Possible Drops ({n})',
    'contents.show': '▼ Show',
    'contents.hide': '▲ Hide',
    'contents.items': '{n} items',
    'contents.showKnives': '▼ Show More Knives (+{n})',
    'contents.hideKnives': '▲ Hide Knives',
    'contents.guaranteed': 'Guaranteed Item',
    'contents.unreadable': 'Could not load this container’s contents.',
    'contents.close': '✕ Close',

    // --- Trade-Up ---
    'tradeup.title': 'Trade Up Contract',
    'tradeup.outcomesHeader': 'Possible Outcomes & Profitability Rate',
    'tradeup.reset': '🗑 Reset',
    'tradeup.tabContract': 'Contract',
    'tradeup.tabHistory': '📜 Past Trade-Ups ({n})',
    'tradeup.summary': '📊 Contract Summary ({done}/{total})',
    'tradeup.inputs': 'Contract Inputs',
    'tradeup.sign': 'SIGN CONTRACT ({done}/{total})',
    'tradeup.avgFloat': 'Avg. Float',
    'tradeup.totalCost': 'Input Value',
    'tradeup.freeBadge': '🧪 Free simulator — your balance is never charged',
    'tradeup.expectedValue': 'Expected Value',
    'tradeup.estProfit': 'Est. Profit',
    'tradeup.source': '📦 Source: {names}',
    'tradeup.knifeRecipe': 'Special Recipe Active:',
    'tradeup.knifeRecipeBody': '5 Covert (Red) items = one random Gold reward (Knife / Gloves). The remaining 5 slots are locked. This trade does not exist in real CS2 — it is simulator-only.',
    'tradeup.noOutcomes': '⚠️ No valid outcome found one rarity above the selected items. Try different items.',
    'tradeup.outcomes': 'Possible Outcomes ({n})',
    'tradeup.moreItems': '+{n} more items',
    'tradeup.emptyHint': 'Add items to the contract to see results. Signing requires exactly 10 items of the same rarity.',
    'tradeup.addItem': 'Add Item',
    'tradeup.locked': 'Locked',
    'tradeup.clone': '📋 Clone',
    'tradeup.pickerTitle': 'Select a Valid Item',
    'tradeup.pickerSearch': 'Search item…',
    'tradeup.pickerEmpty': 'No matching item found.',
    'tradeup.clearHistory': '🗑 Clear History',
    'tradeup.historyEmpty': 'You haven’t signed a Trade-Up contract yet.',
    'tradeup.newContract': '🔄 Start New Contract',
    'tradeup.closeResult': 'Close Result',
    'tradeup.knifeWin': '🔪 KNIFE UNBOXED!',
    'tradeup.contractSuccess': 'Contract Successful!',
    'tradeup.recent': '🕘 Recently used',
    'tradeup.recentHint': 'Start typing, or your recently used items will appear here once you pick one.',
    'tradeup.excluded': '⚠️ Found {n} item(s) matching “{q}”, but they are Knives / Gloves / Stickers — they cannot be used as trade-up INPUTS (they can be the RESULT of a contract, not the material). Covert (Red) weapons, however, CAN now be used as input: place 5 of them to unlock the knife/glove draw.',
    'tradeup.knifeWin': '🔪 BIÇAK ÇIKTI!',
    'tradeup.contractSuccess': 'Sözleşme Başarılı!',
    'tradeup.recent': '🕘 Son kullandıkların',
    'tradeup.recentHint': 'Aramaya başla veya bir kez eşya seçtiğinde burada son kullandıkların görünecek.',
    'tradeup.excluded': '⚠️ “{q}” için {n} eşya bulundu ama bunlar Bıçak / Eldiven / Sticker türünde — trade-up GİRDİSİ olarak kullanılamazlar (bunlar sözleşmenin SONUCU olabilir, malzemesi değil). Kırmızı (Covert) silahlar ise artık girdi olarak KULLANILABİLİR: 5 tane koyarsan bıçak/eldiven çekilişi açılır.',
    'tradeup.lockedCovert': '🔒 The Covert recipe uses only {n} items — remaining slots are locked.',
    'tradeup.lockedDeadEnd': 'This slot is locked because no higher-tier outcome exists for this rarity. Try different items.',

    // --- Envanter ---
    'inv.empty': 'Your inventory is empty.',
    'inv.sortNewest': '🆕 Newest',
    'inv.sortPriceDesc': '💎 Expensive → Cheap',
    'inv.sortPriceAsc': '🪙 Cheap → Expensive',
    'inv.sortFloatAsc': '✨ Best Float',
    'inv.sortFloatDesc': '🩹 Worst Float',
    'inv.multiSelect': '☑️ Multi Select',
    'inv.multiSelectOn': '✓ Selection Mode On',
    'inv.selectAll': 'Select All',
    'inv.selectNone': 'Deselect All',
    'inv.sellSelected': '💰 Sell Selected ({n}) — ${total}',
    'inv.clear': '🗑 Clear',
    'inv.sell': 'Sell',

    // --- İnceleme modalı ---
    'inspect.marketValue': 'estimated market value',
    'inspect.wearPosition': 'Wear Position',
    'inspect.rarity': 'Rarity',
    'inspect.wear': 'Wear',
    'inspect.floatFull': 'Float (full)',
    'inspect.pattern': 'Pattern (seed)',
    'inspect.statTrak': 'StatTrak™',
    'inspect.source': 'Source',
    'inspect.acquired': 'Acquired',
    'inspect.yes': 'Yes',
    'inspect.no': 'No',
    'inspect.sell': '💰 Sell (${n})',
    'inspect.toTradeUp': '🔄 Add to Trade-Up',

    // --- Modallar / onay ---
    'modal.clearInvTitle': 'Clear Inventory',
    'modal.clearInvBody': 'All your items will be permanently deleted. Are you sure?',
    'modal.clearInvConfirm': 'Yes, Clear',
    'modal.resetAllTitle': 'Reset All Data',
    'modal.resetAllBody': 'Balance, credits, inventory, opening history and trade-up history will ALL be deleted and the app will return to its initial state. This cannot be undone.',
    'modal.resetAllConfirm': 'Yes, Start Over',
    'modal.sellTitle': '💰 Confirm Sale',
    'modal.sellSandboxTitle': '♾️ Unlimited Mode',
    'modal.sellBodyOne': 'Are you sure you want to sell this item?',
    'modal.sellBodyMany': 'Are you sure you want to sell the selected items?',
    'modal.sellSandboxBody': 'You are currently in Unlimited Mode. Would you like to switch to Wallet Mode so the proceeds are added to your main balance?',
    'modal.sellSwitchWallet': '💼 Switch to Wallet & Sell',
    'modal.sellSandbox': '♾️ Sell in Unlimited Mode',
    'modal.sellYes': 'Yes, Sell',
    'modal.sellNo': 'No',
    'modal.itemsCount': '{n} items',

    // --- Bildirimler ---
    'toast.passBought': 'Armory Pass purchased: +40 ⭐',
    'toast.passInsufficient': 'Insufficient balance! Armory Pass costs $16.00.',
    'toast.passUnlimited': 'Unlimited Mode is active — you don’t need to buy credits.',
    'toast.invCleared': 'Inventory cleared.',
    'toast.allReset': 'All data reset — starting fresh!',
    'toast.sold': '{subject} sold — +${n}',
    'toast.soldVirtual': '{subject} sold — +${n} (virtual)',

    // --- Sorumluluk reddi ---
    'footer.privacy': 'Privacy Policy',
    'footer.contact': 'Contact',
    'footer.about': 'About',
    'disclaimer.title': 'DISCLAIMER',
    'disclaimer.close': 'Dismiss disclaimer',
    'disclaimer.l1': 'This application is an entertainment-only simulator.',
    'disclaimer.l2': 'Virtual items/skins obtained here cannot be transferred or traded to any real game (Steam, CS2, etc.) in any way.',
    'disclaimer.l3': 'There is no real-money deposit, withdrawal or gambling mechanism on this site.',
    'disclaimer.notAffiliated': 'Not affiliated with or endorsed by Valve Corporation. Counter-Strike is a trademark of Valve Corporation.'
  },

  // ==========================================================
  // TÜRKÇE
  // ==========================================================
  tr: {
    'util.inventory': '🎒 Envanter ({n})',
    'util.wallet': '💼 Cüzdan',
    'util.unlimited': '♾️ Sınırsız',
    'util.reset': '🔄 Sıfırla',
    'util.buyPass': '🎟️ +40 ⭐ · $16.00',
    'util.unlimitedBalance': '♾️ Sınırsız Bakiye',
    'util.virtualEarnings': '🧪 sanal: ${n}',
    'util.language': 'Dil',
    'util.blog': '📖 Rehber',

    'app.priceLive': '🟢 Canlı piyasa fiyatları',
    'app.priceMock': '🟡 Simüle fiyatlar (canlı kaynak erişilemedi)',

    'search.placeholder': 'Kasa veya Eşya Ara',
    'search.empty': 'Sonuç bulunamadı',
    'search.inside': 'içinde: {name}',

    'nav.tradeup': 'Takas',
    'nav.cases': 'Kasalar',
    'nav.terminals': 'Terminaller',
    'nav.armory': 'Cephanelik',
    'nav.souvenirs': 'Hatıralar',
    'nav.stickers': 'Çıkartmalar',

    'kind.case': 'Kasa',
    'kind.terminal': 'Terminal',
    'kind.armory': 'Cephanelik',
    'kind.souvenir': 'Hatıra',
    'kind.sticker': 'Çıkartma',
    'kind.charm': 'Nazarlık',

    'sort.default': 'Varsayılan',
    'sort.roi': '📈 En Karlı',
    'sort.expensive': '💎 En Pahalı',
    'sort.cheap': '🪙 En Ucuz',
    'sort.popular': '🔥 En Popüler',
    'list.results': '{n} sonuç',
    'list.empty': 'Bu kategoride gösterilecek içerik bulunamadı.',
    'list.loading': 'Canlı CS2 verisi yükleniyor…',
    'list.contents': '🔍 İçerik',
    'list.opened': '🔥 {n}x',

    'common.back': '‹ Geri',
    'common.wallet': 'Cüzdan: ${n}',
    'common.unlimitedMode': '♾️ Sınırsız Mod',
    'common.opened': 'Açılan',
    'common.spent': 'Harcanan',
    'common.won': 'Kazanılan',
    'common.profit': 'Kâr/Zarar',
    'common.keep': 'Envantere Ekle',
    'common.keepAll': 'Tümünü Envantere Ekle',
    'common.sellNow': 'Hemen Sat (${n})',
    'common.sellAll': 'Tümünü Sat (${n})',
    'common.close': 'Kapat',
    'common.cancel': 'İptal',
    'common.expectedValue': 'Beklenen Değer',
    'common.roi': 'ROI',
    'common.maxWin': 'Maks. Kazanç',
    'common.multiOpen': 'Çoklu Açılış',
    'common.openX': '{n}x Aç',
    'common.insufficientBalance': 'Yetersiz bakiye! (${n} gerekli)',
    'common.insufficientCredits': 'Yetersiz kredi! ({n} ⭐ gerekli)',
    'common.contentsUnreadable': 'Bu kutunun içeriği okunamadı.',

    'case.openCase': 'KASAYI AÇ',
    'case.openPackage': 'PAKETİ AÇ',
    'case.costBreakdown': 'Kasa: ${case} + 🔑 Anahtar: ${key}',
    'case.costSouvenir': 'Paket: ${n} · anahtar gerekmez',
    'case.batchOpening': '🎰 {n}x Açılıyor…',
    'case.batchSequential': '🎁 {n}x Açılıyor — {done}/{total}',
    'case.batchDone': '✅ {n}x Açıldı!',
    'case.instantShow': '⏩ Hemen Göster',

    'terminal.subtitle': 'Armory Terminali · dolar ile ödeme · anahtar gerekmez',
    'terminal.start': 'TERMİNALİ BAŞLAT',
    'terminal.ready': '> TERMİNAL HAZIR',
    'terminal.readyHint': 'Modülleri tarayıp teklifleri almak için başlat',
    'terminal.statusReady': 'HAZIR',
    'terminal.statusOffers': 'TEKLİFLER HAZIR',
    'terminal.offersTitle': 'Eşyanı Seç',
    'terminal.claim': '✓ Eşyayı Al',
    'terminal.skipNext': 'Pas Geç →',
    'terminal.optionOf': 'Seçenek {i} / {n}',
    'terminal.lastOption': 'Son seçenek — artık pas geçilemez.',
    'terminal.noGoingBack': 'Pas geçilen eşyaya geri dönülemez.',
    'terminal.stepHint': 'Bu eşyayı al ya da pas geçip sonraki teklife bak.',
    'terminal.offersHint': 'Teklifler tek tek sunulur. Birini alınca oturum biter — son seçenek pas geçilemez.',
    'terminal.offerCount': '{n} teklif üretildi',
    'terminal.bonusSlot': '⚡ BONUS SLOT AÇILDI',
    'terminal.bonusHint': 'Bu oturumda nadir görülen 6. teklif belirdi!',
    'terminal.float': 'Float',
    'terminal.pattern': 'Desen',
    'terminal.price': 'Fiyat',
    'terminal.buy': 'Satın Al',
    'terminal.skip': 'Geç',
    'terminal.skipped': 'Geçildi',
    'terminal.skipAll': 'Hepsini Geç & Kapat',
    'terminal.prev': '‹ Önceki',
    'terminal.next': 'Sonraki ›',
    'terminal.offerOf': 'Teklif {i} / {n}',
    'terminal.purchased': 'EŞYA TESLİM EDİLDİ',
    'terminal.purchasedToast': '{name} alındı — ${n} harcandı',
    'terminal.offerWord': 'TEKLİF',
    'terminal.skippedToast': 'Oturum kapatıldı — eşya alınmadı.',
    'terminal.allSkipped': 'Tüm teklifler geçildi.',
    'terminal.creditCost': '{n} ⭐',
    'terminal.sessionCost': 'Oturum maliyeti: {n} ⭐',
    'terminal.credits': 'Kredi',

    'capsule.subtitle': 'Sticker Kapsülü',
    'capsule.open': 'KAPSÜLÜ AÇ',
    'capsule.opening': 'Kapsül açılıyor…',
    'capsule.tearing': 'Yırtılıyor…',

    'armory.charmCapsule': '🔗 Charm Kapsülü',
    'armory.stickerCapsule': '🏷️ Sticker Kapsülü',
    'armory.limitedTag': '🔥 Limited Edition Item — Garantili Özel Eşya (25⭐)',
    'armory.mintCost': 'Basım Maliyeti',
    'armory.floatRange': 'Float Aralığı',
    'armory.rarity': 'Nadirlik',
    'armory.spendStars': 'Kredi Harca ({n}⭐)',
    'armory.mint': 'Bas ({n}⭐)',
    'armory.minting': 'Basılıyor…',
    'armory.extracting': 'Eşya çıkarılıyor…',
    'armory.mintedTitle': 'Özel Eşya Basıldı!',
    'armory.stickerTitle': 'Sticker Kazandın!',
    'armory.charmTitle': 'Charm Kazandın!',
    'armory.itemTitle': 'Cephanelik Eşyası!',
    'armory.cost': 'Maliyet',
    'armory.marketValue': 'Piyasa Değeri',
    'armory.profitRoi': 'Kâr/Zarar (%ROI)',
    'armory.batchDone': '✅ {n}x Açıldı!',
    'armory.insufficientStars': 'Yetersiz kredi! ({n}⭐ gerekli)',

    'contents.title': 'İçerik & Çıkış Oranları',
    'contents.inlineTitle': 'Bu Kutudan Çıkabilecekler ({n})',
    'contents.show': '▼ Göster',
    'contents.hide': '▲ Gizle',
    'contents.items': '{n} eşya',
    'contents.showKnives': '▼ Daha Fazla Bıçak Göster (+{n})',
    'contents.hideKnives': '▲ Bıçakları Gizle',
    'contents.guaranteed': 'Garantili Eşya',
    'contents.unreadable': 'Bu kutunun içeriği yüklenemedi.',
    'contents.close': '✕ Kapat',

    'tradeup.title': 'Takas Sözleşmesi',
    'tradeup.outcomesHeader': 'Olası İhtimaller & Karlılık Oranı',
    'tradeup.reset': '🗑 Sıfırla',
    'tradeup.tabContract': 'Sözleşme',
    'tradeup.tabHistory': '📜 Geçmiş Takaslar ({n})',
    'tradeup.summary': '📊 Sözleşme Özeti ({done}/{total})',
    'tradeup.inputs': 'Sözleşme Girdileri',
    'tradeup.sign': 'SÖZLEŞMEYİ İMZALA ({done}/{total})',
    'tradeup.avgFloat': 'Ort. Float',
    'tradeup.totalCost': 'Girdi Değeri',
    'tradeup.freeBadge': '🧪 Ücretsiz simülatör — bakiyenizden düşülmez',
    'tradeup.expectedValue': 'Beklenen Değer',
    'tradeup.estProfit': 'Tahmini Kâr',
    'tradeup.source': '📦 Kaynak: {names}',
    'tradeup.knifeRecipe': 'Özel Tarif Aktif:',
    'tradeup.knifeRecipeBody': '5 Kırmızı (Covert) eşya = rastgele Sarı ödül (Bıçak / Eldiven). Kalan 5 yuva kilitlendi. Bu geçiş gerçek CS2’de yoktur, simülatöre özeldir.',
    'tradeup.noOutcomes': '⚠️ Seçilen eşyaların bir üst nadirlik derecesinde uygun çıktısı bulunamadı. Farklı eşyalar deneyin.',
    'tradeup.outcomes': 'Olası Çıktılar ({n})',
    'tradeup.moreItems': '+{n} eşya daha',
    'tradeup.emptyHint': 'Sonuçları görmek için sözleşmeye eşya ekleyin. İmzalamak için aynı nadirlikte tam 10 eşya gerekir.',
    'tradeup.addItem': 'Eşya Ekle',
    'tradeup.locked': 'Kilitli',
    'tradeup.clone': '📋 Kopyala',
    'tradeup.pickerTitle': 'Geçerli Eşya Seç',
    'tradeup.pickerSearch': 'Eşya ara…',
    'tradeup.pickerEmpty': 'Eşleşen eşya bulunamadı.',
    'tradeup.clearHistory': '🗑 Geçmişi Temizle',
    'tradeup.historyEmpty': 'Henüz bir Takas sözleşmesi imzalamadın.',
    'tradeup.newContract': '🔄 Yeni Sözleşme Başlat',
    'tradeup.closeResult': 'Sonucu Kapat',
    'tradeup.lockedCovert': '🔒 Kırmızı (Covert) tarifi yalnızca {n} eşya kullanır — kalan yuvalar kilitli.',
    'tradeup.lockedDeadEnd': 'Bu nadirlikte üst seviye eşya bulunamadığı için bu yuva kilitli. Farklı eşyalarla yeniden dene.',

    'inv.empty': 'Envanterin boş.',
    'inv.sortNewest': '🆕 En Yeni',
    'inv.sortPriceDesc': '💎 Pahalı → Ucuz',
    'inv.sortPriceAsc': '🪙 Ucuz → Pahalı',
    'inv.sortFloatAsc': '✨ En İyi Float',
    'inv.sortFloatDesc': '🩹 En Kötü Float',
    'inv.multiSelect': '☑️ Çoklu Seç',
    'inv.multiSelectOn': '✓ Seçim Modu Açık',
    'inv.selectAll': 'Tümünü Seç',
    'inv.selectNone': 'Hiçbirini Seçme',
    'inv.sellSelected': '💰 Seçilenleri Sat ({n}) — ${total}',
    'inv.clear': '🗑 Sıfırla',
    'inv.sell': 'Sat',

    'inspect.marketValue': 'tahmini piyasa değeri',
    'inspect.wearPosition': 'Aşınma Konumu',
    'inspect.rarity': 'Nadirlik',
    'inspect.wear': 'Aşınma',
    'inspect.floatFull': 'Float (tam)',
    'inspect.pattern': 'Desen (seed)',
    'inspect.statTrak': 'StatTrak™',
    'inspect.source': 'Kaynak',
    'inspect.acquired': 'Kazanıldı',
    'inspect.yes': 'Evet',
    'inspect.no': 'Hayır',
    'inspect.sell': '💰 Sat (${n})',
    'inspect.toTradeUp': '🔄 Takasa Ekle',

    'modal.clearInvTitle': 'Envanteri Sıfırla',
    'modal.clearInvBody': 'Tüm eşyaların kalıcı olarak silinecek. Emin misin?',
    'modal.clearInvConfirm': 'Evet, Sıfırla',
    'modal.resetAllTitle': 'Tüm Verileri Sıfırla',
    'modal.resetAllBody': 'Bakiye, kredi, envanter, açma geçmişi ve takas geçmişi dahil TÜM veriler silinip uygulama ilk açılış durumuna dönecek. Bu işlem geri alınamaz.',
    'modal.resetAllConfirm': 'Evet, Baştan Başla',
    'modal.sellTitle': '💰 Satışı Onayla',
    'modal.sellSandboxTitle': '♾️ Sınırsız Mod',
    'modal.sellBodyOne': 'Bu eşyayı satmak istediğinize emin misiniz?',
    'modal.sellBodyMany': 'Seçili eşyaları satmak istediğinize emin misiniz?',
    'modal.sellSandboxBody': 'Şu anda Sınırsız Mod’dasınız. Bu satışı gerçekleştirip geliri ana bakiyenize eklemek için Cüzdan Modu’na geçmek ister misiniz?',
    'modal.sellSwitchWallet': '💼 Cüzdan Moduna Geç ve Sat',
    'modal.sellSandbox': '♾️ Sınırsız Modda Sat',
    'modal.sellYes': 'Evet, Sat',
    'modal.sellNo': 'Hayır',
    'modal.itemsCount': '{n} eşya',

    'toast.passBought': 'Armory Pass alındı: +40 ⭐',
    'toast.passInsufficient': 'Bakiye Yetersiz! Armory Pass için $16.00 gerekiyor.',
    'toast.passUnlimited': 'Sınırsız Mod aktif — kredi satın almana gerek yok.',
    'toast.invCleared': 'Envanter sıfırlandı.',
    'toast.allReset': 'Tüm veriler sıfırlandı — baştan başlıyorsun!',
    'toast.sold': '{subject} satıldı — +${n}',
    'toast.soldVirtual': '{subject} satıldı — +${n} (sanal)',

    'footer.privacy': 'Gizlilik Politikası',
    'footer.contact': 'İletişim',
    'footer.about': 'Hakkında',
    'disclaimer.title': 'SORUMLULUK REDDİ',
    'disclaimer.close': 'Uyarıyı kapat',
    'disclaimer.l1': 'Bu uygulama sadece eğlence amaçlı bir simülatördür.',
    'disclaimer.l2': 'Sitede kazanılan sanal eşyalar/skin’ler hiçbir şekilde gerçek oyunlara (Steam, CS2 vb.) aktarılamaz veya takas edilemez.',
    'disclaimer.l3': 'Sitede gerçek para yatırma, çekme veya kumar mekanizması bulunmamaktadır.',
    'disclaimer.notAffiliated': 'Valve Corporation ile bir bağlantısı yoktur ve Valve tarafından onaylanmamıştır. Counter-Strike, Valve Corporation’ın tescilli markasıdır.'
  }
};

// `{n}` gibi yer tutucuları değerlerle doldurur.
const interpolate = (str, vars) => {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
};

// ============================================================
// CONTEXT
// ============================================================
// Uygulamanın tamamı <I18nProvider> ile sarılır; her bileşen `useI18n()` ile
// `t`, `lang` ve `setLang`'e erişir. Dil değiştiğinde React ağacı normal bir
// state güncellemesiyle yeniden render olur — sayfa yenilemeye gerek yoktur.
const I18nContext = createContext(null);

export function I18nProvider({ children, initialLang = DEFAULT_LANG }) {
  const [lang, setLang] = useState(initialLang);

  const t = useCallback((key, vars) => {
    // Sırasıyla: seçili dil → İngilizce → anahtarın kendisi.
    // Anahtarın kendisine düşmek BİLİNÇLİ: eksik çeviri sessizce boş bir
    // arayüz üretmek yerine gözle görülür bir iz bırakır.
    const raw = DICT[lang]?.[key] ?? DICT[DEFAULT_LANG]?.[key] ?? key;
    return interpolate(raw, vars);
  }, [lang]);

  const value = useMemo(() => ({ t, lang, setLang }), [t, lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Provider dışında kullanılırsa çökmek yerine İngilizce'ye düş — böylece
    // bir bileşen yanlışlıkla ağacın dışında render edilse bile arayüz çalışır.
    return { t: (k, v) => interpolate(DICT[DEFAULT_LANG][k] ?? k, v), lang: DEFAULT_LANG, setLang: () => {} };
  }
  return ctx;
}

export default { I18nProvider, useI18n, LANGUAGES, DEFAULT_LANG };
