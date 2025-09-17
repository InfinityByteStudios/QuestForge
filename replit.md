# replit.md

## Overview

This is a web-based adventure RPG game built with a modern full-stack architecture. The application features character creation, world exploration, turn-based combat, inventory management, and quest systems. Players can create characters with different classes, explore various locations, engage in combat with enemies, and manage their equipment and items through a retro-styled pixel art interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent, accessible components
- **Styling**: Tailwind CSS with custom pixel art theme featuring adventure-game color palette (dark slate, adventure brown, forest green, treasure gold)
- **State Management**: React Context API for global game state, React Query for server state management
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **API Design**: RESTful API with structured endpoints for characters, locations, quests, combat, and inventory
- **Middleware**: Custom logging middleware for API request tracking
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Development**: Hot module replacement with Vite integration for seamless development experience

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Design**: Relational schema with tables for characters, locations, quests, enemies, combat sessions, and items
- **Migrations**: Drizzle Kit for database schema management and migrations
- **Connection**: Neon Database serverless PostgreSQL connection

### Game Systems
- **Character System**: Multi-class system (Warrior, Mage, Archer, Rogue) with stat progression, equipment slots, and inventory management
- **Combat System**: Turn-based combat with damage calculations, health management, and combat session persistence
- **World System**: Location-based exploration with level recommendations and accessibility controls
- **Quest System**: Character-specific quest tracking with progress states
- **Inventory System**: Item management with equipment slots, consumables, and quantity tracking

### External Dependencies

- **Database**: Neon Database (@neondatabase/serverless) for serverless PostgreSQL hosting
- **UI Framework**: Radix UI (@radix-ui/*) for accessible, unstyled UI primitives
- **Styling**: Tailwind CSS with PostCSS for utility-first styling
- **Forms**: React Hook Form with Zod resolvers for type-safe form validation
- **State Management**: TanStack React Query for server state caching and synchronization
- **Development Tools**: TypeScript for type safety, ESBuild for production builds
- **Font Integration**: Google Fonts (Press Start 2P, DM Sans, Fira Code, Geist Mono) for retro gaming aesthetic

The architecture emphasizes type safety throughout the stack with shared schema definitions, real-time game state synchronization, and a pixel-perfect retro gaming user experience. The separation of concerns allows for independent development of game features while maintaining data consistency across the client-server boundary.