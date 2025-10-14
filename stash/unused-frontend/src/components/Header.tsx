import { useAuth } from '../contexts/AuthContext';
import { Link, useParams, useLocation } from 'react-router-dom';

export default function Header() {
  const { profile, logout, loading } = useAuth();
  const { lang } = useParams();
  const location = useLocation();

  const isArabic = lang === 'ar';

  const get противоположныйLangUrl = () => {
    const newLang = isArabic ? 'en' : 'ar';
    const path = location.pathname.substring(location.pathname.indexOf('/', 1)); // Get path after lang prefix
    return `/${newLang}${path}`;
  };

  return (
    <header className="bg-red-600 text-white shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to={`/${lang}/home`} className="flex-shrink-0 flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight">Ibn Al Arab</span>
            </Link>
          </div>
          <div className="hidden sm:flex sm:items-center sm:ml-6">
            <div className="flex space-x-4">
              <Link to={`/${lang}/home`} className="px-3 py-2 text-sm font-medium border-b-2 border-white">
                {isArabic ? 'الرئيسية' : 'Home'}
              </Link>
              {/* TODO: Add Menu Link */}
            </div>
          </div>
          <div className="flex items-center">
            <div className="hidden sm:flex items-center space-x-2 ml-4">
              {loading ? (
                <div className="px-4 py-2 text-sm font-medium">Loading...</div>
              ) : profile ? (
                <>
                  <span>{isArabic ? 'مرحباً،' : 'Welcome,'} {profile.first_name}</span>
                  {profile.is_admin && (
                    <Link to="/admin" className="px-4 py-2 border border-white text-sm font-medium text-red-600 bg-white hover:bg-gray-200">
                      {isArabic ? 'لوحة التحكم' : 'Admin Panel'}
                    </Link>
                  )}
                  <button onClick={logout} className="px-4 py-2 border border-transparent text-sm font-medium hover:bg-red-700">
                    {isArabic ? 'تسجيل الخروج' : 'Logout'}
                  </button>
                </>
              ) : (
                <>
                  <Link to={`/${lang}/login`} className="px-4 py-2 border border-transparent text-sm font-medium hover:bg-red-700">
                    {isArabic ? 'تسجيل الدخول' : 'Log in'}
                  </Link>
                  <Link to={`/${lang}/register`} className="px-4 py-2 border border-white text-sm font-medium text-red-600 bg-white hover:bg-gray-200">
                    {isArabic ? 'التسجيل' : 'Register'}
                  </Link>
                </>
              )}
               <Link to={get противоположныйLangUrl()} className="ml-4 text-sm font-medium hover:underline">
                {isArabic ? 'English' : 'العربية'}
              </Link>
            </div>
            {/* TODO: Mobile menu button */}
          </div>
        </div>
      </div>
    </header>
  );
}