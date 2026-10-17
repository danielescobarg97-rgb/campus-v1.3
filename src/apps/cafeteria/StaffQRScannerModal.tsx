import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { markOrderDeliveredByScan, getStoredOrders } from '../../services/store';
import { Order } from '../../types';
import { playReadyChime } from '../../utils/audio';
import {
  X,
  QrCode,
  Camera,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  DollarSign,
  User,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOrderDelivered?: (order: Order) => void;
}

export const StaffQRScannerModal: React.FC<Props> = ({ isOpen, onClose, onOrderDelivered }) => {
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastDeliveredOrder, setLastDeliveredOrder] = useState<Order | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-camera-stream-container';

  // Load orders that are ready for delivery for quick testing
  useEffect(() => {
    if (isOpen) {
      const orders = getStoredOrders();
      const pending = orders.filter((o) => ['listo', 'preparando', 'recibido'].includes(o.status));
      setReadyOrders(pending);
    }
  }, [isOpen, lastDeliveredOrder]);

  // Handle scanned string
  const handleScanSuccess = async (decodedText: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const result = await markOrderDeliveredByScan(decodedText);
      if (result.success && result.order) {
        playReadyChime();
        setLastDeliveredOrder(result.order);
        setStatusMessage(result.message);
        onOrderDelivered?.(result.order);
        setManualCode('');
      } else {
        setStatusMessage(result.message);
      }
    } catch (err) {
      console.error('Scan processing error:', err);
      setStatusMessage('Error al procesar el código QR.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Start html5-qrcode camera stream
  const startCamera = async () => {
    setCameraError(null);
    setScanning(true);

    try {
      const html5Qr = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5Qr;

      await html5Qr.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // parse frame failure, normal while searching for QR
        }
      );
    } catch (err) {
      console.warn('Camera error or permission denied:', err);
      setCameraError(
        'No se pudo acceder a la cámara (puede estar restringida en el navegador o iframe). Puedes usar el lector manual o los botones de acceso rápido.'
      );
      setScanning(false);
    }
  };

  // Stop camera stream
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.debug('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setLastDeliveredOrder(null);
      setStatusMessage(null);
      setManualCode('');
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScanSuccess(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-stone-900 border border-stone-800 text-stone-100 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">Escáner de Entrega de Pedidos</h3>
              <p className="text-xs text-stone-400">Escanea el QR del estudiante o ingresa el código</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Delivered Confirmation Alert */}
          {lastDeliveredOrder && (
            <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500 text-emerald-100 shadow-lg animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-lg text-emerald-300">
                        {lastDeliveredOrder.pickupCode}
                      </span>
                      <span className="text-[10px] uppercase font-black bg-emerald-500 text-stone-950 px-2 py-0.5 rounded-full">
                        ¡Entregado & Cobrado!
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white mt-0.5">
                      Estudiante: {lastDeliveredOrder.studentName} ({lastDeliveredOrder.studentId})
                    </p>
                    <p className="text-xs text-emerald-300/90 font-mono mt-0.5">
                      Total cobrado en caja: <strong>${lastDeliveredOrder.totalPrice.toLocaleString('es-CO')}</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setLastDeliveredOrder(null)}
                  className="text-stone-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Feedback message if not found or already delivered */}
          {statusMessage && !lastDeliveredOrder && (
            <div className="p-3 bg-amber-950/60 border border-amber-600/70 rounded-xl flex items-center gap-2 text-xs text-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Camera Section */}
          <div className="bg-stone-950 rounded-2xl p-4 border border-stone-800 text-center">
            <div
              id={scannerContainerId}
              className={`w-full max-w-[280px] h-[220px] mx-auto rounded-xl overflow-hidden bg-black flex items-center justify-center border border-stone-800 ${
                !scanning ? 'hidden' : 'block'
              }`}
            />

            {!scanning ? (
              <div className="py-6 flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-stone-800 text-amber-400 flex items-center justify-center mb-3">
                  <Camera className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-sm text-stone-200">Escanear con Cámara en Vivo</h4>
                <p className="text-xs text-stone-400 max-w-xs mt-1 mb-4">
                  Apunta la cámara al teléfono del estudiante para registrar la entrega al instante.
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Activar Cámara</span>
                </button>
              </div>
            ) : (
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Detener Cámara
                </button>
              </div>
            )}

            {cameraError && (
              <p className="text-[11px] text-amber-300 mt-2 px-2 leading-relaxed">
                {cameraError}
              </p>
            )}
          </div>

          {/* Manual Input (Works with handheld USB barcode scanners or keyboard) */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="font-bold text-xs text-stone-300 block">
              Ingreso Rápido por Código de Entrega o Pistola Barcode
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ej: #C-101 o C-101..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim() || isProcessing}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs shadow-sm transition disabled:opacity-40 cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </form>

          {/* Quick Click Simulation for testing in preview */}
          {readyOrders.length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] font-bold text-stone-400 block mb-2">
                O haz clic para simular entrega de pedidos pendientes:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {readyOrders.slice(0, 4).map((ord) => (
                  <button
                    key={ord.id}
                    type="button"
                    onClick={() => handleScanSuccess(ord.pickupCode)}
                    className="p-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/60 text-left transition flex items-center justify-between cursor-pointer group"
                  >
                    <div>
                      <span className="font-mono font-bold text-xs text-amber-400 block">
                        {ord.pickupCode}
                      </span>
                      <span className="text-[11px] text-stone-300 font-medium line-clamp-1">
                        {ord.studentName}
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">
                        ${ord.totalPrice.toLocaleString('es-CO')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform">
                      <span>Entregar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition cursor-pointer"
          >
            Cerrar Escáner
          </button>
        </div>
      </div>
    </div>
  );
};
