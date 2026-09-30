# Google Search Console

After deploying these changes:

1. Verify the `trovun.ca` domain property in Google Search Console using the DNS record Google provides (or use the verified `https://www.trovun.ca/` URL-prefix property).
2. Submit `https://www.trovun.ca/sitemap.xml` in **Sitemaps**. Submit the sitemap, not robots.txt.
3. Inspect `https://www.trovun.ca/` using **URL inspection**, test the live URL and request indexing to let Google discover the new favicon.

The site serves a plain-text crawler file at `https://www.trovun.ca/robots.txt` from `src/app/robots.ts`. Do not add a second robots.txt in `public/`; it would conflict with the generated route. The file allows public pages and brand assets, points to the canonical sitemap, and excludes account, chat, API and private marketplace routes. Robots rules are crawler guidance; authentication still protects private content.

The home-page metadata now references `/brand/trovun-favicon.png`, a square 96px PNG of the same transparent logo as the header. `/favicon.ico`, an Apple touch icon and 192px/512px app icons also use that logo. Regenerate the exports with `node scripts/build-favicons.mjs` if the source logo changes. The legacy T icon has been removed.

Google controls when its search-result icon refreshes. It may take days or weeks after recrawling, and display is not guaranteed. Browser tabs may also cache an old favicon; a new tab or hard refresh can help after deployment.

References: [Google favicon requirements](https://developers.google.com/search/docs/appearance/favicon-in-search), [robots.txt setup](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt).
