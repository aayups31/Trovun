# Trovun Supabase foundation

This directory is the source of truth for the Trovun database, authentication boundary, and listing-image bucket. Migrations are ordered and safe to apply with the Supabase CLI.

## Local development

From the repository root:

```sh
npm run supabase:start
npm run supabase:reset
```

Local API, Studio, and captured-email URLs are printed by `supabase start`. The local Auth configuration sends a six-digit signup code, keeps password recovery link-based, requires email verification before password sign-in, and invokes `public.hook_restrict_signup` before creating a user.

Reference categories and popular pickup areas are seeded automatically. Create test users through email/password signup; `seed.sql` intentionally does not write directly to Supabase's `auth` schema.

Run database tests after the stack is healthy:

```sh
npx supabase test db
```

## Hosted project setup

After linking the correct project, review the migration list and apply it:

```sh
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The checked-in configuration enables the before-user-created hook, an eight-character password policy requiring uppercase, lowercase, and a number, six-digit signup codes with a 900-second expiry, a 60-second resend interval, and exact localhost recovery callback URLs. The signup template renders `{{ .Token }}` only; it never renders `{{ .ConfirmationURL }}`, which prevents mail scanners from confirming accounts automatically. Password recovery returns through `/auth/recovery-callback`, while ordinary password sign-in sends no email.

Do not blindly run `npx supabase config push` against production: this repository contains localhost URLs and a conservative two-emails-per-hour local limit. Review every hosted value first. Configure custom SMTP before opening signup to a wider student beta; the built-in sender is intended only for restricted owner/team testing.

Before deploying:

1. Set `NEXT_PUBLIC_SITE_URL` to the canonical deployed origin.
2. In **Authentication → Email Templates → Confirm signup**, set the subject to `Your Trovun verification code` and paste `templates/confirmation.html`. Keep `{{ .Token }}` and remove every `{{ .ConfirmationURL }}`.
3. In the hosted email Auth settings, keep email confirmation enabled and set OTP length to `6`, expiry to `900` seconds, and minimum resend interval to `60` seconds.
4. Keep the deployed `/auth/recovery-callback` and required localhost recovery callbacks in the hosted redirect allowlist.
5. If moderator access is needed, add an exact `@uwaterloo.ca` address to `private.admin_user_allowlist` through a trusted administrative path before creating or promoting that account. Non-Waterloo moderator exceptions are not permitted.

Deploy the OTP-capable app before changing the hosted confirmation template. Keep new signups disabled during the switch and until the previous hosted confirmation-link expiry has elapsed, so every already-issued scanner-consumable link is dead. Test one new account end to end and only then re-enable signup. Accounts that were already auto-confirmed by a mail scanner must be deleted and recreated if their ownership was not independently established.

Moderator accounts must use the same exact `@uwaterloo.ca` domain as students. The public signup path, server actions, Auth hook, and database trigger all repeat that check. Account email changes are disabled because the verified university email is an immutable identity field.

## Listing image contract

`listing-images` is a private bucket with a 5 MiB per-file limit, a maximum of six images per listing, and JPEG, PNG, or WebP MIME restrictions. Object paths must be:

```text
<seller uuid>/<listing uuid>/<random safe filename>.<jpg|jpeg|png|webp>
```

Use new object names rather than upsert/move; no Storage `UPDATE` policy is granted. The expected upload sequence is:

1. Create or save the draft listing.
2. Register the exact owner/listing-scoped path in `listing_images` with `upload_status = 'pending'`.
3. Upload the object to that reserved path. Storage rejects paths without matching pending metadata.
4. Update the metadata row to `upload_status = 'uploaded'`. The trigger verifies the real object and records authoritative MIME/size metadata.
5. Call `publish_listing(listing_id)`. Publishing locks the draft and validates all fields, contiguous image order, upload states, and Storage objects atomically.

For a published listing, register and upload a replacement before removing the old image so at least one uploaded image always remains. Delete the old metadata row first, then its Storage object; the database rejects detaching the final published image. For a draft, sold, or archived listing, delete the Storage object first and then its metadata. To permanently delete a listing, archive it first, delete its Storage objects, delete its image metadata rows, and then delete the listing row. This order avoids orphaned private objects.

## Security model

- Profiles are private to their owner. `seller_profiles` exposes only a shortened display name and approved trust facts; seller email is never exposed for marketplace contact.
- Students can manage only their own listings and images. Drafts remain owner-only.
- Conversations and immutable messages are visible only to their buyer and seller. Participant identities are derived inside security-definer RPCs, and removed listings cannot receive new messages.
- Moderators cannot create listings. `remove_listing` soft-removes a non-draft listing and appends an immutable moderation event.
- `publish_listing` is the only supported transition into `published`; direct client updates are rejected by a trigger.
- Secret/service credentials remain server-only. No key belongs in SQL, seeds, or client code.
