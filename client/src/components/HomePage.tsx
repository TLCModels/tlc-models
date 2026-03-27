import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  DESIGN TOKENS                                                      */
/* ------------------------------------------------------------------ */
const COLORS = {
  obsidian: '#0A0A0A',
  gold: '#C9A84C',
  glass: 'rgba(255,255,255,0.05)',
  glassBorder: 'rgba(255,255,255,0.08)',
  racingRed: '#FF1801',
  fifaNavy: '#1A1A2E',
  white: '#FFFFFF',
  muted: 'rgba(255,255,255,0.6)',
} as const;

/* ------------------------------------------------------------------ */
/*  SHARED TYPES                                                       */
/* ------------------------------------------------------------------ */
interface SectionProps {
  id?: string;
}

interface ServiceCard {
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface TalentCard {
  name: string;
  specialty: string;
  location: string;
}

interface CityBadge {
  name: string;
  state: string;
}

/* ------------------------------------------------------------------ */
/*  SVG ICON COMPONENTS                                                */
/* ------------------------------------------------------------------ */
const CheckIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke={COLORS.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ChevronDown: React.FC<{ className?: string; open?: boolean }> = ({ className = 'w-5 h-5', open }) => (
  <svg className={`${className} transition-transform duration-300 ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const StarIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill={COLORS.gold} aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ArrowRight: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

const MenuIcon: React.FC = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* Service-specific icons */
const HospitalityIcon: React.FC = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={COLORS.gold} strokeWidth="1.5" aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
  </svg>
);

const AmbassadorIcon: React.FC = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={COLORS.gold} strokeWidth="1.5" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const TradeShowIcon: React.FC = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={COLORS.gold} strokeWidth="1.5" aria-hidden="true">
    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const ConventionIcon: React.FC = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={COLORS.gold} strokeWidth="1.5" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const CorporateIcon: React.FC = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={COLORS.gold} strokeWidth="1.5" aria-hidden="true">
    <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
  </svg>
);

const GalaIcon: React.FC = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={COLORS.gold} strokeWidth="1.5" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20" /><line x1="2" y1="12" x2="22" y2="12" />
  </svg>
);

const SocialIcons = {
  Instagram: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" />
    </svg>
  ),
  Facebook: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
    </svg>
  ),
  LinkedIn: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
    </svg>
  ),
  Twitter: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
};

/* ------------------------------------------------------------------ */
/*  CUSTOM HOOKS                                                       */
/* ------------------------------------------------------------------ */
function useInView(threshold = 0.15): [React.RefCallback<HTMLDivElement>, boolean] {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  const setRef: React.RefCallback<HTMLDivElement> = useCallback((node: HTMLDivElement | null) => {
    nodeRef.current = node;
  }, []);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) { setInView(true); observer.disconnect(); }
      },
      { threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return [setRef, inView];
}

function useAnimatedCounter(target: number, duration: number = 2000, start: boolean = false): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    let raf: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * target));
      if (progress < 1) { raf = requestAnimationFrame(step); }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);

  return count;
}

function useDetectedCity(): string {
  const [city, setCity] = useState('Your City');

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const cityMap: Record<string, string> = {
      'America/Los_Angeles': 'Los Angeles',
      'America/New_York': 'New York',
      'America/Chicago': 'Dallas',
      'America/Denver': 'Denver',
      'America/Phoenix': 'Phoenix',
      'Pacific/Honolulu': 'Honolulu',
    };
    // Extract city from timezone as fallback
    const tzCity = tz.split('/').pop()?.replace(/_/g, ' ') ?? 'Your City';
    setCity(cityMap[tz] ?? tzCity);
  }, []);

  return city;
}

/* ------------------------------------------------------------------ */
/*  GLOBAL CSS (injected once)                                         */
/* ------------------------------------------------------------------ */
const GlobalStyles: React.FC = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display+SC:wght@400;700;900&family=DM+Sans:wght@400;500;700&display=swap');

    .font-playfair { font-family: 'Playfair Display SC', serif; }
    .font-dm { font-family: 'DM Sans', sans-serif; }

    /* Gold orb keyframes */
    @keyframes float-orb-1 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      25% { transform: translate(120px, -80px) scale(1.1); }
      50% { transform: translate(-60px, -160px) scale(0.95); }
      75% { transform: translate(-140px, -40px) scale(1.05); }
    }
    @keyframes float-orb-2 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      25% { transform: translate(-100px, 60px) scale(0.9); }
      50% { transform: translate(80px, 120px) scale(1.1); }
      75% { transform: translate(60px, -80px) scale(1); }
    }
    @keyframes float-orb-3 {
      0%, 100% { transform: translate(0, 0) scale(1.05); }
      33% { transform: translate(160px, 100px) scale(0.9); }
      66% { transform: translate(-120px, 60px) scale(1.15); }
    }

    .orb-1 { animation: float-orb-1 18s ease-in-out infinite; }
    .orb-2 { animation: float-orb-2 22s ease-in-out infinite; }
    .orb-3 { animation: float-orb-3 26s ease-in-out infinite; }

    /* Infinite scroll for trust bar */
    @keyframes scroll-left {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .animate-scroll-left {
      animation: scroll-left 30s linear infinite;
    }

    /* Fade-in on scroll */
    .fade-up {
      opacity: 0;
      transform: translateY(32px);
      transition: opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .fade-up.visible {
      opacity: 1;
      transform: translateY(0);
    }

    /* Glass panel */
    .glass {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    /* Hide scrollbar for horizontal scroll */
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* Smooth scroll */
    html { scroll-behavior: smooth; }
  `}</style>
);

/* ------------------------------------------------------------------ */
/*  1. NAVIGATION                                                      */
/* ------------------------------------------------------------------ */
const Navigation: React.FC<SectionProps> = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: 'Services', href: '#services' },
    { label: 'About', href: '#why-tlc' },
    { label: 'Talent', href: '#talent' },
    { label: 'Cities', href: '#cities' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'glass shadow-lg shadow-black/30' : 'bg-transparent'
      }`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-20">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3" aria-label="TLC Models home">
          <span className="font-playfair text-2xl font-bold tracking-wider" style={{ color: COLORS.gold }}>
            TLC MODELS
          </span>
        </a>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-dm text-sm tracking-wide text-white/70 hover:text-[#C9A84C] transition-colors duration-300"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden lg:block">
          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-dm text-sm font-medium tracking-wide transition-all duration-300 hover:scale-105"
            style={{ backgroundColor: COLORS.gold, color: COLORS.obsidian }}
          >
            Book Talent
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Mobile Toggle */}
        <button
          className="lg:hidden text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden glass border-t border-white/10">
          <div className="px-6 py-6 flex flex-col gap-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="font-dm text-base text-white/80 hover:text-[#C9A84C] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <a
              href="#contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-dm text-sm font-medium mt-2"
              style={{ backgroundColor: COLORS.gold, color: COLORS.obsidian }}
              onClick={() => setMobileOpen(false)}
            >
              Book Talent
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};

/* ------------------------------------------------------------------ */
/*  2. HERO                                                            */
/* ------------------------------------------------------------------ */
const Hero: React.FC<SectionProps> = () => {
  const city = useDetectedCity();

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: `linear-gradient(160deg, ${COLORS.obsidian} 0%, #111 50%, ${COLORS.obsidian} 100%)` }}
      aria-label="Hero"
    >
      {/* Floating gold orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="orb-1 absolute w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{ background: `radial-gradient(circle, ${COLORS.gold}, transparent)`, top: '10%', left: '15%' }}
        />
        <div
          className="orb-2 absolute w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{ background: `radial-gradient(circle, ${COLORS.gold}, transparent)`, top: '40%', right: '10%' }}
        />
        <div
          className="orb-3 absolute w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: `radial-gradient(circle, ${COLORS.gold}, transparent)`, bottom: '15%', left: '40%' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <p className="font-dm text-sm uppercase tracking-[0.3em] mb-6" style={{ color: COLORS.gold }}>
          Est. 2013 -- Nationwide Coverage
        </p>
        <h1 className="font-playfair text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] mb-8 text-white">
          America&#39;s Premier
          <br />
          <span style={{ color: COLORS.gold }}>Event Staffing</span>
          <br />
          Agency
        </h1>
        <p className="font-dm text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
          Luxury-tier talent for the world&#39;s most prestigious events.
          Now serving <span className="text-white font-medium">{city}</span> and 25+ markets nationwide.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-dm font-medium text-base transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#C9A84C]/20"
            style={{ backgroundColor: COLORS.gold, color: COLORS.obsidian }}
          >
            Request a Custom Roster
            <ArrowRight className="w-5 h-5" />
          </a>
          <a
            href="#services"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-dm font-medium text-base text-white/80 border border-white/20 hover:border-[#C9A84C]/50 hover:text-white transition-all duration-300"
          >
            Explore Services
          </a>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A0A0A] to-transparent" aria-hidden="true" />
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  3. TRUST BAR                                                       */
/* ------------------------------------------------------------------ */
const TRUST_LOGOS = ['McLaren', 'Ferrari', 'CES', 'SEMA', 'FIFA', 'F1', 'Louis Vuitton', 'Rolex'];

const TrustBar: React.FC<SectionProps> = () => (
  <section className="py-12 border-y border-white/5 overflow-hidden" style={{ backgroundColor: COLORS.obsidian }} aria-label="Trusted by">
    <p className="font-dm text-xs uppercase tracking-[0.25em] text-white/30 text-center mb-8">
      Trusted by the World&#39;s Leading Brands
    </p>
    <div className="relative">
      <div className="animate-scroll-left flex items-center gap-16 whitespace-nowrap" style={{ width: 'max-content' }}>
        {[...TRUST_LOGOS, ...TRUST_LOGOS].map((logo, i) => (
          <span
            key={`${logo}-${i}`}
            className="font-playfair text-2xl tracking-wider text-white/20 hover:text-white/40 transition-colors duration-500 select-none"
          >
            {logo}
          </span>
        ))}
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/*  4. STATS COUNTERS                                                  */
/* ------------------------------------------------------------------ */
interface StatItemProps {
  value: number;
  suffix: string;
  label: string;
  started: boolean;
}

const StatItem: React.FC<StatItemProps> = ({ value, suffix, label, started }) => {
  const count = useAnimatedCounter(value, 2200, started);
  return (
    <div className="text-center px-4">
      <div className="font-playfair text-4xl md:text-5xl font-bold text-white mb-2">
        {count.toLocaleString()}{suffix}
      </div>
      <p className="font-dm text-sm text-white/50 uppercase tracking-wider">{label}</p>
    </div>
  );
};

const StatsCounters: React.FC<SectionProps> = () => {
  const [ref, inView] = useInView(0.3);

  const stats = [
    { value: 25000, suffix: '+', label: 'Events Staffed' },
    { value: 3200, suffix: '+', label: 'Talent Nationwide' },
    { value: 13, suffix: '+', label: 'Years of Excellence' },
    { value: 25, suffix: '+', label: 'States Served' },
  ];

  return (
    <section ref={ref} className="py-24" style={{ backgroundColor: COLORS.obsidian }} aria-label="Company statistics">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12">
        {stats.map((s) => (
          <StatItem key={s.label} {...s} started={inView} />
        ))}
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  5. SERVICES GRID                                                   */
/* ------------------------------------------------------------------ */
const SERVICES: ServiceCard[] = [
  { title: 'VIP Hospitality', description: 'White-glove service for high-net-worth clients, luxury activations, and exclusive soirees.', icon: <HospitalityIcon /> },
  { title: 'Brand Ambassadors', description: 'Charismatic, camera-ready talent that embodies your brand identity at every touchpoint.', icon: <AmbassadorIcon /> },
  { title: 'Trade Show Staff', description: 'Experienced booth professionals trained to drive engagement, scan badges, and qualify leads.', icon: <TradeShowIcon /> },
  { title: 'Convention Models', description: 'Polished, professional talent for conventions, expos, and large-scale industry gatherings.', icon: <ConventionIcon /> },
  { title: 'Corporate Events', description: 'Refined event staff for galas, product launches, board meetings, and executive retreats.', icon: <CorporateIcon /> },
  { title: 'Gala & Red Carpet', description: 'Stunning red-carpet-ready talent that elevates the prestige of every formal affair.', icon: <GalaIcon /> },
];

const ServicesGrid: React.FC<SectionProps> = () => {
  const [ref, inView] = useInView();

  return (
    <section id="services" className="py-28" style={{ backgroundColor: COLORS.obsidian }} aria-label="Our services">
      <div ref={ref} className={`max-w-7xl mx-auto px-6 fade-up ${inView ? 'visible' : ''}`}>
        <p className="font-dm text-sm uppercase tracking-[0.25em] text-center mb-4" style={{ color: COLORS.gold }}>
          What We Do
        </p>
        <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white text-center mb-16">
          Our Services
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((service) => (
            <div
              key={service.title}
              className="glass rounded-2xl p-8 hover:border-[#C9A84C]/30 transition-all duration-500 group cursor-pointer hover:-translate-y-1"
            >
              <div className="mb-5 opacity-70 group-hover:opacity-100 transition-opacity">{service.icon}</div>
              <h3 className="font-playfair text-xl font-bold text-white mb-3">{service.title}</h3>
              <p className="font-dm text-sm text-white/50 leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  6. WHY TLC MODELS                                                  */
/* ------------------------------------------------------------------ */
const WHY_POINTS = [
  'Vetted, experienced talent with proven track records',
  'Dedicated account manager for every engagement',
  'Nationwide reach across 25+ markets',
  'Custom roster curation within 24 hours',
  'Comprehensive post-event reporting and analytics',
];

const WhyTLC: React.FC<SectionProps> = () => {
  const [ref, inView] = useInView();

  return (
    <section id="why-tlc" className="py-28 border-t border-white/5" style={{ backgroundColor: COLORS.obsidian }} aria-label="Why choose TLC Models">
      <div ref={ref} className={`max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center fade-up ${inView ? 'visible' : ''}`}>
        {/* Left - text */}
        <div>
          <p className="font-dm text-sm uppercase tracking-[0.25em] mb-4" style={{ color: COLORS.gold }}>
            The TLC Difference
          </p>
          <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white mb-10">
            Why TLC Models
          </h2>
          <ul className="space-y-5">
            {WHY_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-4">
                <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(201,168,76,0.15)' }}>
                  <CheckIcon className="w-3.5 h-3.5" />
                </span>
                <span className="font-dm text-base text-white/70 leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right - image placeholder */}
        <div className="glass rounded-3xl aspect-[4/5] flex items-center justify-center overflow-hidden">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(201,168,76,0.1)' }}>
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke={COLORS.gold} strokeWidth="1.5" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
            <p className="font-dm text-sm text-white/30">Featured Image</p>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  7. F1 SPOTLIGHT                                                    */
/* ------------------------------------------------------------------ */
const F1Spotlight: React.FC<SectionProps> = () => {
  const [ref, inView] = useInView();

  return (
    <section className="py-28 relative overflow-hidden" style={{ backgroundColor: COLORS.obsidian }} aria-label="F1 Spotlight">
      {/* Red accent glow */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-20" style={{ backgroundColor: COLORS.racingRed }} aria-hidden="true" />

      <div ref={ref} className={`max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center fade-up ${inView ? 'visible' : ''}`}>
        {/* Image placeholder */}
        <div className="glass rounded-3xl aspect-video flex items-center justify-center" style={{ borderColor: 'rgba(255,24,1,0.2)' }}>
          <div className="text-center">
            <p className="font-playfair text-6xl font-bold mb-2" style={{ color: COLORS.racingRed }}>F1</p>
            <p className="font-dm text-sm text-white/30">Grand Prix Experience</p>
          </div>
        </div>

        {/* Text */}
        <div>
          <p className="font-dm text-sm uppercase tracking-[0.25em] mb-4" style={{ color: COLORS.racingRed }}>
            Formula 1 Partnership
          </p>
          <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white mb-6">
            Elevate Your <span style={{ color: COLORS.racingRed }}>Grand Prix</span> Experience
          </h2>
          <p className="font-dm text-base text-white/60 leading-relaxed mb-8">
            TLC Models is the premier staffing partner for Formula 1 events across the United States.
            From the Las Vegas Grand Prix to Miami and Austin, our talent delivers unparalleled hospitality
            at the pinnacle of motorsport.
          </p>
          <a
            href="https://f1.tlcmodels.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-dm font-medium text-sm text-white transition-all duration-300 hover:scale-105"
            style={{ backgroundColor: COLORS.racingRed }}
          >
            Explore F1 Staffing
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  8. FIFA 2026 SPOTLIGHT                                             */
/* ------------------------------------------------------------------ */
const FIFASpotlight: React.FC<SectionProps> = () => {
  const [ref, inView] = useInView();

  return (
    <section className="py-28 relative overflow-hidden" style={{ backgroundColor: COLORS.obsidian }} aria-label="FIFA 2026 Spotlight">
      {/* Navy accent glow */}
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-[120px] opacity-30" style={{ backgroundColor: COLORS.fifaNavy }} aria-hidden="true" />

      <div ref={ref} className={`max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center fade-up ${inView ? 'visible' : ''}`}>
        {/* Text */}
        <div>
          <p className="font-dm text-sm uppercase tracking-[0.25em] mb-4" style={{ color: '#5B8DEF' }}>
            FIFA World Cup 2026
          </p>
          <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white mb-6">
            The World Stage Comes to <span style={{ color: '#5B8DEF' }}>America</span>
          </h2>
          <p className="font-dm text-base text-white/60 leading-relaxed mb-8">
            The FIFA World Cup 2026 will be the largest sporting event in history, hosted across
            the United States, Mexico, and Canada. TLC Models is already building elite talent rosters
            for host cities including Dallas, Miami, New York, Los Angeles, and more.
          </p>
          <a
            href="https://fifa2026.tlcmodels.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-dm font-medium text-sm text-white transition-all duration-300 hover:scale-105"
            style={{ backgroundColor: COLORS.fifaNavy }}
          >
            FIFA 2026 Staffing
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Image placeholder */}
        <div className="glass rounded-3xl aspect-video flex items-center justify-center" style={{ borderColor: 'rgba(91,141,239,0.2)' }}>
          <div className="text-center">
            <p className="font-playfair text-5xl font-bold mb-2" style={{ color: '#5B8DEF' }}>FIFA</p>
            <p className="font-dm text-lg text-white/40">2026</p>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  9. LAS VEGAS SPOTLIGHT                                             */
/* ------------------------------------------------------------------ */
const VegasSpotlight: React.FC<SectionProps> = () => {
  const [ref, inView] = useInView();

  return (
    <section className="py-28 relative overflow-hidden" style={{ backgroundColor: COLORS.obsidian }} aria-label="Las Vegas Spotlight">
      {/* Gold accent glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[160px] opacity-10" style={{ backgroundColor: COLORS.gold }} aria-hidden="true" />

      <div ref={ref} className={`max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center fade-up ${inView ? 'visible' : ''}`}>
        {/* Image placeholder */}
        <div className="glass rounded-3xl aspect-video flex items-center justify-center" style={{ borderColor: 'rgba(201,168,76,0.2)' }}>
          <div className="text-center">
            <p className="font-playfair text-4xl font-bold mb-2" style={{ color: COLORS.gold }}>LAS VEGAS</p>
            <p className="font-dm text-sm text-white/30">The Entertainment Capital</p>
          </div>
        </div>

        {/* Text */}
        <div>
          <p className="font-dm text-sm uppercase tracking-[0.25em] mb-4" style={{ color: COLORS.gold }}>
            Our Flagship Market
          </p>
          <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white mb-6">
            Las Vegas <span style={{ color: COLORS.gold }}>Headquarters</span>
          </h2>
          <p className="font-dm text-base text-white/60 leading-relaxed mb-8">
            Born on the Las Vegas Strip, TLC Models is the go-to staffing agency for Sin City&#39;s
            most exclusive events. From CES and SEMA to nightclub grand openings and high-roller
            experiences, we own the Vegas market.
          </p>
          <a
            href="https://lasvegas.tlcmodels.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-dm font-medium text-sm transition-all duration-300 hover:scale-105"
            style={{ backgroundColor: COLORS.gold, color: COLORS.obsidian }}
          >
            Las Vegas Talent
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  10. TALENT SHOWCASE                                                */
/* ------------------------------------------------------------------ */
const TALENT_CARDS: TalentCard[] = [
  { name: 'Sophia R.', specialty: 'VIP Hospitality', location: 'Las Vegas' },
  { name: 'Isabella M.', specialty: 'Brand Ambassador', location: 'Miami' },
  { name: 'Olivia K.', specialty: 'Trade Show', location: 'Dallas' },
  { name: 'Ava T.', specialty: 'Convention Model', location: 'New York' },
  { name: 'Emma L.', specialty: 'Corporate Events', location: 'Los Angeles' },
  { name: 'Mia J.', specialty: 'Red Carpet', location: 'Austin' },
  { name: 'Charlotte D.', specialty: 'VIP Hospitality', location: 'Chicago' },
  { name: 'Amelia S.', specialty: 'Brand Ambassador', location: 'San Francisco' },
];

const TalentShowcase: React.FC<SectionProps> = () => {
  const [ref, inView] = useInView();

  return (
    <section id="talent" className="py-28 border-t border-white/5" style={{ backgroundColor: COLORS.obsidian }} aria-label="Talent showcase">
      <div ref={ref} className={`fade-up ${inView ? 'visible' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 mb-12">
          <p className="font-dm text-sm uppercase tracking-[0.25em] mb-4" style={{ color: COLORS.gold }}>
            Our Roster
          </p>
          <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white">
            Featured Talent
          </h2>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-6 px-6 pb-4" style={{ width: 'max-content' }}>
            {TALENT_CARDS.map((talent) => (
              <div
                key={talent.name}
                className="glass rounded-2xl w-72 flex-shrink-0 overflow-hidden group hover:border-[#C9A84C]/30 transition-all duration-500"
              >
                {/* Image placeholder */}
                <div className="aspect-[3/4] bg-gradient-to-b from-white/[0.03] to-transparent flex items-end justify-center relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-16 h-16 text-white/10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-playfair text-lg font-bold text-white">{talent.name}</h3>
                  <p className="font-dm text-sm mt-1" style={{ color: COLORS.gold }}>{talent.specialty}</p>
                  <p className="font-dm text-xs text-white/40 mt-1">{talent.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  11. TESTIMONIALS CAROUSEL                                          */
/* ------------------------------------------------------------------ */
const TESTIMONIALS: Testimonial[] = [
  {
    quote: 'TLC Models transformed our CES booth experience. Their talent was professional, punctual, and incredibly engaging with our attendees.',
    author: 'Sarah M.',
    role: 'VP of Marketing',
    company: 'Fortune 500 Tech Company',
  },
  {
    quote: 'We have used TLC for five consecutive years at SEMA. Their attention to detail and talent quality is unmatched in the industry.',
    author: 'James K.',
    role: 'Events Director',
    company: 'Leading Automotive Brand',
  },
  {
    quote: 'The VIP hospitality staff for our gala were absolutely flawless. Every guest commented on their professionalism and grace.',
    author: 'Michelle R.',
    role: 'CEO',
    company: 'Luxury Events Agency',
  },
  {
    quote: 'From roster curation to day-of execution, TLC delivers a white-glove experience that makes our job infinitely easier.',
    author: 'David P.',
    role: 'Senior Producer',
    company: 'Global Experiential Agency',
  },
];

const TestimonialsCarousel: React.FC<SectionProps> = () => {
  const [active, setActive] = useState(0);
  const [ref, inView] = useInView();

  useEffect(() => {
    if (!inView) return;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [inView]);

  return (
    <section className="py-28 border-t border-white/5" style={{ backgroundColor: COLORS.obsidian }} aria-label="Client testimonials">
      <div ref={ref} className={`max-w-4xl mx-auto px-6 fade-up ${inView ? 'visible' : ''}`}>
        <p className="font-dm text-sm uppercase tracking-[0.25em] text-center mb-4" style={{ color: COLORS.gold }}>
          Testimonials
        </p>
        <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white text-center mb-16">
          What Our Clients Say
        </h2>

        <div className="relative">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.author}
              className={`glass rounded-3xl p-10 md:p-12 text-center transition-all duration-700 ${
                i === active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 absolute inset-0 pointer-events-none'
              }`}
              role="group"
              aria-roledescription="slide"
              aria-label={`Testimonial ${i + 1} of ${TESTIMONIALS.length}`}
            >
              <div className="flex justify-center gap-1 mb-6">
                {[...Array(5)].map((_, j) => <StarIcon key={j} />)}
              </div>
              <blockquote className="font-dm text-lg md:text-xl text-white/80 leading-relaxed mb-8 italic">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <p className="font-dm text-base font-medium text-white">{t.author}</p>
              <p className="font-dm text-sm text-white/40">{t.role}, {t.company}</p>
            </div>
          ))}
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-3 mt-10" role="tablist" aria-label="Testimonial navigation">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === active ? 'w-8' : 'opacity-30'
              }`}
              style={{ backgroundColor: i === active ? COLORS.gold : 'white' }}
              role="tab"
              aria-selected={i === active}
              aria-label={`Show testimonial ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  12. HOW IT WORKS                                                   */
/* ------------------------------------------------------------------ */
const STEPS = [
  { number: '01', title: 'Consultation', description: 'Tell us about your event, audience, and brand vision. We listen and strategize.' },
  { number: '02', title: 'Custom Roster', description: 'Within 24 hours, receive a curated roster of vetted talent tailored to your needs.' },
  { number: '03', title: 'Event Day', description: 'Our talent arrives early, briefed, branded, and ready to deliver excellence.' },
  { number: '04', title: 'Follow-Up', description: 'Post-event reporting, photos, metrics, and feedback to optimize future events.' },
];

const HowItWorks: React.FC<SectionProps> = () => {
  const [ref, inView] = useInView();

  return (
    <section className="py-28 border-t border-white/5" style={{ backgroundColor: COLORS.obsidian }} aria-label="How it works">
      <div ref={ref} className={`max-w-7xl mx-auto px-6 fade-up ${inView ? 'visible' : ''}`}>
        <p className="font-dm text-sm uppercase tracking-[0.25em] text-center mb-4" style={{ color: COLORS.gold }}>
          The Process
        </p>
        <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white text-center mb-16">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((step, i) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-[#C9A84C]/40 to-transparent z-0" aria-hidden="true" />
              )}
              <div className="glass rounded-2xl p-8 relative z-10 h-full">
                <span className="font-playfair text-4xl font-bold block mb-4" style={{ color: COLORS.gold, opacity: 0.3 }}>
                  {step.number}
                </span>
                <h3 className="font-playfair text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="font-dm text-sm text-white/50 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  13. CITIES WE SERVE                                                */
/* ------------------------------------------------------------------ */
const CITIES: CityBadge[] = [
  { name: 'Las Vegas', state: 'NV' },
  { name: 'Miami', state: 'FL' },
  { name: 'Dallas', state: 'TX' },
  { name: 'Austin', state: 'TX' },
  { name: 'New York', state: 'NY' },
  { name: 'Los Angeles', state: 'CA' },
  { name: 'Chicago', state: 'IL' },
  { name: 'San Francisco', state: 'CA' },
  { name: 'Houston', state: 'TX' },
  { name: 'Atlanta', state: 'GA' },
  { name: 'Phoenix', state: 'AZ' },
  { name: 'Denver', state: 'CO' },
  { name: 'Nashville', state: 'TN' },
  { name: 'Orlando', state: 'FL' },
  { name: 'San Diego', state: 'CA' },
  { name: 'Seattle', state: 'WA' },
];

const CitiesServed: React.FC<SectionProps> = () => {
  const [ref, inView] = useInView();

  return (
    <section id="cities" className="py-28 border-t border-white/5" style={{ backgroundColor: COLORS.obsidian }} aria-label="Cities we serve">
      <div ref={ref} className={`max-w-7xl mx-auto px-6 fade-up ${inView ? 'visible' : ''}`}>
        <p className="font-dm text-sm uppercase tracking-[0.25em] text-center mb-4" style={{ color: COLORS.gold }}>
          Nationwide Coverage
        </p>
        <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white text-center mb-16">
          Cities We Serve
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          {CITIES.map((city) => (
            <div
              key={city.name}
              className="glass rounded-full px-6 py-3 hover:border-[#C9A84C]/30 transition-all duration-300 cursor-default group"
            >
              <span className="font-dm text-sm text-white/70 group-hover:text-white transition-colors">
                {city.name}
              </span>
              <span className="font-dm text-xs text-white/30 ml-2">{city.state}</span>
            </div>
          ))}
          <div className="glass rounded-full px-6 py-3" style={{ borderColor: 'rgba(201,168,76,0.3)' }}>
            <span className="font-dm text-sm" style={{ color: COLORS.gold }}>+ More Markets</span>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  14. LEAD GENERATION FORM                                           */
/* ------------------------------------------------------------------ */
const LeadForm: React.FC<SectionProps> = () => {
  const [ref, inView] = useInView();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      setSubmitted(true);
    } catch {
      // Silently handle - user can retry
    }
  }, []);

  return (
    <section id="contact" className="py-28 border-t border-white/5" style={{ backgroundColor: COLORS.obsidian }} aria-label="Contact form">
      <div ref={ref} className={`max-w-3xl mx-auto px-6 fade-up ${inView ? 'visible' : ''}`}>
        <p className="font-dm text-sm uppercase tracking-[0.25em] text-center mb-4" style={{ color: COLORS.gold }}>
          Get Started
        </p>
        <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white text-center mb-6">
          Request a Custom Roster
        </h2>
        <p className="font-dm text-base text-white/50 text-center mb-12 max-w-xl mx-auto">
          Tell us about your upcoming event and we will curate the perfect team within 24 hours.
        </p>

        {submitted ? (
          <div className="glass rounded-3xl p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(201,168,76,0.15)' }}>
              <CheckIcon className="w-8 h-8" />
            </div>
            <h3 className="font-playfair text-2xl font-bold text-white mb-3">Thank You</h3>
            <p className="font-dm text-white/60">We have received your inquiry and will respond within 24 hours.</p>
          </div>
        ) : (
          <form
            action="https://formspree.io/f/YOUR_FORM_ID"
            method="POST"
            onSubmit={handleSubmit}
            className="glass rounded-3xl p-8 md:p-12 space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="form-name" className="font-dm text-sm text-white/50 block mb-2">Full Name</label>
                <input
                  id="form-name"
                  name="name"
                  type="text"
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-dm text-sm placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label htmlFor="form-email" className="font-dm text-sm text-white/50 block mb-2">Email</label>
                <input
                  id="form-email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-dm text-sm placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
                  placeholder="john@company.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="form-company" className="font-dm text-sm text-white/50 block mb-2">Company</label>
                <input
                  id="form-company"
                  name="company"
                  type="text"
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-dm text-sm placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
                  placeholder="Acme Inc."
                />
              </div>
              <div>
                <label htmlFor="form-event-type" className="font-dm text-sm text-white/50 block mb-2">Event Type</label>
                <select
                  id="form-event-type"
                  name="event_type"
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-dm text-sm focus:outline-none focus:border-[#C9A84C]/50 transition-colors appearance-none"
                  defaultValue=""
                >
                  <option value="" disabled className="bg-[#0A0A0A]">Select type</option>
                  <option value="trade-show" className="bg-[#0A0A0A]">Trade Show / Expo</option>
                  <option value="corporate" className="bg-[#0A0A0A]">Corporate Event</option>
                  <option value="gala" className="bg-[#0A0A0A]">Gala / Red Carpet</option>
                  <option value="brand-activation" className="bg-[#0A0A0A]">Brand Activation</option>
                  <option value="hospitality" className="bg-[#0A0A0A]">VIP Hospitality</option>
                  <option value="other" className="bg-[#0A0A0A]">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="form-date" className="font-dm text-sm text-white/50 block mb-2">Event Date</label>
                <input
                  id="form-date"
                  name="event_date"
                  type="date"
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-dm text-sm focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="form-city" className="font-dm text-sm text-white/50 block mb-2">Event City</label>
                <input
                  id="form-city"
                  name="event_city"
                  type="text"
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-dm text-sm placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/50 transition-colors"
                  placeholder="Las Vegas"
                />
              </div>
            </div>
            <div>
              <label htmlFor="form-message" className="font-dm text-sm text-white/50 block mb-2">Tell Us About Your Event</label>
              <textarea
                id="form-message"
                name="message"
                rows={4}
                className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-dm text-sm placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/50 transition-colors resize-none"
                placeholder="Number of staff needed, event details, special requirements..."
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 rounded-xl font-dm font-medium text-base transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#C9A84C]/20"
              style={{ backgroundColor: COLORS.gold, color: COLORS.obsidian }}
            >
              Submit Inquiry
            </button>
            <p className="font-dm text-xs text-white/30 text-center">
              We respond to all inquiries within 24 hours. Your information is kept confidential.
            </p>
          </form>
        )}
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  15. CALENDLY BOOKING                                               */
/* ------------------------------------------------------------------ */
const CalendlyBooking: React.FC<SectionProps> = () => {
  const [ref, inView] = useInView();

  return (
    <section className="py-28 border-t border-white/5" style={{ backgroundColor: COLORS.obsidian }} aria-label="Schedule a consultation">
      <div ref={ref} className={`max-w-4xl mx-auto px-6 fade-up ${inView ? 'visible' : ''}`}>
        <p className="font-dm text-sm uppercase tracking-[0.25em] text-center mb-4" style={{ color: COLORS.gold }}>
          Schedule a Call
        </p>
        <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white text-center mb-6">
          Book a Consultation
        </h2>
        <p className="font-dm text-base text-white/50 text-center mb-12 max-w-xl mx-auto">
          Prefer to talk it through? Schedule a complimentary 15-minute strategy call with our team.
        </p>
        <div className="glass rounded-3xl overflow-hidden" style={{ minHeight: '700px' }}>
          <iframe
            src="https://calendly.com/tlcmodels"
            title="Schedule a consultation with TLC Models"
            className="w-full border-0"
            style={{ height: '700px', minWidth: '320px' }}
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  16. FAQ ACCORDION                                                  */
/* ------------------------------------------------------------------ */
const FAQ_DATA: FAQItem[] = [
  {
    question: 'What types of events does TLC Models staff?',
    answer: 'We staff all types of events including trade shows, conventions, corporate events, galas, brand activations, product launches, sporting events, and VIP hospitality experiences. Our talent is experienced across every major event category.',
  },
  {
    question: 'How far in advance should I book?',
    answer: 'We recommend booking at least 2-4 weeks in advance for standard events and 6-8 weeks for large-scale activations or major trade shows. However, we understand that timelines shift and can often accommodate last-minute requests within 48-72 hours.',
  },
  {
    question: 'What cities do you serve?',
    answer: 'TLC Models operates in 25+ markets nationwide including Las Vegas, Miami, Dallas, Austin, New York, Los Angeles, Chicago, San Francisco, Houston, Atlanta, Phoenix, Denver, Nashville, Orlando, San Diego, and Seattle. We are continuously expanding our coverage.',
  },
  {
    question: 'How are your talent vetted?',
    answer: 'Every talent in our roster undergoes a comprehensive vetting process including in-person or video interviews, reference checks, experience verification, and a professional photoshoot. We only accept the top 5% of applicants.',
  },
  {
    question: 'Can I review talent profiles before booking?',
    answer: 'Absolutely. Once we understand your event needs, we curate a custom roster of recommended talent complete with headshots, measurements, experience summaries, and availability. You approve the final selection.',
  },
  {
    question: 'What is your pricing structure?',
    answer: 'Pricing varies based on event type, duration, number of staff, and market. We provide transparent, all-inclusive quotes with no hidden fees. Contact us for a custom proposal tailored to your event.',
  },
  {
    question: 'Do you provide bilingual or multilingual staff?',
    answer: 'Yes. We have talent fluent in Spanish, Portuguese, French, Mandarin, Japanese, Korean, Arabic, and many other languages. Let us know your language requirements and we will match accordingly.',
  },
  {
    question: 'What happens if a booked talent cancels?',
    answer: 'We maintain backup talent for every booking. In the rare event of a cancellation, we immediately deploy an equally qualified replacement at no additional cost. Our 99.8% fulfillment rate speaks for itself.',
  },
];

const FAQAccordion: React.FC<SectionProps> = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [ref, inView] = useInView();

  // Generate FAQPage structured data
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_DATA.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <section id="faq" className="py-28 border-t border-white/5" style={{ backgroundColor: COLORS.obsidian }} aria-label="Frequently asked questions">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div ref={ref} className={`max-w-3xl mx-auto px-6 fade-up ${inView ? 'visible' : ''}`}>
        <p className="font-dm text-sm uppercase tracking-[0.25em] text-center mb-4" style={{ color: COLORS.gold }}>
          FAQ
        </p>
        <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white text-center mb-16">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {FAQ_DATA.map((item, i) => (
            <div key={i} className="glass rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
                aria-expanded={openIndex === i}
                aria-controls={`faq-answer-${i}`}
              >
                <span className="font-dm text-base text-white/80 pr-4">{item.question}</span>
                <ChevronDown className="w-5 h-5 text-white/40 flex-shrink-0" open={openIndex === i} />
              </button>
              <div
                id={`faq-answer-${i}`}
                className={`overflow-hidden transition-all duration-500 ${
                  openIndex === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
                role="region"
                aria-labelledby={`faq-question-${i}`}
              >
                <p className="font-dm text-sm text-white/50 leading-relaxed px-6 pb-6">
                  {item.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*  17. FOOTER                                                         */
/* ------------------------------------------------------------------ */
const Footer: React.FC<SectionProps> = () => {
  const currentYear = new Date().getFullYear();

  const navGroups = [
    {
      title: 'Services',
      links: [
        { label: 'VIP Hospitality', href: '#services' },
        { label: 'Brand Ambassadors', href: '#services' },
        { label: 'Trade Show Staff', href: '#services' },
        { label: 'Corporate Events', href: '#services' },
      ],
    },
    {
      title: 'Spotlights',
      links: [
        { label: 'F1 Staffing', href: 'https://f1.tlcmodels.com' },
        { label: 'FIFA 2026', href: 'https://fifa2026.tlcmodels.com' },
        { label: 'Las Vegas', href: 'https://lasvegas.tlcmodels.com' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '#why-tlc' },
        { label: 'Talent', href: '#talent' },
        { label: 'Cities', href: '#cities' },
        { label: 'FAQ', href: '#faq' },
        { label: 'Contact', href: '#contact' },
      ],
    },
  ];

  return (
    <footer className="pt-20 pb-8 border-t border-white/5" style={{ backgroundColor: COLORS.obsidian }} role="contentinfo">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <span className="font-playfair text-2xl font-bold tracking-wider block mb-4" style={{ color: COLORS.gold }}>
              TLC MODELS
            </span>
            <p className="font-dm text-sm text-white/40 leading-relaxed mb-6 max-w-sm">
              America&#39;s premier event staffing agency. Luxury-tier talent for the world&#39;s most
              prestigious events since 2013.
            </p>
            {/* Contact Info */}
            <div className="space-y-2 mb-6">
              <p className="font-dm text-sm text-white/50">
                <span className="text-white/30">Email:</span>{' '}
                <a href="mailto:info@tlcmodels.com" className="hover:text-[#C9A84C] transition-colors">info@tlcmodels.com</a>
              </p>
              <p className="font-dm text-sm text-white/50">
                <span className="text-white/30">Phone:</span>{' '}
                <a href="tel:+17025551234" className="hover:text-[#C9A84C] transition-colors">(702) 555-1234</a>
              </p>
              <p className="font-dm text-sm text-white/50">
                <span className="text-white/30">HQ:</span> Las Vegas, Nevada
              </p>
            </div>
            {/* Social Links */}
            <div className="flex items-center gap-4">
              {Object.entries(SocialIcons).map(([name, Icon]) => (
                <a
                  key={name}
                  href={`https://${name.toLowerCase()}.com/tlcmodels`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full glass flex items-center justify-center text-white/40 hover:text-[#C9A84C] hover:border-[#C9A84C]/30 transition-all duration-300"
                  aria-label={`TLC Models on ${name}`}
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Nav groups */}
          {navGroups.map((group) => (
            <div key={group.title}>
              <h4 className="font-dm text-sm font-medium text-white/70 uppercase tracking-wider mb-4">{group.title}</h4>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="font-dm text-sm text-white/40 hover:text-[#C9A84C] transition-colors duration-300"
                      {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-dm text-xs text-white/25">
            {currentYear} TLC Models & Talent Agency. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="font-dm text-xs text-white/25 hover:text-white/50 transition-colors">Privacy Policy</a>
            <a href="/terms" className="font-dm text-xs text-white/25 hover:text-white/50 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

/* ------------------------------------------------------------------ */
/*  MAIN PAGE COMPONENT                                                */
/* ------------------------------------------------------------------ */
const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen font-dm" style={{ backgroundColor: COLORS.obsidian, color: COLORS.white }}>
      <GlobalStyles />
      <Navigation />
      <Hero />
      <TrustBar />
      <StatsCounters />
      <ServicesGrid />
      <WhyTLC />
      <F1Spotlight />
      <FIFASpotlight />
      <VegasSpotlight />
      <TalentShowcase />
      <TestimonialsCarousel />
      <HowItWorks />
      <CitiesServed />
      <LeadForm />
      <CalendlyBooking />
      <FAQAccordion />
      <Footer />
    </div>
  );
};

export default HomePage;
