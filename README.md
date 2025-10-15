# Ibnexp - Student Meal Subscription System

A comprehensive meal subscription platform for university students with Angular frontend and Node.js/Express backend.

## 🎯 Project Overview

Ibnexp is a bilingual (English/Arabic) meal subscription service designed for university students in Academia. The platform provides a convenient way for students to subscribe to healthy meal plans while giving administrators complete control over meal management, user subscriptions, and financial operations.

### Key Features
- **Student Meal Subscriptions**: Easy-to-use interface for browsing and subscribing to meal plans
- **Admin Dashboard**: Complete administrative panel for managing meals, users, subscriptions, and scheduling
- **Real-time Menu Management**: Dynamic menu scheduling with date-based meal assignments
- **Financial Tracking**: Comprehensive subscription and payment management
- **Multi-language Support**: Bilingual interface (English/Arabic)
- **Responsive Design**: Mobile-first design that works on all devices

## 🏗️ Technical Architecture

### Frontend (Angular)
- **Framework**: Angular 20.3.0 (Standalone Components)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite (via Angular CLI)

### Backend (Node.js/Express)
- **Framework**: Express.js with TypeScript
- **Database**: SQLite with better-sqlite3
- **Authentication**: JWT tokens
- **API**: RESTful endpoints

## 📁 Project Structure

