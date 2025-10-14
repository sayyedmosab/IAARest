
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Define interfaces for the data structures
interface Meal {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  meal_images: { image_url: string }[];
}

interface ScheduledDay {
  date: string;
  lunch: Meal | null;
  dinner: Meal | null;
}

export default function MenuPage() {
  const { lang } = useParams();
  const isArabic = lang === 'ar';

  const [schedule, setSchedule] = useState<ScheduledDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke('get-menu-schedule');
        if (error) throw error;
        setSchedule(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen">Error: {error}</div>;
  }

  return (
    <div className="bg-white py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900">{isArabic ? 'قائمة الطعام القادمة' : 'Upcoming Menu'}</h2>
          <p className="mt-2 text-lg text-gray-500">{isArabic ? 'إليك ما يتم طهيه للأسبوعين القادمين.' : "Here's what's cooking for the next two weeks."}</p>
        </div>

        <div className="space-y-8">
          {schedule.map(day => (
            <div key={day.date} className="bg-gray-50 border p-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">{formatDate(day.date)}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lunch */}
                <div className="bg-white p-4 shadow-sm border">
                  <h4 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-2">{isArabic ? 'الغداء' : 'Lunch'}</h4>
                  {day.lunch ? (
                    <div className="flex gap-4">
                      <img src={`/images/${day.lunch.meal_images[0]?.image_url}`} alt={isArabic ? day.lunch.name_ar : day.lunch.name_en} className="w-24 h-24 object-cover flex-shrink-0" />
                      <div>
                        <h5 className="font-bold text-gray-900">{isArabic ? day.lunch.name_ar : day.lunch.name_en}</h5>
                        <p className="text-sm text-gray-600 mt-1">{isArabic ? day.lunch.description_ar : day.lunch.description_en}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">{isArabic ? 'لا يوجد غداء مجدول' : 'No Lunch Scheduled'}</p>
                  )}
                </div>
                {/* Dinner */}
                <div className="bg-white p-4 shadow-sm border">
                  <h4 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-2">{isArabic ? 'العشاء' : 'Dinner'}</h4>
                  {day.dinner ? (
                     <div className="flex gap-4">
                      <img src={`/images/${day.dinner.meal_images[0]?.image_url}`} alt={isArabic ? day.dinner.name_ar : day.dinner.name_en} className="w-24 h-24 object-cover flex-shrink-0" />
                      <div>
                        <h5 className="font-bold text-gray-900">{isArabic ? day.dinner.name_ar : day.dinner.name_en}</h5>
                        <p className="text-sm text-gray-600 mt-1">{isArabic ? day.dinner.description_ar : day.dinner.description_en}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">{isArabic ? 'لا يوجد عشاء مجدول' : 'No Dinner Scheduled'}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
