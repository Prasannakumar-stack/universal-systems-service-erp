import { COMPANY } from '../config.js';
import { clean } from '../utils/http.js';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const NAVY = '#082a73';
const TEXT = '#1e293b';
const MUTED = '#64748b';
const BORDER = '#103a8a';
const LIGHT_BLUE = '#f1f7ff';
const GREEN = '#0a7a5f';
const TEMPLATE_NAMES = {
  invoice: 'Invoice PDF',
  quotation: 'Quotation / Estimate PDF',
  'service-completed': 'Service Report PDF',
  'amc-contract': 'AMC Contract PDF',
  'amc-service-visit': 'AMC Visit / Service Report PDF',
  'amc-renewal-reminder': 'AMC Renewal / Expiry Reminder PDF'
};

function element(id, type, label, frame, patch = {}) {
  return {
    id,
    type,
    label,
    name: label,
    title: label,
    pageId: patch.pageId || 'page-1',
    page: 1,
    groupId: patch.groupId || '',
    locked: patch.locked === true,
    core: patch.core !== false,
    printSafe: patch.printSafe ?? false,
    visible: patch.visible !== false,
    enabled: patch.enabled !== false,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
    widthMode: 'custom',
    zIndex: patch.zIndex || 20,
    content: patch.content || {},
    style: {
      accentColor: patch.accentColor || NAVY,
      backgroundColor: patch.backgroundColor || '#ffffff',
      textColor: patch.textColor || TEXT,
      borderColor: patch.borderColor || BORDER,
      borderRadius: patch.borderRadius ?? 0,
      borderWidth: patch.borderWidth ?? 0,
      fontSize: patch.fontSize || 11,
      fontWeight: patch.fontWeight || 600,
      alignment: patch.alignment || 'left',
      padding: patch.padding ?? 0,
      paddingX: patch.paddingX ?? 0,
      paddingY: patch.paddingY ?? 0,
      lineHeight: patch.lineHeight ?? 1.16,
      ...(patch.style || {})
    },
    manifest: {
      source: 'current-pdf-layout',
      semanticId: id,
      textToken: patch.textToken || '',
      sampleText: patch.sampleText || ''
    }
  };
}

function textElement(id, label, frame, text, patch = {}) {
  return element(id, 'text', label, frame, {
    ...patch,
    content: { text, ...(patch.content || {}) },
    sampleText: text
  });
}

function dividerElement(id, label, x, y, width, patch = {}) {
  return element(id, 'divider', label, { x, y: y - 10, width, height: 20 }, {
    ...patch,
    content: { label: patch.content?.label || '' },
    style: {
      dividerThickness: patch.thickness || 1,
      dividerStyle: patch.dividerStyle || 'solid',
      accentColor: patch.accentColor || NAVY,
      ...(patch.style || {})
    }
  });
}

function cardElement(id, label, frame, title, body, patch = {}) {
  return element(id, 'card', label, frame, {
    ...patch,
    content: { title, body, ...(patch.content || {}) },
    backgroundColor: patch.backgroundColor || '#ffffff',
    borderRadius: patch.borderRadius ?? 8,
    borderWidth: patch.borderWidth ?? 1
  });
}

const DEFAULT_INVOICE_TERMS = [
  'Payment is required before delivery or as per company policy.',
  'Warranty, if applicable, covers only the parts or services mentioned in this invoice.',
  'Products once delivered should be checked and verified by the customer.',
  'Additional work or parts not mentioned in this invoice will be charged separately.'
];

const DEFAULT_NOTICE_LINES = [
  'Service completed successfully.',
  'You may visit our store to collect your product or arrange for delivery as per your convenience.'
];

