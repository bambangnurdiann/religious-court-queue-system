# Pengadilan Agama Queue Management System

A comprehensive queue management system for Religious Courts (Pengadilan Agama) built with Next.js, Neon PostgreSQL, Socket.io, and Web Push Notifications.

## System Overview

The system consists of three interconnected applications:

### 1. **Satpam Portal** (`/satpam`)
- QR code scanning and manual card activation
- Real-time queue card registration
- Security officer interface for card management

### 2. **Counter Dashboard** (`/counter`)
- Counter setup and configuration
- Real-time queue management
- Call next visitor functionality
- Queue statistics and tracking
- Color-coded counter organization

### 3. **Visitor Queue Page** (`/visitor`)
- Queue position checking
- Real-time position updates
- Push notification subscriptions
- Visitor status tracking

## Technology Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **Socket.io Client** - Real-time communication
- **Sonner** - Toast notifications

### Backend
- **Node.js** - Runtime
- **Next.js API Routes** - RESTful API
- **Socket.io** - WebSocket server for real-time updates
- **Better Auth** - Authentication (email + password)

### Database
- **Neon PostgreSQL** - Database
- **Drizzle ORM** - Type-safe ORM

### PWA & Notifications
- **Service Workers** - Offline support and PWA capabilities
- **Web Push API** - Browser push notifications
- **Web Manifest** - PWA metadata

## Database Schema

### Core Tables

**counters**
- Counter configuration and status
- Color classification (blue, green, orange, purple, teal)
- Current queue position tracking

**queueCards**
- QR code-based queue cards
- Activation status tracking
- Card lifecycle management

**dailyQueueSessions**
- Daily queue session management
- Session activation status
- Auto-reset support

**queueEntries**
- Individual visitor entries
- Status tracking (waiting, in_service, completed, skipped)
- Arrival and service time tracking
- Queue position management

**visitorSubscriptions**
- Push notification subscriptions
- Linked to queue cards

**queueStatistics**
- Performance metrics per counter per session
- Wait time and service time averages
- Visitor count tracking

### Better Auth Tables (Included)
- `user` - User accounts
- `session` - User sessions
- `account` - Account linking
- `verification` - Email verification

## Features

### Real-time Queue Management
- Socket.io-powered real-time updates across all applications
- Instant queue position synchronization
- Live counter status updates

### QR Code System
- Satpam portal for QR code scanning
- Manual card number entry fallback
- Card activation workflow

### Push Notifications
- Web Push API integration
- Service Worker for notification handling
- Queue position alerts
- Call-next notifications

### PWA Support
- Installable on mobile and desktop
- Offline-first architecture with Service Workers
- App shortcuts for quick access
- Responsive design for all screen sizes

### Authentication
- Email + password authentication via Better Auth
- Secure session management
- User-scoped data isolation

## Installation

### Prerequisites
- Node.js 18+
- pnpm (or npm/yarn)
- Neon PostgreSQL account
- Environment variables set

### Setup Steps

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Environment Variables**
   Create `.env.local`:
   ```
   DATABASE_URL=postgresql://...
   BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
   ```

3. **Database Setup**
   Tables are automatically created via Neon MCP during deployment

4. **Run Development Server**
   ```bash
   pnpm dev
   ```

5. **Access the Application**
   - Home: http://localhost:3000
   - Sign In: http://localhost:3000/sign-in
   - Sign Up: http://localhost:3000/sign-up

## Usage

### For Security Officers (Satpam)
1. Sign in to the Satpam portal
2. Use QR scanner to scan queue cards OR manually enter card numbers
3. Confirm card activation
4. System broadcasts card activation in real-time

### For Counter Operators
1. Sign in to Counter Dashboard
2. Select or create a counter with color coding
3. View current queue for your counter
4. Click "Call Next" to serve the next visitor
5. Mark as complete when finished
6. View queue statistics in real-time

### For Visitors
1. Sign in with their queue card number
2. Check real-time queue position
3. See number of visitors ahead
4. (Optional) Enable push notifications
5. Receive notifications when approaching their turn

## Real-time Features

### Socket.io Events

**Emitted Events:**
- `queue:update` - Queue entry status changed
- `queue:call-next` - Next visitor called to counter
- `queue:position-update` - Visitor position in queue updated

**Listened Events:**
- Same as emitted for bi-directional synchronization

### Push Notifications

**Types:**
- Queue position updates
- Call-next notifications
- System announcements

**Setup:**
1. Enable notifications in browser
2. Click "Enable" button in Visitor Queue page
3. Service Worker handles notification delivery

## Development

### Project Structure
```
/vercel/share/v0-project/
├── app/
│   ├── page.tsx                    # Home page
│   ├── satpam/                     # Satpam portal
│   ├── counter/                    # Counter dashboard
│   ├── visitor/                    # Visitor queue page
│   ├── api/
│   │   ├── auth/[...all]/         # Better Auth handler
│   │   └── socket/                # Socket.io endpoint
│   ├── actions/                    # Server actions
│   └── layout.tsx                  # Root layout
├── components/
│   ├── counter/                    # Counter components
│   ├── satpam/                     # Satpam components
│   ├── visitor/                    # Visitor components
│   ├── ui/                         # shadcn/ui components
│   └── auth-form.tsx              # Auth form
├── lib/
│   ├── auth.ts                     # Better Auth config
│   ├── auth-client.ts              # Auth client
│   ├── db/
│   │   ├── index.ts               # Drizzle setup
│   │   └── schema.ts              # Database schema
│   ├── socket.ts                   # Socket.io utilities
│   └── push-notifications.ts       # Push notification utils
├── public/
│   ├── sw.js                       # Service Worker
│   └── manifest.json              # PWA manifest
└── README.md                       # This file
```

