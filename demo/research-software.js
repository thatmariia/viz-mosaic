const tools = [
  ['bio.tools', 'bio-tools', 1, 'Tools'],
  ['WorkflowHub', 'workflowhub', 1, 'Workflows'],
  ['Bioconda', 'bioconda', 2, 'Packaging'],
  ['Galaxy', 'galaxy', 2, 'Workflows'],
  ['BioContainers', 'biocontainers', 2, 'Packaging'],
  ['OpenEBench', 'openebench', 1, 'Benchmarking'],
  ['Debian Med', 'debian-med', 2, 'Packaging'],
  ['Bioconductor', 'bioconductor', 1, 'Packaging'],
  ['BIII', 'biii', 2, 'Tools'],
];
let preparedLogos;

async function prepareLogo(slug, center = false) {
  const image = new Image();
  image.src = new URL(`./assets/research-software/${slug}.svg`, import.meta.url).href;
  try { await image.decode(); }
  catch { throw new Error(`Could not load the ${slug} logo.`); }
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = center ? 1024 : 160;
  const context = canvas.getContext('2d');
  const size = canvas.width;
  const scale = size / Math.max(image.naturalWidth, image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  return canvas.toDataURL('image/png');
}

export async function researchSoftwareExample() {
  preparedLogos ??= Promise.all([
    prepareLogo('research-software-ecosystem', true),
    ...tools.map(([, slug]) => prepareLogo(slug)),
  ]).catch(error => { preparedLogos = undefined; throw error; });
  const [centerLogo, ...logos] = await preparedLogos;
  return {
    title: 'ELIXIR Research Software Ecosystem',
    centerLogo,
    components: tools.map(([name, , ring, categoryId], index) => ({ name, ring, categoryId, logo: logos[index] })),
    levelLabels: { 1: 'Deep integration', 2: 'Lightweight integration' },
    categoryColors: [],
  };
}
