
import { useForm, useFieldArray } from 'react-hook-form';

// A simplified interface for the form
interface MealFormData {
  id?: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  // ... other fields
}

interface MealFormProps {
  meal?: MealFormData | null;
  onSubmit: (data: MealFormData) => void;
  onClose: () => void;
}

export default function MealForm({ meal, onSubmit, onClose }: MealFormProps) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<MealFormData>({
    defaultValues: meal || {},
  });

  // TODO: Implement useFieldArray for ingredients

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 border-b">
            <h4 className="text-lg font-semibold">{meal ? 'Edit Meal' : 'Add New Meal'}</h4>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label>Name (EN)</label>
                <input {...register('name_en', { required: true })} className="w-full border-gray-300" />
                {errors.name_en && <span className="text-red-500">This field is required</span>}
              </div>
              <div>
                <label>Name (AR)</label>
                <input {...register('name_ar', { required: true })} className="w-full border-gray-300" />
                 {errors.name_ar && <span className="text-red-500">This field is required</span>}
              </div>
            </div>
             <div>
                <label>Description (EN)</label>
                <textarea {...register('description_en')} className="w-full border-gray-300" />
              </div>
               <div>
                <label>Description (AR)</label>
                <textarea {...register('description_ar')} className="w-full border-gray-300" />
              </div>
            {/* TODO: Add fields for ingredients, images, etc. */}
          </div>
          <div className="p-4 bg-gray-50 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white border text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-red-600 text-white text-sm">Save Meal</button>
          </div>
        </form>
      </div>
    </div>
  );
}
