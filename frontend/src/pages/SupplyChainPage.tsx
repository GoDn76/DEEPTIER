import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  FileUp,
  GitBranch,
  Maximize2,
  Move,
  Network,
  RefreshCw,
  RotateCcw,
  UploadCloud,
  ZoomIn,
  ZoomOut,
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

interface NodePos {
  x: number;
  y: number;
}

const NODE_W = 176;
const NODE_H = 52;
const CANVAS_W = 1040;

function computeInitialLayout(nodes: TierNodeDto[]): {
  positions: Record<string, NodePos>;
  canvasHeight: number;
} {
  const tierMap = new Map<number, TierNodeDto[]>();
  for (const n of nodes) {
    const t = n.tier ?? 0;
    const list = tierMap.get(t) || [];
    list.push(n);
    tierMap.set(t, list);
  }
  const tiers = Array.from(tierMap.entries()).sort((a, b) => a[0] - b[0]);
  const totalTiers = tiers.length;
  const maxPerTier = tiers.reduce((max, [, list]) => Math.max(max, list.length), 1);
  const canvasHeight = Math.max(460, maxPerTier * 84 + 64);
  const usableHeight = canvasHeight - 64;

  const positions: Record<string, NodePos> = {};
  tiers.forEach(([, tierNodes], tierIdx) => {
    const x = totalTiers === 1 ? CANVAS_W / 2 : 140 + (tierIdx / (totalTiers - 1)) * (CANVAS_W - 280);
    const slotHeight = usableHeight / Math.max(tierNodes.length, 1);
    tierNodes.forEach((node, nodeIdx) => {
      const y = 32 + nodeIdx * slotHeight + slotHeight / 2;
      positions[node.id] = { x, y };
    });
  });

  return { positions, canvasHeight };
}

