// components/documents/AnnotatablePDFViewer.tsx
//
// PDF viewer dengan kemampuan mencoret (freehand) dan menambahkan kotak teks
// komentar. Berbeda dari PDFViewer.tsx biasa (yang pakai <object> browser
// native), komponen ini me-render tiap halaman PDF sendiri ke <canvas> lewat
// pdfjs-dist, supaya bisa ditumpuk <canvas> transparan di atasnya untuk
// menggambar.
//
// Anotasi bersifat KUMULATIF per file_id — siapa pun yang membuka dokumen
// versi yang sama akan melihat semua coretan/komentar dari orang lain juga
// (PIC maupun Prepared/Checked/Approved), supaya tidak ada komentar dobel.
//
// Mode:
//  - canEdit=true  → toolbar coret/teks + tombol Simpan muncul (PIC, ACC roles)
//  - canEdit=false → read-only, opsional toggle "Dokumen Bersih / Dengan Coretan" (admin)

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import PDFViewer from './PDFViewer';

export type AnnotatorRole = 'pic' | 'prepared' | 'checked' | 'approved';

interface AnnotatablePDFViewerProps {
  filePath: string;
  fileId: number;
  nomorDokumen: string;
  canEdit: boolean;
  /** Wajib kalau canEdit=true — dipakai untuk warna coretan & label */
  myRole?: AnnotatorRole;
  myNama?: string | null;
  /** Wajib kalau canEdit=true DAN TIDAK ada accToken (konteks PIC, login biasa) */
  myEmail?: string;
  /** Wajib kalau canEdit=true DAN role-nya prepared/checked/approved — identitas
   *  di-resolve di SERVER dari token ini (lebih aman, tidak bisa dipalsukan) */
  accToken?: string;
  /** Admin: tampilkan toggle "Dokumen Bersih / Dengan Coretan". */
  showCleanToggle?: boolean;
  onSaved?: () => void;
}

interface RawAnnotation {
  id: number;
  pageNumber: number;
  type: 'stroke' | 'textbox';
  data: any;
  color: string;
  createdByNama: string | null;
  createdByEmail: string;
  createdByRole: string;
  createdAt: string;
}

interface DraftAnnotation {
  pageNumber: number;
  type: 'stroke' | 'textbox';
  data: any;
  color: string;
}

const ROLE_COLOR: Record<string, string> = {
  pic:      '#2563eb', // biru
  prepared: '#7c3aed', // ungu
  checked:  '#d97706', // amber
  approved: '#059669', // hijau
};

const ROLE_LABEL: Record<string, string> = {
  pic: 'PIC', prepared: 'Prepared', checked: 'Checked', approved: 'Approved',
};

const RENDER_SCALE = 1.4;

