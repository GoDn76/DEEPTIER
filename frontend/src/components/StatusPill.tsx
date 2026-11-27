import React from 'react';

export type PillTone = 'success' | 'warning' | 'critical' | 'ai' | 'neutral';

const TONE_CLASSES: Record<PillTone, string> = {
  success: 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]',
  warning: 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]',
  critical: 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]',
  ai: 'bg-[#F0FDFA] text-[#115E59] border border-[#99F6E4]',
  neutral: 'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]',
};

export function inferStatusTone(status?: string | null): PillTone {
  const s = (status || '').toUpperCase();
  if (
    s.includes('VERIFIED') ||
    s.includes('READY') ||
    s.includes('PUSHED') ||
    s.includes('APPROVED') ||
    s.includes('AUDITED') ||
    s.includes('CONNECTED') ||
    s === 'TRUE' ||
    s === 'VALID'
  ) {
    return 'success';
  }
  if (
    s.includes('BLOCKED') ||
    s.includes('CRITICAL') ||
    s.includes('ERROR') ||
    s.includes('REJECT') ||
    s.includes('UNPARSED') ||
    s.includes('OFFLINE') ||
    s.includes('TAMPER')
  ) {
    return 'critical';
  }
  if (
    s.includes('PENDING') ||
    s.includes('WARN') ||
    s.includes('MOCK') ||
    s.includes('PARTIAL') ||
    s.includes('FALLBACK') ||
    s.includes('RFQ_ISSUED')
  ) {
    return 'warning';
  }
  if (s.includes('GEMINI') || s.includes('AI') || s.includes('MONTE')) {
    return 'ai';
  }
  return 'neutral';
}

export function StatusPill({
  label,
  tone,
  className = '',
  dot = false,
}: {
  label: React.ReactNode;
  tone?: PillTone;
  className?: string;
  dot?: boolean;
}) {
  const resolved = tone ?? inferStatusTone(typeof label === 'string' ? label : '');
  const dotColor =
    resolved === 'success'
      ? 'bg-[#059669]'
      : resolved === 'warning'
        ? 'bg-[#D97706]'
        : resolved === 'critical'
          ? 'bg-[#DC2626]'
          : resolved === 'ai'
            ? 'bg-[#0D9488]'
            : 'bg-[#64748B]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold tracking-tight whitespace-nowrap ${TONE_CLASSES[resolved]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />}
      {label}
    </span>
  );
}
