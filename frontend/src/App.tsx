import React, { FormEvent, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { authApi, api, getSession, setSession, type LoginResponse } from './api/client';
import './style.css';

type Page =
  | 'overview' | 'network' | 'disruption' | 'what-if' | 'logistics'
  | 'approvals' | 'rfqs' | 'audit';

const nav: { label: string; page: Page; group: string }[] = [
  { label: 'Executive Risk Cockpit', page: 'overview', group: 'Overview & Network' },
  { label: 'Supply Chain & BOM', page: 'network', group: 'Overview & Network' },
  { label: 'AI Disruption Analyzer', page: 'disruption', group: 'Intelligence & Simulation' },
  { label: 'What-If & Monte Carlo', page: 'what-if', group: 'Intelligence & Simulation' },
  { label: '57-Hub Logistics Planner', page: 'logistics', group: 'Intelligence & Simulation' },
  { label: 'HITL Approval Queue', page: 'approvals', group: 'Governance & SAP' },
  { label: 'RFQs & SAP S/4HANA', page: 'rfqs', group: 'Governance & SAP' },
  { label: 'SHA-256 Audit Trail', page: 'audit', group: 'Governance & SAP' },
];

const money = (value: unknown) => value == null ? 'Unavailable'
  : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
    .format(Number(value)).replace(/\.00$/, '');

function Brand() {
  return <div className="brand"><span className="brand-mark"><i /><i /><i /></span><b>DeepTier</b></div>;
}

function Login({ onLogin }: { onLogin: (session: LoginResponse) => void }) {
  const [username, setUsername] = useState('analyst@deeptier.local');
  const [password, setPassword] = useState('Analyst@123');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const personas = [
    ['Analyst', 'analyst@deeptier.local', 'Analyst@123'],
    ['Approver', 'approver@deeptier.local', 'Approver@123'],
    ['Admin', 'admin@deeptier.local', 'Admin@123'],
  ];

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      onLogin(await authApi.login(username, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-visual">
        <Brand />
        <div className="visual-content">
          <span className="eyebrow">SUPPLY CHAIN OPERATIONS</span>
          <h1>See risk.<br />Act with confidence.</h1>
          <p>Unified disruption intelligence, supplier recovery and SAP procurement governance.</p>
        </div>
        <div className="trust-row">
          <span>SAP HANA Cloud</span><span>Gemini AI</span><span>SHA-256 Audit</span>
        </div>
      </section>
      <section className="login-panel">
        <form onSubmit={submit} className="login-card">
          <span className="eyebrow">DEEPTIER WORKSPACE</span>
          <h2>Sign in</h2>
          {error && <div className="alert error-alert">{error}</div>}
          <label>Email address<input type="email" value={username} onChange={e => setUsername(e.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
          <button className="primary full" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
          <div className="persona-label">QUICK DEMO ACCESS</div>
          <div className="persona-row">
            {personas.map(([label, user, pass]) =>
              <button type="button" key={label} onClick={() => { setUsername(user); setPassword(pass); }}>{label}</button>)}
          </div>
        </form>
      </section>
    </main>
  );
}

function Metric({ label, value, note, tone }: { label: string; value: React.ReactNode; note: string; tone?: string }) {
  return <article className="metric-card"><span>{label}</span><strong className={tone}>{value}</strong><small>{note}</small></article>;
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="panel"><div className="panel-heading"><h2>{title}</h2>{action}</div>{children}</section>;
}

function Status({ value }: { value?: string }) {
  const normalized = (value || '').toUpperCase();
  const tone = normalized.includes('APPROV') || normalized.includes('VERIFIED') || normalized.includes('PUSHED') ? 'success'
    : normalized.includes('REJECT') || normalized.includes('BLOCK') ? 'critical'
      : normalized.includes('PENDING') ? 'warning' : 'neutral';
  return <span className={`status ${tone}`}>{value || 'Unknown'}</span>;
}

function Shell({ session, onLogout }: { session: LoginResponse; onLogout: () => void }) {
  const [page, setPage] = useState<Page>(() => {
    const hash = window.location.hash.replace('#/', '') as Page;
    return nav.some(item => item.page === hash) ? hash : 'overview';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    window.location.hash = `/${page}`;
  }, [page]);

  const navigate = (next: Page) => {
    setPage(next);
    setMobileOpen(false);
  };

  const role = session.role.replace('ROLE_', '');
  const hasApproverRole = session.role === 'ROLE_APPROVER' || session.role === 'ROLE_ADMIN';

  return (
    <div className="app-shell">
      <aside className={mobileOpen ? 'sidebar open' : 'sidebar'}>
        <button className="brand-button" onClick={() => navigate('overview')}><Brand /></button>
        {['Overview & Network', 'Intelligence & Simulation', 'Governance & SAP'].map(group =>
          <nav key={group}>
            <span className="nav-group">{group}</span>
            {nav.filter(item => item.group === group).map(item =>
              <button key={item.page} className={page === item.page ? 'active' : ''} onClick={() => navigate(item.page)}>
                {item.label}
              </button>)}
          </nav>)}
      </aside>
      <main className="workspace">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileOpen(value => !value)}>Menu</button>
          <div className="breadcrumb"><span>Operations</span><b>/</b>{nav.find(item => item.page === page)?.label}</div>
          <div className="top-actions">
            <span className="connection"><i />API connected</span>
            <span className="role-pill">{role}</span>
            <button className="icon-button" title="Notifications" onClick={() => setNotification('No unread notifications')}>●</button>
            <button className="logout" onClick={onLogout}>Sign out</button>
          </div>
        </header>
        {notification && <div className="toast" role="status">{notification}<button onClick={() => setNotification('')}>×</button></div>}
        <div className="page-content">
          {page === 'overview' && <Overview navigate={navigate} />}
          {page === 'network' && <Network notify={setNotification} />}
          {page === 'disruption' && <Disruption notify={setNotification} navigate={navigate} />}
          {page === 'what-if' && <WhatIf notify={setNotification} navigate={navigate} />}
          {page === 'logistics' && <Logistics notify={setNotification} />}
          {page === 'approvals' && <Approvals notify={setNotification} canDecide={hasApproverRole} />}
          {page === 'rfqs' && <Rfqs notify={setNotification} canPush={hasApproverRole} />}
          {page === 'audit' && <Audit notify={setNotification} />}
        </div>
      </main>
    </div>
  );
}

function PageHeader({ eyebrow, title, description, action }: {
  eyebrow: string; title: string; description: string; action?: React.ReactNode;
}) {
  return <header className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</header>;
}

function ErrorNotice({ error }: { error: string }) {
  return error ? <div className="alert error-alert" role="alert">{error}</div> : null;
}

function Overview({ navigate }: { navigate: (page: Page) => void }) {
  const [graph, setGraph] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [audit, setAudit] = useState<any>(null);
  const [scenario, setScenario] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api<any>('/api/tier-map/graph'),
      api<any[]>('/api/approvals'),
      api<any[]>('/api/rfqs'),
      api<any>('/api/audit/verify'),
      api<any[]>('/api/audit'),
      api<any>('/api/whatif/simulate', {
        method: 'POST',
        body: JSON.stringify({
          scenarioId: 'HPH-1042-OVERVIEW',
          hsCode: '7325',
          originCountry: 'CN',
          deltaPercentagePoints: 20,
          annualSpendInr: 4800000,
          costFraction: 0.6,
          unitsOnHand: 300,
          dailyDemand: 20,
          leadTimeDays: 30,
          lateCostPerDayInr: 80000,
          seed: 20261121,
        }),
      }),
    ]).then(([g, a, r, v, history, simulation]) => {
      setGraph(g);
      setApprovals(a);
      setRfqs(r);
      setAudit(v);
      setEvents(history);
      setScenario(simulation);
    })
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load dashboard'));
  }, []);

  const pending = approvals.filter(a => String(a.approvalStatus).includes('PENDING')).length;
  const recommended = scenario?.recoveryOptions?.find((option: any) => option.recommended);
  const waitOption = scenario?.recoveryOptions?.find((option: any) => option.optionType === 'WAIT');
  const avoidedImpact = recommended && waitOption
    ? Number(waitOption.totalImpactInr) - Number(recommended.totalImpactInr)
    : null;
  return <>
    <PageHeader eyebrow="Overview & Network" title="Executive Risk Cockpit" description="Live exposure, procurement gates and cryptographic governance."
      action={<button className="primary" onClick={() => navigate('disruption')}>Analyze disruption →</button>} />
    <ErrorNotice error={error} />
    <div className="metric-grid">
      <Metric label="Active tariff exposure" value={scenario ? money(scenario.tariffShock?.totalExposureInr) : 'Loading'} note="HPH-1042 · HS 7325 · China +20%" tone="amber" />
      <Metric label="Inventory cover" value={scenario?.inventory?.daysOfCover != null ? `${scenario.inventory.daysOfCover} days` : 'Loading'} note={scenario?.inventory?.gapDays != null ? `${scenario.inventory.gapDays} days uncovered` : '300 units · 20 daily demand'} />
      <Metric label="Supplier network" value={graph?.totalNodes ?? '—'} note={`${graph?.totalLinks ?? 0} dependency links`} />
      <Metric label="Pending approvals" value={pending} note={pending ? 'Action required' : 'Queue clear'} tone={pending ? 'amber' : 'emerald'} />
      <Metric label="RFQs · S/4HANA" value={rfqs.length} note={`${rfqs.filter(r => r.rfqStatus === 'PUSHED_TO_SAP').length} purchase requisitions pushed`} />
      <Metric label="Audit integrity" value={audit?.valid ? 'Verified' : 'Checking'} note={`${audit?.totalEvents ?? 0} recorded events`} tone={audit?.valid ? 'emerald' : undefined} />
    </div>
    <section className="executive-hero">
      <div className="executive-copy">
        <div className="executive-kicker"><span className="risk-indicator" /> ACTIVE DISRUPTION · HPH-1042</div>
        <h2>Tariff exposure is rising.<br /><span>Recovery options are ready.</span></h2>
        <p>20% tariff increase on HS 7325 castings from China is affecting the Pune Hydraulic OEM supply chain.</p>
        <div className="executive-actions">
          <button className="hero-primary" onClick={() => navigate('disruption')}>Review AI analysis <span>→</span></button>
          <button className="hero-secondary" onClick={() => navigate('what-if')}>Run what-if simulation</button>
        </div>
      </div>
      <div className="recovery-spotlight">
        <span className="spotlight-label">RECOMMENDED RECOVERY</span>
        <h3>{recommended?.description || recommended?.targetSupplierId || 'Evaluating options...'}</h3>
        <div className="spotlight-metrics">
          <div><small>Recovery impact</small><strong>{recommended ? money(recommended.totalImpactInr) : '—'}</strong></div>
          <div><small>Potential avoided impact</small><strong>{avoidedImpact != null ? money(avoidedImpact) : '—'}</strong></div>
        </div>
        <span className="recommendation-badge"><i /> DOMESTIC ALTERNATIVE · READY FOR REVIEW</span>
      </div>
    </section>
    <div className="dashboard-grid">
      <Panel title="Supply network at a glance" action={<button className="text-button" onClick={() => navigate('network')}>Explore network →</button>}>
        <div className="network-summary">
          {(graph?.nodes || []).slice(0, 5).map((node: any, index: number) =>
            <div className="network-summary-row" key={node.supplierId || index}>
              <span className={`tier-marker tier-marker-${node.tier ?? index}`} />
              <div><b>{node.name || node.supplierId}</b><small>{node.supplierId} · {node.country || 'Location unavailable'}</small></div>
              <span className="tier-label">{node.tier === 0 ? 'OEM' : `TIER ${node.tier ?? index}`}</span>
            </div>)}
          {!graph?.nodes?.length && <div className="empty-state">No supplier nodes loaded. Import a BOM or reset the demo seed.</div>}
        </div>
      </Panel>
      <Panel title="Governance activity" action={<button className="text-button" onClick={() => navigate('audit')}>Open audit trail →</button>}>
        <div className="activity-feed">
          {(events || []).slice(0, 4).map((event: any, index: number) =>
            <div className="activity-row" key={event.id || index}>
              <span className={`activity-dot ${index === 0 ? 'current' : ''}`} />
              <div><b>{String(event.eventType || 'Audit event').replaceAll('_', ' ')}</b><small>{event.actor || 'System'} · {event.occurredAt ? new Date(event.occurredAt).toLocaleString() : 'Timestamp unavailable'}</small></div>
              <span className="activity-hash">{String(event.afterHash || event.hash || '').slice(0, 8)}</span>
            </div>)}
          {!events.length && <div className="empty-state">No audit activity has been recorded yet.</div>}
        </div>
      </Panel>
    </div>
    <section className="workflow-section">
      <div className="workflow-heading"><div><span className="eyebrow">WORKSPACE SHORTCUTS</span><h2>Move the case forward</h2></div></div>
      <div className="workflow-grid">
        {[
          { page: 'network' as Page, icon: 'account_tree', title: 'Map your supply chain', text: 'Inspect supplier tiers and bring in your latest BOM.' },
          { page: 'logistics' as Page, icon: 'alt_route', title: 'Plan a recovery route', text: 'Compare feasible transport legs, cost and timing.' },
          { page: 'approvals' as Page, icon: 'fact_check', title: 'Review decisions', text: `${pending} request${pending === 1 ? '' : 's'} currently waiting for a human review.` },
        ].map(item =>
          <button className="workflow-card" key={item.page} onClick={() => navigate(item.page)}>
            <span className="material-symbols-outlined workflow-icon">{item.icon}</span>
            <span className="workflow-card-copy"><b>{item.title}</b><small>{item.text}</small></span>
            <span className="workflow-arrow">↗</span>
          </button>)}
      </div>
    </section>
  </>;
}

