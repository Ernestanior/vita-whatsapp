import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy – Vita AI',
  description: 'Vita AI Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 font-sans text-zinc-800 dark:text-zinc-200">
      <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-8 text-sm text-zinc-500">Last updated: 25 June 2025</p>

      <Section title="1. Introduction">
        <p>
          Vita AI (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates a WhatsApp-based
          nutrition tracking service. This Privacy Policy explains how we collect, use, store, and
          protect your personal data when you interact with our service via WhatsApp or our website
          (collectively, the &quot;Service&quot;).
        </p>
        <p>
          By using the Service you agree to the collection and use of information in accordance with
          this policy. If you do not agree, please stop using the Service immediately.
        </p>
      </Section>

      <Section title="2. Information We Collect">
        <h3 className="mt-4 font-semibold">2.1 Information You Provide</h3>
        <ul className="ml-6 list-disc space-y-1">
          <li>WhatsApp phone number and display name</li>
          <li>Food photos you send for nutritional analysis</li>
          <li>Text messages describing meals, supplements, or dietary preferences</li>
          <li>Health profile data you voluntarily provide (weight, height, fitness goals)</li>
          <li>Payment information processed through Stripe (we do not store card details)</li>
        </ul>
        <h3 className="mt-4 font-semibold">2.2 Information Collected Automatically</h3>
        <ul className="ml-6 list-disc space-y-1">
          <li>Message timestamps and interaction frequency</li>
          <li>Language preference (detected from your messages)</li>
          <li>Subscription status and usage quota</li>
        </ul>

        <h3 className="mt-4 font-semibold">2.3 Information from Third Parties</h3>
        <ul className="ml-6 list-disc space-y-1">
          <li>WhatsApp profile information provided via the WhatsApp Business API (operated by Meta Platforms, Inc.)</li>
          <li>Payment confirmation data from Stripe, Inc.</li>
        </ul>
      </Section>

      <Section title="3. How We Use Your Information">
        <ul className="ml-6 list-disc space-y-1">
          <li>Analyse food photos using AI to provide nutritional estimates (calories, protein, carbohydrates)</li>
          <li>Generate daily summaries, meal reminders, and weekly trend reports</li>
          <li>Maintain your health profile and dietary preferences</li>
          <li>Process subscription payments and manage your account</li>
          <li>Improve the accuracy of our food recognition models (using anonymised, aggregated data only)</li>
          <li>Send service-related notifications (e.g. quota warnings, subscription updates)</li>
          <li>Comply with legal obligations</li>
        </ul>
      </Section>

      <Section title="4. Data Storage &amp; Security">
        <p>
          Your data is stored in Supabase (hosted on AWS infrastructure in the Singapore region,
          ap-southeast-1). We implement the following security measures:
        </p>
        <ul className="ml-6 list-disc space-y-1">
          <li>All data is encrypted in transit (TLS 1.2+) and at rest (AES-256)</li>
          <li>Row-level security (RLS) policies ensure users can only access their own data</li>
          <li>Food photos are stored temporarily for analysis and deleted within 24 hours</li>
          <li>Payment card details are never stored on our servers — all payment processing is handled by Stripe</li>
          <li>API keys and secrets are stored as encrypted environment variables</li>
        </ul>
      </Section>

      <Section title="5. Data Sharing &amp; Third Parties">
        <p>We share your data only with the following third-party services, solely to operate the Service:</p>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 pr-4">Provider</th>
              <th className="pb-2 pr-4">Purpose</th>
              <th className="pb-2">Data Shared</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr><td className="py-2 pr-4">Meta (WhatsApp Business API)</td><td className="py-2 pr-4">Message delivery</td><td className="py-2">Phone number, messages</td></tr>
            <tr><td className="py-2 pr-4">OpenAI</td><td className="py-2 pr-4">Food image recognition &amp; nutritional analysis</td><td className="py-2">Food photos, meal descriptions</td></tr>
            <tr><td className="py-2 pr-4">Supabase</td><td className="py-2 pr-4">Database &amp; authentication</td><td className="py-2">Account &amp; nutrition data</td></tr>
            <tr><td className="py-2 pr-4">Stripe</td><td className="py-2 pr-4">Payment processing</td><td className="py-2">Email, payment method</td></tr>
            <tr><td className="py-2 pr-4">Vercel</td><td className="py-2 pr-4">Application hosting</td><td className="py-2">Server logs, IP addresses</td></tr>
          </tbody>
        </table>
        <p className="mt-3">
          We do not sell, rent, or trade your personal data to any third party for marketing purposes.
        </p>
      </Section>
      <Section title="6. Data Retention">
        <ul className="ml-6 list-disc space-y-1">
          <li>Food photos: deleted within 24 hours of analysis</li>
          <li>Nutrition records: retained for the duration of your account</li>
          <li>Chat history: retained for up to 90 days for service quality</li>
          <li>Account data: deleted within 30 days of account deletion request</li>
          <li>Payment records: retained as required by applicable tax and accounting laws (up to 7 years)</li>
        </ul>
      </Section>

      <Section title="7. Your Rights">
        <p>Depending on your jurisdiction, you may have the following rights:</p>
        <ul className="ml-6 list-disc space-y-1">
          <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
          <li><strong>Rectification</strong> — correct inaccurate or incomplete data</li>
          <li><strong>Erasure</strong> — request deletion of your data (send &quot;DELETE MY DATA&quot; via WhatsApp)</li>
          <li><strong>Data Portability</strong> — receive your data in a structured, machine-readable format</li>
          <li><strong>Withdraw Consent</strong> — stop using the Service at any time; send &quot;STOP&quot; via WhatsApp</li>
          <li><strong>Objection</strong> — object to processing of your data for specific purposes</li>
        </ul>
        <p>
          To exercise any of these rights, message us on WhatsApp or email{' '}
          <a href="mailto:privacy@vitaai.com" className="underline">privacy@vitaai.com</a>.
          We will respond within 30 days.
        </p>
      </Section>

      <Section title="8. Children&apos;s Privacy">
        <p>
          The Service is not intended for individuals under the age of 13. We do not knowingly
          collect personal data from children. If you believe a child has provided us with personal
          data, please contact us and we will promptly delete it.
        </p>
      </Section>

      <Section title="9. International Data Transfers">
        <p>
          Your data may be processed in countries outside of Singapore, including the United States
          (for OpenAI and Stripe services). We ensure appropriate safeguards are in place, including
          standard contractual clauses and data processing agreements with all third-party providers.
        </p>
      </Section>

      <Section title="10. Cookies &amp; Tracking">
        <p>
          Our WhatsApp-based service does not use cookies. Our website may use essential cookies
          for authentication and session management only. We do not use advertising trackers or
          analytics cookies.
        </p>
      </Section>

      <Section title="11. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material
          changes by sending a message via WhatsApp. Continued use of the Service after changes
          constitutes acceptance of the updated policy.
        </p>
      </Section>

      <Section title="12. Contact Us">
        <p>If you have questions about this Privacy Policy, contact us at:</p>
        <ul className="ml-6 list-disc space-y-1">
          <li>Email: <a href="mailto:privacy@vitaai.com" className="underline">privacy@vitaai.com</a></li>
          <li>WhatsApp: message &quot;HELP&quot; to our service number</li>
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}
