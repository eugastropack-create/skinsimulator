# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

# AGENTS — Yapay Zekâ Ajanları İçin Çalışma Kuralları

Bu dosya, bu kod tabanında çalışan **her ajan/geliştirici** için bağlayıcı kuralları,
modüllerin sorumluluk sınırlarını ve doğrulama iş akışını tanımlar.

> 📖 Mimari ve şans mekaniklerinin **tam** dökümü için: **[`gacas.md`](./gacas.md)**
> ☁️ Çalıştırma/dağıtım ve dış servisler için: **[`cloud.md`](./cloud.md)**

---

## 0. DEĞİŞMEZ KURAL — Sürekli Dokümantasyon

> **Her yeni özellik veya güncellemede `gacas.md`, `agents.md` (bu dosya) ve
> `cloud.md` AYNI ÇIKTIDA güncellenmelidir.** Kod değişikliği dokümantasyon
> güncellemesi olmadan tamamlanmış sayılmaz.

Güncellenmesi gereken tipik bölümler:
- Yeni bir şans mekaniği/oran → `gacas.md` §5 + Değişiklik Günlüğü
- Yeni bir dosya/modül → `gacas.md` §3 + bu dosyanın §2'si
- Yeni bir dış servis/URL → `cloud.md` §2
- Yeni bir platform tuzağı → `gacas.md` §7 + bu dosyanın §4'ü

---

## 1. Altın Kurallar

