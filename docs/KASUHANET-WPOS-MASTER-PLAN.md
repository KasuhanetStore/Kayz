# KasuhaNET Website Protection & Operations System (WPOS)

**Document type:** Master reference and living implementation plan  
**Project:** KasuhaNET website  
**Repository:** `KasuhanetStore/Kayz`  
**Production branch:** `main`  
**Hosting:** Cloudflare Pages  
**Status:** Planning and baseline definition  
**Last updated:** 2026-11-27

---

## 1. Purpose

WPOS is the umbrella framework for protecting, maintaining and improving the whole KasuhaNET website.

It is intended to reduce avoidable website failures, visual inconsistencies, broken features, security risks, data loss and unsafe deployments.

This document is the long-term reference for the plan. It records what exists, what needs verification, what is planned, and what remains unfinished. It is not a declaration that all modules have already been implemented.

## 2. Operating principles

1. Preserve the current website design, layout, page structure, URLs and working behaviour unless a specific change is approved.
2. Inspect the existing implementation before changing it. Prefer small, targeted patches over rewrites.
3. Use the current production website and repository as the baseline; record approved visual references before introducing visual regression checks.
4. Test changes in preview before production deployment.
5. Block or hold deployment when required checks fail. Do not silently bypass failed checks.
6. Keep backups and verify that restoration procedures work.
7. Record changes, test results, incidents and recovery actions.
8. Separate monitoring and reporting permissions from permissions to modify production.
9. Never expose API keys, tokens, passwords, private keys or other secrets in source code, logs or this document.
10. Do not change payment integrations as part of unrelated maintenance.

## 3. Protected scope and non-negotiable constraints

The following areas must be treated as protected systems:

- Stripe live payment flow.
- ToyyibPay live payment flow.
- Checkout pages, payment calculations, callbacks and webhooks.
- Cloudflare D1 payment/order data and bindings.
- Existing support backend and its delivery configuration.
- Existing public page URLs, redirects and SEO routes.
- Existing shared header, footer, navigation and chat behaviour.

Payment integrations must remain unchanged unless the owner explicitly requests a payment-specific change. Any future payment work requires its own isolated scope, backup, test plan and explicit approval.

## 4. WPOS modules and tracking

Status definitions:

- **Existing - verify:** Some infrastructure or functionality is already present, but its coverage and reliability must be audited.
- **Planned:** The module is part of the target system but is not yet confirmed as implemented.
- **Future:** Useful improvement that can wait until the core protection layers are stable.

| ID | Module | Purpose | Initial status |
|---|---|---|---|
| WPOS-01 | Central Control & Asset Register | Maintain system inventory, owners, dependencies, critical routes and module status | Planned |
| WPOS-02 | Website Health Monitor | Check uptime, HTTP errors, SSL, DNS and response time | Existing infrastructure to verify; monitoring coverage unknown |
| WPOS-03 | Security Protection | Review security headers, WAF, access, suspicious activity, exposed secrets and vulnerabilities | Existing Cloudflare controls to audit |
| WPOS-04 | Backup & Recovery | Back up source, configuration and critical data; document and test restoration | Backup coverage and restore procedure to verify |
| WPOS-05 | Change & Deployment Protection | Use branches, preview builds, required checks, approval and rollback | GitHub and Cloudflare deployment facilities exist; gates to verify |
| WPOS-06 | Design & Layout Guard | Compare approved EN/MS layouts across desktop, tablet and mobile; detect missing assets and visual regressions | Planned |
| WPOS-07 | Function & Transaction Monitor | Check links, forms, support, chat and critical user journeys without changing payment behaviour | Planned; payment paths remain protected |
| WPOS-08 | Performance Monitor | Track loading speed, asset weight and Core Web Vitals | Existing analytics/measurement coverage to verify |
| WPOS-09 | SEO & Index Monitor | Check sitemap, robots, canonical URLs, metadata, broken links and indexing signals | Existing SEO files/tools; recurring monitoring to verify |
| WPOS-10 | Dependency & Update Manager | Identify outdated or vulnerable dependencies and assess updates before applying them | Planned |
| WPOS-11 | Database & Data Integrity | Monitor D1 health, schema changes, query errors and critical record integrity | D1 exists; monitoring and recovery coverage to verify |
| WPOS-12 | Incident, Alert & Maintenance Manager | Centralise alerts, incident records, scheduled checks and maintenance reports | Planned |

Statuses must be updated only after evidence is available. Do not mark a module complete merely because a related Cloudflare, GitHub or analytics feature exists.

## 5. Implementation phases

The phases are ordered by risk reduction. Work can be reprioritised after the initial audit.

