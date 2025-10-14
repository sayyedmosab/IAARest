
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PlanCard from '../components/PlanCard';
import MealCard from '../components/MealCard';

// Interfaces would be moved to a separate types file in a real app
interface Plan { 
  id: string; 
  name_en: string; 
  name_ar: string;
  description_en: string;
  description_ar: string;
  base_price_aed: number;
  discounted_price_aed: number | null;
  code: string;
}
interface MealImage {
  id: string;
  image_url: string;
  sort_order: number;
}
interface Meal { 
  id: string; 
  name_en: string; 
  name_ar: string;
  description_en: string;
  description_ar: string;
  nutritional_facts_en: string;
  nutritional_facts_ar: string;
  meal_images: MealImage[];
}

export default function HomePage() {
  const { lang } = useParams();
  const isArabic = lang === 'ar';

  const [plans, setPlans] = useState<Plan[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke('get-public-data');
        if (error) throw error;
        setPlans(data.plans);
        setMeals(data.meals);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen">Error: {error}</div>;
  }

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative bg-white overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center" 
          style={{ backgroundImage: "url('/images/herobackground.png')" }}
        ></div>
        <div className="absolute inset-0 bg-black opacity-50"></div>
        
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-start">
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
                <span className="block">{isArabic ? 'صحي ولذيذ.' : 'Healthy and Tasty.'}</span>
                <span className="block text-red-500">{isArabic ? 'تماماً مثل أكل البيت.' : 'Just like Home.'}</span>
              </h1>
              <p className="mt-4 text-lg text-gray-200 sm:mt-5 sm:text-xl md:mt-5 md:text-2xl">
                {isArabic ? 'شريكك لصحة أفضل خلال مسيرتك الأكاديمية' : 'Your Partner for a healthy Academia'}
              </p>
              <div className="mt-6 sm:mt-10 sm:flex sm:justify-center lg:justify-start">
                <div>
                  <a href="#plans" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium text-white bg-red-600 hover:bg-red-700 md:py-4 md:text-lg md:px-10">
                    {isArabic ? 'عرض الخطط' : 'View Plans'}
                  </a>
                </div>
              </div>
            </div>
            <div className="mt-12 lg:mt-0 flex justify-center">
              <img className="w-3/4 h-auto object-cover shadow-2xl" src="/images/mansaf.png" alt="Signature meal" />
            </div>
          </div>
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Plans Section */}
      <div id="plans" className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900">{isArabic ? 'اختر خطتك المثالية' : 'Choose Your Perfect Plan'}</h2>
        </div>
        <div className="mt-12 max-w-lg mx-auto grid gap-8 lg:grid-cols-2 lg:max-w-none">
          {plans.map(plan => (
            <PlanCard key={plan.id} plan={plan} isArabic={isArabic} />
          ))}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Meals Gallery Section */}
      <div className="bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900">{isArabic ? 'وجباتنا الشهية' : 'Our Delicious Meals'}</h2>
            <p className="mt-2 text-lg text-gray-500">{isArabic ? 'لمحة عما نقدمه في خطط الاشتراك لدينا.' : 'A taste of what we offer in our subscription plans.'}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {meals.map(meal => (
              <MealCard key={meal.id} meal={meal} isArabic={isArabic} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
