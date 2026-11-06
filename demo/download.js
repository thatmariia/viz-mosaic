/** Browser-only raster conversion keeps the core renderer synchronous and DOM-free. */
export async function downloadDiagram(svg, format) {
  const mime = { svg: 'image/svg+xml;charset=utf-8', png: 'image/png', jpeg: 'image/jpeg' }[format];
  if (!mime) throw new Error('Choose SVG, PNG, or JPEG.');
  let blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  if (format !== 'svg') {
    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const root = parsed.documentElement;
    const [, , width, height] = root.getAttribute('viewBox').split(/\s+/).map(Number);
    const scale = 6000 / Math.max(width, height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    // Give the SVG its final pixel dimensions before decoding, so vector images
    // and filters render at export resolution rather than a small intrinsic size.
    root.setAttribute('width', canvas.width);
    root.setAttribute('height', canvas.height);
    const source = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const image = new Image();
      image.src = source;
      await image.decode();
      const context = canvas.getContext('2d');
      context.imageSmoothingQuality = 'high';
      if (format === 'jpeg') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(image, 0, 0);
      blob = await new Promise(resolve => canvas.toBlob(resolve, mime, 1));
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
