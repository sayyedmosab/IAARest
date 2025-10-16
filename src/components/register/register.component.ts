
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { SHARJAH_DISTRICTS } from '../../constants/sharjah-districts';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {
  authService = inject(AuthService);
  router: Router = inject(Router);
  fb: FormBuilder = inject(FormBuilder);
  
  error = signal<string | null>(null);
  districts = SHARJAH_DISTRICTS;

  registerForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    street: ['', Validators.required],
    district: ['', Validators.required],
  });

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
            this.router.navigate(['/home']);
          } else {
            this.error.set(response.error || 'Registration failed. Please try again.');
          }
        },
        error: (err) => {
          this.error.set(err.error?.error || 'An account with this email already exists.');
        }
      });
    }
  }
}
