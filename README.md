# BidSphere - Online Auction System

![Node.js](https://img.shields.io/badge/node.js-20+-green.svg)
![React](https://img.shields.io/badge/react-19+-blue.svg)
![MongoDB](https://img.shields.io/badge/mongodb-Atlas-green.svg)

## Overview

  BidSphere is a comprehensive full-stack online auction platform that enables secure, transparent and real-time bidding for buyers and sellers. Built with modern web technologies, it provides a complete end-to-end auction experience with role-based access control, automated bidding, secure payments, and delivery workflows.

## Key Features

### Authentication & User Management
- **User Registration & Email Verification** - Secure signup with email verification
- **Role-Based Access Control** - User and Admin roles with specific permissions
- **Admin Dashboard** - Complete administrative control over platform operations
- **Profile Management** - User profile updates and settings

### Auction System
- **Create Auctions** - Sellers can create detailed auction listings with images
- **Real-Time Bidding** - Live bidding system with automatic updates
- **AutoBid Feature** - Automated bidding system with customizable limits
- **Auction Management** - Complete auction lifecycle management with status tracking
- **Winner Announcement** - Automated winner selection and notification

### Payment & Financial
- **Registration Fees** - Secure fee collection for platform access
- **Payment Processing** - UPI payments via QR codes and secure payment links
- **Invoice Generation** - Automatic invoice creation using html2canvas
- **Financial Tracking** - Complete transaction history and records

### Rating & Review System
- **Seller Ratings** - Comprehensive rating system for seller credibility
- **Review Management** - User reviews with CRUD operations
- **Rating Display** - Integrated rating display in seller profiles

### Delivery & Logistics
- **Delivery Management** - Complete delivery workflow tracking
- **Delivery MVC Architecture** - Structured delivery system with models, views, controllers
- **Shipping Integration** - Connected with shipping providers for logistics

### Other Features
- **Cloudinary Integration** - Cloud-based image storage and optimization
- **QR Code Generation** - QR codes for fee registration and verification
- **Automated Cron Jobs** - Scheduled tasks for auction status updates
- **CORS Configuration** - Secure cross-origin resource sharing
- **Email Notifications** - Transactional emails for key events

## Architecture

### Backend (Node.js + Express)
```
backend/
├── controllers/     # Business logic handlers
├── models/         # MongoDB data models
├── routes/         # API route definitions
├── middleware/     # Custom middleware functions
├── services/       # External service integrations
├── jobs/           # Scheduled tasks and cron jobs
├── email-templates/# Email notification templates
└── server.js       # Express server configuration
```

### Frontend (React + Vite)
```
frontend/src/
├── components/     # Reusable UI components
├── pages/          # Page-level components
├── api/            # API service functions
├── utils/          # Utility functions
├── constants/      # Application constants
└── assets/         # Static assets
```

## Technology Stack

### Backend Technologies
- **Node.js 20+** - JavaScript runtime
- **Express.js 5** - Web framework
- **MongoDB + Mongoose** - Database and ODM
- **JWT Authentication** - Secure token-based authentication
- **bcryptjs** - Password hashing
- **Cloudinary** - Cloud image storage
- **Nodemailer** - Email service
- **node-cron** - Scheduled task management
- **QR Code** - QR code generation
- **html2canvas** - Canvas-based image generation

### Frontend Technologies
- **React 19** - UI library
- **Vite 7** - Build tool and dev server
- **React Router 7** - Client-side routing
- **Tailwind CSS 4** - Utility-first CSS framework
- **Axios** - HTTP client
- **React Toastify** - Notification system
- **Lucide React** - Icon library
- **jsPDF** - PDF generation
- **Testing Library** - Component testing

### Development Tools
- **ESLint** - Code linting
- **Vitest** - Unit testing framework
- **Git** - Version control
- **Render.com** - Deployment platform

## Application Features in Detail

### User Roles & Permissions

**Buyer:**
- Browse auctions
- Place bids (manual and automatic)
- View bid history
- Manage watchlist
- Rate sellers

**Seller:**
- Create and manage auctions
- View auction analytics
- Manage listings
- Respond to buyer inquiries
- View ratings and reviews

**Admin:**
- Complete platform oversight
- User management
- Auction moderation
- System configuration
- Payment Verification

### Auction Lifecycle
1. **Creation** - Seller creates auction with details and images
2. **Active** - Auction is live and accepting bids
3. **Extension** - Automatic extension if bids placed near end
4. **Ended** - Auction closes and winner is determined
5. **Payment** - Winner processes payment
6. **Delivery** - Product shipping and tracking

### Automated Systems
- **Auction Status Updater** - Cron job that updates auction statuses every minute
- **AutoBid System** - Automatically places bids on behalf of users up to their limit
- **Email Notifications** - Automated emails for key events (auction end, winning, etc.)
- **Winner Selection** - Automated winner announcement and notification

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcryptjs for secure password storage
- **CORS Protection** - Configured cross-origin resource sharing
- **Input Validation** - Server-side input sanitization
- **Role-Based Access** - Secure authorization based on user roles
- **Environment Variables** - Secure configuration management

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Support & Contact

For support, questions, or contributions, please contact:
- Email: bidsphere.auction@gmail.com

## Live Demo

The application is deployed and accessible at:
- **Frontend**: [https://bid-sphere-online-auction-system.vercel.app](https://bid-sphere-online-auction-system.vercel.app)
- **Backend**: [https://bidsphere-backend.onrender.com](https://bidsphere-backend.onrender.com)

---

