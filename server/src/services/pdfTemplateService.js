import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import PdfTemplate from '../models/PdfTemplate.js';
import { COMPANY, LOGO_FULL_PATH, LOGO_ICON_PATH, PDF_DIR } from '../config.js';
import { hasRole } from '../permissions.js';
import { appError, clean } from '../utils/http.js';
import { logAudit } from './auditService.js';
import { getCompanyIdentity } from './companyProfileService.js';
import { getBusinessSettings } from './businessSettingsService.js';
import {
  renderAmcContractPdf,
  renderAmcRenewalPdf,
  renderAmcServiceVisitPdf,
  sampleAmcContractData,
  sampleAmcRenewalData,
  sampleAmcVisitData
} from './amcPdfTemplates.js';
import { renderInvoicePdf, sampleInvoiceData } from './invoicePdfTemplate.js';
import { renderQuotationPdf, sampleQuotationData } from './quotationPdfTemplate.js';
import { renderServiceCompletedPdf, sampleServiceCompletedData } from './serviceCompletedPdfTemplate.js';
import { buildPdfTemplateManifest } from './pdfTemplateManifestService.js';
import { renderInvoiceDraftDomPreviewPdf, renderInvoicePublishedDomPdf } from './pdfTemplateDomPreviewService.js';

export const PDF_TEMPLATE_PLACEHOLDERS = [
  '{{company_name}}',
  '{{company_phone}}',
  '{{company_email}}',
  '{{company_address}}',
  '{{customer_name}}',
  '{{customer_phone}}',
  '{{customer_address}}',
  '{{invoice_no}}',
  '{{invoice_number}}',
  '{{invoice_date}}',
  '{{quotation_no}}',
  '{{quotation_number}}',
  '{{quotation_date}}',
  '{{work_order_no}}',
  '{{work_order_id}}',
  '{{amc_contract_no}}',
  '{{amc_reference}}',
  '{{service_name}}',
  '{{service_type}}',
  '{{device}}',
  '{{brand_model}}',
  '{{problem_complaint}}',
  '{{technician_name}}',
  '{{total_amount}}',
  '{{final_total}}',
  '{{amount_paid}}',
  '{{balance_due}}',
  '{{amount_in_words}}',
  '{{item_index}}',
  '{{item_description}}',
  '{{item_quantity}}',
  '{{item_unit_price}}',
  '{{item_total}}',
  '{{quotation_status}}',
  '{{amc_status}}',
  '{{visit_status}}',
  '{{renewal_status}}',
  '{{plan_name}}',
  '{{coverage_type}}',
  '{{covered_for}}',
  '{{renewal_period}}',
  '{{technician_notes}}',
  '{{footer_text}}',
  '{{amc_start_date}}',
  '{{amc_end_date}}',
  '{{next_service_date}}',
  '{{current_date}}'
];

const MAX_INVOICE_PUBLISHED_HTML_BYTES = 4_500_000;
const INVOICE_CANVAS_WIDTH = 595;
const INVOICE_CANVAS_HEIGHT = 842;

const textFields = [
  'headerTitle',
  'footerText',
  'termsAndConditions',
  'paymentBankDetails',
  'signatureSection',
  'notesWarrantyText',
  'amcTerms'
];

const advancedSectionTypes = new Set([
  'text',
  'card',
  'info',
  'notice',
  'warranty',
  'terms',
  'payment',
  'bank',
  'signature',
  'qr',
  'customer-message',
  'custom-field',
  'spacer',
  'divider',
  'image',
  'table',
  'icon'
]);

const cardWidths = new Set(['full', 'half', 'third', 'two-thirds', 'auto']);
const borderStyles = new Set(['default', 'thin', 'none', 'highlight']);

export const PDF_TEMPLATE_DEFINITIONS = [
  {
    key: 'invoice',
    category: 'service',
    name: 'Invoice PDF',
    description: 'Invoice and payment PDF template for completed service jobs.',
    defaults: {
      headerTitle: 'INVOICE',
      showCompanyLogo: true,
      showCompanyDetails: true,
      showTechnician: true,
      footerText: 'Thank you for your business. We look forward to serving you again.',
      termsAndConditions: 'Payment is required before delivery or as per company policy.\nWarranty, if applicable, covers only the parts or services mentioned in this invoice.\nProducts once delivered should be checked and verified by the customer.\nAdditional work or parts not mentioned in this invoice will be charged separately.',
      paymentBankDetails: '',
      signatureSection: '',
      notesWarrantyText: '',
      amcTerms: '',
      colorAccent: '#0f2a52'
    }
  },
  {
    key: 'quotation',
    category: 'service',
    name: 'Quotation / Estimate PDF',
    description: 'Estimate template used before a customer approves service work.',
    defaults: {
      headerTitle: 'QUOTATION',
      showCompanyLogo: true,
      showCompanyDetails: true,
      showTechnician: true,
      showSerialNumber: false,
      footerText: 'We appreciate your trust in Universal Systems. We are always here to help!',
      termsAndConditions: '1. This quotation is not an invoice; it is only an estimate for the mentioned goods/services.\n2. This quotation is valid for 7 days from the quotation date.\n3. Work will start only after customer approval.\n4. Payment is required before delivery or as per company policy.\n5. Final price may change if additional faults, parts, or services are found.\n6. Warranty, if applicable, covers only the parts or services mentioned in this quotation.',
      paymentBankDetails: '',
      signatureSection: 'Prepared By',
      notesWarrantyText: '',
      amcTerms: '',
      colorAccent: '#0f2a52'
    }
  },
  {
    key: 'service-completed',
    category: 'service',
    name: 'Thank You / Service Completed PDF',
    description: 'Simple thank-you PDF issued after a service is completed.',
    defaults: {
      headerTitle: 'SERVICE COMPLETED!',
      showCompanyLogo: true,
      showCompanyDetails: true,
      footerText: 'We appreciate your business. Visit us again!',
      termsAndConditions: '',
      paymentBankDetails: '',
      signatureSection: '',
      notesWarrantyText: '',
      amcTerms: '',
      colorAccent: '#0f2a52'
    }
  },
  {
    key: 'amc-contract',
    category: 'amc',
    name: 'AMC Contract PDF',
    description: 'AMC contract template with period, coverage, and value details.',
    defaults: {
      headerTitle: 'AMC CONTRACT',
      showCompanyLogo: true,
      showCompanyDetails: true,
      showTechnician: true,
      showSerialNumber: false,
      footerText: 'Thank you for choosing Universal Systems AMC support.',
      termsAndConditions: '',
      paymentBankDetails: '',
      signatureSection: '',
      notesWarrantyText: '',
      amcTerms: '',
      colorAccent: '#0f2a52'
    }
  },
  {
    key: 'amc-service-visit',
    category: 'amc',
    name: 'AMC Visit / Service Report PDF',
    description: 'AMC service visit report template for completed visits.',
    defaults: {
      headerTitle: 'AMC SERVICE VISIT REPORT',
      showCompanyLogo: true,
      showCompanyDetails: true,
      showTechnician: true,
      showAdditionalCharges: true,
      footerText: 'Thank you for choosing Universal Systems AMC support.',
      termsAndConditions: '',
      paymentBankDetails: '',
      signatureSection: '',
      notesWarrantyText: '',
      amcTerms: '',
      colorAccent: '#0f2a52'
    }
  },
  {
    key: 'amc-renewal-reminder',
    category: 'amc',
    name: 'AMC Renewal / Expiry Reminder PDF',
    description: 'Renewal reminder template for expiring AMC contracts.',
    defaults: {
      headerTitle: 'AMC RENEWAL REMINDER',
      showCompanyLogo: true,
      showCompanyDetails: true,
      showRenewalAmount: true,
      footerText: 'We value your trust. Stay connected for the best service!',
      termsAndConditions: '',
      paymentBankDetails: '',
      signatureSection: '',
      notesWarrantyText: '',
      amcTerms: '',
      colorAccent: '#0f2a52'
    }
  }
];

const definitionsByKey = new Map(PDF_TEMPLATE_DEFINITIONS.map((definition) => [definition.key, definition]));
const CURRENT_LAYOUT_REPAIR_KEYS = new Set([
  'quotation',
  'service-completed',
  'amc-contract',
  'amc-service-visit',
  'amc-renewal-reminder'
]);
const HELPER_LABELS = new Set([
  'Divider',
  'dot',
  'phone',
  'address',
  'shield',
  'handshake',
  'Icon',
  'Image / Logo',
  'Locked'
]);
const helperLabelPattern = />\s*(Divider|dot|phone|address|shield|handshake|Icon|Image \/ Logo|Locked)\s*</g;
const helperNodePattern = /<[^>]+class=(["'])[^"']*(?:pdf-element-lock|pdf-element-grip|pdf-resize-handle|pdf-element-hit-area|pdf-page-break-guide|canvas-debug-label|design-helper|pdf-builder-helper)[^"']*\1[^>]*>[\s\S]*?<\/[^>]+>/gi;
const designPrefixByKey = {
  quotation: 'quotation',
  'service-completed': 'service-completed',
  'amc-contract': 'amc-contract',
  'amc-service-visit': 'amc-service-visit',
  'amc-renewal-reminder': 'amc-renewal-reminder'
};
let cachedLogoFullDataUri = '';
let cachedLogoIconDataUri = '';

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function deepMerge(base = {}, source = {}) {
  const next = clonePlain(base);
  Object.entries(source || {}).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(next[key])) {
      next[key] = deepMerge(next[key], value);
      return;
    }
    next[key] = Array.isArray(value) ? value.slice() : value;
  });
  return next;
}

function boolValue(value, fallback = true) {
  return typeof value === 'boolean' ? value : fallback;
}

function stringList(value = [], fallback = []) {
  const source = Array.isArray(value) ? value : String(value || '').split('\n');
  const rows = source.map((item) => cleanText(item, '', 800).trim()).filter(Boolean);
  return rows.length ? rows.slice(0, 12) : fallback.slice();
}

function termsList(value = '', fallback = []) {
  return stringList(value, fallback).map((line) => line.replace(/^[-*\u2022]?\s*\d*\.?\s*/, '').trim()).filter(Boolean);
}

function commonStructuredConfig(key, flat = {}) {
  const accentColor = flat.colorAccent || defaultConfigFor(key).colorAccent || '#0f2a52';
  return {
    layoutVersion: 5,
    editMode: 'structured',
    advancedEnabled: false,
    header: {
      showLogo: flat.showCompanyLogo !== false,
      showCompanyDetails: flat.showCompanyDetails !== false,
      title: flat.headerTitle || defaultConfigFor(key).headerTitle || '',
      accentColor
    },
    footer: {
      showCallWhatsapp: true,
      showEmail: true,
      showWebsite: true,
      showAddress: true,
      thankYouMessage: flat.footerText || defaultConfigFor(key).footerText || ''
    },
    pageBreaks: {
      repeatTableHeader: true,
      keepAmountSummaryTogether: true,
      keepWorkNoticeTogether: true,
      keepTermsTogether: true,
      keepFooterAtBottom: true,
      showPageNumbers: true
    },
    pageSettings: {
      preferOnePage: true,
      safePagination: true,
      avoidFooterOverlap: true,
      repeatTableHeader: true
    },
    structured: {
      mode: 'structured',
      useCurrentDefaultLayout: true,
      advancedPanelOpen: false,
      customSectionsEnabled: false,
      allowDragDrop: false,
      twoColumnCards: false,
      customCardWidthEnabled: false,
      customColorsEnabled: false,
      qrPaymentCardEnabled: false,
      signatureCardEnabled: false,
      designModeEnabled: false,
      defaultCardWidth: 'full',
      borderStyle: 'default',
      qrPaymentCard: {
        title: 'Payment Details',
        note: '',
        upiText: '',
        qrValue: ''
      },
      signatureCard: {
        title: 'Authorized Signature',
        personName: '',
        designation: '',
        imageUrl: ''
      },
      customSections: []
    },
      design: {
        enabled: false,
        confirmed: false,
        mode: 'legacy',
        published: false,
        previewDraft: false,
        baseTemplateVersion: 1,
        overrides: {},
        lockedDefaultSections: true,
        canvas: {
          size: 'A4',
          orientation: 'portrait',
          zoom: 'fit',
          gridSize: 8,
          snap: true
        },
        gridEnabled: false,
        layoutGuides: false,
        visualElementMode: true,
        snapToGrid: true,
        page: {
          size: 'A4',
          orientation: 'portrait',
        margin: 28,
        backgroundColor: '#ffffff'
      },
      colors: {
        accentColor,
        cardBackground: '#ffffff',
        textColor: '#0f172a',
          borderColor: '#d8e5f7',
          noticeBackground: '#f1f7ff'
        },
        pages: [{ id: 'page-1', name: 'Page 1', elements: [] }],
        sections: [],
        elements: [],
        customElements: []
      },
    sections: {}
  };
}

