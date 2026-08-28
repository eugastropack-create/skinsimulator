import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { useI18n } from './i18n';
import { GUIDE, GUIDE_SECTIONS } from './content/guide';
import { C, shadow, webTransition } from './theme';

// ============================================================
// REHBER / BLOG EKRANI — SEMANTİK HTML
// ============================================================
// AMAÇ: Google AdSense'in içerik gereksinimlerini karşılamak — yüksek
// metin/HTML oranı ve gerçek semantik etiketler.
//
// ⚠️ NASIL GERÇEK <article>/<h1>/<p> ÜRETİYORUZ:
// react-native-web, `role` prop'unu DOM etiketine çevirir
// (propsToAccessibilityComponent). Doğrulanan eşlemeler:
//     role="main"        -> <main>
//     role="article"     -> <article>
//     role="region"      -> <section>
//     role="heading" + aria-level={n} -> <h1>..<h6>
//     role="paragraph"   -> <p>
//     role="list"/"listitem" -> <ul>/<li>
//     role="contentinfo" -> <footer>
//     role="navigation"  -> <nav>
// Yani <View>/<Text> kullanmaya devam ederken çıktı GERÇEKTEN semantiktir;
// tarama motorları ve reklam denetimleri düz <div> yığını görmez.
//
// ⚠️ Bu rol adlarını "daha okunur" diye değiştirmeyin (`role="section"` gibi
// bir eşleme YOKTUR — sessizce <div> üretir ve semantik kaybolur).

// Blok modelini semantik elemanlara çeviren tek yer.
function Block({ block }) {
  if (block.type === 'h3') {
    return <Text role="heading" aria-level={3} style={s.h3}>{block.text}</Text>;
  }
  if (block.type === 'ul') {
    return (
      <View role="list" style={s.ul}>
        {block.items.map((it, i) => (
          <Text key={i} role="listitem" style={s.li}>• {it}</Text>
        ))}
      </View>
    );
  }
  return <Text role="paragraph" style={s.p}>{block.text}</Text>;
}

export default function BlogScreen({ initialSection = 'about' }) {
  const { t, lang } = useI18n();
  const { width } = useWindowDimensions();
  const [active, setActive] = useState(initialSection);

  // Dil değişince içerik de değişir — metinler `GUIDE[lang]`ten gelir.
  const copy = useMemo(() => GUIDE[lang] || GUIDE.en, [lang]);
  const section = copy[active] || copy.about;

  const isWide = width >= 900;

  const nav = (
    <View role="navigation" style={[s.nav, isWide ? s.navSide : s.navTop]}>
      {GUIDE_SECTIONS.map(sec => {
        const on = sec.id === active;
        return (
          <TouchableOpacity
            key={sec.id}
            style={[s.navBtn, on && s.navBtnOn, webTransition('background-color', 140)]}
            onPress={() => setActive(sec.id)}
          >
            <Text style={s.navIcon}>{sec.icon}</Text>
            <Text style={[s.navTxt, on && s.navTxtOn]} numberOfLines={1}>
              {copy[sec.id].title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View role="main" style={s.root}>
      {isWide && nav}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll}>
        {!isWide && nav}

        {/* Sayfa başlığı — tek <h1> */}
        <Text role="heading" aria-level={1} style={s.h1}>{copy.pageTitle}</Text>
        <Text role="paragraph" style={s.lead}>{copy.pageLead}</Text>
        <Text style={s.updated}>{copy.updated}</Text>

        {/* Asıl içerik — her bölüm kendi <article>'ı */}
        <View role="article" style={s.article}>
          <Text role="heading" aria-level={2} style={s.h2}>{section.title}</Text>
          {section.blocks.map((b, i) => <Block key={i} block={b} />)}
        </View>

        {/* Alt bilgi — AdSense'in beklediği standart bağlantılar */}
        <View role="contentinfo" style={s.footer}>
          <View style={s.footerLinks}>
            <TouchableOpacity onPress={() => setActive('privacy')}>
              <Text style={s.footerLink}>{t('footer.privacy')}</Text>
            </TouchableOpacity>
            <Text style={s.footerSep}>·</Text>
            <TouchableOpacity onPress={() => setActive('contact')}>
              <Text style={s.footerLink}>{t('footer.contact')}</Text>
            </TouchableOpacity>
            <Text style={s.footerSep}>·</Text>
            <TouchableOpacity onPress={() => setActive('about')}>
              <Text style={s.footerLink}>{t('footer.about')}</Text>
            </TouchableOpacity>
          </View>
          <Text role="paragraph" style={s.footerNote}>{t('disclaimer.notAffiliated')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },

  nav: { gap: 4 },
  navSide: { width: 250, padding: 16, borderRightWidth: 1, borderRightColor: C.border, backgroundColor: C.surfaceAlt },
  navTop: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 22 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  navBtnOn: { backgroundColor: C.accentSoft },
  navIcon: { fontSize: 14 },
  navTxt: { color: C.textSoft, fontSize: 12.5, fontWeight: '700', flexShrink: 1 },
  navTxtOn: { color: C.accentDeep, fontWeight: '800' },

  scroll: { padding: 26, paddingBottom: 60, maxWidth: 860, width: '100%', alignSelf: 'center' },

  // Tipografi — uzun metin için okunabilirliğe göre ayarlandı
  h1: { color: C.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.6, marginBottom: 12 },
  lead: { color: C.textSoft, fontSize: 15, lineHeight: 24 },
  updated: { color: C.textFaint, fontSize: 11, marginTop: 10, marginBottom: 26 },

  article: { backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 26 },
  h2: { color: C.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.3, marginBottom: 16 },
  h3: { color: C.text, fontSize: 15, fontWeight: '800', marginTop: 22, marginBottom: 8 },
  // lineHeight uzun paragraflarda kritik: 1.7 civarı satır aralığı, ekranda
  // uzun metni gözle takip etmeyi belirgin şekilde kolaylaştırır.
  p: { color: C.textSoft, fontSize: 14, lineHeight: 24, marginBottom: 12 },
  ul: { marginTop: 4, marginBottom: 12, gap: 6 },
  li: { color: C.textSoft, fontSize: 14, lineHeight: 22, paddingLeft: 4 },

  footer: { marginTop: 30, paddingTop: 18, borderTopWidth: 1, borderTopColor: C.border, alignItems: 'center' },
  footerLinks: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  footerLink: { color: C.accentDeep, fontSize: 12.5, fontWeight: '700' },
  footerSep: { color: C.textFaint, fontSize: 12 },
  footerNote: { color: C.textFaint, fontSize: 10.5, lineHeight: 16, textAlign: 'center', marginTop: 12, maxWidth: 600 }
});
