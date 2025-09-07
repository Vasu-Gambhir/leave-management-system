# Leave Management Application

A comprehensive leave management system built with React (Frontend) and Hono.js (Backend), featuring real-time notifications, Google Calendar integration, role-based access control, and advanced caching strategies.

## 🚀 Features

### Core Features
- **Multi-tenant Organization Support**: Separate organizations with isolated data
- **Role-based Access Control**: Master, Admin, Approval Manager, and Team Member roles
- **Leave Request Management**: Create, approve, reject leave requests with detailed workflow
- **Leave Types Configuration**: Customizable leave types with approval requirements and limits
- **Real-time Notifications**: WebSocket-powered live updates for all users
- **Google Calendar Integration**: Automatic calendar event creation for approved leaves
- **Advanced Caching**: Redis-based caching with intelligent invalidation strategies
- **Email Notifications**: Automated email alerts for leave status changes
- **Admin Request System**: Request admin privileges with approval workflow
- **Comprehensive Pagination**: Efficient data loading with pagination support

### Advanced Features
- **Real-time Dashboard Updates**: Live updates for master and admin dashboards
- **Intelligent Cache Management**: Event-driven cache invalidation for data consistency
- **Google OAuth Integration**: Secure calendar access with refresh token handling
- **Multi-level User Management**: Organization-wide user and role management
- **Leave Balance Tracking**: Annual leave limits and carry-forward support
- **Rejection Reason System**: Detailed feedback for rejected leave requests
- **WebSocket Communication**: Real-time user updates and role changes
- **Memory-optimized Build**: Efficient TypeScript compilation for large codebases

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API communication
- **WebSocket** for real-time updates

### Backend
- **Hono.js** - Modern web framework
- **TypeScript** - Type safety
- **Supabase** - Database and authentication
- **Redis** - Caching and session management
- **WebSocket** - Real-time communication
- **Google APIs** - Calendar integration
- **Nodemailer** - Email notifications
- **JWT** - Authentication tokens

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** database (or Supabase account)
- **Redis** server
- **Google Cloud Console** account (for Calendar integration)
- **SMTP Server** (for email notifications)

## 🗄️ Database Setup

### Using Supabase (Recommended)

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key from the API settings
4. Run the database migration script:

```bash
# Navigate to backend directory
cd backend

# Run the migration script (ensure it's executable)
node scripts/migrate.js
```

The migration script will create all necessary tables:
- `organizations` - Organization data
- `users` - User accounts and roles
- `leave_types` - Configurable leave categories
- `leave_requests` - Leave applications and approvals
- `admin_requests` - Admin privilege requests
- `notifications` - System notifications

### Using Local PostgreSQL

1. Install PostgreSQL
2. Create a database for the application
3. Update the connection string in your environment variables
4. Run the migration script as above

## 🔧 Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Redis Configuration
REDIS_URL=redis://localhost:6379
# For Redis Cloud: redis://username:password@host:port

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here

# Google Calendar Integration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback

# Email Configuration
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email_username
SMTP_PASS=your_email_password
SMTP_FROM=noreply@yourdomain.com

# Server Configuration
PORT=5000
NODE_ENV=development
```

### Frontend Environment Variables

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000/ws
```

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd leave-management-app
```

### 2. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Set up Redis

#### Option A: Using Docker (Recommended)

```bash
# Run Redis container
docker run -d --name redis-leave-app -p 6379:6379 redis:alpine

# Or with persistence
docker run -d --name redis-leave-app -p 6379:6379 -v redis-data:/data redis:alpine redis-server --appendonly yes
```

#### Option B: Local Installation

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Windows:**
Download and install Redis from the official website or use WSL.

#### Option C: Redis Cloud

1. Create account at [Redis Cloud](https://redis.com/redis-enterprise-cloud/)
2. Create a free database
3. Use the provided connection string in your environment variables

### 4. Set up Google Calendar Integration (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5000/auth/google/callback`
5. Download the credentials and add to your environment variables

### 5. Set up Email Service (Optional)

