# CLOUD — Dış Servisler, Çalıştırma ve Dağıtım

> Bu dosya projenin **dış dünyaya bağlandığı her noktayı**, çalıştırma
> yöntemlerini ve dağıtım (deployment) yolunu tanımlar.
>
> ⚠️ **DEĞİŞMEZ KURAL:** Her yeni özellik/güncellemede `gacas.md`, `agents.md` ve
> `cloud.md` **aynı çıktıda** güncellenir.
>
> 📖 Mimari ve oranlar: [`gacas.md`](./gacas.md) · 🤖 Ajan kuralları: [`agents.md`](./AGENTS.md)

---

## 1. Mimari Özeti — "Sunucusuz" (Serverless / Client-Only)

Bu projenin **kendine ait bir backend'i YOKTUR**. Ne API sunucusu, ne veritabanı,
ne kimlik doğrulama, ne de kullanıcı hesabı vardır.

```
┌──────────────────────────────┐
│   CS2 Simülatör (istemci)    │
│   React Native / Expo Web    │
│                              │
│   • Tüm state RAM'de         │
│   • Tüm hesaplama istemcide  │
└───────────┬──────────────────┘
            │ salt-okunur HTTPS GET
            ▼
┌──────────────────────────────┐
│  Genel (public) veri kaynağı │
│  • ByMykel CSGO-API (GitHub) │
│  • csgotrader fiyat verisi   │
└──────────────────────────────┘
```

**Sonuçlar:**
- Kullanıcı verisi hiçbir yere **gönderilmez** (gizlilik açısından temiz).
- API anahtarı / gizli bilgi (secret) **yoktur** → `.env` dosyası gerekmez.
- Tüm veri çağrıları **salt-okunur `GET`**'tir; hiçbir yazma işlemi yapılmaz.
- Sayfa yenilendiğinde **tüm ilerleme sıfırlanır** (kalıcılık yok).

---

## 2. Dış Servisler

### 2.1 ByMykel CSGO-API (birincil veri kaynağı)
Barındırma: **GitHub raw** · Kimlik doğrulama: **yok** · Kota: **yok**

**Tüm** çağrılar `src/api.js` üzerinden yapılır (tek merkez — bileşenlerde inline
`fetch` yoktur):

| Uç nokta | `api.js` helper'ı | Çağıran | İçerik |
|---|---|---|---|
| `.../en/crates.json` | `fetchCrates()` | `App.js` | Kasalar (`type === "Case"`, 42) — skinler `contains`, bıçaklar `contains_rare` |
| `.../en/crates.json` | `fetchTerminals()` | `App.js` | **Armory terminalleri** (dinamik tespit — aşağıya bak) |
| `.../en/crates.json` | `fetchSouvenirPackages()` | `App.js` | **150 hatıra paketi** (`type='Souvenir'`) |
| `.../en/crates.json` | `fetchStickerCapsules()` | `App.js` | 100 sticker kapsülü (`type='Sticker Capsule'`) |
| `.../en/collections.json` | `fetchCollections()` | `App.js` | Koleksiyonlar + Limited Edition Item |
| `.../en/keychains.json` | `fetchKeychains()` | `App.js` | 78 charm / 4 kapsül |
| `.../en/skins.json` | `fetchSkins()` | `TradeUpScreen.js` | 2126 skin + 576 bıçak + 94 eldiven |

Kök URL: `https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/`

#### ⚠️ crates.json Önbelleği — TEK İNDİRME (bant genişliği: 33 MB → 8.3 MB)
Yukarıdaki **ilk dört** helper aynı `crates.json` dosyasını kullanır ve bu dosya
tek başına **~8.3 MB**'tır. Ayrı ayrı `fetch` edilseydi her açılışta aynı dosya
**4 kez** inecekti (~33 MB). `api.js` dosyayı modül seviyesinde tek bir
promise'te önbelleğe alır; dört çağrı ağa **bir kez** çıkar ve aynı promise'i
paylaşır (yarış durumu yok).

