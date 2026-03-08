'use client';

import { useState, useRef, useEffect } from 'react';

// ── Chat Demo Data ──────────────────────────────────────
type Msg = { from: 'user' | 'bot'; text: string; img?: string; delay: number };

const DEMO_SCENARIOS: Record<string, Msg[]> = {
  photo: [
    { from: 'user', text: '📸 [Sent a photo of Chicken Rice]', delay: 0 },
    {
      from: 'bot',
      text: '🟢 Chicken Rice 520kcal · P32g · C58g · 82/100\n🔥3 days 💪 P: 78/150g · C: 142/250g · 💰980kcal left',
      delay: 1200,
    },
  ],
  text: [
    { from: 'user', text: 'I just had a bowl of laksa', delay: 0 },
    {
      from: 'bot',
      text: '🟡 Laksa 650kcal · P18g · C72g · 64/100\n⚠️ High sodium · 💪 P: 96/150g · C: 214/250g · 💰330kcal left',
      delay: 1200,
    },
  ],
  advice: [
    { from: 'user', text: 'What should I eat for dinner?', delay: 0 },
    {
      from: 'bot',
      text: "You still need 54g protein & 36g carbs, 330kcal budget\n\n🥩 Grilled Chicken Breast — P38g · C5g · 280kcal\n🐟 Steamed Fish & Rice — P35g · C48g · 380kcal\n🥚 Eggs + Tofu — P22g · C5g · 180kcal\n\n💡 Focus on protein, you're almost at your carb target!",
      delay: 1500,
    },
  ],
  supplement: [
    { from: 'user', text: '2 scoops whey protein', delay: 0 },
    {
      from: 'bot',
      text: '🟢 Whey Protein ×2 — 240kcal · P48g · C6g · 95/100\n💪 P: 126/150g · C: 148/250g · Nice! Almost hit your protein goal 💪',
      delay: 1000,
    },
  ],
  summary: [
    { from: 'user', text: '/summary', delay: 0 },
    {
      from: 'bot',
      text: '📊 Today\'s Summary\n━━━━━━━━━━━━━━━\n🔥 1,820 / 2,000 kcal (91%)\n💪 P: 142/150g ✅ · C: 228/250g ✅\n🟢×3 🟡×1 · Avg 78/100\n\n✅ Great protein intake today!\n💡 Try adding more veggies tomorrow for better fiber.',
      delay: 1400,
    },
  ],
};

// ── Components ──────────────────────────────────────────

