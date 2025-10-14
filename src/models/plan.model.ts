

export interface Plan {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  name: string; // For backward compatibility
  arName?: string; // For backward compatibility
  description?: string; // For backward compatibility
  arDescription?: string; // For backward compatibility
  meals_per_day: number;
  delivery_days: number;
  duration_label: string;
  base_price_aed: number;
  pricePerMonth: number; // For backward compatibility
  originalPricePerMonth?: number; // For backward compatibility
  position_note_en?: string;
  position_note_ar?: string;
  features?: string[]; // For backward compatibility
  arFeatures?: string[]; // For backward compatibility
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  discounted_price_aed?: number;
}
