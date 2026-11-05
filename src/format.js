export const number = value => Number(value.toFixed(4));
export const escapeXML = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[c]);
