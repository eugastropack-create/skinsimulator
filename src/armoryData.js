// ============================================================
// GERÇEK CS2 ARMORY HAVUZU (kaynak: tradeit.gg/blog/all-cs2-armory-skins,
// 12 Ağustos 2026 güncellemesi — Valve'in Armory kataloğu bu tarihte)
// ============================================================
// Armory kataloğu Valve tarafından ROTASYONLA değiştirilir. Bu liste
// güncelliğini yitirirse, yapmanız gereken tek şey buradaki isimleri
// güncellemek — kod tarafında başka bir değişiklik gerekmez.
//
// 12 Ağustos 2026 itibarıyla AKTİF (kredi ile alınabilen) setler:
//   - The Overpass 2024 Collection  (doğrudan koleksiyon çekilişi)
//   - The Spy Tech Collection       (8 Temmuz 2026'da eklendi)
//   - The Arabesque Collection      (8 Temmuz 2026'da eklendi)
//   - Fever Case                    (bir KASA — aşağıya bakın)
//
// HAVUZDAN ÇIKARILMIŞ (artık Armory'de YOK, sadece piyasada/envanterde
// bulunabilir — bu yüzden bunları Armory'ye dahil ETMİYORUZ):
//   Gallery Case, Graphic Design Collection, Sport & Field Collection,
//   2025 Train Collection
//
// Bu isimler, App.js'in zaten çektiği ByMykel collections.json listesini
// FİLTRELEMEK için kullanılıyor (küçük harfe çevrilip .includes() ile
// eşleştiriliyor, bu yüzden "The Overpass 2024 Collection" gibi tam
// başlık farkları sorun olmaz).
export const ACTIVE_ARMORY_COLLECTION_NAMES = [
  'overpass 2024',
  'spy tech',
  'arabesque'
];

// NOT: Fever Case de aktif bir Armory ödülü ama mekaniği FARKLI — koleksiyon
// gibi doğrudan bir silah skini vermiyor, KAPALI BİR KASA veriyor (gerçek
// oyunda bu kasa daha sonra normal şekilde anahtarla açılıyor). Mevcut
// "yıldız harca -> direkt eşya çıksın" mekaniğimize tam oturmadığı için
// şimdilik dahil etmedik. Bunu doğru şekilde eklemek için envantere
// "kapalı kasa" objesi ekleyip Kasalar sekmesinden açılabilir hale
// getirecek bir sonraki adım gerekiyor — istersen birlikte yaparız.
export const PENDING_CASE_REWARDS_NOTE =
  'Fever Case Armory\'de aktif ama kasa mekaniği farklı olduğu için henüz eklenmedi.';
