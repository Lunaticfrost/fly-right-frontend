# Admin Dashboard

This admin dashboard provides a clean interface for managing the Fly Right flight booking system.

## Features

### Dashboard
- Overview of key metrics (flights, bookings, revenue)
- Revenue calculated from actual booking data in Supabase
- Recent bookings table with flight details
- Real-time data from Supabase

### Flights Management
- View all flights in the system
- Search and filter by airline, cabin class
- Display flight details including schedule, pricing, and seat availability
- Data fetched from Supabase flights table

### Bookings Management
- View all bookings with flight details
- Search and filter by status
- Display booking information including passenger count, pricing, and dates
- Data fetched from Supabase bookings table with individual flight lookups

## Data Sources & Revenue

### Revenue Calculation
- **Source**: Calculated from `total_price` field in bookings table
- **Method**: Sum of all booking total prices
- **Real-time**: Updates automatically when new bookings are made

### Data Fetching
- **Flights**: Direct Supabase table queries
- **Bookings**: Supabase table with individual flight lookups for details
- **Revenue**: Aggregated from bookings table

## Access

The admin dashboard is accessible at `/admin` and requires authentication. The system checks for admin access based on:

1. User authentication status
2. Admin email list (configurable in the layout)
3. Development mode access

## Security

- Authentication required for all admin routes
- Admin email validation
- Development mode access for testing
- No create/edit/delete operations (read-only for security)
- Graceful fallbacks for data fetching errors

## Navigation

The admin dashboard uses a responsive sidebar navigation with:
- Dashboard overview (with revenue metrics)
- Flights management
- Bookings management

All pages include search and filtering capabilities for easy data exploration. 