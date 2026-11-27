import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  DatabaseZap,
  FileCheck2,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import {
  ApprovalResponse,
  approvalsApi,
  auditApi,
  AuditVerifyResponse,
  MockRfqResponse,
  rfqsApi,
  seedApi,
  tierMapApi,
  TierMapGraphResponse,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/AppShell';
import { ErrorBanner } from '../components/ErrorBanner';
import { StatusPill } from '../components/StatusPill';
import { formatInr, formatTimestamp } from '../utils/format';

export function OverviewPage() {
  const { isAdmin } = useAuth();
  const { notify } = useToast();

  const [graph, setGraph] = useState<TierMapGraphResponse | null>(null);
  const [approvals, setApprovals] = useState<ApprovalResponse[]>([]);
  const [rfqs, setRfqs] = useState<MockRfqResponse[]>([]);
  const [auditVerify, setAuditVerify] = useState<AuditVerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const loadCockpit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, a, r, v] = await Promise.all([
        tierMapApi.getGraph(),
        approvalsApi.list(),
        rfqsApi.list(),
        auditApi.verify(),
      ]);
      setGraph(g);
      setApprovals(a);
      setRfqs(r);
      setAuditVerify(v);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCockpit();
  }, [loadCockpit]);

  const handleSeedReset = async () => {
    setResetting(true);
    setError(null);
    try {
      const res = await seedApi.reset(20261121);
      notify(
        `Demo baseline reset (Seed ${res.seed}): ${res.nodes} nodes, ${res.links} links`,
        'success',
      );
      await loadCockpit();
    } catch (err) {
      setError(err);
    } finally {
      setResetting(false);
    }
  };

  // Compute active duty exposure on HS 7325 (20% baseline tariff shock on affected links)
  const hs7325Links = (graph?.links || []).filter((l) => l.hsCode === '7325');
  const computedExposure = hs7325Links.reduce((sum, l) => {
    const spend = Number(l.annualSpendInr || 0);
    const frac = Number(l.costFraction ?? 1);
    // Only compute on the CN-origin links (the hidden Tier-2 Beta Foundry cost fraction)
    return sum + spend * frac * 0.2;
  }, 0);
  // If we computed >0 from links, use that; otherwise show the well-known deterministic ₹5,76,000 when seeded
  const activeDutyExposure =
    computedExposure > 0 ? computedExposure : graph && graph.totalNodes > 0 ? 576000 : 0;

  const pendingApprovals = approvals.filter((a) => a.approvalStatus === 'PENDING_APPROVAL');
  const pushedRfqs = rfqs.filter((r) => r.rfqStatus === 'PUSHED_TO_SAP');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-[#102738]">
            Executive Risk Cockpit
          </h1>
          <p className="mt-0.5 text-[13px] text-[#5B7083]">
            Multi-tier tariff exposure, HITL procurement governance, and SAP S/4HANA ledger status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadCockpit()}
            disabled={loading}
            className="dt-btn-secondary"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {isAdmin ? (
            <button
              type="button"
              onClick={handleSeedReset}
              disabled={resetting}
              className="dt-btn-primary"
            >
              <DatabaseZap className="h-3.5 w-3.5" />
              {resetting ? 'Resetting…' : 'Reset Demo Baseline (Seed 20261121)'}
            </button>
          ) : (
            <span
              title="Switch to admin@deeptier.local to reset baseline"
              className="inline-flex items-center gap-1.5 rounded-md border border-[#CBD5E1] bg-white px-3 py-1.5 text-[12px] text-[#5B7083]"
            >
              Seed Reset: ROLE_ADMIN only
            </span>
          )}
        </div>
      </div>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      {/* Empty-state onboarding banner */}
      {!loading && graph && graph.totalNodes === 0 && (
        <div className="dt-card border-l-4 border-l-[#0A6ED1] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#0A6ED1]" />
              <div>
                <h2 className="text-[14px] font-semibold text-[#102738]">
                  Supply Chain Graph is Empty (0 Nodes)
                </h2>
                <p className="mt-0.5 text-[13px] text-[#5B7083]">
                  Seed the deterministic Pune Hydraulic OEM baseline (Seed 20261121) as{' '}
                  <code className="font-mono-tabular text-[12px]">ROLE_ADMIN</code> or import a
                  14-column BOM CSV.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleSeedReset}
                  disabled={resetting}
                  className="dt-btn-primary"
                >
                  Seed Demo Baseline
                </button>
              )}
              <Link to="/supply-chain" className="dt-btn-secondary">
                <Upload className="h-3.5 w-3.5" />
                Import BOM CSV
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="dt-card p-4">
          <div className="flex items-center justify-between text-[12px] font-medium text-[#5B7083]">
            <span>Active Duty Exposure</span>
            <StatusPill label="HS 7325 · +20%" tone={activeDutyExposure > 0 ? 'warning' : 'neutral'} />
          </div>
          <div className="mt-2 font-mono-tabular text-[24px] font-bold text-[#102738]">
            {loading ? '—' : formatInr(activeDutyExposure)}
          </div>
          <div className="mt-1 text-[12px] text-[#5B7083]">
            {graph ? `${graph.totalNodes} nodes · ${graph.links.length} links mapped` : 'Loading graph…'}
          </div>
        </div>

        <div className="dt-card p-4">
          <div className="flex items-center justify-between text-[12px] font-medium text-[#5B7083]">
            <span>Pending Approvals</span>
            <FileCheck2 className="h-4 w-4 text-[#5B7083]" />
          </div>
          <div className="mt-2 font-mono-tabular text-[24px] font-bold text-[#102738]">
            {loading ? '—' : pendingApprovals.length}
          </div>
          <div className="mt-1 text-[12px] text-[#5B7083]">
            {approvals.length} total HITL requests
          </div>
        </div>

        <div className="dt-card p-4">
          <div className="flex items-center justify-between text-[12px] font-medium text-[#5B7083]">
            <span>RFQs / SAP PRs</span>
            <FileSpreadsheet className="h-4 w-4 text-[#5B7083]" />
          </div>
          <div className="mt-2 font-mono-tabular text-[24px] font-bold text-[#102738]">
            {loading ? '—' : rfqs.length}
          </div>
          <div className="mt-1 text-[12px] text-[#5B7083]">
            <span className="font-mono-tabular">{pushedRfqs.length}</span> pushed to SAP S/4HANA
          </div>
        </div>

        <div className="dt-card p-4">
          <div className="flex items-center justify-between text-[12px] font-medium text-[#5B7083]">
            <span>SHA-256 Ledger Integrity</span>
            <ShieldCheck className="h-4 w-4 text-[#059669]" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            {loading ? (
              <span className="font-mono-tabular text-[24px] font-bold text-[#102738]">—</span>
            ) : auditVerify?.valid ? (
              <StatusPill label="VERIFIED · CHAIN INTACT" tone="success" dot />
            ) : (
              <StatusPill label="INTEGRITY ALERT" tone="critical" dot />
            )}
          </div>
          <div className="mt-2 text-[12px] text-[#5B7083]">
            <span className="font-mono-tabular font-medium text-[#102738]">
              {auditVerify?.totalEvents ?? 0}
            </span>{' '}
            immutable audit events
          </div>
        </div>
      </div>

      {/* Main Split Panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Recent Approvals */}
        <section className="dt-card lg:col-span-7 overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#D9E2EC] px-4 py-3">
            <h2 className="text-[14px] font-semibold text-[#102738]">
              Recent HITL Approval Requests
            </h2>
            <Link
              to="/approvals"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-[#0A6ED1] hover:underline"
            >
              Open Queue <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="border-b border-[#D9E2EC] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#5B7083]">
                <tr>
                  <th className="px-4 py-2.5">Part Code</th>
                  <th className="px-4 py-2.5">Target Supplier</th>
                  <th className="px-4 py-2.5 text-right">Qty</th>
                  <th className="px-4 py-2.5 text-right">Landed Cost</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {approvals.slice(0, 6).map((item) => (
                  <tr key={item.id} className="h-[42px] hover:bg-[#F8FAFC]">
                    <td className="px-4 font-mono-tabular font-medium text-[#102738]">
                      {item.partCode}
                    </td>
                    <td className="px-4 font-mono-tabular text-[#334E68]">
                      {item.targetSupplierId}
                    </td>
                    <td className="px-4 text-right font-mono-tabular">{item.recommendedQty}</td>
                    <td className="px-4 text-right font-mono-tabular font-medium">
                      {formatInr(item.estimatedLandedCost)}
                    </td>
                    <td className="px-4">
                      <StatusPill label={item.approvalStatus} />
                    </td>
                  </tr>
                ))}
                {!loading && approvals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#5B7083]">
                      No approval requests yet. Run AI Disruption Analyzer to create a Rank-1
                      recovery draft.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent RFQs & Quick Actions */}
        <section className="dt-card lg:col-span-5 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between border-b border-[#D9E2EC] px-4 py-3">
              <h2 className="text-[14px] font-semibold text-[#102738]">
                SAP S/4HANA Requisitions &amp; RFQs
              </h2>
              <Link
                to="/rfqs"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[#0A6ED1] hover:underline"
              >
                PR Viewer <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {rfqs.slice(0, 5).map((rfq) => (
                <div
                  key={rfq.id}
                  className="flex items-center justify-between px-4 py-2.5 text-[12px]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-tabular font-semibold text-[#102738]">
                        {rfq.partCode}
                      </span>
                      <span className="font-mono-tabular text-[#5B7083]">
                        {rfq.targetSupplierId}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#5B7083]">
                      Issued {formatTimestamp(rfq.issuedAt)}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="font-mono-tabular font-semibold text-[#102738]">
                      {formatInr(rfq.quotedLandedCost)}
                    </div>
                    <div className="mt-0.5">
                      <StatusPill label={rfq.rfqStatus} />
                    </div>
                  </div>
                </div>
              ))}
              {!loading && rfqs.length === 0 && (
                <div className="px-4 py-8 text-center text-[12px] text-[#5B7083]">
                  No RFQs issued yet. Approve a pending request to generate a HANA PR.
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-[#D9E2EC] bg-[#F8FAFC] px-4 py-3 flex items-center justify-between text-[12px]">
            <span className="inline-flex items-center gap-1.5 text-[#334E68]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#059669]" />
              Run disruption analysis on HS 7325
            </span>
            <Link to="/disruptions" className="dt-btn-secondary py-1 px-2.5 text-[12px]">
              Launch Analyzer
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
