// V53: resolvedor de imagem real mais forte e seguro.
// Ele tenta várias fontes da Wiki/Fandom/Gamepedia, cacheia em memória, evita chamadas duplicadas
// e nunca usa imagem artificial de item. Se não achar imagem real, usa /images/no-real-image.svg.

const imageCache = new Map();
const pendingResolves = new Map();

const NO_REAL_IMAGE = '/images/no-real-image.svg';
const TWO_WEEKS = 1000 * 60 * 60 * 24 * 14;
const TWO_DAYS = 1000 * 60 * 60 * 24 * 2;

const PAGE_HINTS = {
  // Construção / base
  NailBox: 'Nails', Nails: 'Nails', Nail: 'Nails', WoodenPlank: 'Wooden Plank', WoodenLog: 'Wooden Log',
  CodeLock: 'Combination Lock', CombinationLock: 'Combination Lock', MetalWire: 'Metal Wire', BarbedWire: 'Barbed Wire',
  CamoNet: 'Camouflage Net', Camonet: 'Camouflage Net', MetalPlate: 'Metal Plate', PowerGenerator: 'Power Generator',
  CableReel: 'Cable Reel', LargeTent: 'Large Tent', MediumTent: 'Medium Tent', PartyTent_Blue: 'Party Tent',
  SeaChest: 'Sea Chest', WoodenCrate: 'Wooden Crate', Barrel_Red: 'Oil Barrel', Barrel_Blue: 'Oil Barrel',
  Barrel_Green: 'Oil Barrel', Barrel_Yellow: 'Oil Barrel', GunRack: 'Gun Rack', Flag_White: 'Flag', Flag_Black: 'Flag',

  // Ferramentas
  Hatchet: 'Hatchet', Hacksaw: 'Hacksaw', Shovel: 'Shovel', Hammer: 'Hammer', Pliers: 'Pliers',
  Screwdriver: 'Screwdriver', SharpeningStone: 'Sharpening Stone', SledgeHammer: 'Sledgehammer',
  Pickaxe: 'Pickaxe', Crowbar: 'Crowbar', Wrench: 'Wrench', DuctTape: 'Duct Tape', EpoxyPutty: 'Epoxy Putty',
  LeatherSewingKit: 'Leather Sewing Kit', SewingKit: 'Sewing Kit', ElectronicRepairKit: 'Electrical Repair Kit',

  // Suprimentos
  WaterBottle: 'Water Bottle', Canteen: 'Canteen', BandageDressing: 'Bandage', Rag: 'Rags',
  HuntingKnife: 'Hunting Knife', KitchenKnife: 'Kitchen Knife', CanOpener: 'Can Opener', Matchbox: 'Matches',
  Compass: 'Compass', Binoculars: 'Binoculars', Roadflare: 'Road Flare', Chemlight_Red: 'Glow Stick',

  // Veículos / peças
  Truck_01_Covered: 'M3S', Truck_01_Covered_Blue: 'M3S', Truck_01_Covered_Orange: 'M3S',
  Truck_01_Wheel: 'M3S Wheel', Truck_01_WheelDouble: 'M3S Wheel', OffroadHatchback: 'Ada 4x4',
  CivilianSedan: 'Olga 24', Hatchback_02: 'Gunter 2', Sedan_02: 'Sarka 120', HatchbackWheel: 'Ada 4x4 Wheel',
  Hatchback_02_Wheel: 'Gunter 2 Wheel', Sedan_02_Wheel: 'Sarka 120 Wheel', CivSedanWheel: 'Olga 24 Wheel',
  CarRadiator: 'Car Radiator', CarBattery: 'Car Battery', TruckBattery: 'Truck Battery', SparkPlug: 'Spark Plug',
  TireRepairKit: 'Tire Repair Kit', CanisterGasoline: 'Jerrycan',

  // Armas conhecidas / nomes da Wiki
  M4A1: 'M4-A1', AKM: 'KA-M', AK74: 'KA-74', AKS74U: 'KAS-74U', FAL: 'LAR', SVD: 'VSD', VSS: 'VSS', ASVAL: 'ASVAL',
  Winchester70: 'M70 Tundra', CZ527: 'CR-527', CZ550: 'CR-550 Savanna', Izh18: 'BK-18', Izh43Shotgun: 'BK-43',
  MakarovIJ70: 'IJ-70', Glock19: 'Mlock-91', FNX45: 'FX-45', UMP45: 'USG-45', MP5K: 'SG5-K', Saiga: 'Vaiga',
  B95: 'Blaze', Aug: 'AUR A1', AugShort: 'AUR AX', Deagle: 'Deagle', Magnum: 'Magnum', Longhorn: 'Longhorn',
  Sporter22: 'Sporter 22', SKS: 'SK 59/66', Mosin9130: 'Mosin 91/30',

  // Roupas comuns
  PlateCarrierVest: 'Plate Carrier', BallisticHelmet_Black: 'Ballistic Helmet', TacticalGloves_Black: 'Tactical Gloves',
  BalaclavaMask_Black: 'Balaclava', AssaultBag_Black: 'Assault Backpack', AliceBag_Black: 'Field Backpack',
  HunterJacket_Brown: 'Hunter Jacket', HunterPants_Brown: 'Hunter Pants', WorkingBoots_Black: 'Working Boots'
};

