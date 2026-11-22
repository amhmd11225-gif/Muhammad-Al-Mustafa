import { useState, type FormEvent } from 'react';
import { CheckCircle2, Database, Settings } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import type { StoreSettings } from '../../types';

interface SettingsViewProps {
  settings: StoreSettings;
  onSeedCatalog: () => Promise<void>;
  productsCount: number;
}

export function SettingsView({
  settings,
  onSeedCatalog,
  productsCount,
}: SettingsViewProps) {
  const [storeName, setStoreName] = useState(settings.storeName);
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber);
  const [currency, setCurrency] = useState(settings.currency);
  const [defaultMinStock, setDefaultMinStock] = useState(
    String(settings.defaultMinStock)
  );
  const [address, setAddress] = useState(settings.address || '');
  const [aboutText, setAboutText] = useState(settings.aboutText || '');
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    try {
      await setDoc(doc(db, 'settings', 'store'), {
        storeName: storeName.trim().slice(0, 100),
        whatsappNumber: whatsappNumber.trim().slice(0, 30),
        currency: currency.trim().slice(0, 20) || 'د.ع',
        defaultMinStock: Math.max(0, Math.floor(Number(defaultMinStock) || 2)),
        address: address.trim().slice(0, 200),
        aboutText: aboutText.trim().slice(0, 1000),
        updatedAt: serverTimestamp(),
      });
      setSavedMsg('تم حفظ إعدادات المتجر بنجاح.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/store');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedClick = async () => {
    setSeeding(true);
    setSavedMsg('');
    try {
      await onSeedCatalog();
      setSavedMsg('تمت تهيئة المنتجات الأولية بنجاح.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-7">
        <div className="flex items-center gap-2.5 mb-5">
          <Settings className="w-5 h-5 text-[#C8102E]" />
          <h2 className="font-display font-extrabold text-lg text-[#111318]">
            إعدادات المتجر والواتساب
          </h2>
        </div>

        {savedMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900 flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{savedMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                اسم المتجر *
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                رقم الواتساب لاستلام الطلبات (مع رمز الدولة) *
              </label>
              <input
                type="text"
                required
                dir="ltr"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="9647700000000"
                className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm text-right font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                العملة *
              </label>
              <input
                type="text"
                required
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="د.ع"
                className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                الحد الافتراضي لتنبيه نفاد المخزون
              </label>
              <input
                type="number"
                min={0}
                value={defaultMinStock}
                onChange={(e) => setDefaultMinStock(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              عنوان المحل
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              نص &quot;من نحن&quot; في واجهة المتجر
            </label>
            <textarea
              rows={3}
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              className="w-full p-3 rounded-xl border border-neutral-300 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="h-11 px-6 rounded-xl bg-[#C8102E] hover:bg-[#A60D26] text-white font-display font-bold text-sm cursor-pointer"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </form>
      </div>

      {/* Seed Catalog Utility */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-sm text-[#111318] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#0284C7]" />
            <span>تهيئة بيانات المتجر الأولية</span>
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            المتجر يحتوي حالياً على {productsCount} صنف. يمكنك إعادة إضافة قطع الغيار النموذجية إذا لزم الأمر.
          </p>
        </div>
        <button
          type="button"
          disabled={seeding}
          onClick={handleSeedClick}
          className="h-10 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-xs font-bold text-[#111318] whitespace-nowrap shrink-0 cursor-pointer"
        >
          {seeding ? 'جاري الإضافة...' : 'إضافة القطع النموذجية'}
        </button>
      </div>
    </div>
  );
}
