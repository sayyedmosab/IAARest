
import { User } from './user.model';

export type SubscriptionStatus =
  | 'pending_payment'
  | 'Pending_Approval'
  | 'New_Joiner'
  | 'Curious'
  | 'Active'
  | 'Frozen'
  | 'Exiting'
  | 'cancelled'
  | 'expired';

export type PaymentMethod = 'credit_card' | 'wire_transfer' | 'other';

export interface Subscription {
  id: string;
  userId: string;
  user: User;
  planId: string;
  planName: string;
  planPrice: number;
  startDate: string; // ISO string date
  endDate?: string;
  status: SubscriptionStatus;
  deliveryAddress: {
    street: string;
    city: string;
    district: string;
  };
  paymentMethod: PaymentMethod;
  autoRenewal: boolean;
  completedCycles: number;
  notes?: string;
  paymentProof?: string; // base64 data URL
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionStateHistory {
  id: string;
  subscriptionId: string;
  previousState?: SubscriptionStatus;
  newState: SubscriptionStatus;
  reason?: string;
  changedBy?: string;
  createdAt: string;
}

export interface CreateSubscriptionRequest {
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
  priceCharged: number;
  paymentMethod: PaymentMethod;
  autoRenewal: boolean;
  notes?: string;
}

export interface UpdateSubscriptionRequest {
  status?: SubscriptionStatus;
  autoRenewal?: boolean;
  notes?: string;
}

export interface SubscriptionStateTransitionRequest {
  newState: SubscriptionStatus;
  reason?: string;
}
