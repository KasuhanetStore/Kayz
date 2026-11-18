# Repository migration audit

Production baseline: `main`  
Last reviewed: 18 November 2026  
Repository: `KasuhanetStore/Kayz`

## Current status

The conservative first-pass cleanup was merged into `main` through PR #13 on 18 November 2026. The merge commit is `e816efa555f7456c6f68ce4d9820cfec0cfaf2e6`.

The merge removed confirmed unused or duplicate files and corrected selected paths and references. It did not relocate public page routes or shared image assets. The live site remains deployed through Cloudflare Pages from `main`.

## Findings and decisions

1. Existing public route directories remain in place: `MS/`, `guides/` and `MS/panduan/`. Do not rename or relocate them without redirects and a full SEO/navigation check.
2. Root-level images such as `/KasuhaKZintro.png`, `/KasuhaKZintroEN.png` and `/OculusLogo.png` remain public dependencies. Keep their paths stable.
3. `OculusLogo.png` also exists under `img/`; metadata and other references use the root asset. Keep the root URL stable.
4. `functions/api/` contains checkout and payment handlers. Their paths, secrets, bindings and logic are outside the scope of repository organization.
5. Root `ads.txt` contains the expected publisher record: `google.com, pub-4280897190566760, DIRECT, f08c47fec0942fa0`. The malformed uppercase root `Ads.txt` was removed in PR #13. Similar records remain at `img/ads.txt` and `php/Ads.txt`; do not remove these until their public URL use and the live `/ads.txt` response are confirmed.
6. Root `header.js` and `img/header.js` are different implementations. Keep both until every script reference and runtime behavior is mapped.
7. The unused legacy `php/send.php` and `php/reply.php` endpoints were removed in PR #13 after owner confirmation that the old integration was no longer used. Their historical Git contents remain in repository history.
8. `index.php`, `index.ts` and the empty `composer.lock` remain pending checks against Cloudflare project configuration, access logs and any external consumers.
9. Older directly addressable HTML pages remain in place until analytics, external backlinks and owner intent have been checked.

## Cleanup merged into main

- Removed `php/send.php` and `php/reply.php`.
- Removed `img/footer.js`, which was byte-for-byte identical to root `footer.js` and had no explicit reference in the reviewed sources.
- Removed empty `css/icon-follow-us.html`.
- Removed malformed root `Ads.txt`; retained lowercase root `ads.txt`.
- Corrected selected favicon, affiliate image, navigation and privacy self-links.
- Removed duplicate non-deferred `js/home-main.js` imports from the reviewed About and Support pages.
- Corrected the header logo sizing on English Guides and Malay Panduan index pages.

## Remaining verification

1. Confirm the production HTTP response for `https://kasuhanet.store/ads.txt` and decide whether nested ads files are needed.
2. Run real browser smoke tests on mobile and desktop for EN/MS navigation, template loads, images, workshop checkout and support submission.
3. Check Stripe and ToyyibPay using non-destructive test procedures. Do not create real charges as part of a smoke test.
4. Check Cloudflare project settings and access logs before changing `index.php`, `index.ts` or other legacy routes.
5. Check analytics and external backlinks before deleting older public HTML pages.
6. Rotate any credential that was ever committed in plaintext. Deleting a file does not erase old Git history.

## Scope and limitations

This is a source-level repository audit, not a complete browser, security penetration, analytics or server-log audit. A successful Cloudflare preview deployment confirms build/deploy success only; it does not prove every interactive form or payment path works end to end.
