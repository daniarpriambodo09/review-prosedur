// components/approval/ApprovalDateStamperModal.tsx
//
// Modal interaktif untuk membubuhkan teks Tanggal Selesai Approval
// pada tabel 'CATATAN PERUBAHAN' di dokumen PDF dengan drag kotak (bounding box).
// Font: Arial Narrow, ukuran 11 pt (tetap).
// Desain: Bersih, lega (full-width), dan nyaman di-scroll hingga ke bagian paling bawah.
//

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Check,
  AlertCircle,
  RotateCcw,
  MousePointer,
  ZoomIn,
  ZoomOut,
  Type,
  CheckCircle2,
} from 'lucide-react';
import { ApprovalDocumentItem } from './ApprovalTable';

interface ApprovalDateStamperModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ApprovalDocumentItem | null;
  onSuccess?: () => void;
}

interface BoxCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MONTH_NAMES_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Juni',
  'Juli', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

/**
 * Format tanggal ke gaya contoh gambar: "28 Apr 2025" atau "18 Okt 2021"
 */
function formatIndonesianApprovalDate(rawDate?: string | null): string {
  if (!rawDate) {
    const today = new Date();
    return `${today.getDate()} ${MONTH_NAMES_ID[today.getMonth()]} ${today.getFullYear()}`;
  }
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return rawDate;
    const day = d.getDate();
    const month = MONTH_NAMES_ID[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return rawDate;
  }
}

