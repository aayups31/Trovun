# Trovun domain migration

Canonical production origin: `https://www.trovun.ca` (matching Vercel).

## Deploy

- Deploy this code to the Vercel project attached to the new and old domains.
- Keep `myunimarket.com`, `www.myunimarket.com`, `trovun.ca`, and `www.trovun.ca` attached. The app redirects the first three permanently to the canonical host, preserving paths and queries. Vercel domain redirects can run before app redirects; configure them to the same destination.
- Set Vercel's production `NEXT_PUBLIC_SITE_URL` to `https://www.trovun.ca` and redeploy.
- Set Supabase Auth's Site URL to the same origin and allow `https://www.trovun.ca/auth/recovery-callback` and `https://www.trovun.ca/auth/callback`. Keep required localhost entries.
- Set `MESSAGE_EMAIL_SITE_URL=https://www.trovun.ca` in the notification configuration and run `npm run notifications:configure` to update the separately deployed worker. Use a verified Trovun sender.

## Verify before submitting to Google

- The canonical homepage and public category/item guide pages return 200 without signing in.
- `/sitemap.xml` returns XML containing only `https://www.trovun.ca` public pages. Private listings, profiles, messages, and auth routes intentionally remain excluded.
- `/robots.txt` points to `https://www.trovun.ca/sitemap.xml`.
- Page-source canonical URLs, structured data, and social metadata use the new host.
- An old URL such as `https://www.myunimarket.com/waterloo-marketplace/books` permanently redirects to the equivalent Trovun page.

## Search Console

1. Verify the `trovun.ca` Domain property using DNS and retain ownership of the old property.
2. Submit `https://www.trovun.ca/sitemap.xml` in the new property's Sitemaps report.
3. Use the old property's Settings → Change of address to select the new property once redirects are live. Verify both properties with the same owner account.
4. Inspect `https://www.trovun.ca/`, run the live test, and request indexing. Monitor indexing and sitemap reports over the following weeks.
5. Retain the old domain and redirects for at least one year, preferably longer for old shared links.

Deploying a sitemap does not automatically submit it to Search Console or guarantee indexing. See [Google's migration guidance](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).