> Başarısız bir deneme önbellekte **tutulmaz** — kullanıcı ağı geri geldiğinde
> yeniden denenebilsin diye `cratesPromise` sıfırlanır.

#### ⚠️ Terminal Tespiti — Nemesis eklendiğinde kod değişmeyecek
Terminaller ByMykel verisinde henüz kendi `type`'ına sahip değil (`type: null`).
Bu yüzden **hardcoded isim listesi yok**; iki sinyalden biri yeterli:

1. Adında `Terminal` geçmesi (ör. *Sealed Dead Hand Terminal*)
2. `model_player` alanının Valve'in terminal modeli `ad_laptop`'u işaret etmesi

> **Durum (28 Ağu 2026):** API'de **2** terminal var — *Sealed Genesis Terminal*
> ve *Sealed Dead Hand Terminal*. Kullanıcının bahsettiği **Nemesis Terminal**
> henüz ByMykel verisine eklenmemiş; eklendiği anda **kod değişikliği olmadan**
> listede belirecek.

**Hata davranışı:** Her helper `try/catch` ile sarılıdır; hata durumunda **boş dizi**
döner ve uygulama çökmez (ekranlar boş görünür ama çalışmaya devam eder).

### 2.2 Fiyat Verisi — ByMykel/counter-strike-price-tracker

```
https://raw.githubusercontent.com/ByMykel/counter-strike-price-tracker/main/static/latest.json
```

`src/prices.js` → `fetchLivePrices()` · **1.6 MB** · 34.500 eşya

#### ⚠️ ESKİ KAYNAK ÖLDÜ (28 Ağu 2026)
Önceki adres `prices.csgotrader.app/latest/prices_v6.json` idi ve uzun süre
"CORS engelliyor" diye biliniyordu. Doğrulama sonucu asıl sebep bu değildi:

```
status=301  redirect=https://csgotrader.app/prices/   (JSON değil, HTML)
```

Uç nokta **taşınmıştı**. Yani hangi sunucuda yayınlanırsa yayınlansın —
localhost, Cloudflare, herhangi bir yer — çalışması mümkün değildi. Bir CORS
proxy'si de bu sorunu çözmezdi.

#### Yeni kaynağın avantajları
| Özellik | Değer |
|---|---|
| CORS | `Access-Control-Allow-Origin: *` — **proxy/Worker GEREKMİYOR** |
| İsim biçimi | Oyun verisiyle **aynı geliştirici** → anahtarlar birebir `market_hash_name` |
| Kapsam | 34.500 eşya · 17.626 aşınmalı anahtar · 3.370 ★ (bıçak/eldiven) |
| Boyut | 1.6 MB (kasa verisinin ~beşte biri) |

Kapsam kasaları, kapsülleri, terminalleri, `StatTrak™` ve `Souvenir`
varyantlarını içerir.

#### ⚠️ BİRİM: CENT
Kaynak, Steam'in `sell_price` alanını **cent** olarak yazar (toplayıcı betikte
değişkenin adı bile `cents`). Ör. `4210` = **$42.10**. `prices.js` içindeki
`/100` bölmesini kaldırmak tüm fiyatları **100 kat** şişirir.

#### ⚠️ TAZELİK: CANLI DEĞİL, HAFTALIK
Bu bir anlık ticker **değildir**. Toplayıcı, Steam'in hız sınırları yüzünden
34.500 eşyayı sayfa sayfa geziyor; workflow 4 saatte bir tetiklense de betik o
hafta zaten güncellenmişse **atlıyor**. Pratikte veri birkaç günlük ile birkaç
haftalık arasında olabilir. Gerçek piyasa fiyatlarıdır ama **anlık değildir**.

Kaynak erişilemezse uygulama kırılmaz: her yerde simüle fiyata düşer.

> ⚠️ Eskiden logonun altında bir `🟢 Canlı / 🟡 Simüle` rozeti vardı; **kullanıcı
> isteğiyle kaldırıldı** (28 Ağu 2026). Fiyat kaynağının durumunu artık yalnızca
> tarayıcı konsolundaki `✅ Canlı fiyat verisi yüklendi: N eşya` satırından
> anlarsınız.

