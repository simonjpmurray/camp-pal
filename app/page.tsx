import Link from 'next/link'

// CampFire logo: rounded canopy-bordered "C" box with a sunlight dot.
function Monogram() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span
        className="relative flex items-center justify-center w-9 h-9 rounded-lg border-[2.5px]"
        style={{ borderColor: 'var(--canopy)' }}
      >
        <span className="font-display font-black text-xl leading-none" style={{ color: 'var(--canopy)' }}>C</span>
        <span
          className="absolute -top-[5px] -right-[5px] w-[13px] h-[13px] rounded-full border-2"
          style={{ background: 'var(--sunlight)', borderColor: 'var(--parchment)' }}
        />
      </span>
      <span className="font-display font-extrabold text-[22px] tracking-tight" style={{ color: 'var(--canopy)' }}>
        CampFire
      </span>
    </Link>
  )
}

// Subtle leaf-vein / ring texture behind the hero copy.
function RingTexture() {
  return (
    <svg
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.07 }}
    >
      <g fill="none" stroke="var(--canopy)" strokeWidth="1">
        <circle cx="340" cy="100" r="50" />
        <circle cx="340" cy="100" r="100" />
        <circle cx="340" cy="100" r="150" />
        <circle cx="340" cy="100" r="200" />
        <circle cx="340" cy="100" r="250" />
        <circle cx="340" cy="100" r="300" />
      </g>
    </svg>
  )
}

// One animated dome tent: ground shadow, dome body, entrance, ridge line, highlight.
function Tent({
  transform,
  delayClass,
  fill,
  stroke,
  ridge,
}: {
  transform: string
  delayClass: string
  fill: string
  stroke: string
  ridge: string
}) {
  return (
    <g transform={transform}>
      <g className={`dtent ${delayClass}`}>
        <ellipse cx="0" cy="3" rx="16" ry="2.5" fill="#000000" opacity="0.22" />
        <path d="M -14,2 C -16,-10 -10,-22 0,-22 C 10,-22 16,-10 14,2 Z" fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <path d="M -5,2 C -6,-5 -3,-11 0,-12 C 3,-11 6,-5 5,2 Z" fill={stroke} />
        <path d="M -13,1 Q 0,-26 13,1" fill="none" stroke={ridge} strokeWidth="1" opacity="0.55" />
        <ellipse cx="-5" cy="-11" rx="1.8" ry="4" fill="#FFFFFF" opacity="0.32" />
      </g>
    </g>
  )
}

