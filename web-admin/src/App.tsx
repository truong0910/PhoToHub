import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar.js";
import { RevenueChart } from "./components/RevenueChart.js";
import { BookingList } from "./components/BookingList.js";
import { EquipmentList } from "./components/EquipmentList.js";
import { supabase } from "./config/supabase.js";
import { CircleDollarSign, CalendarRange, Cpu, Hammer } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Summary Metrics States
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    activeBookings: 0,
    totalEquipment: 0,
    maintenanceEquipment: 0,
  });

  useEffect(() => {
    fetchMetrics();

    // Subscribe to database changes to keep metrics realtime!
    const bookingSubscription = supabase
      .channel("bookings-metrics")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => fetchMetrics())
      .subscribe();

    const equipmentSubscription = supabase
      .channel("equipment-metrics")
      .on("postgres_changes", { event: "*", schema: "public", table: "equipment" }, () => fetchMetrics())
      .subscribe();

    return () => {
      supabase.removeChannel(bookingSubscription);
      supabase.removeChannel(equipmentSubscription);
    };
  }, []);

  const fetchMetrics = async () => {
    try {
      // 1. Fetch Revenue
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("total_price, status");

      let revenue = 0;
      let active = 0;
      if (bookingsData) {
        bookingsData.forEach((b) => {
          if (["approved", "ongoing", "completed"].includes(b.status)) {
            revenue += Number(b.total_price) || 0;
          }
          if (["pending", "approved", "ongoing"].includes(b.status)) {
            active += 1;
          }
        });
      }

      // 2. Fetch Equipment
      const { data: equipmentData } = await supabase
        .from("equipment")
        .select("status");

      let totalEquip = 0;
      let maintenanceEquip = 0;
      if (equipmentData) {
        totalEquip = equipmentData.length;
        maintenanceEquip = equipmentData.filter((e) => e.status === "maintenance").length;
      }

      setMetrics({
        totalRevenue: revenue,
        activeBookings: active,
        totalEquipment: totalEquip,
        maintenanceEquipment: maintenanceEquip,
      });
    } catch (err) {
      console.error("Error loading metrics:", err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex font-sans">
      {/* 1. Sidebar Left */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. Main Content Right */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-800 bg-zinc-950 px-8 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs text-zinc-500 font-medium">Remote Cloud Connection Healthy</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-semibold text-zinc-300">Studio Manager</div>
              <div className="text-[10px] text-zinc-500">Administrator Role</div>
            </div>
            <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-slate-50">
              AD
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-8 space-y-8">
          {activeTab === "dashboard" && (
            <>
              {/* Page Title */}
              <div>
                <h1 className="text-3xl font-extrabold text-slate-50 font-serif tracking-tight">
                  Dashboard
                </h1>
                <p className="text-sm text-zinc-500 font-sans mt-1">
                  At-a-glance operations metrics and cash-flow summaries.
                </p>
              </div>

              {/* Metric Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Revenue Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-400 font-medium">Total Revenue</span>
                    <h3 className="text-2xl font-bold font-mono text-slate-50">
                      ${metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                  </div>
                  <div className="p-3 bg-zinc-800 rounded-lg text-slate-50 border border-zinc-700">
                    <CircleDollarSign className="w-5 h-5" />
                  </div>
                </div>

                {/* Bookings Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-400 font-medium">Active Bookings</span>
                    <h3 className="text-2xl font-bold font-mono text-slate-50">
                      {metrics.activeBookings}
                    </h3>
                  </div>
                  <div className="p-3 bg-zinc-800 rounded-lg text-slate-50 border border-zinc-700">
                    <CalendarRange className="w-5 h-5" />
                  </div>
                </div>

                {/* Equipment Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-400 font-medium">Total Inventory</span>
                    <h3 className="text-2xl font-bold font-mono text-slate-50">
                      {metrics.totalEquipment}
                    </h3>
                  </div>
                  <div className="p-3 bg-zinc-800 rounded-lg text-slate-50 border border-zinc-700">
                    <Cpu className="w-5 h-5" />
                  </div>
                </div>

                {/* Maintenance Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-400 font-medium">In Maintenance</span>
                    <h3 className="text-2xl font-bold font-mono text-slate-50">
                      {metrics.maintenanceEquipment}
                    </h3>
                  </div>
                  <div className="p-3 bg-zinc-800 rounded-lg text-slate-50 border border-zinc-700">
                    <Hammer className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Chart & Mini Booking List */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Chart */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 lg:col-span-2">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-6 font-serif">
                    Cashflow by Month
                  </h3>
                  <RevenueChart />
                </div>

                {/* System Activity */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 font-serif">
                      Quick Operations
                    </h3>
                    <p className="text-xs text-zinc-500 mb-4">
                      Toggle tabs on the sidebar to perform catalog CRUD management or approve client schedules.
                    </p>
                  </div>
                  <div className="border border-zinc-800 bg-zinc-950 p-4 rounded-lg text-xs space-y-2 text-zinc-400 font-mono">
                    <div className="text-zinc-500 font-semibold mb-1">Testing commands:</div>
                    <div>1. Start Express Server:</div>
                    <div className="text-slate-50">npm run dev (backend/)</div>
                    <div>2. Push API tests payload:</div>
                    <div className="text-slate-50">node scripts/test-api.js</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "bookings" && (
            <>
              <div>
                <h1 className="text-3xl font-extrabold text-slate-50 font-serif tracking-tight">
                  Bookings Ledger
                </h1>
                <p className="text-sm text-zinc-500 font-sans mt-1">
                  Manage client bookings and toggle approval statuses. Updates automatically via Supabase Realtime.
                </p>
              </div>
              <BookingList />
            </>
          )}

          {activeTab === "equipment" && (
            <>
              <div>
                <h1 className="text-3xl font-extrabold text-slate-50 font-serif tracking-tight">
                  Equipment Catalog
                </h1>
                <p className="text-sm text-zinc-500 font-sans mt-1">
                  Add cameras, lenses, or lighting to catalog inventory or toggle maintenance logs.
                </p>
              </div>
              <EquipmentList />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
