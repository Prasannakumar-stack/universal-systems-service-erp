import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Home as HomeIcon,
  MessageCircle,
  Monitor,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsUp,
  Truck,
  UserCog,
  Users,
  Wrench
} from 'lucide-react';
import { company } from '../utils/constants.js';

const services = [
  {
    title: 'OS Installation & Setup',
    text: 'Clean Windows setup, drivers, activation guidance, updates, and essential software.',
    image: '/images/service-laptop.png'
  },
  {
    title: 'Laptop Repair',
    text: 'Charging, screen, keyboard, heating, slow performance, SSD, RAM, and diagnosis.',
    image: '/images/service-laptop-repair.png'
  },
  {
    title: 'Desktop Service',
    text: 'Boot issues, SMPS, motherboard checks, upgrades, cleaning, and tune-ups.',
    image: '/images/service-desktop.png'
  },
  {
    title: 'Printer Service',
    text: 'Printer not printing, toner support, cartridge help, and office maintenance.',
    image: '/images/service-printer.png'
  },
  {
    title: 'CCTV Installation & Maintenance',
    text: 'Camera setup, DVR checks, cabling support, troubleshooting, and maintenance.',
    image: '/images/service-cctv.png'
  },
  {
    title: 'Networking Solutions',
    text: 'Wi-Fi, LAN, router setup, sharing, office connectivity, and network repair.',
    image: '/images/service-router.png'
  }
];

const steps = [
  { title: 'Book Service', text: 'Share your device issue and preferred time.', icon: BookOpenCheck },
  { title: 'Get Diagnosis / Quote', text: 'We inspect the issue and explain the work clearly.', icon: ClipboardCheck },
  { title: 'Repair / Service', text: 'Technicians complete the service with proper tools.', icon: Wrench },
  { title: 'Get Report + Invoice', text: 'Receive completion notes and transparent billing.', icon: FileText }
];

const serviceOptions = [
  {
    title: 'Onsite Service',
    text: 'Technician visit for homes, shops, offices, and urgent setup needs.',
    icon: HomeIcon
  },
  {
    title: 'Workshop Repair',
    text: 'Detailed diagnosis and repair for devices that need bench work.',
    icon: Wrench
  },
  {
    title: 'Pickup & Delivery',
    text: 'Convenient pickup flow for selected repair and service requests.',
    icon: Truck
  }
];

const commonProblems = [
  'Laptop not turning on',
  'Slow system/performance',
  'Virus/Malware issues',
  'Printer not printing',
  'Wi-Fi/Network problems',
  'CCTV not working'
];

const whyChooseUs = [
  'Quick local response',
  'Transparent pricing',
  'Quality parts & tools',
  'Experienced technicians',
  'Warranty on service',
  'Customer satisfaction focus'
];

const achievements = [
  { value: 5000, suffix: '+', label: 'Happy Customers', icon: Users },
  { value: 9000, suffix: '+', label: 'Devices Repaired', icon: Monitor },
  { value: 15, suffix: '+', label: 'Expert Technicians', icon: UserCog },
  { value: 98, suffix: '%', label: 'Customer Satisfaction', icon: ThumbsUp }
];

const heroStats = [
  { value: '4.8/5', label: 'Customer rating', icon: Star },
  { value: '5000+', label: 'Services completed', icon: Wrench },
  { value: '10+', label: 'Years experience', icon: ShieldCheck },
  { value: 'Warranty', label: 'On repairs', icon: CheckCircle2 },
  { value: '24/7', label: 'Support available', icon: Phone }
];

const testimonials = [
  {
    name: 'Arun Kumar',
    role: 'Laptop repair customer',
    quote: 'Universal Systems quickly diagnosed my laptop issue, explained the cost clearly, and returned it working smoothly.',
    initials: 'AK'
  },
  {
    name: 'Priya S',
    role: 'Office printer service',
    quote: 'The team handled our printer and network issue professionally. The follow-up and billing were very clear.',
    initials: 'PS'
  },
  {
    name: 'Mettur Retail Office',
    role: 'CCTV and networking support',
    quote: 'They set up our cameras and Wi-Fi with neat work. We could understand every step before approving the service.',
    initials: 'MR'
  }
];

