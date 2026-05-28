# ClosingRoom Data Security Brief

## Stored Data

ClosingRoom stores deal workflow metadata: task status, owners, reviewers, deadlines, statutory filing labels, source references, dependency labels, short status notes, and export generation metadata.

ClosingRoom must not store privileged document contents, confidential deal terms, uploaded transaction documents, valuation reports, investor financials, or client-identifying details beyond the minimum fields required to operate the tracker.

## Planned Production Posture

- Hosting: Vercel.
- Database: Neon Postgres.
- Authentication: Clerk.
- Email: Resend for reminder and digest notifications.
- Background jobs: Inngest for reminder retries, idempotency, and observability.
- Tenant model: every persisted domain row includes `organization_id`; server actions must scope every query and mutation by organization.
- Audit: `audit_entry` is append-only at the database layer and written inside the same transaction as each domain mutation.

## Retention and Deletion

Firms should be able to export deal metadata, close a deal, and request deletion of inactive deal metadata. Deletion policy and retention windows must be confirmed in the customer agreement before production launch.

## Breach Process

Production launch requires an incident runbook covering detection, containment, customer notice, regulator assessment, log preservation, and post-incident remediation.

## Current Review Status

This brief is a v1 readiness artifact. It requires counsel and IT/security review before being sent as a contractual security representation.
