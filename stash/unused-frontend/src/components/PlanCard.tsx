// REQ-DOC: This component displays a single subscription plan.
// It uses the new mascot images and does not include the 'Most Popular' feature.

interface Plan {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  base_price_aed: number;
  discounted_price_aed: number | null;
  code: string;
  // TODO: Add features array once available from API
}

interface PlanCardProps {
  plan: Plan;
  isArabic: boolean;
}

export default function PlanCard({ plan, isArabic }: PlanCardProps) {
  const imageUrl = `/images/${plan.code}.png`;

  return (
    <div className="flex flex-col shadow-lg overflow-hidden">
      <div className="flex-shrink-0">
        <img className="h-48 w-full object-contain bg-gray-100 p-4" src={imageUrl} alt={isArabic ? plan.name_ar : plan.name_en} />
      </div>
      <div className="flex-1 bg-white p-6 flex flex-col justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-red-600">
            {isArabic ? plan.name_ar : plan.name_en}
          </p>
          <div className="block mt-2">
            <p className="text-xl font-semibold text-gray-900">{isArabic ? plan.description_ar : plan.description_en}</p>
            <div className="mt-3 flex items-baseline text-gray-900">
              <span className="text-4xl font-extrabold tracking-tight">{isArabic ? 'د.إ' : 'AED'} {plan.discounted_price_aed || plan.base_price_aed}</span>
              {plan.discounted_price_aed && (
                <span className="mx-2 text-xl font-medium text-gray-500 line-through">{isArabic ? 'د.إ' : 'AED'} {plan.base_price_aed}</span>
              )}
              <span className="text-xl font-semibold">/{isArabic ? 'شهرياً' : 'month'}</span>
            </div>
            {/* TODO: Render features list */}
          </div>
        </div>
        <div className="mt-6">
          <a href={`/${isArabic ? 'ar' : 'en'}/checkout/${plan.id}`} className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium text-white bg-red-600 hover:bg-red-700">
            {isArabic ? 'اشترك الآن' : 'Subscribe Now'}
          </a>
        </div>
      </div>
    </div>
  );
}