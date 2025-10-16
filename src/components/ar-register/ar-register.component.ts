
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { AR_SHARJAH_DISTRICTS } from '../../constants/ar-sharjah-districts';

@Component({
  selector: 'app-ar-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './ar-register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArRegisterComponent {
  authService = inject(AuthService);
  router: Router = inject(Router);
  fb: FormBuilder = inject(FormBuilder);
  
  error = signal<string | null>(null);
  districts = AR_SHARJAH_DISTRICTS;

  registerForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    street: ['', Validators.required],
    district: ['', Validators.required],
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
    if (this.registerForm.valid) {
      this.error.set(null);
      const formValue = this.registerForm.value;
      const newUser: User = {
        name: formValue.name!,
        email: formValue.email!,
        phone: formValue.phone!,
        password: formValue.password!,
        address: {
          street: formValue.street!,
          city: 'Sharjah',
          district: formValue.district!
        }
      };

      this.authService.register(newUser).subscribe({
        next: (response) => {
          if (response.success) {
            this.router.navigate(['/ar-home']);
          } else {
            this.error.set(response.error || 'فشل التسجيل. يرجى المحاولة مرة أخرى.');
          }
        },
        error: (err) => {
          this.error.set(err.error?.error || 'يوجد حساب بهذا البريد الإلكتروني بالفعل.');
        }
      });
    }
  }
}