function Network({ notify }: { notify: (value: string) => void }) {
  const [graph, setGraph] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api<any>('/api/tier-map/graph').then(setGraph).catch(err => setError(err.message));
  useEffect(() => { void load(); }, []);

  const importCsv = async () => {
    if (!file) { setError('Choose a BOM CSV file.'); return; }
    setBusy(true); setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      await api(`/api/supply-chain/import/csv?mode=${mode}`, { method: 'POST', body: form });
      await load();
      notify('BOM import completed');
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally { setBusy(false); }
  };

  return <>
    <PageHeader eyebrow="Overview & Network" title="Multi-Tier Supply Chain Graph & BOM Onboarding" description="GET /api/tier-map/graph · POST /api/supply-chain/import/csv"
      action={<button className="secondary" onClick={async () => {
        const template = await api<string>('/api/supply-chain/import/template');
        const blob = new Blob([template], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'deeptier-bom-template.csv'; anchor.click(); URL.revokeObjectURL(url);
      }}>Download template</button>} />
    <ErrorNotice error={error} />
    <div className="network-layout">
      <Panel title="Supply dependency graph">
        <div className="network-canvas stitch-network">
          {graph?.nodes?.length ? (
            <svg viewBox="0 0 720 260" role="img" aria-label="Tier-0 to Tier-2 supply chain graph with Rajkot backup">
              <line x1="170" y1="70" x2="270" y2="70" stroke="#586C7F" strokeWidth="2" />
              <line x1="440" y1="70" x2="530" y2="70" stroke="#BB0000" strokeWidth="2" />
              <path d="M355 110 L355 185 L530 185" stroke="#107E3E" strokeWidth="2.5" strokeDasharray="6 4" fill="none" />
              <g role="button" onClick={() => setSelected(graph.nodes[0])}>
                <rect x="10" y="30" width="160" height="80" rx="10" fill="#FFFFFF" stroke="#0A6ED1" strokeWidth="2" />
                <text x="24" y="54" fill="#0A6ED1" fontSize="11" fontFamily="IBM Plex Mono">TIER-0 · SUP-PUNE-OEM</text>
                <text x="24" y="76" fill="#102738" fontSize="13" fontWeight="600" fontFamily="Inter">Pune Hydraulic OEM</text>
                <text x="24" y="96" fill="#586C7F" fontSize="11">India · HPH-1042</text>
              </g>
              <g role="button" onClick={() => setSelected(graph.nodes[1] || graph.nodes[0])}>
                <rect x="270" y="30" width="170" height="80" rx="10" fill="#FFFFFF" stroke="#D1DCE5" strokeWidth="1.5" />
                <text x="284" y="54" fill="#586C7F" fontSize="11" fontFamily="IBM Plex Mono">TIER-1 · SUP-CBE-ALPHA</text>
                <text x="284" y="76" fill="#102738" fontSize="13" fontWeight="600">Alpha Machining</text>
                <text x="284" y="96" fill="#586C7F" fontSize="11">Coimbatore, IN</text>
              </g>
              <g role="button" onClick={() => setSelected(graph.nodes[2] || graph.nodes[0])}>
                <rect x="530" y="30" width="180" height="80" rx="10" fill="#FDE8E8" stroke="#BB0000" strokeWidth="2" />
                <text x="544" y="54" fill="#BB0000" fontSize="11" fontFamily="IBM Plex Mono">TIER-2 · SUP-NGB-BETA</text>
                <text x="544" y="76" fill="#102738" fontSize="13" fontWeight="600">Beta Foundry (AT-RISK)</text>
                <text x="544" y="96" fill="#8B0000" fontSize="11" fontFamily="IBM Plex Mono">Ningbo, CN · HS 7325</text>
              </g>
              <g role="button" onClick={() => setSelected(graph.nodes[3] || graph.nodes[0])}>
                <rect x="530" y="145" width="180" height="80" rx="10" fill="#E6F4EC" stroke="#107E3E" strokeWidth="2" />
                <text x="544" y="169" fill="#0B572B" fontSize="11" fontFamily="IBM Plex Mono">BACKUP · SUP-RJK-CAST</text>
                <text x="544" y="191" fill="#102738" fontSize="13" fontWeight="600">Rajkot Foundry Cluster</text>
                <text x="544" y="211" fill="#0B572B" fontSize="11" fontFamily="IBM Plex Mono">Gujarat, IN · 0% Duty</text>
              </g>
            </svg>
          ) : <div className="empty-state">No supplier nodes loaded. Import a BOM or ask an admin to reset the demo seed.</div>}
        </div>
      </Panel>
      <Panel title="Node inspector">
        {selected ? <>
          <div className="inspector-name"><span>{selected.supplierId}</span><h3>{selected.name}</h3></div>
          <div className="detail-list">
            <div><span>Country</span><b>{selected.country || '—'}</b></div>
            <div><span>Tier</span><b>{selected.tier ?? '—'}</b></div>
            <div><span>HS code</span><b>{selected.hsCode || '—'}</b></div>
            <div><span>Lead time</span><b>{selected.leadTimeDays != null ? `${selected.leadTimeDays} days` : '—'}</b></div>
            <div><span>Annual spend</span><b>{money(selected.annualSpendInr)}</b></div>
          </div>
        </> : <div className="empty-state">Select a supplier node to inspect its details.</div>}
      </Panel>
    </div>
    <Panel title="Import BOM CSV">
      <div className="upload-row">
        <label className="file-drop"><input type="file" accept=".csv,text/csv" onChange={e => setFile(e.target.files?.[0] || null)} />
          <b>{file ? file.name : 'Drop or choose a CSV file'}</b><span>14-column supplier network format</span></label>
        <label>Import mode<select value={mode} onChange={e => setMode(e.target.value as 'append' | 'replace')}><option value="append">Append</option><option value="replace">Replace</option></select></label>
        <button className="primary" onClick={importCsv} disabled={busy}>{busy ? 'Importing...' : 'Import CSV'}</button>
      </div>
    </Panel>
  </>;
}

function Disruption({ notify, navigate }: { notify: (value: string) => void; navigate: (page: Page) => void }) {
  const [alert, setAlert] = useState('20% tariff increase on HS 7325 castings from China');
  const [partCode, setPartCode] = useState('HPH-1042');
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const analyze = async () => {
    if (!alert.trim()) { setError('Enter a disruption alert.'); return; }
    setBusy(true); setError('');
    try {
      const response = await api<any>('/api/agent/analyze-disruption', {
        method: 'POST',
        body: JSON.stringify({ alertText: alert, partCode, annualSpendInr: 4800000, costFraction: 0.6 }),
      });
      setResult(response);
      notify('Disruption analysis completed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally { setBusy(false); }
  };

  const createApproval = async () => {
    const option = result?.simulation?.recoveryOptions?.find((item: any) => item.recommended);
    if (!option) { setError('No recommended recovery option is available.'); return; }
    setBusy(true); setError('');
    try {
      await api('/api/approvals', {
        method: 'POST',
        body: JSON.stringify({
          partCode,
          targetSupplierId: option.targetSupplierId,
          recommendedQty: 100,
          estimatedLandedCost: option.estimatedLandedCostInr,
          scenarioId: result.scenarioId,
        }),
      }, true);
      notify('Approval request created');
      navigate('approvals');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create approval');
    } finally { setBusy(false); }
  };

  const exposure = result?.simulation?.tariffShock?.totalExposureInr;
  const options = result?.simulation?.recoveryOptions || [];
  return <>
    <PageHeader eyebrow="Intelligence & Simulation" title="AI Disruption Analyzer" description="Grounded multi-agent findings · preparation for human approval" />
    <ErrorNotice error={error} />
    <Panel title="Analyze disruption">
      <div className="analyze-row">
        <label>Part code<input value={partCode} onChange={e => setPartCode(e.target.value)} /></label>
        <label className="flex-field">Disruption alert<textarea value={alert} onChange={e => setAlert(e.target.value)} /></label>
        <button className="primary" onClick={analyze} disabled={busy}>{busy ? 'Analyzing...' : 'Analyze alert'}</button>
      </div>
    </Panel>
    {result && (
      <>
        <div className="metric-grid">
          <Metric label="Duty exposure" value={money(exposure)} note="Unified modeled impact" tone="amber" />
          <Metric label="Inventory gap" value={result.simulation?.inventory?.gapDays != null ? `${result.simulation.inventory.gapDays} days` : '—'} note="Residual supply gap" />
          <Metric label="AI backend" value={result.backendStatus || '—'} note={result.extractionEngine || 'Analysis engine'} />
        </div>
        <div className="dashboard-grid">
          <Panel title="Executive brief">
            <Status value={result.simulationSkipped ? 'HUMAN REVIEW REQUIRED' : result.signalType} />
            <p className="brief-copy">{result.executiveBrief}</p>
            {result.warnings?.map((warning: string, index: number) => <div className="warning-line" key={index}>{warning}</div>)}
          </Panel>
          <Panel title="Recovery options" action={options.length ? <button className="primary" onClick={createApproval} disabled={busy}>Create approval</button> : undefined}>
            {options.map((option: any, index: number) =>
              <div className="option-row" key={index}>
                <div><b>{option.recommended ? 'Recommended · ' : ''}{option.description || option.targetSupplierId}</b><small>Rank {option.rank || index + 1}</small></div>
                <strong>{money(option.totalImpactInr || option.estimatedLandedCostInr)}</strong>
              </div>)}
          </Panel>
        </div>
        {result.specialistFindings && <Panel title="Specialist findings"><pre className="json-output">{JSON.stringify(result.specialistFindings, null, 2)}</pre></Panel>}
      </>
    )}
  </>;
}

function WhatIf({ notify, navigate }: { notify: (value: string) => void; navigate: (page: Page) => void }) {
  const [tariff, setTariff] = useState(20);
  const [delay, setDelay] = useState(0);
  const [annualSpend, setAnnualSpend] = useState(4800000);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true); setError('');
    try {
      const response = await api<any>('/api/whatif/simulate', {
        method: 'POST',
        body: JSON.stringify({
          scenarioId: `SC-${Date.now()}`, hsCode: '7325', originCountry: 'CN',
          deltaPercentagePoints: tariff, annualSpendInr: annualSpend, costFraction: 0.6,
          unitsOnHand: 300, dailyDemand: 20, leadTimeDays: 30 + delay, lateCostPerDayInr: 80000, seed: 20261121,
        }),
      });
      setResult(response);
      notify('What-if simulation completed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally { setBusy(false); }
  };

  const createApproval = async () => {
    const option = result?.recoveryOptions?.find((item: any) => item.recommended);
    if (!option) return;
    setBusy(true);
    try {
      await api('/api/approvals', { method: 'POST', body: JSON.stringify({
        partCode: 'HPH-1042', targetSupplierId: option.targetSupplierId, recommendedQty: 100,
        estimatedLandedCost: option.estimatedLandedCostInr || option.totalImpactInr, scenarioId: result.scenarioId,
      }) }, true);
      notify('Approval request created');
      navigate('approvals');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create approval');
    } finally { setBusy(false); }
  };

  const options = result?.recoveryOptions || [];
  return <>
    <PageHeader eyebrow="Intelligence & Simulation" title="What-If Tariff & Monte Carlo Simulator" description="Compare duty exposure and recovery options against waiting." />
    <ErrorNotice error={error} />
    <div className="simulator-layout">
      <Panel title="Scenario controls">
        <div className="slider-control"><div><span>Tariff shock</span><b>{tariff}%</b></div><input type="range" min="0" max="50" value={tariff} onChange={e => setTariff(Number(e.target.value))} /></div>
        <div className="slider-control"><div><span>Additional delay</span><b>{delay} days</b></div><input type="range" min="0" max="45" value={delay} onChange={e => setDelay(Number(e.target.value))} /></div>
        <label>Annual affected spend<input type="number" min="0" value={annualSpend} onChange={e => setAnnualSpend(Number(e.target.value))} /></label>
        <button className="primary full" onClick={run} disabled={busy}>{busy ? 'Simulating...' : 'Run live simulation'}</button>
      </Panel>
      <Panel title="Financial impact">
        {!result ? <div className="empty-state">Run a simulation to populate the results.</div> : <>
          <div className="result-summary">
            <div><span>Duty exposure</span><strong>{money(result.tariffShock?.totalExposureInr)}</strong></div>
            <div><span>Days of cover</span><strong>{result.inventory?.daysOfCover}</strong></div>
            <div><span>Inventory gap</span><strong>{result.inventory?.gapDays} days</strong></div>
          </div>
          {result.monteCarlo && <Panel title="10,000-Trial Monte Carlo Distribution">
            <div className="monte-carlo-summary">
              <span>P50 arrival: {result.monteCarlo.arrivalDaysP50 != null ? `${result.monteCarlo.arrivalDaysP50} days` : '—'}</span>
              <span>P90 arrival: {result.monteCarlo.arrivalDaysP90 != null ? `${result.monteCarlo.arrivalDaysP90} days` : '—'}</span>
              <span>{result.monteCarlo.trials?.toLocaleString() || '10,000'} trials</span>
            </div>
            <svg className="monte-carlo-chart" viewBox="0 0 600 110" role="img" aria-label="Monte Carlo histogram">
              {[25,45,62,80,88,75,58,40,28,18,12].map((height, index) =>
                <rect key={index} x={20 + index * 44} y={100 - height} width="38" height={height} rx="3"
                  fill={index < 4 ? '#0A6ED1' : index < 7 ? '#0F828F' : index < 9 ? '#E9730C' : '#BB0000'} />)}
            </svg>
          </Panel>}
          <div className="option-list">
            {options.map((option: any, index: number) =>
              <div className={option.recommended ? 'option-row recommended' : 'option-row'} key={index}>
                <div><b>{option.recommended ? 'Recommended · ' : ''}{option.description || option.targetSupplierId}</b><small>{option.residualGapDays != null ? `${option.residualGapDays} residual gap days` : `Rank ${option.rank || index + 1}`}</small></div>
                <strong>{money(option.totalImpactInr)}</strong>
              </div>)}
          </div>
          {result.monteCarlo && <div className="detail-list compact">
            <div><span>P50 arrival</span><b>{result.monteCarlo.arrivalDaysP50} days</b></div>
            <div><span>P90 arrival</span><b>{result.monteCarlo.arrivalDaysP90} days</b></div>
          </div>}
          {options.length > 0 && <button className="primary full" onClick={createApproval} disabled={busy}>Create approval request</button>}
        </>}
      </Panel>
    </div>
  </>;
}

function Logistics({ notify }: { notify: (value: string) => void }) {
  const [origin, setOrigin] = useState('Kochi');
  const [destination, setDestination] = useState('Chennai');
  const [weight, setWeight] = useState(500);
  const [modes, setModes] = useState('road,sea,rail');
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true); setError('');
    try {
      const response = await api<any>('/api/logistics/reroute', {
        method: 'POST',
        body: JSON.stringify({
          useDemoDefaults: true, origin, destination, weightKg: weight,
          cargoDescription: 'Machine parts', allowedModes: modes.split(',').map(value => value.trim()).filter(Boolean),
        }),
      });
      setResult(response);
      notify('Logistics reroute completed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reroute failed');
    } finally { setBusy(false); }
  };

  return <>
    <PageHeader eyebrow="Intelligence & Simulation" title="57-Hub Logistics Reroute Planner" description="Model live freight routes and separate route feasibility from commercial readiness." />
    <ErrorNotice error={error} />
    <Panel title="Shipment controls">
      <div className="control-grid">
        <label>Origin<input value={origin} onChange={e => setOrigin(e.target.value)} /></label>
        <label>Destination<input value={destination} onChange={e => setDestination(e.target.value)} /></label>
        <label>Weight (kg)<input type="number" min="1" value={weight} onChange={e => setWeight(Number(e.target.value))} /></label>
        <label>Allowed modes<input value={modes} onChange={e => setModes(e.target.value)} /></label>
        <button className="primary" onClick={run} disabled={busy}>{busy ? 'Routing...' : 'Run reroute'}</button>
      </div>
    </Panel>
    <div className="route-layout">
      <Panel title="Corridor map">
        <div className="route-map">
          <div className="map-grid" />
          <div className="route-origin"><i /><span>{origin}</span></div>
          <div className="route-line" />
          <div className="route-destination"><i /><span>{destination}</span></div>
          {result?.legs?.map((leg: any, index: number) => <div className="leg-marker" style={{ left: `${35 + index * 20}%`, bottom: `${25 + (index % 2) * 18}%` }} key={leg.legId || index}>{index + 1}</div>)}
        </div>
      </Panel>
      <Panel title="Decision">
        <div className="decision-block"><span>Physical feasibility</span><Status value={result ? result.feasible ? 'FEASIBLE' : 'NO FEASIBLE ROUTE' : 'NOT RUN'} /></div>
        <div className="decision-block"><span>Commercial status</span><Status value={result?.decisionStatus || 'NOT RUN'} /></div>
        <div className="detail-list">
          <div><span>Estimated cost</span><b>{money(result?.costEstimateInr)}</b></div>
          <div><span>Transit</span><b>{result?.transitHoursEstimate != null ? `${result.transitHoursEstimate} hours` : '—'}</b></div>
        </div>
        {result?.decision?.gateReasons?.map((reason: string, index: number) => <div className="warning-line" key={index}>{reason}</div>)}
      </Panel>
    </div>
  </>;
}

function Approvals({ notify, canDecide }: { notify: (value: string) => void; canDecide: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [reviewer, setReviewer] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api<any[]>('/api/approvals').then(setItems).catch(err => setError(err.message));
  useEffect(() => { void load(); }, []);

  const decide = async (item: any, approved: boolean) => {
    if (!reviewer.trim()) { setError('Enter the reviewer name.'); return; }
    setBusy(true); setError('');
    try {
      await api(`/api/approvals/${item.id}/${approved ? 'approve' : 'reject'}`, {
        method: 'POST',
        body: JSON.stringify({ reviewerName: reviewer.trim(), comment: approved ? 'Approved in DeepTier cockpit' : 'Rejected in DeepTier cockpit' }),
      }, true);
      await load();
      notify(approved ? 'Request approved and RFQ issued' : 'Request rejected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decision failed');
    } finally { setBusy(false); }
  };

  return <>
    <PageHeader eyebrow="Governance & SAP" title="Human-in-the-Loop (HITL) Approval Queue" description="Review financial impact and manage the human-in-the-loop gate." />
    <ErrorNotice error={error} />
    <div className="approval-toolbar"><label>Reviewer name<input value={reviewer} onChange={e => setReviewer(e.target.value)} placeholder="Enter reviewer name" /></label></div>
    <Panel title="Approval requests" action={<span className="record-count">{items.length} requests</span>}>
      {items.length ? <div className="table-wrap"><table>
        <thead><tr><th>Request</th><th>Part / supplier</th><th>Financial impact</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{items.map(item =>
          <tr key={item.id}>
            <td><b>{item.id}</b></td>
            <td><b>{item.partCode}</b><small>{item.targetSupplierId}</small></td>
            <td>{money(item.estimatedLandedCost)}</td>
            <td><Status value={item.approvalStatus} /></td>
            <td><div className="table-actions">
              <button className="text-button" onClick={() => api<any>(`/api/approvals/${item.id}`).then(setSelected).catch(err => setError(err.message))}>View</button>
              {item.approvalStatus === 'PENDING_APPROVAL' && canDecide && <>
                <button className="approve" disabled={busy} onClick={() => decide(item, true)}>Approve</button>
                <button className="reject" disabled={busy} onClick={() => decide(item, false)}>Reject</button>
              </>}
            </div></td>
          </tr>)}</tbody>
      </table></div> : <div className="empty-state">No approval requests yet. Create one from a disruption or what-if result.</div>}
    </Panel>
    {selected && <Panel title="Request detail"><pre className="json-output">{JSON.stringify(selected, null, 2)}</pre></Panel>}
  </>;
}

function Rfqs({ notify, canPush }: { notify: (value: string) => void; canPush: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [payload, setPayload] = useState<any>(null);
  const [pushResult, setPushResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api<any[]>('/api/rfqs').then(setItems).catch(err => setError(err.message));
  useEffect(() => { void load(); }, []);

  const push = async (id: string) => {
    setBusy(true); setError('');
    try {
      const result = await api<any>(`/api/rfqs/${id}/push-sap`, { method: 'POST' }, true);
      setPushResult(result);
      await load();
      notify(`S/4HANA push completed: ${result.purchaseRequisitionId || 'Pushed'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SAP push failed');
    } finally { setBusy(false); }
  };

  return <>
    <PageHeader eyebrow="Governance & SAP" title="RFQ & Direct SAP S/4HANA Execution" description="Inspect clean-core payloads and push approved purchase requisitions." />
    <ErrorNotice error={error} />
    {pushResult && <div className="sap-success"><div><span>Purchase requisition</span><b>{pushResult.purchaseRequisitionId}</b></div><Status value={pushResult.status} /></div>}
    <Panel title="RFQ list" action={<button className="secondary" onClick={() => void load()}>Refresh</button>}>
      {items.length ? <div className="table-wrap"><table>
        <thead><tr><th>RFQ ID</th><th>Part</th><th>Supplier</th><th className="numeric">Qty</th><th>Status</th><th className="numeric">Actions</th></tr></thead>
        <tbody>{items.map(item =>
          <tr key={item.id}>
            <td className="hash">{item.id}</td>
            <td><b>{item.partCode}</b></td>
            <td className="hash">{item.targetSupplierId}</td>
            <td className="numeric">{item.requestedQty}</td>
            <td><Status value={item.rfqStatus} /></td>
            <td className="numeric"><div className="table-actions">
              <button className="secondary" onClick={() => api<any>(`/api/rfqs/${item.id}/sap-payload`).then(setPayload).catch(err => setError(err.message))}>Payload</button>
              {canPush && item.rfqStatus !== 'PUSHED_TO_SAP' && <button className="primary" disabled={busy} onClick={() => push(item.id)}>Push SAP</button>}
            </div></td>
          </tr>)}</tbody>
      </table></div> : <div className="empty-state">Approved requests generate RFQs automatically.</div>}
    </Panel>
    {payload && <Panel title="SAP purchase requisition payload"><pre className="json-output">{JSON.stringify(payload, null, 2)}</pre></Panel>}
  </>;
}

function Audit({ notify }: { notify: (value: string) => void }) {
  const [events, setEvents] = useState<any[]>([]);
  const [verification, setVerification] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [history, verify] = await Promise.all([
        api<any[]>('/api/audit'),
        api<any>('/api/audit/verify'),
      ]);
      setEvents(history); setVerification(verify);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load audit trail');
    }
  };
  useEffect(() => { void load(); }, []);

  const verify = async () => {
    setBusy(true); setError('');
    try {
      const result = await api<any>('/api/audit/verify');
      setVerification(result);
      notify(result.valid ? 'SHA-256 chain verified' : 'Chain verification failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally { setBusy(false); }
  };

  return <>
    <PageHeader eyebrow="Governance & SAP" title="SHA-256 Tamper-Evident Audit Trail" description="Verify immutable, hash-linked decision events."
      action={<button className="primary" onClick={verify} disabled={busy}>{busy ? 'Verifying...' : 'Verify SHA-256 chain'}</button>} />
    <ErrorNotice error={error} />
    <div className={`integrity-banner ${verification?.valid ? 'valid' : ''}`}>
      <div><span>Chain integrity</span><strong>{verification ? verification.valid ? 'Verified · Intact' : 'Verification failed' : 'Checking'}</strong></div>
      <b>{verification?.totalEvents ?? 0} events</b>
    </div>
    <Panel title="Immutable events">
      {events.length ? <div className="table-wrap"><table>
        <thead><tr><th>Timestamp</th><th>Event Type</th><th>Actor</th><th>Before Hash</th><th>After Hash</th></tr></thead>
        <tbody>{events.map((event, index) =>
          <tr key={event.id || index}>
            <td>{event.occurredAt ? new Date(event.occurredAt).toLocaleString() : '—'}</td>
            <td><b>{event.eventType}</b></td>
            <td>{event.actor || 'System'}</td>
            <td className="hash">{(event.beforeHash || event.hash || '').slice(0, 16)}…</td>
            <td className="hash">{(event.afterHash || '').slice(0, 16)}…</td>
          </tr>)}</tbody>
      </table></div> : <div className="empty-state">No audit events recorded yet.</div>}
    </Panel>
  </>;
}

function App() {
  const [session, setSessionState] = useState<LoginResponse | null>(() => getSession());

  useEffect(() => {
    if (!session) return;
    authApi.me().catch(() => { setSession(null); setSessionState(null); });
  }, [session]);

  if (!session) {
    return <Login onLogin={value => { setSession(value); setSessionState(value); }} />;
  }
  return <Shell session={session} onLogout={() => { setSession(null); setSessionState(null); window.location.hash = ''; }} />;
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
