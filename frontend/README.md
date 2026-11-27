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

Set `VITE_API_BASE_URL` to the deployed backend origin (for example `https://api.example.com`). Do not include a trailing slash or `/api`. This value is compiled into the browser bundle, so it is public and must not contain credentials or secrets.

For Vercel:

1. Set the project root to `frontend`, framework preset to **Vite**, build command to `npm run build`, and output directory to `dist`.
2. In **Project Settings → Environment Variables**, set `VITE_API_BASE_URL` to your public HTTPS Java backend origin for Production (and Preview if used).
3. Configure the backend's `DEEPTIER_CORS_ORIGINS` with the exact Vercel deployment domain(s), comma-separated (for example `https://your-project.vercel.app,https://app.example.com`), then restart/redeploy the backend.
4. Deploy the frontend. Redeploy it after changing `VITE_API_BASE_URL`, since Vite embeds it at build time.

```powershell
npm run build
```

The generated static app is written to `dist/`.

## Demo accounts

- Analyst: `analyst@deeptier.local` / `Analyst@123`
- Approver: `approver@deeptier.local` / `Approver@123`
- Admin: `admin@deeptier.local` / `Admin@123`
