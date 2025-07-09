# FreedomPress Core Framework

The core framework for the FreedomPress boilerplate system - a modular, WordPress-like architecture for Next.js applications.

## Features

- **Database Abstraction**: Prisma ORM with SQLite (PostgreSQL ready)
- **Authentication**: NextAuth.js with multiple providers
- **Module System**: Hot-swappable modules with lifecycle management
- **API Utilities**: Standardized API handlers with validation
- **TypeScript**: Full TypeScript support throughout

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/KevinFairbanks/freedompress-core.git
cd freedompress-core

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your configuration

# Set up database
npm run db:migrate
npm run db:generate

# Start development server
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# OAuth Providers (optional)
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Module Development

### Creating a Module

```typescript
import { ModuleInterface } from '@freedompress/core'

const blogModule: ModuleInterface = {
  config: {
    name: 'blog',
    version: '1.0.0',
    description: 'Blog functionality for FreedomPress'
  },
  
  exports: {
    models: {
      Post: /* Prisma model extension */
    },
    api: {
      '/api/blog/posts': /* API routes */
    },
    pages: {
      '/blog': /* Next.js pages */
    },
    components: {
      PostList: /* React components */
    }
  },
  
  async install(context) {
    // Run during module installation
  },
  
  async activate(context) {
    // Run when module is activated
  }
}

export default blogModule
```

### Module Registration

```typescript
import { moduleRegistry } from '@freedompress/core'
import blogModule from './blog-module'

// Register module
await moduleRegistry.register(blogModule)

// Activate module
await moduleRegistry.activate('blog')
```

## API Development

### Creating API Routes

```typescript
import { createApiHandler, successResponse, errorResponse } from '@freedompress/core'

export default createApiHandler(
  async (req, res) => {
    const { method } = req
    
    switch (method) {
      case 'GET':
        // Handle GET request
        const data = await fetchData()
        return res.json(successResponse(data))
        
      case 'POST':
        // Handle POST request
        const result = await createItem(req.body)
        return res.json(successResponse(result))
        
      default:
        return res.json(errorResponse('Method not allowed'))
    }
  },
  {
    requireAuth: true,
    allowedMethods: ['GET', 'POST'],
    allowedRoles: ['USER', 'ADMIN']
  }
)
```

## Database Management

### Available Commands

```bash
# Generate Prisma client
npm run db:generate

# Create and apply migrations
npm run db:migrate

# Push schema changes (development)
npm run db:push

# Open Prisma Studio
npm run db:studio

# Seed database
npm run db:seed
```

### Schema Extensions

Modules can extend the database schema by providing their own Prisma models:

```prisma
// In your module
model Post {
  id        String   @id @default(cuid())
  title     String
  content   String
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("posts")
}
```

## Architecture

```
src/
├── lib/
│   ├── auth.ts           # NextAuth.js configuration
│   ├── prisma.ts         # Database connection
│   ├── api.ts            # API utilities
│   └── module-system.ts  # Module loading system
├── types/
│   └── module.ts         # Module interface definitions
├── components/           # Reusable components
├── hooks/               # Custom React hooks
└── utils/               # Utility functions

pages/
├── api/
│   └── auth/            # NextAuth.js endpoints
├── _app.tsx             # App wrapper
└── index.tsx            # Home page

prisma/
├── schema.prisma        # Database schema
└── migrations/          # Database migrations
```

## Development Workflow

1. **Core Development**: Work on framework features
2. **Module Development**: Create modules in separate repositories
3. **Integration**: Test modules with the starter template
4. **Testing**: Run comprehensive tests
5. **Publishing**: Publish to NPM for distribution

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT

## Related Repositories

- [FreedomPress Blog Module](https://github.com/KevinFairbanks/freedompress-blog)
- [FreedomPress Ecommerce Module](https://github.com/KevinFairbanks/freedompress-shop)
- [FreedomPress Starter Template](https://github.com/KevinFairbanks/freedompress-starter)
- [FreedomPress Documentation](https://github.com/KevinFairbanks/freedompress)