export function SupplyChainPage() {
  const { notify } = useToast();
  const [graph, setGraph] = useState<TierMapGraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Interactive pan, zoom, and draggable node positions
  const [nodePositions, setNodePositions] = useState<Record<string, NodePos>>({});
  const [canvasHeight, setCanvasHeight] = useState(460);
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 16, y: 12 });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<
    | { type: 'pan'; startX: number; startY: number; origPanX: number; origPanY: number }
    | {
        type: 'node';
        nodeId: string;
        startX: number;
        startY: number;
        origX: number;
        origY: number;
        moved: boolean;
      }
    | null
  >(null);

  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const applyAutoLayout = useCallback((nodes: TierNodeDto[]) => {
    const { positions, canvasHeight: h } = computeInitialLayout(nodes);
    setNodePositions(positions);
    setCanvasHeight(h);
    // Auto-fit zoom slightly if there are many nodes
    setZoom(nodes.length > 10 ? 0.72 : 0.9);
    setPan({ x: 16, y: 12 });
  }, []);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tierMapApi.getGraph();
      setGraph(data);
      applyAutoLayout(data.nodes);
      setSelectedNodeId((prev) => {
        if (data.nodes.length === 0) return null;
        if (prev && data.nodes.some((n) => n.id === prev)) return prev;
        return data.nodes[0].id;
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [applyAutoLayout]);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, TierNodeDto>();
    for (const n of graph?.nodes || []) m.set(n.id, n);
    return m;
  }, [graph]);

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodeMap.get(selectedNodeId) || null : null),
    [nodeMap, selectedNodeId],
  );

  const connectedLinks = useMemo(() => {
    if (!selectedNodeId || !graph)
      return { inbound: [] as TierLinkDto[], outbound: [] as TierLinkDto[] };
    return {
      inbound: graph.links.filter((l) => l.toSupplierId === selectedNodeId),
      outbound: graph.links.filter((l) => l.fromSupplierId === selectedNodeId),
    };
  }, [graph, selectedNodeId]);

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

  // Pointer handlers for panning canvas & dragging nodes
  const handleCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    dragStateRef.current = {
      type: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      origPanX: pan.x,
      origPanY: pan.y,
    };
  };

  const handleNodePointerDown = (e: React.PointerEvent<SVGGElement>, nodeId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const pos = nodePositions[nodeId];
    if (!pos) return;
    svgRef.current?.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      type: 'node',
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const ds = dragStateRef.current;
    if (!ds) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    if (ds.type === 'pan') {
      setPan({ x: ds.origPanX + dx, y: ds.origPanY + dy });
    } else if (ds.type === 'node') {
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        ds.moved = true;
      }
      setNodePositions((prev) => ({
        ...prev,
        [ds.nodeId]: {
          x: ds.origX + dx / zoom,
          y: ds.origY + dy / zoom,
        },
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const ds = dragStateRef.current;
    if (ds?.type === 'node' && !ds.moved) {
      setSelectedNodeId(ds.nodeId);
    }
    if (svgRef.current?.hasPointerCapture(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    dragStateRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.min(2.0, Math.max(0.35, Number((z * factor).toFixed(2)))));
  };

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

  const nodeColor = (node: TierNodeDto) => {
    if (node.country?.toUpperCase() === 'CN')
      return { fill: '#FEF2F2', stroke: '#FECACA', text: '#991B1B' };
    if (node.linkType?.toUpperCase().includes('BACKUP') || node.id.includes('RAJKOT'))
      return { fill: '#ECFDF5', stroke: '#A7F3D0', text: '#065F46' };
    if (node.tier === 0) return { fill: '#EFF6FF', stroke: '#BFDBFE', text: '#1E40AF' };
    return { fill: '#FFFFFF', stroke: '#D9E2EC', text: '#102738' };
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-[#102738]">
            Multi-Tier Supply Chain &amp; BOM Onboarding
          </h1>
          <p className="mt-0.5 text-[13px] text-[#5B7083]">
            Drag nodes to rearrange, drag canvas to pan, or scroll to zoom.
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

      {/* Interactive Pan/Zoom/Draggable SVG Tier Graph + Node Inspector */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className="dt-card lg:col-span-8 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D9E2EC] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-[#0A6ED1]" />
              <h2 className="text-[14px] font-semibold text-[#102738]">
                Tier Dependency Topology
              </h2>
              <span className="text-[12px] text-[#5B7083]">
                · <span className="font-mono-tabular">{graph?.totalNodes ?? 0}</span> nodes ·{' '}
                <span className="font-mono-tabular">{graph?.links.length ?? 0}</span> links
              </span>
            </div>

            {/* Pan & Zoom Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.35, Number((z - 0.15).toFixed(2))))}
                className="dt-btn-secondary px-2 py-1 text-[11px]"
                title="Zoom Out (Make Smaller)"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="font-mono-tabular text-[11px] text-[#5B7083] w-11 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.0, Number((z + 0.15).toFixed(2))))}
                className="dt-btn-secondary px-2 py-1 text-[11px]"
                title="Zoom In (Make Larger)"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(0.65);
                  setPan({ x: 16, y: 12 });
                }}
                className="dt-btn-secondary px-2 py-1 text-[11px]"
                title="Compact Fit"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Fit
              </button>
              <button
                type="button"
                onClick={() => graph && applyAutoLayout(graph.nodes)}
                className="dt-btn-secondary px-2 py-1 text-[11px]"
                title="Reset Node Positions"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-[13px] text-[#5B7083]">
              Loading multi-tier dependency graph…
            </div>
          ) : (graph?.nodes.length ?? 0) === 0 ? (
            <div className="rounded-lg border border-dashed border-[#CBD5E1] py-14 text-center text-[13px] text-[#5B7083]">
              No supplier nodes found. Upload a BOM CSV below or seed the baseline from Executive
              Cockpit.
            </div>
          ) : (
            <>
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {nodesByTier.map(([tier]) => (
                    <StatusPill
                      key={tier}
                      label={`Tier ${tier}${tier === 0 ? ' (OEM)' : tier === 1 ? ' (Direct)' : tier === 2 ? ' (Sub-Tier)' : ''}`}
                      tone={tier === 0 ? 'ai' : tier <= 1 ? 'neutral' : 'warning'}
                    />
                  ))}
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] text-[#5B7083]">
                  <Move className="h-3 w-3" /> Drag nodes to adjust · Drag background to pan
                </span>
              </div>

              {/* Interactive Pan/Zoom SVG Viewport */}
              <div className="h-[460px] w-full overflow-hidden rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] select-none">
                <svg
                  ref={svgRef}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onWheel={handleWheel}
                  className="h-full w-full cursor-grab active:cursor-grabbing touch-none"
                  style={{
                    backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                >
                  <defs>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748B" />
                    </marker>
                    <marker
                      id="arrow-active"
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#0A6ED1" />
                    </marker>
                  </defs>

                  <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                    {/* Render edges */}
                    {(graph?.links || []).map((link) => {
                      const from = nodePositions[link.fromSupplierId];
                      const to = nodePositions[link.toSupplierId];
                      if (!from || !to) return null;

                      const isSelected =
                        link.fromSupplierId === selectedNodeId ||
                        link.toSupplierId === selectedNodeId;
                      const isDashed = link.linkType?.toUpperCase() === 'INFERRED';

                      // Connect cleanly from right edge of source to left edge of target
                      const x1 = from.x + (to.x >= from.x ? NODE_W / 2 : -NODE_W / 2);
                      const y1 = from.y;
                      const x2 = to.x + (to.x >= from.x ? -NODE_W / 2 : NODE_W / 2);
                      const y2 = to.y;
                      const midX = (x1 + x2) / 2;
                      const midY = (y1 + y2) / 2;

                      return (
                        <g key={link.id} opacity={selectedNodeId && !isSelected ? 0.35 : 1}>
                          <path
                            d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                            fill="none"
                            stroke={isSelected ? '#0A6ED1' : '#94A3B8'}
                            strokeWidth={isSelected ? 2.2 : 1.4}
                            strokeDasharray={isDashed ? '5 3' : undefined}
                            markerEnd={isSelected ? 'url(#arrow-active)' : 'url(#arrow)'}
                          />
                          {isSelected && link.hsCode && (
                            <g transform={`translate(${midX}, ${midY})`}>
                              <rect
                                x={-42}
                                y={-10}
                                width={84}
                                height={18}
                                rx={4}
                                fill="#FFFFFF"
                                stroke="#BFDBFE"
                                strokeWidth={1}
                              />
                              <text
                                x={0}
                                y={2}
                                textAnchor="middle"
                                fontSize="9.5"
                                fontFamily="IBM Plex Mono, monospace"
                                fontWeight="600"
                                fill="#0A6ED1"
                              >
                                HS {link.hsCode}
                                {link.costFraction != null
                                  ? ` · ${(link.costFraction * 100).toFixed(0)}%`
                                  : ''}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* Render draggable nodes */}
                    {(graph?.nodes || []).map((node) => {
                      const pos = nodePositions[node.id];
                      if (!pos) return null;
                      const isSelected = node.id === selectedNodeId;
                      const colors = nodeColor(node);
                      const isRisk = node.country?.toUpperCase() === 'CN';
                      const isBackup =
                        node.linkType?.toUpperCase().includes('BACKUP') ||
                        node.id.includes('RAJKOT');

                      return (
                        <g
                          key={node.id}
                          transform={`translate(${pos.x}, ${pos.y})`}
                          onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                          className="cursor-move"
                        >
                          <rect
                            x={-NODE_W / 2}
                            y={-NODE_H / 2}
                            width={NODE_W}
                            height={NODE_H}
                            rx={8}
                            fill={colors.fill}
                            stroke={isSelected ? '#0A6ED1' : colors.stroke}
                            strokeWidth={isSelected ? 2.2 : 1}
                          />
                          <text
                            x={-8}
                            y={-5}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="600"
                            fill={colors.text}
                          >
                            {node.name.length > 20 ? node.name.slice(0, 18) + '…' : node.name}
                          </text>
                          <text
                            x={0}
                            y={12}
                            textAnchor="middle"
                            fontSize="9.5"
                            fontFamily="IBM Plex Mono, monospace"
                            fill="#5B7083"
                          >
                            {node.supplierId} · {node.country || '—'}
                            {isRisk ? ' ⚠' : ''}
                            {isBackup ? ' ✓' : ''}
                          </text>
                          <rect
                            x={NODE_W / 2 - 30}
                            y={-NODE_H / 2 + 4}
                            width={25}
                            height={15}
                            rx={3}
                            fill={isSelected ? '#0A6ED1' : '#E2E8F0'}
                          />
                          <text
                            x={NODE_W / 2 - 17.5}
                            y={-NODE_H / 2 + 14.5}
                            textAnchor="middle"
                            fontSize="8.5"
                            fontWeight="700"
                            fill={isSelected ? '#FFF' : '#5B7083'}
                          >
                            T{node.tier}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>

              {/* Legend */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5B7083]">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-6 bg-[#94A3B8]" /> DECLARED link
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-[#94A3B8]" />{' '}
                    INFERRED link
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded border border-[#FECACA] bg-[#FEF2F2]" />{' '}
                    China (Risk)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded border border-[#A7F3D0] bg-[#ECFDF5]" />{' '}
                    Backup Supplier
                  </span>
                </div>
                <span className="text-[10px] text-[#94A3B8]">
                  Virtual Canvas: {CANVAS_W}×{canvasHeight}px
                </span>
              </div>
            </>
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
                  {selectedNode.supplierId} · Tier {selectedNode.tier}
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
                  <div className="mt-0.5">
                    <StatusPill
                      label={selectedNode.linkType || 'DECLARED'}
                      tone={selectedNode.linkType === 'INFERRED' ? 'warning' : 'success'}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#5B7083]">Confidence</div>
                  <div className="mt-0.5 font-mono-tabular font-semibold text-[#102738]">
                    {selectedNode.confidence != null
                      ? formatPercent(selectedNode.confidence, selectedNode.confidence <= 1)
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#5B7083]">Data Class</div>
                  <div className="mt-0.5">
                    <StatusPill label={selectedNode.dataClass || 'LIVE'} tone="neutral" />
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B7083] mb-2">
                  Supply Links ({connectedLinks.inbound.length + connectedLinks.outbound.length})
                </div>
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {connectedLinks.outbound.map((link) => {
                    const target = nodeMap.get(link.toSupplierId);
                    return (
                      <div
                        key={link.id}
                        className="rounded-md border border-[#D9E2EC] bg-white p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-[#102738]">
                            → {target?.name || link.toSupplierId}
                          </span>
                          {link.hsCode && <StatusPill label={`HS ${link.hsCode}`} tone="neutral" />}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#5B7083]">
                          <span>
                            Spend:{' '}
                            <span className="font-mono-tabular font-medium text-[#102738]">
                              {formatInr(link.annualSpendInr)}
                            </span>
                          </span>
                          <span>
                            Share:{' '}
                            <span className="font-mono-tabular font-medium text-[#102738]">
                              {formatPercent(link.costFraction, true)}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {connectedLinks.inbound.map((link) => {
                    const source = nodeMap.get(link.fromSupplierId);
                    return (
                      <div
                        key={link.id}
                        className="rounded-md border border-[#D9E2EC] bg-white p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-[#102738]">
                            ← {source?.name || link.fromSupplierId}
                          </span>
                          {link.hsCode && <StatusPill label={`HS ${link.hsCode}`} tone="neutral" />}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#5B7083]">
                          <span>
                            Spend:{' '}
                            <span className="font-mono-tabular font-medium text-[#102738]">
                              {formatInr(link.annualSpendInr)}
                            </span>
                          </span>
                          <span>
                            Share:{' '}
                            <span className="font-mono-tabular font-medium text-[#102738]">
                              {formatPercent(link.costFraction, true)}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {connectedLinks.inbound.length + connectedLinks.outbound.length === 0 && (
                    <div className="text-[#5B7083]">No direct links for this node.</div>
                  )}
                </div>
              </div>

              {selectedNode.evidenceIds && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B7083] mb-1">
                    Evidence IDs
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.evidenceIds.split(/[,;]/).map((eid) => (
                      <StatusPill key={eid.trim()} label={eid.trim()} tone="ai" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-[12px] text-[#5B7083]">
              Click a node in the topology to inspect HS codes, spend share, and tier links.
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
            dragActive ? 'border-[#0A6ED1] bg-[#EFF6FF]' : 'border-[#CBD5E1] bg-[#F8FAFC]'
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
