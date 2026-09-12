import { getDayzItemCatalog as getStaticDayzItemCatalog } from '../data/dayzItemCatalog.js';

const OFFICIAL_TYPES_URLS = [
  'https://raw.githubusercontent.com/BohemiaInteractive/DayZ-Central-Economy/master/dayzOffline.chernarusplus/db/types.xml',
  'https://raw.githubusercontent.com/BohemiaInteractive/DayZ-Central-Economy/master/dayzOffline.enoch/db/types.xml',
  'https://raw.githubusercontent.com/BohemiaInteractive/DayZ-Central-Economy/master/dayzOffline.sakhal/db/types.xml'
];

let remoteCache = { expires: 0, items: [] };

function cleanClassname(value) {
  return String(value || '').trim().replace(/[^A-Za-z0-9_]/g, '').slice(0, 120);
}

function humanizeClassname(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\bMag\b/g, 'Magazine')
    .replace(/\bAmmoBox\b/g, 'Caixa de munição')
    .replace(/\bAmmo\b/g, 'Munição')
    .replace(/\s+/g, ' ')
    .trim();
}

function guessCategory(classname) {
  const c = String(classname || '').toLowerCase();
  if (/truck|hatchback|sedan|offroad|niva|civsedan|vehicle|wheel|door|hood|trunk|battery|radiator|sparkplug|tire|car/.test(c)) return 'Veículos / Peças';
  if (/jacket|pants|shirt|boots|shoes|gloves|helmet|hat|cap|mask|vest|bag|backpack|belt|holster|gorka|hunting|police|firefighter|paramedic|ttsko|ballistic|platecarrier|armband/.test(c)) return 'Roupas / Trajes';
  if (/m4|ak|aug|fal|svd|vss|val|mosin|sks|cz|winchester|izh|shotgun|rifle|pistol|glock|fnx|deagle|magnum|longhorn|ump|mp5|bizon|crossbow|weapon|suppressor|optic|buttstock|hndgrd|handguard|bayonet|mag_|ammo/.test(c)) return 'Armas / Acessórios';
  if (/nail|plank|log|lock|wire|barrel|crate|tent|chest|generator|cable|camonet|flag|fence|watchtower|territory|metalplate/.test(c)) return 'Construção / Base';
  if (/axe|hatchet|shovel|pickaxe|pliers|hacksaw|wrench|crowbar|hammer|screwdriver|stone|kit|ducttape|sewing|repair|epoxy|knife|machete|hoe|broom/.test(c)) return 'Ferramentas';
  if (/can|food|meat|steak|apple|pear|plum|pepper|potato|pumpkin|mushroom|rice|cereal|milk|soda|water|canteen|bottle|zagorky|beans|peaches|sardines|spaghetti|bacon|tuna/.test(c)) return 'Comida / Bebida';
  if (/bandage|rag|saline|blood|morphine|epinephrine|tetracycline|vitamin|charcoal|medical|antidote|iodine|disinfect|thermometer/.test(c)) return 'Medicina';
  if (/animal|pelt|leather|seed|hook|worm|fishing|net|trap/.test(c)) return 'Caça / Craft';
  return 'Geral DayZ';
}

function imageUrlFor(item) {
  const type = encodeURIComponent(item.classname || '');
  const name = encodeURIComponent(item.name || item.classname || '');
  return `/dayz-wiki-image?type=${type}&name=${name}`;
}

function normalizeCatalogItem(raw, source = 'Catálogo local') {
  const classname = cleanClassname(raw.classname || raw.type || raw.name);
  if (!classname) return null;
  const name = String(raw.name || '').trim() || humanizeClassname(classname);
  const category = raw.category || guessCategory(classname);
  return {
    name,
    classname,
    category,
    imageUrl: imageUrlFor({ name, classname }),
    fallbackImageUrl: null,
    wikiImageUrl: `https://dayz.fandom.com/wiki/Special:Search?query=${encodeURIComponent(classname)}`,
    source
  };
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RAIDZStore/1.0 (+catalogo oficial DayZ)' },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function parseTypesXml(xml, sourceName) {
  const out = [];
  const re = /<type\s+name=["']([^"']+)["'][^>]*>/g;
  let match;
  while ((match = re.exec(xml))) {
    const classname = cleanClassname(match[1]);
    if (!classname) continue;
    out.push(normalizeCatalogItem({ classname }, sourceName));
  }
  return out.filter(Boolean);
}

async function loadRemoteOfficialTypes() {
  if (remoteCache.expires > Date.now()) return remoteCache.items;
  const items = [];
  for (const url of OFFICIAL_TYPES_URLS) {
    try {
      const xml = await fetchText(url);
      const mapName = url.includes('enoch') ? 'Livonia' : url.includes('sakhal') ? 'Sakhal' : 'Chernarus';
      items.push(...parseTypesXml(xml, `Bohemia DayZ Central Economy • ${mapName}`));
    } catch (_) {
      // Mantém catálogo local se GitHub/Internet falhar no deploy.
    }
  }
  remoteCache = { expires: Date.now() + 1000 * 60 * 60 * 12, items };
  return items;
}

export async function getFullDayzItemCatalog() {
  const local = getStaticDayzItemCatalog().map(item => normalizeCatalogItem(item, item.source || 'Catálogo local')).filter(Boolean);
  const remote = await loadRemoteOfficialTypes();
  const byClass = new Map();
  for (const item of [...local, ...remote]) {
    const key = String(item.classname || '').toLowerCase();
    if (!key) continue;
    if (!byClass.has(key)) byClass.set(key, item);
    else {
      const current = byClass.get(key);
      byClass.set(key, {
        ...current,
        name: current.name || item.name,
        category: current.category === 'Geral DayZ' ? item.category : current.category,
        source: String(current.source || '').includes('Bohemia') ? current.source : `${current.source} + ${item.source}`
      });
    }
  }
  return [...byClass.values()].sort((a, b) => String(a.category).localeCompare(String(b.category), 'pt-BR') || String(a.name).localeCompare(String(b.name), 'pt-BR'));
}
