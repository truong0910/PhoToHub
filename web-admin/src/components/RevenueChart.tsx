import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "../config/supabase.js";

interface ChartDataItem {
  name: string;
  Revenue: number;
}

export function RevenueChart() {
  const [data, setData] = useState<ChartDataItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueData();
    
    // Subscribe to Postgres changes on bookings table for Realtime updates
    const channel = supabase
      .channel("bookings-chart-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          fetchRevenueData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRevenueData = async () => {
    try {
      // Query bookings that are approved, ongoing, or completed to map total revenues
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("total_price, start_date")
        .in("status", ["approved", "ongoing", "completed"]);

      if (error) throw error;

      // Initialize monthly map
      const monthlyRevenue: Record<string, number> = {
        Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0,
        Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0,
      };

      if (bookings) {
        bookings.forEach((b) => {
          const date = new Date(b.start_date);
          const monthStr = date.toLocaleString("default", { month: "short" });
          if (monthlyRevenue[monthStr] !== undefined) {
            monthlyRevenue[monthStr] += Number(b.total_price) || 0;
          }
        });
      }

      const formattedData = Object.keys(monthlyRevenue).map((month) => ({
        name: month,
        Revenue: monthlyRevenue[month],
      }));

      setData(formattedData);
    } catch (err) {
      console.error("Error calculating chart revenue:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-80 flex items-center justify-center border border-dashed border-zinc-800 rounded-lg">
        <p className="text-zinc-500 text-sm animate-pulse">Calculating revenue indices...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#27272A" strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#71717A" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#71717A" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "#18181B", 
              borderColor: "#27272A",
              color: "#FAFAFA",
              borderRadius: "8px",
              fontFamily: "var(--font-sans)",
              fontSize: "12px"
            }}
            itemStyle={{ color: "#F8FAFC" }}
            cursor={{ fill: "#27272A", opacity: 0.2 }}
          />
          <Bar 
            dataKey="Revenue" 
            fill="#F8FAFC" 
            radius={[4, 4, 0, 0]} 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
