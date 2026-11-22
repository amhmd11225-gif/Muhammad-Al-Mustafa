import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'حدث خطأ غير متوقع في التطبيق.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Application ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let friendlyText = 'حدث خطأ أثناء تحميل البيانات. يرجى تحديث الصفحة والمحاولة مجدداً.';
      if (this.state.errorMessage.includes('Missing or insufficient permissions')) {
        friendlyText = 'ليس لديك صلاحية للوصول إلى هذه البيانات. تأكد من تسجيل الدخول بالحساب المخول.';
      }
      return (
        <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center p-6" dir="rtl">
          <div className="max-w-md w-full bg-white border border-neutral-200 rounded-2xl p-6 text-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-[#C8102E] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="font-display font-bold text-lg text-[#111318] mb-2">
              تعذر إتمام العملية
            </h2>
            <p className="text-sm text-neutral-600 mb-5 leading-relaxed">{friendlyText}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#C8102E] text-white text-sm font-bold hover:bg-[#A60D26] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة تحميل الصفحة</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
