# Fly Right ✈️

A modern flight booking application built with Next.js, React, and Supabase. This application provides a seamless experience for users to search, book, and manage their flights with real-time notifications and offline capabilities.

## 🚀 Features

- **Flight Search & Booking**: Search for flights with advanced filtering options
- **Real-time Notifications**: Email notifications for booking confirmations and flight updates
- **Offline Support**: Progressive Web App with offline data storage
- **Admin Dashboard**: Comprehensive admin panel for managing flights, bookings, and users
- **Responsive Design**: Modern UI built with Tailwind CSS
- **Testing**: Comprehensive test suite with Jest and Playwright
- **Type Safety**: Full TypeScript support

## 🛠️ Tech Stack

- **Framework**: Next.js 15.3.4
- **Frontend**: React 19
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Testing**: Jest, React Testing Library, Playwright
- **Email**: Nodemailer
- **Charts**: Chart.js with react-chartjs-2
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project
- Docker (optional, for containerized deployment)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd fly-right-frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Email Configuration (for notifications)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
EMAIL_FROM=your_from_email

# Database URL (if using direct connection)
DATABASE_URL=your_database_url
```

### 4. Database Setup

Run the database schema to set up your tables:

```bash
# Connect to your Supabase database and run:
psql -h your_host -U your_user -d your_database -f schema.sql
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### E2E Tests

```bash
# Run Playwright tests
npm run test:e2e
```

## 🐳 Docker Deployment

### Build and Run with Docker

```bash
# Build the Docker image
docker build -t fly-right-frontend .

# Run the container
docker run -p 3000:3000 --env-file .env.local fly-right-frontend
```

### Docker Compose (Optional)

Create a `docker-compose.yml` file for easier deployment:

```yaml
version: '3.8'
services:
  fly-right-frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.local
```

## 📁 Project Structure

```
fly-right-frontend/
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── admin/          # Admin dashboard pages
│   │   ├── api/            # API routes
│   │   ├── auth/           # Authentication pages
│   │   ├── book/           # Flight booking pages
│   │   └── my-bookings/    # User booking management
│   ├── components/         # Reusable React components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries
│   └── workers/            # Web Workers for offline functionality
├── public/                 # Static assets
├── tests/                  # E2E tests
└── src/__tests__/          # Unit tests
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run unit tests
- `npm run test:e2e` - Run E2E tests

## 📧 Email Notifications

The application includes a comprehensive email notification system:

- **Booking Confirmations**: Sent when a booking is successfully made
- **Flight Updates**: Notifications for flight status changes
- **Daily Reminders**: Automated reminders for upcoming flights

See [EMAIL_NOTIFICATIONS.md](./EMAIL_NOTIFICATIONS.md) for detailed configuration.

## 🔒 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SMTP_HOST` | SMTP server host | Yes |
| `SMTP_PORT` | SMTP server port | Yes |
| `SMTP_USER` | SMTP username | Yes |
| `SMTP_PASS` | SMTP password | Yes |
| `EMAIL_FROM` | From email address | Yes |


## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions, please open an issue in the repository or contact the development team.

---

**Happy Flying! ✈️**
