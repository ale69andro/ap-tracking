import Link from "next/link";
import type { ReactNode } from "react";
import AppMockupAnimated from "@/app/components/AppMockupAnimated";

// ─── Icons ─────────────────────────────────────────────────────────────────

function IconZap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconTrendingUp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IconBarChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconCpu() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// ─── Navbar ────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-zinc-950/90 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
        <span className="text-[15px] font-black text-white tracking-tight">
          APEX<span className="text-red-500">TRAIN</span>
        </span>
        <div className="flex items-center gap-1">
          <Link
            href="/auth/login"
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            Log In
          </Link>
          <Link
            href="/auth/signup"
            className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-400 active:bg-red-600 rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-14 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-red-500/3 rounded-full blur-[80px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 py-20 lg:py-28 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-12 items-center">

          {/* Copy */}
          <div className="max-w-xl">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-red-500 mb-6">
              APEXTRAIN
            </p>

            <h1 className="text-[clamp(2.6rem,5vw,3.75rem)] font-black text-white tracking-tight leading-[1.05] mb-6">
              The gym tracker<br />
              that thinks like<br />
              <span className="text-red-500">a coach.</span>
            </h1>

            <p className="text-[17px] text-zinc-400 leading-relaxed mb-10 max-w-md">
              Log a set in under 2 seconds. Get exact progression targets per exercise. Know what to do next — every session.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-red-500 hover:bg-red-400 active:bg-red-600 text-white font-bold text-[15px] transition-colors"
              >
                Start for free
                <IconArrowRight />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-zinc-700/80 hover:border-zinc-500 text-zinc-400 hover:text-white font-semibold text-[15px] transition-colors"
              >
                Log In
              </Link>
            </div>
          </div>

          {/* Mockup */}
          <AppMockupAnimated />
        </div>
      </div>
    </section>
  );
}

// ─── Stats Strip ───────────────────────────────────────────────────────────