function ChatBubble({ msg, visible }: { msg: Msg; visible: boolean }) {
  const isUser = msg.from === 'user';
  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} transition-all duration-500 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
          isUser
            ? 'rounded-br-md bg-[#DCF8C6] text-gray-900'
            : 'rounded-bl-md bg-white text-gray-900 shadow-sm'
        }`}
      >
        {msg.text}
      </div>
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[360px]">
      <div className="overflow-hidden rounded-[2.5rem] border-[3px] border-gray-800 bg-gray-800 shadow-2xl">
        {/* Status bar */}
        <div className="flex items-center justify-between bg-[#075E54] px-5 py-2 text-xs text-white/80">
          <span>9:41</span>
          <span className="text-sm font-semibold text-white">Vita AI 🥗</span>
          <span>📶</span>
        </div>
        {/* Chat area */}
        <div className="h-[420px] overflow-y-auto bg-[#ECE5DD] p-3">{children}</div>
      </div>
    </div>
  );
}

function DemoChat() {
  const [scenario, setScenario] = useState<string>('photo');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);

  const scenarios = [
    { key: 'photo', label: '📸 Photo', labelZh: '拍照识别' },
    { key: 'text', label: '✏️ Text', labelZh: '文字记录' },
    { key: 'advice', label: '🍽️ Advice', labelZh: '餐前建议' },
    { key: 'supplement', label: '💊 Supplement', labelZh: '补剂记录' },
    { key: 'summary', label: '📊 Summary', labelZh: '每日总结' },
  ];

  useEffect(() => {
    const msgs = DEMO_SCENARIOS[scenario] || [];
    setMessages(msgs);
    setVisibleCount(0);

    let count = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const msg of msgs) {
      const idx = count;
      timers.push(
        setTimeout(() => {
          setVisibleCount(idx + 1);
        }, msg.delay + idx * 400),
      );
      count++;
    }
    return () => timers.forEach(clearTimeout);
  }, [scenario]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [visibleCount]);

  return (
    <div>
      {/* Scenario tabs */}
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {scenarios.map((s) => (
          <button
            key={s.key}
            onClick={() => setScenario(s.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
              scenario === s.key
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-green-50 hover:text-green-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <PhoneFrame>
        <div ref={chatRef} className="flex flex-col gap-3">
          {/* Welcome message always visible */}
          <div className="mx-auto my-2 rounded-lg bg-white/80 px-3 py-1 text-center text-xs text-gray-500">
            👋 Send a food photo to get started!
          </div>
          {messages.map((msg, i) => (
            <ChatBubble key={`${scenario}-${i}`} msg={msg} visible={i < visibleCount} />
          ))}
          {visibleCount < messages.length && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="animate-bounce text-gray-400">●</span>
                  <span className="animate-bounce text-gray-400" style={{ animationDelay: '0.15s' }}>●</span>
                  <span className="animate-bounce text-gray-400" style={{ animationDelay: '0.3s' }}>●</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </PhoneFrame>

      <p className="mt-4 text-center text-sm text-gray-400">
        👆 Click the tabs above to try different features
      </p>
    </div>
  );
}

function FeatureCard({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 text-3xl">{emoji}</div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  features,
  cta,
  popular,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  popular?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-6 ${
        popular ? 'border-green-500 bg-green-50 shadow-lg' : 'border-gray-200 bg-white'
      }`}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white">
          Most Popular
        </span>
      )}
      <h3 className="text-lg font-bold text-gray-900">{name}</h3>
      <div className="mt-3 mb-4">
        <span className="text-3xl font-bold text-gray-900">{price}</span>
        <span className="text-sm text-gray-500"> {period}</span>
      </div>
      <ul className="mb-6 space-y-2">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="mt-0.5 text-green-500">✓</span>
            {f}
          </li>
        ))}
      </ul>
      <a
        href="https://wa.me/6591561413?text=Hi%20Vita!"
        target="_blank"
        rel="noopener noreferrer"
        className={`block w-full rounded-full py-2.5 text-center text-sm font-semibold transition-colors ${
          popular
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {cta}
      </a>
    </div>
  );
}

// ── How It Works Step ───────────────────────────────────
function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-lg font-bold text-white">
        {num}
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{desc}</p>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-gray-900">
            🥗 Vita AI
          </span>
          <div className="hidden items-center gap-6 text-sm text-gray-600 md:flex">
            <a href="#features" className="hover:text-green-600">Features</a>
            <a href="#demo" className="hover:text-green-600">Try It</a>
            <a href="#pricing" className="hover:text-green-600">Pricing</a>
            <a href="#faq" className="hover:text-green-600">FAQ</a>
          </div>
          <a
            href="https://wa.me/6591561413?text=Hi%20Vita!"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
          >
            Start Free →
          </a>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="px-6 pt-20 pb-16 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-block rounded-full bg-green-100 px-4 py-1.5 text-sm font-medium text-green-700">
            🇸🇬 Made for Singapore fitness enthusiasts
          </div>
          <h1 className="mb-6 text-4xl font-bold leading-tight text-gray-900 md:text-5xl">
            Track your macros with a{' '}
            <span className="text-green-600">WhatsApp photo</span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-gray-500">
            Snap your food, get instant protein &amp; carb tracking. No app to download.
            No manual logging. Just WhatsApp.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="https://wa.me/6591561413?text=Hi%20Vita!"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-[#25D366] px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-[#1fb855] hover:shadow-xl"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Chat with Vita AI
            </a>
            <a href="#demo" className="text-sm font-medium text-gray-500 hover:text-green-600">
              or try the demo below ↓
            </a>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">
            How it works — 3 seconds
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <Step num={1} title="Snap your food" desc="Take a photo of your meal in WhatsApp — hawker food, home-cooked, anything." />
            <Step num={2} title="AI analyzes it" desc="Vita AI identifies the food and calculates calories, protein, carbs instantly." />
            <Step num={3} title="Track your macros" desc="See your daily progress, get meal advice, and receive weekly reports." />
          </div>
        </div>
      </section>

      {/* ─── Interactive Demo ─── */}
      <section id="demo" className="px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-3 text-center text-2xl font-bold text-gray-900">
            Try it yourself
          </h2>
          <p className="mb-10 text-center text-gray-500">
            Click the tabs to see how Vita AI responds to different inputs
          </p>
          <DemoChat />
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="bg-white px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-center text-2xl font-bold text-gray-900">
            Built for people who lift
          </h2>
          <p className="mb-10 text-center text-gray-500">
            Everything you need to hit your macros, nothing you don&apos;t
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              emoji="📸"
              title="Photo Recognition"
              desc="Snap any food — chicken rice, laksa, protein shake — and get instant macro breakdown. Recognizes 500+ SG hawker dishes."
            />
            <FeatureCard
              emoji="💪"
              title="Protein & Carb Tracking"
              desc="See your P/C progress after every meal. Know exactly how much protein you still need today."
            />
            <FeatureCard
              emoji="🍽️"
              title="Meal Advice"
              desc="Ask 'what should I eat?' and get suggestions based on your remaining macro budget. No more guessing."
            />
            <FeatureCard
              emoji="📊"
              title="Weekly Reports"
              desc="Every Monday, get a visual trend chart of your week — calories, protein, carbs, health score."
            />
            <FeatureCard
              emoji="🔥"
              title="Streak & Motivation"
              desc="Track your daily logging streak. Hit milestones at 7, 30, and 100 days. Stay consistent."
            />
            <FeatureCard
              emoji="💊"
              title="Supplement Logging"
              desc="Type '2 scoops whey' or '肌酸5g' — instant logging with accurate macro data for 50+ supplements."
            />
            <FeatureCard
              emoji="🎤"
              title="Voice Input"
              desc="Too lazy to type? Just send a voice message: 'I had eggs and toast for breakfast'. Done."
            />
            <FeatureCard
              emoji="🇸🇬"
              title="Singapore Localized"
              desc="Knows your cai png, mee pok, nasi lemak. Supports English, 中文, and Singlish."
            />
            <FeatureCard
              emoji="⚡"
              title="Zero Friction"
              desc="No app download. No account creation. No manual food search. Just open WhatsApp and send."
            />
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-3 text-center text-2xl font-bold text-gray-900">
            Simple pricing
          </h2>
          <p className="mb-10 text-center text-gray-500">
            Start free, upgrade when you&apos;re ready
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            <PricingCard
              name="Free"
              price="$0"
              period=""
              features={[
                '5 food recognitions / day',
                'Basic macro tracking',
                'Text & photo input',
                'English & 中文',
              ]}
              cta="Start Free"
            />
            <PricingCard
              name="Premium"
              price="$9.90"
              period="SGD / month"
              popular
              features={[
                'Unlimited food recognitions',
                'Daily summaries & meal advice',
                'Weekly trend reports',
                'Voice input',
                'Full history & analytics',
                'Priority AI processing',
              ]}
              cta="Get Premium"
            />
            <PricingCard
              name="Pro"
              price="$19.90"
              period="SGD / month"
              features={[
                'Everything in Premium',
                'Custom macro targets',
                'Advanced insights & reports',
                'Priority support',
                'Data export (CSV)',
                'Early access to new features',
              ]}
              cta="Go Pro"
            />
          </div>
          <p className="mt-6 text-center text-xs text-gray-400">
            All prices in SGD. Cancel anytime. 7-day refund policy.
          </p>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="bg-white px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: 'Do I need to download an app?',
                a: 'Nope! Vita AI works entirely through WhatsApp. Just message us and start tracking.',
              },
              {
                q: 'How accurate is the food recognition?',
                a: 'We use GPT-4o Vision which is highly accurate for common foods, especially Singapore hawker dishes. For packaged foods, you can also type the name or scan the label.',
              },
              {
                q: 'Can I use it in Chinese?',
                a: 'Yes! Vita AI supports English and 中文. It auto-detects your language from your messages.',
              },
              {
                q: 'How do I set my protein target?',
                a: 'Send your basic info (age, height, weight) and Vita AI calculates your targets automatically. Or set custom targets like "protein target 150g".',
              },
              {
                q: 'Is my data safe?',
                a: 'Yes. All data is encrypted, stored in Singapore (AWS ap-southeast-1), and we never sell your data. Food photos are deleted within 24 hours.',
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Absolutely. Cancel your subscription anytime and it stays active until the end of your billing period. Full refund within 7 days if you\'ve used fewer than 10 recognitions.',
              },
            ].map((item, i) => (
              <details key={i} className="group rounded-xl border border-gray-200 bg-gray-50 px-6 py-4">
                <summary className="flex cursor-pointer items-center justify-between font-medium text-gray-900">
                  {item.q}
                  <span className="ml-2 text-gray-400 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">
            Ready to hit your macros?
          </h2>
          <p className="mb-8 text-gray-500">
            Join Vita AI now. No download, no signup, just WhatsApp.
          </p>
          <a
            href="https://wa.me/6591561413?text=Hi%20Vita!"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-10 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-[#1fb855] hover:shadow-xl"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Start Chatting with Vita AI
          </a>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-gray-200 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-gray-400 md:flex-row">
          <span>© 2025 Vita AI. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-gray-600">Privacy Policy</a>
            <a href="/terms" className="hover:text-gray-600">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

