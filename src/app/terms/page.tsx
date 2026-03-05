import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service – Vita AI',
  description: 'Vita AI Terms of Service',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 font-sans text-zinc-800 dark:text-zinc-200">
      <h1 className="mb-2 text-3xl font-bold">Terms of Service</h1>
      <p className="mb-8 text-sm text-zinc-500">Last updated: 25 June 2025</p>

      <Section title="1. Acceptance of Terms">
        <p>
          By sending a message to the Vita AI WhatsApp service or accessing our website, you agree
          to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these
          Terms, do not use the Service.
        </p>
        <p>
          &quot;Service&quot; refers to the Vita AI WhatsApp nutrition tracking bot, the website at
          vitaai.com, and all related features including food recognition, daily summaries, weekly
          reports, and subscription management.
        </p>
      </Section>

      <Section title="2. Description of Service">
        <p>Vita AI provides AI-powered nutritional tracking via WhatsApp, including:</p>
        <ul className="ml-6 list-disc space-y-1">
          <li>Food photo recognition and nutritional analysis (calories, protein, carbohydrates)</li>
          <li>Text-based meal logging and supplement tracking</li>
          <li>Daily nutrition summaries and meal reminders</li>
          <li>Weekly macro trend reports with visual charts</li>
          <li>Personalised health scoring and dietary recommendations</li>
        </ul>
      </Section>

      <Section title="3. Eligibility">
        <p>
          You must be at least 13 years old to use the Service. By using the Service, you represent
          that you meet this age requirement. If you are under 18, you must have parental or guardian
          consent.
        </p>
      </Section>
      <Section title="4. Subscription Plans &amp; Pricing">
        <p>Vita AI offers the following tiers:</p>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 pr-4">Plan</th>
              <th className="pb-2 pr-4">Monthly</th>
              <th className="pb-2 pr-4">Yearly</th>
              <th className="pb-2">Includes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr><td className="py-2 pr-4">Free</td><td className="py-2 pr-4">SGD 0</td><td className="py-2 pr-4">—</td><td className="py-2">Limited daily food recognitions</td></tr>
            <tr><td className="py-2 pr-4">Premium</td><td className="py-2 pr-4">SGD 9.90</td><td className="py-2 pr-4">SGD 99.00</td><td className="py-2">Unlimited recognition, daily summaries, history, analytics</td></tr>
            <tr><td className="py-2 pr-4">Pro</td><td className="py-2 pr-4">SGD 19.90</td><td className="py-2 pr-4">SGD 199.00</td><td className="py-2">All Premium features + priority support, custom reports, advanced insights</td></tr>
          </tbody>
        </table>
        <p className="mt-3">
          All prices are in Singapore Dollars (SGD) and inclusive of applicable taxes. We reserve the
          right to change pricing with 30 days&apos; notice.
        </p>
      </Section>

      <Section title="5. Payment &amp; Billing">
        <ul className="ml-6 list-disc space-y-1">
          <li>Payments are processed securely by Stripe, Inc. We do not store your credit card information.</li>
          <li>Subscriptions renew automatically at the end of each billing period unless cancelled.</li>
          <li>You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period.</li>
          <li>Refunds are available within 7 days of initial purchase if you have used fewer than 10 food recognitions. Contact us via WhatsApp or email to request a refund.</li>
          <li>We accept credit/debit cards and PayNow (Singapore).</li>
        </ul>
      </Section>

      <Section title="6. Acceptable Use">
        <p>You agree not to:</p>
        <ul className="ml-6 list-disc space-y-1">
          <li>Use the Service for any unlawful purpose</li>
          <li>Send abusive, offensive, or spam messages</li>
          <li>Attempt to reverse-engineer, hack, or disrupt the Service</li>
          <li>Share your account or allow others to use the Service through your WhatsApp number</li>
          <li>Send images that are not food-related (e.g. inappropriate content)</li>
          <li>Circumvent usage quotas or rate limits through automated means</li>
          <li>Resell or redistribute the Service or its outputs</li>
        </ul>
        <p>
          Violation of these terms may result in immediate suspension or termination of your account
          without refund.
        </p>
      </Section>
      <Section title="7. Disclaimer — Not Medical Advice">
        <p>
          Vita AI is a nutritional tracking tool, not a medical service. The nutritional information
          provided is estimated using AI and may not be 100% accurate. The Service does not provide
          medical advice, diagnosis, or treatment.
        </p>
        <p>
          You should not rely solely on the Service for dietary decisions, especially if you have
          medical conditions such as diabetes, food allergies, eating disorders, or other
          health-related concerns. Always consult a qualified healthcare professional before making
          significant changes to your diet.
        </p>
      </Section>

      <Section title="8. Intellectual Property">
        <p>
          All content, features, and functionality of the Service — including but not limited to
          text, graphics, logos, algorithms, and software — are owned by Vita AI and protected by
          intellectual property laws. You may not copy, modify, distribute, or create derivative
          works without our prior written consent.
        </p>
        <p>
          You retain ownership of the photos and text you send to the Service. By using the Service,
          you grant us a limited, non-exclusive licence to process your content solely for the
          purpose of providing the Service.
        </p>
      </Section>

      <Section title="9. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Vita AI shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages, including but not limited to:
        </p>
        <ul className="ml-6 list-disc space-y-1">
          <li>Inaccurate nutritional estimates or food recognition errors</li>
          <li>Health outcomes resulting from dietary decisions based on the Service</li>
          <li>Loss of data or service interruptions</li>
          <li>Unauthorised access to your account</li>
        </ul>
        <p>
          Our total liability for any claim arising from the Service shall not exceed the amount you
          paid us in the 12 months preceding the claim, or SGD 100, whichever is greater.
        </p>
      </Section>

      <Section title="10. Service Availability">
        <p>
          We strive to maintain 99.9% uptime but do not guarantee uninterrupted service. The Service
          may be temporarily unavailable due to maintenance, updates, or circumstances beyond our
          control (including WhatsApp or third-party API outages). We will make reasonable efforts to
          notify users of planned downtime.
        </p>
      </Section>

      <Section title="11. Account Termination">
        <ul className="ml-6 list-disc space-y-1">
          <li>You may terminate your account at any time by sending &quot;DELETE MY DATA&quot; via WhatsApp.</li>
          <li>We may suspend or terminate your account for violation of these Terms.</li>
          <li>Upon termination, your data will be deleted in accordance with our Privacy Policy.</li>
          <li>Sections 7, 8, 9, and 13 survive termination.</li>
        </ul>
      </Section>

      <Section title="12. Changes to Terms">
        <p>
          We may modify these Terms at any time. Material changes will be communicated via WhatsApp
          at least 14 days before they take effect. Continued use of the Service after changes
          constitutes acceptance of the updated Terms.
        </p>
      </Section>

      <Section title="13. Governing Law &amp; Disputes">
        <p>
          These Terms are governed by the laws of the Republic of Singapore. Any disputes arising
          from or relating to these Terms or the Service shall be resolved through binding
          arbitration administered by the Singapore International Arbitration Centre (SIAC), unless
          you opt for the Small Claims Tribunal for claims under SGD 20,000.
        </p>
      </Section>

      <Section title="14. Contact Us">
        <p>For questions about these Terms, contact us at:</p>
        <ul className="ml-6 list-disc space-y-1">
          <li>Email: <a href="mailto:support@vitaai.com" className="underline">support@vitaai.com</a></li>
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
