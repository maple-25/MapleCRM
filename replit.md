# CRM Pro Application

## Overview
CRM Pro is a full-stack Customer Relationship Management system designed to manage leads, clients, projects, and partner relationships. It aims to provide comprehensive tools for business operations, streamlining client interactions and project oversight.

## User Preferences
Preferred communication style: Simple, everyday language.
Brand colors: Navy blue (#1b1393) as primary, Maple red (#c32312) for accents.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite.
- **UI Components**: Radix UI primitives with shadcn/ui for consistent design.
- **Styling**: Tailwind CSS with CSS custom properties.
- **State Management**: TanStack Query for server state management and caching.
- **Routing**: Wouter for client-side routing.
- **Form Handling**: React Hook Form with Zod validation.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **API Design**: RESTful API architecture.
- **Error Handling**: Centralized error handling middleware.
- **Development**: Hot reload with Vite integration.

### Data Storage Solutions
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM for type-safe operations.
- **Schema Management**: Drizzle Kit for migrations.
- **Connection**: Neon Database serverless PostgreSQL for cloud hosting.
- **Session Storage**: PostgreSQL-based session storage with connect-pg-simple.

### Database Schema Design
The system uses a relational schema with key entities including:
- **Users**: For authentication and role-based access.
- **Partners**: For affiliate partner management.
- **Leads**: For prospect tracking and partner assignment.
- **Clients**: For converted leads and customer information.
- **Projects**: For project management with priority, status, dates, and role-based visibility.
- **Project Comments**: For categorized comments.
- **Project Members**: For project visibility control.
- **Fund Tracker**: For centralized management of fund contacts and details (fund name, dual contacts, designations, emails, notes).

### Authentication and Authorization
- **Strategy**: Session-based authentication using PostgreSQL.
- **User Roles**: Admin and regular user roles with role-based access control.
- **Security**: Password-based authentication.

### Component Architecture
- **Layout Components**: Reusable Navbar and Sidebar.
- **Modal System**: Centralized modals for creating leads, clients, and projects.
- **Dashboard Widgets**: Modular components for stats, recent activity, and data visualization.
- **Form Components**: Standardized form components with validation.

### Development Workflow
- **Build Process**: Vite for frontend, esbuild for backend.
- **Type Safety**: Full TypeScript coverage.
- **Code Organization**: Monorepo structure with shared types and utilities.
- **Path Aliases**: Organized import paths using TypeScript path mapping.

## External Dependencies

### Database and ORM
- **@neondatabase/serverless**: For Neon Database connection.
- **drizzle-orm**: Type-safe ORM.
- **drizzle-kit**: For database migrations.
- **connect-pg-simple**: For PostgreSQL session store.

### UI and Styling
- **@radix-ui/***: For accessible UI primitives.
- **tailwindcss**: Utility-first CSS framework.
- **class-variance-authority**: For dynamic class name generation.
- **clsx**: For conditional class names.

### State Management and Data Fetching
- **@tanstack/react-query**: For server state management.
- **react-hook-form**: For form handling.
- **@hookform/resolvers**: For form validation resolvers.

### Development and Build Tools
- **vite**: Fast build tool and development server.
- **typescript**: For type-safe development.
- **@replit/vite-plugin-runtime-error-modal**: For development error handling.
- **@replit/vite-plugin-cartographer**: For Replit-specific development features.

### Utilities and Helpers
- **zod**: For schema validation.
- **date-fns**: For date utility.
- **wouter**: For routing.
- **nanoid**: For unique ID generation.