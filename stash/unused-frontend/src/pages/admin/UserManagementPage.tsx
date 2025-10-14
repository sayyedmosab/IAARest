
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Define interfaces
interface Profile {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_e164: string;
  address: string;
  district: string;
}

interface Subscription {
  id: string;
  status: string;
  profiles: Profile;
  plans: { name_en: string };
}

export default function UserManagementPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-users-and-subscriptions');
      if (error) throw error;
      setProfiles(data.profiles);
      setSubscriptions(data.subscriptions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (subscriptionId: string, newStatus: string) => {
    try {
      const { error } = await supabase.functions.invoke('update-subscription-status', {
        body: { subscriptionId, newStatus },
      });
      if (error) throw error;
      fetchData(); // Refresh data after update
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const pendingSubscriptions = subscriptions.filter(s => s.status === 'pending_payment');

  if (loading) {
    return <div>Loading user data...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div>
      <h3 className="text-2xl font-semibold text-gray-700">User Management</h3>

      {/* Pending Approvals */}
      <div className="mt-8">
        <h4 className="text-lg font-semibold text-gray-800">Pending Approvals</h4>
        <div className="mt-4 bg-white shadow-md overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr><th>Student</th><th>Plan</th><th>Actions</th></tr></thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingSubscriptions.length > 0 ? pendingSubscriptions.map(sub => (
                <tr key={sub.id}>
                  <td className="p-4">{sub.profiles.first_name} {sub.profiles.last_name}</td>
                  <td className="p-4">{sub.plans.name_en}</td>
                  <td className="p-4 space-x-2">
                    <button onClick={() => handleUpdateStatus(sub.id, 'active')} className="text-red-600">Approve</button>
                    <button onClick={() => handleUpdateStatus(sub.id, 'rejected')} className="text-gray-600">Reject</button>
                  </td>
                </tr>
              )) : <tr><td colSpan={3} className="text-center p-4">No pending approvals.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Registered Users */}
      <div className="mt-12">
        <h4 className="text-lg font-semibold text-gray-800">All Registered Users</h4>
        <div className="mt-4 bg-white shadow-md overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
             <thead className="bg-gray-50"><tr><th>Name</th><th>Email</th><th>Phone</th><th>Address</th></tr></thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {profiles.map(p => (
                <tr key={p.user_id}>
                  <td className="p-4">{p.first_name} {p.last_name}</td>
                  <td className="p-4">{p.email}</td>
                  <td className="p-4">{p.phone_e164}</td>
                  <td className="p-4">{p.address}, {p.district}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
