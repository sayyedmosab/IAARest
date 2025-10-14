# Dashboard Calendar Fixes Context

## Current Issues Identified (2025-10-14)

### 1. Calendar Data Logic Problems
- **Issue**: Impossible lunch/dinner distribution showing 5 lunch, 1 dinner alternating daily
- **Root Cause**: Backend calendar logic is incorrectly distributing meals
- **Expected Behavior**: Based on current meal plans:
  - FUEL plan: 1 meal per day
  - FOCUS plan: 2 meals per day (lunch + dinner)
  - FLEX plan: 1 meal per day
- **Current Subscriber Distribution**:
  - Active subscribers: 5 total
    - FUEL: 2 subscribers × 1 meal = 2 meals/day
    - FOCUS: 2 subscribers × 2 meals = 4 meals/day
    - FLEX: 1 subscriber × 1 meal = 1 meal/day
  - Total: 7 meals per day should be distributed realistically

### 2. Calendar View Regression
- **Issue**: Calendar reduced from full month view to only 1 week
- **Previous State**: Full month calendar was working and visually acceptable
- **Current State**: Only shows 7 days, which is insufficient for planning
- **User Requirement**: Restore to full month view

### 3. Visual Design Degradation
- **Issue**: Current calendar design is "horrible" compared to previous version
- **User Feedback**: Previous calendar was "ok" and just needed enhancement
- **Current State**: Visual design is worse than before
- **Requirement**: Improve visual design beyond previous version

### 4. Missing Interactivity
- **Issue**: Clicking on calendar days does not update the daily summary
- **Expected Behavior**: Day selection should update the "Daily Summary" panel
- **Current State**: No interaction between calendar and summary panel

## Technical Context

### Backend API Structure
- Endpoint: `/api/admin/dashboard`
- Returns: `DashboardData` interface with `calendar` array
- Calendar data structure:
```typescript
{
  date: string;
  dayName: string;
  dayNumber: number;
  lunchCount: number;
  dinnerCount: number;
  totalMeals: number;
}
```

### Frontend Components
- Dashboard Component: `src/components/admin/dashboard/dashboard.component.ts`
- Template: `src/components/admin/dashboard/dashboard.component.html`
- Service: `src/services/subscription.service.ts`

### Current Meal Plan Configuration
- FUEL: 1 meal per day (lunch OR dinner based on calendar day parity)
- FOCUS: 2 meals per day (lunch AND dinner)
- FLEX: 1 meal per day (lunch OR dinner based on calendar day parity)

### Subscriber Data (as of 2025-10-14)
- Total Active: 5 subscribers
- FUEL: 2 subscribers
- FOCUS: 2 subscribers  
- FLEX: 1 subscriber
- Expected daily meals: 7 total (2+4+1)

## Required Fixes

### 1. Backend Calendar Logic Fix
- Fix meal distribution algorithm in `backend/src/routes/admin.ts`
- Ensure realistic lunch/dinner distribution based on plan types
- Account for 1-meal plans (FUEL, FLEX) vs 2-meal plans (FOCUS)

### 2. Frontend Calendar Restoration
- Extend calendar from 7 days to full month (30-31 days)
- Improve visual design beyond previous version
- Add proper spacing, colors, and typography

### 3. Interactive Functionality
- Implement day click handlers
- Update daily summary panel based on selected day
- Add visual feedback for selected day

### 4. Data Validation
- Verify calendar data matches actual meal plan configurations
- Test with current subscriber distribution
- Ensure totals are mathematically correct

## Implementation Priority
1. Fix backend calendar data logic (most critical)
2. Restore full month view
3. Improve visual design
4. Add interactivity

## Testing Requirements
- Verify meal distribution matches plan types
- Test day selection updates daily summary
- Validate visual design improvements
- Ensure full month navigation works properly