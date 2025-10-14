
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-ar-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './ar-login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArLoginComponent {
  authService = inject(AuthService);
  router: Router = inject(Router);
  // FIX: Corrected the type used in `inject()` from `Route` to `ActivatedRoute`.
  route: ActivatedRoute = inject(ActivatedRoute);
  fb: FormBuilder = inject(FormBuilder);
  
  error = signal<string | null>(null);

  loginForm = this.fb.group({
    email: ['student@example.com', [Validators.required, Validators.email]],
    password: ['password', Validators.required]
  });

  constructor() {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }

  ngOnDestroy() {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      const success = this.authService.login(email!, password!);
      if (success) {
        // Keep the user in the Arabic version if they came from there
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/ar-home';
        this.router.navigateByUrl(returnUrl);
      } else {
        this.error.set('البريد الإلكتروني أو كلمة المرور غير صالحة.');
      }
    }
  }
}
