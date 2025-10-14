
import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { UpcomingMenuComponent } from './components/upcoming-menu/upcoming-menu.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { AdminLayoutComponent } from './components/admin/admin-layout/admin-layout.component';
import { DashboardComponent } from './components/admin/dashboard/dashboard.component';
import { UserManagementComponent } from './components/admin/user-management/user-management.component';
import { MenuSchedulerComponent } from './components/admin/menu-scheduler/menu-scheduler.component';
import { MealManagementComponent } from './components/admin/meal-management/meal-management.component';
import { PlanManagementComponent } from './components/admin/plan-management/plan-management.component';
import { DailyOrdersComponent } from './components/admin/daily-orders/daily-orders.component';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

// Arabic Components
import { ArHomeComponent } from './components/ar-home/ar-home.component';
import { ArMenuComponent } from './components/ar-menu/ar-menu.component';
import { ArLoginComponent } from './components/ar-login/ar-login.component';
import { ArRegisterComponent } from './components/ar-register/ar-register.component';
import { ArCheckoutComponent } from './components/ar-checkout/ar-checkout.component';

export const routes: Routes = [
  // Default to Arabic
  { path: '', redirectTo: 'ar-home', pathMatch: 'full' },
  
  // Arabic Routes (Primary)
  { path: 'ar-home', component: ArHomeComponent },
  { path: 'ar-menu', component: ArMenuComponent },
  { path: 'ar-login', component: ArLoginComponent },
  { path: 'ar-register', component: ArRegisterComponent },
  { path: 'ar-checkout/:planId', component: ArCheckoutComponent, canActivate: [authGuard] },
  
  // English Routes (Secondary)
  { path: 'en-home', component: HomeComponent },
  { path: 'home', component: HomeComponent }, // Keep for backward compatibility
  { path: 'en-menu', component: UpcomingMenuComponent },
  { path: 'menu', component: UpcomingMenuComponent }, // Keep for backward compatibility
  { path: 'en-login', component: LoginComponent },
  { path: 'login', component: LoginComponent }, // Keep for backward compatibility
  { path: 'en-register', component: RegisterComponent },
  { path: 'register', component: RegisterComponent }, // Keep for backward compatibility
  { path: 'en-checkout/:planId', component: CheckoutComponent, canActivate: [authGuard] },
  { path: 'checkout/:planId', component: CheckoutComponent, canActivate: [authGuard] }, // Keep for backward compatibility
  
  // Admin Routes (English only)
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'users', component: UserManagementComponent },
      { path: 'daily-orders', component: DailyOrdersComponent },
      { path: 'menu-scheduler', component: MenuSchedulerComponent },
      { path: 'meals', component: MealManagementComponent },
      { path: 'plans', component: PlanManagementComponent },
    ]
  },
  { path: '**', redirectTo: 'ar-home' } // Wildcard route for a 404-like redirect to Arabic
];
