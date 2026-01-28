# Fiverr-like Platform - Backend API

A comprehensive backend API for a freelance marketplace platform with three user roles: Admin, Client, and Creative.

## 🎯 Features

### Core Features

- ✅ Role-based authentication (Admin, Client, Creative)
- ✅ JWT token authentication with refresh tokens
- ✅ Email verification with OTP
- ✅ Password reset functionality
- ✅ File uploads (Cloudinary integration)
- ✅ Payment processing (Stripe integration)
- ✅ Real-time notifications (ready for Socket.io)
- ✅ Geospatial search for nearby users
- ✅ Advanced filtering and pagination

### User Roles

**Admin:**

- Dashboard with statistics
- User management (block/unblock)
- Revenue tracking and analytics
- Payment approval system
- Verification management
- Report moderation

**Client:**

- Create and manage job posts
- Browse and hire creatives
- Premium job posts ($12)
- Order management
- Review creatives
- Chat with creatives

**Creative:**

- Create and manage gigs
- Portfolio management
- Apply to job posts
- Submit work drafts
- Blue badge verification ($50)
- Chat with clients

### Key Functionalities

- 📦 Order management with draft submission
- ⭐ Review and rating system
- 💬 Chat system (ready for real-time)
- 🔔 Comprehensive notification system (25+ types)
- 👥 Social features (like, block, report)
- 💰 Payment processing with 20% platform fee
- 🎨 Portfolio and work showcase
- 🏆 Verification system

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT (JSON Web Tokens)
- **File Storage:** Cloudinary
- **Payments:** Stripe
- **Email:** Nodemailer
- **Security:** Helmet, CORS, Express Mongo Sanitize

## 📁 Project Structure

```
project/
├── controllers/          # Request handlers
│   ├── auth.controller.js
│   ├── user.controller.js
│   ├── gig.controller.js
│   ├── jobPost.controller.js
│   ├── order.controller.js
│   ├── draft.controller.js
│   ├── review.controller.js
│   ├── notification.controller.js
│   ├── social.controller.js
│   ├── portfolio.controller.js
│   ├── admin.controller.js
│   └── misc.controller.js
├── models/              # Database schemas
│   ├── user.model.js
│   ├── gig.model.js
│   ├── jobPost.model.js
│   ├── order.model.js
│   ├── draft.model.js
│   ├── customOffer.model.js
│   ├── review.model.js
│   ├── chat.model.js
│   ├── message.model.js
│   ├── notification.model.js
│   ├── report.model.js
│   ├── blockList.model.js
│   ├── like.model.js
│   ├── verification.model.js
│   ├── supportTicket.model.js
│   ├── transaction.model.js
│   ├── portfolio.model.js
│   └── category.model.js
├── routes/              # API routes
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── gig.routes.js
│   ├── jobPost.routes.js
│   ├── order.routes.js
│   ├── draft.routes.js
│   ├── review.routes.js
│   ├── notification.routes.js
│   ├── social.routes.js
│   ├── portfolio.routes.js
│   ├── admin.routes.js
│   ├── category.routes.js
│   ├── verification.routes.js
│   ├── support.routes.js
│   └── index.js
├── middleware/          # Custom middleware
│   ├── auth.middleware.js
│   ├── multer.middleware.js
│   └── error.middleware.js
├── utils/              # Utility functions
│   ├── cloudinary.js
│   ├── stripe.js
│   ├── notification.js
│   ├── email.js
│   ├── sendResponse.js
│   └── catchAsync.js
├── errors/             # Error handling
│   └── AppError.js
├── app.js             # Express app setup
├── package.json       # Dependencies
├── .env.example       # Environment variables template
└── README.md          # Documentation
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- Cloudinary account
- Stripe account
- Email service (Gmail, SendGrid, etc.)

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd fiverr-platform-backend
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
MONGODB_URI=your-mongodb-uri
JWT_ACCESS_SECRET=your-jwt-secret
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
STRIPE_SECRET_KEY=your-stripe-secret-key
EMAIL_USER=your-email
EMAIL_PASSWORD=your-email-password
```

4. **Start the server**

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:5000`

## 📡 API Endpoints

### Authentication (`/api/auth`)

- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /verify-email` - Verify email with OTP
- `POST /resend-otp` - Resend OTP
- `POST /refresh-token` - Refresh access token
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password
- `POST /logout` - Logout user
- `PUT /change-password` - Change password

### Users (`/api/users`)

- `GET /profile/me` - Get own profile
- `GET /:userId` - Get user profile
- `PUT /profile` - Update profile
- `POST /works` - Add work (Creative)
- `DELETE /works/:workId` - Delete work
- `POST /projects` - Add project (Client)
- `DELETE /projects/:projectId` - Delete project
- `PUT /settings` - Update settings
- `DELETE /account` - Delete account
- `GET /search` - Search users
- `GET /nearby` - Get nearby users

### Gigs (`/api/gigs`)

- `POST /` - Create gig (Creative)
- `GET /` - Get all gigs
- `GET /:gigId` - Get gig by ID
- `GET /my/gigs` - Get own gigs
- `PUT /:gigId` - Update gig
- `PATCH /:gigId/toggle-active` - Toggle gig status
- `DELETE /:gigId` - Delete gig
- `GET /top-rated` - Get top rated gigs

