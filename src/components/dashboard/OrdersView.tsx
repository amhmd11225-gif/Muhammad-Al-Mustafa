import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  MapPin,
  MessageCircle,
  Phone,
  Trash2,
  Truck,
} from 'lucide-react';
import {
  deleteDoc,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import {
  ORDER_STATUS_LABELS,
  type Order,
  type OrderStatus,
  type Product,
  type UserRole,
} from '../../types';
import {
  buildDeliveredWhatsappUrl,
  buildGeneralWhatsappUrl,
  formatDateTime,
  formatPrice,
} from '../../utils/format';

interface OrdersViewProps {
  orders: Order[];
  currency: string;
  storeName?: string;
  role: UserRole;
  userName: string;
}

const STATUS_ORDER: OrderStatus[] = [
  'new',
  'contacted',
  'preparing',
  'delivered',
  'completed',
  'cancelled',
];

export function OrdersView({
  orders,
  currency,
  storeName,
  role,
  userName,
}: OrdersViewProps) {
  const isAdmin = role === 'admin';
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState('');
  const [actionError, setActionError] = useState('');

  const filtered = orders.filter((o) =>
    filter === 'all' ? true : o.status === filter
  );

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => {
      setActionNotice((prev) => (prev === msg ? '' : prev));
    }, 4500);
  };

  const handleStatusChange = async (order: Order, nextStatus: OrderStatus) => {
    if (order.status === nextStatus) return;
    setBusyId(order.id);
    setActionError('');
    setActionNotice('');

    try {
      if (nextStatus === 'completed') {
        if (!auth.currentUser) {
          throw new Error('يرجى تسجيل الدخول أولاً لإتمام الطلب.');
        }

        await runTransaction(db, async (transaction) => {
          // 1. Execute ALL reads BEFORE any writes (Firestore transaction requirement)
          const orderRef = doc(db, 'orders', order.id);
          const orderSnap = await transaction.get(orderRef);

          const productChecks = await Promise.all(
            order.items.map(async (item, idx) => {
              const pRef = doc(db, 'products', item.productId);
              const snap = await transaction.get(pRef);
              return { item, idx, snap };
            })
          );

          if (!orderSnap.exists()) {
            throw new Error('لم يتم العثور على هذا الطلب.');
          }

          const liveOrder = orderSnap.data() as Order;
          if (liveOrder.status === 'completed') {
            return;
          }

          // 2. Execute ALL writes after reads
          transaction.update(orderRef, {
            status: 'completed',
            updatedAt: serverTimestamp(),
          });

          const currentUid = auth.currentUser!.uid;
          const recorderName = `${userName || 'الإدارة'} (طلب إلكتروني)`.slice(0, 100);

          for (const { item, idx, snap } of productChecks) {
            if (isAdmin || snap.exists()) {
              const saleId = `${order.id}_item_${idx}`.slice(0, 128);
              const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
              const unitPrice = Number(item.price) || 0;
              const subtotal = Number(item.subtotal) || unitPrice * qty;

              transaction.set(doc(db, 'sales', saleId), {
                productId: item.productId,
                orderId: order.id,
                productName: (item.productName || 'قطعة غيار').slice(0, 140),
                carMake: (item.carMake || '').slice(0, 60),
                carModel: (item.carModel || '').slice(0, 60),
                quantity: qty,
                unitPrice,
                totalAmount: subtotal,
                source: 'online',
                employeeUid: currentUid,
                employeeName: recorderName,
                notes: `طلب رقم ${order.id} — ${order.customerName}`.slice(0, 300),
                createdAt: serverTimestamp(),
              });
            }
          }
        });

        showNotice(
          `تم تحويل طلب "${order.customerName}" إلى مكتمل وإضافته إلى سجل المبيعات بنجاح.`
        );
      } else if (
        isAdmin &&
        nextStatus === 'cancelled' &&
        order.status !== 'cancelled'
      ) {
        // Restore reserved stock when Admin cancels an order
        await runTransaction(db, async (transaction) => {
          const snaps = await Promise.all(
            order.items.map(async (item) => ({
              item,
              ref: doc(db, 'products', item.productId),
              snap: await transaction.get(doc(db, 'products', item.productId)),
            }))
          );

          for (const { item, ref, snap } of snaps) {
            if (snap.exists()) {
              const live = snap.data() as Product;
              transaction.update(ref, {
                quantity: live.quantity + item.quantity,
                soldCount: Math.max(0, (live.soldCount || 0) - item.quantity),
                updatedAt: serverTimestamp(),
              });
            }
          }

          transaction.update(doc(db, 'orders', order.id), {
            status: nextStatus,
            updatedAt: serverTimestamp(),
          });
        });

        showNotice(`تم إلغاء الطلب وإرجاع الكميات للمخزون.`);
      } else {
        await updateDoc(doc(db, 'orders', order.id), {
          status: nextStatus,
          updatedAt: serverTimestamp(),
        });

        if (nextStatus === 'delivered') {
          showNotice(
            `تم تحديث حالة طلب "${order.customerName}" إلى تم التوصيل.`
          );
        }
      }
    } catch (err) {
      console.error('Order status update failed:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'تعذر تحديث حالة الطلب، يرجى المحاولة مرة أخرى.';
      setActionError(message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!isAdmin) return;
    setBusyId(orderId);
    setActionError('');
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (err) {
      console.error('Order delete failed:', err);
      setActionError('تعذر حذف الطلب.');
    } finally {
      setBusyId(null);
    }
  };

  const getStatusClass = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return 'text-[#C8102E] bg-red-50 border-red-200';
      case 'contacted':
        return 'text-sky-700 bg-sky-50 border-sky-200';
      case 'preparing':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'delivered':
        return 'text-indigo-700 bg-indigo-50 border-indigo-200';
      case 'completed':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'cancelled':
        return 'text-neutral-600 bg-neutral-100 border-neutral-300';
    }
  };

  return (
    <div className="space-y-5">
      {/* Status Filter Bar */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
            filter === 'all'
              ? 'bg-[#111318] text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          الكل ({orders.length})
        </button>
        {STATUS_ORDER.map((st) => {
          const count = orders.filter((o) => o.status === st).length;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setFilter(st)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                filter === st
                  ? 'bg-[#111318] text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {ORDER_STATUS_LABELS[st]} ({count})
            </button>
          );
        })}
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#C8102E] text-xs sm:text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Orders List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-10 text-center">
          <ClipboardList className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <p className="font-display font-bold text-base text-[#111318]">
            لا توجد طلبات في هذا التصنيف
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => {
            const isTerminal =
              !isAdmin &&
              (order.status === 'completed' || order.status === 'cancelled');
            const customerWa = buildGeneralWhatsappUrl(
              order.customerPhone,
              `مرحباً ${order.customerName}، بخصوص طلبك من متجر ${storeName || 'قطع غيار السيارات'}.`
            );
            const deliveredWaUrl = buildDeliveredWhatsappUrl({
              customerPhone: order.customerPhone,
              customerName: order.customerName,
              orderId: order.id,
              items: order.items,
              totalAmount: order.totalAmount,
              currency,
              storeName,
            });
            const isBusy = busyId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-extrabold text-base text-[#111318]">
                        {order.customerName}
                      </h3>
                      <span className="text-xs font-mono text-neutral-400">
                        {order.id}
                      </span>
                      {order.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          مُرحّل للمبيعات
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {formatDateTime(order.createdAt)} · {order.paymentMethod}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Quick Action: Delivered + WhatsApp */}
                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <a
                        href={deliveredWaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          if (order.status !== 'delivered') {
                            void handleStatusChange(order, 'delivered');
                          }
                        }}
                        className="h-9 px-3 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>تم التوصيل (واتساب للزبون)</span>
                      </a>
                    )}

                    {/* Quick Action: Complete & Add to Sales */}
                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleStatusChange(order, 'completed')}
                        className="h-9 px-3 rounded-lg bg-[#11141A] hover:bg-black disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isBusy ? 'جاري الحفظ...' : 'مكتمل + إضافة للمبيعات'}</span>
                      </button>
                    )}

                    <select
                      aria-label="تغيير حالة الطلب"
                      disabled={isBusy || isTerminal}
                      value={order.status}
                      onChange={(e) =>
                        void handleStatusChange(order, e.target.value as OrderStatus)
                      }
                      className={`h-9 px-3 rounded-lg border text-xs font-bold focus:outline-none cursor-pointer ${getStatusClass(
                        order.status
                      )}`}
                    >
                      {STATUS_ORDER.map((st) => (
                        <option key={st} value={st}>
                          {ORDER_STATUS_LABELS[st]}
                        </option>
                      ))}
                    </select>

                    {isAdmin && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleDeleteOrder(order.id)}
                        title="حذف الطلب"
                        className="w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 text-[#C8102E] flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Delivered reminder banner with instant WhatsApp link */}
                {order.status === 'delivered' && (
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-indigo-900">
                    <span>
                      حالة الطلب: <strong>تم التوصيل</strong>. يمكنك إرسال رسالة تأكيد التوصيل للزبون على واتساب، ثم الضغط على{' '}
                      <strong>مكتمل + إضافة للمبيعات</strong> لتسجيله في حساب المبيعات.
                    </span>
                    <a
                      href={deliveredWaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-3 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-bold inline-flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>إرسال رسالة تم التوصيل</span>
                    </a>
                  </div>
                )}

                {/* Items */}
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm py-1.5 px-3 rounded-xl bg-neutral-50"
                    >
                      <div>
                        <span className="font-bold text-[#111318]">
                          {item.productName}
                        </span>{' '}
                        <span className="text-xs text-neutral-500">
                          ({item.carMake} {item.carModel}) × {item.quantity}
                        </span>
                      </div>
                      <span className="font-num font-bold text-[#111318] tabular-nums">
                        {formatPrice(item.subtotal, currency)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Contact & Total */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs sm:text-sm">
                  <div className="space-y-1 text-neutral-600">
                    <div className="flex items-center gap-3 flex-wrap">
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="inline-flex items-center gap-1 font-bold text-[#111318] hover:text-[#C8102E]"
                        dir="ltr"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{order.customerPhone}</span>
                      </a>
                      <a
                        href={customerWa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-[#16A34A] hover:underline"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>واتساب الزبون</span>
                      </a>
                    </div>
                    <p className="inline-flex items-center gap-1 text-neutral-600">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{order.customerAddress}</span>
                    </p>
                    {order.notes && (
                      <p className="text-xs text-neutral-500">
                        ملاحظة: {order.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-xs text-neutral-500 block">
                      المبلغ المطلوب عند الاستلام
                    </span>
                    <span className="font-num font-extrabold text-lg text-[#C8102E] tabular-nums">
                      {formatPrice(order.totalAmount, currency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
