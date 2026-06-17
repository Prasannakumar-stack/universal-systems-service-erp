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
  return placeholderManifest(normalizedKey, config);
}
