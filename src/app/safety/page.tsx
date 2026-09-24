import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import {
  COMMUNITY_RULES,
  MEETUP_ADVICE,
  PROHIBITED_ITEMS_SCOPE,
  PROHIBITED_ITEM_GROUPS,
} from '@/features/safety/policies';

export const metadata = {
  title: 'Safety, community rules & privacy',
  description: 'How to trade safely, protect your information and report concerns on Trovun.',
};

export default function SafetyPage() {
  return (
    <main className="min-h-screen bg-[#0a1016] px-5 py-10 text-[#f1eee5] sm:py-16">
      <div className="mx-auto max-w-3xl">
        <BrandMark tone="light" showCampusLabel={false} />
        <p className="mt-14 text-xs uppercase tracking-widest text-um-gold-300">
          The Trovun community
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
          Trade thoughtfully.
          <br />
          Look out for each other.
        </h1>
        <p className="mt-6 text-lg leading-8 text-white/60">
          Clear rules, practical safety advice and an explanation of how your information is used.
          Trovun is independent from the University of Waterloo.
        </p>
        <nav
          aria-label="Safety topics"
          className="my-8 flex flex-wrap gap-4 text-sm text-um-gold-300"
        >
          {[
            ['rules', 'Community rules'],
            ['prohibited-items', 'What you cannot sell'],
            ['meetups', 'Safe exchanges'],
            ['privacy', 'Privacy'],
            ['ai', 'AI help'],
            ['report', 'Reports & requests'],
          ].map(([id, label]) => (
            <a key={id} className="min-h-11 py-3 underline underline-offset-4" href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>
        <section id="rules" className="scroll-mt-24 border-t border-white/10 py-8">
          <h2 className="text-2xl font-semibold">Community rules</h2>
          <ul className="mt-5 list-disc space-y-3 pl-5 leading-7 text-white/75">
            {COMMUNITY_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>
        <section id="prohibited-items" className="scroll-mt-24 border-t border-white/10 py-8">
          <h2 className="text-2xl font-semibold">What you cannot sell or give away</h2>
          <p className="mt-5 leading-7 text-white/75">{PROHIBITED_ITEMS_SCOPE}</p>
          <p className="mt-4 leading-7 text-white/75">
            Open a category for examples and any permitted exceptions. If you are unsure whether an
            item fits these rules, leave it unlisted and{' '}
            <Link href="/safety/report" className="text-um-gold-300 underline underline-offset-4">
              ask for a review
            </Link>
            . An item appearing on Trovun or receiving AI suggestions is not approval to sell it.
          </p>
          <div className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10 px-5">
            {PROHIBITED_ITEM_GROUPS.map((group) => (
              <details key={group.title} className="group py-4">
                <summary className="cursor-pointer rounded-sm py-2 text-base font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-um-gold-300">
                  {group.title}
                </summary>
                <p className="pb-2 pt-3 leading-7 text-white/75">{group.description}</p>
              </details>
            ))}
          </div>
          <p className="mt-5 leading-7 text-white/75">
            Listings that violate these rules may be removed. Report suspected violations using the
            listing’s report link. You can request review of a removal through the reports and
            appeals form. These restrictions also cover attempts to arrange prohibited exchanges
            off-platform through Trovun.
          </p>
        </section>
        <section id="meetups" className="scroll-mt-24 border-t border-white/10 py-8">
          <h2 className="text-2xl font-semibold">Before you exchange</h2>
          <p className="mt-5 leading-7 text-white/75">{MEETUP_ADVICE}</p>
          <p className="mt-4 leading-7 text-white/75">
            Check the model, included accessories, defects, recalls and proof of ownership where
            appropriate. Confirm return terms before buying. Email verification proves control of an
            address; it does not guarantee identity, enrolment, item quality or trustworthiness.
          </p>
        </section>
        <section id="privacy" className="scroll-mt-24 space-y-5 border-t border-white/10 py-8">
          <h2 className="text-2xl font-semibold">Your information</h2>
          <p className="leading-7 text-white/75">
            Trovun uses account and verification details to secure access; profile and listing
            details to run the marketplace; and messages, read receipts, ratings and notification
            preferences to support exchanges. Reports and moderation records help us investigate
            concerns. Infrastructure providers may process technical logs, IP addresses and device
            information.
          </p>
          <p className="leading-7 text-white/75">
            Other eligible users can see your marketplace display name, selected study details,
            account age, optional avatar, seller ratings and published listings. Account email and
            private residence information are not shown as marketplace contact details. Messages are
            shared with their participants. Reports are available to authorized moderators. Avoid
            putting sensitive information into listings, messages or reports.
          </p>
          <p className="leading-7 text-white/75">
            Supabase provides database, authentication and storage services. Resend supports message
            reminder emails; these link to the conversation without including message text. You can
            disable message emails in your profile. Essential account and security emails are
            separate. Required cookies keep your session secure; inactive web sessions expire after
            approximately three days.
          </p>
          <p className="leading-7 text-white/75">
            Records may remain for account operation, security, moderation, backups and legal needs.
            Chat context can remain after a listing is removed; ratings currently depend on their
            linked listing and conversation. Deletion requests require review and may be subject to
            lawful exceptions. Providers may process data outside Canada. Trovun does not sell
            personal information for money. No system can promise absolute security.
          </p>
          <p className="leading-7 text-white/75">
            You can request access, correction or deletion, or raise a privacy concern through the
            request form below. Identity may need to be verified before information is released. A
            request must not expose another person’s private information.
          </p>
        </section>
        <section id="ai" className="scroll-mt-24 space-y-5 border-t border-white/10 py-8">
          <h2 className="text-2xl font-semibold">AI assistance & listing checks</h2>
          <p className="leading-7 text-white/75">
            Choosing an AI button sends the listing title, description, stated price and condition,
            your item question, or your search request to OpenAI. For listing drafts, you can also
            choose to include your first three uploaded photos. This helps suggest wording, missing
            details, questions or search filters. Private conversations, profile details and meetup
            fields are not included. Obvious email addresses, links and phone numbers are filtered,
            but free text may still contain personal information. Remove it before requesting help.
          </p>
          <p className="leading-7 text-white/75">
            When you publish or change a listing, its title, description and uploaded photos may
            also be checked by OpenAI in the background for potential rule violations. Private flags
            include a reason and evidence for human moderators; AI does not ban users or remove,
            approve or hide listings. Checks can miss issues or flag permitted items. Reports and
            private messages are not automatically sent to AI.
          </p>
          <p className="leading-7 text-white/75">
            Suggestions do not publish listings, send messages or make moderation decisions. Check
            every suggested fact. AI cannot verify ownership, authenticity, product safety, recalls
            or a fair price. Normal marketplace features work without AI.
          </p>
          <p className="leading-7 text-white/75">
            Trovun requests no stored Responses API history and does not save prompts or suggestions
            in its AI usage counters. OpenAI may retain data under its own security and
            abuse-monitoring policies; this is not a zero-retention guarantee. Daily usage counters
            contain account IDs, request counts and timestamps, with older counters removed during
            subsequent use.{' '}
            <a className="underline" href="https://developers.openai.com/api/docs/guides/your-data">
              OpenAI data controls
            </a>
          </p>
          <p className="leading-7 text-white/75">
            Moderation flags and check status are stored privately with the listing for human
            review. They are replaced when checked content changes and removed when the listing
            leaves published status or is deleted. Photos sent for analysis may contain personal
            information; text filtering does not redact images. Use item-only photos without faces,
            documents, addresses or identifying details.
          </p>
        </section>
        <section id="report" className="scroll-mt-24 space-y-5 border-t border-white/10 py-8">
          <h2 className="text-2xl font-semibold">Reports, requests & appeals</h2>
          <p className="leading-7 text-white/75">
            Report suspected fraud, unsafe or prohibited items, harassment, privacy concerns or
            rating manipulation. Include the relevant listing or conversation and explain what
            happened. Moderators review reports and may remove listings under the community rules. A
            report is not a finding of wrongdoing. You may request review of a moderation decision
            with supporting context.
          </p>
          <p className="leading-7 text-white/75">
            Reports and privacy requests are handled by people, not AI. Support is not an emergency
            service and response times are not guaranteed. Call 911 if someone is in immediate
            danger.
          </p>
          <Link
            className="inline-flex min-h-12 items-center rounded-full bg-um-gold-300 px-6 font-semibold text-black"
            href="/safety/report"
          >
            Report or request help
          </Link>
        </section>
        <p className="mt-6 text-xs leading-6 text-white/40">
          Updated September 23, 2026. These are community rules and current feature disclosures.
          Formal legal terms and operator contact information will be added after confirmation.
        </p>
      </div>
    </main>
  );
}