const COLOR_WORDS = /\b(black|green|red|blue|white|brown|grey|gray|yellow|orange|camo|olive|tan|autumn|summer|winter|spring|flat|pink|beige|dark|light|lime|navy|wine)\b/gi;

function clean(value) {
  return String(value || '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(COLOR_WORDS, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function localNoImage() {
  return NO_REAL_IMAGE;
}

function makeKey(type, name) {
  return `${String(type || '').toLowerCase()}::${String(name || '').toLowerCase()}`;
}

function isGoodImage(url) {
  if (!url) return false;
  const u = String(url).replace(/&amp;/g, '&').trim();
  if (!/^https:\/\//i.test(u)) return false;
  if (/\.svg($|\?)/i.test(u)) return false;
  if (/logo|wordmark|favicon|community-header|site-logo|placeholder|avatar|icons\/wikia|default_avatar|sprite/i.test(u)) return false;
  if (!/\.(png|jpg|jpeg|webp)(\?|$)/i.test(u) && !/static\.wikia|nocookie|fandom|gamepedia|static\.wiki/i.test(u)) return false;
  return true;
}

function unique(values) {
  return [...new Set(values.map(v => String(v || '').trim()).filter(Boolean))];
}

function deaccent(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function stripProductWords(value) {
  return String(value || '')
    .replace(/^Doa[cç][aã]o\s+/i, '')
    .replace(/^Kit\s+/i, '')
    .replace(/\bN[ií]vel\s+\d+.*$/i, '')
    .replace(/\bR\$\s*\d+[\d,.]*\b/gi, '')
    .trim();
}

function weaponAttachmentGuesses(cls) {
  const c = String(cls || '');
  const out = [];
  if (/^M4_/i.test(c)) {
    out.push('M4-A1');
    if (/Bttstck|Butt/i.test(c)) out.push('M4-A1 Buttstock', 'M4-A1 CQB Buttstock', 'M4-A1 MP Buttstock', 'M4-A1 OE Buttstock');
    if (/Hndgrd|Handguard/i.test(c)) out.push('M4-A1 Handguard', 'M4-A1 Polymer Handguard', 'M4-A1 Rail Handguard', 'M4-A1 RIS Handguard');
  }
  if (/^AK/i.test(c) && /Wood/i.test(c)) out.push('KA Wooden Buttstock', 'KA Wooden Handguard');
  if (/^AK/i.test(c) && /Plastic/i.test(c)) out.push('KA Polymer Buttstock', 'KA Polymer Handguard');
  if (/Mag_/i.test(c)) out.push(clean(c.replace(/^Mag_?/i, '').replace(/_\d+Rnd/i, ' Magazine')), 'Magazine');
  if (/AmmoBox/i.test(c)) out.push(clean(c.replace(/AmmoBox/i, 'Ammo Box')));
  if (/Ammo_/i.test(c)) out.push(clean(c.replace(/^Ammo_?/i, '').replace(/_?Tracer/i, ' Tracer')));
  if (/Optic|Scope|Sight/i.test(c)) out.push(clean(c), 'Optics');
  if (/Suppressor/i.test(c)) out.push(clean(c), 'Suppressor');
  return out;
}

function titleVariants(value) {
  const raw = String(value || '').trim();
  const cleaned = clean(raw);
  return unique([
    raw,
    deaccent(raw),
    cleaned,
    deaccent(cleaned),
    raw.replace(/_/g, '-'),
    raw.replace(/_/g, ' '),
    cleaned.replace(/\bMag\b/i, 'Magazine'),
    cleaned.replace(/\bAmmoBox\b/i, 'Ammo Box'),
    cleaned.replace(/\bHndgrd\b/i, 'Handguard'),
    cleaned.replace(/\bBttstck\b/i, 'Buttstock'),
    cleaned.replace(/\bWheel\b/i, 'Wheel')
  ]).filter(v => v.length >= 2);
}

function candidateTitles(type, name) {
  const cls = String(type || '').trim();
  const label = String(name || '').trim();
  const out = [];
  if (PAGE_HINTS[cls]) out.push(PAGE_HINTS[cls]);
  out.push(...weaponAttachmentGuesses(cls));
  if (label) out.push(stripProductWords(label), label);
  if (cls) out.push(...titleVariants(cls));
  if (label) out.push(...titleVariants(label));
  if (cls.includes('_')) out.push(clean(cls.split('_')[0]));
  // A Fandom costuma indexar melhor em inglês.
  out.push(cls.replace(/_/g, ' '));
  return unique(out).slice(0, 24);
}

async function fetchText(url, timeout = 7500) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'RAIDZStore/1.0 (+DayZ store admin image resolver)',
      'Accept': 'text/html,application/json,image/avif,image/webp,*/*'
    },
    signal: AbortSignal.timeout(timeout)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function fetchJson(url, timeout = 7500) {
  const text = await fetchText(url, timeout);
  return JSON.parse(text);
}

function imageFromPages(json) {
  const pages = json?.query?.pages || {};
  for (const page of Object.values(pages)) {
    const candidates = [page?.thumbnail?.source, page?.original?.source, page?.pageimage];
    for (const img of candidates) if (isGoodImage(img)) return String(img).replace(/&amp;/g, '&');
  }
  return null;
}

async function pageImageForTitle(apiBase, title) {
  const url = `${apiBase}/api.php?action=query&format=json&origin=*&redirects=1&prop=pageimages&piprop=thumbnail|original&pithumbsize=900&titles=${encodeURIComponent(title)}`;
  const json = await fetchJson(url);
  return imageFromPages(json);
}

async function generatorSearchImage(apiBase, query) {
  const searches = unique([query, `${query} DayZ`, `"${query}"`]);
  for (const search of searches) {
    const url = `${apiBase}/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=0&gsrlimit=8&gsrsearch=${encodeURIComponent(search)}&prop=pageimages&piprop=thumbnail|original&pithumbsize=900`;
    const json = await fetchJson(url).catch(() => null);
    const img = imageFromPages(json);
    if (img) return img;
  }
  return null;
}

async function openSearchTitle(apiBase, query) {
  const url = `${apiBase}/api.php?action=opensearch&format=json&origin=*&limit=8&search=${encodeURIComponent(query)}`;
  const json = await fetchJson(url);
  const titles = Array.isArray(json?.[1]) ? json[1] : [];
  return titles.find(Boolean) || null;
}

async function restSummaryImage(apiBase, title) {
  const url = `${apiBase}/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  const json = await fetchJson(url).catch(() => null);
  const img = json?.thumbnail?.source || json?.originalimage?.source;
  return isGoodImage(img) ? String(img).replace(/&amp;/g, '&') : null;
}

function extractImagesFromHtml(html) {
  const candidates = [];
  const patterns = [
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/gi,
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/gi,
    /<img[^>]+class=["'][^"']*(?:pi-image-thumbnail|thumbimage|result-thumbnail|image)[^"']*["'][^>]+src=["']([^"']+)["']/gi,
    /<img[^>]+src=["']([^"']+static\.wikia\.nocookie\.net[^"']+)["']/gi,
    /data-src=["']([^"']+static\.wikia\.nocookie\.net[^"']+)["']/gi
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(html))) candidates.push(m[1]);
  }
  for (let img of candidates) {
    img = String(img || '').replace(/&amp;/g, '&');
    if (img.startsWith('//')) img = `https:${img}`;
    if (isGoodImage(img)) return img;
  }
  return null;
}

async function scrapeOgImage(apiBase, title) {
  const url = `${apiBase}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  const html = await fetchText(url).catch(() => '');
  return extractImagesFromHtml(html);
}

async function scrapeSearchPageImage(apiBase, query) {
  const urls = [
    `${apiBase}/wiki/Special:Search?query=${encodeURIComponent(query)}`,
    `${apiBase}/wiki/Special:Search?search=${encodeURIComponent(query)}`
  ];
  for (const url of urls) {
    const html = await fetchText(url).catch(() => '');
    const img = extractImagesFromHtml(html);
    if (img) return img;
  }
  return null;
}

async function unifiedSearchSuggestion(apiBase, query) {
  const url = `${apiBase}/wikia.php?controller=UnifiedSearchSuggestions&method=getSuggestions&query=${encodeURIComponent(query)}&scope=internal&limit=8`;
  const json = await fetchJson(url).catch(() => null);
  const items = json?.suggestions || json?.items || json?.results || [];
  for (const item of items) {
    const img = item?.thumbnail || item?.image || item?.image_url || item?.url;
    if (isGoodImage(img)) return String(img).replace(/&amp;/g, '&');
    const title = item?.title || item?.page_title;
    if (title) {
      const found = await pageImageForTitle(apiBase, title).catch(() => null) || await scrapeOgImage(apiBase, title).catch(() => null);
      if (found) return found;
    }
  }
  return null;
}

async function fileRedirectImage(apiBase, title) {
  const base = title.replace(/ /g, '_');
  const fileNames = unique([
    `${title}.png`, `${title}.jpg`, `${title}.jpeg`, `${title}.webp`,
    `${base}.png`, `${base}.jpg`, `${base}.jpeg`, `${base}.webp`,
    `${base}_DayZ.png`, `${base}_DayZ.jpg`, `${base}_icon.png`, `${base}_icon.jpg`
  ]).slice(0, 14);
  for (const fileName of fileNames) {
    const url = `${apiBase}/wiki/Special:Redirect/file/${encodeURIComponent(fileName)}`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'User-Agent': 'RAIDZStore/1.0' },
        signal: AbortSignal.timeout(5200)
      });
      const finalUrl = res.url;
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && /^image\//i.test(contentType) && isGoodImage(finalUrl)) return finalUrl;
    } catch (_) {}
  }
  return null;
}

