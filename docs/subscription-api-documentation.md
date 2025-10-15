# Subscription API Documentation

## Overview

This document provides comprehensive technical documentation for the enhanced subscription management API endpoints. The API supports the new subscription model with 7 distinct states and provides endpoints for state transitions, history tracking, and bulk operations.

## Base URL
```
https://api.ibnexp2.com
```

## Authentication
All API endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Subscription State Management Endpoints

### 1. Get Subscription State History

**Endpoint**: `GET /api/subscriptions/{subscriptionId}/history`

**Description**: Retrieves the complete history of state transitions for a specific subscription.

**Parameters**:
- `subscriptionId` (path): The unique identifier of the subscription

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "subscriptionId": "sub_123456",
      "previousState": "New_Joiner",
      "newState": "Active",
      "reason": "Completed 2 successful payment cycles",
      "changedBy": "system",
      "createdAt": "2025-10-15T10:30:00Z"
    },
    {
      "id": 2,
      "subscriptionId": "sub_123456",
      "previousState": "pending_payment",
      "newState": "New_Joiner",
      "reason": "Successful payment with auto-renewal",
      "changedBy": "system",
      "createdAt": "2025-09-15T14:20:00Z"
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 50
  }
}
```

**Error Responses**:
- `404`: Subscription not found
- `403`: Insufficient permissions

### 2. Transition Subscription State

**Endpoint**: `POST /api/subscriptions/{subscriptionId}/transition`

**Description**: Manually transitions a subscription to a new state with proper validation and audit logging.

**Parameters**:
- `subscriptionId` (path): The unique identifier of the subscription

**Request Body**:
```json
{
  "newState": "Active",
  "reason": "Admin approval after payment confirmation",
  "effectiveDate": "2025-10-15T00:00:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "subscriptionId": "sub_123456",
    "previousState": "Pending_Approval",
    "newState": "Active",
    "transitionedAt": "2025-10-15T14:30:00Z",
    "transitionedBy": "admin_123",
    "reason": "Admin approval after payment confirmation"
  },
  "message": "Subscription state transitioned successfully"
}
```

**Error Responses**:
- `400`: Invalid state transition
- `404`: Subscription not found
- `403`: Insufficient permissions
- `422`: Validation error

**State Transition Validation Rules**:
- Pending_Approval → Active (admin only)
- Active → Frozen (admin or customer)
- Frozen → Active (admin or customer)
- New_Joiner → Active (system only, after 2 cycles)
- Curious → Exiting (system only, after cycle end)
- Exiting → Cancelled (system only, after end_date)
- Any state → Cancelled (admin or system)

### 3. Get Available State Transitions

**Endpoint**: `GET /api/subscriptions/{subscriptionId}/available-transitions`

**Description**: Returns the list of valid state transitions for the current subscription state.

**Parameters**:
- `subscriptionId` (path): The unique identifier of the subscription

**Response**:
```json
{
  "success": true,
  "data": {
    "currentState": "Active",
    "availableTransitions": [
      {
        "state": "Frozen",
        "description": "Temporarily suspend subscription",
        "requiresAuth": true,
        "allowedRoles": ["admin", "customer"]
      },
      {
        "state": "Exiting",
        "description": "Cancel subscription and continue until end date",
        "requiresAuth": true,
        "allowedRoles": ["admin", "customer"]
      }
    ]
  }
}
```

### 4. Process Automatic Transitions

**Endpoint**: `POST /api/subscriptions/admin/process-transitions`

**Description**: Processes all pending automatic state transitions (system endpoint).

**Request Body**:
```json
{
  "dryRun": false,
  "transitionTypes": ["new_joiner_to_active", "curious_to_exiting", "exiting_to_cancelled"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "processed": 15,
    "successful": 14,
    "failed": 1,
    "results": [
      {
        "subscriptionId": "sub_123456",
        "previousState": "New_Joiner",
        "newState": "Active",
        "success": true,
        "reason": "Completed 2 successful payment cycles"
      },
      {
        "subscriptionId": "sub_789012",
        "previousState": "Curious",
        "newState": "Exiting",
        "success": true,
        "reason": "Subscription cycle completed"
      }
    ],
    "errors": [
      {
        "subscriptionId": "sub_345678",
        "error": "Database constraint violation",
        "details": "Failed to update subscription state"
      }
    ]
  }
}
```

## Subscription Management Endpoints

### 5. Get Subscriptions by State

**Endpoint**: `GET /api/subscriptions/by-state/{state}`

**Description**: Retrieves all subscriptions in a specific state with pagination and filtering.

**Parameters**:
- `state` (path): The subscription state to filter by
- `page` (query): Page number (default: 1)
- `limit` (query): Results per page (default: 20, max: 100)
- `sortBy` (query): Sort field (createdAt, updatedAt, end_date)
- `sortOrder` (query): Sort direction (asc, desc)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "sub_123456",
      "userId": "user_789",
      "state": "Active",
      "paymentMethod": "credit_card",
      "autoRenewal": true,
      "completedCycles": 3,
      "createdAt": "2025-09-15T14:20:00Z",
      "updatedAt": "2025-10-15T10:30:00Z",
      "endDate": "2025-11-15T14:20:00Z",
      "user": {
        "id": "user_789",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### 6. Update Subscription Details

**Endpoint**: `PUT /api/subscriptions/{subscriptionId}`

**Description**: Updates subscription details including payment method and auto-renewal settings.

**Parameters**:
- `subscriptionId` (path): The unique identifier of the subscription

**Request Body**:
```json
{
  "paymentMethod": "credit_card",
  "autoRenewal": true,
  "notes": "Customer requested auto-renewal activation",
  "metadata": {
    "lastContactDate": "2025-10-14T10:00:00Z",
    "preferredContactMethod": "email"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "sub_123456",
    "userId": "user_789",
    "state": "Active",
    "paymentMethod": "credit_card",
    "autoRenewal": true,
    "completedCycles": 3,
    "notes": "Customer requested auto-renewal activation",
    "updatedAt": "2025-10-15T14:35:00Z"
  },
  "message": "Subscription updated successfully"
}
```

### 7. Bulk State Transitions

**Endpoint**: `POST /api/subscriptions/admin/bulk-transition`

**Description**: Transitions multiple subscriptions to a new state in a single operation.

**Request Body**:
```json
{
  "subscriptionIds": ["sub_123456", "sub_789012", "sub_345678"],
  "newState": "Frozen",
  "reason": "Holiday season suspension",
  "effectiveDate": "2025-12-15T00:00:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 3,
    "successful": 2,
    "failed": 1,
    "results": [
      {
        "subscriptionId": "sub_123456",
        "previousState": "Active",
        "newState": "Frozen",
        "success": true
      },
      {
        "subscriptionId": "sub_789012",
        "previousState": "New_Joiner",
        "newState": "Frozen",
        "success": true
      }
    ],
    "errors": [
      {
        "subscriptionId": "sub_345678",
        "error": "Invalid state transition",
        "details": "Cannot transition from Cancelled to Frozen"
      }
    ]
  }
}
```

## Payment Integration Endpoints

### 8. Process Payment Success

**Endpoint**: `POST /api/subscriptions/{subscriptionId}/payment-success`

**Description**: Processes successful payment and updates subscription state accordingly.

**Parameters**:
- `subscriptionId` (path): The unique identifier of the subscription

**Request Body**:
```json
{
  "paymentId": "pay_123456",
  "amount": 299.99,
  "currency": "SAR",
  "paymentDate": "2025-10-15T14:30:00Z",
  "paymentMethod": "credit_card"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "subscriptionId": "sub_123456",
    "previousState": "New_Joiner",
    "newState": "Active",
    "completedCycles": 2,
    "paymentProcessed": true,
    "nextBillingDate": "2025-11-15T14:20:00Z"
  },
  "message": "Payment processed and subscription updated"
}
```

### 9. Process Payment Failure

**Endpoint**: `POST /api/subscriptions/{subscriptionId}/payment-failure`

**Description**: Processes payment failure and transitions subscription to appropriate state.

**Parameters**:
- `subscriptionId` (path): The unique identifier of the subscription

**Request Body**:
```json
{
  "paymentId": "pay_789012",
  "failureReason": "Insufficient funds",
  "failureCode": "CARD_DECLINED",
  "retryCount": 2,
  "paymentDate": "2025-10-15T14:30:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "subscriptionId": "sub_123456",
    "previousState": "Active",
    "newState": "Cancelled",
    "paymentFailed": true,
    "failureReason": "Insufficient funds"
  },
  "message": "Payment failure processed and subscription cancelled"
}
```

## Analytics Endpoints

### 10. Get Subscription Metrics

**Endpoint**: `GET /api/subscriptions/analytics/metrics`

**Description**: Returns subscription metrics grouped by state and time period.

**Parameters**:
- `startDate` (query): Start date for metrics (YYYY-MM-DD)
- `endDate` (query): End date for metrics (YYYY-MM-DD)
- `groupBy` (query): Group by field (state, paymentMethod, etc.)

**Response**:
```json
{
  "success": true,
  "data": {
    "totalSubscriptions": 150,
    "stateDistribution": {
      "Active": 75,
      "New_Joiner": 25,
      "Curious": 15,
      "Frozen": 10,
      "Exiting": 15,
      "Pending_Approval": 5,
      "Cancelled": 5
    },
    "transitions": [
      {
        "date": "2025-10-15",
        "fromState": "New_Joiner",
        "toState": "Active",
        "count": 5
      }
    ],
    "revenueByState": {
      "Active": 22499.25,
      "New_Joiner": 7499.75,
      "Curious": 4499.85
    }
  }
}
```

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Cannot transition from Active to Pending_Approval",
    "details": {
      "currentState": "Active",
      "requestedState": "Pending_Approval",
      "validTransitions": ["Frozen", "Exiting", "Cancelled"]
    }
  }
}
```

