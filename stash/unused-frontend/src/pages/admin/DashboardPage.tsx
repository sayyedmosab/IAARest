
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Define interfaces
interface DashboardData {
  mrr: number;
  activeSubscribersCount: number;
  newSubscribersLast30Days: number;
  upcomingCancellations: number;
  subscribersByPlan: { [key: string]: number };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke('get-admin-dashboard-data');
        if (error) throw error;
        setData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!data) {
    return <div>No data available.</div>;
  }

  const subscribersByPlanArray = Object.entries(data.subscribersByPlan).map(([name, count]) => ({ name, count }));
  const totalSubscribers = subscribersByPlanArray.reduce((acc, p) => acc + p.count, 0);

  return (
    <div>
      <h3 className="text-2xl font-semibold text-gray-700">Dashboard</h3>

      {/* KPI Cards */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white shadow p-6"><h4>MRR</h4><p className="text-3xl font-bold">AED {data.mrr.toFixed(2)}</p></div>
        <div className="bg-white shadow p-6"><h4>Active Subscribers</h4><p className="text-3xl font-bold">{data.activeSubscribersCount}</p></div>
        <div className="bg-white shadow p-6"><h4>New (Last 30 days)</h4><p className="text-3xl font-bold">+{data.newSubscribersLast30Days}</p></div>
        <div className="bg-white shadow p-6"><h4>Cancellations</h4><p className="text-3xl font-bold">{data.upcomingCancellations}</p></div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white shadow p-6">
          <h4 className="font-semibold text-gray-700">Cashflow Calendar</h4>
          <div className="mt-4 text-center text-gray-500">[TODO: Calendar Implementation]</div>
        </div>
        <div className="bg-white shadow p-6">
          <h4 className="font-semibold text-gray-700">Subscribers by Plan</h4>
          <div className="mt-4 space-y-4">
            {totalSubscribers > 0 ? (
              subscribersByPlanArray.map(plan => {
                const percentage = (plan.count / totalSubscribers) * 100;
                return (
                  <div key={plan.name}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-medium text-gray-800 text-sm">{plan.name}</span>
                      <span className="text-sm font-bold text-gray-600">{plan.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2">
                      <div className="bg-blue-600 h-2" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500">No active subscribers yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
