# Gateway V2 Management Console — integration staging

This branch is based on feature/gateway-v2-module-manager (the working Gateway V2 backend). It imports the React GUI from main without replacing Central-API/ backend files.

## Deployment architecture
- IIS HTTPS frontend: https://10.2.0.13:3001/Gateway/
- Existing Node backend: HTTP http://127.0.0.1:3002 (SSL_ENABLED=false, IIS terminates TLS)
- No additional listener or port. Do not restart or overwrite the production Gateway for a frontend-only deployment.
- Browser client currently calls same-origin /api/health. Before deploying, configure and verify the IIS site-level reverse proxy for /api/health to the backend, without changing existing Procurement rules.
- Build at repository ROOT (where package.json and vite.config.ts live), not Central-API/. Verify TypeScript and Vite build before copying dist/ into a separate IIS Gateway application.

## Security and functional scope
- Central-API/routes/gateway-admin.js remains protected by GATEWAY_ADMIN_ENABLED and a server-side Bearer token.
- Do not put GATEWAY_ADMIN_TOKEN in JavaScript, Vite environment variables, or browser localStorage.
- GUI currently reads public health only. Admin overview and module inventory require a future authenticated server-side session/BFF; until then, show unavailable states rather than invented module statuses.
- Do not enable admin mutations or alter Procurement, Sam_Att, or Cash_Cheque.
- The GUI and bundled deployment guidance may contain older descriptions or example paths. Review these before production.
- The main-branch IIS guide is not suitable for this deployment because it assumes HTTPS on port 3002.

## Release status
STAGING SOURCE ONLY. No production deployment, live IIS validation, or successful local build has been claimed. Test in a separate staging directory first.
