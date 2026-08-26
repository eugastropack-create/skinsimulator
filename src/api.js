export const fetchCrates = async () => {
  try {
    const response = await fetch('https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json');
    const data = await response.json();
    return data.filter(crate => crate.type === "Case");
  } catch (error) {
    console.error("Kasalar çekilirken hata:", error);
    return [];
  }
};

export const fetchSkins = async () => {
  try {
    const response = await fetch('https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json');
    return await response.json();
  } catch (error) {
    console.error("Skinler çekilirken hata:", error);
    return [];
  }
};

export const fetchCollections = async () => {
  try {
    const response = await fetch('https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/collections.json');
    return await response.json();
  } catch (error) {
    console.error("Koleksiyonlar çekilirken hata:", error);
    return [];
  }
};
