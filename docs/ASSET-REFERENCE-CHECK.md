# Asset reference check

Baseline: production source branch `main`  
Last reviewed: 18 November 2026

This is a source-level reference audit of the main English and Malay entry points, workshop, affiliate, support, sale, privacy and guide pages. It is not proof that every asset in the repository has no other consumer.

## Confirmed root-level assets still in use

| Asset path | Known consumers / evidence | Decision |
|---|---|---|
| `/broadcast.png` | English homepage, Cash Out EN/MS and Terminal Options MS | Keep at root |
| `/BannerWebSite.png` | English and Malay homepage | Keep at root |
| `/BannerADS-VPSmyr-EN.png` | English homepage | Keep at root |
| `/BannerADS-VPSmyr-MS.png` | Malay homepage | Keep at root |
| `/Banner-RytSignUp-MS.png` | Malay homepage | Keep at root |
| `/LogoHLBrefer.png` | English and Malay homepage | Keep at root |
| `/KasuhaKZintroEN.png` | About Us EN | Keep at root |
| `/KasuhaKZintro.png` | About Us MS | Keep at root |
| `/Lcd11.png`, `/KeelatSale.png`, `/RaspberryPi5Case.png`, `/OledDisplay2.png` | Affiliate pages EN/MS | Keep at root |
| `/img/RaspberryPI58gb1.png`, `/img/ArduinoUNOR3.png`, `/img/MetatronikWire1.png`, `/img/MetatronikWire2.png` | Affiliate pages EN/MS | Keep under `img/` |
| `/favicon.png`, `/favicon-16x16.png`, `/favicon-32x32.png`, `/favicon.ico` | Multiple pages and manifest | Keep existing paths |

## Existing shared directories

- `css/` and `js/` are used by pages at root and inside `MS/`.
- `img/` contains shared logos and images used by multiple routes.
- `guides/` and `MS/panduan/` are public URL directories. Do not rename.
- `functions/api/` contains payment handlers. Do not move or rename.
- `template-text/` contains reusable template fragments. Preserve current paths until references are fully mapped.

## Reference fixes merged into main

- Corrected English and Malay affiliate product image references to the actual `img/` locations. The visual assets were not moved.
- Confirmed the affiliate MS `GET WEBSITE!` link points to `/MS/Banner-WebSale-MS.html`.
- Updated active-page favicon references that declared a nonexistent `favicon-512x512.png` file to use the existing `/favicon.png` asset.
- Fixed the two self-navigation links in `privacy-policy-EN.html` to use its canonical `.html` route.
- Corrected the header logo sizing on the English Guides and Malay Panduan index pages.

## Migration decision

No shared image assets were moved in the first pass. Several root-level image URLs are confirmed dependencies, and pages use a mixture of root-relative and relative paths. Moving them now would create unnecessary breakage risk.

## Remaining verification

- This remains a source-level check. Runtime HTTP responses, browser interactions, external analytics and backlinks have not all been verified.
- Confirm the production `/ads.txt` response before considering the nested copies for removal.
- Run browser checks for mobile navigation, template loading, image rendering and form interactions before further structural changes.