function structuredDefaultsFor(key) {
  const flat = defaultConfigFor(key);
  const config = commonStructuredConfig(key, flat);
  if (key === 'invoice') {
    config.sections = {
      invoiceDetails: {
        showInvoiceNumber: true,
        showJobReference: true,
        showInvoiceDate: true,
        showPaymentStatus: true
      },
      customerDetails: {
        showCustomerName: true,
        showPhoneNumber: true,
        showAddress: true
      },
      serviceDetails: {
        showServiceType: true,
        showDevice: true,
        showBrandModel: true,
        showProblemComplaint: true,
        showTechnician: flat.showTechnician !== false
      },
      itemTable: {
        labels: {
          sno: 'S.No.',
          description: 'Description',
          quantity: 'Qty',
          unitPrice: 'Unit Price (\u20b9)',
          total: 'Total (\u20b9)',
          tax: 'Tax (\u20b9)'
        },
        showSno: true,
        showQuantity: true,
        showUnitPrice: true,
        showTotal: true,
        showTaxColumn: false
      },
      amountSummary: {
        showAmountInWords: true,
        showSubtotal: true,
        showFinalTotal: true,
        showAmountPaid: true,
        showBalanceDue: true
      },
      workCompletionNotice: {
        show: true,
        title: 'WORK COMPLETION NOTICE',
        messageLines: [
          'Service completed successfully.',
          'You may visit our store to collect your product or arrange for delivery as per your convenience.'
        ]
      },
      terms: {
        show: true,
        title: 'TERMS & CONDITIONS',
        text: flat.termsAndConditions || ''
      }
    };
  } else if (key === 'quotation') {
    config.sections = {
      quotationDetails: {
        showJobReference: true,
        showQuotationDate: true,
        showQuotationStatus: true
      },
      customerDetails: {
        showCustomerName: true,
        showPhoneNumber: true,
        showAddress: true
      },
      serviceDeviceDetails: {
        showServiceType: true,
        showDevice: true,
        showBrandModel: true,
        showTechnician: flat.showTechnician !== false,
        showSerialNumber: flat.showSerialNumber === true
      },
      problemComplaint: {
        show: true,
        label: 'Problem / Complaint'
      },
      itemTable: {
        labels: {
          sno: 'S.No',
          description: 'Description',
          quantity: 'Qty',
          unitPrice: 'Unit Price (\u20b9)',
          total: 'Total (\u20b9)',
          tax: 'Tax (\u20b9)'
        },
        showSno: true,
        showQuantity: true,
        showUnitPrice: true,
        showTotal: true,
        showTaxColumn: false
      },
      totalSummary: {
        show: true,
        showSubtotal: true,
        showTax: true,
        showFinalTotal: true
      },
      validityNote: {
        show: true,
        text: 'This quotation is valid for 7 days from the quotation date.'
      },
      whatsappApprovalMessage: {
        show: true,
        title: 'READY TO PROCEED?',
        messageLines: [
          'Please review this quotation carefully.',
          'To continue with the service, tap "Approve Quotation" in WhatsApp.',
          'For any questions or changes, contact us before approval.'
        ]
      },
      terms: {
        show: true,
        title: 'TERMS & CONDITIONS',
        text: flat.termsAndConditions || ''
      }
    };
  } else if (key === 'service-completed') {
    config.sections = {
      customerDetails: { show: true, showCustomerName: true },
      serviceSummary: { show: true, title: 'SERVICE COMPLETED!' },
      whatWeDid: {
        show: true,
        messageLines: [
          'Thank you for choosing Universal Systems.',
          'We are delighted to have successfully completed your service and handed over your product.',
          'Your trust and support mean a lot to us.',
          'We look forward to serving you again in the future.',
          'If you need any assistance or service, feel free to contact us anytime.'
        ]
      },
      supportMessage: {
        show: true,
        highlightLines: [
          'Your satisfaction is our priority',
          'Quality service you can trust',
          'We are always here to help'
        ],
        amcTitle: 'Need regular service support?',
        amcText: 'Universal Systems also provides AMC plans for regular maintenance and priority service.',
        amcFinalLine: 'Contact us anytime to know more.'
      },
      terms: { show: false, title: 'TERMS', text: flat.termsAndConditions || '' },
      thankYouFooter: { show: true, contactLabel: 'Contact' }
    };
  } else if (key === 'amc-contract') {
    config.sections = {
      customerDetails: { showCustomerName: true, showPhoneNumber: true, showAddress: true },
      amcPeriod: { showAmcReference: true, showContractDate: true, showAmcPeriod: true, showStatus: true },
      coveredDevices: { show: true, showCoveredFor: true, showSerialNumber: flat.showSerialNumber === true },
      visitFrequency: { show: true, showPlanName: true, showCoverageType: true, showTechnician: flat.showTechnician !== false },
      paymentDetails: { show: true, showContractValue: true, showPaymentStatus: true },
      amcTerms: { show: true, text: flat.amcTerms || flat.termsAndConditions || '' },
      signature: { show: Boolean(flat.signatureSection), label: flat.signatureSection || 'Authorized Signature' }
    };
  } else if (key === 'amc-service-visit') {
    config.sections = {
      visitDetails: {
        showAmcReference: true,
        showVisitDate: true,
        showVisitStatus: true,
        showNextVisitDate: true,
        showJobReference: true
      },
      customerDetails: { showCustomerName: true, showPhoneNumber: true, showAddress: true },
      deviceChecked: { show: true, showPlanName: true, showAmcPeriod: true, showCoveredFor: true, showTechnician: flat.showTechnician !== false },
      workCompleted: { show: true },
      partsUsed: { show: flat.showAdditionalCharges !== false },
      nextVisitNote: { show: true },
      customerAcknowledgement: { show: false, text: flat.signatureSection || '' }
    };
  } else if (key === 'amc-renewal-reminder') {
    config.sections = {
      customerDetails: { showCustomerName: true, showPhoneNumber: true, showAddress: true },
      amcExpiryDetails: {
        showAmcReference: true,
        showReminderDate: true,
        showExpiryDate: true,
        showRenewalStatus: true
      },
      renewalMessage: { show: true, title: 'YOUR AMC PLAN IS EXPIRING SOON!' },
      planDetails: { showPlanName: true, showCurrentPeriod: true, showRenewalPeriod: true, showCoveredFor: true },
      renewalAmount: { show: flat.showRenewalAmount !== false },
      contactWhatsappMessage: {
        show: true,
        title: 'READY TO RENEW?',
        text: 'To continue AMC support, contact Universal Systems or confirm renewal through WhatsApp.',
        finalLine: 'Thank you for choosing Universal Systems AMC support.'
      }
    };
  }
  return config;
}

function legacyStructuredOverrides(payload = {}, key = '') {
  const overrides = {};
  if (!payload || !isPlainObject(payload)) return overrides;
  if ('headerTitle' in payload || 'showCompanyLogo' in payload || 'showCompanyDetails' in payload || 'colorAccent' in payload) {
    overrides.header = {
      title: payload.headerTitle,
      showLogo: payload.showCompanyLogo,
      showCompanyDetails: payload.showCompanyDetails,
      accentColor: payload.colorAccent
    };
  }
  if ('footerText' in payload) {
    overrides.footer = { thankYouMessage: payload.footerText };
  }
  if ('termsAndConditions' in payload) {
    overrides.sections = { terms: { text: payload.termsAndConditions } };
  }
  if ('showTechnician' in payload) {
    overrides.sections = overrides.sections || {};
    if (key === 'invoice') overrides.sections.serviceDetails = { showTechnician: payload.showTechnician };
    if (key === 'quotation') overrides.sections.serviceDeviceDetails = { showTechnician: payload.showTechnician };
    if (key === 'amc-contract') overrides.sections.visitFrequency = { showTechnician: payload.showTechnician };
    if (key === 'amc-service-visit') overrides.sections.deviceChecked = { showTechnician: payload.showTechnician };
  }
  if ('showSerialNumber' in payload) {
    overrides.sections = overrides.sections || {};
    if (key === 'quotation') overrides.sections.serviceDeviceDetails = { ...(overrides.sections.serviceDeviceDetails || {}), showSerialNumber: payload.showSerialNumber };
    if (key === 'amc-contract') overrides.sections.coveredDevices = { showSerialNumber: payload.showSerialNumber };
  }
  if ('showAdditionalCharges' in payload && key === 'amc-service-visit') {
    overrides.sections = overrides.sections || {};
    overrides.sections.partsUsed = { show: payload.showAdditionalCharges };
  }
  if ('showRenewalAmount' in payload && key === 'amc-renewal-reminder') {
    overrides.sections = overrides.sections || {};
    overrides.sections.renewalAmount = { show: payload.showRenewalAmount };
  }
  if ('amcTerms' in payload && key === 'amc-contract') {
    overrides.sections = overrides.sections || {};
    overrides.sections.amcTerms = { text: payload.amcTerms };
  }
  if ('signatureSection' in payload && key === 'amc-contract') {
    overrides.sections = overrides.sections || {};
    overrides.sections.signature = { label: payload.signatureSection, show: Boolean(payload.signatureSection) };
  }
  if (key === 'amc-contract' && isPlainObject(payload.sections?.amcPeriod)) {
    overrides.sections = overrides.sections || {};
    overrides.sections.amcPeriod = {
      showAmcReference: payload.sections.amcPeriod.showAmcReference ?? payload.sections.amcPeriod.showReference,
      showAmcPeriod: payload.sections.amcPeriod.showAmcPeriod ?? payload.sections.amcPeriod.showPeriod
    };
  }
  return overrides;
}

