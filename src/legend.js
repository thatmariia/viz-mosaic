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
  const markup = [];
  let y = pad;
  function text(x, top, lines, heading = false) {
    return `<text x="${number(x)}" y="${number(top + fontSize)}" fill="#182323"${heading ? ' font-weight="600"' : ''}>${lines.map((line, i) => `<tspan x="${number(x)}" dy="${i ? number(lineHeight) : 0}">${escapeXML(line)}</tspan>`).join('')}</text>`;
  }
  function section(title, items, colorful) {
    if (!items.length) return;
    markup.push(text(pad, y, [title], true));
    let x = pad, rowY = y + lineHeight + gap, rowHeight = 0;
    const prefix = colorful ? swatch + gap : 0;
    const maximum = Math.min(width - pad * 2, fontSize * 22) - prefix;
    for (const item of items) {
      const lines = wrap(item.label, maximum);
      const itemWidth = prefix + Math.max(...lines.map(textWidth));
      if (x > pad && (side || x + itemWidth > width - pad)) {
        rowY += rowHeight + gap; x = pad; rowHeight = 0;
      }
      markup.push(`<g data-legend-label="${escapeXML(item.label)}">${colorful ? `<rect x="${number(x)}" y="${number(rowY + fontSize * 0.2)}" width="${number(swatch)}" height="${number(swatch)}" rx="${number(fontSize * 0.15)}" fill="${item.color}"/>` : ''}${text(x + prefix, rowY, lines)}</g>`);
      rowHeight = Math.max(rowHeight, lines.length * lineHeight);
      x += itemWidth + gap * 2;
    }
    y = rowY + rowHeight + gap * 2;
  }
  section('Categories', legend.categories, true);
  section('Levels', legend.levels, false);
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
    content: `<g data-legend="" transform="translate(${number(x)} ${number(top)})" font-size="${fontSize}" aria-label="Legend">${markup.join('')}</g>`,
  };
}
