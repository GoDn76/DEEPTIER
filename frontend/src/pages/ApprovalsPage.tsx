import React, { useCallback, useEffect, useState } from 'react';
import { Check, FileCheck2, Plus, RefreshCw, X } from 'lucide-react';
import { ApprovalResponse, approvalsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/AppShell';
import { ErrorBanner } from '../components/ErrorBanner';
import { StatusPill } from '../components/StatusPill';
import { formatInr, formatTimestamp } from '../utils/format';

const STATUS_FILTERS = [
  'ALL',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'RFQ_ISSUED',
  'AUDITED',
] as const;

const LIFECYCLE_STEPS = ['PENDING_APPROVAL', 'APPROVED', 'RFQ_ISSUED', 'AUDITED'] as const;

export function ApprovalsPage() {
  const { session, isApproverOrAdmin } = useAuth();
  const { notify } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [items, setItems] = useState<ApprovalResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [partCode, setPartCode] = useState('HPH-1042');
  const [targetSupplierId, setTargetSupplierId] = useState('SUP-RJK-CAST');
  const [recommendedQty, setRecommendedQty] = useState('300');
  const [estimatedLandedCost, setEstimatedLandedCost] = useState('518000');
  const [creating, setCreating] = useState(false);

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await approvalsApi.list(statusFilter === 'ALL' ? undefined : statusFilter);
      setItems(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadApprovals();
  }, [loadApprovals]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const created = await approvalsApi.create({
        partCode: partCode.trim(),
        targetSupplierId: targetSupplierId.trim(),
        recommendedQty: Number(recommendedQty),
        estimatedLandedCost: estimatedLandedCost ? Number(estimatedLandedCost) : undefined,
      });
      notify(`Created approval draft ${created.id.slice(0, 8)}`, 'success');
      setShowCreate(false);
      await loadApprovals();
    } catch (err) {
      setError(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDecision = async (id: string, decision: 'approve' | 'reject') => {
    setActionId(id);
    setError(null);
    try {
      const res =
        decision === 'approve'
          ? await approvalsApi.approve(id, { comment: 'Approved via DeepTier HITL Cockpit' })
          : await approvalsApi.reject(id, { reason: 'Rejected by procurement reviewer' });

      notify(
        decision === 'approve'
          ? `Approved ${res.approval.partCode}${res.rfq ? ` · RFQ ${res.rfq.id.slice(0, 8)} issued` : ''}`
          : `Rejected ${res.approval.partCode}`,
        'success',
      );
      await loadApprovals();
    } catch (err) {
      setError(err);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-[#102738]">
            Human-in-the-Loop (HITL) Approval Queue
          </h1>
          <p className="mt-0.5 text-[13px] text-[#5B7083]">
            Segregated procurement governance: Analysts draft requests; Approvers/Admins authorize
            with Idempotency-Key.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadApprovals()}
            disabled={loading}
            className="dt-btn-secondary"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="dt-btn-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            New Approval Draft
          </button>
        </div>
      </div>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      {/* Create Draft Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="dt-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#D9E2EC] pb-2">
            <h2 className="text-[13px] font-semibold text-[#102738]">
              Create Recovery Approval Draft
            </h2>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-[12px] text-[#5B7083] hover:text-[#102738]"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#334E68] mb-1">
                Part Code
              </label>
              <input
                required
                value={partCode}
                onChange={(e) => setPartCode(e.target.value)}
                className="dt-input font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#334E68] mb-1">
                Target Supplier ID
              </label>
              <input
                required
                value={targetSupplierId}
                onChange={(e) => setTargetSupplierId(e.target.value)}
                className="dt-input font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#334E68] mb-1">
                Recommended Qty
              </label>
              <input
                type="number"
                required
                value={recommendedQty}
                onChange={(e) => setRecommendedQty(e.target.value)}
                className="dt-input font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#334E68] mb-1">
                Est. Landed Cost (INR)
              </label>
              <input
                type="number"
                value={estimatedLandedCost}
                onChange={(e) => setEstimatedLandedCost(e.target.value)}
                className="dt-input font-mono-tabular"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={creating} className="dt-btn-primary">
              {creating ? 'Creating…' : 'Submit Draft'}
            </button>
          </div>
        </form>
      )}

      {/* Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              statusFilter === s
                ? 'border-[#0A6ED1] bg-[#EFF6FF] text-[#0A6ED1]'
                : 'border-[#D9E2EC] bg-white text-[#5B7083] hover:text-[#102738]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Approval Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="dt-card p-8 text-center text-[13px] text-[#5B7083]">
            Loading approval queue…
          </div>
        ) : items.length === 0 ? (
          <div className="dt-card p-8 text-center text-[13px] text-[#5B7083]">
            <FileCheck2 className="mx-auto mb-2 h-6 w-6 text-[#94A3B8]" />
            No approval requests match the selected filter.
          </div>
        ) : (
          items.map((item) => {
            const isSelfRequest = Boolean(
              session?.username &&
                item.requestedBy &&
                item.requestedBy.toLowerCase() === session.username.toLowerCase(),
            );
            const isPending = item.approvalStatus === 'PENDING_APPROVAL';
            const canDecide = isPending && isApproverOrAdmin && !isSelfRequest;

            let disabledReason = '';
            if (!isApproverOrAdmin) {
              disabledReason = 'Requires ROLE_APPROVER or ROLE_ADMIN';
            } else if (isSelfRequest) {
              disabledReason = 'Self-approval blocked (403): switch to another Approver/Admin';
            } else if (!isPending) {
              disabledReason = `Already finalized (${item.approvalStatus})`;
            }

            const currentStepIndex = LIFECYCLE_STEPS.indexOf(
              item.approvalStatus as (typeof LIFECYCLE_STEPS)[number],
            );

            return (
              <article key={item.id} className="dt-card p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-tabular text-[14px] font-bold text-[#102738]">
                        {item.partCode}
                      </span>
                      <span className="text-[#5B7083]">→</span>
                      <span className="font-mono-tabular text-[13px] font-semibold text-[#0A6ED1]">
                        {item.targetSupplierId}
                      </span>
                      <StatusPill label={item.approvalStatus} />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#5B7083]">
                      <span>
                        Qty:{' '}
                        <strong className="font-mono-tabular text-[#102738]">
                          {item.recommendedQty}
                        </strong>
                      </span>
                      <span>
                        Landed Cost:{' '}
                        <strong className="font-mono-tabular text-[#102738]">
                          {formatInr(item.estimatedLandedCost)}
                        </strong>
                      </span>
                      <span>
                        Requested by:{' '}
                        <code className="font-mono-tabular text-[#102738]">
                          {item.requestedBy || '—'}
                        </code>
                      </span>
                      {item.reviewerName && (
                        <span>
                          Reviewer:{' '}
                          <code className="font-mono-tabular text-[#102738]">
                            {item.reviewerName}
                          </code>
                        </span>
                      )}
                      <span>Created {formatTimestamp(item.createdAt)}</span>
                    </div>
                  </div>

                  {/* Role-gated Approve/Reject */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={!canDecide || actionId === item.id}
                      title={disabledReason || 'Approve and issue RFQ'}
                      onClick={() => handleDecision(item.id, 'approve')}
                      className="dt-btn-secondary border-[#A7F3D0] text-[#065F46] hover:bg-[#ECFDF5]"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={!canDecide || actionId === item.id}
                      title={disabledReason || 'Reject request'}
                      onClick={() => handleDecision(item.id, 'reject')}
                      className="dt-btn-secondary border-[#FECACA] text-[#991B1B] hover:bg-[#FEF2F2]"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>
                </div>

                {/* Lifecycle Stepper */}
                <div className="mt-3 pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center gap-2 text-[11px]">
                  {item.approvalStatus === 'REJECTED' ? (
                    <StatusPill label="WORKFLOW TERMINATED: REJECTED" tone="critical" />
                  ) : (
                    LIFECYCLE_STEPS.map((step, idx) => {
                      const reached = currentStepIndex >= idx;
                      return (
                        <React.Fragment key={step}>
                          <span
                            className={`rounded px-2 py-0.5 font-mono-tabular font-medium ${
                              reached
                                ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                                : 'bg-[#F8FAFC] text-[#94A3B8] border border-[#E2E8F0]'
                            }`}
                          >
                            {step}
                          </span>
                          {idx < LIFECYCLE_STEPS.length - 1 && (
                            <span className="text-[#CBD5E1]">→</span>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                  {isPending && disabledReason && (
                    <span className="ml-auto text-[11px] text-[#92400E]">{disabledReason}</span>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
