import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-auto z-50 flex items-center justify-center gap-2 rounded-xl bg-[#11141A] border border-amber-500/50 px-4 py-2.5 text-xs font-bold text-amber-300 shadow-xl">
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>أنت غير متصل بالإنترنت — يتم عرض البيانات المحفوظة مؤقتاً</span>
    </div>
  );
}