function sanitizeStrings(value) {
  if (Array.isArray(value)) return value.map((item) => sanitizeStrings(item));
  if (isPlainObject(value)) {
    return Object.entries(value).reduce((next, [key, item]) => {
      next[key] = sanitizeStrings(item);
      return next;
    }, {});
  }
  if (typeof value === 'string') return cleanText(value, '', 5000);
  return value;
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function sanitizeAdvancedSection(section = {}, index = 0) {
  const type = advancedSectionTypes.has(section.type) ? section.type : 'text';
  const fallbackTitle = type === 'qr'
    ? 'QR / Payment Card'
    : type === 'spacer'
      ? 'Divider'
      : type.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  const width = cardWidths.has(section.width) ? section.width : 'full';
  return {
    id: clean(section.id || `custom-section-${index + 1}`).replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || `custom-section-${index + 1}`,
    type,
    enabled: boolValue(section.enabled, true),
    title: cleanText(section.title, fallbackTitle, 120),
    content: cleanText(section.content, '', 5000),
    variable: cleanText(section.variable, '', 120),
    width,
    minHeight: clampNumber(section.minHeight, type === 'spacer' ? 24 : 74, 8, 260),
    backgroundColor: sanitizeColor(section.backgroundColor, type === 'notice' ? '#f1f7ff' : '#ffffff'),
    textColor: sanitizeColor(section.textColor, '#0f172a'),
    borderColor: sanitizeColor(section.borderColor, '#d8e5f7'),
    accentColor: sanitizeColor(section.accentColor, '#0f2a52'),
    locked: false
  };
}

function normalizeDesignElementType(type = 'text') {
  const normalized = clean(type || 'text');
  if (normalized === 'info' || normalized === 'notice' || normalized === 'custom-field') return 'card';
  if (normalized === 'bank' || normalized === 'payment' || normalized === 'customer-message') return 'card';
  if (normalized === 'warranty' || normalized === 'terms') return 'card';
  if (normalized === 'line') return 'divider';
  if (normalized === 'rectangle' || normalized === 'shape') return 'card';
  return advancedSectionTypes.has(normalized) ? normalized : 'text';
}

const currentLayoutDesignPrefixes = [
  'invoice',
  'quotation',
  'service-completed',
  'servicecompleted',
  'amc-contract',
  'amccontract',
  'amc-service-visit',
  'amcservicevisit',
  'amc-renewal-reminder',
  'amcrenewalreminder'
];

function isCurrentLayoutDesignElement(element = {}) {
  if (
    element.manifestSource === 'current-pdf-layout'
    || element.manifest?.source === 'current-pdf-layout'
    || element.designGenerated === true
  ) {
    return true;
  }
  return [
    element.id,
    element.sourceKey,
    element.manifestSemanticId,
    element.manifest?.semanticId
  ].some((value) => {
    const text = String(value || '');
    const compact = text.replace(/[^a-z0-9]/gi, '').toLowerCase();
    return currentLayoutDesignPrefixes.some((prefix) => (
      text.startsWith(`${prefix}.`) || compact.startsWith(prefix.replace(/[^a-z0-9]/gi, ''))
    ));
  });
}

function sanitizeDesignColor(value, fallback = '#0f2a52') {
  const text = clean(value || '');
  if (text.toLowerCase() === 'transparent') return 'transparent';
  return sanitizeColor(text || fallback, fallback);
}

const vectorIconNameAliases = {
  'badge-check': 'completion',
  'check-badge': 'completion',
  'check-circle': 'check',
  'circle-check': 'check',
  calendar: 'date',
  mail: 'email',
  file: 'document',
  'file-text': 'document',
  clipboard: 'work',
  'clipboard-check': 'work',
  credit: 'status',
  'credit-card': 'status',
  map: 'address',
  'map-pin': 'address',
  location: 'address',
  globe: 'website',
  web: 'website',
  message: 'whatsapp',
  support: 'headset'
};

function normalizeVectorIconName(value = '') {
  const normalized = String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  return vectorIconNameAliases[normalized] || normalized;
}

function sanitizeDesignContent(type = 'text', content = {}, element = {}) {
  const currentLayoutElement = isCurrentLayoutDesignElement(element);
  const source = isPlainObject(content) ? content : { text: cleanText(content, '', 5000) };
  const common = {
    kind: cleanText(source.kind, type === 'section' ? 'details' : type, 80),
    label: cleanText(currentLayoutElement ? source.label : source.label ?? element.label, '', 160),
    title: cleanText(currentLayoutElement ? source.title : source.title ?? element.title, '', 160),
    body: cleanText(currentLayoutElement ? source.body : source.body ?? element.body, '', 5000),
    text: cleanText(currentLayoutElement ? source.text : source.text ?? (typeof element.content === 'string' ? element.content : ''), '', 5000),
    helperText: cleanText(currentLayoutElement ? source.helperText : source.helperText ?? element.helperText, '', 1000),
    name: cleanText(source.name ?? element.personName, '', 160),
    designation: cleanText(source.designation, '', 160),
    iconName: cleanText(source.iconName ?? element.iconName, '', 80),
    iconDisplay: ['vector', 'emoji'].includes(source.iconDisplay || source.iconMode || element.iconDisplay || element.iconMode) ? (source.iconDisplay || source.iconMode || element.iconDisplay || element.iconMode) : 'vector',
    iconMode: ['vector', 'emoji'].includes(source.iconMode || source.iconDisplay || element.iconMode || element.iconDisplay) ? (source.iconMode || source.iconDisplay || element.iconMode || element.iconDisplay) : 'vector',
    emoji: cleanText(source.emoji ?? element.emoji, '✅', 16),
    variant: cleanText(source.variant ?? element.variant, '', 80),
    qrType: ['payment', 'contact', 'company', 'custom'].includes(source.qrType || element.qrType) ? (source.qrType || element.qrType) : 'payment',
    imageMode: ['logo', 'placeholder', 'custom', 'watermark'].includes(source.imageMode || element.imageMode) ? (source.imageMode || element.imageMode) : 'logo',
    objectFit: ['contain', 'cover', 'fill'].includes(source.objectFit || element.objectFit) ? (source.objectFit || element.objectFit) : 'contain',
    assetPath: cleanText(source.assetPath ?? element.assetPath, '', 500),
    imageUrl: cleanText(source.imageUrl ?? element.imageUrl, '', 500),
    src: cleanText(source.src ?? element.src, '', 500),
    fitToFrame: boolValue(source.fitToFrame ?? element.fitToFrame, true),
    backgroundElement: boolValue(source.backgroundElement ?? element.backgroundElement, false),
    boxOnly: boolValue(source.boxOnly ?? element.boxOnly, false),
    renderLabel: boolValue(source.renderLabel ?? element.renderLabel, false),
    twoColumn: boolValue(source.twoColumn ?? element.twoColumn, false),
    columns: Array.isArray(source.columns) ? source.columns.map((item) => cleanText(item, '', 80)).slice(0, 8) : [],
    columnWidths: Array.isArray(source.columnWidths) ? source.columnWidths.map((item) => clampNumber(item, 1, 0.1, 999)).slice(0, 8) : [],
    previewRowCount: clampNumber(source.previewRowCount, 5, 1, 24),
    dynamicRows: boolValue(source.dynamicRows, false),
    rowTemplate: Array.isArray(source.rowTemplate) ? source.rowTemplate.map((item) => cleanText(item, '', 160)).slice(0, 8) : [],
    rows: Array.isArray(source.rows)
      ? source.rows.map((row) => (Array.isArray(row) ? row.map((item) => cleanText(item, '', 160)).slice(0, 8) : [cleanText(row, '', 160)])).slice(0, 12)
      : []
  };
  if (type === 'card' && !common.title && !common.boxOnly && !currentLayoutElement) common.title = cleanText(element.name, 'Card title', 160);
  if (type === 'qr' && !common.label) common.label = 'QR CODE';
  if (type === 'signature' && !common.label) common.label = 'Authorized Signature';
  if (type === 'table' && !common.title && !currentLayoutElement) common.title = 'Table';
  if (type === 'icon' && !common.label && !currentLayoutElement) common.label = cleanText(source.iconName ?? element.iconName, 'Icon', 80);
  if ((type === 'divider' || type === 'spacer' || type === 'image') && !common.label && !currentLayoutElement) common.label = type === 'image' ? 'Image / Logo' : type === 'spacer' ? 'Spacer' : 'Divider';
  if (type === 'text' && !common.text && !currentLayoutElement) common.text = cleanText(element.title, 'Text block', 160);
  return common;
}

function sanitizeDesignStyle(style = {}, element = {}) {
  const source = isPlainObject(style) ? style : {};
  const currentLayoutElement = isCurrentLayoutDesignElement(element);
  const inferredOrientation = source.orientation
    || (currentLayoutElement && element.type === 'divider' && Number(element.height || 0) > Number(element.width || 0) ? 'vertical' : 'horizontal');
  return {
    accentColor: sanitizeDesignColor(source.accentColor || element.accentColor, '#0284c7'),
    backgroundColor: sanitizeDesignColor(source.backgroundColor || element.backgroundColor, '#ffffff'),
    textColor: sanitizeDesignColor(source.textColor || element.textColor, '#0f172a'),
    borderColor: sanitizeDesignColor(source.borderColor || element.borderColor, '#cbd5e1'),
    borderRadius: clampNumber(source.borderRadius, 10, 0, 32),
    borderWidth: clampNumber(source.borderWidth, 1, 0, 8),
    shadow: boolValue(source.shadow, false),
    opacity: clampNumber(source.opacity, 1, 0, 1),
    fontSize: clampNumber(source.fontSize, 13, currentLayoutElement ? 4 : 8, 32),
    ...(element.type === 'icon' ? {
      iconColor: sanitizeDesignColor(source.iconColor || source.accentColor || element.iconColor || element.accentColor, '#0284c7'),
      iconSize: source.iconSize === undefined || source.iconSize === null ? undefined : clampNumber(source.iconSize, 18, 4, 96),
      strokeWidth: clampNumber(source.strokeWidth, 2, 0.5, 8)
    } : {}),
    fontWeight: clampNumber(source.fontWeight, 700, 300, 950),
    alignment: ['left', 'center', 'right'].includes(source.alignment || element.alignment) ? (source.alignment || element.alignment) : 'left',
    rowHeight: clampNumber(source.rowHeight, 18, 12, 34),
    padding: clampNumber(source.padding, 0, 0, 80),
    paddingX: clampNumber(source.paddingX, 0, 0, 80),
    paddingY: clampNumber(source.paddingY, 0, 0, 80),
    lineHeight: clampNumber(source.lineHeight, 1.16, 0.85, 2.4),
    dividerThickness: clampNumber(source.dividerThickness, 2, currentLayoutElement ? 0.1 : 1, 8),
    dividerStyle: ['solid', 'dashed', 'dotted'].includes(source.dividerStyle) ? source.dividerStyle : 'solid',
    orientation: ['horizontal', 'vertical'].includes(inferredOrientation) ? inferredOrientation : 'horizontal',
    rotate: clampNumber(source.rotate, 0, -360, 360),
    headerBackgroundColor: sanitizeDesignColor(source.headerBackgroundColor, source.accentColor || '#0f2a52'),
    headerTextColor: sanitizeDesignColor(source.headerTextColor, '#ffffff'),
    rowBackgroundColor: sanitizeDesignColor(source.rowBackgroundColor, '#ffffff'),
    alternateRowBackgroundColor: sanitizeDesignColor(source.alternateRowBackgroundColor, '#f8fafc')
  };
}

function sanitizeDesignPage(page = {}, index = 0, elementLimit = 180) {
  const id = clean(page.id || `page-${index + 1}`).replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || `page-${index + 1}`;
  return {
    id,
    name: cleanText(page.name, `Page ${index + 1}`, 120),
    elements: Array.isArray(page.elements) ? page.elements.map((item) => cleanText(item, '', 80)).filter(Boolean).slice(0, elementLimit) : [],
    manual: boolValue(page.manual ?? page.userAdded, false)
  };
}

function sanitizeDesignSection(section = {}, index = 0) {
  const id = clean(section.id || `section-${index + 1}`).replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || `section-${index + 1}`;
  const pageId = clean(section.pageId || 'page-1').replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || 'page-1';
  const content = sanitizeDesignContent('section', section.content, section);
  return {
    id,
    type: 'section',
    kind: 'section',
    name: cleanText(section.name || section.title, `Section ${index + 1}`, 160),
    title: cleanText(section.title || section.name, `Section ${index + 1}`, 160),
    pageId,
    sourceKey: cleanText(section.sourceKey, '', 120),
    sourceIndex: clampNumber(section.sourceIndex, index, 0, 999),
    role: cleanText(section.role, 'details', 80),
    visible: boolValue(section.visible, true),
    enabled: boolValue(section.enabled ?? section.visible, true),
    locked: section.locked !== false,
    system: boolValue(section.system, true),
    showTitle: boolValue(section.showTitle, true),
    showIcon: boolValue(section.showIcon, true),
    x: clampNumber(section.x, 0, 0, 595),
    y: clampNumber(section.y, 0, 0, 842),
    width: clampNumber(section.width, 520, 24, 595),
    height: clampNumber(section.height, 80, 8, 842),
    alignment: ['left', 'center', 'right'].includes(section.alignment) ? section.alignment : 'left',
    content,
    style: sanitizeDesignStyle(section.style || {}, section),
    fullWidth: boolValue(section.fullWidth, false),
    twoColumn: boolValue(section.twoColumn ?? content.twoColumn, false),
    pageBreakBefore: boolValue(section.pageBreakBefore, false),
    avoidSplit: boolValue(section.avoidSplit, true),
    printSafe: boolValue(section.printSafe, true),
    rendererFrame: boolValue(section.rendererFrame, false),
    layoutSource: ['renderer', 'custom', 'default'].includes(section.layoutSource) ? section.layoutSource : (section.rendererFrame ? 'renderer' : 'default'),
    zIndex: clampNumber(section.zIndex, index + 1, 1, 999)
  };
}

function sanitizeDesignElement(element = {}, index = 0) {
  const type = normalizeDesignElementType(element.type);
  const currentLayoutElement = isCurrentLayoutDesignElement(element);
  const fallbackName = type === 'qr'
    ? 'QR Code'
    : type === 'signature'
      ? 'Signature'
      : type === 'divider'
        ? 'Divider'
        : type === 'spacer'
          ? 'Spacer'
          : type === 'image'
            ? 'Image / Logo'
            : type === 'table'
              ? 'Table'
              : type === 'icon'
                ? 'Icon'
            : type === 'card'
              ? 'Card'
              : 'Text';
  const pageId = clean(element.pageId || 'page-1').replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || 'page-1';
  const content = sanitizeDesignContent(type, element.content, element);
  const minWidth = currentLayoutElement ? 0.1 : 24;
  const minHeight = currentLayoutElement ? 0.1 : 8;
  return {
    id: clean(element.id || `design-element-${index + 1}`).replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || `design-element-${index + 1}`,
    type,
    name: cleanText(element.name || element.title, fallbackName, 160),
    title: cleanText(element.title || element.name, fallbackName, 160),
    pageId,
    x: clampNumber(element.x, 48, 0, 595),
    y: clampNumber(element.y, 118, 0, 842),
    width: clampNumber(element.width, type === 'divider' ? 260 : 220, minWidth, 595),
    height: clampNumber(element.height, type === 'divider' ? 22 : 76, minHeight, 842),
    widthMode: ['full', 'half', 'custom'].includes(element.widthMode) ? element.widthMode : 'custom',
    visible: boolValue(element.visible ?? element.enabled, true),
    enabled: boolValue(element.enabled ?? element.visible, true),
    locked: boolValue(element.locked, false),
    showTitle: boolValue(element.showTitle, true),
    showIcon: boolValue(element.showIcon, true),
    fullWidth: boolValue(element.fullWidth, false),
    twoColumn: boolValue(element.twoColumn ?? content.twoColumn, false),
    pageBreakBefore: boolValue(element.pageBreakBefore, false),
    avoidSplit: boolValue(element.avoidSplit, true),
    printSafe: currentLayoutElement ? boolValue(element.printSafe, false) : boolValue(element.printSafe, true),
    zIndex: clampNumber(element.zIndex, index + 20, 1, 999),
    sourceSectionId: cleanText(element.sourceSectionId, '', 120),
    sourceKey: cleanText(element.sourceKey, '', 120),
    manifestSemanticId: cleanText(element.manifestSemanticId || element.manifest?.semanticId, '', 160),
    manifestSource: cleanText(element.manifestSource || element.manifest?.source, '', 160),
    backgroundElement: boolValue(element.backgroundElement ?? element.content?.backgroundElement, false),
    designGenerated: boolValue(element.designGenerated, false),
    qrType: content.qrType,
    alignment: ['left', 'center', 'right'].includes(element.alignment) ? element.alignment : content.alignment || 'left',
    content,
    style: sanitizeDesignStyle(element.style || {}, element),
    backgroundColor: sanitizeDesignColor(element.backgroundColor || element.style?.backgroundColor, '#ffffff'),
    textColor: sanitizeDesignColor(element.textColor || element.style?.textColor, '#0f172a'),
    borderColor: sanitizeDesignColor(element.borderColor || element.style?.borderColor, '#d8e5f7')
  };
}

export function templateKeyForPdfType(type = '') {
  if (type === 'work' || type === 'amc-invoice') return 'invoice';
  if (type === 'quotation') return 'quotation';
  if (type === 'service-completed') return 'service-completed';
  if (type === 'amc-contract') return 'amc-contract';
  if (type === 'amc-service-visit') return 'amc-service-visit';
  if (type === 'amc-renewal-reminder') return 'amc-renewal-reminder';
  return clean(type);
}

export function templateKeyForDocumentType(type = '') {
  if (type === 'invoice') return 'invoice';
  if (type === 'quotation') return 'quotation';
  if (type === 'service') return 'service-completed';
  return clean(type);
}

function defaultConfigFor(key) {
  const definition = definitionsByKey.get(key);
  return { ...(definition?.defaults || {}) };
}

function assertTemplateKey(key) {
  const normalized = clean(key);
  if (!definitionsByKey.has(normalized)) throw appError('PDF template not found', 404);
  return normalized;
}

function assertAdmin(user) {
  if (!hasRole(user, 'admin')) throw appError('Only admin users can edit PDF templates', 403);
}

function cleanText(value, fallback = '', max = 5000) {
  const text = String(value ?? fallback ?? '').replace(/\r\n/g, '\n');
  return text.length > max ? text.slice(0, max) : text;
}

function byteLength(value = '') {
  return Buffer.byteLength(String(value || ''), 'utf8');
}

function sanitizePublishedCanvasHtml(html = '') {
  helperLabelPattern.lastIndex = 0;
  helperNodePattern.lastIndex = 0;
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed\b[^>]*>[\s\S]*?<\/embed>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '')
    .replace(helperNodePattern, '')
    .replace(helperLabelPattern, '><')
    .trim();
}

function publishedCanvasSnapshotFrom(source = {}, { strict = false, key = 'invoice' } = {}) {
  const templateKey = clean(key || 'invoice');
  const rawHtml = sanitizePublishedCanvasHtml(source.publishedCanvasHtml ?? source.publishedHtml ?? '');
  const rawMeta = source.publishedMeta || {};
  if (!rawHtml) {
    if (strict) throw appError('PDF publish requires a captured design canvas', 400);
    return { publishedHtml: '', publishedMeta: null, reason: 'missing-html' };
  }
  if (byteLength(rawHtml) > MAX_INVOICE_PUBLISHED_HTML_BYTES) {
    if (strict) throw appError('Published design canvas is too large', 413);
    return { publishedHtml: '', publishedMeta: null, reason: 'html-too-large' };
  }
  const meta = {
    width: Number(rawMeta.width),
    height: Number(rawMeta.height),
    templateKey: cleanText(rawMeta.templateKey, templateKey, 40),
    elementCount: clampNumber(rawMeta.elementCount, 0, 0, 2000),
    pageCount: clampNumber(rawMeta.pageCount, 1, 1, 100),
    pages: Array.isArray(rawMeta.pages)
      ? rawMeta.pages.slice(0, 100).map((page, index) => ({
        id: cleanText(page?.id, `page-${index + 1}`, 80),
        name: cleanText(page?.name, `Page ${index + 1}`, 120),
        index: clampNumber(page?.index, index + 1, 1, 100),
        elementCount: clampNumber(page?.elementCount, 0, 0, 2000)
      }))
      : []
  };
  if (
    meta.templateKey !== templateKey
    || Math.round(meta.width) !== INVOICE_CANVAS_WIDTH
    || Math.round(meta.height) !== INVOICE_CANVAS_HEIGHT
  ) {
    if (strict) throw appError('Published design canvas metadata is invalid', 400);
    return { publishedHtml: '', publishedMeta: null, reason: 'invalid-meta' };
  }
  return { publishedHtml: rawHtml, publishedMeta: meta };
}

function safePublishedCanvasSnapshotFrom(source = {}, key = 'invoice') {
  try {
    const snapshot = publishedCanvasSnapshotFrom(source, { strict: false, key });
    if (!snapshot.publishedHtml) {
      console.warn(`[PDF template publish] Published canvas snapshot ignored for "${key}": ${snapshot.reason || 'invalid snapshot'}. Design JSON will still be published.`);
    }
    return snapshot;
  } catch (error) {
    console.error(`[PDF template publish] Published canvas snapshot failed for "${key}". Design JSON will still be published.`, error?.stack || error);
    return { publishedHtml: '', publishedMeta: null, reason: 'snapshot-error' };
  }
}

function applyInvoicePublishedSnapshot(config = {}, source = {}, options = {}) {
  const snapshot = publishedCanvasSnapshotFrom(source, options);
  if (!snapshot.publishedHtml) {
    delete config.design.publishedHtml;
    delete config.design.publishedMeta;
    return config;
  }
  config.design.publishedHtml = snapshot.publishedHtml;
  config.design.publishedMeta = snapshot.publishedMeta;
  return config;
}

function hasPublishedDesignHtml(config = {}, key = 'invoice') {
  const templateKey = clean(key || 'invoice');
  return config?.design?.published === true
    && typeof config.design.publishedHtml === 'string'
    && config.design.publishedHtml.trim()
    && config.design.publishedMeta?.templateKey === templateKey;
}

function hasPublishedInvoiceHtml(config = {}) {
  return hasPublishedDesignHtml(config, 'invoice');
}

function sanitizeColor(value, fallback = '#0f2a52') {
  const text = clean(value || fallback);
  return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}