function StatsStrip() {
  const stats = [
    { value: "< 2s", label: "to log a set" },
    { value: "Per-rep", label: "progression targets" },
    { value: "Zero", label: "distractions" },
  ];

  return (
    <div className="border-t border-b border-white/5 bg-white/[0.02]">
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid grid-cols-3 divide-x divide-white/5">
          {stats.map(({ value, label }) => (
            <div key={label} className="py-8 px-6 sm:px-10 text-center">
              <p className="text-2xl sm:text-3xl font-black text-white mb-1 tracking-tight">{value}</p>
              <p className="text-xs sm:text-sm text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Features ──────────────────────────────────────────────────────────────

type FeatureItem = {
  icon: ReactNode;
  title: string;
  description: string;
  badge?: string;
};

function FeatureCardLarge({ icon, title, description }: FeatureItem) {
  return (
    <div className="flex flex-col justify-between p-7 rounded-2xl border border-zinc-800 bg-zinc-900/60 h-full min-h-[200px]">
      <div className="text-red-400 mb-8">{icon}</div>
      <div>
        <h3 className="text-xl font-bold text-white mb-2 leading-snug">{title}</h3>
        <p className="text-[15px] text-zinc-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function FeatureCardSmall({ icon, title, description, badge }: FeatureItem) {
  return (
    <div className="relative flex flex-col gap-5 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors">
      {badge && (
        <span className="absolute top-4 right-4 text-[9px] font-bold tracking-[0.15em] uppercase text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className="text-zinc-500">{icon}</div>
      <div>
        <h4 className="text-[15px] font-semibold text-white mb-1.5">{title}</h4>
        <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function FeaturesSection() {
  const featured: FeatureItem[] = [
    {
      icon: <IconZap />,
      title: "Sub 2-second set logging",
      description: "Auto-filled from your last session. Tap to complete. Rest timer starts itself. Zero friction between rep and record.",
    },
    {
      icon: <IconTrendingUp />,
      title: "Per-exercise progression targets",
      description: "Automatic weight and rep targets for every exercise, every session. No more guessing what to lift next.",
    },
  ];

  const secondary: FeatureItem[] = [
    {
      icon: <IconTarget />,
      title: "Smart coaching hints",
      description: "Context-aware notes before each set — based on your actual history, not generic advice.",
    },
    {
      icon: <IconBarChart />,
      title: "Volume analytics",
      description: "Weekly load by muscle group. Spot overtraining and gaps before they become problems.",
    },
    {
      icon: <IconCalendar />,
      title: "Training plan engine",
      description: "Build structured programs. Rotate templates. Track week-by-week execution without a spreadsheet.",
    },
    {
      icon: <IconCpu />,
      title: "AI coaching layer",
      description: "Adaptive programming based entirely on your training history. Coming soon.",
      badge: "Soon",
    },
  ];

  return (
    <section className="py-28 px-5">
      <div className="max-w-6xl mx-auto">
        {/* Header — left-aligned, no red label */}
        <div className="max-w-xl mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4 leading-tight">
            Everything a serious athlete needs. Nothing they don&apos;t.
          </h2>
          <p className="text-[15px] text-zinc-500 leading-relaxed">
            No social feed. No streaks. No badges. Just the tools that actually improve your training.
          </p>
        </div>

        {/* Featured 2-up */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {featured.map((f) => (
            <FeatureCardLarge key={f.title} {...f} />
          ))}
        </div>

        {/* Secondary 4-up */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {secondary.map((f) => (
            <FeatureCardSmall key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Differentiation ───────────────────────────────────────────────────────

function DifferentiationSection() {
  const points = [
    {
      title: "Speed, not friction",
      body: "Most apps make you search, scroll, and confirm. APEXTRAIN is built for one-hand use in a gym. Every interaction is measured in taps, not steps.",
    },
    {
      title: "Progression intelligence",
      body: "A history log tells you what happened. APEXTRAIN tells you what to do next — with specific weight and rep targets derived from your own data.",
    },
    {
      title: "Coach perspective",
      body: "Vanity stats show you PR highs. A coach identifies patterns, spots stagnation, and adjusts volume before you hit a plateau. That's the difference.",
    },
    {
      title: "No noise",
      body: "No social features. No leaderboards. No gamification. Just your training data, presented clearly, used intelligently.",
    },
  ];

  return (
    <section className="py-28 px-5 bg-white/[0.015]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">

          {/* Left — editorial statement */}
          <div className="lg:sticky lg:top-24">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-red-500 mb-5">Why APEXTRAIN</p>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.05] mb-6">
              Most apps log.<br />
              We coach.
            </h2>
            <p className="text-[16px] text-zinc-400 leading-relaxed">
              Generic workout trackers are digital notebooks. You put data in, and that&apos;s where it stays. APEXTRAIN takes that data and turns it into direction — so you spend less time managing your training and more time improving it.
            </p>
          </div>

          {/* Right — points */}
          <div className="space-y-8">
            {points.map(({ title, body }, i) => (
              <div key={title} className="flex gap-5">
                <div className="flex-shrink-0 mt-1">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full border border-zinc-700 text-[11px] font-bold text-zinc-500">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-white mb-1.5">{title}</h3>
                  <p className="text-[15px] text-zinc-500 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}

// ─── CTA ───────────────────────────────────────────────────────────────────

function CtaSection() {
  return (
    <section className="py-32 px-5 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 bottom-0 h-[400px] bg-gradient-to-t from-red-500/5 to-transparent" />
      </div>
      <div className="relative max-w-3xl mx-auto text-center">
        <h2 className="text-[clamp(2.2rem,5vw,3.5rem)] font-black text-white tracking-tight leading-[1.05] mb-5">
          Train with precision.<br />
          <span className="text-zinc-500">Start today.</span>
        </h2>
        <p className="text-[16px] text-zinc-500 mb-10 max-w-lg mx-auto leading-relaxed">
          Every serious athlete deserves a tool built for serious training.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/auth/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-red-500 hover:bg-red-400 active:bg-red-600 text-white font-bold text-[15px] transition-colors"
          >
            Start for free
            <IconArrowRight />
          </Link>
          <Link
            href="/auth/login"
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-xl border border-zinc-700/80 hover:border-zinc-500 text-zinc-400 hover:text-white font-semibold text-[15px] transition-colors"
          >
            Already have an account
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/5 py-8 px-5">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-[13px] font-black text-white tracking-tight">
          APEX<span className="text-red-500">TRAIN</span>
        </span>
        <p className="text-xs text-zinc-700">
          &copy; 2026 APEXTRAIN. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <Link href="/auth/login" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            Log In
          </Link>
          <Link href="/auth/signup" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            Sign Up
          </Link>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main>
        <HeroSection />
        <StatsStrip />
        <FeaturesSection />
        <DifferentiationSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
