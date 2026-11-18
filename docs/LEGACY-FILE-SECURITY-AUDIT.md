# Legacy file and security audit

Baseline: production source branch `main`  
Last reviewed: 18 November 2026

This is a review of selected legacy, duplicate and unusual files. It is not a complete runtime or deployment audit.

## Security finding requiring owner action

- A Telegram bot credential was previously hard-coded in `php/send.php` and committed to Git history. Treat that credential as compromised if it was ever valid.
- The legacy `php/send.php` and `php/reply.php` endpoints were removed in PR #13 after the owner confirmed the old integration was no longer used.
- Removing those files from the current branch does not erase their contents from earlier Git commits. Revoke the old credential in BotFather if this has not already been done. Do not reuse it.

## Duplicate and conflicting files

| Files | Finding | Safe decision |
|---|---|---|
| `footer.js`, `img/footer.js` | Same Git blob SHA; exact duplicate. No explicit reference was found in the reviewed HTML, CSS or templates. | `img/footer.js` removed in PR #13; keep root `footer.js`. |
| `header.js`, `img/header.js` | Different implementations; root version contains older route names and the image-folder version has a separate older header. | Keep both until page-by-page script loading and behavior are mapped. |
| `OculusLogo.png`, `img/OculusLogo.png` | Duplicate basename; root asset is used in absolute metadata URLs. | Keep root URL stable. |
| `ads.txt`, `img/ads.txt`, `php/Ads.txt` | Root lowercase file has the expected publisher record. The two nested files contain the same publisher record. | Keep root `ads.txt`; retain nested copies until their public URL use and live `/ads.txt` response are confirmed. The malformed uppercase root `Ads.txt` was removed in PR #13. |
| `index.php` | Minimal PHP placeholder; the website is deployed through Cloudflare Pages. | Retain until deployment settings and access logs confirm it is unused. |
| `index.ts` | Generic KV example; no direct HTML reference was found in the reviewed sources. | Retain until Cloudflare project configuration is checked. |
| `composer.lock` | Empty file. | No action until PHP dependency/runtime use is established. |

## Older or test-looking pages

Files such as `PageTest.html`, `TemaBaru.html`, `BuatWebSendiri.html`, `AffliateShopSupport.html`, `KasuhaNET-index-refreshed.html`, `article.html` and `artikel.html` have older or inconsistent route references. They are not in the current sitemap and no inbound repository references were found in the reviewed source scan. However, they remain directly addressable public files. Keep them until analytics, external backlinks and owner intent have been checked.

`BuatWebSendiri.html` is a deliberate meta-refresh redirect to the homepage, and `KasuhaNET-index-refreshed.html` declares the homepage as canonical. `Rwanda-SupportDevelopement.html` and `Timor-Leste-SupportDevelopement.html` are linked from both homepages and must be kept. `ProDownloaderVIDEOanywhereEN.html`, `SellerRimau.html` and `SellerTachtical.html` were not found in the sitemap or reviewed inbound references, but must not be removed without checking external traffic and owner intent.

## Cleanup merged into main

- Removed empty `css/icon-follow-us.html`.
- Removed `img/footer.js`, an exact duplicate of root `footer.js` with no explicit reference in reviewed sources.
- Removed unused legacy `php/send.php` and `php/reply.php` after owner confirmation.
- Removed malformed uppercase root `Ads.txt`; retained lowercase root `ads.txt`.
- Kept root `footer.js`, both `header.js` variants, duplicate logo paths, nested ads files and older/test-looking public pages because their external or runtime use is not fully established.
- Removed duplicate non-deferred `js/home-main.js` imports from `about-us-EN.html`, `support-centre-EN.html` and `MS/support-centre-MS.html`. The Malay About page already loaded it once.
- Corrected selected navigation, affiliate image and favicon references.

## Remaining verification

1. Confirm the live HTTP response for `/ads.txt` and check whether nested ads files have any legitimate consumer.
2. Run browser smoke tests on EN/MS navigation, images, mobile menus, workshop checkout and support submission. A successful Pages deployment is not proof that forms work end to end.
3. Check analytics and external backlinks before removing older public HTML pages.
4. Review Cloudflare project configuration and access logs before removing `index.php` or `index.ts`.
5. Confirm that the historical Telegram credential has been revoked. Git history still contains the old file contents.

This audit does not authorize deleting public routes, payment handlers, support endpoints, secrets, D1 bindings or Cloudflare settings.