1. **Gerçek CS2 oranlarına sadık kal.** Bir oran/mekanik uyduruyorsan veya
   bilerek saptırıyorsan, kodda **büyük harfli bir yorumla** ve `gacas.md`'de belirt.
   (Bilinçli sapmalar: **5x Covert → Bıçak/Eldiven** trade-up tarifi ve
   **sticker kapsüllerinin Armory'ye eklenmesi**.)
2. **Mevcut çalışan özellikleri bozma.** Bu proje üst üste eklenen turlarla büyüdü;
   her turda önceki tüm özelliklerin çalışmaya devam ettiği doğrulanmalıdır.
3. **Kök nedeni bul, semptomu yamalamayın.** Örnek: "hep Battle-Scarred çıkıyor"
   şikâyetinin nedeni rastgelelik değil, **düzgün dağılımın kademe genişlikleriyle
   uyumsuzluğuydu** (BS float skalasının %55'i).
4. **Tarihsel bug yorumlarını SİLME.** `// BUG DÜZELTMESİ:` / `// KÖK NEDEN:`
   yorumları aynı hatanın tekrar yapılmasını engelliyor.
5. **Yorumlar Türkçe, kod İngilizce.** Mevcut kod tabanının dili budur.
6. **Kalıcılık yok.** State yalnızca oturum içidir. `localStorage`/`AsyncStorage`
   eklemeden önce sor.
   > **TEK ONAYLI İSTİSNA (28 Ağu 2026):** Disclaimer'ın kapatılmış olması
   > `localStorage`'da `skinsim.disclaimerDismissed` anahtarıyla saklanır
   > (kullanıcı açıkça istedi). Başka hiçbir şey kalıcı DEĞİLDİR — bakiye,
   > envanter, kredi ve geçmiş hâlâ yalnızca oturum içidir.
7. **Sabit metin yazma.** Kullanıcıya görünen her metin `src/i18n.js`
   sözlüğünden `t('anahtar')` ile gelir ve **EN + TR** olarak eklenir.
   Varsayılan dil **İngilizce**'dir.
8. **Ham renk kodu yazma.** Tüm renkler `src/theme.js`'teki `C` tokenlarından
   gelir. **TEK İSTİSNA:** nadirlik renkleri (`RARITY` — Valve'in resmi
   mavi/mor/pembe/kırmızı/altın paleti) sabittir ve tema değişse bile değişmez.
9. **Sonucu `Animated` callback'ine bağlama.** `requestAnimationFrame`
   composite edilmeyen sekmelerde tamamen donabiliyor (ölçüldü: 0 kare/sn).
   Ödül/sonuç açıklaması mutlaka bir `setTimeout` bekçisiyle de garantilenmeli
   (bkz. `CaseOpening.settleOnce`).

---

## 2. Modül Sorumluluk Sınırları

| Dosya | Sorumluluk | Dokunurken dikkat |
|---|---|---|
| `App.js` | Global state, kabuk (logo/arama/menü), veri yükleme, modal montajı | Tüm state buradan prop'lanır. Dış `ScrollView` **ekleme**. Başlık animasyonu **DOM sürücülüdür** (`paintHeader`): `transition` ekleme, rAF'a taşıma, ve **p=0'da stil yazma** (kırpma yapar) |
| `src/theme.js` | **TEK renk/gölge/geçiş kaynağı** (açık tema) | Bileşenlere ham hex yazma. `RARITY` sabitleri Valve paleti — değiştirme |
| `assets/logo-skinsimulator.png` | Saydam zeminli logo (ana + mini çubuk) | En/boy oranı **9.82** — yüksekliği genişlikten türet, ikisini birden sabitleme |
| `src/i18n.js` | **TEK metin kaynağı** (EN varsayılan / TR) | Arayüze sabit metin gömme — `t('anahtar')` kullan. Yeni metni **her iki dile** ekle |
| `src/BlogScreen.js` | Rehber/Blog — **semantik HTML** (AdSense) | `role` prop'ları DOM etiketine çevrilir; `role="section"` diye bir eşleme YOK. Rolleri değiştirme |
| `src/content/guide.js` | Rehber metinleri (EN + TR, uzun biçim) | Oranlar `gacas.md` §5 ile **aynı** olmalı. Kısa arayüz etiketlerini buraya koyma (onlar `i18n.js`'te) |
| `src/components/LanguageSwitcher.js` | Globe ikonlu EN/TR değiştirici | Menü `Modal` ile açılır (RN-Web'de mutlak konumlu menü kırpılıyor) |
| `src/components/Disclaimer.js` | Yasal sorumluluk reddi (footer) — **kapatılabilir** | **Üç maddeyi de kaldırma** — yasal bilgilendirme. `compact` tek satıra iner. Kapatma `localStorage`'a yazılır; `Platform` + `try/catch` korumalarını **silme** |
| `src/api.js` | **Tüm** ByMykel CSGO-API çağrıları + `crates.json` önbelleği | Bileşen içine doğrudan `fetch` yazma. Önbelleği kaldırma — 8 MB'lık dosya 4 kez inerdi |
| `src/TerminalOpening.js` | Armory terminali — **adım adım teklif seçimi** (1/5 → 5/5, %5 ile 6.) | **Çark KULLANMAZ, kasa DEĞİLDİR.** **DOLAR** kullanır (kredi değil). Teklif geçişine **animasyon EKLEME** — anında olmalı. Son seçenekte Pas Geç devre dışı |
| `src/CapsuleOpening.js` | Sticker kapsülü (titreme/yırtılma/patlama) | **Çark KULLANMAZ**. Yarılar tek görselden `overflow:hidden` ile üretilir |
| `src/components/HoverCard.js` | Hover'da 3B yükselen kart | CSS transition kullanır, `Animated` **değil** — geri çevirme |
| `src/utils.js` | Float üretimi, aşınma eşlemesi, mock fiyat, para formatı | `generateFloat` **ağırlıklı** dağılım kullanır, uniform'a döndürme |
| `src/prices.js` | Canlı/mock fiyat çözümleme, EV/ROI, kararlı sıralama değeri | Altın kademe `contains_rare`'den gelir; sıralamada `getStableSortValue()` kullan |
| `src/CaseOpening.js` | Kasa **ve Souvenir** açılışı (`mode` prop'u) | Gösterge KUTU değil OK (`WinnerPointer`) — kutuya geri dönme; `ITEM_PITCH`/`getRouletteWidth()` matematiğini bozma; jitter EKLEME; altın kademe `contains_rare`'den çekilir; **sekme (bounce)** ve **bekçi** mantığını kaldırma |
| `src/ArmoryOpening.js` | Koleksiyon/charm çekilişi, Limited Edition basımı | `isSpecialItem` dalı kademeli çekiliş **kullanmaz**. **Sticker kapsülleri artık burada DEĞİL** (kendi sekmesinde) — ama `isSticker` dalı korunuyor, silme |
| `src/TradeUpScreen.js` | 10 slot, canlı analiz, geçmiş, özel tarifler | **`setBalance`/`gameMode` PROP'U GEÇİRME** — ücretsizlik yapısal garantidir. Standart 10'lu akışı bozma; Covert tarifi 5 slot + kilit kullanır. Sıfırlama butonu girdi kutucuğunun başlığındadır |
| `src/components/Toast.js` | Bildirim (Alert.alert yerine) | Bilerek **animasyonsuz** — geri ekleme |
| `src/components/ConfirmModal.js` | Onay diyaloğu | `Modal` web'de güvenilir çalışır, `Alert` çalışmaz |
| `src/components/ContentsModal.js` | İçerik/oran önizlemesi (`ContentsList` + `InlineContentsPanel` + modal) | Oran tabloları `gacas.md` §5 ile eşleşmeli; üç görünüm TEK kaynaktan beslenir. `kind='souvenir'` kademeleri **dinamik** (`getSouvenirTiers`) |
| `src/components/ItemInspectModal.js` | Envanter eşya inceleme | float/pattern yoksa (charm/sticker) o satırları gizle |
| `src/components/SellConfirmModal.js` | Satış onayı + Sınırsız Mod yönlendirmesi | Satışı doğrudan yapma — `requestSell` → modal → `finalizeSell` yolunu kullan |
| `src/armoryData.js` | Aktif Armory koleksiyon isimleri | Valve rotasyon yapınca **sadece burası** güncellenir |

### ✅ Ölü Kod Temizlendi
`src/TradeUp.js` ve `src/TradeUpAnalyzer.js` **silindi** (hiçbir yerden import
edilmiyorlardı ve aktif mantığı eskimiş biçimde tekrarlıyorlardı). Aktif Trade-Up
mantığı **yalnızca** `src/TradeUpScreen.js` içindedir. Gerekirse git geçmişinden
geri alınabilirler.

### 🧭 Menü Sırası — DEĞİŞTİRME
Ana navigasyon sırası kullanıcı brief'inde sabitlenmiştir:

`Trade Up · Cases · Terminals · Armory · Souvenirs · Stickers`

Envanter **bilerek** bu menüde değil — sıra birebir korunsun diye üst yardımcı
çubukta ayrı bir buton olarak duruyor. Yeni bir sekme eklenecekse **sona** ekle.

### 🌐 Ağ Katmanı Kuralı
Bileşenlerin içine **doğrudan `fetch(...)` yazma**. Yeni bir uç nokta gerekiyorsa
`src/api.js`'e helper ekle ve oradan import et — uç noktalar, hata yönetimi ve
yedekleme davranışı tek merkezde kalmalı.

---

## 3. Doğrulama İş Akışı (Zorunlu)

Her değişiklikten sonra:

```bash
npm run web
```

1. **Derleme:** Metro çıktısında `Bundled ... index.js` satırı hatasız görünmeli.
2. **Konsol:** Yalnızca **beklenen** hatalar olmalı:
   - ✅ `prices.csgotrader.app ... CORS` → **normal**, simüle fiyata düşer
   - ✅ `"shadow*" style props are deprecated` → zararsız
   - ❌ Bunlar dışındaki her hata incelenmelidir.
3. **Regresyon turu:** Kasa aç (1x/5x/10x) · **Terminal çalıştır → 1/5'ten 5/5'e pas geç → son seçenekte Pas Geç'in kapalı olduğunu doğrula → Eşyayı Al** ·
   **listede aşağı kaydırıp menünün daraldığını, en üstte geri açıldığını gör** ·
   **disclaimer'ı kapatıp sayfayı yenile (geri gelmemeli)** ·
   **Rehber sekmesini aç, altı bölümü gez, dili TR'ye çevirip metinlerin
   değiştiğini doğrula** ·
   **Souvenir paketi aç** · **Sticker kapsülü aç** · Armory aç · Charm aç ·
   Limited Edition bas · Trade-Up imzala · Envanteri sıfırla ·
   **arama kutusuna `Glove` yaz** (içerik eşleşmesi çıkmalı).

### Test Ortamı Notu (önemli)
Otomatik tarayıcı test ortamında **pane composite edilmediği için**
`requestAnimationFrame` kısılabilir; `Animated` tabanlı geçişler ilerlemeyebilir.
Bu bir **uygulama bug'ı değildir**.

> **Ölçüm (28 Ağu 2026):** `document.hidden === true` iken `requestAnimationFrame`
> **saniyede 0 kez** ateşlendi — yani `Animated` hiç ilerlemiyor. Bu yüzden
> ödül/sonuç açıklaması artık Animated callback'ine **değil**, bir bekçi
> zamanlayıcıya da bağlı (bkz. Altın Kural 8). Terminal ve Kapsül ekranları bu
> ortamda **tam olarak** test edilebiliyor; kasa çarkı ise yalnızca bekçi
> üzerinden sonuçlanıyor (animasyonun kendisi görünmüyor).

Bu durumda:
- Animasyona bağlı olmayan yolları test et (10x/25x anlık sonuç gibi),
- Matematiği DOM ölçümüyle doğrula (ör. rulet pitch'i),
- Kısa ömürlü UI'ı (3.2sn'lik Toast) **tek bir JS çağrısı içinde** tıklayıp kontrol et —
  ayrı çağrılara bölmek zaman aşımına uğrar ve yanlış "çalışmıyor" sonucu verir.

---

## 4. Bilinen Platform Tuzakları

| Tuzak | Doğru yaklaşım |
|---|---|
| `Alert.alert()` web'de **sessizce hiçbir şey yapmaz** | `useToast()` / `ConfirmModal` |
| `useNativeDriver: true` web'de animasyonu bozabilir | `Platform.OS !== 'web'` koşulu |
| Uniform `Math.random()` ile float | **Ağırlıklı** `generateBaseFloat()` |
| Kaydırma çubuğu grid'i taşırıyor | Sabit `SCROLLBAR_GUTTER` payı |
| Negatif para `$-2.42` görünüyor | `formatSignedMoney()` |
| Unmount sonrası `setState` | `useRef` + cleanup |
| `slots` closure'ından okuma (state yarışı) | Fonksiyonel `setState(prev => ...)` |
| Nadirlikle bıçak ayırt etmeye çalışma | Bıçaklar da `rarity.name === 'Covert'`! **`category.name === 'Knives'`** kullan |
| Kasa bıçaklarını `contains` içinde arama | Bıçak/eldiven **`contains_rare`** alanındadır; rengi `#ffd700` değil `#eb4b4b`'dir |
| Çark kaydırmasında pencere genişliği kullanma | **Konteyner** genişliği (`onLayout`) — aradaki fark ~56px'e çıkabilir |
| Kazananı şeridin sonuna koyma | Sağında dolgu kalmaz, çark boşluğa kesilir — kuyruk ekle |
| Sıralamada `generateMockPrice` kullanma | Rastgele varyans içerir, liste zıplar — **`getStableSortValue()`** kullan |
| Sınırsız Mod'da sessizce satış yapma | Kullanıcı değer kaybeder — `SellConfirmModal` ile mod seçtir |
| RN-Web'de hover | `onMouseEnter/Leave` çalışır ama native'de YOK — `Platform.OS !== 'web'` ile her zaman göster |
| Arka plan sekmesinde `setTimeout` ≥1 sn'ye kısılıyor | Zincirleme zamanlayıcılı animasyonlar test ortamında yavaşlar — **bug değil** |
| `setState` güncelleyicisi içinde yan etki | Güncelleyici SAF olmalı (StrictMode iki kez çalıştırır) — yeni değeri dışarıda hesapla |
| Döngüde `t` değişkeni çeviri fonksiyonunu gölgeliyor | Döngü değişkenine `item` de |
| Kaydırmada menüyü tek eşikle daraltmak | Menü kapanınca içerik yukarı kayıp offset eşiğin altına düşer → **sonsuz aç/kapa**. İki eşik (histerezis) kullan |
| `localStorage` native'de YOK, gizli sekmede HATA fırlatır | `Platform.OS !== 'web'` kontrolü + `try/catch`; hata = "kapatılmamış say" |
| `onLayout` (RN-Web) bazı düğümlerde HİÇ ateşlenmiyor | Ölçümü DOM `ref.offsetHeight` ile yap; `onLayout`'u native yedeği olarak bırak |
| Scroll'a bağlı animasyona `transition` eklemek | Animasyon kaydırmanın gerisinde kalır, "lastikli" olur — geçiş süresi KULLANMA |
| Scroll animasyonunu rAF'a kuyruklamak | rAF donmuş sekmede 0 kare/sn → başlık yarıda kilitlenir. Senkron boya |
| Başlığa p=0'da `height`/`overflow` uygulamak | 1-2px kırpma + arama sonuç listesi kesilir — en üstte HİÇ stil yazma |
| Giriş animasyonu ile sonuç kartını farklı görsel dilde bırakmak | "İki ayrı uygulama" hissi verir — terminalde cihaz tüm aşamalarda ekranda kalır |
| Her scroll olayında state güncellemek | ~60 render/sn üretir; ilerlemeyi 2 ondalığa yuvarla (0.01 adım gözle ayırt edilemez) |
| Hover için `Animated` kullanmak titriyor/pahalı | `theme.webTransition()` → gerçek CSS transition |
| `Animated` donunca sonuç hiç gelmiyor | `settleOnce` + bekçi `setTimeout` (çifte ödül `settledRef` ile engellenir) |
| İç içe `ScrollView` (kabuk + ekran) | Kabuk **sabit**; kaydırma yalnızca içerikte |
| Arama `onBlur`'u sonuç tıklamasını yutuyor | `onBlur`'u ~180 ms geciktir |
| `FlatList numColumns` değişince grid bozuluyor | `key={numCols}` ile yeniden monte et |
| Aynı `crates.json` 4 kez iniyor | `api.js` modül seviyesinde önbellekler |
| Mock fiyatta kademe içi sıralama anlamsız | İsimden türeyen deterministik çarpan (asla `Math.random()`) |
| Souvenir'e normal skin fiyatı buluyor | Market adına `Souvenir ` öneki ekle |
| **Canlı fiyat bulunamıyor ama hata yok** | Tablo anahtarları aşınma EKLİDİR (`... (Field-Tested)`). Kasa içeriğinde `min_float` YOK — isim üretimini bu alana bağlama, `lookupLivePrice` gibi SIRAYLA dene |
| Fiyat kaynağının birimi | ByMykel tablosu **CENT** verir — `/100` bölmesini kaldırma |

---

## 5. Veri Şeması Notları (ByMykel CSGO-API)

- Bıçaklar: `category.name === 'Knives'` — **576 adet**, hepsi `rarity.name === 'Covert'`
- Eldivenler: `category.name === 'Gloves'` — **94 adet**
- Normal Covert silahlar: **111 adet** (bıçaklarla **aynı** `rarity.id`)
- `Desert Eagle | Heat Treated`: **`Limited Edition Item`** koleksiyonunda, `Classified`
- Kasa bıçakları: `crate.contains_rare` (ör. Chroma Case'de **60 adet**), `contains` içinde YOK
- Sticker kapsülleri: `crates.json` içinde `type === 'Sticker Capsule'` — **100 adet**,
  charm'larla **aynı 4 kademe** (High Grade / Remarkable / Exotic / Extraordinary)
- Souvenir paketleri: `crates.json` içinde `type === 'Souvenir'` — **150 adet**
  (`Souvenir Highlight` (14) skin içermez, dahil ETME)
- Terminaller: `crates.json` içinde `type` alanı **`null`** — ada (`Terminal`) veya
  `model_player` (`ad_laptop`) ile tespit edilir. Şu an **2 adet**
  (Genesis, Dead Hand); yapıları normal kasayla **birebir aynı**
- **Kutuların `price` alanı YOKTUR** (hiçbir kayıtta) — fiyat, kutunun
  `market_hash_name`'i üzerinden canlı fiyat tablosundan çözülür
- `min_float` / `max_float` `collections.json`'da **eksik olabilir** → `?? 0` / `?? 1` kullan

---

## 6. Değişiklik Günlüğü

| Tarih | Değişiklik |
|---|---|
| 2026-08-26 | Dosya oluşturuldu; modül sınırları, doğrulama akışı ve platform tuzakları tanımlandı |
| 2026-08-26 | Float ağırlıklı dağılım, Limited Edition Item ve Covert→Bıçak kuralları eklendi |
| 2026-08-26 | Ölü kod silindi; **ağ katmanı kuralı** (tüm `fetch`'ler `api.js`'te) eklendi |
| 2026-08-26 | Satır içi içerik önizlemesi, sticker kapsülleri ve 5'li Covert yuva kilitleme eklendi |
| 2026-08-27 | Çark hizalama/kuyruk düzeltmeleri, önizleme sıralaması ve `contains_rare` bıçak bug'ı |
| 2026-08-27 | Envanter (sıralama/çoklu satış/inceleme), Trade-Up bakiyesiz, ROI sim kaldırıldı, bıçak "daha fazla göster" |
| 2026-08-27 | Çark göstergesi ok'a çevrildi; hover hızlı satış + Sınırsız Mod satış yönlendirmesi eklendi |
| **2026-08-28** | **Açık tema tasarım sistemi (`src/theme.js`) — ham renk yazma kuralı (Altın Kural 7)** |
| **2026-08-28** | **Terminals / Souvenirs / Stickers sekmeleri; `TerminalOpening.js` + `CapsuleOpening.js` eklendi (ikisi de çarksız)** |
| **2026-08-28** | **Yeni kabuk: üst-orta logo, canlı arama, rezerve reklam alanı, sabit menü sırası** |
| **2026-08-28** | **Animasyon bekçisi kuralı (Altın Kural 8) — rAF 0 kare/sn ölçümü belgelendi** |
| **2026-08-28** | **`crates.json` önbelleği; kutu fiyatları dinamikleşti; mock fiyata deterministik çarpan** |
| **2026-08-28** | **Terminal teklif mekaniği (5+1 kart, kredi ile satın alma) — kasa mantığı kaldırıldı** |
| **2026-08-28** | **i18n (EN varsayılan / TR) + globe değiştirici; sabit metin yazma yasağı (Altın Kural 7)** |
| **2026-08-28** | **Sorumluluk reddi footer'ı; Trade-Up başlık/sıfırlama/keskin hat düzenlemesi** |
| **2026-08-28** | **Daralan üst menü** — kaydırınca kabuk tek satıra iner (~317px kazanç), histerezis ile titreme önlendi |
| **2026-08-28** | **Disclaimer kompaktlaştırıldı + kapatma (X) + `localStorage` kalıcılığı (Altın Kural 6'ya onaylı istisna)** |
| **2026-08-28** | **Terminal ADIM ADIM akışa geçirildi** (1/5 → 5/5, geri dönüş yok, son seçenekte Pas Geç kapalı) |
| **2026-08-28** | **Kaydırmaya bağlı menü animasyonu**; terminal **dolara** geçti + geçişler **anında**; büyük adım sayacı |
| **2026-08-28** | **Rehber/Blog ekranı (semantik HTML, EN+TR) ve alt bilgi bağlantıları** — AdSense hazırlığı |
| **2026-08-28** | **Başlık animasyonu DOM sürücülü + easing'li**; p=0 kırpma hatası giderildi; rAF geri alındı |
| **2026-08-28** | **Terminal görsel bütünlüğü** (cihaz hiç sökülmez, panel CRT dilinde) |
| **2026-08-28** | **Trade-Up ücretsizliği yapısal hâle getirildi** + etiket/renk düzeltmesi |
| **2026-08-28** | **Fiyat kaynağı ByMykel price-tracker'a taşındı** (eskisi ölmüştü); isim eşleştirme hatası giderildi — EV/ROI artık gerçekten canlı |
| **2026-08-28** | **Saydam logo görseli** metin logonun yerini aldı (chroma maskesi; flood-fill bilerek kullanılmadı) |
