// ============================================================
// REHBER / BLOG İÇERİĞİ (EN + TR)
// ============================================================
// NEDEN AYRI DOSYA: Bu metinler `src/i18n.js`'teki kısa arayüz etiketlerinden
// çok farklı bir cinstir — uzun, paragraflı, yapılandırılmış içerik. Sözlüğe
// karıştırmak i18n.js'i okunamaz hâle getirirdi.
//
// AMAÇ: Google AdSense'in içerik gereksinimleri (yüksek metin/HTML oranı,
// özgün ve gerçekten bilgilendirici içerik, semantik yapı). Bu yüzden metinler
// uygulamanın GERÇEK mekaniklerini anlatır — genel geçer doldurma metin değil.
// Buradaki oranlar ve formüller `gacas.md` §5 ile birebir aynıdır; biri
// değişirse DİĞERİ DE güncellenmelidir.
//
// BLOK MODELİ (semantik HTML'e birebir çevrilir — bkz. BlogScreen.js):
//   { type: 'p',  text }      -> <p>
//   { type: 'h3', text }      -> <h3>
//   { type: 'ul', items: [] } -> <ul><li>…</li></ul>

// ⚠️ EMOJİ KALDIRILDI: bölüm simgeleri artık `src/components/Icons.js`
// içindeki monokrom çizgi ikonlarına işaret eden ANAHTARLARdir (bkz.
// BlogScreen.js → SECTION_ICONS). Emoji her platformda farklı çizildiği ve
// renklendirilemediği için arayüzün geri kalanıyla uyuşmuyordu.
export const GUIDE_SECTIONS = [
  { id: 'about',    icon: 'book' },
  { id: 'features', icon: 'list' },
  { id: 'items',    icon: 'gem' },
  { id: 'tradeup',  icon: 'refresh' },
  { id: 'privacy',  icon: 'lock' },
  { id: 'contact',  icon: 'globe' }
];

