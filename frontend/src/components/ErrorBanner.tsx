import { AlertTriangle, ShieldAlert, ServerOff, X } from 'lucide-react';
import { ApiClientError } from '../api/client';

export function ErrorBanner({
  error,
  onDismiss,
  className = '',
}: {
  error: unknown;
  onDismiss?: () => void;
  className?: string;
}) {
  if (!error) return null;

  const isApi = error instanceof ApiClientError;
  const status = isApi ? error.status : undefined;
  const detail = isApi
    ? error.detail
    : error instanceof Error
      ? error.message
      : String(error);

  let heading = 'Request Error';
  let Icon = AlertTriangle;
  if (status === 403) {
    heading = 'Permission Denied (403)';
    Icon = ShieldAlert;
  } else if (status === 409) {
    heading = 'Conflict / Duplicate State (409)';
  } else if (status === 503) {
    heading = 'AI Intelligence Service Offline (503)';
    Icon = ServerOff;
  } else if (status === 400) {
    heading = 'Validation Failed (400)';
  }

  return (
    <div
      role="alert"
      className={`rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#991B1B] ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#991B1B]" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{heading}</div>
          <p className="mt-0.5 text-[#7F1D1D]">{detail}</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded p-0.5 text-[#991B1B] hover:bg-[#FEE2E2]"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
