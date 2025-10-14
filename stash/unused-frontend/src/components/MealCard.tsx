import { useState } from 'react';

// REQ-DOC: This component displays a single meal with a tabbed interface
// for its details, including the newly added ingredients list.

interface MealImage {
  id: string;
  image_url: string;
  sort_order: number;
}

interface Ingredient {
  name_en: string;
  name_ar: string;
}

interface MealIngredient {
  weight_g: number;
  ingredients: Ingredient;
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
  meal_ingredients: MealIngredient[];
}

interface MealCardProps {
  meal: Meal;
  isArabic: boolean;
}

type MealTab = 'description' | 'ingredients' | 'nutrition';

export default function MealCard({ meal, isArabic }: MealCardProps) {
  const [activeTab, setActiveTab] = useState<MealTab>('description');

  const mainImage = meal.meal_images?.find(img => img.sort_order === 1) || { image_url: '' };

  return (
    <div className="bg-white shadow-lg overflow-hidden flex flex-col">
      <h3 className="text-lg font-semibold text-gray-800 p-4 text-center border-b">{isArabic ? meal.name_ar : meal.name_en}</h3>
      <div className="aspect-w-3 aspect-h-2">
        <img className="object-cover w-full h-48" src={`/images/${mainImage.image_url}`} alt={isArabic ? meal.name_ar : meal.name_en} />
      </div>
      <div className="flex-grow flex flex-col">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex justify-center" aria-label="Tabs">
            <button 
              onClick={() => setActiveTab('description')} 
              className={`w-1/3 py-3 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === 'description' 
                ? 'border-red-500 text-red-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              {isArabic ? 'الوصف' : 'Description'}
            </button>
            <button 
              onClick={() => setActiveTab('ingredients')} 
              className={`w-1/3 py-3 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === 'ingredients' 
                ? 'border-red-500 text-red-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              {isArabic ? 'المكونات' : 'Ingredients'}
            </button>
            <button 
              onClick={() => setActiveTab('nutrition')} 
              className={`w-1/3 py-3 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === 'nutrition' 
                ? 'border-red-500 text-red-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              {isArabic ? 'التغذية' : 'Nutrition'}
            </button>
          </nav>
        </div>
        <div className="p-4 flex-grow">
          {activeTab === 'description' && <p className="text-sm text-gray-600">{isArabic ? meal.description_ar : meal.description_en}</p>}
          {activeTab === 'ingredients' && (
            <ul className="text-sm text-gray-600 list-disc list-inside">
              {meal.meal_ingredients.map(ing => (
                <li key={ing.ingredients.name_en}>
                  {isArabic ? ing.ingredients.name_ar : ing.ingredients.name_en} ({ing.weight_g}g)
                </li>
              ))}
            </ul>
          )}
          {activeTab === 'nutrition' && <p className="text-sm text-gray-600">{isArabic ? meal.nutritional_facts_ar : meal.nutritional_facts_en}</p>}
        </div>
      </div>
    </div>
  );
}