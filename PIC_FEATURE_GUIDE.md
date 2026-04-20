# PIC (Person In Charge) Feature Implementation Guide

## Overview
This document outlines the implementation of the PIC login and dashboard feature for the Review Prosedur application.

## Database Setup

### SQL Migration
Run the migration script to create all necessary tables:

```bash
cd web-app
node ../scripts/run-migration.js
```

**Tables Created:**
- `pic_users` - PIC authentication and profile data
- `pic_documents` - Documents assigned to PICs
- `pic_requests` - Review requests from PICs
- `pic_document_requests` - New document requests from PICs
- `pic_activities` - Activity log for audit trail

### Sample Data
To test the PIC login, use these credentials:
```
Email: pic001@example.com
Password: pic123456
```

First, you'll need to hash the password using bcrypt in your application. Use:
```bash
npx bcryptjs 'pic123456'
```

Then insert into the database:
```sql
INSERT INTO pic_users (email, password, full_name, department, is_active)
VALUES ('pic001@example.com', '<hashed_password>', 'PIC User 001', 'Quality Assurance', true);
```

## Frontend Structure

### Pages
1. **PIC Login Page** (`/pic-login`)
   - Email and password authentication
   - Redirects to PIC Dashboard on success
   - Link back to Admin login

2. **PIC Dashboard** (`/pic-dashboard`)
   - Statistics cards (total documents, pending reviews, completed reviews, total requests)
   - Document list with status
   - Activity log showing recent actions
   - Buttons for requesting document reviews and new documents

### Components
- `PICDashboardHeader` - Header with logout button
- `PICStatsCards` - Dashboard statistics
- `PICDocumentsList` - List of assigned documents
- `PICActivityLog` - Recent activities
- `RequestReviewModal` - Modal for reviewing existing documents
- `RequestNewDocumentModal` - Modal for requesting new documents

## API Endpoints

### Authentication
- `POST /api/auth/pic-login`
  - Body: `{ email: string, password: string }`
  - Returns: User object with role 'pic'

### Dashboard
- `GET /api/pic/dashboard`
  - Returns: Stats, documents list, and activity log

### Documents
- `GET /api/pic/documents`
  - Returns: List of documents assigned to PIC

### Requests
- `GET /api/pic/requests/review`
  - Returns: All review requests for PIC

- `POST /api/pic/requests/review`
  - Body: `{ documentIds: number[], notes?: string }`
  - Creates review requests for multiple documents

- `POST /api/pic/requests/new-document`
  - Body: `{ documentNumber: string, title: string, description?: string, reason?: string }`
  - Creates a new document request

## Authentication Flow

The PIC authentication extends the existing `AuthContext`:

1. PIC logs in with email and password
2. System verifies against `pic_users` table using bcrypt
3. User object is created with role: 'pic'
4. User is redirected to `/pic-dashboard`
5. Protected routes check for `user?.role === 'pic'`

### AuthContext Methods
```typescript
// Login existing PIC
await picLogin(email, password);

// Logout PIC
logout();
```

## Activity Logging

All PIC activities are logged to the `pic_activities` table:

- **Activity Types**: login, logout, review, request, document, view, download, approval
- **Logged Information**: 
  - PIC ID
  - Activity type
  - Description
  - IP address
  - User agent
  - Target type and ID
  - Timestamp

### Usage
```typescript
import { logPICActivity } from '@/lib/picActivityLogger';

await logPICActivity({
  picId: 1,
  activityType: 'review',
  description: 'Reviewed document DKM-2026-001',
  targetType: 'document',
  targetId: '1',
});
```

## Security Considerations

1. **Password Hashing**: Passwords are hashed using bcryptjs before storage
2. **Session Management**: User data stored in localStorage (can be enhanced with secure cookies)
3. **Role-based Access Control**: Only users with `role: 'pic'` can access PIC dashboard
4. **Activity Logging**: All PIC actions are logged for audit trail
5. **SQL Injection Prevention**: Using parameterized queries throughout

## Testing

### Manual Testing Checklist
- [ ] PIC can login with correct credentials
- [ ] PIC receives error with incorrect credentials
- [ ] PIC is redirected to dashboard after login
- [ ] Dashboard displays correct statistics
- [ ] PIC can request review for documents
- [ ] PIC can request new documents
- [ ] Activity log shows all PIC actions
- [ ] PIC can logout successfully
- [ ] Non-PIC users cannot access /pic-dashboard

### API Testing
Use tools like Postman or curl to test endpoints:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/pic-login \
  -H "Content-Type: application/json" \
  -d '{"email":"pic001@example.com","password":"pic123456"}'

# Get dashboard
curl http://localhost:3000/api/pic/dashboard \
  -H "x-pic-id: 1"
```

## Database Queries for Management

### Get all PICs
```sql
SELECT id, email, full_name, department, is_active, last_login
FROM pic_users
ORDER BY created_at DESC;
```

### Get PIC activity summary
```sql
SELECT pic_id, activity_type, COUNT(*) as count
FROM pic_activities
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY pic_id, activity_type;
```

### Get pending review requests
```sql
SELECT pr.id, p.full_name, pd.document_number, pr.status
FROM pic_requests pr
JOIN pic_users p ON pr.pic_id = p.id
JOIN pic_documents pd ON pr.document_id = pd.id
WHERE pr.status = 'pending'
ORDER BY pr.created_at ASC;
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify `pic_users` table exists

### Login Fails
- Verify email exists in `pic_users`
- Check password is hashed correctly
- Ensure account is active (`is_active = true`)

### Dashboard Not Loading
- Check if user role is 'pic'
- Verify API endpoints are responding
- Check browser console for errors

## Future Enhancements

1. **Two-Factor Authentication**: Add OTP for PICs
2. **Document Upload**: Allow PICs to upload documents directly
3. **Approval Workflow**: Admin approval for new document requests
4. **Notifications**: Email notifications for status changes
5. **Advanced Filtering**: Filter documents by date, status, etc.
6. **Export Reports**: Generate activity and document reports
7. **Bulk Actions**: Select multiple documents for batch operations
8. **Real-time Updates**: WebSocket for live activity updates

## Files Created/Modified

### New Files
- `/app/pic-login/page.tsx` - PIC login page
- `/app/pic-dashboard/page.tsx` - PIC dashboard
- `/app/api/auth/pic-login/route.ts` - PIC authentication API
- `/app/api/pic/dashboard/route.ts` - Dashboard data API
- `/app/api/pic/documents/route.ts` - Documents API
- `/app/api/pic/requests/review/route.ts` - Review request API
- `/app/api/pic/requests/new-document/route.ts` - New document request API
- `/components/pic/PICDashboardHeader.tsx` - Dashboard header
- `/components/pic/PICStatsCards.tsx` - Statistics cards
- `/components/pic/PICDocumentsList.tsx` - Documents list
- `/components/pic/PICActivityLog.tsx` - Activity log
- `/components/pic/RequestReviewModal.tsx` - Review modal
- `/components/pic/RequestNewDocumentModal.tsx` - Document request modal
- `/lib/picActivityLogger.ts` - Activity logging utility
- `/migration/001_add_pic_tables.sql` - Database migration

### Modified Files
- `/contexts/AuthContext.tsx` - Added PIC login support
- `/app/login-page/page.tsx` - Added link to PIC login

## Support

For issues or questions about the PIC feature implementation, refer to the inline code comments and error messages in the console logs.