### Phase 0 - Baseline and inventory
- Identify production routes, services, databases, integrations and external dependencies.
- Record existing GitHub and Cloudflare deployment behaviour.
- Identify what is already monitored, backed up and recoverable.
- Establish approved visual references for important EN/MS pages and screen sizes.
- Record protected payment and support components.

**Exit condition:** Current state and unknowns are documented without changing production behaviour.

### Phase 1 - Change control and recovery
- Confirm branch and preview workflow.
- Define mandatory checks before production.
- Define backup scope, retention and access.
- Write and test a recovery/rollback runbook.

**Exit condition:** A failed change can be stopped and a known-good version or data backup can be restored.

### Phase 2 - Health and security
- Add uptime and endpoint checks.
- Review SSL, DNS, security headers, WAF and access controls.
- Define alert severity and escalation.
- Review secret handling and dependency risk.

**Exit condition:** Critical failures and security events have a detection and response path.

### Phase 3 - Quality protection
- Build automated checks for page routes, links, images and key assets.
- Compare EN/MS structure and visual references.
- Test desktop and mobile breakpoints.
- Test critical forms and user journeys.
- Keep payment tests isolated and non-destructive.

**Exit condition:** Relevant regressions are detected in preview before production.

### Phase 4 - Operations dashboard and scheduled maintenance
- Consolidate module status and alerts.
- Add daily, weekly and monthly maintenance schedules.
- Generate an audit trail and concise operational reports.

**Exit condition:** The owner can see system health, open issues, completed checks and outstanding work in one place.

## 6. Suggested maintenance cadence

These are starting targets, not claims that automation is already active.

| Frequency | Checks |
|---|---|
| Every 5-15 minutes | Uptime, critical endpoint response and certificate/availability alerts where supported |
| Three times daily | Key page availability, selected assets and critical service checks |
| Daily | Error review, security alerts, backup job status and incident summary |
| Weekly | EN/MS visual review, broken links, SEO checks, performance and database review |
| Monthly | Restore exercise, access review, dependency/security review and full maintenance report |

Tune frequency to platform limits, cost and risk. Avoid unnecessary requests that could overload services.

## 7. Incident handling workflow

1. Detect the issue through a monitor, test, report or user observation.
2. Record the affected page/service, time, severity and evidence.
3. Classify the incident: availability, security, visual, function, data, performance or deployment.
4. Contain the issue. Do not make unrelated changes.
5. Identify the root cause before patching.
6. Apply the smallest safe correction in a controlled branch or preview.
7. Run relevant regression checks.
8. Deploy only after required checks pass and approval is obtained.
9. Verify the live result.
10. Record the resolution, prevention action and any follow-up task.

## 8. Change record and progress tracker

For each module, record:

- Status: Not started / Auditing / In progress / Blocked / Testing / Complete.
- Current implementation and evidence.
- Missing work and dependencies.
- Risk and impact.
- Next action and acceptance criteria.
- Date last reviewed.

### Initial progress snapshot

| Workstream | Status | Next action |
|---|---|---|
| Baseline inventory | Not started | Audit existing website, services and deployment controls |
| Health monitoring | Auditing required | Verify current uptime and endpoint monitoring |
| Security | Auditing required | Review existing Cloudflare and repository protections |
| Backup and recovery | Auditing required | Confirm backup coverage and perform a restore test |
| Deployment gate | Auditing required | Verify preview checks, approval and rollback workflow |
| Design Guard | Not started | Define reference pages and screenshot comparison method |
| Function monitoring | Not started | Select safe, non-destructive critical journey checks |
| Performance and SEO | Auditing required | Verify existing measurement and alert coverage |
| Database integrity | Auditing required | Review D1 backup, schema and monitoring procedures |
| Incident and maintenance manager | Not started | Define alert channels, schedule and report format |

## 9. Explicit exclusions

WPOS must not automatically:

- Redesign pages or change the approved visual identity.
- Rewrite or reorganise the repository without a separate approved plan.
- Rename or remove public URLs or assets without reference checks and redirect planning.
- Change Stripe, ToyyibPay, checkout, payment callbacks, webhooks or payment data.
- Change support recipients, email delivery, chat endpoints or production secrets.
- Deploy a change that has failed required checks.
- Delete data or perform destructive database operations as a routine health check.

## 10. How to resume this plan

When work resumes:

1. Read this document first.
2. Check the latest repository and production state; do not assume this document reflects unverified changes.
3. Review the progress tracker and identify unfinished or blocked items.
4. Select one bounded task with clear acceptance criteria.
5. Inspect the relevant existing implementation before making changes.
6. Update this document with evidence and status after the task.
7. Keep unrelated work and protected payment systems untouched.

## 11. Change history

| Date | Update |
|---|---|
| 2026-11-27 | Initial WPOS master reference created. Modules, protection principles, phases and initial audit status recorded. |
