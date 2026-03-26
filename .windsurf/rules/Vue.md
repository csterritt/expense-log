---
trigger: always_on
---

# Vue.js Project - Project Guidelines

## Project Overview

This is a Vue 3, TypeScript, Pinia, Vite, TailwindCSS, and DaisyUI project. It uses playwright for end-to-end testing.

Built with Vue 3 using Composition API and following Vue's best practices and conventions.

## Development Guidelines

### Frontend Architecture

- Use Composition API with `<script setup lang="ts">`
- Follow feature-based directory structure:
  - `src/features/[feature-name]/`
    - components/
    - composables/
    - types/
    - utils/
- Implement Pinia stores for state management
- Use Vue Router with proper navigation guards
- Implement proper TypeScript support

### Coding Standards

- Use TypeScript for all components and utilities
- Follow Vue 3 style guide (Priority A, B, and C rules)
- Implement proper type definitions for props and emits
- Use SFC (Single File Components)
- Follow proper naming conventions:
  - PascalCase for components
  - camelCase for methods and properties
  - kebab-case for events
- Implement proper error handling
- Use proper component composition patterns

### Code Quality Tools

- Pre-commit hooks:
  - ESLint with Vue 3 plugin
  - Prettier for code formatting
  - TypeScript checks
  - Unit test execution
- Additional checks:
  - Vue component name casing
  - Props validation
  - Template accessibility
  - Unused component detection

### Development Environment

#### Node Requirements

- Node.js version: 22.x
- Package manager: npm
- Build tool: Vite

#### Testing Requirements

- bun test for unit testing
- Vue Test Utils for component testing
- playwright for E2E testing
- Test files must be named `*.spec.ts`

#### Dependencies

Core dependencies:

- Vue 3.x
- TypeScript 5.x
- Vue Router 4.x
- Pinia 3.x
- VueUse for composables
- Vite for development

#### Production Requirements

- Implement proper code splitting
- Use dynamic imports for routes
- Configure proper CSP headers
- Set up error tracking
- Configure proper build optimization

### Required Environment Variables

Environment variables are defined in:

- `.env` for default values
- `.env.development` for development
- `.env.production` for production

Reference `.env.example` for required variables.

### Component Guidelines

- Use composition API utilities:
  - ref/reactive for reactivity
  - computed for derived state
  - watch/watchEffect for side effects
- Implement proper prop validation
- Use emit with proper type definitions
- Follow proper lifecycle hook usage
- Implement proper error boundaries
- Use slots for component composition
