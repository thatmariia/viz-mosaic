const fonts = new Map();

export async function loadFont(id, family) {
  if (fonts.has(id)) return fonts.get(id);
  const response = await fetch(new URL(`./assets/fonts/${id}.woff2`, import.meta.url));
  if (!response.ok) throw new Error('Font download failed.');

  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const source = `data:font/woff2;base64,${btoa(binary)}`;
  const face = await new FontFace(family, bytes, { weight: '500 600' }).load();
  document.fonts.add(face);

  const font = { id, family, source };
  fonts.set(id, font);
  return font;
}
