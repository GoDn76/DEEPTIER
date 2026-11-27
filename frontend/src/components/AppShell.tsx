import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Activity,
  ChevronDown,
  FileCheck2,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { DEMO_PERSONAS, DemoPersona, useAuth } from '../context/AuthContext';
import { DeepTierLogo } from './DeepTierLogo';
import { StatusPill } from './StatusPill';

interface ToastMessage {
  id: string;
  text: string;
  tone: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  notify: (text: string, tone?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextValue>({ notify: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'OVERVIEW & NETWORK',
    items: [
      { label: 'Executive Cockpit', to: '/', icon: LayoutDashboard },
      { label: 'Supply Chain & BOM', to: '/supply-chain', icon: Network },
    ],
  },
  {
    title: 'INTELLIGENCE & SIMULATION',
    items: [
      { label: 'AI Disruption Analyzer', to: '/disruptions', icon: Sparkles },
      { label: 'What-If & Monte Carlo', to: '/what-if', icon: SlidersHorizontal },
      { label: '57-Hub Logistics', to: '/logistics', icon: Route },
    ],
  },
  {
    title: 'GOVERNANCE & SAP',
    items: [
      { label: 'Approval Queue', to: '/approvals', icon: FileCheck2 },
      { label: 'HANA PR Viewer & RFQs', to: '/rfqs', icon: FileSpreadsheet },
      { label: 'SHA-256 Audit Trail', to: '/audit', icon: ShieldCheck },
    ],
  },
];

export function AppShell() {
  const { session, switchPersona, switchingPersona, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const notify = useCallback((text: string, tone: 'success' | 'error' | 'info' = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, text, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPersonaOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePersonaSelect = async (persona: DemoPersona) => {
    setPersonaOpen(false);
    try {
      await switchPersona(persona);
      notify(`Switched session to ${persona.username} (${persona.role})`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to switch persona', 'error');
    }
  };

  const roleBadgeTone =
    session?.role === 'ROLE_ADMIN'
      ? 'ai'
      : session?.role === 'ROLE_APPROVER'
        ? 'success'
        : 'neutral';

  return (
    <ToastContext.Provider value={{ notify }}>
      <div className="min-h-screen bg-[#F3F6F8] text-[#102738]">
        {/* Top Shell Bar (56px, #102738) */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#1E3A50] bg-[#102738] px-4 text-white">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-md p-1.5 text-[#CBD5E1] hover:bg-[#1B3A52] lg:hidden"
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="hidden rounded-md p-1.5 text-[#94A3B8] hover:bg-[#1B3A52] hover:text-white lg:inline-flex"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label="Collapse sidebar"
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
            <NavLink to="/" className="flex items-center">
              <DeepTierLogo light />
            </NavLink>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded border border-[#A7F3D0]/30 bg-[#065F46]/40 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#A7F3D0]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
              HANA CLOUD · EU10
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {session && (
              <div className="hidden md:flex items-center gap-2 border-r border-[#24435B] pr-3">
                <span className="text-[12px] font-medium text-[#E2E8F0]">{session.username}</span>
                <StatusPill label={session.role} tone={roleBadgeTone} />
              </div>
            )}

            {/* Quick Demo Persona Switcher */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                disabled={switchingPersona}
                onClick={() => setPersonaOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#2B4C65] bg-[#16344A] px-2.5 py-1.5 text-[12px] font-medium text-[#E2E8F0] hover:bg-[#1E4460] disabled:opacity-60"
              >
                <UserCheck className="h-3.5 w-3.5 text-[#38BDF8]" />
                <span className="hidden sm:inline">
                  {switchingPersona ? 'Switching…' : 'Persona Switcher'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8]" />
              </button>

              {personaOpen && (
                <div className="absolute right-0 mt-1.5 w-64 rounded-lg border border-[#D9E2EC] bg-white py-1.5 text-[#102738] shadow-xs z-50">
                  <div className="border-b border-[#E2E8F0] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#5B7083]">
                    1-Click Demo Persona Login
                  </div>
                  {DEMO_PERSONAS.map((persona) => {
                    const active = session?.username === persona.username;
                    return (
                      <button
                        key={persona.username}
                        type="button"
                        onClick={() => handlePersonaSelect(persona)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-[12px] hover:bg-[#F3F6F8] ${
                          active ? 'bg-[#F0F7FF] font-semibold' : ''
                        }`}
                      >
                        <div>
                          <div className="text-[#102738]">{persona.label}</div>
                          <div className="font-mono-tabular text-[11px] text-[#5B7083]">
                            {persona.username}
                          </div>
                        </div>
                        <StatusPill
                          label={persona.shortRole}
                          tone={
                            persona.role === 'ROLE_ADMIN'
                              ? 'ai'
                              : persona.role === 'ROLE_APPROVER'
                                ? 'success'
                                : 'neutral'
                          }
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#2B4C65] bg-transparent px-2.5 py-1.5 text-[12px] font-medium text-[#CBD5E1] hover:bg-[#1B3A52] hover:text-white"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-56px)]">
          {/* Mobile backdrop */}
          {mobileOpen && (
            <div
              className="fixed inset-0 z-20 bg-[#102738]/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}

          {/* Collapsible Left Sidebar (240px, white, right border #D9E2EC) */}
          <aside
            className={`fixed top-14 bottom-0 left-0 z-20 flex flex-col border-r border-[#D9E2EC] bg-white transition-all duration-150 lg:static lg:translate-x-0 ${
              mobileOpen ? 'translate-x-0' : '-translate-x-full'
            } ${collapsed ? 'w-[68px]' : 'w-[240px]'}`}
          >
            <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5">
              {NAV_GROUPS.map((group) => (
                <div key={group.title}>
                  {!collapsed && (
                    <div className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#5B7083]">
                      {group.title}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.to === '/'}
                          onClick={() => setMobileOpen(false)}
                          title={collapsed ? item.label : undefined}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
                              isActive
                                ? 'bg-[#EFF6FF] font-semibold text-[#0A6ED1] border border-[#BFDBFE]'
                                : 'text-[#334E68] hover:bg-[#F3F6F8] hover:text-[#102738] border border-transparent'
                            }`
                          }
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {!collapsed && (
              <div className="border-t border-[#D9E2EC] px-3.5 py-3 text-[11px] text-[#5B7083]">
                <div className="flex items-center gap-1.5 font-medium text-[#102738]">
                  <Activity className="h-3.5 w-3.5 text-[#059669]" />
                  <span>Gateway: /api/*</span>
                </div>
                <div className="mt-0.5 text-[10px] text-[#5B7083]">
                  SAP S/4HANA OData V2 Ready
                </div>
              </div>
            )}
          </aside>

          {/* Main Content Canvas */}
          <main className="min-w-0 flex-1 bg-[#F3F6F8] p-4 sm:p-6">
            <div className="mx-auto max-w-[1440px]">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Toast Stack */}
        {toasts.length > 0 && (
          <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2 max-w-sm">
            {toasts.map((t) => (
              <div
                key={t.id}
                role="status"
                className={`flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-[12px] font-medium shadow-xs ${
                  t.tone === 'success'
                    ? 'border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46]'
                    : t.tone === 'error'
                      ? 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
                      : 'border-[#D9E2EC] bg-white text-[#102738]'
                }`}
              >
                <span>{t.text}</span>
                <button
                  type="button"
                  onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                  className="rounded p-0.5 hover:bg-black/5"
                  aria-label="Dismiss notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
