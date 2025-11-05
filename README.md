# Xchange

A modern marketplace for buying and selling locally, built with Next.js 14, Supabase, and Tailwind CSS.

## Features

- **Local Marketplace**: Buy and sell items with people in your community
- **Real-time Chat**: Instant messaging between buyers and sellers
- **Mobile-First**: Optimized for mobile with responsive design
- **Secure Authentication**: Username-based authentication with Supabase
- **Image Uploads**: Cloud storage for product photos
- **Modern UI**: Dark theme with smooth animations

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Backend**: Supabase (Database + Auth + Storage + Realtime)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd xchange-lite
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Create environment file:
```bash
cp .env.local.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

5. Start the development server:
```bash
npm run dev
# or
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The app uses the following Supabase tables:

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### posts
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  username TEXT NOT NULL,
  mode TEXT CHECK (mode IN ('selling', 'requesting')) NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### chats
```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1 TEXT NOT NULL,
  user2 TEXT NOT NULL,
  post_id UUID REFERENCES posts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Storage Buckets

- `post-images`: Public bucket for post photos
- `avatars`: Public bucket for user avatars

## MVP Self-Test Checklist

Run through these steps to verify the app is working correctly:

### 1. First Visit Flow
- [ ] Visit site for the first time
- [ ] See animated welcome screen (1.5s)
- [ ] Automatically redirected to `/auth`
- [ ] See two buttons: "Create account" and "Already have an account"

### 2. Account Creation
- [ ] Click "Create account"
- [ ] Fill signup form (name, username, optional avatar)
- [ ] Username validation (3-20 chars, alphanumeric + underscores)
- [ ] Duplicate username check
- [ ] Avatar upload to Supabase storage
- [ ] Success toast and redirect to `/feed`
- [ ] `localStorage['x_user']` set correctly

### 3. Feed Navigation
- [ ] Refresh page - stays on `/feed` (no auth redirect)
- [ ] See empty state with CTA to create post
- [ ] Bottom navigation works (Feed, New Post, Chats, Profile)
- [ ] Header shows "Xchange" title

### 4. Post Creation
- [ ] Click "New Post" or bottom nav
- [ ] Upload image (max 5MB validation)
- [ ] Select mode (Selling/Requesting radio buttons)
- [ ] Fill title and description
- [ ] Optional location field
- [ ] Submit creates post in database
- [ ] Redirect to feed with new post visible
- [ ] Post shows correct mode pill (green for selling, blue for requesting)

### 5. Post Interaction
- [ ] Click on post card
- [ ] View full post details
- [ ] See correct mode display
- [ ] Click "Message seller/requester"
- [ ] Chat created or existing chat opened
- [ ] Redirect to chat thread

### 6. Real-time Chat
- [ ] Send messages in chat
- [ ] Open same chat in new tab
- [ ] Messages appear instantly in both tabs
- [ ] Scroll to bottom on new messages
- [ ] Timestamps show correctly

### 7. Profile Management
- [ ] Navigate to profile
- [ ] See user info and post count
- [ ] Edit profile (name and username)
- [ ] Username change cascades to posts/chats/messages
- [ ] localStorage updated with new username

### 8. Sign Out
- [ ] Sign out button clears localStorage
- [ ] Redirects to auth screen
- [ ] Fresh visit shows welcome again

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (public)/          # Public routes (no auth required)
│   │   ├── auth/          # Auth choice screen
│   │   ├── signup/        # Registration
│   │   ├── signin/        # Login
│   │   └── welcome/       # Welcome animation
│   ├── feed/              # Main feed
│   ├── post/              # Post pages
│   │   ├── new/           # Create post
│   │   └── [id]/          # Post details
│   ├── chats/             # Chat list
│   │   └── [id]/          # Chat thread
│   ├── profile/           # User profile
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home redirect
├── components/            # Reusable components
│   ├── Welcome.tsx        # Welcome animation
│   ├── BottomNav.tsx      # Mobile navigation
│   └── client-providers.tsx # Client-side providers
├── lib/                   # Utilities
│   ├── supabase.ts        # Supabase client
│   ├── db.ts              # Database helpers
│   ├── validators.ts      # Zod schemas
│   └── time.ts            # Time formatting
└── types/                 # TypeScript types
    └── index.ts           # Type definitions
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Quality

- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended config
- **Prettier**: Code formatting
- **No any types**: Full type safety

### Performance

- **Server Components**: Used where possible
- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic route-based splitting
- **Caching**: Appropriate caching strategies

## Deployment

The app can be deployed to Vercel, Netlify, or any platform supporting Next.js:

1. Connect your repository
2. Set environment variables
3. Deploy

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run the self-test checklist
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
