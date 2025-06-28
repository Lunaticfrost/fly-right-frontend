-- USERS TABLE (linked to auth.users)
create table if not exists users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  phone text,
  email text,
  created_at timestamp default current_timestamp
);

-- FLIGHTS TABLE
create table if not exists flights (
  id uuid primary key default gen_random_uuid(),
  flight_number text not null,
  airline text not null,
  origin text not null,
  destination text not null,
  departure_time timestamp not null,
  arrival_time timestamp not null,
  duration int,
  cabin_class text,
  price float8 not null,
  available_seats int not null,
  status text default 'On Time'
);

-- BOOKINGS TABLE
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id) on delete cascade,
  flight_id uuid references flights (id) on delete cascade,
  booking_date timestamp default current_timestamp,
  passengers jsonb,
  cabin_class text,
  total_price float8,
  trip_type text default 'one-way',
  status text default 'confirmed',
  payment_method text,
  payment_status text,
  transaction_id text,
  paid_at timestamp
);

-- EMAIL NOTIFICATIONS TABLE
create table if not exists email_notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings (id) on delete cascade,
  type varchar,
  recipient_email varchar,
  sent_at timestamptz,
  status varchar,
  metadata jsonb,
  resent_at timestamptz
);
