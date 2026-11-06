export async function readImage(file, allowSVG = false) {
  const types = allowSVG ? ['image/png', 'image/jpeg', 'image/svg+xml'] : ['image/png', 'image/jpeg'];
  if (!types.includes(file.type)) throw new Error(`Choose ${allowSVG ? 'an SVG, PNG, or JPEG' : 'a PNG or JPEG'} image.`);
  if (file.type === 'image/svg+xml') {
    const parsed = new DOMParser().parseFromString(await file.text(), 'image/svg+xml');
    if (parsed.querySelector('parsererror') || parsed.documentElement.localName !== 'svg' || parsed.documentElement.namespaceURI !== 'http://www.w3.org/2000/svg') {
      throw new Error('The selected file is not a readable SVG image.');
    }
  }
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.readAsDataURL(file);
  });
  const image = new Image();
  image.src = data;
  await image.decode().catch(() => { throw new Error('The selected file is not a readable image.'); });
  return data;
}
