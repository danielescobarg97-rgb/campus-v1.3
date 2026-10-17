import { Product, Order, OrderStatus } from '../types';
import { INITIAL_PRODUCTS, INITIAL_ORDERS } from '../firebase/seed';

const PRODUCTS_KEY = 'campusbite_products_v3';
const ORDERS_KEY = 'campusbite_orders_v3';
const SYNC_CHANNEL_NAME = 'campusbite_broadcast';

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
} catch (e) {
  console.debug('BroadcastChannel not supported', e);
}

function notifySubscribers(type: 'products' | 'orders') {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type, timestamp: Date.now() });
    } catch (e) {
      console.debug('Failed to postMessage on channel', e);
    }
  }
  window.dispatchEvent(new CustomEvent('campusbite_update', { detail: { type } }));
}

// Load products
export function getStoredProducts(): Product[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (!raw) {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return parsed;
  } catch {
    return INITIAL_PRODUCTS;
  }
}

// Load orders
export function getStoredOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    return parsed;
  } catch {
    return INITIAL_ORDERS;
  }
}

// Subscribe to products in real-time
export function subscribeProducts(callback: (products: Product[]) => void): () => void {
  callback(getStoredProducts());

  const handleUpdate = (e: Event) => {
    const custom = e as CustomEvent<{ type?: string }>;
    if (!custom.detail || custom.detail.type === 'products') {
      callback(getStoredProducts());
    }
  };

  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'products') {
      callback(getStoredProducts());
    }
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === PRODUCTS_KEY) {
      callback(getStoredProducts());
    }
  };

  window.addEventListener('campusbite_update', handleUpdate);
  window.addEventListener('storage', handleStorage);
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  return () => {
    window.removeEventListener('campusbite_update', handleUpdate);
    window.removeEventListener('storage', handleStorage);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
  };
}

// Subscribe to orders in real-time
export function subscribeOrders(callback: (orders: Order[]) => void): () => void {
  callback(getStoredOrders());

  const handleUpdate = (e: Event) => {
    const custom = e as CustomEvent<{ type?: string }>;
    if (!custom.detail || custom.detail.type === 'orders') {
      callback(getStoredOrders());
    }
  };

  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'orders') {
      callback(getStoredOrders());
    }
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === ORDERS_KEY) {
      callback(getStoredOrders());
    }
  };

  window.addEventListener('campusbite_update', handleUpdate);
  window.addEventListener('storage', handleStorage);
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  return () => {
    window.removeEventListener('campusbite_update', handleUpdate);
    window.removeEventListener('storage', handleStorage);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
  };
}

// Subscribe to a single order in real-time
export function subscribeOrder(orderId: string, callback: (order: Order | null) => void): () => void {
  const getSingle = () => {
    const all = getStoredOrders();
    return all.find((o) => o.id === orderId) || null;
  };

  callback(getSingle());

  const handleUpdate = (e: Event) => {
    const custom = e as CustomEvent<{ type?: string }>;
    if (!custom.detail || custom.detail.type === 'orders') {
      callback(getSingle());
    }
  };

  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'orders') {
      callback(getSingle());
    }
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === ORDERS_KEY) {
      callback(getSingle());
    }
  };

  window.addEventListener('campusbite_update', handleUpdate);
  window.addEventListener('storage', handleStorage);
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  return () => {
    window.removeEventListener('campusbite_update', handleUpdate);
    window.removeEventListener('storage', handleStorage);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
  };
}

// Calculate dynamic estimated delivery time
export function calculateEstimatedTime(
  order: Order,
  allOrders: Order[],
  productsList?: Product[]
): {
  totalEstimatedMinutes: number;
  remainingMinutes: number;
  statusLabel: string;
} {
  if (order.status === 'listo') {
    return {
      totalEstimatedMinutes: 0,
      remainingMinutes: 0,
      statusLabel: '¡Listo ahora en ventanilla!',
    };
  }
  if (order.status === 'entregado') {
    return {
      totalEstimatedMinutes: 0,
      remainingMinutes: 0,
      statusLabel: 'Pedido entregado',
    };
  }
  if (order.status === 'cancelado') {
    return {
      totalEstimatedMinutes: 0,
      remainingMinutes: 0,
      statusLabel: 'Cancelado',
    };
  }

  // Find max prep time for items in this order
  let maxItemPrep = 6;
  const products = productsList || getStoredProducts();
  order.items.forEach((item) => {
    const prod = products.find((p) => p.id === item.productId);
    if (prod && prod.prepTimeMinutes) {
      maxItemPrep = Math.max(maxItemPrep, prod.prepTimeMinutes);
    } else if (item.name.toLowerCase().includes('hamburguesa')) {
      maxItemPrep = Math.max(maxItemPrep, 12);
    } else if (item.name.toLowerCase().includes('sandwich') || item.name.toLowerCase().includes('sándwich')) {
      maxItemPrep = Math.max(maxItemPrep, 8);
    }
  });

  // Calculate queue delay: count orders ahead in queue created earlier
  const thisCreatedTime = new Date(order.createdAt).getTime();
  const ordersAhead = allOrders.filter(
    (o) =>
      ['recibido', 'preparando'].includes(o.status) &&
      new Date(o.createdAt).getTime() < thisCreatedTime &&
      o.id !== order.id
  ).length;

  const queueDelay = Math.min(ordersAhead * 2, 12); // max 12 min additional buffer
  const totalEstimatedMinutes = maxItemPrep + queueDelay;

  // Minutes elapsed
  const elapsedMinutes = Math.floor((Date.now() - thisCreatedTime) / 60000);
  const remainingMinutes = Math.max(1, totalEstimatedMinutes - elapsedMinutes);

  return {
    totalEstimatedMinutes,
    remainingMinutes,
    statusLabel: `~${remainingMinutes} min aprox.`,
  };
}

