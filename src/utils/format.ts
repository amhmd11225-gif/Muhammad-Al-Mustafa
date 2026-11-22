import type { Timestamp } from 'firebase/firestore';
import type { OrderItem } from '../types';

export function formatPrice(amount: number, currency = 'د.ع'): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${safe.toLocaleString('en-US')} ${currency}`;
}

export function formatDateTime(ts: Timestamp | null | undefined): string {
  if (!ts) return 'الآن';
  const date = ts.toDate();
  return new Intl.DateTimeFormat('ar-IQ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('ar-IQ', {
    weekday: 'short',
  }).format(date);
}

export function isSameDay(ts: Timestamp | null | undefined, target: Date): boolean {
  if (!ts) return false;
  const d = ts.toDate();
  return (
    d.getFullYear() === target.getFullYear() &&
    d.getMonth() === target.getMonth() &&
    d.getDate() === target.getDate()
  );
}

export function safeEmailKey(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

export function generateDocId(prefix = 'id'): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${random}`;
}

export function cleanWhatsappNumber(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('96407') && digits.length === 14) {
    return `964${digits.slice(4)}`;
  }
  if (digits.startsWith('07') && digits.length === 11) {
    return `964${digits.slice(1)}`;
  }
  if (digits.startsWith('7') && digits.length === 10) {
    return `964${digits}`;
  }
  return digits || '9647700000000';
}

export function buildOrderWhatsappUrl(params: {
  whatsappNumber: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes?: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
}): string {
  const targetPhone = cleanWhatsappNumber(params.whatsappNumber);
  const itemsLines = params.items
    .map(
      (item, index) =>
        `${index + 1}. *${item.productName}* (${item.carMake} ${item.carModel})\n   الكمية: ${item.quantity} × ${formatPrice(item.price, params.currency)} = ${formatPrice(item.subtotal, params.currency)}`
    )
    .join('\n');

  const lines = [
    `*طلب جديد من متجر قطع غيار السيارات*`,
    `رقم الطلب: ${params.orderId}`,
    `------------------------`,
    `*القطع المطلوبة:*`,
    itemsLines,
    `------------------------`,
    `*الإجمالي:* ${formatPrice(params.totalAmount, params.currency)}`,
    `*طريقة الدفع:* الدفع عند الاستلام`,
    `------------------------`,
    `*معلومات الزبون:*`,
    `الاسم: ${params.customerName}`,
    `الهاتف: ${params.customerPhone}`,
    `العنوان: ${params.customerAddress}`,
    params.notes ? `ملاحظات: ${params.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(lines)}`;
}

export function buildDeliveredWhatsappUrl(params: {
  customerPhone: string;
  customerName: string;
  orderId: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  storeName?: string;
}): string {
  const targetPhone = cleanWhatsappNumber(params.customerPhone);
  const itemsText = params.items
    .map((item) => `• ${item.productName} (${item.carMake} ${item.carModel}) × ${item.quantity}`)
    .join('\n');

  const lines = [
    `مرحباً ${params.customerName}،`,
    `تم التوصيل بنجاح لطلبك رقم (${params.orderId}) من *${params.storeName || 'متجر قطع غيار السيارات'}* ✅`,
    `------------------------`,
    itemsText,
    `*المبلغ الكلي:* ${formatPrice(params.totalAmount, params.currency)}`,
    `------------------------`,
    `شكراً لتسوقك معنا ويسعدنا خدمتك في أي وقت.`,
  ].join('\n');

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(lines)}`;
}

export function buildGeneralWhatsappUrl(whatsappNumber: string, text?: string): string {
  const targetPhone = cleanWhatsappNumber(whatsappNumber);
  const defaultMsg =
    text || 'مرحباً، أرغب بالاستفسار عن توفر قطعة غيار سيارة لديكم.';
  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(defaultMsg)}`;
}

/**
 * Compresses an uploaded or captured image file on the client via HTML5 Canvas
 * so it stays sharp (<= 720px) and lightweight (< 180KB) for permanent Firestore storage.
 */
export async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ملف الصورة غير صالح.'));
      img.onload = () => {
        const MAX_DIM = 720;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height >= width && height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('تعذر معالجة الصورة في المتصفح.'));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.78;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 220000 && quality > 0.4) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        if (dataUrl.length > 250000) {
          reject(new Error('حجم الصورة كبير جداً حتى بعد الضغط، يرجى اختيار صورة أصغر.'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export async function compressDataUrl(rawDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('الصورة الملتقطة غير صالحة.'));
    img.onload = () => {
      const MAX_DIM = 720;
      let width = img.width;
      let height = img.height;
      if (width > height && width > MAX_DIM) {
        height = Math.round((height * MAX_DIM) / width);
        width = MAX_DIM;
      } else if (height >= width && height > MAX_DIM) {
        width = Math.round((width * MAX_DIM) / height);
        height = MAX_DIM;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('تعذر معالجة الصورة.'));
        return;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.78;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > 220000 && quality > 0.4) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(dataUrl);
    };
    img.src = rawDataUrl;
  });
}
