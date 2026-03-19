# Digital Talent Management System

Full-stack project for the HR assignment.

## Structure
- `backend/` Node.js + Express + MongoDB (API)
- `frontend/` React + Vite (UI)

## Run Locally
1. Backend
   - `cd backend`
   - `npm install`
   - Copy `.env.example` to `.env` and set values
   - `npm run dev`
2. Frontend
   - `cd frontend`
   - `npm install`
   - `npm run dev`

The frontend uses a Vite proxy for `/api` to `http://localhost:3000`.
