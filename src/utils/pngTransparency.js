import zlib from 'zlib';

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_PIXELS = 1800 * 1800;

function isPng(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length > 32 && buffer.subarray(0, 8).equals(PNG_SIG);
}

function readChunks(buffer) {
  let offset = 8;
  const chunks = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset); offset += 4;
    const type = buffer.subarray(offset, offset + 4).toString('ascii'); offset += 4;
    const data = buffer.subarray(offset, offset + length); offset += length;
    const crc = buffer.readUInt32BE(offset); offset += 4;
    chunks.push({ type, data, crc });
    if (type === 'IEND') break;
  }
  return chunks;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilter(data, width, height, bpp, rowLen) {
  const out = Buffer.alloc(height * rowLen);
  let src = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = data[src++];
    const rowStart = y * rowLen;
    const prevStart = (y - 1) * rowLen;
    for (let x = 0; x < rowLen; x += 1) {
      const raw = data[src++];
      const left = x >= bpp ? out[rowStart + x - bpp] : 0;
      const up = y > 0 ? out[prevStart + x] : 0;
      const upLeft = y > 0 && x >= bpp ? out[prevStart + x - bpp] : 0;
      let val = raw;
      if (filter === 1) val = (raw + left) & 255;
      else if (filter === 2) val = (raw + up) & 255;
      else if (filter === 3) val = (raw + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) val = (raw + paeth(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error('Filtro PNG inválido');
      out[rowStart + x] = val;
    }
  }
  return out;
}

function parsePng(buffer) {
  if (!isPng(buffer)) throw new Error('Não é PNG');
  const chunks = readChunks(buffer);
  const ihdr = chunks.find(c => c.type === 'IHDR')?.data;
  if (!ihdr) throw new Error('PNG sem IHDR');
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];
  if (bitDepth !== 8) throw new Error('PNG bit depth não suportado');
  if (interlace !== 0) throw new Error('PNG entrelaçado não suportado');
  if (width < 1 || height < 1 || width * height > MAX_PIXELS) throw new Error('PNG grande demais para processar transparência');

  const idat = Buffer.concat(chunks.filter(c => c.type === 'IDAT').map(c => c.data));
  const inflated = zlib.inflateSync(idat);
  const palette = chunks.find(c => c.type === 'PLTE')?.data || null;
  const trns = chunks.find(c => c.type === 'tRNS')?.data || null;

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 0 ? 1 : colorType === 4 ? 2 : 0;
  if (!channels) throw new Error('PNG color type não suportado');
  const rowLen = width * channels;
  const scan = unfilter(inflated, width, height, channels, rowLen);
  const rgba = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const si = y * rowLen + x * channels;
      const di = (y * width + x) * 4;
      if (colorType === 6) {
        rgba[di] = scan[si]; rgba[di + 1] = scan[si + 1]; rgba[di + 2] = scan[si + 2]; rgba[di + 3] = scan[si + 3];
      } else if (colorType === 2) {
        rgba[di] = scan[si]; rgba[di + 1] = scan[si + 1]; rgba[di + 2] = scan[si + 2]; rgba[di + 3] = 255;
      } else if (colorType === 3) {
        const idx = scan[si];
        rgba[di] = palette?.[idx * 3] ?? 0;
        rgba[di + 1] = palette?.[idx * 3 + 1] ?? 0;
        rgba[di + 2] = palette?.[idx * 3 + 2] ?? 0;
        rgba[di + 3] = trns?.[idx] ?? 255;
      } else if (colorType === 0) {
        const g = scan[si];
        rgba[di] = g; rgba[di + 1] = g; rgba[di + 2] = g; rgba[di + 3] = 255;
      } else if (colorType === 4) {
        const g = scan[si];
        rgba[di] = g; rgba[di + 1] = g; rgba[di + 2] = g; rgba[di + 3] = scan[si + 1];
      }
    }
  }
  return { width, height, rgba };
}

function colorDistanceSq(rgba, idx, bg) {
  const dr = rgba[idx] - bg[0];
  const dg = rgba[idx + 1] - bg[1];
  const db = rgba[idx + 2] - bg[2];
  return dr * dr + dg * dg + db * db;
}


function dominantEdgeColors(rgba, width, height) {
  const buckets = new Map();
  const add = (x, y) => {
    const i = (y * width + x) * 4;
    if (rgba[i + 3] < 12) return;
    const key = `${rgba[i] >> 4},${rgba[i + 1] >> 4},${rgba[i + 2] >> 4}`;
    const item = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
    item.count += 1; item.r += rgba[i]; item.g += rgba[i + 1]; item.b += rgba[i + 2];
    buckets.set(key, item);
  };
  for (let x = 0; x < width; x += 1) { add(x, 0); add(x, height - 1); }
  for (let y = 0; y < height; y += 1) { add(0, y); add(width - 1, y); }
  const colors = [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map(c => [Math.round(c.r / c.count), Math.round(c.g / c.count), Math.round(c.b / c.count), c.count]);
  return colors;
}

function minDistanceToBackground(rgba, idx, colors) {
  let best = Infinity;
  for (const bg of colors) {
    const d = colorDistanceSq(rgba, idx, bg);
    if (d < best) best = d;
  }
  return best;
}

function isLikelyCheckerOrWhiteBackground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max >= 222 && (max - min) <= 22;
}

