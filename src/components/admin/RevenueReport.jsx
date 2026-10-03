import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, RefreshCw, AlertCircle, DollarSign, Activity } from 'lucide-react';
import { Button, GlassCard, Badge } from '../common';
import { useAuth } from '../../context/AuthContext';

export default function RevenueReport() {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { authFetch } = useAuth();

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await authFetch('/api/reports/revenue');
      setReport(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const totalRevenue = report.reduce((sum, r) => sum + (r.total_revenue || 0), 0);
  const totalSessions = report.reduce((sum, r) => sum + (r.total_sessions || 0), 0);

  const handleDownloadCsv = () => {
    if (!report.length) return;
    const headers = 'Event Name,Total Sessions,Total Revenue\n';
    const csvRows = report.map(r => `"${r.event_name}",${r.total_sessions},${r.total_revenue}`);
    const csvContent = headers + csvRows.join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            Revenue & Usage Reports
          </h2>
          <p className="text-slate-400 text-sm mt-1">Aggregated transaction data for all your events</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={fetchReport} disabled={loading} leftIcon={RefreshCw}>
            Refresh
          </Button>
          <Button variant="primary" onClick={handleDownloadCsv} disabled={loading || !report.length} leftIcon={Download}>
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 text-red-300 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard className="p-6 flex items-center gap-5">
          <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-2xl">
            <DollarSign className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">Total Revenue</p>
            <p className="text-3xl font-bold font-display text-white mt-1">
              Rp {totalRevenue.toLocaleString('id-ID')}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-6 flex items-center gap-5">
          <div className="p-4 bg-blue-500/20 text-blue-400 rounded-2xl">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">Total Paid Sessions</p>
            <p className="text-3xl font-bold font-display text-white mt-1">
              {totalSessions.toLocaleString('id-ID')}
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Data Table */}
      <GlassCard className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
          </div>
        ) : report.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <Activity className="w-12 h-12 mb-3 opacity-20" />
            <p>No revenue data found for your events yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-white/10">
                  <th className="p-4 font-semibold text-slate-300">Event Name</th>
                  <th className="p-4 font-semibold text-slate-300 text-center">Sessions</th>
                  <th className="p-4 font-semibold text-slate-300 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {report.map((row) => (
                  <tr key={row.event_id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-medium text-white">{row.event_name}</td>
                    <td className="p-4 text-center">
                      <Badge variant="blue">{row.total_sessions} prints</Badge>
                    </td>
                    <td className="p-4 text-right font-semibold text-emerald-400">
                      Rp {row.total_revenue.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
