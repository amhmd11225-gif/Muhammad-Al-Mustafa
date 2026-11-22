import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Copy,
  Check,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import {
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import { detectInAppBrowser } from '../../hooks/usePWAInstall';
import { BrandLogo } from '../BrandLogo';
import type { UserRole } from '../../types';

interface StaffLoginViewProps {
  storeName: string;
  currentRole: UserRole;
  userEmail: string | null;
  onBackToStore: () => void;
  onSignOut: () => void;
}

export function StaffLoginView({
  storeName,
  currentRole,
  userEmail,
  onBackToStore,
  onSignOut,
}: StaffLoginViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const inAppBrowser = detectInAppBrowser();

  useEffect(() => {
    void getRedirectResult(auth).catch((err) => {
      console.error('Redirect sign-in error:', err);
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: string }).code)
          : '';

      // In iOS/Android standalone PWA mode, fallback seamlessly to redirect if popup is blocked
      if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          console.error('Redirect fallback error:', redirectErr);
        }
      }

      console.error('Sign in error:', err);
      setError(
        inAppBrowser
          ? 'المتصفح الداخلي لتطبيقات التواصل يمنع تسجيل دخول Google. افتح الرابط في Safari أو Chrome أولاً.'
          : 'تعذر تسجيل الدخول عبر Google. تأكد من فتح التطبيق في متصفح Safari أو Chrome وحاول مجدداً.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1115] flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-200">
        <div className="bg-[#11141A] px-6 py-5 flex items-center justify-between">
          <BrandLogo storeName={storeName} />
          <button
            type="button"
            onClick={onBackToStore}
            className="text-xs font-medium text-neutral-300 hover:text-white inline-flex items-center gap-1 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>المتجر</span>
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {currentRole === 'unauthorized' && userEmail ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#C8102E] flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h1 className="font-display font-extrabold text-xl text-[#111318] mb-2">
                الحساب غير مسجل في الطاقم
              </h1>
              <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                البريد الإلكتروني{' '}
                <span className="font-mono font-bold text-[#111318]" dir="ltr">
                  {userEmail}
                </span>{' '}
                غير مضاف في قائمة الموظفين أو تم إيقاف صلاحيته. اطلب من المدير إضافتك من قسم &quot;الموظفين&quot;.
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={onSignOut}
                  className="w-full h-11 rounded-xl bg-[#C8102E] hover:bg-[#A60D26] text-white font-display font-bold text-sm transition-colors cursor-pointer"
                >
                  تسجيل الدخول بحساب آخر
                </button>
                <button
                  type="button"
                  onClick={onBackToStore}
                  className="w-full h-11 rounded-xl border border-neutral-200 text-neutral-700 font-medium text-sm hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  العودة إلى المتجر الإلكتروني
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-red-50 text-[#C8102E] flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="font-display font-extrabold text-xl sm:text-2xl text-[#111318] mb-1.5">
                بوابة الإدارة والموظفين
              </h1>
              <p className="text-sm text-neutral-600 mb-5 leading-relaxed">
                سجل الدخول بحسابك المعتمد للوصول إلى لوحة التحكم، إدارة المخزون، أو تسجيل المبيعات داخل المحل.
              </p>

              {inAppBrowser && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed mb-4 space-y-2">
                  <p>
                    <strong>لتفادي حظر تسجيل الدخول من Google:</strong> افتح الرابط في متصفح{' '}
                    <strong>Safari</strong> (للآيفون) أو <strong>Chrome</strong> (للأندرويد) بدلاً من متصفح واتساب أو فيسبوك الداخلي.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900 text-white font-bold text-[11px] cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'تم نسخ الرابط' : 'نسخ الرابط لفتحه بالمتصفح'}</span>
                  </button>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-[#C8102E] mb-4">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-12 px-5 rounded-xl bg-[#C8102E] hover:bg-[#A60D26] disabled:opacity-60 text-white font-display font-bold text-sm sm:text-base inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-sm"
              >
                <LogIn className="w-5 h-5" />
                <span>{loading ? 'جاري التحقق...' : 'تسجيل الدخول بحساب Google'}</span>
              </button>

              <div className="mt-6 pt-5 border-t border-neutral-200 space-y-2 text-xs text-neutral-500">
                <p>
                  <strong className="text-[#111318]">المدير:</strong> صلاحية كاملة (إضافة قطع بالتصوير، تعديل الأسعار، المخزون، المبيعات، التقارير، الموظفين، الإعدادات).
                </p>
                <p>
                  <strong className="text-[#111318]">الموظف:</strong> معاينة المخزون والطلبات وتسجيل البيع داخل المحل فقط.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
