# System Architecture Documentation

## Overview

The Ibnexp meal subscription system follows a modern full-stack architecture with clear separation of concerns between frontend, backend, and database layers. This document provides a comprehensive overview of the system's technical architecture, data flow, and component relationships.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Angular SPA] --> B[Components]
        A --> C[Services]
        A --> D[Guards]
        B --> E[Admin Components]
        B --> F[Public Components]
        B --> G[Arabic Components]
    end
    
    subgraph "API Gateway"
        H[Express.js Server]
        I[Authentication Middleware]
        J[Validation Middleware]
        K[CORS Middleware]
    end
    
    subgraph "Business Logic Layer"
        L[Route Handlers]
        M[Service Layer]
        N[Repository Pattern]
    end
    
    subgraph "Data Layer"
        O[SQLite Database]
        P[Migration System]
        Q[Seed Data]
    end
    
    A --> H
    H --> I
    I --> J
    J --> L
    L --> M
    M --> N
    N --> O
    O --> P
    O --> Q
```

## Frontend Architecture

### Component Hierarchy

```mermaid
graph TD
    A[App Component] --> B[Router Outlet]
    B --> C[Public Routes]
    B --> D[Admin Routes]
    
    C --> E[Home Component]
    C --> F[Login Component]
    C --> G[Register Component]
    C --> H[Meals Gallery]
    C --> I[Checkout Component]
    
    D --> J[Admin Layout]
    J --> K[Dashboard]
    J --> L[Daily Orders]
    J --> M[Meal Management]
    J --> N[Menu Scheduler]
    J --> O[Plan Management]
    J --> P[User Management]
    
    subgraph "Arabic Components"
        Q[AR Home]
        R[AR Login]
        S[AR Register]
        T[AR Menu]
    end
```

### Angular Services Architecture

```mermaid
graph LR
    A[Data Service] --> B[HTTP Client]
    C[Auth Service] --> D[JWT Token Management]
    E[Image Service] --> F[Path Resolution]
    G[Language Service] --> H[RTL/LTR Support]
    I[Guard Service] --> J[Route Protection]
```

## Backend Architecture

### API Route Structure

```mermaid
graph TD
    A[Express App] --> B[/api Routes]
    B --> C[/auth]
    B --> D[/meals]
    B --> E[/plans]
    B --> F[/subscriptions]
    B --> G[/users]
    B --> H[/ingredients]
    B --> I[/admin]
    
    C --> C1[POST /register]
    C --> C2[POST /login]
    C --> C3[GET /me]
    C --> C4[POST /logout]
    
    D --> D1[GET /]
    D --> D2[GET /:id]
    D --> D3[POST /]
    D --> D4[PUT /:id]
    D --> D5[DELETE /:id]
    
    I --> I1[GET /dashboard]
    I --> I2[GET /daily-orders]
    I --> I3[GET /subscriptions]
    I --> I4[POST /menu-schedule]
```

### Middleware Stack

```mermaid
graph LR
    A[Request] --> B[CORS]
    B --> C[Compression]
    C --> D[Cookie Parser]
    D --> E[Rate Limiting]
    E --> F[Auth Middleware]
    F --> G[Admin Middleware]
    G --> H[Route Handler]
    H --> I[Response]
```

### Service Layer Architecture

```mermaid
graph TD
    A[Route Handler] --> B[Service Layer]
    B --> C[Business Logic]
    B --> D[Validation]
    B --> E[Error Handling]
    
    C --> F[Repository Layer]
    F --> G[Database Operations]
    F --> H[Data Transformation]
    
    G --> I[SQLite Database]
    H --> I