async function resolveFromApiBase(apiBase, titles) {
  for (const title of titles) {
    const steps = [
      () => pageImageForTitle(apiBase, title),
      () => restSummaryImage(apiBase, title),
      () => generatorSearchImage(apiBase, title),
      () => unifiedSearchSuggestion(apiBase, title),
      async () => {
        const foundTitle = await openSearchTitle(apiBase, title).catch(() => null);
        if (!foundTitle) return null;
        return await pageImageForTitle(apiBase, foundTitle).catch(() => null)
          || await scrapeOgImage(apiBase, foundTitle).catch(() => null);
      },
      () => scrapeOgImage(apiBase, title),
      () => scrapeSearchPageImage(apiBase, title),
      () => fileRedirectImage(apiBase, title)
    ];
    for (const step of steps) {
      const img = await step().catch(() => null);
      if (isGoodImage(img)) return img;
    }
  }
  return null;
}

async function doResolve({ type, name, fallback }) {
  const titles = candidateTitles(type, name);
  const apiBases = [
    'https://dayz.fandom.com',
    'https://dayz.gamepedia.com'
  ];

  for (const apiBase of apiBases) {
    const img = await resolveFromApiBase(apiBase, titles).catch(() => null);
    if (img) return img;
  }

  if (isGoodImage(fallback)) return fallback;
  return localNoImage();
}

export async function resolveDayzWikiImage({ type, name, fallback }) {
  const key = makeKey(type, name);
  const cached = imageCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.url || localNoImage();

  if (pendingResolves.has(key)) return pendingResolves.get(key);

  const promise = doResolve({ type, name, fallback })
    .then((url) => {
      const ok = isGoodImage(url);
      imageCache.set(key, { url: ok ? url : localNoImage(), expires: Date.now() + (ok ? TWO_WEEKS : TWO_DAYS) });
      return ok ? url : localNoImage();
    })
    .catch(() => {
      imageCache.set(key, { url: localNoImage(), expires: Date.now() + TWO_DAYS });
      return localNoImage();
    })
    .finally(() => pendingResolves.delete(key));

  pendingResolves.set(key, promise);
  return promise;
}