### Job Posts (`/api/job-posts`)

- `POST /` - Create job post (Client)
- `GET /` - Get all job posts
- `GET /:jobPostId` - Get job post by ID
- `POST /:jobPostId/apply` - Apply to job (Creative)
- `POST /:jobPostId/pay-premium` - Pay for premium
- `PUT /:jobPostId` - Update job post
- `PATCH /:jobPostId/close` - Close job post
- `DELETE /:jobPostId` - Delete job post

### Orders (`/api/orders`)

- `POST /from-gig/:gigId` - Create order from gig
- `GET /my-orders` - Get user's orders
- `GET /:orderId` - Get order by ID
- `POST /:orderId/reschedule` - Request reschedule
- `PATCH /:orderId/reschedule/:requestId` - Respond to reschedule
- `PATCH /:orderId/cancel` - Cancel order
- `PATCH /:orderId/complete` - Complete order

### Reviews (`/api/reviews`)

- `POST /orders/:orderId` - Create review (Client)
- `GET /users/:creativeId` - Get creative reviews
- `DELETE /:reviewId` - Delete review (Creative)

### Notifications (`/api/notifications`)

- `GET /` - Get notifications
- `GET /unread-count` - Get unread count
- `PATCH /:notificationId/read` - Mark as read
- `PATCH /read-all` - Mark all as read
- `DELETE /:notificationId` - Delete notification

### Admin (`/api/admin`)

- `GET /dashboard` - Dashboard overview
- `GET /users` - Get all users
- `PATCH /users/:userId/toggle-status` - Block/unblock user
- `GET /revenue` - Revenue statistics
- `GET /payments` - Payment history
- `PATCH /payments/:transactionId/approve` - Approve payment
- `GET /verifications` - Verification requests
- `PATCH /verifications/:verificationId` - Review verification
- `GET /reports` - All reports
- `PATCH /reports/:reportId` - Review report

[See full API documentation in ROUTES_DOCUMENTATION.md]

## 💾 Database Models

- **User** - Base user model with role-based fields
- **Gig** - Creative services
- **JobPost** - Client job postings
- **Order** - Work orders between users
- **Draft** - Work submissions
- **CustomOffer** - Custom offers in chat
- **Review** - User reviews
- **Chat & Message** - Messaging system
- **Notification** - System notifications
- **Transaction** - Payment tracking
- **Portfolio** - Creative portfolios
- **Report** - User reports
- **BlockList** - Blocked users
- **Like** - User likes/dislikes
- **Verification** - Blue badge requests
- **SupportTicket** - Support system
- **Category** - Service categories

## 🔐 Authentication & Authorization

### JWT Tokens

- **Access Token:** Short-lived (15 minutes)
- **Refresh Token:** Long-lived (7 days)

### Protected Routes

All routes except public endpoints require authentication:

```javascript
Authorization: Bearer <access-token>
```

### Role-Based Access

- **Public:** Anyone can access
- **Protected:** Requires authentication
- **Client Only:** Only clients
- **Creative Only:** Only creatives
- **Admin Only:** Only admins

## 💰 Payment Flow

1. Client creates order and pays
2. Payment held by platform (Stripe)
3. Creative completes work and submits drafts
4. Client approves work
5. Order marked as completed
6. Admin approves payment release
7. Creative receives 80% (platform keeps 20%)

## 📤 File Upload

Supported file types:

- Images: JPEG, JPG, PNG, GIF, WebP
- Videos: MP4, MPEG, QuickTime, WebM
- Documents: PDF, DOC, DOCX, XLS, XLSX

Maximum file size: 50MB per file

## 🔔 Notification Types

The system supports 25+ notification types:

- Order notifications
- Payment notifications
- Verification notifications
- Chat notifications
- Work reminders
- Review notifications
- Support notifications

## 🛡️ Security Features

- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ Input sanitization
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Rate limiting ready
- ✅ XSS protection
- ✅ NoSQL injection protection

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test
```

## 📝 Environment Variables

See `.env.example` for all required environment variables.

### Required Variables:

- `MONGODB_URI` - MongoDB connection string
- `JWT_ACCESS_SECRET` - JWT access token secret
- `JWT_REFRESH_SECRET` - JWT refresh token secret
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `STRIPE_SECRET_KEY` - Stripe secret key
- `EMAIL_USER` - Email service user
- `EMAIL_PASSWORD` - Email service password

## 🚧 Development

### Code Style

- ES6+ features
- Async/await for asynchronous operations
- Try-catch for error handling
- Modular and clean code structure

### Best Practices Implemented

- ✅ MVC architecture
- ✅ Error handling middleware
- ✅ Input validation
- ✅ Proper HTTP status codes
- ✅ Consistent API responses
- ✅ Security best practices
- ✅ Clean code principles

## 📈 Future Enhancements

- [ ] Socket.io for real-time features
- [ ] Redis for caching
- [ ] Rate limiting
- [ ] API documentation (Swagger)
- [ ] Unit and integration tests
- [ ] Docker containerization
- [ ] CI/CD pipeline
- [ ] Logging system
- [ ] Analytics dashboard

## 📄 License

ISC

## 👥 Contributors

Your Name

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For support, email nurmohammad0605@gmail.com or create an issue in the repository.

---

**Built with ❤️ using Node.js, Express, and MongoDB**
