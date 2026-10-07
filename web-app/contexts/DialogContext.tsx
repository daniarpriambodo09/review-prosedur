'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  ArrowRight,
} from 'lucide-react';

export type DialogType = 'success' | 'info' | 'warning' | 'danger';

export interface DialogOptions {
  title?: string;
  message: string;
  type?: DialogType;
  okText?: string;
  confirmText?: string;
  cancelText?: string;
  isConfirm?: boolean;
}

export interface DialogContextType {
  showAlert: (options: DialogOptions | string, title?: string) => Promise<void>;
  showConfirm: (options: DialogOptions | string, title?: string) => Promise<boolean>;
  showSuccess: (message: string, title?: string) => Promise<void>;
  showError: (message: string, title?: string) => Promise<void>;
  showWarning: (message: string, title?: string) => Promise<void>;
  showInfo: (message: string, title?: string) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

interface ActiveDialogState extends DialogOptions {
  isOpen: boolean;
  resolve?: (value: any) => void;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<ActiveDialogState>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  const dialogRef = useRef<ActiveDialogState>(dialog);
  dialogRef.current = dialog;

  const handleClose = useCallback((result: boolean) => {
    if (dialogRef.current.resolve) {
      dialogRef.current.resolve(result);
    }
    setDialog(prev => ({ ...prev, isOpen: false, resolve: undefined }));
  }, []);

  const showAlert = useCallback(
    (options: DialogOptions | string, defaultTitle?: string): Promise<void> => {
      return new Promise<void>(resolve => {
        let opt: DialogOptions;
        if (typeof options === 'string') {
          const lower = options.toLowerCase();
          let guessedType: DialogType = 'info';
          let title = defaultTitle || 'Pemberitahuan';

          if (lower.includes('berhasil') || lower.includes('sukses')) {
            guessedType = 'success';
            title = defaultTitle || 'Berhasil';
          } else if (
            lower.includes('gagal') ||
            lower.includes('error') ||
            lower.includes('salah')
          ) {
            guessedType = 'danger';
            title = defaultTitle || 'Terjadi Kesalahan';
          } else if (
            lower.includes('wajib') ||
            lower.includes('mohon') ||
            lower.includes('peringatan') ||
            lower.includes('perhatian')
          ) {
            guessedType = 'warning';
            title = defaultTitle || 'Perhatian';
          }

          opt = {
            message: options,
            title,
            type: guessedType,
            okText: 'OK',
            isConfirm: false,
          };
        } else {
          opt = {
            ...options,
            title: options.title || defaultTitle || 'Pemberitahuan',
            type: options.type || 'info',
            okText: options.okText || 'OK',
            isConfirm: false,
          };
        }

        setDialog({
          ...opt,
          isOpen: true,
          resolve: () => resolve(),
        });
      });
    },
    []
  );

  const showConfirm = useCallback(
    (options: DialogOptions | string, defaultTitle?: string): Promise<boolean> => {
      return new Promise<boolean>(resolve => {
        let opt: DialogOptions;
        if (typeof options === 'string') {
          const lower = options.toLowerCase();
          let guessedType: DialogType = 'warning';
          let title = defaultTitle || 'Konfirmasi Tindakan';

          if (
            lower.includes('hapus') ||
            lower.includes('permanen') ||
            lower.includes('logout')
          ) {
            guessedType = 'danger';
            title = defaultTitle || 'Konfirmasi Penghapusan';
          }

          opt = {
            message: options,
            title,
            type: guessedType,
            confirmText: 'Ya, Lanjutkan',
            cancelText: 'Batal',
            isConfirm: true,
          };
        } else {
          opt = {
            ...options,
            title: options.title || defaultTitle || 'Konfirmasi Tindakan',
            type: options.type || 'warning',
            confirmText: options.confirmText || 'Ya, Lanjutkan',
            cancelText: options.cancelText || 'Batal',
            isConfirm: true,
          };
        }

        setDialog({
          ...opt,
          isOpen: true,
          resolve: (val: boolean) => resolve(Boolean(val)),
        });
      });
    },
    []
  );

  const showSuccess = useCallback(
    (message: string, title: string = 'Berhasil') => {
      return showAlert({ message, title, type: 'success', okText: 'OK' });
    },
    [showAlert]
  );

