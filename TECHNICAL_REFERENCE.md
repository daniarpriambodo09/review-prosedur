# PIC Feature - Technical Reference

## Database Schema

### pic_users
```sql
CREATE TABLE pic_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(200) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    department VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `idx_pic_users_email` - For login queries
- `idx_pic_users_is_active` - For filtering active PICs

### pic_documents
```sql
CREATE TABLE pic_documents (
    id SERIAL PRIMARY KEY,
    pic_id INTEGER NOT NULL,
    document_number VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pic_id) REFERENCES pic_users(id)
);
```

**Statuses:** pending, approved, rejected, revision, archived

### pic_requests
```sql
CREATE TABLE pic_requests (
    id SERIAL PRIMARY KEY,
    pic_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pic_id) REFERENCES pic_users(id),
    FOREIGN KEY (document_id) REFERENCES pic_documents(id)
);
```

**Statuses:** pending, in_progress, completed, rejected

### pic_document_requests
```sql
CREATE TABLE pic_document_requests (
    id SERIAL PRIMARY KEY,
    pic_id INTEGER NOT NULL,
    document_number VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pic_id) REFERENCES pic_users(id)
);
```

**Statuses:** pending, approved, rejected, in_progress, completed

### pic_activities
```sql
CREATE TABLE pic_activities (
    id SERIAL PRIMARY KEY,
    pic_id INTEGER NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    description VARCHAR(500),
    ip_address VARCHAR(50),
    user_agent TEXT,
    target_type VARCHAR(50),
    target_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pic_id) REFERENCES pic_users(id)
);
```

**Activity Types:**
- login
- logout
- review
- request
- document
- view
- download
- approval

## API Response Formats

### Authentication Response
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "pic001@example.com",
    "fullName": "PIC User 001",
    "email": "pic001@example.com",
    "role": "pic",
    "picId": 1
  }
}
```

### Dashboard Response
```json
{
  "stats": {
    "totalDocuments": 15,
    "pendingReview": 3,
    "completedReview": 10,
    "totalRequests": 5
  },
  "documents": [
    {
      "id": 1,
      "documentNumber": "DKM-2026-001",
      "title": "Document Title",
      "status": "pending",
      "createdAt": "2026-04-20T10:00:00Z"
    }
  ],
  "activities": [
    {
      "id": 1,
      "activityType": "login",
      "description": "PIC login",
      "createdAt": "2026-04-20T10:00:00Z"
    }
  ]
}
```

### Error Response
```json
{
  "error": "Email atau password salah",
  "status": 401
}
```

## Component Architecture

### PICDashboardHeader
**Props:**
```typescript
interface Props {
  userName: string;
  onLogout: () => void;
}
```

**Features:**
- Logo and branding
- User name display
- Logout button
- Responsive navigation

### PICStatsCards
**Props:**
```typescript
interface Props {
  stats: {
    totalDocuments: number;
    pendingReview: number;
    completedReview: number;
    totalRequests: number;
  };
}
```

**Components:**
- StatCard (reusable stat display)
- Color-coded by type
- Icon indicators

### PICDocumentsList
**Props:**
```typescript
interface Props {
  documents: Array<{
    id: number;
    documentNumber: string;
    title: string;
    status: string;
    createdAt: string;
  }>;
}
```

**Features:**
- Sortable document table
- Status color coding
- Date formatting
- Empty state handling

### PICActivityLog
**Props:**
```typescript
interface Props {
  activities: Array<{
    id: number;
    activityType: string;
    description: string;
    createdAt: string;
  }>;
}
```

**Features:**
- Timeline view
- Activity icons
- Relative timestamps
- Scrollable list

### RequestReviewModal
**Props:**
```typescript
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (documentIds: number[]) => Promise<void>;
}
```

**Features:**
- Multi-select documents
- Optional notes field
- Form validation
- Loading state

### RequestNewDocumentModal
**Props:**
```typescript
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}
```

**Features:**
- Required fields validation
- Optional fields
- Success feedback
- Error handling

## Authentication Flow

```
Client                          Server
  |                                |
  |-- POST /api/auth/pic-login--->|
  |                                |-- Query pic_users
  |                                |-- Verify email exists
  |                                |-- Verify password (bcrypt)
  |                                |-- Log login activity
  |<-- 200 {user, success: true}--|
  |                                |
  |-- Store user in localStorage   |
  |-- Redirect to /pic-dashboard   |
  |                                |
  |-- GET /api/pic/dashboard ----->|
  |                                |-- Check user auth
  |                                |-- Get dashboard stats
  |                                |-- Get documents list
  |                                |-- Get activities
  |<-- 200 {stats, documents...}--|
  |                                |
  |-- Render dashboard             |
```

## State Management

### AuthContext
```typescript
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<Result>;
  picLogin: (email: string, password: string) => Promise<Result>;
  logout: () => void;
  isLoading: boolean;
}
```

