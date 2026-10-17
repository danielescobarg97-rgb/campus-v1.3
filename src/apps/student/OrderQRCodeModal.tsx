import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Order } from '../../types';
import { X, QrCode, Sparkles, CheckCircle2, Store, SunMedium } from 'lucide-react';

interface Props {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderQRCodeModal: React.FC<Props> = ({ order, isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !order || !canvasRef.current) return;

    // Structured payload for fast barcode/QR scanning
    const payload = JSON.stringify({
      app: 'campusbite',
      orderId: order.id,
      pickupCode: order.pickupCode,
      studentName: order.studentName,
      totalPrice: order.totalPrice,
    });

    QRCode.toCanvas(canvasRef.current, payload, {
      width: 260,
      margin: 2,
      color: {
        dark: '#1c1917',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    }).catch((err) => {
      console.error('Error rendering QR code:', err);
    });
  }, [isOpen, order]);

  if (!isOpen) return null;

  const isDelivered = order.status === 'entregado';
  const isReady = order.status === 'listo';

  const copyCode = () => {
    navigator.clipboard?.writeText(order.pickupCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-slide-up flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-stone-900 leading-tight">
                Pase de Entrega Rápida
              </h3>
              <p className="text-[10px] text-stone-500 font-medium">Click & Collect CampusBite</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:text-stone-800 flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 text-center space-y-4">
          {/* Status banner */}
          {isReady ? (
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>¡Tu pedido ya está listo en ventanilla!</span>
            </div>
          ) : isDelivered ? (
            <div className="p-2.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
              <span>Pedido ya entregado y cobrado</span>
            </div>
          ) : (
            <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
              Presenta este código en ventanilla al retirar tu comida.
            </div>
          )}

          {/* QR Container with white high-contrast background */}
          <div className="bg-white p-4 rounded-3xl border-2 border-stone-800 shadow-md inline-block mx-auto relative group">
            <canvas ref={canvasRef} className="rounded-xl mx-auto block max-w-full" />
            <div className="absolute inset-x-0 bottom-2 text-[10px] font-mono font-black text-stone-400 uppercase tracking-widest pointer-events-none">
              CAMPUSBITE PASS
            </div>
          </div>

          {/* Pickup Code Details */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              Código de Entrega
            </span>
            <div className="flex items-center justify-center gap-2 mt-0.5">
              <span className="text-3xl font-black font-mono text-stone-900 tracking-tight">
                {order.pickupCode}
              </span>
              <button
                onClick={copyCode}
                className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-md transition cursor-pointer"
              >
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
            <p className="text-xs text-stone-600 font-medium mt-1">
              Estudiante: <strong className="text-stone-900">{order.studentName}</strong>
            </p>
          </div>

          {/* In-Person Payment Reminder */}
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-700 flex items-center justify-between">
            <div className="flex items-center gap-2 text-left">
              <Store className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-stone-400 block uppercase">Pagar en caja</span>
                <span className="text-xs text-stone-600">Efectivo o tarjeta</span>
              </div>
            </div>
            <span className="font-mono font-black text-sm text-stone-900">
              ${order.totalPrice.toLocaleString('es-CO')}
            </span>
          </div>

          {/* Screen brightness hint */}
          <p className="text-[11px] text-stone-400 flex items-center justify-center gap-1.5 pt-1">
            <SunMedium className="w-3.5 h-3.5 text-amber-500" />
            <span>Sube el brillo de tu pantalla para facilitar el escaneo.</span>
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition cursor-pointer"
          >
            Cerrar Pase QR
          </button>
        </div>
      </div>
    </div>
  );
};