```

## Database Architecture

### Schema Overview

```mermaid
erDiagram
    PROFILES ||--o{ SUBSCRIPTIONS : subscribes
    PLANS ||--o{ SUBSCRIPTIONS : has
    SUBSCRIPTIONS ||--o{ PAYMENTS : processes
    SUBSCRIPTIONS ||--o{ DELIVERIES : generates
    
    MEALS ||--o{ MEAL_INGREDIENTS : contains
    INGREDIENTS ||--o{ MEAL_INGREDIENTS : used_in
    MEALS ||--o{ MEAL_IMAGES : has
    
    MENU_CYCLES ||--o{ MENU_CYCLE_DAYS : contains
    MENU_CYCLE_DAYS ||--o{ MENU_DAY_ASSIGNMENTS : schedules
    MEALS ||--o{ MENU_DAY_ASSIGNMENTS : assigned_to
    PLANS ||--o{ MENU_DAY_ASSIGNMENTS : for_plan
    
    PROFILES {
        string user_id PK
        string email
        string password
        string first_name
        string last_name
        string language_pref
        boolean is_admin
        boolean is_student
        string phone_e164
        date date_of_birth
        integer height_cm
        real weight_kg
        string goal
        string address
        string district
    }
    
    PLANS {
        string id PK
        string code
        string name_en
        string name_ar
        integer meals_per_day
        integer delivery_days
        real base_price_aed
        real discounted_price_aed
        string status
    }
    
    MEALS {
        string id PK
        string name_en
        string name_ar
        string description_en
        string description_ar
        string image_filename
        boolean is_active
    }
    
    SUBSCRIPTIONS {
        string id PK
        string user_id FK
        string plan_id FK
        string status
        date start_date
        date end_date
        real price_charged_aed
        boolean student_discount_applied
    }
```

### Database Relationships

```mermaid
graph TD
    A[Profiles] -->|1:N| B[Subscriptions]
    C[Plans] -->|1:N| B
    B -->|1:N| D[Payments]
    B -->|1:N| E[Deliveries]
    
    F[Meals] -->|M:N| G[Ingredients]
    F -->|1:N| H[Meal Images]
    
    I[Menu Cycles] -->|1:N| J[Menu Cycle Days]
    J -->|1:N| K[Menu Day Assignments]
    F -->|1:N| K
    C -->|1:N| K
```

## Data Flow Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Auth API
    participant D as Database
    
    U->>F: Login Request
    F->>A: POST /api/auth/login
    A->>D: Validate Credentials
    D-->>A: User Data
    A->>A: Generate JWT
    A-->>F: JWT Token + User Data
    F->>F: Store Token (Cookie)
    F-->>U: Login Success
    
    Note over F,A: Subsequent Requests
    F->>A: Request + JWT Cookie
    A->>A: Validate JWT
    A->>D: Get User Data
    D-->>A: User Data
    A-->>F: Protected Resource
```

### Meal Management Flow

```mermaid
sequenceDiagram
    participant A as Admin
    participant F as Frontend
    participant M as Meal API
    participant D as Database
    participant I as Image Storage
    
    A->>F: Create/Update Meal
    F->>M: POST/PUT /api/admin/meals
    M->>M: Validate Data
    M->>D: Save Meal Data
    M->>I: Store Image (if new)
    I-->>M: Image Path
    D-->>M: Confirmation
    M-->>F: Success Response
    F-->>A: Update UI
```

### Subscription Flow

```mermaid
sequenceDiagram
    participant S as Student
    participant F as Frontend
    participant P as Plan API
    participant Sub as Subscription API
    participant D as Database
    
    S->>F: Browse Plans
    F->>P: GET /api/plans
    P->>D: Query Plans
    D-->>P: Plan Data
    P-->>F: Active Plans
    F-->>S: Display Plans
    
    S->>F: Subscribe to Plan
    F->>Sub: POST /api/subscriptions
    Sub->>D: Create Subscription
    D-->>Sub: Subscription ID
    Sub-->>F: Subscription Details
    F-->>S: Confirmation
```

## Security Architecture

### Authentication & Authorization

```mermaid
graph TD
    A[User Request] --> B[JWT Validation]
    B --> C{Token Valid?}
    C -->|No| D[401 Unauthorized]
    C -->|Yes| E[Extract User Info]
    E --> F{Admin Route?}
    F -->|No| G[Process Request]
    F -->|Yes| H{User is Admin?}
    H -->|No| I[403 Forbidden]
    H -->|Yes| G
    G --> J[Send Response]
```

### Data Validation

```mermaid
graph LR
    A[Input Data] --> B[Request Validation]
    B --> C[Sanitization]
    C --> D[Business Rules]
    D --> E[Database Constraints]
    E --> F[Validated Data]
```

## Performance Considerations

### Caching Strategy

```mermaid
graph TD
    A[Request] --> B{Cache Hit?}
    B -->|Yes| C[Return Cached Data]
    B -->|No| D[Query Database]
    D --> E[Cache Result]
    E --> F[Return Data]
```

### Database Optimization

- Indexes on frequently queried columns
- Foreign key constraints for data integrity
- Connection pooling for performance
- Prepared statements for security

## Deployment Architecture

### Development Environment

```mermaid
graph TB
    subgraph "Development Machine"
        A[Angular Dev Server :4200]
        B[Node.js Server :4000]
        C[SQLite Database]
    end
    
    A --> D[Proxy Configuration]
    D --> B
    B --> C
```

### Production Architecture (Recommended)

```mermaid
graph TB
    subgraph "Web Server"
        A[Nginx/Apache]
    end
    
    subgraph "Application Server"
        B[Node.js Process]
    end
    
    subgraph "Database"
        C[SQLite/PostgreSQL]
    end
    
    subgraph "Static Assets"
        D[CDN/Static Hosting]
    end
    
    A --> B
    B --> C
    A --> D
```

## Technology Stack Details

### Frontend Dependencies
- **Angular 20.3.0**: Modern reactive framework
- **TypeScript 5.8**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **RxJS**: Reactive programming library

### Backend Dependencies
- **Express.js 4.18**: Web application framework
- **better-sqlite3 9.2**: SQLite database driver
- **jsonwebtoken 9.0**: JWT implementation
- **bcryptjs 2.4**: Password hashing
- **joi 17.11**: Data validation

### Development Tools
- **Vite**: Fast build tool
- **tsx**: TypeScript execution
- **ESLint**: Code linting
- **Prettier**: Code formatting

## Error Handling Strategy

### Frontend Error Handling

```mermaid
graph TD
    A[API Error] --> B[HTTP Error Interceptor]
    B --> C{Error Type}
    C -->|Auth Error| D[Redirect to Login]
    C -->|Network Error| E[Show Offline Message]
    C -->|Server Error| F[Show Error Dialog]
    C -->|Validation Error| G[Display Field Errors]
```

### Backend Error Handling

```mermaid
graph TD
    A[Error Occurred] --> B[Error Handler Middleware]
    B --> C{Error Type}
    C -->|Validation Error| D[400 Bad Request]
    C -->|Auth Error| E[401/403]
    C -->|Not Found| F[404]
    C -->|Database Error| G[500 Internal Error]
    C -->|Unknown Error| H[500 Generic Error]
```

## Monitoring and Logging

### Logging Strategy
- Request/response logging
- Error tracking
- Performance metrics
- Database query logging
- Authentication events

### Monitoring Points
- API response times
- Database query performance
- Error rates
- User activity patterns
- Resource utilization

## Scalability Considerations

### Horizontal Scaling
- Stateless API design
- Database connection pooling
- Session-less authentication (JWT)
- Load balancer compatibility

### Vertical Scaling
- Memory optimization
- CPU utilization monitoring
- Database indexing strategy
- Caching implementation

## Future Architecture Enhancements

### Planned Improvements
1. **Microservices Migration**: Split monolithic backend into services
2. **Event-Driven Architecture**: Implement message queues for async operations
3. **API Gateway**: Centralized API management
4. **Container Orchestration**: Docker/Kubernetes deployment
5. **Read Replicas**: Database read scaling
6. **CDN Integration**: Global content delivery

### Technology Migration Path
- SQLite → PostgreSQL for production
- JWT → OAuth 2.0 for third-party integration
- REST → GraphQL for efficient data fetching
- Angular → PWA for offline capabilities