---

## 3. Yerelde Çalıştırma

```bash
npm install      # bağımlılıklar (ilk kurulumda ~490 paket)
npm run web      # → http://localhost:8081  (BİRİNCİL geliştirme hedefi)
npm run android  # Android cihaz/emülatör
npm run ios      # iOS simülatör (yalnızca macOS)
npm start        # Expo seçim menüsü
```

### Sağlıklı Başlangıç Çıktısı
```
Starting Metro Bundler
Waiting on http://localhost:8081
Web Bundled 9042ms index.js (369 modules)
LOG ⚠️ Canlı fiyat verisi çekilemedi, simüle fiyatlandırmaya geçildi: Failed to fetch
```
Son satır **beklenen** davranıştır (bkz. §2.2).

İlk açılışta ~8.3 MB'lık `crates.json` indirilir (kasa + terminal + souvenir +
sticker listelerinin **hepsi** buradan gelir, tek indirmeyle — bkz. §2.1).

### Beklenen (Zararsız) Uyarılar
| Uyarı | Durum |
|---|---|
| ~~`CORS ... prices.csgotrader.app`~~ | ❌ ARTIK GÖRÜNMEMELİ — kaynak değişti (§2.2). Görüyorsanız eski sürümdesiniz |
| `"shadow*" style props are deprecated` | ✅ RN-web sürüm uyarısı |
| `props.pointerEvents is deprecated` | ✅ RN-web sürüm uyarısı |
| `useNativeDriver ... native animated module is missing` | ✅ Web'de normal |
| `1 package may need updating` | ✅ Bilgilendirme |

Bunların **dışındaki** her hata incelenmelidir.

---

## 4. Dağıtım (Deployment)

### 4.1 Web — Statik Site
```bash
npx expo export --platform web    # çıktı: dist/
```
`dist/` klasörü **tamamen statiktir**; herhangi bir statik barındırıcıya konabilir:
Netlify · Vercel · GitHub Pages · Cloudflare Pages · S3 + CloudFront.

Backend, sunucu tarafı render veya ortam değişkeni **gerekmez**.

### 4.2 Mobil — EAS Build
Proje `eas.json` içerir.
```bash
npx eas build --platform android
npx eas build --platform ios
```
Not: EAS bir **Expo hesabı** gerektirir. Mobil derlemede CORS kısıtı olmadığı için
canlı fiyat verisi **çalışır** — yani mobil sürüm otomatik olarak
`🟢 Canlı Fiyatlar` moduna geçer.

---

## 5. Gelecekte Backend Gerekirse

Şu anda gerekmiyor. Ancak şu özellikler backend **zorunlu** kılar:

| Özellik | Neden gerekli |
|---|---|
| Kullanıcı hesapları / giriş | Kimlik doğrulama + kullanıcı veritabanı |
| Envanterin kalıcı olması | Sunucu tarafı depolama |
| Liderlik tablosu / paylaşım | Paylaşılan durum + hile önleme |
| Güvenilir canlı fiyat | CORS proxy + önbellek |

> ⚠️ **Önemli:** Şu anda tüm çekilişler **istemcide** yapılır. Rekabetçi/paylaşılan
> herhangi bir özellik eklenirse, çekilişler **sunucuya taşınmalıdır** — aksi halde
> kullanıcı sonucu istediği gibi değiştirebilir. Tek kişilik simülatör için mevcut
> yapı tamamen uygundur.

---

## 5.5 Yasal Bilgilendirme (Disclaimer)

Sitenin altında, `src/components/Disclaimer.js` üzerinden **her ekranda**
görünen bir sorumluluk reddi bulunur (EN/TR). İçerik i18n sözlüğündeki
`disclaimer.*` anahtarlarından gelir.

