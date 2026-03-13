# raid-devops-day2 DEV

A simple full-stack project with a React frontend and TypeScript backend.

## Project Structure

```
├── backend/   # Node.js + Express + TypeScript API
└── frontend/  # React + TypeScript app (Vite)
```

## Backend

Runs on **port 3001** and exposes a single endpoint:

- `GET /api/users` – returns a fixed list of users

```bash
cd backend
npm install
npm run dev
# or
npm run build  # compiles to dist/
node dist/index.js
```

## Frontend

Runs on **port 5173** (Vite default) and fetches users from the backend.

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

To configure the backend URL, copy `.env.example` to `.env` and set `VITE_API_URL`.

## Screenshot

![Users list](https://github.com/user-attachments/assets/9130b56b-57a4-439c-8419-b770275742e2)