function removeConnectedBackground({ width, height, rgba }, threshold = 54) {
  const edgeColors = dominantEdgeColors(rgba, width, height);
  if (!edgeColors.length) return false;

  // Muitas imagens PNG baixadas como “sem fundo” vêm com xadrez branco/cinza no próprio arquivo.
  // Aqui a gente trata múltiplas cores claras de borda como fundo, em vez de só uma cor dominante.
  const backgroundColors = edgeColors.filter(c => c[3] >= 4 || isLikelyCheckerOrWhiteBackground(c[0], c[1], c[2]));
  if (!backgroundColors.length) return false;

  const limit = threshold * threshold;
  const softLimit = (threshold + 44) * (threshold + 44);
  const visited = new Uint8Array(width * height);
  const stack = [];
  const isBackgroundCandidate = (i) => {
    if (rgba[i + 3] < 12) return true;
    const d = minDistanceToBackground(rgba, i, backgroundColors);
    if (d <= softLimit) return true;
    return isLikelyCheckerOrWhiteBackground(rgba[i], rgba[i + 1], rgba[i + 2]);
  };
  const tryAdd = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (visited[p]) return;
    const i = p * 4;
    if (isBackgroundCandidate(i)) {
      visited[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < width; x += 1) { tryAdd(x, 0); tryAdd(x, height - 1); }
  for (let y = 0; y < height; y += 1) { tryAdd(0, y); tryAdd(width - 1, y); }

  let changed = false;
  while (stack.length) {
    const p = stack.pop();
    const x = p % width;
    const y = Math.floor(p / width);
    const i = p * 4;
    const dist = minDistanceToBackground(rgba, i, backgroundColors);
    if (dist <= limit || rgba[i + 3] < 12 || isLikelyCheckerOrWhiteBackground(rgba[i], rgba[i + 1], rgba[i + 2])) {
      if (rgba[i + 3] !== 0) changed = true;
      rgba[i + 3] = 0;
    } else if (dist <= softLimit) {
      const alpha = Math.max(0, Math.min(255, Math.round(255 * (dist - limit) / (softLimit - limit))));
      if (alpha < rgba[i + 3]) { rgba[i + 3] = alpha; changed = true; }
    }
    tryAdd(x + 1, y); tryAdd(x - 1, y); tryAdd(x, y + 1); tryAdd(x, y - 1);
  }
  return changed;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const typeBuf = Buffer.from(type, 'ascii');
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  typeBuf.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 8 + data.length);
  return out;
}

function encodePngRgba(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const rowLen = width * 4;
  const raw = Buffer.alloc(height * (rowLen + 1));
  for (let y = 0; y < height; y += 1) {
    raw[y * (rowLen + 1)] = 0;
    rgba.copy(raw, y * (rowLen + 1) + 1, y * rowLen, (y + 1) * rowLen);
  }
  return Buffer.concat([PNG_SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND')]);
}

export function makePngBackgroundTransparent(buffer) {
  try {
    const decoded = parsePng(buffer);
    const changed = removeConnectedBackground(decoded);
    if (!changed) return buffer;
    return encodePngRgba(decoded.width, decoded.height, decoded.rgba);
  } catch (_) {
    return buffer;
  }
}

export function prepareUploadedImage(file) {
  if (!file?.buffer) return null;
  const mime = String(file.mimetype || '').toLowerCase();
  if (mime === 'image/png' || isPng(file.buffer)) {
    const processed = makePngBackgroundTransparent(file.buffer);
    return { imageData: processed.toString('base64'), imageMime: 'image/png' };
  }
  return { imageData: file.buffer.toString('base64'), imageMime: file.mimetype };
}

export function prepareRawUploadedImage(file) {
  if (!file?.buffer) return null;
  const mime = String(file.mimetype || '').toLowerCase();
  const allowed = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']);
  if (!allowed.has(mime)) throw new Error('Use uma imagem PNG, JPG, WEBP ou GIF.');
  return { imageData: file.buffer.toString('base64'), imageMime: mime === 'image/jpg' ? 'image/jpeg' : mime };
}

export function makePngFullyOpaque(buffer) {
  try {
    const decoded = parsePng(buffer);
    for (let i = 3; i < decoded.rgba.length; i += 4) decoded.rgba[i] = 255;
    return encodePngRgba(decoded.width, decoded.height, decoded.rgba);
  } catch (_) {
    return buffer;
  }
}
