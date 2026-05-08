import { Link } from 'react-router-dom';
import { ArrowRight, Camera, Cpu, DatabaseBackup, HardDrive, Laptop, Monitor, Network, Printer, ShieldCheck, Wrench, Zap } from 'lucide-react';

const services = [
  { title: 'OS Installation', icon: Laptop, text: 'Windows setup, drivers, updates, essential software, and clean configuration.' },
  { title: 'Laptop Repair', icon: Monitor, text: 'Screen, keyboard, charging, heating, slow performance, and upgrade support.' },
  { title: 'Desktop Repair', icon: Cpu, text: 'Boot issues, SMPS, RAM, SSD, motherboard checks, cleaning, and tune-ups.' },
  { title: 'Printer Service / Toner Refilling', icon: Printer, text: 'Printer repair, cartridge support, toner refilling, and print quality fixes.' },
  { title: 'Data Recovery', icon: DatabaseBackup, text: 'Recovery support for deleted files, corrupted drives, and damaged storage.' },
  { title: 'Software Issue', icon: ShieldCheck, text: 'Virus cleanup, app errors, driver issues, office software, and system optimization.' },
  { title: 'General Service', icon: Wrench, text: 'Diagnosis, cleaning, maintenance, troubleshooting, and service follow-up.' },
  { title: 'CCTV Installation & Maintenance', icon: Camera, text: 'Secondary support for camera setup, DVR checks, and maintenance.' },
  { title: 'Networking Support', icon: Network, text: 'Router, LAN, sharing, Wi-Fi, and small office connectivity support.' },
  { title: 'UPS / Inverter Support', icon: Zap, text: 'Basic support for backup power issues and device connectivity.' },
  { title: 'AMC / On-site Support', icon: HardDrive, text: 'Maintenance visits and support planning for shops and offices.' }
];

export default function Services() {
  return (
    <div className="section">
      <div className="container-page">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--brand)]">Services</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Repair and service support made easy to book.</h1>
          <p className="mt-4 text-base leading-7 muted">
            Universal Systems mainly focuses on computer repair, laptop and desktop repair, OS installation, printer service, data recovery, software issues, and
            general service booking. Extra technical services are available when needed.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => {
            const Icon = service.icon;
            const secondary = index > 6;
            return (
              <div key={service.title} className="surface card-hover flex flex-col p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="inline-grid h-12 w-12 place-items-center rounded-card bg-[var(--surface-2)] text-[var(--brand)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  {secondary ? <span className="status-badge">Extra</span> : <span className="status-badge">Core</span>}
                </div>
                <h2 className="text-xl font-black">{service.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 muted">{service.text}</p>
                <Link to="/book-service" className="btn btn-primary mt-5">
                  Book Now <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
