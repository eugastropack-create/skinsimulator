# GACAS — CS2 Simülatör Proje Dokümantasyonu

> **GACAS** = **G**enel **A**rayüz, **C**ekiliş **A**lgoritmaları ve **S**imülasyon
> Bu dosya projenin mimarisini, veri akışını ve tüm şans mekaniklerini tanımlar.
>
> ⚠️ **DEĞİŞMEZ KURAL:** Projeye eklenen her yeni özellik veya güncellemede
> `gacas.md`, `agents.md` ve `cloud.md` dosyaları **aynı çıktıda** güncellenir.

---

## 1. Proje Özeti

**CS2 Simülatör**, Counter-Strike 2'nin ekonomi ve şans mekaniklerini (kasa açma,
Armory/Cephanelik, Trade-Up sözleşmeleri) **gerçek para harcamadan** test etmeye
yarayan bir React Native (Expo) uygulamasıdır. Web, iOS ve Android'de aynı kod
tabanıyla çalışır; birincil geliştirme/test hedefi **web**dir (`npm run web`).

**Temel felsefe:** Oranlar ve mekanikler mümkün olduğunca **gerçek CS2 ile birebir**
olmalıdır. Simülatöre özel bir sapma varsa (ör. Covert→Bıçak tarifi) kodda ve bu
dokümanda **açıkça** belirtilir.

---

## 2. Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Framework | React Native `0.86.2` + Expo `~57.0.16` |
| Web hedefi | `react-native-web` `^0.21.2` |
| UI | Yalnızca React Native primitifleri (`View`, `Text`, `FlatList`, `Modal`, `Animated`) |
| Ek bileşen | `@react-native-community/slider` (float ayarı) |
| State | Yalnızca React hook'ları (`useState`/`useEffect`/`useMemo`) — harici store YOK |
| Kalıcılık | **Yok** — tüm state oturum içidir (sayfa yenilenince sıfırlanır) |

> **Not:** Expo sürümü hızlı değişiyor. Kod yazmadan önce
> <https://docs.expo.dev/versions/v57.0.0/> adresindeki sürüme özel dokümanlar okunmalıdır.

---

## 3. Dosya Yapısı ve Sorumluluklar

```
cskasa/
├── App.js                    # Kök bileşen: sekmeler, global state, veri yükleme
├── index.js                  # Expo giriş noktası
├── gacas.md / agents.md / cloud.md   # Proje dokümantasyonu (bu üçlü)
└── src/
    ├── theme.js              # ⭐ AÇIK TEMA tasarım sistemi (renk/gölge/geçiş/nadirlik ışığı)
    │                         #   (logo: assets/logo-skinsimulator.png — saydam PNG)
    ├── i18n.js               # ⭐ ÇOKLU DİL (EN varsayılan / TR) — tek sözlük + context
    ├── BlogScreen.js         # ⭐ Rehber/Blog — SEMANTİK HTML (AdSense içerik gereksinimi)
    ├── content/
    │   └── guide.js          # ⭐ Rehber metinleri (EN + TR, uzun biçim)
    ├── api.js                # ByMykel CSGO-API çağrıları (+ crates.json önbelleği)
    ├── prices.js             # Fiyatlandırma, EV/ROI hesapları, kararlı sıralama değeri
    ├── utils.js              # Float üretimi, aşınma eşlemesi, mock fiyat, formatlama
    ├── armoryData.js         # Aktif Armory koleksiyon isimleri (rotasyon filtresi)
    ├── CaseOpening.js        # Kasa VE Souvenir açma ekranı (çark + sekme + nadirlik ışığı)
    ├── TerminalOpening.js    # ⭐ Armory terminali (5-6 TEKLİF KARTI + CRT — ÇARK YOK)
    ├── CapsuleOpening.js     # ⭐ Sticker kapsülü (titreme/yırtılma/patlama — ÇARK YOK)
    ├── ArmoryOpening.js      # Armory ekranı (koleksiyon/charm/Limited Edition)
    ├── TradeUpScreen.js      # Trade-Up sözleşme ekranı (10 slot, analiz, geçmiş)
    └── components/
        ├── HoverCard.js      # ⭐ Hover'da 3B yükselen kart (tüm liste kartları)
        ├── Icons.js          # ⭐ CS simgeleri (yeşil ★ kredi, yeşil $) + ValuePill
        ├── LanguageSwitcher.js # ⭐ Globe ikonlu EN/TR değiştirici
        ├── Disclaimer.js     # ⭐ Sorumluluk reddi (footer, EN/TR)
        ├── Toast.js          # Bildirim sistemi + useToast hook
        ├── ConfirmModal.js   # Onay diyaloğu (Alert.alert web'de çalışmadığı için)
        ├── ContentsModal.js  # İçerik+oran önizlemesi (satır içi panel + modal)
        ├── ItemInspectModal.js # Envanter eşya inceleme (float/pattern/aksiyonlar)
        └── SellConfirmModal.js # Satış onayı + Sınırsız Mod yönlendirmesi
```

### Ağ Katmanı Kuralı
**Tüm** ağ çağrıları `src/api.js` üzerinden yapılır. Bileşenlerin içinde doğrudan
`fetch('https://raw.githubusercontent.com/...')` yazılmaz — böylece uç noktalar,
hata yönetimi ve yedekleme davranışı tek merkezde kalır.

| Helper | Kullanan | Kaynak |
|---|---|---|
| `fetchCrates()` | `App.js` | `crates.json` (`type === 'Case'`) |
| `fetchTerminals()` | `App.js` | `crates.json` (**dinamik tespit**, aşağıya bak) |
| `fetchSouvenirPackages()` | `App.js` | `crates.json` (`type === 'Souvenir'`) |
| `fetchStickerCapsules()` | `App.js` | `crates.json` (`type === 'Sticker Capsule'`) |
| `fetchCollections()` | `App.js` | `collections.json` |
| `fetchKeychains()` | `App.js` | `keychains.json` |
| `fetchSkins()` | `src/TradeUpScreen.js` | `skins.json` |

#### ⚠️ crates.json Önbelleği (performans — kritik)
Kasa, Terminal, Souvenir ve Sticker listelerinin **hepsi** aynı ~8.3 MB'lık
`crates.json` dosyasından gelir. Her kategori için ayrı `fetch` yapmak açılışta
aynı dosyayı **4 kez** indirmek demekti (~33 MB gereksiz trafik). `api.js` artık
dosyayı modül seviyesinde tek bir promise'te önbelleğe alır; paralel çağrılar
**aynı** promise'i paylaşır. Başarısız denemeler önbellekte tutulmaz (tekrar
denenebilsin diye).

#### ⚠️ Terminal Tespiti — HARDCODED İSİM LİSTESİ YOK
Terminaller ByMykel verisinde henüz kendi `type`'ına sahip değil (`type: null`).
İki sinyalden **biri** yeterli sayılır:
1. Adında `Terminal` geçmesi (ör. *Sealed Dead Hand Terminal*)
2. `model_player` alanının Valve'in terminal modeli `ad_laptop`'u işaret etmesi

Sonuç: Valve yeni bir terminal eklediğinde (ör. **Nemesis Terminal**) kodda
tek satır değişiklik yapmadan listede belirir.
> Doğrulandı (28 Ağu 2026): API'de şu an **2** terminal var — *Sealed Genesis
> Terminal* ve *Sealed Dead Hand Terminal*. Nemesis henüz API'ye eklenmemiş.

> `fetchLivePrices()` bir istisnadır: fiyat normalizasyon mantığıyla birlikte
> `src/prices.js` içinde durur (veri kaynağı değil, fiyat motorunun parçasıdır).

---

## 4. Veri Kaynakları

| Kaynak | URL | Kullanım |
|---|---|---|
| Kasalar | `ByMykel/CSGO-API .../crates.json` | `type === "Case"` filtresiyle |
| Koleksiyonlar | `.../collections.json` | Armory + Trade-Up çıktı havuzu |
| Charm'lar | `.../keychains.json` | 78 charm, 4 kapsül koleksiyonu |
| Skinler | `.../skins.json` | Trade-Up girdi/çıktı havuzu + bıçak/eldiven (2126 öğe) |
| Sticker | `.../crates.json` (`type='Sticker Capsule'`) | 100 sticker kapsülü |
| **Souvenir** | `.../crates.json` (`type='Souvenir'`) | **150 hatıra paketi** |
| **Terminal** | `.../crates.json` (dinamik tespit) | **Armory terminalleri** |
| Canlı fiyat | `ByMykel/counter-strike-price-tracker .../static/latest.json` | Steam piyasa fiyatları (**cent**, haftalık) |

> `Souvenir Highlight` (14 adet) **bilerek** dışarıda bırakıldı: skin değil, maç
> highlight'larına ait koleksiyon parçaları — açılış mekaniğine uymuyorlar.

### Fiyat Yedekleme (Fallback) Zinciri
1. **Canlı fiyat** — `priceMap[market_hash_name]` bulunursa kullanılır.
2. **Mock fiyat** — `generateMockPrice(rarity, float, isStatTrak)` ile üretilir.

#### ⚠️ İSİM EŞLEŞTİRME — sessiz mock'a düşme hatası (28 Ağu 2026)
Canlı fiyat tablosunda anahtarlar **yalnızca aşınma ekiyle** bulunur:
`"AK-47 | Redline (Field-Tested)"` ✓ · `"AK-47 | Redline"` ✗ (doğrulandı).

`buildMarketHashName` ise aşınma ekini `item.min_float` alanının **varlığına**
bakarak koyuyordu. Ama kasa/koleksiyon **içeriğindeki** eşyalarda bu alan
**yoktur** — `crates.json` yalnızca `id, name, rarity, paint_index, image`
taşır. Sonuç: çıplak isim üretiliyor, tabloda bulunamıyor ve **sessizce** mock
fiyata düşülüyordu.

Bu hata görünmüyordu çünkü mock her zaman makul bir sayı üretir. Rozet
`🟢 Canlı Fiyatlar` derken **EV, ROI ve düşen eşya fiyatları hâlâ simüleydi**.

**Çözüm** — tahmin etmeyi bırakıp sırayla denemek (`lookupLivePrice`):
1. `market_hash_name` → kutular (kasa/kapsül/terminal) bu alanı taşır
2. önek + ad + `(aşınma)` → normal silah skinleri
3. önek + ad → aşınması olmayan eşyalar (sticker, charm, agent)

> **Ölçüm (düzeltme sonrası):** Recoil Case içeriği **17/17**, nadir kademe
> **24/24**; Fracture Case 48/52; Kilowatt Case 12/13 eşleşiyor.
> Düzeltme öncesi bu oran **0/17** idi.
>
> **Etkisi:** Recoil Case ROI **%138 → %42.9**. Yani mock fiyatlar ROI'yi
> %100'ün üstüne şişirerek simülatörün asıl anlattığı şeyi — kasa açmanın
> ortalamada zarar ettirdiğini — TERSİNE çeviriyordu.

#### Kutunun KENDİ fiyatı (`getContainerPrice`)
`crates.json`'da kutuların fiyat alanı **yoktur** (doğrulandı: hiçbir kayıtta
`price` yok). Ancak kutuların `market_hash_name`'i vardır (*"Chroma Case"*,
*"Sticker Capsule"*) ve bu isimler canlı fiyat tablosunda geçer — yani kasa,
kapsül, souvenir ve terminal fiyatları da **dinamik**tir. Canlı veri yoksa türe
göre gerçekçi bir tabana düşülür (kasa `$0.50`, sticker `$1.00`, terminal
`$2.00`, souvenir `$2.50`).

#### ⚠️ Simüle fiyatlamada eşyaya özgü deterministik çarpan
Mock fiyatlamada bir kademedeki **tüm** eşyalar aynı tabana sahipti (her
Mil-Spec `$1.50`). Bunun iki görünür sonucu vardı:
- "En değerliden en değersize" sıralama **kademe içinde anlamsızdı** (hepsi eşit),
- kart köşesindeki fiyat aralığı **her kasada birebir aynı** çıkıyordu
  (`$1.50 – $1980.00`), yani hiçbir bilgi vermiyordu.

`getStableSortValue`, canlı fiyat yokken eşyanın **adından** türetilen
`0.55–1.90` bandında **deterministik** bir çarpan uygular (FNV-1a hash).
Deterministik olması kritik: `Math.random()` kullanılsaydı liste her render'da
yeniden sıralanıp zıplardı.

#### Souvenir market adı öneki
Souvenir paketlerinden çıkan eşyalar piyasada **ayrı** bir isimle listelenir:
`Souvenir AWP | Dragon Lore (Factory New)`. Bu önek olmadan souvenir eşyaları
için normal skinin fiyatı bulunur ve değer ciddi biçimde yanlış hesaplanır.
`buildMarketHashName(item, wear, isStatTrak, isSouvenir)` bunu üretir; souvenir
varyantı piyasada listelenmemişse normal varyanta düşer. **Souvenir'de StatTrak
yoktur** — iki önek asla birlikte kullanılmaz.

> **GÜNCELLEME (28 Ağu 2026):** Eski kaynak (`prices.csgotrader.app`) artık JSON
> döndürmüyor — 301 ile HTML sayfasına yönleniyor. Uzun süre "CORS engelliyor"
> sanılan sorunun asıl sebebi buydu; uç nokta taşınmıştı. Yeni kaynak
> (ByMykel price-tracker) **CORS açık** yayınlıyor, dolayısıyla tarayıcıdan
> doğrudan çekiliyor ve **proxy/Worker gerekmiyor**. Fiyatlar artık canlı.

---

## 5. Şans Mekanikleri (Kritik Bölüm)

### 5.0 ⚠️ TEK OLASILIK KAYNAĞI — 29 Ağustos 2026 KRİTİK DÜZELTMESİ

> **Kullanıcı şikâyeti:** *"Armory'de 10 açılış yaptığımda neredeyse istisnasız
> ~50 dolar kâr ediyorum."* — Doğruydu, üstelik sanılandan çok daha büyüktü.

**KÖK NEDEN.** Çekiliş yapan her ekran (`ArmoryOpening`, `CaseOpening`,
`CapsuleOpening`, `TerminalOpening`) **kendi sabit oran tablosunu** taşıyordu ve
hepsinde şu yedek vardı:

```js
let pool = contains.filter(i => i.rarity.name === selected.name);
if (pool.length === 0) pool = contains;   // ← BUG
```

Armory koleksiyonlarında **Consumer Grade eşya YOKTUR** (doğrulandı — Overpass
2024 / Spy Tech / Arabesque: Industrial 6, Mil-Spec 4, Restricted 3,
Classified 2, Covert 1-2). Tablonun ilk satırı ise **%79.92 ile Consumer**'dı.
Yani çekilişlerin **%79.92'si** hiç eşya bulamıyor ve **tüm koleksiyondan düzgün
dağılımlı** seçim yapıyordu — 17 eşyalık bir koleksiyonda Covert çıkma şansı
%0.06 yerine **~%4.7**'ye fırlıyordu.

**ÖLÇÜM** (200.000 çekiliş, canlı fiyatlarla):

| Koleksiyon | Gerçek EV | Maliyet | Gerçek ROI | Kartta yazan |
|---|---|---|---|---|
| Overpass 2024 | $22.83 | $1.60 | **%1427** | %11.6 |
| Spy Tech | $20.95 | $1.60 | **%1309** | %15.4 |
| Arabesque | $15.83 | $1.60 | **%989** | %11.3 |

Gösterge de yanlıştı — ama **ters yönde**: `calculateArmoryStats` aynı boş
kademelerde eşya bulamayıp o olasılık kütlesini **sessizce çöpe atıyordu**.

**ÇÖZÜM — üç parça:**

1. **Oran tabloları artık sabit DEĞİL.** `prices.js` içindeki `getPresentTiers`
   kutunun/koleksiyonun **içinde gerçekten bulunan** kademeleri tespit edip
   merdiveni onlara uygular. Boş kademe **hiç çekilemez**, dolayısıyla
   "tüm havuza düş" yedeğine de gerek kalmaz — o satırlar **silindi**.
2. **Zar atışı tek yerde.** `rollTier(tiers)` + `poolForTier(crate, tier)` —
   kasalar, terminaller, koleksiyonlar ve kapsüller hepsi bunları kullanır.
