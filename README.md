# CRM System for Software Companies

A purpose-built Customer Relationship Management (CRM) system designed specifically for software and SaaS companies. This CRM prioritizes simplicity, operational efficiency, and tight integration with development workflows.

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + TypeScript
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Deployment**: Docker (self-hosted)

## Project Structure

```
crm-platform/
├── backend/                 # Express API server
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── models/         # TypeORM entities
│   │   ├── controllers/    # API handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, validation, error handling
│   │   ├── routes/         # API routes
│   │   ├── utils/          # Utilities
│   │   └── app.ts          # Express app setup
│   ├── migrations/         # Database migrations
│   └── package.json
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client
│   │   ├── hooks/          # Custom hooks
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Utilities
│   │   └── App.tsx
│   └── package.json
├── docker-compose.yml      # Database & services setup
└── README.md
```

## Features (MVP Phase 1)

### Lead Management
- Create, read, update, delete leads
- Lead scoring and qualification
- Bulk import from CSV
- Assign leads to sales reps
- Activity tracking (calls, emails, meetings)

### Account Management
- Create and manage customer accounts
- Add multiple contacts per account
- Track account relationships with leads and opportunities
- Activity timeline

### Contact Management
- Create and manage contacts
- Set contact roles and hierarchy
- Track contact interactions
- Primary contact designation

### Opportunity Management
- Sales pipeline tracking
- Opportunity stages (Prospecting → Closed)
- Add products/services with pricing
- Discount management
- Close deals (Won/Lost)

### Sales Pipeline
- Kanban view of opportunities by stage
- Drag-and-drop stage movement
- Pipeline filtering and forecasting
- Revenue calculations

### Core Features
- JWT authentication
- Role-based access control (Admin, Manager, Rep)
- Activity logging (audit trail)
- Search and filtering
- Pagination
- CSV export
- Responsive UI

## Getting Started

### Prerequisites

- Node.js 16+ and npm or yarn
- Docker and Docker Compose
- PostgreSQL 15 (or use Docker)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd crm-platform
```

2. **Setup Database**
```bash
docker-compose up -d
```
This starts PostgreSQL and pgAdmin on ports 5432 and 5050.

3. **Setup Backend**
```bash
cd backend
cp .env.example .env
npm install
npm run migration:run
npm run seed  # Optional: seed with demo data
npm run dev
```

Backend will run on `http://localhost:3001`

4. **Setup Frontend**
```bash
cd frontend
npm install
npm start
```

Frontend will run on `http://localhost:3000`

### Environment Variables

**Backend (.env)**
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=crm_user
DB_PASSWORD=crm_password
DB_NAME=crm_db
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
```

## Development

### Backend Development
```bash
cd backend

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Run migrations
npm run migration:run

# Create new migration
npm run migration:create

# Tests
npm test
npm run test:watch

# Linting
npm run lint
npm run format
```

### Frontend Development
```bash
cd frontend

# Development server
npm start

# Build for production
npm run build

# Tests
npm test

# Linting
npm run lint
npm run format
```

## API Documentation

### Authentication
```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/password-reset
```

### Leads
```
GET    /api/leads                    # List leads
POST   /api/leads                    # Create lead
GET    /api/leads/:id                # Get lead detail
PATCH  /api/leads/:id                # Update lead
DELETE /api/leads/:id                # Delete lead
PATCH  /api/leads/:id/status         # Update lead status
POST   /api/leads/:id/convert-to-account  # Convert to account
```

### Accounts
```
GET    /api/accounts                 # List accounts
POST   /api/accounts                 # Create account
GET    /api/accounts/:id             # Get account detail
PATCH  /api/accounts/:id             # Update account
DELETE /api/accounts/:id             # Delete account
```

### Opportunities
```
GET    /api/opportunities            # List opportunities
POST   /api/opportunities            # Create opportunity
GET    /api/opportunities/:id        # Get opportunity detail
PATCH  /api/opportunities/:id        # Update opportunity
PATCH  /api/opportunities/:id/stage  # Move to stage
POST   /api/opportunities/:id/close  # Close opportunity
```

### Pipeline
```
GET    /api/pipeline                 # Kanban data
GET    /api/pipeline/forecast        # Forecast view
```

## Database Schema

Key entities:
- **User** - Team members
- **Role** - Permission groups
- **Permission** - Granular access control
- **Lead** - Sales leads
- **Account** - Customer/prospect accounts
- **Contact** - People at accounts
- **Opportunity** - Sales deals
- **LineItem** - Products in opportunities
- **Activity** - Audit trail
- **Note** - Internal notes

## Testing

### Backend
```bash
cd backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
```

### Frontend
```bash
cd frontend
npm test                    # Run all tests
npm test -- --coverage     # With coverage report
```

## Deployment

### Docker Build
```bash
# Build backend
docker build -t crm-backend ./backend

# Build frontend
docker build -t crm-frontend ./frontend

# Run with docker-compose
docker-compose up -d
```

### Production Checklist
- [ ] Update environment variables for production
- [ ] Set strong JWT_SECRET
- [ ] Enable HTTPS
- [ ] Configure CORS for production domain
- [ ] Setup database backups
- [ ] Configure logging and monitoring
- [ ] Security audit
- [ ] Performance testing

## Roadmap

### Phase 1 (Current) - MVP: Sales Pipeline
- [x] Lead management
- [x] Account & contact management
- [x] Opportunity/pipeline tracking
- [ ] Dashboard & reporting

### Phase 2 - Operations
- [ ] Contracts management
- [ ] Billing & invoicing
- [ ] Client onboarding
- [ ] Project tracking

### Phase 3 - Advanced
- [ ] Support ticketing
- [ ] Jira integration
- [ ] Customer success
- [ ] Advanced analytics
- [ ] Email integration
- [ ] Workflow automation

## Contributing

1. Create a feature branch (`git checkout -b feature/AmazingFeature`)
2. Commit changes (`git commit -m 'Add AmazingFeature'`)
3. Push to branch (`git push origin feature/AmazingFeature`)
4. Open a Pull Request

## License

MIT

## Support

For issues and feature requests, please open a GitHub issue.

---

**Built with ❤️ for software companies**
