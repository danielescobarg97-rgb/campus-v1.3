import React, { useEffect, useState } from 'react';
import { subscribeOrder, subscribeOrders, subscribeProducts, calculateEstimatedTime } from '../../services/store';
import { Order, OrderStatus, Product } from '../../types';
import { playReadyChime } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { OrderQRCodeModal } from './OrderQRCodeModal';
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Bell,
  ArrowLeft,
  AlertCircle,
  ShoppingBag,
  Sparkles,
  Store,
  QrCode,
  Hourglass,
} from 'lucide-react';

interface Props {
  orderId: string;
  onBackToMenu: () => void;
}

const STATUS_STEPS: {
  status: OrderStatus;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    status: 'recibido',
    label: 'Recibido',
    desc: 'Pedido registrado en la cafetería. En cola de preparación.',
    icon: Clock,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    status: 'preparando',
    label: 'Preparando',
    desc: 'El equipo de cocina o barista está elaborando tu pedido.',
    icon: ChefHat,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    status: 'listo',
    label: 'Listo para recoger',
    desc: '¡Tu bandeja está lista en ventanilla! Acércate a caja para pagar y retirar.',
    icon: Bell,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-300',
  },
  {
    status: 'entregado',
    label: 'Entregado',
    desc: 'Pedido entregado y pagado en caja. ¡Buen provecho!',
    icon: CheckCircle2,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
  },
];

