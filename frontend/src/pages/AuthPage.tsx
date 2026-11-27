import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, Sparkles, Database } from 'lucide-react';
import { DEMO_PERSONAS, useAuth } from '../context/AuthContext';
import { DeepTierLogo } from '../components/DeepTierLogo';
import { ErrorBanner } from '../components/ErrorBanner';

export function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, login, register } = useAuth();

  const initialTab = location.pathname === '/register' ? 'register' : 'login';
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [username, setUsername] = useState('analyst@deeptier.local');
  const [password, setPassword] = useState('Analyst@123');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    setTab(location.pathname === '/register' ? 'register' : 'login');
    setError(null);
  }, [location.pathname]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (tab === 'login') {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleDemoClick = async (demoUser: string, demoPass: string) => {
    setTab('login');
    setUsername(demoUser);
    setPassword(demoPass);
    setBusy(true);
    setError(null);
    try {
      await login(demoUser, demoPass);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-[#F3F6F8]">
      {/* Left Dark Navy Brand Panel */}
      <section className="lg:col-span-5 bg-[#102738] text-white p-8 sm:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#1E3A50]">
        <div>
          <DeepTierLogo light />
          <div className="mt-14 max-w-md">
            <div className="inline-flex items-center gap-1.5 rounded border border-[#2B4C65] bg-[#16344A] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#38BDF8]">
              Multi-Tier Risk &amp; Procurement
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-white leading-[1.15]">
              Supply chain resilience, governed end to end.
            </h1>
            <p className="mt-4 text-[14px] leading-relaxed text-[#CBD5E1]">
              Detect hidden Tier-2+ tariff shocks, run 10,000-trial Monte Carlo recovery
              simulations, route across 57 logistics hubs, and push audited Purchase Requisitions
              directly to SAP S/4HANA.
            </p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-6 border-t border-[#1E3A50]">
          <div className="rounded-md border border-[#1E3A50] bg-[#16344A]/60 px-3 py-2.5">
            <Database className="h-4 w-4 text-[#34D399]" />
            <div className="mt-1.5 text-[12px] font-semibold text-white">SAP HANA Cloud</div>
            <div className="text-[11px] text-[#94A3B8]">OData V2 PR Sync</div>
          </div>
          <div className="rounded-md border border-[#1E3A50] bg-[#16344A]/60 px-3 py-2.5">
            <Sparkles className="h-4 w-4 text-[#2DD4BF]" />
            <div className="mt-1.5 text-[12px] font-semibold text-white">Gemini AI</div>
            <div className="text-[11px] text-[#94A3B8]">Grounded Extraction</div>
          </div>
          <div className="rounded-md border border-[#1E3A50] bg-[#16344A]/60 px-3 py-2.5">
            <ShieldCheck className="h-4 w-4 text-[#38BDF8]" />
            <div className="mt-1.5 text-[12px] font-semibold text-white">SHA-256 Ledger</div>
            <div className="text-[11px] text-[#94A3B8]">Tamper-Evident Audit</div>
          </div>
        </div>
      </section>

      {/* Right Auth Card Panel */}
      <section className="lg:col-span-7 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[440px] dt-card p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-[#D9E2EC] pb-4">
            <div>
              <h2 className="text-[18px] font-bold text-[#102738]">
                {tab === 'login' ? 'Sign in to DeepTier' : 'Create Analyst Account'}
              </h2>
              <p className="mt-0.5 text-[12px] text-[#5B7083]">
                {tab === 'login'
                  ? 'Stateless JWT authentication via Spring Boot gateway'
                  : 'New accounts are provisioned with ROLE_ANALYST'}
              </p>
            </div>
            <Lock className="h-4 w-4 text-[#5B7083]" />
          </div>

          {/* Segmented Tabs */}
          <div className="mt-4 grid grid-cols-2 rounded-md border border-[#D9E2EC] bg-[#F3F6F8] p-1">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                navigate('/login', { replace: true });
              }}
              className={`rounded py-1.5 text-[12px] font-semibold transition-colors ${
                tab === 'login'
                  ? 'bg-white text-[#102738] shadow-xs'
                  : 'text-[#5B7083] hover:text-[#102738]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                navigate('/register', { replace: true });
              }}
              className={`rounded py-1.5 text-[12px] font-semibold transition-colors ${
                tab === 'register'
                  ? 'bg-white text-[#102738] shadow-xs'
                  : 'text-[#5B7083] hover:text-[#102738]'
              }`}
            >
              Sign Up (Analyst)
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <ErrorBanner error={error} onDismiss={() => setError(null)} />

            <div>
              <label className="block text-[12px] font-semibold text-[#334E68] mb-1.5">
                Work Email / Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="analyst@deeptier.local"
                className="dt-input"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#334E68] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="dt-input"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            <button type="submit" disabled={busy} className="dt-btn-primary w-full py-2.5">
              {busy
                ? tab === 'login'
                  ? 'Authenticating…'
                  : 'Provisioning Account…'
                : tab === 'login'
                  ? 'Sign In'
                  : 'Create ROLE_ANALYST Account'}
            </button>
          </form>

          {/* One-click Demo Persona Chips */}
          <div className="mt-6 border-t border-[#D9E2EC] pt-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#5B7083] mb-2.5">
              One-Click Demo Personas
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DEMO_PERSONAS.map((persona) => (
                <button
                  key={persona.username}
                  type="button"
                  disabled={busy}
                  onClick={() => handleDemoClick(persona.username, persona.password)}
                  className="dt-btn-secondary flex-col items-start px-2.5 py-2 text-left"
                >
                  <span className="text-[12px] font-semibold text-[#102738]">{persona.label}</span>
                  <span className="font-mono-tabular text-[10px] text-[#5B7083]">
                    {persona.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
