// components/pic/PICStatsCards.tsx

interface Stats {
  totalDocuments: number;
  pendingReview: number;
  completedReview: number;
  totalRequests: number;
}

interface PICStatsCardsProps {
  stats: Stats;
  onRequestClick?: () => void;
}

// ─── Keyframe injection (satu kali, tidak bergantung komponen lain) ──────────
const URGENCY_STYLE_ID = '__pic-urgency-styles__';
if (typeof document !== 'undefined' && !document.getElementById(URGENCY_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = URGENCY_STYLE_ID;
  style.textContent = `
    @keyframes pic-pulse-ring {
      0%   { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.35); }
      60%  { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0);  }
      100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);   }
    }
    @keyframes pic-badge-pop {
      0%   { transform: scale(0.85); opacity: 0; }
      60%  { transform: scale(1.08); }
      100% { transform: scale(1);   opacity: 1; }
    }
    @keyframes pic-count-in {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0);   }
    }
    .pic-urgent-card {
      animation: pic-pulse-ring 2.4s ease-out infinite;
    }
    .pic-urgent-badge {
      animation: pic-badge-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    .pic-stat-value {
      animation: pic-count-in 0.35s ease both;
    }
  `;
  document.head.appendChild(style);
}

// ─── Tipe khusus untuk prop "variant" ────────────────────────────────────────
type CardVariant = 'default' | 'urgent';

// ─── Konfigurasi warna per variant dan per color ──────────────────────────────
const VARIANT_CONFIG: Record<
  CardVariant,
  { card: string; iconWrapper: string; valueText: string }
> = {
  default: {
    card:        'bg-white border border-slate-200 shadow-sm hover:shadow-md',
    iconWrapper: '',
    valueText:   'text-slate-900',
  },
  urgent: {
    card:
      'bg-gradient-to-br from-amber-50 via-white to-orange-50 ' +
      'border-2 border-amber-400 shadow-amber-100 shadow-md pic-urgent-card',
    iconWrapper: '',
    valueText:   'text-amber-700',
  },
};

const COLOR_ICON_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  blue:    'bg-blue-50  text-blue-600  border border-blue-200',
  amber:   'bg-amber-100 text-amber-700 border border-amber-300',
  slate:   'bg-slate-50  text-slate-600 border border-slate-200',
};

// ─── StatCard ────────────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  icon,
  color,
  variant = 'default',
  urgencyLabel,
  onClick,
  clickable = false,
  subtitle,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'emerald' | 'blue' | 'amber' | 'slate';
  variant?: CardVariant;
  urgencyLabel?: string;
  onClick?: () => void;
  clickable?: boolean;
  subtitle?: string;
}) {
  const isUrgent = variant === 'urgent';
  const { card, valueText } = VARIANT_CONFIG[variant];
  const iconClass = COLOR_ICON_CLASSES[color];

  return (
    <div
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      className={`relative rounded-xl p-4 transition-all duration-200 ${card} ${
        clickable
          ? 'cursor-pointer hover:-translate-y-0.5 hover:border-blue-400 hover:ring-2 hover:ring-blue-100 select-none'
          : ''
      }`}
    >
      {/* Badge urgency */}
      {isUrgent && urgencyLabel && (
        <span
          className={
            'pic-urgent-badge absolute -top-2.5 left-4 ' +
            'inline-flex items-center gap-1 ' +
            'px-2 py-0.5 rounded-full ' +
            'bg-amber-500 text-white text-[10px] font-bold tracking-wide uppercase shadow-sm'
          }
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
          </span>
          {urgencyLabel}
        </span>
      )}

      <div className="flex items-center justify-between">
        {/* Nilai & label */}
        <div>
          <p className="text-xs text-slate-500 mb-0.5 font-medium">{title}</p>
          <p className={`text-2xl font-bold pic-stat-value ${valueText}`}>
            {value}
          </p>

          {subtitle && (
            <p className="text-[11px] text-blue-600 font-semibold mt-1 flex items-center gap-1">
              <span>{subtitle}</span>
              <svg className="w-3 h-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </p>
          )}

          {/* Progress bar — hanya untuk pending */}
          {isUrgent && value > 0 && (
            <div className="mt-2 w-24 h-1 bg-amber-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(value * 10, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Icon */}
        <div
          className={`
            p-2.5 rounded-lg flex-shrink-0
            ${iconClass}
            ${isUrgent ? 'ring-2 ring-amber-300 ring-offset-1' : ''}
          `}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── PICStatsCards (export utama) ─────────────────────────────────────────────
export default function PICStatsCards({ stats, onRequestClick }: PICStatsCardsProps) {
  const hasPending = stats.pendingReview > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">

      {/* Total Dokumen */}
      <StatCard
        title="Total Dokumen"
        value={stats.totalDocuments}
        color="emerald"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />

      {/* Menunggu Review — URGENT jika > 0 */}
      <StatCard
        title="Menunggu Review"
        value={stats.pendingReview}
        color="amber"
        variant={hasPending ? 'urgent' : 'default'}
        urgencyLabel={hasPending ? 'Perlu tindakan' : undefined}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />

      {/* Review Selesai */}
      <StatCard
        title="Review Selesai"
        value={stats.completedReview}
        color="emerald"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />

      {/* Total Requests — Klik untuk buka modal daftar request aktif */}
      <StatCard
        title="Total Requests"
        value={stats.totalRequests}
        color="blue"
        clickable={Boolean(onRequestClick)}
        onClick={onRequestClick}
        subtitle={onRequestClick ? 'Klik untuk lihat detail' : undefined}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
      />

    </div>
  );
}
 