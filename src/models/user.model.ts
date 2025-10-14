
export interface User {
  name: string;
  email: string;
  phone: string;
  password?: string; // Password should not always be present on user objects
  is_admin?: boolean;
  address: {
    street: string;
    city: string;
    district: string;
  };
}
