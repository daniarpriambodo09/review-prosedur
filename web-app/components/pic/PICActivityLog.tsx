interface Activity {
  id: number;
  activityType: string;
  description: string;
  createdAt: string;
}

interface PICActivityLogProps {
  activities: Activity[];
}

function getActivityIcon(activityType: string) {
  const icons: Record<string, { icon: string; color: string }> = {
    'login': { icon: '🔐', color: 'text-blue-600' },
    'review': { icon: '👁️', color: 'text-emerald-600' },
    'request': { icon: '📤', color: 'text-amber-600' },
    'document': { icon: '📄', color: 'text-slate-600' },
    'logout': { icon: '🚪', color: 'text-red-600' },
  };
  return icons[activityType] || { icon: '•', color: 'text-slate-600' };
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins}m yang lalu`;
  if (diffHours < 24) return `${diffHours}h yang lalu`;
  if (diffDays < 7) return `${diffDays}d yang lalu`;
  
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
  });
}

export default function PICActivityLog({ activities }: PICActivityLogProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Aktivitas Terbaru</h2>
      </div>

      {activities.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <svg className="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-slate-500 text-sm font-medium">Tidak ada aktivitas</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
          {activities.map((activity) => {
            const { icon, color } = getActivityIcon(activity.activityType);
            return (
              <div key={activity.id} className="px-6 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex gap-3">
                  <span className={`text-lg flex-shrink-0 ${color}`}>{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 font-medium truncate">{activity.description}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatTime(activity.createdAt)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
