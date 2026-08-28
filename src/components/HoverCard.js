import React, { useState } from 'react';
import { TouchableOpacity, Platform } from 'react-native';
import { shadow, webTransition } from '../theme';

// ============================================================
// HOVER KARTI — "3D olarak hafifçe yukarı kalkan pürüzsüz kart"
// ============================================================
// Tüm liste kartları (kasa, terminal, souvenir, sticker, koleksiyon) bunu
// kullanır; böylece hover davranışı TEK yerde tanımlı kalır.
//
// NEDEN Animated DEĞİL: Hover bir "sürekli" etkileşim; her mouse hareketinde
// bir Animated döngüsü başlatmak/yarıda kesmek hem pahalı hem de titrek. Web'de
// gerçek CSS transition kullanmak (bkz. theme.webTransition) hem daha akıcı hem
// de arka plan sekmelerinde donan requestAnimationFrame sorununa yakalanmıyor.
//
// ⚠️ PLATFORM TUZAĞI: `onMouseEnter/onMouseLeave` react-native-web'de çalışır
// ama NATIVE'de YOKTUR. Native'de kart daima "dinlenme" hâlinde kalır — bu
// kasıtlı: dokunmatik cihazda hover diye bir şey yok.
export default function HoverCard({ style, hoverStyle, children, lift = -6, ...props }) {
  const [hovered, setHovered] = useState(false);
  const isWeb = Platform.OS === 'web';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      {...props}
      onMouseEnter={isWeb ? () => setHovered(true) : undefined}
      onMouseLeave={isWeb ? () => setHovered(false) : undefined}
      style={[
        style,
        shadow.card,
        webTransition('transform, box-shadow, border-color', 190),
        hovered && shadow.cardHover,
        hovered && { transform: [{ translateY: lift }] },
        hovered && hoverStyle
      ]}
    >
      {children}
    </TouchableOpacity>
  );
}