function sanitizeConfig(payload = {}, key = '') {
  const defaults = structuredDefaultsFor(key);
  const rawPublishedSnapshot = {
    publishedHtml: payload?.design?.publishedHtml,
    publishedMeta: payload?.design?.publishedMeta
  };
  let sanitized = deepMerge(defaults, legacyStructuredOverrides(payload, key));
  sanitized = deepMerge(sanitized, payload || {});
  sanitized = sanitizeStrings(sanitized);
  sanitized.layoutVersion = 5;
  sanitized.editMode = sanitized.editMode === 'design' ? 'design' : 'structured';
  sanitized.advancedEnabled = boolValue(sanitized.advancedEnabled, defaults.advancedEnabled);
  sanitized.header = sanitized.header || defaults.header;
  sanitized.footer = sanitized.footer || defaults.footer;
  sanitized.pageBreaks = sanitized.pageBreaks || defaults.pageBreaks;
  sanitized.pageSettings = deepMerge(defaults.pageSettings, sanitized.pageSettings || {});
  sanitized.structured = deepMerge(defaults.structured, sanitized.structured || {});
  sanitized.design = deepMerge(defaults.design, sanitized.design || {});
  sanitized.sections = sanitized.sections || defaults.sections;
  sanitized.header.showLogo = boolValue(sanitized.header.showLogo, defaults.header.showLogo);
  sanitized.header.showCompanyDetails = boolValue(sanitized.header.showCompanyDetails, defaults.header.showCompanyDetails);
  sanitized.header.title = cleanText(sanitized.header.title, defaults.header.title, 120);
  sanitized.header.accentColor = sanitizeColor(sanitized.header.accentColor, defaults.header.accentColor);
  sanitized.footer.showCallWhatsapp = boolValue(sanitized.footer.showCallWhatsapp, true);
  sanitized.footer.showEmail = boolValue(sanitized.footer.showEmail, true);
  sanitized.footer.showWebsite = boolValue(sanitized.footer.showWebsite, true);
  sanitized.footer.showAddress = boolValue(sanitized.footer.showAddress, true);
  sanitized.footer.thankYouMessage = cleanText(sanitized.footer.thankYouMessage, defaults.footer.thankYouMessage, 500);
  Object.keys(defaults.pageBreaks).forEach((field) => {
    sanitized.pageBreaks[field] = boolValue(sanitized.pageBreaks[field], defaults.pageBreaks[field]);
  });
  Object.keys(defaults.pageSettings).forEach((field) => {
    sanitized.pageSettings[field] = boolValue(sanitized.pageSettings[field], defaults.pageSettings[field]);
  });
  sanitized.structured.mode = 'structured';
  sanitized.structured.useCurrentDefaultLayout = boolValue(sanitized.structured.useCurrentDefaultLayout, true);
  sanitized.structured.advancedPanelOpen = boolValue(sanitized.structured.advancedPanelOpen, false);
  sanitized.structured.customSectionsEnabled = boolValue(sanitized.structured.customSectionsEnabled, false);
  sanitized.structured.allowDragDrop = boolValue(sanitized.structured.allowDragDrop, false);
  sanitized.structured.twoColumnCards = boolValue(sanitized.structured.twoColumnCards, false);
  sanitized.structured.customCardWidthEnabled = boolValue(sanitized.structured.customCardWidthEnabled, false);
  sanitized.structured.customColorsEnabled = boolValue(sanitized.structured.customColorsEnabled, false);
  sanitized.structured.qrPaymentCardEnabled = boolValue(sanitized.structured.qrPaymentCardEnabled, false);
  sanitized.structured.signatureCardEnabled = boolValue(sanitized.structured.signatureCardEnabled, false);
  sanitized.structured.designModeEnabled = boolValue(sanitized.structured.designModeEnabled, false);
  sanitized.structured.defaultCardWidth = cardWidths.has(sanitized.structured.defaultCardWidth) ? sanitized.structured.defaultCardWidth : 'full';
  sanitized.structured.borderStyle = borderStyles.has(sanitized.structured.borderStyle) ? sanitized.structured.borderStyle : 'default';
  sanitized.structured.customSections = Array.isArray(sanitized.structured.customSections)
    ? sanitized.structured.customSections.slice(0, 24).map((section, index) => sanitizeAdvancedSection(section, index))
    : [];
  sanitized.design.enabled = boolValue(sanitized.design.enabled, false);
  sanitized.design.confirmed = boolValue(sanitized.design.confirmed, false);
  sanitized.design.mode = sanitized.design.mode === 'manifest' ? 'manifest' : 'legacy';
  sanitized.design.published = boolValue(sanitized.design.published, false);
  sanitized.design.previewDraft = boolValue(sanitized.design.previewDraft, false);
  sanitized.design.baseTemplateVersion = clampNumber(sanitized.design.baseTemplateVersion, defaults.design.baseTemplateVersion || 1, 1, 999999);
  sanitized.design.overrides = isPlainObject(sanitized.design.overrides) ? sanitized.design.overrides : {};
  sanitized.design.lockedDefaultSections = true;
  sanitized.design.blank = boolValue(sanitized.design.blank, false);
  sanitized.design.freeLayoutMode = boolValue(sanitized.design.freeLayoutMode, false);
  sanitized.design.canvas = deepMerge(defaults.design.canvas, sanitized.design.canvas || {});
  sanitized.design.canvas.size = 'A4';
  sanitized.design.canvas.orientation = sanitized.design.canvas.orientation === 'landscape' ? 'landscape' : 'portrait';
  sanitized.design.canvas.zoom = ['fit', 'fit-width', '75', '100', '125'].includes(String(sanitized.design.canvas.zoom)) ? String(sanitized.design.canvas.zoom) : 'fit-width';
  sanitized.design.canvas.gridSize = clampNumber(sanitized.design.canvas.gridSize, 8, 4, 24);
  sanitized.design.canvas.snap = boolValue(sanitized.design.canvas.snap, true);
  sanitized.design.gridEnabled = boolValue(sanitized.design.gridEnabled, false);
  sanitized.design.layoutGuides = boolValue(sanitized.design.layoutGuides, false);
  sanitized.design.visualElementMode = boolValue(sanitized.design.visualElementMode, true);
  sanitized.design.snapToGrid = boolValue(sanitized.design.snapToGrid, sanitized.design.canvas.snap);
  applyInvoicePublishedSnapshot(sanitized, rawPublishedSnapshot, { key });
  sanitized.design.page = deepMerge(defaults.design.page, sanitized.design.page || {});
  sanitized.design.page.size = sanitized.design.page.size === 'A4' ? 'A4' : 'A4';
  sanitized.design.page.orientation = sanitized.design.page.orientation === 'landscape' ? 'landscape' : 'portrait';
  sanitized.design.page.margin = clampNumber(sanitized.design.page.margin, defaults.design.page.margin, 0, 80);
  sanitized.design.page.backgroundColor = sanitizeColor(sanitized.design.page.backgroundColor, '#ffffff');
  sanitized.design.colors = deepMerge(defaults.design.colors, sanitized.design.colors || {});
  sanitized.design.colors.accentColor = sanitizeColor(sanitized.design.colors.accentColor, sanitized.header.accentColor);
  sanitized.design.colors.cardBackground = sanitizeColor(sanitized.design.colors.cardBackground, '#ffffff');
  sanitized.design.colors.textColor = sanitizeColor(sanitized.design.colors.textColor, '#0f172a');
  sanitized.design.colors.borderColor = sanitizeColor(sanitized.design.colors.borderColor, '#d8e5f7');
  sanitized.design.colors.noticeBackground = sanitizeColor(sanitized.design.colors.noticeBackground, '#f1f7ff');
  const designElementSource = Array.isArray(sanitized.design.customElements) && sanitized.design.customElements.length
    ? sanitized.design.customElements
    : sanitized.design.elements;
  const manifestDesign = sanitized.design.mode === 'manifest';
  const designElementLimit = manifestDesign ? Number.POSITIVE_INFINITY : 80;
  sanitized.design.elements = Array.isArray(designElementSource)
    ? designElementSource.slice(0, designElementLimit).map((element, index) => sanitizeDesignElement(element, index))
    : [];
  sanitized.design.customElements = sanitized.design.elements;
  sanitized.design.sections = Array.isArray(sanitized.design.sections)
    ? sanitized.design.sections.slice(0, 40).map((section, index) => sanitizeDesignSection(section, index))
    : [];
  const savedPages = Array.isArray(sanitized.design.pages) ? sanitized.design.pages : [];
  const pageIds = new Set([
    'page-1',
    ...savedPages.map((page) => page?.id).filter(Boolean),
    ...sanitized.design.elements.map((element) => element.pageId).filter(Boolean),
    ...sanitized.design.sections.map((section) => section.pageId).filter(Boolean)
  ]);
  sanitized.design.pages = [...pageIds].map((pageId, index) => {
    const savedPage = savedPages.find((page) => page?.id === pageId) || {};
    return sanitizeDesignPage({
      ...savedPage,
      id: pageId,
      elements: [
        ...sanitized.design.sections.filter((section) => section.pageId === pageId).map((section) => section.id),
        ...sanitized.design.elements.filter((element) => element.pageId === pageId).map((element) => element.id)
      ]
    }, index, manifestDesign ? Number.POSITIVE_INFINITY : 180);
  });
  sanitized.design.sectionOptions = isPlainObject(sanitized.design.sectionOptions) ? sanitized.design.sectionOptions : {};
  if (!sanitized.design.enabled) sanitized.editMode = 'structured';

  if (key === 'invoice') {
    sanitized.sections.workCompletionNotice.messageLines = stringList(sanitized.sections.workCompletionNotice.messageLines, defaults.sections.workCompletionNotice.messageLines);
    sanitized.sections.terms.text = cleanText(sanitized.sections.terms.text, defaults.sections.terms.text, 5000);
  }
  if (key === 'quotation') {
    sanitized.sections.whatsappApprovalMessage.messageLines = stringList(sanitized.sections.whatsappApprovalMessage.messageLines, defaults.sections.whatsappApprovalMessage.messageLines);
    sanitized.sections.terms.text = cleanText(sanitized.sections.terms.text, defaults.sections.terms.text, 5000);
  }
  if (key === 'service-completed') {
    sanitized.sections.whatWeDid.messageLines = stringList(sanitized.sections.whatWeDid.messageLines, defaults.sections.whatWeDid.messageLines);
    sanitized.sections.supportMessage.highlightLines = stringList(sanitized.sections.supportMessage.highlightLines, defaults.sections.supportMessage.highlightLines);
    sanitized.sections.terms.text = cleanText(sanitized.sections.terms.text, defaults.sections.terms.text, 5000);
  }
  if (key === 'amc-contract') {
    sanitized.sections.amcTerms.text = cleanText(sanitized.sections.amcTerms.text, defaults.sections.amcTerms.text, 5000);
  }

  sanitized.headerTitle = sanitized.header.title;
  sanitized.showCompanyLogo = sanitized.header.showLogo;
  sanitized.showCompanyDetails = sanitized.header.showCompanyDetails;
  sanitized.colorAccent = sanitized.header.accentColor;
  sanitized.footerText = sanitized.footer.thankYouMessage;
  sanitized.termsAndConditions = cleanText(sanitized.sections.terms?.text ?? sanitized.termsAndConditions ?? defaultConfigFor(key).termsAndConditions ?? '', '', 5000);
  sanitized.paymentBankDetails = cleanText(sanitized.paymentBankDetails, defaultConfigFor(key).paymentBankDetails || '', 5000);
  sanitized.notesWarrantyText = cleanText(sanitized.notesWarrantyText, defaultConfigFor(key).notesWarrantyText || '', 5000);
  sanitized.amcTerms = cleanText(sanitized.sections.amcTerms?.text ?? sanitized.amcTerms ?? defaultConfigFor(key).amcTerms ?? '', '', 5000);
  sanitized.signatureSection = cleanText(sanitized.sections.signature?.label ?? sanitized.signatureSection ?? defaultConfigFor(key).signatureSection ?? '', '', 500);
  sanitized.showTechnician = Boolean(
    sanitized.sections.serviceDetails?.showTechnician
    ?? sanitized.sections.serviceDeviceDetails?.showTechnician
    ?? sanitized.sections.visitFrequency?.showTechnician
    ?? sanitized.sections.deviceChecked?.showTechnician
    ?? defaultConfigFor(key).showTechnician
  );
  sanitized.showSerialNumber = Boolean(
    sanitized.sections.serviceDeviceDetails?.showSerialNumber
    ?? sanitized.sections.coveredDevices?.showSerialNumber
    ?? defaultConfigFor(key).showSerialNumber
  );
  sanitized.showAdditionalCharges = Boolean(sanitized.sections.partsUsed?.show ?? defaultConfigFor(key).showAdditionalCharges ?? key === 'amc-service-visit');
  sanitized.showRenewalAmount = Boolean(sanitized.sections.renewalAmount?.show ?? defaultConfigFor(key).showRenewalAmount ?? key === 'amc-renewal-reminder');

  textFields.forEach((field) => {
    sanitized[field] = cleanText(sanitized[field], defaultConfigFor(key)[field] || '');
  });
  return sanitized;
}

function htmlEscape(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cssValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cssText(style = {}) {
  return Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}:${value}`)
    .join(';');
}

function assetDataUri(filePath, fallbackText = COMPANY.name) {
  if (filePath === LOGO_FULL_PATH && cachedLogoFullDataUri) return cachedLogoFullDataUri;
  if (filePath === LOGO_ICON_PATH && cachedLogoIconDataUri) return cachedLogoIconDataUri;
  let uri = '';
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    uri = `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
  } else {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="120" viewBox="0 0 420 120"><rect width="420" height="120" fill="#fff"/><text x="24" y="72" font-family="Arial" font-size="34" font-weight="700" fill="#082a73">${htmlEscape(fallbackText)}</text></svg>`;
    uri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }
  if (filePath === LOGO_FULL_PATH) cachedLogoFullDataUri = uri;
  if (filePath === LOGO_ICON_PATH) cachedLogoIconDataUri = uri;
  return uri;
}

function jsonAttribute(value) {
  return encodeURIComponent(JSON.stringify(value));
}

function imageSourceForPublishedElement(element = {}) {
  const content = element.content || {};
  const source = `${content.src || content.imageUrl || content.assetPath || ''} ${content.imageMode || ''} ${element.id || ''}`;
  return /watermark|logo-icon/i.test(source)
    ? assetDataUri(LOGO_ICON_PATH, 'US')
    : assetDataUri(LOGO_FULL_PATH, COMPANY.name);
}

function publishedElementStyle(element = {}) {
  const style = element.style || {};
  const isDivider = element.type === 'divider';
  const borderWidth = isDivider ? 0 : cssValue(style.borderWidth, 0);
  return cssText({
    position: 'absolute',
    left: `${cssValue(element.x)}px`,
    top: `${cssValue(element.y)}px`,
    width: `${Math.max(0.1, cssValue(element.width, 1))}px`,
    height: `${Math.max(0.1, cssValue(element.height, 1))}px`,
    zIndex: cssValue(element.zIndex, 20),
    color: element.type === 'icon' ? (style.iconColor || style.accentColor || style.textColor || '#082a73') : (style.textColor || '#1e293b'),
    background: isDivider ? 'transparent' : (style.backgroundColor || 'transparent'),
    borderStyle: borderWidth > 0 ? 'solid' : 'none',
    borderColor: style.borderColor || 'transparent',
    borderWidth: `${borderWidth}px`,
    borderRadius: `${isDivider ? 0 : cssValue(style.borderRadius, 0)}px`,
    boxShadow: style.shadow ? '0 14px 28px rgba(15,23,42,.16)' : 'none',
    textAlign: style.alignment || element.alignment || 'left',
    fontSize: `${cssValue(style.fontSize, 10)}px`,
    fontWeight: style.fontWeight || 700,
    lineHeight: cssValue(style.lineHeight, 1.16),
    padding: `${isDivider ? 0 : cssValue(style.padding, 0)}px`,
    opacity: cssValue(style.opacity, 1),
    overflow: 'hidden',
    boxSizing: 'border-box'
  });
}

function publishedIconSvg(variant = '', strokeWidth = 2) {
  const name = normalizeVectorIconName(variant);
  const stroke = Math.max(0.5, Math.min(8, Number(strokeWidth) || 2));
  if (name === 'dot') return '<svg class="pdf-canvas-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8" fill="currentColor"/></svg>';
  if (name === 'check' || name === 'completion') return `<svg class="pdf-canvas-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (name === 'star') return `<svg class="pdf-canvas-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3z" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linejoin="round"/></svg>`;
  if (name === 'rupee') return `<svg class="pdf-canvas-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 5h10M7 9h10M9 9c6 0 6 8 0 8l7 4" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (name === 'calendar' || name === 'date') return `<svg class="pdf-canvas-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="${stroke}"/><path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/></svg>`;
  if (name === 'phone' || name === 'whatsapp' || name === 'headset') return `<svg class="pdf-canvas-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 5l3 4-2 2c2 4 5 6 9 7l2-3 4 2c-1 3-3 4-6 3C9 19 4 14 3 7c0-3 1-5 4-6z" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linejoin="round"/></svg>`;
  if (name === 'email') return `<svg class="pdf-canvas-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="${stroke}"/><path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linejoin="round"/></svg>`;
  if (name === 'website') return `<svg class="pdf-canvas-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="${stroke}"/><path d="M4 12h16M12 4c2.4 2.7 2.4 13.3 0 16M12 4c-2.4 2.7-2.4 13.3 0 16" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/></svg>`;
  if (name === 'address') return `<svg class="pdf-canvas-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 21s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z" fill="none" stroke="currentColor" stroke-width="${stroke}"/><circle cx="12" cy="9" r="2.5" fill="currentColor"/></svg>`;
  if (name === 'document' || name === 'invoice') return `<svg class="pdf-canvas-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 3h8l4 4v14H7z" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linejoin="round"/><path d="M15 3v4h4M9.5 11h6.5M9.5 15h6.5M9.5 18h4.5" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/></svg>`;
  if (name === 'work' || name === 'status') return `<svg class="pdf-canvas-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="5" width="14" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="${stroke}"/><path d="M9 4h6v3H9zM8.5 13l2.2 2.2L15.8 10" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linejoin="round"/></svg>`;
  if (name === 'shield') return `<svg class="pdf-canvas-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3l8 3v6c0 5-3 8-8 10-5-2-8-5-8-10V6l8-3z" fill="none" stroke="currentColor" stroke-width="${stroke}"/><path d="M8 12l3 3 5-6" fill="none" stroke="currentColor" stroke-width="${stroke}"/></svg>`;
  if (name === 'bell') return `<svg class="pdf-canvas-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 17h12l-1.5-2.5V10a4.5 4.5 0 10-9 0v4.5L6 17zM10 20h4" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (name === 'handshake') return `<svg class="pdf-canvas-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12l4-5 4 3 4-3 4 5-6 7-2-2-2 2-6-7z" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linejoin="round"/></svg>`;
  return `<svg class="pdf-canvas-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="${stroke}"/><path d="M12 7v10M7 12h10" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/></svg>`;
}

