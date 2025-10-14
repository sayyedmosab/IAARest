
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function AdminLayout() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!profile?.is_admin) {
    return <Navigate to="/en/home" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-gray-800 text-white flex flex-col">
        <div className="h-16 flex items-center justify-center px-4 bg-gray-900 flex-shrink-0">
          <Link to="/admin/dashboard" className="font-semibold text-lg">Admin Panel</Link>
        </div>
        <nav className="flex-1 overflow-y-auto">
          <ul className="py-4">
            <li><Link to="/admin/dashboard" className="block px-4 py-2 hover:bg-gray-700">Dashboard</Link></li>
            <li><Link to="/admin/users" className="block px-4 py-2 hover:bg-gray-700">User Management</Link></li>
            <li><Link to="/admin/daily-orders" className="block px-4 py-2 hover:bg-gray-700">Daily Orders</Link></li>
            <li><Link to="/admin/menu-scheduler" className="block px-4 py-2 hover:bg-gray-700">Menu Scheduler</Link></li>
            <li><Link to="/admin/meals" className="block px-4 py-2 hover:bg-gray-700">Meal Management</Link></li>
            <li><Link to="/admin/plans" className="block px-4 py-2 hover:bg-gray-700">Plan Management</Link></li>
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
