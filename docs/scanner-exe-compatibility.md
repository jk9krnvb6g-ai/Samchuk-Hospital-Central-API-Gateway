# Sam_Att scanner EXE integration boundary (summary JSON fixture received)

The Windows ScannerSyncCli.exe is an existing, working external component.
This Gateway branch MUST NOT rebuild, replace, rename, execute or change the EXE.

## Stable inputs and outputs
- The existing Sam_Att UI supports selecting scanner machine numbers and date modes
  TODAY, DATE, RANGE, MONTH and YEAR.
- Keep the existing request template and machine selection semantics intact.
- Do not invent or rename JSON keys. The EXE **summary response** keys are now grounded in the supplied sample.
  The per-scan/raw-record schema, command/request payload and error cases remain unverified.
- Keep raw scanner records intact; never silently drop unknown fields, change
  timestamps, deduplicate by an invented key or write to the live database during
  compatibility verification.

## Confirmed EXE summary response
- Fixture: `Central-API/tests/fixtures/scanner-exe-summary.sample.json`.
- Top-level fields: `success`, `totalRead`, `totalNew`, `duplicates`, `unmapped`, `affectedDates`, `machines`.
- Each machine: `machineNo`, `ip`, `read`, `new`, `duplicates`, `status`.
- Supplied successful sample: totalRead=9917, totalNew=746, duplicates=9171, unmapped=0; machine numbers 1, 2, 3.
- This is a **summary**, not a list of raw scan records or the EXE input template.
- Run offline consistency test: `npm run test:scanner-summary` inside `Central-API`.

## Integration checklist (remaining verification)
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
has been tested. A summary JSON fixture is available; no raw-record fixture, EXE input template or Windows scanner runtime is available here.