function publishedTableHtml(element = {}) {
  const content = element.content || {};
  const style = element.style || {};
  const columns = Array.isArray(content.columns) && content.columns.length ? content.columns : ['S.No', 'Description', 'Qty', 'Unit Price', 'Total'];
  const widths = Array.isArray(content.columnWidths) ? content.columnWidths : [];
  const gridTemplate = widths.length
    ? columns.map((_column, index) => `${Math.max(0.2, Number(widths[index]) || 1)}fr`).join(' ')
    : `repeat(${Math.max(1, columns.length)}, minmax(0, 1fr))`;
  const rowHeight = cssValue(style.rowHeight, 18);
  const cellStyle = cssText({
    padding: `${cssValue(style.paddingY, 5)}px ${cssValue(style.paddingX, 4)}px`,
    textAlign: style.alignment || element.alignment || 'left',
    minWidth: 0,
    overflowWrap: 'anywhere',
    whiteSpace: 'normal'
  });
  const rowTemplate = Array.isArray(content.rowTemplate) && content.rowTemplate.length
    ? content.rowTemplate
    : ['{{item_index}}', '{{item_description}}', '{{item_quantity}}', '{{item_unit_price}}', '{{item_total}}'];
  const rows = (Array.isArray(content.rows) && content.rows.length ? content.rows : [rowTemplate])
    .slice(0, Math.max(1, Number(content.previewRowCount || 5)));
  return `
    <div class="pdf-canvas-table" data-pdf-invoice-table="true" data-pdf-table-element-id="${htmlEscape(element.id)}" data-pdf-table-dynamic-rows="${content.dynamicRows !== false ? 'true' : 'false'}" data-pdf-table-columns="${jsonAttribute(columns)}" data-pdf-table-row-template="${jsonAttribute(rowTemplate)}" data-pdf-table-row-height="${rowHeight}">
      ${content.title ? `<p style="margin:0 0 4px 0">${htmlEscape(content.title)}</p>` : ''}
      <div class="pdf-canvas-table-grid" style="${cssText({ border: `${cssValue(style.borderWidth, 0.7)}px solid ${style.borderColor || '#d8e5f7'}`, borderRadius: '8px', overflow: 'hidden', background: '#fff' })}">
        <div class="pdf-canvas-table-head" style="${cssText({ display: 'grid', gridTemplateColumns: gridTemplate, minHeight: `${rowHeight}px`, background: style.headerBackgroundColor || style.accentColor || '#0f2a52', color: style.headerTextColor || '#fff' })}">
          ${columns.slice(0, 6).map((column) => `<span style="${cellStyle}">${htmlEscape(column)}</span>`).join('')}
        </div>
        ${rows.map((row, rowIndex) => `<div class="pdf-canvas-table-row" style="${cssText({ display: 'grid', gridTemplateColumns: gridTemplate, minHeight: `${rowHeight}px`, background: rowIndex % 2 ? (style.alternateRowBackgroundColor || '#f8fafc') : (style.rowBackgroundColor || '#fff') })}">${(Array.isArray(row) ? row : [row]).slice(0, columns.length).map((cell) => `<span style="${cellStyle}">${htmlEscape(cell)}</span>`).join('')}</div>`).join('')}
      </div>
    </div>`;
}

function publishedElementBody(element = {}) {
  const content = element.content || {};
  const style = element.style || {};
  if (element.type === 'table') return publishedTableHtml(element);
  if (element.type === 'icon') {
    const variant = content.variant || content.iconName || 'generic';
    if (content.iconMode === 'emoji') {
      return `<div class="pdf-canvas-icon is-emoji is-symbol-only" style="width:100%;height:100%;display:grid;place-items:center"><span class="pdf-canvas-emoji-icon">${htmlEscape(content.emoji || '✅')}</span></div>`;
    }
    const iconSize = Number(style.iconSize || 0);
    const sizeStyle = Number.isFinite(iconSize) && iconSize > 0 ? `font-size:${iconSize}px;` : '';
    return `<div class="pdf-canvas-icon is-vector is-${htmlEscape(variant)} is-symbol-only" style="width:100%;height:100%;display:grid;place-items:center;${sizeStyle}">${publishedIconSvg(variant, style.strokeWidth)}</div>`;
  }
  if (element.type === 'divider') {
    const vertical = style.orientation === 'vertical' || Number(style.rotate) === 90 || cssValue(element.height) > cssValue(element.width);
    return `<div class="pdf-canvas-divider ${vertical ? 'is-vertical' : ''}" style="${cssText({ width: '100%', height: '100%', borderTop: vertical ? '0' : `${cssValue(style.dividerThickness, 1)}px ${style.dividerStyle || 'solid'} ${style.accentColor || '#082a73'}`, borderLeft: vertical ? `${cssValue(style.dividerThickness, 1)}px ${style.dividerStyle || 'solid'} ${style.accentColor || '#082a73'}` : '0' })}"></div>`;
  }
  if (element.type === 'image') {
    const mode = content.imageMode || (/watermark|logo-icon/i.test(content.assetPath || '') ? 'watermark' : 'logo');
    return `<div class="pdf-canvas-image has-image is-${htmlEscape(mode)}" style="width:100%;height:100%;display:block;overflow:hidden"><img src="${imageSourceForPublishedElement(element)}" alt="" draggable="false" style="width:100%;height:100%;display:block;object-fit:${content.objectFit || 'contain'};object-position:${content.objectPosition || 'center center'}"/></div>`;
  }
  if (element.type === 'card') {
    if (content.boxOnly) return '<div class="pdf-canvas-card-box" style="width:100%;height:100%"></div>';
    return `<div class="pdf-canvas-card" style="width:100%;height:100%;display:block;white-space:pre-wrap;overflow:hidden;overflow-wrap:anywhere">${content.title ? `<p style="margin:0 0 4px 0">${htmlEscape(content.title)}</p>` : ''}${content.body ? `<span>${htmlEscape(content.body)}</span>` : ''}</div>`;
  }
  return `<div class="pdf-canvas-text" style="width:100%;height:100%;display:block;white-space:pre-wrap;overflow:hidden;overflow-wrap:anywhere">${htmlEscape(content.text || element.content || '')}</div>`;
}

function publishedElementHtml(element = {}) {
  if (element.visible === false || element.enabled === false) return '';
  const background = element.backgroundElement === true || element.content?.backgroundElement === true || /watermark/i.test(element.id || '');
  return `<div class="pdf-builder-element is-${htmlEscape(element.type || 'text')} ${background ? 'is-background-element' : ''}" data-pdf-layer-id="${htmlEscape(element.id)}" data-pdf-layer-kind="${background ? 'background' : 'element'}" style="${publishedElementStyle(element)}">${publishedElementBody(element)}</div>`;
}

function currentLayoutDesignFor(key = '', config = {}) {
  const manifest = buildPdfTemplateManifest(key, config, { company: COMPANY });
  const elements = (Array.isArray(manifest.elements) ? manifest.elements : []).map((element, index) => sanitizeDesignElement({
    ...element,
    id: element.id || `${key}.element${index + 1}`,
    pageId: element.pageId || `page-${element.page || 1}`,
    locked: element.locked === true,
    manifestSource: manifest.source || 'current-pdf-layout',
    manifestSemanticId: element.manifest?.semanticId || element.id || '',
    sourceKey: element.manifest?.semanticId || element.id || '',
    designGenerated: true
  }, index));
  const pages = Array.isArray(manifest.pages) && manifest.pages.length
    ? manifest.pages.map((page, index) => sanitizeDesignPage({
      id: page.id || `page-${index + 1}`,
      name: page.name || `Page ${index + 1}`,
      elements: Array.isArray(page.elements)
        ? page.elements
        : elements.filter((element) => (element.pageId || 'page-1') === (page.id || `page-${index + 1}`)).map((element) => element.id)
    }, index, Number.POSITIVE_INFINITY))
    : [sanitizeDesignPage({ id: 'page-1', name: 'Page 1', elements: elements.map((element) => element.id) }, 0, Number.POSITIVE_INFINITY)];
  return {
    mode: 'manifest',
    enabled: true,
    confirmed: true,
    published: true,
    previewDraft: false,
    baseTemplateVersion: 1,
    overrides: {},
    lockedDefaultSections: true,
    blank: false,
    freeLayoutMode: true,
    visualElementMode: true,
    snapToGrid: true,
    manifestKey: manifest.key || key,
    manifestSource: manifest.source || 'current-pdf-layout',
    manifestLabel: manifest.label || 'Current PDF layout',
    canvas: { size: 'A4', orientation: 'portrait', zoom: 'fit-width', gridSize: 8, snap: true },
    page: { size: 'A4', orientation: 'portrait', margin: 28, backgroundColor: '#ffffff' },
    colors: { accentColor: config.header?.accentColor || config.colorAccent || '#0f2a52', cardBackground: '#ffffff', textColor: '#0f172a', borderColor: '#d8e5f7', noticeBackground: '#f1f7ff' },
    sections: [],
    elements,
    customElements: elements,
    pages,
    savedTemplates: [],
    sectionOptions: {}
  };
}

function publishedSnapshotForDesign(key = '', design = {}) {
  const elements = Array.isArray(design.elements) ? design.elements : [];
  const pages = Array.isArray(design.pages) && design.pages.length ? design.pages : [{ id: 'page-1', name: 'Page 1', elements: elements.map((element) => element.id) }];
  const htmlPages = pages.map((page, index) => {
    const pageElements = elements
      .filter((element) => (element.pageId || 'page-1') === (page.id || 'page-1'))
      .sort((a, b) => Number(a.zIndex || 0) - Number(b.zIndex || 0));
    return `<section class="design-print-page" data-pdf-print-page="true" data-pdf-page-id="${htmlEscape(page.id || `page-${index + 1}`)}" data-pdf-page-index="${index + 1}" style="position:relative;width:${INVOICE_CANVAS_WIDTH}px;height:${INVOICE_CANVAS_HEIGHT}px;margin:0;padding:0;overflow:hidden;background:#fff;break-after:${index === pages.length - 1 ? 'auto' : 'page'};page-break-after:${index === pages.length - 1 ? 'auto' : 'always'}"><div class="pdf-a4-page" data-pdf-print-page="true" data-pdf-page-id="${htmlEscape(page.id || `page-${index + 1}`)}" style="position:absolute;left:0;top:0;width:${INVOICE_CANVAS_WIDTH}px;height:${INVOICE_CANVAS_HEIGHT}px;margin:0;padding:0;overflow:hidden;background:#fff">${pageElements.map(publishedElementHtml).join('')}</div></section>`;
  }).join('');
  return {
    publishedHtml: sanitizePublishedCanvasHtml(`<div class="design-print-document" data-pdf-print-document="true" style="width:${INVOICE_CANVAS_WIDTH}px;margin:0;padding:0;background:#fff;overflow:visible">${htmlPages}</div>`),
    publishedMeta: {
      width: INVOICE_CANVAS_WIDTH,
      height: INVOICE_CANVAS_HEIGHT,
      templateKey: key,
      elementCount: elements.length,
      pageCount: pages.length
    }
  };
}

function cleanCurrentLayoutConfig(key = '', config = {}) {
  const base = sanitizeConfig(config || {}, key);
  const design = currentLayoutDesignFor(key, base);
  const snapshot = publishedSnapshotForDesign(key, design);
  const next = sanitizeConfig({
    ...base,
    editMode: 'design',
    advancedEnabled: true,
    structured: {
      ...(base.structured || {}),
      designModeEnabled: true
    },
    design: {
      ...design,
      publishedHtml: snapshot.publishedHtml,
      publishedMeta: snapshot.publishedMeta
    }
  }, key);
  delete next.designDraft;
  return next;
}

function helperLabelValue(value = '') {
  const text = String(value || '').trim();
  return HELPER_LABELS.has(text);
}

function designElementsFromState(design = {}) {
  return [
    ...(Array.isArray(design.elements) ? design.elements : []),
    ...(Array.isArray(design.customElements) ? design.customElements : []),
    ...(Array.isArray(design.sections) ? design.sections : [])
  ].filter(Boolean);
}

function isPlaceholderDesignState(design = {}) {
  const elements = designElementsFromState(design);
  return design.manifestSource === 'placeholder-adapter'
    || design.manifest?.source === 'placeholder-adapter'
    || elements.some((element) => (
      element?.manifestSource === 'placeholder-adapter'
      || element?.manifest?.source === 'placeholder-adapter'
      || String(element?.id || '').includes('safePlaceholder')
      || String(element?.manifestSemanticId || '').includes('safePlaceholder')
    ));
}

function hasGenericBuilderDesignForKey(design = {}, key = '') {
  const elements = designElementsFromState(design).filter((element) => element.visible !== false && element.enabled !== false);
  if (!elements.length) return false;
  const prefix = designPrefixByKey[key] || key;
  const hasCurrentElement = elements.some(isCurrentLayoutDesignElement);
  const hasTemplateElement = elements.some((element) => String(element.id || element.sourceKey || element.manifestSemanticId || '').startsWith(`${prefix}.`));
  return !hasCurrentElement && !hasTemplateElement;
}

function hasHelperLabelElement(design = {}) {
  return designElementsFromState(design).some((element) => {
    const content = element?.content || {};
    return helperLabelValue(content.label)
      || helperLabelValue(content.text)
      || helperLabelValue(content.title)
      || helperLabelValue(content.body);
  });
}

