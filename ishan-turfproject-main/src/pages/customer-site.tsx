import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { sports } from '@/services/public-booking-service'
import { cn, formatCurrency } from '@/lib/utils'
import {
  Menu,
  X,
  Star,
  Trophy,
  CalendarCheck,
  ShieldCheck,
  Zap,
  Phone,
  MapPin,
  Share2,
  Globe2,
  MessageCircle,
  Lightbulb,
  Car,
  ShowerHead,
  Camera,
  Coffee,
  Droplets,
  Dumbbell,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'

const navItems = ['Home', 'About', 'Sports', 'Gallery', 'Pricing', 'Contact']
const heroImage = 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1600&q=85'
const turfImage = 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1600&q=85'
const galleryImages = [
  'https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1486286701208-1d58e9338013?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=900&q=80',
]

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function PublicNavbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={cn('fixed inset-x-0 top-0 z-50 transition-all duration-300', scrolled ? 'border-b border-white/10 bg-[#090909]/80 backdrop-blur-2xl' : 'bg-transparent')}>
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button onClick={() => scrollToId('home')} className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#00C853] shadow-[0_0_35px_rgba(0,200,83,.45)]">
            <Trophy className="h-5 w-5 text-black" />
          </div>
          <div className="text-left">
            <p className="text-lg font-black tracking-tight text-white">Elite Turf</p>
            <p className="text-[11px] uppercase tracking-[.28em] text-[#00C853]">Arena</p>
          </div>
        </button>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <button key={item} onClick={() => scrollToId(item.toLowerCase())} className="rounded-full px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white">
              {item}
            </button>
          ))}
          <Link to="/book" className="rounded-full px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white">Book Turf</Link>
          <Link to="/admin/dashboard" className="rounded-full px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white">Owner</Link>
          <Link to="/login" className="rounded-full px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white">Login</Link>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link to="/book"><Button className="rounded-full bg-[#00C853] px-6 text-black hover:bg-[#22E06F]">Book Now</Button></Link>
        </div>

        <Button variant="ghost" size="icon" className="text-white lg:hidden" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mx-4 mb-4 rounded-3xl border border-white/10 bg-[#111]/95 p-4 shadow-2xl backdrop-blur-xl lg:hidden">
          <div className="grid gap-2">
            {navItems.map((item) => <button key={item} onClick={() => { scrollToId(item.toLowerCase()); setOpen(false) }} className="rounded-2xl px-4 py-3 text-left text-sm text-zinc-200 hover:bg-white/10">{item}</button>)}
            <Link to="/book" className="rounded-2xl px-4 py-3 text-sm text-zinc-200 hover:bg-white/10">Book Turf</Link>
            <Link to="/admin/dashboard" className="rounded-2xl px-4 py-3 text-sm text-zinc-200 hover:bg-white/10">Owner Panel</Link>
            <Link to="/login" className="rounded-2xl px-4 py-3 text-sm text-zinc-200 hover:bg-white/10">Login</Link>
          </div>
        </motion.div>
      )}
    </header>
  )
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mx-auto mb-12 max-w-3xl text-center">
      <Badge className="mb-4 rounded-full border-[#00C853]/30 bg-[#00C853]/10 px-4 py-1 text-[#22E06F]">{eyebrow}</Badge>
      <h2 className="text-3xl font-black tracking-tight text-white sm:text-5xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-zinc-400 sm:text-lg">{text}</p>
    </div>
  )
}

