/**
 * Blueprint v1.5 Tech Allowlist
 * 
 * This list defines the permissible technology stack for the "Critic" agent.
 * The Critic will flag any packages suggested by the Architect or Designer
 * that are not in this list, preventing hallucinations.
 */

export const ALLOWED_MODULES = {
  frontend: [
    // Core
    'react', 'react-dom', 'vite',
    
    // UI/UX
    'framer-motion', 
    'lucide-react', 
    'clsx', 
    'tailwind-merge', 
    '@radix-ui/react-slot', // For shadcn-like components
    'class-variance-authority', // For shadcn-like components
    
    // Routing (if needed, though single page is preferred for v1)
    'wouter', 'react-router-dom',

    // State
    'zustand', 'jotai', '@tanstack/react-query'
  ],
  
  backend: [
    // Core
    'express', 'cors', 'helmet', 'dotenv',
    
    // Validation
    'zod',
    
    // Auth
    'jsonwebtoken', 'bcrypt',
    
    // Utilities
    'morgan', 'compression'
  ],
  
  database: [
    // Drivers/ORMs
    'pg', 'knex', 'prisma', 'better-sqlite3' 
  ],
  
  testing: [
    'vitest', '@testing-library/react', 'supertest'
  ]
};
