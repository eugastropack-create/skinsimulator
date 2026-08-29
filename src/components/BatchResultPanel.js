import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Platform } from 'react-native';
import { C, shadow, rarityGlowStyle, webTransition } from '../theme';
import { formatSignedMoney } from '../utils';
import { useI18n } from '../i18n';
import { IconRefresh, IconInventory, IconSell, IconCheck, IconSelect } from './Icons';

// ============================================================
// ÇOKLU AÇILIŞ SONUÇ PANELİ — TEK ORTAK BİLEŞEN
// ============================================================
// Kasa, Souvenir, Sticker Kapsülü ve Armory koleksiyonu açılışlarının HEPSİ
// bu paneli kullanır. Daha önce dört ekranda dört ayrı (ve farklı özellikli)
// sonuç ızgarası vardı; biri güncellenince diğerleri unutuluyordu.
//
// YETENEKLER (kullanıcı brief'i, 29 Ağu 2026):
//   • TEKRARDAN AÇ  → aynı kutuyu AYNI adetle anında yeniden açar
//   • TEKLİ SATIŞ   → bir eşyanın üzerine gelince küçük bir "Sat" düğmesi çıkar
//   • ÇOKLU SEÇİM   → eşyalara tıklayarak seçilir (tik rozeti)
//   • ALT MENÜ      → Hepsini Envantere Gönder · Seçilenleri Gönder · Tümünü Sat
//
// ⚠️ DOKUNMATİK PLATFORM: `onMouseEnter` native'de YOKTUR. Orada "Sat" düğmesi
// hover'a bağlanamayacağı için DAİMA görünür (bkz. App.js envanter kartındaki
// aynı kalıp). Web'de ise yalnızca hover'da çıkar, ızgara kalabalıklaşmasın.
//
// ⚠️ SEÇİM MODU AYRI BİR DÜĞME İSTEMEZ: karta tıklamak doğrudan seçer. Bunun
// sebebi, bu ekranda kartın başka bir "birincil eylemi" olmaması — envanterden
// farklı olarak burada inceleme modalı yok.

