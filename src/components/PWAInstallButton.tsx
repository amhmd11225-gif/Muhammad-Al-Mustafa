import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Share,
  Smartphone,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar';
}

export function PWAInstallButton({ variant = 'header' }: PWAInstallButtonProps) {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isInAppBrowser,
    install,
  } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  // Already running inside installed standalone app
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setShowGuide(true);
      }
      return;
    }
    setShowGuide(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const buttonClass =
    variant === 'sidebar'
      ? 'w-full h-10 px-4 rounded-xl bg-[#C8102E] hover:bg-[#A60D26] text-white text-xs sm:text-sm font-display font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer'
      : 'h-10 px-3 rounded-lg bg-[#C8102E] hover:bg-[#A60D26] text-white text-xs sm:text-sm font-display font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0';

  return (
    <>
      <button type="button" onClick={handleClick} className={buttonClass}>
        <Download className="w-4 h-4 shrink-0" />
        <span>تثبيت التطبيق</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white text-[#111318] rounded-2xl shadow-2xl overflow-hidden border border-neutral-200">
            <div className="bg-[#11141A] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#C8102E]" />
                <h3 className="font-display font-bold text-base">
                  تثبيت تطبيق قطع غيار السيارات
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="إغلاق"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              {isInAppBrowser && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                  <strong>تنبيه مهم:</strong> يبدو أنك فتحت الرابط داخل تطبيق آخر (مثل واتساب أو فيسبوك أو تيليجرام). لتثبيت التطبيق وتجنب أي حظر عند تسجيل الدخول، اضغط على القائمة واختر{' '}
                  <strong>الفتح في المتصفح (Safari أو Chrome)</strong>.
                </div>
              )}

              {isIOS ? (
                <div className="space-y-3">
                  <p className="font-display font-bold text-sm text-[#111318]">
                    خطوات التثبيت على الآيفون والآيباد (Safari):
                  </p>
                  <ol className="space-y-2.5 text-neutral-700 text-xs sm:text-sm list-decimal list-inside">
                    <li>
                      تأكد من فتح الرابط في متصفح <strong>Safari</strong>.
                    </li>
                    <li className="leading-relaxed">
                      اضغط على زر <strong>المشاركة</strong>{' '}
                      <Share className="w-4 h-4 inline-block text-[#0284C7] mx-0.5" />{' '}
                      في شريط المتصفح بالأسفل.
                    </li>
                    <li>
                      اختر <strong>إضافة إلى الصفحة الرئيسية (Add to Home Screen)</strong>.
                    </li>
                    <li>
                      اضغط <strong>إضافة (Add)</strong> وسيظهر التطبيق على شاشة جهازك.
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="font-display font-bold text-sm text-[#111318]">
                    خطوات التثبيت على الأندرويد والكمبيوتر (Chrome):
                  </p>
                  <ol className="space-y-2.5 text-neutral-700 text-xs sm:text-sm list-decimal list-inside">
                    <li>
                      افتح الرابط في متصفح <strong>Google Chrome</strong>.
                    </li>
                    <li>
                      اضغط على قائمة النقاط الثلاث <strong>⋮</strong> في زاوية المتصفح.
                    </li>
                    <li>
                      اختر <strong>تثبيت التطبيق (Install App)</strong> أو{' '}
                      <strong>الإضافة إلى الشاشة الرئيسية</strong>.
                    </li>
                  </ol>
                </div>
              )}

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 leading-relaxed">
                التطبيق يتحدث تلقائياً عند كل تحديث جديد للمتجر أو للقطع والأسعار دون الحاجة لإعادة التنزيل.
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 h-10 px-4 rounded-xl bg-[#111318] hover:bg-black text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>تم نسخ الرابط</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>نسخ رابط التطبيق</span>
                    </>
                  )}
                </button>

                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-xs font-bold text-[#111318] inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>فتح بمتصفح خارجي</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
