
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  // FIX: Explicitly type the injected Router to resolve type inference issue.
  const router: Router = inject(Router);

  if (authService.currentUser()) {
    return true;
  } else {
    // Redirect to the login page, saving the intended URL
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
};
