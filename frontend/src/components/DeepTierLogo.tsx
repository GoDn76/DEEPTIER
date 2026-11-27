export function DeepTierLogo({ light = true }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="2" y="10" width="4.5" height="11" rx="1" fill="#38BDF8" />
        <rect x="9.5" y="6" width="4.5" height="15" rx="1" fill="#0EA5E9" />
        <rect x="17" y="2.5" width="4.5" height="18.5" rx="1" fill="#2DD4BF" />
      </svg>
      <div className="flex items-baseline gap-1.5">
        <span
          className={`text-[15px] font-bold tracking-tight ${
            light ? 'text-white' : 'text-[#102738]'
          }`}
        >
          DeepTier
        </span>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider ${
            light ? 'text-[#94A3B8]' : 'text-[#5B7083]'
          }`}
        >
          S/4HANA
        </span>
      </div>
    </div>
  );
}
