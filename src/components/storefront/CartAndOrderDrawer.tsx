import { useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import type { CartItem, OrderItem, Product } from '../../types';
import {
  buildOrderWhatsappUrl,
  formatPrice,
  generateDocId,
} from '../../utils/format';
import { PartImage } from '../PartImage';

interface CartAndOrderDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  whatsappNumber: string;
  currency: string;
}

interface CompletedOrderReceipt {
  orderId: string;
  whatsappUrl: string;
  totalAmount: number;
  customerName: string;
}

export function CartAndOrderDrawer({
  open,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  whatsappNumber,
  currency,
}: CartAndOrderDrawerProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<CompletedOrderReceipt | null>(null);

  if (!open) return null;

  const totalAmount = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const handleConfirmOrder = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (items.length === 0) {
      setError('السلة فارغة، يرجى اختيار قطعة غيار أولاً.');
      return;
    }

    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.trim();
    const cleanAddress = customerAddress.trim();
    const cleanNotes = notes.trim();

    if (cleanName.length < 2) {
      setError('يرجى إدخال الاسم الكامل بشكل صحيح.');
      return;
    }
    if (cleanPhone.length < 6) {
      setError('يرجى إدخال رقم هاتف صحيح للتواصل.');
      return;
    }
    if (cleanAddress.length < 3) {
      setError('يرجى إدخال العنوان الكامل للتوصيل.');
      return;
    }

    setSubmitting(true);
    const orderId = generateDocId('ord');

    try {
      const orderItems: OrderItem[] = [];

      await runTransaction(db, async (transaction) => {
        // 1. Read all product docs first
        const productDocs = await Promise.all(
          items.map(async (item) => {
            const pRef = doc(db, 'products', item.product.id);
            const snap = await transaction.get(pRef);
            return { item, pRef, snap };
          })
        );

        let computedTotal = 0;

        for (const { item, pRef, snap } of productDocs) {
          if (!snap.exists()) {
            throw new Error(`القطعة "${item.product.name}" لم تعد متوفرة.`);
          }
          const liveProduct = snap.data() as Product;
          if (liveProduct.quantity < item.quantity) {
            if (liveProduct.quantity <= 0) {
              throw new Error(`القطعة "${liveProduct.name}" نفذت من المخزن.`);
            }
            throw new Error(
              `الكمية المتوفرة من "${liveProduct.name}" هي ${liveProduct.quantity} فقط.`
            );
          }

          const subtotal = liveProduct.price * item.quantity;
          computedTotal += subtotal;

          orderItems.push({
            productId: item.product.id,
            productName: liveProduct.name,
            carMake: liveProduct.carMake,
            carModel: liveProduct.carModel,
            price: liveProduct.price,
            quantity: item.quantity,
            subtotal,
          });

          transaction.update(pRef, {
            quantity: liveProduct.quantity - item.quantity,
            soldCount: (liveProduct.soldCount || 0) + item.quantity,
            lastOrderId: orderId,
            updatedAt: serverTimestamp(),
          });
        }

        const orderRef = doc(db, 'orders', orderId);
        transaction.set(orderRef, {
          customerName: cleanName.slice(0, 100),
          customerPhone: cleanPhone.slice(0, 30),
          customerAddress: cleanAddress.slice(0, 240),
          ...(cleanNotes ? { notes: cleanNotes.slice(0, 300) } : {}),
          items: orderItems,
          totalAmount: computedTotal,
          paymentMethod: 'الدفع عند الاستلام',
          status: 'new',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      const finalTotal = orderItems.reduce((s, it) => s + it.subtotal, 0);
      const whatsappUrl = buildOrderWhatsappUrl({
        whatsappNumber,
        orderId,
        customerName: cleanName,
        customerPhone: cleanPhone,
        customerAddress: cleanAddress,
        notes: cleanNotes,
        items: orderItems,
        totalAmount: finalTotal,
        currency,
      });

      setReceipt({
        orderId,
        whatsappUrl,
        totalAmount: finalTotal,
        customerName: cleanName,
      });
      onClearCart();
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setNotes('');
    } catch (err) {
      if (err instanceof Error && !err.message.includes('Missing or insufficient')) {
        setError(err.message);
      } else {
        handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReceipt(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-[2px]">
      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="px-5 py-4 bg-[#0F1115] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#C8102E]" />
            <h2 className="font-display font-bold text-base">
              {receipt ? 'تم تسجيل طلبك بنجاح' : 'سلة المشتريات وإتمام الطلب'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="إغلاق"
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {receipt ? (
            <div className="py-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="font-display font-extrabold text-xl text-[#111318] mb-2">
                شكراً لك يا {receipt.customerName}
              </h3>
              <p className="text-sm text-neutral-600 leading-relaxed mb-5">
                تم حفظ طلبك برقم <span className="font-mono font-bold text-[#111318]">{receipt.orderId}</span> بمبلغ{' '}
                <span className="font-num font-bold text-[#C8102E]">
                  {formatPrice(receipt.totalAmount, currency)}
                </span>{' '}
                (الدفع عند الاستلام).
              </p>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-sm text-emerald-900">
                اضغط على الزر الأخضر أدناه لإرسال تفاصيل طلبك مباشرة إلى واتساب المتجر وتأكيد التوصيل:
              </div>

              <a
                href={receipt.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 px-5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-display font-bold text-base inline-flex items-center justify-center gap-2 transition-colors shadow-sm mb-3"
              >
                <span>إرسال الطلب عبر واتساب الآن</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={handleClose}
                className="w-full h-11 rounded-xl border border-neutral-200 text-neutral-700 font-medium text-sm hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                العودة إلى المتجر
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mb-3">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <p className="font-display font-bold text-base text-[#111318] mb-1">
                سلة المشتريات فارغة
              </p>
              <p className="text-sm text-neutral-500">
                اختر قطعة غيار من المتجر واضغط على &quot;اطلب الآن&quot;.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Items List */}
              <div className="space-y-3">
                {items.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 bg-neutral-50/70"
                  >
                    <div className="w-16 h-14 rounded-lg bg-white border border-neutral-200 overflow-hidden shrink-0">
                      <PartImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display font-bold text-sm text-[#111318] truncate">
                        {product.name}
                      </h4>
                      <p className="text-xs text-neutral-500 truncate">
                        {product.carMake} {product.carModel}
                      </p>
                      <p className="font-num font-bold text-sm text-[#C8102E] mt-0.5 tabular-nums">
                        {formatPrice(product.price * quantity, currency)}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onRemoveItem(product.id)}
                        aria-label={`حذف ${product.name}`}
                        className="text-neutral-400 hover:text-[#C8102E] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="flex items-center border border-neutral-300 rounded-lg bg-white">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                          disabled={quantity <= 1}
                          aria-label="إنقاص الكمية"
                          className="w-7 h-7 flex items-center justify-center text-neutral-700 disabled:opacity-40 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold tabular-nums">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                          disabled={quantity >= product.quantity}
                          aria-label="زيادة الكمية"
                          className="w-7 h-7 flex items-center justify-center text-neutral-700 disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="p-4 rounded-xl bg-neutral-100 border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">طريقة الدفع</span>
                  <span className="font-bold text-[#111318] inline-flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#C8102E]" />
                    الدفع عند الاستلام
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
                  <span className="font-display font-bold text-sm text-[#111318]">
                    المجموع الكلي
                  </span>
                  <span className="font-num font-extrabold text-lg text-[#C8102E] tabular-nums">
                    {formatPrice(totalAmount, currency)}
                  </span>
                </div>
              </div>

              {/* Customer Info Form */}
              <form id="cod-checkout-form" onSubmit={handleConfirmOrder} className="space-y-3.5">
                <h3 className="font-display font-bold text-sm text-[#111318]">
                  معلومات الزبون والتوصيل
                </h3>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-[#C8102E]">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    الاسم الكامل *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="مثال: أحمد علي"
                    className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    رقم الهاتف (واتساب) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={30}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0770xxxxxxx"
                    dir="ltr"
                    className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    العنوان الكامل *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={240}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="المحافظة، الحي، أقرب نقطة دالة"
                    className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    ملاحظات (اختياري)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={300}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="وقت التوصيل المفضل أو تفاصيل إضافية..."
                    className="w-full p-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                  />
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Sticky Footer CTA */}
        {!receipt && items.length > 0 && (
          <div className="p-4 border-t border-neutral-200 bg-white">
            <button
              type="submit"
              form="cod-checkout-form"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-[#C8102E] hover:bg-[#A60D26] disabled:opacity-60 text-white font-display font-bold text-sm sm:text-base transition-colors cursor-pointer"
            >
              {submitting ? 'جاري تأكيد الطلب...' : 'تأكيد الطلب (الدفع عند الاستلام)'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
