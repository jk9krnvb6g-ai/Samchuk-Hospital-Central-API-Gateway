# Scanner staging lifecycle integration

This feature branch adds an internal, explicit-dependency helper only. It does not register a module, expose management endpoints, alter existing adapters/configuration, create listeners, or activate any runtime on import.

Use `createScannerStagingLifecycle` with the running registry, the reviewed Sam_Att verified-release loader, an approval verifier, and an audit sink. The target is fixed to the dedicated Scanner staging slot; existing Sam_Att, Procurement and Cash_Cheque routes must remain unchanged.

Each stage, activation and rollback requires a separate ADMIN approval bound to its plan hash, action and expiry. The plan includes release identity, current version, load timestamp and nonce. The injected verifier must authenticate the real actor and cryptographically validate or securely look up the approval. A client-supplied boolean is insufficient. No signer, auth bypass, secret configuration or HTTP mutation route is provided here.

The prior router must carry `scannerReleaseIdentity` before activation. Rollback derives its identity from that retained router, not caller-supplied release labels. Keep old resources available until requests finish and the rollback window closes; this helper never disposes any pool. The registry retains only one previous version.

Tests run the actual registry and adapter validator with an empty injected module configuration to avoid dotenv, live routes, databases, or listeners:

```powershell
node --test tests/scanner-staging-lifecycle.test.js
```

The baseline had no package-lock.json. This branch adds a lockfile for the existing dependency declarations; `npm ci --ignore-scripts` succeeds. Lifecycle tests exercise the real registry, validator and Express with only module configuration injected. They do not establish that the deployed process contains a staging slot or management hook. If those are absent and a restart is forbidden, runtime activation remains BLOCKED. Do not use a new Node CLI process as a substitute for the running registry.
