import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Send,
  Sparkles,
} from 'lucide-react';
import {
  AnalyzeDisruptionResponse,
  approvalsApi,
  disruptionApi,
  RouteOption,
} from '../api/client';
import { useToast } from '../components/AppShell';
import { ErrorBanner } from '../components/ErrorBanner';
import { StatusPill } from '../components/StatusPill';
import { formatInr, formatNumber, formatPercent } from '../utils/format';

export function DisruptionsPage() {
  const navigate = useNavigate();
  const { notify } = useToast();

  const [alertText, setAlertText] = useState('20% tariff on HSN 7325 castings from China');
  const [partCode, setPartCode] = useState('HPH-1042');
  const [annualSpendInr, setAnnualSpendInr] = useState('4800000');
  const [costFraction, setCostFraction] = useState('0.60');

  const [busy, setBusy] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<AnalyzeDisruptionResponse | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await disruptionApi.analyze({
        alertText: alertText.trim(),
        partCode: partCode.trim() || undefined,
        annualSpendInr: annualSpendInr ? Number(annualSpendInr) : undefined,
        costFraction: costFraction ? Number(costFraction) : undefined,
      });
      setResult(res);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const rank1Option: RouteOption | undefined =
    result?.simulation?.recoveryOptions?.find((o) => o.recommended) ||
    result?.simulation?.recoveryOptions?.[0];

  const handleSendRank1ToApproval = async () => {
    if (!result || !rank1Option || !rank1Option.targetSupplierId) return;
    setSubmittingApproval(true);
    setError(null);
    try {
      const created = await approvalsApi.create({
        partCode: result.partCode || partCode || 'HPH-1042',
        targetSupplierId: rank1Option.targetSupplierId,
        recommendedQty: 300,
        estimatedLandedCost: rank1Option.estimatedLandedCostInr ?? rank1Option.totalImpactInr,
        estimatedLeadTimeDays:
          rank1Option.etaDaysP50 != null ? Math.round(rank1Option.etaDaysP50) : undefined,
        scenarioId: result.scenarioId,
      });
      notify(
        `Approval draft ${created.id.slice(0, 8)} created for ${created.targetSupplierId}`,
        'success',
      );
      navigate('/approvals');
    } catch (err) {
      setError(err);
    } finally {
      setSubmittingApproval(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-bold tracking-tight text-[#102738]">
          AI Disruption Analyzer
        </h1>
        <p className="mt-0.5 text-[13px] text-[#5B7083]">
          Natural-language customs/supply shock extraction grounded by deterministic Java exposure
          &amp; cover engines.
        </p>
      </div>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      {/* Input Form */}
      <form onSubmit={handleAnalyze} className="dt-card p-4 sm:p-5 space-y-4">
        <div>
          <label className="block text-[12px] font-semibold text-[#334E68] mb-1.5">
            Disruption Signal / Trade Alert
          </label>
          <textarea
            rows={2}
            required
            value={alertText}
            onChange={(e) => setAlertText(e.target.value)}
            placeholder="e.g., 20% tariff on HSN 7325 castings from China"
            className="dt-input"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-[12px] font-semibold text-[#334E68] mb-1">
              Part Code (Optional)
            </label>
            <input
              type="text"
              value={partCode}
              onChange={(e) => setPartCode(e.target.value)}
              className="dt-input font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#334E68] mb-1">
              Annual Spend Override (INR)
            </label>
            <input
              type="number"
              value={annualSpendInr}
              onChange={(e) => setAnnualSpendInr(e.target.value)}
              className="dt-input font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#334E68] mb-1">
              Cost Fraction (0.0 – 1.0)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={costFraction}
              onChange={(e) => setCostFraction(e.target.value)}
              className="dt-input font-mono-tabular"
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-1">
          <button type="submit" disabled={busy} className="dt-btn-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {busy ? 'Analyzing Disruption…' : 'Analyze Disruption'}
          </button>
        </div>
      </form>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Metadata Pills */}
          <div className="dt-card p-3.5 flex flex-wrap items-center gap-2 text-[12px]">
            <span className="font-semibold text-[#5B7083] mr-1">Extraction Telemetry:</span>
            {result.extractionEngine && (
              <StatusPill label={`Engine: ${result.extractionEngine}`} tone="ai" />
            )}
            {result.backendStatus && (
              <StatusPill
                label={`Backend: ${result.backendStatus}`}
                tone={
                  result.backendStatus === 'connected'
                    ? 'success'
                    : result.backendStatus === 'partial'
                      ? 'warning'
                      : 'warning'
                }
                dot
              />
            )}
            {result.signalType && <StatusPill label={`Signal: ${result.signalType}`} />}
            {result.affectedHsCode && (
              <StatusPill label={`HS ${result.affectedHsCode}`} tone="neutral" />
            )}
            {result.originCountry && (
              <StatusPill label={`Origin: ${result.originCountry}`} tone="neutral" />
            )}
            {result.confidence != null && (
              <StatusPill
                label={`Confidence: ${formatPercent(result.confidence, result.confidence <= 1)}`}
                tone="neutral"
              />
            )}
          </div>

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[12px] text-[#92400E]">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Analyzer Warnings
              </div>
              <ul className="mt-1 list-disc pl-5 space-y-0.5">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* UNPARSED / simulationSkipped Guard */}
          {result.simulationSkipped ? (
            <div className="dt-card border-l-4 border-l-[#D97706] p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#D97706]" />
                <div>
                  <h2 className="text-[15px] font-bold text-[#102738]">
                    Human Review Required — Signal Unparsed (Simulation Skipped)
                  </h2>
                  <p className="mt-1 text-[13px] text-[#5B7083]">
                    The signal was classified as <code className="font-mono-tabular">UNPARSED</code>.
                    Per DeepTier zero-hallucination policy, deterministic exposure and recovery
                    simulations were skipped with zero fabricated numbers.
                  </p>
                  {result.executiveBrief && (
                    <p className="mt-3 rounded-md border border-[#D9E2EC] bg-[#F8FAFC] p-3 text-[13px] text-[#102738]">
                      {result.executiveBrief}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Executive Brief */}
              {result.executiveBrief && (
                <section className="dt-card p-4 sm:p-5">
                  <div className="flex items-center justify-between border-b border-[#D9E2EC] pb-2.5 mb-3">
                    <h2 className="text-[14px] font-semibold text-[#102738]">Executive Brief</h2>
                    {result.scenarioId && (
                      <span className="font-mono-tabular text-[11px] text-[#5B7083]">
                        Scenario: {result.scenarioId}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#102738] whitespace-pre-line">
                    {result.executiveBrief}
                  </p>
                </section>
              )}

              {/* Unified Exposure & Cover Cards */}
              {result.simulation && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="dt-card p-4">
                    <div className="text-[12px] font-medium text-[#5B7083]">
                      Total Duty Exposure
                    </div>
                    <div className="mt-1.5 font-mono-tabular text-[22px] font-bold text-[#102738]">
                      {formatInr(result.simulation.tariffShock?.totalExposureInr)}
                    </div>
                    <div className="mt-1 text-[11px] text-[#5B7083]">
                      Tariff Δ: +{formatNumber(result.simulation.tariffShock?.deltaPercentagePoints)}
                      % on HS {result.simulation.tariffShock?.hsCode || result.affectedHsCode}
                    </div>
                  </div>

                  <div className="dt-card p-4">
                    <div className="text-[12px] font-medium text-[#5B7083]">
                      Inventory Cover vs. Gap
                    </div>
                    <div className="mt-1.5 font-mono-tabular text-[22px] font-bold text-[#102738]">
                      {result.simulation.inventory?.coverDaysDisplay ||
                        `${formatNumber(result.simulation.inventory?.coverDays)}d`}
                    </div>
                    <div className="mt-1 text-[11px] text-[#991B1B] font-medium">
                      Stoppage Gap: {result.simulation.inventory?.gapDays ?? 0} days (
                      {formatInr(result.simulation.inventory?.expectedLateLossInr)} loss)
                    </div>
                  </div>

                  <div className="dt-card p-4">
                    <div className="text-[12px] font-medium text-[#5B7083]">
                      Monte Carlo ({result.simulation.monteCarlo?.trials ?? 10000} Trials)
                    </div>
                    <div className="mt-1.5 font-mono-tabular text-[22px] font-bold text-[#102738]">
                      P50: {formatNumber(result.simulation.monteCarlo?.arrivalDaysP50, 1)}d
                    </div>
                    <div className="mt-1 text-[11px] text-[#5B7083]">
                      P90: {formatNumber(result.simulation.monteCarlo?.arrivalDaysP90, 1)}d ·
                      Stockout Prob:{' '}
                      {formatPercent(result.simulation.monteCarlo?.stockoutProbability, true)}
                    </div>
                  </div>
                </div>
              )}

              {/* Ranked Recovery Options */}
              {result.simulation?.recoveryOptions &&
                result.simulation.recoveryOptions.length > 0 && (
                  <section className="dt-card overflow-hidden">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#D9E2EC] px-4 py-3">
                      <div>
                        <h2 className="text-[14px] font-semibold text-[#102738]">
                          Ranked Recovery Options
                        </h2>
                        <p className="text-[12px] text-[#5B7083]">
                          Deterministic landed-cost &amp; stoppage-loss comparison
                        </p>
                      </div>
                      {rank1Option && rank1Option.targetSupplierId && (
                        <button
                          type="button"
                          disabled={submittingApproval}
                          onClick={handleSendRank1ToApproval}
                          className="dt-btn-primary"
                        >
                          <Send className="h-3.5 w-3.5" />
                          {submittingApproval
                            ? 'Submitting Draft…'
                            : `Send Rank-1 (${rank1Option.targetSupplierId}) to Approval Queue`}
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[12px]">
                        <thead className="border-b border-[#D9E2EC] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#5B7083]">
                          <tr>
                            <th className="px-4 py-2.5">Rank</th>
                            <th className="px-4 py-2.5">Option / Supplier</th>
                            <th className="px-4 py-2.5">Mode</th>
                            <th className="px-4 py-2.5 text-right">Landed Cost</th>
                            <th className="px-4 py-2.5 text-right">Total Impact</th>
                            <th className="px-4 py-2.5 text-right">ETA P50</th>
                            <th className="px-4 py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {result.simulation.recoveryOptions.map((opt, idx) => (
                            <tr key={opt.optionId || idx} className="h-[44px] hover:bg-[#F8FAFC]">
                              <td className="px-4 font-mono-tabular font-semibold">
                                #{opt.rank ?? idx + 1}
                              </td>
                              <td className="px-4">
                                <div className="font-semibold text-[#102738]">
                                  {opt.targetSupplierId || opt.optionType}
                                </div>
                                <div className="text-[11px] text-[#5B7083]">{opt.description}</div>
                              </td>
                              <td className="px-4 font-mono-tabular text-[#334E68]">
                                {opt.modeChain || '—'}
                              </td>
                              <td className="px-4 text-right font-mono-tabular">
                                {formatInr(opt.estimatedLandedCostInr)}
                              </td>
                              <td className="px-4 text-right font-mono-tabular font-semibold text-[#102738]">
                                {formatInr(opt.totalImpactInr)}
                              </td>
                              <td className="px-4 text-right font-mono-tabular">
                                {opt.etaDaysP50 != null ? `${formatNumber(opt.etaDaysP50, 1)}d` : '—'}
                              </td>
                              <td className="px-4">
                                {opt.recommended ? (
                                  <StatusPill
                                    label={
                                      <span className="inline-flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> RECOMMENDED
                                      </span>
                                    }
                                    tone="success"
                                  />
                                ) : (
                                  <StatusPill label={opt.optionType || 'ALTERNATIVE'} tone="neutral" />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
            </>
          )}
        </div>
      )}

      {!result && !busy && (
        <div className="dt-card p-6 text-center text-[13px] text-[#5B7083]">
          Click <strong className="text-[#102738]">Analyze Disruption</strong> to run Gemini + Java
          deterministic analysis and generate Rank-1 recovery options{' '}
          <ArrowRight className="inline h-3.5 w-3.5" /> Approval Queue.
        </div>
      )}
    </div>
  );
}
