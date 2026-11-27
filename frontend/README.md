# DeepTier frontend

React 19 + TypeScript + Vite enterprise cockpit for the DeepTier Java backend.

## Local development

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

The Vite development server runs on `http://127.0.0.1:5173` and proxies `/api/*` to `VITE_BACKEND_URL` (default `http://127.0.0.1:8080`). Change that value to the deployed or local Java backend URL.

## Production deployment

Set `VITE_API_BASE_URL` to the deployed backend origin if the frontend and backend are separate origins. Leave it empty for same-origin `/api/*` deployments.

For Vercel, replace the backend host in `vercel.json` with the deployed Java backend origin, then deploy:

```powershell
npm run build
```

The generated static app is written to `dist/`.

## Demo accounts

- Analyst: `analyst@deeptier.local` / `Analyst@123`
- Approver: `approver@deeptier.local` / `Approver@123`
- Admin: `admin@deeptier.local` / `Admin@123`