function hasNarrowContactTextFrame(design = {}) {
  return designElementsFromState(design).some((element) => {
    if (element?.type !== 'text') return false;
    const text = String(element.content?.text || element.text || '');
    if (!text || text.length <= 3 || text === ':') return false;
    const marker = `${element.id || ''} ${element.sourceKey || ''} ${element.manifestSemanticId || ''} ${text}`.toLowerCase();
    if (!/(phone|address|email|website|footer|contact|whatsapp|company_)/.test(marker)) return false;
    const width = Number(element.width || 0);
    const height = Number(element.height || 0);
    return width > 0 && width < 32 && height > width * 1.5;
  });
}

function hasPublishedSnapshotCorruption(config = {}, key = '') {
  const design = config?.design || {};
  const html = String(design.publishedHtml || '');
  const meta = design.publishedMeta || null;
  if (design.published === true || html || meta) {
    if (!html.trim() || !meta || meta.templateKey !== key || Math.round(Number(meta.width || 0)) !== INVOICE_CANVAS_WIDTH || Math.round(Number(meta.height || 0)) !== INVOICE_CANVAS_HEIGHT) return true;
    if (!/\bdesign-print-document\b/.test(html) || !/\bdesign-print-page\b/.test(html)) return true;
  }
  helperLabelPattern.lastIndex = 0;
  helperNodePattern.lastIndex = 0;
  const corrupted = helperLabelPattern.test(html) || helperNodePattern.test(html);
  helperLabelPattern.lastIndex = 0;
  helperNodePattern.lastIndex = 0;
  return corrupted;
}

function publishedSnapshotMatchesDesign(config = {}, key = '') {
  if (!hasPublishedDesignHtml(config, key) || hasPublishedSnapshotCorruption(config, key)) return false;
  const design = config?.design || {};
  const meta = design.publishedMeta || {};
  const elementCount = Array.isArray(design.elements) ? design.elements.length : 0;
  const pageCount = Array.isArray(design.pages) && design.pages.length ? design.pages.length : 1;
  if (Number.isFinite(Number(meta.elementCount)) && Number(meta.elementCount) !== elementCount) return false;
  if (Number.isFinite(Number(meta.pageCount)) && Number(meta.pageCount) !== pageCount) return false;
  return true;
}

function currentLayoutRepairReasons(config = {}, key = '') {
  if (!CURRENT_LAYOUT_REPAIR_KEYS.has(key)) return [];
  const reasons = [];
  const design = config?.design || {};
  const draft = config?.designDraft || null;
  if (isPlaceholderDesignState(design) || (draft && isPlaceholderDesignState(draft))) reasons.push('placeholder-adapter');
  if (hasGenericBuilderDesignForKey(design, key) || (draft && hasGenericBuilderDesignForKey(draft, key))) reasons.push('generic-builder-layout');
  if (hasHelperLabelElement(design) || (draft && hasHelperLabelElement(draft))) reasons.push('helper-label-elements');
  if (hasNarrowContactTextFrame(design) || (draft && hasNarrowContactTextFrame(draft))) reasons.push('narrow-contact-text');
  if (hasPublishedSnapshotCorruption(config, key)) reasons.push('published-snapshot');
  return [...new Set(reasons)];
}

async function autoRepairCurrentLayoutTemplates() {
  const templates = await PdfTemplate.find({ key: { $in: [...CURRENT_LAYOUT_REPAIR_KEYS] } });
  for (const template of templates) {
    const key = template.key;
    const before = template.config || {};
    const reasons = currentLayoutRepairReasons(before, key);
    if (!reasons.length) continue;
    addVersionSnapshot(template, 'auto_repaired_current_layout');
    template.config = cleanCurrentLayoutConfig(key, before);
    template.version = (template.version || 1) + 1;
    await template.save();
    await logAudit({
      userId: null,
      action: 'pdf_template_auto_repaired_current_layout',
      module: 'pdf_template',
      recordId: template._id,
      before,
      after: { key, version: template.version, reasons }
    }).catch(() => null);
  }
}

