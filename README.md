# GlenKhumalo Backend API

Backend service for a Solace platform with role-based workflows for `admin`, `client`, and `creative`.

## Overview

This project provides REST APIs for:

- Authentication and account management
- Gig and job post management
- Orders, reviews, and notifications
- Social interactions (like/dislike, block, report)
- Chating functionality
- Verification, and admin operations
- Website content management

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- Stripe integrations
- Nodemailer for transactional emails
- Socket.IO for realtime messaging/events

## Getting Started

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root. Minimum required values:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

STRIPE_SECRET_KEY=your_stripe_key

EMAIL_USER=your_smtp_user
EMAIL_PASSWORD=your_smtp_password
```

## Run

```bash
npm run dev
```

Production:

```bash
npm start
```

## Available Scripts

- `npm run dev` - start with nodemon
- `npm start` - start server
- `npm run staging` - run with `.env.staging`
- `npm run prod` - run with `.env.production`
- `npm run beta` - run with `.env.beta`

## API Base Path

All endpoints are served under:

```text
/api/v1
```

Use the provided Postman collections for endpoint-level examples:

- `GlenKhumalo_Postman_Documentation.json`

## Project Structure

```text
controllers/   request handlers
models/        mongoose schemas
route/         route modules
mainroute/     route composition
middleware/    auth/error/upload middlewares
utils/         shared helpers/services
errors/        custom error handlers
server.js      app bootstrap
```

## Authentication

Protected routes require:

```text
Authorization: Bearer <access_token>
```
