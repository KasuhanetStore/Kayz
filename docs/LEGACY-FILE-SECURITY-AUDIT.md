# Legacy file and security audit

Branch: `chore/reorganize-repository-preview`

This is a review of selected legacy, duplicate and unusual files. It is not a full runtime or deployment audit. Nothing in this report authorizes deleting files from production.

## Security finding requiring owner action

- `php/send.php` contains a hard-coded Telegram bot credential. Treat it as compromised because it has been committed to a repository that may be publicly readable.
- Revoke the exposed token in BotFather and issue a replacement. Do not reuse the exposed token.
- The unused legacy files `php/send.php` and `php/reply.php` have been deleted from this preview branch after the owner confirmed the old Telegram RSA integration is no longer used.
- No page reference to these scripts was found in the selected-page checks or repository code search. This is not proof that no external client or bookmark calls them.
- Deleting the files from the latest branch does not erase their contents or the exposed credential from earlier Git commits. Revoke the old token in BotFather if it was ever valid; history cleanup or secret revocation is still required.

## Duplicate and conflicting files

| Files | Finding | Safe decision |
|---|---|---|
| `footer.js`, `img/footer.js` | Same Git blob SHA; exact duplicate content. A source scan of the reviewed HTML, CSS and template files found no explicit reference to either path. | `img/footer.js` removed from this preview branch; keep root `footer.js` for now. Recheck preview before merging. |
| `header.js`, `img/header.js` | Different implementations; root version contains older route names, image version contains a separate older header | Keep both until page-by-page script loading is mapped |
| `OculusLogo.png`, `img/OculusLogo.png` | Duplicate basename; root asset is used in absolute metadata URLs | Keep root URL stable |
| `Ads.txt`, `ads.txt`, `img/ads.txt`, `php/Ads.txt` | Similar but not identical AdSense records; root `Ads.txt` contains a malformed publisher identifier with a duplicated `pub-` prefix, while lowercase root `ads.txt` has the normal `pub-` format | Do not delete or rename until the live `/ads.txt` response and AdSense account publisher ID are confirmed |
| `index.php` | Minimal PHP placeholder, while site is deployed on Cloudflare Pages | Retain until deployment and access logs confirm it is unused |
| `index.ts` | Generic KV example using placeholder values; no direct HTML reference found in sampled pages | Retain until Cloudflare build/runtime configuration is checked |
| `composer.lock` | Empty file | No action until PHP dependency/runtime usage is established |

## Older or test-looking pages

Files such as `PageTest.html`, `TemaBaru.html`, `BuatWebSendiri.html`, `AffliateShopSupport.html`, `KasuhaNET-index-refreshed.html`, `article.html`, and `artikel.html` have older or inconsistent route references. A scan of all repository HTML/template pages found no inbound source references to these routes; none appears in the current sitemap. However, `BuatWebSendiri.html` is a deliberate meta-refresh redirect to the homepage, `KasuhaNET-index-refreshed.html` declares the homepage as canonical, and the others remain directly addressable public files. Keep them until analytics, external backlinks and owner intent are checked. `Rwanda-SupportDevelopement.html` and `Timor-Leste-SupportDevelopement.html` are linked from both homepages and must be kept. `ProDownloaderVIDEOanywhereEN.html`, `SellerRimau.html` and `SellerTachtical.html` were not found in the sitemap or other page references, but are still public pages and should not be removed without owner approval.

## Follow-up cleanup completed on preview

- Removed `css/icon-follow-us.html`: it was an empty file and no reference to its path or name was found in the repository HTML, CSS or template files reviewed.

- Removed `img/footer.js` because it was byte-for-byte identical to root `footer.js` and no explicit load/reference was found in the reviewed HTML, CSS or template sources.
- Kept root `footer.js`, both `header.js` variants, duplicate logo paths, all AdSense file variants, and older/test-looking pages. Their usage or public URL impact is not sufficiently established for safe deletion.
- This was a conservative source-level reference check, not a complete browser runtime, external-link, analytics or server-log audit.

## Migration decision

- Do not remove duplicate-looking files solely because their names match.
- Do not rename the AdSense file variants until the live URL is checked.
- Do not move or activate legacy PHP endpoints as part of repository cleanup.
- Prioritize credential rotation and safe retirement of the unused PHP scripts, separately from cosmetic file organization.
- No production code or asset was changed by this audit.

## Active-page reference and script follow-up

- Fixed the English privacy page's two self-links to point to `/privacy-policy-EN.html`.
- Rechecked `CommandCanDoLIST.html`, both affiliate pages, both sale pages, both privacy pages, both About pages and the EN/MS support pages. The previously reported CommandCanDo navigation and affiliate product-image issues are already corrected in the current preview source; no additional route changes were needed in this pass.
- Removed duplicate non-deferred `js/home-main.js` imports from `about-us-EN.html`, `support-centre-EN.html` and `MS/support-centre-MS.html`. Each now loads the shared script once. The Malay About page already loaded it once and was left unchanged.
- Root `ads.txt` contains the expected publisher format `pub-4280897190566760`. `Ads.txt` has a malformed duplicated `pub-pub-` prefix. Do not delete or rename case variants until the actual `/ads.txt` response on production and preview can be confirmed; direct HTTP retrieval was unavailable during this pass.
- Cloudflare Pages reports a successful preview deployment for the latest preview commit. This is not a substitute for browser-based interaction testing.

## Remaining verification before merge

- Confirm the live and preview HTTP response bodies for `/ads.txt` and `/Ads.txt`, then decide whether the malformed uppercase duplicate can be removed safely.
- Run browser smoke tests on the preview for EN/MS navigation, images, mobile menu, workshop checkout, Stripe, ToyyibPay and support submission. Do not change payment or support runtime code as part of this cleanup.
- Check analytics and external backlinks before removing any legacy public HTML pages.
