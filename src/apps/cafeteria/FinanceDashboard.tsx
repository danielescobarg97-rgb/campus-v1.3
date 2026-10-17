import React, { useState, useMemo } from 'react';
import { Order, Product } from '../../types';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Calendar,
  PieChart,
  BarChart3,
  Download,
  Percent,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

interface Props {
  orders: Order[];
  products: Product[];
  isHighContrast: boolean;
}

type Period = 'today' | 'week' | 'month' | 'all';

export const FinanceDashboard: React.FC<Props> = ({ orders, products, isHighContrast }) => {
  const [period, setPeriod] = useState<Period>('today');
  const [profitMargin, setProfitMargin] = useState<number>(55); // 55% estimated food profit margin

  // Filter delivered/paid orders according to selected period
  const filteredOrders = useMemo(() => {
    const delivered = orders.filter((o) => o.status === 'entregado');
    const now = new Date();

    if (period === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return delivered.filter((o) => new Date(o.createdAt).getTime() >= startOfDay);
    }

    if (period === 'week') {
      const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      return delivered.filter((o) => new Date(o.createdAt).getTime() >= sevenDaysAgo);
    }

    if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return delivered.filter((o) => new Date(o.createdAt).getTime() >= startOfMonth);
    }

    return delivered;
  }, [orders, period]);

  // Aggregate Metrics
  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.totalPrice, 0);
  }, [filteredOrders]);

  const estimatedProfit = useMemo(() => {
    return Math.round(totalRevenue * (profitMargin / 100));
  }, [totalRevenue, profitMargin]);

  const estimatedCosts = totalRevenue - estimatedProfit;

  const totalOrdersCount = filteredOrders.length;
  const averageTicket = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;

  // Breakdown by Category
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; revenue: number }> = {};

    filteredOrders.forEach((o) => {
      o.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const cat = prod?.category || 'Otros';
        if (!stats[cat]) {
          stats[cat] = { count: 0, revenue: 0 };
        }
        stats[cat].count += item.quantity;
        stats[cat].revenue += item.price * item.quantity;
      });
    });

    return Object.entries(stats)
      .map(([category, data]) => ({
        category,
        ...data,
        percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, products, totalRevenue]);

  // Top Selling Products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number; category: string }> = {};

    filteredOrders.forEach((o) => {
      o.items.forEach((item) => {
        if (!map[item.productId]) {
          const prod = products.find((p) => p.id === item.productId);
          map[item.productId] = {
            name: item.name,
            quantity: 0,
            revenue: 0,
            category: prod?.category || 'Cafetería',
          };
        }
        map[item.productId].quantity += item.quantity;
        map[item.productId].revenue += item.price * item.quantity;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filteredOrders, products]);

  // Daily distribution for bar chart (last 7 days or days in month)
  const dailyChartData = useMemo(() => {
    const daysMap: Record<string, number> = {};
    const now = new Date();
    const daysToCount = period === 'month' ? 14 : period === 'all' ? 14 : 7;

    for (let i = daysToCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
      daysMap[label] = 0;
    }

    filteredOrders.forEach((o) => {
      const d = new Date(o.createdAt);
      const label = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
      if (daysMap[label] !== undefined) {
        daysMap[label] += o.totalPrice;
      }
    });

    return Object.entries(daysMap).map(([day, revenue]) => ({ day, revenue }));
  }, [filteredOrders, period]);

  const maxDailyRevenue = Math.max(...dailyChartData.map((d) => d.revenue), 10000);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID Pedido', 'Código', 'Estudiante', 'Fecha', 'Hora', 'Total Pagado', 'Ítems'];
    const rows = filteredOrders.map((o) => [
      o.id,
      o.pickupCode,
      `"${o.studentName}"`,
      new Date(o.createdAt).toLocaleDateString('es-CO'),
      new Date(o.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      o.totalPrice,
      `"${o.items.map((i) => `${i.quantity}x ${i.name}`).join('; ')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campusbite_ventas_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Period Filter Toolbar */}
      <div
        className={`p-5 rounded-3xl border shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isHighContrast
            ? 'bg-stone-900 border-stone-800 text-white'
            : 'bg-white border-stone-200 text-stone-900'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-black tracking-tight">Control de Ventas & Ganancias</h2>
          </div>
          <p
            className={`text-xs mt-0.5 ${
              isHighContrast ? 'text-stone-400' : 'text-stone-500'
            }`}
          >
            Métricas financieras en tiempo real para auditoría diaria, semanal y mensual de la cafetería.
          </p>
        </div>

        {/* Period Buttons & CSV Export */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`flex items-center p-1 rounded-2xl border ${
              isHighContrast ? 'bg-stone-950 border-stone-800' : 'bg-stone-100 border-stone-200'
            }`}
          >
            {[
              { id: 'today', label: 'Hoy (Diario)' },
              { id: 'week', label: 'Esta Semana' },
              { id: 'month', label: 'Este Mes' },
              { id: 'all', label: 'Histórico' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id as Period)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  period === tab.id
                    ? isHighContrast
                      ? 'bg-amber-400 text-stone-950 font-black'
                      : 'bg-white text-stone-900 shadow-2xs font-extrabold'
                    : isHighContrast
                    ? 'text-stone-400 hover:text-stone-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
              isHighContrast
                ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
            }`}
            title="Descargar informe de ventas en formato CSV para Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Revenue */}
        <div
          className={`p-5 rounded-3xl border transition shadow-2xs ${
            isHighContrast
              ? 'bg-stone-900 border-stone-800 text-white'
              : 'bg-white border-stone-200 text-stone-900'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Ventas Totales
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
            ${totalRevenue.toLocaleString('es-CO')}
          </h3>
          <p className="text-[11px] text-stone-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Cobrado en ventanilla ({totalOrdersCount} pedidos)</span>
          </p>
        </div>

        {/* Card 2: Estimated Net Profit */}
        <div
          className={`p-5 rounded-3xl border transition shadow-2xs ${
            isHighContrast
              ? 'bg-stone-900 border-amber-500/40 text-white ring-1 ring-amber-500/20'
              : 'bg-amber-50/70 border-amber-200 text-stone-900'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Ganancia Estimada
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-950 text-amber-900 dark:text-amber-300">
                {profitMargin}%
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-amber-800 dark:text-amber-400 tracking-tight">
            ${estimatedProfit.toLocaleString('es-CO')}
          </h3>
          <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
            <span>Margen cafeteria:</span>
            <input
              type="range"
              min={30}
              max={80}
              step={5}
              value={profitMargin}
              onChange={(e) => setProfitMargin(Number(e.target.value))}
              className="w-20 accent-amber-600 cursor-pointer"
              title={`Ajustar margen de ganancia: ${profitMargin}%`}
            />
          </div>
        </div>

        {/* Card 3: Estimated Cost of Ingredients */}
        <div
          className={`p-5 rounded-3xl border transition shadow-2xs ${
            isHighContrast
              ? 'bg-stone-900 border-stone-800 text-white'
              : 'bg-white border-stone-200 text-stone-900'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Costo de Insumos
            </span>
            <div className="w-8 h-8 rounded-xl bg-stone-500/10 text-stone-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-stone-700 dark:text-stone-300 tracking-tight">
            ${estimatedCosts.toLocaleString('es-CO')}
          </h3>
          <p className="text-[11px] text-stone-400 mt-1">
            {100 - profitMargin}% costo de materia prima e insumos
          </p>
        </div>

        {/* Card 4: Average Ticket */}
        <div
          className={`p-5 rounded-3xl border transition shadow-2xs ${
            isHighContrast
              ? 'bg-stone-900 border-stone-800 text-white'
              : 'bg-white border-stone-200 text-stone-900'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Ticket Promedio
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-blue-500 tracking-tight">
            ${averageTicket.toLocaleString('es-CO')}
          </h3>
          <p className="text-[11px] text-stone-400 mt-1">Gasto medio por estudiante</p>
        </div>
      </div>

      {/* Visual Chart and Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Daily Revenue Bar Chart */}
        <div
          className={`lg:col-span-2 p-5 rounded-3xl border shadow-2xs flex flex-col justify-between ${
            isHighContrast
              ? 'bg-stone-900 border-stone-800 text-white'
              : 'bg-white border-stone-200 text-stone-900'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <h4 className="font-extrabold text-sm">Ventas por Día ($ COP)</h4>
            </div>
            <span className="text-xs font-semibold text-stone-400">
              {period === 'today'
                ? 'Distribución reciente'
                : period === 'week'
                ? 'Últimos 7 días'
                : 'Tendencia del período'}
            </span>
          </div>

          {/* Bar Chart Graphics */}
          <div className="h-48 flex items-end gap-2 sm:gap-4 pt-6 pb-2 px-2 border-b border-stone-200 dark:border-stone-800">
            {dailyChartData.map((bar, idx) => {
              const heightPercent = maxDailyRevenue > 0 ? (bar.revenue / maxDailyRevenue) * 100 : 0;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="text-[10px] font-mono text-stone-400 opacity-0 group-hover:opacity-100 transition duration-150">
                    ${(bar.revenue / 1000).toFixed(0)}k
                  </div>
                  <div className="w-full max-w-[42px] bg-stone-100 dark:bg-stone-800 rounded-xl h-full flex items-end overflow-hidden p-0.5">
                    <div
                      style={{ height: `${Math.max(heightPercent, 6)}%` }}
                      className={`w-full rounded-lg transition-all duration-500 ${
                        bar.revenue > 0
                          ? 'bg-gradient-to-t from-amber-600 to-amber-400 group-hover:from-amber-500 group-hover:to-amber-300'
                          : 'bg-stone-200 dark:bg-stone-700'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-stone-400 capitalize truncate w-full text-center">
                    {bar.day}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-stone-400">
            <span>Pico más alto: ${maxDailyRevenue.toLocaleString('es-CO')}</span>
            <span className="font-medium text-emerald-500 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Ingresos en tiempo real
            </span>
          </div>
        </div>

        {/* Category Contribution */}
        <div
          className={`p-5 rounded-3xl border shadow-2xs flex flex-col justify-between ${
            isHighContrast
              ? 'bg-stone-900 border-stone-800 text-white'
              : 'bg-white border-stone-200 text-stone-900'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-500" />
              <h4 className="font-extrabold text-sm">Ventas por Categoría</h4>
            </div>
          </div>

          <div className="space-y-3 my-2 flex-1 overflow-y-auto max-h-56 pr-1 custom-scrollbar">
            {categoryStats.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-6">Sin ventas en este período.</p>
            ) : (
              categoryStats.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">{cat.category}</span>
                    <span className="font-mono font-bold">
                      ${cat.revenue.toLocaleString('es-CO')}{' '}
                      <span className="text-[10px] text-stone-400 font-normal">({cat.percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
                    <div
                      style={{ width: `${cat.percentage}%` }}
                      className="bg-amber-500 h-full rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
            <span>Total categorías con ventas:</span>
            <strong className="text-stone-700 dark:text-stone-300">{categoryStats.length}</strong>
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div
        className={`p-5 rounded-3xl border shadow-2xs ${
          isHighContrast
            ? 'bg-stone-900 border-stone-800 text-white'
            : 'bg-white border-stone-200 text-stone-900'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-500" />
            <h4 className="font-extrabold text-sm">Top 5 Productos Más Vendidos</h4>
          </div>
          <span className="text-xs text-stone-400">Ordenados por volumen de pedidos</span>
        </div>

        {topProducts.length === 0 ? (
          <p className="text-xs text-stone-400 text-center py-6">No hay datos de productos en este período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className={`border-b font-bold uppercase tracking-wider text-[10px] ${
                  isHighContrast ? 'border-stone-800 text-stone-400' : 'border-stone-100 text-stone-500'
                }`}
              >
                <tr>
                  <th className="pb-3 pl-2">#</th>
                  <th className="pb-3">Producto</th>
                  <th className="pb-3">Categoría</th>
                  <th className="pb-3 text-center">Unidades Vendidas</th>
                  <th className="pb-3 text-right pr-2">Ingresos Generados</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isHighContrast ? 'divide-stone-800' : 'divide-stone-100'}`}>
                {topProducts.map((prod, idx) => (
                  <tr key={idx} className="hover:bg-amber-50/20 transition">
                    <td className="py-3 pl-2 font-bold font-mono text-amber-500">#{idx + 1}</td>
                    <td className="py-3 font-semibold">{prod.name}</td>
                    <td className="py-3 text-stone-400">{prod.category}</td>
                    <td className="py-3 text-center font-mono font-bold">{prod.quantity}</td>
                    <td className="py-3 text-right pr-2 font-mono font-black text-emerald-400">
                      ${prod.revenue.toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
