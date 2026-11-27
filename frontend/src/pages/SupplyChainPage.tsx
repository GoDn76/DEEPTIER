import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download,
  FileUp,
  GitBranch,
  Network,
  RefreshCw,
  UploadCloud,
} from 'lucide-react';
import {
  ApiClientError,
  ProblemValidationError,
  TierLinkDto,
  tierMapApi,
  TierMapGraphResponse,
  TierNodeDto,
} from '../api/client';
import { useToast } from '../components/AppShell';
import { ErrorBanner } from '../components/ErrorBanner';
import { StatusPill } from '../components/StatusPill';
import { formatInr, formatPercent } from '../utils/format';

export function SupplyChainPage() {
  const { notify } = useToast();
  const [graph, setGraph] = useState<TierMapGraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tierMapApi.getGraph();
      setGraph(data);
      if (data.nodes.length > 0 && !selectedNodeId) {
        setSelectedNodeId(data.nodes[0].nodeId);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [selectedNodeId]);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  const nodesByTier = useMemo(() => {
    const map = new Map<number, TierNodeDto[]>();
    for (const node of graph?.nodes || []) {
      const tier = node.tier ?? 0;
      const list = map.get(tier) || [];
      list.push(node);
      map.set(tier, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [graph]);

  const selectedNode = useMemo(
    () => (graph?.nodes || []).find((n) => n.nodeId === selectedNodeId) || null,
    [graph, selectedNodeId],
  );

  const connectedLinks = useMemo(() => {
    if (!selectedNodeId || !graph) return { inbound: [] as TierLinkDto[], outbound: [] as TierLinkDto[] };
    return {
      inbound: graph.links.filter((l) => l.to === selectedNodeId),
      outbound: graph.links.filter((l) => l.from === selectedNodeId),
    };
  }, [graph, selectedNodeId]);

  const handleDownloadTemplate = async () => {
    try {
      const csv = await tierMapApi.downloadTemplate();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'deeptier-supply-chain-template.csv';
      a.click();
      URL.revokeObjectURL(url);
      notify('Downloaded 14-column BOM CSV template', 'success');
    } catch (err) {
      setError(err);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const res = await tierMapApi.importCsv(selectedFile, mode);
      notify(
        `CSV imported (${mode}): ${res.nodesCreated} nodes, ${res.linksCreated} links from ${res.totalRowsProcessed} rows`,
        'success',
      );
      setSelectedFile(null);
      await loadGraph();
    } catch (err) {
      setError(err);
    } finally {
      setUploading(false);
    }
  };

  const validationErrors: (ProblemValidationError | string)[] =
    error instanceof ApiClientError && Array.isArray(error.errors) ? error.errors : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-[#102738]">
            Multi-Tier Supply Chain &amp; BOM Onboarding
          </h1>
          <p className="mt-0.5 text-[13px] text-[#5B7083]">
            Interactive Tier-0 → Tier-2+ dependency topology with 14-column CSV BOM importer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleDownloadTemplate} className="dt-btn-secondary">
            <Download className="h-3.5 w-3.5" />
            Download Template
          </button>
          <button
            type="button"
            onClick={() => void loadGraph()}
            disabled={loading}
            className="dt-btn-secondary"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Graph
          </button>
        </div>
      </div>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      {/* 400 Row/Column Validation Error Table */}
      {validationErrors.length > 0 && (
        <div className="dt-card border-[#FECACA] overflow-hidden">
          <div className="border-b border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-[12px] font-semibold text-[#991B1B]">
            CSV Validation Errors ({validationErrors.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="border-b border-[#D9E2EC] bg-[#F8FAFC] text-[11px] font-semibold uppercase text-[#5B7083]">
                <tr>
                  <th className="px-4 py-2">Row / Line</th>
                  <th className="px-4 py-2">Column / Field</th>
                  <th className="px-4 py-2">Validation Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {validationErrors.map((errItem, idx) => {
                  if (typeof errItem === 'string') {
                    return (
                      <tr key={idx} className="h-[40px]">
                        <td className="px-4 font-mono-tabular text-[#5B7083]">#{idx + 1}</td>
                        <td className="px-4 font-mono-tabular text-[#5B7083]">—</td>
                        <td className="px-4 text-[#991B1B]">{errItem}</td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={idx} className="h-[40px]">
                      <td className="px-4 font-mono-tabular font-medium">
                        {errItem.row ?? errItem.line ?? '—'}
                      </td>
                      <td className="px-4 font-mono-tabular text-[#334E68]">
                        {String(errItem.column ?? errItem.field ?? '—')}
                      </td>
                      <td className="px-4 text-[#991B1B]">
                        {errItem.message || errItem.detail || JSON.stringify(errItem)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Tier Graph + Node Inspector */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className="dt-card lg:col-span-8 p-4">
          <div className="flex items-center justify-between border-b border-[#D9E2EC] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-[#0A6ED1]" />
              <h2 className="text-[14px] font-semibold text-[#102738]">
                Tier Dependency Topology
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-[#5B7083]">
              <span className="font-mono-tabular">{graph?.totalNodes ?? 0}</span> nodes
              <span>·</span>
              <span className="font-mono-tabular">{graph?.links.length ?? 0}</span> links
              {graph?.dataClass && <StatusPill label={graph.dataClass} tone="neutral" />}
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-[13px] text-[#5B7083]">
              Loading multi-tier dependency graph…
            </div>
          ) : nodesByTier.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#CBD5E1] py-14 text-center text-[13px] text-[#5B7083]">
              No supplier nodes found. Upload a BOM CSV below or seed the baseline from Executive
              Cockpit.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {nodesByTier.map(([tier, tierNodes]) => (
                <div
                  key={tier}
                  className="rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] p-3 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B7083]">
                      Tier {tier} {tier === 0 ? '(OEM)' : tier === 1 ? '(Direct)' : '(Sub-Tier)'}
                    </span>
                    <span className="font-mono-tabular text-[11px] text-[#5B7083]">
                      {tierNodes.length}
                    </span>
                  </div>

                  {tierNodes.map((node) => {
                    const isSelected = node.nodeId === selectedNodeId;
                    const isBackup =
                      node.linkType?.toUpperCase().includes('BACKUP') ||
                      node.nodeId.includes('RJK');
                    const isRisk = node.country?.toUpperCase() === 'CN' || node.nodeId.includes('BETA');
                    return (
                      <button
                        key={node.nodeId}
                        type="button"
                        onClick={() => setSelectedNodeId(node.nodeId)}
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${
                          isSelected
                            ? 'border-[#0A6ED1] bg-[#EFF6FF]'
                            : 'border-[#D9E2EC] bg-white hover:border-[#94A3B8]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[13px] font-semibold text-[#102738]">
                            {node.name}
                          </span>
                          {isRisk && <StatusPill label="CN · RISK" tone="critical" />}
                          {isBackup && <StatusPill label="BACKUP" tone="success" />}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#5B7083]">
                          <span className="font-mono-tabular">{node.nodeId}</span>
                          <span>{node.country || '—'}</span>
                        </div>
                        {node.confidence != null && (
                          <div className="mt-1 text-[11px] text-[#5B7083]">
                            Confidence:{' '}
                            <span className="font-mono-tabular font-medium text-[#102738]">
                              {formatPercent(node.confidence, node.confidence <= 1)}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right-side Node Inspector */}
        <aside className="dt-card lg:col-span-4 p-4">
          <div className="flex items-center gap-2 border-b border-[#D9E2EC] pb-3 mb-4">
            <GitBranch className="h-4 w-4 text-[#0A6ED1]" />
            <h2 className="text-[14px] font-semibold text-[#102738]">Node Inspector</h2>
          </div>

          {selectedNode ? (
            <div className="space-y-4 text-[12px]">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B7083]">
                  Supplier Entity
                </div>
                <div className="mt-1 text-[15px] font-bold text-[#102738]">{selectedNode.name}</div>
                <div className="mt-0.5 font-mono-tabular text-[#5B7083]">
                  {selectedNode.nodeId} · Tier {selectedNode.tier}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] p-3">
                <div>
                  <div className="text-[11px] text-[#5B7083]">Country</div>
                  <div className="mt-0.5 font-semibold text-[#102738]">
                    {selectedNode.country || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#5B7083]">Link Type</div>
                  <div className="mt-0.5 font-mono-tabular font-semibold text-[#102738]">
                    {selectedNode.linkType || 'PRIMARY'}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B7083] mb-2">
                  Supply Links ({connectedLinks.inbound.length + connectedLinks.outbound.length})
                </div>
                <div className="space-y-2">
                  {[...connectedLinks.outbound, ...connectedLinks.inbound].map((link, idx) => (
                    <div
                      key={`${link.from}-${link.to}-${idx}`}
                      className="rounded-md border border-[#D9E2EC] bg-white p-2.5"
                    >
                      <div className="flex items-center justify-between font-mono-tabular text-[11px]">
                        <span className="font-semibold text-[#102738]">
                          {link.from} → {link.to}
                        </span>
                        {link.hsCode && <StatusPill label={`HS ${link.hsCode}`} tone="neutral" />}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#5B7083]">
                        <span>Spend: {formatInr(link.annualSpendInr)}</span>
                        <span className="font-mono-tabular">
                          Share: {formatPercent(link.costFraction, true)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {connectedLinks.inbound.length + connectedLinks.outbound.length === 0 && (
                    <div className="text-[#5B7083]">No direct links for this node.</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-[12px] text-[#5B7083]">
              Select a node in the topology to inspect HS codes, spend share, and tier links.
            </div>
          )}
        </aside>
      </div>

      {/* Drag-and-Drop CSV Importer */}
      <section className="dt-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#D9E2EC] pb-3 mb-4">
          <div>
            <h2 className="text-[14px] font-semibold text-[#102738]">
              14-Column CSV BOM Importer
            </h2>
            <p className="text-[12px] text-[#5B7083]">
              Upload supplier &amp; BOM links to immediately feed Tier Map and AI Disruption
              analysis.
            </p>
          </div>
          <div className="inline-flex rounded-md border border-[#D9E2EC] bg-[#F3F6F8] p-0.5 text-[12px]">
            <button
              type="button"
              onClick={() => setMode('replace')}
              className={`rounded px-3 py-1 font-medium ${
                mode === 'replace' ? 'bg-white text-[#102738] shadow-xs' : 'text-[#5B7083]'
              }`}
            >
              mode=replace
            </button>
            <button
              type="button"
              onClick={() => setMode('append')}
              className={`rounded px-3 py-1 font-medium ${
                mode === 'append' ? 'bg-white text-[#102738] shadow-xs' : 'text-[#5B7083]'
              }`}
            >
              mode=append
            </button>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const f = e.dataTransfer.files?.[0];
            if (f) setSelectedFile(f);
          }}
          className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            dragActive
              ? 'border-[#0A6ED1] bg-[#EFF6FF]'
              : 'border-[#CBD5E1] bg-[#F8FAFC]'
          }`}
        >
          <UploadCloud className="mx-auto h-7 w-7 text-[#5B7083]" />
          <p className="mt-2 text-[13px] font-medium text-[#102738]">
            {selectedFile ? (
              <span className="font-mono-tabular text-[#0A6ED1]">{selectedFile.name}</span>
            ) : (
              'Drag & drop a .csv file here, or browse from disk'
            )}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <label className="dt-btn-secondary cursor-pointer">
              <FileUp className="h-3.5 w-3.5" />
              Choose CSV File
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </label>
            <button
              type="button"
              disabled={!selectedFile || uploading}
              onClick={handleUpload}
              className="dt-btn-primary"
            >
              {uploading ? 'Importing…' : `Import CSV (${mode})`}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