// 3D cartoon globe with colourful tents popping up on each continent.
function TentGlobe() {
  return (
    <svg
      viewBox="0 0 480 460"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Animated globe with colourful camping tents popping up on each continent"
      className="w-full max-w-[500px] h-auto"
    >
      <defs>
        <clipPath id="globeClip">
          <circle cx="240" cy="230" r="148" />
        </clipPath>
        {/* radial sphere shading — highlight upper-left, shadow lower-right */}
        <radialGradient id="sphereShine" cx="34%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.40" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#0a3a18" stopOpacity="0.32" />
        </radialGradient>
      </defs>

      {/* soft ground shadow beneath the globe */}
      <ellipse cx="240" cy="392" rx="118" ry="9" fill="#000000" opacity="0.13" />
      {/* atmospheric ring */}
      <circle cx="240" cy="230" r="156" fill="none" stroke="#a8e0c8" strokeWidth="3" opacity="0.55" />
      {/* ocean */}
      <circle cx="240" cy="230" r="148" fill="#3FAEDB" />

      {/* CONTINENTS (clipped to globe, chunky outlines for 3D cartoon feel) */}
      <g clipPath="url(#globeClip)" fill="#6ED656" stroke="#1f5410" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
        {/* North America */}
        <path d="M 112,165 C 108,178 108,195 116,208 C 124,220 138,228 148,238 C 156,246 165,255 175,262 C 182,266 188,268 192,260 C 192,254 186,250 182,246 C 178,242 176,238 178,234 C 184,232 192,234 198,232 C 204,230 208,224 206,218 C 212,216 218,210 220,202 C 224,190 224,176 218,164 C 210,154 195,148 178,148 C 162,146 146,150 132,154 C 122,158 116,162 112,165 Z" />
        {/* South America */}
        <path d="M 184,278 C 192,275 204,277 213,286 C 222,295 226,308 224,322 C 220,338 213,352 202,358 C 195,360 192,354 195,346 C 198,338 196,330 192,326 C 188,322 184,318 184,312 C 182,302 180,290 182,283 C 183,280 184,278 184,278 Z" />
        {/* Europe */}
        <path d="M 250,156 C 256,150 266,148 274,152 C 282,156 284,164 280,170 C 276,176 268,178 260,176 C 254,174 248,166 250,156 Z" />
        {/* UK island */}
        <path d="M 240,162 C 242,160 244,160 245,162 C 246,166 242,166 240,164 Z" />
        {/* Scandinavia bump */}
        <path d="M 268,140 C 272,138 276,140 277,144 C 278,148 274,150 272,148 C 270,146 268,144 268,140 Z" />
        {/* Africa */}
        <path d="M 256,188 C 248,196 246,210 250,222 C 254,232 260,242 266,250 C 270,260 274,272 278,284 C 282,294 286,300 292,298 C 298,294 304,284 308,272 C 310,258 310,244 305,230 C 300,216 292,204 282,196 C 274,190 264,186 258,187 C 257,187 256,188 256,188 Z" />
        {/* Asia + India peninsula */}
        <path d="M 280,154 C 290,148 305,144 322,146 C 342,148 358,154 370,164 C 378,174 378,186 374,192 C 368,198 362,200 358,206 C 356,212 358,218 362,224 C 364,232 360,238 354,238 C 348,236 340,232 336,228 C 332,226 330,232 328,238 C 326,248 324,256 320,260 C 316,262 312,258 312,252 C 310,242 306,232 302,222 C 296,210 290,196 286,182 C 282,170 280,162 280,154 Z" />
        {/* Japan islands */}
        <path d="M 380,178 C 382,176 384,178 382,180 C 380,182 378,180 380,178 Z M 382,188 C 384,186 386,188 384,190 C 382,191 381,189 382,188 Z" />
        {/* Australia */}
        <path d="M 340,295 C 350,290 364,290 372,296 C 376,302 376,312 370,316 C 360,320 348,320 342,316 C 336,312 334,300 340,295 Z" />
        {/* New Zealand */}
        <path d="M 384,318 C 385,316 387,317 386,319 C 385,321 384,319 384,318 Z" />
      </g>

      {/* 3D sphere shading overlay (highlight + shadow) */}
      <circle cx="240" cy="230" r="148" fill="url(#sphereShine)" pointerEvents="none" />
      {/* globe outline */}
      <circle cx="240" cy="230" r="148" fill="none" stroke="#0e2a08" strokeWidth="2.5" />

      {/* ═══ ANIMATED DOME TENTS ═══ */}
      <Tent transform="translate(180,165) rotate(-15)" delayClass="dt1" fill="#5a98e8" stroke="#0a2860" ridge="#08214c" />
      <Tent transform="translate(140,200) rotate(-25)" delayClass="dt2" fill="#f08840" stroke="#7a2a08" ridge="#5a1f04" />
      <Tent transform="translate(200,305) rotate(-10)" delayClass="dt3" fill="#f0c840" stroke="#6a4808" ridge="#4a3204" />
      <Tent transform="translate(262,160)" delayClass="dt4" fill="#f0556a" stroke="#7a1828" ridge="#5a1018" />
      <Tent transform="translate(282,245) rotate(10)" delayClass="dt5" fill="#5fc060" stroke="#0a4a18" ridge="#063810" />
      <Tent transform="translate(322,240) rotate(20)" delayClass="dt6" fill="#f080c0" stroke="#7a1850" ridge="#5a1038" />
      <Tent transform="translate(350,180) rotate(15)" delayClass="dt7" fill="#b888ee" stroke="#4a1880" ridge="#36105c" />
      <Tent transform="translate(355,305) rotate(20)" delayClass="dt8" fill="#40c0b8" stroke="#0a4848" ridge="#063636" />

      {/* ambient sparkles */}
      <text x="58" y="150" fontSize="14" fill="var(--leaf)" opacity="0.7" fontFamily="sans-serif">✦</text>
      <text x="410" y="160" fontSize="12" fill="var(--leaf)" opacity="0.6" fontFamily="sans-serif">✦</text>
      <text x="72" y="330" fontSize="11" fill="var(--leaf)" opacity="0.5" fontFamily="sans-serif">✦</text>
      <text x="400" y="330" fontSize="12" fill="var(--leaf)" opacity="0.6" fontFamily="sans-serif">✦</text>
    </svg>
  )
}

