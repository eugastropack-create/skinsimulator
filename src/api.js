// ============================================================
// AĞ KATMANI — TÜM DIŞ VERİ ÇAĞRILARI BURADA
// ============================================================
// KURAL (bkz. AGENTS.md §2 "Ağ Katmanı Kuralı"): Bileşenlerin içine doğrudan
// `fetch(...)` YAZILMAZ. Yeni bir uç nokta gerekiyorsa buraya bir helper eklenir.
// Böylece uç noktalar, hata yönetimi ve yedekleme davranışı tek merkezde kalır.
//
// Veri kaynağı: ByMykel/CSGO-API (topluluk tarafından güncellenen, resmi CS2
// oyun dosyalarından üretilen ücretsiz JSON API). Uygulamadaki HİÇBİR kasa/
// koleksiyon/terminal/sticker/souvenir listesi hardcoded DEĞİLDİR — hepsi
// buradan gelir, dolayısıyla Valve yeni içerik eklediğinde uygulama kendiliğinden
// günceller.

import { CONTACT_ENDPOINT, buildPayload } from './contactConfig';

const BASE = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en';

// ============================================================
// crates.json ÖNBELLEĞİ (PERFORMANS — KRİTİK)
// ============================================================
// crates.json ~8.3 MB'lık TEK bir dosyadır ve Kasalar, Sticker Kapsülleri,
// Souvenir Paketleri ve Terminaller'in HEPSİ bu dosyanın içindedir.
// Her kategori için ayrı ayrı fetch etmek aynı 8 MB'ı 4 KEZ indirmek demekti
// (ilk açılışta ~33 MB gereksiz trafik). Artık dosya bir kez indirilip
// modül seviyesinde önbelleğe alınıyor; paralel çağrılar AYNI promise'i
// paylaşır (yarış durumu yok).
let cratesPromise = null;

const getAllCrates = () => {
  if (!cratesPromise) {
    cratesPromise = fetch(`${BASE}/crates.json`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .catch(error => {
        console.error('Kutu verisi (crates.json) çekilirken hata:', error);
        cratesPromise = null; // başarısız denemeyi önbellekte TUTMA — tekrar denenebilsin
        return [];
      });
  }
  return cratesPromise;
};

const hasContents = (crate) => (crate?.contains?.length || 0) > 0;

// ---------- KASALAR ----------
export const fetchCrates = async () => {
  const data = await getAllCrates();
  return data.filter(crate => crate.type === 'Case' && hasContents(crate));
};

// ---------- SOUVENIR (HATIRA) PAKETLERİ ----------
// ByMykel verisinde `type === 'Souvenir'` (150 adet). `Souvenir Highlight`
// (14 adet) BİLEREK dışarıda bırakıldı: onlar skin değil, maç "highlight"
// videolarına ait koleksiyon parçaları — açılış mekaniğimize uymuyorlar.
export const fetchSouvenirPackages = async () => {
  const data = await getAllCrates();
  return data.filter(crate => crate.type === 'Souvenir' && hasContents(crate));
};

// ---------- STICKER KAPSÜLLERİ ----------
// `type === 'Sticker Capsule'` (100 adet). İçerik yapısı charm kapsülleriyle
// BİREBİR AYNIDIR: aynı 4 kademe (High Grade / Remarkable / Exotic /
// Extraordinary), bu yüzden aynı oran tablosu yeniden kullanılabilir.
export const fetchStickerCapsules = async () => {
  const data = await getAllCrates();
  return data.filter(crate => crate.type === 'Sticker Capsule' && hasContents(crate));
};

// ---------- ARMORY TERMİNALLERİ (Genesis, Dead Hand, Nemesis, ...) ----------
// ⚠️ DİNAMİK TESPİT — HARDCODED İSİM LİSTESİ YOK.
// Terminaller ByMykel verisinde HENÜZ kendi `type`'ına sahip değil: `type`
// alanları `null` geliyor. Bu yüzden iki güvenilir sinyalle tespit ediyoruz:
//   1) Adında "Terminal" geçmesi  (ör. "Sealed Dead Hand Terminal")
//   2) `model_player`'ın Valve'in terminal modeli olan `ad_laptop`'u işaret etmesi
// İki sinyalden BİRİ yeterli. Sonuç: Valve yeni bir terminal eklediğinde
// (ör. Nemesis Terminal) kodda TEK SATIR değişiklik yapmadan listede belirir.
//
// Veri şeması (doğrulandı): terminaller normal bir kasayla AYNI yapıdadır —
// `contains` içinde Mil-Spec→Covert silahlar, `contains_rare` içinde eldivenler.
export const fetchTerminals = async () => {
  const data = await getAllCrates();
  return data.filter(crate => {
    if (!hasContents(crate)) return false;
    const byName = /\bterminal\b/i.test(crate.name || '');
    const byModel = /ad_laptop/i.test(crate.model_player || '');
    return byName || byModel;
  });
};

// ---------- SKİNLER / KOLEKSİYONLAR / CHARM'LAR ----------
export const fetchSkins = async () => {
  try {
    const response = await fetch(`${BASE}/skins.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Skinler çekilirken hata:', error);
    return [];
  }
};

export const fetchCollections = async () => {
  try {
    const response = await fetch(`${BASE}/collections.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Koleksiyonlar çekilirken hata:', error);
    return [];
  }
};

// Charm'lar (nazarlıklar) CS2/ByMykel verisinde "keychains" olarak geçiyor.
export const fetchKeychains = async () => {
  try {
    const response = await fetch(`${BASE}/keychains.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Charm'lar çekilirken hata:", error);
    return [];
  }
};

// ============================================================
// İLETİŞİM FORMU GÖNDERİMİ
// ============================================================
// ⚠️ AĞ KATMANI KURALI: bileşenlerin içine `fetch` yazılmaz (bkz. dosya
// başındaki kural). İletişim formu da bu helper'ı kullanır.
//
// Hedef adres ve servis `src/contactConfig.js` içindedir — sağlayıcı
// değiştirmek için orada tek bir sabiti güncellemek yeterlidir.
//
// Dönüş: `{ ok: true }` veya `{ ok: false, reason }`. Hiçbir durumda
// exception FIRLATMAZ — form, başarısızlıkta `mailto:` yedeğine düşer.
export const sendContactMessage = async (fields) => {
  if (!CONTACT_ENDPOINT) return { ok: false, reason: 'not-configured' };
  try {
    const res = await fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(buildPayload(fields))
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true };
  } catch (error) {
    console.log('⚠️ İletişim mesajı gönderilemedi, mailto yedeğine düşülüyor:', error.message);
    return { ok: false, reason: 'network' };
  }
};
