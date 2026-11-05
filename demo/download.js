/** Browser-only raster conversion keeps the core renderer synchronous and DOM-free. */
export async function downloadDiagram(svg, format) {
  const mime = { svg: 'image/svg+xml;charset=utf-8', png: 'image/png', jpeg: 'image/jpeg' }[format];
  if (!mime) throw new Error('Choose SVG, PNG, or JPEG.');
  let blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  if (format !== 'svg') {
    const source = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = source;
      await image.decode();
      const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const [, , width, height] = parsed.documentElement.getAttribute('viewBox').split(' ').map(Number);
      const scale = Math.min(2, 4096 / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const context = canvas.getContext('2d');
      if (format === 'jpeg') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      blob = await new Promise(resolve => canvas.toBlob(resolve, mime, 0.95));
      if (!blob) throw new Error('The browser could not export this image. Try downloading SVG.');
    } finally { URL.revokeObjectURL(source); }
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `viz-mosaic.${format === 'jpeg' ? 'jpg' : format}`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