const FIELD_NOTES = [
  {
    emoji: '🌦',
    num: '01',
    title: 'Weather-smart lists',
    desc: 'We check the forecast and remind you to pack the rain jacket before you leave. No soggy surprises.',
  },
  {
    emoji: '🎒',
    num: '02',
    title: 'Who’s bringing what',
    desc: 'Everyone claims their items in one tap. No doubles, no gaps — the whole family is covered.',
  },
  {
    emoji: '💬',
    num: '03',
    title: 'One place for the trip',
    desc: 'Group chat, pinned notes, and trip details all in one spot. No more searching through old messages.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--canvas)' }}>
      {/* ═══ NAV ═══ */}
      <nav
        className="flex items-center justify-between px-6 sm:px-9 py-4"
        style={{ background: 'var(--parchment)', borderBottom: '1px solid rgba(59,46,26,0.10)' }}
      >
        <Monogram />
        <div className="flex items-center gap-5 sm:gap-7">
          <div className="hidden sm:flex items-center gap-7">
            {['Packing', 'Weather', 'Crew'].map(l => (
              <span key={l} className="font-mono-data text-[11px] uppercase tracking-[0.06em]" style={{ color: 'var(--muted-text)' }}>
                {l}
              </span>
            ))}
          </div>
          <Link
            href="/trips/new"
            className="font-display font-extrabold text-sm px-5 py-2.5 rounded-full transition-opacity hover:opacity-90"
            style={{ background: 'var(--leaf)', color: 'var(--parchment)' }}
          >
            Start planning ✦
          </Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ — light sage bg, 2-col grid */}
      <section className="relative grid lg:grid-cols-[1.1fr_0.9fr]" style={{ background: 'var(--meadow)' }}>
        <RingTexture />

        {/* Left copy column */}
        <div className="relative px-6 py-14 sm:px-14 sm:py-[60px]">
          <div
            className="font-mono-data text-[11px] uppercase mb-[18px]"
            style={{ color: 'var(--leaf)', letterSpacing: '0.2em' }}
          >
            Group camping, made easy 🏕
          </div>

          <h1
            className="font-display font-black leading-[1.05] tracking-[-0.02em] text-5xl sm:text-[60px]"
            style={{ color: 'var(--canopy)' }}
          >
            Everyone
            <br />
            packed.
            <br />
            <span className="italic font-bold text-[3.25rem] sm:text-[56px]" style={{ color: 'var(--leaf)' }}>
              Nothing forgotten.
            </span>
          </h1>

          <p
            className="font-display font-medium text-[17px] leading-[1.65] max-w-[420px] mt-6 mb-[30px]"
            style={{ color: '#4a5e3a' }}
          >
            Plan your family’s camping adventure together — shared packing lists, weather updates, and group chat so
            every trip runs smoothly from the start.
          </p>

          <div className="flex flex-wrap items-center gap-[18px]">
            <Link
              href="/trips/new"
              className="font-display font-extrabold text-base px-7 py-3.5 rounded-3xl transition-opacity hover:opacity-90"
              style={{ background: 'var(--leaf)', color: 'var(--parchment)' }}
            >
              Start a trip — it’s free →
            </Link>
            <span className="font-mono-data text-[11px] tracking-[0.04em]" style={{ color: '#7a9a6a' }}>
              FREE · FUN · OFFLINE-READY
            </span>
          </div>
        </div>

        {/* Right image column with floating kit card */}
        <div className="relative flex items-center justify-center min-h-[420px] lg:min-h-[520px] p-7" style={{ background: '#d8f0c8' }}>
          <TentGlobe />

          {/* ★ FLOATING KIT COVERAGE CARD */}
          <div
            className="absolute top-8 right-8 w-[215px] rounded-xl px-5 py-[18px]"
            style={{
              background: 'var(--parchment)',
              boxShadow: '0 12px 32px -8px rgba(44,90,24,0.22)',
              border: '1.5px solid rgba(92,158,58,0.18)',
            }}
          >
            <div className="font-mono-data text-[9px] uppercase" style={{ color: 'var(--leaf)', letterSpacing: '0.16em' }}>
              Kit coverage ✦
            </div>
            <div className="font-display font-black text-[32px] leading-none mt-1" style={{ color: 'var(--canopy)' }}>
              28<span className="font-bold" style={{ color: '#a0b890' }}>/40</span>
            </div>
            <div className="flex gap-0.5 mt-2.5">
              <div className="h-[7px] rounded-sm" style={{ flex: 7, background: 'var(--leaf)' }} />
              <div className="h-[7px] rounded-sm" style={{ flex: 3, background: 'rgba(44,90,24,0.13)' }} />
            </div>
            <div className="font-display font-semibold text-xs mt-2" style={{ color: '#7a9a6a' }}>
              6 people · 70% covered
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FIELD NOTES STRIP ═══ */}
      <section className="px-6 sm:px-14 py-13" style={{ background: 'var(--parchment)' }}>
        <div className="font-mono-data text-[11px] uppercase mb-7" style={{ color: '#8a9a6a', letterSpacing: '0.2em' }}>
          What’s inside
        </div>
        <div className="grid sm:grid-cols-3" style={{ borderTop: '1.5px solid rgba(59,46,26,0.10)' }}>
          {FIELD_NOTES.map((f, i) => (
            <div
              key={f.title}
              className="py-7 sm:px-7 sm:first:pl-0 sm:last:pr-0"
              style={i < FIELD_NOTES.length - 1 ? { borderRight: '1px solid rgba(59,46,26,0.08)' } : undefined}
            >
              <div className="text-[22px] mb-2.5">{f.emoji}</div>
              <div className="font-mono-data text-xs mb-2" style={{ color: 'var(--leaf)' }}>{f.num}</div>
              <h3 className="font-display font-extrabold text-[21px] mb-2" style={{ color: 'var(--canopy)' }}>{f.title}</h3>
              <p className="font-display font-medium text-[15px] leading-[1.65]" style={{ color: '#5a5040' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FOOTER BAR ═══ */}
      <footer
        className="flex flex-wrap items-center justify-between gap-3.5 px-6 sm:px-14 py-7"
        style={{ background: 'var(--canopy)' }}
      >
        <p className="font-display italic font-bold text-lg" style={{ color: 'var(--meadow)' }}>
          Every adventure starts with a great plan. 🌲
        </p>
        <span className="font-mono-data text-[11px] tracking-[0.08em]" style={{ color: 'var(--moss)' }}>
          CAMPFIRE © 2026 · MADE FOR FAMILIES
        </span>
      </footer>
    </div>
  )
}