function useScrollReveal() {
  useEffect(() => {
    const items = Array.from(document.querySelectorAll('.reveal-on-scroll'));
    if (!items.length) return undefined;

    if (!('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -70px 0px', threshold: 0.12 }
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);
}

function CountNumber({ value, suffix = '' }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setCurrent(value);
      return undefined;
    }

    let frame = 0;
    const start = performance.now();
    const duration = 1300;

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <>
      {Math.round(current).toLocaleString('en-IN')}
      {suffix}
    </>
  );
}

function SectionHeading({ eyebrow, title, text, align = 'left' }) {
  return (
    <div className={`reveal-on-scroll mb-8 ${align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}`}>
      <p className="premium-eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">{title}</h2>
      {text ? <p className="mt-4 text-base leading-7 text-slate-300">{text}</p> : null}
    </div>
  );
}

export default function Home() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useScrollReveal();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveTestimonial((current) => (current + 1) % testimonials.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, []);

  const phoneHref = useMemo(() => `tel:${company.phones[0].replace(/\s/g, '')}`, []);
  const whatsappHref = useMemo(() => `https://wa.me/${company.whatsapp}`, []);
  const activeReview = testimonials[activeTestimonial];

  return (
    <div className="premium-home">
      <section className="premium-hero hero-section relative isolate overflow-hidden">
        <div className="hero-scanline" aria-hidden="true" />
        <div className="premium-hero-grid container-page relative z-10">
          <div className="hero-sequence hero-content max-w-3xl">
            <div className="premium-eyebrow-chip hero-reveal">
              <Sparkles className="h-4 w-4" />
              Premium local technology service
            </div>
            <h1 className="hero-reveal mt-5 max-w-4xl text-4xl font-black leading-[1.02] text-white sm:text-5xl xl:text-7xl">
              Fast, Reliable & Professional Tech Support <span className="hero-trust-emphasis">You Can Trust</span>
            </h1>
            <p className="hero-reveal mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              Computer, laptop, printer, CCTV, and networking service for homes, students, shops, and offices with clear diagnosis, careful repair, and simple booking.
            </p>
            <div className="hero-reveal mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/book-service" className="btn btn-primary btn-xl shine-button w-full sm:w-auto">
                <BookOpenCheck className="h-5 w-5" />
                Book a Service
                <ArrowRight className="btn-arrow h-5 w-5" />
              </Link>
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="btn btn-secondary btn-xl shine-button w-full sm:w-auto">
                <MessageCircle className="h-5 w-5" />
                Contact / WhatsApp
              </a>
            </div>
            <div className="hero-trust-pill hero-reveal mt-4">
              <CheckCircle2 className="h-4 w-4 text-cyan-300" />
              <span>No upfront payment required. Pay only after service confirmation.</span>
            </div>
          </div>

          <div className="hero-stats-bar hero-reveal" aria-label="Universal Systems trust highlights">
            {heroStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div className="hero-stat" key={stat.label}>
                  <Icon className="h-5 w-5" />
                  <span className="hero-stat-value">{stat.value}</span>
                  <span className="hero-stat-label">{stat.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="home-section premium-section-alt">
        <div className="container-page">
          <SectionHeading
            eyebrow="Services"
            title="Expert service for the devices that keep your day moving"
            text="Choose the support you need. Every card leads into the booking flow, so your request is simple and direct."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => {
              return (
                <Link
                  key={service.title}
                  to="/book-service"
                  className="premium-service-card service-card reveal-on-scroll"
                  style={{
                    '--reveal-delay': `${index * 85}ms`,
                    '--card-image': `url(${service.image})`
                  }}
                >
                  <div className="service-card-content">
                    <h3 className="text-xl font-black text-white">{service.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{service.text}</p>
                  </div>
                  <div className="service-card-image-wrap" aria-hidden="true">
                    <img
                      src={service.image}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <ArrowRight className="service-card-arrow h-5 w-5 text-cyan-300" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="home-section premium-section">
        <div className="container-page grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <SectionHeading
              eyebrow="How it works"
              title="A clean four-step flow from booking to invoice"
              text="The service experience is designed to feel clear from the first request to final handover."
            />
            <div className="process-flow">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div className="process-step reveal-on-scroll" key={step.title} style={{ '--reveal-delay': `${index * 95}ms` }}>
                    <div className="process-step-icon">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="process-step-index">0{index + 1}</span>
                    <h3 className="mt-4 text-lg font-black text-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{step.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="reveal-on-scroll">
            <div className="service-options-panel">
              <p className="premium-eyebrow">Service options</p>
              <h3 className="mt-3 text-2xl font-black text-white">Choose the right repair mode</h3>
              <div className="mt-5 grid gap-3">
                {serviceOptions.map(({ title, text, icon: OptionIcon }) => (
                  <div className="option-card" key={title}>
                    <div className="option-content">
                      <h4 className="font-black text-white">{title}</h4>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{text}</p>
                    </div>
                    <div className="option-icon" aria-hidden="true">
                      <OptionIcon className="h-6 w-6" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section premium-section-alt">
        <div className="container-page">
          <SectionHeading
            eyebrow="Common problems"
            title="We solve everyday tech issues before they slow you down"
            align="center"
          />
          <div className="problem-grid">
            {commonProblems.map((problem, index) => (
              <div className="problem-card reveal-on-scroll" key={problem} style={{ '--reveal-delay': `${index * 60}ms` }}>
                <Wrench className="h-5 w-5 text-cyan-300" />
                <span>{problem}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section premium-section">
        <div className="container-page grid items-center gap-8 lg:grid-cols-[1fr_0.85fr]">
          <div className="why-panel-premium reveal-on-scroll">
            <p className="premium-eyebrow">Why choose us</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">Professional repair support with clear communication</h2>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {whyChooseUs.map((item) => (
                <div className="why-check" key={item}>
                  <CheckCircle2 className="h-5 w-5 text-cyan-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="shield-guarantee reveal-on-scroll">
            <div className="shield-badge">
              <ShieldCheck className="h-20 w-20 text-cyan-200" />
              <p className="mt-5 text-5xl font-black text-white">100%</p>
              <h3 className="mt-2 text-2xl font-black text-white">Satisfaction Guarantee</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">Clear diagnosis, careful service, and support after repair.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section premium-section-alt">
        <div className="container-page">
          <SectionHeading eyebrow="Achievements" title="Built on measurable service trust" align="center" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {achievements.map((achievement, index) => {
              const Icon = achievement.icon;
              return (
                <div className="achievement-card reveal-on-scroll" key={achievement.label} style={{ '--reveal-delay': `${index * 80}ms` }}>
                  <div className="premium-icon mx-auto">
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="stat-number mt-5 text-4xl font-black">
                    <CountNumber value={achievement.value} suffix={achievement.suffix} />
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-200">{achievement.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="home-section premium-section">
        <div className="container-page">
          <SectionHeading
            eyebrow="Testimonials"
            title="Customers choose Universal Systems for clarity and reliability"
            align="center"
          />
          <div className="testimonial-slider reveal-on-scroll">
            <div className="testimonial-card-premium">
              <div className="testimonial-avatar">{activeReview.initials}</div>
              <div className="flex justify-center gap-1 text-cyan-300">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mx-auto mt-5 max-w-3xl text-center text-xl font-semibold leading-8 text-white">
                "{activeReview.quote}"
              </p>
              <div className="mt-6 text-center">
                <p className="font-black text-white">{activeReview.name}</p>
                <p className="mt-1 text-sm text-slate-400">{activeReview.role}</p>
              </div>
            </div>
            <div className="slider-dots">
              {testimonials.map((testimonial, index) => (
                <button
                  key={testimonial.name}
                  type="button"
                  className={index === activeTestimonial ? 'active' : ''}
                  onClick={() => setActiveTestimonial(index)}
                  aria-label={`Show testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="home-section premium-section cta-section-compact">
        <div className="container-page">
          <div className="urgent-support-banner reveal-on-scroll">
            <div className="relative z-10 max-w-2xl">
              <p className="premium-eyebrow">Urgent support</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">Need urgent support today?</h2>
              <p className="mt-4 text-base leading-7 text-slate-300">We are just a call away. Our team is ready to help you!</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to="/book-service" className="btn btn-primary btn-xl shine-button w-full sm:w-auto">
                  <BookOpenCheck className="h-5 w-5" />
                  Book a Service
                  <ArrowRight className="btn-arrow h-5 w-5" />
                </Link>
                <a href={phoneHref} className="btn btn-secondary btn-xl shine-button w-full sm:w-auto">
                  <Phone className="h-5 w-5" />
                  Call Now
                </a>
              </div>
            </div>
            <div className="urgent-support-image" aria-hidden="true">
              <img
                src="/technician-hero.png"
                alt=""
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
