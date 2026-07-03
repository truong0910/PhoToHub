import { useEffect, useState } from "react";
import { Plus, Trash2, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "../config/supabase.js";

interface Equipment {
  id: string;
  name: string;
  category: "body" | "lens" | "lighting";
  price_per_day: number;
  status: "available" | "maintenance";
}

export function EquipmentList() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"body" | "lens" | "lighting">("body");
  const [pricePerDay, setPricePerDay] = useState("");
  const [status, setStatus] = useState<"available" | "maintenance">("available");
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEquipment(data || []);
    } catch (err) {
      console.error("Error fetching equipment:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !pricePerDay) return;

    try {
      const { error } = await supabase.from("equipment").insert([
        {
          name,
          category,
          price_per_day: parseFloat(pricePerDay),
          status,
        },
      ]);

      if (error) throw error;

      // Reset form
      setName("");
      setPricePerDay("");
      setCategory("body");
      setStatus("available");
      setShowAddForm(false);

      fetchEquipment();
    } catch (err) {
      console.error("Error adding equipment:", err);
      alert("Error adding equipment. Verify RLS permissions.");
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this equipment item?")) return;

    try {
      const { error } = await supabase.from("equipment").delete().eq("id", id);
      if (error) throw error;

      fetchEquipment();
    } catch (err) {
      console.error("Error deleting equipment:", err);
      alert("Error deleting equipment. Verify RLS permissions.");
    }
  };

  if (loading) {
    return <div className="text-zinc-500 text-sm animate-pulse flex justify-center py-10">Loading catalog items...</div>;
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-50 font-serif">Equipment Inventory</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-slate-50 hover:bg-slate-200 text-zinc-950 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? "Close Form" : "Add Equipment"}</span>
        </button>
      </div>

      {/* Add Equipment Form */}
      {showAddForm && (
        <form onSubmit={handleAddEquipment} className="p-6 border-b border-zinc-800 bg-zinc-900/50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Name Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Equipment Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nikon Z6 II"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 text-sm focus:border-slate-50 focus:outline-none"
                required
              />
            </div>

            {/* Category Select */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 text-sm focus:border-slate-50 focus:outline-none"
              >
                <option value="body">Body (Camera)</option>
                <option value="lens">Lens</option>
                <option value="lighting">Lighting</option>
              </select>
            </div>

            {/* Price Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Price Per Day ($)</label>
              <input
                type="number"
                step="0.01"
                value={pricePerDay}
                onChange={(e) => setPricePerDay(e.target.value)}
                placeholder="e.g. 75.00"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 text-sm focus:border-slate-50 focus:outline-none"
                required
              />
            </div>

            {/* Status Select */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 text-sm focus:border-slate-50 focus:outline-none"
              >
                <option value="available">Available</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-slate-50 hover:bg-slate-200 text-zinc-950 text-xs font-semibold px-4 py-2.5 rounded-lg cursor-pointer"
            >
              Save Equipment
            </button>
          </div>
        </form>
      )}

      {/* Equipment Table */}
      {equipment.length === 0 ? (
        <div className="p-10 text-center text-zinc-500 text-sm">
          No equipment registered in inventory yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase bg-zinc-900/50">
                <th className="p-4">Equipment Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Daily Rate</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 text-sm text-zinc-300">
              {equipment.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-800/20 transition-colors">
                  {/* Name */}
                  <td className="p-4 font-semibold text-zinc-200">{item.name}</td>

                  {/* Category */}
                  <td className="p-4">
                    <span className="capitalize text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700 text-xs">
                      {item.category}
                    </span>
                  </td>

                  {/* Daily Rate */}
                  <td className="p-4 font-mono text-zinc-200">${Number(item.price_per_day).toFixed(2)}</td>

                  {/* Status */}
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        item.status === "available"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                      }`}
                    >
                      {item.status === "available" ? (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                      <span className="capitalize">{item.status}</span>
                    </span>
                  </td>

                  {/* Delete Button */}
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDeleteEquipment(item.id)}
                      className="text-zinc-500 hover:text-rose-500 p-2 rounded transition-colors cursor-pointer"
                      title="Delete Equipment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
