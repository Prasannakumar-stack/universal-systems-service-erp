import { Award, Eye, Gem, Mail, MapPin, Phone, Target, Users, Wrench } from 'lucide-react';
import { company } from '../utils/constants.js';

const serviceFocus = [
  'OS installation & setup',
  'Laptop & desktop repair',
  'Printer & toner service',
  'Data recovery',
  'Software support',
  'Networking support',
  'General service booking',
  'On-site follow-up'
];

const principles = [
  { title: 'Mission', icon: Target, text: 'Provide reliable repair and service support with clear communication and fair billing.' },
  { title: 'Vision', icon: Eye, text: 'Be the trusted local service desk for computer and office technology needs in Mettur Dam.' },
  { title: 'Values', icon: Gem, text: 'Care, honesty, practical solutions, customer respect, and long-term service relationships.' }
];

export default function About() {
  return (
    <div className="bg-[linear-gradient(180deg,rgba(3,15,34,0.18),rgba(7,27,52,0.7))]">
      <section className="about-hero">
        <div className="about-container">
          <div className="about-image">
            <img src="/images/about-tech.jpg" alt="Technician repairing computer" />
          </div>

          <div className="about-content">
            <p className="tag">ABOUT UNIVERSAL SYSTEMS</p>

            <h1>Trusted local computer service in Mettur Dam.</h1>

            <p className="desc">
              Universal Systems helps homes, students, shops, and offices keep their devices running smoothly with reliable repair and support.
            </p>

            <div className="about-points">
              <span>&#10003; OS installation & driver setup</span>
              <span>&#10003; Laptop & desktop diagnostics</span>
              <span>&#10003; Printer & office support</span>
              <span>&#10003; Data recovery & networking</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02] py-14 sm:py-16">
        <div className="container-page">
          <div className="mb-7 max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-sky-400">Mission, Vision, Values</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">A service desk built on trust.</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {principles.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="about-principle-card flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition duration-300 hover:-translate-y-1 hover:border-sky-400/30 hover:bg-white/[0.07] hover:shadow-[0_0_25px_rgba(56,189,248,0.15)]"
                >
                  <div className="about-principle-icon mb-5 inline-grid h-12 w-12 place-items-center self-start rounded-xl border border-sky-300/20 bg-sky-400/10 text-sky-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-black text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16 lg:py-20">
        <div className="container-page grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <div className="about-info-card rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_22px_70px_rgba(1,12,28,0.24)]">
            <p className="text-sm font-bold uppercase tracking-wide text-sky-400">Service Focus</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Practical support for daily technology.</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {serviceFocus.map((item) => (
                <div
                  key={item}
                  className="about-service-focus-card flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/30 p-3 text-sm font-bold text-slate-200 transition duration-300 hover:border-sky-400/30 hover:bg-sky-500/10"
                >
                  <Wrench className="h-4 w-4 shrink-0 text-sky-300" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="about-info-card about-contact-card rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_22px_70px_rgba(1,12,28,0.24)]">
            <p className="text-sm font-bold uppercase tracking-wide text-sky-400">Contact Details</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Reach the local team.</h2>
            <div className="mt-6 space-y-5 text-sm">
              <div className="about-contact-row flex gap-3">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-sky-300" />
                <div>
                  <p className="font-bold text-sky-200">Address</p>
                  <p className="mt-1 leading-6 text-slate-400">{company.address}</p>
                </div>
              </div>
              <div className="about-contact-row flex gap-3">
                <Phone className="mt-1 h-5 w-5 shrink-0 text-sky-300" />
                <div>
                  <p className="font-bold text-sky-200">Phone</p>
                  <a className="about-phone-link mt-1 block text-slate-400" href={`tel:${company.phones[0].replace(/\s/g, '')}`}>
                    {company.phones.join(' / ')}
                  </a>
                  <p className="mt-1 text-slate-400">Landline: {company.landline}</p>
                </div>
              </div>
              <div className="about-contact-row flex gap-3">
                <Mail className="mt-1 h-5 w-5 shrink-0 text-sky-300" />
                <div>
                  <p className="font-bold text-sky-200">Email</p>
                  <a className="about-email-link mt-1 block text-slate-400" href={`mailto:${company.email}`}>
                    {company.email}
                  </a>
                </div>
              </div>
            </div>

            <div className="about-whatsapp-highlight mt-6 flex gap-3 rounded-xl border border-sky-300/15 bg-sky-400/10 p-4">
              <Users className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
              <p className="text-sm font-semibold leading-6 text-slate-200">Local staff, direct follow-up, and practical service records.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-14 sm:pb-16 lg:pb-20">
        <div className="container-page">
          <div className="about-care-card rounded-2xl border border-white/10 bg-gradient-to-r from-sky-500/10 to-blue-600/10 p-6">
            <div className="flex gap-4">
              <Award className="mt-1 h-7 w-7 shrink-0 text-sky-300" />
              <div>
                <h2 className="text-2xl font-semibold text-white">We care for your career</h2>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
                  The tagline reflects the company's role in keeping computers, printers, and office systems available for students, staff, businesses, and professionals who depend on working technology every day.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
