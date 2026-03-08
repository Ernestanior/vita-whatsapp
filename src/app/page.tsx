'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ── Types ───────────────────────────────────────────────
type Msg = {
  id: string;
  from: 'user' | 'bot';
  text: string;
  buttons?: { label: string; action: string }[];
};

// ── Interactive Chat Simulator ──────────────────────────
const BOT_RESPONSES: Record<string, { text: string; buttons?: { label: string; action: string }[] }> = {
  // Photo triggers
  'photo:chicken-rice': {
    text: '🟢 Chicken Rice 520kcal · P32g · C58g · 82/100\n🔥3 days 💪 P: 78/150g · C: 142/250g · 💰980kcal left',
    buttons: [
      { label: '📊 Details', action: 'detail:chicken-rice' },
      { label: '✏️ Modify', action: 'modify' },
      { label: '❌ Ignore', action: 'ignore' },
    ],
  },
  'photo:laksa': {
    text: '🟡 Laksa 650kcal · P18g · C72g · 64/100\n⚠️ High sodium · 💪 P: 96/150g · C: 214/250g · 💰330kcal left',
    buttons: [
      { label: '📊 Details', action: 'detail:laksa' },
      { label: '✏️ Modify', action: 'modify' },
      { label: '❌ Ignore', action: 'ignore' },
    ],
  },
  'photo:nasi-lemak': {
    text: '🟡 Nasi Lemak 620kcal · P22g · C68g · 68/100\n⚠️ High fat (coconut milk) · 💪 P: 100/150g · C: 210/250g',
    buttons: [
      { label: '📊 Details', action: 'detail:nasi-lemak' },
      { label: '✏️ Modify', action: 'modify' },
      { label: '❌ Ignore', action: 'ignore' },
    ],
  },
  // Detail views
  'detail:chicken-rice': {
    text: '📊 Chicken Rice — Full Breakdown\n━━━━━━━━━━━━━━━━━━━━\n🔥 Calories: 520 kcal\n🥩 Protein: 32g (25%)\n🍚 Carbs: 58g (45%)\n🧈 Fat: 18g (30%)\n🧂 Sodium: 680mg\n📊 Health Score: 82/100 🟢\n\n✅ Good protein content\n💡 Ask for less rice next time to cut carbs',
  },
  'detail:laksa': {
    text: '📊 Laksa — Full Breakdown\n━━━━━━━━━━━━━━━━━━━━\n🔥 Calories: 650 kcal\n🥩 Protein: 18g (11%)\n🍚 Carbs: 72g (44%)\n🧈 Fat: 32g (45%)\n🧂 Sodium: 1,420mg ⚠️\n📊 Health Score: 64/100 🟡\n\n⚠️ Very high sodium\n💡 Try fish soup noodles for a lighter option',
  },
  'detail:nasi-lemak': {
    text: '📊 Nasi Lemak — Full Breakdown\n━━━━━━━━━━━━━━━━━━━━\n🔥 Calories: 620 kcal\n🥩 Protein: 22g (14%)\n🍚 Carbs: 68g (44%)\n🧈 Fat: 28g (42%)\n🧂 Sodium: 890mg\n📊 Health Score: 68/100 🟡\n\n💡 Add an extra egg for more protein',
  },
  // Text food inputs
  'text:whey': {
    text: '🟢 Whey Protein ×2 — 240kcal · P48g · C6g · 95/100\n💪 P: 126/150g · C: 148/250g · Almost at your protein goal! 💪',
  },
  'text:eggs': {
    text: '🟢 Scrambled Eggs ×3 — 210kcal · P18g · C2g · 88/100\n💪 P: 96/150g · C: 144/250g · 💰790kcal left',
  },
  // Commands
  advice: {
    text: "You still need 54g protein & 36g carbs, 330kcal budget\n\n🥩 Grilled Chicken — P38g · C5g · 280kcal\n🐟 Steamed Fish & Rice — P35g · C48g · 380kcal\n🥚 Eggs + Tofu — P22g · C5g · 180kcal\n\n💡 Focus on protein, you're almost at your carb target!",
  },
  summary: {
    text: "📊 Today's Summary\n━━━━━━━━━━━━━━━━━━━━\n🔥 1,820 / 2,000 kcal (91%)\n💪 P: 142/150g ✅ · C: 228/250g ✅\n🟢×3 🟡×1 · Avg 78/100\n\n✅ Great protein intake today!\n💡 Try adding more veggies tomorrow",
  },
  weekly: {
    text: '📊 Weekly Macro Report\n━━━━━━━━━━━━━━━━━━━━\n📅 7 days · 19 meals · 🔥5 streak\n\nMon ████████ 2,100kcal P142g\nTue ███████░ 1,850kcal P128g\nWed ████████ 2,050kcal P138g\nThu ██████░░ 1,620kcal P98g\nFri ████████ 2,200kcal P155g\nSat ███████░ 1,900kcal P132g\nSun ██████░░ 1,680kcal P112g\n\nAvg: 1,914kcal · P129g · C215g\n🟢14 🟡4 🔴1 · 74% healthy',
  },
  profile: {
    text: '⚡ Quick setup! Send 3 numbers:\n\n   age  height(cm)  weight(kg)\n   Example: 25 175 72\n\nOr type /setup for full guided setup.',
  },
  help: {
    text: '🥗 Vita AI Commands\n━━━━━━━━━━━━━━━━━━━━\n📸 Send food photo → instant tracking\n✏️ Type food name → text logging\n🎤 Voice message → voice logging\n\n/summary → today\'s summary\n/weekly → weekly report\n/advice → meal suggestions\n/profile → health profile\n/help → this menu',
  },
  modify: {
    text: '✏️ What would you like to change?\n\nSend the corrected info, e.g.:\n• "actually it was brown rice"\n• "portion was smaller, about 300kcal"\n• "add extra chicken"',
  },
  ignore: {
    text: '❌ Got it, that meal has been removed from today\'s log.',
  },
  fallback: {
    text: "🤔 I'm not sure what that is. Try:\n• Send a food photo 📸\n• Type a food name (e.g. \"chicken rice\")\n• Or type /help for commands",
  },
};

