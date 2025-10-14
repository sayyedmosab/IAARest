
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../constants/api';

interface PrepListItem {
  name: string;
  quantity: number;
  unit: 'g' | 'ml' | 'pcs';
}

interface DailyPrep {
  date: string; // Keep as string for easier debugging
  mealsToPrepare: { mealName: string, count: number }[];
  rawMaterials: PrepListItem[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Component({
  selector: 'app-daily-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-orders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DailyOrdersComponent {
  private http = inject(HttpClient);
  private apiUrl = API_BASE_URL;
  
  private _dailyPrepData = signal<DailyPrep[]>([]);
  dailyPrepData = this._dailyPrepData.asReadonly();
  
  isLoading = signal(true);
  error = signal<string | null>(null);

  constructor() {
    this.loadDailyOrders();
  }

  private loadDailyOrders() {
    this.isLoading.set(true);
    this.error.set(null);
    
    console.log('[DEBUG] Loading daily orders from:', `${this.apiUrl}/admin/daily-orders`);
    
    // Use withCredentials to include cookies for authentication
    this.http.get<ApiResponse<DailyPrep[]>>(`${this.apiUrl}/admin/daily-orders`, {
      withCredentials: true
    }).subscribe({
      next: (res) => {
        console.log('[DEBUG] Daily orders API response:', res);
        if (res.success && res.data) {
          this._dailyPrepData.set(res.data);
          console.log('[DEBUG] Daily orders data set:', res.data.length, 'days');
          
          // Debug: Log first day data structure
          if (res.data.length > 0) {
            console.log('[DEBUG] First day data:', res.data[0]);
          }
        } else {
          console.error('[DEBUG] Daily orders API error:', res);
          this.error.set(res.message || 'Failed to load daily orders');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('[DEBUG] Daily orders HTTP error:', err);
        this.error.set(`Failed to load daily orders: ${err.message || 'Unknown error'}`);
        this.isLoading.set(false);
      }
    });
  }

  formatQuantity(quantity: number, unit: string): string {
    if ((unit === 'g' || unit === 'ml') && quantity >= 1000) {
      return `${(quantity / 1000).toFixed(2)} k${unit === 'g' ? 'g' : 'l'}`;
    }
    return `${quantity} ${unit}`;
  }
}
