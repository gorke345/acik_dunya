import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Beklenmeyen bir hata oluştu.' };
  }

  componentDidCatch(error: Error) {
    console.error('Application ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#0f1820] p-6 text-[#f4ecda]">
          <div className="max-w-md w-full border border-[#d6b166]/40 bg-[#15212b] p-6 shadow-2xl">
            <h1 className="font-display text-xl font-bold text-[#e6be6c] mb-2">
              Bağlantı veya Oyun Hatası
            </h1>
            <p className="text-sm text-[#d6cebc] mb-5 break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 bg-[#c9963b] hover:bg-[#dba74a] text-[#10181f] font-bold text-sm cursor-pointer transition-colors"
            >
              Oyunu Yeniden Başlat
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
