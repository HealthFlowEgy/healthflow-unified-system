# HealthFlow Development Guide

## Getting Started

### Prerequisites

- Node.js 20.x
- Docker & Docker Compose
- PostgreSQL 15.x
- Git

### Local Setup

1. **Clone the repository**

```bash
git clone https://github.com/HealthFlowEgy/healthflow-unified-system.git
cd healthflow-unified-system
```

2. **Install dependencies**

```bash
# Install root dependencies
npm install

# Install service dependencies
cd services/auth-service && npm install
cd ../patient-service && npm install
# Repeat for all services

# Install portal dependencies
cd ../../portals/doctor-portal && npm install
cd ../patient-portal && npm install
cd ../admin-portal && npm install
```

3. **Setup environment**

```bash
cp .env.example .env
# Edit .env with your local configuration
```

4. **Start database**

```bash
docker-compose up -d postgres redis
```

5. **Run migrations**

```bash
npm run migrate
```

6. **Start services**

```bash
# Start all services
npm run dev

# Or start individual services
cd services/auth-service && npm run dev
```

## Project Structure

```
healthflow-unified-system/
├── services/                 # Backend microservices
│   ├── auth-service/        # Authentication & authorization
│   ├── patient-service/     # Patient management
│   ├── doctor-service/      # Doctor management
│   ├── prescription-service/# Prescription management
│   ├── pharmacy-service/    # Pharmacy management
│   ├── appointment-service/ # Appointment scheduling
│   ├── notification-service/# Email & SMS notifications
│   ├── file-service/        # File upload & storage
│   ├── user-management-service/ # User & role management
│   ├── bi-dashboard-service/# Analytics & reporting
│   └── api-gateway/         # API Gateway
├── portals/                 # Frontend applications
│   ├── doctor-portal/       # Doctor web application
│   ├── patient-portal/      # Patient web application
│   └── admin-portal/        # Admin web application
├── shared/                  # Shared code & utilities
│   ├── database/           # Database migrations
│   └── utils/              # Shared utilities
├── tests/                   # Test suites
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   ├── e2e/                # End-to-end tests
│   └── performance/        # Performance tests
├── docs/                    # Documentation
└── docker-compose.yml       # Docker Compose configuration
```

## Development Workflow

### 1. Creating a New Feature

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes
# ...

# Run tests
npm test

# Commit changes
git add .
git commit -m "feat: add your feature description"

# Push to remote
git push origin feature/your-feature-name

# Create pull request
```

### 2. Code Style

We use ESLint and Prettier for code formatting:

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### 3. Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

### 4. Database Migrations

```bash
# Create new migration
npm run migrate:create migration_name

# Run migrations
npm run migrate

# Rollback migration
npm run migrate:rollback
```

## API Development

### Creating a New Endpoint

1. **Define route** in `src/routes/`

```typescript
import { Router } from 'express';
import { controller } from '../controllers/yourController';

const router = Router();

router.get('/endpoint', controller.method);

export default router;
```

2. **Implement controller** in `src/controllers/`

```typescript
export const controller = {
  async method(req, res) {
    try {
      // Business logic
      const result = await service.method(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};
```

3. **Implement service** in `src/services/`

```typescript
export const service = {
  async method(data) {
    // Database operations
    return await db.query(...);
  }
};
```

4. **Add tests** in `tests/`

```typescript
describe('Controller', () => {
  it('should return data', async () => {
    const response = await request(app)
      .get('/endpoint')
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

## Frontend Development

### Creating a New Page

1. **Create page component** in `src/pages/`

```typescript
import React from 'react';

export const YourPage: React.FC = () => {
  return (
    <div>
      <h1>Your Page</h1>
    </div>
  );
};
```

2. **Add route** in `src/App.tsx`

```typescript
<Route path="/your-page" element={<YourPage />} />
```

3. **Add navigation** in `src/components/Layout.tsx`

```typescript
<MenuItem component={Link} to="/your-page">
  Your Page
</MenuItem>
```

### State Management

We use React Context for state management:

```typescript
// Create context
export const YourContext = React.createContext();

// Create provider
export const YourProvider: React.FC = ({ children }) => {
  const [state, setState] = useState();

  return (
    <YourContext.Provider value={{ state, setState }}>
      {children}
    </YourContext.Provider>
  );
};

// Use context
const { state, setState } = useContext(YourContext);
```

## Database

### Schema Design

- Use Drizzle ORM for database operations
- Define schemas in `src/models/schema.ts`
- Use migrations for schema changes

Example schema:

```typescript
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
```

### Querying

```typescript
// Select
const users = await db.select().from(usersTable);

// Insert
await db.insert(usersTable).values({ email, firstName, lastName });

// Update
await db.update(usersTable).set({ firstName }).where(eq(usersTable.id, id));

// Delete
await db.delete(usersTable).where(eq(usersTable.id, id));
```

## Testing Guidelines

### Unit Tests

- Test individual functions and methods
- Mock external dependencies
- Use Jest and @testing-library/react

```typescript
describe('Service', () => {
  it('should process data correctly', () => {
    const result = service.method(input);
    expect(result).toEqual(expected);
  });
});
```

### Integration Tests

- Test API endpoints
- Use real database (test database)
- Use supertest for HTTP testing

```typescript
describe('API Endpoint', () => {
  it('should return data', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

### E2E Tests

- Test complete user workflows
- Use real services and database
- Test from frontend to backend

```typescript
describe('User Workflow', () => {
  it('should complete registration and login', async () => {
    // Register
    await request(app).post('/api/auth/register').send(userData);

    // Login
    const loginResponse = await request(app).post('/api/auth/login').send(credentials);

    expect(loginResponse.body.data.token).toBeDefined();
  });
});
```

## Debugging

### Backend Debugging

```bash
# Enable debug mode
DEBUG=* npm run dev

# Use VS Code debugger
# Add to .vscode/launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Debug Service",
  "program": "${workspaceFolder}/services/your-service/src/server.ts",
  "preLaunchTask": "tsc: build",
  "outFiles": ["${workspaceFolder}/services/your-service/dist/**/*.js"]
}
```

### Frontend Debugging

```bash
# Use React DevTools
# Use browser developer tools
# Enable source maps in vite.config.ts
```

## Performance Optimization

### Backend

- Use database indexes
- Implement caching (Redis)
- Use connection pooling
- Optimize queries
- Use pagination

### Frontend

- Code splitting
- Lazy loading
- Memoization
- Virtual scrolling
- Image optimization

## Security Best Practices

- Never commit secrets to git
- Use environment variables
- Validate all inputs
- Sanitize user data
- Use parameterized queries
- Implement rate limiting
- Use HTTPS in production
- Keep dependencies updated

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No console.log statements
- [ ] Error handling is implemented
- [ ] Security considerations addressed
- [ ] Performance impact considered

## Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Express Documentation](https://expressjs.com/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Jest Documentation](https://jestjs.io/)

## Support

For development support:
- Slack: #healthflow-dev
- Email: dev@healthflow.eg
- Wiki: https://wiki.healthflow.eg
