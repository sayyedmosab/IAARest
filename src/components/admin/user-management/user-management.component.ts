import { Component, ChangeDetectionStrategy, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { SubscriptionService } from '../../../services/subscription.service';
import { AuthService } from '../../../services/auth.service';
import { User, CreateUserRequest, UpdateUserRequest, UserFilters, PaginatedUsersResponse, PaginationInfo } from '../../../models/user.model';
import { Subscription, SubscriptionStatus, SubscriptionStateTransitionRequest, SubscriptionStateHistory } from '../../../models/subscription.model';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementComponent implements OnInit, OnDestroy {
  private subscriptionService = inject(SubscriptionService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  // Signals for state management
  pendingSubscriptions = computed(() => this.subscriptionService.subscriptions().filter(s => s.status === 'pending_payment' || s.status === 'Pending_Approval'));
  allUsers = signal<User[]>([]);
  paginatedUsers = signal<PaginatedUsersResponse>({ users: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
  allSubscriptions = signal<Subscription[]>([]);
  selectedUsers = signal<string[]>([]);
  isLoading = signal(false);
  isCreatingUser = signal(false);
  isUpdatingUser = signal(false);
  isDeletingUser = signal(false);
  isTransitioningState = signal(false);
  isCreatingSubscription = signal(false);
  isUpdatingSubscription = signal(false);
  showCreateModal = signal(false);
  showEditModal = signal(false);
  showDeleteModal = signal(false);
  showStateTransitionModal = signal(false);
  showStateHistoryModal = signal(false);
  showCreateSubscriptionModal = signal(false);
  showEditSubscriptionModal = signal(false);
  currentUserToEdit = signal<User | null>(null);
  currentUserToDelete = signal<User | null>(null);
  currentSubscriptionToTransition = signal<Subscription | null>(null);
  currentSubscriptionForHistory = signal<Subscription | null>(null);
  currentUserForSubscription = signal<User | null>(null);
  currentSubscriptionToEdit = signal<Subscription | null>(null);
  subscriptionStateHistory = signal<SubscriptionStateHistory[]>([]);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  // Form controls
  searchControl = new FormControl('', { nonNullable: true });
  statusFilter = new FormControl<'all' | 'active' | 'pending_payment' | 'Pending_Approval' | 'New_Joiner' | 'Curious' | 'Frozen' | 'Exiting' | 'cancelled' | 'none'>('all', { nonNullable: true });
  roleFilter = new FormControl<'all' | 'admin' | 'student' | 'user'>('all', { nonNullable: true });
  currentPage = signal(1);
  pageSize = signal(10);

  // Forms
  createUserForm: FormGroup;
  editUserForm: FormGroup;
  stateTransitionForm: FormGroup;
  createSubscriptionForm: FormGroup;
  editSubscriptionForm: FormGroup;

  constructor() {
    this.createUserForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[+]?[\d\s\-\(\)]+$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      is_admin: [false],
      is_student: [true],
      status: ['active' as const],
      language_pref: ['en' as const],
      address: this.fb.group({
        street: ['', Validators.required],
        city: ['Sharjah', Validators.required],
        district: ['', Validators.required]
      })
    });

    this.editUserForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[+]?[\d\s\-\(\)]+$/)]],
      password: [''],
      is_admin: [false],
      is_student: [true],
      status: ['active' as const],
      language_pref: ['en' as const],
      address: this.fb.group({
        street: ['', Validators.required],
        city: ['Sharjah', Validators.required],
        district: ['', Validators.required]
      })
    });

    this.stateTransitionForm = this.fb.group({
      newState: ['', Validators.required],
      reason: ['']
    });

    this.createSubscriptionForm = this.fb.group({
      planId: ['', Validators.required],
      planName: ['', Validators.required],
      planPrice: [0, [Validators.required, Validators.min(0)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      paymentMethod: ['credit_card', Validators.required],
      autoRenewal: [false],
      notes: [''],
      deliveryAddress: this.fb.group({
        street: ['', Validators.required],
        city: ['Sharjah', Validators.required],
        district: ['', Validators.required]
      })
    });

    this.editSubscriptionForm = this.fb.group({
      planId: [''],
      planName: [''],
      planPrice: [0, [Validators.min(0)]],
      startDate: [''],
      endDate: [''],
      paymentMethod: ['credit_card'],
      autoRenewal: [false],
      notes: [''],
      deliveryAddress: this.fb.group({
        street: [''],
        city: [''],
        district: ['']
      })
    });
  }

  ngOnInit(): void {
    this.loadSubscriptions();
    this.loadUsersWithPagination();
    this.setupSearchDebouncer();
    this.setupFilterListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchDebouncer(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadUsersWithPagination();
      });
  }

  private setupFilterListeners(): void {
    this.statusFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadUsersWithPagination();
      });

    this.roleFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadUsersWithPagination();
      });
  }

  private loadUsers(): void {
    this.isLoading.set(true);
    this.error.set(null);
    
    this.authService.getAllUsers().subscribe({
      next: (res) => {
        if (res.success) {
          this.allUsers.set(res.data);
        } else {
          this.error.set(res.error || 'Failed to load users');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load users. Please try again.');
        this.isLoading.set(false);
        console.error('Load users error:', err);
      }
    });
  }

  private loadSubscriptions(): void {
    this.subscriptionService.getSubscriptions().subscribe({
      next: (res) => {
        if (res.success) {
          this.allSubscriptions.set(res.data);
        }
      },
      error: (err) => {
        console.error('Load subscriptions error:', err);
      }
    });
  }

  private loadUsersWithPagination(): void {
    this.isLoading.set(true);
    this.error.set(null);
    
    const filters: UserFilters = {
      search: this.searchControl.value || undefined,
      status: this.statusFilter.value === 'all' ? undefined : this.statusFilter.value,
      role: this.roleFilter.value === 'all' ? undefined : this.roleFilter.value
    };

    this.authService.getUsersWithPagination(this.currentPage(), this.pageSize(), filters).subscribe({
      next: (response) => {
        // Enhance users with subscription information
        const usersWithSubscriptionStatus = response.users.map(user => {
          const subscription = this.allSubscriptions().find(sub => sub.userId === user.id);
          return {
            ...user,
            subscriptionStatus: subscription ? subscription.status : 'none',
            planName: subscription?.planName,
            subscriptionEndDate: subscription?.endDate,
            paymentMethod: subscription?.paymentMethod,
            autoRenewal: subscription?.autoRenewal,
            completedCycles: subscription?.completedCycles,
            subscriptionId: subscription?.id
          };
        });
        
        this.paginatedUsers.set({
          ...response,
          users: usersWithSubscriptionStatus
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load users. Please try again.');
        this.isLoading.set(false);
        console.error('Load users with pagination error:', err);
      }
    });
  }

  // Enhanced subscription management
  approveSubscription(subscriptionId: string): void {
    this.isTransitioningState.set(true);
    this.subscriptionService.approveSubscription(subscriptionId).subscribe({
      next: () => {
        this.success.set('Subscription approved successfully');
        this.clearMessagesAfterDelay();
        this.isTransitioningState.set(false);
      },
      error: (err) => {
        this.error.set('Failed to approve subscription');
        this.clearMessagesAfterDelay();
        this.isTransitioningState.set(false);
        console.error('Approve subscription error:', err);
      }
    });
  }
  
  rejectSubscription(subscriptionId: string): void {
    this.isTransitioningState.set(true);
    this.subscriptionService.rejectSubscription(subscriptionId).subscribe({
      next: () => {
        this.success.set('Subscription rejected successfully');
        this.clearMessagesAfterDelay();
        this.isTransitioningState.set(false);
      },
      error: (err) => {
        this.error.set('Failed to reject subscription');
        this.clearMessagesAfterDelay();
        this.isTransitioningState.set(false);
        console.error('Reject subscription error:', err);
      }
    });
  }

  freezeSubscription(subscriptionId: string, reason?: string): void {
    this.isTransitioningState.set(true);
    this.subscriptionService.freezeSubscription(subscriptionId, reason).subscribe({
      next: () => {
        this.success.set('Subscription frozen successfully');
        this.clearMessagesAfterDelay();
        this.isTransitioningState.set(false);
        this.closeStateTransitionModal();
      },
      error: (err) => {
        this.error.set('Failed to freeze subscription');
        this.clearMessagesAfterDelay();
        this.isTransitioningState.set(false);
        console.error('Freeze subscription error:', err);
      }
    });
  }

  unfreezeSubscription(subscriptionId: string, reason?: string): void {
    this.isTransitioningState.set(true);
    this.subscriptionService.unfreezeSubscription(subscriptionId, reason).subscribe({
      next: () => {
        this.success.set('Subscription reactivated successfully');
        this.clearMessagesAfterDelay();
        this.isTransitioningState.set(false);
        this.closeStateTransitionModal();
      },
      error: (err) => {
        this.error.set('Failed to reactivate subscription');
        this.clearMessagesAfterDelay();
        this.isTransitioningState.set(false);
        console.error('Unfreeze subscription error:', err);
      }
    });
  }

  cancelSubscription(subscriptionId: string, reason?: string): void {
    this.isTransitioningState.set(true);
    this.subscriptionService.cancelSubscription(subscriptionId, reason).subscribe({
      next: () => {
        this.success.set('Subscription cancelled successfully');
        this.clearMessagesAfterDelay();
        this.isTransitioningState.set(false);
        this.closeStateTransitionModal();
      },
      error: (err) => {
        this.error.set('Failed to cancel subscription');
        this.clearMessagesAfterDelay();
        this.isTransitioningState.set(false);
        console.error('Cancel subscription error:', err);
      }
    });
  }

  openStateTransitionModal(subscription: Subscription): void {
    this.currentSubscriptionToTransition.set(subscription);
    this.showStateTransitionModal.set(true);
    this.stateTransitionForm.reset({
      newState: '',
      reason: ''
    });
  }

  closeStateTransitionModal(): void {
    this.showStateTransitionModal.set(false);
    this.currentSubscriptionToTransition.set(null);
    this.stateTransitionForm.reset();
  }

  executeStateTransition(): void {
    const subscription = this.currentSubscriptionToTransition();
    if (!subscription || !subscription.id) return;

    if (this.stateTransitionForm.invalid) {
      this.markFormGroupTouched(this.stateTransitionForm);
      return;
    }

    const { newState, reason } = this.stateTransitionForm.value;
    
    this.isTransitioningState.set(true);
    this.subscriptionService.transitionSubscriptionState(subscription.id, { newState, reason }).subscribe({
      next: () => {
        this.success.set(`Subscription transitioned to ${this.getSubscriptionStatusText(newState)} successfully`);
        this.clearMessagesAfterDelay();
        this.isTransitioningState.set(false);
        this.closeStateTransitionModal();
      },
      error: (err) => {
        this.error.set('Failed to transition subscription state');
        this.clearMessagesAfterDelay();
        this.isTransitioningState.set(false);
        console.error('State transition error:', err);
      }
    });
  }

  openStateHistoryModal(subscription: Subscription): void {
    this.currentSubscriptionForHistory.set(subscription);
    this.showStateHistoryModal.set(true);
    this.loadSubscriptionStateHistory(subscription.id);
  }

  closeStateHistoryModal(): void {
    this.showStateHistoryModal.set(false);
    this.currentSubscriptionForHistory.set(null);
    this.subscriptionStateHistory.set([]);
  }

  loadSubscriptionStateHistory(subscriptionId: string): void {
    this.subscriptionService.getSubscriptionStateHistory(subscriptionId).subscribe({
      next: (res) => {
        if (res.success) {
          this.subscriptionStateHistory.set(res.data);
        }
      },
      error: (err) => {
        console.error('Load state history error:', err);
        this.error.set('Failed to load subscription state history');
        this.clearMessagesAfterDelay();
      }
    });
  }

  getAvailableTransitions(currentStatus: SubscriptionStatus): SubscriptionStatus[] {
    const transitionMap: Record<SubscriptionStatus, SubscriptionStatus[]> = {
      'pending_payment': ['Pending_Approval', 'cancelled'],
      'Pending_Approval': ['Active', 'cancelled'],
      'New_Joiner': ['Active', 'Frozen', 'Exiting', 'cancelled'],
      'Curious': ['Active', 'Frozen', 'Exiting', 'cancelled'],
      'Active': ['Frozen', 'Exiting', 'cancelled'],
      'Frozen': ['Active', 'Exiting', 'cancelled'],
      'Exiting': ['cancelled', 'Active'],
      'cancelled': [],
      'expired': []
    };

    return transitionMap[currentStatus] || [];
  }

  // Legacy methods for backward compatibility
  approve(id: number): void {
    this.subscriptionService.approveSubscriptionLegacy(id).subscribe({
      next: () => {
        this.success.set('Subscription approved successfully');
        this.clearMessagesAfterDelay();
      },
      error: (err) => {
        this.error.set('Failed to approve subscription');
        this.clearMessagesAfterDelay();
        console.error('Approve subscription error:', err);
      }
    });
  }
  
  reject(id: number): void {
    this.subscriptionService.rejectSubscriptionLegacy(id).subscribe({
      next: () => {
        this.success.set('Subscription rejected successfully');
        this.clearMessagesAfterDelay();
      },
      error: (err) => {
        this.error.set('Failed to reject subscription');
        this.clearMessagesAfterDelay();
        console.error('Reject subscription error:', err);
      }
    });
  }

  // User CRUD operations
  openCreateModal(): void {
    this.showCreateModal.set(true);
    this.createUserForm.reset({
      is_admin: false,
      is_student: true,
      status: 'active',
      language_pref: 'en',
      address: {
        city: 'Sharjah'
      }
    });
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.createUserForm.reset();
  }

  createUser(): void {
    if (this.createUserForm.invalid) {
      this.markFormGroupTouched(this.createUserForm);
      return;
    }

    this.isCreatingUser.set(true);
    this.error.set(null);

    const formData = this.createUserForm.value;
    
    // Handle role selection
    let userData: CreateUserRequest = {
      ...formData
    };
    
    // If "User" role is selected (is_admin is null), set both flags to false
    if (userData.is_admin === null) {
      userData.is_admin = false;
      userData.is_student = false;
    }

    this.authService.createUser(userData).subscribe({
      next: (res) => {
        if (res.success) {
          this.success.set('User created successfully');
          this.closeCreateModal();
          this.loadUsersWithPagination();
          this.clearMessagesAfterDelay();
        } else {
          this.error.set('Failed to create user');
        }
        this.isCreatingUser.set(false);
      },
      error: (err) => {
        this.error.set('Failed to create user. Please try again.');
        this.isCreatingUser.set(false);
        console.error('Create user error:', err);
      }
    });
  }

  openEditModal(user: User): void {
    this.currentUserToEdit.set(user);
    this.showEditModal.set(true);
    
    // Determine the role for the form
    let isAdminValue: boolean | null;
    if (user.is_admin) {
      isAdminValue = true; // Admin
    } else if (user.is_student) {
      isAdminValue = false; // Student
    } else {
      isAdminValue = null; // User
    }
    
    this.editUserForm.patchValue({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: '',
      is_admin: isAdminValue,
      is_student: user.is_student || false,
      status: user.status || 'active',
      language_pref: user.language_pref || 'en',
      address: {
        street: user.address.street,
        city: user.address.city,
        district: user.address.district
      }
    });
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.currentUserToEdit.set(null);
    this.editUserForm.reset();
  }

  updateUser(): void {
    if (this.editUserForm.invalid) {
      this.markFormGroupTouched(this.editUserForm);
      return;
    }

    const user = this.currentUserToEdit();
    if (!user || !user.id) return;

    this.isUpdatingUser.set(true);
    this.error.set(null);

    const formData = this.editUserForm.value;
    
    // Handle role selection
    let userData: UpdateUserRequest = {
      ...formData
    };
    
    // If "User" role is selected (is_admin is null), set both flags to false
    if (userData.is_admin === null) {
      userData.is_admin = false;
      userData.is_student = false;
    }
    
    // Remove password if empty
    if (!userData.password) {
      delete userData.password;
    }

    this.authService.updateUser(user.id, userData).subscribe({
      next: (res) => {
        if (res.success) {
          this.success.set('User updated successfully');
          this.closeEditModal();
          this.loadUsersWithPagination();
          this.clearMessagesAfterDelay();
        } else {
          this.error.set('Failed to update user');
        }
        this.isUpdatingUser.set(false);
      },
      error: (err) => {
        this.error.set('Failed to update user. Please try again.');
        this.isUpdatingUser.set(false);
        console.error('Update user error:', err);
      }
    });
  }

  openDeleteModal(user: User): void {
    this.currentUserToDelete.set(user);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.currentUserToDelete.set(null);
  }

  deleteUser(): void {
    const user = this.currentUserToDelete();
    if (!user || !user.id) return;

    this.isDeletingUser.set(true);
    this.error.set(null);

    this.authService.deleteUser(user.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.success.set('User deleted successfully');
          this.closeDeleteModal();
          this.loadUsersWithPagination();
          this.clearMessagesAfterDelay();
        } else {
          this.error.set('Failed to delete user');
        }
        this.isDeletingUser.set(false);
      },
      error: (err) => {
        this.error.set('Failed to delete user. Please try again.');
        this.isDeletingUser.set(false);
        console.error('Delete user error:', err);
      }
    });
  }

  // Bulk operations
  toggleUserSelection(userId: string): void {
    const currentSelection = this.selectedUsers();
    if (currentSelection.includes(userId)) {
      this.selectedUsers.set(currentSelection.filter(id => id !== userId));
    } else {
      this.selectedUsers.set([...currentSelection, userId]);
    }
  }

  toggleAllUsersSelection(): void {
    const currentUsers = this.paginatedUsers().users;
    const currentSelection = this.selectedUsers();
    
    if (currentSelection.length === currentUsers.length) {
      this.selectedUsers.set([]);
    } else {
      this.selectedUsers.set(currentUsers.map(user => user.id!));
    }
  }

  isAllUsersSelected(): boolean {
    const currentUsers = this.paginatedUsers().users;
    const currentSelection = this.selectedUsers();
    return currentUsers.length > 0 && currentSelection.length === currentUsers.length;
  }

  isUserSelected(userId: string): boolean {
    return this.selectedUsers().includes(userId);
  }

  bulkUpdateStatus(status: 'active' | 'inactive' | 'suspended'): void {
    const userIds = this.selectedUsers();
    if (userIds.length === 0) return;

    this.isLoading.set(true);
    this.error.set(null);

    this.authService.bulkUpdateUsers(userIds, { status }).subscribe({
      next: (res) => {
        if (res.success) {
          this.success.set(`${userIds.length} users updated successfully`);
          this.selectedUsers.set([]);
          this.loadUsersWithPagination();
          this.clearMessagesAfterDelay();
        } else {
          this.error.set('Failed to update users');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to update users. Please try again.');
        this.isLoading.set(false);
        console.error('Bulk update users error:', err);
      }
    });
  }

  bulkTransitionSubscriptionState(newState: SubscriptionStatus, reason?: string): void {
    const selectedUserIds = this.selectedUsers();
    if (selectedUserIds.length === 0) return;

    // Find subscriptions for selected users
    const subscriptionsToTransition = this.allSubscriptions().filter(sub =>
      selectedUserIds.includes(sub.userId) &&
      this.getAvailableTransitions(sub.status).includes(newState)
    );

    if (subscriptionsToTransition.length === 0) {
      this.error.set('No eligible subscriptions found for state transition');
      this.clearMessagesAfterDelay();
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    const subscriptionIds = subscriptionsToTransition.map(sub => sub.id);
    
    this.subscriptionService.bulkTransitionSubscriptionStates(subscriptionIds, { newState, reason }).subscribe({
      next: (res) => {
        if (res.success) {
          this.success.set(`${subscriptionsToTransition.length} subscriptions transitioned to ${this.getSubscriptionStatusText(newState)} successfully`);
          this.selectedUsers.set([]);
          this.loadUsersWithPagination();
          this.clearMessagesAfterDelay();
        } else {
          this.error.set('Failed to transition subscriptions');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to transition subscriptions. Please try again.');
        this.isLoading.set(false);
        console.error('Bulk state transition error:', err);
      }
    });
  }

  bulkDelete(): void {
    const userIds = this.selectedUsers();
    if (userIds.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${userIds.length} users? This action cannot be undone.`)) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.authService.bulkDeleteUsers(userIds).subscribe({
      next: (res) => {
        if (res.success) {
          this.success.set(`${userIds.length} users deleted successfully`);
          this.selectedUsers.set([]);
          this.loadUsersWithPagination();
          this.clearMessagesAfterDelay();
        } else {
          this.error.set('Failed to delete users');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to delete users. Please try again.');
        this.isLoading.set(false);
        console.error('Bulk delete users error:', err);
      }
    });
  }

  // Pagination
  changePage(page: number): void {
    this.currentPage.set(page);
    this.loadUsersWithPagination();
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadUsersWithPagination();
  }

  // Utility methods
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private clearMessagesAfterDelay(): void {
    setTimeout(() => {
      this.success.set(null);
      this.error.set(null);
    }, 5000);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800';
      case 'Pending_Approval':
        return 'bg-orange-100 text-orange-800';
      case 'New_Joiner':
        return 'bg-blue-100 text-blue-800';
      case 'Curious':
        return 'bg-purple-100 text-purple-800';
      case 'Frozen':
        return 'bg-cyan-100 text-cyan-800';
      case 'Exiting':
        return 'bg-amber-100 text-amber-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'none':
        return 'bg-gray-100 text-gray-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getSubscriptionStatusText(status: string): string {
    switch (status) {
      case 'active':
        return 'Active';
      case 'pending_payment':
        return 'Pending Payment';
      case 'Pending_Approval':
        return 'Pending Approval';
      case 'New_Joiner':
        return 'New Joiner';
      case 'Curious':
        return 'Curious';
      case 'Frozen':
        return 'Frozen';
      case 'Exiting':
        return 'Exiting';
      case 'cancelled':
        return 'Cancelled';
      case 'none':
        return 'No Subscription';
      default:
        return status;
    }
  }

  getRoleBadgeClass(isAdmin: boolean, isStudent: boolean): string {
    if (isAdmin) return 'bg-purple-100 text-purple-800';
    if (isStudent) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  }

  getRoleText(isAdmin: boolean, isStudent: boolean): string {
    if (isAdmin) return 'Admin';
    if (isStudent) return 'Student';
    return 'User';
  }

  getPaymentMethodText(method: string): string {
    switch (method) {
      case 'credit_card':
        return 'Credit Card';
      case 'wire_transfer':
        return 'Wire Transfer';
      case 'other':
        return 'Other';
      default:
        return method || 'N/A';
    }
  }

  getStateIcon(status: string): string {
    switch (status) {
      case 'active':
      case 'Active':
        return '✓';
      case 'pending_payment':
      case 'Pending_Approval':
        return '⏳';
      case 'New_Joiner':
        return '🆕';
      case 'Curious':
        return '🔍';
      case 'Frozen':
        return '❄️';
      case 'Exiting':
        return '🚪';
      case 'cancelled':
        return '✕';
      default:
        return '•';
    }
  }

  getStateDescription(status: string): string {
    switch (status) {
      case 'pending_payment':
        return 'Waiting for payment confirmation';
      case 'Pending_Approval':
        return 'Signed up not through credit card (requires manual approval)';
      case 'New_Joiner':
        return 'Asked to auto-renew and after two cycles of successful payment becomes Active';
      case 'Curious':
        return 'Subscribed for one cycle and asked from start not to auto-renew (trying us out)';
      case 'Active':
        return 'Active subscriber with full benefits';
      case 'Frozen':
        return 'Asked to put account on hold (no delivery or payments until reactivating)';
      case 'Exiting':
        return 'Submitted cancellation and service rendered till the paid cycle ends';
      case 'cancelled':
        return 'No liabilities and no activity';
      default:
        return status;
    }
  }

  // Subscription management methods
  openCreateSubscriptionModal(user: User): void {
    this.currentUserForSubscription.set(user);
    this.showCreateSubscriptionModal.set(true);
    this.createSubscriptionForm.reset({
      planId: '',
      planName: '',
      planPrice: 0,
      startDate: '',
      endDate: '',
      paymentMethod: 'credit_card',
      autoRenewal: false,
      notes: '',
      deliveryAddress: {
        street: user.address.street,
        city: user.address.city,
        district: user.address.district
      }
    });
  }

  closeCreateSubscriptionModal(): void {
    this.showCreateSubscriptionModal.set(false);
    this.currentUserForSubscription.set(null);
    this.createSubscriptionForm.reset();
  }

  createSubscription(): void {
    if (this.createSubscriptionForm.invalid) {
      this.markFormGroupTouched(this.createSubscriptionForm);
      return;
    }

    const user = this.currentUserForSubscription();
    if (!user || !user.id) return;

    this.isCreatingSubscription.set(true);
    this.error.set(null);

    const formData = this.createSubscriptionForm.value;
    const subscriptionData = {
      userId: user.id,
      ...formData
    };

    this.subscriptionService.addSubscription(subscriptionData).subscribe({
      next: () => {
        this.success.set('Subscription created successfully');
        this.closeCreateSubscriptionModal();
        this.loadSubscriptions();
        this.loadUsersWithPagination();
        this.clearMessagesAfterDelay();
        this.isCreatingSubscription.set(false);
      },
      error: (err) => {
        this.error.set('Failed to create subscription');
        this.clearMessagesAfterDelay();
        this.isCreatingSubscription.set(false);
        console.error('Create subscription error:', err);
      }
    });
  }

  openEditSubscriptionModal(subscription: Subscription): void {
    this.currentSubscriptionToEdit.set(subscription);
    this.showEditSubscriptionModal.set(true);
    this.editSubscriptionForm.patchValue({
      planId: subscription.planId,
      planName: subscription.planName,
      planPrice: subscription.planPrice,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      paymentMethod: subscription.paymentMethod,
      autoRenewal: subscription.autoRenewal,
      notes: subscription.notes || '',
      deliveryAddress: {
        street: subscription.deliveryAddress.street,
        city: subscription.deliveryAddress.city,
        district: subscription.deliveryAddress.district
      }
    });
  }

  closeEditSubscriptionModal(): void {
    this.showEditSubscriptionModal.set(false);
    this.currentSubscriptionToEdit.set(null);
    this.editSubscriptionForm.reset();
  }

  updateSubscription(): void {
    if (this.editSubscriptionForm.invalid) {
      this.markFormGroupTouched(this.editSubscriptionForm);
      return;
    }

    const subscription = this.currentSubscriptionToEdit();
    if (!subscription || !subscription.id) return;

    this.isUpdatingSubscription.set(true);
    this.error.set(null);

    const formData = this.editSubscriptionForm.value;
    const updateData = {
      ...formData
    };

    this.subscriptionService.updateSubscription(subscription.id, updateData).subscribe({
      next: () => {
        this.success.set('Subscription updated successfully');
        this.closeEditSubscriptionModal();
        this.loadSubscriptions();
        this.loadUsersWithPagination();
        this.clearMessagesAfterDelay();
        this.isUpdatingSubscription.set(false);
      },
      error: (err) => {
        this.error.set('Failed to update subscription');
        this.clearMessagesAfterDelay();
        this.isUpdatingSubscription.set(false);
        console.error('Update subscription error:', err);
      }
    });
  }

  // Enhanced utility methods
  clearAllMessages(): void {
    this.success.set(null);
    this.error.set(null);
  }

  refreshData(): void {
    this.loadSubscriptions();
    this.loadUsersWithPagination();
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.statusFilter.setValue('all');
    this.roleFilter.setValue('all');
    this.currentPage.set(1);
    this.loadUsersWithPagination();
  }

  // Helper methods for template
  getSubscriptionCountByStatus(status: SubscriptionStatus): number {
    return this.allSubscriptions().filter(s => s.status === status).length;
  }

  getUserSubscription(user: any): Subscription | null {
    if (!user.subscriptionId) return null;
    return this.allSubscriptions().find(s => s.id === user.subscriptionId) || null;
  }
}
