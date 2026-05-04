// app/admin/seed/page.tsx

'use client';
import { useState } from 'react';

export default function SeedPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSeed = async () => {
    try {
      setLoading(true);
      const response = await fetch('/review-prosedur/api/procedures/seed', {
        method: 'POST',
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to seed database' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Database Seeding</h1>
        <p className="text-gray-600 mb-6">
          Klik tombol di bawah untuk mengisi database dengan data prosedur awal.
        </p>

        <button
          onClick={handleSeed}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sedang memproses...' : 'Seed Database'}
        </button>

        {result && (
          <div className={`mt-6 p-4 rounded-lg ${result.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
            <h3 className="font-semibold mb-2">Result:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}