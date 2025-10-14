import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import MealForm from '../../components/admin/MealForm';

// Define interfaces
interface Meal {
  id: string;
  name_en: string;
  // ... other fields
}

export default function MealManagementPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  const fetchMeals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-all-meals-admin');
      if (error) throw error;
      setMeals(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeals();
  }, []);

  const handleDelete = async (mealId: string) => {
    if (window.confirm('Are you sure you want to delete this meal?')) {
      try {
        await supabase.functions.invoke('delete-meal', { body: { mealId } });
        fetchMeals();
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    }
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      await supabase.functions.invoke('update-meal', { body: formData });
      setIsModalOpen(false);
      fetchMeals();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const openModal = (meal: Meal | null) => {
    setEditingMeal(meal);
    setIsModalOpen(true);
  };

  if (loading) return <div>Loading meals...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-semibold text-gray-700">Meal Management</h3>
        <button onClick={() => openModal(null)} className="px-4 py-2 bg-red-600 text-white">
          Add New Meal
        </button>
      </div>
      
      <div className="mt-6 bg-white shadow-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50"><tr><th>Name</th><th>Actions</th></tr></thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {meals.map(meal => (
              <tr key={meal.id}>
                <td className="p-4">{meal.name_en}</td>
                <td className="p-4 space-x-2">
                  <button onClick={() => openModal(meal)} className="text-red-600">Edit</button>
                  <button onClick={() => handleDelete(meal.id)} className="text-gray-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <MealForm 
          meal={editingMeal} 
          onSubmit={handleFormSubmit} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
}