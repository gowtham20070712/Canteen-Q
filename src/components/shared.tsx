import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      {message && <p className="mt-3 text-sm text-gray-500">{message}</p>}
    </div>
  );
}

export function formatPrice(paise: number): string {
  return `₹${(paise).toFixed(0)}`;
}

export function formatTime(dateString: string | null): string {
  if (!dateString) return '--';
  return new Date(dateString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
