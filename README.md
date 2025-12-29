# Gupta Traders - E-Commerce Furniture Store

A modern e-commerce platform built with React, TypeScript, and Supabase.

## Project Overview

Gupta Traders is a full-featured furniture e-commerce store with:
- Product catalog with categories and search
- Shopping cart and wishlist functionality
- User authentication and profiles
- Order management system
- Admin dashboard for managing products, orders, and settings
- Responsive design with modern UI components

## Technologies Used

This project is built with:

- **Vite** - Build tool and development server
- **TypeScript** - Type-safe JavaScript
- **React** - UI library
- **React Router** - Client-side routing
- **shadcn-ui** - UI component library
- **Tailwind CSS** - Utility-first CSS framework
- **Supabase** - Backend as a Service (Database, Auth, Storage)
- **TanStack Query** - Data fetching and caching
- **React Hook Form** - Form management
- **Zod** - Schema validation

## Getting Started

### Prerequisites

- Node.js (v18 or higher) - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- npm or yarn
- A Supabase project (see setup instructions below)

### Installation

1. Clone the repository:
```sh
git clone <YOUR_GIT_URL>
cd guptatraders
```

2. Install dependencies:
```sh
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env` (if available) or create a `.env` file
   - Add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   VITE_SUPABASE_PROJECT_ID=your-project-id
   ```

4. Set up the database:
   - Run the SQL script from `docs/supabase-full-setup.sql` in your Supabase SQL Editor
   - This will create all necessary tables, functions, and policies

5. Start the development server:
```sh
npm run dev
```

The application will be available at `http://localhost:8080`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
guptatraders/
├── src/
│   ├── components/     # React components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   ├── context/       # React context providers
│   ├── integrations/  # External service integrations
│   ├── lib/           # Utility functions
│   └── types/         # TypeScript type definitions
├── docs/              # Documentation and SQL scripts
├── supabase/          # Supabase configuration and migrations
└── public/            # Static assets
```

## Features

### Customer Features
- Browse products by category
- Search products
- Add items to cart and wishlist
- User authentication (sign up/sign in)
- Order placement and tracking
- User profile management

### Admin Features
- Product management (CRUD operations)
- Category management
- Order management
- Customer management
- Coupon management
- Store settings configuration
- Return/refund management
- Analytics dashboard

## Deployment

### Build for Production

```sh
npm run build
```

The built files will be in the `dist/` directory.

### Deploy to Vercel/Netlify

1. Connect your repository to Vercel or Netlify
2. Set environment variables in the deployment platform
3. Configure build command: `npm run build`
4. Set output directory: `dist`

## Environment Variables

Required environment variables:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon/public key
- `VITE_SUPABASE_PROJECT_ID` - Your Supabase project ID

Optional (for server-side operations):
- `SUPABASE_SERVICE_KEY` - Your Supabase service role key (keep secure!)

## License

This project is private and proprietary.
