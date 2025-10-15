
export interface User {
  id?: string;
  name: string;
  email: string;
  phone: string;
  password?: string; // Password should not always be present on user objects
  is_admin?: boolean;
  is_student?: boolean;
  status?: 'active' | 'inactive' | 'suspended';
  created_at?: string;
  updated_at?: string;
  language_pref?: 'en' | 'ar';
  address: {
    street: string;
    city: string;
    district: string;
  };
}

export interface CreateUserRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  is_admin?: boolean;
  is_student?: boolean;
  status?: 'active' | 'inactive' | 'suspended';
  language_pref?: 'en' | 'ar';
  address: {
    street: string;
    city: string;
    district: string;
  };
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  is_admin?: boolean;
  is_student?: boolean;
  status?: 'active' | 'inactive' | 'suspended';
  language_pref?: 'en' | 'ar';
  address?: {
    street?: string;
    city?: string;
    district?: string;
  };
}

export interface UserFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'pending_payment' | 'Pending_Approval' | 'New_Joiner' | 'Curious' | 'Frozen' | 'Exiting' | 'cancelled' | 'none' | 'all';
  role?: 'admin' | 'student' | 'user' | 'all';
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedUsersResponse {
  users: User[];
  pagination: PaginationInfo;
}
