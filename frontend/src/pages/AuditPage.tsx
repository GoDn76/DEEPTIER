import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, RefreshCw, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { auditApi, AuditEvent, AuditVerifyResponse } from '../api/client';
import { useToast } from '../components/AppShell';
import { ErrorBanner } from '../components/ErrorBanner';
import { StatusPill } from '../components/StatusPill';
import { formatTimestamp, truncateHash } from '../utils/format';

export function AuditPage() {
  const { notify } = useToast();

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [verify, setVerify] = useState<AuditVerifyResponse | null>(null);
  const [scenarioId, setScenarioId] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  const loadAudit = useCallback(async (filterScenario?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [ev, ver] = await Promise.all([
        filterScenario?.trim()
          ? auditApi.listByScenario(filterScenario.trim())
          : auditApi.list(),
        auditApi.verify(),
      ]);
      setEvents(ev);
      setVerify(ver);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const handleVerifyChain = async () => {
    setVerifying(true);
    setError(null);
    try {
      const res = await auditApi.verify();
      setVerify(res);
      notify(
        res.valid
          ? `SHA-256 chain verified: ${res.totalEvents} events intact`
          : `Integrity failure at event ${res.brokenAtEventId}`,
        res.valid ? 'success' : 'error',
      );
    } catch (err) {
      setError(err);
    } finally {
      setVerifying(false);
    }
  };

  const handleCopy = async (id: string, value?: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1500);
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void loadAudit(scenarioId);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-[#102738]">
            SHA-256 Tamper-Evident Audit Trail
          </h1>
          <p className="mt-0.5 text-[13px] text-[#5B7083]">
            Cryptographically hash-chained ledger of every approval, RFQ, and SAP S/4HANA PR push.
          </p>
        </div>

        <button
          type="button"
          onClick={handleVerifyChain}
          disabled={verifying}
          className="dt-btn-primary"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${verifying ? 'animate-spin' : ''}`} />
          {verifying ? 'Verifying Chain…' : 'Verify SHA-256 Chain'}
        </button>
      </div>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      {/* Top Integrity Banner */}
      <div
        className={`dt-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
          verify?.valid === false ? 'border-[#FECACA] bg-[#FEF2F2]' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          {verify?.valid !== false ? (
            <ShieldCheck className="h-5 w-5 text-[#059669]" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-[#991B1B]" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-[#102738]">
                Cryptographic Hash-Chain Status
              </span>
              {verify && (
                <StatusPill
                  label={verify.valid ? 'VALID · TAMPER-EVIDENT' : 'BROKEN CHAIN'}
                  tone={verify.valid ? 'success' : 'critical'}
                  dot
                />
              )}
            </div>
            <div className="mt-0.5 text-[12px] text-[#5B7083]">
              Total Verified Events:{' '}
              <strong className="font-mono-tabular text-[#102738]">
                {verify?.totalEvents ?? events.length}
              </strong>
              {verify?.brokenAtEventId && (
                <span className="ml-2 font-mono-tabular text-[#991B1B]">
                  Broken at: {verify.brokenAtEventId}
                </span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleFilterSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#5B7083]" />
            <input
              type="text"
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
              placeholder="Filter by Scenario ID…"
              className="dt-input pl-8 w-56 font-mono-tabular text-[12px]"
            />
          </div>
          <button type="submit" className="dt-btn-secondary">
            Filter
          </button>
          {scenarioId && (
            <button
              type="button"
              onClick={() => {
                setScenarioId('');
                void loadAudit('');
              }}
              className="dt-btn-secondary"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Chronological Monospace Table */}
      <section className="dt-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-[#D9E2EC] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#5B7083]">
              <tr>
                <th className="px-4 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5">Event Type</th>
                <th className="px-4 py-2.5">Actor</th>
                <th className="px-4 py-2.5">Scenario / Entity</th>
                <th className="px-4 py-2.5">Before Hash</th>
                <th className="px-4 py-2.5">After Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {events.map((ev) => {
                const after = ev.afterHash || ev.hash;
                const before = ev.beforeHash || ev.prevHash;
                return (
                  <tr key={ev.id} className="h-[42px] hover:bg-[#F8FAFC]">
                    <td className="px-4 whitespace-nowrap text-[11px] text-[#5B7083]">
                      {formatTimestamp(ev.occurredAt)}
                    </td>
                    <td className="px-4">
                      <StatusPill label={ev.eventType} />
                    </td>
                    <td className="px-4 font-mono-tabular text-[#102738]">
                      {ev.actor || 'system'}
                    </td>
                    <td className="px-4 font-mono-tabular text-[11px] text-[#5B7083]">
                      {ev.scenarioId || ev.entityId || '—'}
                    </td>
                    <td className="px-4 font-mono-tabular text-[11px] text-[#5B7083]">
                      {truncateHash(before)}
                    </td>
                    <td className="px-4">
                      <div className="inline-flex items-center gap-1.5 font-mono-tabular text-[11px] text-[#102738]">
                        <span>{truncateHash(after)}</span>
                        {after && (
                          <button
                            type="button"
                            onClick={() => void handleCopy(ev.id, after)}
                            className="rounded p-1 text-[#5B7083] hover:bg-[#E2E8F0] hover:text-[#102738]"
                            title="Copy full SHA-256 hash"
                          >
                            {copiedId === ev.id ? (
                              <Check className="h-3 w-3 text-[#059669]" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && events.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#5B7083]">
                    No audit events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