Üç madde **kaldırılmamalıdır**:
1. Uygulama yalnızca **eğlence amaçlı bir simülatördür**.
2. Kazanılan sanal eşyalar **gerçek oyunlara aktarılamaz/takas edilemez**.
3. **Gerçek para yatırma/çekme veya kumar mekanizması yoktur**.

> Bu, projenin **hiçbir ödeme sağlayıcısına bağlanmadığı** ve hiçbir gerçek
> para akışı barındırmadığı gerçeğiyle uyumludur (bkz. §1 ve §6): uygulama
> tamamen istemci tarafında çalışır, sunucusu ve veritabanı yoktur.

---

## 5.6 Tarayıcı Depolaması (localStorage)

Uygulama **tek bir** kalıcı anahtar kullanır:

| Anahtar | Değer | Amaç |
|---|---|---|
| `skinsim.disclaimerDismissed` | `'1'` | Kullanıcı sorumluluk reddini kapattı |

Başka hiçbir veri saklanmaz — bakiye, kredi, envanter ve geçmiş **yalnızca
oturum içidir** ve sayfa yenilendiğinde sıfırlanır. Depolanan değer kişisel veri
içermez, hiçbir sunucuya gönderilmez (zaten sunucu yoktur — bkz. §1).

Erişim `Platform.OS !== 'web'` kontrolü ve `try/catch` ile korunur; gizli
sekmede veya depolama kapalıyken uygulama **çökmez**, yalnızca uyarı tekrar
görünür.

---

## 5.7 Reklam Yayıncılığı (AdSense) Hazırlığı

Site, reklam ağı incelemesinden geçebilmesi için şunlarla donatıldı:

| Gereksinim | Karşılığı |
|---|---|
| Özgün, bilgilendirici içerik | `src/content/guide.js` — 6 bölüm, bölüm başına 1.800–3.650 karakter, **EN + TR** |
| Yüksek metin/HTML oranı | `BlogScreen.js` uzun biçimli metin basar; süsleme minimumda |
| Semantik yapı | Gerçek `<main>`, `<article>`, `<h1>`–`<h3>`, `<p>`, `<ul>`, `<nav>`, `<footer>` |
| Gizlilik Politikası | Rehber içinde ayrı bölüm + alt bilgi bağlantısı (çerez/reklam maddesi dâhil) |
| İletişim | Rehber içinde ayrı bölüm + alt bilgi bağlantısı |
| Reklam alanı | Ana sayfada arama çubuğunun altında **rezerve boşluk** hazır |

> ⚠️ **YAYINA ALMADAN ÖNCE:** `content/guide.js` içindeki İletişim bölümünde
> yer tutucu e-posta adresi (`your-address@example.com` /
> `adresiniz@example.com`) **gerçek bir adresle değiştirilmelidir** — çalışan
> bir iletişim yolu, reklam ağlarının incelemede aradığı şeylerden biridir.

> Not: Reklam kodu (AdSense script'i) **henüz eklenmedi**; yalnızca alan ve
> içerik altyapısı hazırlandı.

---

## 5.8 Google Analytics (GA4)

**Ölçüm kimliği:** `G-C4JPXC4L64`
**Nerede:** `public/index.html` → `<head>`'in **en başında** (gtag.js snippet'i).

Expo, `public/index.html` varsa onu şablon olarak kullanır (SDK 57, single-page
çıktı) ve `npx expo export --platform web` sırasında bundle script'ini gövdenin,
favicon bağlantısını da head'in sonuna kendisi ekler. Doğrulandı: `dist/index.html`
içinde gtag satır 5'te, `<title>SkinSimulator.com</title>` satır 49'da,
`favicon.ico` bağlantısı satır 72'de, bundle script satır 80'de.

> ⚠️ **BU DOSYADA KAPANIŞ `head`/`body` ETİKETİ YAZMAYIN — YORUM İÇİNDE BİLE.**
> Expo'nun enjeksiyonu düz metin araması yapıyor ve kapanış etiketinin **ilk**
> geçtiği yeri hedefliyor; yorumun içindeki bir metin bundle script'ini yorumun
> içine gömer ve uygulama hiç açılmaz.

