# EduTrack AI

## AI-Powered Education Management Platform

EduTrack AI is an AI-powered education management platform designed to simplify school and college administration through intelligent automation, attendance management, fee tracking, online payments, and AI-powered insights.

**Live Demo:** https://edutrack-ai-98ka.vercel.app

**GitHub Repository:** https://github.com/gowtham-py/edutrack-ai

## Features

### Education Management
- Multi-school and multi-institution architecture.
- Student and teacher management.
- Class, section, and subject management.
- Role-based dashboards and access.
- School-specific data management.

### Attendance Management
- Teacher-triggered attendance sessions.
- Class and subject-based attendance.
- Attendance records and history.
- Attendance session locking.
- Attendance analytics and reporting.

### Fee Management and PayPal Integration
- Student fee invoices and payment tracking.
- Outstanding fee monitoring.
- PayPal Checkout integration.
- Payment creation and capture verification.
- Payment receipts and transaction history.
- Fee collection analytics.

PayPal Sandbox is currently used for demonstration and testing.

### AI-Powered Copilot
Powered by Google's Gemini API.

- Natural-language interaction.
- School administration insights.
- Attendance analysis.
- Fee collection insights.
- PayPal payment analytics.
- Role-aware information retrieval.

### Dashboards and Analytics
- Student and teacher statistics.
- Fee collection summaries.
- Payment method analysis.
- Attendance information.
- Institutional insights.

## Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Full-stack application |
| React | User interface |
| TypeScript | Application development |
| Supabase | Authentication and database |
| Google Gemini API | AI Copilot |
| PayPal | Online payments |
| Tailwind CSS | Styling |
| Vercel | Deployment |

## Architecture

- Next.js App Router for frontend and backend API routes.
- Supabase for authentication and database operations.
- Server-side API routes for protected operations.
- Gemini API for AI-powered assistance.
- PayPal APIs for payment processing and verification.
- Vercel for deployment.

## Local Development

### Prerequisites

- Node.js
- npm
- Supabase project
- Google Gemini API key
- PayPal Developer account

### Installation

Clone the repository:

```bash
git clone https://github.com/gowtham-py/edutrack-ai.git
cd edutrack-ai
npm install
```

### Environment Variables

Create a `.env.local` file in the project root.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
GEMINI_API_KEY=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_ENV=sandbox
PAYPAL_DEMO_INR_PER_USD=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Use your own credentials. Never commit environment files or expose server-side secrets.

### Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Security

- Server-side handling of sensitive credentials.
- Authenticated backend operations.
- Role-aware data access.
- Student-specific invoice verification.
- PayPal payment verification before recording successful transactions.
- GitHub push protection enabled.

## Deployment

The application is deployed on Vercel.

**Live Application:** https://edutrack-ai-98ka.vercel.app

## Vision

EduTrack AI aims to make educational administration smarter and more efficient through artificial intelligence, automation, transparent financial management, and actionable institutional insights.

## Built With

EduTrack AI — Intelligent automation for modern education management.
