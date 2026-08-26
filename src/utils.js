export const getWearFromFloat = (floatVal) => {
  if (floatVal < 0.07) return 'Factory New';
  if (floatVal < 0.15) return 'Minimal Wear';
  if (floatVal < 0.38) return 'Field-Tested';
  if (floatVal < 0.45) return 'Well-Worn';
  return 'Battle-Scarred';
};

export const generateMockPrice = (rarityName, floatVal, isStatTrak) => {
  let basePrice = 0.5;
  const name = (rarityName || '').toLowerCase();

  if (name.includes('consumer')) basePrice = 0.1;
  else if (name.includes('industrial')) basePrice = 0.3;
  else if (name.includes('mil-spec') || name.includes('mavi') || name.includes('blue')) basePrice = 1.5;
  else if (name.includes('restricted') || name.includes('mor') || name.includes('purple')) basePrice = 5.0;
  else if (name.includes('classified') || name.includes('pembe') || name.includes('pink')) basePrice = 20.0;
  else if (name.includes('covert') || name.includes('kırmızı') || name.includes('red')) basePrice = 60.0;
  else if (name.includes('rare') || name.includes('altın') || name.includes('gold')) basePrice = 300.0;
  else basePrice = 1.0;

  let wearMultiplier = 1.0;
  if (floatVal < 0.07) wearMultiplier = 2.5;
  else if (floatVal < 0.15) wearMultiplier = 1.5;
  else if (floatVal < 0.38) wearMultiplier = 1.0;
  else if (floatVal < 0.45) wearMultiplier = 0.8;
  else wearMultiplier = 0.6;

  let finalPrice = basePrice * wearMultiplier;
  if (isStatTrak) finalPrice *= 1.8;

  const randomVariance = 0.85 + (Math.random() * 0.30);
  finalPrice *= randomVariance;

  return parseFloat(finalPrice.toFixed(2));
};

// Beklenen değeri (Average Price) sabit olarak hesaplamak için varyanssız versiyon
export const getExpectedPrice = (rarityName) => {
  // Ortalama bir float varsayalım (FT = 0.25)
  const avgFloat = 0.25; 
  // StatTrak şansı %10 olduğu için fiyata beklenen değer katkısı eklenir
  let basePrice = generateMockPrice(rarityName, avgFloat, false);
  let stPrice = generateMockPrice(rarityName, avgFloat, true);
  return (basePrice * 0.9) + (stPrice * 0.1);
};

export const generateFloat = (min = 0, max = 1) => {
  return min + Math.random() * (max - min);
};

// NOT: calculateCaseStats artık src/prices.js içinde — canlı fiyatları da
// kullanabilmesi için oraya taşındı (ByMykel skin verisiyle birlikte).