// Quick-reply options for the user
const FOOD_PHOTOS = [
  { label: '🍗 Chicken Rice', key: 'photo:chicken-rice' },
  { label: '🍜 Laksa', key: 'photo:laksa' },
  { label: '🍛 Nasi Lemak', key: 'photo:nasi-lemak' },
];

const TEXT_INPUTS = [
  { label: '2 scoops whey protein', key: 'text:whey' },
  { label: '3 scrambled eggs', key: 'text:eggs' },
];

const COMMANDS = [
  { label: '🍽️ What should I eat?', key: 'advice' },
  { label: '📊 Today\'s summary', key: 'summary' },
  { label: '📈 Weekly report', key: 'weekly' },
  { label: '👤 Set up profile', key: 'profile' },
  { label: '❓ Help', key: 'help' },
];

function InteractiveDemo() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 'welcome',
      from: 'bot',
      text: '👋 Welcome to Vita AI!\n\nI\'m your AI nutrition assistant. Send me a food photo or tell me what you ate — I\'ll track your macros instantly.\n\nTry it out below! 👇',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'photo' | 'text' | 'command'>('photo');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const msgCounter = useRef(1);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  const addBotResponse = useCallback(
    (key: string) => {
      setIsTyping(true);
      scrollToBottom();

      const response = BOT_RESPONSES[key] || BOT_RESPONSES.fallback;
      const delay = Math.min(800 + response.text.length * 5, 2000);

      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${msgCounter.current++}`,
            from: 'bot',
            text: response.text,
            buttons: response.buttons,
          },
        ]);
        scrollToBottom();
      }, delay);
    },
    [scrollToBottom],
  );

  const sendMessage = useCallback(
    (text: string, responseKey: string) => {
      setMessages((prev) => [
        ...prev,
        { id: `user-${msgCounter.current++}`, from: 'user', text },
      ]);
      scrollToBottom();
      addBotResponse(responseKey);
    },
    [addBotResponse, scrollToBottom],
  );

  const handleButtonClick = useCallback(
    (action: string) => {
      const labelMap: Record<string, string> = {
        'detail:chicken-rice': '📊 Details',
        'detail:laksa': '📊 Details',
        'detail:nasi-lemak': '📊 Details',
        modify: '✏️ Modify',
        ignore: '❌ Ignore',
      };
      sendMessage(labelMap[action] || action, action);
    },
    [sendMessage],
  );

  const handleCustomInput = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!inputText.trim() || isTyping) return;
      const text = inputText.trim().toLowerCase();
      setInputText('');

      let key = 'fallback';
      if (text.includes('chicken') || text.includes('鸡饭')) key = 'photo:chicken-rice';
      else if (text.includes('laksa') || text.includes('叻沙')) key = 'photo:laksa';
      else if (text.includes('nasi') || text.includes('椰浆')) key = 'photo:nasi-lemak';
      else if (text.includes('whey') || text.includes('蛋白粉')) key = 'text:whey';
      else if (text.includes('egg') || text.includes('蛋')) key = 'text:eggs';
      else if (text.includes('advice') || text.includes('what') || text.includes('吃什么'))
        key = 'advice';
      else if (text.includes('summary') || text.includes('总结') || text === '/summary')
        key = 'summary';
      else if (text.includes('weekly') || text.includes('周报') || text === '/weekly')
        key = 'weekly';
      else if (text.includes('help') || text === '/help') key = 'help';
      else if (text.includes('profile') || text === '/profile') key = 'profile';

      sendMessage(inputText.trim(), key);
    },
    [inputText, isTyping, sendMessage],
  );

  useEffect(() => scrollToBottom(), [messages, scrollToBottom]);

  return (
    <div className="mx-auto w-full max-w-[400px]">
      {/* Phone frame */}
      <div className="overflow-hidden rounded-[2.5rem] border-[3px] border-gray-900 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        {/* Status bar */}
        <div className="flex items-center justify-between bg-[#075E54] px-5 py-2 text-[11px] text-white/70">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <span className="text-xs">📶</span>
            <span className="text-xs">🔋</span>
          </div>
        </div>
        {/* WhatsApp header */}
        <div className="flex items-center gap-3 bg-[#075E54] px-4 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-200 text-lg">
            🥗
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Vita AI</div>
            <div className="text-[11px] text-green-200">
              {isTyping ? 'typing...' : 'online'}
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="h-[380px] overflow-y-auto bg-[#ECE5DD] p-3" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M0 20h40M20 0v40\' stroke=\'%23d5cec6\' stroke-width=\'.3\' fill=\'none\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect fill=\'url(%23p)\' width=\'200\' height=\'200\'/%3E%3C/svg%3E")' }}>
          <div className="flex flex-col gap-2">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-[1.45] whitespace-pre-line shadow-sm ${
                      msg.from === 'user'
                        ? 'rounded-tr-none bg-[#DCF8C6] text-gray-900'
                        : 'rounded-tl-none bg-white text-gray-900'
                    }`}
                  >
                    {msg.text}
                    <div className={`mt-1 text-right text-[10px] text-gray-400`}>
                      {msg.from === 'user' ? '9:41 ✓✓' : '9:41'}
                    </div>
                  </div>
                </div>
                {/* Interactive buttons */}
                {msg.buttons && (
                  <div className="mt-1 flex flex-wrap gap-1 pl-1">
                    {msg.buttons.map((btn) => (
                      <button
                        key={btn.action}
                        onClick={() => handleButtonClick(btn.action)}
                        disabled={isTyping}
                        className="rounded-full border border-green-600/30 bg-white px-3 py-1 text-xs font-medium text-green-700 shadow-sm transition-all hover:bg-green-50 active:scale-95 disabled:opacity-50"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-lg rounded-tl-none bg-white px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                    <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0.15s' }} />
                    <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Quick reply area */}
        <div className="border-t border-gray-200 bg-[#F0F0F0]">
          {/* Tab selector */}
          <div className="flex border-b border-gray-200">
            {(['photo', 'text', 'command'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-green-600 text-green-700'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab === 'photo' ? '📸 Photo' : tab === 'text' ? '✏️ Text' : '⚡ Commands'}
              </button>
            ))}
          </div>

          {/* Quick replies */}
          <div className="flex flex-wrap gap-1.5 p-2.5">
            {activeTab === 'photo' &&
              FOOD_PHOTOS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => sendMessage(`📸 [Photo: ${item.label}]`, item.key)}
                  disabled={isTyping}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-green-50 hover:text-green-700 active:scale-95 disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
            {activeTab === 'text' &&
              TEXT_INPUTS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => sendMessage(item.label, item.key)}
                  disabled={isTyping}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-green-50 hover:text-green-700 active:scale-95 disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
            {activeTab === 'command' &&
              COMMANDS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => sendMessage(item.label, item.key)}
                  disabled={isTyping}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-green-50 hover:text-green-700 active:scale-95 disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
          </div>

          {/* Text input */}
          <form onSubmit={handleCustomInput} className="flex gap-2 border-t border-gray-200 p-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a food or command..."
              disabled={isTyping}
              className="flex-1 rounded-full bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isTyping || !inputText.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              ▶
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Animated Counter ────────────────────────────────────
function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1500;
          const steps = 40;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// ── Feature Card with hover effect ──────────────────────
function FeatureCard({
  emoji,
  title,
  desc,
  delay,
}: {
  emoji: string;
  title: string;
  desc: string;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-700 hover:-translate-y-1 hover:shadow-lg ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="mb-3 text-3xl transition-transform duration-300 group-hover:scale-110">
        {emoji}
      </div>
      <h3 className="mb-2 text-base font-semibold text-gray-900">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
    </div>
  );
}

// ── Pricing Card ────────────────────────────────────────
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
      className={`relative rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        popular
          ? 'border-green-400 bg-gradient-to-b from-green-50 to-white shadow-lg ring-1 ring-green-400/20'
          : 'border-gray-200 bg-white shadow-sm'
      }`}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-1 text-xs font-semibold text-white shadow-md">
          ⭐ Most Popular
        </span>
      )}
      <h3 className="text-lg font-bold text-gray-900">{name}</h3>
      <div className="mt-3 mb-5">
        <span className="text-4xl font-bold text-gray-900">{price}</span>
        {period && <span className="ml-1 text-sm text-gray-400">{period}</span>}
      </div>
      <ul className="mb-6 space-y-2.5">
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
        className={`block w-full rounded-full py-3 text-center text-sm font-semibold transition-all ${
          popular
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md hover:shadow-lg'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {cta}
      </a>
    </div>
  );
}

// ── WhatsApp Icon SVG ───────────────────────────────────
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// ── MAIN PAGE ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* ─── Sticky Nav ─── */}
      <nav
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? 'border-b border-gray-200/60 bg-white/90 shadow-sm backdrop-blur-lg'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="text-xl font-bold">🥗 Vita AI</span>
          <div className="hidden items-center gap-8 text-sm font-medium text-gray-500 md:flex">
            <a href="#demo" className="transition-colors hover:text-green-600">Demo</a>
            <a href="#features" className="transition-colors hover:text-green-600">Features</a>
            <a href="#pricing" className="transition-colors hover:text-green-600">Pricing</a>
            <a href="#faq" className="transition-colors hover:text-green-600">FAQ</a>
          </div>
          <a
            href="https://wa.me/6591561413?text=Hi%20Vita!"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
          >
            <WhatsAppIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Start Free</span>
            <span className="sm:hidden">Try</span>
          </a>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-6 pt-28 pb-20">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-green-50/80 via-white to-gray-50" />
        <div className="pointer-events-none absolute top-0 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-green-200/30 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-200 bg-white px-4 py-1.5 text-sm text-green-700 shadow-sm">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
            Made for Singapore fitness enthusiasts
          </div>

          <h1 className="mb-6 text-4xl font-extrabold leading-[1.15] tracking-tight md:text-6xl">
            Track your macros
            <br />
            <span className="bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
              with a WhatsApp photo
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-gray-500">
            Snap your food, get instant protein &amp; carb tracking.
            No app to download. No manual logging. Just WhatsApp.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="https://wa.me/6591561413?text=Hi%20Vita!"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-full bg-[#25D366] px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:shadow-green-200"
            >
              <WhatsAppIcon className="h-5 w-5 transition-transform group-hover:scale-110" />
              Chat with Vita AI — It&apos;s Free
            </a>
            <a
              href="#demo"
              className="flex items-center gap-1 text-sm font-medium text-gray-400 transition-colors hover:text-green-600"
            >
              or try the live demo below
              <span className="animate-bounce">↓</span>
            </a>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 md:text-3xl">
                <AnimatedNumber target={500} suffix="+" />
              </div>
              <div className="mt-1 text-xs text-gray-400">SG dishes recognized</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 md:text-3xl">
                &lt;<AnimatedNumber target={3} />s
              </div>
              <div className="mt-1 text-xs text-gray-400">per analysis</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 md:text-3xl">
                <AnimatedNumber target={0} />
              </div>
              <div className="mt-1 text-xs text-gray-400">apps to download</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-center text-sm font-semibold tracking-widest text-green-600 uppercase">
            How it works
          </h2>
          <p className="mb-14 text-center text-2xl font-bold md:text-3xl">
            Three seconds. That&apos;s it.
          </p>
          <div className="grid gap-10 md:grid-cols-3">
            {[
              {
                num: '01',
                emoji: '📸',
                title: 'Snap your food',
                desc: 'Take a photo of your meal in WhatsApp — hawker food, home-cooked, supplements, anything.',
              },
              {
                num: '02',
                emoji: '🤖',
                title: 'AI analyzes it',
                desc: 'Vita AI identifies the food and calculates calories, protein, carbs, fat — instantly.',
              },
              {
                num: '03',
                emoji: '📊',
                title: 'Track & improve',
                desc: 'See your daily progress, get meal advice, and receive weekly trend reports.',
              },
            ].map((step) => (
              <div key={step.num} className="group text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-3xl transition-all duration-300 group-hover:scale-110 group-hover:bg-green-100">
                  {step.emoji}
                </div>
                <div className="mb-2 text-xs font-bold tracking-widest text-green-500">
                  STEP {step.num}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Interactive Demo ─── */}
      <section id="demo" className="relative px-6 py-20">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gray-50 via-green-50/30 to-gray-50" />
        <div className="relative mx-auto max-w-4xl">
          <h2 className="mb-4 text-center text-sm font-semibold tracking-widest text-green-600 uppercase">
            Live Demo
          </h2>
          <p className="mb-4 text-center text-2xl font-bold md:text-3xl">
            Try it yourself — right here
          </p>
          <p className="mx-auto mb-12 max-w-md text-center text-sm text-gray-500">
            This is exactly how Vita AI works on WhatsApp. Click the food buttons,
            type a food name, or try a command. It&apos;s all interactive.
          </p>
          <InteractiveDemo />
          <p className="mt-8 text-center text-xs text-gray-400">
            👆 This is a simulation. The real Vita AI is even smarter — try it on WhatsApp!
          </p>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-sm font-semibold tracking-widest text-green-600 uppercase">
            Features
          </h2>
          <p className="mb-14 text-center text-2xl font-bold md:text-3xl">
            Built for people who lift
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard delay={0} emoji="📸" title="Photo Recognition" desc="Snap any food — chicken rice, laksa, protein shake — and get instant macro breakdown. Recognizes 500+ SG hawker dishes." />
            <FeatureCard delay={80} emoji="💪" title="Protein & Carb Tracking" desc="See your P/C progress after every meal. Know exactly how much protein you still need today." />
            <FeatureCard delay={160} emoji="🍽️" title="Meal Advice" desc="Ask 'what should I eat?' and get suggestions based on your remaining macro budget." />
            <FeatureCard delay={240} emoji="📊" title="Weekly Reports" desc="Every Monday, get a visual trend chart of your week — calories, protein, carbs, health score." />
            <FeatureCard delay={320} emoji="🔥" title="Streak & Motivation" desc="Track your daily logging streak. Hit milestones at 7, 30, and 100 days." />
            <FeatureCard delay={400} emoji="💊" title="Supplement Logging" desc="Type '2 scoops whey' or '肌酸5g' — instant logging with accurate macro data." />
            <FeatureCard delay={480} emoji="🎤" title="Voice Input" desc="Send a voice message: 'I had eggs and toast for breakfast'. Done." />
            <FeatureCard delay={560} emoji="🇸🇬" title="Singapore Localized" desc="Knows your cai png, mee pok, nasi lemak. Supports English, 中文, and Singlish." />
            <FeatureCard delay={640} emoji="⚡" title="Zero Friction" desc="No app download. No account creation. No manual food search. Just WhatsApp." />
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-center text-sm font-semibold tracking-widest text-green-600 uppercase">
            Pricing
          </h2>
          <p className="mb-14 text-center text-2xl font-bold md:text-3xl">
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
              cta="Start Free →"
            />
            <PricingCard
              name="Premium"
              price="$9.90"
              period="/ month"
              popular
              features={[
                'Unlimited food recognitions',
                'Daily summaries & meal advice',
                'Weekly trend reports',
                'Voice input',
                'Full history & analytics',
                'Priority AI processing',
              ]}
              cta="Get Premium →"
            />
            <PricingCard
              name="Pro"
              price="$19.90"
              period="/ month"
              features={[
                'Everything in Premium',
                'Custom macro targets',
                'Advanced insights & reports',
                'Priority support',
                'Data export (CSV)',
                'Early access to new features',
              ]}
              cta="Go Pro →"
            />
          </div>
          <p className="mt-8 text-center text-xs text-gray-400">
            All prices in SGD. Cancel anytime. 7-day refund policy.
          </p>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-center text-sm font-semibold tracking-widest text-green-600 uppercase">
            FAQ
          </h2>
          <p className="mb-12 text-center text-2xl font-bold md:text-3xl">
            Common questions
          </p>
          <div className="space-y-3">
            {[
              {
                q: 'Do I need to download an app?',
                a: 'Nope! Vita AI works entirely through WhatsApp. Just message us and start tracking. No signup, no download.',
              },
              {
                q: 'How accurate is the food recognition?',
                a: 'We use GPT-4o Vision which is highly accurate for common foods, especially Singapore hawker dishes. For packaged foods, you can also type the name or scan the label.',
              },
              {
                q: 'Can I use it in Chinese?',
                a: 'Yes! Vita AI supports English and 中文. It auto-detects your language from your messages. Singlish also works lah.',
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
                a: "Absolutely. Cancel your subscription anytime and it stays active until the end of your billing period. Full refund within 7 days if you've used fewer than 10 recognitions.",
              },
            ].map((item, i) => (
              <details
                key={i}
                className="group rounded-xl border border-gray-100 bg-gray-50/50 px-6 py-4 transition-all hover:bg-gray-50"
              >
                <summary className="flex cursor-pointer items-center justify-between text-[15px] font-medium text-gray-900">
                  {item.q}
                  <span className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400 transition-all group-open:rotate-45 group-open:bg-green-100 group-open:text-green-600">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="relative overflow-hidden px-6 py-24">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gray-50 to-green-50/50" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-green-200/20 blur-3xl" />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Ready to hit your macros?
          </h2>
          <p className="mb-10 text-lg text-gray-500">
            Join Vita AI now. No download, no signup, just WhatsApp.
          </p>
          <a
            href="https://wa.me/6591561413?text=Hi%20Vita!"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 rounded-full bg-[#25D366] px-10 py-4 text-lg font-semibold text-white shadow-xl transition-all hover:shadow-2xl hover:shadow-green-200"
          >
            <WhatsAppIcon className="h-6 w-6 transition-transform group-hover:scale-110" />
            Start Chatting with Vita AI
          </a>
          <p className="mt-6 text-xs text-gray-400">
            Free to start · No credit card required · Cancel anytime
          </p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-gray-200 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-gray-400 md:flex-row">
          <span>© 2025 Vita AI. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="/privacy" className="transition-colors hover:text-gray-600">
              Privacy Policy
            </a>
            <a href="/terms" className="transition-colors hover:text-gray-600">
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}