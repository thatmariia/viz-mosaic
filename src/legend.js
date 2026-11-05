import { number, escapeXML } from './format.js';

export function layoutLegend(extent, fontSize, legend) {
  const plot = [-extent, -extent, extent * 2, extent * 2];
  if (!legend || !legend.categories.length) return { viewBox: plot, content: '' };
  const side = legend.position === 'left' || legend.position === 'right';
  const width = side ? Math.max(fontSize * 10, Math.min(extent * 1.2, fontSize * 22)) : extent * 2;
  const pad = fontSize, gap = fontSize * 0.5, lineHeight = fontSize * 1.4;
  const swatch = fontSize * 0.8;
  const textWidth = text => Array.from(text).reduce((sum, c) => sum + fontSize * (
    /\p{Mark}/u.test(c) ? 0 : /[ ilI.,'!:;|]/u.test(c) ? 0.35 : /[MWmw@%]|[^\u0000-\u007f]/u.test(c) ? 1.05 : /[A-Z]/u.test(c) ? 0.84 : 0.72
  ), 0);
  function wrap(label, maximum) {
    const lines = [];
    let line = '';
    for (const word of label.trim().split(/\s+/u)) {
      if (textWidth(word) > maximum) {
        if (line) lines.push(line);
        line = '';
        for (const c of word) {
          if (line && textWidth(line + c) > maximum) { lines.push(line); line = ''; }
          line += c;
        }
      } else if (line && textWidth(`${line} ${word}`) > maximum) {
        lines.push(line); line = word;
      } else line += `${line ? ' ' : ''}${word}`;
    }
    if (line) lines.push(line);
    return lines;
  }
  const prefix = swatch + gap, available = width - pad * 2;
  const maximum = Math.min(available, fontSize * 22) - prefix;
  const items = legend.categories.map(item => ({ ...item, lines: wrap(item.label, maximum) }));
  const cellWidth = Math.min(available, prefix + Math.max(...items.flatMap(item => item.lines.map(textWidth))));
  const capacity = side ? 1 : Math.max(1, Math.floor((available + gap * 2) / (cellWidth + gap * 2)));
  const rows = Math.ceil(items.length / capacity), columns = Math.ceil(items.length / rows);
  const markup = [`<text x="${number(side ? pad : width / 2)}" y="${number(pad + fontSize)}" fill="#182323" font-weight="600"${side ? '' : ' text-anchor="middle"'}>Categories</text>`];
  let y = pad + lineHeight + gap;
  for (let row = 0; row < rows; row++) {
    const cells = items.slice(row * columns, (row + 1) * columns);
    const rowWidth = cells.length * cellWidth + (cells.length - 1) * gap * 2;
    let x = side ? pad : (width - rowWidth) / 2;
    for (const item of cells) {
      const textX = number(x + prefix);
      markup.push(`<g data-legend-label="${escapeXML(item.label)}"><rect x="${number(x)}" y="${number(y + fontSize * 0.2)}" width="${number(swatch)}" height="${number(swatch)}" rx="${number(fontSize * 0.15)}" fill="${item.color}"/><text x="${textX}" y="${number(y + fontSize)}" fill="#182323">${item.lines.map((line, i) => `<tspan x="${textX}" dy="${i ? number(lineHeight) : 0}">${escapeXML(line)}</tspan>`).join('')}</text></g>`);
      x += cellWidth + gap * 2;
    }
    y += Math.max(...cells.map(item => item.lines.length)) * lineHeight + gap;
  }
  const height = y + pad - gap;
  let x = -extent, top = extent + gap, viewBox;
  if (side) {
    const totalHeight = Math.max(plot[3], height);
    x = legend.position === 'right' ? extent + gap : -extent - gap - width;
    top = -height / 2;
    viewBox = [Math.min(-extent, x), -totalHeight / 2, plot[2] + gap + width, totalHeight];
  } else {
    if (legend.position === 'top') top = -extent - gap - height;
    viewBox = [-extent, Math.min(-extent, top), plot[2], plot[3] + gap + height];
  }
  return {
    viewBox,
    content: `<g data-legend="" transform="translate(${number(x)} ${number(top)})" font-size="${fontSize}" aria-label="Categories legend">${markup.join('')}</g>`,
  };
}