> ⚠️ **Çerez bildirimi:** GA çerez kullanır. AB/UK trafiği hedefleniyorsa
> Rehber ekranındaki Gizlilik Politikası bölümü ve bir çerez onayı katmanı
> gerekebilir — bu **henüz eklenmedi**.

### Sekme başlığı
`<title>` artık **`SkinSimulator.com`**. Eskiden `app.json`'daki `expo.name`
alanından ("cs2-simulator") üretiliyordu. `app.json` → `expo.web.name` de
`SkinSimulator.com` olarak güncellendi (PWA manifest'i için).

## 5.8.1 Google Search Console — site sahipliği doğrulaması

| | |
|---|---|
| **Yöntem** | HTML meta etiketi |
| **Jeton** | `8xDkNMJr_jeEF5Qb89A7yPFwTqJDwkaGkcihnhSO6k4` |
| **Nerede** | `public/index.html` → `<head>` |

⚠️ **BU ANALYTICS DEĞİLDİR.** Analytics ayrı bir şeydir (gtag.js,
ölçüm kimliği `G-C4JPXC4L64` — bkz. §5.8). `google-site-verification`
jetonu trafik ölçmez, hiçbir veri toplamaz; yalnızca Search Console'a
"bu alan adı bana ait" der ve arama sorguları / indeksleme durumu /
sitemap ekranlarına erişim açar.

⚠️ **SİLMEYİN:** Google etiketi periyodik olarak yeniden kontrol eder.
Kaldırılırsa doğrulama düşer ve Search Console erişimi kesilir.

⚠️ Doğrulamanın geçerli olması için etiketin **yayındaki** ana sayfada
bulunması gerekir — yani `npx expo export` sonrası `dist/` klasörü
dağıtılmadan Search Console "doğrulanamadı" der.

## 5.9 Yeni Bağımlılık: `react-native-svg`

Arayüz simgeleri emoji'den **SVG**'ye taşındı (bkz. `gacas.md` §6.2.29).
`npx expo install react-native-svg` ile SDK 57 uyumlu sürüm kuruldu (15.15.4).
Web'de `react-native-web` üzerinden gerçek `<svg>` elemanına çevrilir; ek bir
yapılandırma veya polyfill **gerekmez**.

## 5.10 İletişim Formu — Dış Servis (FormSubmit)

| | |
|---|---|
| **Hedef adres** | `eolyrics@gmail.com` (`src/contactConfig.js` → `CONTACT_EMAIL`) |
| **Servis** | `https://formsubmit.co/ajax/<adres>` — kayıt/API anahtarı gerektirmez |
| **Kim çağırıyor** | `src/api.js` → `sendContactMessage` (Ağ Katmanı Kuralı) |
| **Yedek** | Servis erişilemezse form `mailto:` bağlantısına düşer |

⚠️ **NEDEN GEREKLİ:** Proje sunucusuzdur (§1). Tarayıcıdan doğrudan e-posta
göndermek mümkün değildir; SMTP için sunucu ve gizli parola gerekir, istemci
koduna konulan parola herkesçe okunabilir.

⚠️ **İLK MESAJDA AKTİVASYON:** FormSubmit, adresin sahibi olduğunuzu doğrulamak
için ilk gönderimde `CONTACT_EMAIL`'e bir onay bağlantısı yollar. **O bağlantıya
bir kez tıklanmadan hiçbir mesaj iletilmez.**

⚠️ **GİZLİLİK:** Gönderilen ad / e-posta / mesaj bu servisin sunucularından
geçer. AB/UK trafiği hedefleniyorsa Gizlilik Politikası bölümünde belirtilmesi
gerekir. Başka bir sağlayıcıya (Formspree, Web3Forms, EmailJS veya kendi
Cloudflare Worker'ınız) geçmek için değiştirilecek tek yer `contactConfig.js`.

## 6. Gizlilik ve Güvenlik

- ✅ Kişisel veri toplanmaz, gönderilmez, saklanmaz.
- ✅ Çerez, analitik, izleme (tracking) yoktur.
- ✅ Kimlik bilgisi/API anahtarı yoktur → sızdırılacak bir sır yoktur.
- ✅ Tüm dış çağrılar HTTPS ve salt-okunurdur.
- ℹ️ Uygulamadaki tüm para birimi değerleri **simülasyondur**; gerçek işlem yoktur.

---

## 7. Değişiklik Günlüğü

| Tarih | Değişiklik |
|---|---|
| **2026-08-29** | `public/index.html` şablonu eklendi: sekme başlığı `SkinSimulator.com`, Google Analytics (`G-C4JPXC4L64`), mobil klavye için `interactive-widget=resizes-content` |
| **2026-08-29** | `react-native-svg` (15.15.4) bağımlılığı eklendi — arayüz simgeleri |
| **2026-08-30** | Koleksiyonlar sekmesi eklendi — **yeni dış servis YOK**; zaten indirilen `collections.json` yeniden kullanılıyor. Aktif drop havuzu listesi elle bakımlı (`src/armoryData.js`) |
| **2026-08-30** | **Google Search Console doğrulama meta etiketi** eklendi (`public/index.html`). Analytics'ten AYRI bir şeydir |
| **2026-08-30** | **YENİ DIŞ SERVİS: FormSubmit** — iletişim formu mesajlarını `eolyrics@gmail.com` adresine iletir (bkz. §5.10). İlk gönderimde aktivasyon gerekir |

| Tarih | Değişiklik |
|---|---|
| 2026-08-26 | Dosya oluşturuldu; dış servisler, CORS davranışı, çalıştırma ve dağıtım tanımlandı |
| 2026-08-26 | Ağ katmanı merkezileştirildi — tüm uç noktalar artık `src/api.js` helper'ları üzerinden çağrılıyor |
| 2026-08-26 | `fetchStickerCapsules()` eklendi — sticker kapsülleri `crates.json`'dan filtreleniyor (ek ağ isteği yok, aynı dosya) |
| 2026-08-27 | `crates.json` şema notu: bıçak/eldivenler ayrı `contains_rare` alanında geliyor |
| 2026-08-27 | ROI simülasyon motoru kaldırıldı — dış servis/uç nokta değişikliği yok |
| 2026-08-27 | Çark göstergesi + satış akışı değişiklikleri tamamen istemci tarafı — dış servis etkisi yok |
| **2026-08-28** | **`crates.json` önbelleğe alındı** — kasa/terminal/souvenir/sticker için 4 ayrı indirme yerine **tek** indirme (33 MB → 8.3 MB) |
| **2026-08-28** | **Yeni uç nokta kullanımları:** `fetchTerminals()` (dinamik tespit) ve `fetchSouvenirPackages()` |
| **2026-08-28** | **Kutu fiyatları canlı tablodan çözülüyor** (`getContainerPrice`); souvenir için `Souvenir ` market öneki |
| **2026-08-28** | **Dış servis değişikliği YOK:** i18n, terminal teklif mekaniği ve disclaimer tamamen istemci tarafıdır (yeni uç nokta/anahtar gerekmez) |
| **2026-08-28** | **Yasal bilgilendirme bölümü (§5.5)** eklendi — gerçek para akışı bulunmadığı belgelendi |
| **2026-08-28** | **§5.6 Tarayıcı depolaması** eklendi — tek kalıcı anahtar (`skinsim.disclaimerDismissed`); sunucuya veri gitmiyor |
| **2026-08-28** | **Fiyat kaynağı değişti** — `prices.csgotrader.app` ölü (301→HTML); yerine ByMykel price-tracker. CORS açık, proxy gerekmiyor; birim **cent**, tazelik haftalık |
| **2026-08-28** | **§5.7 AdSense hazırlığı** — semantik rehber içeriği (EN+TR), Gizlilik/İletişim bölümleri, alt bilgi bağlantıları. Reklam script'i henüz eklenmedi |