3. **EV hesabı çekilişle aynı tabloyu kullanır.** Artık kartta yazan EV ile
   200.000 çekilişlik simülasyonun ürettiği EV **örtüşüyor** (aşağıya bakın).

**MERDİVEN.** CS2'de her kademe bir öncekinin **1/5'i** kadar olasıdır. Valve'in
yayımladığı kasa oranları (79.92 / 15.98 / 3.20 / 0.64) bu geometrik dizinin ta
kendisidir; `buildLadderOdds(n)` kademe sayısı kaç olursa olsun aynı formülden
üretip %100'e normalize eder.

**DOĞRULAMA (düzeltme sonrası, 400.000 çekiliş):**

| Kutu | Simülasyon EV | Kart EV | ROI |
|---|---|---|---|
| Arabesque | $0.714 | $0.72 | %45 |
| Overpass 2024 | $1.158 | $1.08 | %68 |
| Spy Tech | $0.812 | $0.80 | %50 |
| Chroma Case | $4.715 | $4.65 | %48 |
| Kilowatt Case | $1.305 | $1.31 | %48 |
| Fever Case | $1.983 | $1.97 | %58 |

Site genelinde **hiçbir kasa / souvenir / koleksiyon %100'ün üstünde ROI
göstermiyor** (kasalar min %16 · medyan %54 · maks %70; souvenir maks %85).

> ⚠️ **Sticker kapsüllerinde 100 kutudan 14'ü hâlâ %100'ün üstünde.** Bu bir hata
> DEĞİL: hem kutunun hem içeriğin fiyatı gerçek Steam verisinden geliyor ve
> üretimi durmuş bazı kapsüller (ör. içinde $16'lık foil bulunan $1.01'lik
> "Sticker Capsule") piyasada gerçekten içeriğinin altında işlem görüyor.

### 5.0.1 Beklenen fiyat artık AŞINMA DAĞILIMINA göre hesaplanıyor

Eski `getExpectedPriceForItem` **sabit float 0.25** (Field-Tested) kullanıyordu.
Bu iki şekilde yanlıştı: float aralığı 0.00–0.08 olan bir skinde 0.25 hiç
oluşamaz, ve Factory New primi (bazı skinlerde 5-7 kat) hesaba hiç girmiyordu.
Artık `generateFloat` ile **birebir aynı model** kullanılıyor: ağırlıklı aşınma
bantları (FN 3 / MW 24 / FT 33 / WW 24 / BS 16) eşyanın kendi min/max float
aralığına ölçekleniyor.

### 5.0.2 Kutu fiyatı bulunamazsa İÇERİKTEN tahmin edilir