export const GUIDE = {
  // ==========================================================
  // ENGLISH
  // ==========================================================
  en: {
    pageTitle: 'Guides & About',
    pageLead:
      'Everything you need to know about Skin Simulator: what it is, how the ' +
      'simulated economy works, how item rarity and float values are calculated, ' +
      'and how Trade-Up contracts decide their outcome.',
    updated: 'Last updated: 28 August 2026',

    about: {
      title: 'Welcome — What is Skin Simulator?',
      blocks: [
        { type: 'p', text:
          'Skin Simulator is a free, browser-based sandbox that recreates the ' +
          'container-opening mechanics of Counter-Strike 2 using real, live game data. ' +
          'You can open weapon cases, run Armory terminals, tear open sticker capsules, ' +
          'unpack souvenir packages and sign Trade-Up contracts — all without spending ' +
          'a single real cent.' },
        { type: 'p', text:
          'The purpose of the project is educational and recreational. Opening a case in ' +
          'the real game costs money, and most players never get a clear sense of what ' +
          'the odds actually feel like over hundreds of openings. Here you can find out ' +
          'in a few minutes, for free, with the same probability tables the real game uses.' },
        { type: 'h3', text: 'What this is not' },
        { type: 'p', text:
          'This is not a gambling site and not a marketplace. There is no way to deposit ' +
          'money, no way to withdraw money, and no payment processor connected to this ' +
          'project. Items you "win" exist only in your browser tab for the duration of ' +
          'your visit. They cannot be transferred, traded, sold or exported to Steam, ' +
          'Counter-Strike 2, or any other game or service.' },
        { type: 'h3', text: 'Where the data comes from' },
        { type: 'p', text:
          'Container contents, item names, rarity tiers, images and float ranges are ' +
          'pulled at runtime from a public, community-maintained CS2 data set that is ' +
          'generated from the game’s own files. Nothing is hardcoded, which means new ' +
          'cases, capsules and terminals appear here automatically shortly after Valve ' +
          'adds them to the game.' },
        { type: 'p', text:
          'Prices are resolved from a public Steam market price feed, refreshed on the ' +
          'order of weeks rather than continuously. If that feed cannot be reached, the ' +
          'simulator automatically falls back to a simulated pricing model so the site ' +
          'keeps working. Values shown are always estimates and should never be used as ' +
          'trading advice.' }
      ]
    },

    features: {
      title: 'Feature Guide — How Each Mode Works',
      blocks: [
        { type: 'h3', text: 'Cases' },
        { type: 'p', text:
          'Weapon cases use the official Counter-Strike drop distribution. Every opening ' +
          'first rolls a rarity tier, then picks a random skin from that tier, then rolls ' +
          'a float value and a StatTrak™ chance. The published odds are: Mil-Spec ' +
          '79.92%, Restricted 15.98%, Classified 3.20%, Covert 0.64%, and Rare Special ' +
          '(knives and gloves) 0.26%. Opening a case costs the container price plus a ' +
          '$2.50 key, exactly as in the real game.' },
        { type: 'h3', text: 'Terminals' },
        { type: 'p', text:
          'Armory terminals do not work like cases. Instead of dropping a single random ' +
          'item, a terminal scans and then presents you with a sequence of offers, one at ' +
          'a time. For each offer you either claim it — paying its price in dollars and ' +
          'ending the session — or skip to the next one. Skipped offers cannot be ' +
          'recovered. On the final offer you can either claim it or close the terminal ' +
          'without buying anything — you are never forced to take an item, and running the ' +
          'terminal again costs nothing. Roughly 5% of sessions unlock a rare bonus slot, ' +
          'giving you a sixth offer to choose from.' },
        { type: 'h3', text: 'Armory' },
        { type: 'p', text:
          'The Armory tab spends credits (stars) rather than dollars. Credits come from ' +
          'the Armory Pass, which converts $16.00 into 40 credits. Here you can draw from ' +
          'active weapon collections, open charm capsules, or mint the guaranteed Limited ' +
          'Edition Item. Collection draws use the same 1-in-5 rarity ladder as cases, but ' +
          'applied only to the tiers a collection actually contains. Most Armory collections ' +
          'start at Industrial Grade, so the odds work out to roughly Industrial 80.03%, ' +
          'Mil-Spec 16.01%, Restricted 3.20%, Classified 0.64% and Covert 0.13%.' },
        { type: 'h3', text: 'Souvenirs' },
        { type: 'p', text:
          'Souvenir packages come from real tournament drops. They contain no knives and ' +
          'no StatTrak™ items, and their tier structure varies from package to package — ' +
          'some map collections only contain three tiers. Because of that the simulator ' +
          'reads each package’s actual contents and re-normalises the standard odds ladder ' +
          'across whatever tiers are genuinely present.' },
        { type: 'h3', text: 'Stickers' },
        { type: 'p', text:
          'Sticker capsules use a four-tier structure — High Grade 80.13%, Remarkable ' +
          '16.02%, Exotic 3.21% and Extraordinary 0.64%. Stickers have no float and no ' +
          'pattern index, because they are flat cosmetic items rather than weapon finishes.' },
        { type: 'h3', text: 'How the economy works' },
        { type: 'p', text:
          'You start with a $150.00 balance. Opening containers subtracts from it and ' +
          'selling items adds back to it. If you would rather experiment without watching ' +
          'a balance, switch to Unlimited Mode from the top bar: nothing is deducted, and ' +
          'sales are tracked separately as "virtual" earnings so your real balance is not ' +
          'silently inflated. Nothing is saved — refreshing the page resets your balance, ' +
          'inventory and history.' },
        { type: 'h3', text: 'Expected Value and ROI' },
        { type: 'p', text:
          'Every container card shows an EV (expected value) and an ROI percentage. EV is ' +
          'the average value of a single opening, calculated by taking the mean price of ' +
          'each rarity tier and weighting it by that tier’s drop chance. ROI compares that ' +
          'expected value against what the opening costs you. An ROI below 100% means the ' +
          'container loses money on average — which is true of essentially every real ' +
          'container, and is exactly the point the simulator makes visible.' }
      ]
    },

    items: {
      title: 'Understanding Items: Rarity, Float and Pricing',
      blocks: [
        { type: 'h3', text: 'Rarity tiers' },
        { type: 'p', text:
          'Every skin belongs to a rarity tier, and each tier has a colour that players ' +
          'recognise instantly. From most common to rarest, weapon skins run Consumer ' +
          'Grade (white-grey), Industrial Grade (light blue), Mil-Spec (blue), Restricted ' +
          '(purple), Classified (pink) and Covert (red). Above all of those sits the Rare ' +
          'Special tier — knives and gloves — marked in gold.' },
        { type: 'p', text:
          'One detail trips up a lot of people: in the underlying game data, knives and ' +
          'gloves are also tagged "Covert". They are only distinguishable by their item ' +
          'category and by the fact that they live in a separate list inside each ' +
          'container. The simulator handles this correctly, which is why gold-tier items ' +
          'appear at their true 0.26% rate rather than being quietly replaced by ordinary ' +
          'red skins.' },
        { type: 'h3', text: 'Float and wear' },
        { type: 'p', text:
          'Float is a number between 0 and 1 that describes how worn a skin looks. Lower ' +
          'is cleaner. It maps onto five named wear bands: Factory New below 0.07, Minimal ' +
          'Wear below 0.15, Field-Tested below 0.38, Well-Worn below 0.45, and ' +
          'Battle-Scarred from 0.45 upward.' },
        { type: 'p', text:
          'Those bands are not equally wide, and that has a consequence most simulators ' +
          'get wrong. Battle-Scarred alone covers 55% of the 0–1 scale, so drawing a float ' +
          'uniformly at random would make more than half of all drops Battle-Scarred. The ' +
          'real game does not behave that way. This simulator therefore picks a wear band ' +
          'first using realistic weights — roughly Factory New 3%, Minimal Wear 24%, ' +
          'Field-Tested 33%, Well-Worn 24%, Battle-Scarred 16% — and only then picks a ' +
          'float inside that band.' },
        { type: 'p', text:
          'Each individual skin also has its own float limits. Some finishes can never be ' +
          'Factory New; others can never be Battle-Scarred. The generated float is scaled ' +
          'into each item’s real range, so those constraints are respected.' },
        { type: 'h3', text: 'Pattern index' },
        { type: 'p', text:
          'Alongside float, every weapon gets a pattern index (also called a paint seed) ' +
          'between 0 and 1000. It decides how a finish is positioned on the model — how ' +
          'much blue a Case Hardened shows, or how complete a Fade is. For some skins the ' +
          'pattern matters more to the price than the float does. You can see the pattern ' +
          'of any item you own in the inspect window.' },
        { type: 'h3', text: 'How prices are estimated' },
        { type: 'p', text:
          'When live market data is available, the simulator builds the exact market name ' +
          'for the item — including its wear band and any StatTrak™ or Souvenir prefix — ' +
          'and looks the price up directly. When live data is unavailable, a simulated ' +
          'price is derived from the rarity tier and adjusted for wear and StatTrak™.' },
        { type: 'p', text:
          'All prices shown anywhere in this simulator are estimates for entertainment ' +
          'purposes. Real market prices move constantly and depend on factors — pattern, ' +
          'stickers, float rank, sticker placement — that this project does not model.' }
      ]
    },

    tradeup: {
      title: 'Trade-Up Contracts Explained',
      blocks: [
        { type: 'p', text:
          'A Trade-Up contract converts ten skins of the same rarity into one skin of the ' +
          'next rarity up. It is the only mechanism in Counter-Strike that reliably moves ' +
          'items upward through the rarity ladder, and it is entirely deterministic in ' +
          'its rules even though the outcome is random.' },
        { type: 'h3', text: 'How the outcome pool is built' },
        { type: 'p', text:
          'The contract does not draw from every skin in the game. Each input item belongs ' +
          'to a collection, and each collection contributes its own next-tier skins to the ' +
          'outcome pool. A collection that supplies more of your ten inputs is ' +
          'proportionally more likely to supply the result. This is why experienced players ' +
          'deliberately stack inputs from a single collection: it concentrates the odds ' +
          'onto the specific outcome they want.' },
        { type: 'h3', text: 'How the output float is calculated' },
        { type: 'p', text:
          'The result’s float is not random. The game averages the float of all ten inputs ' +
          'and then rescales that average into the output skin’s own float range. In ' +
          'practical terms this means cleaner inputs produce a cleaner result, and it is ' +
          'why players hunt for low-float inputs before signing a contract. The Trade-Up ' +
          'screen shows you the running average as you fill slots, so you can see the ' +
          'effect immediately.' },
        { type: 'h3', text: 'Reading the profitability panel' },
        { type: 'p', text:
          'As you add items, the panel on the right lists every possible outcome with its ' +
          'individual probability, along with the total input cost, the expected value of ' +
          'the contract and the resulting profit or loss. A contract with an expected ' +
          'value below its input cost is a losing contract on average, no matter how good ' +
          'the best-case outcome looks.' },
        { type: 'h3', text: 'A deliberate difference from the real game' },
        { type: 'p', text:
          'One recipe here does not exist in Counter-Strike 2. Real trade-ups cannot take ' +
          'Covert items as inputs, because Covert is already the top of the standard ' +
          'ladder. This simulator deliberately allows it: five Covert items unlock a draw ' +
          'for a random knife or glove. It is flagged clearly in the interface, and it ' +
          'exists purely so you can explore the gold tier without opening hundreds of ' +
          'cases. Every other rule follows the real game.' }
      ]
    },

    privacy: {
      title: 'Privacy Policy',
      blocks: [
        { type: 'p', text:
          'Skin Simulator is designed to collect as little as possible. There is no user ' +
          'account, no registration, no login, and no server that belongs to this project. ' +
          'The simulator runs entirely inside your browser.' },
        { type: 'h3', text: 'Information we collect' },
        { type: 'p', text:
          'We do not collect, store or transmit personal information. We do not ask for ' +
          'your name, email address, Steam account or payment details, and there is no ' +
          'mechanism in the site capable of receiving them.' },
        { type: 'h3', text: 'Browser storage' },
        { type: 'p', text:
          'The site stores exactly one value in your browser’s local storage: a flag ' +
          'recording that you dismissed the disclaimer notice, so it does not reappear on ' +
          'every visit. It contains no personal data and is never transmitted anywhere. ' +
          'Clearing your browser data removes it.' },
        { type: 'p', text:
          'Your balance, inventory, credits and opening history are held only in memory ' +
          'for the duration of your visit and are lost when you refresh or close the tab.' },
        { type: 'h3', text: 'Third-party services' },
        { type: 'p', text:
          'The simulator requests game data and market prices from public third-party ' +
          'endpoints. Those requests are made by your browser and are subject to the ' +
          'privacy practices of those providers. Item images are served from Steam’s ' +
          'public content network.' },
        { type: 'h3', text: 'Advertising' },
        { type: 'p', text:
          'This site may display advertising. Advertising partners, including Google, may ' +
          'use cookies or similar technologies to serve ads based on your prior visits to ' +
          'this or other websites. You can review and adjust how Google uses your data at ' +
          'the Google Ads Settings page, and you can opt out of personalised advertising ' +
          'through your browser or ad-network controls.' },
        { type: 'h3', text: 'Children' },
        { type: 'p', text:
          'This site is not directed at children under 13 and does not knowingly collect ' +
          'information from them.' },
        { type: 'h3', text: 'Changes' },
        { type: 'p', text:
          'If this policy changes, the revised version will be published on this page with ' +
          'an updated date.' }
      ]
    },

    contact: {
      title: 'Contact',
      blocks: [
        { type: 'p', text:
          'Questions, bug reports, corrections and feature suggestions are all welcome. ' +
          'If something in the simulator produces results that look wrong — an odds table ' +
          'that does not match the game, a price that seems implausible, an item that ' +
          'cannot appear when it should — that is genuinely useful to hear about, and ' +
          'those reports have already driven several fixes.' },
        { type: 'h3', text: 'How to get in touch' },
        { type: 'p', text:
          'Please replace this paragraph with your preferred contact address before ' +
          'publishing the site, since a working contact route is one of the things ad ' +
          'networks look for during review.' },
        { type: 'ul', items: [
          'Email: your-address@example.com',
          'Response time: usually within a few days',
          'For bug reports, please include what you clicked and what you expected'
        ] },
        { type: 'h3', text: 'Legal notice' },
        { type: 'p', text:
          'Skin Simulator is an independent fan project. It is not affiliated with, ' +
          'sponsored by, or endorsed by Valve Corporation. Counter-Strike and ' +
          'Counter-Strike 2 are trademarks of Valve Corporation. All item names and ' +
          'images remain the property of their respective owners.' }
      ]
    }
  },

  // ==========================================================
  // TÜRKÇE
  // ==========================================================
  tr: {
    pageTitle: 'Rehber & Hakkında',
    pageLead:
      'Skin Simulator hakkında bilmeniz gereken her şey: bu site nedir, simüle ' +
      'edilen ekonomi nasıl işler, nadirlik ve float değerleri nasıl hesaplanır ve ' +
      'Trade-Up sözleşmeleri sonucu nasıl belirler.',
    updated: 'Son güncelleme: 28 Ağustos 2026',

    about: {
      title: 'Hoş Geldiniz — Skin Simulator Nedir?',
      blocks: [
        { type: 'p', text:
          'Skin Simulator, Counter-Strike 2’nin kutu açma mekaniklerini gerçek ve canlı ' +
          'oyun verisiyle yeniden oluşturan, tarayıcı üzerinde çalışan ücretsiz bir ' +
          'deneme alanıdır. Silah kasaları açabilir, Armory terminalleri çalıştırabilir, ' +
          'sticker kapsülleri yırtabilir, hatıra paketleri açabilir ve Trade-Up ' +
          'sözleşmeleri imzalayabilirsiniz — hem de tek kuruş harcamadan.' },
        { type: 'p', text:
          'Projenin amacı eğitici ve eğlencelidir. Gerçek oyunda kasa açmak para ' +
          'gerektirir ve çoğu oyuncu, yüzlerce açılış boyunca oranların gerçekte nasıl ' +
          'hissettirdiğini hiçbir zaman net göremez. Burada bunu birkaç dakikada, ' +
          'ücretsiz ve gerçek oyunun kullandığı olasılık tablolarıyla görebilirsiniz.' },
        { type: 'h3', text: 'Bu site ne DEĞİLDİR' },
        { type: 'p', text:
          'Burası bir kumar sitesi ya da pazar yeri değildir. Para yatırma yolu yoktur, ' +
          'para çekme yolu yoktur ve projeye bağlı hiçbir ödeme altyapısı bulunmaz. ' +
          '"Kazandığınız" eşyalar yalnızca ziyaretiniz boyunca tarayıcı sekmenizde ' +
          'vardır. Steam’e, Counter-Strike 2’ye ya da başka herhangi bir oyuna veya ' +
          'hizmete aktarılamaz, takas edilemez, satılamaz.' },
        { type: 'h3', text: 'Veriler nereden geliyor' },
        { type: 'p', text:
          'Kutu içerikleri, eşya isimleri, nadirlik kademeleri, görseller ve float ' +
          'aralıkları; oyunun kendi dosyalarından üretilen, topluluk tarafından ' +
          'güncellenen açık bir CS2 veri setinden anlık olarak çekilir. Hiçbir şey koda ' +
          'gömülü değildir; bu sayede Valve oyuna yeni kasa, kapsül veya terminal ' +
          'eklediğinde bunlar burada da kendiliğinden belirir.' },
        { type: 'p', text:
          'Fiyatlar açık bir Steam piyasa fiyat kaynağından çözülür; bu kaynak sürekli ' +
          'değil, haftalar mertebesinde tazelenir. Kaynağa ulaşılamadığında simülatör ' +
          'otomatik olarak simüle fiyatlandırmaya geçer ve site çalışmaya devam eder. ' +
          'Gösterilen değerler her zaman tahmindir ve asla alım-satım tavsiyesi olarak ' +
          'kullanılmamalıdır.' }
      ]
    },

    features: {
      title: 'Özellik Rehberi — Her Mod Nasıl Çalışır',
      blocks: [
        { type: 'h3', text: 'Kasalar' },
        { type: 'p', text:
          'Silah kasaları Counter-Strike’ın resmi düşüş dağılımını kullanır. Her açılış ' +
          'önce bir nadirlik kademesi seçer, sonra o kademeden rastgele bir skin belirler, ' +
          'ardından float değeri ve StatTrak™ şansı için zar atar. Yayımlanmış oranlar ' +
          'şöyledir: Mil-Spec %79,92, Restricted %15,98, Classified %3,20, Covert %0,64 ve ' +
          'Rare Special (bıçak ve eldivenler) %0,26. Bir kasa açmak, kutu fiyatına ek ' +
          'olarak 2,50 $ anahtar bedeli gerektirir — tıpkı gerçek oyundaki gibi.' },
        { type: 'h3', text: 'Terminaller' },
        { type: 'p', text:
          'Armory terminalleri kasalar gibi çalışmaz. Tek bir rastgele eşya düşürmek ' +
          'yerine terminal önce tarama yapar, sonra size teklifleri tek tek sunar. Her ' +
          'teklif için ya onu alırsınız — dolar cinsinden fiyatını ödeyip oturumu ' +
          'bitirirsiniz — ya da bir sonrakine geçersiniz. Pas geçilen tekliflere geri ' +
          'dönülemez. Son teklifte ise ister alırsınız, ister hiçbir şey ödemeden ' +
          'terminali kapatırsınız — eşya almaya ASLA zorlanmazsınız ve terminali tekrar ' +
          'çalıştırmak ücretsizdir. Oturumların yaklaşık %5’inde nadir bir bonus slot ' +
          'açılır ve altıncı bir teklif sunulur.' },
        { type: 'h3', text: 'Armory (Cephanelik)' },
        { type: 'p', text:
          'Armory sekmesi dolar yerine kredi (yıldız) harcar. Krediler, 16,00 $’ı 40 ' +
          'krediye çeviren Armory Pass’ten gelir. Burada aktif silah koleksiyonlarından ' +
          'çekiliş yapabilir, charm kapsülleri açabilir veya garantili Limited Edition ' +
          'eşyayı basabilirsiniz. Koleksiyon çekilişleri kasalardan çok daha yatık bir ' +
          'eğriyi kullanır: kasalarla aynı "her kademe bir öncekinin 1/5’i" merdiveni, ' +
          'ama yalnızca koleksiyonda GERÇEKTEN bulunan kademelere uygulanır. Armory ' +
          'koleksiyonlarının çoğu Industrial Grade ile başladığı için oranlar şöyle çıkar: ' +
          'Industrial %80,03 · Mil-Spec %16,01 · Restricted %3,20 · Classified %0,64 · ' +
          'Covert %0,13.' },
        { type: 'h3', text: 'Hatıra (Souvenir) Paketleri' },
        { type: 'p', text:
          'Hatıra paketleri gerçek turnuva düşüşlerinden gelir. İçlerinde bıçak ve ' +
          'StatTrak™ eşya bulunmaz; kademe yapıları da paketten pakete değişir — bazı ' +
          'harita koleksiyonlarında yalnızca üç kademe vardır. Bu yüzden simülatör her ' +
          'paketin gerçek içeriğini okur ve standart oran merdivenini yalnızca gerçekten ' +
          'bulunan kademelere yeniden dağıtır.' },
        { type: 'h3', text: 'Çıkartmalar (Stickers)' },
        { type: 'p', text:
          'Sticker kapsülleri dört kademeli bir yapı kullanır: High Grade %80,13, ' +
          'Remarkable %16,02, Exotic %3,21 ve Extraordinary %0,64. Çıkartmaların float ve ' +
          'desen numarası yoktur; çünkü bunlar silah kaplaması değil, düz kozmetik ' +
          'eşyalardır.' },
        { type: 'h3', text: 'Ekonomi nasıl işler' },
        { type: 'p', text:
          '150,00 $ bakiye ile başlarsınız. Kutu açmak bakiyenizden düşer, eşya satmak ' +
          'geri ekler. Bakiye takip etmeden denemeler yapmak isterseniz üst çubuktan ' +
          'Sınırsız Mod’a geçin: hiçbir şey düşülmez ve satışlar ayrı bir "sanal" kazanç ' +
          'olarak izlenir, böylece gerçek bakiyeniz sessizce şişmez. Hiçbir şey ' +
          'kaydedilmez — sayfayı yenilediğinizde bakiyeniz, envanteriniz ve geçmişiniz ' +
          'sıfırlanır.' },
        { type: 'h3', text: 'Beklenen Değer (EV) ve ROI' },
        { type: 'p', text:
          'Her kutu kartında bir EV (beklenen değer) ve bir ROI yüzdesi görürsünüz. EV, ' +
          'tek bir açılışın ortalama değeridir: her nadirlik kademesinin ortalama fiyatı ' +
          'alınıp o kademenin çıkma oranıyla ağırlıklandırılarak hesaplanır. ROI ise bu ' +
          'beklenen değeri açılışın size maliyetiyle karşılaştırır. %100’ün altındaki bir ' +
          'ROI, o kutunun ortalamada zarar ettirdiği anlamına gelir — ki bu neredeyse tüm ' +
          'gerçek kutular için doğrudur ve simülatörün görünür kılmak istediği şey tam da ' +
          'budur.' }
      ]
    },

    items: {
      title: 'Eşyaları Anlamak: Nadirlik, Float ve Fiyatlandırma',
      blocks: [
        { type: 'h3', text: 'Nadirlik kademeleri' },
        { type: 'p', text:
          'Her skin bir nadirlik kademesine aittir ve her kademenin oyuncuların anında ' +
          'tanıdığı bir rengi vardır. En yaygından en nadire doğru silah skinleri şöyle ' +
          'sıralanır: Consumer Grade (beyaz-gri), Industrial Grade (açık mavi), Mil-Spec ' +
          '(mavi), Restricted (mor), Classified (pembe) ve Covert (kırmızı). Bunların ' +
          'hepsinin üstünde ise altın renkle işaretlenen Rare Special kademesi — bıçaklar ' +
          've eldivenler — bulunur.' },
        { type: 'p', text:
          'Çoğu kişinin takıldığı bir ayrıntı var: oyunun temel verisinde bıçaklar ve ' +
          'eldivenler de "Covert" olarak etiketlenir. Bunları ancak eşya kategorisinden ve ' +
          'her kutunun içinde ayrı bir listede durmalarından ayırt edebilirsiniz. ' +
          'Simülatör bunu doğru şekilde ele alır; altın kademe eşyalar bu sayede sessizce ' +
          'sıradan kırmızı skinlerle değiştirilmek yerine gerçek %0,26 oranıyla çıkar.' },
        { type: 'h3', text: 'Float ve aşınma' },
        { type: 'p', text:
          'Float, bir skinin ne kadar yıpranmış göründüğünü anlatan 0 ile 1 arasında bir ' +
          'sayıdır. Düşük olan daha temizdir. Beş aşınma bandına karşılık gelir: 0,07 ' +
          'altı Factory New, 0,15 altı Minimal Wear, 0,38 altı Field-Tested, 0,45 altı ' +
          'Well-Worn ve 0,45’ten itibaren Battle-Scarred.' },
        { type: 'p', text:
          'Bu bantlar eşit genişlikte DEĞİLDİR ve çoğu simülatörün yanlış yaptığı nokta ' +
          'tam burasıdır. Tek başına Battle-Scarred, 0–1 skalasının %55’ini kaplar; ' +
          'dolayısıyla float’u düzgün dağılımla rastgele seçmek, tüm düşüşlerin yarısından ' +
          'fazlasını Battle-Scarred yapardı. Gerçek oyun böyle davranmaz. Bu yüzden bu ' +
          'simülatör önce gerçekçi ağırlıklarla bir aşınma bandı seçer — yaklaşık Factory ' +
          'New %3, Minimal Wear %24, Field-Tested %33, Well-Worn %24, Battle-Scarred %16 — ' +
          've ancak ondan sonra o bandın içinde bir float belirler.' },
        { type: 'p', text:
          'Her skinin ayrıca kendine özgü float sınırları vardır. Bazı kaplamalar hiçbir ' +
          'zaman Factory New olamaz, bazıları hiçbir zaman Battle-Scarred olamaz. Üretilen ' +
          'float her eşyanın gerçek aralığına ölçeklenir, böylece bu kısıtlar korunur.' },
        { type: 'h3', text: 'Desen numarası (pattern index)' },
        { type: 'p', text:
          'Float’un yanı sıra her silaha 0 ile 1000 arasında bir desen numarası (paint ' +
          'seed) atanır. Bu numara kaplamanın model üzerinde nasıl konumlandığını belirler: ' +
          'bir Case Hardened’ın ne kadar mavi göstereceğini ya da bir Fade’in ne kadar ' +
          'tam olduğunu. Bazı skinlerde desen, fiyat açısından float’tan bile önemlidir. ' +
          'Sahip olduğunuz herhangi bir eşyanın desenini inceleme penceresinde görebilirsiniz.' },
        { type: 'h3', text: 'Fiyatlar nasıl tahmin ediliyor' },
        { type: 'p', text:
          'Canlı piyasa verisi mevcutsa simülatör eşyanın tam piyasa adını oluşturur — ' +
          'aşınma bandı ve varsa StatTrak™ ya da Souvenir öneki dahil — ve fiyatı ' +
          'doğrudan sorgular. Canlı veri yoksa nadirlik kademesinden türetilen, aşınma ve ' +
          'StatTrak™ durumuna göre düzeltilen simüle bir fiyat kullanılır.' },
        { type: 'p', text:
          'Bu simülatörde gösterilen tüm fiyatlar eğlence amaçlı tahminlerdir. Gerçek ' +
          'piyasa fiyatları sürekli hareket eder ve bu projenin modellemediği etkenlere — ' +
          'desen, çıkartmalar, float sıralaması, çıkartma yerleşimi — bağlıdır.' }
      ]
    },

    tradeup: {
      title: 'Trade-Up Sözleşmeleri Nasıl Çalışır',
      blocks: [
        { type: 'p', text:
          'Bir Trade-Up sözleşmesi, aynı nadirlikteki on skini bir üst nadirlikten tek bir ' +
          'skine dönüştürür. Counter-Strike’ta eşyaları nadirlik merdiveninde yukarı ' +
          'taşıyan tek güvenilir mekanizma budur ve sonucu rastgele olsa da kuralları ' +
          'tamamen belirlidir.' },
        { type: 'h3', text: 'Çıktı havuzu nasıl oluşur' },
        { type: 'p', text:
          'Sözleşme oyundaki her skinden çekiliş yapmaz. Her girdi eşyası bir koleksiyona ' +
          'aittir ve her koleksiyon çıktı havuzuna kendi bir üst kademe skinlerini katar. ' +
          'On girdinizin daha fazlasını sağlayan koleksiyon, sonucu da orantılı olarak daha ' +
          'yüksek ihtimalle sağlar. Deneyimli oyuncuların girdileri bilinçli olarak tek bir ' +
          'koleksiyondan seçmesinin sebebi budur: oranları istedikleri belirli sonuç ' +
          'üzerinde yoğunlaştırır.' },
        { type: 'h3', text: 'Çıktı float’u nasıl hesaplanır' },
        { type: 'p', text:
          'Sonucun float’u rastgele değildir. Oyun on girdinin float ortalamasını alır ve ' +
          'bu ortalamayı çıktı skininin kendi float aralığına yeniden ölçekler. Pratikte bu ' +
          'şu demektir: daha temiz girdiler daha temiz bir sonuç üretir. Oyuncuların ' +
          'sözleşme imzalamadan önce düşük float’lu girdi aramasının sebebi de budur. ' +
          'Trade-Up ekranı yuvaları doldururken anlık ortalamayı gösterir; etkiyi hemen ' +
          'görebilirsiniz.' },
        { type: 'h3', text: 'Karlılık panelini okumak' },
        { type: 'p', text:
          'Eşya ekledikçe sağdaki panel olası her sonucu kendi olasılığıyla birlikte ' +
          'listeler; ayrıca toplam girdi maliyetini, sözleşmenin beklenen değerini ve ' +
          'ortaya çıkan kâr veya zararı gösterir. Beklenen değeri girdi maliyetinin ' +
          'altında olan bir sözleşme, en iyi olası sonucu ne kadar cazip görünürse ' +
          'görünsün, ortalamada zarar ettiren bir sözleşmedir.' },
        { type: 'h3', text: 'Gerçek oyundan bilinçli bir sapma' },
        { type: 'p', text:
          'Buradaki bir tarif Counter-Strike 2’de yoktur. Gerçek trade-up’lar Covert ' +
          'eşyaları girdi olarak kabul etmez; çünkü Covert zaten standart merdivenin en ' +
          'üstüdür. Bu simülatör buna bilinçli olarak izin verir: beş Covert eşya, ' +
          'rastgele bir bıçak ya da eldiven çekilişini açar. Arayüzde açıkça belirtilir ve ' +
          'yalnızca yüzlerce kasa açmadan altın kademeyi keşfedebilesiniz diye vardır. ' +
          'Diğer tüm kurallar gerçek oyunu izler.' }
      ]
    },

    privacy: {
      title: 'Gizlilik Politikası',
      blocks: [
        { type: 'p', text:
          'Skin Simulator mümkün olan en az veriyi toplayacak şekilde tasarlanmıştır. ' +
          'Kullanıcı hesabı, kayıt, giriş ve bu projeye ait herhangi bir sunucu yoktur. ' +
          'Simülatör tamamen tarayıcınızın içinde çalışır.' },
        { type: 'h3', text: 'Topladığımız bilgiler' },
        { type: 'p', text:
          'Kişisel bilgi toplamıyor, saklamıyor ve iletmiyoruz. Adınızı, e-posta ' +
          'adresinizi, Steam hesabınızı veya ödeme bilgilerinizi istemiyoruz; sitede ' +
          'bunları alabilecek bir mekanizma da bulunmuyor.' },
        { type: 'h3', text: 'Tarayıcı depolaması' },
        { type: 'p', text:
          'Site, tarayıcınızın yerel depolamasına yalnızca tek bir değer yazar: sorumluluk ' +
          'reddi uyarısını kapattığınızı belirten bir işaret. Böylece uyarı her ziyarette ' +
          'yeniden çıkmaz. Bu değer kişisel veri içermez ve hiçbir yere iletilmez. ' +
          'Tarayıcı verilerinizi temizlemek onu da siler.' },
        { type: 'p', text:
          'Bakiyeniz, envanteriniz, krediniz ve açılış geçmişiniz yalnızca ziyaretiniz ' +
          'boyunca bellekte tutulur; sayfayı yenilediğinizde veya sekmeyi kapattığınızda ' +
          'kaybolur.' },
        { type: 'h3', text: 'Üçüncü taraf hizmetler' },
        { type: 'p', text:
          'Simülatör, oyun verisi ve piyasa fiyatlarını açık üçüncü taraf uç noktalardan ' +
          'ister. Bu istekler tarayıcınız tarafından yapılır ve ilgili sağlayıcıların ' +
          'gizlilik uygulamalarına tabidir. Eşya görselleri Steam’in açık içerik ağından ' +
          'sunulur.' },
        { type: 'h3', text: 'Reklamlar' },
        { type: 'p', text:
          'Bu sitede reklam gösterilebilir. Google dâhil reklam ortakları, bu siteye veya ' +
          'başka sitelere yaptığınız önceki ziyaretlere dayalı reklam sunmak için çerezler ' +
          'veya benzer teknolojiler kullanabilir. Google’ın verilerinizi nasıl ' +
          'kullandığını Google Reklam Ayarları sayfasından inceleyip ' +
          'değiştirebilir, kişiselleştirilmiş reklamları tarayıcınız veya reklam ağı ' +
          'denetimleri üzerinden kapatabilirsiniz.' },
        { type: 'h3', text: 'Çocuklar' },
        { type: 'p', text:
          'Bu site 13 yaş altındaki çocuklara yönelik değildir ve onlardan bilerek bilgi ' +
          'toplamaz.' },
        { type: 'h3', text: 'Değişiklikler' },
        { type: 'p', text:
          'Bu politika değişirse, güncellenmiş sürüm tarihiyle birlikte bu sayfada ' +
          'yayımlanacaktır.' }
      ]
    },

    contact: {
      title: 'İletişim',
      blocks: [
        { type: 'p', text:
          'Sorular, hata bildirimleri, düzeltmeler ve özellik önerileri memnuniyetle ' +
          'karşılanır. Simülatörde bir şey yanlış görünen sonuçlar üretiyorsa — oyunla ' +
          'uyuşmayan bir oran tablosu, inandırıcı olmayan bir fiyat, çıkması gerekirken ' +
          'çıkmayan bir eşya — bunu duymak gerçekten faydalıdır; bu tür bildirimler daha ' +
          'şimdiden birkaç düzeltmeye yol açtı.' },
        { type: 'h3', text: 'Bize nasıl ulaşabilirsiniz' },
        { type: 'p', text:
          'Siteyi yayına almadan önce lütfen bu paragrafı tercih ettiğiniz iletişim ' +
          'adresiyle değiştirin; çalışan bir iletişim yolu, reklam ağlarının inceleme ' +
          'sırasında aradığı şeylerden biridir.' },
        { type: 'ul', items: [
          'E-posta: adresiniz@example.com',
          'Yanıt süresi: genellikle birkaç gün içinde',
          'Hata bildirimlerinde neye tıkladığınızı ve ne beklediğinizi yazın'
        ] },
        { type: 'h3', text: 'Yasal bilgilendirme' },
        { type: 'p', text:
          'Skin Simulator bağımsız bir hayran projesidir. Valve Corporation ile bağlantılı ' +
          'değildir, Valve tarafından desteklenmemekte ve onaylanmamaktadır. ' +
          'Counter-Strike ve Counter-Strike 2, Valve Corporation’ın tescilli ' +
          'markalarıdır. Tüm eşya isimleri ve görselleri ilgili sahiplerine aittir.' }
      ]
    }
  }
};

export default GUIDE;
