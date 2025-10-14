
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      // 1. Sign up the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Registration failed, please try again.');

      // 2. Create the user profile by calling our Edge Function
      const { error: profileError } = await supabase.functions.invoke('create-user-profile', {
        body: { 
          email,
          firstName,
          lastName,
          phone,
        },
      });

      if (profileError) throw profileError;

      // Redirect will be handled by auth listener in App.tsx

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          <div className="-space-y-px">
            <div><input type="text" placeholder="First Name" required onChange={e => setFirstName(e.target.value)} className="appearance-none relative block w-full px-3 py-2 border border-gray-300" /></div>
            <div><input type="text" placeholder="Last Name" required onChange={e => setLastName(e.target.value)} className="appearance-none relative block w-full px-3 py-2 border border-gray-300" /></div>
            <div><input type="email" placeholder="Email" required onChange={e => setEmail(e.target.value)} className="appearance-none relative block w-full px-3 py-2 border border-gray-300" /></div>
            <div><input type="tel" placeholder="Phone" required onChange={e => setPhone(e.target.value)} className="appearance-none relative block w-full px-3 py-2 border border-gray-300" /></div>
            <div><input type="password" placeholder="Password" required onChange={e => setPassword(e.target.value)} className="appearance-none relative block w-full px-3 py-2 border border-gray-300" /></div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div>
            <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400">
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
