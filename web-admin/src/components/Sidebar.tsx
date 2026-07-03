import { LayoutDashboard, CalendarRange, Camera, HelpCircle } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "bookings", label: "Bookings", icon: CalendarRange },
    { id: "equipment", label: "Equipment", icon: Camera },
  ];

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-50 font-serif">
          PhotoHub
        </h1>
        <p className="text-xs text-zinc-500 font-sans mt-1">Studio Manager Admin</p>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? "bg-zinc-800 text-slate-50 border-l-2 border-slate-50"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-slate-50" : "text-zinc-400"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-zinc-800 text-xs text-zinc-600 flex items-center gap-2">
        <HelpCircle className="w-4 h-4 text-zinc-600" />
        <span>v1.0.0 Stable Cloud</span>
      </div>
    </aside>
  );
}
