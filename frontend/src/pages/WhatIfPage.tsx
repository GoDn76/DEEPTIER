import React, { useState } from 'react';
import { SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import { whatIfApi, WhatIfSimulationResponse } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import { StatusPill } from '../components/StatusPill';
import { formatInr, formatNumber, formatPercent } from '../utils/format';

export function WhatIfPage() {
  const [hsCode, setHsCode] = useState('7325');
  const [originCountry, setOriginCountry] = useState('CN');
  const [deltaPercentagePoints, setDeltaPercentagePoints] = useState('20');
  const [annualSpendInr, setAnnualSpendInr] = useState('4800000');
  const [costFraction, setCostFraction] = useState('0.60');
  const [unitsOnHand, setUnitsOnHand] = useState('300');
  const [dailyDemand, setDailyDemand] = useState('20');
  const [leadTimeDays, setLeadTimeDays] = useState('30');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<WhatIfSimulationResponse | null>(null);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await whatIfApi.simulate({
        hsCode: hsCode.trim() || undefined,
        originCountry: originCountry.trim() || undefined,
        deltaPercentagePoints: Number(deltaPercentagePoints),
        annualSpendInr: annualSpendInr ? Number(annualSpendInr) : undefined,
        costFraction: costFraction ? Number(costFraction) : undefined,
        unitsOnHand: unitsOnHand ? Number(unitsOnHand) : undefined,
        dailyDemand: dailyDemand ? Number(dailyDemand) : undefined,
        leadTimeDays: leadTimeDays ? Number(leadTimeDays) : undefined,
      });
      setResult(res);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const coverDays = result?.inventory?.coverDays ?? 0;
  const leadDays = result?.inventory?.replenishmentLeadDays ?? Number(leadTimeDays || 30);
  const gapDays = result?.inventory?.gapDays ?? 0;
  const coverPct = leadDays > 0 ? Math.min(100, Math.round((coverDays / leadDays) * 100)) : 100;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-bold tracking-tight text-[#102738]">
          What-If Tariff &amp; Monte Carlo Simulator
        </h1>
        <p className="mt-0.5 text-[13px] text-[#5B7083]">
          Deterministic tariff shock exposure, inventory cover gap, and 10,000-trial Monte Carlo
          lead-time simulation.
        </p>
      </div>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <form onSubmit={handleSimulate} className="dt-card p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#334E68] mb-1">HS Code</label>
            <input
              type="text"
              value={hsCode}
              onChange={(e) => setHsCode(e.target.value)}
              className="dt-input font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#334E68] mb-1">
              Origin Country
            </label>
            <input
              type="text"
              value={originCountry}
              onChange={(e) => setOriginCountry(e.target.value)}
              className="dt-input font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#334E68] mb-1">
              Tariff Shock Δ (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={deltaPercentagePoints}
              onChange={(e) => setDeltaPercentagePoints(e.target.value)}
              className="dt-input font-mono-tabular"
            />
            <div className="mt-1 flex gap-1.5">
              {['0', '12.5', '20'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDeltaPercentagePoints(preset)}
                  className="rounded border border-[#CBD5E1] bg-[#F8FAFC] px-1.5 py-0.5 font-mono-tabular text-[10px] text-[#334E68] hover:border-[#0A6ED1]"
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#334E68] mb-1">
              Annual Spend (INR)
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
              Cost Fraction
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
          <div>
            <label className="block text-[12px] font-semibold text-[#334E68] mb-1">
              Units On Hand
            </label>
            <input
              type="number"
              value={unitsOnHand}
              onChange={(e) => setUnitsOnHand(e.target.value)}
              className="dt-input font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#334E68] mb-1">
              Daily Demand (Units)
            </label>
            <input
              type="number"
              value={dailyDemand}
              onChange={(e) => setDailyDemand(e.target.value)}
              className="dt-input font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#334E68] mb-1">
              Replenishment Lead Time (Days)
            </label>
            <input
              type="number"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(e.target.value)}
              className="dt-input font-mono-tabular"
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-1">
          <button type="submit" disabled={busy} className="dt-btn-primary">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {busy ? 'Running 10,000 Trials…' : 'Run What-If Simulation'}
          </button>
        </div>
      </form>

      {result && (
        <div className="space-y-4">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Duty Exposure */}
            <div className="dt-card p-4">
              <div className="flex items-center justify-between text-[12px] font-medium text-[#5B7083]">
                <span>Duty Exposure</span>
                <StatusPill label={`HS ${result.tariffShock?.hsCode || hsCode}`} tone="warning" />
              </div>
              <div className="mt-2 font-mono-tabular text-[24px] font-bold text-[#102738]">
                {formatInr(result.tariffShock?.totalExposureInr)}
              </div>
              <div className="mt-1 text-[12px] text-[#5B7083]">
                Δ {formatNumber(result.tariffShock?.deltaPercentagePoints)}% · Pass-through{' '}
                {formatPercent(result.tariffShock?.passThroughPct, false)}
              </div>
            </div>

            {/* Cover vs Gap Gauge */}
            <div className="dt-card p-4">
              <div className="flex items-center justify-between text-[12px] font-medium text-[#5B7083]">
                <span>Days of Cover vs. Gap</span>
                <StatusPill
                  label={gapDays > 0 ? `${gapDays}d GAP` : 'COVERED'}
                  tone={gapDays > 0 ? 'critical' : 'success'}
                />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono-tabular text-[24px] font-bold text-[#102738]">
                  {formatNumber(coverDays, 1)}d
                </span>
                <span className="font-mono-tabular text-[12px] text-[#5B7083]">
                  / {leadDays}d lead time
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#FEF2F2] border border-[#FECACA]">
                <div
                  className="h-full bg-[#0A6ED1]"
                  style={{ width: `${coverPct}%` }}
                />
              </div>
              <div className="mt-1.5 text-[11px] text-[#5B7083]">
                Expected stoppage loss:{' '}
                <span className="font-mono-tabular font-semibold text-[#991B1B]">
                  {formatInr(result.inventory?.expectedLateLossInr)}
                </span>
              </div>
            </div>

            {/* 10k Monte Carlo Percentiles */}
            <div className="dt-card p-4">
              <div className="flex items-center justify-between text-[12px] font-medium text-[#5B7083]">
                <span>Monte Carlo ({result.monteCarlo?.trials ?? 10000} Trials)</span>
                <StatusPill label={`Seed ${result.monteCarlo?.seed ?? '—'}`} tone="ai" />
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded border border-[#D9E2EC] bg-[#F8FAFC] py-1.5">
                  <div className="text-[10px] font-semibold text-[#5B7083]">P10</div>
                  <div className="font-mono-tabular text-[14px] font-bold text-[#102738]">
                    {formatNumber(result.monteCarlo?.arrivalDaysP10, 1)}d
                  </div>
                </div>
                <div className="rounded border border-[#D9E2EC] bg-[#F8FAFC] py-1.5">
                  <div className="text-[10px] font-semibold text-[#5B7083]">P50</div>
                  <div className="font-mono-tabular text-[14px] font-bold text-[#102738]">
                    {formatNumber(result.monteCarlo?.arrivalDaysP50, 1)}d
                  </div>
                </div>
                <div className="rounded border border-[#D9E2EC] bg-[#F8FAFC] py-1.5">
                  <div className="text-[10px] font-semibold text-[#5B7083]">
                    {result.monteCarlo?.arrivalDaysP95 != null ? 'P95' : 'P90'}
                  </div>
                  <div className="font-mono-tabular text-[14px] font-bold text-[#102738]">
                    {formatNumber(
                      result.monteCarlo?.arrivalDaysP95 ?? result.monteCarlo?.arrivalDaysP90,
                      1,
                    )}
                    d
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-[#5B7083]">
                Deadline miss:{' '}
                <span className="font-mono-tabular font-semibold">
                  {formatPercent(result.monteCarlo?.deadlineMissProbability, true)}
                </span>{' '}
                · Late loss:{' '}
                <span className="font-mono-tabular font-semibold">
                  {formatInr(result.monteCarlo?.expectedLateLossInr)}
                </span>
              </div>
            </div>
          </div>

          {/* Ranked Recovery Comparison Table */}
          <section className="dt-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#D9E2EC] px-4 py-3">
              <h2 className="text-[14px] font-semibold text-[#102738]">
                Ranked Supplier Recovery Comparison
              </h2>
              {result.executionTimeMs != null && (
                <span className="font-mono-tabular text-[11px] text-[#5B7083]">
                  Executed in {result.executionTimeMs} ms
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="border-b border-[#D9E2EC] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#5B7083]">
                  <tr>
                    <th className="px-4 py-2.5">Rank</th>
                    <th className="px-4 py-2.5">Target Supplier / Option</th>
                    <th className="px-4 py-2.5 text-right">Unit Cost</th>
                    <th className="px-4 py-2.5 text-right">Est. Landed Cost</th>
                    <th className="px-4 py-2.5 text-right">Duty</th>
                    <th className="px-4 py-2.5 text-right">Total Impact</th>
                    <th className="px-4 py-2.5">Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {(result.recoveryOptions || []).map((opt, idx) => (
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
                      <td className="px-4 text-right font-mono-tabular">
                        {formatInr(opt.unitCostInr)}
                      </td>
                      <td className="px-4 text-right font-mono-tabular">
                        {formatInr(opt.estimatedLandedCostInr)}
                      </td>
                      <td className="px-4 text-right font-mono-tabular">
                        {formatInr(opt.modeledDutyInr)}
                      </td>
                      <td className="px-4 text-right font-mono-tabular font-semibold text-[#102738]">
                        {formatInr(opt.totalImpactInr)}
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
                          <StatusPill label={opt.optionType || 'OPTION'} tone="neutral" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
