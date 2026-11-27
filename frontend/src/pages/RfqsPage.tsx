import { useCallback, useEffect, useState } from 'react';
import { Code2, FileSpreadsheet, RefreshCw, Send } from 'lucide-react';
import {
  MockRfqResponse,
  rfqsApi,
  SapPurchaseRequisitionPayload,
  SapPushResponse,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/AppShell';
import { ErrorBanner } from '../components/ErrorBanner';
import { StatusPill } from '../components/StatusPill';
import { formatInr, formatTimestamp } from '../utils/format';

export function RfqsPage() {
  const { isApproverOrAdmin } = useAuth();
  const { notify } = useToast();

  const [rfqs, setRfqs] = useState<MockRfqResponse[]>([]);
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);
  const [sapPayload, setSapPayload] = useState<SapPurchaseRequisitionPayload | null>(null);
  const [pushResult, setPushResult] = useState<SapPushResponse | null>(null);
  const [viewMode, setViewMode] = useState<'document' | 'json'>('document');

  const [loadingList, setLoadingList] = useState(true);
  const [loadingPayload, setLoadingPayload] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const loadRfqs = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const list = await rfqsApi.list();
      setRfqs(list);
      if (list.length > 0 && !selectedRfqId) {
        setSelectedRfqId(list[0].id);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoadingList(false);
    }
  }, [selectedRfqId]);

  useEffect(() => {
    void loadRfqs();
  }, [loadRfqs]);

  useEffect(() => {
    if (!selectedRfqId) {
      setSapPayload(null);
      return;
    }
    let cancelled = false;
    setLoadingPayload(true);
    setPushResult(null);
    rfqsApi
      .getSapPayload(selectedRfqId)
      .then((res) => {
        if (!cancelled) setSapPayload(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoadingPayload(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRfqId]);

  const selectedRfq = rfqs.find((r) => r.id === selectedRfqId) || null;

  const handlePushSap = async () => {
    if (!selectedRfqId) return;
    setPushing(true);
    setError(null);
    try {
      const res = await rfqsApi.pushSap(selectedRfqId);
      setPushResult(res);
      notify(
        `SAP S/4HANA PR created: ${res.purchaseRequisitionId} (${res.mode})`,
        'success',
      );
      await loadRfqs();
    } catch (err) {
      setError(err);
    } finally {
      setPushing(false);
    }
  };

  const firstItem = sapPayload?.payload?.to_PurchaseReqnItem?.results?.[0] || null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-[#102738]">
            SAP HANA Purchase Requisition (PR) Viewer &amp; RFQs
          </h1>
          <p className="mt-0.5 text-[13px] text-[#5B7083]">
            Inspect HANA <code className="font-mono-tabular">RFQ_RECORD</code> rows, OData V2{' '}
            <code className="font-mono-tabular">API_PURCHASEREQ_PROCESS_SRV</code> payloads, and
            push PRs to S/4HANA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadRfqs()}
            disabled={loadingList}
            className="dt-btn-secondary"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            disabled={
              !selectedRfq ||
              !isApproverOrAdmin ||
              pushing ||
              selectedRfq.rfqStatus === 'PUSHED_TO_SAP'
            }
            title={
              !isApproverOrAdmin
                ? 'Requires ROLE_APPROVER or ROLE_ADMIN'
                : selectedRfq?.rfqStatus === 'PUSHED_TO_SAP'
                  ? 'Already pushed to SAP S/4HANA'
                  : 'Execute OData V2 Purchase Requisition push'
            }
            onClick={handlePushSap}
            className="dt-btn-primary"
          >
            <Send className="h-3.5 w-3.5" />
            {pushing ? 'Pushing to SAP…' : 'Push to SAP S/4HANA'}
          </button>
        </div>
      </div>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      {/* Master-Detail Split View (5 cols left / 7 cols right) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Panel (5 cols): Dense HANA RFQ_RECORD Table */}
        <section className="dt-card lg:col-span-5 overflow-hidden">
          <div className="border-b border-[#D9E2EC] px-4 py-3 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-[#102738]">
              HANA RFQ_RECORD ({rfqs.length})
            </h2>
            {!isApproverOrAdmin && (
              <span className="text-[11px] text-[#5B7083]">Push: Approver/Admin only</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="border-b border-[#D9E2EC] bg-[#F8FAFC] text-[10px] font-semibold uppercase tracking-wider text-[#5B7083]">
                <tr>
                  <th className="px-3 py-2">RFQ / Part</th>
                  <th className="px-3 py-2">Supplier</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Landed</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {rfqs.map((rfq) => {
                  const selected = rfq.id === selectedRfqId;
                  return (
                    <tr
                      key={rfq.id}
                      onClick={() => setSelectedRfqId(rfq.id)}
                      className={`h-[44px] cursor-pointer transition-colors ${
                        selected ? 'bg-[#EFF6FF]' : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <td className="px-3">
                        <div className="font-mono-tabular font-semibold text-[#102738]">
                          {rfq.partCode}
                        </div>
                        <div className="font-mono-tabular text-[10px] text-[#5B7083]">
                          {rfq.id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-3 font-mono-tabular text-[#334E68]">
                        {rfq.targetSupplierId}
                      </td>
                      <td className="px-3 text-right font-mono-tabular">{rfq.requestedQty}</td>
                      <td className="px-3 text-right font-mono-tabular font-medium">
                        {formatInr(rfq.quotedLandedCost)}
                      </td>
                      <td className="px-3">
                        <StatusPill label={rfq.rfqStatus} />
                      </td>
                    </tr>
                  );
                })}
                {!loadingList && rfqs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[#5B7083]">
                      No RFQs issued yet. Approve a request in Approval Queue first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right Panel (7 cols): PR Document Inspector */}
        <section className="dt-card lg:col-span-7 overflow-hidden flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D9E2EC] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-[#0A6ED1]" />
              <h2 className="text-[13px] font-semibold text-[#102738]">PR Document Inspector</h2>
            </div>

            {/* Segmented Toggle */}
            <div className="inline-flex rounded-md border border-[#D9E2EC] bg-[#F3F6F8] p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode('document')}
                className={`inline-flex items-center gap-1 rounded px-2.5 py-1 font-semibold ${
                  viewMode === 'document'
                    ? 'bg-white text-[#102738] shadow-xs'
                    : 'text-[#5B7083]'
                }`}
              >
                <FileSpreadsheet className="h-3 w-3" />
                PR Document View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('json')}
                className={`inline-flex items-center gap-1 rounded px-2.5 py-1 font-semibold ${
                  viewMode === 'json' ? 'bg-white text-[#102738] shadow-xs' : 'text-[#5B7083]'
                }`}
              >
                <Code2 className="h-3 w-3" />
                OData V2 JSON View
              </button>
            </div>
          </div>

          <div className="p-4 flex-1">
            {loadingPayload ? (
              <div className="py-16 text-center text-[13px] text-[#5B7083]">
                Loading SAP OData V2 payload…
              </div>
            ) : !selectedRfq || !sapPayload ? (
              <div className="py-16 text-center text-[13px] text-[#5B7083]">
                Select an RFQ row on the left to inspect its SAP Purchase Requisition payload.
              </div>
            ) : viewMode === 'document' ? (
              <div className="space-y-4 text-[12px]">
                {pushResult && (
                  <div className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] p-3 text-[#065F46]">
                    <div className="font-semibold">
                      Pushed to SAP S/4HANA ({pushResult.mode})
                    </div>
                    <div className="mt-0.5 font-mono-tabular text-[12px]">
                      PR Number: <strong>{pushResult.purchaseRequisitionId}</strong> · Synced at{' '}
                      {formatTimestamp(pushResult.pushedAt)}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] p-3.5">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5B7083]">
                      DeepTier RFQ ID
                    </div>
                    <div className="mt-0.5 font-mono-tabular font-medium text-[#102738]">
                      {sapPayload.correlation?.deepTierRfqId || selectedRfq.id}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5B7083]">
                      S/4HANA PR Number
                    </div>
                    <div className="mt-0.5 font-mono-tabular font-semibold text-[#0A6ED1]">
                      {pushResult?.purchaseRequisitionId ||
                        (selectedRfq.rfqStatus === 'PUSHED_TO_SAP'
                          ? `PR-S4-${selectedRfq.id.slice(0, 6).toUpperCase()}`
                          : 'Pending Push')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5B7083]">
                      OData Service
                    </div>
                    <div className="mt-0.5 font-mono-tabular text-[#102738]">
                      {sapPayload.sapService || 'API_PURCHASEREQ_PROCESS_SRV'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5B7083]">
                      Target Vendor / FixedSupplier
                    </div>
                    <div className="mt-0.5 font-mono-tabular font-medium text-[#102738]">
                      {String(firstItem?.FixedSupplier || selectedRfq.targetSupplierId)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5B7083]">
                      Material / Part Code
                    </div>
                    <div className="mt-0.5 font-mono-tabular font-medium text-[#102738]">
                      {String(firstItem?.Material || selectedRfq.partCode)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5B7083]">
                      Requested Qty &amp; Landed Value
                    </div>
                    <div className="mt-0.5 font-mono-tabular font-semibold text-[#102738]">
                      {String(firstItem?.RequestedQuantity || selectedRfq.requestedQty)} EA ·{' '}
                      {formatInr(selectedRfq.quotedLandedCost)}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5B7083]">
                      SHA-256 Audit Correlation Hash
                    </div>
                    <div className="mt-0.5 font-mono-tabular text-[11px] break-all text-[#334E68]">
                      {sapPayload.correlation?.auditHash || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5B7083]">
                      Issued / Sync Timestamp
                    </div>
                    <div className="mt-0.5 text-[#334E68]">
                      {formatTimestamp(pushResult?.pushedAt || selectedRfq.issuedAt)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5B7083]">
                      SAP Status
                    </div>
                    <div className="mt-0.5">
                      <StatusPill label={pushResult?.status || selectedRfq.rfqStatus} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <pre className="max-h-[460px] overflow-auto rounded-lg border border-[#1E3A50] bg-[#0F172A] p-4 font-mono-tabular text-[11px] leading-relaxed text-[#E2E8F0]">
                {JSON.stringify(sapPayload, null, 2)}
              </pre>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
