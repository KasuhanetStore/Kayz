# Repository migration audit

Audit branch: `chore/reorganize-repository-preview`

## Current decision

This is a conservative, non-production migration. The production branch `main` is not changed. Public page routes and asset paths must remain stable during the first cleanup stage.

## Findings

1. The repository already has useful working directories: `MS/`, `guides/`, `MS/panduan/`, `css/`, `js/`, `img/`, `functions/api/`, `php/` and `template-text/`.
2. Some image files remain at the repository root and are referenced by existing pages using root-relative URLs. Examples include `/KasuhaKZintro.png`, `/KasuhaKZintroEN.png` and `/OculusLogo.png`. These files must not be moved until every consumer is updated and verified. Keeping them at root for compatibility is acceptable.
3. `OculusLogo.png` is also present under `img/`, but metadata and page/template references still use the root URL. The root copy therefore remains the canonical public asset for now.
4. The English and Malay page routes are established and are also listed in `sitemap.xml`. Do not rename or relocate route HTML as part of asset cleanup.
5. `functions/api/` contains checkout and payment handlers. These are runtime code, not general assets; keep their paths and bindings unchanged.
6. Both `Ads.txt` and `ads.txt` exist at root, with additional ads-related files elsewhere. Their contents and case-sensitive URL behavior must be reconciled before any deletion or rename.
7. `header.js` and `footer.js` exist at root; similarly named files also appear under `img/`. Do not consolidate them until script references and actual behavior are verified page by page.

## Safe migration order

1. Keep public HTML route paths unchanged.
2. Inventory every file reference in HTML, CSS, JavaScript, templates, metadata, sitemap and configuration.
3. Move one small group of confirmed internal-only assets at a time. Update every reference in the same commit.
4. Preserve root-level public assets when their current URLs are in use. Organization does not require moving every file.
5. Verify EN/MS navigation, styles, images, checkout, Stripe, ToyyibPay, support submission, sitemap, robots and ads.txt on a preview deployment.
6. Merge to `main` only after preview checks pass and the owner approves.

## Scope of this audit

This audit does not claim that every file has been proven unused. No production route, payment handler, support endpoint, asset or Cloudflare setting is deleted or renamed in this stage.
