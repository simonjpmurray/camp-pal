import Link from 'next/link'
import { Tent, Users, CloudSun, MessageCircle, MapPin, Shield } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Tent className="w-7 h-7" style={{ color: 'var(--forest)' }} />
          <span className="font-display text-xl font-semibold" style={{ color: 'var(--forest)' }}>CampFire</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-stone-600 hover:text-stone-900 transition-colors px-3 py-2">
            Sign in
          </Link>
          <Link href="/login?signup=true" className="text-sm text-white px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
            style={{ background: 'var(--forest)' }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-24 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full mb-8"
          style={{ background: '#e8d5b0', color: '#6b4c2a' }}>
          <span>🌲</span> Plan smarter, camp better
        </div>
        <h1 className="font-display text-5xl sm:text-6xl font-bold leading-tight mb-6" style={{ color: 'var(--foreground)' }}>
          Your group camping trip,
          <br />
          <span style={{ color: 'var(--forest)' }}>perfectly coordinated.</span>
        </h1>
        <p className="text-lg text-stone-600 max-w-2xl mx-auto mb-10">
          CampFire helps friend groups plan camping trips together — shared packing lists with weather-smart gear suggestions, real-time chat, and no more &ldquo;who&rsquo;s bringing the stove?&rdquo; chaos.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/login?signup=true"
            className="text-white px-8 py-3.5 rounded-full text-base font-medium hover:opacity-90 transition-opacity"
            style={{ background: 'var(--forest)' }}>
            Start planning — it&rsquo;s free
          </Link>
          <Link href="/login"
            className="border border-stone-300 text-stone-700 px-8 py-3.5 rounded-full text-base font-medium hover:bg-stone-100 transition-colors">
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: <CloudSun className="w-6 h-6" />,
              title: 'Weather-Smart Packing',
              desc: 'Fetches your trip forecast and flags must-bring items. Rain jacket gets a red badge if rain is expected — no guesswork.',
              bg: '#e8f5e2', fg: '#2d5a27',
            },
            {
              icon: <Users className="w-6 h-6" />,
              title: "Who's Bringing What",
              desc: "Claim packing items with one tap. See exactly who's bringing what and how many — no duplication, no gaps.",
              bg: '#faf0e6', fg: '#c8a96e',
            },
            {
              icon: <MessageCircle className="w-6 h-6" />,
              title: 'Real-Time Group Chat',
              desc: 'Built-in chat for every trip. No WhatsApp thread chaos — keep all trip talk in one place, with pinned messages.',
              bg: '#eef2ff', fg: '#4f46e5',
            },
            {
              icon: <MapPin className="w-6 h-6" />,
              title: 'Trip Planning Hub',
              desc: 'Set your campsite location, dates, and notes. Share an invite link and your crew joins in seconds.',
              bg: '#fff0f0', fg: '#dc2626',
            },
            {
              icon: <Shield className="w-6 h-6" />,
              title: 'Invite by Link',
              desc: 'Generate a shareable link. Your friends join with one tap — no accounts required to view the trip basics.',
              bg: '#f0f9ff', fg: '#0891b2',
            },
            {
              icon: <Tent className="w-6 h-6" />,
              title: 'Works Everywhere',
              desc: 'Responsive PWA — install on Android, iOS or Chromebook. Works in any browser, no app store needed.',
              bg: '#f5f0ff', fg: '#7c3aed',
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl p-6 border border-stone-100 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: f.bg, color: f.fg }}>
                {f.icon}
              </div>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>{f.title}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-8 px-6 text-center text-sm text-stone-500">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Tent className="w-4 h-4" style={{ color: 'var(--forest)' }} />
          <span className="font-display font-semibold" style={{ color: 'var(--forest)' }}>CampFire</span>
        </div>
        <p>Plan your adventure. Leave no item behind.</p>
      </footer>
    </div>
  )
}
