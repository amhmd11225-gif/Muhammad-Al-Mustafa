import { useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  AlertCircle,
} from 'lucide-react';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../../firebase';
import type { Product } from '../../types';
import { formatPrice, generateDocId } from '../../utils/format';
import { PartImage } from '../PartImage';

interface InStoreSaleViewProps {
  products: Product[];
  currency: string;
  employeeName: string;
}

export function InStoreSaleView({
  products,
  currency,
  employeeName,
}: InStoreSaleViewProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastReceipt, setLastReceipt] = useState<{
    saleId: string;
    productName: string;
    quantity: number;
    total: number;
    timeStr: string;
  } | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = products.filter((p) => {
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.carMake.toLowerCase().includes(q) ||
      p.carModel.toLowerCase().includes(q)
    );
  });

  const handleSelectProduct = (p: Product) => {
    if (p.quantity <= 0) return;
    setSelected(p);
    setQty(1);
    setError('');
    setLastReceipt(null);
  };

  const handleRecordSale = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected || !auth.currentUser) return;
    setError('');

    if (qty <= 0) {
      setError('الكمية يجب أن تكون 1 على الأقل.');
      return;
    }

    setSubmitting(true);
    const saleId = generateDocId('sale');
    const productRef = doc(db, 'products', selected.id);
    const saleRef = doc(db, 'sales', saleId);

    try {
      let computedTotal = 0;
      let productName = selected.name;

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(productRef);
        if (!snap.exists()) {
          throw new Error('هذه القطعة غير موجودة في المخزن.');
        }
        const live = snap.data() as Product;
        if (live.quantity <= 0) {
          throw new Error('لا يمكن بيع قطعة نافدة من المخزن.');
        }
        if (live.quantity < qty) {
          throw new Error(`الكمية المتوفرة بالمخزن هي ${live.quantity} فقط.`);
        }

        productName = live.name;
        computedTotal = live.price * qty;

        transaction.update(productRef, {
          quantity: live.quantity - qty,
          soldCount: (live.soldCount || 0) + qty,
          updatedAt: serverTimestamp(),
        });

        transaction.set(saleRef, {
          productId: selected.id,
          productName: live.name,
          carMake: live.carMake,
          carModel: live.carModel,
          quantity: qty,
          unitPrice: live.price,
          totalAmount: computedTotal,
          source: 'in_store',
          employeeUid: auth.currentUser!.uid,
          employeeName: employeeName.slice(0, 100),
          ...(notes.trim() ? { notes: notes.trim().slice(0, 300) } : {}),
          createdAt: serverTimestamp(),
        });
      });

      setLastReceipt({
        saleId,
        productName,
        quantity: qty,
        total: computedTotal,
        timeStr: new Intl.DateTimeFormat('ar-IQ', {
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date()),
      });
      setSelected(null);
      setQty(1);
      setNotes('');
    } catch (err) {
      if (err instanceof Error && !err.message.includes('Missing or insufficient')) {
        setError(err.message);
      } else {
        handleFirestoreError(err, OperationType.WRITE, `sales/${saleId}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left/Start: Search & Pick Part */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4">
          <h2 className="font-display font-bold text-base text-[#111318] mb-3">
            اختر القطعة المباعة داخل المحل
          </h2>
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن القطعة بالاسم أو نوع السيارة أو الموديل..."
              className="w-full h-11 pr-4 pl-10 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((p) => {
            const outOfStock = p.quantity <= 0;
            const isSelected = selected?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={outOfStock}
                onClick={() => handleSelectProduct(p)}
                className={`p-3 rounded-2xl border text-right flex items-center gap-3 transition-all ${
                  outOfStock
                    ? 'bg-neutral-100 border-neutral-200 opacity-60 cursor-not-allowed'
                    : isSelected
                    ? 'bg-red-50/60 border-[#C8102E] ring-1 ring-[#C8102E] cursor-pointer'
                    : 'bg-white border-neutral-200 hover:border-neutral-400 cursor-pointer'
                }`}
              >
                <div className="w-16 h-14 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
                  <PartImage
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm text-[#111318] truncate">
                    {p.name}
                  </p>
                  <p className="text-xs text-neutral-500 truncate">
                    {p.carMake} {p.carModel}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-num font-bold text-xs text-[#C8102E] tabular-nums">
                      {formatPrice(p.price, currency)}
                    </span>
                    <span
                      className={`text-[11px] font-bold tabular-nums ${
                        outOfStock ? 'text-[#C8102E]' : 'text-emerald-700'
                      }`}
                    >
                      {outOfStock ? 'نافد (0)' : `متوفر: ${p.quantity}`}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right/End: Sale Checkout Form */}
      <div className="lg:col-span-5">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 sticky top-20">
          <h3 className="font-display font-bold text-base text-[#111318] flex items-center gap-2 mb-4">
            <ShoppingBag className="w-5 h-5 text-[#C8102E]" />
            <span>تسجيل عملية بيع</span>
          </h3>

          {lastReceipt && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
              <div className="flex items-center gap-2 font-display font-bold text-sm mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>تم تسجيل البيع وإنقاص المخزون تلقائياً</span>
              </div>
              <p className="text-xs leading-relaxed">
                {lastReceipt.productName} (الكمية: {lastReceipt.quantity}) — المبلغ:{' '}
                <strong className="font-num">
                  {formatPrice(lastReceipt.total, currency)}
                </strong>
              </p>
              <p className="text-[11px] text-emerald-700 mt-1">
                الموظف: {employeeName} · الساعة {lastReceipt.timeStr}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-[#C8102E] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!selected ? (
            <div className="py-10 text-center text-sm text-neutral-500 border border-dashed border-neutral-200 rounded-xl">
              اختر قطعة متوفرة من القائمة لتسجيل بيعها داخل المحل.
            </div>
          ) : (
            <form onSubmit={handleRecordSale} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
                <p className="font-display font-bold text-base text-[#111318]">
                  {selected.name}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {selected.carMake} {selected.carModel} · المتوفر بالمخزن: {selected.quantity}
                </p>
                <p className="font-num font-bold text-base text-[#C8102E] mt-2 tabular-nums">
                  سعر القطعة: {formatPrice(selected.price, currency)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  الكمية المباعة
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                    disabled={qty <= 1}
                    className="w-10 h-10 rounded-xl border border-neutral-300 flex items-center justify-center text-neutral-700 disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={selected.quantity}
                    value={qty}
                    onChange={(e) => {
                      const v = Math.floor(Number(e.target.value) || 1);
                      setQty(Math.max(1, Math.min(selected.quantity, v)));
                    }}
                    className="w-20 h-10 text-center rounded-xl border border-neutral-300 font-num font-bold text-base tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setQty((prev) => Math.min(selected.quantity, prev + 1))
                    }
                    disabled={qty >= selected.quantity}
                    className="w-10 h-10 rounded-xl border border-neutral-300 flex items-center justify-center text-neutral-700 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  ملاحظات البيع (اختياري)
                </label>
                <input
                  type="text"
                  maxLength={300}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: بيع مباشر لزبون الورشة"
                  className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-100 flex items-center justify-between">
                <span className="text-sm font-bold text-[#111318]">الإجمالي</span>
                <span className="font-num font-extrabold text-xl text-[#C8102E] tabular-nums">
                  {formatPrice(selected.price * qty, currency)}
                </span>
              </div>

              <div className="text-xs text-neutral-500">
                المسجل للعملية: <strong className="text-[#111318]">{employeeName}</strong>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-[#C8102E] hover:bg-[#A60D26] disabled:opacity-60 text-white font-display font-bold text-sm sm:text-base transition-colors cursor-pointer"
              >
                {submitting ? 'جاري تسجيل البيع...' : 'تأكيد وتسجيل البيع'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
