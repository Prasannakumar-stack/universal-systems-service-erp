import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileImage,
  ImageUp,
  LifeBuoy,
  Loader2,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  Wrench
} from 'lucide-react';
import { company, serviceTypes } from '../utils/constants.js';
import { createBooking } from '../utils/publicApi.js';
import { useToast } from '../context/ToastContext.jsx';

const initial = {
  customerName: '',
  phone: '',
  address: '',
  serviceType: '',
  device: '',
  bookingSource: 'Website',
  problemDescription: ''
};

const publicServiceOptions = [
  'OS Installation & Setup',
  'Laptop Repair',
  'Desktop Repair',
  'Printer Service / Toner Refilling',
  'CCTV Installation & Maintenance',
  'Networking Support',
  'Computer Sales & Service',
  'UPS Battery Sales & Replacement',
  'Solar UPS & Inverter Sales & Service',
  'AMC / On-site Support',
  'Software Support',
  'Data Recovery'
];

const bookingServiceOptions = Array.from(new Set([...publicServiceOptions, ...serviceTypes]));

const maxSize = 5 * 1024 * 1024;
const accepted = ['image/jpeg', 'image/png', 'image/webp'];
const totalSteps = 3;
const bookingSteps = ['Customer Details', 'Service Details', 'Review & Upload'];

const trustBadges = [
  { label: 'No upfront payment', icon: ShieldCheck },
  { label: 'Fast response', icon: PhoneCall },
  { label: 'Technician confirmation', icon: ClipboardCheck },
  { label: 'WhatsApp support', icon: MessageCircle }
];

const whatNext = [
  { title: 'Request received', body: 'We get your booking details instantly.', icon: ClipboardCheck },
  { title: 'Quick contact', body: 'We call or WhatsApp you to confirm the issue.', icon: MessageCircle },
  { title: 'Service confirmation', body: 'Technician confirms service, timing, and next steps.', icon: Wrench },
  { title: 'Pay after confirmation', body: 'No upfront payment. Pay only after service confirmation.', icon: CreditCard }
];

function getBookingErrorMessage(error) {
  const message = error?.message?.trim() || '';
  const normalized = message.toLowerCase();

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed') ||
    normalized.includes('network request failed')
  ) {
    return 'Booking could not be submitted. Please check your connection or contact us on WhatsApp.';
  }

  if (!message || normalized === 'request failed' || normalized.includes('internal server') || normalized.includes('server unavailable')) {
    return 'Server is not responding right now. You can still contact us on WhatsApp for urgent support.';
  }

  return message;
}