export function CustomerSite() {
  const features = [
    ['Premium Turf', Trophy], ['Professional Lighting', Lightbulb], ['Easy Booking', CalendarCheck], ['Online Payment', ShieldCheck], ['Instant Confirmation', Zap], ['24x7 Support', Phone], ['Affordable Pricing', CheckCircle2], ['Sports Cafe', Coffee],
  ] as const
  const facilities = [
    ['Parking', Car], ['Changing Room', Dumbbell], ['Washroom', ShowerHead], ['Flood Lights', Lightbulb], ['Premium Grass', Trophy], ['Drinking Water', Droplets], ['CCTV', Camera], ['Equipment Rental', ShieldCheck], ['Cafe', Coffee],
  ] as const

  return (
    <main className="min-h-screen overflow-hidden bg-[#090909] text-white">
      <PublicNavbar />

      <section id="home" className="relative flex min-h-screen items-center overflow-hidden pt-20">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Football player on premium turf" className="h-full w-full object-cover opacity-55" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#090909] via-[#090909]/80 to-[#090909]/35" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(0,200,83,.32),transparent_32%)]" />
        </div>
        <motion.div animate={{ y: [0, -14, 0] }} transition={{ duration: 5, repeat: Infinity }} className="absolute right-8 top-32 hidden rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-2xl lg:block">
          <p className="text-2xl font-black text-[#22E06F]">Available Today</p>
          <p className="text-sm text-zinc-300">Prime slots open now</p>
        </motion.div>
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}>
            <Badge className="mb-6 rounded-full border-[#00C853]/30 bg-[#00C853]/10 px-5 py-2 text-[#22E06F]">★★★★★ 4.9 Rated Premium Sports Arena</Badge>
            <h1 className="max-w-4xl text-5xl font-black leading-[.95] tracking-tight text-white sm:text-7xl lg:text-8xl">
              Play Beyond Limits <span className="block text-[#00C853]">Book Your Turf Instantly</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-300 sm:text-xl">Premium Football, Cricket, Volleyball and Multi Sports Arena with Online Booking.</p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link to="/book"><Button size="lg" className="h-14 rounded-full bg-[#00C853] px-8 text-base font-bold text-black hover:bg-[#22E06F]">Book Now <ArrowRight className="ml-2 h-5 w-5" /></Button></Link>
              <Button onClick={() => scrollToId('gallery')} size="lg" variant="outline" className="h-14 rounded-full border-white/15 bg-white/5 px-8 text-base text-white hover:bg-white/10">View Gallery</Button>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {['★★★★★ Rating', '1000+ Happy Players', '10000+ Matches Played', 'Available Today'].map((stat) => (
                <div key={stat} className="rounded-3xl border border-white/10 bg-white/[.06] p-4 backdrop-blur-xl"><p className="text-sm font-semibold text-white">{stat}</p></div>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .8, delay: .15 }} className="hidden lg:block">
            <div className="relative rounded-[2rem] border border-white/10 bg-white/5 p-3 shadow-[0_30px_120px_rgba(0,200,83,.18)] backdrop-blur-xl">
              <img src={turfImage} alt="Premium turf flood lights" className="h-[520px] w-full rounded-[1.5rem] object-cover" />
            </div>
          </motion.div>
        </div>
      </section>

      <section id="sports" className="px-4 py-24 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Sports" title="Choose Your Arena" text="Football, cricket, volleyball, badminton and 8 ball pool booking experiences crafted for fast mobile checkout." />
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 xl:grid-cols-4">
          {sports.slice(0, 4).map((sport, index) => (
            <motion.div key={sport.name} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * .08 }} whileHover={{ y: -8 }}>
              <Card className="overflow-hidden rounded-[1.75rem] border-white/10 bg-[#111] text-white shadow-2xl">
                <div className="relative h-56 overflow-hidden"><img src={sport.image} alt={sport.name} className="h-full w-full object-cover transition duration-700 hover:scale-110" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" /></div>
                <CardContent className="p-6">
                  <h3 className="text-2xl font-black">{sport.name}</h3>
                  <p className="mt-2 min-h-14 text-sm leading-6 text-zinc-400">{sport.description}</p>
                  <div className="mt-5 flex items-center justify-between"><p className="font-bold text-[#22E06F]">{formatCurrency(sport.price)} / {sport.duration}</p><Link to="/book"><Button size="sm" className="rounded-full bg-[#00C853] text-black hover:bg-[#22E06F]">Book</Button></Link></div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="about" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[.06] p-8 backdrop-blur-2xl">
            <Badge className="mb-4 rounded-full bg-[#00C853]/10 text-[#22E06F]">About Owner</Badge>
            <h2 className="text-4xl font-black">Built for serious players and weekend champions.</h2>
            <p className="mt-5 text-zinc-400 leading-7">Our mission is to make sports booking fast, transparent and premium. Every slot, payment and confirmation stays synchronized with the owner dashboard in real time.</p>
            <Link to="/book"><Button className="mt-7 rounded-full bg-[#00C853] text-black hover:bg-[#22E06F]">Reserve Your Slot</Button></Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {facilities.map(([label, Icon]) => <div key={label} className="rounded-3xl border border-white/10 bg-[#111] p-5"><Icon className="mb-4 h-6 w-6 text-[#00C853]" /><p className="font-semibold">{label}</p></div>)}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Why choose us" title="Premium from booking to final whistle" text="A fast, responsive experience that feels polished on every screen." />
        <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([label, Icon]) => <motion.div whileHover={{ y: -6 }} key={label} className="rounded-[1.5rem] border border-white/10 bg-white/[.05] p-6"><Icon className="mb-5 h-7 w-7 text-[#00C853]" /><p className="font-bold">{label}</p></motion.div>)}
        </div>
      </section>

      <section id="gallery" className="px-4 py-20 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Gallery" title="Match-night energy, premium turf finish" text="A polished visual experience inspired by elite sports venues." />
        <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {galleryImages.map((src, index) => <motion.div key={src} initial={{ opacity: 0, scale: .96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: index * .05 }} className="group h-72 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#111]"><img src={src} alt="Turf gallery" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" /></motion.div>)}
        </div>
      </section>

      <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Pricing" title="Simple slot pricing" text="Morning, afternoon, evening, night and weekend-ready pricing cards." />
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3 xl:grid-cols-5">
          {[['Morning Slots', 1200], ['Afternoon Slots', 1500], ['Evening Slots', 2200], ['Night Slots', 2500], ['Weekend Pricing', 2800]].map(([title, price]) => (
            <Card key={title} className="rounded-[1.75rem] border-white/10 bg-[#111] p-6 text-white"><p className="text-sm text-zinc-400">{title}</p><p className="mt-4 text-3xl font-black text-[#22E06F]">{formatCurrency(Number(price))}</p><Link to="/book"><Button className="mt-6 w-full rounded-full bg-white text-black hover:bg-[#22E06F]">Book</Button></Link></Card>
          ))}
        </div>
      </section>

      <section id="contact" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-[#111] p-8"><h2 className="text-4xl font-black">Contact & Visit</h2><p className="mt-4 text-zinc-400">Call, WhatsApp or follow us for offers, tournaments and membership slots.</p><div className="mt-8 space-y-4 text-zinc-300"><p className="flex gap-3"><MapPin className="text-[#00C853]" /> Premium Turf Arena, Mumbai</p><p className="flex gap-3"><Phone className="text-[#00C853]" /> +91 98765 43210</p></div><div className="mt-8 flex flex-wrap gap-3"><Button className="rounded-full bg-[#00C853] text-black"><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp</Button><Button variant="outline" className="rounded-full border-white/15 bg-white/5 text-white"><Share2 className="mr-2 h-4 w-4" /> Instagram</Button><Button variant="outline" className="rounded-full border-white/15 bg-white/5 text-white"><Globe2 className="mr-2 h-4 w-4" /> Facebook</Button></div></div>
          <div className="min-h-[360px] rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(0,200,83,.25),#111_45%)] p-8"><h3 className="text-2xl font-black">FAQ</h3>{['How do I book?', 'Is online payment required?', 'Can I cancel?', 'Are there rules?'].map((q) => <details key={q} className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-3 text-sm text-zinc-400">Use Book Now, choose sport/date/slot, complete Razorpay payment and receive instant confirmation.</p></details>)}</div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-10 text-center text-sm text-zinc-500">© {new Date().getFullYear()} Elite Turf Arena. Premium booking experience powered by Supabase realtime.</footer>
    </main>
  )
}