function listLines(value = '', fallback = []) {
  const source = String(value || '').trim()
    ? String(value || '').split('\n')
    : fallback;
  return source
    .map((line) => String(line || '').replace(/^[-*\u2022]?\s*\d*\.?\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 4);
}

function invoiceTermsLines(config = {}) {
  const configured = String(config.sections?.terms?.text || config.termsAndConditions || '').trim();
  const oldDefault = /Payment is due before product delivery\.\s*Warranty is subject/i;
  if (!configured || oldDefault.test(configured)) return DEFAULT_INVOICE_TERMS;
  return listLines(configured, DEFAULT_INVOICE_TERMS);
}

function sectionFlag(config = {}, sectionName = '', flagName = '', fallback = true) {
  const section = config.sections?.[sectionName] || {};
  return section[flagName] ?? fallback;
}

function canvasText(id, label, frame, text, patch = {}) {
  return textElement(id, label, frame, text, {
    ...patch,
    backgroundColor: patch.backgroundColor || 'transparent',
    borderWidth: patch.borderWidth ?? 0,
    style: {
      padding: 0,
      paddingX: 0,
      paddingY: 0,
      backgroundColor: patch.backgroundColor || 'transparent',
      borderWidth: patch.borderWidth ?? 0,
      borderRadius: 0,
      fontSize: patch.fontSize || 9,
      fontWeight: patch.fontWeight || 700,
      textColor: patch.textColor || patch.style?.textColor || TEXT,
      alignment: patch.alignment || patch.style?.alignment || 'left',
      lineHeight: patch.lineHeight ?? patch.style?.lineHeight ?? 1.16,
      ...(patch.style || {})
    }
  });
}

function canvasBox(id, label, frame, patch = {}) {
  return cardElement(id, label, frame, '', '', {
    ...patch,
    content: { boxOnly: true, ...(patch.content || {}) },
    style: {
      padding: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: 1,
      fontWeight: 400,
      lineHeight: patch.lineHeight ?? patch.style?.lineHeight ?? 1.16,
      ...(patch.style || {})
    }
  });
}

function canvasLine(id, label, frame, patch = {}) {
  return element(id, 'divider', label, frame, {
    ...patch,
    content: { label: patch.content?.label || '' },
    backgroundColor: 'transparent',
    borderWidth: 0,
    style: {
      padding: 0,
      paddingX: 0,
      paddingY: 0,
      backgroundColor: 'transparent',
      borderWidth: 0,
      dividerThickness: patch.thickness || 1,
      dividerStyle: patch.dividerStyle || 'solid',
      accentColor: patch.accentColor || NAVY,
      lineHeight: patch.lineHeight ?? patch.style?.lineHeight ?? 1.16,
      ...(patch.style || {})
    }
  });
}

function canvasIcon(id, label, frame, variant, patch = {}) {
  return element(id, 'icon', label, frame, {
    ...patch,
    content: { label: patch.content?.label || '', iconName: variant, variant, ...(patch.content || {}) },
    backgroundColor: 'transparent',
    borderWidth: 0,
    fontSize: patch.fontSize || 12,
    style: {
      padding: 0,
      paddingX: 0,
      paddingY: 0,
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderRadius: 0,
      accentColor: patch.accentColor || NAVY,
      textColor: patch.textColor || patch.accentColor || NAVY,
      fontSize: patch.fontSize || 12,
      lineHeight: patch.lineHeight ?? patch.style?.lineHeight ?? 1.16,
      ...(patch.style || {})
    }
  });
}

function detailTextTriplet(prefix, label, value, x, y, widths = {}, patch = {}) {
  const labelWidth = widths.label || 100;
  const colonX = x + labelWidth + 5;
  const valueX = colonX + 18;
  const visible = patch.visible !== false;
  const groupId = patch.groupId || prefix.split('.').slice(0, -1).join('.');
  return [
    canvasText(`${prefix}.label`, `${label} Label`, { x, y, width: labelWidth, height: widths.height || 14 }, label, {
      ...patch,
      visible,
      enabled: visible,
      groupId,
      fontSize: widths.fontSize || 8.8,
      fontWeight: 800,
      textColor: TEXT
    }),
    canvasText(`${prefix}.colon`, `${label} Colon`, { x: colonX, y, width: 10, height: widths.height || 14 }, ':', {
      ...patch,
      visible,
      enabled: visible,
      groupId,
      fontSize: widths.fontSize || 8.8,
      fontWeight: 800,
      alignment: 'center',
      textColor: TEXT
    }),
    canvasText(`${prefix}.value`, `${label} Value`, { x: valueX, y, width: widths.value || 100, height: widths.valueHeight || widths.height || 16 }, value, {
      ...patch,
      visible,
      enabled: visible,
      groupId,
      fontSize: widths.fontSize || 8.8,
      fontWeight: widths.valueWeight || 700,
      textColor: widths.valueColor || NAVY
    })
  ];
}

function invoiceManifest(config = {}, company = COMPANY) {
  const title = clean(config.header?.title || config.headerTitle || 'INVOICE').toUpperCase();
  const termsVisible = config.sections?.terms?.show !== false;
  const noticeVisible = config.sections?.workCompletionNotice?.show !== false;
  const amountWordsVisible = sectionFlag(config, 'amountSummary', 'showAmountInWords', true) !== false;
  const termsLines = invoiceTermsLines(config);
  const noticeLines = Array.isArray(config.sections?.workCompletionNotice?.messageLines)
    ? config.sections.workCompletionNotice.messageLines
    : DEFAULT_NOTICE_LINES;
  const elements = [];
  const add = (items) => {
    if (Array.isArray(items)) elements.push(...items);
    else elements.push(items);
  };

  add(element('invoice.watermark', 'image', 'Watermark', { x: 54, y: 236, width: 487, height: 487 }, {
    groupId: 'watermark',
    zIndex: 5,
    locked: true,
    content: {
      label: 'Watermark',
      imageMode: 'watermark',
      assetPath: '/logo-icon.png',
      fitToFrame: true,
      backgroundElement: true
    },
    style: { opacity: 0.06, backgroundColor: 'transparent', borderWidth: 0, padding: 0 }
  }));

  add(element('invoice.logo', 'image', 'Header Logo', { x: 28, y: 10, width: 270, height: 88 }, {
    groupId: 'header',
    zIndex: 10,
    content: { label: 'Company Logo', imageMode: 'logo', assetPath: '/logo-full.png', fitToFrame: true },
    borderWidth: 0,
    style: { padding: 0, backgroundColor: 'transparent', borderWidth: 0 }
  }));
  add(canvasText('invoice.companyTagline', 'Company Tagline', { x: 128, y: 91, width: 178, height: 12 }, 'Repair | Service | Sales | AMC', {
    groupId: 'header',
    zIndex: 11,
    fontSize: 9.3,
    fontWeight: 500,
    alignment: 'center'
  }));
  [
    ['address', 'Company Address', '{{company_address}}', 10, 38, 8.65],
    ['phone', 'Company Phone', '{{company_phone}}', 57, 16, 9],
    ['email', 'Company Email', '{{company_email}}', 76, 16, 9],
    ['website', 'Company Website', '{{company_website}}', 95, 16, 9]
  ].forEach(([variant, label, value, y, height, fontSize], index) => {
    add(canvasIcon(`invoice.header.${variant}Icon`, `${label} Icon`, { x: 342, y: y + 0.5, width: 18, height: 18 }, variant, {
      groupId: 'header',
      zIndex: 12 + index * 2,
      fontSize: 10
    }));
    add(canvasText(`invoice.header.${variant}Text`, label, { x: 367, y, width: 188, height }, value, {
      groupId: 'header',
      zIndex: 13 + index * 2,
      fontSize,
      fontWeight: 500,
      textColor: TEXT,
      textToken: value
    }));
  });
  add(canvasLine('invoice.headerDivider', 'Header Divider', { x: 28, y: 118.5, width: 539, height: 2 }, { groupId: 'header', zIndex: 20, thickness: 0.8 }));

  add(canvasLine('invoice.titleLeftRule', 'Title Left Rule', { x: 132, y: 138.4, width: 92, height: 2 }, { groupId: 'title', zIndex: 24, thickness: 1.2 }));
  add(canvasIcon('invoice.titleLeftDot', 'Title Left Dot Accent', { x: 220.2, y: 135.2, width: 7.6, height: 7.6 }, 'dot', { groupId: 'title', zIndex: 25, fontSize: 8 }));
  add(canvasText('invoice.title', 'Invoice Title', { x: 225, y: 125, width: 145, height: 31 }, title, {
    groupId: 'title',
    zIndex: 26,
    fontSize: 25,
    fontWeight: 800,
    alignment: 'center',
    textColor: NAVY,
    textToken: '{{invoice_title}}'
  }));
  add(canvasIcon('invoice.titleRightDot', 'Title Right Dot Accent', { x: 367.2, y: 135.2, width: 7.6, height: 7.6 }, 'dot', { groupId: 'title', zIndex: 27, fontSize: 8 }));
  add(canvasLine('invoice.titleRightRule', 'Title Right Rule', { x: 371, y: 138.4, width: 92, height: 2 }, { groupId: 'title', zIndex: 28, thickness: 1.2 }));

  add(canvasBox('invoice.detailsCard', 'Invoice And Customer Details Card', { x: 28, y: 154, width: 539, height: 132 }, {
    groupId: 'details',
    zIndex: 30,
    borderRadius: 7,
    borderWidth: 0.7,
    borderColor: '#103a8a'
  }));
  add(canvasLine('invoice.detailsDivider', 'Details Vertical Divider', { x: 303.5, y: 166, width: 1, height: 109 }, {
    groupId: 'details',
    zIndex: 31,
    thickness: 0.8,
    accentColor: '#9bb4df',
    style: { orientation: 'vertical' }
  }));
  [
    ['invoice', 'invoiceNumber', 'Invoice No', '{{invoice_number}}', 176, sectionFlag(config, 'invoiceDetails', 'showInvoiceNumber', true) !== false],
    ['work', 'jobReference', 'Job Reference', '{{work_order_id}}', 203, sectionFlag(config, 'invoiceDetails', 'showJobReference', true) !== false],
    ['date', 'invoiceDate', 'Invoice Date', '{{invoice_date}}', 230, sectionFlag(config, 'invoiceDetails', 'showInvoiceDate', true) !== false],
    ['status', 'paymentStatus', 'Payment Status', '{{payment_status}}', 257, sectionFlag(config, 'invoiceDetails', 'showPaymentStatus', true) !== false]
  ].forEach(([icon, key, label, value, y, visible], index) => {
    add(canvasIcon(`invoice.details.${key}.icon`, `${label} Icon`, { x: 42, y: y - 5, width: 18, height: 20 }, icon, {
      groupId: 'details',
      zIndex: 34 + index * 4,
      visible,
      enabled: visible
    }));
    add(detailTextTriplet(`invoice.details.${key}`, label, value, 78, y, { label: 128, value: 68, fontSize: 8.8 }, {
      groupId: 'details',
      zIndex: 35 + index * 4,
      visible,
      enabled: visible
    }));
  });
  [
    ['customerName', 'Customer Name', '{{customer_name}}', 176, 14, sectionFlag(config, 'customerDetails', 'showCustomerName', true) !== false],
    ['phoneNumber', 'Phone Number', '{{customer_phone}}', 203, 14, sectionFlag(config, 'customerDetails', 'showPhoneNumber', true) !== false],
    ['address', 'Address', '{{customer_address}}', 230, 44, sectionFlag(config, 'customerDetails', 'showAddress', true) !== false]
  ].forEach(([key, label, value, y, height, visible], index) => {
    add(detailTextTriplet(`invoice.customer.${key}`, label, value, 330, y, { label: 93, value: 94, height, valueHeight: height, fontSize: 8.8, valueWeight: key === 'address' ? 500 : 700, valueColor: key === 'address' ? TEXT : NAVY }, {
      groupId: 'details',
      zIndex: 54 + index * 4,
      visible,
      enabled: visible
    }));
  });

  add(canvasBox('invoice.serviceHeaderFill', 'Service Details Header Fill', { x: 28.5, y: 294.5, width: 538, height: 25 }, {
    groupId: 'service',
    zIndex: 70,
    backgroundColor: LIGHT_BLUE,
    borderColor: LIGHT_BLUE,
    borderWidth: 0,
    borderRadius: 6
  }));
  add(canvasBox('invoice.serviceCard', 'Service Details Card', { x: 28, y: 294, width: 539, height: 108 }, {
    groupId: 'service',
    zIndex: 71,
    backgroundColor: 'transparent',
    borderRadius: 7,
    borderWidth: 0.7,
    borderColor: '#103a8a'
  }));
  add(canvasText('invoice.serviceTitle', 'Service Details Title', { x: 40, y: 304, width: 160, height: 14 }, 'SERVICE DETAILS', {
    groupId: 'service',
    zIndex: 72,
    fontSize: 10.6,
    fontWeight: 800,
    textColor: NAVY
  }));
  add(canvasLine('invoice.serviceDivider', 'Service Details Column Divider', { x: 303.5, y: 326, width: 1, height: 65 }, {
    groupId: 'service',
    zIndex: 73,
    thickness: 0.8,
    accentColor: '#9bb4df',
    style: { orientation: 'vertical' }
  }));
  [
    ['serviceType', 'Service Type', '{{service_type}}', 335, sectionFlag(config, 'serviceDetails', 'showServiceType', true) !== false],
    ['device', 'Device', '{{device_name}}', 358, sectionFlag(config, 'serviceDetails', 'showDevice', true) !== false],
    ['brandModel', 'Brand / Model', '{{device_brand}} {{device_model}}', 381, sectionFlag(config, 'serviceDetails', 'showBrandModel', true) !== false]
  ].forEach(([key, label, value, y, visible], index) => {
    add(detailTextTriplet(`invoice.service.left.${key}`, label, value, 45, y, { label: 99, value: 118, fontSize: 8.8 }, {
      groupId: 'service',
      zIndex: 74 + index * 4,
      visible,
      enabled: visible
    }));
  });
  add(detailTextTriplet('invoice.service.right.problem', 'Problem / Complaint', '{{problem_description}}', 330, 335, {
    label: 105,
    value: 82,
    height: 32,
    valueHeight: 32,
    fontSize: 8.8,
    valueWeight: 500
  }, {
    groupId: 'service',
    zIndex: 90,
    visible: sectionFlag(config, 'serviceDetails', 'showProblemComplaint', true) !== false,
    enabled: sectionFlag(config, 'serviceDetails', 'showProblemComplaint', true) !== false
  }));
  add(detailTextTriplet('invoice.service.right.technician', 'Technician', '{{technician_name}}', 330, 370, {
    label: 92,
    value: 86,
    fontSize: 8.8
  }, {
    groupId: 'service',
    zIndex: 96,
    visible: sectionFlag(config, 'serviceDetails', 'showTechnician', true) !== false,
    enabled: sectionFlag(config, 'serviceDetails', 'showTechnician', true) !== false
  }));

  add(element('invoice.itemsTable', 'table', 'Item Table', { x: 28, y: 409, width: 539, height: 82 }, {
    groupId: 'items',
    zIndex: 110,
    borderRadius: 6,
    borderWidth: 0.7,
    borderColor: BORDER,
    content: {
      title: '',
      columns: ['S.No', 'Description', 'Qty', 'Unit Price', 'Total'],
      columnWidths: [48, 176, 72, 108, 108],
      previewRowCount: 1,
      dynamicRows: true,
      rowTemplate: ['{{item_index}}', '{{item_description}}', '{{item_quantity}}', '{{item_unit_price}}', '{{item_total}}'],
      rows: [
        ['{{item_index}}', '{{item_description}}', '{{item_quantity}}', '{{item_unit_price}}', '{{item_total}}']
      ]
    },
    style: {
      padding: 0,
      paddingX: 4,
      paddingY: 5,
      rowHeight: 24,
      fontSize: 10,
      accentColor: NAVY,
      headerBackgroundColor: NAVY,
      headerTextColor: '#ffffff',
      rowBackgroundColor: '#ffffff',
      alternateRowBackgroundColor: '#f8fafc',
      borderColor: BORDER,
      borderWidth: 0.7,
      alignment: 'left'
    }
  }));

  add(canvasBox('invoice.amountWordsCard', 'Amount In Words Card', { x: 28, y: 498, width: 248, height: 104 }, {
    groupId: 'amount',
    zIndex: 120,
    visible: amountWordsVisible,
    enabled: amountWordsVisible,
    borderRadius: 7,
    borderWidth: 0.7,
    borderColor: '#103a8a'
  }));
  add(canvasIcon('invoice.amountWordsIcon', 'Amount In Words Rupee Icon', { x: 57, y: 529, width: 36, height: 36 }, 'rupee', {
    groupId: 'amount',
    zIndex: 121,
    visible: amountWordsVisible,
    enabled: amountWordsVisible,
    fontSize: 22
  }));
  add(canvasText('invoice.amountWordsTitle', 'Amount In Words Title', { x: 112, y: 539, width: 126, height: 14 }, 'Amount in Words', {
    groupId: 'amount',
    zIndex: 122,
    visible: amountWordsVisible,
    enabled: amountWordsVisible,
    fontSize: 9.7,
    fontWeight: 800,
    textColor: NAVY
  }));
  add(canvasText('invoice.amountWordsValue', 'Amount In Words Value', { x: 112, y: 559, width: 144, height: 34 }, '{{amount_in_words}}', {
    groupId: 'amount',
    zIndex: 123,
    visible: amountWordsVisible,
    enabled: amountWordsVisible,
    fontSize: 8.3,
    fontWeight: 500,
    textColor: TEXT,
    textToken: '{{amount_in_words}}'
  }));
  add(canvasBox('invoice.amountSummaryCard', 'Amount Summary Card', { x: 330, y: 498, width: 237, height: 104 }, {
    groupId: 'amount',
    zIndex: 124,
    borderRadius: 7,
    borderWidth: 0.7,
    borderColor: '#103a8a'
  }));
  add(detailTextTriplet('invoice.amount.subtotal', 'Sub Total', '{{subtotal_amount}}', 344, 512, { label: 83, value: 85, fontSize: 8.9 }, {
    groupId: 'amount',
    zIndex: 125,
    visible: sectionFlag(config, 'amountSummary', 'showSubtotal', true) !== false,
    enabled: sectionFlag(config, 'amountSummary', 'showSubtotal', true) !== false
  }));
  add(canvasLine('invoice.amount.subtotalRule', 'Subtotal Divider', { x: 344, y: 536, width: 209, height: 1 }, { groupId: 'amount', zIndex: 130, thickness: 0.7 }));
  add(detailTextTriplet('invoice.amount.finalTotal', 'Final Total', '{{final_total}}', 344, 538, { label: 83, value: 85, fontSize: 10.4, valueWeight: 800 }, {
    groupId: 'amount',
    zIndex: 131,
    visible: sectionFlag(config, 'amountSummary', 'showFinalTotal', true) !== false,
    enabled: sectionFlag(config, 'amountSummary', 'showFinalTotal', true) !== false
  }));
  add(detailTextTriplet('invoice.amount.paid', 'Amount Paid', '{{amount_paid}}', 344, 564, { label: 83, value: 85, fontSize: 8.9 }, {
    groupId: 'amount',
    zIndex: 136,
    visible: sectionFlag(config, 'amountSummary', 'showAmountPaid', true) !== false,
    enabled: sectionFlag(config, 'amountSummary', 'showAmountPaid', true) !== false
  }));
  add(canvasLine('invoice.amount.paidRule', 'Amount Paid Dashed Divider', { x: 344, y: 575, width: 209, height: 1 }, { groupId: 'amount', zIndex: 141, thickness: 0.7, dividerStyle: 'dashed' }));
  add(canvasBox('invoice.amount.balanceBand', 'Balance Due Highlight Band', { x: 330.5, y: 575, width: 236, height: 26.5 }, {
    groupId: 'amount',
    zIndex: 142,
    visible: sectionFlag(config, 'amountSummary', 'showBalanceDue', true) !== false,
    enabled: sectionFlag(config, 'amountSummary', 'showBalanceDue', true) !== false,
    backgroundColor: NAVY,
    borderColor: NAVY,
    borderRadius: 5,
    borderWidth: 0
  }));
  add(detailTextTriplet('invoice.amount.balance', 'Balance Due', '{{balance_due}}', 344, 582, { label: 83, value: 85, fontSize: 9.7, valueWeight: 800, valueColor: '#ffffff' }, {
    groupId: 'amount',
    zIndex: 143,
    visible: sectionFlag(config, 'amountSummary', 'showBalanceDue', true) !== false,
    enabled: sectionFlag(config, 'amountSummary', 'showBalanceDue', true) !== false,
    textColor: '#ffffff',
    style: { textColor: '#ffffff' }
  }));

  add(canvasBox('invoice.workNoticeCard', 'Work Completion Notice Card', { x: 28, y: 614, width: 539, height: 67 }, {
    groupId: 'notice',
    zIndex: 160,
    visible: noticeVisible,
    enabled: noticeVisible,
    backgroundColor: '#f3fffb',
    borderColor: '#73bea8',
    borderRadius: 7,
    borderWidth: 0.7
  }));
  add(canvasIcon('invoice.workNoticeBadge', 'Work Completion Badge', { x: 58, y: 624, width: 34, height: 48 }, 'completion', {
    groupId: 'notice',
    zIndex: 161,
    visible: noticeVisible,
    enabled: noticeVisible,
    accentColor: GREEN,
    textColor: GREEN
  }));
  add(canvasLine('invoice.workNoticeDivider', 'Work Notice Divider', { x: 111.5, y: 626, width: 1, height: 44 }, {
    groupId: 'notice',
    zIndex: 162,
    visible: noticeVisible,
    enabled: noticeVisible,
    thickness: 0.8,
    accentColor: '#73bea8',
    style: { orientation: 'vertical' }
  }));
  add(canvasText('invoice.workNoticeTitle', 'Work Completion Notice Title', { x: 130, y: 627, width: 310, height: 14 }, config.sections?.workCompletionNotice?.title || 'WORK COMPLETION NOTICE', {
    groupId: 'notice',
    zIndex: 163,
    visible: noticeVisible,
    enabled: noticeVisible,
    fontSize: 10.3,
    fontWeight: 800,
    textColor: GREEN
  }));
  listLines(noticeLines.join('\n'), DEFAULT_NOTICE_LINES).slice(0, 3).forEach((line, index) => {
    const y = 650 + index * 13;
    add(canvasIcon(`invoice.workNotice.check${index + 1}`, `Work Notice Check ${index + 1}`, { x: 130, y: y + 1, width: 8, height: 8 }, 'check', {
      groupId: 'notice',
      zIndex: 164 + index * 2,
      visible: noticeVisible,
      enabled: noticeVisible,
      accentColor: GREEN,
      textColor: GREEN,
      fontSize: 8
    }));
    add(canvasText(`invoice.workNotice.line${index + 1}`, `Work Notice Line ${index + 1}`, { x: 146, y, width: 365, height: line.includes('arrange') ? 20 : 13 }, line, {
      groupId: 'notice',
      zIndex: 165 + index * 2,
      visible: noticeVisible,
      enabled: noticeVisible,
      fontSize: 8.45,
      fontWeight: 500,
      textColor: TEXT
    }));
  });

  add(canvasBox('invoice.termsCard', 'Terms And Conditions Card', { x: 28, y: 688, width: 539, height: 73 }, {
    groupId: 'terms',
    zIndex: 180,
    visible: termsVisible,
    enabled: termsVisible,
    backgroundColor: '#ffffff',
    borderRadius: 7,
    borderWidth: 0.7,
    borderColor: '#103a8a'
  }));
  add(canvasIcon('invoice.termsIcon', 'Terms Document Icon', { x: 51, y: 703, width: 42, height: 42 }, 'document', {
    groupId: 'terms',
    zIndex: 181,
    visible: termsVisible,
    enabled: termsVisible,
    accentColor: NAVY,
    textColor: NAVY,
    fontSize: 20
  }));
  add(canvasLine('invoice.termsDivider', 'Terms Vertical Divider', { x: 104.5, y: 700, width: 1, height: 49 }, {
    groupId: 'terms',
    zIndex: 182,
    visible: termsVisible,
    enabled: termsVisible,
    thickness: 0.8,
    accentColor: '#9bb4df',
    style: { orientation: 'vertical' }
  }));
  add(canvasText('invoice.termsTitle', 'Terms And Conditions Title', { x: 128, y: 700, width: 210, height: 14 }, config.sections?.terms?.title || 'TERMS & CONDITIONS', {
    groupId: 'terms',
    zIndex: 183,
    visible: termsVisible,
    enabled: termsVisible,
    fontSize: 9.8,
    fontWeight: 800,
    textColor: NAVY
  }));
  termsLines.forEach((_line, index) => {
    add(canvasIcon(`invoice.terms.check${index + 1}`, `Terms Check ${index + 1}`, { x: 129, y: 719 + index * 11.6, width: 8, height: 8 }, 'check', {
      groupId: 'terms',
      zIndex: 184 + index,
      visible: termsVisible,
      enabled: termsVisible,
      accentColor: NAVY,
      textColor: NAVY,
      fontSize: 8
    }));
  });
  add(canvasText('invoice.termsBody', 'Terms Body Text', { x: 145, y: 719, width: 389, height: 45 }, termsLines.join('\n'), {
    groupId: 'terms',
    zIndex: 190,
    visible: termsVisible,
    enabled: termsVisible,
    fontSize: 7.7,
    fontWeight: 500,
    textColor: TEXT
  }));

  const footerColumns = [
    ['phone', 'Call / WhatsApp', '{{company_phone}}', config.footer?.showCallWhatsapp !== false],
    ['email', 'Email', '{{company_email}}', config.footer?.showEmail !== false],
    ['website', 'Website', '{{company_website}}', config.footer?.showWebsite !== false],
    ['address', 'Address', '{{company_address}}', config.footer?.showAddress !== false]
  ];
  const footerColumnWidth = 539 / footerColumns.length;
  footerColumns.forEach(([variant, label, value, visible], index) => {
    const x = 28 + index * footerColumnWidth;
    if (index > 0) add(canvasLine(`invoice.footer.divider${index}`, `Footer Divider ${index}`, { x, y: 772, width: 1, height: 27 }, {
      groupId: 'footer',
      zIndex: 200 + index,
      visible,
      enabled: visible,
      thickness: 0.65,
      accentColor: '#9bb4df',
      style: { orientation: 'vertical' }
    }));
    add(canvasIcon(`invoice.footer.${variant}Icon`, `${label} Footer Icon`, { x: x + 10, y: 775, width: 18, height: 18 }, variant, {
      groupId: 'footer',
      zIndex: 204 + index * 3,
      visible,
      enabled: visible,
      accentColor: NAVY,
      textColor: NAVY,
      fontSize: 10
    }));
    add(canvasText(`invoice.footer.${variant}Label`, `${label} Footer Label`, { x: x + 40, y: 772, width: footerColumnWidth - 44, height: 11 }, label, {
      groupId: 'footer',
      zIndex: 205 + index * 3,
      visible,
      enabled: visible,
      fontSize: 7.6,
      fontWeight: 800,
      textColor: NAVY
    }));
    add(canvasText(`invoice.footer.${variant}Value`, `${label} Footer Value`, { x: x + 40, y: 784, width: footerColumnWidth - 44, height: 22 }, value, {
      groupId: 'footer',
      zIndex: 206 + index * 3,
      visible,
      enabled: visible,
      fontSize: 7.15,
      fontWeight: 500,
      textColor: TEXT,
      textToken: value
    }));
  });

  add(canvasBox('invoice.bottomStrip', 'Bottom Thank You Strip', { x: 28, y: 813, width: 539, height: 24 }, {
    groupId: 'footer',
    zIndex: 230,
    backgroundColor: NAVY,
    borderColor: NAVY,
    borderRadius: 4,
    borderWidth: 0
  }));
  add(canvasIcon('invoice.bottomHandshake', 'Thank You Handshake Icon', { x: 78, y: 814, width: 24, height: 24 }, 'handshake', {
    groupId: 'footer',
    zIndex: 231,
    accentColor: '#ffffff',
    textColor: '#ffffff'
  }));
  add(canvasLine('invoice.bottomMessageDivider', 'Thank You Divider', { x: 128.5, y: 818, width: 1, height: 15 }, {
    groupId: 'footer',
    zIndex: 232,
    thickness: 0.6,
    accentColor: '#ffffff',
    style: { orientation: 'vertical' }
  }));
  add(canvasText('invoice.bottomMessage', 'Thank You Message', { x: 147, y: 821, width: 330, height: 12 }, config.footer?.thankYouMessage || config.footerText || 'Thank you for your business. We look forward to serving you again.', {
    groupId: 'footer',
    zIndex: 233,
    fontSize: 9.5,
    fontWeight: 800,
    alignment: 'center',
    textColor: '#ffffff'
  }));
  add(canvasLine('invoice.bottomRightRule', 'Thank You Right Rule', { x: 484, y: 826.5, width: 48, height: 1 }, {
    groupId: 'footer',
    zIndex: 234,
    thickness: 0.6,
    accentColor: '#ffffff'
  }));
  add(canvasIcon('invoice.bottomRightDot', 'Thank You Dot Accent', { x: 530.3, y: 824.3, width: 5.4, height: 5.4 }, 'dot', {
    groupId: 'footer',
    zIndex: 235,
    accentColor: '#ffffff',
    textColor: '#ffffff',
    fontSize: 6
  }));

  return {
    key: 'invoice',
    mode: 'manifest',
    source: 'current-pdf-layout',
    label: 'Invoice PDF current layout',
    canvas: { width: PAGE_WIDTH, height: PAGE_HEIGHT, size: 'A4', orientation: 'portrait' },
    pages: [{ id: 'page-1', name: 'Invoice Page 1', elements: elements.map((item) => item.id) }],
    elements
  };
}

function manifestDocument(key, label, elements) {
  const templateName = TEMPLATE_NAMES[key] || label || key || 'PDF Template';
  return {
    key,
    mode: 'manifest',
    source: 'current-pdf-layout',
    label,
    canvas: { width: PAGE_WIDTH, height: PAGE_HEIGHT, size: 'A4', orientation: 'portrait' },
    pages: [{ id: 'page-1', name: `${templateName} Page 1`, elements: elements.map((item) => item.id) }],
    elements
  };
}

function templateTitle(config = {}, fallback = 'PDF TEMPLATE') {
  return clean(config.header?.title || config.headerTitle || config.title || fallback).toUpperCase();
}

function addWatermark(add, key, frame, opacity = 0.06) {
  add(element(`${key}.watermark`, 'image', 'Watermark', frame, {
    groupId: 'watermark',
    zIndex: 5,
    locked: true,
    content: {
      label: 'Watermark',
      imageMode: 'watermark',
      assetPath: '/logo-icon.png',
      fitToFrame: true,
      backgroundElement: true
    },
    style: { opacity, backgroundColor: 'transparent', borderWidth: 0, padding: 0 }
  }));
}

function addHeader(add, key, variant = 'wide', config = {}) {
  const compact = variant === 'compact';
  const logoFrame = compact
    ? { x: 34, y: 25, width: 170, height: 55 }
    : { x: 28, y: 10, width: 270, height: 88 };
  const taglineFrame = compact
    ? { x: 34, y: 87, width: 245, height: 12 }
    : { x: 128, y: 91, width: 178, height: 12 };
  const contactX = compact ? 340 : 342;
  const contactTextX = contactX + (compact ? 20 : 25);
  const contactWidth = compact ? 201 : 188;
  const contactRows = compact
    ? [
      ['address', 'Company Address', '{{company_address}}', 25, 37, 7.1],
      ['phone', 'Company Phone', '{{company_phone}}', 62, 16, 8.5],
      ['email', 'Company Email', '{{company_email}}', 78, 16, 8.5],
      ['website', 'Company Website', '{{company_website}}', 94, 16, 8.5]
    ]
    : [
      ['address', 'Company Address', '{{company_address}}', 10, 38, 8.65],
      ['phone', 'Company Phone', '{{company_phone}}', 57, 16, 9],
      ['email', 'Company Email', '{{company_email}}', 76, 16, 9],
      ['website', 'Company Website', '{{company_website}}', 95, 16, 9]
    ];

  add(element(`${key}.logo`, 'image', 'Header Logo', logoFrame, {
    groupId: 'header',
    zIndex: 10,
    visible: config.header?.showLogo !== false && config.showCompanyLogo !== false,
    enabled: config.header?.showLogo !== false && config.showCompanyLogo !== false,
    content: { label: 'Company Logo', imageMode: 'logo', assetPath: '/logo-full.png', fitToFrame: true },
    borderWidth: 0,
    style: { padding: 0, backgroundColor: 'transparent', borderWidth: 0 }
  }));
  add(canvasText(`${key}.companyTagline`, 'Company Tagline', taglineFrame, 'Repair | Service | Sales | AMC', {
    groupId: 'header',
    zIndex: 11,
    fontSize: compact ? 8.5 : 9.3,
    fontWeight: 500,
    alignment: compact ? 'left' : 'center'
  }));
  contactRows.forEach(([variantName, label, value, y, height, fontSize], index) => {
    const visible = config.header?.showCompanyDetails !== false && config.showCompanyDetails !== false;
    add(canvasIcon(`${key}.header.${variantName}Icon`, `${label} Icon`, { x: contactX, y: y + 0.5, width: 18, height: 18 }, variantName, {
      groupId: 'header',
      zIndex: 12 + index * 2,
      visible,
      enabled: visible,
      fontSize: 10
    }));
    add(canvasText(`${key}.header.${variantName}Text`, label, { x: contactTextX, y, width: contactWidth, height }, value, {
      groupId: 'header',
      zIndex: 13 + index * 2,
      visible,
      enabled: visible,
      fontSize,
      fontWeight: 500,
      textColor: TEXT,
      textToken: value
    }));
  });
  add(canvasLine(`${key}.headerDivider`, 'Header Divider', { x: compact ? 34 : 28, y: compact ? 112.5 : 118.5, width: compact ? 527 : 539, height: 2 }, {
    groupId: 'header',
    zIndex: 20,
    thickness: 0.8
  }));
}

function addCenteredTitle(add, key, title, y = 140, longTitle = false) {
  const leftLine = longTitle ? [78, 159] : [112, 221];
  const rightLine = longTitle ? [436, 517] : [374, 483];
  const textX = longTitle ? 160 : 218;
  const textWidth = longTitle ? 276 : 158;
  add(canvasLine(`${key}.titleLeftRule`, 'Title Left Rule', { x: leftLine[0], y, width: leftLine[1] - leftLine[0], height: 2 }, {
    groupId: 'title',
    zIndex: 24,
    thickness: 1.1
  }));
  add(canvasIcon(`${key}.titleLeftDot`, 'Title Left Dot Accent', { x: leftLine[1] - 3.6, y: y - 3.6, width: 7.2, height: 7.2 }, 'dot', {
    groupId: 'title',
    zIndex: 25,
    fontSize: 8
  }));
  add(canvasText(`${key}.title`, 'Document Title', { x: textX, y: y - 13, width: textWidth, height: longTitle ? 30 : 32 }, title, {
    groupId: 'title',
    zIndex: 26,
    fontSize: longTitle ? 18 : 22,
    fontWeight: 800,
    alignment: 'center',
    textColor: NAVY,
    textToken: `{{${key.replace(/-/g, '_')}_title}}`
  }));
  add(canvasIcon(`${key}.titleRightDot`, 'Title Right Dot Accent', { x: rightLine[0] - 3.6, y: y - 3.6, width: 7.2, height: 7.2 }, 'dot', {
    groupId: 'title',
    zIndex: 27,
    fontSize: 8
  }));
  add(canvasLine(`${key}.titleRightRule`, 'Title Right Rule', { x: rightLine[0], y, width: rightLine[1] - rightLine[0], height: 2 }, {
    groupId: 'title',
    zIndex: 28,
    thickness: 1.1
  }));
}

function addFooterContacts(add, key, config = {}, y = 770, stripY = 813, stripText = '{{footer_text}}') {
  const footerColumns = [
    ['phone', 'Call / WhatsApp', '{{company_phone}}', config.footer?.showCallWhatsapp !== false],
    ['email', 'Email', '{{company_email}}', config.footer?.showEmail !== false],
    ['website', 'Website', '{{company_website}}', config.footer?.showWebsite !== false],
    ['address', 'Address', '{{company_address}}', config.footer?.showAddress !== false]
  ];
  const footerColumnWidth = 539 / footerColumns.length;
  footerColumns.forEach(([variant, label, value, visible], index) => {
    const x = 28 + index * footerColumnWidth;
    if (index > 0) add(canvasLine(`${key}.footer.divider${index}`, `Footer Divider ${index}`, { x, y: y + 2, width: 1, height: 27 }, {
      groupId: 'footer',
      zIndex: 200 + index,
      visible,
      enabled: visible,
      thickness: 0.65,
      accentColor: NAVY,
      style: { orientation: 'vertical' }
    }));
    add(canvasIcon(`${key}.footer.${variant}Icon`, `${label} Footer Icon`, { x: x + 10, y: y + 5, width: 18, height: 18 }, variant, {
      groupId: 'footer',
      zIndex: 204 + index * 3,
      visible,
      enabled: visible,
      accentColor: NAVY,
      textColor: NAVY,
      fontSize: 10
    }));
    add(canvasText(`${key}.footer.${variant}Label`, `${label} Footer Label`, { x: x + 40, y: y + 2, width: footerColumnWidth - 44, height: 11 }, label, {
      groupId: 'footer',
      zIndex: 205 + index * 3,
      visible,
      enabled: visible,
      fontSize: 7.2,
      fontWeight: 800,
      textColor: NAVY
    }));
    add(canvasText(`${key}.footer.${variant}Value`, `${label} Footer Value`, { x: x + 40, y: y + 15, width: footerColumnWidth - 44, height: 22 }, value, {
      groupId: 'footer',
      zIndex: 206 + index * 3,
      visible,
      enabled: visible,
      fontSize: 7,
      fontWeight: 500,
      textColor: MUTED,
      textToken: value
    }));
  });
  add(canvasBox(`${key}.bottomStrip`, 'Bottom Thank You Strip', { x: 28, y: stripY, width: 539, height: 24 }, {
    groupId: 'footer',
    zIndex: 230,
    backgroundColor: NAVY,
    borderColor: NAVY,
    borderRadius: 4,
    borderWidth: 0
  }));
  add(canvasText(`${key}.bottomMessage`, 'Bottom Message', { x: 52, y: stripY + 7, width: 491, height: 12 }, stripText, {
    groupId: 'footer',
    zIndex: 231,
    fontSize: 8.8,
    fontWeight: 800,
    alignment: 'center',
    textColor: '#ffffff',
    textToken: stripText
  }));
}

function addRows(add, prefix, rows, x, y, widths = {}, patch = {}) {
  rows.forEach((row, index) => {
    const visible = row.visible !== false;
    add(detailTextTriplet(`${prefix}.${row.key}`, row.label, row.value, x, y + index * (row.step || widths.step || 21), {
      label: row.labelWidth || widths.label,
      value: row.valueWidth || widths.value,
      height: row.height || widths.height,
      valueHeight: row.valueHeight || row.height || widths.valueHeight || widths.height,
      fontSize: row.fontSize || widths.fontSize,
      valueWeight: row.valueWeight || widths.valueWeight,
      valueColor: row.valueColor || widths.valueColor
    }, {
      ...patch,
      visible,
      enabled: visible
    }));
  });
}

function quotationManifest(config = {}, company = COMPANY) {
  const title = templateTitle(config, 'QUOTATION');
  const elements = [];
  const add = (items) => {
    if (Array.isArray(items)) elements.push(...items);
    else elements.push(items);
  };

  addWatermark(add, 'quotation', { x: 36, y: 244, width: 524, height: 524 }, 0.07);
  addHeader(add, 'quotation', 'compact', config);
  add(canvasLine('quotation.titleLeftRule', 'Title Left Rule', { x: 132, y: 132, width: 96, height: 2 }, { groupId: 'title', zIndex: 24, thickness: 1 }));
  add(canvasLine('quotation.titleRightRule', 'Title Right Rule', { x: 367, y: 132, width: 96, height: 2 }, { groupId: 'title', zIndex: 25, thickness: 1 }));
  add(canvasText('quotation.title', 'Quotation Title', { x: 230, y: 121, width: 135, height: 25 }, title, {
    groupId: 'title',
    zIndex: 26,
    fontSize: 18,
    fontWeight: 800,
    alignment: 'center',
    textColor: NAVY,
    textToken: '{{quotation_title}}'
  }));

  add(canvasBox('quotation.detailsCard', 'Quotation And Customer Details Card', { x: 34, y: 158, width: 527, height: 80 }, {
    groupId: 'details',
    zIndex: 30,
    borderRadius: 7,
    borderWidth: 0.7,
    borderColor: BORDER
  }));
  addRows(add, 'quotation.details', [
    { key: 'jobReference', label: 'Job Reference', value: '{{work_order_id}}' },
    { key: 'quotationDate', label: 'Quotation Date', value: '{{quotation_date}}' },
    { key: 'quotationStatus', label: 'Quotation Status', value: '{{quotation_status}}' }
  ], 50, 176, { label: 100, value: 90, fontSize: 8.5 }, { groupId: 'details', zIndex: 34 });
  addRows(add, 'quotation.customer', [
    { key: 'customerName', label: 'Customer Name', value: '{{customer_name}}', labelWidth: 93 },
    { key: 'phoneNumber', label: 'Phone Number', value: '{{customer_phone}}', labelWidth: 93 },
    { key: 'address', label: 'Address', value: '{{customer_address}}', labelWidth: 58, valueWidth: 150, height: 24, valueHeight: 24, valueWeight: 500, valueColor: TEXT, fontSize: 8.1 }
  ], 312, 176, { label: 93, value: 96, fontSize: 8.5 }, { groupId: 'details', zIndex: 50 });

  add(canvasBox('quotation.serviceCard', 'Service Product Details Card', { x: 34, y: 252, width: 527, height: 98 }, {
    groupId: 'service',
    zIndex: 70,
    borderRadius: 7,
    borderWidth: 0.7,
    borderColor: BORDER
  }));
  add(canvasText('quotation.serviceTitle', 'Service Product Details Title', { x: 50, y: 268, width: 190, height: 14 }, 'SERVICE / PRODUCT DETAILS', {
    groupId: 'service',
    zIndex: 71,
    fontSize: 10,
    fontWeight: 800,
    textColor: NAVY
  }));
  addRows(add, 'quotation.service.left', [
    { key: 'serviceType', label: 'Service Type', value: '{{service_type}}' },
    { key: 'device', label: 'Device', value: '{{device_name}}' },
    { key: 'brandModel', label: 'Brand / Model', value: '{{brand_model}}' }
  ], 50, 292, { label: 82, value: 116, fontSize: 8.4 }, { groupId: 'service', zIndex: 74 });
  add(canvasText('quotation.problemLabel', 'Problem Complaint Label', { x: 314, y: 292, width: 118, height: 12 }, `${config.sections?.problemComplaint?.label || 'Problem / Complaint'}:`, {
    groupId: 'service',
    zIndex: 90,
    fontSize: 8.4,
    fontWeight: 800,
    textColor: NAVY
  }));
  add(canvasText('quotation.problemValue', 'Problem Complaint Value', { x: 314, y: 311, width: 220, height: 22 }, '{{problem_description}}', {
    groupId: 'service',
    zIndex: 91,
    fontSize: 8.4,
    fontWeight: 500,
    textColor: TEXT,
    textToken: '{{problem_description}}'
  }));
  addRows(add, 'quotation.service.right', [
    { key: 'technician', label: 'Technician', value: '{{technician_name}}', labelWidth: 78, valueWidth: 98, visible: sectionFlag(config, 'serviceDeviceDetails', 'showTechnician', true) !== false }
  ], 314, 334, { label: 78, value: 98, fontSize: 8.4 }, { groupId: 'service', zIndex: 94 });

  add(element('quotation.itemsTable', 'table', 'Item Table', { x: 34, y: 370, width: 527, height: 80 }, {
    groupId: 'items',
    zIndex: 110,
    borderRadius: 6,
    borderWidth: 0.7,
    borderColor: BORDER,
    content: {
      columns: ['S.No', 'Description', 'Qty', 'Unit Price', 'Total'],
      columnWidths: [42, 234, 48, 101, 102],
      previewRowCount: 2,
      dynamicRows: true,
      rowTemplate: ['{{item_index}}', '{{item_description}}', '{{item_quantity}}', '{{item_unit_price}}', '{{item_total}}'],
      rows: [
        ['1', 'General Service', '1', '700.00', '700.00'],
        ['2', 'RAM 4GB DDR4', '1', '500.00', '500.00']
      ]
    },
    style: {
      padding: 0,
      paddingX: 4,
      paddingY: 5,
      rowHeight: 28,
      fontSize: 8.5,
      accentColor: NAVY,
      headerBackgroundColor: NAVY,
      headerTextColor: '#ffffff',
      alternateRowBackgroundColor: '#f8fbff',
      borderColor: BORDER,
      borderWidth: 0.7
    }
  }));
  add(canvasBox('quotation.validityCard', 'Validity Note Card', { x: 34, y: 478, width: 318, height: 32 }, {
    groupId: 'final',
    zIndex: 120,
    visible: config.sections?.validityNote?.show !== false,
    enabled: config.sections?.validityNote?.show !== false,
    backgroundColor: LIGHT_BLUE,
    borderColor: '#b8daf7',
    borderRadius: 7,
    borderWidth: 0.7
  }));
  add(canvasIcon('quotation.validityIcon', 'Validity Calendar Icon', { x: 51, y: 485, width: 18, height: 18 }, 'calendar', {
    groupId: 'final',
    zIndex: 121,
    visible: config.sections?.validityNote?.show !== false,
    enabled: config.sections?.validityNote?.show !== false
  }));
  add(canvasText('quotation.validityTitle', 'Validity Note Title', { x: 78, y: 486, width: 120, height: 11 }, 'VALIDITY NOTE', {
    groupId: 'final',
    zIndex: 122,
    visible: config.sections?.validityNote?.show !== false,
    enabled: config.sections?.validityNote?.show !== false,
    fontSize: 8.5,
    fontWeight: 800,
    textColor: NAVY
  }));
  add(canvasText('quotation.validityText', 'Validity Note Text', { x: 78, y: 498, width: 245, height: 12 }, config.sections?.validityNote?.text || 'This quotation is valid for 7 days from the quotation date.', {
    groupId: 'final',
    zIndex: 123,
    visible: config.sections?.validityNote?.show !== false,
    enabled: config.sections?.validityNote?.show !== false,
    fontSize: 7.5,
    fontWeight: 500,
    textColor: TEXT
  }));
  add(canvasBox('quotation.totalSummaryCard', 'Total Summary Card', { x: 366, y: 462, width: 195, height: 50 }, {
    groupId: 'final',
    zIndex: 124,
    visible: config.sections?.totalSummary?.show !== false,
    enabled: config.sections?.totalSummary?.show !== false,
    borderRadius: 7,
    borderWidth: 0.7,
    borderColor: BORDER
  }));
  addRows(add, 'quotation.total', [
    { key: 'subtotal', label: 'Sub Total', value: '{{subtotal_amount}}', step: 17 },
    { key: 'finalTotal', label: 'Final Total', value: '{{final_total}}', step: 17, valueWeight: 800 }
  ], 380, 476, { label: 82, value: 78, fontSize: 8.5 }, { groupId: 'final', zIndex: 125 });

  const termsLines = listLines(config.sections?.terms?.text || config.termsAndConditions || '', [
    'This quotation is not an invoice; it is only an estimate.',
    'This quotation is valid for 7 days from the quotation date.',
    'Work will start only after customer approval.',
    'Payment is required before delivery or as per company policy.',
    'Final price may change if additional faults or parts are found.',
    'Warranty covers only the parts or services mentioned.'
  ]);
  add(canvasBox('quotation.termsCard', 'Terms And Conditions Card', { x: 34, y: 522, width: 527, height: 96 }, {
    groupId: 'terms',
    zIndex: 140,
    visible: config.sections?.terms?.show !== false,
    enabled: config.sections?.terms?.show !== false,
    borderRadius: 7,
    borderWidth: 0.7,
    borderColor: BORDER
  }));
  add(canvasText('quotation.termsTitle', 'Terms And Conditions Title', { x: 50, y: 533, width: 220, height: 13 }, config.sections?.terms?.title || 'TERMS & CONDITIONS', {
    groupId: 'terms',
    zIndex: 141,
    visible: config.sections?.terms?.show !== false,
    enabled: config.sections?.terms?.show !== false,
    fontSize: 9.5,
    fontWeight: 800,
    textColor: NAVY
  }));
  add(canvasText('quotation.termsText', 'Terms And Conditions Text', { x: 50, y: 550, width: 488, height: 58 }, termsLines.slice(0, 6).map((line, index) => `${index + 1}. ${line}`).join('\n'), {
    groupId: 'terms',
    zIndex: 142,
    visible: config.sections?.terms?.show !== false,
    enabled: config.sections?.terms?.show !== false,
    fontSize: 7.1,
    fontWeight: 500,
    textColor: TEXT
  }));
  add(canvasBox('quotation.readyCard', 'Ready To Proceed Card', { x: 34, y: 630, width: 527, height: 68 }, {
    groupId: 'approval',
    zIndex: 160,
    visible: config.sections?.whatsappApprovalMessage?.show !== false,
    enabled: config.sections?.whatsappApprovalMessage?.show !== false,
    backgroundColor: LIGHT_BLUE,
    borderColor: '#b8daf7',
    borderRadius: 7,
    borderWidth: 0.7
  }));
  add(canvasIcon('quotation.readyIcon', 'Ready To Proceed Icon', { x: 52, y: 640, width: 48, height: 48 }, 'handshake', {
    groupId: 'approval',
    zIndex: 161,
    visible: config.sections?.whatsappApprovalMessage?.show !== false,
    enabled: config.sections?.whatsappApprovalMessage?.show !== false
  }));
  add(canvasLine('quotation.readyDivider', 'Ready To Proceed Divider', { x: 124, y: 640, width: 1, height: 48 }, {
    groupId: 'approval',
    zIndex: 162,
    visible: config.sections?.whatsappApprovalMessage?.show !== false,
    enabled: config.sections?.whatsappApprovalMessage?.show !== false,
    thickness: 0.85,
    accentColor: '#b8daf7',
    style: { orientation: 'vertical' }
  }));
  add(canvasText('quotation.readyTitle', 'Ready To Proceed Title', { x: 144, y: 642, width: 385, height: 14 }, config.sections?.whatsappApprovalMessage?.title || 'READY TO PROCEED?', {
    groupId: 'approval',
    zIndex: 163,
    visible: config.sections?.whatsappApprovalMessage?.show !== false,
    enabled: config.sections?.whatsappApprovalMessage?.show !== false,
    fontSize: 10.7,
    fontWeight: 800,
    textColor: NAVY
  }));
  add(canvasText('quotation.readyText', 'Ready To Proceed Message', { x: 144, y: 660, width: 385, height: 32 }, listLines((config.sections?.whatsappApprovalMessage?.messageLines || []).join('\n'), [
    'Please review this quotation carefully.',
    'To continue with the service, tap "Approve Quotation" in WhatsApp.',
    'For any questions or changes, contact us before approval.'
  ]).join('\n'), {
    groupId: 'approval',
    zIndex: 164,
    visible: config.sections?.whatsappApprovalMessage?.show !== false,
    enabled: config.sections?.whatsappApprovalMessage?.show !== false,
    fontSize: 8.1,
    fontWeight: 500,
    textColor: TEXT
  }));
  addFooterContacts(add, 'quotation', config, 764, 812, config.footer?.thankYouMessage || config.footerText || 'We appreciate your trust in Universal Systems. We are always here to help!');
  return manifestDocument('quotation', 'Quotation / Estimate PDF current layout', elements);
}

function serviceCompletedManifest(config = {}, company = COMPANY) {
  const title = templateTitle(config.sections?.serviceSummary || config, 'SERVICE COMPLETED!');
  const elements = [];
  const add = (items) => {
    if (Array.isArray(items)) elements.push(...items);
    else elements.push(items);
  };

  addWatermark(add, 'service-completed', { x: 91, y: 254, width: 414, height: 414 }, 0.06);
  addHeader(add, 'service-completed', 'wide', config);
  add(canvasText('service-completed.title', 'Service Completed Title', { x: 58, y: 160, width: 360, height: 38 }, title, {
    groupId: 'title',
    zIndex: 26,
    visible: config.sections?.serviceSummary?.show !== false,
    enabled: config.sections?.serviceSummary?.show !== false,
    fontSize: 28,
    fontWeight: 800,
    textColor: NAVY,
    textToken: '{{service_completed_title}}'
  }));
  add(canvasLine('service-completed.titleRule', 'Title Rule', { x: 59, y: 202, width: 85, height: 2 }, { groupId: 'title', zIndex: 27, thickness: 1.1 }));
  add(canvasIcon('service-completed.titleDot', 'Title Dot Accent', { x: 144.5, y: 198.5, width: 7, height: 7 }, 'dot', { groupId: 'title', zIndex: 28, fontSize: 8 }));
  add(canvasText('service-completed.greeting', 'Customer Greeting', { x: 58, y: 232, width: 430, height: 18 }, 'Dear {{customer_name}},', {
    groupId: 'letter',
    zIndex: 40,
    visible: config.sections?.customerDetails?.show !== false && config.sections?.customerDetails?.showCustomerName !== false,
    enabled: config.sections?.customerDetails?.show !== false && config.sections?.customerDetails?.showCustomerName !== false,
    fontSize: 13,
    fontWeight: 800,
    textColor: TEXT,
    textToken: '{{customer_name}}'
  }));
  add(canvasText('service-completed.letterBody', 'Thank You Letter Body', { x: 58, y: 271, width: 466, height: 142 }, listLines((config.sections?.whatWeDid?.messageLines || []).join('\n'), [
    'Thank you for choosing Universal Systems.',
    'We are delighted to have successfully completed your service and handed over your product.',
    'Your trust and support mean a lot to us.',
    'We look forward to serving you again in the future.',
    'If you need any assistance or service, feel free to contact us anytime.'
  ]).join('\n\n'), {
    groupId: 'letter',
    zIndex: 42,
    visible: config.sections?.whatWeDid?.show !== false,
    enabled: config.sections?.whatWeDid?.show !== false,
    fontSize: 12,
    fontWeight: 500,
    textColor: TEXT,
    lineHeight: 1.38
  }));
  listLines((config.sections?.supportMessage?.highlightLines || []).join('\n'), [
    'Your satisfaction is our priority',
    'Quality service you can trust',
    'We are always here to help'
  ]).slice(0, 3).forEach((line, index) => {
    add(canvasIcon(`service-completed.highlight.star${index + 1}`, `Highlight Star ${index + 1}`, { x: 72, y: 445 + index * 26, width: 13, height: 13 }, 'star', {
      groupId: 'highlights',
      zIndex: 60 + index * 2,
      visible: config.sections?.supportMessage?.show !== false,
      enabled: config.sections?.supportMessage?.show !== false,
      accentColor: '#f2b705',
      textColor: '#f2b705'
    }));
    add(canvasText(`service-completed.highlight.line${index + 1}`, `Highlight Line ${index + 1}`, { x: 96, y: 444 + index * 26, width: 350, height: 16 }, line, {
      groupId: 'highlights',
      zIndex: 61 + index * 2,
      visible: config.sections?.supportMessage?.show !== false,
      enabled: config.sections?.supportMessage?.show !== false,
      fontSize: 12,
      fontWeight: 800,
      textColor: NAVY
    }));
  });
  add(canvasBox('service-completed.amcCard', 'AMC Support Card', { x: 58, y: 534, width: 479, height: 86 }, {
    groupId: 'support',
    zIndex: 80,
    visible: config.sections?.supportMessage?.show !== false,
    enabled: config.sections?.supportMessage?.show !== false,
    backgroundColor: LIGHT_BLUE,
    borderColor: '#b8daf7',
    borderRadius: 8,
    borderWidth: 0.7
  }));
  add(canvasIcon('service-completed.amcShield', 'AMC Shield Icon', { x: 76, y: 553, width: 48, height: 48 }, 'shield', {
    groupId: 'support',
    zIndex: 81,
    visible: config.sections?.supportMessage?.show !== false,
    enabled: config.sections?.supportMessage?.show !== false
  }));
  add(canvasLine('service-completed.amcDivider', 'AMC Support Divider', { x: 142, y: 549, width: 1, height: 56 }, {
    groupId: 'support',
    zIndex: 82,
    visible: config.sections?.supportMessage?.show !== false,
    enabled: config.sections?.supportMessage?.show !== false,
    thickness: 0.9,
    accentColor: '#93bee9',
    style: { orientation: 'vertical' }
  }));
  add(canvasText('service-completed.amcTitle', 'AMC Support Title', { x: 164, y: 552, width: 310, height: 16 }, config.sections?.supportMessage?.amcTitle || 'Need regular service support?', {
    groupId: 'support',
    zIndex: 83,
    visible: config.sections?.supportMessage?.show !== false,
    enabled: config.sections?.supportMessage?.show !== false,
    fontSize: 12.2,
    fontWeight: 800,
    textColor: NAVY
  }));
  add(canvasText('service-completed.amcText', 'AMC Support Text', { x: 164, y: 573, width: 325, height: 28 }, config.sections?.supportMessage?.amcText || 'Universal Systems also provides AMC plans for regular maintenance and priority service.', {
    groupId: 'support',
    zIndex: 84,
    visible: config.sections?.supportMessage?.show !== false,
    enabled: config.sections?.supportMessage?.show !== false,
    fontSize: 10.2,
    fontWeight: 500,
    textColor: TEXT
  }));
  add(canvasText('service-completed.amcFinalLine', 'AMC Support Final Line', { x: 164, y: 600, width: 310, height: 14 }, config.sections?.supportMessage?.amcFinalLine || 'Contact us anytime to know more.', {
    groupId: 'support',
    zIndex: 85,
    visible: config.sections?.supportMessage?.show !== false,
    enabled: config.sections?.supportMessage?.show !== false,
    fontSize: 10.3,
    fontWeight: 800,
    textColor: NAVY
  }));
  add(canvasText('service-completed.closing', 'Closing Regards', { x: 58, y: 655, width: 250, height: 16 }, 'Warm Regards,', {
    groupId: 'closing',
    zIndex: 120,
    visible: config.sections?.thankYouFooter?.show !== false,
    enabled: config.sections?.thankYouFooter?.show !== false,
    fontSize: 12,
    fontWeight: 500,
    textColor: TEXT
  }));
  add(canvasText('service-completed.companyName', 'Closing Company Name', { x: 58, y: 678, width: 250, height: 18 }, '{{company_name}}', {
    groupId: 'closing',
    zIndex: 121,
    visible: config.sections?.thankYouFooter?.show !== false,
    enabled: config.sections?.thankYouFooter?.show !== false,
    fontSize: 13.2,
    fontWeight: 800,
    textColor: NAVY,
    textToken: '{{company_name}}'
  }));
  add(canvasIcon('service-completed.contactIcon', 'Contact Phone Icon', { x: 58, y: 710, width: 18, height: 18 }, 'phone', {
    groupId: 'closing',
    zIndex: 122,
    visible: config.sections?.thankYouFooter?.show !== false,
    enabled: config.sections?.thankYouFooter?.show !== false
  }));
  add(canvasText('service-completed.contactText', 'Contact Text', { x: 84, y: 711, width: 220, height: 14 }, `${config.sections?.thankYouFooter?.contactLabel || 'Contact'}: {{company_phone}}`, {
    groupId: 'closing',
    zIndex: 123,
    visible: config.sections?.thankYouFooter?.show !== false,
    enabled: config.sections?.thankYouFooter?.show !== false,
    fontSize: 11,
    fontWeight: 800,
    textColor: NAVY,
    textToken: '{{company_phone}}'
  }));
  add(canvasBox('service-completed.bottomStrip', 'Bottom Thank You Strip', { x: 28, y: 796, width: 539, height: 31 }, {
    groupId: 'footer',
    zIndex: 230,
    visible: config.sections?.thankYouFooter?.show !== false,
    enabled: config.sections?.thankYouFooter?.show !== false,
    backgroundColor: NAVY,
    borderColor: NAVY,
    borderRadius: 5,
    borderWidth: 0
  }));
  add(canvasText('service-completed.bottomMessage', 'Bottom Message', { x: 52, y: 805, width: 491, height: 16 }, config.footer?.thankYouMessage || config.footerText || 'We appreciate your business. Visit us again!', {
    groupId: 'footer',
    zIndex: 231,
    visible: config.sections?.thankYouFooter?.show !== false,
    enabled: config.sections?.thankYouFooter?.show !== false,
    fontSize: 12,
    fontWeight: 800,
    alignment: 'center',
    textColor: '#ffffff'
  }));
  return manifestDocument('service-completed', 'Thank You / Service Completed PDF current layout', elements);
}

function amcTwoColumnCard(add, key, prefix, y, height, title, leftRows, rightRows, zIndex = 40) {
  add(canvasBox(`${key}.${prefix}.card`, `${title || 'Details'} Card`, { x: 28, y, width: 539, height }, {
    groupId: prefix,
    zIndex,
    borderRadius: 7,
    borderWidth: 0.7,
    borderColor: BORDER
  }));
  if (title) {
    add(canvasBox(`${key}.${prefix}.headerFill`, `${title} Header Fill`, { x: 28.5, y: y + 0.5, width: 538, height: 24 }, {
      groupId: prefix,
      zIndex: zIndex + 1,
      backgroundColor: LIGHT_BLUE,
      borderColor: LIGHT_BLUE,
      borderRadius: 6,
      borderWidth: 0
    }));
    add(canvasText(`${key}.${prefix}.title`, `${title} Title`, { x: 46, y: y + 8, width: 190, height: 13 }, title, {
      groupId: prefix,
      zIndex: zIndex + 2,
      fontSize: 9.5,
      fontWeight: 800,
      textColor: NAVY
    }));
  }
  const rowStart = y + (title ? 41 : 19);
  add(canvasLine(`${key}.${prefix}.divider`, `${title || 'Details'} Divider`, { x: 304, y: y + (title ? 32 : 11), width: 1, height: height - (title ? 43 : 22) }, {
    groupId: prefix,
    zIndex: zIndex + 3,
    thickness: 0.75,
    accentColor: '#9bb4df',
    style: { orientation: 'vertical' }
  }));
  addRows(add, `${key}.${prefix}.left`, leftRows, 48, rowStart, { label: 96, value: 106, fontSize: 8.55, step: title ? 22 : 19 }, { groupId: prefix, zIndex: zIndex + 4 });
  addRows(add, `${key}.${prefix}.right`, rightRows, 326, rowStart, { label: 96, value: 112, fontSize: 8.55, step: title ? 22 : 20 }, { groupId: prefix, zIndex: zIndex + 40 });
}

function addInfoListCard(add, key, id, frame, title, icon, lines, patch = {}) {
  add(canvasBox(`${key}.${id}.card`, `${title} Card`, frame, {
    groupId: id,
    zIndex: patch.zIndex || 120,
    backgroundColor: patch.backgroundColor || '#ffffff',
    borderColor: patch.borderColor || BORDER,
    borderRadius: 7,
    borderWidth: 0.7
  }));
  add(canvasIcon(`${key}.${id}.icon`, `${title} Icon`, { x: frame.x + 12, y: frame.y + 11, width: 36, height: 36 }, icon, {
    groupId: id,
    zIndex: (patch.zIndex || 120) + 1,
    accentColor: patch.iconColor || NAVY,
    textColor: patch.iconColor || NAVY
  }));
  add(canvasText(`${key}.${id}.title`, `${title} Title`, { x: frame.x + 58, y: frame.y + 15, width: frame.width - 74, height: 14 }, title, {
    groupId: id,
    zIndex: (patch.zIndex || 120) + 2,
    fontSize: patch.titleFontSize || 9.2,
    fontWeight: 800,
    textColor: patch.titleColor || NAVY
  }));
  add(canvasText(`${key}.${id}.body`, `${title} Body`, { x: frame.x + 58, y: frame.y + 36, width: frame.width - 78, height: frame.height - 44 }, lines.join('\n'), {
    groupId: id,
    zIndex: (patch.zIndex || 120) + 3,
    fontSize: patch.fontSize || 7.3,
    fontWeight: 500,
    textColor: TEXT,
    lineHeight: 1.22
  }));
}

function amcContractManifest(config = {}, company = COMPANY) {
  const title = templateTitle(config, 'AMC CONTRACT');
  const elements = [];
  const add = (items) => {
    if (Array.isArray(items)) elements.push(...items);
    else elements.push(items);
  };
  addWatermark(add, 'amc-contract', { x: 66, y: 236, width: 465, height: 465 }, 0.06);
  addHeader(add, 'amc-contract', 'wide', config);
  addCenteredTitle(add, 'amc-contract', title, 140, title.length > 16);
  amcTwoColumnCard(add, 'amc-contract', 'details', 155, 91, '', [
    { key: 'amcReference', label: 'AMC Reference', value: '{{amc_reference}}', visible: sectionFlag(config, 'amcPeriod', 'showAmcReference', true) !== false },
    { key: 'contractDate', label: 'Contract Date', value: '{{current_date}}', visible: sectionFlag(config, 'amcPeriod', 'showContractDate', true) !== false },
    { key: 'amcPeriod', label: 'AMC Period', value: '{{amc_start_date}} to {{amc_end_date}}', visible: sectionFlag(config, 'amcPeriod', 'showAmcPeriod', true) !== false },
    { key: 'status', label: 'Status', value: '{{amc_status}}', visible: sectionFlag(config, 'amcPeriod', 'showStatus', true) !== false }
  ], [
    { key: 'customerName', label: 'Customer Name', value: '{{customer_name}}', visible: sectionFlag(config, 'customerDetails', 'showCustomerName', true) !== false },
    { key: 'phoneNumber', label: 'Phone Number', value: '{{customer_phone}}', visible: sectionFlag(config, 'customerDetails', 'showPhoneNumber', true) !== false },
    { key: 'address', label: 'Address', value: '{{customer_address}}', valueWeight: 500, valueColor: TEXT, height: 30, valueHeight: 30, visible: sectionFlag(config, 'customerDetails', 'showAddress', true) !== false }
  ], 40);
  amcTwoColumnCard(add, 'amc-contract', 'plan', 253, 78, 'AMC PLAN DETAILS', [
    { key: 'planName', label: 'Plan Name', value: '{{plan_name}}', visible: sectionFlag(config, 'visitFrequency', 'showPlanName', true) !== false },
    { key: 'coverageType', label: 'Coverage Type', value: '{{coverage_type}}', visible: sectionFlag(config, 'visitFrequency', 'showCoverageType', true) !== false }
  ], [
    { key: 'coveredFor', label: 'Covered For', value: '{{covered_for}}', visible: sectionFlag(config, 'coveredDevices', 'showCoveredFor', true) !== false },
    { key: 'technician', label: 'Technician', value: '{{technician_name}}', visible: sectionFlag(config, 'visitFrequency', 'showTechnician', true) !== false }
  ], 80);
  add(element('amc-contract.coveredTable', 'table', 'Covered Items Table', { x: 28, y: 344, width: 539, height: 77 }, {
    groupId: 'coveredItems',
    zIndex: 110,
    visible: config.sections?.coveredDevices?.show !== false,
    enabled: config.sections?.coveredDevices?.show !== false,
    borderRadius: 6,
    borderWidth: 0.7,
    borderColor: BORDER,
    content: {
      title: 'COVERED ITEMS',
      columns: ['S.No', 'Device / Product', 'Brand / Model', 'Qty', 'Coverage Notes'],
      columnWidths: [45, 134, 120, 48, 192],
      previewRowCount: 2,
      dynamicRows: false,
      rows: [
        ['1', 'Desktop PC', 'Dell Optiplex', '1', 'General AMC support'],
        ['2', 'Laptop', 'Dell Inspiron 15', '1', 'Service support']
      ]
    },
    style: {
      padding: 0,
      paddingX: 4,
      paddingY: 5,
      rowHeight: 23,
      fontSize: 7.5,
      headerBackgroundColor: NAVY,
      headerTextColor: '#ffffff',
      alternateRowBackgroundColor: '#f9fbff',
      borderColor: BORDER,
      borderWidth: 0.7
    }
  }));
  add(canvasBox('amc-contract.paymentCard', 'Payment Details Card', { x: 28, y: 439, width: 539, height: 45 }, {
    groupId: 'payment',
    zIndex: 130,
    visible: config.sections?.paymentDetails?.show !== false,
    enabled: config.sections?.paymentDetails?.show !== false,
    borderRadius: 7,
    borderWidth: 0.7,
    borderColor: BORDER
  }));
  add(canvasIcon('amc-contract.contractValueIcon', 'Contract Value Icon', { x: 50, y: 443, width: 38, height: 38 }, 'rupee', { groupId: 'payment', zIndex: 131 }));
  add(canvasText('amc-contract.contractValueText', 'Contract Value Text', { x: 95, y: 456, width: 210, height: 14 }, 'AMC Contract Value: {{final_total}}', {
    groupId: 'payment',
    zIndex: 132,
    fontSize: 10.2,
    fontWeight: 800,
    textColor: NAVY,
    textToken: '{{final_total}}'
  }));
  add(canvasIcon('amc-contract.paymentStatusIcon', 'Payment Status Icon', { x: 332, y: 443, width: 38, height: 38 }, 'payment', { groupId: 'payment', zIndex: 133 }));
  add(canvasText('amc-contract.paymentStatusText', 'Payment Status Text', { x: 377, y: 456, width: 160, height: 14 }, 'Payment Status: {{payment_status}}', {
    groupId: 'payment',
    zIndex: 134,
    fontSize: 10.2,
    fontWeight: 800,
    textColor: NAVY,
    textToken: '{{payment_status}}'
  }));
  addInfoListCard(add, 'amc-contract', 'coverageIncludes', { x: 28, y: 494, width: 261, height: 108 }, 'COVERAGE INCLUDES', 'shield', [
    'Regular maintenance support',
    'Basic troubleshooting and inspection',
    'Priority service support',
    'Service visit as per AMC plan',
    'Support during AMC period'
  ], { zIndex: 150, iconColor: GREEN, titleColor: NAVY });
  addInfoListCard(add, 'amc-contract', 'exclusions', { x: 306, y: 494, width: 261, height: 108 }, 'NOT COVERED / EXCLUSIONS', 'warning', [
    'Spare parts are not included unless mentioned',
    'Physical damage, liquid damage, or misuse is not covered',
    'Consumables and accessories are not covered',
    'Additional work outside AMC scope will be charged separately'
  ], { zIndex: 160, iconColor: '#c26b1d', titleColor: '#c26b1d', fontSize: 7 });
  add(canvasBox('amc-contract.termsCard', 'AMC Terms Card', { x: 28, y: 611, width: 539, height: 70 }, {
    groupId: 'terms',
    zIndex: 180,
    visible: config.sections?.amcTerms?.show !== false,
    enabled: config.sections?.amcTerms?.show !== false,
    borderRadius: 7,
    borderWidth: 0.7,
    borderColor: BORDER
  }));
  add(canvasIcon('amc-contract.termsIcon', 'AMC Terms Icon', { x: 51, y: 627, width: 42, height: 42 }, 'document', { groupId: 'terms', zIndex: 181 }));
  add(canvasLine('amc-contract.termsDivider', 'AMC Terms Divider', { x: 105, y: 623, width: 1, height: 46 }, { groupId: 'terms', zIndex: 182, thickness: 0.8, style: { orientation: 'vertical' } }));
  add(canvasText('amc-contract.termsTitle', 'AMC Terms Title', { x: 125, y: 622, width: 160, height: 14 }, 'AMC TERMS', { groupId: 'terms', zIndex: 183, fontSize: 9.5, fontWeight: 800, textColor: NAVY }));
  add(canvasText('amc-contract.termsText', 'AMC Terms Text', { x: 125, y: 640, width: 395, height: 34 }, listLines(config.sections?.amcTerms?.text || config.amcTerms || '', [
    'AMC service visits are provided during the active contract period.',
    'Spare parts are chargeable unless specifically included.',
    'Customer must renew before expiry to continue AMC coverage.'
  ]).slice(0, 3).join('\n'), { groupId: 'terms', zIndex: 184, fontSize: 7.3, fontWeight: 500, textColor: TEXT }));
  add(canvasBox('amc-contract.renewalCard', 'Renewal Reminder Card', { x: 28, y: 690, width: 539, height: 58 }, {
    groupId: 'renewal',
    zIndex: 190,
    backgroundColor: '#f3fffb',
    borderColor: '#78c2aa',
    borderRadius: 7,
    borderWidth: 0.7
  }));
  add(canvasIcon('amc-contract.renewalIcon', 'Renewal Calendar Icon', { x: 50, y: 702, width: 38, height: 38 }, 'calendar', { groupId: 'renewal', zIndex: 191, accentColor: GREEN, textColor: GREEN }));
  add(canvasText('amc-contract.renewalTitle', 'Renewal Reminder Title', { x: 96, y: 704, width: 210, height: 14 }, 'RENEWAL REMINDER', { groupId: 'renewal', zIndex: 192, fontSize: 10.2, fontWeight: 800, textColor: GREEN }));
  add(canvasText('amc-contract.renewalText', 'Renewal Reminder Text', { x: 96, y: 722, width: 360, height: 28 }, 'Your AMC renewal is due before {{amc_end_date}}.\nRenew on time to continue uninterrupted service support.', { groupId: 'renewal', zIndex: 193, fontSize: 8.7, fontWeight: 500, textColor: TEXT, textToken: '{{amc_end_date}}' }));
  add(canvasLine('amc-contract.signatureLine', 'Authorized Signature Line', { x: 384, y: 754, width: 156, height: 1 }, { groupId: 'signature', zIndex: 198, thickness: 0.7, accentColor: '#94a3b8' }));
  add(canvasText('amc-contract.signatureText', 'Authorized Signature Text', { x: 395, y: 761, width: 140, height: 10 }, config.signatureSection || config.sections?.signature?.label || 'Authorized Signature', { groupId: 'signature', zIndex: 199, fontSize: 7.5, fontWeight: 500, textColor: MUTED, alignment: 'center' }));
  addFooterContacts(add, 'amc-contract', config, 770, 813, config.footer?.thankYouMessage || config.footerText || 'Thank you for choosing Universal Systems AMC support.');
  return manifestDocument('amc-contract', 'AMC Contract PDF current layout', elements);
}

function amcServiceVisitManifest(config = {}, company = COMPANY) {
  const title = templateTitle(config, 'AMC SERVICE VISIT REPORT');
  const elements = [];
  const add = (items) => {
    if (Array.isArray(items)) elements.push(...items);
    else elements.push(items);
  };
  addWatermark(add, 'amc-service-visit', { x: 66, y: 236, width: 465, height: 465 }, 0.06);
  addHeader(add, 'amc-service-visit', 'wide', config);
  addCenteredTitle(add, 'amc-service-visit', title === 'AMC SERVICE VISIT' ? 'AMC SERVICE VISIT REPORT' : title, 140, true);
  amcTwoColumnCard(add, 'amc-service-visit', 'details', 155, 111, '', [
    { key: 'amcReference', label: 'AMC Reference', value: '{{amc_reference}}', visible: sectionFlag(config, 'visitDetails', 'showAmcReference', true) !== false },
    { key: 'visitDate', label: 'Visit Date', value: '{{current_date}}', visible: sectionFlag(config, 'visitDetails', 'showVisitDate', true) !== false },
    { key: 'visitStatus', label: 'Visit Status', value: '{{visit_status}}', visible: sectionFlag(config, 'visitDetails', 'showVisitStatus', true) !== false },
    { key: 'nextVisitDate', label: 'Next Visit Date', value: '{{next_service_date}}', visible: sectionFlag(config, 'visitDetails', 'showNextVisitDate', true) !== false },
    { key: 'jobReference', label: 'Job Reference', value: '{{work_order_id}}', visible: sectionFlag(config, 'visitDetails', 'showJobReference', true) !== false }
  ], [
    { key: 'customerName', label: 'Customer Name', value: '{{customer_name}}', visible: sectionFlag(config, 'customerDetails', 'showCustomerName', true) !== false },
    { key: 'phoneNumber', label: 'Phone Number', value: '{{customer_phone}}', visible: sectionFlag(config, 'customerDetails', 'showPhoneNumber', true) !== false },
    { key: 'address', label: 'Address', value: '{{customer_address}}', valueWeight: 500, valueColor: TEXT, height: 38, valueHeight: 38, visible: sectionFlag(config, 'customerDetails', 'showAddress', true) !== false }
  ], 40);
  amcTwoColumnCard(add, 'amc-service-visit', 'plan', 274, 78, 'AMC PLAN DETAILS', [
    { key: 'planName', label: 'Plan Name', value: '{{plan_name}}', visible: sectionFlag(config, 'deviceChecked', 'showPlanName', true) !== false },
    { key: 'amcPeriod', label: 'AMC Period', value: '{{amc_start_date}} to {{amc_end_date}}', visible: sectionFlag(config, 'deviceChecked', 'showAmcPeriod', true) !== false }
  ], [
    { key: 'coveredFor', label: 'Covered For', value: '{{covered_for}}', visible: sectionFlag(config, 'deviceChecked', 'showCoveredFor', true) !== false },
    { key: 'technician', label: 'Technician', value: '{{technician_name}}', visible: sectionFlag(config, 'deviceChecked', 'showTechnician', true) !== false }
  ], 80);
  add(element('amc-service-visit.workTable', 'table', 'Visit Work Details Table', { x: 28, y: 364, width: 539, height: 111 }, {
    groupId: 'workDetails',
    zIndex: 110,
    visible: config.sections?.workCompleted?.show !== false,
    enabled: config.sections?.workCompleted?.show !== false,
    borderRadius: 6,
    borderWidth: 0.7,
    borderColor: BORDER,
    content: {
      title: 'VISIT WORK DETAILS',
      columns: ['S.No', 'Work Done / Checkup Details', 'Status'],
      columnWidths: [45, 370, 124],
      previewRowCount: 4,
      dynamicRows: false,
      rows: [
        ['1', 'General inspection completed', 'Done'],
        ['2', 'System cleaning and basic checkup', 'Done'],
        ['3', 'Performance checked', 'Done'],
        ['4', 'Customer issue verified', 'Done']
      ]
    },
    style: {
      padding: 0,
      paddingX: 4,
      paddingY: 5,
      rowHeight: 22,
      fontSize: 7.8,
      headerBackgroundColor: NAVY,
      headerTextColor: '#ffffff',
      alternateRowBackgroundColor: '#f9fbff',
      borderColor: BORDER,
      borderWidth: 0.7
    }
  }));
  add(canvasBox('amc-service-visit.notesCard', 'Technician Notes Card', { x: 28, y: 499, width: 539, height: 53 }, {
    groupId: 'notes',
    zIndex: 130,
    backgroundColor: '#f3fffb',
    borderColor: '#78c2aa',
    borderRadius: 7,
    borderWidth: 0.7
  }));
  add(canvasIcon('amc-service-visit.notesIcon', 'Technician Notes Icon', { x: 49, y: 508, width: 38, height: 38 }, 'document', { groupId: 'notes', zIndex: 131, accentColor: GREEN, textColor: GREEN }));
  add(canvasText('amc-service-visit.notesTitle', 'Technician Notes Title', { x: 95, y: 511, width: 210, height: 14 }, 'TECHNICIAN NOTES', { groupId: 'notes', zIndex: 132, fontSize: 10.2, fontWeight: 800, textColor: GREEN }));
  add(canvasText('amc-service-visit.notesText', 'Technician Notes Text', { x: 95, y: 530, width: 390, height: 18 }, '{{technician_notes}}', { groupId: 'notes', zIndex: 133, fontSize: 8.7, fontWeight: 500, textColor: TEXT, textToken: '{{technician_notes}}' }));
  addInfoListCard(add, 'amc-service-visit', 'visitTerms', { x: 28, y: 562, width: 261, height: 88 }, 'AMC VISIT TERMS', 'document', [
    'This visit is recorded under the active AMC contract.',
    'Spare parts or additional work outside AMC scope will be charged separately.',
    'Next scheduled service date may change based on availability.'
  ], { zIndex: 150, fontSize: 7.2 });
  addInfoListCard(add, 'amc-service-visit', 'nextVisit', { x: 306, y: 562, width: 261, height: 88 }, 'NEXT VISIT REMINDER', 'calendar', [
    'Your next AMC visit is scheduled on {{next_service_date}}.',
    'We will reach you before the visit date.'
  ], { zIndex: 160, iconColor: GREEN, fontSize: 7.2 });
  addFooterContacts(add, 'amc-service-visit', config, 770, 813, config.footer?.thankYouMessage || config.footerText || 'Thank you for choosing Universal Systems AMC support.');
  return manifestDocument('amc-service-visit', 'AMC Visit / Service Report PDF current layout', elements);
}

function amcRenewalManifest(config = {}, company = COMPANY) {
  const title = templateTitle(config, 'AMC RENEWAL REMINDER');
  const elements = [];
  const add = (items) => {
    if (Array.isArray(items)) elements.push(...items);
    else elements.push(items);
  };
  addWatermark(add, 'amc-renewal-reminder', { x: 66, y: 236, width: 465, height: 465 }, 0.06);
  addHeader(add, 'amc-renewal-reminder', 'wide', config);
  addCenteredTitle(add, 'amc-renewal-reminder', title, 140, true);
  amcTwoColumnCard(add, 'amc-renewal-reminder', 'details', 155, 91, '', [
    { key: 'amcReference', label: 'AMC Reference', value: '{{amc_reference}}', visible: sectionFlag(config, 'amcExpiryDetails', 'showAmcReference', true) !== false },
    { key: 'reminderDate', label: 'Reminder Date', value: '{{current_date}}', visible: sectionFlag(config, 'amcExpiryDetails', 'showReminderDate', true) !== false },
    { key: 'expiryDate', label: 'AMC Expiry Date', value: '{{amc_end_date}}', valueColor: '#d01818', visible: sectionFlag(config, 'amcExpiryDetails', 'showExpiryDate', true) !== false },
    { key: 'renewalStatus', label: 'Renewal Status', value: '{{renewal_status}}', valueColor: '#c26b1d', visible: sectionFlag(config, 'amcExpiryDetails', 'showRenewalStatus', true) !== false }
  ], [
    { key: 'customerName', label: 'Customer Name', value: '{{customer_name}}', visible: sectionFlag(config, 'customerDetails', 'showCustomerName', true) !== false },
    { key: 'phoneNumber', label: 'Phone Number', value: '{{customer_phone}}', visible: sectionFlag(config, 'customerDetails', 'showPhoneNumber', true) !== false },
    { key: 'address', label: 'Address', value: '{{customer_address}}', valueWeight: 500, valueColor: TEXT, height: 30, valueHeight: 30, visible: sectionFlag(config, 'customerDetails', 'showAddress', true) !== false }
  ], 40);
  amcTwoColumnCard(add, 'amc-renewal-reminder', 'plan', 253, 78, 'AMC PLAN DETAILS', [
    { key: 'planName', label: 'Plan Name', value: '{{plan_name}}', visible: sectionFlag(config, 'planDetails', 'showPlanName', true) !== false },
    { key: 'currentPeriod', label: 'Current Period', value: '{{amc_start_date}} to {{amc_end_date}}', visible: sectionFlag(config, 'planDetails', 'showCurrentPeriod', true) !== false }
  ], [
    { key: 'renewalPeriod', label: 'Renewal Period', value: '{{renewal_period}}', visible: sectionFlag(config, 'planDetails', 'showRenewalPeriod', true) !== false },
    { key: 'coveredFor', label: 'Covered For', value: '{{covered_for}}', visible: sectionFlag(config, 'planDetails', 'showCoveredFor', true) !== false }
  ], 80);
  add(canvasBox('amc-renewal-reminder.amountCard', 'Renewal Amount Card', { x: 28, y: 342, width: 539, height: 56 }, {
    groupId: 'amount',
    zIndex: 110,
    visible: config.sections?.renewalAmount?.show !== false,
    enabled: config.sections?.renewalAmount?.show !== false,
    backgroundColor: '#f3fffb',
    borderColor: '#78c2aa',
    borderRadius: 7,
    borderWidth: 0.7
  }));
  add(canvasIcon('amc-renewal-reminder.amountIcon', 'Renewal Amount Icon', { x: 55, y: 352, width: 38, height: 38 }, 'rupee', { groupId: 'amount', zIndex: 111, accentColor: GREEN, textColor: GREEN }));
  add(canvasText('amc-renewal-reminder.amountTitle', 'Renewal Amount Title', { x: 108, y: 358, width: 170, height: 14 }, 'RENEWAL AMOUNT', { groupId: 'amount', zIndex: 112, fontSize: 10, fontWeight: 800, textColor: GREEN }));
  add(canvasText('amc-renewal-reminder.amountValue', 'Renewal Amount Value', { x: 342, y: 358, width: 150, height: 24 }, '{{final_total}}', { groupId: 'amount', zIndex: 113, fontSize: 18, fontWeight: 800, textColor: NAVY, alignment: 'right', textToken: '{{final_total}}' }));
  add(canvasBox('amc-renewal-reminder.messageCard', 'Renewal Message Card', { x: 28, y: 410, width: 539, height: 72 }, {
    groupId: 'renewalMessage',
    zIndex: 120,
    visible: config.sections?.renewalMessage?.show !== false,
    enabled: config.sections?.renewalMessage?.show !== false,
    backgroundColor: '#fff7ed',
    borderColor: '#f0bd84',
    borderRadius: 7,
    borderWidth: 0.7
  }));
  add(canvasIcon('amc-renewal-reminder.messageIcon', 'Renewal Message Bell Icon', { x: 53, y: 427, width: 38, height: 38 }, 'bell', { groupId: 'renewalMessage', zIndex: 121, accentColor: '#c26b1d', textColor: '#c26b1d' }));
  add(canvasText('amc-renewal-reminder.messageTitle', 'Renewal Message Title', { x: 102, y: 426, width: 340, height: 14 }, config.sections?.renewalMessage?.title || 'YOUR AMC PLAN IS EXPIRING SOON!', { groupId: 'renewalMessage', zIndex: 122, fontSize: 11, fontWeight: 800, textColor: '#c26b1d' }));
  add(canvasText('amc-renewal-reminder.messageText', 'Renewal Message Text', { x: 102, y: 448, width: 385, height: 28 }, 'Renew your AMC before {{amc_end_date}} to continue uninterrupted service support, priority assistance, and regular maintenance coverage.', { groupId: 'renewalMessage', zIndex: 123, fontSize: 9, fontWeight: 500, textColor: TEXT, textToken: '{{amc_end_date}}' }));
  addInfoListCard(add, 'amc-renewal-reminder', 'benefits', { x: 28, y: 494, width: 261, height: 100 }, 'CONTINUE AMC BENEFITS', 'shield', [
    'Priority service support',
    'Regular maintenance assistance',
    'Easier service planning',
    'Continued coverage for listed products'
  ], { zIndex: 140, iconColor: GREEN, fontSize: 7.2 });
  addInfoListCard(add, 'amc-renewal-reminder', 'terms', { x: 306, y: 494, width: 261, height: 100 }, 'RENEWAL TERMS', 'document', [
    'Renewal is required before the expiry date to continue AMC coverage.',
    'AMC coverage will continue only after renewal confirmation.',
    'Parts or services outside AMC scope will be charged separately.',
    'Renewal amount and coverage may vary based on plan and product condition.'
  ], { zIndex: 150, fontSize: 7 });
  add(canvasBox('amc-renewal-reminder.contactCard', 'Ready To Renew Contact Card', { x: 28, y: 606, width: 539, height: 92 }, {
    groupId: 'contact',
    zIndex: 170,
    visible: config.sections?.contactWhatsappMessage?.show !== false,
    enabled: config.sections?.contactWhatsappMessage?.show !== false,
    backgroundColor: LIGHT_BLUE,
    borderColor: '#b8daf7',
    borderRadius: 7,
    borderWidth: 0.7
  }));
  add(canvasIcon('amc-renewal-reminder.contactIcon', 'Ready To Renew Headset Icon', { x: 52, y: 630, width: 48, height: 48 }, 'headset', { groupId: 'contact', zIndex: 171 }));
  add(canvasLine('amc-renewal-reminder.contactDivider', 'Ready To Renew Divider', { x: 116, y: 622, width: 1, height: 60 }, { groupId: 'contact', zIndex: 172, thickness: 0.85, accentColor: '#93bee9', style: { orientation: 'vertical' } }));
  add(canvasText('amc-renewal-reminder.contactTitle', 'Ready To Renew Title', { x: 138, y: 621, width: 210, height: 14 }, config.sections?.contactWhatsappMessage?.title || 'READY TO RENEW?', { groupId: 'contact', zIndex: 173, fontSize: 11.2, fontWeight: 800, textColor: NAVY }));
  add(canvasText('amc-renewal-reminder.contactText', 'Ready To Renew Text', { x: 138, y: 640, width: 360, height: 25 }, config.sections?.contactWhatsappMessage?.text || 'To continue AMC support, contact Universal Systems or confirm renewal through WhatsApp.', { groupId: 'contact', zIndex: 174, fontSize: 8.6, fontWeight: 500, textColor: TEXT }));
  add(canvasIcon('amc-renewal-reminder.whatsappIcon', 'WhatsApp Icon', { x: 138, y: 665, width: 18, height: 18 }, 'whatsapp', { groupId: 'contact', zIndex: 175 }));
  add(canvasText('amc-renewal-reminder.whatsappText', 'WhatsApp Text', { x: 162, y: 666, width: 92, height: 12 }, '{{company_phone}}', { groupId: 'contact', zIndex: 176, fontSize: 8, fontWeight: 800, textColor: NAVY, textToken: '{{company_phone}}' }));
  add(canvasIcon('amc-renewal-reminder.emailIcon', 'Email Icon', { x: 260, y: 665, width: 18, height: 18 }, 'email', { groupId: 'contact', zIndex: 177 }));
  add(canvasText('amc-renewal-reminder.emailText', 'Email Text', { x: 285, y: 666, width: 130, height: 12 }, '{{company_email}}', { groupId: 'contact', zIndex: 178, fontSize: 8, fontWeight: 800, textColor: NAVY, textToken: '{{company_email}}' }));
  add(canvasText('amc-renewal-reminder.contactFinal', 'Ready To Renew Final Line', { x: 138, y: 683, width: 330, height: 12 }, config.sections?.contactWhatsappMessage?.finalLine || 'Thank you for choosing Universal Systems AMC support.', { groupId: 'contact', zIndex: 179, fontSize: 8.3, fontWeight: 800, textColor: NAVY }));
  addFooterContacts(add, 'amc-renewal-reminder', config, 770, 813, config.footer?.thankYouMessage || config.footerText || 'We value your trust. Stay connected for the best service!');
  return manifestDocument('amc-renewal-reminder', 'AMC Renewal / Expiry Reminder PDF current layout', elements);
}

function placeholderManifest(key, config = {}) {
  const templateName = TEMPLATE_NAMES[key] || key || 'PDF Template';
  const title = clean(config.header?.title || config.headerTitle || templateName || 'PDF Template').toUpperCase();
  const elements = [
    textElement(`${key}.title`, 'Document Title', { x: 40, y: 44, width: 515, height: 42 }, title, {
      groupId: 'header',
      zIndex: 10,
      fontSize: 24,
      fontWeight: 800,
      alignment: 'center'
    }),
    cardElement(`${key}.safePlaceholder`, 'Canvas Mapping Notice', { x: 64, y: 132, width: 467, height: 148 }, 'Canvas Mapping Notice', 'Full canvas mapping not completed for this template yet.', {
      groupId: 'adapter',
      zIndex: 20,
      backgroundColor: LIGHT_BLUE,
      borderColor: '#bfdbfe'
    })
  ];
  return {
    key,
    mode: 'manifest',
    source: 'placeholder-adapter',
    label: `${templateName} manifest adapter`,
    canvas: { width: PAGE_WIDTH, height: PAGE_HEIGHT, size: 'A4', orientation: 'portrait' },
    pages: [{ id: 'page-1', name: `${templateName} Page 1`, elements: elements.map((item) => item.id) }],
    elements
  };
}

export function buildPdfTemplateManifest(key = '', config = {}, options = {}) {
  const normalizedKey = clean(key);
  if (normalizedKey === 'invoice') return invoiceManifest(config, options.company || COMPANY);
  if (normalizedKey === 'quotation') return quotationManifest(config, options.company || COMPANY);
  if (normalizedKey === 'service-completed') return serviceCompletedManifest(config, options.company || COMPANY);
  if (normalizedKey === 'amc-contract') return amcContractManifest(config, options.company || COMPANY);
  if (normalizedKey === 'amc-service-visit') return amcServiceVisitManifest(config, options.company || COMPANY);
  if (normalizedKey === 'amc-renewal-reminder') return amcRenewalManifest(config, options.company || COMPANY);
  return placeholderManifest(normalizedKey, config);
}