```
/
├── src/                          # Angular frontend source
│   ├── components/               # Angular components
│   │   ├── admin/               # Admin panel components
│   │   │   ├── admin-layout/    # Admin layout component
│   │   │   ├── dashboard/       # Admin dashboard
│   │   │   ├── daily-orders/    # Daily orders management
│   │   │   ├── meal-management/ # Meal CRUD operations
│   │   │   ├── menu-scheduler/  # Menu scheduling
│   │   │   ├── plan-management/ # Plan management
│   │   │   └── user-management/ # User management
│   │   ├── ar-*/                # Arabic language components
│   │   └── *.component.*        # Public components
│   ├── services/                # Angular services
│   ├── models/                  # TypeScript interfaces
│   ├── guards/                  # Route guards
│   ├── constants/               # App constants
│   └── assets/                  # Static assets
├── backend/                     # Node.js backend
│   ├── src/
│   │   ├── routes/             # API route handlers
│   │   │   ├── admin.ts        # Admin endpoints
│   │   │   ├── auth.ts         # Authentication endpoints
│   │   │   ├── ingredients.ts  # Ingredient endpoints
│   │   │   ├── meals.ts        # Meal endpoints
│   │   │   ├── plans.ts        # Plan endpoints
│   │   │   ├── subscriptions.ts # Subscription endpoints
│   │   │   └── users.ts        # User endpoints
│   │   ├── services/           # Business logic services
│   │   ├── models/             # Database models
│   │   ├── database/           # Database connection & migrations
│   │   │   └── migrations/     # Database schema files
│   │   └── middleware/         # Express middleware
│   └── data/                   # SQLite database file
├── images/                     # Meal images
├── stash/                      # Unused files (backups, alternatives)
└── [config files]              # Angular, TypeScript configs
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Angular CLI: `npm install -g @angular/cli`

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Environment Configuration

Create a `.env` file in the backend directory:

```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:4200
JWT_SECRET=your-secret-key-here
```

### 3. Start Backend Server

```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:4000` and automatically:
- Initialize the database connection
- Run migrations (creates tables if needed)
- Seed initial data (meals, plans, admin user)
- Serve API endpoints at `/api/*`

### 4. Start Frontend (New Terminal)

```bash
# From project root
npm run dev
```

The frontend will start on `http://localhost:4200`.

## 🔧 Available Commands

### Frontend
```bash
npm run dev      # Start development server (port 4200)
npm run build    # Build for production
npm run preview  # Preview production build
```

### Backend
```bash
cd backend
npm run dev      # Start development server with hot reload (port 4000)
npm run build    # Compile TypeScript to JavaScript
npm run start    # Start production server (requires build first)
```

## 📡 API Endpoints

The backend provides RESTful APIs:

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Public Content
- `GET /api/meals` - Get all active meals
- `GET /api/meals/:id` - Get meal by ID
- `GET /api/plans` - Get all active plans
- `GET /api/plans/:id` - Get plan by ID
- `GET /api/ingredients` - Get all ingredients

### Admin Endpoints (Require Authentication)
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/daily-orders` - Daily order reports
- `GET /api/admin/subscriptions` - All subscriptions
- `GET /api/admin/users` - User management
- `POST /api/admin/meals` - Create meal
- `PUT /api/admin/meals/:id` - Update meal
- `DELETE /api/admin/meals/:id` - Delete meal
- `POST /api/admin/plans` - Create plan
- `PUT /api/admin/plans/:id` - Update plan
- `DELETE /api/admin/plans/:id` - Delete plan
- `POST /api/admin/menu-schedule` - Save menu schedule

## 🗄️ Database Schema

### Core Tables
- **profiles** - User accounts and preferences
- **plans** - Subscription plans with pricing
- **meals** - Meal information and nutrition
- **subscriptions** - User subscriptions
- **payments** - Payment records
- **ingredients** - Ingredient database
- **meal_ingredients** - Meal-ingredient relationships
- **menu_cycles** - Menu cycle definitions
- **menu_day_assignments** - Scheduled menu assignments
- **deliveries** - Delivery records

### Relationships
- Users → Subscriptions → Plans
- Meals → Ingredients (many-to-many)
- Subscriptions → Payments (one-to-many)
- Menu Cycles → Menu Day Assignments

## 🔒 Authentication

The system uses JWT tokens for authentication:
- Admin users have elevated privileges
- Tokens are stored in HTTP-only cookies
- Protected routes require valid authentication

## 🧪 Development

### Database Inspection
To inspect the database during development:

```bash
cd backend
node -e "const Database = require('better-sqlite3'); const db = new Database('./data/ibnexp.db'); const tables = db.pragma('table_info(sqlite_master)').filter(t => t.type === 'table').map(t => t.name); console.log('Tables:', tables); db.close();"
```

### Adding New Migrations
1. Create new `.sql` file in `backend/src/database/migrations/`
2. Follow naming convention: `XXX_description.sql`
3. Restart backend server to apply migrations

## 🗂️ Stash Directory

Unused files and alternative implementations are stored in `stash/`:
- `stash/unused-projects/` - Alternative project versions
- `stash/unused-frontend/` - Unused frontend implementations
- `stash/unused-backend/` - Unused backend implementations
- `stash/temp-files/` - Temporary development files

## 🔧 Troubleshooting

### Common Issues

1. **Database tables not found**
   ```bash
   cd backend && node src/database/robust_migrate.js
   ```

2. **Port conflicts**
   - Frontend: Change port in `angular.json`
   - Backend: Set `PORT` environment variable

3. **Missing dependencies**
   ```bash
   npm install  # Frontend
   cd backend && npm install  # Backend
   ```

4. **Authentication issues**
   - Ensure JWT_SECRET is set in backend .env
   - Check browser console for authentication errors

### Debug Logging

Debug logs have been added to:
- Frontend: `src/services/data.service.ts`
- Backend: `backend/src/routes/meals.ts`, `backend/src/routes/plans.ts`

Check browser console and backend terminal for detailed logs.

## 📝 Current Status

### Completed Features
- ✅ User authentication and authorization
- ✅ Meal catalog management
- ✅ Subscription plan management
- ✅ Admin dashboard with statistics
- ✅ Daily orders reporting
- ✅ Menu scheduling system
- ✅ Bilingual support (English/Arabic)
- ✅ Image handling for meals
- ✅ Ingredient management
- ✅ Database schema and migrations

### In Progress
- 🔄 Payment integration
- 🔄 Email notifications
- 🔄 Mobile app development

### Known Issues
- Image path inconsistencies in some components
- TypeScript compilation warnings in unused files
- Ingredients endpoint needs frontend integration

## 📚 Documentation

- [System Architecture](./System-Architecture.md) - Detailed technical architecture
- [Roadmap](./Roadmap.md) - Project development roadmap
- [Handover Report](./HandoverReport.md) - Technical handover notes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the logs for error details
3. Verify configuration in `.env` files
4. Test with sample data first