import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import {
  Camera,
  CheckCircle2,
  Loader2,
  Sparkles,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../../firebase';
import {
  PART_CATEGORIES,
  PART_CONDITIONS,
  type PartCondition,
} from '../../types';
import {
  compressDataUrl,
  compressImageFile,
  generateDocId,
} from '../../utils/format';

interface AddProductViewProps {
  initialFile: File | null;
  onClearInitialFile: () => void;
  defaultMinStock: number;
  currency: string;
  onSaved: () => void;
}

export function AddProductView({
  initialFile,
  onClearInitialFile,
  defaultMinStock,
  currency,
  onSaved,
}: AddProductViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [imagePreview, setImagePreview] = useState<string>('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(PART_CATEGORIES[0]);
  const [carMake, setCarMake] = useState('');
  const [carModel, setCarModel] = useState('');
  const [condition, setCondition] = useState<PartCondition>('مستعمل - نظيف');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [minStock, setMinStock] = useState(String(defaultMinStock || 2));
  const [notes, setNotes] = useState('');

  const [identifying, setIdentifying] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const processFile = async (file: File) => {
    setError('');
    setAiMessage('');
    try {
      const compressed = await compressImageFile(file);
      setImagePreview(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل الصورة.');
    }
  };

  useEffect(() => {
    if (initialFile) {
      void processFile(initialFile);
      onClearInitialFile();
    }
  }, [initialFile, onClearInitialFile]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const openLiveCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch {
      setCameraError(
        'تعذر فتح الكاميرا مباشرة من المتصفح، يمكنك استخدام زر "التقاط / رفع صورة" لفتح كاميرا الهاتف.'
      );
    }
  };

  const closeLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  const captureFromVideo = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 540;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const compressed = await compressDataUrl(rawDataUrl);
    setImagePreview(compressed);
    closeLiveCamera();
  };

  const handleIdentifyWithAI = async () => {
    if (!imagePreview) {
      setError('يرجى تصوير القطعة أو رفع صورتها أولاً.');
      return;
    }
    setError('');
    setAiMessage('');
    setIdentifying(true);
    try {
      const res = await fetch('/api/identify-part', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          mimeType: 'image/jpeg',
        }),
      });
      const data = (await res.json()) as {
        result?: {
          name?: string;
          category?: string;
          carMake?: string;
          carModel?: string;
          condition?: string;
          notes?: string;
        };
        error?: string;
      };
      if (!res.ok || !data.result) {
        throw new Error(data.error || 'تعذر التعرف على القطعة.');
      }

      const r = data.result;
      if (r.name) setName(r.name);
      if (r.category && PART_CATEGORIES.includes(r.category as (typeof PART_CATEGORIES)[number])) {
        setCategory(r.category);
      }
      if (r.carMake && r.carMake !== 'غير محدد') setCarMake(r.carMake);
      if (r.carModel && r.carModel !== 'غير محدد') setCarModel(r.carModel);
      if (
        r.condition &&
        PART_CONDITIONS.includes(r.condition as PartCondition)
      ) {
        setCondition(r.condition as PartCondition);
      }
      if (r.notes) setNotes(r.notes);
      setAiMessage('تم التعرف على القطعة واقتراح البيانات! يمكنك تعديل أي حقل قبل الحفظ.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر الاتصال بخدمة الذكاء الاصطناعي.'
      );
    } finally {
      setIdentifying(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!imagePreview) {
      setError('يرجى التقاط أو رفع صورة للقطعة.');
      return;
    }
    if (!auth.currentUser) {
      setError('انتهت جلسة تسجيل الدخول.');
      return;
    }

    const parsedPrice = Number(price);
    const parsedQty = Math.floor(Number(quantity));
    const parsedMinStock = Math.floor(Number(minStock));

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError('يرجى إدخال سعر صحيح.');
      return;
    }
    if (!Number.isInteger(parsedQty) || parsedQty < 0) {
      setError('يرجى إدخال كمية صحيحة.');
      return;
    }

    const productId = generateDocId('part');
    setSaving(true);
    try {
      await setDoc(doc(db, 'products', productId), {
        name: name.trim().slice(0, 140),
        category: category.trim().slice(0, 60),
        carMake: carMake.trim().slice(0, 60),
        carModel: carModel.trim().slice(0, 60),
        condition,
        price: parsedPrice,
        quantity: parsedQty,
        minStock: Number.isInteger(parsedMinStock) && parsedMinStock >= 0 ? parsedMinStock : 2,
        soldCount: 0,
        imageUrl: imagePreview,
        ...(notes.trim() ? { notes: notes.trim().slice(0, 500) } : {}),
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess('تم حفظ القطعة ونشرها مباشرة في المتجر الإلكتروني والمخزون.');
      setImagePreview('');
      setName('');
      setCarMake('');
      setCarModel('');
      setPrice('');
      setQuantity('1');
      setNotes('');
      setAiMessage('');
      onSaved();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `products/${productId}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-7">
        <div className="mb-6">
          <h2 className="font-display font-extrabold text-xl text-[#111318]">
            إضافة قطعة غيار بالتصوير
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            التقط صورة القطعة بكاميرا الهاتف أو ارفعها، واستخدم الذكاء الاصطناعي لاقتراح الاسم والقسم تلقائياً.
          </p>
        </div>

        {/* Live Camera Modal */}
        {cameraOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden">
              <div className="px-4 py-3 bg-[#11141A] text-white flex items-center justify-between">
                <span className="font-display font-bold text-sm">التقاط صورة بالكاميرا</span>
                <button
                  type="button"
                  onClick={closeLiveCamera}
                  className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full aspect-[4/3] object-cover rounded-xl bg-black mb-4"
                />
                <button
                  type="button"
                  onClick={captureFromVideo}
                  className="w-full h-12 rounded-xl bg-[#C8102E] hover:bg-[#A60D26] text-white font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>التقاط الصورة الآن</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Capture Zone */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            <div className="md:col-span-5 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="aspect-[4/3] w-full rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 overflow-hidden flex flex-col items-center justify-center relative">
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="معاينة القطعة"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImagePreview('')}
                      aria-label="إزالة الصورة"
                      className="absolute top-2 left-2 w-8 h-8 rounded-lg bg-black/70 text-white flex items-center justify-center hover:bg-[#C8102E] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="p-6 text-center">
                    <Camera className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
                    <p className="text-xs font-medium text-neutral-600">
                      ستظهر صورة القطعة هنا
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 px-3 rounded-xl bg-[#111318] hover:bg-black text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>كاميرا / رفع صورة</span>
                </button>
                <button
                  type="button"
                  onClick={openLiveCamera}
                  className="h-10 px-3 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-[#111318] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>فتح الكاميرا</span>
                </button>
              </div>

              {cameraError && (
                <p className="text-xs text-[#C8102E]">{cameraError}</p>
              )}

              <button
                type="button"
                onClick={handleIdentifyWithAI}
                disabled={!imagePreview || identifying}
                className="w-full h-11 px-4 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-50 text-white font-display font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {identifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التعرف على القطعة...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>التعرف على القطعة بالذكاء الاصطناعي</span>
                  </>
                )}
              </button>
            </div>

            {/* Form Fields */}
            <div className="md:col-span-7 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-[#C8102E]">
                  {error}
                </div>
              )}

              {aiMessage && (
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs font-medium text-sky-900">
                  {aiMessage}
                </div>
              )}

              {success && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    اسم القطعة *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={140}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: كمبريسر تكييف، دينمو، كشاف أمامي"
                    className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    القسم / النوع *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                  >
                    {PART_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    حالة القطعة *
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as PartCondition)}
                    className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                  >
                    {PART_CONDITIONS.map((cond) => (
                      <option key={cond} value={cond}>
                        {cond}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    نوع السيارة *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={60}
                    value={carMake}
                    onChange={(e) => setCarMake(e.target.value)}
                    placeholder="مثال: تويوتا، هيونداي، كيا"
                    className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    الموديل *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={60}
                    value={carModel}
                    onChange={(e) => setCarModel(e.target.value)}
                    placeholder="مثال: كامري 2013"
                    className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    السعر ({currency}) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="150000"
                    className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      الكمية *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      حد التنبيه
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={minStock}
                      onChange={(e) => setMinStock(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    ملاحظات (اختياري)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="تفاصيل إضافية عن حالة القطعة أو توافقها..."
                    className="w-full p-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full h-12 rounded-xl bg-[#C8102E] hover:bg-[#A60D26] disabled:opacity-60 text-white font-display font-bold text-sm sm:text-base transition-colors cursor-pointer"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ ونشر القطعة في المتجر'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
