import { createBrowserRouter, RouterProvider, Outlet, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MenuPage from './pages/MenuPage';
import CheckoutPage from './pages/CheckoutPage';
import AdminLayout from './components/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import DailyOrdersPage from './pages/admin/DailyOrdersPage';
import MenuSchedulerPage from './pages/admin/MenuSchedulerPage';
import MealManagementPage from './pages/admin/MealManagementPage';
import PlanManagementPage from './pages/admin/PlanManagementPage';
import { useEffect } from 'react';

const LanguageLayout = () => {
  const { lang } = useParams();
  useEffect(() => {
    const newLang = lang === 'ar' ? 'ar' : 'en';
    const newDir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
    document.documentElement.dir = newDir;
  }, [lang]);
  return <Outlet />;
};

const AppLayout = () => (
  <div className="flex flex-col min-h-screen">
    <Header />
    <main className="flex-grow"><Outlet /></main>
    <Footer />
  </div>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <LanguageLayout />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/en/home" replace /> },
          { path: ':lang/home', element: <HomePage /> },
          { path: ':lang/login', element: <LoginPage /> },
          { path: ':lang/register', element: <RegisterPage /> },
          { path: ':lang/menu', element: <MenuPage /> },
          { path: ':lang/checkout/:planId', element: <CheckoutPage /> },
        ]
      },
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { path: '', element: <Navigate to="/admin/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'users', element: <UserManagementPage /> },
          { path: 'daily-orders', element: <DailyOrdersPage /> },
          { path: 'menu-scheduler', element: <MenuSchedulerPage /> },
          { path: 'meals', element: <MealManagementPage /> },
          { path: 'plans', element: <PlanManagementPage /> },
        ]
      }
    ]
  }
]);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;