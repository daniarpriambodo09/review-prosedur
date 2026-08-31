// components/documents/VersionToggleBar.tsx
'use client';

export interface VersionOption {
  version: number;
  uploadedAt: string;
}

interface VersionToggleBarProps {
  current: VersionOption;
  previous: VersionOption;
  viewing: 'current' | 'previous';
  onChange: (v: 'current' | 'previous') => void;
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

export default function VersionToggleBar({ current, previous, viewing, onChange }: VersionToggleBarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap px-1">
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
        Bandingkan:
      </span>
      <div className="inline-flex bg-slate-100 rounded-lg p-1 gap-1">
        <button
          type="button"
          onClick={() => onChange('previous')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all text-left ${
            viewing === 'previous'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Dokumen Lama · v{previous.version}
          <span className="block text-[10px] font-normal opacity-70">{formatShortDate(previous.uploadedAt)}</span>
        </button>
        <button
          type="button"
          onClick={() => onChange('current')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all text-left ${
            viewing === 'current'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Dokumen Baru · v{current.version}
          <span className="block text-[10px] font-normal opacity-70">{formatShortDate(current.uploadedAt)}</span>
        </button>
      </div>
    </div>
  );
}