Bazı kutuların piyasa fiyatı canlı tabloda yok (ör. *EMS Katowice 2014 Legends*
— Steam'de artık listelenmiyor). Eskiden tür bazlı sabit bir yedeğe ($1.00)
düşülüyordu; o kapsülün içi ~$1047 değerinde olduğu için **ROI %104.745**
çıkıyordu — sınırsız para basan bir kutu. Artık `resolveContainerCost` fiyatı
**içerikten** türetir (`EV / 0.85`; ölçülen medyan kutu ROI'si ~%83) ve sonucu
`priceEstimated: true` ile işaretler. Kart ile açılış ekranı **aynı** sayıyı
kullanır (`crate.casePrice` / `crate.cost`), yoksa kart "$1233" derken açılış
"$1.00" tahsil ederdi.


### 5.1 Kasa Açma Oranları (gerçek CS2 ile birebir)

> ⚠️ **VERİ TUZAĞI — bıçaklar `contains` içinde DEĞİL:** ByMykel verisinde kasanın
> normal skinleri `contains`, bıçak/eldivenleri ise ayrı **`contains_rare`**
> alanındadır. Üstelik `contains_rare` öğelerinin `rarity.color`'ı `#ffd700`
> DEĞİL, `#eb4b4b`'dir. Altın kademeyi `contains` içinde `#ffd700` diye aramak
> hiçbir zaman eşleşmez → "eşleşme yoksa tüm listeye düş" yedeği devreye girer ve
> **kasadan asla bıçak çıkmaz** (EV de sistematik düşük hesaplanır).
> Doğru kullanım: `poolForRarity()` (CaseOpening) ve `contains_rare` dalları
> (`prices.js`, `ContentsModal.js`).

| Nadirlik | Renk | Oran |
|---|---|---|
| Mil-Spec | `#4b69ff` | %79.92 |
| Restricted | `#8847ff` | %15.98 |
| Classified | `#d32ce6` | %3.20 |
| Covert | `#eb4b4b` | %0.64 |
| Rare Special (Bıçak/Eldiven) | `#ffd700` | %0.26 |

StatTrak™ ihtimali: **%10** (her açılışta bağımsız).

### 5.2 Armory Koleksiyon Oranları

⚠️ **SABİT TABLO YOK** — oranlar `getCollectionTiers(collection)` ile
koleksiyonun içeriğinden türetilir (bkz. §5.0). Aktif üç koleksiyonun hiçbirinde
Consumer Grade eşya olmadığı için pratikte şu değerler çıkar:

| Kademe | Oran |
|---|---|
| Industrial Grade | %80.03 |
| Mil-Spec Grade | %16.01 |
| Restricted | %3.20 |
| Classified | %0.64 |
| Covert | %0.13 |

Maliyet: **4 yıldız** (≈$1.60). Armory koleksiyon çekilişinde **StatTrak YOKTUR**.

> Valve rotasyonla Consumer Grade içeren bir koleksiyon eklerse tablo
> **kendiliğinden** altı kademeye genişler — kodda değişiklik gerekmez.

### 5.3 Kapsül Oranları (Charm **ve** Sticker — ortak merdiven)
High Grade %80.13 · Remarkable %16.03 · Exotic %3.21 · Extraordinary %0.64

⚠️ Bu değerler de artık sabit değil: `getCapsuleTiers(capsule)` kapsülde
**gerçekten bulunan** kademelere `buildLadderOdds` uygular (dört kademenin hepsi
varsa yukarıdaki tabloyu birebir üretir).

> ⚠️ **STICKER FİYAT BUG'I (29 Ağu 2026):** Kasa içeriğindeki sticker
> nesnelerinde `market_hash_name` alanı **YOKTUR**; yalnızca ona bakıldığı için
> **1188 sticker'ın tamamı** sessizce mock fiyata düşüyor, Katowice 2014 gibi
> yüzlerce dolarlık çıkartmalar $0.12 sayılıyordu. Piyasa anahtarı
> `Sticker | <ad>` biçimindedir; sırayla denenince eşleşme **0/1188 → 856/1188
> (%72)** oldu. Kalanı (çoğunlukla artık listelenmeyen eski çıkartmalar) hâlâ
> mock fiyata düşer.

| Kapsül | Maliyet | Fiyat tablosu |
|---|---|---|
| Charm (Tılsım) | **3 yıldız** (≈$1.20) | HG $0.45 · R $1.50 · E $6.00 · X $18.00 |
| Sticker | **2 yıldız** (≈$0.80) | HG $0.12 · R $0.35 · E $1.20 · X $4.50 |

Charm ve sticker kapsülleri veride **birebir aynı 4 kademeyi** kullanır, bu yüzden
tek oran tablosu (`CHARM_RARITY_ODDS`) ikisine de hizmet eder. Fiyat tabloları
ise ayrıdır — sticker'lar gerçek piyasada charm'lardan çok daha ucuzdur.

> ⚠️ **BİLİNÇLİ SAPMA:** Gerçek CS2'de sticker kapsülleri Armory'den değil,
> mağazadan (~$1.00) satın alınır. Ayrı bir ekonomi kurmamak için bu simülatörde
> Armory sekmesine 2 yıldız karşılığında eklenmiştir.

### 5.4 Limited Edition Item (Armory Özel Eşyası)
- **Eşya:** `Desert Eagle | Heat Treated` (Classified, `#d32ce6`)
- **Maliyet:** **25 yıldız** (≈$10.00)
- **Mekanik:** Kademeli nadirlik çekilişi **YOK**. Her basımda **aynı eşya** çıkar;
  yalnızca **float** ve **StatTrak** şansa bağlıdır. Yani şans **fiyatı** etkiler, **eşyayı** değil.
- Veri, gerçek `collections.json` içindeki **"Limited Edition Item"** koleksiyonundan okunur.

### 5.5 Float (Aşınma) Üretimi — ⚠️ Kritik Düzeltme
Aşınma kademelerinin float aralıkları **eşit genişlikte değildir**:

| Kademe | Float Aralığı | Aralık Genişliği | Gerçek CS2 Oranı |
|---|---|---|---|
| Factory New | 0.00 – 0.07 | %7 | **%3** |
| Minimal Wear | 0.07 – 0.15 | %8 | **%24** |
| Field-Tested | 0.15 – 0.38 | %23 | **%33** |
| Well-Worn | 0.38 – 0.45 | %7 | **%24** |
| Battle-Scarred | 0.45 – 1.00 | **%55** | **%16** |

**Eski (hatalı) yöntem:** `min + Math.random() * (max - min)` → düzgün dağılım →
Battle-Scarred **%55** çıkıyordu ("hep Battle-Scarred" bug'ı).

**Doğru yöntem (`generateBaseFloat`):** Önce **ağırlıklı** olarak kademe seçilir
(3/24/33/24/16), sonra o kademenin kendi aralığında düzgün dağılımlı taban float
üretilir, en sonda eşyanın kendi `min_float`–`max_float` aralığına ölçeklenir.

Doğrulanan sonuç (200.000 örnek, 0.00–1.00 skin):
`FN %3.0 · MW %24.0 · FT %33.2 · WW %23.9 · BS %15.9` ✅

### 5.6 Trade-Up Sözleşmesi

> 💡 **Trade-Up BAKİYEDEN BAĞIMSIZDIR.** Bu ekran bir oyun modu değil, bir
> kârlılık/olasılık **analiz aracıdır**: sözleşme imzalamak para düşmez, sonucu
> kapatmak para eklemez, "yetersiz bakiye" reddi yoktur. Gösterilen
> Maliyet/EV/Kâr sayıları yalnızca ANALİZ amaçlıdır. (Kasa ve Armory ekranları
> bakiyeyi normal şekilde kullanmaya devam eder.)

**Standart akış (gerçek CS2 kuralları):**
1. Tam **10** adet **aynı nadirlikte** eşya gerekir.
2. Çıktı nadirliği bir üst kademedir:
   `Consumer → Industrial → Mil-Spec → Restricted → Classified → Covert`
3. **Çıktı havuzu, girdilerin ait olduğu koleksiyon(lar)dan** belirlenir. Her girdi
   kendi koleksiyonuna **toplam 1 oy** verir; havuz bu oylarla ağırlıklandırılır.
4. Çıktı float'ı: `hedefMin + ortalamaFloat × (hedefMax − hedefMin)`

#### Olasılık formülü

```
P(eşya) = (koleksiyonun oyu / toplam oy) ÷ (o koleksiyonun hedef kademesindeki eşya sayısı)
```

Yani önce bir "bilet" (koleksiyon) seçilir, sonra o koleksiyonun bir üst
kademesindeki **TÜM** uygun eşyalar arasından eşit ihtimalle biri gelir.
⚠️ Aynı eşya iki koleksiyonda birden geçiyorsa ihtimalleri **toplanır**, iki ayrı
satır olarak listelenmez.

⚠️ **EV ile çekiliş AYNI diziyi kullanır** (`analysis.outcomes`): `executeTradeUp`
o dizide kümülatif zar atar. Ayrışmaları matematiksel olarak imkânsız.

#### ⚠️ 30 AĞU 2026 — KRİTİK BUG: ÇIKTI HAVUZU TEK EŞYAYA DÜŞÜYORDU

> **Kullanıcı şikâyeti:** *"Kontrata 10 adet UMP-45 | Warm Blooded koyduğumda
> sistem sadece AWP veriyor; aynı koleksiyondaki USP-S de %50 ile listelenmeliydi."*

**KÖK NEDEN — havuz döngüsü değil, bir REGEX.** Silah olmayan eşyalar (sticker /
charm / patch / pin) eşyanın **ADI İÇİNDE ARANARAK** eleniyordu:

```js
if (/(Charm|Sticker|Patch|Pin)/i.test(item.name)) return false;   // ← BUG
```

Regex **sabitlenmemiş** olduğu için parçayı kelimenin ORTASINDA da yakalıyordu:

| Eşya | Eşleşen parça | Sonuç |
|---|---|---|
| `USP-S \| Slee**pin**g Potion` | `Pin` | elendi |
| `P2000 \| Dis**patch**` | `Patch` | elendi |

**ÖLÇÜM:** 1456 silah skininden **10 tanesi** hem girdi hem çıktı havuzundan
siliniyordu (9'u `pin`, 1'i `patch`). Kullanıcının örneği tam olarak buydu:
*The Harlequin Collection*'ın Restricted kademesinde **iki** eşya var
(`AWP | Exothermic` + `USP-S | Sleeping Potion`); USP-S elendiği için 10'lu
Mil-Spec sözleşmesi **%100 AWP** veriyor, EV $4.07 ve **+%45 kâr** gösteriyordu.
Doğrusu: **%50 / %50**, EV **$2.85**, **+%2**.

**ÇÖZÜM:** Tür artık **kimlikten** anlaşılıyor (`isWeaponSkinItem`). ByMykel
verisinde her eşyanın id'si türünü zaten söylüyor:
`skin-` · `sticker-` · `keychain-` · `graffiti-` · `agent-`
Doğrulandı: koleksiyonlardaki **1455 `skin-` ögesinin %100'ü** skins.json ile
birebir eşleşiyor. Ada bakmak hem gereksiz hem hataya açıktı.

> Bonus: eski regex koleksiyonlardaki **agent** (63) ve **grafiti** (971)
> ögelerini zaten hiç yakalamıyordu; kimlik kuralı onları da doğru eliyor.

#### ⚠️ AYNI TARİHTE İKİNCİ BUG: OY ŞİŞMESİ

Bir eşya birden fazla koleksiyonda geçiyorsa eski kod **her koleksiyona ayrı bir
TAM oy** veriyordu. 5 koleksiyonda geçen bir skinden 10 tane konunca toplam oy
10 yerine **50** oluyor ve o eşyanın ağırlığı yapay olarak 5 katına çıkıyordu.
(1788 eşyanın **53'ü** birden fazla koleksiyonda.) Artık her girdi **toplam 1 oy**
kullanıyor ve oy, koleksiyonları arasında eşit bölünüyor.

#### Doğrulama (gerçek veriyle)

| Senaryo | Sonuç |
|---|---|
| 10× UMP-45 \| Warm Blooded | AWP %50.00 · USP-S %50.00 — toplam %100 |
| 5× Harlequin + 5× Achroma | 4 çıktı, her biri %25 — toplam %100 |
| Eskiden elenen 10 skin | 10/10 artık geçiyor |
| Tüm koleksiyon × kademe | 262 kombinasyonda 2+ çıktı, 53'ünde gerçekten tek çıktı var |

> Arayüzde imzalandı ve çıkan eşya **USP-S | Sleeping Potion** oldu — düzeltmeden
> önce çıkması **imkânsız** olan eşya.

**🔪 SİMÜLATÖRE ÖZEL TARİF — 5x Covert → Sarı (Bıçak/Eldiven):**
- Gerçek CS2'de Covert eşyalar trade-up **girdisi olamaz** (hiyerarşinin en üstüdür).
- Bu simülatörde sınır **bilerek esnetilmiştir**: **5 adet** Covert birleştirilirse
  çıktı, **tüm bıçak (576) + eldiven (94) havuzundan = 670 öğeden** eşit ihtimalle
  rastgele bir Sarı eşyadır.
- **Yuva kilitleme:** İlk yuvaya Covert eklendiği **an** tarif otomatik algılanır;
  10 yuvanın **kalan 5'i 🔒 ile kilitlenir**, tıklanamaz ve doldurulamaz hale gelir.
  Sayaç `x/5`'e döner. `Kopyala` da limiti aşamaz.
- Koleksiyon oylaması bu tarifte **uygulanmaz** (bıçaklar koleksiyonlara ait değildir).
- Bıçak/eldivenler `'Rare Special'` fiyat kademesiyle değerlenir ve **altın**
  (`#ffd700`) renkle gösterilir.
- Bıçak/eldivenin **kendisi** hâlâ girdi olamaz (sonsuz döngüyü önlemek için).
- Diğer tüm kademelerin standart **10'lu** akışı **değiştirilmemiştir**.

| Sabit | Değer | Anlamı |
|---|---|---|
| `TOTAL_SLOTS` | 10 | Standart tarif yuva sayısı |
| `KNIFE_RECIPE_SLOTS` | 5 | Covert tarifi yuva sayısı (gerisi kilitlenir) |

---

### 5.7 Souvenir (Hatıra) Paketi Oranları

Souvenir paketleri normal kasalarla **aynı kademe merdivenini** kullanır, ancak
içerdikleri kademe **sayısı** pakete göre değişir (bazı harita koleksiyonlarında
yalnızca 3 kademe var). Bu yüzden oranları sabit bir tabloya gömmek **yanlış**
olurdu — `getSouvenirTiers(pkg)` paketin **içinde gerçekten bulunan** kademeleri
tespit edip merdiveni (`buildLadderOdds`, her kademe bir öncekinin 1/5'i) onlara
uygular ve toplam %100'e **yeniden normalize** edilir. Bu artık kasa /
koleksiyon / kapsül ile **aynı** fonksiyondur (`getPresentTiers`, bkz. §5.0).

> **Souvenir ROI'leri neden bu kadar düşük (%0.4–%85)?** Bu bir hata değil.
> Eski souvenir paketleri koleksiyon eşyasıdır: *DreamHack 2013 Souvenir
> Package* piyasada **$1150**'ye işlem görürken içindeki eşyaların ortalaması
> ~**$13**. Fiyat eşleşmesi doğrulandı: 30 pakette **537/545** eşya canlı
> fiyatla bulunuyor.

> ⚠️ **Bilinçli yaklaşım:** Valve'in tam iç algoritması açıklanmadığı için bu,
> veriye dayalı en dürüst yaklaşımdır.

Souvenir açılışı kasa çarkını **yeniden kullanır** (`CaseOpening mode="souvenir"`).
Farklar: anahtar yok (maliyet = paketin piyasa fiyatı) ve **StatTrak yok**.

### 5.8 Terminal Mekaniği — TEKLİF SEÇİMİ (Genesis / Dead Hand / …)

> ⚠️ **BU BİR KASA DEĞİLDİR.** Terminal önceki sürümde klasik kasa gibi
> çalışıyordu (tek eşya düşürüp bitiyordu) — bu **yanlıştı** ve düzeltildi.

**Gerçek CS2 Armory mekaniği:** Terminal çalıştırıldığında kullanıcıya birden
fazla **TEKLİF (offer)** sunulur. Kullanıcı teklifler arasında gezinir, birini
**kredi** karşılığında satın alır ya da hepsini geçer. Her oturumda **yalnızca
bir** eşya alınabilir; satın alma yapıldığında oturum kapanır.

#### ⚠️ TERMİNALDE ROI GÖSTERİLMEZ — 29 Ağustos 2026 düzeltmesi

> **Kullanıcı şikâyeti:** *"Bazı terminallerin ROI'si %1000 veya %232 gibi
> imkânsız seviyelerde."*

Eski hesap `ROI = beklenen ödül / mühürlü terminalin piyasa fiyatı` idi. Bu oran
**anlamsızdı**, çünkü bu simülatörde terminali çalıştırmak **ücretsizdir** ve
kullanıcı mühürlü kutuyu değil, **seçtiği teklifin kendi piyasa fiyatını** öder.
Yani hiç ödenmeyen bir maliyete bölünüyordu:

| Terminal | EV | Mühürlü kutu | Eski "ROI" |
|---|---|---|---|
| Sealed Genesis Terminal | $1.60 | $0.12 | **%1033** |
| Sealed Dead Hand Terminal | $2.61 | $0.94 | **%232** |

Bu sayılar hesap hatası değil, **yanlış sorunun** doğru cevabıydı. Terminal
mekaniğinde ROI **tanımsızdır**: teklifi piyasa fiyatına alırsınız, dolayısıyla
getiri/maliyet yapısal olarak %100'dür.

Bu yüzden `calculateTerminalStats` artık **`roi: null`** döndürür (kartlar bu
hücreyi hiç basmaz) ve yerine mekanikte gerçekten anlamı olan iki ölçü koydu:

| Ölçü | Anlamı | Genesis | Dead Hand |
|---|---|---|---|
| `avgOffer` | Tek bir teklifin beklenen değeri | $1.60 | $2.61 |
| `bestOffer` | Bir oturumdaki **en iyi** teklifin beklenen değeri (5 teklifin maksimumu) | $6.22 | $11.08 |

`bestOffer`, Monte Carlo yerine **deterministik** olarak hesaplanır
(`E[max] = Σ vᵢ · (P(≤i)ⁿ − P(<i)ⁿ)`) — kart her render'da aynı sayıyı
göstermeli, yoksa liste zıplar. Simülasyonla doğrulandı: sim $6.63 / $11.08 —
kart $6.22 / $11.08.

#### ⚠️ ZORUNLU ALIM KALDIRILDI (29 Ağustos 2026)

Önceki sürümde **son teklifte "Pas Geç" devre dışı** bırakılıyor ve kullanıcı
eşyayı almak **zorunda** kalıyordu. Bu ne gerçek CS2 davranışıydı ne de adil:
teklifleri görmek ücretsiz olduğu hâlde çıkış yolu yoktu. Artık son adımda
kırmızı kenarlı **"ALMADAN KAPAT"** butonu var; oturum hiçbir ücret ödenmeden
kapanır ve terminali tekrar çalıştırmak da ücretsizdir.

**Akış (ADIM ADIM — teklifler AYNI ANDA gösterilmez):**

| Aşama | Ne olur |
|---|---|
| `idle` | Terminal bekliyor (CRT'de `> TERMINAL READY`) |
| `scanning` | CRT/glitch tarama — 26 kare, kübik yavaşlama. **Görsel gecikme; sonucu ETKİLEMEZ** |
| `offers` | Teklifler **TEK TEK**: `1/5 → 2/5 → … → 5/5` (+ **%5 ihtimalle 6. BONUS slot** → `1/6 … 6/6`) |
| `claimed` | Alınan eşya teslim edildi, oturum kapandı |

#### ⚠️ Adım adım akış kuralları
- Kullanıcı aynı anda **yalnızca BİR** teklif görür.
- **[EŞYAYI AL]** → bakiyeden teklifin fiyatı düşer, eşya envantere girer, **oturum biter**.
- **SON adımda [ALMADAN KAPAT]** → hiçbir ücret ödenmez, oturum kapanır
  (`terminal.declinedToast` bildirimi çıkar).
- **Nadir 6. teklif:** `BONUS_OFFER_CHANCE = 0.05`. Zar teklifler üretilirken
  **bir kez** atılır ve oturum boyunca sabittir — "pas geçtikçe şansım artar mı"
  belirsizliği bilinçli olarak yok edilmiştir. Bonus açıldığında ekranın üstünde
  `BONUS SLOT UNLOCKED` rozeti çıkar **ve** bir bildirim gösterilir (rozet tek
  başına fark edilmiyordu, oyunun en özel anı sessizce geçiyordu).
- **[Pas Geç →]** → bir sonraki teklife geçer. **GERİ DÖNÜŞ YOKTUR.**
- **SON seçenekte `Pas Geç` DEVRE DIŞIDIR** — kullanıcı almak zorundadır.
  (Buton hem `disabled` hem de `nextOffer()` içinde ikinci bir kalkanla korunur.)
- İlerleme göstergesi: `Seçenek 2 / 5` + nokta şeridi (geçilmiş / aktif / kalan).
- Geçişler **fade + slide**: çıkış 150 ms (yukarı sol), giriş 240 ms (aşağıdan).
  `Animated` değil **state + CSS transition** — donmuş rAF ortamında bile kart
  görünür kalır ve index **her hâlükârda ilerler**.

#### ⚠️ Teklif havuzu neden BAŞTAN üretilir?
Teklifler tarama biterken **toplu** üretilir, kullanıcıya tek tek gösterilse de.
"Her Pas Geç'te yeni zar at" yaklaşımı, kullanıcının pas geçme kararının sonraki
teklifi **etkilediği** izlenimini verir ve oturumun beklenen değerini
belirsizleştirir. Havuz baştan sabitlenince oturum adil ve denetlenebilir olur —
kasa çarkında kazananın dönüş başlamadan belirlenmesiyle **aynı ilke**.

**Teklif kartı içeriği** (brief'te tanımlandığı gibi):
görsel · ad · dış görünüş rozeti (FN/MW/FT/WW/BS) · **spesifik float (5 hane,
ör. `0.16736`)** · **pattern index (`#590`)** · **kredi fiyatı** · $ piyasa değeri.

#### ⚠️ PARA BİRİMİ: DOLAR ($) — kredi/yıldız KULLANILMAZ
Terminal **yalnızca dolar** ile çalışır. İçerideki her fiyat eşyanın gerçek
piyasa değeridir; ayrı bir "kredi etiketi" yoktur. Bu, cüzdan ile terminal
arasındaki dönüşüm kafa karışıklığını tamamen ortadan kaldırır.
*(Armory sekmesi kredi kullanmaya devam eder — o ayrı bir ekonomidir.)*

Tarama **ücretsizdir**; ödeme yalnızca **Eşyayı Al** anında yapılır.
*(Doğrulandı: cüzdan $150.00 → $147.75, eşya $2.25.)*

#### ⚠️ TEKLİFLER ARASI GEÇİŞ ANINDADIR — animasyon YOK
Önceki sürümde fade+slide geçişi vardı; hızlı gezinen kullanıcı için bu her
tıklamada ~400 ms bekleme demekti ve kart yüksekliği değişirken düzen kayması
hissettiriyordu. Artık `nextOffer()` yalnızca index'i artırır; React tek
render'da yeni teklifi basar. Kart yüksekliği `cardStage.minHeight` ile
sabitlendiği için sayfa **zıplamaz**.
*(Ölçüldü: adım başına 9–13 ms — tek makro-görev içinde DOM güncelleniyor.)*

#### Adım sayacı
Ekranın **içinde**, mint (`C.crtText`) renkte ve **monospace** basılan büyük bir
sayaç: `OFFER` / `1` / `/5` + nokta şeridi. Monospace seçilmesinin pratik bir
sebebi var — 1'den 5'e giderken rakam genişliği değişmediği için sayaç **yerinde
sabit** kalır, kaymaz.

#### ⚠️ GÖRSEL SÜREKLİLİK — cihaz HİÇBİR AŞAMADA sökülmez
Önceki sürümde giriş animasyonu koyu bir CRT ekranıydı, ardından gelen eşya
kartı ise **beyaz, yuvarlak köşeli, açık temaya ait ayrı bir bileşendi**. İki
ekran arka arkaya yüklenmiş **iki farklı uygulama** gibi duruyordu.

Artık `deviceShell` **tüm aşamalarda** (idle · scanning · offers · claimed)
ekranda kalır; yalnızca ekranın **içeriği** değişir. Teklif paneli ekranın
görsel dilini birebir kullanır:

| Öğe | Değer |
|---|---|
| ekran zemini | `C.crtBg` (#0d1b26) |
| panel zemini | `C.crtBgDeep` (#08141d) |
| panel kenarı | eşyanın **nadirlik rengi** |
| etiketler | `C.crtDim` monospace |
| değerler | `C.crtText` mint monospace |
| butonlar | kasanın içinde; "Al" = mint kenarlı koyu buton |

Tarama çizgileri panelin **üstünden de** geçer (aynı cam yüzey hissi).

> **Doğrulama:** ekran zemini `rgb(13,27,38)`, panel zemini `rgb(8,20,29)`,
> panel kenarı `rgb(75,105,255)` (eşyanın Mil-Spec rengi), sayaç
> `rgb(95,240,196)` 34 px monospace.

> ⚠️ Teklif panelini tekrar beyaz/açık temaya çevirmeyin — bütünlük bilinçli.

#### Veri şeması
Terminaller ByMykel verisinde normal bir kasayla **birebir aynı yapıdadır**, bu
yüzden **oran tablosu paylaşılır** (`prices.CASE_RARITY_ODDS`).

| Terminal | contains | contains_rare |
|---|---|---|
| Sealed Genesis Terminal | 17 silah (Mil-Spec 7 / Restricted 5 / Classified 3 / Covert 2) | — |
| Sealed Dead Hand Terminal | aynı dağılım | 22 Extraordinary eldiven |

---

## 6. Uygulama Mimarisi

### 6.1 State Sahipliği
Tüm paylaşılan state **`App.js`**'te tutulur ve prop olarak aktarılır:

| State | Açıklama |
|---|---|
| `balance` | Cüzdan bakiyesi (başlangıç `$150.00`) |
| `stars` | Armory kredisi (Pass: $16 → 40 yıldız) |
| `inventory` | Kazanılan eşyalar |
| `crates` / `collections` | EV/ROI ile zenginleştirilmiş kataloglar |
| `priceMap` | Canlı fiyat haritası (veya `null`) |
| `caseOpenCounts` | "En Popüler" sıralaması için oturum sayacı |
| `tradeUpHistory` | Son 15 trade-up (tekrar yüklenebilir) |
| `gameMode` | `'wallet'` (bakiye düşer) / `'unlimited'` (düşmez) |

### 6.2 Sekmeler

Ana navigasyon **sırası kullanıcı brief'inde sabitlenmiştir** — değiştirmeyin:

`Trade Up` · `Cases` · `Terminals` · `Armory` · `Souvenirs` · `Stickers`

**Envanter bilerek bu menüde değildir**: menü sırası birebir korunsun diye üst
yardımcı çubukta ayrı bir buton olarak durur (`🎒 Envanter (n)`).
**Rehber/Blog** de aynı sebeple üst çubukta, envanterin hemen yanındadır
(`📖 Rehber`).

| Sekme | Veri | Açılış ekranı |
|---|---|---|
| Cases | 42 kasa | `CaseOpening` (çark) |
| Terminals | Armory terminalleri | `TerminalOpening` (**teklif seçimi** — CRT + 5/6 kart) |
| Armory | Limited Edition + 3 koleksiyon + 4 charm kapsülü | `ArmoryOpening` |
| Souvenirs | 150 hatıra paketi | `CaseOpening mode="souvenir"` |
| Stickers | 100 sticker kapsülü | `CapsuleOpening` (yırtılma) |

> **Sticker kapsülleri Armory'den çıkarıldı**: artık kendi sekmelerinde ve
> kapsül yırtılma animasyonuyla açılıyorlar. Armory yalnızca gerçek Armory
> kataloğunu (koleksiyonlar + charm + Limited Edition) gösteriyor — bu, gerçek
> oyundaki dağılıma da daha yakın.

### 6.2.1 Ana Sayfa Hiyerarşisi (yukarıdan aşağıya)
1. **Üst yardımcı çubuk** — bakiye · yıldız · Armory Pass · Envanter · mod · sıfırla
2. **Logo** — üst-orta, `Skin`+`Simulator` (vurgu rengi ikinci kelimede)
3. **Canlı arama** — `Search Cases or Items`
4. **Reklam alanı** — *rezerve boşluk* (banner eklendiğinde menü kaymasın diye)
5. **Ana navigasyon** — yatay hap (pill) şeridi
6. **İçerik**

**Kompakt kabuk:** Bir kutu açıldığında logo ve reklam boşluğu gizlenir, arama +
menü kalır — böylece çark/terminal ekranı sayfanın üstüne yerleşir.

> ⚠️ **Kabuk SABİTTİR, dış `ScrollView` YOKTUR.** Açılış ekranlarının ve
> `TradeUpScreen`'in kendi `ScrollView`'leri var; bunları bir dış `ScrollView`
> içine koymak iç içe dikey kaydırma (scroll-in-scroll) üretir ve sayfa
> "yapışır". Kaydırma yalnızca içerik alanındadır.

### 6.2.13 CS Arayüz Dili ve Simgeler

Site açık tema kalmaya devam ediyor (bkz. 6.2.3) ama **biçim dili** oyun
arayüzüne yaklaştırıldı:

| Öğe | Önce | Sonra |
|---|---|---|
| Köşeler | 12–999 px (hap) | **4–6 px (keskin panel)** |
| Menü etiketleri | normal | **BÜYÜK HARF + harf aralığı** |
| Sayısal değerler | orantılı font | **monospace (tabular)** |
| Kredi simgesi | `⭐` emoji (sarı) | **yeşil ★** (`#4ade80` — CS operasyon yıldızı) |
| Para simgesi | `💰` emoji | **yeşil `$`** |

#### ⚠️ Emoji yerine çizilmiş simge — neden
`⭐`/`💰` her işletim sisteminde farklı görünür (Windows, macOS ve Android'de
üç ayrı çizim) ve oyun arayüzü hissini bozar. `components/Icons.js` içindeki
simgeler tipografiyle çizildiği için **her yerde aynı** görünür ve tema
renklerine bağlıdır.

#### ⚠️ Sayılar neden monospace
Bakiye/fiyat değiştikçe rakam genişliği sabit kaldığı için rozet yerinde durur,
komşu elemanları itip kaydırmaz. Oyun arayüzlerinde sayaçların tabular olması
bu yüzden standarttır.

### 6.2.14 Logo Görseli (`assets/logo-skinsimulator.png`)

Metin logo (`Skin` + `Simulator`) yerini **saydam zeminli görsel logoya** bıraktı
(hem ana kabukta hem daralmış mini çubukta aynı dosya kullanılır).

#### Arka plan nasıl kaldırıldı
Kaynak görselin arka planı düz renk **değildi** (fırçalanmış metal + gradyan +
vinyet), bu yüzden basit renk anahtarı (color key) işe yaramazdı. Ancak arka
plan tamamen **gri** (chroma ≈ 0), yazı ise doygun yeşil/mavi. Maske bu yüzden
**renklilik** üzerinden kuruldu:

```
chroma = max(R,G,B) − min(R,G,B)
alpha  = clamp((chroma − 10) / (30 − 10), 0, 1)
```

> **Ölçüm:** Görüntünün %93,4'ü `chroma < 30` (arka plan). Yazı kutusundaki
> **parlak (specular) piksellerin %0'ı** `chroma < 15`, yalnızca %0,5'i
> `chroma < 20` — yani harf içi parlamalar **tintli**, gri değil. Bu yüzden düz
> chroma eşiği harflerin içini delmiyor.
>
> Sonuç: %53,9 tam saydam · %39,5 tam opak · %6,5 kısmi (kenar yumuşatma).

#### ⚠️ Flood-fill BİLEREK kullanılmadı
"Dışarıdan ulaşılamayan her şey yazıdır" yaklaşımı denendi ve **yanlış**:
`o`, `a`, `e` harflerinin **içi** de dışarıdan ulaşılamayan bir arka plan
bölgesidir; flood-fill bunları opak yapıp harflerin gözlerini gri doldurur.
Düz chroma eşiği bu boşlukları doğru şekilde saydam bırakır.

#### ⚠️ Pillow tuzağı (gelecekte flood-fill gerekirse)
`ImageDraw.floodfill`, `Image.fromarray` ile üretilmiş bir görüntüde
**sessizce hiçbir şey yapmıyor** (tampon paylaşımı). `Image.new` ile üretilende
çalışıyor. Önce `.copy()` alın.

#### Ölçekleme
Görsel çok geniş bir şerittir (1100×112, oran **9.82**). Yükseklik daima
genişlikten türetilir; ikisini birden sabitlemek görseli ezer. Ana kabukta
genişlik `min(440, ekran × 0.78)`, mini çubukta 170 px.

### 6.2.145 Üst Çubuk Yerleşimi (mobil / masaüstü)

| | SOL | SAĞ |
|---|---|---|
| **Masaüstü** (tek satır) | mod anahtarı | butonlar → `$` bakiye → `★` kredi |
| **Mobil** (iki satır) | 1. satır: mod + para/kredi · 2. satır: butonlar | — |

Mod anahtarı eskiden Envanter ile Sıfırla **arasına sıkışmıştı**; ne işe
yaradığı anlaşılmıyordu. Artık kendi başına en solda ve mobilde **her zaman ilk
satırda**.

> **Ölçüm:** masaüstü çubuk 82 → **51 px**; mobil başlığın tamamı
> 420 → **309 px**.

#### ⚠️ Para grubu TEK yerde tanımlı
Kırılım noktasına göre farklı satırda render edildiği için `moneyGroup`
değişkeni bir kez tanımlanıp iki yere yerleştiriliyor. Kopyalanırsa biri
güncellenip diğeri unutulur.

#### ⚠️ `utilityRowWideRight` neden `flex: 1`
`flex: 0` verildiğinde sağ grup sıkışıp sarmalanıyordu (1280 px'te 18 px
genişliğe düşüyordu). `flex: 1` + `justifyContent: 'flex-end'` ile kalan alanı
alıp içeriğini sağa yaslıyor.

### 6.2.15 Kaydırmaya Bağlı (Scroll-Linked) Üst Menü

**SORUN:** Tam boy kabuk (büyük logo + arama + reklam alanı + menü) ~300 px yer
kaplıyordu. İlk çözüm tek eşikte AÇ/KAPA yapıyordu; geçiş **ani ve sert**
hissediliyordu.

**ÇÖZÜM:** Animasyon artık doğrudan **kaydırma derinliğine** bağlı. Tek bir
ilerleme değeri her şeyi sürer:

```
p = clamp(scrollY / 150, 0, 1)
  opacity = 1 − p
  scale   = 1 − p × 0.16          (üstten küçülür: transformOrigin 'top center')
  height  = doğalYükseklik × (1 − p)
  mini    = 44px × p              (mini çubuk ters yönde belirir)
```

Kullanıcı kaydırmayı bırakınca animasyon da durur — "organik" his buradan gelir.

> **Ölçüm (28 Ağu 2026):** liste alanı **476 px → 788 px** (+312 px).
>
> | scrollY | p | opacity | scale | kabuk yük. |
> |---|---|---|---|---|
> | 0 | 0.00 | 1.00 | 1.000 | 301 px |
> | 30 | 0.20 | 0.80 | 0.968 | 233 px |
> | 60 | 0.40 | 0.60 | 0.936 | 169 px |
> | 90 | 0.60 | 0.40 | 0.904 | 109 px |
> | 120 | 0.80 | 0.20 | 0.872 | 52 px |
> | 149 | 0.99 | 0.01 | 0.842 | 3 px |

#### Easing — "premium" his nereden geliyor
Ham `p` doğrusaldır ve doğrusal hareket mekanik hissettirir. Üç ayrı eğri var:

| Ne | Eğri | Neden |
|---|---|---|
| yükseklik + ölçek | `smoothstep(p) = p²(3−2p)` | başta ve sonda yavaş, ortada hızlı — organik |
| opaklık | `smoothstep(min(1, p/0.72))` | yazı, kutu kapanmadan **önce** silinir; "ezilen metin" görünmez |
| mini marka | `smoothstep(clamp((p−0.35)/0.65))` | önce büyük başlık çekilir, **sonra** küçük marka gelir — üst üste binmez |

> **Ölçüm (28 Ağu 2026):** başlık 376 → 360 → 304 → 177 → 59 → 7 → 0 px;
> opaklık p=0.74'te 0'a ulaşıyor; mini çubuk 0 → 23 → 38 → 45 → 46 px.
> Liste alanı **429 → 759 px**.

#### ⚠️ Scroll'a `transition` UYGULAMAYIN
Geçiş süresi eklemek animasyonu kaydırmanın **gerisinde** bırakır ve
"lastikli/gecikmeli" bir his yaratır. Yumuşaklık **easing'den** gelir,
gecikmeden değil.

#### ⚠️ React state DEĞİL, doğrudan DOM yazımı
Önceki sürüm her scroll olayında `setState` çağırıyordu — kaydırma boyunca
saniyede ~60 React render'ı, gözle görülür takılma. Artık scroll olayında **hiç
render yapılmıyor**; değerler tek bir `paintHeader(p)` fonksiyonunda hesaplanıp
doğrudan DOM düğümlerine yazılıyor.

#### ⚠️ `requestAnimationFrame` ile toplama DENENDİ ve GERİ ALINDI
Scroll olaylarını rAF'a kuyruklamak akıllıca görünüyor ama rAF, composite
edilmeyen sekmelerde **tamamen donuyor** (bu projede ölçüldü: 0 kare/sn) ve o
durumda başlık **yarıda kilitli** kalıyordu. Üstelik tarayıcılar scroll olayını
zaten kare başına en fazla bir kez üretir — rAF ek akıcılık getirmiyor, sadece
kırılganlık ekliyordu. Boyama artık **senkron**. (Altın Kural 10'un aynı ruhu.)

#### ⚠️ EN ÜSTTE (p = 0) HİÇBİR STİL YAZILMAZ — kırpılma hatasının kökü
Önceki sürüm `p = 0` iken bile `height` + `overflow: hidden` uyguluyordu.
Ölçülen yükseklik tam sayıya yuvarlandığı için içerik 1-2 px kırpılıyor, ayrıca
kutunun **dışına taşan her şey** (logo gölgesi, açılan **arama sonuç listesi**)
kesiliyordu — *"en üstte logolar kırpık görünüyor"* şikâyetinin sebebi buydu.
Artık `p <= 0.002` dalında tüm inline stiller **temizleniyor**: düzen tamamen
doğal. `s.shell` stilinde de kalıcı `overflow` **tanımlı değildir**.

#### ⚠️ Yardımcı çubuk + kabuk TEK sarmalayıcıda
İkisi ayrı ayrı animasyonlanıyordu; her biri kendi yüksekliğini küçültünce
toplam kayma iki kat hızlı oluyor ve sıçrama yapıyordu. Artık tek sarmalayıcı
(`headerRef`) ölçülüp tek bir değer kümesiyle sürülüyor.

### 6.2.2 Canlı Arama (Live Search)
Kullanıcı `Glove` yazdığında, adında "Glove" geçen bir kutu olmasa bile
**içinde** eldiven bulunan kutular da çıkar. Her kutu, içeriğiyle birlikte tek
bir aranabilir metne ("haystack") düzleştirilir.

- **Ad eşleşmeleri** içerik eşleşmelerinden **önce** sıralanır.
- İçerik eşleşmesinde satırın altında `içinde: ★ Driver Gloves | …` yazar.
- Sonuç satırına tıklanınca **doğru sekmeye geçilir ve kutu açılır**.
- En fazla 8 sonuç gösterilir.

> ⚠️ **Performans:** Düzleştirme ~20.000 eşya adını birleştirir. `useMemo`
> sayesinde veri yüklendiğinde **yalnızca bir kez** yapılır — her tuş vuruşunda
> değil. Aksi halde yazarken arayüz gözle görülür şekilde takılırdı.

> ⚠️ `onBlur` **gecikmelidir** (180 ms): sonuç satırına tıklandığında blur önce
> ateşlenip listeyi kaldırırsa tıklama tamamen kaybolur.

### 6.2.24 Rehber / Blog Ekranı — SEMANTİK HTML (`src/BlogScreen.js`)

**AMAÇ:** Google AdSense'in içerik gereksinimlerini karşılamak — yüksek
metin/HTML oranı, özgün ve gerçekten bilgilendirici içerik, semantik yapı.

Metinler `src/content/guide.js` içinde **EN + TR** olarak durur (arayüz
etiketlerinden çok farklı bir cins oldukları için `i18n.js`'e karıştırılmadı).
Altı bölüm: **Hakkında · Özellik Rehberi · Eşyaları Anlamak · Trade-Up ·
Gizlilik Politikası · İletişim**.

#### ⚠️ react-native-web ile GERÇEK semantik etiket üretme
`role` prop'u DOM etiketine çevrilir (`propsToAccessibilityComponent`).
Doğrulanmış eşlemeler:

| `role` | HTML |
|---|---|
| `main` | `<main>` |
| `article` | `<article>` |
| `region` | `<section>` |
| `heading` + `aria-level={n}` | `<h1>`…`<h6>` |
| `paragraph` | `<p>` |
| `list` / `listitem` | `<ul>` / `<li>` |
| `navigation` | `<nav>` |
| `contentinfo` | `<footer>` |

> ⚠️ Bu rol adlarını "daha okunur" diye değiştirmeyin — `role="section"` diye
> bir eşleme **yoktur**, sessizce `<div>` üretir ve semantik kaybolur.

> **Doğrulama (28 Ağu 2026):** DOM'da `<main> ×1`, `<article> ×1`, `<nav> ×1`,
> `<footer> ×1`, tek `<h1>`, bölüm başına `<h2>`, 2–7 `<h3>` ve 5–10 `<p>`
> üretiliyor; bölüm başına 1.800–3.650 karakter metin.

#### Alt bilgi bağlantıları
`Gizlilik Politikası` · `İletişim` · `Hakkında` — hem rehber ekranının kendi
`<footer>`'ında hem de ana sayfanın altında. Dil değişince bunlar da çevrilir.

> ⚠️ `content/guide.js` içindeki oranlar §5 ile **birebir aynı** olmalıdır;
> biri değişirse diğeri de güncellenmelidir.

### 6.2.25 Çoklu Dil Desteği (`src/i18n.js`)

**Varsayılan dil İNGİLİZCE'dir** (`DEFAULT_LANG = 'en'`); Türkçe ikinci dildir.

- **TEK SÖZLÜK KAYNAĞI.** Arayüzde görünen hiçbir metin bileşenlere gömülmez;
  hepsi `t('anahtar')` ile `DICT`ten gelir.
- Değiştirici: üst yardımcı çubuktaki **🌐 globe** butonu
  (`components/LanguageSwitcher.js`). Seçim **anında** uygulanır — i18n bir React
  context'i olduğu için ağaç normal şekilde yeniden render olur, **sayfa
  yenilenmez**.
- `t('key', { n: 5 })` ile `{n}` yer tutucuları doldurulur.
- **Eksik anahtar davranışı:** seçili dil → İngilizce → *anahtarın kendisi*.
  Anahtara düşmek **bilinçlidir**: eksik çeviri sessizce boş bir arayüz üretmek
  yerine gözle görülür bir iz bırakır.
- Tarih biçimleri de dile uyar (`tr-TR` / `en-GB`).

> ⚠️ **Kod içi yorumlar Türkçe kalır** (proje kuralı); sözlüğe yalnızca
> KULLANICIYA GÖRÜNEN metinler girer.

> ⚠️ **Tuzak:** `NAV_TABS.map(t => …)` gibi bir döngü değişkeni `t` çeviri
> fonksiyonunu **gölgeler** ve menü etiketleri sessizce çevrilemez hâle gelir.
> Döngü değişkeni bu yüzden `item` olarak adlandırıldı.

### 6.2.26 Sorumluluk Reddi (`components/Disclaimer.js`)

Sayfa altında, **dikkat çekmeyen ama okunabilir** bir footer. Uyarı sarısı/
kırmızısı yoktur; düşük kontrastlı ama okunaklı gri-mavi metin kullanılır.

Üç madde **yasal bilgilendirmedir, hiçbiri kaldırılmamalıdır**:
1. Bu uygulama sadece **eğlence amaçlı bir simülatördür**.
2. Kazanılan sanal eşyalar **gerçek oyunlara (Steam, CS2) aktarılamaz/takas edilemez**.
3. Sitede **gerçek para yatırma/çekme veya kumar mekanizması yoktur**.

Ayrıca Valve ile bağlantısı olmadığını belirten bir satır bulunur.

> Bir açılış ekranı aktifken (`compact`) metin **tek satıra** iner — dikey alan
> kazanmak için.

#### Kompakt + kapatılabilir
Kutu küçük punto (9–10.5 px) ve dar padding ile minimalist tutulur; üç madde tek
paragrafta birleştirilmiştir (içerik aynen korunur, yalnızca dikey yer kaplaması
azalır). Sağ üst köşede bir **✕** butonu vardır.

#### ⚠️ `localStorage` — Altın Kural 6'ya ONAYLI İSTİSNA
Kapatma durumu `skinsim.disclaimerDismissed` anahtarıyla saklanır, böylece sayfa
yenilense de uyarı tekrar çıkmaz. Bu, projedeki **tek** kalıcı veridir —
bakiye/envanter/kredi hâlâ yalnızca oturum içidir.

Üç kırılganlık noktası da ele alınmıştır:
1. **Native'de `localStorage` yoktur** → `Platform.OS !== 'web'` kontrolü
2. **Gizli sekmede erişim hata fırlatabilir** → `try/catch`
3. **Depolama kapalı/dolu ise yazma patlar** → `try/catch`

Hata hâlinde davranış "kapatılmamış say"dır: en kötü ihtimalle uyarı tekrar
görünür — yasal metnin sessizce kaybolmasındansa çok daha iyi. Ayrıca `storage`
olayı dinlenir, böylece başka bir sekmede kapatıldığında burada da kapanır.

### 6.2.3 Tasarım Sistemi — AÇIK TEMA (`src/theme.js`)

**TEK RENK KAYNAĞI.** Hiçbir bileşen kendi içinde ham renk kodu tanımlamaz;
`theme.js`'teki `C` tokenlarını kullanır.

| Token | Değer | Kullanım |
|---|---|---|
| `C.bg` | `#f4f7fb` | sayfa zemini (buzul grisi) |
| `C.bgAlt` | `#eaf1f8` | çark zemini, ikincil alanlar |
| `C.surface` | `#ffffff` | kart / panel |
| `C.text` | `#26303d` | ana metin (koyu gri, saf siyah **değil**) |
| `C.textDim` | `#7b8798` | ikincil metin |
| `C.accent` / `C.accentDeep` | `#38a3f1` / `#1b7fd1` | açık mavi vurgu |
| `C.success` / `C.danger` | `#0f9d63` / `#e05252` | kâr / zarar |
| `C.crt*` | koyu lacivert + `#5ff0c4` | terminal ekranı |

- **Kaba çerçeve yok:** kartlar kenarlık yerine **yumuşak gölge** ile ayrışır.
  Gölge rengi siyah değil **mavi-gri** (`#8ba3bf`) — açık zeminde siyah gölge
  kirli/gri görünür.
- **Kumarhane havası kaldırıldı:** koyu zemin + neon turuncu paleti tamamen gitti.

> ⚠️ **NADİRLİK RENKLERİ (`RARITY`) İSTİSNADIR.** Bunlar Valve'in resmi CS2
> renkleridir (mavi/mor/pembe/kırmızı/altın) ve tema değişse bile **sabit**
> kalmalıdır — kullanıcılar bu renkleri oyundan tanıyor.

#### Hover'da 3B yükselen kart (`components/HoverCard.js`)
Tüm liste kartları bunu kullanır: hover'da `translateY(-6px)` + daha derin gölge.

> **Neden `Animated` değil:** Hover *sürekli* bir etkileşim; her mouse
> hareketinde bir Animated döngüsü başlatıp yarıda kesmek hem pahalı hem
> titrek. Web'de gerçek CSS transition (`theme.webTransition`) kullanılıyor —
> react-native-web `transitionProperty/Duration/TimingFunction` stil
> anahtarlarını gerçek CSS'e çevirir. JS thread'ini meşgul etmez ve donmuş
> `requestAnimationFrame` sorununa yakalanmaz.
>
> ⚠️ `onMouseEnter/Leave` **native'de yoktur** — orada kart daima dinlenme
> hâlinde kalır (kasıtlı: dokunmatikte hover diye bir şey yok).

#### Nadirlik Işığı (Rarity Glow) — CS2 orijinal drop efekti
`theme.rarityGlowStyle(hex)` — eşya kutusunun **alt ~%10-15'lik** kısmından
yukarı doğru **sönümlenerek** çıkan, nadirlik rengindeki ışık. Web'de gerçek
`linear-gradient`, native'de düz yarı saydam renge düşer.

Uygulandığı yerler: kasa çarkındaki **her** şerit öğesi (dönerken renkler akıp
gider), kazanılan eşya kartı, çoklu açılış kartları, terminal ve kapsül
sonuçları, envanter inceleme modalı.

### 6.2.27 Çoklu Açılış Sonuç Paneli (`components/BatchResultPanel.js`)

Kasa, Souvenir, Sticker Kapsülü ve Armory koleksiyonu açılışlarının **hepsi**
artık tek bir sonuç panelini kullanır. Önceden dört ekranda dört ayrı (ve farklı
özellikli) sonuç ızgarası vardı; biri güncellenince diğerleri unutuluyordu.

| Yetenek | Davranış |
|---|---|
| **Tekrardan Aç** | Aynı kutuyu **aynı adetle** yeniden açar |
| **Tekli satış** | Eşyanın üzerine gelince küçük yeşil "Sat" düğmesi çıkar |
| **Çoklu seçim** | Karta tıklayınca seçilir (mavi çerçeve + tik rozeti) |
| **Hepsini Envantere Gönder** | Kalan tüm eşyaları aktarır |
| **Seçilenleri Gönder** | Yalnızca işaretlenenleri aktarır, kalanlar ekranda durur |
| **Kalanları Sat** | Ekranda kalan istenmeyen eşyaları tek tuşla satar |

> ⚠️ **`batch.totalWon` DEĞİL, KALAN eşyaların toplamı ödenir.** Kullanıcı aradan
> tek tek satış yapmış olabilir; ilk açılıştaki toplamı ödemek satılan eşyaların
> parasını **iki kez** verirdi.

> ⚠️ **"Tekrar Aç" paneli ÖNCEDEN KAPATMAZ.** Yeni açılış "yetersiz bakiye" ile
> reddedilirse kullanıcı hem yeni sonuç alamaz hem de eldeki eşyaları kaybederdi.
> Başarılı açılış `batch`'i zaten kendisi değiştirir.

> ⚠️ Dokunmatik platformlarda hover yoktur; "Sat" düğmesi orada **daima**
> görünür (`Platform.OS !== 'web'`).

Ayrıca sıralı beliriş ızgarası artık `batch.sequential && !batch.revealed`
koşuluyla basılır — aksi hâlde panelin kendi ızgarasıyla üst üste gelip eşyaları
**iki kez** gösteriyordu.

### 6.2.28 Kasa Açma Ekranı — Fiyat Gösterimi

Kutunun hemen altında, her kalem **kendi satırında** ve **kendi CS2 ikonuyla**:

```
[kasa ikonu] Kasa  $0.88    │    [anahtar ikonu] Anahtar  $2.50
```

Eskiden tek satırlık küçük gri bir metindi ("Kasa $0.24 + Anahtar $2.50") ve
**toplam** da açma butonunun üzerinde tekrarlanıyordu; kullanıcı hangi rakamın ne
olduğunu ayırt edemiyordu. Artık butonun üzerinde **sadece "KASAYI AÇ"** yazıyor.

### 6.2.29 Simge Seti — SVG (`components/Icons.js`)

⚠️ **EMOJİ TAMAMEN KALDIRILDI.** Kullanıcı geri bildirimi: *"ikonlar fazla
çocuksu (Mario veya Minecraft gibi) duruyor."* İki yapısal sebep:

1. Emoji her işletim sisteminde **farklı** çizilir (🔍 Windows'ta renkli ve
   şişkin, macOS'ta bambaşka, Android'de bambaşka) — aynı arayüz üç ayrı görsel
   dile bölünüyordu.
2. Emoji'ye **renk/kalınlık verilemez.** CS2'nin arayüz dili monokrom ve ince
   çizgilidir; renk yalnızca nadirlikte ve para/kredi göstergesinde kullanılır.

Yerine `react-native-svg` tabanlı bir set geldi. **Tasarım kuralları (tek yerde):**
24×24 viewBox · `stroke` tabanlı (dolgu yok) · `strokeWidth` 1.6 ·
`round` uç/köşe · renk **daima prop'tan** gelir.

| Simge | Kullanım |
|---|---|
| `IconSearch` | Arama — CS tarzı nişangâhlı büyüteç (renkli dürbün emojisi değil) |
| `IconInventory` | Envanter — taşıma sandığı (Minecraft bloğu değil) |
| `IconCase` / `IconKey` | Kasa açma ekranındaki fiyat etiketleri (CS2 kasası ve anahtarı) |
| `IconList` `IconChart` `IconGem` `IconTag` `IconTrend` | Liste sıralama seçenekleri |
| `IconClock` `IconArrowUp/Down` | Envanter sıralama |
| `IconRefresh` `IconBook` `IconTrash` `IconSelect` `IconSell` | Menü ve araç çubuğu |
| `IconGlobe` | Dil değiştirici |
| `IconLock` `IconCheck` `IconClose` `IconInfinity` `IconWallet` | Genel |
| `StarIcon` / `DollarIcon` | **TEK RENKLİ İSTİSNA** — bakiye/kredi göstergeleri yeşildir |

> ⚠️ Yıldız ve dolar bilinçli olarak **renklidir**: bunlar arayüzün "durum"
> katmanıdır; monokrom bırakılırlarsa gezinme simgelerinden ayrışmaz ve göz
> onları taramada bulamaz.

Sözlükteki (`i18n.js`) **tüm** emoji önekleri de temizlendi; simge artık metnin
içinde değil, **ayrı bir bileşen** olarak render ediliyor ve aktif/pasif duruma
göre **renk alıyor**.

### 6.2.30 Mobil Klavye — Trade-Up Float Kutusu

> **Kullanıcı şikâyeti:** *"Float kutusuna tıklayınca klavye açılıyor, item
> tamamen ekrandan kayboluyor; yazdığım değeri göremiyorum."*

**KÖK NEDEN:** Tarayıcıların varsayılan davranışı `interactive-widget=resizes-visual`'dır
— klavye açılınca **düzen (layout) viewport'u aynı kalır**, yalnızca görsel
viewport kayar. Bu uygulamada `body { overflow: hidden }` ve tam yükseklik bir
kök eleman olduğu için sayfa hiç kaydırılamıyor, odaklanan kutu klavyenin
**arkasında** kalıyordu.

**İKİ PARÇALI ÇÖZÜM:**

1. `public/index.html` → viewport meta'sına **`interactive-widget=resizes-content`**.
   Klavye açıldığında düzen viewport'u da küçülür, ScrollView kısalır ve
   odaklanan alan gerçekten kaydırılabilir hâle gelir.
2. `CompactFloatSlider.handleFocus` → odaklanınca **kartın tamamını** ekranın
   ortasına kaydırır (`scrollIntoView({ block: 'center' })`).

> ⚠️ **Kutuyu değil KARTI kaydırıyoruz:** kullanıcı float'ı **eşyaya bakarak**
> ayarlıyor. Kart ortalanınca görsel + isim + yazdığı değer aynı anda görünür kalır.
> Kartı bulmak için `dataSet={{ tradecard: '1' }}` → `data-tradecard` işareti kullanılır.

> ⚠️ **320 ms gecikme şart:** klavye açılma animasyonu sürerken kaydırılırsa
> tarayıcı düzeni yeniden hesaplayınca hedef kayar.

**Doğrulama:** odaklanmadan önce kutu `y = 811` (720 px'lik görüntü alanının
dışında), odaklandıktan sonra `y = 463` — kart görünür ve ortalanmış.

### 6.2.31 Sekme Başlığı, Google Analytics ve `public/index.html`

Expo, `public/index.html` varsa onu **şablon** olarak kullanır (SDK 57,
single-page çıktı). Bu dosya üç şeyi taşıyor:

- `<title>SkinSimulator.com</title>` (eskiden `app.json`'daki `expo.name`'den
  "cs2-simulator" üretiliyordu)
- **Google Analytics** etiketi (`G-C4JPXC4L64`), `head`'in en başında
- Mobil klavye düzeltmesinin viewport meta'sı (§6.2.30)
- **Google Search Console** site doğrulama meta etiketi
  (`google-site-verification`) — ⚠️ bu Analytics DEĞİLDİR, ayrı bir
  jetondur ve silinirse doğrulama düşer (bkz. `cloud.md` §5.8.1)

> ⚠️ **BU DOSYADA KAPANIŞ `head`/`body` ETİKETİ YAZMAYIN — YORUM İÇİNDE BİLE.**
> Expo'nun enjeksiyonu düz metin araması yapıyor ve kapanış etiketinin **ilk**
> geçtiği yeri hedefliyor. Bir yorumun içinde böyle bir metin geçerse bundle
> script etiketi **yorumun içine** gömülür ve uygulama hiç açılmaz.
> (Bu bir kez yaşandı — 29 Ağu 2026.)

### 6.2.32 Koleksiyonlar Sekmesi (`src/CollectionsScreen.js`)

Oyundaki **bütün** koleksiyonlar (110 adet: 97 silah · 6 sticker · 4 charm ·
3 grafiti) tek bir keşif ekranında. Referans: `case.oki.gg/collections`.

> ⚠️ **BU BİR AÇILIŞ EKRANI DEĞİLDİR.** Burada hiçbir şey açılmaz, satın
> alınmaz, bakiyeye dokunulmaz. `setBalance` / `gameMode` prop'ları **bilerek
> geçilmez** — Trade-Up'takiyle aynı yapısal garanti.

> ⚠️ **EK AĞ ÇAĞRISI YOK.** Veri, App.js'in Trade-Up için zaten indirdiği
> `allCollectionsRaw`. Yeni bir `fetch` eklemeyin.

#### Aktif Drop Havuzu (Active Drop Pool)
Şu anda haftalık Care Package'ta düşen koleksiyonlar **listenin en üstünde**,
ayrı bir bölüm başlığı altında, **vurgu renginde çerçeveli kartlarla** ve
`AKTİF DROP HAVUZU` rozetiyle gösterilir.

> ⚠️ **BU LİSTE ELLE BAKIMLIDIR — API'de böyle bir alan YOKTUR.**
> `src/armoryData.js` → `ACTIVE_DROP_POOL_COLLECTION_NAMES`. Valve rotasyon
> yaptığında **güncellenmesi gereken tek yer** orasıdır. Şu anki liste
> (29 Ağu 2026'da derlendi): Harlequin · Achroma · Ascent · Boreal · Radiant ·
> Genesis · Dead Hand. Kaynak: Valve'in 22 Oca 2026 rotasyonu (Harlequin ve
> Achroma eklendi; Safehouse, Dust 2, 2018 Nuke, 2018 Inferno çıkarıldı) ve
> aktif kapsayıcı olarak listelenen Genesis/Dead Hand terminalleri.

> ⚠️ Aktif koleksiyonlar **seçilen sıralamadan bağımsız** olarak daima en üstte.
> Kullanıcının bu ekranda aradığı ilk bilgi "şu an ne düşüyor?" — A-Z
> sıralamasında bunu 110 kartın arasında aramak zorunda kalmamalı. Aktif grubun
> kendi içinde de aynı sıralama uygulanır.

#### Sıralama
`A → Z` · `Yeniden Eskiye` · `Eskiden Yeniye` — tarih sıralaması
`collections.json`'daki **`release_date`** alanını kullanır (110 kaydın
109'unda var; tarihi olmayan tek kayıt "Limited Edition Item" en sona düşer).

#### Arama — LİSTEDE, koleksiyonun içinde DEĞİL
⚠️ **30 Ağu 2026 değişikliği.** Arama kutusu detay sayfasından **kaldırıldı**:
bir koleksiyonda en fazla ~30 eşya var ve hepsi zaten tek ekranda listeleniyor,
dolayısıyla süzme yer kaplamaktan başka işe yaramıyordu. Buna karşılık ana
listede **110 koleksiyon** var — asıl arama ihtiyacı orada. Kutu artık sıralama
çubuğunun altında ve `{eşleşen} / {toplam}` sayacı gösteriyor.

⚠️ **Kabuk araması bu sekmede GİZLİ** (bkz. App.js `tab !== 'collections'`):
o arama kasa/eşya (yani "silah") buluyor ve Koleksiyonlar sekmesinde kullanıcı
koleksiyon adı arıyordu. İki arama kutusunun yan yana durması kafa karıştırıcıydı.

Detaydaki eşyalar **en nadirden en sıradana**, kademe içinde de deterministik
değere göre sıralanır; bir eşyaya tıklamak **büyük görsel önizlemesini** açar.

#### ⚠️ KART YÜKSEKLİĞİ BİLEREK DÜŞÜK — kaydırma daveti
Kullanıcı geri bildirimi: *"Aktif Drop Havuzu tüm ekranı kaplıyor, altında
başka içerik olduğu anlaşılmıyor."* Kart yüksekliği **224 px → 154 px**
indirildi (görsel 92→56 px, iç boşluk 12→9 px). Ölçüm (1280×820): "Tüm
Koleksiyonlar" başlığı artık `y = 780`'de, altındaki beş kart da `y = 808`'de
— yani ilk ekranda kısmen görünüyorlar ve kaydırmaya davet ediyorlar.

#### ⚠️ FİYAT MOTORU TÜRE GÖRE SEÇİLİR
`collections.json` içinde tür alanı **YOK**; silah, sticker, charm ve grafiti
koleksiyonları aynı şemayla duruyor. Tür koleksiyonun **adından** çıkarılır
(`kindOfCollection`) ve doğru fiyat motoruna yönlendirir:

| Tür | Fiyat | Not |
|---|---|---|
| Silah | `getItemPriceRange` (aralık) | float + StatTrak aralığı |
| Sticker | `getStickerPrice({stable:true})` | `Sticker \| <ad>` anahtarı |
| Charm | `getCharmPrice({stable:true})` | `market_hash_name` var |
| Grafiti | — | piyasada tek tek listelenmez |

`stable: true` **zorunlu**: rastgele varyans listenin her render'da yeniden
sıralanmasına yol açar.

#### ⚠️ `numColumns` KULLANILMIYOR — bölüm başlığı tuzağı
İlk sürüm bölüm başlıklarını normal ızgara öğesi olarak basıyordu. FlatList
`numColumns` ile öğeleri N'li satırlara böldüğü için başlık **bir hücreyi**
kaplıyor ve satırın **ortasında** kalıyordu: 5 sütunda ilk satır
`[BAŞLIK, kart, kart, kart, kart]` oluyor, "Tüm Koleksiyonlar" başlığı da aktif
kartların arasına düşüyordu (ölçüldü). Çözüm: satırlar **elle** oluşturuluyor;
liste satır başına tek öğe taşıyor.

> ⚠️ `useWindowDimensions().width` ilk karelerde veya görünür olmayan bir
> sekmede **0** gelebiliyor (gizli panede ölçüldü: `innerWidth = 0`).
> Korumasız bırakılırsa kart genişliği **negatif** çıkıp ızgara çöküyor —
> `Math.max(280, …)` tabanı bu yüzden var.

### 6.2.33 Bilgi Kutucukları (`components/Tooltip.js`)

Kart altındaki ve açılış ekranlarındaki metrikler (EV · ROI · Maks. Kazanç ·
Ort. Teklif · 5'te En İyi) hover'da ne anlama geldiklerini açıklar, fare
çekilince kaybolur.

| Anahtar | Nerede |
|---|---|
| `tip.ev` | Beklenen Değer — tek açılışın ortalama getirisi |
| `tip.roi` | Getiri/maliyet; %100 altı uzun vadede kaybettirir |
| `tip.maxWin` | Kutunun verebileceği en değerli eşya (çok nadir) |
| `tip.avgOffer` | Tek terminal teklifinin ortalama değeri |
| `tip.bestOffer` | 5 teklifin **en iyisinin** beklenen değeri |

> ⚠️ **Animasyon YOK — bilinçli.** Gecikmeli bir fade, kullanıcı listede fareyle
> gezerken arkada "hayalet" kutucuklar bırakıyordu.

> ⚠️ **Kapsayıcıda `overflow: hidden` OLMAMALI** — kutucuk `position: absolute`
> ve `zIndex: 999` ile kartın dışına taşar. App.js'teki `s.card` bu yüzden
> yalnızca `position: relative` tanımlar.

> ⚠️ Native'de hover yoktur; orada kutucuk **dokunmayla** açılıp kapanır.

### 6.2.34 Görsel Önizleme (`components/ImagePreviewModal.js`)

Kasa/terminal/souvenir/kapsül içerik listelerinde ve Koleksiyonlar detay
ızgarasında bir eşyaya tıklanınca görselin büyük hâli açılır (nadirlik ışığı,
nadirlik/aşınma/StatTrak rozetleri, varsa tam float).

> ⚠️ **Ek bir "yüksek çözünürlük" uç noktası YOK.** ByMykel görselleri Steam
> CDN'inden zaten büyük geliyor; kart içinde 50-80 px'e sıkıştırıldıkları için
> bulanık görünüyorlardı. Aynı URL, sadece daha büyük kutu.

> ⚠️ Çoklu açılış sonuç panelinde (`BatchResultPanel`) karta tıklamak **seçim**
> yapar, önizleme açmaz — o ekranda tıklama zaten başka bir işe bağlı.

### 6.2.35 Hızlı İletişim (`components/ContactWidget.js` + `contactConfig.js`)

Sağ alt köşede sabit bir düğme; tıklanınca Ad · E-posta · Mesaj alanlı bir form
açılır. Mesajlar arka planda `CONTACT_EMAIL` adresine iletilir; kullanıcı formda
hedef adresi **görmez**. Adres yalnızca Rehber → İletişim bölümünde, manuel mail
atmak isteyenler için yazılıdır.

> ⚠️ **NEDEN BİR ÜÇÜNCÜ TARAF GEREKİYOR:** Proje tamamen istemci taraflıdır
> (bkz. cloud.md §1). Tarayıcıdan doğrudan e-posta göndermek mümkün değildir —
> SMTP için sunucu ve gizli parola gerekir, istemci koduna konulan parola
> herkes tarafından okunabilir. Bu yüzden form bir "form aracısı" servise POST
> eder. Sağlayıcı değiştirmek için **tek yer** `src/contactConfig.js`.

> ⚠️ **İLK MESAJDA AKTİVASYON GEREKİR:** FormSubmit, adresin sahibi olduğunuzu
> doğrulamak için ilk gönderimde `CONTACT_EMAIL`'e bir onay bağlantısı yollar.
> O bağlantıya bir kez tıklanmadan mesajlar iletilmez.

> ⚠️ **Ağ çağrısı bileşende değil:** gönderim `api.sendContactMessage` üzerinden
> yapılır (Ağ Katmanı Kuralı). Başarısızlıkta form `mailto:` yedeğine düşer ve
> kullanıcının yazdığı metin **kaybolmaz**.

### 6.2.36 CS2 / TAKTİKSEL KOYU TEMA (`src/theme.js`)

> **Kullanıcı brief'i (30 Ağu 2026):** *"Ana iskeleti, layout yapısını ve menü
> dizilimini KESİNLİKLE bozmadan sadece CSS ve UI/UX tarafında görsel
> güncelleme."* — Bu yüzden hiçbir bileşenin JSX ağacı, hiçbir `flex` düzeni
> ve menü sırası değişmedi; yalnızca **token değerleri** değişti.

#### ⚠️ TEK SATIRLIK GERİ ALMA
`src/theme.js` → `export const THEME = 'cs-dark' | 'light'`.
Bu **tek sabit** paleti, köşe yarıçaplarını, fontları, aktif-durum görünümünü,
gölgeleri ve gövde zeminini birlikte belirler. Eski açık tema **silinmedi**:
`LIGHT_C` / `LIGHT_R` / `LIGHT_F` / `LIGHT_SHADOW` blokları olduğu gibi duruyor.

`App.js` temayı DOM'a köprüler (`<html data-cs-theme="...">` + gövde zemini),
böylece `public/index.html`'deki font kuralı da aynı anahtara bağlanır.

> **Doğrulandı:** `THEME='light'` → gövde `#f4f7fb`, kart beyaz + 10 px yarıçap,
> aktif sekme yeniden dolu mavi, Chakra Petch kullanan öğe sayısı **0**.
> `THEME='cs-dark'` → gövde `#14181c`, aktif sekme mat gri + 2 px sarı çizgi,
> 81 öğe Chakra Petch, 30 öğe monospace.

#### Palet
| Token | Açık tema | Taktiksel tema |
|---|---|---|
| `bg` | `#f4f7fb` | `#14181c` (antrasit) |
| `surface` | `#ffffff` | `#21262c` (gunmetal) |
| `surfaceAlt` | `#f2f6fb` | `#2a3037` (aktif durum zemini) |
| `text` | `#26303d` | `#e8ecef` |
| `accent` | `#38a3f1` (açık mavi) | `#f2c94c` (taktiksel sarı) |
| `accentLine` | `transparent` | `#f2c94c` |

⚠️ **NADİRLİK RENKLERİ (`RARITY`) TEMADAN BAĞIMSIZ.** Valve'in resmi paleti;
kullanıcılar bu renkleri oyundan tanıyor.

#### Aktif/seçili durum — kutu BOYANMAZ
Kullanıcı isteği: *"aktif sekmelerde kutunun tamamını boyamak yerine ince
parlak bir vurgu çizgisi."* `activeIndicator(side, width)` bunu tek yerden verir;
**açık temada `null` döner**, yani eski "dolu mavi" görünüm kayıpsız korunur.

| Yer | Görünüm |
|---|---|
| Ana menü sekmesi | mat gri zemin + **alta** 2 px sarı çizgi |
| Sıralama çipleri | aynı |
| Aktif drop havuzu kartı | **sola** 3 px sarı çizgi + hafif ton |
| Rehber bölüm menüsü | **sola** 3 px çizgi |

#### Köşeler
`R` tokenları: açık temada `4/6/10/14/20/999`, taktiksel temada
`0/2/3/4/4/3`. Sitedeki **68 sabit yarıçap** tokenlara bağlandı.
⚠️ Otomatik dönüşüm **daireleri atladı**: `width: N, height: N, borderRadius: N/2`
kalıbı bir dairedir (nokta, yuvarlak rozet, patlama halkası) — token'a çevirmek
onları kareye dönüştürürdü.

#### Kesik köşe (`clipCut`)
⚠️ **YALNIZCA butonlarda.** `clip-path` kutunun DIŞINA taşan her şeyi keser;
bilgi kutucuğu, açılır arama listesi veya nadirlik ışığı barındıran kaplara
uygulanırsa onları da keser. Şu an: "KASAYI AÇ", Armory harcama butonu ve
"START TERMINAL".

#### Fontlar
`Chakra Petch` (gövde) + `Rajdhani` (başlık/menü), Google Fonts'tan.
⚠️ **MONOSPACE İSTİSNASI:** bakiye/sayaç rakamları tabular kalmalı, yoksa rakam
genişliği değişince rozet yerinden oynar. RN-Web, stilde açıkça `fontFamily`
verilen öğelere `r-fontFamily-<hash>` sınıfı basar; global font kuralı bu
sınıfa sahip öğeleri `:not()` ile dışarıda bırakır.
> **Bug (ölçüldü):** ilk denemede `[style*='monospace']` seçicisi kullanılmıştı;
> RN-Web font-family'yi inline stille DEĞİL sınıfla verdiği için hiç eşleşmedi
> ve tüm monospace sayılar Chakra Petch'e döndü.

#### ⚠️ ROI bilgi kutusu (Tooltip) — `maxWidth` DEĞİL, açık `width`
> **Kullanıcı:** *"ROI bilgilendirme kutusu çok dikey, tamamen siyah ve ekranın
> büyük bir kısmını kaplıyor."*

KÖK NEDEN: Baloncuk mutlak konumlu ve kapsayıcısı **çapa öğesi** (kart altındaki
`statCell`, ~52 px). Mutlak konumlu bir kutunun "shrink-to-fit" genişliği
kapsayıcının genişliğiyle **sınırlıdır**; `maxWidth` bu sınırı kaldırmaz.
Ölçüldü: baloncuk **86 × 284 px** — metin neredeyse harf harf alt alta düşüyordu.
Sabit `width: 280` verilince **280 × 82 px** oldu. Zemin de simsiyah yerine
`rgba(11,15,19,0.92)` + ince kenarlık.

### 6.3 Önemli UI Bileşenleri
- **Satış akışı:** TÜM satışlar (hover hızlı satış, inceleme modalı, toplu satış)
  tek bir `requestSell` → `SellConfirmModal` → `finalizeSell` yolundan geçer.
  - **Cüzdan Modu:** basit onay (Evet / Hayır).
  - **Sınırsız Mod:** akıllı yönlendirme — *Cüzdan Moduna Geç ve Sat* (modu
    değiştirir + gerçek bakiyeye yazar) / *Sınırsız Modda Sat* (mod aynı kalır,
    **sanal kazanca** yazar) / *İptal*. Böylece kullanıcı sandbox'ta farkında
    olmadan değer kaybetmez.
  - `sandboxEarnings` ayrı tutulur ve Sınırsız rozeti altında gösterilir.
- **Envanter:** 5 sıralama modu (En Yeni / Pahalı→Ucuz / Ucuz→Pahalı / En İyi
  Float / En Kötü Float), çoklu seçim + canlı toplamlı toplu satış, ve eşyaya
  tıklayınca açılan **inceleme modalı** (büyük görsel, tam float, pattern seed,
  aşınma bandı şeridi, Sat / Trade-Up'a Ekle).
  Float'ı olmayan eşyalar (charm/sticker) float sıralamasında sona atılır.
- **Rulet:** Kazanan **index 40**'ta durur. Merkez hizalaması
  `centerOfRouletteItem(n) = ITEM_MARGIN + n × ITEM_PITCH + ITEM_WIDTH/2`
  formülüyle yapılır. `ITEM_PITCH = 104px` (100px genişlik + 2×2px margin) —
  margin'i saymamak geçmişte **desync bug'ına** yol açmıştı.

  **Gösterge:** Çerçeve/kutu YOK. Konteynerin **tam üst-ortasından** aşağı bakan
  tek bir üçgen ok (`WinnerPointer`, border hilesiyle çizilir; `size` = yarım
  genişlik olduğu için `marginLeft: -size` ile ortalanır). Kazanan eşya kutunun
  içine girmez, doğrudan okun altında durur. Tekli ve 5x mini çarkların hepsinde
  aynı bileşen kullanılır (doğrulandı: 5/5 mini çarkta sapma 0.33px).

  **Hizalamanın iki kuralı** (ikisi de bug kaynağıydı, bkz. §7):
  1. Kaydırma hesabında **konteyner genişliği** kullanılır (`onLayout` ile ölçülür),
     pencere genişliği DEĞİL. Fark `content` padding'i + kaydırma çubuğudur
     (ölçüldü: pencere 979px → konteyner 923px, yani **28px** merkez kayması).
  2. **Rastgele jitter YOK.** Gösterge çerçevesi tam `ITEM_WIDTH` genişliğinde
     olduğu için en ufak sapma bile çerçevenin item'ı tam kaplamamasına yol açar.

  **Kuyruk (trailing) kuralı:** Kazanan şeridin SONU olamaz — durduğunda sağında
  da item akmaya devam etmeli. Şerit uzunluğu ekran genişliğine göre hesaplanır:
  `WINNER_INDEX + 1 + ceil((konteynerGenişliği/2) / ITEM_PITCH) + 3`.
  Aynı kural 5x mini çarklar için de geçerlidir (eskiden kazanan son öğeydi ve
  sağ taraf boşluğa kesiliyordu).

  **Sekme (Bounce) — "taş gibi donma" düzeltmesi:** Çark eskiden tek bir
  `Animated.timing` bitip **anında** duruyordu; fiziksel olarak inandırıcı
  değildi. Artık hareket iki aşamalı:
  1. `timing` → hedefin **biraz ötesine** git (`SPIN_OVERSHOOT = 26px`)
  2. `spring` → hedefe geri otur (düşük `friction`, hedef etrafında 1-2 kez
     hafifçe ileri-geri salınır — elastic ease-out)

  > ⚠️ Sekme miktarı bilinçli olarak **küçük** (item genişliğinin ~1/4'ü). Daha
  > büyük bir değer, göstergenin komşu eşyayı işaret ettiği izlenimi yaratır ve
  > "kazanan yanlış gösteriliyor" şikâyetine yol açar.

  Mini (5x) çarklar da aynı şekilde seker (`MINI_SPIN_OVERSHOOT = 16px`).

- **⚠️ Animasyon Bekçisi (Watchdog) — "eşyam hiç gelmedi" koruması:**
  Kazanılan eşyanın ekrana gelmesi Animated'in **tamamlanma callback'ine**
  bağlıydı. Ancak `requestAnimationFrame` composite edilmeyen bir sekmede
  **tamamen donabiliyor** (ölçüldü: **saniyede 0 kare**). Bu durumda Animated hiç
  ilerlemez, callback **hiç ateşlenmez** ve kullanıcı parasını ödediği hâlde
  sonsuza kadar dönen (aslında hiç dönmeyen) bir çarka bakar.

  Sonuç zaten çark başlamadan **önce** belirlenmiş durumda; animasyon sadece
  görsel bir gecikme. Bu yüzden beklenen süreden ~1.2 sn sonra devreye giren bir
  bekçi zamanlayıcı sonucu kendisi açıklıyor. `settledRef` sayesinde Animated
  callback'i ile bekçi yarışsa bile sonuç **yalnızca bir kez** işlenir (çifte
  ödül / çifte sayaç imkânsız). Kazanılan eşya kartının `opacity`/`scale`
  değerleri de önce güvenli son değerlerine set edilir — animasyon hiç oynamasa
  bile kart görünür kalır.

  > Terminal ve Kapsül ekranlarında bu koruma **doğuştan** var: aşama geçişleri
  > zaten `setTimeout` ile sürülüyor, `Animated` callback'iyle değil.
- **Çoklu açılış:** 5x → eş zamanlı 5 bağımsız rulet (`Animated.parallel`);
  10x/25x → sıralı belirme (160ms aralıklarla) + **"Hemen Göster"** atlama butonu.
- **İçerik Önizleme (`components/ContentsModal.js`):** Tek dosya, üç ihraç:
  - `ContentsList` — nadirliğe göre gruplu eşya listesi (foto + isim + oran % + fiyat)
  - `InlineContentsPanel` — **açma ekranlarında "Aç" butonunun altında** duran,
    katlanabilir ve varsayılan **açık** panel. Kasa, Armory koleksiyonu, charm,
    sticker ve özel eşya dahil **istisnasız hepsinde** çalışır.
  - `ContentsModal` — liste kartlarındaki 🔍 ikonunun açtığı tam ekran sürüm.

  Oran tabloları tek yerde durduğu için satır içi panel ile modal **asla ayrışamaz**.
- **Terminal açılışı (`TerminalOpening.js`) — ÇARK YOK:**
  Gerçek CS2'de terminaller bir kasa gibi açılmaz: ekranı olan fiziksel bir
  cihazdır, eşyayı *tarar* ve dispenser gibi **teslim eder**. Üç aşama:
  1. **TARAMA** — CRT ekranda hızla değişen gerçek eşya adları + sahte modül
     kodları; metin RGB ayrışmasıyla (kırmızı/camgöbeği kopyalar kaydırılmış)
     titrer (glitch). Ekran koyu kalır (beyaz bir "terminal" inandırıcı olmazdı).
  2. **YAVAŞLAMA** — kareler arası gecikme kübik olarak artar
     (`45ms → 300ms`, 34 kare ≈ 3.4 sn) → gerilim eğrisi. *(Doğrulandı: ilerleme
     %18 → 35 → 47 → 56 → 65 → 71, artışlar küçülüyor.)*
  3. **DISPENSE** — beyaz flaş + eşyanın nadirlik ışığıyla belirmesi.

  > ⚠️ Flaş **iki aşamalı** sürülür: önce geçişsiz (`0ms`) tam parlaklık, sonra
  > uzun geçişle sönüm. Tek bir boolean kullanılsaydı CSS transition parlamayı da
  > yavaşlatır ve "flaş" hissi kaybolurdu.
  >
  > ⚠️ Flaş `Animated` **değil**, state + CSS transition ile sürülür: donmuş bir
  > ortamda Animated tabanlı bir flaş ekranı **beyaz kilitli** bırakabilirdi.

- **Sticker kapsülü açılışı (`CapsuleOpening.js`) — ÇARK YOK:**
  Kapsül titrer → ortasından **yırtılır** → iki yarısı savrularak çıkartmayı
  ortaya çıkarır.
  - Yarılar tek bir görselden üretilir: iki `overflow: hidden` pencere, içindeki
    tam boy görsel `left` ile kaydırılır → gerçek bir "ikiye ayrılma".
  - Yırtık çizgisi 45° döndürülmüş küçük karelerden zikzak olarak çizilir
    (RN'de SVG olmadan zikzak üretmenin en sağlam yolu).
  - Aşama geçişleri `setTimeout` ile sürülür, `Animated` callback'iyle **değil**
    — animasyon hiç oynamasa bile çıkartma **mutlaka** ortaya çıkar.

- **Kart fiyat aralığı:** Souvenir/Sticker dahil tüm kutu kartlarının **sağ üst
  köşesinde yeşil** bir aralık gösterilir (`getContainerValueRange`): bu kutudan
  çıkabilecek **en ucuz → en değerli** ödül.

- **⚠️ "Ücretsiz simülatör" ROZETİ KALDIRILDI (30 Ağu 2026):** Ücretsizlik
  hâlâ **yapısal** bir garantidir (bu ekrana `setBalance`/`gameMode` hiç
  geçirilmez); rozet yalnızca görsel bir bilgilendirmeydi. Metin `i18n.js`'te
  `tradeup.freeBadge` olarak DURUYOR — geri isterseniz tek blok geri eklenir.

- **⚠️ SONUÇ YER TUTUCUSU (30 Ağu 2026):** "Olası Çıktılar" başlığının altında,
  sözleşme dolmadan da çıktıların NEREDE belireceğini gösteren şeffaf çerçeveli
  boş kutucuklar var. Alanı fiziksel olarak rezerve ediyorlar, böylece sözleşme
  tamamlanınca panel "zıplamıyor". **0/10'da da görünür** — kullanıcı ilk eşyayı
  koymadan da alanı görmeli. `pointerEvents="none"`: tıklanabilir görünüp hiçbir
  şey yapmamaları yanıltıcı olurdu.

- **⚠️ SONUÇLAR YALNIZCA SÖZLEŞME TAMAMLANINCA GÖRÜNÜR (29 Ağu 2026):**
  Olası çıktılar, ihtimaller ve kâr tahmini artık ancak **tüm yuvalar dolunca**
  (standart tarif 10, Covert tarifi 5) ekrana gelir. O ana kadar panelde sadece
  bir ilerleme göstergesi (`3 / 10`) durur.

  > **Neden:** Eskiden 2. eşya konur konmaz tüm tablo açılıyordu, ama o rakamlar
  > **yarım** bir sözleşmeye aitti. Ölçülen örnek: 1 adet AK-47 Redline ile panel
  > **"+$96.18 (%228) kâr"** diyordu; aynı sözleşme 10 eşyayla tamamlandığında
  > gerçek sonuç **−$282.72 (−%67)**. Kullanıcı imzalayınca göreceğinden tamamen
  > farklı bir tablo görüyordu.
  >
  > `analysis` **arka planda hesaplanmaya devam eder** — yuva kilitleme
  > (`isDeadEnd`) ve İmzala butonunun etkinliği ona bağlı; yalnızca GÖSTERİM
  > geciktirilir.

- **⚠️ Trade-Up ÜCRETSİZDİR — yapısal garanti:**
  Bu ekran bakiyeden **para düşmez**, envanterden **eşya silmez** ve bakiye
  yetersizliği diye bir ret durumu **yoktur**. Ücretsizlik bir `if` koşuluyla
  değil, **yapısal** olarak garantidir: `TradeUpScreen`'e `setBalance` prop'u
  hiç geçirilmez, dolayısıyla bileşenin bakiyeye erişimi **yoktur**.
  Kullanılmayan `gameMode` prop'u da kaldırıldı — "burada da mod farkı var"
  izlenimi veriyordu.

  > **Kullanıcı geri bildirimi (28 Ağu 2026):** "Trade-Up bakiyemden düşüyor."
  > İnceleme sonucu **düşmüyordu**; sorun etiketlemeydi. `Toplam Maliyet`
  > satırı **kırmızı (tehlike) renginde** gösteriliyordu ve bir tahsilat gibi
  > okunuyordu. Etiket **"Girdi Değeri"** olarak değiştirildi, rengi nötrlendi
  > ve başlığa görünür bir **"Ücretsiz simülatör — bakiyenizden düşülmez"**
  > rozeti eklendi. Sayı aynı; artık gider gibi görünmüyor.

- **Trade-Up arayüzü (yeniden düzenlendi):**
  - Sağ üstteki belirsiz **"🧪 Ücretsiz Analiz Modu"** etiketi **kaldırıldı** —
    kullanıcıya hiçbir şey anlatmıyordu. Yerini, sağ panelin asıl işlevini
    adlandıran **"Olası İhtimaller & Karlılık Oranı"** başlığı aldı.
  - **Sıfırlama butonu** genel başlık çubuğundan alınıp doğrudan **eşyaların
    eklendiği kutucuğun sağ üst köşesine** taşındı (`Sözleşme Girdileri (n/10)`
    başlığının yanına). Böylece butonun neyi sıfırladığı görsel olarak açık.
  - **Keskin hatlar:** paneller `borderRadius: 8` + görünür 1px kenarlık ile
    modüler kutucuklara dönüştü (önceki yumuşak/gölgeli 14–22px yuvarlaklık
    yerine). Girdi kartları, çıktı pill'leri, geçmiş kartları ve seçici kartları
    aynı dile uyduruldu.

- **Trade-Up sağ paneli:** Geniş ekranda (≥900px) sticky sidebar, dar ekranda alta iner.

---

## 7. Platforma Özgü Tuzaklar (Öğrenilmiş Dersler)

| Sorun | Çözüm |
|---|---|
| `Alert.alert()` react-native-web'de **hiçbir şey göstermez** | `components/Toast.js` + `components/ConfirmModal.js` kullan |
| `useNativeDriver: true` web'de desteklenmez, animasyonu bozabilir | `Platform.OS !== 'web'` ile koşullu kullan |
| Toast'ta `Animated` bazı ortamlarda donuyor | Toast bilerek **animasyonsuz** — kritik mesaj kaçmasın |
| Kaydırma çubuğu grid genişliğini bozuyor | Sabit `SCROLLBAR_GUTTER = 20px` payı ayır |
| `${n>=0?'+':''}$${n}` → `$-2.42` (yanlış) | `formatSignedMoney()` kullan → `-$2.42` |
| `setTimeout`/`Animated` unmount sonrası state güncelliyor | `useRef` ile takip et, cleanup'ta temizle |
| **`requestAnimationFrame` donunca `Animated` HİÇ ilerlemez** (ölçüldü: 0 kare/sn) | Sonucu Animated callback'ine bağlama — **bekçi zamanlayıcı** + `settledRef` kullan |
| Arka plan sekmesinde `setTimeout` **≥1 sn'ye kısılır** | Zincirleme `setTimeout` ile sürülen animasyonlar (tarama) test ortamında çok yavaşlar — **uygulama bug'ı değildir** |
| `setState(prev => …)` güncelleyicisinin İÇİNDE yan etki | Güncelleyici **saf** olmalı; StrictMode onu iki kez çalıştırır → çift toast/çift faz geçişi. Yeni değeri dışarıda hesapla |
| Döngü değişkeni `t` çeviri fonksiyonunu gölgeliyor | Döngüde `item` kullan — aksi halde metinler sessizce çevrilmez |
| Nadirlikle bıçak ayırt etmeye çalışma | Bıçaklar da `rarity.name === 'Covert'`! `category.name === 'Knives'` kullan |
| Aynı 8 MB `crates.json`'ı her kategori için ayrı çekmek | `api.js` modül seviyesinde **önbellekler** — 4 çağrı = 1 indirme |
| Mock fiyatta kademe içi sıralama anlamsız kalıyor | İsimden türeyen **deterministik** çarpan (asla `Math.random()`) |
| Souvenir eşyasına normal skin fiyatı bulmak | Market adına **`Souvenir `** öneki ekle (StatTrak ile birlikte kullanılmaz) |
| İç içe `ScrollView` (kabuk + ekran) sayfayı "yapıştırıyor" | Kabuk **sabit**; kaydırma yalnızca içerik alanında |
| Arama `onBlur`'u tıklamayı yutuyor | `onBlur`'u ~180 ms **geciktir** |
| `FlatList numColumns` değişince grid bozuluyor | `key={numCols}` ile listeyi yeniden monte et |

---

## 8. Çalıştırma

```bash
npm install
npm run web      # tarayıcıda (birincil geliştirme hedefi)
npm run android  # Android
npm run ios      # iOS
```

---

## 9. Değişiklik Günlüğü

| Tarih | Değişiklik |
|---|---|
| **2026-08-31** | **KRİTİK — Trade-Up çıktı havuzu tek eşyaya düşüyordu:** sabitlenmemiş `/(Charm\|Sticker\|Patch\|Pin)/i` regex'i "Slee**pin**g Potion" gibi 10 gerçek silah skinini eliyordu. Tür artık kimlikten (`skin-`) anlaşılıyor. 10× UMP-45 → %100 AWP yerine doğru %50/%50 |
| **2026-08-31** | **Trade-Up oy şişmesi:** birden fazla koleksiyonda geçen eşya her koleksiyona ayrı tam oy veriyordu (10 girdi → 50 oy). Artık her girdi toplam 1 oy kullanır |
| **2026-08-31** | Aynı eşya iki koleksiyondan da geliyorsa ihtimaller **toplanıyor**, listede iki kez görünmüyor |
| **2026-08-30** | **CS2 TAKTİKSEL KOYU TEMA** — antrasit/gunmetal palet, taktiksel sarı vurgu, Chakra Petch + Rajdhani, keskin köşeler (68 yarıçap tokenlandı), butonlarda `clip-path` kesik köşe. **Tek satırlık geri alma:** `theme.js → THEME` |
| **2026-08-30** | **Aktif durum kutuyu boyamıyor:** mat gri zemin + ince parlak sarı vurgu çizgisi (`activeIndicator`) |
| **2026-08-30** | **Bug:** global font kuralı monospace sayıları da eziyordu (`[style*='monospace']` hiç eşleşmiyor — RN-Web sınıf basıyor). `:not([class*='r-fontFamily-'])` ile çözüldü |
| **2026-08-30** | **Bug:** Tooltip `maxWidth` ile 86×284 px'lik dikey şerit oluyordu (mutlak konumlu kutu çapanın genişliğine sıkışıyor). Açık `width` ile 280×82 |
| **2026-08-30** | Trade-Up: "ücretsiz simülatör" rozeti kaldırıldı, sonuç yer tutucusu eklendi |
| **2026-08-30** | **Varsayılan mod SINIRSIZ** — site artık cüzdan kısıtı olmadan açılıyor |
| **2026-08-30** | **Bilgi kutucukları (Tooltip)**: EV · ROI · Maks. Kazanç · Ort. Teklif · 5'te En İyi |
| **2026-08-30** | **Görsel önizleme modalı** — içerik listelerinde ve koleksiyon detayında eşyaya tıklayınca büyük görsel |
| **2026-08-30** | **Hızlı iletişim modülü** (sağ alt) + `contactConfig.js`; Rehber'deki iletişim adresi gerçek adresle değiştirildi |
| **2026-08-30** | Koleksiyonlar: kartlar küçültüldü (224→154 px, kaydırma daveti), arama detaydan **listeye** taşındı, kabuk araması bu sekmede gizlendi |
| **2026-08-30** | `Contents` penceresinde kapatma butonu **sol üste** alındı |
| **2026-08-30** | **Yeni "Koleksiyonlar" sekmesi** (`CollectionsScreen.js`): 110 koleksiyon, A-Z / yeni / eski sıralama, koleksiyon içi arama, **Aktif Drop Havuzu** vurgusu + rozeti. **Bug:** bölüm başlıkları `numColumns` ızgarasında bir hücreyi kaplayıp satırın ortasına düşüyordu → satırlar elle oluşturuluyor |
| **2026-08-30** | **Trade-Up sonuçları sözleşme tamamlanana kadar gizli** — yarım sözleşmeye ait yanıltıcı kâr tahmini (ölçüldü: 1/10'da %228, 10/10'da −%67) kaldırıldı |
| **2026-08-30** | **Armory harcaması artık dolar karşılığıyla** — "Spent -40★ (-$16.00)"; açma butonlarında da yıldızın $ karşılığı |
| **2026-08-30** | Toplu sonuç panelinde **"Send Selected" → "Send to Inventory"** (hedef belirsizdi) |
| **2026-08-29** | **KRİTİK — Armory %1000+ ROI bug'ı:** çekiliş kodları boş kademede "tüm havuza düş" yedeğine giriyordu; Armory koleksiyonlarında Consumer Grade olmadığı için çekilişlerin %79.92'si düzgün dağılımlı seçim yapıyordu. Gerçek EV $15.83–$22.83 (maliyet $1.60). Oran tabloları artık içerikten türetiliyor (`getPresentTiers` / `rollTier` / `poolForTier`); ROI %45–68'e indi |
| **2026-08-29** | **EV artık aşınma dağılımına göre:** sabit float 0.25 yerine ağırlıklı bantlar eşyanın kendi min/max aralığına ölçekleniyor — kart EV'si ile 400.000 çekilişlik simülasyon örtüşüyor |
| **2026-08-29** | **Bug:** kasa içeriğindeki sticker'larda `market_hash_name` YOK; 1188 sticker'ın tamamı mock fiyata düşüyordu. `Sticker \| <ad>` anahtarı eklendi → eşleşme 0/1188 → 856/1188 |
| **2026-08-29** | **Bug:** piyasa fiyatı bulunamayan kutular sabit $1.00 sayılıyor, EMS Katowice 2014 Legends %104.745 ROI gösteriyordu. `resolveContainerCost` fiyatı içerikten tahmin ediyor; kart ve açılış ekranı aynı sayıyı kullanıyor |
| **2026-08-29** | **Terminal ROI kaldırıldı** (%1033 / %232) — teklif piyasa fiyatına alındığı için ROI tanımsız. Yerine `avgOffer` ve `bestOffer` (5 teklifin en iyisi, deterministik `E[max]`) |
| **2026-08-29** | **Terminalde zorunlu alım kaldırıldı** — son adımda "ALMADAN KAPAT"; nadir 6. teklif (%5) artık bildirimle duyuruluyor |
| **2026-08-29** | **Ortak çoklu açılış sonuç paneli** (`BatchResultPanel`): Tekrar Aç · hover ile tekli satış · çoklu seçim · Hepsini/Seçilenleri Gönder · Kalanları Sat |
| **2026-08-29** | **Kapsül animasyonu bug'ı:** yırtık çizgisi `phase === 'tearing' \|\| burst` koşuluyla çiziliyordu; kapsül yarıları savrulduktan sonra 11 beyaz kare ekranın ortasında kalıyordu. Artık yalnızca yırtılma aşamasında görünüyor |
| **2026-08-29** | **Mobil klavye düzeltmesi:** `interactive-widget=resizes-content` + odaklanınca kartı ortalayan `scrollIntoView` (ölçüldü: y 811 → 463) |
| **2026-08-29** | **Sekme başlığı `SkinSimulator.com`** ve **Google Analytics** (`G-C4JPXC4L64`) — `public/index.html` şablonu eklendi. **Bug:** yorum içindeki kapanış etiketi Expo'nun script enjeksiyonunu yorumun içine gömüyordu |
| **2026-08-29** | **Emoji → SVG simge seti** (`react-native-svg`): arama, envanter, sıralama, cüzdan, yıldız, kasa, anahtar, globe; sözlükteki tüm emoji önekleri temizlendi |
| **2026-08-29** | **Bug:** `i18n.js` İngilizce bloğunun içine 5 Türkçe satır sızmıştı (aynı anahtar iki kez → sonuncusu kazanıyor), İngilizce arayüzde Türkçe metin görünüyordu. Trade-Up'taki 4 sabit Türkçe toast da sözlüğe taşındı |
| **2026-08-29** | **İçerik önizlemesi oranları da içerikten türetiliyor** — Armory tablosu "Consumer Grade %79.92" gibi hiç çıkmayacak bir kademeyi gösteriyordu |

| Tarih | Değişiklik |
|---|---|
| 2026-08-26 | Charm havuzu, ROI simülasyonu, kasa sıralama, trade-up geçmişi eklendi |
| 2026-08-26 | Rulet desync (ITEM_PITCH), 5x senkronizasyon, unboxing FX düzeltildi |
| 2026-08-26 | `Alert.alert` kök nedeni bulundu → Toast/ConfirmModal sistemi kuruldu |
| 2026-08-26 | Sıralı belirme + "Hemen Göster", ContentsModal, çoklu charm açma eklendi |
| **2026-08-26** | **Float ağırlıklı dağılıma geçirildi (BS %55 → %16)** |
| **2026-08-26** | **AK-47 Vulcan kaldırıldı → Limited Edition Item (Desert Eagle \| Heat Treated, 25⭐)** |
| **2026-08-26** | **Covert → Bıçak özel trade-up tarifi eklendi** |
| **2026-08-26** | **gacas.md / agents.md / cloud.md dokümantasyonu oluşturuldu** |
| **2026-08-26** | **Ölü kod temizliği:** `TradeUp.js` + `TradeUpAnalyzer.js` silindi, `utils.js: getExpectedPrice` kaldırıldı |
| **2026-08-26** | **Ağ katmanı merkezileştirildi:** inline `fetch`'ler `api.js` helper'larına taşındı (`fetchCollections`, `fetchSkins`) |
| **2026-08-26** | **Satır içi içerik önizlemesi:** `InlineContentsPanel` — kasa/Armory açma ekranlarında "Aç" butonu altında oran+fiyat listesi |
| **2026-08-26** | **Sticker kapsülleri eklendi** (100 adet, charm ile ortak kapsül mekaniği, 2⭐) |
| **2026-08-26** | **Covert tarifi 10 → 5 eşyaya düşürüldü; kalan 5 yuva 🔒 kilitleniyor; ödül havuzuna eldivenler eklendi (670 öğe)** |
| **2026-08-28** | **🎨 AÇIK TEMA'ya geçildi** — `src/theme.js` tasarım sistemi (buzul grisi zemin, açık mavi vurgu, yumuşak gölge, çerçevesiz kart); tüm ekranlar ve modallar yeniden renklendirildi |
| **2026-08-28** | **Yeni ana sayfa hiyerarşisi** — üst-orta logo *Skin Simulator*, canlı arama, rezerve reklam alanı, yatay menü (`Trade Up · Cases · Terminals · Armory · Souvenirs · Stickers`) |
| **2026-08-28** | **Canlı arama (live search)** — kutu adı **ve içeriği** üzerinde arama; `içinde: …` etiketi; sonuca tıklayınca doğru sekme + kutu açılır |
| **2026-08-28** | **🖥️ Terminals sekmesi eklendi** — `TerminalOpening.js`: CRT ekran, glitch metin akışı, kübik yavaşlama, beyaz flaş + "DISPENSED". Terminal tespiti **dinamik** (Nemesis eklenince kendiliğinden çıkar) |
| **2026-08-28** | **🏆 Souvenirs sekmesi eklendi** (150 paket) — kademe oranları paketin içeriğinden **dinamik** üretilir; StatTrak yok; market adına `Souvenir ` öneki |
| **2026-08-28** | **🏷️ Stickers kendi sekmesine taşındı** — `CapsuleOpening.js`: titreme → yırtılma (zikzak) → iki yarının savrulması. Armory artık yalnızca gerçek Armory kataloğu |
| **2026-08-28** | **Çarka sekme (bounce) efekti** — hedefin ötesine geçip yaylanarak oturuyor; "taş gibi donma" giderildi |
| **2026-08-28** | **Nadirlik ışığı (rarity glow)** — kartın alt %10-15'inden yukarı sönümlenen CS2 drop efekti; çark şeridi dahil her sonuç yüzeyinde |
| **2026-08-28** | **⚠️ Animasyon bekçisi** — rAF donduğunda (0 kare/sn) eşya artık **mutlaka** açıklanıyor; `settledRef` ile çifte ödül engellendi |
| **2026-08-28** | **Hover'da 3B yükselen kart** (`HoverCard.js`, CSS transition — Animated değil) |
| **2026-08-28** | **Performans:** `crates.json` (~8.3 MB) modül seviyesinde önbelleğe alındı — 4 kategori tek indirmeyle |
| **2026-08-28** | **Kutu fiyatları dinamikleşti** (`getContainerPrice`) + mock fiyatlamaya isim tabanlı deterministik çarpan (kademe içi sıralama ve kart fiyat aralığı artık anlamlı) |
| **2026-08-28** | **Responsive grid** (1→4 kolon) ve kompakt kabuk (kutu açıkken logo/reklam alanı gizlenir) |
| **2026-08-28** | **🖥️ TERMİNAL YENİDEN YAPILANDIRILDI** — kasa mantığı kaldırıldı; **5 teklif kartı** (+%5 ihtimalle 6.), float/pattern/kredi fiyatı, gezinme + **Geç/Satın Al**. Kredi yalnızca satın almada düşer |
| **2026-08-28** | **🌐 Çoklu dil desteği (i18n)** — varsayılan **EN**, globe ikonuyla anlık EN/TR geçişi; tüm metinler tek sözlükte |
| **2026-08-28** | **⚖️ Sorumluluk reddi (Disclaimer)** footer'ı eklendi (EN/TR, açılış ekranlarında tek satıra iner) |
| **2026-08-28** | **Trade-Up arayüzü:** "Ücretsiz Analiz Modu" kaldırıldı → **"Olası İhtimaller & Karlılık Oranı"**; sıfırlama butonu **girdi kutucuğunun sağ üst köşesine** taşındı; keskin hatlı modüler kutular |
| **2026-08-28** | **Bug:** `skipOffer` içindeki yan etkiler `setState` güncelleyicisinden çıkarıldı (StrictMode'da çift tetikleniyordu) |
| **2026-08-28** | **Daralan üst menü** — kaydırınca kabuk tek satıra iner; sticky eleman küçük `skinsimulator` yazısı. Histerezis (72/24 px) ile titreme önlendi. **+317 px liste alanı** |
| **2026-08-28** | **Disclaimer:** kompaktlaştırıldı, **✕ kapatma** eklendi, `localStorage` ile kalıcı hâle getirildi (Altın Kural 6'ya onaylı istisna) |
| **2026-08-28** | **Terminal ADIM ADIM akışa geçirildi:** 1/5 → 5/5 tek tek, geri dönüş yok, **son seçenekte Pas Geç devre dışı**, tam float + pattern + $ değer gösterimi |
| **2026-08-28** | **Üst menü kaydırmaya bağlı (scroll-linked) animasyona geçirildi** — oransal opacity/scale/height; histerezis kaldırıldı. **Bug:** `onLayout` hiç ateşlenmiyordu, yükseklik ölçümü DOM `offsetHeight`'a taşındı |
| **2026-08-28** | **Terminal para birimi kredi → DOLAR**; teklifler arası geçiş **anında** (animasyon kaldırıldı, 9–13 ms); büyük monospace **adım sayacı** eklendi |
| **2026-08-28** | **📖 Rehber/Blog ekranı** — `BlogScreen.js` + `content/guide.js`; gerçek semantik HTML (`main/article/h1-h3/p/ul/nav/footer`), 6 bölüm, **EN + TR** tam çeviri |
| **2026-08-28** | **Alt bilgi bağlantıları** (Gizlilik Politikası / İletişim / Hakkında) — AdSense incelemesi için |
| **2026-08-28** | **Metin logo → saydam PNG görsel logo**; arka plan renklilik (chroma) maskesiyle kaldırıldı, harf içi boşluklar saydam korundu |
| **2026-08-28** | **Başlık animasyonu yeniden yazıldı:** DOM sürücülü (React render yok), smoothstep easing, opaklık/mini marka kademeli. **Bug:** p=0'da uygulanan `height`+`overflow` logoyu ve arama listesini kırpıyordu → en üstte artık hiç stil yazılmıyor |
| **2026-08-28** | **Bug:** rAF ile scroll toplama geri alındı — donmuş sekmede başlık yarıda kilitleniyordu; boyama senkron yapıldı |
| **2026-08-28** | **Terminal görsel bütünlüğü:** cihaz tüm aşamalarda ekranda kalıyor; eşya paneli beyaz karttan CRT diline (koyu zemin, mint monospace, nadirlik kenarı) taşındı |
| **2026-08-28** | **Üst çubuk yeniden düzenlendi:** mod solda (mobilde her zaman üstte), para/kredi sağda; masaüstü 82→51 px, mobil başlık 420→309 px |
| **2026-08-28** | **Kutu kartı:** sağ üstte artık fiyat ARALIĞI değil kutunun KENDİ fiyatı (yeşil $); EV/ROI kartın altındaki şeride taşındı |
| **2026-08-28** | **"Animasyonu geç" tiki** — 1x ve 5x açılışlar anında sonuçlanır (yalnızca görsel; olasılıkları etkilemez) |
| **2026-08-28** | **CS arayüz dili:** keskin köşeler, büyük harf menü, tabular sayılar, emoji yerine yeşil ★/$ simgeleri (`components/Icons.js`) |
| **2026-08-28** | **Trade-Up:** 10 slot 5×2 ızgaraya oturdu; olası çıktılar artık **görsel + ihtimal + tahmini fiyat** ve en değerliden sıralı. **Bug:** sidebar genişliği iki yerde ayrı yazıldığı (320 vs 330) ve panel padding'i hesaba katılmadığı için 5. kart alt satıra düşüyordu |
| **2026-08-28** | **Fiyatlar canlıya bağlandı:** ölü kaynak (301→HTML) yerine ByMykel price-tracker; CORS açık, cent→dolar dönüşümü |
| **2026-08-28** | **Bug (kritik):** `min_float` yokluğu yüzünden eşya isimleri aşınma eki almıyor, tüm eşya fiyatları sessizce mock'a düşüyordu. `lookupLivePrice` ile giderildi — eşleşme 0/17 → 17/17, ROI %138 → %42.9 (gerçekçi) |
| **2026-08-28** | **Trade-Up:** ücretsizlik yapısal hâle getirildi (`gameMode` prop'u kaldırıldı), `Toplam Maliyet` → **`Girdi Değeri`** (nötr renk) + "ücretsiz simülatör" rozeti |
| **2026-08-27** | **Çark hizalama düzeltildi:** konteyner genişliği `onLayout` ile ölçülüyor + jitter kaldırıldı → sapma **27.5px → 0px** |
| **2026-08-27** | **Kuyruk (trailing) düzeltmesi:** hem tekli hem 5x çarkta kazananın sağında dolgu item'ları akıyor |
| **2026-08-27** | **İçerik önizlemesi en değerliden en değersize sıralandı** (Sarı → Kırmızı → Pembe → Mor → Koyu Mavi → Açık Mavi) |
| **2026-08-27** | **BUG: `contains_rare` keşfedildi** — bıçaklar kasadan hiç çıkmıyordu, EV'ye de katılmıyordu; çekiliş/EV/simülasyon/önizleme düzeltildi |
| **2026-08-27** | **Envanter geliştirildi:** 5 sıralama modu, çoklu seçim + toplu satış, eşya inceleme modalı (pattern seed dahil) |
| **2026-08-27** | **Trade-Up bakiyeden ayrıldı** — ücretsiz analiz aracı oldu |
| **2026-08-27** | **ROI Simülasyonu kaldırıldı** (UI + `prices.js` motoru) |
| **2026-08-27** | **İçerik önizlemesi:** "Tüm Eşyalar" galerisi kaldırıldı; bıçaklar en üstte 10 gösterilip "Daha Fazla Bıçak Göster" ile açılıyor |
| **2026-08-27** | **Çark temposu yavaşlatıldı** (7200ms tekli / 4200ms mini) + yavaşlama eğrisi eklendi |
| **2026-08-27** | **Çark göstergesi kutudan OK'a çevrildi** (CS tarzı, üst-orta) + tempo 8600/5200ms'ye çıkarıldı |
| **2026-08-27** | **Envanterde hover ile hızlı satış** + onay modalı eklendi |
| **2026-08-27** | **Sınırsız Mod satış yönlendirmesi** — 3 seçenekli modal ve ayrı `sandboxEarnings` sanal bakiyesi |
