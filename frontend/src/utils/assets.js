/**
 * Rasmlarni xavfsiz yuklash.
 * `src/assets/` ichida logo.png / doctor.png bo‘lsa — ishlatiladi.
 * Fayl yo‘q bo‘lsa sayt buzilmaydi: komponentlar o‘rniga chiroyli zaxira (placeholder) ko‘rsatadi.
 * .png, .jpg, .jpeg, .webp formatlari qo‘llab-quvvatlanadi.
 */
const files = import.meta.glob('../assets/*.{png,jpg,jpeg,webp,svg}', { eager: true, import: 'default' });

function findAsset(name) {
  for (const ext of ['png', 'webp', 'jpg', 'jpeg', 'svg']) {
    const url = files[`../assets/${name}.${ext}`];
    if (url) return url;
  }
  return null;
}

export const logoUrl = findAsset('logo');
export const doctorUrl = findAsset('doctor');