export default function AnnotatablePDFViewer({
  filePath, fileId, nomorDokumen,
  canEdit, myRole, myNama, myEmail, accToken,
  showCleanToggle,
  onSaved,
}: AnnotatablePDFViewerProps) {
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(false);
  const [numPages,    setNumPages]    = useState(0);
  const [existing,    setExisting]    = useState<RawAnnotation[]>([]);
  const [drafts,      setDrafts]      = useState<DraftAnnotation[]>([]);
  const [tool,        setTool]        = useState<'none' | 'pen' | 'text'>('none');
  const [showOverlay, setShowOverlay] = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [saveMsg,         setSaveMsg]         = useState('');
  const [textDraft,       setTextDraft]       = useState<{ page: number; x: number; y: number; value: string } | null>(null);
  const [useNativeViewer, setUseNativeViewer] = useState(true);

  // Reset ke mode PDF Asli setiap kali filePath berubah
  useEffect(() => {
    setUseNativeViewer(true);
    setTool('none');
  }, [filePath]);

  const pdfDocRef        = useRef<any>(null);
  const canvasRefs       = useRef<Record<number, HTMLCanvasElement | null>>({});
  const overlayRefs      = useRef<Record<number, HTMLCanvasElement | null>>({});
  const pageSizeRef      = useRef<Record<number, { width: number; height: number }>>({});
  const isDrawingRef     = useRef(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const currentPageRef   = useRef<number | null>(null);

  const myColor = myRole ? (ROLE_COLOR[myRole] || '#ef4444') : '#ef4444';

  // ── 1. Load PDF via pdfjs-dist ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    // 🐛 FIX: reset SEGERA (sebelum load baru selesai) supaya halaman-halaman
    // lama di-unmount dulu (canvas lama benar-benar dibuang, bukan dipakai
    // ulang) — mencegah canvas kosong tidak pernah digambar ulang saat
    // berpindah versi dokumen yang kebetulan jumlah halamannya sama persis
    // (React tidak menganggap itu "perubahan" kalau cuma angkanya tidak
    // berubah, jadi canvas lama bisa nyangkut kosong).
    setNumPages(0);
    pdfDocRef.current = null;
    canvasRefs.current = {};
    overlayRefs.current = {};
    pageSizeRef.current = {};

    async function run() {
      try {
        setLoading(true);
        setError(false);

        const pdfjsLib: any = await import('pdfjs-dist');
        // Worker di-self-host dari public/pdf.worker.min.mjs — pdfjs-dist v6+
        // ESM-only, workernya .mjs (bukan .js). Self-host juga menghindari
        // masalah versi mismatch di CDN (cdnjs sempat 404 untuk versi ini).
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/review-prosedur/pdf.worker.min.mjs';

        const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
        const res = await fetch(`/review-prosedur/api/files/serve?path=${encodeURIComponent(cleanPath)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();

        // 🔧 FIX: Konfigurasi wasmUrl, cMapUrl, dan standardFontDataUrl
        // pdfjs-dist v6 memerlukan jbig2.wasm untuk mendekode gambar kompresi CCITTFax
        // (yang dipakai oleh flowchart/bagan alir pada prosedur). Tanpa ini,
        // decoder CCITT/JBIG2 gagal inisialisasi dan flowchart hilang.
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
      } catch (err) {
        console.error('AnnotatablePDFViewer: gagal memuat PDF', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [filePath]);

  // ── 2. Fetch anotasi yang sudah tersimpan ───────────────────────────────────
  const fetchExisting = useCallback(async () => {
    try {
      const res = await fetch(`/review-prosedur/api/annotations?nomorDokumen=${encodeURIComponent(nomorDokumen)}&fileId=${fileId}`);
      if (!res.ok) return;
      const data = await res.json();
      setExisting(data.annotations || []);
    } catch (err) {
      console.error('AnnotatablePDFViewer: gagal memuat coretan', err);
    }
  }, [nomorDokumen, fileId]);

  useEffect(() => { if (fileId) fetchExisting(); }, [fetchExisting, fileId]);

  // ── 3. Gambar ulang overlay (existing + draft strokes) ─────────────────────
  function drawStroke(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    size: { width: number; height: number },
    color: string
  ) {
    if (points.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, size.width * 0.003);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(points[0].x * size.width, points[0].y * size.height);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * size.width, points[i].y * size.height);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const redrawAllOverlays = useCallback(() => {
    for (let i = 1; i <= numPages; i++) {
      const overlay = overlayRefs.current[i];
      if (!overlay) continue;
      const ctx = overlay.getContext('2d');
      if (!ctx) continue;
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      if (!showOverlay) continue;

      const size = pageSizeRef.current[i];
      if (!size) continue;

      for (const ann of existing.filter(a => a.pageNumber === i && a.type === 'stroke')) {
        drawStroke(ctx, ann.data.points, size, ann.color);
      }
      for (const d of drafts.filter(d => d.pageNumber === i && d.type === 'stroke')) {
        drawStroke(ctx, d.data.points, size, d.color);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPages, existing, drafts, showOverlay]);

  useEffect(() => { redrawAllOverlays(); }, [redrawAllOverlays]);

  // ── 4. Render tiap halaman ke canvas begitu numPages diketahui ─────────────
  const renderAll = useCallback(async () => {
    if (!numPages || !pdfDocRef.current) return;

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDocRef.current.getPage(i);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = canvasRefs.current[i];
      const overlay = overlayRefs.current[i];
      if (!canvas) continue;

      canvas.width  = viewport.width;
      canvas.height = viewport.height;
      if (overlay) {
        overlay.width  = viewport.width;
        overlay.height = viewport.height;
      }
      pageSizeRef.current[i] = { width: viewport.width, height: viewport.height };

      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      await page.render({
        canvasContext: ctx,
        viewport,
        annotationMode: 1, // AnnotationMode.ENABLE: pastikan anotasi/vector shapes dalam PDF ikut ter-render
      }).promise;
    }
    redrawAllOverlays();
  }, [numPages, redrawAllOverlays]);

  useEffect(() => {
    renderAll();
  }, [renderAll, filePath]);

  // Saat beralih kembali dari mode native ke mode anotasi, pastikan canvas & overlay ter-render
  useEffect(() => {
    if (!useNativeViewer && numPages > 0) {
      // Periksa apakah canvas sudah ter-render; jika kosong (misal width=0), panggil renderAll
      const firstCanvas = canvasRefs.current[1];
      if (!firstCanvas || firstCanvas.width === 0) {
        renderAll();
      } else {
        redrawAllOverlays();
      }
    }
  }, [useNativeViewer, numPages, renderAll, redrawAllOverlays]);

  // ── 5. Gambar coret (pen tool) ───────────────────────────────────────────────
  function getRelativePos(e: React.PointerEvent<HTMLCanvasElement>, page: number) {
    const el = overlayRefs.current[page];
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>, page: number) {
    if (!canEdit) return;
    if (tool === 'pen') {
      const pos = getRelativePos(e, page);
      if (!pos) return;
      isDrawingRef.current = true;
      currentPageRef.current = page;
      currentStrokeRef.current = [pos];
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    } else if (tool === 'text') {
      const pos = getRelativePos(e, page);
      if (!pos) return;
      setTextDraft({ page, x: pos.x, y: pos.y, value: '' });
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>, page: number) {
    if (!isDrawingRef.current || currentPageRef.current !== page) return;
    const pos = getRelativePos(e, page);
    if (!pos) return;
    currentStrokeRef.current.push(pos);

    const overlay = overlayRefs.current[page];
    const size = pageSizeRef.current[page];
    if (overlay && size) {
      const ctx = overlay.getContext('2d');
      if (ctx) drawStroke(ctx, currentStrokeRef.current, size, myColor);
    }
  }

  function handlePointerUp() {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const page = currentPageRef.current;
    const points = currentStrokeRef.current;
    currentStrokeRef.current = [];
    currentPageRef.current = null;

    if (page && points.length > 1) {
      setDrafts(prev => [...prev, { pageNumber: page, type: 'stroke', data: { points }, color: myColor }]);
    } else {
      redrawAllOverlays();
    }
  }

  function confirmTextDraft() {
    if (!textDraft || !textDraft.value.trim()) { setTextDraft(null); return; }
    setDrafts(prev => [...prev, {
      pageNumber: textDraft.page,
      type: 'textbox',
      data: { x: textDraft.x, y: textDraft.y, text: textDraft.value.trim() },
      color: myColor,
    }]);
    setTextDraft(null);
  }

  function undoLastDraft() {
    setDrafts(prev => prev.slice(0, -1));
  }

  // ── 6. Simpan ────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (drafts.length === 0) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const payload: any = {
        nomorDokumen, fileId,
        annotations: drafts.map(d => ({ pageNumber: d.pageNumber, type: d.type, data: d.data, color: d.color })),
      };
      if (accToken) {
        payload.token = accToken;
      } else {
        payload.email = myEmail;
        payload.nama  = myNama;
      }

      const res = await fetch('/review-prosedur/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan coretan');

      setDrafts([]);
      setTool('none');
      await fetchExisting();
      setSaveMsg('Coretan berhasil disimpan.');
      onSaved?.();
    } catch (err: any) {
      setSaveMsg(err.message || 'Gagal menyimpan coretan.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 4000);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center gap-3 py-16 bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        <p className="text-slate-500 text-sm">Memuat dokumen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex flex-col items-center justify-center gap-3 py-16 bg-slate-50">
        <p className="text-slate-600 text-sm">Gagal memuat PDF.</p>
      </div>
    );
  }

  const allTextBoxes = [
    ...existing.filter(a => a.type === 'textbox').map(a => ({
      page: a.pageNumber, x: a.data.x, y: a.data.y, text: a.data.text,
      color: a.color, nama: a.createdByNama, email: a.createdByEmail, role: a.createdByRole, isDraft: false,
    })),
    ...drafts.filter(d => d.type === 'textbox').map(d => ({
      page: d.pageNumber, x: d.data.x, y: d.data.y, text: d.data.text,
      color: d.color, nama: myNama ?? null, email: myEmail ?? '', role: myRole ?? 'pic', isDraft: true,
    })),
  ];

  return (
    <div className="w-full h-full flex flex-col">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-200 flex-wrap flex-shrink-0">
        {canEdit && (
          <>
            <button
              type="button"
              onClick={() => {
                setUseNativeViewer(false);
                setTool(t => t === 'pen' ? 'none' : 'pen');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                tool === 'pen' && !useNativeViewer ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              style={tool === 'pen' && !useNativeViewer ? { backgroundColor: myColor } : undefined}
            >
              ✏️ Coret
            </button>
            <button
              type="button"
              onClick={() => {
                setUseNativeViewer(false);
                setTool(t => t === 'text' ? 'none' : 'text');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                tool === 'text' && !useNativeViewer ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              style={tool === 'text' && !useNativeViewer ? { backgroundColor: myColor } : undefined}
            >
              💬 Teks
            </button>
            {drafts.length > 0 && (
              <button
                type="button"
                onClick={undoLastDraft}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
              >
                ↩ Batalkan Terakhir
              </button>
            )}
            <div className="flex-1" />
            {drafts.length > 0 && (
              <span className="text-xs text-slate-400">{drafts.length} belum disimpan</span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={drafts.length === 0 || saving}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all"
            >
              {saving ? 'Menyimpan...' : 'Simpan Coretan'}
            </button>
          </>
        )}
        {showCleanToggle && !canEdit && (
          <>
            <span className="text-xs font-semibold text-slate-500">Tampilan:</span>
            <div className="inline-flex bg-slate-100 rounded-lg p-1 gap-1">
              <button
                type="button"
                onClick={() => setUseNativeViewer(true)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  useNativeViewer ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilkan dokumen PDF asli berkualitas penuh"
              >
                📄 PDF Asli
              </button>
              <button
                type="button"
                onClick={() => { setShowOverlay(false); setUseNativeViewer(false); }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  !showOverlay && !useNativeViewer ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Dokumen Bersih
              </button>
              <button
                type="button"
                onClick={() => { setShowOverlay(true); setUseNativeViewer(false); }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  showOverlay && !useNativeViewer ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Dengan Coretan{existing.length > 0 ? ` (${existing.length})` : ''}
              </button>
            </div>
            <div className="flex-1" />
          </>
        )}

        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setUseNativeViewer(prev => !prev);
              if (useNativeViewer) {
                if (tool === 'none') setTool('pen');
              } else {
                setTool('none');
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              useNativeViewer
                ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title={useNativeViewer ? 'Beralih ke mode canvas untuk mencoret & catatan' : 'Kembali ke viewer PDF asli'}
          >
            {useNativeViewer ? '✏️ Mode Coretan' : '📄 Kembali ke PDF Asli'}
          </button>
        )}
        {saveMsg && <span className="text-xs text-emerald-600 font-medium">{saveMsg}</span>}
      </div>

      {existing.length > 0 && showOverlay && (
        <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[11px] flex-wrap flex-shrink-0">
          {Array.from(new Set(existing.map(a => a.createdByRole))).map(role => (
            <span key={role} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ROLE_COLOR[role] || '#ef4444' }} />
              <span className="text-slate-500">{ROLE_LABEL[role] || role}</span>
            </span>
          ))}
        </div>
      )}

      {/* ── Konten Dokumen PDF: Mode PDF Asli (Native Browser Viewer) ── */}
      <div
        className="flex-1 w-full h-full min-h-0 relative bg-slate-100"
        style={{ display: useNativeViewer ? 'block' : 'none' }}
      >
        {useNativeViewer && (
          <PDFViewer filePath={filePath} fileName={`${nomorDokumen}.pdf`} />
        )}
      </div>

      {/* ── Konten Dokumen PDF: Mode Anotasi (Canvas + Overlay Interaktif) ── */}
      <div
        className="flex-1 overflow-auto bg-slate-200 py-4 flex flex-col items-center gap-4"
        style={{ display: useNativeViewer ? 'none' : 'flex' }}
      >
        {Array.from({ length: numPages }, (_, idx) => idx + 1).map(page => (
          <div
            key={page}
            className="relative inline-block shadow-md bg-white align-top"
            style={{ lineHeight: 0, width: 'max-content' }}
          >
            <canvas ref={el => { canvasRefs.current[page] = el; }} />
            <canvas
              ref={el => { overlayRefs.current[page] = el; }}
              className="absolute top-0 left-0"
              style={{
                cursor: canEdit && tool === 'pen' ? 'crosshair' : canEdit && tool === 'text' ? 'text' : 'default',
                touchAction: 'none',
              }}
              onPointerDown={e => handlePointerDown(e, page)}
              onPointerMove={e => handlePointerMove(e, page)}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
            {showOverlay && allTextBoxes.filter(t => t.page === page).map((t, i) => (
              <div
                key={i}
                className="absolute rounded-lg shadow-lg overflow-hidden"
                style={{
                  left: `${t.x * 100}%`,
                  top: `${t.y * 100}%`,
                  minWidth: '150px',
                  maxWidth: '280px',
                  backgroundColor: t.color,
                  opacity: t.isDraft ? 0.9 : 1,
                  border: t.isDraft ? '2px dashed rgba(255,255,255,0.7)' : '1px solid rgba(0,0,0,0.15)',
                }}
              >
                <div className="px-2.5 pt-1.5 pb-0.5 text-[10px] font-semibold text-white/80 flex items-center gap-1">
                  {t.nama || t.email}
                  {t.isDraft && <span className="text-[9px] font-normal opacity-90">· belum disimpan</span>}
                </div>
                <div className="px-2.5 pb-2 text-[13px] leading-snug font-medium text-white whitespace-pre-wrap break-words">
                  {t.text}
                </div>
              </div>
            ))}

            {textDraft && textDraft.page === page && (
              <div
                className="absolute bg-white border-2 border-blue-500 rounded-xl shadow-2xl p-2.5 z-10"
                style={{ left: `${textDraft.x * 100}%`, top: `${textDraft.y * 100}%`, minWidth: '220px' }}
              >
                <textarea
                  autoFocus
                  value={textDraft.value}
                  onChange={e => setTextDraft(prev => prev ? { ...prev, value: e.target.value } : prev)}
                  placeholder="Tulis komentar..."
                  rows={3}
                  className="w-full text-sm text-slate-900 border border-slate-200 rounded-lg px-2 py-1.5
                             outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
                <div className="flex gap-2 justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setTextDraft(null)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={confirmTextDraft}
                    disabled={!textDraft.value.trim()}
                    className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-40
                               disabled:cursor-not-allowed text-white rounded-lg transition-all"
                  >
                    Tambah
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}