export const LiveOrderTracker: React.FC<Props> = ({ orderId, onBackToMenu }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);

    const unsubOrder = subscribeOrder(orderId, (data) => {
      setOrder((prev) => {
        if (prev && prev.status !== 'listo' && data?.status === 'listo') {
          playReadyChime();
          try {
            confetti({
              particleCount: 85,
              spread: 70,
              origin: { y: 0.6 },
            });
          } catch (e) {
            console.debug('Confetti error', e);
          }
        }
        return data;
      });
      setLoading(false);
    });

    const unsubOrders = subscribeOrders((ords) => {
      setAllOrders(ords);
    });

    const unsubProducts = subscribeProducts((prods) => {
      setProducts(prods);
    });

    return () => {
      unsubOrder();
      unsubOrders();
      unsubProducts();
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-[420px] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-stone-600 font-medium text-sm">Conectando con el estado en vivo de tu pedido...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-stone-900 mb-2">No pudimos cargar el pedido</h3>
        <p className="text-stone-600 text-sm mb-6">El pedido no existe o ha sido archivado.</p>
        <button
          onClick={onBackToMenu}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl font-medium shadow-sm hover:bg-amber-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Menú
        </button>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.status === order.status);
  const isCancelled = order.status === 'cancelado';
  const isReady = order.status === 'listo';
  const isDelivered = order.status === 'entregado';

  // Calculate dynamic ETA
  const etaInfo = calculateEstimatedTime(order, allOrders, products);

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-20">
      {/* Top Bar back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToMenu}
          className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 text-sm font-semibold transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Menú
        </button>
        <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          En Vivo (Sincronizado)
        </span>
      </div>

      {/* Main Ticket Card */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-100/70 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/70 px-2.5 py-1 rounded-md border border-amber-200">
              Turno de Entrega
            </span>
            <h2 className="text-3xl font-extrabold text-stone-900 mt-2 font-mono tracking-tight">
              {order.pickupCode}
            </h2>
            <p className="text-stone-500 text-xs mt-1">
              Estudiante: <strong className="text-stone-800">{order.studentName}</strong>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-stone-400 block font-semibold uppercase">Total en caja</span>
            <span className="text-xl font-bold font-mono text-amber-900">
              ${order.totalPrice.toLocaleString('es-CO')}
            </span>
          </div>
        </div>

        {/* Dynamic Estimated Time of Delivery (ETA Banner) */}
        {!isCancelled && !isDelivered && (
          <div
            className={`mb-4 p-3.5 rounded-2xl border flex items-center justify-between ${
              isReady
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-amber-50/80 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isReady ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'
                }`}
              >
                {isReady ? <Sparkles className="w-5 h-5" /> : <Hourglass className="w-5 h-5 animate-spin-slow" />}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                  Tiempo Estimado de Entrega
                </span>
                <span className="text-sm font-extrabold tracking-tight">
                  {etaInfo.statusLabel}
                </span>
              </div>
            </div>

            {/* Quick QR Trigger Button */}
            <button
              onClick={() => setIsQRModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver QR</span>
            </button>
          </div>
        )}

        {/* Ready Banner */}
        {isReady && (
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md animate-pulse-subtle">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl shrink-0">
                <Sparkles className="w-6 h-6 text-yellow-200" />
              </div>
              <div className="flex-1">
                <h4 className="font-extrabold text-sm uppercase tracking-wide">¡TU PEDIDO YA ESTÁ LISTO!</h4>
                <p className="text-xs text-emerald-50 mt-0.5 leading-relaxed">
                  Pasa a la ventanilla, muestra tu código <strong className="underline">{order.pickupCode}</strong> o tu <strong>QR</strong> y retira.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* QR Code Presentation Box directly on ticket */}
        <div className="mb-5 p-4 rounded-2xl bg-stone-50 border border-stone-200 text-center flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded">
              Pase de Retiro Rápido
            </span>
            <h4 className="text-sm font-extrabold text-stone-900 mt-1">Código QR para Ventanilla</h4>
            <p className="text-xs text-stone-500">
              El personal de cafetería lo escanea para marcar la entrega al instante.
            </p>
          </div>
          <button
            onClick={() => setIsQRModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-sm transition active:scale-95 cursor-pointer shrink-0"
          >
            <QrCode className="w-4 h-4" />
            <span>Mostrar QR de Entrega</span>
          </button>
        </div>

        {/* In-Person Payment Reminder notice */}
        <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start gap-3 mb-6">
          <Store className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-950 font-medium leading-relaxed">
            <strong>Modalidad Click & Collect:</strong> El pago se realiza físicamente en caja al retirar tu bandeja (efectivo, tarjeta o carnet universitario).
          </p>
        </div>

        {/* Live Stepper */}
        {!isCancelled ? (
          <div className="space-y-6 my-6 relative">
            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-stone-200" />

            {STATUS_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isPassed = currentStepIndex > idx;
              const isCurrent = currentStepIndex === idx;

              return (
                <div key={step.status} className="flex items-start gap-4 relative z-10">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                      isCurrent
                        ? `${step.color} shadow-md ring-4 ring-amber-100 scale-110`
                        : isPassed
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-stone-100 text-stone-400 border border-stone-200'
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-sm font-bold ${
                          isCurrent
                            ? 'text-stone-900'
                            : isPassed
                            ? 'text-emerald-700'
                            : 'text-stone-400'
                        }`}
                      >
                        {step.label}
                      </h4>
                      {isCurrent && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
                          En progreso
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs mt-0.5 leading-relaxed ${
                        isCurrent ? 'text-stone-600 font-medium' : isPassed ? 'text-stone-500' : 'text-stone-400'
                      }`}
                    >
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-center">
            <h4 className="font-bold text-red-700 text-sm">Pedido Cancelado</h4>
            <p className="text-xs text-red-600 mt-1">
              Este pedido fue cancelado por el personal de cafetería o por el estudiante.
            </p>
          </div>
        )}

        {/* Order Details Accordion / List */}
        <div className="border-t border-stone-100 pt-4 mt-6">
          <h5 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" />
            Ítems del pedido ({order.items.reduce((acc, i) => acc + i.quantity, 0)})
          </h5>
          <div className="divide-y divide-stone-100 space-y-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between pt-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-stone-100 text-stone-800 font-bold flex items-center justify-center text-[11px]">
                    {item.quantity}x
                  </span>
                  <span className="font-semibold text-stone-800 line-clamp-1">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-stone-700">
                  ${(item.price * item.quantity).toLocaleString('es-CO')}
                </span>
              </div>
            ))}
          </div>
          {order.notes && (
            <div className="mt-3 p-2.5 bg-stone-50 rounded-xl text-xs text-stone-600 border border-stone-200/80">
              <strong className="text-stone-800">Nota especial:</strong> {order.notes}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBackToMenu}
          className="w-full py-3 px-4 rounded-2xl bg-stone-900 text-white font-bold text-sm hover:bg-stone-800 transition text-center shadow-md active:scale-98 cursor-pointer"
        >
          Pedir algo más en el Menú
        </button>
      </div>

      {/* QR Code Presentation Modal */}
      {isQRModalOpen && (
        <OrderQRCodeModal
          order={order}
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
        />
      )}
    </div>
  );
};