Configure SMTP settings for email notifications:
- **Gmail**: Use App Passwords with 2FA enabled
- **SendGrid**: Use API key as password
- **Other SMTP**: Standard SMTP configuration

### 6. Database Migration

```bash
cd backend
node scripts/migrate.js
```

### 7. Start the Application

#### Development Mode

```bash
# Start backend (from backend directory)
npm run dev

# Start frontend (from frontend directory)  
npm run dev
```

#### Production Mode

```bash
# Build backend
cd backend
npm run build
npm start

# Build frontend
cd frontend
npm run build
npm run preview
```

## 🐳 Docker Setup

### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Docker Setup

```bash
# Build images
docker build -t leave-app-backend ./backend
docker build -t leave-app-frontend ./frontend

# Run Redis
docker run -d --name redis -p 6379:6379 redis:alpine

# Run Backend
docker run -d --name backend -p 5000:5000 --env-file backend/.env leave-app-backend

# Run Frontend
docker run -d --name frontend -p 3000:3000 leave-app-frontend
```

## 🔗 WebSocket Connection

The application uses WebSockets for real-time updates:

- **Connection URL**: `ws://localhost:5000/ws` (development)
- **Authentication**: JWT token passed as query parameter
- **Auto-reconnection**: Built-in reconnection logic
- **Events**: User updates, role changes, leave approvals

### WebSocket Events

- `user-update`: Role or organization changes
- `master-update`: Admin requests and approvals
- `leave-update`: Leave request status changes
- `notification`: General system notifications

## 📚 API Documentation

### Authentication Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh
- `GET /auth/google` - Google OAuth
- `GET /auth/google/callback` - OAuth callback

### Leave Management

- `GET /leaves` - Get leave requests
- `POST /leaves` - Create leave request
- `PUT /leaves/:id/status` - Update leave status
- `DELETE /leaves/:id` - Delete leave request

### Administration

- `GET /users` - Get organization users
- `PUT /users/:id/role` - Update user role
- `GET /admin-requests` - Get admin requests
- `POST /admin-requests` - Create admin request

## 👥 User Roles & Permissions

### Master
- Full system access
- Manage organizations
- Approve admin requests
- System-wide configuration

### Admin
- Organization management
- User role assignment
- Leave type configuration
- Leave approvals

### Approval Manager
- Approve/reject leave requests
- View team leave calendars
- Generate leave reports

### Team Member
- Submit leave requests
- View own leave history
- Update profile information

## 🔧 Troubleshooting

### Common Issues

1. **Build Memory Errors**
   ```bash
   # Increase Node.js memory limit
   export NODE_OPTIONS="--max-old-space-size=8192"
   npm run build
   ```

2. **Redis Connection Issues**
   ```bash
   # Check Redis status
   redis-cli ping
   
   # Reset Redis
   docker restart redis-leave-app
   ```

3. **Cache Inconsistency**
   ```bash
   # Clear Redis cache
   redis-cli FLUSHALL
   ```

4. **WebSocket Connection Fails**
   - Check CORS settings
   - Verify JWT token validity
   - Ensure WebSocket URL is correct

5. **Google Calendar Not Working**
   - Verify OAuth credentials
   - Check redirect URI configuration
   - Ensure Calendar API is enabled

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure secure Redis connection
- [ ] Set up SSL certificates
- [ ] Configure domain-specific CORS
- [ ] Update Google OAuth redirect URIs
- [ ] Set strong JWT secrets
- [ ] Configure production SMTP
- [ ] Set up database backups
- [ ] Configure logging and monitoring

### Environment-specific Notes

- **Development**: Uses local Redis and development CORS settings
- **Staging**: Requires production-like Redis and database setup
- **Production**: Full SSL, secure headers, and optimized caching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🐛 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs for specific error messages
3. Verify environment configuration
4. Check Redis and database connectivity

---

**Note**: This application includes advanced caching strategies that prioritize data consistency. If you experience any cache-related issues, the system includes comprehensive invalidation mechanisms that can be triggered through the admin interface.