async function ensurePdfTemplates() {
  await Promise.all(PDF_TEMPLATE_DEFINITIONS.map((definition) => PdfTemplate.findOneAndUpdate(
    { key: definition.key },
    {
      $set: {
        category: definition.category,
        name: definition.name,
        description: definition.description
      },
      $setOnInsert: {
        status: 'Active',
        version: 1,
        config: sanitizeConfig(definition.defaults, definition.key),
        versions: []
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )));
  await autoRepairCurrentLayoutTemplates();
}

function userSummary(user) {
  if (!user) return null;
  return {
    id: String(user._id || user.id || ''),
    name: user.name || user.username || 'User',
    username: user.username || '',
    role: user.role || ''
  };
}

function serializeVersion(version, key = '') {
  return {
    id: String(version._id || ''),
    version: version.version,
    displayName: version.displayName || '',
    editedAt: version.editedAt,
    editedBy: userSummary(version.editedBy),
    action: version.action || 'updated',
    config: sanitizeConfig(version.config || {}, key)
  };
}

function publishedDesignFor(config = {}, key = '') {
  return sanitizeConfig(config || {}, key).design || {};
}

function draftDesignFor(config = {}, key = '') {
  const rawConfig = isPlainObject(config) ? config : {};
  const sourceDesign = isPlainObject(rawConfig.designDraft)
    ? rawConfig.designDraft
    : rawConfig.design;
  return sanitizeConfig({ ...rawConfig, design: sourceDesign || {} }, key).design || {};
}

function forceDraftDesignState(design = {}) {
  const next = {
    ...design,
    enabled: true,
    confirmed: false,
    published: false,
    previewDraft: false
  };
  delete next.publishedHtml;
  delete next.publishedMeta;
  return next;
}

function forcePublishedDesignState(design = {}) {
  return {
    ...design,
    enabled: true,
    confirmed: true,
    published: true,
    previewDraft: false
  };
}

function editorDraftConfig(config = {}, key = '') {
  const sanitized = sanitizeConfig(config || {}, key);
  const hasDraft = isPlainObject(config?.designDraft);
  const design = hasDraft ? draftDesignFor(config, key) : publishedDesignFor(config, key);
  const next = sanitizeConfig({ ...sanitized, design }, key);
  if (hasDraft) next.designDraft = draftDesignFor(config, key);
  return next;
}

function serializeTemplate(template) {
  const item = template?.toObject ? template.toObject() : template;
  const config = sanitizeConfig(item.config || {}, item.key);
  return {
    id: String(item._id || item.id || ''),
    key: item.key,
    category: item.category,
    name: item.name,
    description: item.description,
    status: item.status || 'Active',
    version: item.version || 1,
    config,
    draftConfig: editorDraftConfig(item.config || {}, item.key),
    lastEditedDate: item.updatedAt || item.createdAt,
    lastEditedBy: userSummary(item.lastEditedBy),
    versions: (item.versions || []).map((version) => serializeVersion(version, item.key)).sort((a, b) => b.version - a.version),
    updatedAt: item.updatedAt,
    createdAt: item.createdAt
  };
}

async function findTemplate(key) {
  await ensurePdfTemplates();
  return PdfTemplate.findOne({ key })
    .populate('lastEditedBy', 'name username role')
    .populate('versions.editedBy', 'name username role');
}

function addVersionSnapshot(template, action = 'updated', options = {}) {
  template.versions.push({
    version: template.version || 1,
    config: sanitizeConfig(options.config || template.config || {}, template.key),
    editedAt: options.editedAt || template.updatedAt || template.createdAt || new Date(),
    editedBy: options.editedBy !== undefined ? options.editedBy : template.lastEditedBy || null,
    action
  });
  if (template.versions.length > 15) template.versions = template.versions.slice(-15);
}

function assertInvoiceDesignKey(key) {
  return assertTemplateKey(key);
}

function draftConfigFromPayload(payload = {}, key = '') {
  const incoming = sanitizeConfig(payload.config || payload, key);
  return {
    config: incoming,
    design: forceDraftDesignState(publishedDesignFor(incoming, key))
  };
}

export async function listPdfTemplates() {
  await ensurePdfTemplates();
  const order = PDF_TEMPLATE_DEFINITIONS.map((definition) => definition.key);
  const rows = await PdfTemplate.find({ key: { $in: order } })
    .populate('lastEditedBy', 'name username role')
    .populate('versions.editedBy', 'name username role')
    .sort({ category: -1, name: 1 });
  return rows.map(serializeTemplate).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

export async function getPdfTemplate(key) {
  const normalized = assertTemplateKey(key);
  const template = await findTemplate(normalized);
  if (!template) throw appError('PDF template not found', 404);
  return serializeTemplate(template);
}

export async function getPdfTemplateManifest(key, options = {}) {
  const template = await getPdfTemplate(key);
  const config = options.config && isPlainObject(options.config)
    ? sanitizeConfig(options.config, template.key)
    : sanitizeConfig(template.config || {}, template.key);
  const company = await getCompanyIdentity().catch(() => COMPANY);
  return buildPdfTemplateManifest(template.key, config, { company });
}

export async function getTemplateByKey(key) {
  if (!definitionsByKey.has(key)) return null;
  const template = await findTemplate(key);
  if (template) {
    const serialized = serializeTemplate(template);
    serialized.config = liveGenerationConfig(template.config || {}, key);
    delete serialized.draftConfig;
    return serialized;
  }
  return {
    key,
    config: sanitizeConfig(defaultConfigFor(key), key)
  };
}

export async function getTemplateByPdfType(type) {
  return getTemplateByKey(templateKeyForPdfType(type));
}

export async function getTemplateByDocumentType(type) {
  return getTemplateByKey(templateKeyForDocumentType(type));
}

export async function updatePdfTemplate(key, payload = {}, user = null) {
  assertAdmin(user);
  const normalized = assertTemplateKey(key);
  const template = await findTemplate(normalized);
  if (!template) throw appError('PDF template not found', 404);
  const before = sanitizeConfig(template.config || {}, normalized);
  const rawConfig = payload.config || payload;
  let nextConfigPayload = rawConfig;
  const existingDesign = isPlainObject(before.design) ? before.design : {};
  const incomingDesign = isPlainObject(rawConfig?.design) ? rawConfig.design : {};
  if (Object.keys(existingDesign).length || Object.keys(incomingDesign).length) {
    nextConfigPayload = {
      ...rawConfig,
      design: {
        ...existingDesign,
        ...incomingDesign,
        published: existingDesign.published === true ? true : incomingDesign.published,
        publishedHtml: incomingDesign.publishedHtml ?? existingDesign.publishedHtml,
        publishedMeta: incomingDesign.publishedMeta ?? existingDesign.publishedMeta
      }
    };
    if (rawConfig?.designDraft === undefined && before.designDraft) {
      nextConfigPayload.designDraft = before.designDraft;
    }
  }
  addVersionSnapshot(template, 'updated');
  template.config = sanitizeConfig(nextConfigPayload, normalized);
  template.version = (template.version || 1) + 1;
  template.lastEditedBy = user?._id || null;
  await template.save();
  await logAudit({
    userId: user?._id || null,
    action: 'pdf_template_updated',
    module: 'pdf_template',
    recordId: template._id,
    before,
    after: { key: normalized, version: template.version, config: template.config }
  });
  return getPdfTemplate(normalized);
}

export async function saveInvoiceDesignDraft(key, payload = {}, user = null) {
  assertAdmin(user);
  const normalized = assertInvoiceDesignKey(key);
  const template = await findTemplate(normalized);
  if (!template) throw appError('PDF template not found', 404);
  const before = sanitizeConfig(template.config || {}, normalized);
  const { design: draftDesign } = draftConfigFromPayload(payload, normalized);
  addVersionSnapshot(template, 'draft_saved');
  const nextConfig = sanitizeConfig(template.config || {}, normalized);
  nextConfig.editMode = 'design';
  nextConfig.advancedEnabled = true;
  nextConfig.structured = {
    ...(nextConfig.structured || {}),
    designModeEnabled: true
  };
  nextConfig.designDraft = draftDesign;
  template.config = sanitizeConfig(nextConfig, normalized);
  template.version = (template.version || 1) + 1;
  template.lastEditedBy = user?._id || null;
  await template.save();
  await logAudit({
    userId: user?._id || null,
    action: 'pdf_template_design_draft_saved',
    module: 'pdf_template',
    recordId: template._id,
    before,
    after: { key: normalized, version: template.version, config: template.config }
  });
  return getPdfTemplate(normalized);
}

export async function publishInvoiceDesign(key, payload = {}, user = null) {
  assertAdmin(user);
  const normalized = assertInvoiceDesignKey(key);
  const template = await findTemplate(normalized);
  if (!template) throw appError('PDF template not found', 404);
  const before = sanitizeConfig(template.config || {}, normalized);
  const clientPublishedSnapshot = safePublishedCanvasSnapshotFrom({
    publishedCanvasHtml: payload.publishedCanvasHtml,
    publishedHtml: payload.publishedHtml,
    publishedMeta: payload.publishedMeta
  }, normalized);
  const { config: incomingConfig, design: draftDesign } = draftConfigFromPayload(payload, normalized);
  const publishedDesign = forcePublishedDesignState(draftDesign);
  const backupConfig = sanitizeConfig({
    ...before,
    design: publishedDesignFor(before, normalized)
  }, normalized);
  delete backupConfig.designDraft;
  addVersionSnapshot(template, 'before_publish_backup', {
    config: backupConfig,
    editedAt: new Date(),
    editedBy: user?._id || null
  });
  const nextConfig = sanitizeConfig({
    ...before,
    ...incomingConfig,
    editMode: 'design',
    advancedEnabled: true,
    structured: {
      ...(before.structured || {}),
      ...(incomingConfig.structured || {}),
      designModeEnabled: true
    },
    design: publishedDesign
  }, normalized);
  const serverPublishedSnapshot = hasVisualDesignContent(nextConfig)
    ? publishedSnapshotForDesign(normalized, nextConfig.design)
    : null;
  applyInvoicePublishedSnapshot(
    nextConfig,
    clientPublishedSnapshot?.publishedHtml ? clientPublishedSnapshot : serverPublishedSnapshot,
    { strict: false, key: normalized }
  );
  delete nextConfig.designDraft;
  template.config = nextConfig;
  template.version = (template.version || 1) + 1;
  template.lastEditedBy = user?._id || null;
  await template.save();
  await logAudit({
    userId: user?._id || null,
    action: 'pdf_template_design_published',
    module: 'pdf_template',
    recordId: template._id,
    before,
    after: { key: normalized, version: template.version, config: template.config }
  });
  return getPdfTemplate(normalized);
}

export async function deleteInvoiceDesignVersion(key, versionId, user = null) {
  assertAdmin(user);
  const normalized = assertInvoiceDesignKey(key);
  const template = await findTemplate(normalized);
  if (!template) throw appError('PDF template not found', 404);
  const version = template.versions.id(versionId) || template.versions.find((item) => String(item.version) === String(versionId));
  if (!version) throw appError('Template version not found', 404);
  const before = {
    key: normalized,
    version: template.version,
    removedVersion: version.version,
    action: version.action || 'updated',
    versionsCount: template.versions.length
  };
  template.versions = template.versions.filter((item) => String(item._id || '') !== String(version._id || versionId) && String(item.version) !== String(versionId));
  template.lastEditedBy = user?._id || null;
  await template.save();
  await logAudit({
    userId: user?._id || null,
    action: 'pdf_template_version_deleted',
    module: 'pdf_template',
    recordId: template._id,
    before,
    after: { key: normalized, version: template.version, versionsCount: template.versions.length }
  });
  return getPdfTemplate(normalized);
}

export async function renameInvoiceDesignVersion(key, versionId, payload = {}, user = null) {
  assertAdmin(user);
  const normalized = assertInvoiceDesignKey(key);
  const template = await findTemplate(normalized);
  if (!template) throw appError('PDF template not found', 404);
  const version = template.versions.id(versionId) || template.versions.find((item) => String(item.version) === String(versionId));
  if (!version) throw appError('Template version not found', 404);
  const displayName = cleanText(payload.displayName ?? payload.name ?? '', '', 120);
  if (!displayName) throw appError('Version name is required', 400);
  const before = {
    key: normalized,
    version: template.version,
    renamedVersion: version.version,
    displayName: version.displayName || ''
  };
  version.displayName = displayName;
  template.lastEditedBy = user?._id || null;
  await template.save();
  await logAudit({
    userId: user?._id || null,
    action: 'pdf_template_version_renamed',
    module: 'pdf_template',
    recordId: template._id,
    before,
    after: { key: normalized, version: template.version, renamedVersion: version.version, displayName }
  });
  return getPdfTemplate(normalized);
}

export async function resetPdfTemplate(key, user = null) {
  assertAdmin(user);
  const normalized = assertTemplateKey(key);
  const template = await findTemplate(normalized);
  if (!template) throw appError('PDF template not found', 404);
  const before = sanitizeConfig(template.config || {}, normalized);
  addVersionSnapshot(template, 'before_reset_backup');
  template.config = sanitizeConfig(defaultConfigFor(normalized), normalized);
  template.version = (template.version || 1) + 1;
  template.lastEditedBy = user?._id || null;
  await template.save();
  await logAudit({
    userId: user?._id || null,
    action: 'pdf_template_reset',
    module: 'pdf_template',
    recordId: template._id,
    before,
    after: { key: normalized, version: template.version, config: template.config }
  });
  return getPdfTemplate(normalized);
}

export async function restoreInvoiceDesignVersionAsDraft(key, versionId, user = null) {
  assertAdmin(user);
  const normalized = assertInvoiceDesignKey(key);
  const template = await findTemplate(normalized);
  if (!template) throw appError('PDF template not found', 404);
  const version = template.versions.id(versionId) || template.versions.find((item) => String(item.version) === String(versionId));
  if (!version) throw appError('Template version not found', 404);
  const before = sanitizeConfig(template.config || {}, normalized);
  const versionConfig = sanitizeConfig(version.config || {}, normalized);
  const sourceDesign = version.action === 'before_publish_backup'
    ? publishedDesignFor(versionConfig, normalized)
    : draftDesignFor(version.config || versionConfig, normalized);
  const draftDesign = forceDraftDesignState(sourceDesign);
  addVersionSnapshot(template, 'restored_as_draft');
  const nextConfig = sanitizeConfig({
    ...before,
    editMode: 'design',
    advancedEnabled: true,
    structured: {
      ...(before.structured || {}),
      designModeEnabled: true
    },
    design: before.design,
    designDraft: draftDesign
  }, normalized);
  template.config = nextConfig;
  template.version = (template.version || 1) + 1;
  template.lastEditedBy = user?._id || null;
  await template.save();
  await logAudit({
    userId: user?._id || null,
    action: 'pdf_template_version_restored_as_draft',
    module: 'pdf_template',
    recordId: template._id,
    before,
    after: { key: normalized, restoredFrom: version.version, version: template.version, config: template.config }
  });
  return getPdfTemplate(normalized);
}

export async function restorePdfTemplateVersion(key, versionId, user = null) {
  assertAdmin(user);
  const normalized = assertTemplateKey(key);
  const template = await findTemplate(normalized);
  if (!template) throw appError('PDF template not found', 404);
  const version = template.versions.id(versionId) || template.versions.find((item) => String(item.version) === String(versionId));
  if (!version) throw appError('Template version not found', 404);
  const before = sanitizeConfig(template.config || {}, normalized);
  addVersionSnapshot(template, 'restored');
  template.config = sanitizeConfig(version.config || {}, normalized);
  template.version = (template.version || 1) + 1;
  template.lastEditedBy = user?._id || null;
  await template.save();
  await logAudit({
    userId: user?._id || null,
    action: 'pdf_template_restored',
    module: 'pdf_template',
    recordId: template._id,
    before,
    after: { key: normalized, restoredFrom: version.version, version: template.version, config: template.config }
  });
  return getPdfTemplate(normalized);
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN');
}

function formatAmount(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

function parseAmountValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value ?? '').trim();
  if (!text || text === '-') return null;
  const normalized = text.replace(/,/g, '').replace(/[^0-9.-]/g, '');
  if (!normalized || normalized === '-' || normalized === '.') return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function wordsBelowThousand(number) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = Math.floor(number);
  if (n < 20) return ones[n];
  if (n < 100) return `${tens[Math.floor(n / 10)]} ${ones[n % 10]}`.trim();
  return `${ones[Math.floor(n / 100)]} Hundred ${wordsBelowThousand(n % 100)}`.trim();
}

function indianNumberWords(value) {
  let n = Math.floor(Number(value || 0));
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const chunks = [];
  if (crore) chunks.push(`${wordsBelowThousand(crore)} Crore`);
  if (lakh) chunks.push(`${wordsBelowThousand(lakh)} Lakh`);
  if (thousand) chunks.push(`${wordsBelowThousand(thousand)} Thousand`);
  if (n) chunks.push(wordsBelowThousand(n));
  return chunks.join(' ');
}

function amountInWords(value) {
  const amount = parseAmountValue(value);
  if (amount === null) return '-';
  const prefix = amount < 0 ? 'Minus ' : '';
  const totalPaise = Math.round(Math.abs(amount) * 100);
  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;
  const rupeeWords = `${prefix}Rupees ${indianNumberWords(rupees)}`;
  if (!paise) return `${rupeeWords} Only`;
  return `${rupeeWords} and Paise ${indianNumberWords(paise)} Only`;
}

function resolvedAmountInWords(source = {}, finalTotal) {
  const explicit = source.amountInWords ?? source.amount_in_words;
  const explicitText = String(explicit ?? '').trim();
  if (explicitText && explicitText !== '-') return explicitText;
  return amountInWords(finalTotal);
}

function safeTemplateValue(value) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function fallbackCompany(company = COMPANY) {
  return {
    name: company.name || COMPANY.name,
    address: company.address || COMPANY.address,
    phones: Array.isArray(company.phones) && company.phones.length ? company.phones : COMPANY.phones,
    email: company.email || COMPANY.email,
    website: company.website || COMPANY.website || 'usmettur.com',
    whatsappNumber: company.whatsappNumber || '',
    logoFilePath: company.logoFilePath || LOGO_FULL_PATH
  };
}

function forceDefaultPreviewConfig(config = {}, key = '') {
  const next = sanitizeConfig(config || {}, key);
  next.editMode = 'structured';
  next.structured = {
    ...(next.structured || {}),
    designModeEnabled: false
  };
  next.design = {
    ...(next.design || {}),
    enabled: false,
    previewDraft: false,
    published: false
  };
  return sanitizeConfig(next, key);
}

function hasVisualDesignContent(config = {}) {
  const design = config.design || {};
  if (design.enabled !== true) return false;
  const elementSource = Array.isArray(design.customElements) && design.customElements.length
    ? design.customElements
    : Array.isArray(design.elements)
      ? design.elements
      : [];
  return [
    ...(Array.isArray(design.sections) ? design.sections : []),
    ...elementSource
  ].some((element) => element && element.enabled !== false && element.visible !== false);
}

function liveGenerationConfig(config = {}, key = '') {
  const next = sanitizeConfig(config || {}, key);
  delete next.designDraft;
  if (next.design?.published === true && hasVisualDesignContent(next)) {
    return next;
  }
  if ((key === 'invoice' || next.design?.published === true) && !hasPublishedDesignHtml(next, key)) {
    return forceDefaultPreviewConfig(next, key);
  }
  return next;
}

function forcePublishedPreviewConfig(config = {}, key = '') {
  const next = liveGenerationConfig(config || {}, key);
  if (next.design?.published !== true || (!hasPublishedDesignHtml(next, key) && !hasVisualDesignContent(next))) {
    return forceDefaultPreviewConfig(next, key);
  }
  next.editMode = 'design';
  next.structured = {
    ...(next.structured || {}),
    designModeEnabled: true
  };
  next.design = {
    ...(next.design || {}),
    enabled: true,
    published: true,
    previewDraft: false
  };
  return sanitizeConfig(next, key);
}

export function canRenderPublishedInvoiceDom(template = {}) {
  const templateKey = clean(template?.key || '');
  const config = template.config || {};
  return definitionsByKey.has(templateKey)
    && (
      hasPublishedDesignHtml(config, templateKey)
      || (config?.design?.published === true && hasVisualDesignContent(config))
    );
}

export async function renderPublishedInvoiceDomTemplate(template = {}, context = {}, filenamePrefix = 'invoice-published-dom') {
  const templateKey = clean(template?.key || '');
  if (!canRenderPublishedInvoiceDom(template)) return null;
  const config = sanitizeConfig(template.config || {}, templateKey);
  const savedSnapshot = publishedSnapshotMatchesDesign(config, templateKey)
    ? {
      publishedHtml: config.design.publishedHtml,
      publishedMeta: config.design.publishedMeta
    }
    : null;
  const generatedSnapshot = !savedSnapshot && config.design?.published === true && hasVisualDesignContent(config)
    ? publishedSnapshotForDesign(templateKey, forcePublishedDesignState(publishedDesignFor(config, templateKey)))
    : null;
  const publishedHtml = savedSnapshot?.publishedHtml || generatedSnapshot?.publishedHtml || config.design?.publishedHtml;
  const publishedMeta = savedSnapshot?.publishedMeta || generatedSnapshot?.publishedMeta || config.design?.publishedMeta;
  if (!publishedHtml || !publishedMeta) return null;
  return renderInvoicePublishedDomPdf({
    key: templateKey,
    publishedHtml,
    publishedMeta,
    context,
    filenamePrefix
  });
}

export function buildTemplateContext(source = {}, company = COMPANY) {
  const currentCompany = fallbackCompany(company);
  const invoiceNumber = source.invoiceNo || source.invoiceNumber || '-';
  const quotationNumber = source.quotationNo || source.quotationNumber || source.quotationNumberDisplay || invoiceNumber;
  const workOrderId = source.workOrderNo || source.workOrderId || '-';
  const amcReference = source.amcContractNo || source.amcReference || source.contractNumber || '-';
  const amcStart = source.amcStartDate || source.startDate || new Date();
  const amcEnd = source.amcEndDate || source.endDate || new Date();
  const totalAmount = source.totalAmount ?? source.finalTotal ?? 0;
  const finalTotal = source.finalTotal ?? source.totalAmount ?? 0;
  const amountPaid = source.amountPaid ?? source.paidAmount ?? 0;
  const balanceDue = source.balanceDue ?? source.balance ?? Math.max(0, Number(finalTotal || 0) - Number(amountPaid || 0));
  const serviceName = safeTemplateValue(source.serviceName) || safeTemplateValue(source.serviceType) || '-';
  const sourceDeviceBrand = safeTemplateValue(source.deviceBrand);
  const sourceDeviceModel = safeTemplateValue(source.deviceModel);
  const sourceModel = safeTemplateValue(source.model);
  const brandModel = safeTemplateValue(source.brandModel) || [sourceDeviceBrand, sourceDeviceModel].filter(Boolean).join(' ').trim();
  const [fallbackDeviceBrand = '-', ...fallbackDeviceModelParts] = String(brandModel || '-').split(' ');
  const invoiceItems = Array.isArray(source.items)
    ? source.items.map((item, index) => ({
      item_index: String(index + 1),
      item_description: item.description || item.name || '-',
      item_quantity: String(item.quantity ?? item.qty ?? 1),
      item_unit_price: formatAmount(item.unitPrice ?? item.price ?? item.rate ?? 0),
      item_total: formatAmount(item.total ?? item.amount ?? 0)
    }))
    : [];
  return {
    company_name: currentCompany.name,
    company_phone: currentCompany.phones.join(' / '),
    company_email: currentCompany.email,
    company_website: currentCompany.website,
    company_address: currentCompany.address || '-',
    customer_name: source.customerName || '-',
    customer_phone: source.customerPhone || '-',
    customer_address: source.customerAddress || '-',
    invoice_no: invoiceNumber,
    invoice_number: invoiceNumber,
    invoice_date: formatDate(source.invoiceDate || new Date()),
    payment_status: source.paymentStatus || source.status || '-',
    quotation_status: source.quotationStatus || source.status || 'Pending Approval',
    quotation_no: quotationNumber,
    quotation_number: quotationNumber,
    quotation_date: formatDate(source.quotationDate || source.invoiceDate || new Date()),
    work_order_no: workOrderId,
    work_order_id: workOrderId,
    amc_contract_no: amcReference,
    amc_reference: amcReference,
    amc_status: source.amcStatus || source.status || 'Active',
    visit_status: source.visitStatus || source.status || 'Completed',
    renewal_status: source.renewalStatus || 'Renewal Due',
    plan_name: source.planName || serviceName,
    coverage_type: source.coverageType || 'Service Support',
    covered_for: source.coveredFor || safeTemplateValue(source.device) || safeTemplateValue(source.deviceName) || '-',
    renewal_period: source.renewalPeriod || `${formatDate(amcEnd)} to ${formatDate(source.renewalEndDate || new Date(new Date(amcEnd).getFullYear() + 1, new Date(amcEnd).getMonth(), new Date(amcEnd).getDate()))}`,
    service_name: serviceName,
    service_type: safeTemplateValue(source.serviceType) || serviceName,
    device: safeTemplateValue(source.device) || '-',
    device_name: safeTemplateValue(source.deviceName) || safeTemplateValue(source.device) || '-',
    device_brand: sourceDeviceBrand || safeTemplateValue(source.brand) || (fallbackDeviceModelParts.length ? fallbackDeviceBrand : '-'),
    device_model: sourceDeviceModel || sourceModel || (fallbackDeviceModelParts.length ? fallbackDeviceModelParts.join(' ') : brandModel || '-'),
    brand_model: brandModel || '-',
    problem_complaint: source.problemComplaint || source.problemDescription || '-',
    problem_description: source.problemDescription || source.problemComplaint || '-',
    technician_name: source.technicianName || '-',
    total_amount: formatAmount(totalAmount),
    subtotal_amount: formatAmount(source.subtotalAmount ?? source.subtotal ?? totalAmount),
    final_total: formatAmount(finalTotal),
    amount_paid: formatAmount(amountPaid),
    balance_due: formatAmount(balanceDue),
    amount_in_words: resolvedAmountInWords(source, finalTotal),
    footer_text: source.footerText || '-',
    technician_notes: source.technicianNotes || source.notes || 'AMC visit completed successfully.',
    item_index: invoiceItems[0]?.item_index || '1',
    item_description: invoiceItems[0]?.item_description || '-',
    item_quantity: invoiceItems[0]?.item_quantity || '1',
    item_unit_price: invoiceItems[0]?.item_unit_price || formatAmount(0),
    item_total: invoiceItems[0]?.item_total || formatAmount(0),
    invoice_items: invoiceItems,
    amc_start_date: formatDate(amcStart),
    amc_end_date: formatDate(amcEnd),
    next_service_date: formatDate(source.nextServiceDate),
    current_date: formatDate(source.currentDate || new Date())
  };
}

export function renderTemplateText(value = '', context = {}) {
  const text = String(value || '');
  return text.replace(/\{\{([a-z0-9_]+)\}\}/gi, (_match, key) => {
    if (!Object.prototype.hasOwnProperty.call(context, key)) return '-';
    const next = context[key];
    return next === undefined || next === null || next === '' ? '-' : next;
  });
}

export function templateAccent(template, fallback = '#0f2a52') {
  return sanitizeColor(template?.config?.colorAccent, fallback);
}

function logPdfPreviewFallback(error, key, renderer) {
  const label = renderer || 'PDF';
  const templateKey = clean(key || 'unknown') || 'unknown';
  const details = error?.stack || error?.message || error;
  console.error(`[PDF template preview] ${label} renderer failed for "${templateKey}". Falling back to the safe sample renderer.`, details);
}

export function workOrderTemplateContext(workOrder = {}, company = COMPANY) {
  const customer = workOrder.customerId || {};
  const contract = workOrder.amcContractId || {};
  const invoice = workOrder.invoiceId || contract.invoiceId || {};
  const visits = Array.isArray(contract.visits) ? contract.visits : [];
  const nextVisit = visits
    .filter((visit) => visit?.scheduledDate && new Date(visit.scheduledDate).getTime() >= Date.now())
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0];
  const fallbackTotal = Number(workOrder.serviceCharge || 0)
    + (workOrder.partsUsed || []).reduce((sum, part) => sum + Number(part.total || 0), 0);
  const total = invoice.total != null
    ? Number(invoice.total || 0)
    : contract.contractValue != null
      ? Number(contract.contractValue || 0)
      : fallbackTotal;
  const workOrderItems = [];
  const serviceCharge = Number(workOrder.serviceCharge || 0);
  if (serviceCharge > 0) {
    workOrderItems.push({
      description: `${workOrder.serviceType || workOrder.device || 'Service'} Charge`,
      quantity: 1,
      unitPrice: serviceCharge,
      total: serviceCharge
    });
  }
  (Array.isArray(workOrder.partsUsed) ? workOrder.partsUsed : []).forEach((part) => {
    const quantity = Number(part.quantity || part.qty || 1);
    const unitPrice = Number(part.unitPrice ?? part.price ?? part.rate ?? 0);
    workOrderItems.push({
      description: part.name || part.partName || part.description || 'Part',
      quantity,
      unitPrice,
      total: Number(part.total ?? quantity * unitPrice)
    });
  });
  const brandModel = [workOrder.deviceBrand, workOrder.deviceModel].map((value) => String(value || '').trim()).filter(Boolean).join(' ')
    || workOrder.brandModel
    || workOrder.deviceModel
    || workOrder.model;
  return buildTemplateContext({
    customerName: customer.name,
    customerPhone: customer.phone,
    customerAddress: customer.address,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.createdAt || new Date(),
    quotationStatus: 'Pending Approval',
    workOrderId: workOrder.bookingId?.bookingCode || `WO-${String(workOrder._id || '').slice(-6).toUpperCase()}`,
    amcReference: contract.contractNumber || contract.amcReference || contract.referenceNo,
    amcStatus: contract.status || 'Active',
    visitStatus: 'Completed',
    renewalStatus: 'Renewal Due',
    planName: contract.planName || contract.contractType || 'Computer AMC Support',
    coverageType: contract.coverageType || 'Service Support',
    coveredFor: contract.coveredFor || workOrder.device || contract.contractType,
    technicianNotes: workOrder.technicianNotes || workOrder.notes || 'AMC visit completed successfully.',
    serviceName: workOrder.serviceType || workOrder.device || contract.contractType,
    serviceType: workOrder.serviceType || contract.contractType,
    device: workOrder.device,
    brandModel,
    problemComplaint: workOrder.problemDescription || workOrder.problemComplaint || workOrder.customerComplaint,
    technicianName: workOrder.technicianId?.name || workOrder.technicianId?.username || 'Admin',
    totalAmount: total,
    finalTotal: invoice.total ?? contract.contractValue ?? total,
    amountPaid: invoice.amountPaid ?? invoice.paidAmount ?? contract.amountPaid,
    balanceDue: invoice.balance ?? contract.balance,
    amcStartDate: contract.startDate,
    amcEndDate: contract.endDate,
    renewalPeriod: contract.endDate
      ? `${formatDate(contract.endDate)} to ${formatDate(new Date(new Date(contract.endDate).getFullYear() + 1, new Date(contract.endDate).getMonth(), new Date(contract.endDate).getDate()))}`
      : undefined,
    nextServiceDate: nextVisit?.scheduledDate,
    items: workOrderItems
  }, company);
}

export function documentTemplateContext(document = {}, company = COMPANY) {
  const customer = document.customerId || {};
  const workOrder = document.workOrderId || {};
  const invoice = document.invoiceId || {};
  const brandModel = [workOrder.deviceBrand, workOrder.deviceModel].map((value) => String(value || '').trim()).filter(Boolean).join(' ')
    || workOrder.brandModel
    || workOrder.deviceModel
    || workOrder.model;
  const documentItems = [
    ...(Number(document.serviceCharge || 0) > 0
      ? [{ description: 'General Service', quantity: 1, unitPrice: document.serviceCharge, total: document.serviceCharge }]
      : []),
    ...(Array.isArray(document.items) ? document.items : []).map((item) => ({
      description: item.name || item.description || 'Item',
      quantity: item.quantity || 1,
      unitPrice: item.price ?? item.unitPrice ?? 0,
      total: item.subtotal ?? item.total ?? 0
    }))
  ];
  return buildTemplateContext({
    customerName: customer.name,
    customerPhone: customer.phone,
    customerAddress: customer.address,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.createdAt || document.createdAt,
    workOrderId: workOrder.bookingId?.bookingCode || `WO-${String(workOrder._id || workOrder.id || '').slice(-6).toUpperCase()}`,
    quotationNumber: document.quotationNumber || document.documentNumber,
    serviceName: workOrder.serviceType || workOrder.device,
    serviceType: workOrder.serviceType,
    device: workOrder.device,
    brandModel,
    problemComplaint: workOrder.problemDescription || workOrder.problemComplaint || workOrder.customerComplaint,
    technicianName: workOrder.technicianId?.name || workOrder.technicianId?.username || 'Admin',
    totalAmount: document.totalAmount || invoice.total || 0,
    finalTotal: document.finalTotal || invoice.total || document.totalAmount || 0,
    amountPaid: document.amountPaid || invoice.amountPaid || invoice.paidAmount || 0,
    balanceDue: document.balanceDue || invoice.balance || 0,
    items: documentItems
  }, company);
}

function sampleContextFor(key, company = COMPANY) {
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 30);
  const invoiceSample = key === 'invoice' ? sampleInvoiceData() : null;
  return buildTemplateContext({
    customerName: 'Rahul Kumar',
    customerPhone: '98427 81971',
    customerAddress: 'Mettur Dam, Salem',
    invoiceNumber: key === 'quotation' ? 'QUO-2026-0066' : 'INV-2026-0089',
    quotationNumber: 'QUO-2026-0066',
    quotationStatus: 'Pending Approval',
    invoiceDate: now,
    workOrderId: 'WO-2026-0123',
    amcReference: 'AMC-2026-0012',
    amcStatus: 'Active',
    visitStatus: 'Completed',
    renewalStatus: 'Renewal Due',
    planName: 'Computer AMC Support',
    coverageType: 'Service Support',
    coveredFor: 'Desktop / Laptop / Computer System',
    technicianNotes: 'AMC visit completed successfully.\nNo major issue found.',
    serviceName: key.startsWith('amc') ? 'Computer AMC Support' : 'Laptop Service',
    serviceType: key.startsWith('amc') ? 'AMC Support' : 'Laptop Service',
    device: 'Laptop',
    brandModel: 'Dell Inspiron 15',
    problemComplaint: 'System running slow and needs RAM upgrade.',
    technicianName: 'Arjun',
    totalAmount: key.startsWith('amc') ? 12500 : 2850,
    finalTotal: key.startsWith('amc') ? 12500 : 2850,
    amountPaid: key.startsWith('amc') ? 12500 : 0,
    balanceDue: key.startsWith('amc') ? 0 : 2850,
    items: invoiceSample?.items || [],
    amcStartDate: now,
    amcEndDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
    nextServiceDate: next
  }, company);
}