### Common Error Codes
- `INVALID_STATE_TRANSITION`: Requested transition is not allowed
- `SUBSCRIPTION_NOT_FOUND`: Subscription does not exist
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `VALIDATION_ERROR`: Request data validation failed
- `DATABASE_ERROR`: Database operation failed
- `PAYMENT_PROCESSING_ERROR`: Payment processing failed

## Rate Limiting

- Standard endpoints: 100 requests per minute
- Bulk operations: 10 requests per minute
- Analytics endpoints: 50 requests per minute

## Webhooks

### State Transition Webhook
**Endpoint**: Your configured webhook URL
**Trigger**: Any subscription state change
**Payload**:
```json
{
  "event": "subscription.state.changed",
  "data": {
    "subscriptionId": "sub_123456",
    "previousState": "New_Joiner",
    "newState": "Active",
    "changedBy": "system",
    "timestamp": "2025-10-15T14:30:00Z",
    "reason": "Completed 2 successful payment cycles"
  }
}
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { SubscriptionAPI } from '@ibnexp2/api-client';

const client = new SubscriptionAPI({
  baseURL: 'https://api.ibnexp2.com',
  apiKey: 'your-api-key'
});

// Transition subscription state
const result = await client.transitionSubscriptionState('sub_123456', {
  newState: 'Active',
  reason: 'Admin approval after payment confirmation'
});

// Get subscription history
const history = await client.getSubscriptionHistory('sub_123456');
```

### Python
```python
from ibnexp2_api import SubscriptionClient

client = SubscriptionClient(
    base_url='https://api.ibnexp2.com',
    api_key='your-api-key'
)

# Transition subscription state
result = client.transition_subscription_state(
    subscription_id='sub_123456',
    new_state='Active',
    reason='Admin approval after payment confirmation'
)

# Get subscription history
history = client.get_subscription_history('sub_123456')
```

## Testing

### Test Environment
- Base URL: `https://api-test.ibnexp2.com`
- Test subscriptions available for all states
- Mock payment processing for testing

### Test Cases
1. Valid state transitions for each state
2. Invalid state transitions (should fail)
3. Automatic transition processing
4. Bulk operations with mixed success/failure
5. Payment success/failure scenarios
6. Analytics and reporting accuracy

## Version History

- **v2.0**: Enhanced subscription model with 7 states
- **v1.5**: Added bulk operations and analytics
- **v1.0**: Initial subscription management API

## Support

For API support and questions:
- Email: api-support@ibnexp2.com
- Documentation: https://docs.ibnexp2.com/api
- Status Page: https://status.ibnexp2.com