### PIC Dashboard State
```typescript
interface PICDashboardData {
  stats: Stats;
  documents: Document[];
  activities: Activity[];
}

// Component state
const [dashboardData, setDashboardData] = useState<PICDashboardData | null>(null);
const [showRequestReviewModal, setShowRequestReviewModal] = useState(false);
const [showNewDocumentModal, setShowNewDocumentModal] = useState(false);
```

## Password Hashing

**Algorithm:** bcryptjs v3.0.3

**Hashing (Server):**
```typescript
import bcryptjs from 'bcryptjs';

const hashedPassword = await bcryptjs.hash(plainPassword, 10);
```

**Verification (Server):**
```typescript
const isValid = await bcryptjs.compare(plainPassword, hashedPassword);
```

## Error Handling

### Server-Side
```typescript
try {
  // Operation
} catch (error) {
  console.error('Error context:', error);
  return NextResponse.json(
    { error: 'User-friendly message' },
    { status: 500 }
  );
}
```

### Client-Side
```typescript
try {
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(data.error);
  const data = await response.json();
} catch (error) {
  setError(error instanceof Error ? error.message : 'Terjadi kesalahan');
}
```

## Performance Optimization

### Database
- **Indexes:** All foreign keys and frequently queried fields indexed
- **Triggers:** Automatic updated_at timestamp updates
- **Pagination:** Limit queries to recent data

### Frontend
- **Lazy Loading:** Modals load only when opened
- **Memoization:** React.memo for static components
- **Code Splitting:** Components loaded on demand

### Caching Strategies
- **Client Cache:** User data stored in localStorage
- **Server Cache:** Consider Redis for frequently accessed data
- **Browser Cache:** Static assets cached by browser

## Security Best Practices

### Password Security
✓ bcryptjs with salt rounds of 10
✓ Never log passwords
✓ Passwords hashed in transit (HTTPS)

### SQL Injection Prevention
✓ Parameterized queries everywhere
✓ No string concatenation for SQL
✓ Input validation on all endpoints

### XSS Prevention
✓ React auto-escaping of JSX
✓ No dangerouslySetInnerHTML
✓ Sanitize user input

### CSRF Protection
✓ SameSite cookie flags
✓ Consider adding CSRF tokens

### Session Security
✓ Secure session storage (consider httpOnly cookies)
✓ Session timeout
✓ Logout clears all session data

## Monitoring & Metrics

### Key Metrics
- Login success rate
- Average dashboard load time
- API response times
- Database query performance
- Error rate
- Activity log volume

### Alerting
- Failed login attempts (multiple)
- Database connection failures
- API errors (>5% error rate)
- Performance degradation (>2s load time)

## Scaling Considerations

### Database
- **Sharding:** By pic_id for horizontal scaling
- **Replication:** Master-slave for read scaling
- **Connection Pooling:** pgBouncer or similar

### Application
- **Load Balancing:** Multiple app instances
- **Caching Layer:** Redis for session/activity data
- **CDN:** For static assets
- **Async Processing:** Queue system for heavy operations

### Monitoring
- **Distributed Tracing:** Track requests across services
- **Metrics Aggregation:** Prometheus/Grafana
- **Log Aggregation:** ELK stack or similar

## Testing Strategy

### Unit Tests
- Password hashing
- Activity logging
- API response formatting

### Integration Tests
- Authentication flow
- Database operations
- API endpoints

### E2E Tests
- Login and dashboard access
- Modal operations
- Document requests

### Performance Tests
- Dashboard load times
- Database query performance
- Concurrent user handling

## Deployment Strategy

### Development
```
git checkout -b feature/pic-feature
# ... implement feature
git push origin feature/pic-feature
# Create pull request
# Code review
# Merge to main
```

### Staging
```
docker build -t review-prosedur:staging .
docker run -e ENV=staging ...
```

### Production
```
docker build -t review-prosedur:v1.0.0 .
docker push review-prosedur:v1.0.0
kubectl apply -f k8s/production.yaml
```

## Troubleshooting Guide

### Issue: Login fails with "Email atau password salah"
**Solutions:**
1. Check email exists in database: `SELECT * FROM pic_users WHERE email = 'email@example.com';`
2. Verify password is hashed: `SELECT password FROM pic_users WHERE email = 'email@example.com';` (should start with $2b$)
3. Test bcrypt comparison manually in Node REPL

### Issue: Dashboard shows "Terjadi kesalahan saat mengambil data"
**Solutions:**
1. Check API response: `curl http://localhost:3000/api/pic/dashboard`
2. Check database tables exist: `\dt pic_*`
3. Check user is properly authenticated
4. Review server logs for errors

### Issue: Modals don't submit
**Solutions:**
1. Check browser console for errors
2. Verify API endpoint exists
3. Check form validation is passing
4. Check network tab for failed requests

## References

- bcryptjs: https://github.com/dcodeIO/bcrypt.js
- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- React Hooks: https://react.dev/reference/react/hooks
- PostgreSQL JSON: https://www.postgresql.org/docs/current/datatype-json.html
