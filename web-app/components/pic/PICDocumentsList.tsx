// app/components/pic/PICDocumentsList.tsx

interface Document {
  id: number;
  documentNumber: string;
  title: string;
  status: string;
  createdAt: string;
}

interface PICDocumentsListProps {
  documents: Document[];
}

function getStatusColor(status: string) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    'pending': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    'approved': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    'rejected': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    'revision': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  };
  return colors[status] || colors['pending'];
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function PICDocumentsList({ documents }: PICDocumentsListProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Daftar Dokumen</h2>
      </div>

      {documents.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-slate-500 font-medium">Tidak ada dokumen</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {documents.map((doc) => {
            const statusColor = getStatusColor(doc.status);
            return (
              <div key={doc.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-slate-900">{doc.documentNumber}</p>
                    <p className="text-sm text-slate-600 mt-1">{doc.title}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                    {doc.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">Dibuat: {formatDate(doc.createdAt)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
