import { useEffect, useState } from "react";
import { Check, X, Calendar, User, Cpu, CircleDollarSign } from "lucide-react";
import { supabase } from "../config/supabase.js";

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_price: number;
  client: { full_name: string; phone: string } | null;
  photographer: { full_name: string } | null;
  equipment: { name: string } | null;
}

export function BookingList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();

    // Listen to changes in bookings in Realtime!
    const channel = supabase
      .channel("bookings-table-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBookings = async () => {
    try {
      // Query bookings with relations using Postgrest joins
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          start_date,
          end_date,
          status,
          total_price,
          client:client_id(full_name, phone),
          photographer:photographer_id(full_name),
          equipment:equipment_id(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings((data as any) || []);
    } catch (err) {
      console.error("Error loading bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const response = await fetch(`${apiUrl}/bookings/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to update booking status.");
      }
      
      // Realtime listener will automatically trigger refresh
    } catch (err: any) {
      console.error(`Error updating booking status to ${newStatus}:`, err);
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "approved":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "ongoing":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "completed":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "cancelled":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    }
  };

  if (loading) {
    return (
      <div className="text-zinc-500 text-sm animate-pulse flex justify-center py-10">
        Loading booking records...
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-50 font-serif">Booking Requests</h2>
        <span className="text-xs bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full border border-zinc-700">
          Realtime Stream Enabled
        </span>
      </div>

      {bookings.length === 0 ? (
        <div className="p-10 text-center text-zinc-500 text-sm">
          No bookings placed yet. Use the test script to push mock booking payloads.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase bg-zinc-900/50">
                <th className="p-4">Client</th>
                <th className="p-4">Details</th>
                <th className="p-4">Rental Cost</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 text-sm text-zinc-300">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-zinc-800/20 transition-colors">
                  {/* Client Info */}
                  <td className="p-4">
                    <div className="font-semibold text-zinc-200">
                      {booking.client?.full_name || "Unknown Client"}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {booking.client?.phone || "No phone contact"}
                    </div>
                  </td>

                  {/* Booking Details */}
                  <td className="p-4 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{booking.equipment?.name || "No Equipment Rented"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <User className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Photographer: {booking.photographer?.full_name || "None"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                      <span>
                        {new Date(booking.start_date).toLocaleDateString()} -{" "}
                        {new Date(booking.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="p-4 font-mono text-zinc-200">
                    <div className="flex items-center gap-1">
                      <CircleDollarSign className="w-4 h-4 text-zinc-500" />
                      <span>${Number(booking.total_price).toFixed(2)}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(
                        booking.status
                      )}`}
                    >
                      {booking.status}
                    </span>
                  </td>

                  {/* Action Buttons */}
                  <td className="p-4 text-right">
                    {booking.status === "pending" ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => updateStatus(booking.id, "approved")}
                          className="bg-emerald-600 hover:bg-emerald-500 text-slate-50 p-2 rounded-lg transition-colors cursor-pointer"
                          title="Approve Booking"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateStatus(booking.id, "cancelled")}
                          className="bg-zinc-800 hover:bg-rose-950/40 hover:text-rose-500 text-zinc-400 border border-zinc-700 p-2 rounded-lg transition-colors cursor-pointer"
                          title="Cancel Booking"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-600">No actions required</span>
                    )}
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
