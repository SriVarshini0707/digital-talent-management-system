# Digital Talent Management System

Full-stack project for the HR assignment.

## Structure
- `backend/` Node.js + Express + MongoDB (API)
- `frontend/` React + Vite (UI)

## MongoDB Atlas Setup
1. Create a MongoDB Atlas cluster.
2. In Atlas, create a database user with read/write access.
3. Add your IP address in Network Access, or allow access from anywhere for development.
4. Copy the Atlas connection string and replace the placeholders in `backend/.env`.

Example:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/talent-management?retryWrites=true&w=majority&appName=dtms
JWT_SECRET=your-secret
FRONTEND_URL=http://localhost:5173
USE_IN_MEMORY_DB=false
```

## Run Locally
1. Backend
   - `cd backend`
   - `npm install`
   - Copy `backend/.env.example` to `backend/.env`
   - Set `MONGODB_URI` to your MongoDB Atlas connection string
   - `npm run dev`
2. Frontend
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Optional Local Temporary DB
- If you want to run without Atlas for quick local testing, set `USE_IN_MEMORY_DB=true` in `backend/.env`.
- This uses an in-memory MongoDB instance, so data is lost when the backend stops.

The frontend uses a Vite proxy for `/api` to `http://localhost:3000`.

## Production Deployment
This repo is now set up for a single-service deployment:
- Build the React app in `frontend/`
- Build the API in `backend/`
- Start the Express server from `backend/`
- In production, the backend serves `frontend/dist`, so the app stays on one origin and cookie auth works reliably

### Recommended Option: Render
1. Push this repo to GitHub.
2. In Render, create a new `Web Service` from the repo.
3. Render can use the included [`render.yaml`](/c:/Users/sriva/Downloads/digital-talent-management-system/render.yaml), or you can enter the commands manually:
   - Build command: `cd frontend && npm ci && npm run build && cd ..\backend && npm ci && npm run build`
   - Start command: `cd backend && npm start`
4. Add these environment variables in Render:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://your-render-app.onrender.com`
   - `USE_IN_MEMORY_DB=false`
5. Deploy.

### Important Notes
- `backend/src/server.ts` now respects `PORT`, which platforms like Render provide automatically.
- Uploaded files are stored in `backend/uploads/`. On many hosts, local disk is ephemeral, so uploaded files may disappear after redeploys or restarts unless you switch to persistent storage such as S3, Cloudinary, or a mounted disk.
- If you deploy somewhere other than Render, use the same idea: build the frontend first, then run the backend with `NODE_ENV=production`.
