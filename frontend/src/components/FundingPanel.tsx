import { useCallback, useEffect, useState } from 'react';
import { HandCoins, Mail, Phone, RefreshCw } from 'lucide-react';
import { getCleanupFunding, placeCleanupBid } from '../api';
import type { CleanupFundingSummary, Report, User } from '../types';

interface FundingPanelProps {
  report: Report;
  currentUser: User;
}

const emptySummary = (reportId: string): CleanupFundingSummary => ({
  report_id: reportId,
  total_amount: 0,
  currency: 'INR',
  bid_count: 0,
  bids: [],
});

export function FundingPanel({ report, currentUser }: FundingPanelProps) {
  const [summary, setSummary] = useState<CleanupFundingSummary>(emptySummary(report.id));
  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadFunding = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      setSummary(await getCleanupFunding(report.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load cleanup funding.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [report.id]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- load server state for this report
    loadFunding();
    const refreshTimer = window.setInterval(() => loadFunding(false), 15000);
    return () => window.clearInterval(refreshTimer);
  }, [loadFunding]);

  const submitBid = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter a valid pledge amount greater than zero.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await placeCleanupBid(report.id, {
        amount: numericAmount,
        contact_email: currentUser.email,
        contact_phone: phone.trim() || undefined,
        message: message.trim() || undefined,
      });
      setAmount('');
      setMessage('');
      setSuccess('Your pledge is now visible to potential cleanup volunteers.');
      await loadFunding();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not place this pledge.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3" aria-labelledby={`funding-${report.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p id={`funding-${report.id}`} className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
            <HandCoins className="h-4 w-4" aria-hidden="true" /> Community cleanup fund
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-800">
            ₹{Number(summary.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-700">{summary.bid_count} active {summary.bid_count === 1 ? 'pledge' : 'pledges'} · recorded, not yet charged</p>
        </div>
        <button type="button" onClick={() => setExpanded((value) => !value)} className="min-h-11 rounded-lg border border-emerald-300 bg-white px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50">
          {expanded ? 'Close' : 'View and pledge'}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-emerald-200 pt-4">
          {loading ? (
            <p className="flex items-center gap-2 text-xs text-slate-600"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading pledges…</p>
          ) : summary.bids.length ? (
            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
              {summary.bids.map((bid) => (
                <article key={bid.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                  <div className="flex justify-between gap-2">
                    <strong className="text-slate-900">{bid.bidder_name}</strong>
                    <strong className="text-emerald-700">₹{Number(bid.amount).toLocaleString('en-IN')}</strong>
                  </div>
                  {bid.message && <p className="mt-1 text-slate-600">{bid.message}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-slate-500">
                    <a href={`mailto:${bid.contact_email}`} className="flex items-center gap-1 hover:text-emerald-700"><Mail className="h-3 w-3" /> {bid.contact_email}</a>
                    {bid.contact_phone && <a href={`tel:${bid.contact_phone}`} className="flex items-center gap-1 hover:text-emerald-700"><Phone className="h-3 w-3" /> {bid.contact_phone}</a>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-white p-3 text-xs text-slate-500">No pledges yet. Be the first person to support this cleanup.</p>
          )}

          <form onSubmit={submitBid} className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-bold text-slate-900">Add your cleanup pledge</p>
            {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
            {success && <p role="status" className="text-xs text-emerald-700">{success}</p>}
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label htmlFor={`amount-${report.id}`} className="mb-1 block text-[11px] font-semibold text-slate-600">Amount in INR</label>
                <input id={`amount-${report.id}`} type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div>
                <label htmlFor={`phone-${report.id}`} className="mb-1 block text-[11px] font-semibold text-slate-600">Contact phone (optional)</label>
                <input id={`phone-${report.id}`} type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
              </div>
            </div>
            <div>
              <label htmlFor={`message-${report.id}`} className="mb-1 block text-[11px] font-semibold text-slate-600">Message for cleanup volunteers (optional)</label>
              <textarea id={`message-${report.id}`} rows={2} value={message} onChange={(event) => setMessage(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
            </div>
            <button disabled={submitting} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
              {submitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />} Record pledge
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
