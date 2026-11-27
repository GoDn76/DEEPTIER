import React, { useState } from 'react';
import { CheckCircle2, MapPin, Route, ShieldAlert } from 'lucide-react';
import { logisticsApi, RerouteResponse } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import { StatusPill } from '../components/StatusPill';
import { formatInr, formatNumber } from '../utils/format';

const MODES = ['air', 'sea', 'road', 'rail'] as const;

export function LogisticsPage() {
  const [origin, setOrigin] = useState('Ningbo');
  const [destination, setDestination] = useState('Pune');
  const [cargoDescription, setCargoDescription] = useState('HS 7325 Hydraulic Castings');
  const [weightKg, setWeightKg] = useState('2400');
  const [allowedModes, setAllowedModes] = useState<string[]>(['sea', 'road', 'rail', 'air']);
  const [incoterm, setIncoterm] = useState('CIF');
  const [declaredValueUsd, setDeclaredValueUsd] = useState('32000');
  const [useDemoDefaults, setUseDemoDefaults] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<RerouteResponse | null>(null);

  const toggleMode = (mode: string) => {
    setAllowedModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode],
    );
  };

  const handleReroute = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await logisticsApi.reroute({
        origin: origin.trim(),
        destination: destination.trim(),
        cargoDescription: cargoDescription.trim(),
        weightKg: Number(weightKg) || 1000,
        allowedModes: allowedModes.length > 0 ? allowedModes : ['road'],
        incoterm: incoterm.trim() || undefined,
        declaredValueUsd: declaredValueUsd ? Number(declaredValueUsd) : undefined,
        useDemoDefaults,
      });
      setResult(res);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const legs = result?.legs || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-bold tracking-tight text-[#102738]">
          57-Hub Logistics Reroute Planner
        </h1>
        <p className="mt-0.5 text-[13px] text-[#5B7083]">
          Multi-modal corridor optimization with strict separation of Physical Route Feasibility and
          Commercial Readiness.
        </p>
      </div>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <form onSubmit={handleReroute} className="dt-card p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#334E68] mb-1">Origin Hub</label>
            <input
              type="text"
              required
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="dt-input"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#334E68] mb-1">
              Destination Hub
            </label>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="dt-input"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#334E68] mb-1">
              Cargo Description
            </label>
            <input
              type="text"
              required
              value={cargoDescription}
              onChange={(e) => setCargoDescription(e.target.value)}
              className="dt-input"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#334E68] mb-1">
              Weight (kg)
            </label>
            <input
              type="number"
              required
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="dt-input font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#334E68] mb-1">Incoterm</label>
            <input
              type="text"
              value={incoterm}
              onChange={(e) => setIncoterm(e.target.value)}
              className="dt-input font-mono-tabular"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#334E68] mb-1">
              Declared Value (USD)
            </label>
            <input
              type="number"
              value={declaredValueUsd}
              onChange={(e) => setDeclaredValueUsd(e.target.value)}
              className="dt-input font-mono-tabular"
            />
          </div>
          <div className="sm:col-span-2 flex flex-col justify-end">
            <div className="text-[12px] font-semibold text-[#334E68] mb-1.5">Allowed Modes</div>
            <div className="flex flex-wrap items-center gap-2">
              {MODES.map((m) => {
                const active = allowedModes.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMode(m)}
                    className={`rounded-md border px-3 py-1.5 text-[12px] font-medium uppercase ${
                      active
                        ? 'border-[#0A6ED1] bg-[#EFF6FF] text-[#0A6ED1]'
                        : 'border-[#CBD5E1] bg-white text-[#5B7083]'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
              <label className="ml-auto inline-flex items-center gap-2 text-[12px] text-[#334E68] cursor-pointer">
                <input
                  type="checkbox"
                  checked={useDemoDefaults}
                  onChange={(e) => setUseDemoDefaults(e.target.checked)}
                  className="h-4 w-4 accent-[#0A6ED1]"
                />
                Use Demo Defaults
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-1">
          <button type="submit" disabled={busy} className="dt-btn-primary">
            <Route className="h-3.5 w-3.5" />
            {busy ? 'Computing 57-Hub Route…' : 'Compute Optimal Reroute'}
          </button>
        </div>
      </form>

      {result && (
        <div className="space-y-4">
          {/* CRITICAL UI SPLIT: Physical Feasibility vs Commercial Readiness */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="dt-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-[#5B7083]">
                  1. Physical Route Feasibility
                </span>
                <StatusPill
                  label={result.feasible ? 'FEASIBLE' : 'INFEASIBLE'}
                  tone={result.feasible ? 'success' : 'critical'}
                  dot
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <div className="text-[#5B7083]">Est. Freight Cost</div>
                  <div className="mt-0.5 font-mono-tabular text-[18px] font-bold text-[#102738]">
                    {formatInr(result.costEstimateInr)}
                  </div>
                </div>
                <div>
                  <div className="text-[#5B7083]">Est. Transit Time</div>
                  <div className="mt-0.5 font-mono-tabular text-[18px] font-bold text-[#102738]">
                    {result.transitHoursEstimate != null
                      ? `${formatNumber(result.transitHoursEstimate, 1)} hrs`
                      : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="dt-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-[#5B7083]">
                  2. Commercial Readiness Gate
                </span>
                <StatusPill
                  label={result.decisionStatus || result.decision?.status || 'UNKNOWN'}
                  tone={
                    result.decisionStatus === 'ready_for_human_approval' ? 'success' : 'critical'
                  }
                  dot
                />
              </div>
              <div className="mt-3 space-y-1.5 text-[12px]">
                {result.decision?.gateReasons && result.decision.gateReasons.length > 0 ? (
                  result.decision.gateReasons.map((reason, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-1.5 text-[#334E68]"
                    >
                      {result.decisionStatus === 'ready_for_human_approval' ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#059669]" />
                      ) : (
                        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#991B1B]" />
                      )}
                      <span>{reason}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-[#5B7083]">
                    {result.decision?.commercialEvidence || 'No gate blockers reported.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive SVG Hub Route Schematic + Multi-Leg Timeline */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <section className="dt-card lg:col-span-5 p-4">
              <div className="flex items-center gap-2 border-b border-[#D9E2EC] pb-2.5 mb-3">
                <MapPin className="h-4 w-4 text-[#0A6ED1]" />
                <h2 className="text-[14px] font-semibold text-[#102738]">Corridor Hub Map</h2>
              </div>

              {legs.length > 0 ? (
                <svg
                  viewBox="0 0 420 220"
                  className="w-full rounded-md border border-[#D9E2EC] bg-[#F8FAFC]"
                >
                  {legs.map((leg, i) => {
                    const x1 = 45 + (i * 330) / Math.max(legs.length, 1);
                    const x2 = 45 + ((i + 1) * 330) / Math.max(legs.length, 1);
                    const y1 = i % 2 === 0 ? 110 : 75;
                    const y2 = (i + 1) % 2 === 0 ? 110 : 75;
                    return (
                      <g key={leg.legId || i}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#0A6ED1"
                          strokeWidth="2.5"
                          strokeDasharray={leg.mode === 'sea' ? '5 3' : undefined}
                        />
                        <circle cx={x1} cy={y1} r="6" fill="#102738" />
                        <text
                          x={x1}
                          y={y1 + 20}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#102738"
                          fontWeight="600"
                        >
                          {leg.fromHub}
                        </text>
                        {i === legs.length - 1 && (
                          <>
                            <circle cx={x2} cy={y2} r="6" fill="#059669" />
                            <text
                              x={x2}
                              y={y2 + 20}
                              textAnchor="middle"
                              fontSize="10"
                              fill="#065F46"
                              fontWeight="600"
                            >
                              {leg.toHub}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <div className="py-12 text-center text-[12px] text-[#5B7083]">
                  No individual legs returned in route response.
                </div>
              )}
            </section>

            <section className="dt-card lg:col-span-7 overflow-hidden">
              <div className="border-b border-[#D9E2EC] px-4 py-3">
                <h2 className="text-[14px] font-semibold text-[#102738]">
                  Multi-Leg Route Timeline ({legs.length} legs)
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead className="border-b border-[#D9E2EC] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#5B7083]">
                    <tr>
                      <th className="px-4 py-2.5">Leg ID</th>
                      <th className="px-4 py-2.5">Corridor</th>
                      <th className="px-4 py-2.5">Mode</th>
                      <th className="px-4 py-2.5 text-right">Transit</th>
                      <th className="px-4 py-2.5 text-right">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {legs.map((leg, idx) => (
                      <tr key={leg.legId || idx} className="h-[42px] hover:bg-[#F8FAFC]">
                        <td className="px-4 font-mono-tabular text-[#5B7083]">
                          {leg.legId || `LEG-${idx + 1}`}
                        </td>
                        <td className="px-4 font-medium text-[#102738]">
                          {leg.fromHub} → {leg.toHub}
                        </td>
                        <td className="px-4">
                          <StatusPill label={(leg.mode || 'ROAD').toUpperCase()} tone="neutral" />
                        </td>
                        <td className="px-4 text-right font-mono-tabular">
                          {leg.transitHours != null ? `${formatNumber(leg.transitHours, 1)}h` : '—'}
                        </td>
                        <td className="px-4 text-right font-mono-tabular font-medium">
                          {formatInr(leg.costInr)}
                        </td>
                      </tr>
                    ))}
                    {legs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[#5B7083]">
                          No route legs available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