### Key Functions

**Queue Management** (`app/actions/queue.ts`)
- `createCounter()` - Create new counter
- `addQueueEntry()` - Add visitor to queue
- `updateQueueEntryStatus()` - Change visitor status
- `getVisitorQueuePosition()` - Get visitor queue info
- `getNextQueueEntry()` - Get next in queue

**Socket.io** (`lib/socket.ts`)
- `initializeSocket()` - Setup Socket.io connection
- `emitQueueUpdate()` - Broadcast queue changes
- `onQueueUpdate()` - Listen for queue updates

**Push Notifications** (`lib/push-notifications.ts`)
- `registerServiceWorker()` - Register SW
- `subscribeToPushNotifications()` - Subscribe to notifications
- `notifyQueuePosition()` - Send position notification

## Testing

### Manual Testing Checklist

**Authentication**
- [ ] Sign up new user
- [ ] Sign in with credentials
- [ ] Sign out functionality
- [ ] Session persistence

**Satpam Portal**
- [ ] QR scanner starts/stops
- [ ] Manual card entry works
- [ ] Card activation successful
- [ ] Duplicate card detection

**Counter Dashboard**
- [ ] Create new counter
- [ ] Select different counters
- [ ] Call next visitor
- [ ] Mark visitor complete
- [ ] Statistics update correctly

**Visitor Queue**
- [ ] Enter card number
- [ ] View queue position
- [ ] See position changes in real-time
- [ ] Receive push notifications

**Real-time Features**
- [ ] Changes sync across browser tabs
- [ ] Socket.io connection indicators
- [ ] Fallback polling when needed

**PWA Features**
- [ ] App installable on mobile
- [ ] Works offline (cached pages)
- [ ] Service Worker active
- [ ] Push notifications work

### Browser DevTools

**Testing Socket.io:**
1. Open DevTools Network tab
2. Look for WebSocket connections to `/api/socket`
3. Monitor messages in console

**Testing Service Worker:**
1. DevTools > Application > Service Workers
2. Check registration and cache status
3. Test offline functionality

**Testing Push Notifications:**
1. DevTools > Application > Manifest
2. Verify manifest.json loads
3. Check Service Worker has notification permissions

## Performance Considerations

### Optimization Tips
1. **Database Queries** - Use indexes on frequently queried columns
2. **Socket.io** - Implement room-based broadcasting for scalability
3. **Caching** - Service Worker caches static assets
4. **Polling** - Adjust polling interval based on server load

### Scalability
- For high traffic, implement Redis for Socket.io adapters
- Use database connection pooling (Neon supports this)
- Implement rate limiting on API endpoints
- Cache queue statistics

## Security

### Implemented Measures
- Better Auth for secure authentication
- Per-user data scoping in all queries
- HTTPS/WSS for Socket.io connections
- CSRF protection via session tokens
- Input validation on forms

### Recommendations
- Implement rate limiting for sensitive endpoints
- Add audit logging for security events
- Regular security updates
- Monitor for suspicious queue activity

## Troubleshooting

### Service Worker Issues
- Clear browser cache: DevTools > Application > Clear storage
- Re-register worker: Hard refresh (Ctrl+Shift+R)

### Socket.io Connection Issues
- Check browser console for errors
- Verify API endpoint accessible
- Check CORS settings if cross-origin

### Database Issues
- Verify DATABASE_URL environment variable
- Check Neon dashboard for connection limits
- Review query performance in slow query logs

### Push Notification Issues
- Ensure notifications enabled in browser
- Check Service Worker registration
- Verify manifest.json loads
- Test notification permission in browser settings

## Deployment

### Vercel Deployment
1. Connect GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Production Checklist
- [ ] Environment variables configured
- [ ] Database connection verified
- [ ] Service Worker cached correctly
- [ ] Push notification setup
- [ ] HTTPS enabled
- [ ] SSL certificate valid

## Future Enhancements

1. **Advanced Analytics**
   - Queue performance dashboards
   - Peak hour analysis
   - Visitor flow patterns

2. **Multi-language Support**
   - Indonesian translations
   - RTL language support

3. **Mobile Apps**
   - Native iOS app
   - Native Android app
   - Cross-platform synchronization

4. **Advanced Features**
   - Priority queue lanes
   - Appointment scheduling
   - Multi-site management
   - SMS notifications

## Support & Documentation

- **API Documentation**: See inline JSDoc comments
- **Component Library**: shadcn/ui docs at ui.shadcn.com
- **Socket.io**: socket.io documentation
- **Web APIs**: MDN Web Docs

## License

Developed for Religious Court (Pengadilan Agama) queue management system.

## Version

v1.0.0 - Initial Release
