# Sam_Att scanner EXE integration boundary (pending JSON fixture)

The Windows ScannerSyncCli.exe is an existing, working external component.
This Gateway branch MUST NOT rebuild, replace, rename, execute or change the EXE.

## Stable inputs and outputs
- The existing Sam_Att UI supports selecting scanner machine numbers and date modes
  TODAY, DATE, RANGE, MONTH and YEAR.
- Keep the existing request template and machine selection semantics intact.
- Do not invent or rename JSON keys. The exact EXE JSON schema is **unverified**
  until a representative sanitized output file is provided.
- Keep raw scanner records intact; never silently drop unknown fields, change
  timestamps, deduplicate by an invented key or write to the live database during
  compatibility verification.

## Integration checklist (after sample JSON is available)
1. Identify the EXE output format and its encoding, timestamp/timezone rules,
   machine identifiers, success/error shape, and empty-result behavior.
2. Trace Sam_Att frontend sync-custom request through backend adapter and raw-scan
   import; compare exact field mappings against the fixture.
3. Add offline fixture-based parser/contract tests, including empty, duplicate,
   malformed and partial records. Mask personal identifiers in fixtures.
4. Verify read-only preview and dry-run first; test writes only in isolated staging.
5. Verify Gateway routes stay under /api/Sam_Att on the existing 3002 listener.
6. Keep Procurement and other modules unaffected. No production deployment
   without an explicit production change window.

## Current scope
This is a compatibility guardrail, **not** a claim that EXE-to-JSON integration
has been tested. No JSON fixture or Windows scanner runtime is available here.
