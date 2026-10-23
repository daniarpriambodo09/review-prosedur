// scripts/generate-review-favicons.mjs
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <!-- Gradient Dokumen Prosedur: Royal Blue ke Deep Indigo -->
    <linearGradient id="docGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2563EB"/>
      <stop offset="50%" stop-color="#1D4ED8"/>
      <stop offset="100%" stop-color="#1E40AF"/>
    </linearGradient>

    <!-- Lipatan Kertas Dokumen (Folded Flap) -->
    <linearGradient id="foldGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#93C5FD"/>
      <stop offset="100%" stop-color="#3B82F6"/>
    </linearGradient>

    <!-- Lencana Verifikasi Kualitas: Emerald Green -->
    <linearGradient id="checkBadge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#34D399"/>
      <stop offset="50%" stop-color="#10B981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>

    <!-- Bayangan Lembut untuk Tab Browser -->
    <filter id="tabDropShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#0F172A" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Badan Dokumen Prosedur -->
  <path d="M14 6 C10.686 6 8 8.686 8 12 L8 52 C8 55.314 10.686 58 14 58 L50 58 C53.314 58 56 55.314 56 52 L56 22 L40 6 Z" fill="url(#docGrad)" filter="url(#tabDropShadow)"/>
  
  <!-- Lipatan Sudut Kanan Atas -->
  <path d="M40 6 L40 18 C40 20.2 41.8 22 44 22 L56 22 Z" fill="url(#foldGrad)"/>

  <!-- Garis-Garis Prosedur / SOP -->
  <rect x="16" y="18" width="16" height="3" rx="1.5" fill="#FFFFFF" opacity="0.9"/>
  <rect x="16" y="26" width="24" height="3" rx="1.5" fill="#FFFFFF" opacity="0.8"/>
  <rect x="16" y="34" width="18" height="3" rx="1.5" fill="#FFFFFF" opacity="0.8"/>

  <!-- Lencana Verifikasi / Review Selesai (Emerald Checkmark) -->
  <circle cx="44" cy="44" r="14" fill="url(#checkBadge)" stroke="#FFFFFF" stroke-width="2.8"/>
  <path d="M37.5 44 L42 48.5 L50.5 39.5" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function createPng(size) {
  const rowSize = size * 4;
  const raw = Buffer.alloc(size * (rowSize + 1));
  const s = size / 64;

  const left = 8 * s, right = 56 * s;
  const top = 6 * s, bottom = 58 * s;
  const foldX = 40 * s, foldY = 22 * s;
  const rCorner = 4 * s;

  const cx = 44 * s, cy = 44 * s, cr = 14 * s;

  for (let y = 0; y < size; y++) {
    raw[y * (rowSize + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;

      for (const sy of [0.25, 0.75]) {
        for (const sx of [0.25, 0.75]) {
          const px = x + sx, py = y + sy;

          // Cek apakah di dalam badge lingkaran (prioritas terdepan)
          const dBadge = Math.hypot(px - cx, py - cy);
          if (dBadge <= cr) {
            let r = 16, g = 185, b = 129, a = 255; // #10B981

            if (dBadge >= cr - 2.8 * s) {
              // Stroke putih badge
              r = 255; g = 255; b = 255;
            } else {
              // Gradient emerald
              const gt = (py - (cy - cr)) / (2 * cr);
              r = Math.round(52 - gt * 47);   // 52 -> 5
              g = Math.round(211 - gt * 61);  // 211 -> 150
              b = Math.round(153 - gt * 48);  // 153 -> 105

              // Centang putih
              const d1 = distToSegment(px, py, 37.5 * s, 44 * s, 42 * s, 48.5 * s);
              const d2 = distToSegment(px, py, 42 * s, 48.5 * s, 50.5 * s, 39.5 * s);
              if (Math.min(d1, d2) <= 1.6 * s) {
                r = 255; g = 255; b = 255;
              }
            }

            rSum += r; gSum += g; bSum += b; aSum += a;
            continue;
          }

          // Cek apakah di dalam bentuk dokumen
          let inDoc = false;
          let isFold = false;

          if (px >= left && px <= right && py >= top && py <= bottom) {
            // Cek pojokan bulat kiri atas, kiri bawah, kanan bawah
            let okCorners = true;
            if (px < left + rCorner && py < top + rCorner && Math.hypot(px - (left + rCorner), py - (top + rCorner)) > rCorner) okCorners = false;
            if (px < left + rCorner && py > bottom - rCorner && Math.hypot(px - (left + rCorner), py - (bottom - rCorner)) > rCorner) okCorners = false;
            if (px > right - rCorner && py > bottom - rCorner && Math.hypot(px - (right - rCorner), py - (bottom - rCorner)) > rCorner) okCorners = false;

            if (okCorners) {
              // Cek apakah di area pojok kanan atas (lipatan)
              if (px > foldX && py < foldY) {
                // Di dalam lipatan atau segitiga kosong?
                // Garis potong dari (foldX, top) ke (right, foldY)
                // y - top = (foldY - top) / (right - foldX) * (px - foldX)
                const cutY = top + ((foldY - top) / (right - foldX)) * (px - foldX);
                if (py >= cutY) {
                  // Di bawah garis potong = dokumen utama
                  inDoc = true;
                } else {
                  // Di atas garis potong = cek apakah di dalam flap lipatan (kotak foldX..right, top..foldY dengan potongan)
                  isFold = true;
                }
              } else {
                inDoc = true;
              }
            }
          }

          if (isFold) {
            // Lipatan segitiga (flap)
            const gt = (px - foldX) / (right - foldX);
            const r = Math.round(147 - gt * 88); // 147 -> 59
            const g = Math.round(197 - gt * 67); // 197 -> 130
            const b = Math.round(253 - gt * 7);  // 253 -> 246
            rSum += r; gSum += g; bSum += b; aSum += 255;
            continue;
          }

          if (inDoc) {
            // Garis prosedur SOP (warna putih transparan)
            let isLine = false;
            if (
              (py >= 17 * s && py <= 20 * s && px >= 16 * s && px <= 32 * s) ||
              (py >= 25 * s && py <= 28 * s && px >= 16 * s && px <= 40 * s) ||
              (py >= 33 * s && py <= 36 * s && px >= 16 * s && px <= 34 * s)
            ) {
              isLine = true;
            }

            if (isLine) {
              rSum += 255; gSum += 255; bSum += 255; aSum += 255;
            } else {
              // Gradient Royal Blue dokumen
              const gt = (py - top) / (bottom - top);
              const r = Math.round(37 - gt * 7);   // 37 -> 30
              const g = Math.round(99 - gt * 35);  // 99 -> 64
              const b = Math.round(235 - gt * 60); // 235 -> 175
              rSum += r; gSum += g; bSum += b; aSum += 255;
            }
            continue;
          }

          // Transparan di luar dokumen
          rSum += 0; gSum += 0; bSum += 0; aSum += 0;
        }
      }

      const offset = y * (rowSize + 1) + 1 + x * 4;
      raw[offset]     = Math.round(rSum / 4);
      raw[offset + 1] = Math.round(gSum / 4);
      raw[offset + 2] = Math.round(bSum / 4);
      raw[offset + 3] = Math.round(aSum / 4);
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', zlib.deflateSync(raw)),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function createIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirSize = 16 * count;
  let currentOffset = 6 + dirSize;

  const dirBuffers = [];
  const imageBuffers = [];

  for (const img of images) {
    const dir = Buffer.alloc(16);
    dir[0] = img.size >= 256 ? 0 : img.size;
    dir[1] = img.size >= 256 ? 0 : img.size;
    dir[2] = 0;
    dir[3] = 0;
    dir.writeUInt16LE(1, 4);
    dir.writeUInt16LE(32, 6);
    dir.writeUInt32LE(img.data.length, 8);
    dir.writeUInt32LE(currentOffset, 12);

    dirBuffers.push(dir);
    imageBuffers.push(img.data);
    currentOffset += img.data.length;
  }

  return Buffer.concat([header, ...dirBuffers, ...imageBuffers]);
}

console.log('Generating Review Prosedur Document & Quality Check Favicons...');

const png16 = createPng(16);
const png32 = createPng(32);
const png48 = createPng(48);
const png64 = createPng(64);
const png180 = createPng(180);
const png192 = createPng(192);

const icoBuffer = createIco([
  { size: 16, data: png16 },
  { size: 32, data: png32 },
  { size: 48, data: png48 },
  { size: 64, data: png64 }
]);

// 1. Tulis ke public/
fs.writeFileSync(path.join(rootDir, 'public/icon.svg'), svgContent, 'utf-8');
fs.writeFileSync(path.join(rootDir, 'public/icon.png'), png64);
fs.writeFileSync(path.join(rootDir, 'public/icon-light-32x32.png'), png32);
fs.writeFileSync(path.join(rootDir, 'public/icon-dark-32x32.png'), png32);
fs.writeFileSync(path.join(rootDir, 'public/apple-icon.png'), png180);
fs.writeFileSync(path.join(rootDir, 'public/favicon.ico'), icoBuffer);

// 2. Tulis ke app/
fs.writeFileSync(path.join(rootDir, 'app/icon.svg'), svgContent, 'utf-8');
fs.writeFileSync(path.join(rootDir, 'app/icon.png'), png64);
fs.writeFileSync(path.join(rootDir, 'app/apple-icon.png'), png180);
fs.writeFileSync(path.join(rootDir, 'app/favicon.ico'), icoBuffer);

console.log('✅ Selesai! Icon baru bertema Dokumen Prosedur & Verifikasi Kualitas berhasil digenerate.');