export default function BookService() {
  const [searchParams] = useSearchParams();
  const requestedService = searchParams.get('service')?.trim() || '';
  const queryServiceType = bookingServiceOptions.includes(requestedService) ? requestedService : '';
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => ({ ...initial, serviceType: queryServiceType }));
  const [fieldErrors, setFieldErrors] = useState({});
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const inputRef = useRef(null);
  const { push } = useToast();

  const progress = useMemo(() => Math.round((step / totalSteps) * 100), [step]);
  const whatsappHref = useMemo(() => `https://wa.me/${company.whatsapp}`, []);

  useEffect(() => {
    if (!queryServiceType) return;
    setForm((current) => (
      current.serviceType === queryServiceType ? current : { ...current, serviceType: queryServiceType }
    ));
    setFieldErrors((current) => {
      if (!current.serviceType) return current;
      const nextErrors = { ...current };
      delete nextErrors.serviceType;
      return nextErrors;
    });
  }, [queryServiceType]);

  function update(field, value) {
    setSubmitError('');
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
    setForm((current) => ({ ...current, [field]: value }));
  }

  function getStepErrors(targetStep) {
    const errors = {};
    if (targetStep === 1) {
      if (form.customerName.trim().length < 2) errors.customerName = 'Customer name must be at least 2 characters.';
      if (!/^\d{10}$/.test(form.phone)) errors.phone = 'Enter a valid 10-digit phone number.';
      if (form.address.trim().length < 5) errors.address = 'Address must be at least 5 characters.';
    }
    if (targetStep === 2) {
      if (!form.serviceType.trim()) errors.serviceType = 'Select a service type.';
      if (!form.device.trim()) errors.device = 'Device is required.';
      if (!form.problemDescription.trim()) errors.problemDescription = 'Issue / problem description is required.';
      if (!form.bookingSource.trim()) errors.bookingSource = 'Booking source is required.';
    }
    return errors;
  }

  function validateStep(targetStep = step) {
    const errors = getStepErrors(targetStep);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      push(Object.values(errors)[0], 'error');
      return false;
    }
    setFieldErrors({});
    return true;
  }

  function validateAll() {
    const stepOneErrors = getStepErrors(1);
    const stepTwoErrors = getStepErrors(2);
    const errors = { ...stepOneErrors, ...stepTwoErrors };
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setStep(Object.keys(stepOneErrors).length ? 1 : 2);
      push(Object.values(errors)[0], 'error');
      return false;
    }
    setFieldErrors({});
    return true;
  }

  function next(event) {
    event?.preventDefault();
    if (loading) return;
    if (step === 1) {
      if (!validateStep(1)) return;
      setSubmitError('');
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!validateStep(2)) return;
      setSubmitError('');
      setStep(3);
      return;
    }
  }

  function previous() {
    setSubmitError('');
    setStep((current) => Math.max(1, current - 1));
  }

  function chooseFile(file) {
    if (!file) return;
    setSubmitError('');
    if (!accepted.includes(file.type)) {
      push('Only JPG, JPEG, PNG, and WEBP images are allowed', 'error');
      return;
    }
    if (file.size > maxSize) {
      push('Image size must be 5 MB or less', 'error');
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  function removeImage() {
    if (preview) URL.revokeObjectURL(preview);
    setImage(null);
    setPreview('');
    if (inputRef.current) inputRef.current.value = '';
  }

  async function submit(event) {
    event.preventDefault();
    if (loading || step !== totalSteps) return;
    if (!validateAll()) return;
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    if (image) data.append('problemImage', image);
    setSubmitError('');
    setLoading(true);
    try {
      await createBooking(data);
      push('Booking request submitted successfully. Our team will contact you shortly.');
      setForm({ ...initial, serviceType: queryServiceType });
      setFieldErrors({});
      removeImage();
      setStep(1);
    } catch (error) {
      console.error('Booking submit failed', error);
      const friendlyMessage = getBookingErrorMessage(error);
      setSubmitError(friendlyMessage);
      push(friendlyMessage, 'error');
    } finally {
      setLoading(false);
    }
  }

  const reviewRows = [
    ['Customer', form.customerName],
    ['Phone', form.phone],
    ['Address', form.address],
    ['Service', form.serviceType],
    ['Device', form.device],
    ['Problem', form.problemDescription],
    ['Image', image ? image.name : 'No image selected']
  ];

  return (
    <div className="booking-page section">
      <div className="container-page booking-container">
        <section className="booking-hero page-hero hero-with-bg public-hero-card public-hero-glass">
          <img
            className="page-hero-bg-image"
            src="/Book%20Service%20Page%20image.png"
            alt="Universal Systems hero"
          />
          <div className="page-hero-overlay" aria-hidden="true" />
          <div className="booking-hero-glow" aria-hidden="true" />
          <div className="page-hero-content booking-hero-content">
            <div className="booking-eyebrow-chip">
              <Sparkles className="h-4 w-4" />
              Book Service
            </div>
            <h1>Service booking in three simple steps.</h1>
            <p>
              Request OS installation, repair, printer service, data recovery, software support, or general maintenance.
            </p>
            <div className="booking-trust-badges" aria-label="Booking trust highlights">
              {trustBadges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <span className="booking-trust-badge" key={badge.label}>
                    <Icon className="h-4 w-4" />
                    {badge.label}
                  </span>
                );
              })}
            </div>
            <div className="booking-trust-pill">
              <CheckCircle2 className="h-4 w-4" />
              <span>No upfront payment required. Pay only after service confirmation.</span>
            </div>
          </div>
        </section>

        <form className="booking-form-card" onSubmit={submit}>
          <div className="booking-stepper-panel">
            <div className="booking-stepper" aria-label="Booking progress">
              {bookingSteps.map((label, index) => {
                const active = step === index + 1;
                const done = step > index + 1;
                const stepClass = done ? 'is-done' : active ? 'is-active' : 'is-upcoming';
                return (
                  <div key={label} className={`booking-step ${stepClass}`}>
                    <span className="booking-step-marker">
                      {done ? <Check className="h-4 w-4" /> : index + 1}
                    </span>
                    <span className="booking-step-copy">
                      <span className="booking-step-kicker">Step {index + 1}</span>
                      <span className="booking-step-label">{label}</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="booking-progress-track" aria-hidden="true">
              <div className="booking-progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="booking-form-body">
            {step === 1 ? (
              <div className="booking-step-panel fade-in">
                <div className="booking-field">
                  <label className="label" htmlFor="booking-customer-name">Customer name</label>
                  <input
                    id="booking-customer-name"
                    className="input"
                    autoComplete="name"
                    aria-invalid={fieldErrors.customerName ? 'true' : 'false'}
                    aria-describedby={fieldErrors.customerName ? 'booking-customer-name-error' : undefined}
                    value={form.customerName}
                    onChange={(event) => update('customerName', event.target.value)}
                    placeholder="Enter your full name"
                  />
                  <FieldError id="booking-customer-name-error" message={fieldErrors.customerName} />
                </div>
                <div className="booking-field">
                  <label className="label" htmlFor="booking-phone">Phone number</label>
                  <input
                    id="booking-phone"
                    className="input"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    autoComplete="tel"
                    aria-invalid={fieldErrors.phone ? 'true' : 'false'}
                    aria-describedby={`booking-phone-help${fieldErrors.phone ? ' booking-phone-error' : ''}`}
                    value={form.phone}
                    onChange={(event) => update('phone', event.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Phone or WhatsApp number"
                  />
                  <span id="booking-phone-help" className="booking-helper">Our team will use this number to confirm your booking.</span>
                  <FieldError id="booking-phone-error" message={fieldErrors.phone} />
                </div>
                <div className="booking-field">
                  <label className="label" htmlFor="booking-address">Address</label>
                  <textarea
                    id="booking-address"
                    className="input min-h-28"
                    autoComplete="street-address"
                    aria-invalid={fieldErrors.address ? 'true' : 'false'}
                    aria-describedby={`booking-address-help${fieldErrors.address ? ' booking-address-error' : ''}`}
                    value={form.address}
                    onChange={(event) => update('address', event.target.value)}
                    placeholder="House/shop name, street, area, city"
                  />
                  <span id="booking-address-help" className="booking-helper">Add enough detail for onsite, pickup, or service coordination.</span>
                  <FieldError id="booking-address-error" message={fieldErrors.address} />
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="booking-step-panel fade-in">
                <div className="booking-field">
                  <label className="label" htmlFor="booking-service-type">Service type</label>
                  <select
                    id="booking-service-type"
                    className="input"
                    aria-invalid={fieldErrors.serviceType ? 'true' : 'false'}
                    aria-describedby={fieldErrors.serviceType ? 'booking-service-type-error' : undefined}
                    value={form.serviceType}
                    onChange={(event) => update('serviceType', event.target.value)}
                  >
                    <option value="">Select service type</option>
                    {bookingServiceOptions.map((service) => (
                      <option key={service} value={service}>{service}</option>
                    ))}
                  </select>
                  <FieldError id="booking-service-type-error" message={fieldErrors.serviceType} />
                </div>
                <div className="booking-field">
                  <label className="label" htmlFor="booking-device">Device</label>
                  <input
                    id="booking-device"
                    className="input"
                    aria-invalid={fieldErrors.device ? 'true' : 'false'}
                    aria-describedby={fieldErrors.device ? 'booking-device-error' : undefined}
                    value={form.device}
                    onChange={(event) => update('device', event.target.value)}
                    placeholder="Laptop, desktop, printer, CCTV, UPS..."
                  />
                  <FieldError id="booking-device-error" message={fieldErrors.device} />
                </div>
                <div className="booking-field">
                  <label className="label" htmlFor="booking-problem">Issue / problem description</label>
                  <textarea
                    id="booking-problem"
                    className="input min-h-32"
                    aria-invalid={fieldErrors.problemDescription ? 'true' : 'false'}
                    aria-describedby={`booking-problem-help${fieldErrors.problemDescription ? ' booking-problem-error' : ''}`}
                    value={form.problemDescription}
                    onChange={(event) => update('problemDescription', event.target.value)}
                    placeholder="Describe the issue briefly"
                  />
                  <span id="booking-problem-help" className="booking-helper">Describe the issue briefly. Our team will confirm details before service.</span>
                  <FieldError id="booking-problem-error" message={fieldErrors.problemDescription} />
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="booking-review-grid fade-in">
                <div className="booking-review-card">
                  <div className="booking-card-heading">
                    <span className="booking-icon-shell">
                      <ClipboardCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <h2>Review Summary</h2>
                      <p>Please review your details before submitting.</p>
                    </div>
                  </div>
                  <div className="booking-review-list">
                    {reviewRows.map(([label, value]) => (
                      <div className="booking-review-row" key={label}>
                        <strong>{label}</strong>
                        <p>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="booking-upload-stack">
                  <div>
                    <span className="label">Upload Problem Image / Parts Issue Photo</span>
                    <p className="booking-helper">Optional: Upload a device/problem photo to help us diagnose faster.</p>
                  </div>
                  <div
                    className={`upload-box booking-upload-box ${dragging ? 'upload-box-active' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => inputRef.current?.click()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        inputRef.current?.click();
                      }
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragging(false);
                      chooseFile(event.dataTransfer.files?.[0]);
                    }}
                  >
                    {preview ? (
                      <div className="w-full fade-in">
                        <img src={preview} alt="Selected issue preview" />
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                          <span className="status-badge">
                            <FileImage className="mr-1.5 h-3.5 w-3.5" />
                            {image.name}
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary booking-remove-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeImage();
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="booking-upload-icon">
                          <UploadCloud className="h-7 w-7" />
                        </div>
                        <p className="font-black">No image selected</p>
                        <p className="mt-2 text-sm muted">JPG, JPEG, PNG, or WEBP up to 5 MB</p>
                        <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--brand)]">
                          <ImageUp className="h-4 w-4" />
                          Choose or drag image
                        </p>
                      </div>
                    )}
                    <input
                      ref={inputRef}
                      className="hidden"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={(event) => chooseFile(event.target.files?.[0])}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {submitError ? (
              <div className="booking-error-panel" role="alert">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <strong>Booking needs attention</strong>
                  <p>{submitError}</p>
                </div>
                <a className="btn btn-secondary booking-error-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Support
                </a>
              </div>
            ) : null}
          </div>

          <div className="booking-form-actions">
            <button type="button" className="btn btn-secondary booking-secondary-action" onClick={previous} disabled={step === 1 || loading}>
              Back
            </button>
            {step < totalSteps ? (
              <button type="button" className="btn btn-primary shine-button booking-primary-action" onClick={next} disabled={loading}>
                Continue
              </button>
            ) : (
              <button type="submit" className="btn btn-primary shine-button booking-primary-action" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookIcon />}
                {loading ? 'Submitting...' : 'Submit Booking'}
              </button>
            )}
          </div>
        </form>

        <section className="booking-next-card">
          <div className="booking-card-heading">
            <span className="booking-icon-shell">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <p className="booking-section-eyebrow">What happens next?</p>
              <h2>Clear confirmation before service starts</h2>
              <p>After you submit the request, our team verifies the details before any work begins.</p>
            </div>
          </div>
          <div className="booking-next-grid">
            {whatNext.map((item, index) => {
              const Icon = item.icon;
              return (
                <div className="booking-next-step" key={item.title}>
                  <div className="booking-next-topline">
                    <span className="booking-next-number">{index + 1}</span>
                    <span className="booking-next-icon">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="booking-next-copy">
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="booking-support-cta">
          <div>
            <p className="booking-section-eyebrow">
              <LifeBuoy className="h-4 w-4" />
              Need urgent help?
            </p>
            <h2>WhatsApp us directly.</h2>
            <p>Our team can guide you to the right service before you submit the form.</p>
          </div>
          <a className="btn btn-secondary booking-whatsapp-action" href={whatsappHref} target="_blank" rel="noreferrer">
            <MessageCircle className="h-4 w-4" />
            WhatsApp Support
          </a>
        </section>
      </div>
    </div>
  );
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <span id={id} className="booking-field-error" role="alert">
      {message}
    </span>
  );
}

function BookIcon() {
  return <FileImage className="h-4 w-4" />;
}