function drawPreviewPdf(doc, template, company = COMPANY, businessSettings = null) {
  const currentCompany = fallbackCompany(company);
  const config = template.config || {};
  const context = sampleContextFor(template.key, currentCompany);
  const accent = templateAccent(template);
  if (template.key === 'service-completed') {
    renderServiceCompletedPdf(doc, {
      company: currentCompany,
      template,
      context,
      service: sampleServiceCompletedData()
    });
    return;
  }
  if (template.key === 'invoice') {
    renderInvoicePdf(doc, {
      company: currentCompany,
      template,
      context,
      invoice: sampleInvoiceData()
    });
    return;
  }
  if (template.key === 'quotation') {
    renderQuotationPdf(doc, {
      company: currentCompany,
      template,
      context,
      taxSettings: businessSettings?.taxGst || {},
      quotation: sampleQuotationData()
    });
    return;
  }
  if (template.key === 'amc-contract') {
    renderAmcContractPdf(doc, {
      company: currentCompany,
      template,
      context,
      contract: sampleAmcContractData()
    });
    return;
  }
  if (template.key === 'amc-service-visit') {
    renderAmcServiceVisitPdf(doc, {
      company: currentCompany,
      template,
      context,
      visit: sampleAmcVisitData()
    });
    return;
  }
  if (template.key === 'amc-renewal-reminder') {
    renderAmcRenewalPdf(doc, {
      company: currentCompany,
      template,
      context,
      renewal: sampleAmcRenewalData()
    });
    return;
  }
  doc.fillColor(accent);
  const logoPath = currentCompany.logoFilePath || LOGO_FULL_PATH;
  if (config.showCompanyLogo !== false && logoPath && fs.existsSync(logoPath)) doc.image(logoPath, 42, 30, { width: 145 });
  doc.fontSize(17).fillColor(accent).text(currentCompany.name, 330, 34, { width: 210, align: 'right' });
  if (config.showCompanyDetails) {
    doc.fontSize(9).fillColor('#32445c').text(String(currentCompany.address || '').replace(/\n/g, ', '), 300, 60, { width: 240, align: 'right' });
    doc.text(`Phone: ${currentCompany.phones.join(' / ')}`, 300, 98, { width: 240, align: 'right' });
    doc.text(`Email: ${currentCompany.email}`, 300, 114, { width: 240, align: 'right' });
  }
  doc.roundedRect(40, 150, 515, 34, 4).fill(accent);
  doc.fillColor('#ffffff').fontSize(15).text(renderTemplateText(config.headerTitle, context), 52, 160);
  doc.fillColor('#0f172a').fontSize(12).text('Sample Customer Details', 52, 210);
  doc.fillColor('#334155').fontSize(10);
  doc.text(`Customer: ${context.customer_name}`, 52, 235);
  doc.text(`Phone: ${context.customer_phone}`, 52, 252);
  doc.text(`Work Order: ${context.work_order_id}`, 52, 269);
  doc.text(`Service: ${context.service_name}`, 310, 235);
  doc.text(`Technician: ${context.technician_name}`, 310, 252);
  doc.text(`Total: ${context.total_amount}`, 310, 269);
  doc.roundedRect(48, 315, 500, 28, 2).fill('#eaf1fb');
  doc.fillColor(accent).fontSize(10).text('Description', 58, 324).text('Amount', 430, 324);
  doc.fillColor('#334155').text('Template preview line item', 58, 358).text(context.total_amount, 430, 358);
  let y = 410;
  [
    ['Notes / Warranty', config.notesWarrantyText],
    ['Terms & Conditions', config.termsAndConditions],
    ['Payment / Bank Details', config.paymentBankDetails],
    ['AMC Terms', config.amcTerms]
  ].forEach(([label, value]) => {
    if (!value) return;
    doc.fillColor('#0f172a').fontSize(11).text(label, 52, y);
    doc.fillColor('#334155').fontSize(9).text(renderTemplateText(value, context), 52, y + 16, { width: 492, lineGap: 3 });
    y += Math.max(58, doc.heightOfString(renderTemplateText(value, context), { width: 492 }) + 36);
  });
  if (config.signatureSection) {
    doc.strokeColor('#94a3b8').lineWidth(0.7).moveTo(350, 700).lineTo(520, 700).stroke();
    doc.fillColor('#334155').fontSize(9).text(renderTemplateText(config.signatureSection, context), 365, 710);
  }
  doc.strokeColor('#cbd5e1').lineWidth(0.7).moveTo(40, 770).lineTo(555, 770).stroke();
  doc.fontSize(8).fillColor('#64748b').text(renderTemplateText(config.footerText, context), 40, 778, { width: 515, align: 'center' });
}

async function renderStructuredTemplatePreviewPdf(template, company, businessSettings, filenameSuffix = 'template-preview') {
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const filename = `${template.key}-${filenameSuffix}-${Date.now()}.pdf`;
  const filePath = path.join(PDF_DIR, filename);
  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    try {
      drawPreviewPdf(doc, template, company, businessSettings);
      doc.end();
    } catch (error) {
      doc.end();
      reject(error);
      return;
    }
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  return { filePath, filename };
}

export async function generatePdfTemplatePreview(key, options = {}) {
  const previewIntent = String(options.previewIntent || '').toLowerCase();
  if (previewIntent === 'draft') {
    try {
      return await renderInvoiceDraftDomPreviewPdf({
        key,
        draftCanvasHtml: options.draftCanvasHtml,
        draftMeta: options.draftMeta
      });
    } catch (error) {
      logPdfPreviewFallback(error, key, 'Draft design');
    }
  }
  const publishedPreview = previewIntent === 'published' || previewIntent === 'live';
  const template = await getPdfTemplate(key);
  if (!publishedPreview && options.config && isPlainObject(options.config)) {
    template.config = sanitizeConfig(options.config, template.key);
  }
  if (previewIntent === 'default') {
    template.config = forceDefaultPreviewConfig(template.config || {}, template.key);
  } else if (publishedPreview) {
    template.config = forcePublishedPreviewConfig(template.config || {}, template.key);
  }
  const [company, businessSettings] = await Promise.all([
    getCompanyIdentity(),
    getBusinessSettings().catch(() => null)
  ]);
  if (publishedPreview && canRenderPublishedInvoiceDom(template)) {
    try {
      const publishedPdf = await renderPublishedInvoiceDomTemplate(
        template,
        sampleContextFor(template.key, fallbackCompany(company)),
        `${template.key}-published-template-preview`
      );
      if (publishedPdf) return publishedPdf;
    } catch (error) {
      logPdfPreviewFallback(error, template.key, 'Published design');
      template.config = hasVisualDesignContent(template.config || {})
        ? forcePublishedPreviewConfig(template.config || {}, template.key)
        : forceDefaultPreviewConfig(template.config || {}, template.key);
    }
  }
  try {
    return await renderStructuredTemplatePreviewPdf(template, company, businessSettings);
  } catch (error) {
    logPdfPreviewFallback(error, template.key, 'Structured sample');
    const fallbackTemplate = {
      ...template,
      config: forceDefaultPreviewConfig({}, template.key)
    };
    return renderStructuredTemplatePreviewPdf(fallbackTemplate, company, businessSettings, 'default-template-preview');
  }
}
