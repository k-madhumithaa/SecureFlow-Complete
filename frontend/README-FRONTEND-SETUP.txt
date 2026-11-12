SecureFlow frontend installation
=================================

This archive contains the frontend source files for the SecureFlow dashboard.

1. Extract the archive into:
   C:\College-Projects\SecureFlow-Complete\frontend

   Allow replacement of:
   src\App.jsx
   src\main.jsx
   src\index.css
   vite.config.js

2. Confirm packages are installed from the frontend folder:
   npm install

3. Start the existing staging API and monitoring stack:
   - SecureFlow staging API: http://127.0.0.1:5003
   - Prometheus: http://127.0.0.1:9090

4. Start the dashboard:
   npm run dev

5. Open:
   http://127.0.0.1:5173

6. Validate:
   npm run lint
   npm run build
   npm audit

Notes:
- The frontend uses the existing Flask endpoints /api/status and /api/deployments.
- Prometheus target and metric queries are proxied by Vite during development.
- Jenkins build history, security report artifacts, and dedicated audit logs are
  explicitly marked as not integrated; no fake values are displayed.
- Vite proxy configuration is for local development. A production reverse proxy
  must provide equivalent /backend and /prometheus routes before deployment.
