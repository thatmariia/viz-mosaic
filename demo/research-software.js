import { readImage } from './images.js';

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

async function prepareLogo(slug) {
  const url = new URL(`./assets/research-software/${slug}.svg`, import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load the ${slug} logo.`);
  return readImage(await response.blob());
}

export async function researchSoftwareExample() {
  preparedLogos ??= Promise.all([
    prepareLogo('research-software-ecosystem'),
    ...tools.map(([, slug]) => prepareLogo(slug)),
  ]).catch(error => { preparedLogos = undefined; throw error; });
  const [centerLogo, ...logos] = await preparedLogos;
  return {
    title: 'ELIXIR Research Software Ecosystem',
    centerLogo,
    components: tools.map(([name, , ring, categoryId], index) => ({ name, ring, categoryId, logo: logos[index] })),
    categoryColors: [],
  };
}
