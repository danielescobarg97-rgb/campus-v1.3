import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  subscribeProducts,
  subscribeOrders,
  createOrder,
  calculateEstimatedTime,
} from '../../services/store';
import { Product, OrderItem, Order } from '../../types';
import { LiveOrderTracker } from './LiveOrderTracker';
import { OrderQRCodeModal } from './OrderQRCodeModal';
import { playOrderChime } from '../../utils/audio';
import {
  Coffee,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Search,
  X,
  Clock,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  User,
  History,
  Lock,
  QrCode,
  Hourglass,
} from 'lucide-react';

interface CartItem extends OrderItem {
  maxAvailable?: boolean;
}

export const StudentApp: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [studentOrders, setStudentOrders] = useState<Order[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [quickQRModalOrder, setQuickQRModalOrder] = useState<Order | null>(null);

  // Student Profile details
  const [studentName, setStudentName] = useState(() => {
    return localStorage.getItem('campusbite_student_name') || 'Valentina Torres';
  });
  const [studentId, setStudentId] = useState(() => {
    return localStorage.getItem('campusbite_student_id') || 'EST-2024-491';
  });
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmedNotice, setOrderConfirmedNotice] = useState<string | null>(null);

  // Load products in real-time
  useEffect(() => {
    const unsubscribe = subscribeProducts((prods) => {
      setProducts(prods);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen to all orders in real-time
  useEffect(() => {
    const unsubscribe = subscribeOrders((ords) => {
      setAllOrders(ords);
      const filtered = ords.filter(
        (data) =>
          data.studentName.toLowerCase() === studentName.toLowerCase() ||
          data.studentId === studentId
      );
      setStudentOrders(filtered);
    });
    return () => unsubscribe();
  }, [studentName, studentId]);

  // Persist student profile changes
  const handleSaveProfile = (name: string, id: string) => {
    setStudentName(name);
    setStudentId(id);
    localStorage.setItem('campusbite_student_name', name);
    localStorage.setItem('campusbite_student_id', id);
  };

  // Add to cart
  const addToCart = (product: Product) => {
    if (!product.isAvailable) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          imageUrl: product.imageUrl,
        },
      ];
    });
  };

  // Update item quantity
  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  // Remove item
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Categories list
  const rawCategories = Array.from(new Set(products.map((p) => p.category)));
  const categories = ['Todos', ...rawCategories];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const generatePickupCode = () => {
    const num = Math.floor(100 + Math.random() * 900);
    return `#C-${num}`;
  };

  // Confirm order
  const handleConfirmOrder = async () => {
    if (cart.length === 0) return;
    if (!studentName.trim()) {
      alert('Por favor indica tu nombre para la entrega.');
      return;
    }

    setIsSubmitting(true);
    try {
      const pickupCode = generatePickupCode();
      const newOrder = await createOrder({
        studentName: studentName.trim(),
        studentId: studentId.trim() || 'EST-GEN',
        notes: orderNotes.trim(),
        totalPrice: cartTotal,
        pickupCode,
        status: 'recibido',
        items: cart.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          imageUrl: i.imageUrl,
        })),
      });

      playOrderChime();

      setCart([]);
      setOrderNotes('');
      setIsCartOpen(false);

      setOrderConfirmedNotice(
        'Pedido enviado a la cafetería. El pago se realiza físicamente en caja al recoger.'
      );

      setActiveOrderId(newOrder.id);
    } catch (err) {
      console.error('Error creating order:', err);
      alert('Hubo un error al crear la orden. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If viewing specific active order tracker
  if (activeOrderId) {
    return (
      <div className="bg-stone-50 min-h-screen">
        <header className="bg-white border-b border-stone-200 sticky top-0 z-30 px-4 py-3 shadow-2xs">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                CB
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-stone-900 leading-tight">CampusBite</h1>
                <p className="text-[10px] text-stone-500 font-medium">Click & Collect • Estudiantes</p>
              </div>
            </div>
            <button
              onClick={() => setActiveOrderId(null)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 transition cursor-pointer"
            >
              Ver Menú Completo
            </button>
          </div>
        </header>

        {orderConfirmedNotice && (
          <div className="max-w-md mx-auto p-4">
            <div className="p-4 rounded-2xl bg-amber-500 text-white shadow-md flex items-start gap-3">
              <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-amber-100" />
              <div className="flex-1">
                <h4 className="font-extrabold text-sm">¡Pedido registrado con éxito!</h4>
                <p className="text-xs text-amber-50 mt-0.5 font-medium leading-relaxed">
                  {orderConfirmedNotice}
                </p>
              </div>
              <button
                onClick={() => setOrderConfirmedNotice(null)}
                className="text-amber-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <LiveOrderTracker
          orderId={activeOrderId}
          onBackToMenu={() => {
            setActiveOrderId(null);
            setOrderConfirmedNotice(null);
          }}
        />
      </div>
    );
  }

  // Active ongoing orders for quick top banner
  const inProgressOrder = studentOrders.find((o) =>
    ['recibido', 'preparando', 'listo'].includes(o.status)
  );

  // Calculate ETA for ongoing order
  const inProgressETA = inProgressOrder
    ? calculateEstimatedTime(inProgressOrder, allOrders, products)
    : null;

  return (
    <div className="bg-stone-50 min-h-screen text-stone-800 pb-28">
      {/* Mobile-First Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-700 text-white flex items-center justify-center font-black text-base shadow-sm">
                CB
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-extrabold text-stone-900 tracking-tight">CampusBite</h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider">
                    Estudiantes
                  </span>
                </div>
                <p className="text-xs text-stone-500 font-medium">Cafetería Central Universitaria</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {studentOrders.length > 0 && (
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="relative p-2 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 transition cursor-pointer"
                  title="Historial de mis pedidos"
                >
                  <History className="w-4 h-4" />
                  {inProgressOrder && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                  )}
                </button>
              )}

              {/* Student identity badge */}
              <div className="flex items-center gap-2 pl-2 border-l border-stone-200 text-xs">
                <div className="text-right hidden sm:block">
                  <p className="font-bold text-stone-800 leading-tight">{studentName}</p>
                  <p className="text-[10px] text-stone-500">{studentId}</p>
                </div>
                <button
                  onClick={() => {
                    const newName = prompt('Ingresa tu nombre para los pedidos:', studentName);
                    if (newName) {
                      const newId = prompt('Código universitario (ej: EST-2024-01):', studentId) || studentId;
                      handleSaveProfile(newName, newId);
                    }
                  }}
                  className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center hover:ring-2 hover:ring-amber-500 transition font-bold cursor-pointer"
                  title="Cambiar datos de estudiante"
                >
                  <User className="w-4 h-4" />
                </button>
              </div>

              {/* Staff Portal Link */}
              <button
                onClick={() => navigate('/admin')}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-900 text-white text-[11px] font-bold hover:bg-stone-800 transition cursor-pointer"
                title="Acceder al Panel de Cocina / Personal"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Personal</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Active Order Banner with Estimated Time of Delivery (ETA) & Quick QR */}
        {inProgressOrder && (
          <div className="p-4 rounded-3xl bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 text-white shadow-md border border-amber-600/40 relative overflow-hidden animate-slide-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div
                onClick={() => setActiveOrderId(inProgressOrder.id)}
                className="flex items-start gap-3 cursor-pointer group flex-1"
              >
                <div className="w-11 h-11 rounded-2xl bg-amber-600/90 text-white flex items-center justify-center font-mono font-black text-sm shrink-0 shadow-sm border border-amber-400/30">
                  {inProgressOrder.pickupCode}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {inProgressOrder.status === 'listo'
                        ? '¡LISTO EN VENTANILLA!'
                        : inProgressOrder.status.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      ${inProgressOrder.totalPrice.toLocaleString('es-CO')}
                    </span>
                  </div>

                  {/* Delivery ETA text on main screen */}
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    <Hourglass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-stone-300">
                      Tiempo estimado de entrega:{' '}
                      <strong className="text-white font-bold">
                        {inProgressETA?.statusLabel || '~5-8 min'}
                      </strong>
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-400 mt-0.5 group-hover:text-amber-200 transition">
                    Toca para ver el stepper completo en vivo →
                  </p>
                </div>
              </div>

              {/* Quick Actions: Open QR Button */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => setQuickQRModalOrder(inProgressOrder)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-black shadow-sm transition active:scale-95 cursor-pointer"
                  title="Abrir código QR para mostrar en ventanilla"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Pase QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOrderId(inProgressOrder.id)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hero Banner */}
        <div className="rounded-3xl bg-gradient-to-br from-amber-900 via-stone-900 to-stone-950 text-white p-5 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-700/50 mb-2">
              ⚡ Click & Collect Universitario
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Pide desde tu móvil, evita las filas.
            </h2>
            <p className="text-stone-300 text-xs sm:text-sm mt-1.5 max-w-md leading-relaxed">
              Elige tus favoritos, confirma tu orden y retira en ventanilla escaneando tu código QR.
            </p>
          </div>
          <div className="absolute right-3 -bottom-4 opacity-15 pointer-events-none text-8xl">
            ☕
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar hamburguesas, café, empanadas, postres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Interactive Products Grid */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-stone-500 font-medium">Cargando menú en tiempo real...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-14 text-center bg-white rounded-3xl border border-stone-200 p-6">
            <Coffee className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <h3 className="font-bold text-stone-700 text-sm">No encontramos productos</h3>
            <p className="text-xs text-stone-500 mt-1">
              Prueba con otro término de búsqueda o cambia de categoría.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map((product) => {
              const inCart = cart.find((i) => i.productId === product.id);
              const isAvailable = product.isAvailable;

              return (
                <div
                  key={product.id}
                  className={`group bg-white rounded-3xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                    isAvailable
                      ? 'border-stone-200/90 shadow-2xs hover:shadow-md hover:border-amber-200'
                      : 'border-stone-200 bg-stone-50/70 opacity-80'
                  }`}
                >
                  <div className="relative h-44 w-full overflow-hidden bg-stone-100">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                        !isAvailable ? 'grayscale-[50%] opacity-85' : ''
                      }`}
                      loading="lazy"
                    />
                    <span className="absolute top-3 left-3 bg-stone-900/75 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {product.category}
                    </span>
                    {product.prepTimeMinutes && (
                      <span className="absolute top-3 right-3 bg-white/95 backdrop-blur-md text-stone-800 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                        <Clock className="w-3 h-3 text-amber-600" />
                        {product.prepTimeMinutes} min
                      </span>
                    )}
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-[2px] flex items-center justify-center p-3 text-center">
                        <span className="px-3.5 py-1.5 rounded-full bg-red-600 text-white text-xs font-black tracking-wider uppercase shadow-md">
                          Agotado en Cocina
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-stone-900 text-sm line-clamp-1 leading-snug">
                        {product.name}
                      </h3>
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold block uppercase">
                          Precio
                        </span>
                        <span className="text-base font-extrabold font-mono text-stone-900">
                          ${product.price.toLocaleString('es-CO')}
                        </span>
                      </div>

                      {isAvailable ? (
                        inCart ? (
                          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-xl p-1">
                            <button
                              onClick={() => updateQuantity(product.id, -1)}
                              className="w-7 h-7 rounded-lg bg-white text-stone-800 flex items-center justify-center hover:bg-stone-100 shadow-2xs transition cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-amber-900">
                              {inCart.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(product.id, 1)}
                              className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center hover:bg-amber-700 shadow-2xs transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className="inline-flex items-center gap-1 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition active:scale-95 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Agregar
                          </button>
                        )
                      ) : (
                        <span className="text-xs font-medium text-stone-400 italic">
                          No disponible
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile Staff Portal Shortcut Banner */}
        <div className="pt-6 pb-2 text-center">
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-2 text-xs text-stone-500 hover:text-stone-800 font-medium transition cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-stone-400" />
            <span>¿Eres del personal de cafetería? Acceder con PIN (1234)</span>
          </button>
        </div>
      </main>

      {/* Floating Bottom Cart Bar */}
      {cartItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-stone-900 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between hover:bg-stone-800 active:scale-98 transition group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center font-bold text-sm shadow-xs">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-stone-300">
                  {cartItemCount} {cartItemCount === 1 ? 'producto' : 'productos'} en bandeja
                </p>
                <p className="text-base font-extrabold font-mono text-white">
                  ${cartTotal.toLocaleString('es-CO')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
              Ver Bandeja & Confirmar
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Cart & Checkout Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-stone-900 text-base">Resumen de tu Pedido</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:text-stone-800 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-start gap-3 shadow-xs">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900">
                    Aviso importante de pago
                  </h4>
                  <p className="text-xs text-amber-950 font-bold mt-1 leading-relaxed">
                    Pedido enviado a la cafetería. El pago se realiza físicamente en caja al recoger.
                  </p>
                  <p className="text-[11px] text-amber-800/90 mt-1">
                    Recibirás un código y un Pase QR para retiro inmediato.
                  </p>
                </div>
              </div>

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Datos de entrega
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Nombre del Estudiante *
                    </label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => handleSaveProfile(e.target.value, studentId)}
                      placeholder="Tu nombre completo"
                      className="w-full text-xs font-medium px-3 py-2 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Carnet o Código
                    </label>
                    <input
                      type="text"
                      value={studentId}
                      onChange={(e) => handleSaveProfile(studentName, e.target.value)}
                      placeholder="EST-2024-..."
                      className="w-full text-xs font-medium px-3 py-2 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Indicaciones especiales para la cafetería (opcional)
                  </label>
                  <input
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Ej: salsa aparte, café bien caliente, sin azúcar..."
                    className="w-full text-xs px-3 py-2 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Productos ({cartItemCount})
                </h4>
                <div className="divide-y divide-stone-100">
                  {cart.map((item) => (
                    <div key={item.productId} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-stone-200"
                        />
                        <div>
                          <h5 className="text-xs font-bold text-stone-900 leading-snug">
                            {item.name}
                          </h5>
                          <p className="text-xs font-mono font-semibold text-amber-700 mt-0.5">
                            ${item.price.toLocaleString('es-CO')} c/u
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1">
                          <button
                            onClick={() => updateQuantity(item.productId, -1)}
                            className="w-6 h-6 rounded-lg bg-white text-stone-700 flex items-center justify-center hover:bg-stone-200 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-stone-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, 1)}
                            className="w-6 h-6 rounded-lg bg-stone-900 text-white flex items-center justify-center hover:bg-stone-800 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-stone-400 hover:text-red-500 p-1 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 space-y-1.5">
                <div className="flex justify-between text-xs text-stone-500">
                  <span>Subtotal productos:</span>
                  <span className="font-mono font-medium">${cartTotal.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-500">
                  <span>Tarifa de servicio cafetería:</span>
                  <span className="text-emerald-600 font-semibold">$0 (Gratis)</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-stone-900 pt-2 border-t border-stone-100">
                  <span>Total a pagar en caja:</span>
                  <span className="text-amber-900 font-mono text-lg font-bold">
                    ${cartTotal.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-100">
              <button
                onClick={handleConfirmOrder}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-98 disabled:opacity-50 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando orden a la cafetería...
                  </>
                ) : (
                  <>
                    <span>Confirmar Pedido (Pagar en Caja)</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Order History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-stone-900 text-sm">Mis Pedidos Recientes</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:text-stone-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {studentOrders.length === 0 ? (
                <p className="text-center text-xs text-stone-500 py-8">
                  Aún no tienes pedidos registrados en esta cafetería.
                </p>
              ) : (
                studentOrders.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => {
                      setActiveOrderId(ord.id);
                      setShowHistoryModal(false);
                    }}
                    className="p-3.5 rounded-2xl border border-stone-200/90 hover:border-amber-400 bg-white hover:bg-amber-50/40 transition cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-sm text-stone-900">
                        {ord.pickupCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          ord.status === 'listo'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.status === 'preparando'
                            ? 'bg-blue-100 text-blue-800'
                            : ord.status === 'recibido'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-1">
                      {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 text-xs">
                      <span className="text-stone-400 font-mono">
                        {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="font-mono font-bold text-stone-800">
                        ${ord.totalPrice.toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick QR Modal from Main Banner */}
      {quickQRModalOrder && (
        <OrderQRCodeModal
          order={quickQRModalOrder}
          isOpen={Boolean(quickQRModalOrder)}
          onClose={() => setQuickQRModalOrder(null)}
        />
      )}
    </div>
  );
};
