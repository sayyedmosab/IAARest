
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Define interfaces
interface Plan {
  id: string;
  name_en: string;
  name_ar: string;
  base_price_aed: number;
  discounted_price_aed: number | null;
}

export default function CheckoutPage() {
  const { lang, planId } = useParams();
  const isArabic = lang === 'ar';
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !session) {
      navigate(`/${lang}/login`);
      return;
    }

    const fetchPlan = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke('get-plan-details', {
          body: { planId },
        });
        if (error) throw error;
        setPlan(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (planId) {
      fetchPlan();
    }
  }, [planId, session, authLoading, lang, navigate]);

  const handleSubscribe = async () => {
    try {
      // TODO: Add payment proof upload to Supabase Storage
      const { error } = await supabase.functions.invoke('create-subscription', {
        body: { planId },
      });
      if (error) throw error;
      setShowSuccess(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading || authLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen">Error: {error}</div>;
  }

  if (showSuccess) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">{isArabic ? 'تم الاشتراك بنجاح!' : 'Subscription Successful!'}</h2>
        <p>{isArabic ? 'اشتراكك قيد المراجعة.' : 'Your subscription is pending review.'}</p>
      </div>
    );
  }

  if (!plan) {
    return <div className="text-center py-20">Plan not found.</div>;
  }

  return (
    <div className="bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">{isArabic ? 'الدفع' : 'Checkout'}</h2>
          <p className="mt-2 text-lg text-gray-500">
            {isArabic ? 'أنت تشترك في خطة' : 'You are subscribing to the'} <span className="font-bold">{isArabic ? plan.name_ar : plan.name_en}</span>
          </p>
        </div>
        <div className="bg-white p-6 shadow-md border">
          {/* Payment UI */}
          <h3 className="text-lg font-medium text-gray-900">{isArabic ? 'طريقة الدفع' : 'Payment Method'}</h3>
          <div className="mt-4 bg-gray-50 p-4 border">
            <p>{isArabic ? 'يرجى تحويل' : 'Please transfer'} <strong>{isArabic ? 'د.إ' : 'AED'} {plan.discounted_price_aed ?? plan.base_price_aed}</strong> {isArabic ? 'إلى الحساب التالي:' : 'to the following account:'}</p>
            {/* Bank details... */}
          </div>
          {/* TODO: File upload UI */}
          <div className="border-t mt-6 pt-6">
            <button onClick={handleSubscribe} className="w-full flex justify-center py-3 px-4 border border-transparent shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700">
              {isArabic ? 'تأكيد الاشتراك' : 'Confirm & Subscribe'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