// Create new order
export async function createOrder(
  payload: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Order> {
  const orders = getStoredOrders();
  const id = 'ord-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const now = new Date().toISOString();
  const newOrder: Order = {
    ...payload,
    id,
    createdAt: now,
    updatedAt: now,
  };
  const updated = [newOrder, ...orders];
  localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
  notifySubscribers('orders');
  return newOrder;
}

// Update order status
export async function updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<void> {
  const orders = getStoredOrders();
  const updated = orders.map((o) =>
    o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o
  );
  localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
  notifySubscribers('orders');
}

// Find order by scanned payload or code
export function findOrderFromScan(rawScan: string): Order | null {
  const orders = getStoredOrders();
  const query = rawScan.trim();

  // Try JSON payload
  try {
    if (query.startsWith('{') && query.endsWith('}')) {
      const parsed = JSON.parse(query);
      if (parsed.orderId) {
        const found = orders.find((o) => o.id === parsed.orderId);
        if (found) return found;
      }
      if (parsed.pickupCode) {
        const found = orders.find(
          (o) => o.pickupCode.toLowerCase() === parsed.pickupCode.toLowerCase()
        );
        if (found) return found;
      }
    }
  } catch {
    // ignore json parse failure
  }

  // Try matching directly by Order ID
  const byId = orders.find((o) => o.id.toLowerCase() === query.toLowerCase());
  if (byId) return byId;

  // Try matching by pickup code e.g. #C-104 or C-104 or 104
  const cleanCode = query.replace('#', '').toUpperCase();
  const byCode = orders.find((o) => {
    const oClean = o.pickupCode.replace('#', '').toUpperCase();
    return oClean === cleanCode || oClean.includes(cleanCode) || o.pickupCode.toUpperCase() === query.toUpperCase();
  });
  if (byCode) return byCode;

  return null;
}

// Mark order delivered via QR scan
export async function markOrderDeliveredByScan(scanPayload: string): Promise<{ success: boolean; order?: Order; message: string }> {
  const target = findOrderFromScan(scanPayload);
  if (!target) {
    return {
      success: false,
      message: `No se encontró ningún pedido con el código "${scanPayload}".`,
    };
  }

  if (target.status === 'entregado') {
    return {
      success: true,
      order: target,
      message: `El pedido ${target.pickupCode} ya había sido entregado previamente.`,
    };
  }

  await updateOrderStatus(target.id, 'entregado');
  const refreshed = getStoredOrders().find((o) => o.id === target.id) || { ...target, status: 'entregado' as OrderStatus };

  return {
    success: true,
    order: refreshed,
    message: `¡Pedido ${refreshed.pickupCode} (${refreshed.studentName}) cobrado y entregado con éxito!`,
  };
}

// Create new product
export async function createProduct(payload: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
  const products = getStoredProducts();
  const id = 'prod-' + Date.now();
  const newProduct: Product = {
    ...payload,
    id,
    createdAt: new Date().toISOString(),
  };
  const updated = [newProduct, ...products];
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(updated));
  notifySubscribers('products');
  return newProduct;
}

// Update product
export async function updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
  const products = getStoredProducts();
  const updated = products.map((p) => (p.id === productId ? { ...p, ...updates } : p));
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(updated));
  notifySubscribers('products');
}

// Delete product
export async function deleteProduct(productId: string): Promise<void> {
  const products = getStoredProducts();
  const updated = products.filter((p) => p.id !== productId);
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(updated));
  notifySubscribers('products');
}

// Reset data
export async function resetCatalogAndOrders(): Promise<void> {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
  localStorage.setItem(ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
  notifySubscribers('products');
  notifySubscribers('orders');
}
