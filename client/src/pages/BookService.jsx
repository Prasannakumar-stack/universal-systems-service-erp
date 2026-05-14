import { useMemo, useRef, useState } from 'react';
import { Check, FileImage, ImageUp, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { serviceTypes } from '../utils/constants.js';
import { createBooking } from '../utils/publicApi.js';
import { useToast } from '../context/ToastContext.jsx';

const initial = {
  customerName: '',
  phone: '',
  address: '',
  serviceType: serviceTypes[0] || 'PC / Laptop Service',
  bookingSource: 'Website',
  problemDescription: '',
  preferredDateTime: ''
};

const maxSize = 5 * 1024 * 1024;
const accepted = ['image/jpeg', 'image/png', 'image/webp'];

export default function BookService() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initial);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const { push } = useToast();

  const progress = useMemo(() => Math.round((step / 3) * 100), [step]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validateStep(targetStep = step) {
    if (targetStep === 1) {
      if (!form.customerName.trim() || !form.phone.trim() || !form.address.trim()) {
        push('Customer name, phone, and address are required', 'error');
        return false;
      }
    }
    if (targetStep === 2) {
      if (!form.serviceType.trim() || !form.problemDescription.trim()) {
        push('Service type and problem description are required', 'error');
        return false;
      }
    }
    return true;
  }

  function next() {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(3, current + 1));
  }

  function previous() {
    setStep((current) => Math.max(1, current - 1));
  }

  function chooseFile(file) {
    if (!file) return;
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
    if (!validateStep(1) || !validateStep(2)) return;
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    if (image) data.append('problemImage', image);
    setLoading(true);
    try {
      const result = await createBooking(data);
      push(`Booking saved: ${result.booking.booking_code}`);
      setForm(initial);
      removeImage();
      setStep(1);
    } catch (error) {
      push(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="section">
      <div className="container-page max-w-5xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--brand)]">Book Service</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Service booking in three simple steps.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 muted">
            Request OS installation, repair, printer service, data recovery, software support, or general maintenance.
          </p>
        </div>

        <form className="surface overflow-hidden" onSubmit={submit}>
          <div className="border-b border-[var(--line)] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              {['Customer Details', 'Service Details', 'Review & Upload'].map((label, index) => {
                const active = step === index + 1;
                const done = step > index + 1;
                return (
                  <div key={label} className={`flex items-center gap-2 text-sm font-bold ${active || done ? 'text-[var(--brand)]' : 'muted'}`}>
                    <span className={`grid h-8 w-8 place-items-center rounded-full ${active || done ? 'bg-[var(--brand)] text-white' : 'bg-[var(--surface-2)]'}`}>
                      {done ? <Check className="h-4 w-4" /> : index + 1}
                    </span>
                    {label}
                  </div>
                );
              })}
            </div>
            <div className="h-2 rounded-full bg-[var(--surface-2)]">
              <div className="progress-bar h-2 rounded-full bg-[var(--brand-2)]" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="p-5 sm:p-7">
            {step === 1 ? (
              <div className="grid gap-4 fade-in">
                <label>
                  <span className="label">Customer name</span>
                  <input className="input" value={form.customerName} onChange={(event) => update('customerName', event.target.value)} />
                </label>
                <label>
                  <span className="label">Phone number</span>
                  <input className="input" value={form.phone} onChange={(event) => update('phone', event.target.value)} />
                </label>
                <label>
                  <span className="label">Address</span>
                  <textarea className="input min-h-28" value={form.address} onChange={(event) => update('address', event.target.value)} />
                </label>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-4 fade-in">
                <label>
                  <span className="label">Service type</span>
                  <select className="input" value={form.serviceType} onChange={(event) => update('serviceType', event.target.value)}>
                    {serviceTypes.map((service) => (
                      <option key={service}>{service}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="label">Problem description</span>
                  <textarea className="input min-h-32" value={form.problemDescription} onChange={(event) => update('problemDescription', event.target.value)} />
                </label>
                <label>
                  <span className="label">Preferred date/time optional</span>
                  <input className="input" type="datetime-local" value={form.preferredDateTime} onChange={(event) => update('preferredDateTime', event.target.value)} />
                </label>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid gap-6 fade-in lg:grid-cols-[0.9fr_1.1fr]">
                <div className="review-card">
                  <h2 className="text-xl font-black">Review Summary</h2>
                  <div className="mt-4 grid gap-3 text-sm">
                    {[
                      ['Customer', form.customerName],
                      ['Phone', form.phone],
                      ['Address', form.address],
                      ['Service', form.serviceType],
                      ['Problem', form.problemDescription],
                      ['Preferred', form.preferredDateTime || 'Not specified'],
                      ['Image', image ? image.name : 'No image selected']
                    ].map(([label, value]) => (
                      <div key={label}>
                        <strong className="text-xs font-bold uppercase tracking-wide">{label}</strong>
                        <p className="mt-1 leading-6">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="label">Upload Problem Image / Parts Issue Photo</span>
                  <div
                    className={`upload-box ${dragging ? 'upload-box-active' : ''}`}
                    onClick={() => inputRef.current?.click()}
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
                            className="btn btn-secondary"
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
                        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-card bg-[var(--surface-2)] text-[var(--brand)]">
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
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[var(--line)] p-5 sm:flex-row sm:justify-between">
            <button type="button" className="btn btn-secondary" onClick={previous} disabled={step === 1 || loading}>
              Back
            </button>
            {step < 3 ? (
              <button type="button" className="btn btn-primary" onClick={next}>
                Continue
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookIcon />}
                {loading ? 'Submitting...' : 'Submit Booking'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function BookIcon() {
  return <FileImage className="h-4 w-4" />;
}