  const showError = useCallback(
    (message: string, title: string = 'Terjadi Kesalahan') => {
      return showAlert({ message, title, type: 'danger', okText: 'Tutup' });
    },
    [showAlert]
  );

  const showWarning = useCallback(
    (message: string, title: string = 'Perhatian') => {
      return showAlert({ message, title, type: 'warning', okText: 'Mengerti' });
    },
    [showAlert]
  );

  const showInfo = useCallback(
    (message: string, title: string = 'Informasi') => {
      return showAlert({ message, title, type: 'info', okText: 'OK' });
    },
    [showAlert]
  );

  // Global override for window.alert to automatically use custom card popup modal
  useEffect(() => {
    if (typeof window === 'undefined') return;

    (window as any).showAlert = showAlert;
    (window as any).showConfirm = showConfirm;

    const originalAlert = window.alert;
    window.alert = (message?: any) => {
      showAlert(String(message ?? ''));
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [showAlert, showConfirm]);

  // Color scheme & icons config
  const getTheme = () => {
    switch (dialog.type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-7 h-7 text-emerald-600" />,
          iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-600',
          badgeBg: 'bg-emerald-100/80 text-emerald-800 border-emerald-200',
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20',
          ring: 'ring-emerald-500/20',
          defaultTitle: 'Berhasil',
        };
      case 'danger':
        return {
          icon: <AlertCircle className="w-7 h-7 text-rose-600" />,
          iconBg: 'bg-rose-50 border-rose-200 text-rose-600',
          badgeBg: 'bg-rose-100/80 text-rose-800 border-rose-200',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20',
          ring: 'ring-rose-500/20',
          defaultTitle: 'Terjadi Kesalahan',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-7 h-7 text-amber-600" />,
          iconBg: 'bg-amber-50 border-amber-200 text-amber-600',
          badgeBg: 'bg-amber-100/80 text-amber-800 border-amber-200',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20',
          ring: 'ring-amber-500/20',
          defaultTitle: 'Perhatian',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-7 h-7 text-blue-600" />,
          iconBg: 'bg-blue-50 border-blue-200 text-blue-600',
          badgeBg: 'bg-blue-100/80 text-blue-800 border-blue-200',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20',
          ring: 'ring-blue-500/20',
          defaultTitle: 'Informasi',
        };
    }
  };

  const theme = getTheme();

  return (
    <DialogContext.Provider
      value={{
        showAlert,
        showConfirm,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}
    >
      {children}

      {/* ── Modal Pop-up Card Konfirmasi / Alert ── */}
      {dialog.isOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 transition-all duration-200"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(5px)' }}
          onClick={e => {
            if (e.target === e.currentTarget && !dialog.isConfirm) {
              handleClose(true);
            }
          }}
        >
          <div
            className={`bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden transform transition-all duration-200 scale-100 animate-in fade-in zoom-in-95 ring-4 ${theme.ring}`}
            role="dialog"
            aria-modal="true"
          >
            {/* Header Card */}
            <div className="pt-6 px-6 pb-2 flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-xs ${theme.iconBg}`}
              >
                {theme.icon}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <span
                  className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border mb-1.5 ${theme.badgeBg}`}
                >
                  {dialog.isConfirm ? 'Konfirmasi Tindakan' : dialog.type?.toUpperCase() || 'NOTIFIKASI'}
                </span>
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {dialog.title || theme.defaultTitle}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => handleClose(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 transition-colors"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Isi Pesan (Support Multi-line) */}
            <div className="px-6 py-3.5">
              <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line max-h-[60vh] overflow-y-auto pr-1">
                {dialog.message}
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-3">
              {dialog.isConfirm ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 shadow-2xs transition-colors"
                  >
                    {dialog.cancelText || 'Batal'}
                  </button>
                  <button
                    type="button"
                    autoFocus
                    onClick={() => handleClose(true)}
                    className={`px-5 py-2.5 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 ${theme.confirmBtn}`}
                  >
                    <span>{dialog.confirmText || 'Ya, Lanjutkan'}</span>
                    <ArrowRight size={13} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  autoFocus
                  onClick={() => handleClose(true)}
                  className={`w-full sm:w-auto px-6 py-2.5 text-xs font-bold rounded-xl shadow-sm transition-all text-center ${theme.confirmBtn}`}
                >
                  {dialog.okText || 'OK, Mengerti'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextType {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
