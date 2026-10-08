// scripts/copy-pdf-assets.mjs
import fs from 'fs';
import path from 'path';

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  copyDir('node_modules/pdfjs-dist/wasm', 'public/wasm');
  copyDir('node_modules/pdfjs-dist/cmaps', 'public/cmaps');
  copyDir('node_modules/pdfjs-dist/standard_fonts', 'public/standard_fonts');
  if (fs.existsSync('node_modules/pdfjs-dist/build/pdf.worker.min.mjs')) {
    fs.copyFileSync('node_modules/pdfjs-dist/build/pdf.worker.min.mjs', 'public/pdf.worker.min.mjs');
  }

  // Salin font Arial Narrow ke public/fonts jika ada di sistem
  const fontsDestDir = path.join(process.cwd(), 'public', 'fonts');
  if (!fs.existsSync(fontsDestDir)) fs.mkdirSync(fontsDestDir, { recursive: true });
  const fontDestFile = path.join(fontsDestDir, 'ArialNarrow.ttf');
  if (!fs.existsSync(fontDestFile)) {
    const winFont = 'C:/Windows/Fonts/ARIALN.TTF';
    if (fs.existsSync(winFont)) {
      fs.copyFileSync(winFont, fontDestFile);
    }
  }

  console.log('[copy-pdf-assets] Berhasil menyalin assets pdfjs-dist (wasm, cmaps, standard_fonts, worker) dan fonts ke public/');
} catch (err) {
  console.error('[copy-pdf-assets] Gagal menyalin assets:', err);
}
