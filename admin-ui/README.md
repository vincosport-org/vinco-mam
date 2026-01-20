# Vinco MAM Admin UI

React-based admin interface for Vinco Media Asset Management platform.

## Tech Stack

- React 18
- TypeScript
- Vite
- TailwindCSS
- React Router
- React Query (TanStack Query)
- Zustand (state management)
- React Hot Keys

## Development

```bash
npm install
npm run dev
```

The development server will run on `http://localhost:5173`

## Building for Production

```bash
npm run build
```

This outputs to `../wordpress-plugin/assets/build/` where the WordPress plugin can load it.

## Project Structure

```
src/
├── components/     # React components organized by feature
├── hooks/          # Custom React hooks
├── stores/         # Zustand state stores
├── services/       # API clients and services
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── context/        # React context providers
```

## Features

- Image gallery with filtering and search
- Image editor with Lightroom-style adjustments
- Validation queue for AI recognition results
- Athlete management
- Album management
- Video integration (JW Player)
- User management
- Settings configuration

## API Integration

The UI communicates with the AWS backend through a WordPress REST API proxy. API calls are configured in `src/services/api.ts`.

## Environment

The WordPress plugin passes configuration via `window.vincoMAM`:
- `apiRoot` - API endpoint
- `nonce` - WordPress nonce for authentication
- `settings` - Plugin settings
- `user` - Current user information
- `currentPage` - Current WordPress admin page