export default function BatchResultPanel({
  items,                 // gösterilecek eşyalar (satılanlar ÇIKARILMIŞ olmalı)
  spendingLabel,         // "-$12.50" veya "-40★" — para birimi ekrana göre değişir
  spendingUsd,           // kâr/zarar hesabı için DOLAR karşılığı
  onSellOne,             // (item) => void
  onSellAll,             // () => void
  onKeepAll,             // () => void
  onKeepSelected,        // (selectedItems) => void
  onReopen,              // () => void   (null verilirse buton çıkmaz)
  onClose,               // () => void
  reopenLabel,           // "10x Tekrar Aç"
  title                  // üst başlık
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState([]);
  const [hoveredUid, setHoveredUid] = useState(null);
  const isWeb = Platform.OS === 'web';

  const totalWon = items.reduce((a, it) => a + (it.price || 0), 0);
  const netProfit = totalWon - (spendingUsd || 0);
  const selectedItems = items.filter(it => selected.includes(it.uid));
  const selectedTotal = selectedItems.reduce((a, it) => a + (it.price || 0), 0);

  const toggle = (uid) => setSelected(prev => prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]);
  const clearSelection = () => setSelected([]);

  const sellOne = (item) => {
    setSelected(prev => prev.filter(u => u !== item.uid));
    onSellOne?.(item);
  };

  const keepSelected = () => {
    if (selectedItems.length === 0) return;
    onKeepSelected?.(selectedItems);
    clearSelection();
  };

  return (
    <View style={b.wrap}>
      <View style={b.headerRow}>
        <Text style={b.title}>{title}</Text>
        {selected.length > 0 && (
          <TouchableOpacity style={b.clearSelBtn} onPress={clearSelection}>
            <Text style={b.clearSelTxt}>{t('batch.clearSelection', { n: selected.length })}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Kullanıcı seçim yapılabildiğini bilmiyorsa özellik yok sayılır. */}
      <View style={b.hintRow}>
        <IconSelect size={13} color={C.textDim} />
        <Text style={b.hint}>{t('batch.selectHint')}</Text>
      </View>

      <View style={b.grid}>
        {items.map(it => {
          const picked = selected.includes(it.uid);
          const showSell = !isWeb || hoveredUid === it.uid;
          return (
            <TouchableOpacity
              key={it.uid}
              activeOpacity={0.85}
              onPress={() => toggle(it.uid)}
              onMouseEnter={isWeb ? () => setHoveredUid(it.uid) : undefined}
              onMouseLeave={isWeb ? () => setHoveredUid(prev => (prev === it.uid ? null : prev)) : undefined}
              style={[
                b.card,
                { borderBottomColor: it.displayColor },
                webTransition('border-color, transform', 150),
                picked && b.cardPicked
              ]}
            >
              <View pointerEvents="none" style={rarityGlowStyle(it.displayColor, { height: '46%', strength: 0.55 })} />

              {picked && (
                <View style={b.checkBadge}>
                  <IconCheck size={11} color={C.onAccent} strokeWidth={3} />
                </View>
              )}
              {it.isStatTrak && <Text style={b.stTag}>ST™</Text>}

              {/* TEKLİ SATIŞ — hover'da (web) / daima (native).
                  ⚠️ `onPress` kartın seçim `onPress`'ini TETİKLEMEZ: RN'de iç
                  içe Touchable'larda olay yukarı kabarmaz. */}
              {showSell && (
                <TouchableOpacity style={b.sellChip} onPress={() => sellOne(it)}>
                  <IconSell size={10} color={C.onAccent} strokeWidth={2.2} />
                  <Text style={b.sellChipTxt}>{it.price?.toFixed(2)}</Text>
                </TouchableOpacity>
              )}

              <Image source={{ uri: it.image }} style={b.img} resizeMode="contain" />
              <Text style={b.price}>${it.price?.toFixed(2)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={b.summary}>
        <View style={b.statBox}>
          <Text style={b.statLbl}>{t('common.spent')}</Text>
          <Text style={[b.statVal, { color: C.danger }]}>{spendingLabel}</Text>
        </View>
        <View style={b.statBox}>
          <Text style={b.statLbl}>{t('common.won')}</Text>
          <Text style={[b.statVal, { color: C.success }]}>+${totalWon.toFixed(2)}</Text>
        </View>
        <View style={b.statBox}>
          <Text style={b.statLbl}>{t('common.profit')}</Text>
          <Text style={[b.statVal, { color: netProfit >= 0 ? C.success : C.danger }]}>{formatSignedMoney(netProfit)}</Text>
        </View>
      </View>

      {/* ============ ALT AKSİYON MENÜSÜ ============ */}
      <View style={b.actions}>
        <TouchableOpacity style={b.primaryBtn} onPress={onKeepAll}>
          <IconInventory size={14} color={C.onAccent} />
          <Text style={b.primaryTxt}>{t('batch.keepAll')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[b.secondaryBtn, selectedItems.length === 0 && b.btnDisabled]}
          onPress={keepSelected}
          disabled={selectedItems.length === 0}
        >
          <IconCheck size={14} color={selectedItems.length === 0 ? C.textFaint : C.accentDeep} strokeWidth={2.4} />
          <Text style={[b.secondaryTxt, selectedItems.length === 0 && { color: C.textFaint }]}>
            {t('batch.keepSelected', { n: selectedItems.length, total: selectedTotal.toFixed(2) })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={b.sellAllBtn} onPress={onSellAll}>
          <IconSell size={14} color={C.onAccent} strokeWidth={2.2} />
          <Text style={b.primaryTxt}>{t('batch.sellAll', { n: totalWon.toFixed(2) })}</Text>
        </TouchableOpacity>

        {onReopen && (
          <TouchableOpacity style={b.reopenBtn} onPress={onReopen}>
            <IconRefresh size={14} color={C.text} />
            <Text style={b.reopenTxt}>{reopenLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity onPress={onClose}>
        <Text style={b.closeTxt}>{t('common.close')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const b = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center', marginTop: 6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 8 },
  title: { color: C.text, fontSize: 14, fontWeight: '800', flexShrink: 1 },
  clearSelBtn: { backgroundColor: C.accentSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4 },
  clearSelTxt: { color: C.accentDeep, fontSize: 11, fontWeight: '800' },

  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 10 },
  hint: { color: C.textDim, fontSize: 10.5, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, width: '100%' },
  card: {
    width: 78, backgroundColor: C.surface, borderRadius: 4, borderBottomWidth: 3,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', padding: 6, position: 'relative', overflow: 'hidden', ...shadow.card
  },
  // Seçilen kart: keskin mavi çerçeve — CS2'nin seçim dili.
  cardPicked: { borderColor: C.accent, borderWidth: 2 },
  checkBadge: {
    position: 'absolute', top: 3, right: 3, zIndex: 3,
    width: 16, height: 16, borderRadius: 3, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center'
  },
  stTag: { position: 'absolute', top: 3, left: 4, color: C.warn, fontSize: 8, fontWeight: '800', zIndex: 2 },
  sellChip: {
    position: 'absolute', top: 3, left: 3, right: 3, zIndex: 4,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
    backgroundColor: C.success, paddingVertical: 3, borderRadius: 3
  },
  sellChipTxt: { color: C.onAccent, fontSize: 9.5, fontWeight: '800' },
  img: { width: 60, height: 46, marginTop: 8 },
  price: { color: C.success, fontSize: 10, fontWeight: '800', marginTop: 4 },

  summary: {
    flexDirection: 'row', backgroundColor: C.surface, borderRadius: 4,
    borderWidth: 1, borderColor: C.border,
    padding: 14, justifyContent: 'space-around', width: '100%', marginTop: 18, ...shadow.card
  },
  statBox: { alignItems: 'center' },
  statLbl: { color: C.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  statVal: { color: C.text, fontSize: 14, fontWeight: '800', marginTop: 4 },

  actions: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accent, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 4 },
  primaryTxt: { color: C.onAccent, fontWeight: '800', fontSize: 12.5 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.accentBorder,
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 4
  },
  secondaryTxt: { color: C.accentDeep, fontWeight: '800', fontSize: 12.5 },
  btnDisabled: { opacity: 0.55, borderColor: C.border },
  sellAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.success, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 4 },
  reopenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.borderStrong,
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 4
  },
  reopenTxt: { color: C.text, fontWeight: '800', fontSize: 12.5 },

  closeTxt: { color: C.textDim, fontSize: 12, marginTop: 14, textDecorationLine: 'underline' }
});
