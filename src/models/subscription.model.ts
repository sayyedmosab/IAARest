
import { User } from './user.model';

export interface Subscription {
  id: string;
  userId: string;
  user: User;
  planId: string;
  planName: string;
  planPrice: number;
  startDate: string; // ISO string date
  endDate?: string;
  status: 'active' | 'pending' | 'cancelled' | 'rejected';
  deliveryAddress: {
    street: string;
    city: string;
    district: string;
  };
  paymentMethod: 'credit_card' | 'wire_transfer';
  paymentProof?: string; // base64 data URL
}
