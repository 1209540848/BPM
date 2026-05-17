# BPM Project Agent Memory

## Project Overview
- This repository is a full-stack BPM (Business Process Management) system.
- Frontend: Vue 3 + TypeScript + Vite + Pinia + Vue Router + Ant Design Vue + AntV X6.
- Backend: Koa + TypeScript + Prisma + SQLite in local development.
- The app includes process design, process definitions, process instances, task handling, authentication, notifications, theme switching, and WebSocket support.

## Repository Structure
- `src/`: frontend source code.
- `src/api/`: Axios request wrapper and API modules.
- `src/components/`: shared Vue components, including layout, notifications, virtual list, and process designer components.
- `src/engine/`: frontend workflow/approval-path engine helpers.
- `src/hooks/`: reusable Vue composition hooks.
- `src/router/`: Vue Router configuration.
- `src/services/`: frontend services, including WebSocket client logic.
- `src/stores/`: Pinia stores for auth, processes, instances, notifications, and theme state.
- `src/styles/` and `src/theme/`: theme styles, variables, and color algorithms.
- `src/types/`: shared frontend TypeScript types.
- `src/views/`: page-level Vue views.
- `public/`: frontend static assets.
- `bpm-backend/`: backend application.
- `bpm-backend/src/app.ts`: Koa app entry point.
- `bpm-backend/src/routes/`: API route definitions, mounted under `/api/v1`.
- `bpm-backend/src/controllers/`: route controllers.
- `bpm-backend/src/services/`: backend business logic.
- `bpm-backend/src/middleware/`: auth, error, and logging middleware.
- `bpm-backend/src/utils/`: JWT, password, and response helpers.
- `bpm-backend/prisma/schema.prisma`: Prisma schema; currently uses SQLite via `DATABASE_URL`.
- `bpm-backend/prisma/dev.db`: local SQLite database file.

## Startup Commands
- Install frontend dependencies from repo root: `npm install`.
- Install backend dependencies: `cd bpm-backend; npm install`.
- Backend local env lives at `bpm-backend/.env`; current local database config is `DATABASE_URL="file:./dev.db"` and `PORT=3000`.
- Generate Prisma client: `cd bpm-backend; npm run prisma:generate`.
- Apply Prisma migrations in development: `cd bpm-backend; npm run prisma:migrate`.
- Start backend dev server: `cd bpm-backend; npm run dev`.
- Start frontend dev server from repo root: `npm run dev`.
- Frontend dev server runs on `http://localhost:5173`.
- Backend API runs on `http://localhost:3000`.
- Vite proxies frontend `/api` requests to `http://localhost:3000`.
- Backend routes are prefixed with `/api/v1`, so frontend calls should normally target `/api/v1/...`.
- Build frontend from repo root: `npm run build`.
- Preview frontend production build from repo root: `npm run preview`.
- Build backend: `cd bpm-backend; npm run build`.
- Start compiled backend: `cd bpm-backend; npm start`.

## Development Notes
- Root `package.json` is ESM (`"type": "module"`); backend `package.json` is CommonJS (`"type": "commonjs"`).
- Frontend request base URL is `import.meta.env.VITE_API_BASE_URL || '/api/v1'` in `src/api/request.ts`.
- Backend `npm run dev` uses `nodemon src/app.ts`; if runtime issues occur, verify whether `nodemon` is correctly invoking `ts-node` for TypeScript.
- README and several Chinese markdown docs appear mojibake/encoding-corrupted in the current shell output; avoid relying on exact Chinese text unless re-opened with the correct encoding.
- There are no meaningful automated tests configured: backend `npm test` intentionally exits with an error placeholder.

## Working Guidelines
- Keep frontend changes consistent with Vue 3 Composition API and existing Pinia/Ant Design Vue patterns.
- Keep backend changes layered through route -> controller -> service -> Prisma where possible.
- Do not change generated Prisma artifacts or the SQLite database unless the task explicitly requires database changes.
- For local verification, prefer targeted builds: `npm run build` for frontend and `cd bpm-backend; npm run build` for backend.