export default function ApprovalDateStamperModal({
  isOpen,
  onClose,
  document: doc,
  onSuccess,
}: ApprovalDateStamperModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [scale, setScale] = useState(1.3);

  // Tanggal approval yang akan dicap
  const [stampText, setStampText] = useState('');

  // Status Drag Kotak
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<BoxCoords | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Guide lines cursor
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const pdfDocRef = useRef<any>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Inisialisasi teks tanggal saat modal dibuka atau dokumen berganti
  useEffect(() => {
    if (isOpen && doc) {
      const initialDate = doc.tanggalSelesaiApproval || doc.completedAt || new Date().toISOString();
      setStampText(formatIndonesianApprovalDate(initialDate));
      setSelectionBox(null);
      setCurrentPage(1);
      setPageInput('1');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, doc]);

  // Sinkronisasi input teks halaman
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Load file PDF via pdfjs-dist
  useEffect(() => {
    if (!isOpen || !doc?.filePath) return;

    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    setNumPages(0);
    pdfDocRef.current = null;

    async function loadPdf() {
      try {
        const pdfjsLib: any = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/review-prosedur/pdf.worker.min.mjs';

        const rawPath = doc!.filePath!;
        const cleanPath = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
        const res = await fetch(`/review-prosedur/api/files/serve?path=${encodeURIComponent(cleanPath)}`);
        if (!res.ok) throw new Error(`Gagal mengambil file PDF (${res.status})`);
        const buf = await res.arrayBuffer();

        const pdf = await pdfjsLib.getDocument({
          data: buf,
          wasmUrl: '/review-prosedur/wasm/',
          cMapUrl: '/review-prosedur/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: '/review-prosedur/standard_fonts/',
        }).promise;

        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
      } catch (err: any) {
        console.error('Error loading PDF in stamper modal:', err);
        if (!cancelled) setErrorMsg(err.message || 'Gagal memuat dokumen PDF.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPdf();
    return () => {
      cancelled = true;
    };
  }, [isOpen, doc?.filePath]);

  // Render halaman aktif ke canvas
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current || !pdfCanvasRef.current || !overlayCanvasRef.current) return;

    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const pdfCanvas = pdfCanvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;

      pdfCanvas.width = viewport.width;
      pdfCanvas.height = viewport.height;
      overlayCanvas.width = viewport.width;
      overlayCanvas.height = viewport.height;

      setCanvasDimensions({ width: viewport.width, height: viewport.height });

      const ctx = pdfCanvas.getContext('2d');
      if (ctx) {
        await page.render({
          canvasContext: ctx,
          viewport,
          annotationMode: 1,
        }).promise;
      }

      // Re-draw overlay box jika sudah ada di halaman ini
      redrawOverlay();
    } catch (err) {
      console.error('Error rendering page:', err);
    }
  }, [scale]);

  useEffect(() => {
    if (numPages > 0 && currentPage <= numPages) {
      renderPage(currentPage);
    }
  }, [numPages, currentPage, renderPage]);

  // Redraw overlay canvas (kotak drag, preview font Arial Narrow 11pt, dan garis panduan)
  const redrawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Gambar Garis Bantu Halus (Guidelines Crosshair) saat mouse bergerak di atas canvas
    if (mousePos && !isDrawing) {
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 1;

      // Garis horizontal
      ctx.beginPath();
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(canvas.width, mousePos.y);
      ctx.stroke();

      // Garis vertikal
      ctx.beginPath();
      ctx.moveTo(mousePos.x, 0);
      ctx.lineTo(mousePos.x, canvas.height);
      ctx.stroke();
      ctx.restore();
    }

    if (!selectionBox) return;

    const { x, y, width, height } = selectionBox;

    // 2. Gambar Area Seleksi Kotak (Background semi-transparan & Border biru elegan)
    ctx.fillStyle = 'rgba(37, 99, 235, 0.12)';
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Corner handles
    const handleSize = 4;
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(x + width - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(x - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(x + width - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize);

    // 3. Render Preview Teks dengan Font Arial Narrow ukuran TETAP 11pt
    if (stampText.trim()) {
      // 11pt di PDF = 11 * scale pixels di canvas layar
      const fixedScreenFontSize = Math.round(11 * scale);

      ctx.save();
      ctx.font = `normal ${fixedScreenFontSize}px "Arial Narrow Custom", "Arial Narrow", Arial, sans-serif`;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Posisi teks tepat di tengah kotak seleksi (Center Horizontal & Center Vertical)
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      ctx.fillText(stampText.trim(), centerX, centerY);
      ctx.restore();
    }
  }, [selectionBox, stampText, scale, mousePos, isDrawing]);

  useEffect(() => {
    redrawOverlay();
  }, [redrawOverlay]);

  // Handler interaksi mouse drag pada overlay canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setDragStart({ x, y });
    setSelectionBox({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    setMousePos({ x: currentX, y: currentY });

    if (!isDrawing || !dragStart) return;

    const boxX = Math.min(dragStart.x, currentX);
    const boxY = Math.min(dragStart.y, currentY);
    const boxWidth = Math.abs(currentX - dragStart.x);
    const boxHeight = Math.abs(currentY - dragStart.y);

    setSelectionBox({
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setDragStart(null);

    // Jika kotaknya terlalu kecil (klik tanpa sengaja), hapus
    if (selectionBox && (selectionBox.width < 12 || selectionBox.height < 6)) {
      setSelectionBox(null);
    }
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    if (isDrawing) {
      setIsDrawing(false);
      setDragStart(null);
    }
  };

  // Navigasi nomor halaman dengan input
  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= numPages) {
      setCurrentPage(p);
      setSelectionBox(null);
    } else {
      setPageInput(String(currentPage));
    }
  };

  // Simpan hasil cap tanggal ke backend PDF
  const handleSaveStamp = async () => {
    if (!doc || !selectionBox || !canvasDimensions.width) {
      setErrorMsg('Silakan drag kotak pada kolom Tanggal Selesai Approval terlebih dahulu.');
      return;
    }

    if (!stampText.trim()) {
      setErrorMsg('Teks tanggal selesai approval tidak boleh kosong.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);

      const res = await fetch('/review-prosedur/api/approval-dokumen/stamp-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomorDokumen: doc.nomorDokumen,
          pageNumber: currentPage,
          box: selectionBox,
          canvasSize: canvasDimensions,
          text: stampText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan tanggal ke dokumen PDF.');
      }

      setSuccessMsg('Tanggal approval berhasil dicapkan ke dokumen PDF!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Error saving stamp date:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan cap tanggal.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[96vw] xl:max-w-7xl h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* ── 1. Header Minimalis & Ramping ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60 shadow-2xs flex-shrink-0">
              <Calendar size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-slate-800 truncate">
                  Isi Tanggal Selesai Approval ke Catatan Perubahan
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                  <Type size={11} className="text-slate-500" /> Arial Narrow 11pt
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                <span className="font-semibold text-slate-700">{doc.nomorDokumen}</span> — {doc.namaDokumen}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
            title="Tutup (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── 2. Toolbar Kontrol Satu Baris (Ramping & Fungsional) ── */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Sisi Kiri: Navigasi Halaman, Teks Tanggal, & Status Kotak */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Navigasi Halaman */}
            <div className="flex items-center bg-white rounded-lg border border-slate-300 p-0.5 shadow-2xs">
              <button
                onClick={() => {
                  const nextP = Math.max(1, currentPage - 1);
                  setCurrentPage(nextP);
                  setSelectionBox(null);
                }}
                disabled={currentPage <= 1 || loading}
                className="p-1 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>

              <form onSubmit={handlePageSubmit} className="flex items-center px-1 gap-1">
                <span className="text-[11px] text-slate-400">Hal</span>
                <input
                  type="text"
                  value={pageInput}
                  onChange={e => setPageInput(e.target.value)}
                  className="w-9 text-center font-bold text-xs py-0.5 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-400">/ {numPages || '-'}</span>
              </form>

              <button
                onClick={() => {
                  const nextP = Math.min(numPages, currentPage + 1);
                  setCurrentPage(nextP);
                  setSelectionBox(null);
                }}
                disabled={currentPage >= numPages || loading}
                className="p-1 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                title="Halaman Selanjutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Input Tanggal */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs">
              <span className="text-slate-500 font-medium text-[11px]">Tanggal:</span>
              <input
                type="text"
                value={stampText}
                onChange={e => setStampText(e.target.value)}
                placeholder="28 Apr 2025"
                className="w-28 sm:w-32 font-bold text-slate-800 text-xs focus:outline-none bg-transparent"
                title="Teks tanggal selesai approval yang akan dicap"
              />
            </div>

            {/* Indikator Kotak */}
            {selectionBox ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span className="font-semibold text-[11px]">Kotak Siap</span>
                <button
                  onClick={() => setSelectionBox(null)}
                  className="p-0.5 hover:bg-emerald-100 rounded text-emerald-700 transition-colors ml-0.5"
                  title="Tarik ulang kotak"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50/80 border border-blue-200/80 px-2.5 py-1 rounded-lg">
                <MousePointer size={13} className="text-blue-600 animate-pulse" />
                <span className="text-[11px] font-medium">Klik & tarik kotak pada kolom tabel</span>
              </div>
            )}
          </div>

          {/* Sisi Kanan: Zoom & Tombol Simpan */}
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center bg-white rounded-lg border border-slate-300 p-0.5 shadow-2xs">
              <button
                onClick={() => setScale(s => Math.max(0.8, +(s - 0.15).toFixed(2)))}
                className="p-1 rounded text-slate-600 hover:bg-slate-100 transition-colors"
                title="Perkecil (-)"
              >
                <ZoomOut size={14} />
              </button>
              <span className="px-1.5 font-mono text-[11px] text-slate-600 min-w-[38px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale(s => Math.min(2.0, +(s + 0.15).toFixed(2)))}
                className="p-1 rounded text-slate-600 hover:bg-slate-100 transition-colors"
                title="Perbesar (+)"
              >
                <ZoomIn size={14} />
              </button>
            </div>

            {/* Tombol Simpan & Batal */}
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 font-medium transition-colors"
            >
              Batal
            </button>

            <button
              onClick={handleSaveStamp}
              disabled={!selectionBox || saving || !stampText.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-bold transition-all shadow-sm active:scale-95 shadow-blue-500/25"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Terapkan ke PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notifikasi Error / Sukses jika ada */}
        {errorMsg && (
          <div className="px-5 py-2 bg-rose-50 border-b border-rose-200 flex items-center gap-2 text-xs text-rose-700 font-medium">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-semibold">
            <Check size={14} className="flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── 3. Area PDF Canvas Utama (Lega, Bersih, & Scroll Nyaman ke Bagian Bawah) ── */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0 bg-slate-200/80 overflow-y-auto overflow-x-auto p-4 sm:p-6 pb-36 flex justify-center items-start select-none relative"
        >
          {loading ? (
            <div className="m-auto text-center py-24">
              <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-blue-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Memuat halaman dokumen PDF...</p>
              <p className="text-xs text-slate-400 mt-1">Mempersiapkan canvas interaktif</p>
            </div>
          ) : (
            <div className="relative shadow-xl rounded-sm overflow-hidden bg-white border border-slate-300 ring-1 ring-black/5 my-2">
              {/* Canvas 1: Render Halaman Dokumen PDF */}
              <canvas ref={pdfCanvasRef} className="block" />

              {/* Canvas 2: Overlay Transparan untuk Drag Kotak */}
              <canvas
                ref={overlayCanvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                className="absolute inset-0 z-10 cursor-crosshair"
                title="Klik dan tarik kotak pada kolom Tanggal Selesai Approval"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
