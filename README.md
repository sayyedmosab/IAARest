# Ibnexp - Student Meal Subscription System

A full-stack meal subscription platform for students with Angular frontend and Node.js/Express backend.

## 🏗️ Architecture

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
│   │   ├── services/           # Business logic services
│   │   ├── models/             # Database models
│   │   ├── database/           # Database connection & migrations
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

### 2. Start Backend Server

```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:3000` and automatically:
- Initialize the database connection
- Run migrations (creates tables if needed)
- Serve API endpoints at `/api/*`

### 3. Start Frontend (New Terminal)

```bash
# From project root
npm run dev
```

The frontend will start on `http://localhost:3100` (as configured in angular.json).

## 🔧 Available Commands

### Frontend
```bash
npm run dev      # Start development server (port 3100)
npm run build    # Build for production
npm run preview  # Preview production build
```

### Backend
```bash
cd backend
npm run dev      # Start development server with hot reload (port 3000)
npm run build    # Compile TypeScript to JavaScript
npm run start    # Start production server (requires build first)
```

## 📡 API Endpoints

The backend provides RESTful APIs:

- `GET /api/meals` - Get all meals
- `GET /api/plans` - Get all plans
- `GET /api/auth/*` - Authentication endpoints
- `GET /api/admin/*` - Admin-only endpoints (require authentication)

## 🗄️ Database

- **Type**: SQLite
- **File**: `backend/data/ibnexp.db`
- **Schema**: Auto-created on first run via migrations
- **Tables**: meals, plans, ingredients, profiles, subscriptions, payments, etc.

## 🔒 Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3100
JWT_SECRET=your-secret-key
```

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

### Debug Logging

Debug logs have been added to:
- Frontend: `src/services/data.service.ts`
- Backend: `backend/src/routes/meals.ts`, `backend/src/routes/plans.ts`

Check browser console and backend terminal for detailed logs.

## 📝 Notes

- The application uses string UUIDs for all database IDs
- Images are served from `/images/` directory
- Admin routes require JWT authentication
- Database migrations run automatically on backend startup