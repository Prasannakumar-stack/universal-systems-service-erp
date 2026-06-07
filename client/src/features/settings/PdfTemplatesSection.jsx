import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Box,
  ChevronDown,
  ChevronUp,
  Columns2,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FilePlus2,
  FileText,
  GripVertical,
  Grid2X2,
  History,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Loader2,
  Lock,
  Maximize2,
  Minus,
  Move,
  Palette,
  Plus,
  QrCode,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Signature,
  SlidersHorizontal,
  Square,
  Trash2,
  Type,
  Undo2,
  Unlock,
  X
} from 'lucide-react';
import {
  apiBase,
  ConfirmModal,
  ErrorBlock,
  formatDate,
  LoadingBlock,
  useEffect,
  useAuth,
  useMemo,
  useRef,
  useResource,
  useState,
  useToast
} from '../../shared/phase1Shared.jsx';
import { can, hasRole } from '../../utils/roles.js';

const placeholders = [
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
  '{{amc_start_date}}',
  '{{amc_end_date}}',
  '{{next_service_date}}',
  '{{current_date}}'
];

const sectionLabels = {
  service: 'Service Documents',
  amc: 'AMC Documents'
};

const pageBreakFields = [
  ['pageBreaks.repeatTableHeader', 'Repeat table header on new page'],
  ['pageBreaks.keepAmountSummaryTogether', 'Keep amount summary together'],
  ['pageBreaks.keepWorkNoticeTogether', 'Keep notice together'],
  ['pageBreaks.keepTermsTogether', 'Keep terms together'],
  ['pageBreaks.keepFooterAtBottom', 'Keep footer at bottom'],
  ['pageBreaks.showPageNumbers', 'Show page numbers']
];

const footerFields = [
  ['footer.showCallWhatsapp', 'Show call/WhatsApp'],
  ['footer.showEmail', 'Show email'],
  ['footer.showWebsite', 'Show website'],
  ['footer.showAddress', 'Show address']
];

const customCardTypes = [
  ['text', 'Text Card'],
  ['info', 'Info Card'],
  ['notice', 'Notice Card'],
  ['qr', 'QR / Payment Card'],
  ['signature', 'Signature Card'],
  ['spacer', 'Divider']
];

const cardWidthOptions = [
  ['full', 'Full width'],
  ['half', 'Half width'],
  ['third', 'One third'],
  ['auto', 'Auto']
];

const borderStyleOptions = [
  ['default', 'Default soft border'],
  ['thin', 'Thin border'],
  ['none', 'No border'],
  ['highlight', 'Highlight border']
];

const builderCanvas = {
  width: 595,
  height: 842,
  gridSize: 8
};

const builderElementTypes = [
  { type: 'text', label: 'Add Text', icon: Type },
  { type: 'card', label: 'Add Card', icon: Square },
  { type: 'qr', label: 'Add QR', icon: QrCode },
  { type: 'signature', label: 'Add Signature', icon: Signature },
  { type: 'divider', label: 'Add Divider', icon: Minus },
  { type: 'spacer', label: 'Add Spacer', icon: Maximize2 },
  { type: 'image', label: 'Add Image / Logo', icon: ImageIcon }
];

const builderRailItems = [
  { id: 'templates', label: 'Templates', icon: LayoutGrid },
  { id: 'elements', label: 'Elements', icon: Plus },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'uploads', label: 'Uploads / Logo', icon: ImageIcon },
  { id: 'variables', label: 'Variables', icon: ShieldCheck },
  { id: 'pages', label: 'Pages', icon: FilePlus2 },
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'history', label: 'History', icon: History }
];

const builderInspectorTabs = [
  ['content', 'Content'],
  ['layout', 'Layout'],
  ['style', 'Style'],
  ['visibility', 'Visibility'],
  ['advanced', 'Advanced']
];

const builderTextPresets = [
  {
    id: 'heading',
    label: 'Heading',
    name: 'Heading',
    content: { text: 'Document heading' },
    width: 300,
    height: 54,
    style: { fontSize: 22, fontWeight: 800, alignment: 'left', backgroundColor: '#ffffff', borderWidth: 0 }
  },
  {
    id: 'subheading',
    label: 'Subheading',
    name: 'Subheading',
    content: { text: 'Short supporting line' },
    width: 280,
    height: 44,
    style: { fontSize: 15, fontWeight: 700, alignment: 'left', backgroundColor: '#ffffff', borderWidth: 0 }
  },
  {
    id: 'body',
    label: 'Body Copy',
    name: 'Body Copy',
    content: { text: 'Add paragraph text or variables here.' },
    width: 300,
    height: 86,
    style: { fontSize: 12, fontWeight: 600, alignment: 'left', backgroundColor: '#ffffff', borderWidth: 1 }
  },
  {
    id: 'label',
    label: 'Small Label',
    name: 'Small Label',
    content: { text: 'LABEL' },
    width: 130,
    height: 34,
    style: { fontSize: 10, fontWeight: 800, alignment: 'center', backgroundColor: '#eef8ff', borderWidth: 1 }
  }
];

const builderVariableGroups = [
  ['Company variables', ['{{company.name}}', '{{company.phone}}', '{{company.email}}', '{{company.address}}']],
  ['Customer variables', ['{{customer.name}}', '{{customer.phone}}', '{{customer.address}}']],
  ['Booking variables', ['{{booking.id}}', '{{booking.serviceType}}', '{{booking.device}}']],
  ['Work Order variables', ['{{workOrder.id}}', '{{technician.name}}', '{{workOrder.problemComplaint}}']],
  ['Invoice variables', ['{{invoice.number}}', '{{invoice.date}}', '{{invoice.total}}']],
  ['Quotation variables', ['{{quotation.number}}', '{{quotation.date}}', '{{quotation.validityDays}}']],
  ['AMC variables', ['{{amc.contractNo}}', '{{amc.startDate}}', '{{amc.endDate}}']]
];

const defaultElementStyles = {
  accentColor: '#0284c7',
  backgroundColor: '#ffffff',
  textColor: '#0f172a',
  borderColor: '#cbd5e1',
  borderRadius: 10,
  borderWidth: 1,
  shadow: false,
  fontSize: 13,
  fontWeight: 700,
  alignment: 'left',
  dividerThickness: 2,
  dividerStyle: 'solid'
};

function editedBy(template) {
  return template?.lastEditedBy?.name || template?.lastEditedBy?.username || 'System default';
}

function getPath(source, path, fallback = '') {
  return String(path).split('.').reduce((cursor, key) => (cursor && cursor[key] !== undefined ? cursor[key] : undefined), source) ?? fallback;
}

function setPath(source, path, value) {
  const next = { ...(source || {}) };
  const keys = String(path).split('.');
  let cursor = next;
  keys.slice(0, -1).forEach((key) => {
    cursor[key] = Array.isArray(cursor[key]) ? cursor[key].slice() : { ...(cursor[key] || {}) };
    cursor = cursor[key];
  });
  cursor[keys.at(-1)] = value;
  return next;
}

function stableJson(value) {
  return JSON.stringify(value || {});
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function designStateFromConfig(config = {}) {
  return normalizeDesignState(cloneValue(config.design || {}));
}

function mergeDesignStateForSave(config = {}, designState = {}) {
  const currentDesign = config.design || {};
  const normalizedDesign = normalizeDesignState(designState);
  return {
    ...config,
    editMode: 'design',
    advancedEnabled: true,
    structured: {
      ...(config.structured || {}),
      designModeEnabled: true
    },
    design: {
      ...currentDesign,
      ...normalizedDesign,
      canvas: {
        ...(currentDesign.canvas || {}),
        ...(normalizedDesign.canvas || {})
      },
      page: {
        ...(currentDesign.page || {}),
        ...(normalizedDesign.page || {})
      },
      colors: {
        ...(currentDesign.colors || {}),
        ...(normalizedDesign.colors || {})
      },
      pages: normalizedDesign.pages,
      sections: normalizedDesign.sections,
      elements: normalizedDesign.elements,
      customElements: normalizedDesign.customElements,
      enabled: true,
      confirmed: true,
      lockedDefaultSections: true
    }
  };
}

function makeCustomCard(type = 'text') {
  const label = customCardTypes.find(([value]) => value === type)?.[1] || 'Custom Section';
  const isDivider = type === 'spacer';
  const isQr = type === 'qr';
  const isSignature = type === 'signature';
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    enabled: true,
    title: label,
    content: '',
    variable: '',
    width: 'full',
    minHeight: isDivider ? 32 : isQr ? 104 : isSignature ? 90 : 74,
    backgroundColor: type === 'notice' ? '#f1f7ff' : type === 'info' ? '#eef8ff' : '#ffffff',
    textColor: '#0f172a',
    borderColor: '#d8e5f7',
    accentColor: '#0f2a52'
  };
}

function customCardTypeLabel(type = 'text') {
  return customCardTypes.find(([value]) => value === type)?.[1]
    || (type ? `${String(type).replace(/-/g, ' ')} Card` : 'Custom Card');
}

function sectionGroupLabel(section = {}) {
  const title = String(section.title || '').toLowerCase();
  if (title.includes('header')) return 'Header';
  if (title.includes('customer') || title.includes('detail') || title.includes('period') || title.includes('plan') || title.includes('payment') || title.includes('problem')) return 'Customer / Details';
  if (title.includes('table') || title.includes('item') || title.includes('covered') || title.includes('work completed') || title.includes('parts')) return 'Items / Table';
  if (title.includes('notice') || title.includes('term') || title.includes('message') || title.includes('summary') || title.includes('signature') || title.includes('acknowledgement') || title.includes('renewal')) return 'Notes / Terms';
  if (title.includes('footer') || title.includes('page break')) return 'Footer / Page Break';
  return 'Other Sections';
}

function sectionKey(section, index = 0) {
  return section.key || `${String(section.title || 'section').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`;
}

function visibilityField(section) {
  return section.fields.find((field) => String(field.path || '').endsWith('.show'))
    || section.fields.find((field) => /show\/hide (section|message|table|terms|notice|summary|footer|customer greeting|plan details|payment details|renewal amount)/i.test(field.label || ''));
}

function sectionVisible(section, draft) {
  const field = visibilityField(section);
  if (!field) return true;
  return getPath(draft, field.path, field.fallback ?? true) !== false;
}

function sectionOptionPath(section, index, option) {
  return `structured.sectionOptions.${sectionKey(section, index)}.${option}`;
}

function designLayerOptionPath(layerId, option) {
  return `sectionOptions.${layerId}.${option}`;
}

function cleanLayerTitle(title = 'Section') {
  return String(title)
    .replace(/\s+Section$/i, '')
    .replace(/^Total Summary$/i, 'Amount Summary')
    .replace(/^Work Completion Notice$/i, 'Notice / Terms')
    .trim() || 'Section';
}

function designLayerRole(title = '') {
  const value = String(title).toLowerCase();
  if (value.includes('header')) return 'header';
  if (value.includes('footer') || value.includes('thank you')) return 'footer';
  if (value.includes('table') || value.includes('covered') || value.includes('work completed') || value.includes('parts used')) return 'table';
  if (value.includes('amount') || value.includes('summary') || value.includes('total')) return 'amount';
  if (value.includes('notice') || value.includes('terms') || value.includes('message') || value.includes('validity') || value.includes('acknowledgement') || value.includes('signature')) return 'notice';
  if (value.includes('customer')) return 'customer';
  if (value.includes('service') || value.includes('device') || value.includes('visit') || value.includes('amc') || value.includes('payment') || value.includes('plan') || value.includes('problem')) return 'details';
  return 'details';
}

function overlayStyleForLayer(layer, index) {
  const role = layer.role || 'details';
  const detailLane = index % 2;
  const detailRow = Math.floor(index / 2) % 2;
  const base = {
    header: { top: '3%', left: '6%', width: '88%', height: '10%' },
    customer: { top: '15%', left: '52%', width: '42%', height: '12%' },
    details: { top: `${15 + detailRow * 13}%`, left: detailLane === 0 ? '6%' : '52%', width: '42%', height: '12%' },
    table: { top: '34%', left: '6%', width: '88%', height: '25%' },
    amount: { top: '62%', left: '54%', width: '40%', height: '10%' },
    notice: { top: '74%', left: '6%', width: '88%', height: '11%' },
    footer: { top: '89%', left: '6%', width: '88%', height: '7%' },
    custom: { top: '72%', left: '10%', width: '80%', height: '9%' }
  };
  return base[role] || base.details;
}

function templateDisplayTitle(template = {}, draft = {}) {
  return getPath(draft, 'header.title', template?.name || 'PDF Document');
}

function previewBodyFromDraft(draft = {}, paths = [], fallback = '') {
  for (const path of paths) {
    const value = getPath(draft, path, '');
    if (Array.isArray(value) && value.length) return value.join('\n');
    if (value) return String(value);
  }
  return fallback;
}

function sectionPreviewContent(templateKey = '', section = {}, draft = {}, template = {}, index = 0) {
  const title = cleanLayerTitle(getPath(draft, sectionOptionPath(section, index, 'title'), section.title));
  const role = designLayerRole(section.title);
  const lower = String(section.title || '').toLowerCase();
  if (role === 'header') {
    return {
      kind: 'header',
      title: templateDisplayTitle(template, draft),
      body: 'Universal Systems\nPhone: 98765 43210\nsupport@universalsystems.example'
    };
  }
  if (role === 'customer') {
    return {
      kind: 'details',
      title,
      rows: [
        ['Customer', '{{customer_name}}'],
        ['Phone', '{{customer_phone}}'],
        ['Address', '{{customer_address}}']
      ]
    };
  }
  if (role === 'table') {
    const covered = lower.includes('covered');
    const work = lower.includes('work completed');
    return {
      kind: 'table',
      title,
      columns: covered ? ['Device', 'Serial No', 'Covered For'] : work ? ['Work', 'Status', 'Remarks'] : ['Description', 'Qty', 'Rate', 'Total'],
      rows: covered
        ? [['AC Unit', 'SN-2048', 'AMC'], ['Water Purifier', 'SN-9032', 'Service']]
        : work
          ? [['Diagnosis', 'Done', 'Issue fixed'], ['Testing', 'Done', 'Passed']]
          : [['Service labour', '1', 'Rs. 1,500', 'Rs. 1,500'], ['Replacement part', '1', 'Rs. 3,000', 'Rs. 3,000']]
    };
  }
  if (role === 'amount') {
    return {
      kind: 'amount',
      title,
      rows: [
        ['Subtotal', 'Rs. 4,500'],
        ['Tax', 'Rs. 810'],
        ['Final Total', 'Rs. 5,310']
      ]
    };
  }
  if (role === 'footer') {
    return {
      kind: 'footer',
      title,
      body: previewBodyFromDraft(draft, ['footer.thankYouMessage'], 'Thank you for choosing Universal Systems.')
    };
  }
  if (lower.includes('terms')) {
    return {
      kind: 'notice',
      title,
      body: previewBodyFromDraft(draft, ['sections.terms.text', 'sections.amcTerms.text'], 'Payment, warranty, and service terms appear here.')
    };
  }
  if (lower.includes('notice') || lower.includes('message') || lower.includes('validity') || lower.includes('acknowledgement') || lower.includes('renewal')) {
    return {
      kind: 'notice',
      title,
      body: previewBodyFromDraft(draft, [
        'sections.workCompletionNotice.messageLines',
        'sections.whatsappApprovalMessage.messageLines',
        'sections.validityNote.text',
        'sections.customerAcknowledgement.text',
        'sections.contactWhatsappMessage.text'
      ], 'Customer-facing note and message text will render here.')
    };
  }
  if (lower.includes('page break')) {
    return {
      kind: 'notice',
      title,
      body: 'Pagination controls: repeat headers, keep totals together, and show page numbers.'
    };
  }
  return {
    kind: 'details',
    title,
    rows: [
      ['Reference', templateKey === 'quotation' ? '{{quotation_number}}' : templateKey.includes('amc') ? '{{amc_contract_no}}' : '{{invoice_number}}'],
      ['Date', '{{current_date}}'],
      ['Status', 'Active'],
      ['Technician', '{{technician_name}}']
    ]
  };
}

function sectionHeightForRole(role = 'details', title = '') {
  const lower = String(title || '').toLowerCase();
  if (role === 'header') return 82;
  if (role === 'table') return 166;
  if (role === 'amount') return 96;
  if (role === 'notice') return lower.includes('terms') ? 126 : 104;
  if (role === 'footer') return 62;
  if (lower.includes('page break')) return 56;
  return 88;
}

const rendererSectionFrames = {
  invoice: [
    [/header/i, { x: 28, y: 10, width: 539, height: 136, role: 'header' }],
    [/invoice details/i, { x: 28, y: 154, width: 276, height: 132, role: 'details' }],
    [/customer details/i, { x: 304, y: 154, width: 263, height: 132, role: 'customer' }],
    [/service details/i, { x: 28, y: 294, width: 539, height: 108, role: 'details' }],
    [/item table/i, { x: 28, y: 409, width: 539, height: 88, role: 'table' }],
    [/amount summary/i, { x: 28, y: 498, width: 539, height: 104, role: 'amount' }],
    [/work completion/i, { x: 28, y: 614, width: 539, height: 67, role: 'notice' }],
    [/terms/i, { x: 28, y: 688, width: 539, height: 73, role: 'notice' }],
    [/footer/i, { x: 28, y: 770, width: 539, height: 67, role: 'footer' }],
    [/page break/i, { x: 28, y: 752, width: 539, height: 32, role: 'notice' }]
  ],
  quotation: [
    [/header/i, { x: 34, y: 25, width: 527, height: 124, role: 'header' }],
    [/quotation details/i, { x: 34, y: 158, width: 264, height: 80, role: 'details' }],
    [/customer details/i, { x: 298, y: 158, width: 263, height: 80, role: 'customer' }],
    [/service \/ device|service \/ product|service/i, { x: 34, y: 252, width: 270, height: 98, role: 'details' }],
    [/problem/i, { x: 304, y: 252, width: 257, height: 98, role: 'notice' }],
    [/item table/i, { x: 34, y: 370, width: 527, height: 92, role: 'table' }],
    [/total summary/i, { x: 366, y: 466, width: 195, height: 50, role: 'amount' }],
    [/validity/i, { x: 34, y: 520, width: 318, height: 32, role: 'notice' }],
    [/terms/i, { x: 34, y: 560, width: 527, height: 96, role: 'notice' }],
    [/whatsapp|approval|ready/i, { x: 34, y: 664, width: 527, height: 68, role: 'notice' }],
    [/footer/i, { x: 34, y: 755, width: 527, height: 77, role: 'footer' }],
    [/page break/i, { x: 34, y: 752, width: 527, height: 32, role: 'notice' }]
  ]
};

function rendererFrameForSection(templateKey = '', title = '') {
  const frames = rendererSectionFrames[templateKey] || [];
  const match = frames.find(([pattern]) => pattern.test(String(title || '')));
  return match ? { ...match[1] } : null;
}

function hasFramePatch(patch = {}) {
  return ['x', 'y', 'width', 'height', 'pageId'].some((key) => Object.prototype.hasOwnProperty.call(patch || {}, key));
}

function sectionOverflowRisk(section = {}, content = {}, rows = [], columns = []) {
  const height = Number(section.height || 0);
  if (height <= 0) return false;
  if (content.kind === 'table') return height < 48 + Math.max(1, rows.length) * 18;
  if (content.kind === 'header') return height < 74;
  if (content.kind === 'amount') return height < 62 + Math.max(0, rows.length - 2) * 13;
  const bodyText = [content.title, content.body, ...rows.flat(), ...columns].join(' ');
  const estimatedLines = Math.ceil(bodyText.length / Math.max(24, Math.floor(Number(section.width || 180) / 6)));
  return height < 30 + estimatedLines * 13;
}

function sectionDefaultStyle(role = 'details', draft = {}) {
  const accentColor = getPath(draft, 'design.colors.accentColor', getPath(draft, 'header.accentColor', '#0f2a52'));
  const noticeBackground = getPath(draft, 'design.colors.noticeBackground', '#f1f7ff');
  const base = {
    ...defaultElementStyles,
    accentColor,
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
    borderColor: getPath(draft, 'design.colors.borderColor', '#d8e5f7'),
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    shadow: false
  };
  if (role === 'header') return { ...base, backgroundColor: '#eef8ff', borderColor: accentColor, fontSize: 13, fontWeight: 800 };
  if (role === 'notice') return { ...base, backgroundColor: noticeBackground, accentColor: '#2563eb' };
  if (role === 'amount') return { ...base, backgroundColor: '#f8fafc', accentColor: '#047857' };
  if (role === 'footer') return { ...base, backgroundColor: '#f8fafc', fontSize: 10 };
  return base;
}

function buildDefaultTemplateSections(template = {}, sections = [], draft = {}) {
  const orderedKeys = Array.isArray(getPath(draft, 'structured.sectionOrder', [])) ? getPath(draft, 'structured.sectionOrder', []) : [];
  const orderedSections = [
    ...orderedKeys
      .map((key) => {
        const index = sections.findIndex((section, itemIndex) => sectionKey(section, itemIndex) === key);
        return index >= 0 ? { section: sections[index], index } : null;
      })
      .filter(Boolean),
    ...sections
      .map((section, index) => ({ section, index, key: sectionKey(section, index) }))
      .filter((item) => !orderedKeys.includes(item.key))
  ];
  const output = [];
  let y = 30;
  let pageNumber = 1;
  let halfRow = null;

  function flushHalfRow() {
    if (!halfRow) return;
    y = halfRow.y + halfRow.height + 12;
    halfRow = null;
  }

  function ensurePage(height) {
    if (y + height <= builderCanvas.height - 32) return;
    pageNumber += 1;
    y = 30;
    halfRow = null;
  }

  orderedSections.forEach(({ section, index }) => {
    const id = sectionKey(section, index);
    const title = cleanLayerTitle(getPath(draft, sectionOptionPath(section, index, 'title'), section.title));
    const rendererFrame = rendererFrameForSection(template.key, title || section.title);
    const role = rendererFrame?.role || designLayerRole(section.title);
    const height = rendererFrame?.height || sectionHeightForRole(role, section.title);
    const isHalf = !rendererFrame && (role === 'customer' || role === 'details');
    if (!sectionVisible(section, draft)) {
      return;
    }
    if (!rendererFrame && !isHalf) flushHalfRow();
    if (!rendererFrame) ensurePage(height);
    let x = rendererFrame?.x ?? 32;
    let sectionY = rendererFrame?.y ?? y;
    let width = rendererFrame?.width ?? builderCanvas.width - 64;
    if (!rendererFrame && isHalf) {
      if (!halfRow) {
        halfRow = { y, height };
        x = 32;
      } else {
        x = 304;
        sectionY = halfRow.y;
        halfRow.height = Math.max(halfRow.height, height);
      }
      width = 259;
    } else if (!rendererFrame && role === 'amount') {
      x = 304;
      width = 259;
    }
    output.push(normalizeBuilderSection({
      id,
      sourceKey: id,
      sourceIndex: index,
      type: 'section',
      name: title,
      title,
      role,
      pageId: rendererFrame?.pageId || `page-${pageNumber}`,
      x,
      y: sectionY,
      width,
      height,
      rendererFrame: Boolean(rendererFrame),
      layoutSource: rendererFrame ? 'renderer' : 'default',
      visible: true,
      enabled: true,
      locked: true,
      system: true,
      showTitle: getPath(draft, sectionOptionPath(section, index, 'showTitle'), true) !== false,
      showIcon: getPath(draft, sectionOptionPath(section, index, 'showIcon'), true) !== false,
      zIndex: index + 1,
      content: sectionPreviewContent(template.key, section, draft, template, index),
      style: sectionDefaultStyle(role, draft)
    }, output.length));
    if (!rendererFrame && isHalf && x > 32) flushHalfRow();
    if (!rendererFrame && !isHalf) y += height + 12;
  });
  flushHalfRow();
  const maxBottom = output.reduce((max, section) => Math.max(max, Number(section.y || 0) + Number(section.height || 0)), 0);
  const minY = output.reduce((min, section) => Math.min(min, Number(section.y || 0)), 30);
  const availableHeight = builderCanvas.height - 58;
  const usesRendererFrames = output.some((section) => section.rendererFrame === true);
  if (!usesRendererFrames && maxBottom > availableHeight && output.length) {
    const scale = Math.max(0.72, Math.min(1, (availableHeight - 28) / Math.max(1, maxBottom - minY)));
    return output.map((section, index) => normalizeBuilderSection({
      ...section,
      pageId: 'page-1',
      y: 28 + (Number(section.y || 0) - minY) * scale,
      height: Math.max(42, Number(section.height || 0) * scale),
      zIndex: section.zIndex || index + 1
    }, index));
  }
  return output.map((section, index) => normalizeBuilderSection({ ...section, pageId: 'page-1' }, index));
}

function normalizeBuilderSection(section = {}, index = 0) {
  const role = section.role || designLayerRole(section.title || section.name);
  const style = {
    ...sectionDefaultStyle(role),
    ...(section.style || {}),
    accentColor: section.style?.accentColor || section.accentColor || sectionDefaultStyle(role).accentColor,
    backgroundColor: section.style?.backgroundColor || section.backgroundColor || sectionDefaultStyle(role).backgroundColor,
    textColor: section.style?.textColor || section.textColor || sectionDefaultStyle(role).textColor,
    borderColor: section.style?.borderColor || section.borderColor || sectionDefaultStyle(role).borderColor
  };
  const content = typeof section.content === 'object' && section.content !== null
    ? cloneValue(section.content)
    : { kind: role === 'table' ? 'table' : 'details', title: section.title || section.name || 'Section', body: String(section.content || '') };
  const name = cleanLayerTitle(section.name || section.title || `Section ${index + 1}`);
  return {
    ...section,
    id: section.id || `section-${index + 1}`,
    type: 'section',
    kind: 'section',
    name,
    title: section.title || name,
    role,
    pageId: section.pageId || 'page-1',
    x: clampBuilderNumber(section.x, 32, 0, builderCanvas.width - 24),
    y: clampBuilderNumber(section.y, 30, 0, builderCanvas.height - 12),
    width: clampBuilderNumber(section.width, builderCanvas.width - 64, 24, builderCanvas.width),
    height: clampBuilderNumber(section.height, sectionHeightForRole(role, section.title), 24, builderCanvas.height),
    visible: section.visible ?? section.enabled ?? true,
    enabled: section.enabled ?? section.visible ?? true,
    locked: section.locked !== false,
    system: section.system !== false,
    showTitle: section.showTitle !== false,
    showIcon: section.showIcon !== false,
    fullWidth: Boolean(section.fullWidth),
    twoColumn: Boolean(section.twoColumn),
    pageBreakBefore: Boolean(section.pageBreakBefore),
    avoidSplit: section.avoidSplit !== false,
    printSafe: section.printSafe !== false,
    zIndex: clampBuilderNumber(section.zIndex, index + 1, 1, 999),
    alignment: section.alignment || style.alignment || 'left',
    rendererFrame: section.rendererFrame === true,
    layoutSource: section.layoutSource || (section.rendererFrame === true ? 'renderer' : 'default'),
    content,
    style
  };
}

function mergeTemplateSections(defaultSections = [], savedSections = []) {
  const savedById = new Map(savedSections.map((section) => [section.id || section.sourceKey, section]));
  const mergedIds = new Set();
  const merged = defaultSections.map((defaultSection, index) => {
    const saved = savedById.get(defaultSection.id) || savedById.get(defaultSection.sourceKey) || {};
    mergedIds.add(saved.id || defaultSection.id);
    const preserveSavedFrame = saved.layoutSource === 'custom';
    const rendererFrame = defaultSection.rendererFrame === true && !preserveSavedFrame
      ? {
          x: defaultSection.x,
          y: defaultSection.y,
          width: defaultSection.width,
          height: defaultSection.height,
          pageId: defaultSection.pageId,
          rendererFrame: true,
          layoutSource: 'renderer'
        }
      : {};
    return normalizeBuilderSection({
      ...defaultSection,
      ...saved,
      ...rendererFrame,
      id: defaultSection.id,
      sourceKey: defaultSection.sourceKey,
      sourceIndex: defaultSection.sourceIndex,
      role: defaultSection.role,
      system: true,
      locked: saved.locked ?? defaultSection.locked,
      content: { ...(defaultSection.content || {}), ...(saved.content || {}) },
      style: { ...(defaultSection.style || {}), ...(saved.style || {}) }
    }, index);
  });
  savedSections.forEach((section) => {
    if (!mergedIds.has(section.id || section.sourceKey)) merged.push(normalizeBuilderSection(section, merged.length));
  });
  return merged;
}

function designStateWithTemplateSections(designState = {}, sections = [], draft = {}, template = {}) {
  const normalized = normalizeDesignState(designState);
  const savedSections = Array.isArray(normalized.sections) ? normalized.sections.map((section, index) => normalizeBuilderSection(section, index)) : [];
  const defaultSections = normalized.blank === true ? [] : buildDefaultTemplateSections(template, sections, draft);
  const allowedPageIds = new Set(['page-1']);
  const savedPages = Array.isArray(designState.pages) ? designState.pages : [];
  savedPages.forEach((page) => {
    if (!page?.id) return;
    const hasSavedElements = Array.isArray(page.elements) && page.elements.length > 0;
    if (page.id === 'page-1' || page.manual === true || page.userAdded === true || hasSavedElements) allowedPageIds.add(page.id);
  });
  normalized.elements.forEach((element) => {
    if (element.pageId) allowedPageIds.add(element.pageId);
  });
  const mergedSections = (defaultSections.length ? mergeTemplateSections(defaultSections, savedSections) : savedSections)
    .map((section, index) => normalizeBuilderSection({
      ...section,
      pageId: allowedPageIds.has(section.pageId || 'page-1') ? section.pageId : 'page-1'
    }, index));
  const next = {
    ...normalized,
    sections: mergedSections,
    pages: normalizeDesignPages(normalized, normalized.elements, mergedSections)
  };
  return next;
}

function clampBuilderNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function snapBuilderValue(value, gridSize = builderCanvas.gridSize) {
  const grid = Math.max(1, Number(gridSize) || builderCanvas.gridSize);
  return Math.round(Number(value || 0) / grid) * grid;
}

function normalizeElementType(type = 'text') {
  const normalized = String(type || 'text').toLowerCase();
  if (normalized === 'info' || normalized === 'notice' || normalized === 'custom-field') return 'card';
  if (normalized === 'bank' || normalized === 'payment' || normalized === 'customer-message') return 'card';
  if (normalized === 'warranty' || normalized === 'terms') return 'card';
  if (normalized === 'line') return 'divider';
  if (builderElementTypes.some((item) => item.type === normalized)) return normalized;
  return 'text';
}

function contentDefaultsForElement(type = 'text') {
  if (type === 'card') return { title: 'Card title', body: 'Add details here', twoColumn: false };
  if (type === 'qr') return { label: 'QR CODE', qrType: 'payment', helperText: 'Payment / contact QR placeholder' };
  if (type === 'signature') return { label: 'Authorized Signature', name: '', designation: '' };
  if (type === 'divider') return { label: 'Divider' };
  if (type === 'spacer') return { label: 'Spacer' };
  if (type === 'image') return { label: 'Company Logo', imageMode: 'logo' };
  return { text: 'New text block' };
}

function defaultSizeForElement(type = 'text') {
  if (type === 'card') return { width: 260, height: 118 };
  if (type === 'qr') return { width: 190, height: 132 };
  if (type === 'signature') return { width: 230, height: 96 };
  if (type === 'divider') return { width: 260, height: 22 };
  if (type === 'spacer') return { width: 220, height: 44 };
  if (type === 'image') return { width: 180, height: 96 };
  return { width: 220, height: 76 };
}

function elementNameForType(type = 'text') {
  return builderElementTypes.find((item) => item.type === type)?.label.replace(/^Add\s+/i, '') || 'Element';
}

function makeBuilderElement(type = 'text', pageId = 'page-1', index = 0) {
  const normalizedType = normalizeElementType(type);
  const size = defaultSizeForElement(normalizedType);
  const id = `element-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const name = elementNameForType(normalizedType);
  return {
    id,
    type: normalizedType,
    name,
    title: name,
    pageId,
    x: 48 + (index % 5) * 18,
    y: 118 + (index % 7) * 26,
    width: size.width,
    height: size.height,
    widthMode: 'custom',
    visible: true,
    enabled: true,
    locked: false,
    showTitle: true,
    showIcon: true,
    fullWidth: false,
    twoColumn: false,
    pageBreakBefore: false,
    avoidSplit: true,
    printSafe: true,
    zIndex: index + 20,
    content: contentDefaultsForElement(normalizedType),
    style: { ...defaultElementStyles }
  };
}

function normalizeBuilderElement(element = {}, index = 0) {
  const type = normalizeElementType(element.type);
  const size = defaultSizeForElement(type);
  const rawContent = typeof element.content === 'object' && element.content !== null
    ? element.content
    : { ...contentDefaultsForElement(type), text: String(element.content || '') };
  const content = { ...contentDefaultsForElement(type), ...rawContent };
  const style = {
    ...defaultElementStyles,
    ...(element.style || {}),
    accentColor: element.style?.accentColor || element.accentColor || defaultElementStyles.accentColor,
    backgroundColor: element.style?.backgroundColor || element.backgroundColor || defaultElementStyles.backgroundColor,
    textColor: element.style?.textColor || element.textColor || defaultElementStyles.textColor,
    borderColor: element.style?.borderColor || element.borderColor || defaultElementStyles.borderColor
  };
  const name = cleanLayerTitle(element.name || element.title || elementNameForType(type));
  return {
    ...element,
    id: element.id || `element-${index + 1}`,
    type,
    name,
    title: element.title || name,
    pageId: element.pageId || 'page-1',
    x: clampBuilderNumber(element.x, 48, 0, builderCanvas.width - 24),
    y: clampBuilderNumber(element.y, 118, 0, builderCanvas.height - 12),
    width: clampBuilderNumber(element.width, size.width, 24, builderCanvas.width),
    height: clampBuilderNumber(element.height, size.height, 8, builderCanvas.height),
    widthMode: ['full', 'half', 'custom'].includes(element.widthMode) ? element.widthMode : 'custom',
    visible: element.visible ?? element.enabled ?? true,
    enabled: element.enabled ?? element.visible ?? true,
    locked: Boolean(element.locked),
    showTitle: element.showTitle !== false,
    showIcon: element.showIcon !== false,
    fullWidth: Boolean(element.fullWidth),
    twoColumn: Boolean(element.twoColumn || content.twoColumn),
    pageBreakBefore: Boolean(element.pageBreakBefore),
    avoidSplit: element.avoidSplit !== false,
    printSafe: element.printSafe !== false,
    zIndex: clampBuilderNumber(element.zIndex, index + 20, 1, 999),
    qrType: element.qrType || content.qrType || 'payment',
    alignment: element.alignment || style.alignment || 'left',
    content,
    style
  };
}

function normalizeDesignPages(source = {}, elements = [], sections = []) {
  const savedPages = Array.isArray(source.pages) ? source.pages : [];
  const pageIds = new Set(['page-1']);
  const usedPageIds = new Set(['page-1']);
  elements.forEach((element) => {
    if (element.pageId) {
      pageIds.add(element.pageId);
      usedPageIds.add(element.pageId);
    }
  });
  sections.forEach((section) => {
    if (section.pageId) {
      pageIds.add(section.pageId);
      usedPageIds.add(section.pageId);
    }
  });
  savedPages.forEach((page) => {
    if (!page?.id) return;
    const hasSavedElements = Array.isArray(page.elements) && page.elements.length > 0;
    if (page.id === 'page-1' || page.manual === true || page.userAdded === true || hasSavedElements || usedPageIds.has(page.id)) {
      pageIds.add(page.id);
    }
  });
  return [...pageIds].map((id, index) => {
    const saved = savedPages.find((page) => page?.id === id) || {};
    return {
      id,
      name: saved.name || `Page ${index + 1}`,
      elements: Array.isArray(saved.elements) ? saved.elements : [],
      manual: saved.manual === true || saved.userAdded === true
    };
  });
}

function normalizeDesignState(source = {}) {
  const rawElements = Array.isArray(source.customElements) && source.customElements.length
    ? source.customElements
    : Array.isArray(source.elements)
      ? source.elements
      : [];
  const elements = rawElements.map((element, index) => normalizeBuilderElement(element, index));
  const sections = Array.isArray(source.sections) ? source.sections.map((section, index) => normalizeBuilderSection(section, index)) : [];
  const pages = normalizeDesignPages(source, elements, sections);
  return {
    ...source,
    enabled: source.enabled === true,
    confirmed: source.confirmed === true,
    lockedDefaultSections: true,
    blank: source.blank === true,
    freeLayoutMode: source.freeLayoutMode === true,
    canvas: {
      size: 'A4',
      orientation: 'portrait',
      zoom: source.canvas?.zoom || 'fit-width',
      gridSize: clampBuilderNumber(source.canvas?.gridSize ?? source.gridSize, builderCanvas.gridSize, 4, 24),
      snap: source.canvas?.snap ?? source.snapToGrid ?? true
    },
    gridEnabled: source.gridEnabled !== false,
    snapToGrid: source.snapToGrid ?? source.canvas?.snap ?? true,
    page: {
      size: 'A4',
      orientation: 'portrait',
      margin: clampBuilderNumber(source.page?.margin, 28, 0, 80),
      backgroundColor: source.page?.backgroundColor || '#ffffff'
    },
    colors: {
      accentColor: source.colors?.accentColor || '#0f2a52',
      cardBackground: source.colors?.cardBackground || '#ffffff',
      textColor: source.colors?.textColor || '#0f172a',
      borderColor: source.colors?.borderColor || '#d8e5f7',
      noticeBackground: source.colors?.noticeBackground || '#f1f7ff'
    },
    pages,
    sections,
    elements,
    customElements: elements,
    savedTemplates: Array.isArray(source.savedTemplates) ? source.savedTemplates : [],
    sectionOptions: source.sectionOptions || {}
  };
}

function elementIconForType(type = 'text') {
  return builderElementTypes.find((item) => item.type === normalizeElementType(type))?.icon || Type;
}

function elementPrimaryText(element = {}) {
  const content = element.content || {};
  if (element.type === 'card') return content.body || content.title || element.name || '';
  if (element.type === 'qr') return content.label || 'QR CODE';
  if (element.type === 'signature') return [content.label, content.name, content.designation].filter(Boolean).join('\n');
  if (element.type === 'divider' || element.type === 'spacer' || element.type === 'image') return content.label || element.name || '';
  return content.text || element.content || '';
}

function frameFromPercent(style = {}) {
  return {
    x: Math.round((parseFloat(style.left) / 100) * builderCanvas.width),
    y: Math.round((parseFloat(style.top) / 100) * builderCanvas.height),
    width: Math.round((parseFloat(style.width) / 100) * builderCanvas.width),
    height: Math.round((parseFloat(style.height) / 100) * builderCanvas.height)
  };
}

function frameForSectionLayer(layer, index) {
  return frameFromPercent(overlayStyleForLayer(layer, index));
}

function styleForBuilderElement(element = {}, selected = false) {
  const style = element.style || defaultElementStyles;
  const borderWidth = clampBuilderNumber(style.borderWidth, 1, 0, 8);
  return {
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    zIndex: element.zIndex || 20,
    color: style.textColor || '#0f172a',
    background: element.type === 'divider' ? 'transparent' : style.backgroundColor || '#ffffff',
    borderColor: selected ? '#0284c7' : style.borderColor || '#cbd5e1',
    borderRadius: element.type === 'divider' ? 0 : clampBuilderNumber(style.borderRadius, 10, 0, 32),
    borderWidth: element.type === 'divider' ? 0 : borderWidth,
    boxShadow: style.shadow ? '0 14px 28px rgba(15, 23, 42, 0.16)' : 'none',
    textAlign: style.alignment || element.alignment || 'left',
    fontSize: clampBuilderNumber(style.fontSize, 13, 8, 32),
    fontWeight: style.fontWeight || 700
  };
}

function TemplateStatusPill({ status = 'Active' }) {
  return <span className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-500/15 px-2.5 py-1 text-xs font-black text-emerald-100">{status}</span>;
}

function TemplateCard({ template, canEdit, busyKey, onEdit, onPreview, onDownload, onReset }) {
  const previewBusy = busyKey === `preview-${template.key}`;
  const downloadBusy = busyKey === `download-${template.key}`;
  const resetBusy = busyKey === `reset-${template.key}`;
  const busy = Boolean(busyKey);
  return (
    <article className="surface admin-control-card flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="admin-control-icon"><FileText className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h3 className="text-lg font-black text-slate-50">{template.name}</h3>
            <p className="mt-2 text-sm leading-6 muted">{template.description}</p>
          </div>
        </div>
        <TemplateStatusPill status={template.status} />
      </div>
      <div className="mt-5 grid gap-3 rounded-card border border-white/10 bg-white/[0.035] p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-slate-300">Last edited</span>
          <span className="font-semibold text-slate-100">{template.lastEditedDate ? formatDate(template.lastEditedDate) : 'Not edited yet'}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-slate-300">Last edited by</span>
          <span className="font-semibold text-slate-100">{editedBy(template)}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-slate-300">Version</span>
          <span className="font-semibold text-slate-100">v{template.version || 1}</span>
        </div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button type="button" className="btn btn-primary min-h-11" disabled={!canEdit || busy} onClick={() => onEdit(template)}>
          <Edit3 className="h-4 w-4" />
          Edit Template
        </button>
        <button type="button" className="btn btn-secondary min-h-11" disabled={busy} onClick={() => onPreview(template)}>
          {previewBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          {previewBusy ? 'Loading...' : 'Preview PDF'}
        </button>
        <button type="button" className="btn btn-secondary min-h-11" disabled={busy} onClick={() => onDownload(template)}>
          {downloadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {downloadBusy ? 'Downloading...' : 'Download Sample PDF'}
        </button>
        <button type="button" className="btn btn-secondary min-h-11" disabled={!canEdit || busy} onClick={() => onReset(template)}>
          {resetBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Reset
        </button>
      </div>
      {!canEdit ? <p className="mt-3 text-xs font-semibold text-amber-100">Admin role required to edit or reset templates.</p> : null}
    </article>
  );
}

function TemplateVariablesModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4">
      <div className="surface admin-modal max-h-[85vh] w-full max-w-2xl overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Template Variables</p>
            <h2 className="mt-1 text-xl font-black">Available PDF Variables</h2>
            <p className="mt-2 text-sm leading-6 muted">Use placeholders in editable text. Values are filled only when a new PDF is generated.</p>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onClose} aria-label="Close template variables">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {placeholders.map((item) => (
            <code key={item} className="rounded-card border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-bold text-sky-100">{item}</code>
          ))}
        </div>
      </div>
    </div>
  );
}

function VersionHistoryPanel({ versions, restoring, onRestore }) {
  return (
    <section className="surface admin-control-card pdf-version-history-panel p-4">
      <div className="flex items-center gap-3">
        <div className="admin-control-icon"><History className="h-5 w-5" /></div>
        <div>
          <h3 className="font-black">Version History</h3>
          <p className="mt-1 text-xs muted">Recent saved template versions.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {versions.length ? versions.slice(0, 4).map((version) => (
          <div key={version.id || version.version} className="rounded-card border border-white/10 bg-white/[0.035] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-black text-slate-100">v{version.version}</p>
              <button type="button" className="btn btn-secondary py-1.5 text-xs" disabled={restoring} onClick={() => onRestore(version)}>
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
              </button>
            </div>
            <p className="mt-1 text-xs muted">{version.editedAt ? formatDate(version.editedAt) : 'No date'} by {version.editedBy?.name || version.editedBy?.username || 'System'}</p>
          </div>
        )) : <p className="rounded-card border border-white/10 bg-white/[0.035] p-3 text-sm muted">Previous versions will appear after the first edit.</p>}
      </div>
    </section>
  );
}

function FieldRow({ field, draft, setDraft, canEdit, saving }) {
  const value = getPath(draft, field.path, field.fallback ?? (field.type === 'toggle' ? true : ''));
  const disabled = !canEdit || saving;
  function update(nextValue) {
    setDraft((current) => setPath(current, field.path, nextValue));
  }

  if (field.type === 'toggle') {
    const checked = value !== false;
    return (
      <label className={`pdf-toggle-row ${disabled ? 'is-disabled' : ''}`}>
        <span className="pdf-toggle-label">{field.label}</span>
        <span className={`pdf-state-badge ${checked ? 'is-on' : 'is-off'}`}>{checked ? 'ON' : 'OFF'}</span>
        <span className="pdf-toggle-switch-wrap">
          <input className="sr-only" type="checkbox" checked={checked} disabled={disabled} onChange={(event) => update(event.target.checked)} />
          <span className={`pdf-toggle-switch ${checked ? 'is-on' : ''}`}>
            <span />
          </span>
        </span>
      </label>
    );
  }

  if (field.type === 'color') {
    return (
      <label className="pdf-control-field">
        <span className="label">{field.label}</span>
        <div className="pdf-color-control">
          <input className="h-12 w-full rounded-card border border-white/10 bg-transparent p-1" type="color" value={value || '#0f2a52'} disabled={disabled} onChange={(event) => update(event.target.value)} />
          <input className="input" value={value || ''} disabled={disabled} onChange={(event) => update(event.target.value)} />
        </div>
      </label>
    );
  }

  if (field.type === 'textarea' || field.type === 'lines') {
    const text = field.type === 'lines' ? (Array.isArray(value) ? value.join('\n') : value || '') : value || '';
    return (
      <label className="pdf-control-field pdf-field-full">
        <span className="label">{field.label}</span>
        <textarea className="input min-h-24" rows={field.rows || 4} value={text} disabled={disabled} onChange={(event) => update(field.type === 'lines' ? event.target.value.split('\n') : event.target.value)} />
      </label>
    );
  }

  return (
    <label className="pdf-control-field">
      <span className="label">{field.label}</span>
      <input className="input" value={value || ''} disabled={disabled} onChange={(event) => update(event.target.value)} />
    </label>
  );
}

function SectionCard({ section, draft, setDraft, canEdit, saving }) {
  const Icon = section.icon;
  return (
    <section className="surface admin-control-card p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="admin-control-icon"><Icon className="h-5 w-5" /></div>
        <div>
          <h3 className="text-lg font-black">{section.title}</h3>
          {section.description ? <p className="mt-1 text-sm muted">{section.description}</p> : null}
        </div>
      </div>
      <div className="pdf-editor-grid">
        {section.fields.map((field) => (
          <FieldRow key={field.path} field={field} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
        ))}
      </div>
    </section>
  );
}

function SelectControl({ label, value, options, disabled, onChange }) {
  return (
    <label className="pdf-control-field">
      <span className="label">{label}</span>
      <select className="input" value={value || ''} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel, optionDisabled]) => (
          <option key={optionValue} value={optionValue} disabled={Boolean(optionDisabled)}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function ColorControl({ label, value, disabled, onChange }) {
  return (
    <label className="pdf-control-field">
      <span className="label">{label}</span>
      <div className="pdf-color-control">
        <input className="h-12 w-full rounded-card border border-white/10 bg-transparent p-1" type="color" value={value || '#0f2a52'} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
        <input className="input" value={value || ''} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      </div>
    </label>
  );
}

function CustomSectionsEditor({ draft, setDraft, canEdit, saving, advancedEnabled, customSectionsEnabled, customColorsEnabled }) {
  const [newType, setNewType] = useState('text');
  const [removeCandidate, setRemoveCandidate] = useState(null);
  const [editingCardId, setEditingCardId] = useState('');
  const [open, setOpen] = useState(true);
  const enabled = advancedEnabled && customSectionsEnabled;
  const disabled = !canEdit || saving || !enabled;
  const cards = Array.isArray(getPath(draft, 'structured.customSections', [])) ? getPath(draft, 'structured.customSections', []) : [];

  if (!advancedEnabled) return null;

  if (!customSectionsEnabled) {
    return (
      <section className="surface admin-control-card pdf-custom-card-empty p-4">
        <div className="pdf-custom-accordion-head">
          <div className="flex min-w-0 items-start gap-3">
            <div className="admin-control-icon"><Layers className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h3 className="text-lg font-black text-[var(--app-text)]">Custom Sections / Cards</h3>
              <p className="mt-1 text-sm muted">Enable custom sections/cards in Advanced Layout to add custom cards.</p>
            </div>
          </div>
          <span className="pdf-state-badge is-off">OFF</span>
        </div>
      </section>
    );
  }

  function setCards(updater) {
    setDraft((current) => {
      const currentCards = Array.isArray(getPath(current, 'structured.customSections', [])) ? getPath(current, 'structured.customSections', []) : [];
      const nextCards = typeof updater === 'function' ? updater(currentCards) : updater;
      return setPath(current, 'structured.customSections', nextCards);
    });
  }

  function updateCard(index, patch) {
    setCards((currentCards) => currentCards.map((card, cardIndex) => (cardIndex === index ? { ...card, ...patch } : card)));
  }

  function addCard() {
    if (disabled) return;
    const flags = {};
    if (newType === 'qr') flags['structured.qrPaymentCardEnabled'] = true;
    if (newType === 'signature') flags['structured.signatureCardEnabled'] = true;
    const nextCard = makeCustomCard(newType);
    setEditingCardId(nextCard.id);
    setDraft((current) => {
      let next = current;
      Object.entries(flags).forEach(([path, value]) => {
        next = setPath(next, path, value);
      });
      const currentCards = Array.isArray(getPath(next, 'structured.customSections', [])) ? getPath(next, 'structured.customSections', []) : [];
      return setPath(next, 'structured.customSections', [...currentCards, nextCard]);
    });
  }

  function changeCardType(index, type) {
    const defaults = makeCustomCard(type);
    if (type === 'qr') setDraft((current) => setPath(current, 'structured.qrPaymentCardEnabled', true));
    if (type === 'signature') setDraft((current) => setPath(current, 'structured.signatureCardEnabled', true));
    updateCard(index, {
      type,
      minHeight: defaults.minHeight,
      backgroundColor: defaults.backgroundColor,
      title: cards[index]?.title || defaults.title
    });
  }

  function moveCard(index, direction) {
    if (disabled) return;
    setCards((currentCards) => {
      const target = index + direction;
      if (target < 0 || target >= currentCards.length) return currentCards;
      const nextCards = currentCards.slice();
      [nextCards[index], nextCards[target]] = [nextCards[target], nextCards[index]];
      return nextCards;
    });
  }

  return (
    <section className="surface admin-control-card pdf-custom-card-editor p-4">
      <div className="pdf-custom-accordion-head">
        <div className="flex min-w-0 items-start gap-3">
          <div className="admin-control-icon"><Layers className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Add Custom Card</p>
            <h3 className="mt-1 text-lg font-black text-[var(--app-text)]">Custom Sections / Cards</h3>
            <p className="mt-1 text-xs muted">Add optional cards after the fixed PDF sections. Saved PDFs render these only after Advanced Layout is enabled and the template is saved.</p>
          </div>
        </div>
        <button type="button" className="btn btn-secondary h-9 px-3 py-1.5 text-xs" onClick={() => setOpen((current) => !current)}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {open ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {open ? (
        <>
      <div className="pdf-custom-add-row mt-4">
        <div className="pdf-custom-add-controls">
          <SelectControl label="Card type" value={newType} options={customCardTypes} disabled={disabled} onChange={setNewType} />
          <button type="button" className="btn btn-primary self-end" disabled={disabled} onClick={addCard}>
            <Plus className="h-4 w-4" />
            Add Custom Card
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {cards.length ? cards.map((card, index) => {
          const type = card.type || 'text';
          const cardId = card.id || `custom-card-${index}`;
          const editing = editingCardId === cardId;
          const isDivider = type === 'spacer';
          const isQr = type === 'qr';
          const isSignature = type === 'signature';
          const contentLabel = isQr ? 'UPI ID or payment note' : isSignature ? 'Name / designation text' : 'Body / content';
          const variableLabel = isQr ? 'Optional QR text/value' : isSignature ? 'Signature image URL or fallback text' : 'Optional variable value';
          return (
            <article key={cardId} className="pdf-custom-card">
              <div className="pdf-custom-card-header">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="admin-control-icon h-9 w-9"><Layers className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="font-black text-[var(--app-text)]">{card.title || customCardTypeLabel(type)}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-[var(--app-text-muted)]">{customCardTypeLabel(type)}</p>
                  </div>
                </div>
                <div className="pdf-card-actions">
                  <button type="button" className="btn btn-secondary h-9 px-3 py-1.5 text-xs" disabled={disabled} onClick={() => setEditingCardId(editing ? '' : cardId)}>
                    <Edit3 className="h-3.5 w-3.5" />
                    {editing ? 'Done' : 'Edit'}
                  </button>
                  <button type="button" className="btn btn-secondary h-9 px-3 py-1.5 text-xs" disabled={disabled || index === 0} onClick={() => moveCard(index, -1)} aria-label="Move custom card up">
                    <ArrowUp className="h-4 w-4" />
                    Move Up
                  </button>
                  <button type="button" className="btn btn-secondary h-9 px-3 py-1.5 text-xs" disabled={disabled || index === cards.length - 1} onClick={() => moveCard(index, 1)} aria-label="Move custom card down">
                    <ArrowDown className="h-4 w-4" />
                    Move Down
                  </button>
                  <button type="button" className="btn btn-secondary pdf-card-delete-button h-9 px-3 py-1.5 text-xs" disabled={disabled} onClick={() => setRemoveCandidate({ ...card, index })} aria-label="Delete custom section">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
              <div className="pdf-custom-card-meta">
                <span className={`pdf-state-badge ${card.enabled !== false ? 'is-on' : 'is-off'}`}>{card.enabled !== false ? 'Visible' : 'Hidden'}</span>
                <span className="pdf-state-badge is-fixed">{card.width || getPath(draft, 'structured.defaultCardWidth', 'full')}</span>
              </div>
              {editing ? (
                <div className="pdf-custom-card-grid">
                  <SelectControl label="Type" value={type} options={customCardTypes} disabled={disabled} onChange={(value) => changeCardType(index, value)} />
                  <SelectControl label="Width" value={card.width || getPath(draft, 'structured.defaultCardWidth', 'full')} options={cardWidthOptions} disabled={disabled} onChange={(value) => updateCard(index, { width: value })} />
                  <label className="pdf-control-field">
                    <span className="label">{isDivider ? 'Divider label' : isSignature ? 'Signature label' : isQr ? 'Payment title' : 'Title'}</span>
                    <input className="input" value={card.title || ''} disabled={disabled} onChange={(event) => updateCard(index, { title: event.target.value })} />
                  </label>
                  <label className="pdf-control-field">
                    <span className="label">Minimum height</span>
                    <input className="input" type="number" min="8" max="260" value={card.minHeight || (isDivider ? 32 : 74)} disabled={disabled} onChange={(event) => updateCard(index, { minHeight: Number(event.target.value) })} />
                  </label>
                  <div className="pdf-field-full">
                    <label className={`pdf-toggle-row ${disabled ? 'is-disabled' : ''}`}>
                      <span className="pdf-toggle-label">Show/hide custom card</span>
                      <span className={`pdf-state-badge ${card.enabled !== false ? 'is-on' : 'is-off'}`}>{card.enabled !== false ? 'ON' : 'OFF'}</span>
                      <span className="pdf-toggle-switch-wrap">
                        <input className="sr-only" type="checkbox" checked={card.enabled !== false} disabled={disabled} onChange={(event) => updateCard(index, { enabled: event.target.checked })} />
                        <span className={`pdf-toggle-switch ${card.enabled !== false ? 'is-on' : ''}`}><span /></span>
                      </span>
                    </label>
                  </div>
                  {!isDivider ? (
                    <>
                      <label className="pdf-control-field pdf-field-full">
                        <span className="label">{contentLabel}</span>
                        <textarea className="input min-h-24" rows={4} value={card.content || ''} disabled={disabled} onChange={(event) => updateCard(index, { content: event.target.value })} />
                      </label>
                      <label className="pdf-control-field pdf-field-full">
                        <span className="label">{variableLabel}</span>
                        <input className="input" value={card.variable || ''} disabled={disabled} onChange={(event) => updateCard(index, { variable: event.target.value })} />
                      </label>
                      {customColorsEnabled ? (
                        <>
                          <ColorControl label="Accent color" value={card.accentColor} disabled={disabled} onChange={(value) => updateCard(index, { accentColor: value })} />
                          <ColorControl label="Card background" value={card.backgroundColor} disabled={disabled} onChange={(value) => updateCard(index, { backgroundColor: value })} />
                          <ColorControl label="Text color" value={card.textColor} disabled={disabled} onChange={(value) => updateCard(index, { textColor: value })} />
                          <ColorControl label="Border color" value={card.borderColor} disabled={disabled} onChange={(value) => updateCard(index, { borderColor: value })} />
                        </>
                      ) : null}
                    </>
                  ) : customColorsEnabled ? (
                    <ColorControl label="Accent color" value={card.accentColor} disabled={disabled} onChange={(value) => updateCard(index, { accentColor: value })} />
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        }) : (
          <p className="rounded-card border border-dashed border-white/15 bg-white/[0.025] p-4 text-sm muted">No custom cards added.</p>
        )}
      </div>
        </>
      ) : null}
      {removeCandidate ? (
        <ConfirmModal
          title="Remove custom card?"
          message={`Remove ${removeCandidate.title || 'this custom card'} from this template draft?`}
          confirmLabel="Remove"
          onCancel={() => setRemoveCandidate(null)}
          onConfirm={() => {
            const targetIndex = removeCandidate.index;
            setRemoveCandidate(null);
            setCards((currentCards) => currentCards.filter((_card, index) => index !== targetIndex));
          }}
        />
      ) : null}
    </section>
  );
}

function DesignModeWorkspace({
  template,
  sections,
  draft,
  setDraft,
  designDraft,
  setDesignDraft,
  canEdit,
  saving,
  busyKey,
  versions,
  restoring,
  onRestore,
  hasUnsavedDesignChanges,
  previewUrl,
  previewLoading,
  previewError,
  onBack,
  onPreview,
  onDownload,
  onShowVariables
}) {
  const disabled = !canEdit || saving;
  const normalizedDesign = useMemo(() => normalizeDesignState(designDraft), [designDraft]);
  const canvasDesign = useMemo(
    () => designStateWithTemplateSections(normalizedDesign, sections, draft, template),
    [normalizedDesign, sections, draft, template]
  );
  const elements = canvasDesign.elements;
  const canvasSections = canvasDesign.sections;
  const pages = canvasDesign.pages;
  const gridSize = canvasDesign.canvas.gridSize || builderCanvas.gridSize;
  const snapEnabled = canvasDesign.canvas.snap !== false && canvasDesign.snapToGrid !== false;
  const gridEnabled = canvasDesign.gridEnabled !== false;
  const freeLayoutMode = canvasDesign.freeLayoutMode === true;
  const [activeRail, setActiveRail] = useState('templates');
  const [selectedLayerId, setSelectedLayerId] = useState('');
  const [currentPageId, setCurrentPageId] = useState(pages[0]?.id || 'page-1');
  const [zoom, setZoom] = useState(canvasDesign.canvas.zoom === 'fit' ? 'fit-width' : canvasDesign.canvas.zoom || 'fit-width');
  const [variableQuery, setVariableQuery] = useState('');
  const [activeInspectorTab, setActiveInspectorTab] = useState('content');
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [rightInspectorOpen, setRightInspectorOpen] = useState(true);
  const [fullScreenEditor, setFullScreenEditor] = useState(true);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [interaction, setInteraction] = useState(null);
  const paperRef = useRef(null);
  const freeLayoutWarningShownRef = useRef(false);
  const normalizedSignature = stableJson(normalizedDesign);
  const rawDesignSignature = stableJson(designDraft);

  useEffect(() => {
    if (rawDesignSignature !== normalizedSignature) setDesignDraft(normalizedDesign);
  }, [rawDesignSignature, normalizedSignature, normalizedDesign, setDesignDraft]);

  useEffect(() => {
    setUndoStack([]);
    setRedoStack([]);
    setSelectedLayerId('');
    setCurrentPageId('page-1');
  }, [template.key]);

  useEffect(() => {
    if (!pages.some((page) => page.id === currentPageId)) setCurrentPageId(pages[0]?.id || 'page-1');
  }, [currentPageId, pages]);

  const sectionLayers = canvasSections.map((sectionDesign, index) => {
    const key = sectionDesign.id || `section-${index + 1}`;
    const originalSection = sections[sectionDesign.sourceIndex] || sections.find((section, itemIndex) => sectionKey(section, itemIndex) === (sectionDesign.sourceKey || key));
    const title = cleanLayerTitle(sectionDesign.name || sectionDesign.title || originalSection?.title || 'Section');
    return {
      id: key,
      name: title,
      title,
      kind: 'section',
      type: 'section',
      badge: 'Section',
      pageId: sectionDesign.pageId || 'page-1',
      locked: sectionDesign.locked !== false || !freeLayoutMode,
      editable: true,
      supportsVisibility: true,
      supportsTitle: true,
      supportsIcon: true,
      visible: sectionDesign.visible !== false && sectionDesign.enabled !== false,
      role: sectionDesign.role || designLayerRole(title),
      section: originalSection,
      sectionDesign,
      sectionIndex: sectionDesign.sourceIndex ?? index
    };
  });
  const elementLayers = elements.map((element, index) => ({
    id: element.id || `element-${index}`,
    name: element.name || element.title || 'Free Element',
    title: element.name || element.title || 'Free Element',
    kind: 'element',
    type: element.type,
    badge: elementNameForType(element.type),
    pageId: element.pageId || 'page-1',
    locked: false,
    editable: true,
    supportsVisibility: true,
    supportsTitle: true,
    supportsIcon: false,
    visible: element.visible !== false && element.enabled !== false,
    role: 'custom',
    element,
    elementIndex: index
  }));
  const layers = [...sectionLayers, ...elementLayers];
  const layerSignature = layers.map((layer) => layer.id).join('|');
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) || null;
  const selectedElement = selectedLayer?.kind === 'element' ? selectedLayer.element : null;
  const selectedSectionLayer = selectedLayer?.kind === 'section' ? selectedLayer : null;
  const selectedSection = selectedSectionLayer?.sectionDesign || null;
  const currentPage = pages.find((page) => page.id === currentPageId) || pages[0] || { id: 'page-1', name: 'Page 1' };
  const currentPageIndex = Math.max(0, pages.findIndex((page) => page.id === currentPage.id));
  const referencePdfUrl = previewUrl ? `${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&page=${currentPageIndex + 1}` : '';
  const zoomScale = zoom === '125' ? 1.25 : zoom === '100' ? 1 : zoom === '75' ? 0.75 : zoom === 'fit-width' ? 1.1 : 0.88;
  const previewConfig = useMemo(() => mergeDesignStateForSave(draft, canvasDesign), [draft, canvasDesign]);
  const visiblePageSections = canvasSections
    .filter((section) => (section.pageId || 'page-1') === currentPage.id && section.visible !== false && section.enabled !== false)
    .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  const visiblePageElements = elements
    .filter((element) => (element.pageId || 'page-1') === currentPage.id && element.visible !== false && element.enabled !== false)
    .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  useEffect(() => {
    if (selectedLayerId && !layers.some((layer) => layer.id === selectedLayerId)) setSelectedLayerId('');
  }, [selectedLayerId, layerSignature]);

  useEffect(() => {
    if (selectedLayerId) setInspectorCollapsed(false);
  }, [selectedLayerId]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
    document.body.classList.add('pdf-design-active');
    return () => document.body.classList.remove('pdf-design-active');
  }, []);

  useEffect(() => {
    document.body.classList.toggle('pdf-design-fullscreen', fullScreenEditor);
    return () => document.body.classList.remove('pdf-design-fullscreen');
  }, [fullScreenEditor]);

  function currentCanvasDesign(source = designDraft) {
    return designStateWithTemplateSections(source, sections, draft, template);
  }

  function commitDesign(updater) {
    if (disabled) return;
    setUndoStack((history) => [...history.slice(-24), currentCanvasDesign(designDraft)]);
    setRedoStack([]);
    setDesignDraft((current) => {
      const currentDesign = currentCanvasDesign(current);
      const next = typeof updater === 'function' ? updater(currentDesign) : updater;
      return normalizeDesignState(next);
    });
  }

  function updateDesignDirect(updater) {
    setDesignDraft((current) => normalizeDesignState(typeof updater === 'function' ? updater(currentCanvasDesign(current)) : updater));
  }

  function patchElement(elementId, patch) {
    commitDesign((current) => {
      const nextElements = current.elements.map((element, index) => {
        if (element.id !== elementId) return element;
        const patchValue = typeof patch === 'function' ? patch(element) : patch;
        const merged = {
          ...element,
          ...patchValue,
          content: patchValue.content ? { ...(element.content || {}), ...patchValue.content } : element.content,
          style: patchValue.style ? { ...(element.style || {}), ...patchValue.style } : element.style
        };
        return normalizeBuilderElement(merged, index);
      });
      return { ...current, elements: nextElements, customElements: nextElements };
    });
  }

  function patchElementDirect(elementId, patch) {
    updateDesignDirect((current) => {
      const nextElements = current.elements.map((element, index) => {
        if (element.id !== elementId) return element;
        const patchValue = typeof patch === 'function' ? patch(element) : patch;
        return normalizeBuilderElement({ ...element, ...patchValue }, index);
      });
      return { ...current, elements: nextElements, customElements: nextElements };
    });
  }

  function patchSection(sectionId, patch) {
    commitDesign((current) => {
      const nextSections = current.sections.map((section, index) => {
        if (section.id !== sectionId) return section;
        const patchValue = typeof patch === 'function' ? patch(section) : patch;
        const frameEdited = hasFramePatch(patchValue);
        const merged = {
          ...section,
          ...patchValue,
          layoutSource: frameEdited ? 'custom' : section.layoutSource,
          rendererFrame: frameEdited ? false : section.rendererFrame,
          content: patchValue.content ? { ...(section.content || {}), ...patchValue.content } : section.content,
          style: patchValue.style ? { ...(section.style || {}), ...patchValue.style } : section.style
        };
        return normalizeBuilderSection(merged, index);
      });
      return {
        ...current,
        sections: nextSections,
        pages: normalizeDesignPages(current, current.elements, nextSections)
      };
    });
  }

  function patchSectionDirect(sectionId, patch) {
    updateDesignDirect((current) => {
      const nextSections = current.sections.map((section, index) => {
        if (section.id !== sectionId) return section;
        const patchValue = typeof patch === 'function' ? patch(section) : patch;
        const frameEdited = hasFramePatch(patchValue);
        return normalizeBuilderSection({
          ...section,
          ...patchValue,
          layoutSource: frameEdited ? 'custom' : section.layoutSource,
          rendererFrame: frameEdited ? false : section.rendererFrame
        }, index);
      });
      return {
        ...current,
        sections: nextSections,
        pages: normalizeDesignPages(current, current.elements, nextSections)
      };
    });
  }

  function updateSectionOption(layerId, option, value) {
    commitDesign((current) => setPath(current, designLayerOptionPath(layerId, option), value));
  }

  function updateLayerOption(layer, option, value) {
    if (!layer) return;
    if (layer.kind === 'element') {
      patchElement(layer.id, { [option]: value });
      return;
    }
    patchSection(layer.id, { [option]: value });
    updateSectionOption(layer.id, option, value);
  }

  function toggleLayerVisibility(layer) {
    if (!layer) return;
    if (layer.kind === 'section' && layer.supportsVisibility) {
      const nextVisible = !layer.visible;
      const field = layer.section ? visibilityField(layer.section) : null;
      if (field) setDraft((current) => setPath(current, field.path, nextVisible));
      patchSection(layer.id, { visible: nextVisible, enabled: nextVisible });
      updateSectionOption(layer.id, 'visible', nextVisible);
      return;
    }
    if (layer.kind === 'element') patchElement(layer.id, { visible: !layer.visible, enabled: !layer.visible });
  }

  function addElement(type) {
    if (disabled) return;
    const nextElement = makeBuilderElement(type, currentPage.id, elements.length);
    commitDesign((current) => {
      const nextElements = [...current.elements, nextElement];
      return { ...current, elements: nextElements, customElements: nextElements };
    });
    setSelectedLayerId(nextElement.id);
    setActiveRail('layers');
  }

  function addTextPreset(preset) {
    if (disabled) return;
    const nextElement = normalizeBuilderElement({
      ...makeBuilderElement('text', currentPage.id, elements.length),
      name: preset.name,
      title: preset.name,
      width: preset.width,
      height: preset.height,
      content: preset.content,
      style: { ...defaultElementStyles, ...(preset.style || {}) }
    }, elements.length);
    commitDesign((current) => {
      const nextElements = [...current.elements, nextElement];
      return { ...current, elements: nextElements, customElements: nextElements };
    });
    setSelectedLayerId(nextElement.id);
    setActiveRail('layers');
  }

  function applyDefaultTemplateLayout() {
    if (disabled) return;
    commitDesign((current) => ({
      ...current,
      blank: false,
      freeLayoutMode: false,
      sections: buildDefaultTemplateSections(template, sections, draft),
      pages: normalizeDesignPages(current, current.elements, buildDefaultTemplateSections(template, sections, draft))
    }));
    setSelectedLayerId('');
    setCurrentPageId('page-1');
    setActiveRail('layers');
  }

  function startBlankDesign() {
    if (disabled) return;
    if (!window.confirm('Start from a blank A4 design? Existing canvas sections and elements in this unsaved draft will be cleared.')) return;
    commitDesign((current) => ({
      ...current,
      blank: true,
      freeLayoutMode: true,
      sections: [],
      elements: [],
      customElements: [],
      pages: [{ id: 'page-1', name: 'Blank A4', elements: [] }]
    }));
    setSelectedLayerId('');
    setCurrentPageId('page-1');
    setActiveRail('elements');
  }

  function duplicateCurrentTemplate() {
    if (disabled) return;
    const snapshot = {
      id: `saved-template-${Date.now()}`,
      name: `${template.name} Copy`,
      createdAt: new Date().toISOString(),
      design: {
        ...canvasDesign,
        sections: canvasSections,
        elements,
        customElements: elements,
        pages
      }
    };
    commitDesign((current) => ({
      ...current,
      savedTemplates: [snapshot, ...(current.savedTemplates || [])].slice(0, 12)
    }));
    setActiveRail('templates');
  }

  function applySavedTemplate(savedTemplate) {
    if (disabled || !savedTemplate?.design) return;
    commitDesign((current) => ({
      ...current,
      ...cloneValue(savedTemplate.design),
      savedTemplates: current.savedTemplates || []
    }));
    setSelectedLayerId('');
    setCurrentPageId(savedTemplate.design.pages?.[0]?.id || 'page-1');
  }

  function deleteSavedTemplate(templateId) {
    if (disabled) return;
    commitDesign((current) => ({
      ...current,
      savedTemplates: (current.savedTemplates || []).filter((item) => item.id !== templateId)
    }));
  }

  function duplicateElement(element) {
    if (!element || disabled) return;
    const copy = normalizeBuilderElement({
      ...cloneValue(element),
      id: `element-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: `${element.name || 'Element'} Copy`,
      x: Math.min(builderCanvas.width - 24, element.x + 18),
      y: Math.min(builderCanvas.height - 12, element.y + 18),
      zIndex: (Math.max(...elements.map((item) => item.zIndex || 1), 1) + 1)
    }, elements.length);
    commitDesign((current) => {
      const nextElements = [...current.elements, copy];
      return { ...current, elements: nextElements, customElements: nextElements };
    });
    setSelectedLayerId(copy.id);
  }

  function deleteElement(elementId) {
    if (disabled) return;
    commitDesign((current) => {
      const nextElements = current.elements.filter((element) => element.id !== elementId);
      return { ...current, elements: nextElements, customElements: nextElements };
    });
    setSelectedLayerId('');
  }

  function duplicateSection(section) {
    if (!section || disabled) return;
    const copy = normalizeBuilderSection({
      ...cloneValue(section),
      id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sourceKey: '',
      sourceIndex: undefined,
      system: false,
      locked: false,
      rendererFrame: false,
      layoutSource: 'custom',
      name: `${section.name || section.title || 'Section'} Copy`,
      title: `${section.title || section.name || 'Section'} Copy`,
      pageId: section.pageId || currentPage.id || 'page-1',
      x: Math.min(builderCanvas.width - 24, (section.x || 32) + 18),
      y: Math.min(builderCanvas.height - 12, (section.y || 30) + 18),
      zIndex: Math.max(...canvasSections.map((item) => item.zIndex || 1), 1) + 1
    }, canvasSections.length);
    commitDesign((current) => {
      const nextSections = [...current.sections, copy];
      return {
        ...current,
        sections: nextSections,
        pages: normalizeDesignPages(current, current.elements, nextSections)
      };
    });
    setSelectedLayerId(copy.id);
    setActiveRail('layers');
  }

  function deleteSection(sectionId) {
    if (disabled) return;
    const target = canvasSections.find((section) => section.id === sectionId);
    if (!target || target.system !== false) return;
    commitDesign((current) => {
      const nextSections = current.sections.filter((section) => section.id !== sectionId);
      return {
        ...current,
        sections: nextSections,
        pages: normalizeDesignPages(current, current.elements, nextSections)
      };
    });
    setSelectedLayerId('');
  }

  function moveElementLayer(elementId, direction) {
    if (disabled) return;
    commitDesign((current) => {
      const nextElements = current.elements.slice();
      const index = nextElements.findIndex((element) => element.id === elementId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= nextElements.length) return current;
      [nextElements[index], nextElements[target]] = [nextElements[target], nextElements[index]];
      return {
        ...current,
        elements: nextElements.map((element, itemIndex) => ({ ...element, zIndex: itemIndex + 20 })),
        customElements: nextElements.map((element, itemIndex) => ({ ...element, zIndex: itemIndex + 20 }))
      };
    });
  }

  function addPage() {
    if (disabled) return;
    const id = `page-${pages.length + 1}`;
    commitDesign((current) => ({
      ...current,
      pages: [...current.pages, { id, name: `Page ${current.pages.length + 1}`, elements: [], manual: true }]
    }));
    setCurrentPageId(id);
    setActiveRail('pages');
  }

  function duplicatePage(page) {
    if (disabled || !page) return;
    const id = `page-${pages.length + 1}`;
    commitDesign((current) => {
      const copiedElements = current.elements
        .filter((element) => (element.pageId || 'page-1') === page.id)
        .map((element, index) => normalizeBuilderElement({
          ...cloneValue(element),
          id: `element-${Date.now()}-${index}`,
          name: `${element.name || 'Element'} Copy`,
          pageId: id,
          x: Math.min(builderCanvas.width - 24, element.x + 12),
          y: Math.min(builderCanvas.height - 12, element.y + 12),
          zIndex: (current.elements.length + index + 20)
        }, current.elements.length + index));
      const copiedSections = current.sections
        .filter((section) => (section.pageId || 'page-1') === page.id)
        .map((section, index) => normalizeBuilderSection({
          ...cloneValue(section),
          id: `section-${Date.now()}-${index}`,
          sourceKey: '',
          system: false,
          locked: false,
          name: `${section.name || 'Section'} Copy`,
          title: `${section.title || 'Section'} Copy`,
          pageId: id,
          zIndex: (current.sections.length + index + 1)
        }, current.sections.length + index));
      const nextElements = [...current.elements, ...copiedElements];
      const nextSections = [...current.sections, ...copiedSections];
      return {
        ...current,
        pages: [...current.pages, { id, name: `${page.name || 'Page'} Copy`, elements: copiedElements.map((element) => element.id), manual: true }],
        elements: nextElements,
        customElements: nextElements,
        sections: nextSections
      };
    });
    setCurrentPageId(id);
  }

  function deletePage(pageId) {
    if (disabled || pageId === 'page-1' || pages.length <= 1) return;
    commitDesign((current) => {
      const nextElements = current.elements.filter((element) => (element.pageId || 'page-1') !== pageId);
      const nextSections = current.sections.filter((section) => (section.pageId || 'page-1') !== pageId);
      return {
        ...current,
        pages: current.pages.filter((page) => page.id !== pageId),
        elements: nextElements,
        customElements: nextElements,
        sections: nextSections
      };
    });
    setCurrentPageId('page-1');
    setSelectedLayerId('');
  }

  function movePage(pageId, direction) {
    if (disabled) return;
    commitDesign((current) => {
      const nextPages = current.pages.slice();
      const index = nextPages.findIndex((page) => page.id === pageId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= nextPages.length) return current;
      [nextPages[index], nextPages[target]] = [nextPages[target], nextPages[index]];
      return { ...current, pages: nextPages };
    });
  }

  function updateCanvasOption(path, value) {
    commitDesign((current) => setPath(current, path, value));
  }

  function toggleFreeLayoutMode() {
    const nextValue = !freeLayoutMode;
    if (nextValue && !freeLayoutWarningShownRef.current) {
      if (!window.confirm('Free Layout Mode gives full control but can break PDF alignment. Use carefully.')) return;
      freeLayoutWarningShownRef.current = true;
    }
    commitDesign((current) => ({
      ...current,
      freeLayoutMode: nextValue,
      sections: current.sections.map((section, index) => normalizeBuilderSection({
        ...section,
        locked: nextValue ? false : section.system !== false
      }, index))
    }));
  }

  function undoDesign() {
    if (!undoStack.length) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((history) => history.slice(0, -1));
    setRedoStack((history) => [currentCanvasDesign(designDraft), ...history.slice(0, 24)]);
    setDesignDraft(previous);
  }

  function redoDesign() {
    if (!redoStack.length) return;
    const next = redoStack[0];
    setRedoStack((history) => history.slice(1));
    setUndoStack((history) => [...history.slice(-24), currentCanvasDesign(designDraft)]);
    setDesignDraft(next);
  }

  function beginElementInteraction(event, element, mode = 'move', handle = '') {
    if (disabled || element.locked) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = paperRef.current?.getBoundingClientRect();
    const scale = rect ? rect.width / builderCanvas.width : zoomScale;
    setUndoStack((history) => [...history.slice(-24), currentCanvasDesign(designDraft)]);
    setRedoStack([]);
    setSelectedLayerId(element.id);
    setInteraction({
      kind: 'element',
      id: element.id,
      type: element.type,
      mode,
      handle,
      scale,
      startX: event.clientX,
      startY: event.clientY,
      startFrame: {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height
      }
    });
  }

  function beginSectionInteraction(event, section, mode = 'move', handle = '') {
    if (disabled || !freeLayoutMode || section.locked) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = paperRef.current?.getBoundingClientRect();
    const scale = rect ? rect.width / builderCanvas.width : zoomScale;
    setUndoStack((history) => [...history.slice(-24), currentCanvasDesign(designDraft)]);
    setRedoStack([]);
    setSelectedLayerId(section.id);
    setInteraction({
      kind: 'section',
      id: section.id,
      type: 'section',
      mode,
      handle,
      scale,
      startX: event.clientX,
      startY: event.clientY,
      startFrame: {
        x: section.x,
        y: section.y,
        width: section.width,
        height: section.height
      }
    });
  }

  useEffect(() => {
    if (!interaction) return undefined;
    function onMove(event) {
      const dx = (event.clientX - interaction.startX) / interaction.scale;
      const dy = (event.clientY - interaction.startY) / interaction.scale;
      const start = interaction.startFrame;
      let next = { ...start };
      if (interaction.mode === 'resize') {
        if (interaction.handle.includes('e')) next.width = start.width + dx;
        if (interaction.handle.includes('s')) next.height = start.height + dy;
        if (interaction.handle.includes('w')) {
          next.x = start.x + dx;
          next.width = start.width - dx;
        }
        if (interaction.handle.includes('n')) {
          next.y = start.y + dy;
          next.height = start.height - dy;
        }
      } else {
        next.x = start.x + dx;
        next.y = start.y + dy;
      }
      if (snapEnabled) {
        next.x = snapBuilderValue(next.x, gridSize);
        next.y = snapBuilderValue(next.y, gridSize);
        next.width = snapBuilderValue(next.width, gridSize);
        next.height = snapBuilderValue(next.height, gridSize);
      }
      const minSize = interaction.kind === 'section'
        ? { width: 80, height: 32 }
        : defaultSizeForElement(interaction.type || selectedElement?.type || 'text');
      next.width = clampBuilderNumber(next.width, minSize.width, 24, builderCanvas.width);
      next.height = clampBuilderNumber(next.height, minSize.height, 8, builderCanvas.height);
      next.x = clampBuilderNumber(next.x, 0, 0, builderCanvas.width - 12);
      next.y = clampBuilderNumber(next.y, 0, 0, builderCanvas.height - 8);
      if (interaction.kind === 'section') patchSectionDirect(interaction.id, next);
      else patchElementDirect(interaction.id, next);
    }
    function onUp() {
      setInteraction(null);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [interaction, gridSize, snapEnabled, selectedElement?.type]);

  useEffect(() => {
    function onKeyDown(event) {
      if ((!selectedElement && !selectedSection) || disabled) return;
      const deltas = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1]
      };
      if (!deltas[event.key]) return;
      if (selectedElement?.locked) return;
      if (selectedSection && (!freeLayoutMode || selectedSection.locked)) return;
      event.preventDefault();
      const amount = event.shiftKey ? 10 : 1;
      const [xDelta, yDelta] = deltas[event.key];
      if (selectedElement) {
        patchElement(selectedElement.id, {
          x: clampBuilderNumber(selectedElement.x + xDelta * amount, selectedElement.x, 0, builderCanvas.width - 12),
          y: clampBuilderNumber(selectedElement.y + yDelta * amount, selectedElement.y, 0, builderCanvas.height - 8)
        });
        return;
      }
      patchSection(selectedSection.id, {
        x: clampBuilderNumber(selectedSection.x + xDelta * amount, selectedSection.x, 0, builderCanvas.width - 12),
        y: clampBuilderNumber(selectedSection.y + yDelta * amount, selectedSection.y, 0, builderCanvas.height - 8)
      });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedElement, selectedSection, freeLayoutMode, disabled]);

  function insertVariable(variable) {
    if (!selectedElement && !selectedSection) {
      onShowVariables?.();
      return;
    }
    if (selectedSection) {
      const content = selectedSection.content || {};
      patchSection(selectedSection.id, {
        content: {
          body: `${content.body || ''}${content.body ? ' ' : ''}${variable}`
        }
      });
      return;
    }
    const content = selectedElement.content || {};
    const target = selectedElement.type === 'card'
      ? 'body'
      : selectedElement.type === 'qr'
        ? 'helperText'
        : selectedElement.type === 'signature'
          ? 'name'
          : 'text';
    patchElement(selectedElement.id, {
      content: {
        [target]: `${content[target] || ''}${content[target] ? ' ' : ''}${variable}`
      }
    });
  }

  const filteredVariableGroups = builderVariableGroups
    .map(([group, variables]) => [
      group,
      variables.filter((variable) => `${group} ${variable}`.toLowerCase().includes(variableQuery.toLowerCase()))
    ])
    .filter(([, variables]) => variables.length);

  function renderRailPanel() {
    if (activeRail === 'templates') {
      const savedTemplates = Array.isArray(canvasDesign.savedTemplates) ? canvasDesign.savedTemplates : [];
      return (
        <div className="pdf-builder-panel-body">
          <div className="pdf-template-gallery">
            <article className="pdf-template-gallery-card is-active">
              <div className="pdf-template-gallery-preview">
                <span />
                <span />
                <span />
              </div>
              <div className="min-w-0">
                <p>{template.name}</p>
                <small>Current template layout</small>
              </div>
              <button type="button" className="btn btn-secondary justify-center" disabled={disabled} onClick={duplicateCurrentTemplate}>
                <Copy className="h-4 w-4" />
                Duplicate
              </button>
              <button type="button" className="btn btn-primary justify-center" disabled={disabled} onClick={applyDefaultTemplateLayout}>
                <LayoutGrid className="h-4 w-4" />
                Start from Current Template
              </button>
            </article>
            <article className="pdf-template-gallery-card">
              <div className="pdf-template-gallery-preview is-system">
                <span />
                <span />
                <span />
              </div>
              <div className="min-w-0">
                <p>Default {template.name}</p>
                <small>Restore fixed document sections</small>
              </div>
              <button type="button" className="btn btn-secondary justify-center" disabled={disabled} onClick={applyDefaultTemplateLayout}>
                <RotateCcw className="h-4 w-4" />
                Restore Default Layout
              </button>
            </article>
            <article className="pdf-template-gallery-card">
              <div className="pdf-template-gallery-preview is-blank" />
              <div className="min-w-0">
                <p>Blank A4 Template</p>
                <small>Start with a white PDF page</small>
              </div>
              <button type="button" className="btn btn-primary justify-center" disabled={disabled} onClick={startBlankDesign}>
                <FilePlus2 className="h-4 w-4" />
                Start from Blank Template
              </button>
            </article>
            {savedTemplates.map((savedTemplate) => (
              <article key={savedTemplate.id} className="pdf-template-gallery-card">
                <div className="pdf-template-gallery-preview">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="min-w-0">
                  <p>{savedTemplate.name || 'Saved Template'}</p>
                  <small>{savedTemplate.createdAt ? formatDate(savedTemplate.createdAt) : 'Local saved design'}</small>
                </div>
                <div className="pdf-template-card-actions">
                  <button type="button" className="icon-button" disabled={disabled} onClick={() => applySavedTemplate(savedTemplate)} title="Apply saved template">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" className="icon-button pdf-danger-icon" disabled={disabled} onClick={() => deleteSavedTemplate(savedTemplate.id)} title="Delete saved template">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      );
    }

    if (activeRail === 'layers') {
      return (
        <div className="pdf-builder-panel-body">
          <div className="pdf-layer-list">
            {layers.map((layer) => (
              <BuilderLayerRow
                key={layer.id}
                layer={layer}
                selected={selectedLayerId === layer.id}
                disabled={disabled}
                onSelect={() => {
                  setSelectedLayerId(layer.id);
                  if (layer.pageId) setCurrentPageId(layer.pageId);
                }}
                onToggleVisibility={() => toggleLayerVisibility(layer)}
                onMoveUp={() => moveElementLayer(layer.id, -1)}
                onMoveDown={() => moveElementLayer(layer.id, 1)}
                onDuplicate={() => (layer.kind === 'element' ? duplicateElement(layer.element) : duplicateSection(layer.sectionDesign))}
                onDelete={() => (layer.kind === 'element' ? deleteElement(layer.id) : deleteSection(layer.id))}
              />
            ))}
          </div>
        </div>
      );
    }

    if (activeRail === 'pages') {
      return (
        <div className="pdf-builder-panel-body">
          <div className="pdf-page-list">
            {pages.map((page, index) => {
              const pageElements = elements.filter((element) => (element.pageId || 'page-1') === page.id);
              const pageSections = canvasSections.filter((section) => (section.pageId || 'page-1') === page.id);
              return (
                <div key={page.id} className={`pdf-page-row ${currentPageId === page.id ? 'is-active' : ''}`}>
                  <button type="button" className="pdf-page-main" onClick={() => setCurrentPageId(page.id)}>
                  <span className="pdf-page-thumb">{index + 1}</span>
                  <span className="min-w-0">
                    <span className="pdf-page-name">{page.name || `Page ${index + 1}`}</span>
                    <span className="pdf-page-meta">{pageSections.length} sections / {pageElements.length} elements - A4 Portrait</span>
                  </span>
                  </button>
                  <div className="pdf-page-actions">
                    <button type="button" className="icon-button" disabled={disabled || index === 0} onClick={() => movePage(page.id, -1)} title="Move page up"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" className="icon-button" disabled={disabled || index === pages.length - 1} onClick={() => movePage(page.id, 1)} title="Move page down"><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button type="button" className="icon-button" disabled={disabled} onClick={() => duplicatePage(page)} title="Duplicate page"><Copy className="h-3.5 w-3.5" /></button>
                    <button type="button" className="icon-button pdf-danger-icon" disabled={disabled || page.id === 'page-1' || pages.length <= 1} onClick={() => deletePage(page.id)} title="Delete page"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" className="btn btn-secondary w-full justify-center" disabled={disabled} onClick={addPage}>
            <Plus className="h-4 w-4" />
            Add Page
          </button>
          <div className="pdf-builder-note">
            <p className="font-black text-slate-100">Page Break Settings</p>
            <p className="mt-1 text-xs muted">Use the locked Page Break Settings layer to keep final sections away from the footer. Page 2 appears when you add one or place elements there.</p>
          </div>
        </div>
      );
    }

    if (activeRail === 'variables') {
      return (
        <div className="pdf-builder-panel-body">
          <label className="pdf-builder-search">
            <Search className="h-4 w-4" />
            <input value={variableQuery} placeholder="Search variables" onChange={(event) => setVariableQuery(event.target.value)} />
          </label>
          <div className="pdf-variable-groups">
            {filteredVariableGroups.map(([group, variables]) => (
              <section key={group} className="pdf-variable-group">
                <h4>{group}</h4>
                <div className="grid gap-2">
                  {variables.map((variable) => (
                    <button key={variable} type="button" className="pdf-variable-row" onClick={() => insertVariable(variable)}>
                      <code>{variable}</code>
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      );
    }

    if (activeRail === 'history') {
      return (
        <div className="pdf-builder-panel-body">
          <div className="grid gap-2">
            {versions.length ? versions.slice(0, 8).map((version) => (
              <div key={version.id || version.version} className="pdf-builder-history-row">
                <div className="min-w-0">
                  <p>v{version.version}</p>
                  <span>{version.editedAt ? formatDate(version.editedAt) : 'No date'} - {version.editedBy?.name || version.editedBy?.username || 'System'}</span>
                </div>
                <button type="button" className="btn btn-secondary py-1.5 text-xs" disabled={restoring} onClick={() => onRestore(version)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </button>
              </div>
            )) : <p className="pdf-builder-empty">Saved versions will appear after the first edit.</p>}
          </div>
        </div>
      );
    }

    if (activeRail === 'text') {
      return (
        <div className="pdf-builder-panel-body">
          <div className="pdf-elements-grid">
            {builderTextPresets.map((preset) => (
              <button key={preset.id} type="button" className="pdf-element-button" disabled={disabled} onClick={() => addTextPreset(preset)}>
                <Type className="h-4 w-4" />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
          <div className="pdf-builder-note">
            <p className="font-black text-slate-100">Text presets</p>
            <p className="mt-1 text-xs muted">Add headings, labels, and body text, then insert variables from the Variables tab.</p>
          </div>
        </div>
      );
    }

    if (activeRail === 'uploads') {
      return (
        <div className="pdf-builder-panel-body">
          <div className="pdf-elements-grid">
            <button type="button" className="pdf-element-button" disabled={disabled} onClick={() => addElement('image')}>
              <ImageIcon className="h-4 w-4" />
              <span>Logo</span>
            </button>
            <button type="button" className="pdf-element-button" disabled={disabled} onClick={() => addElement('image')}>
              <FilePlus2 className="h-4 w-4" />
              <span>Image Placeholder</span>
            </button>
          </div>
          <div className="pdf-builder-note">
            <p className="font-black text-slate-100">Uploads / Logo</p>
            <p className="mt-1 text-xs muted">Logo elements render the company logo in saved PDFs when one is configured; otherwise they stay as placeholders.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="pdf-builder-panel-body">
        <div className="pdf-elements-grid">
          {builderElementTypes.map((tool) => {
            const Icon = tool.icon;
            return (
              <button key={tool.type} type="button" className="pdf-element-button" disabled={disabled} onClick={() => addElement(tool.type)}>
                <Icon className="h-4 w-4" />
                <span>{tool.label.replace(/^Add\s+/i, '')}</span>
              </button>
            );
          })}
        </div>
        <div className="pdf-builder-note">
          <p className="font-black text-slate-100">Current page</p>
          <p className="mt-1 text-xs muted">New elements are added to {currentPage.name || 'Page 1'} and saved in the design JSON.</p>
        </div>
      </div>
    );
  }

  function renderInspectorTabContent(tabId = activeInspectorTab) {
    if (!selectedLayer) {
      return (
        <div className="pdf-builder-helper pdf-builder-helper-compact">
          <MousePointerFallback />
          <p>Select a section or element to edit.</p>
        </div>
      );
    }

    if (tabId === 'content') {
      if (selectedElement) {
        return <ElementContentControls element={selectedElement} disabled={disabled || selectedElement.locked} onPatch={(patch) => patchElement(selectedElement.id, patch)} onOpenVariables={() => setActiveRail('variables')} />;
      }
      return (
        <div className="pdf-inspector-grid">
          <BuilderTextInput label="Section name" value={selectedSection.name || selectedSection.title} disabled={disabled} onChange={(value) => patchSection(selectedSection.id, { name: value, title: value, content: { title: value } })} />
          <BuilderTextInput label="Preview title" value={selectedSection.content?.title || selectedSection.title} disabled={disabled} onChange={(value) => patchSection(selectedSection.id, { content: { title: value } })} />
          <BuilderTextarea label="Preview body" value={selectedSection.content?.body || ''} disabled={disabled} rows={3} onChange={(value) => patchSection(selectedSection.id, { content: { body: value } })} />
          <button type="button" className="btn btn-secondary justify-center pdf-field-full" onClick={() => setActiveRail('variables')}>
            <ShieldCheck className="h-4 w-4" />
            Variable insert helper
          </button>
        </div>
      );
    }

    if (tabId === 'layout') {
      if (selectedElement) {
        return (
          <ElementLayoutControls
            element={selectedElement}
            pages={pages}
            disabled={disabled || selectedElement.locked}
            onPatch={(patch) => patchElement(selectedElement.id, patch)}
          />
        );
      }
      return freeLayoutMode ? (
        <ElementLayoutControls
          element={selectedSection}
          pages={pages}
          disabled={disabled || selectedSection.locked}
          onPatch={(patch) => patchSection(selectedSection.id, patch)}
        />
      ) : (
        <LockedLayoutSummary frame={{ x: Math.round(selectedSection.x), y: Math.round(selectedSection.y), width: Math.round(selectedSection.width), height: Math.round(selectedSection.height) }} />
      );
    }

    if (tabId === 'style') {
      return selectedElement
        ? <ElementStyleControls element={selectedElement} disabled={disabled || selectedElement.locked} onPatch={(patch) => patchElement(selectedElement.id, patch)} />
        : <ElementStyleControls element={selectedSection} disabled={disabled} onPatch={(patch) => patchSection(selectedSection.id, patch)} />;
    }

    if (tabId === 'visibility') {
      return (
        <div className="pdf-inspector-grid">
          <BuilderToggle label="Visible" checked={selectedLayer.visible !== false} disabled={disabled || (!selectedLayer.supportsVisibility && selectedLayer.kind === 'section')} onChange={() => toggleLayerVisibility(selectedLayer)} />
          <BuilderToggle label="Show title" checked={selectedLayer.kind === 'section' ? selectedSection?.showTitle !== false : selectedElement?.showTitle !== false} disabled={disabled} onChange={(checked) => updateLayerOption(selectedLayer, 'showTitle', checked)} />
          <BuilderToggle label="Show icon" checked={selectedLayer.kind === 'section' ? selectedSection?.showIcon !== false : selectedElement?.showIcon !== false} disabled={disabled || selectedLayer.kind === 'element'} onChange={(checked) => updateLayerOption(selectedLayer, 'showIcon', checked)} />
        </div>
      );
    }

    return (
      <div className="pdf-inspector-grid">
        {selectedElement ? (
          <>
            <BuilderNumberInput label="Layer z-index" value={selectedElement.zIndex} min={1} max={999} disabled={disabled} onChange={(value) => patchElement(selectedElement.id, { zIndex: value })} />
            <BuilderToggle label="Lock element" checked={selectedElement.locked === true} disabled={disabled} onChange={(checked) => patchElement(selectedElement.id, { locked: checked })} />
            <BuilderToggle label="Print safe" checked={selectedElement.printSafe !== false} disabled={disabled || selectedElement.locked} onChange={(checked) => patchElement(selectedElement.id, { printSafe: checked })} />
            <BuilderToggle label="Page break before" checked={selectedElement.pageBreakBefore === true} disabled={disabled || selectedElement.locked} onChange={(checked) => patchElement(selectedElement.id, { pageBreakBefore: checked })} />
            <BuilderToggle label="Avoid split across pages" checked={selectedElement.avoidSplit !== false} disabled={disabled || selectedElement.locked} onChange={(checked) => patchElement(selectedElement.id, { avoidSplit: checked })} />
          </>
        ) : (
          <>
            <BuilderNumberInput label="Layer z-index" value={selectedSection.zIndex} min={1} max={999} disabled={disabled || !freeLayoutMode} onChange={(value) => patchSection(selectedSection.id, { zIndex: value })} />
            <BuilderToggle label="Lock section" checked={selectedSection.locked === true} disabled={disabled || !freeLayoutMode} onChange={(checked) => patchSection(selectedSection.id, { locked: checked })} />
            <BuilderToggle label="Print safe" checked={selectedSection.printSafe !== false} disabled={disabled} onChange={(checked) => patchSection(selectedSection.id, { printSafe: checked })} />
            <BuilderToggle label="Page break before" checked={selectedSection.pageBreakBefore === true} disabled={disabled} onChange={(checked) => patchSection(selectedSection.id, { pageBreakBefore: checked })} />
            <BuilderToggle label="Avoid split across pages" checked={selectedSection.avoidSplit !== false} disabled={disabled} onChange={(checked) => patchSection(selectedSection.id, { avoidSplit: checked })} />
          </>
        )}
      </div>
    );
  }

  function renderInspectorPanel({ placement = 'bottom' } = {}) {
    const compact = placement === 'bottom';
    return (
      <div className={`pdf-inspector-panel ${compact ? 'is-bottom' : 'is-right'} ${inspectorCollapsed && compact ? 'is-collapsed' : ''} ${!selectedLayer ? 'is-empty' : ''}`}>
        <div className="pdf-inspector-drawer-bar">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Properties</p>
            <h3>{selectedLayer ? selectedLayer.title : 'Select a section or element to edit.'}</h3>
          </div>
          <div className="pdf-inspector-drawer-actions">
            {selectedLayer ? (
              <>
                <span className="pdf-state-badge is-fixed">{selectedLayer.badge}</span>
                <span className={`pdf-state-badge ${selectedLayer.locked ? 'is-off' : 'is-on'}`}>{selectedLayer.locked ? 'Locked' : 'Editable'}</span>
              </>
            ) : null}
            {selectedElement ? (
              <>
                <button type="button" className="icon-button" disabled={disabled} onClick={() => duplicateElement(selectedElement)} title="Duplicate">
                  <Copy className="h-4 w-4" />
                </button>
                <button type="button" className="icon-button pdf-danger-icon" disabled={disabled} onClick={() => deleteElement(selectedElement.id)} title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            ) : null}
            {selectedSection ? (
              <>
                <button type="button" className="icon-button" disabled={disabled} onClick={() => duplicateSection(selectedSection)} title="Duplicate section">
                  <Copy className="h-4 w-4" />
                </button>
                {selectedSection.system === false ? (
                  <button type="button" className="icon-button pdf-danger-icon" disabled={disabled} onClick={() => deleteSection(selectedSection.id)} title="Delete section">
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </>
            ) : null}
            {compact ? (
              <button type="button" className="icon-button" onClick={() => setInspectorCollapsed((value) => !value)} title={inspectorCollapsed ? 'Open properties' : 'Collapse properties'}>
                {inspectorCollapsed ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </button>
            ) : (
              <button type="button" className="icon-button" onClick={() => setRightInspectorOpen(false)} title="Close right inspector">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {!inspectorCollapsed || !compact ? (
          selectedLayer ? (
            <>
            {selectedSection ? (
              <p className="pdf-locked-message pdf-inspector-inline-message">{freeLayoutMode ? 'Free Layout Mode is on. Drag and resize this section on the canvas.' : 'Safe Mode is on. Default sections stay locked; turn on Free Layout Mode to move or resize them.'}</p>
            ) : null}
            <div className="pdf-inspector-tabs" role="tablist" aria-label="PDF design properties">
              {builderInspectorTabs.map(([tabId, label]) => (
                <button
                  key={tabId}
                  type="button"
                  role="tab"
                  aria-selected={activeInspectorTab === tabId}
                  className={`pdf-inspector-tab ${activeInspectorTab === tabId ? 'is-active' : ''}`}
                  onClick={() => setActiveInspectorTab(tabId)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="pdf-inspector-tab-body">
              {renderInspectorTabContent()}
            </div>
            </>
          ) : (
            <div className="pdf-inspector-tab-body">
              {renderInspectorTabContent('content')}
            </div>
          )
        ) : null}
      </div>
    );
  }

  return (
    <div className={`pdf-builder-workspace ${fullScreenEditor ? 'is-fullscreen' : ''} ${rightInspectorOpen ? 'has-right-inspector' : ''} ${inspectorCollapsed ? 'is-inspector-collapsed' : ''}`}>
      <section className="pdf-builder-toolbar">
        <div className="pdf-builder-toolbar-title">
          <span className="pdf-builder-warning">ADVANCED MODE - CHANGES APPLY ONLY AFTER SAVE</span>
          <span className="pdf-builder-mode">VISUAL PDF BUILDER</span>
          {hasUnsavedDesignChanges ? <span className="pdf-builder-unsaved">Unsaved changes</span> : <span className="pdf-builder-saved">Saved template view</span>}
        </div>
        <div className="pdf-builder-toolbar-actions">
          <button type="button" className={`btn admin-compact-button ${fullScreenEditor ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFullScreenEditor((value) => !value)}>
            <Maximize2 className="h-4 w-4" />
            {fullScreenEditor ? 'Exit Full Screen' : 'Full Screen Editor'}
          </button>
          <button type="button" className={`btn admin-compact-button ${rightInspectorOpen ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRightInspectorOpen((value) => !value)}>
            <Settings2 className="h-4 w-4" />
            Inspector Right Panel
          </button>
          <button type="button" className="btn btn-secondary admin-compact-button" disabled={saving} onClick={onBack}>
            <LayoutGrid className="h-4 w-4" />
            Back to Structured Mode
          </button>
          <button type="button" className="icon-button" disabled={!undoStack.length || disabled} onClick={undoDesign} title="Undo">
            <Undo2 className="h-4 w-4" />
          </button>
          <button type="button" className="icon-button" disabled={!redoStack.length || disabled} onClick={redoDesign} title="Redo">
            <Redo2 className="h-4 w-4" />
          </button>
          <button type="button" className="btn btn-secondary admin-compact-button" onClick={() => setActiveRail('variables')}>
            <ShieldCheck className="h-4 w-4" />
            Variables
          </button>
          <button type="button" className="btn btn-secondary admin-compact-button" disabled={saving || Boolean(busyKey)} onClick={() => onPreview(template, previewConfig)}>
            {busyKey === `preview-${template.key}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            Preview PDF
          </button>
          <button type="button" className="btn btn-secondary admin-compact-button" disabled={saving || Boolean(busyKey)} onClick={() => onDownload(template, previewConfig)}>
            {busyKey === `download-${template.key}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download Sample PDF
          </button>
          <button type="submit" className="btn btn-primary admin-compact-button pdf-builder-save-button" disabled={!canEdit || saving || Boolean(busyKey)}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </section>

      <div className="pdf-builder-shell">
        <aside className="pdf-builder-rail" aria-label="Design builder tools">
          {builderRailItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`pdf-rail-button ${activeRail === item.id ? 'is-active' : ''}`}
                onClick={() => setActiveRail(item.id)}
                title={item.label}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        <aside className="pdf-builder-panel">
          <div className="pdf-builder-panel-header">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">{builderRailItems.find((item) => item.id === activeRail)?.label}</p>
              <h3>{activeRail === 'templates' ? 'Template Gallery' : activeRail === 'elements' ? 'Elements' : activeRail === 'text' ? 'Text' : activeRail === 'uploads' ? 'Uploads / Logo' : activeRail === 'layers' ? 'Layers' : activeRail === 'pages' ? 'Pages' : activeRail === 'variables' ? 'Variables' : 'Saved Versions'}</h3>
            </div>
            <SlidersHorizontal className="h-4 w-4 text-sky-100/70" />
          </div>
          {renderRailPanel()}
        </aside>

        <div className="pdf-builder-stage">
          <main className="pdf-builder-canvas">
          <div className="pdf-builder-canvas-header">
            <div>
              <h3>A4 Canvas</h3>
              <p>{currentPage.name || 'Page 1'} - White PDF page - sections and elements snap to {gridSize}px grid</p>
            </div>
            <div className="pdf-canvas-controls">
              <span className={`pdf-canvas-mode-pill ${freeLayoutMode ? 'is-free' : 'is-safe'}`}>
                {freeLayoutMode ? 'Free Layout Mode' : 'Safe Mode'}
              </span>
              {['fit', 'fit-width', '75', '100', '125'].map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`pdf-canvas-pill ${zoom === option ? 'is-active' : ''}`}
                  onClick={() => {
                    setZoom(option);
                    updateCanvasOption('canvas.zoom', option);
                  }}
                >
                  {option === 'fit' ? 'Fit' : option === 'fit-width' ? 'Fit Width' : `${option}%`}
                </button>
              ))}
              <button type="button" className={`pdf-canvas-pill ${gridEnabled ? 'is-active' : ''}`} onClick={() => updateCanvasOption('gridEnabled', !gridEnabled)}>
                <Grid2X2 className="h-3.5 w-3.5" />
                Grid
              </button>
              <button type="button" className={`pdf-canvas-pill ${snapEnabled ? 'is-active' : ''}`} onClick={() => updateCanvasOption('canvas.snap', !snapEnabled)}>
                <Move className="h-3.5 w-3.5" />
                Snap
              </button>
              <button type="button" className={`pdf-canvas-pill ${freeLayoutMode ? 'is-active' : ''}`} disabled={disabled} onClick={toggleFreeLayoutMode}>
                {freeLayoutMode ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                Free Layout Mode
              </button>
            </div>
          </div>
          <div className="pdf-canvas-scroll">
            <div className="pdf-paper-stage" style={{ width: builderCanvas.width * zoomScale, height: builderCanvas.height * zoomScale }}>
              <div
                ref={paperRef}
                className={`pdf-a4-page ${gridEnabled ? 'has-grid' : ''} ${referencePdfUrl ? 'has-reference-layer' : ''}`}
                style={{
                  width: builderCanvas.width,
                  height: builderCanvas.height,
                  transform: `scale(${zoomScale})`
                }}
                onPointerDown={() => setSelectedLayerId('')}
              >
                {referencePdfUrl ? (
                  <>
                    <iframe
                      title={`${template.name} rendered PDF reference page ${currentPageIndex + 1}`}
                      src={referencePdfUrl}
                      className="pdf-canvas-reference"
                    />
                    <div className="pdf-canvas-reference-shield" aria-hidden="true" />
                  </>
                ) : (
                  <div className="pdf-canvas-reference-empty">
                    <FileText className="h-5 w-5" />
                    <span>{previewLoading ? 'Loading rendered PDF reference...' : previewError || 'Rendered PDF reference is not available yet.'}</span>
                  </div>
                )}
                {visiblePageSections.map((section) => {
                  const layer = sectionLayers.find((item) => item.id === section.id);
                  return (
                    <BuilderCanvasSection
                      key={section.id}
                      section={section}
                      layer={layer}
                      selected={selectedLayerId === section.id}
                      disabled={disabled}
                      freeLayoutMode={freeLayoutMode}
                      onSelect={() => setSelectedLayerId(section.id)}
                      onDragStart={(event) => beginSectionInteraction(event, section, 'move')}
                      onResizeStart={(event, handle) => beginSectionInteraction(event, section, 'resize', handle)}
                    />
                  );
                })}
                {visiblePageElements.map((element) => (
                  <BuilderCanvasElement
                    key={element.id}
                    element={element}
                    selected={selectedLayerId === element.id}
                    disabled={disabled}
                    onSelect={() => setSelectedLayerId(element.id)}
                    onDragStart={(event) => beginElementInteraction(event, element, 'move')}
                    onResizeStart={(event, handle) => beginElementInteraction(event, element, 'resize', handle)}
                  />
                ))}
                <div className="pdf-page-break-guide">Page break safe zone</div>
                {visiblePageSections.length === 0 && visiblePageElements.length === 0 ? (
                  <div className="pdf-canvas-empty">
                    <p>Choose a template or add an element from the left panel.</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          </main>

        </div>

        {rightInspectorOpen ? (
          <aside className="pdf-builder-inspector pdf-builder-inspector-optional">
            {renderInspectorPanel({ placement: 'right' })}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function MousePointerFallback() {
  return <Move className="h-5 w-5" />;
}

function styleForBuilderSection(section = {}, selected = false) {
  const style = section.style || defaultElementStyles;
  const borderWidth = clampBuilderNumber(style.borderWidth, 1, 0, 8);
  return {
    left: section.x,
    top: section.y,
    width: section.width,
    height: section.height,
    zIndex: section.zIndex || 1,
    color: style.textColor || '#0f172a',
    background: style.backgroundColor || '#ffffff',
    borderColor: selected ? '#0284c7' : style.borderColor || '#d8e5f7',
    borderRadius: clampBuilderNumber(style.borderRadius, 8, 0, 32),
    borderWidth,
    boxShadow: style.shadow ? '0 14px 28px rgba(15, 23, 42, 0.14)' : 'none',
    textAlign: style.alignment || section.alignment || 'left',
    fontSize: clampBuilderNumber(style.fontSize, 12, 8, 26),
    fontWeight: style.fontWeight || 700
  };
}

function BuilderCanvasSection({ section, layer, selected, disabled, freeLayoutMode, onSelect, onDragStart, onResizeStart }) {
  const Icon = layer?.section?.icon || FileText;
  const style = styleForBuilderSection(section, selected);
  const locked = disabled || section.locked || !freeLayoutMode;
  const content = section.content || {};
  const rows = Array.isArray(content.rows) ? content.rows : [];
  const columns = Array.isArray(content.columns) ? content.columns : [];
  const overflowRisk = sectionOverflowRisk(section, content, rows, columns);
  return (
    <div
      className={`pdf-builder-section is-${content.kind || section.role || 'details'} ${selected ? 'is-selected' : ''} ${locked ? 'is-locked' : ''}`}
      style={style}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect();
        if (!locked) onDragStart(event);
      }}
      role="button"
      tabIndex={0}
    >
      <div className="pdf-section-topline">
        {section.showTitle !== false ? (
          <span className="pdf-section-title"><Icon className="h-3.5 w-3.5" />{content.title || section.title || section.name}</span>
        ) : <span />}
        <span className="pdf-section-lock">{locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}{locked ? 'Locked' : 'Free'}</span>
      </div>
      {content.kind === 'header' ? (
        <div className="pdf-section-header-preview">
          <div className="pdf-section-logo-mark">US</div>
          <div>
            <strong>{content.title || section.title}</strong>
            <span>{content.body || 'Company details'}</span>
          </div>
        </div>
      ) : content.kind === 'table' ? (
        <div className="pdf-section-table-preview">
          <div className="pdf-section-table-head">
            {columns.slice(0, 4).map((column) => <span key={column}>{column}</span>)}
          </div>
          {rows.slice(0, 3).map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="pdf-section-table-row">
              {row.slice(0, 4).map((cell, cellIndex) => <span key={`${cell}-${cellIndex}`}>{cell}</span>)}
            </div>
          ))}
        </div>
      ) : content.kind === 'amount' ? (
        <div className="pdf-section-amount-preview">
          {rows.map(([label, value]) => (
            <span key={label}><em>{label}</em><strong>{value}</strong></span>
          ))}
        </div>
      ) : rows.length ? (
        <div className="pdf-section-details-preview">
          {rows.slice(0, 5).map(([label, value]) => (
            <span key={label}><em>{label}</em><strong>{value}</strong></span>
          ))}
        </div>
      ) : (
        <div className="pdf-section-body-preview">{content.body || 'Section content preview'}</div>
      )}
      {overflowRisk ? <span className="pdf-section-overflow-warning">Content may overflow</span> : null}
      {selected && !locked ? ['nw', 'ne', 'sw', 'se'].map((handle) => (
        <button
          key={handle}
          type="button"
          className={`pdf-resize-handle is-${handle}`}
          onPointerDown={(event) => onResizeStart(event, handle)}
          aria-label={`Resize ${handle}`}
        />
      )) : null}
    </div>
  );
}

function BuilderCanvasElement({ element, selected, disabled, onSelect, onDragStart, onResizeStart }) {
  const Icon = elementIconForType(element.type);
  const style = styleForBuilderElement(element, selected);
  const content = element.content || {};
  const locked = element.locked || disabled;
  return (
    <div
      className={`pdf-builder-element is-${element.type} ${selected ? 'is-selected' : ''} ${locked ? 'is-locked' : ''}`}
      style={style}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect();
        if (!locked) onDragStart(event);
      }}
      role="button"
      tabIndex={0}
    >
      <div className="pdf-element-grip"><GripVertical className="h-3.5 w-3.5" /></div>
      {element.type === 'qr' ? (
        <div className="pdf-canvas-qr">
          <div className="pdf-qr-placeholder">QR</div>
          <span>{content.label || 'QR CODE'}</span>
          <small>{content.qrType || element.qrType || 'payment'}</small>
        </div>
      ) : element.type === 'signature' ? (
        <div className="pdf-canvas-signature">
          <p>{content.label || 'Authorized Signature'}</p>
          <span />
          <small>{[content.name, content.designation].filter(Boolean).join(' · ') || 'Name / designation'}</small>
        </div>
      ) : element.type === 'divider' ? (
        <div className="pdf-canvas-divider" style={{ borderTopWidth: element.style?.dividerThickness || 2, borderTopStyle: element.style?.dividerStyle || 'solid', borderColor: element.style?.accentColor || '#0284c7' }}>
          {content.label ? <span>{content.label}</span> : null}
        </div>
      ) : element.type === 'spacer' ? (
        <div className="pdf-canvas-spacer">{content.label || 'Spacer'}</div>
      ) : element.type === 'image' ? (
        <div className="pdf-canvas-image"><ImageIcon className="h-5 w-5" /><span>{content.label || 'Image / Logo'}</span></div>
      ) : element.type === 'card' ? (
        <div className={`pdf-canvas-card ${element.twoColumn ? 'is-two-column' : ''}`}>
          <p><Icon className="h-3.5 w-3.5" />{content.title || element.name}</p>
          <span>{content.body || 'Add details here'}</span>
        </div>
      ) : (
        <div className="pdf-canvas-text">{elementPrimaryText(element) || 'New text block'}</div>
      )}
      {element.locked ? <span className="pdf-element-lock"><Lock className="h-3 w-3" /></span> : null}
      {selected && !locked ? ['nw', 'ne', 'sw', 'se'].map((handle) => (
        <button
          key={handle}
          type="button"
          className={`pdf-resize-handle is-${handle}`}
          onPointerDown={(event) => onResizeStart(event, handle)}
          aria-label={`Resize ${handle}`}
        />
      )) : null}
    </div>
  );
}

function BuilderLayerRow({ layer, selected, disabled, onSelect, onToggleVisibility, onMoveUp, onMoveDown, onDuplicate, onDelete }) {
  const Icon = layer.kind === 'section' ? (layer.section?.icon || FileText) : elementIconForType(layer.type);
  const elementLayer = layer.kind === 'element';
  const canDelete = elementLayer || layer.sectionDesign?.system === false;
  return (
    <div className={`pdf-layer-row ${selected ? 'is-active' : ''}`}>
      <button type="button" className="pdf-layer-main" onClick={onSelect}>
        <GripVertical className="h-3.5 w-3.5 text-slate-400" />
        <Icon className="h-4 w-4 text-sky-100" />
        <span className="pdf-layer-text">
          <span className="pdf-layer-name">{layer.title}</span>
          <span className="pdf-layer-badges">
            <span className={`pdf-layer-badge ${layer.locked ? 'is-locked' : 'is-free'}`}>{layer.locked ? 'Locked' : 'Free'}</span>
            <span className="pdf-layer-badge">{layer.kind === 'section' ? 'Section' : layer.badge}</span>
          </span>
        </span>
      </button>
      <div className="pdf-layer-actions">
        <button type="button" className="icon-button" disabled={disabled || !layer.supportsVisibility} onClick={onToggleVisibility} title={layer.visible ? 'Hide' : 'Show'}>
          {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button type="button" className="icon-button" disabled title={layer.locked ? 'Locked' : 'Unlocked'}>
          {layer.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
        </button>
        {elementLayer ? (
          <>
            <button type="button" className="icon-button" disabled={disabled} onClick={onMoveUp} title="Move up">
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="icon-button" disabled={disabled} onClick={onMoveDown} title="Move down">
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </>
        ) : null}
        <button type="button" className="icon-button" disabled={disabled} onClick={onDuplicate} title={elementLayer ? 'Duplicate' : 'Duplicate as custom section'}>
          <Copy className="h-3.5 w-3.5" />
        </button>
        {canDelete ? (
          <button type="button" className="icon-button pdf-danger-icon" disabled={disabled} onClick={onDelete} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function InspectorAccordion({ title, children, open = false }) {
  return (
    <details className="pdf-inspector-accordion" open={open}>
      <summary>{title}</summary>
      <div className="pdf-inspector-accordion-body">{children}</div>
    </details>
  );
}

function BuilderToggle({ label, checked, disabled, onChange }) {
  return (
    <label className={`pdf-toggle-row ${disabled ? 'is-disabled' : ''}`}>
      <span className="pdf-toggle-label">{label}</span>
      <span className={`pdf-state-badge ${checked ? 'is-on' : 'is-off'}`}>{checked ? 'ON' : 'OFF'}</span>
      <span className="pdf-toggle-switch-wrap">
        <input className="sr-only" type="checkbox" checked={Boolean(checked)} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
        <span className={`pdf-toggle-switch ${checked ? 'is-on' : ''}`}><span /></span>
      </span>
    </label>
  );
}

function BuilderTextInput({ label, value, disabled, onChange }) {
  return (
    <label className="pdf-control-field pdf-field-full">
      <span className="label">{label}</span>
      <input className="input" value={value || ''} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function BuilderTextarea({ label, value, disabled, rows = 4, onChange }) {
  return (
    <label className="pdf-control-field pdf-field-full">
      <span className="label">{label}</span>
      <textarea className="input min-h-24" rows={rows} value={value || ''} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function BuilderNumberInput({ label, value, min = 0, max = 999, disabled, onChange }) {
  return (
    <label className="pdf-control-field">
      <span className="label">{label}</span>
      <input className="input" type="number" min={min} max={max} value={value ?? ''} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function BuilderSelect({ label, value, options, disabled, onChange }) {
  return (
    <label className="pdf-control-field">
      <span className="label">{label}</span>
      <select className="input" value={value || ''} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function ElementContentControls({ element, disabled, onPatch, onOpenVariables }) {
  const content = element.content || {};
  return (
    <div className="pdf-inspector-grid">
      <BuilderTextInput label="Element name" value={element.name} disabled={disabled} onChange={(value) => onPatch({ name: value, title: value })} />
      {element.type === 'card' ? (
        <>
          <BuilderTextInput label="Title" value={content.title} disabled={disabled} onChange={(value) => onPatch({ content: { title: value } })} />
          <BuilderTextarea label="Body/content text" value={content.body} disabled={disabled} onChange={(value) => onPatch({ content: { body: value } })} />
        </>
      ) : element.type === 'qr' ? (
        <>
          <BuilderTextInput label="QR label" value={content.label} disabled={disabled} onChange={(value) => onPatch({ content: { label: value } })} />
          <BuilderSelect label="QR type" value={content.qrType || element.qrType || 'payment'} options={[['payment', 'Payment'], ['contact', 'Contact'], ['company', 'Company'], ['custom', 'Custom']]} disabled={disabled} onChange={(value) => onPatch({ qrType: value, content: { qrType: value } })} />
          <BuilderTextarea label="Helper text" value={content.helperText} disabled={disabled} rows={3} onChange={(value) => onPatch({ content: { helperText: value } })} />
        </>
      ) : element.type === 'signature' ? (
        <>
          <BuilderTextInput label="Label" value={content.label} disabled={disabled} onChange={(value) => onPatch({ content: { label: value } })} />
          <BuilderTextInput label="Name" value={content.name} disabled={disabled} onChange={(value) => onPatch({ content: { name: value } })} />
          <BuilderTextInput label="Designation" value={content.designation} disabled={disabled} onChange={(value) => onPatch({ content: { designation: value } })} />
        </>
      ) : element.type === 'divider' || element.type === 'spacer' || element.type === 'image' ? (
        <BuilderTextInput label="Label" value={content.label} disabled={disabled} onChange={(value) => onPatch({ content: { label: value } })} />
      ) : (
        <BuilderTextarea label="Body/content text" value={content.text || elementPrimaryText(element)} disabled={disabled} onChange={(value) => onPatch({ content: { text: value } })} />
      )}
      <button type="button" className="btn btn-secondary justify-center pdf-field-full" onClick={onOpenVariables}>
        <ShieldCheck className="h-4 w-4" />
        Variable insert helper
      </button>
    </div>
  );
}

function ElementLayoutControls({ element, pages, disabled, onPatch }) {
  const pageOptions = pages.map((page, index) => [page.id, page.name || `Page ${index + 1}`]);
  return (
    <div className="pdf-inspector-grid">
      <BuilderNumberInput label="X position" value={Math.round(element.x)} max={builderCanvas.width} disabled={disabled} onChange={(value) => onPatch({ x: value })} />
      <BuilderNumberInput label="Y position" value={Math.round(element.y)} max={builderCanvas.height} disabled={disabled} onChange={(value) => onPatch({ y: value })} />
      <BuilderSelect label="Width" value={element.widthMode || 'custom'} options={[['full', 'Full width'], ['half', 'Half width'], ['custom', 'Custom']]} disabled={disabled} onChange={(value) => {
        if (value === 'full') onPatch({ widthMode: value, fullWidth: true, x: 32, width: builderCanvas.width - 64 });
        else if (value === 'half') onPatch({ widthMode: value, fullWidth: false, width: Math.round((builderCanvas.width - 80) / 2) });
        else onPatch({ widthMode: value, fullWidth: false });
      }} />
      {element.widthMode === 'custom' || !element.widthMode ? <BuilderNumberInput label="Custom width" value={Math.round(element.width)} min={24} max={builderCanvas.width} disabled={disabled} onChange={(value) => onPatch({ width: value, widthMode: 'custom' })} /> : null}
      <BuilderNumberInput label="Height" value={Math.round(element.height)} min={8} max={builderCanvas.height} disabled={disabled} onChange={(value) => onPatch({ height: value })} />
      <BuilderSelect label="Alignment" value={element.style?.alignment || element.alignment || 'left'} options={[['left', 'Left'], ['center', 'Center'], ['right', 'Right']]} disabled={disabled} onChange={(value) => onPatch({ alignment: value, style: { alignment: value } })} />
      <BuilderToggle label="Full width" checked={element.fullWidth === true} disabled={disabled} onChange={(checked) => onPatch(checked ? { fullWidth: true, widthMode: 'full', x: 32, width: builderCanvas.width - 64 } : { fullWidth: false, widthMode: 'custom' })} />
      <BuilderToggle label="Two-column card" checked={element.twoColumn === true} disabled={disabled || element.type !== 'card'} onChange={(checked) => onPatch({ twoColumn: checked, content: { twoColumn: checked } })} />
      <BuilderSelect label="Page number" value={element.pageId || 'page-1'} options={pageOptions} disabled={disabled} onChange={(value) => onPatch({ pageId: value })} />
    </div>
  );
}

function LockedLayoutSummary({ frame }) {
  return (
    <div className="pdf-inspector-grid">
      <BuilderNumberInput label="X position" value={frame.x} disabled onChange={() => {}} />
      <BuilderNumberInput label="Y position" value={frame.y} disabled onChange={() => {}} />
      <BuilderNumberInput label="Width" value={frame.width} disabled onChange={() => {}} />
      <BuilderNumberInput label="Height" value={frame.height} disabled onChange={() => {}} />
    </div>
  );
}

function ElementStyleControls({ element, disabled, onPatch }) {
  const style = element.style || defaultElementStyles;
  return (
    <div className="pdf-inspector-grid">
      <ColorControl label="Accent color" value={style.accentColor} disabled={disabled} onChange={(value) => onPatch({ style: { accentColor: value } })} />
      <ColorControl label="Background color" value={style.backgroundColor} disabled={disabled || element.type === 'divider'} onChange={(value) => onPatch({ style: { backgroundColor: value } })} />
      <ColorControl label="Text color" value={style.textColor} disabled={disabled || element.type === 'divider'} onChange={(value) => onPatch({ style: { textColor: value } })} />
      <ColorControl label="Border color" value={style.borderColor} disabled={disabled || element.type === 'divider'} onChange={(value) => onPatch({ style: { borderColor: value } })} />
      <BuilderNumberInput label="Border radius" value={style.borderRadius ?? 10} max={32} disabled={disabled || element.type === 'divider'} onChange={(value) => onPatch({ style: { borderRadius: value } })} />
      <BuilderNumberInput label="Border" value={style.borderWidth ?? 1} max={8} disabled={disabled || element.type === 'divider'} onChange={(value) => onPatch({ style: { borderWidth: value } })} />
      <BuilderToggle label="Shadow" checked={style.shadow === true} disabled={disabled || element.type === 'divider'} onChange={(checked) => onPatch({ style: { shadow: checked } })} />
      <BuilderNumberInput label="Font size" value={style.fontSize ?? 13} min={8} max={32} disabled={disabled || element.type === 'divider'} onChange={(value) => onPatch({ style: { fontSize: value } })} />
      <BuilderSelect label="Font weight" value={String(style.fontWeight || 700)} options={[['400', 'Regular'], ['600', 'Semi bold'], ['700', 'Bold'], ['800', 'Extra bold']]} disabled={disabled || element.type === 'divider'} onChange={(value) => onPatch({ style: { fontWeight: Number(value) } })} />
      {element.type === 'divider' ? (
        <>
          <BuilderNumberInput label="Thickness" value={style.dividerThickness ?? 2} min={1} max={8} disabled={disabled} onChange={(value) => onPatch({ style: { dividerThickness: value } })} />
          <BuilderSelect label="Divider style" value={style.dividerStyle || 'solid'} options={[['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted']]} disabled={disabled} onChange={(value) => onPatch({ style: { dividerStyle: value } })} />
        </>
      ) : null}
    </div>
  );
}

function AdvancedLayoutGroup({ title, children }) {
  return (
    <section className="pdf-advanced-group">
      <h4>{title}</h4>
      <div className="pdf-advanced-grid">
        {children}
      </div>
    </section>
  );
}

function AdvancedLayoutPanel({ draft, setDraft, canEdit, saving }) {
  const [activeTab, setActiveTab] = useState('layout');
  const disabled = !canEdit || saving;
  const advancedEnabled = getPath(draft, 'advancedEnabled', false) === true;
  const customWidthEnabled = getPath(draft, 'structured.customCardWidthEnabled', false) === true;
  const customColorsEnabled = getPath(draft, 'structured.customColorsEnabled', false) === true;
  const tabs = [
    ['layout', 'Layout'],
    ['visual', 'Visual'],
    ['extra', 'Extra Cards'],
    ['safety', 'Safety']
  ];

  function update(path, value) {
    setDraft((current) => setPath(current, path, value));
  }

  return (
    <section className="surface admin-control-card pdf-advanced-panel p-4">
      <div className="pdf-advanced-summary-header">
        <div className="flex min-w-0 items-start gap-3">
          <div className="admin-control-icon"><Settings2 className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h3 className="text-lg font-black text-[var(--app-text)]">Advanced Layout</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 muted">Optional tools for section ordering, QR/payment, signature, colors, and custom cards. Existing PDF design changes only after Save.</p>
          </div>
        </div>
        <span className={`pdf-state-badge pdf-advanced-status ${advancedEnabled ? 'is-on' : 'is-off'}`}>
          {advancedEnabled ? 'ADVANCED ON' : 'ADVANCED OFF'}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <FieldRow field={{ type: 'toggle', path: 'advancedEnabled', label: 'Enable Advanced Layout', fallback: false }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
        <p className="rounded-card border border-sky-300/15 bg-sky-500/10 p-3 text-sm font-semibold text-[var(--brand)]">
          {advancedEnabled ? 'Advanced options are enabled. Configure them below, then save the template to apply.' : 'Default templates remain unchanged unless you enable options and save.'}
        </p>
      </div>

      {advancedEnabled ? (
        <>
          <div className="pdf-advanced-tabs" role="tablist" aria-label="Advanced layout sections">
            {tabs.map(([tabId, label]) => (
              <button
                key={tabId}
                type="button"
                role="tab"
                aria-selected={activeTab === tabId}
                className={`pdf-advanced-tab ${activeTab === tabId ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tabId)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="pdf-advanced-inline-body">
            {activeTab === 'layout' ? (
              <AdvancedLayoutGroup title="Layout Controls">
                <FieldRow field={{ type: 'toggle', path: 'structured.allowDragDrop', label: 'Enable section reordering', fallback: false }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                <FieldRow field={{ type: 'toggle', path: 'structured.twoColumnCards', label: 'Allow two-column cards', fallback: false }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                <FieldRow field={{ type: 'toggle', path: 'structured.customCardWidthEnabled', label: 'Enable custom card width', fallback: false }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                <SelectControl label="Default custom card width" value={getPath(draft, 'structured.defaultCardWidth', 'full')} options={cardWidthOptions} disabled={disabled || !customWidthEnabled} onChange={(value) => update('structured.defaultCardWidth', value)} />
              </AdvancedLayoutGroup>
            ) : null}

            {activeTab === 'visual' ? (
              <AdvancedLayoutGroup title="Visual Controls">
                <FieldRow field={{ type: 'toggle', path: 'structured.customColorsEnabled', label: 'Enable custom colors', fallback: false }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                <ColorControl label="Accent color" value={getPath(draft, 'design.colors.accentColor', getPath(draft, 'header.accentColor', '#0f2a52'))} disabled={disabled || !customColorsEnabled} onChange={(value) => update('design.colors.accentColor', value)} />
                <ColorControl label="Card background color" value={getPath(draft, 'design.colors.cardBackground', '#ffffff')} disabled={disabled || !customColorsEnabled} onChange={(value) => update('design.colors.cardBackground', value)} />
                <SelectControl label="Border style" value={getPath(draft, 'structured.borderStyle', 'default')} options={borderStyleOptions} disabled={disabled} onChange={(value) => update('structured.borderStyle', value)} />
              </AdvancedLayoutGroup>
            ) : null}

            {activeTab === 'extra' ? (
              <AdvancedLayoutGroup title="Extra Cards">
                <FieldRow field={{ type: 'toggle', path: 'structured.customSectionsEnabled', label: 'Enable custom sections/cards', fallback: false }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                <FieldRow field={{ type: 'toggle', path: 'structured.qrPaymentCardEnabled', label: 'Enable QR/payment card', fallback: false }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                <FieldRow field={{ type: 'toggle', path: 'structured.signatureCardEnabled', label: 'Enable signature card', fallback: false }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                {getPath(draft, 'structured.qrPaymentCardEnabled', false) === true ? (
                  <>
                    <FieldRow field={{ type: 'text', path: 'structured.qrPaymentCard.title', label: 'Payment title', fallback: 'Payment Details' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                    <FieldRow field={{ type: 'textarea', path: 'structured.qrPaymentCard.note', label: 'Payment note', rows: 3 }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                    <FieldRow field={{ type: 'text', path: 'structured.qrPaymentCard.upiText', label: 'UPI ID / payment text' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                    <FieldRow field={{ type: 'text', path: 'structured.qrPaymentCard.qrValue', label: 'Optional QR image URL or QR text' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                  </>
                ) : null}
                {getPath(draft, 'structured.signatureCardEnabled', false) === true ? (
                  <>
                    <FieldRow field={{ type: 'text', path: 'structured.signatureCard.title', label: 'Signature title', fallback: 'Authorized Signature' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                    <FieldRow field={{ type: 'text', path: 'structured.signatureCard.personName', label: 'Authorized person name' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                    <FieldRow field={{ type: 'text', path: 'structured.signatureCard.designation', label: 'Role / designation' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                    <FieldRow field={{ type: 'text', path: 'structured.signatureCard.imageUrl', label: 'Optional signature image URL' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                  </>
                ) : null}
                <p className="pdf-field-full rounded-card border border-white/10 bg-white/[0.035] p-3 text-sm muted">Custom cards appear in the editor after custom sections/cards are enabled.</p>
              </AdvancedLayoutGroup>
            ) : null}

            {activeTab === 'safety' ? (
              <AdvancedLayoutGroup title="Safety">
                <FieldRow field={{ type: 'toggle', path: 'pageSettings.preferOnePage', label: 'Prefer one-page PDFs' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                <FieldRow field={{ type: 'toggle', path: 'pageSettings.safePagination', label: 'Safe pagination' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                <FieldRow field={{ type: 'toggle', path: 'pageBreaks.repeatTableHeader', label: 'Repeat table header when page breaks' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                <FieldRow field={{ type: 'toggle', path: 'pageBreaks.keepFooterAtBottom', label: 'Keep footer at bottom' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                <FieldRow field={{ type: 'toggle', path: 'pageBreaks.showPageNumbers', label: 'Show page numbers' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
              </AdvancedLayoutGroup>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

function LivePreviewPanel({ template, previewUrl, previewLoading, previewError }) {
  return (
    <section className="surface admin-control-card pdf-live-preview-panel p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-black">Live PDF Preview</h3>
          <p className="mt-1 text-xs muted">Server-rendered draft preview.</p>
        </div>
        {previewLoading ? <Loader2 className="h-4 w-4 animate-spin text-sky-100" /> : null}
      </div>
      <div className="pdf-preview-frame">
        {previewUrl ? (
          <iframe title={`${template.name} preview`} src={previewUrl} className="w-full bg-white" />
        ) : (
          <div className="pdf-preview-empty grid place-items-center p-6 text-center text-sm muted">
            {previewError || 'Preparing PDF preview...'}
          </div>
        )}
      </div>
      {previewError ? <p className="mt-3 rounded-card border border-rose-400/25 bg-rose-500/10 p-3 text-sm font-semibold text-rose-100">{previewError}</p> : null}
      <p className="mt-3 text-xs muted">Unsaved edits are used only for preview until you save the template.</p>
    </section>
  );
}

function SelectedCustomCardEditor({ item, draft, setDraft, canEdit, saving, customColorsEnabled }) {
  const card = item?.card;
  if (!card) return null;
  const type = card.type || 'text';
  const disabled = !canEdit || saving;
  const isDivider = type === 'spacer';
  const isQr = type === 'qr';
  const isSignature = type === 'signature';
  const contentLabel = isQr ? 'UPI ID or payment note' : isSignature ? 'Name / designation text' : 'Body / content';
  const variableLabel = isQr ? 'Optional QR text/value' : isSignature ? 'Signature image URL or fallback text' : 'Optional variable value';

  function updateCard(patch) {
    setDraft((current) => {
      const cards = Array.isArray(getPath(current, 'structured.customSections', [])) ? getPath(current, 'structured.customSections', []) : [];
      return setPath(current, 'structured.customSections', cards.map((currentCard, index) => (index === item.index ? { ...currentCard, ...patch } : currentCard)));
    });
  }

  function changeCardType(value) {
    const defaults = makeCustomCard(value);
    setDraft((current) => {
      let next = current;
      if (value === 'qr') next = setPath(next, 'structured.qrPaymentCardEnabled', true);
      if (value === 'signature') next = setPath(next, 'structured.signatureCardEnabled', true);
      const cards = Array.isArray(getPath(next, 'structured.customSections', [])) ? getPath(next, 'structured.customSections', []) : [];
      return setPath(next, 'structured.customSections', cards.map((currentCard, index) => (index === item.index ? {
        ...currentCard,
        type: value,
        minHeight: defaults.minHeight,
        backgroundColor: currentCard.backgroundColor || defaults.backgroundColor,
        title: currentCard.title || defaults.title
      } : currentCard)));
    });
  }

  return (
    <>
      <div className="pdf-editor-grid mb-4">
        <SelectControl label="Type" value={type} options={customCardTypes} disabled={disabled} onChange={changeCardType} />
        <SelectControl label="Width" value={card.width || getPath(draft, 'structured.defaultCardWidth', 'full')} options={cardWidthOptions} disabled={disabled} onChange={(value) => updateCard({ width: value })} />
        <label className="pdf-control-field">
          <span className="label">{isDivider ? 'Divider label' : isSignature ? 'Signature label' : isQr ? 'Payment title' : 'Title'}</span>
          <input className="input" value={card.title || ''} disabled={disabled} onChange={(event) => updateCard({ title: event.target.value })} />
        </label>
        <label className="pdf-control-field">
          <span className="label">Minimum height</span>
          <input className="input" type="number" min="8" max="260" value={card.minHeight || (isDivider ? 32 : 74)} disabled={disabled} onChange={(event) => updateCard({ minHeight: Number(event.target.value) })} />
        </label>
        <label className={`pdf-toggle-row pdf-field-full ${disabled ? 'is-disabled' : ''}`}>
          <span className="pdf-toggle-label">Show/hide custom card</span>
          <span className={`pdf-state-badge ${card.enabled !== false ? 'is-on' : 'is-off'}`}>{card.enabled !== false ? 'ON' : 'OFF'}</span>
          <span className="pdf-toggle-switch-wrap">
            <input className="sr-only" type="checkbox" checked={card.enabled !== false} disabled={disabled} onChange={(event) => updateCard({ enabled: event.target.checked })} />
            <span className={`pdf-toggle-switch ${card.enabled !== false ? 'is-on' : ''}`}><span /></span>
          </span>
        </label>
      </div>

      {!isDivider ? (
        <div className="pdf-editor-grid">
          <label className="pdf-control-field pdf-field-full">
            <span className="label">{contentLabel}</span>
            <textarea className="input min-h-24" rows={4} value={card.content || ''} disabled={disabled} onChange={(event) => updateCard({ content: event.target.value })} />
          </label>
          <label className="pdf-control-field pdf-field-full">
            <span className="label">{variableLabel}</span>
            <input className="input" value={card.variable || ''} disabled={disabled} onChange={(event) => updateCard({ variable: event.target.value })} />
          </label>
          {customColorsEnabled ? (
            <>
              <ColorControl label="Accent color" value={card.accentColor} disabled={disabled} onChange={(value) => updateCard({ accentColor: value })} />
              <ColorControl label="Card background" value={card.backgroundColor} disabled={disabled} onChange={(value) => updateCard({ backgroundColor: value })} />
              <ColorControl label="Text color" value={card.textColor} disabled={disabled} onChange={(value) => updateCard({ textColor: value })} />
              <ColorControl label="Border color" value={card.borderColor} disabled={disabled} onChange={(value) => updateCard({ borderColor: value })} />
            </>
          ) : null}
        </div>
      ) : customColorsEnabled ? (
        <div className="pdf-editor-grid">
          <ColorControl label="Accent color" value={card.accentColor} disabled={disabled} onChange={(value) => updateCard({ accentColor: value })} />
        </div>
      ) : null}
    </>
  );
}

function SelectedSectionEditor({
  selectedItem,
  items,
  selectedKey,
  onSelect,
  draft,
  setDraft,
  canEdit,
  saving,
  canMoveUp,
  canMoveDown,
  onMoveSelected,
  customColorsEnabled
}) {
  if (!selectedItem) return null;
  const isCustom = selectedItem.kind === 'custom';
  const section = selectedItem.section;
  const sectionIndex = selectedItem.index || 0;
  const displayTitle = isCustom ? (selectedItem.card?.title || customCardTypeLabel(selectedItem.card?.type)) : getPath(draft, sectionOptionPath(section, sectionIndex, 'title'), section.title);
  const visible = isCustom ? selectedItem.card?.enabled !== false : sectionVisible(section, draft);
  const Icon = isCustom ? Layers : section.icon || FileText;
  const visibility = isCustom ? null : visibilityField(section);
  const advancedEnabled = getPath(draft, 'advancedEnabled', false) === true;
  const customWidthEnabled = getPath(draft, 'structured.customCardWidthEnabled', false) === true;
  const fields = isCustom ? [] : section.fields.filter((field) => {
    if (field.path === visibility?.path) return false;
    if (field.type === 'color') return advancedEnabled && customColorsEnabled;
    if (field.type === 'width' || field.type === 'layout') return advancedEnabled;
    return true;
  });

  return (
    <section className="surface admin-control-card pdf-section-editor p-5">
      <div className="pdf-section-editor-head">
        <div className="flex min-w-0 items-start gap-3">
          <div className="admin-control-icon"><Icon className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Selected Section Editor</p>
            <h3 className="mt-1 text-xl font-black">{displayTitle}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`pdf-state-badge ${visible ? 'is-visible' : 'is-hidden'}`}>{visible ? 'Visible' : 'Hidden'}</span>
              <span className="pdf-state-badge is-fixed">{isCustom ? 'Custom Card' : 'Fixed Section'}</span>
            </div>
          </div>
        </div>
        <div className="pdf-section-editor-actions">
          <button type="button" className="btn btn-secondary h-9 px-3 py-1.5 text-xs" disabled={!canMoveUp} onClick={() => onMoveSelected(-1)}>
            <ArrowUp className="h-4 w-4" />
            Move Up
          </button>
          <button type="button" className="btn btn-secondary h-9 px-3 py-1.5 text-xs" disabled={!canMoveDown} onClick={() => onMoveSelected(1)}>
            <ArrowDown className="h-4 w-4" />
            Move Down
          </button>
        </div>
      </div>

      <div className="pdf-section-select-row">
        <SelectControl
          label="Edit Section"
          value={selectedKey}
          options={items.map((item) => [item.key, item.kind === 'custom' ? `Custom Card - ${item.card?.title || customCardTypeLabel(item.card?.type)}` : cleanLayerTitle(getPath(draft, sectionOptionPath(item.section, item.index, 'title'), item.section.title))])}
          disabled={saving}
          onChange={onSelect}
        />
      </div>

      {isCustom ? (
        <SelectedCustomCardEditor item={selectedItem} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} customColorsEnabled={customColorsEnabled} />
      ) : (
        <>
          <div className="pdf-editor-grid mb-4">
            <label className="pdf-control-field">
              <span className="label">Section title</span>
              <input
                className="input"
                value={getPath(draft, sectionOptionPath(section, sectionIndex, 'title'), section.title)}
                disabled={!canEdit || saving}
                onChange={(event) => setDraft((current) => setPath(current, sectionOptionPath(section, sectionIndex, 'title'), event.target.value))}
              />
            </label>
            {visibility ? (
              <FieldRow field={{ ...visibility, label: 'Show/hide section' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
            ) : (
              <label className="pdf-toggle-row is-disabled">
                <span className="pdf-toggle-label">Show/hide section</span>
                <span className="pdf-state-badge is-fixed">Fixed</span>
              </label>
            )}
            <FieldRow field={{ type: 'toggle', path: sectionOptionPath(section, sectionIndex, 'showTitle'), label: 'Show/hide title' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
            <FieldRow field={{ type: 'toggle', path: sectionOptionPath(section, sectionIndex, 'showIcon'), label: 'Show/hide icon' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
            {advancedEnabled && customWidthEnabled ? (
              <SelectControl
                label="Width / layout"
                value={getPath(draft, sectionOptionPath(section, sectionIndex, 'width'), 'full')}
                options={cardWidthOptions}
                disabled={!canEdit || saving}
                onChange={(value) => setDraft((current) => setPath(current, sectionOptionPath(section, sectionIndex, 'width'), value))}
              />
            ) : null}
          </div>

          <div className="pdf-editor-grid">
            {fields.map((field) => (
              <FieldRow key={field.path} field={field} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function StructuredBuilderWorkspace({
  sections,
  draft,
  setDraft,
  canEdit,
  saving,
  previewUrl,
  previewLoading,
  previewError,
  template,
  versions,
  restoring,
  onRestore
}) {
  function sectionKeysFromDraft() {
    const keys = sections.map((section, index) => sectionKey(section, index));
    const savedOrder = Array.isArray(getPath(draft, 'structured.sectionOrder', [])) ? getPath(draft, 'structured.sectionOrder', []) : [];
    const orderedSaved = savedOrder.filter((key) => keys.includes(key));
    return [...orderedSaved, ...keys.filter((key) => !orderedSaved.includes(key))];
  }

  const [sectionOrder, setSectionOrder] = useState(sectionKeysFromDraft);
  const [selectedKey, setSelectedKey] = useState(sectionOrder[0] || '');
  const advancedEnabled = getPath(draft, 'advancedEnabled', false) === true;
  const customSectionsEnabled = getPath(draft, 'structured.customSectionsEnabled', false) === true;
  const customColorsEnabled = advancedEnabled && getPath(draft, 'structured.customColorsEnabled', false) === true;
  const canReorder = getPath(draft, 'advancedEnabled', false) === true && getPath(draft, 'structured.allowDragDrop', false) === true;
  const sectionOrderSignature = stableJson(getPath(draft, 'structured.sectionOrder', []));
  const customCards = Array.isArray(getPath(draft, 'structured.customSections', [])) ? getPath(draft, 'structured.customSections', []) : [];
  const customSignature = stableJson(customCards.map((card, index) => ({ id: card.id || index, title: card.title, type: card.type })));

  useEffect(() => {
    const keys = sectionKeysFromDraft();
    setSectionOrder(keys);
    const customKeys = customCards.map((card, index) => `custom:${card.id || index}`);
    setSelectedKey((current) => ([...keys, ...customKeys].includes(current) ? current : keys[0] || customKeys[0] || ''));
  }, [sections, template.key, sectionOrderSignature, customSignature]);

  const orderedItems = sectionOrder
    .map((key) => {
      const index = sections.findIndex((section, itemIndex) => sectionKey(section, itemIndex) === key);
      return index >= 0 ? { kind: 'section', key, section: sections[index], index } : null;
    })
    .filter(Boolean);
  const customItems = customCards.map((card, index) => ({ kind: 'custom', key: `custom:${card.id || index}`, card, index }));
  const selectableItems = [...orderedItems, ...customItems];
  const selectedItem = selectableItems.find((item) => item.key === selectedKey) || selectableItems[0];
  const selectedSectionOrderIndex = selectedItem?.kind === 'section' ? orderedItems.findIndex((item) => item.key === selectedItem.key) : -1;
  const selectedCustomIndex = selectedItem?.kind === 'custom' ? selectedItem.index : -1;

  function moveSection(orderIndex, direction) {
    if (!canReorder) return;
    const next = sectionOrder.slice();
    const target = orderIndex + direction;
    if (target < 0 || target >= next.length) return;
    [next[orderIndex], next[target]] = [next[target], next[orderIndex]];
    setSectionOrder(next);
    setDraft((current) => setPath(current, 'structured.sectionOrder', next));
  }

  function moveCustomCard(index, direction) {
    if (index < 0) return;
    setDraft((current) => {
      const cards = Array.isArray(getPath(current, 'structured.customSections', [])) ? getPath(current, 'structured.customSections', []) : [];
      const target = index + direction;
      if (target < 0 || target >= cards.length) return current;
      const nextCards = cards.slice();
      [nextCards[index], nextCards[target]] = [nextCards[target], nextCards[index]];
      return setPath(current, 'structured.customSections', nextCards);
    });
  }

  function moveSelected(direction) {
    if (selectedItem?.kind === 'section') moveSection(selectedSectionOrderIndex, direction);
    if (selectedItem?.kind === 'custom') moveCustomCard(selectedCustomIndex, direction);
  }

  const selectedCanMoveUp = selectedItem?.kind === 'section'
    ? canReorder && selectedSectionOrderIndex > 0
    : selectedItem?.kind === 'custom' && selectedCustomIndex > 0;
  const selectedCanMoveDown = selectedItem?.kind === 'section'
    ? canReorder && selectedSectionOrderIndex >= 0 && selectedSectionOrderIndex < orderedItems.length - 1
    : selectedItem?.kind === 'custom' && selectedCustomIndex >= 0 && selectedCustomIndex < customCards.length - 1;

  return (
    <div className="pdf-structured-workspace">
      <main className="pdf-structured-editor">
        <SelectedSectionEditor
          selectedItem={selectedItem}
          items={selectableItems}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          draft={draft}
          setDraft={setDraft}
          canEdit={canEdit}
          saving={saving}
          canMoveUp={selectedCanMoveUp}
          canMoveDown={selectedCanMoveDown}
          onMoveSelected={moveSelected}
          customColorsEnabled={customColorsEnabled}
        />
        <AdvancedLayoutPanel draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
        <CustomSectionsEditor draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} advancedEnabled={advancedEnabled} customSectionsEnabled={customSectionsEnabled} customColorsEnabled={customColorsEnabled} />
      </main>
      <aside className="pdf-structured-preview">
        <LivePreviewPanel template={template} previewUrl={previewUrl} previewLoading={previewLoading} previewError={previewError} />
        <VersionHistoryPanel versions={versions} restoring={restoring} onRestore={onRestore} />
      </aside>
    </div>
  );
}

function headerFields(titleLabel = 'Header title') {
  return [
    { type: 'toggle', path: 'header.showLogo', label: 'Show/hide logo' },
    { type: 'toggle', path: 'header.showCompanyDetails', label: 'Show/hide company details' },
    { type: 'text', path: 'header.title', label: titleLabel },
    { type: 'color', path: 'header.accentColor', label: 'Accent color' }
  ];
}

function footerSection(title = 'Footer Section') {
  return {
    title,
    icon: FileText,
    fields: [
      ...footerFields.map(([path, label]) => ({ type: 'toggle', path, label })),
      { type: 'text', path: 'footer.thankYouMessage', label: 'Thank you message' }
    ]
  };
}

function pageBreakSection(labels = pageBreakFields) {
  return {
    title: 'Page Break Settings',
    icon: FileText,
    description: 'Controls how long tables and final sections continue across pages.',
    fields: labels.map(([path, label]) => ({ type: 'toggle', path, label }))
  };
}

const templateSectionDefinitions = {
  invoice: [
    { title: 'Header Section', icon: Palette, fields: headerFields() },
    { title: 'Invoice Details Section', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.invoiceDetails.showInvoiceNumber', label: 'Show/hide invoice number' },
      { type: 'toggle', path: 'sections.invoiceDetails.showJobReference', label: 'Show/hide job reference' },
      { type: 'toggle', path: 'sections.invoiceDetails.showInvoiceDate', label: 'Show/hide invoice date' },
      { type: 'toggle', path: 'sections.invoiceDetails.showPaymentStatus', label: 'Show/hide payment status' }
    ] },
    { title: 'Customer Details Section', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.customerDetails.showCustomerName', label: 'Show/hide customer name' },
      { type: 'toggle', path: 'sections.customerDetails.showPhoneNumber', label: 'Show/hide phone number' },
      { type: 'toggle', path: 'sections.customerDetails.showAddress', label: 'Show/hide address' }
    ] },
    { title: 'Service Details Section', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.serviceDetails.showServiceType', label: 'Show/hide service type' },
      { type: 'toggle', path: 'sections.serviceDetails.showDevice', label: 'Show/hide device' },
      { type: 'toggle', path: 'sections.serviceDetails.showBrandModel', label: 'Show/hide brand/model' },
      { type: 'toggle', path: 'sections.serviceDetails.showProblemComplaint', label: 'Show/hide problem/complaint' },
      { type: 'toggle', path: 'sections.serviceDetails.showTechnician', label: 'Show/hide technician' }
    ] },
    { title: 'Item Table Section', icon: FileText, fields: [
      { type: 'text', path: 'sections.itemTable.labels.sno', label: 'S.No column label' },
      { type: 'text', path: 'sections.itemTable.labels.description', label: 'Description column label' },
      { type: 'text', path: 'sections.itemTable.labels.quantity', label: 'Quantity column label' },
      { type: 'text', path: 'sections.itemTable.labels.unitPrice', label: 'Unit price column label' },
      { type: 'text', path: 'sections.itemTable.labels.total', label: 'Total column label' },
      { type: 'text', path: 'sections.itemTable.labels.tax', label: 'Tax column label' },
      { type: 'toggle', path: 'sections.itemTable.showSno', label: 'Show/hide S.No' },
      { type: 'toggle', path: 'sections.itemTable.showQuantity', label: 'Show/hide quantity' },
      { type: 'toggle', path: 'sections.itemTable.showUnitPrice', label: 'Show/hide unit price' },
      { type: 'toggle', path: 'sections.itemTable.showTotal', label: 'Show/hide total' },
      { type: 'toggle', path: 'sections.itemTable.showTaxColumn', label: 'Show/hide tax column if tax is enabled' }
    ] },
    { title: 'Amount Summary Section', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.amountSummary.showAmountInWords', label: 'Show/hide amount in words' },
      { type: 'toggle', path: 'sections.amountSummary.showSubtotal', label: 'Show/hide subtotal' },
      { type: 'toggle', path: 'sections.amountSummary.showFinalTotal', label: 'Show/hide final total' },
      { type: 'toggle', path: 'sections.amountSummary.showAmountPaid', label: 'Show/hide amount paid' },
      { type: 'toggle', path: 'sections.amountSummary.showBalanceDue', label: 'Show/hide balance due' }
    ] },
    { title: 'Work Completion Notice Section', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.workCompletionNotice.show', label: 'Show/hide section' },
      { type: 'text', path: 'sections.workCompletionNotice.title', label: 'Title' },
      { type: 'lines', path: 'sections.workCompletionNotice.messageLines', label: 'Message lines', rows: 4 }
    ] },
    { title: 'Terms & Conditions Section', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.terms.show', label: 'Show/hide section' },
      { type: 'text', path: 'sections.terms.title', label: 'Title' },
      { type: 'textarea', path: 'sections.terms.text', label: 'Terms text', rows: 6 }
    ] },
    footerSection(),
    pageBreakSection()
  ],
  quotation: [
    { title: 'Header', icon: Palette, fields: headerFields('Quotation title') },
    { title: 'Quotation Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.quotationDetails.showJobReference', label: 'Show/hide job reference' },
      { type: 'toggle', path: 'sections.quotationDetails.showQuotationDate', label: 'Show/hide quotation date' },
      { type: 'toggle', path: 'sections.quotationDetails.showQuotationStatus', label: 'Show/hide quotation status' }
    ] },
    { title: 'Customer Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.customerDetails.showCustomerName', label: 'Show/hide customer name' },
      { type: 'toggle', path: 'sections.customerDetails.showPhoneNumber', label: 'Show/hide phone number' },
      { type: 'toggle', path: 'sections.customerDetails.showAddress', label: 'Show/hide address' }
    ] },
    { title: 'Service / Device Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.serviceDeviceDetails.showServiceType', label: 'Show/hide service type' },
      { type: 'toggle', path: 'sections.serviceDeviceDetails.showDevice', label: 'Show/hide device' },
      { type: 'toggle', path: 'sections.serviceDeviceDetails.showBrandModel', label: 'Show/hide brand/model' },
      { type: 'toggle', path: 'sections.serviceDeviceDetails.showTechnician', label: 'Show/hide technician' },
      { type: 'toggle', path: 'sections.serviceDeviceDetails.showSerialNumber', label: 'Show/hide serial number' }
    ] },
    { title: 'Problem / Complaint', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.problemComplaint.show', label: 'Show/hide problem/complaint' },
      { type: 'text', path: 'sections.problemComplaint.label', label: 'Problem label' }
    ] },
    { title: 'Item Table', icon: FileText, fields: [
      { type: 'text', path: 'sections.itemTable.labels.sno', label: 'S.No column label' },
      { type: 'text', path: 'sections.itemTable.labels.description', label: 'Description column label' },
      { type: 'text', path: 'sections.itemTable.labels.quantity', label: 'Quantity column label' },
      { type: 'text', path: 'sections.itemTable.labels.unitPrice', label: 'Unit price column label' },
      { type: 'text', path: 'sections.itemTable.labels.total', label: 'Total column label' },
      { type: 'toggle', path: 'sections.itemTable.showSno', label: 'Show/hide S.No' },
      { type: 'toggle', path: 'sections.itemTable.showQuantity', label: 'Show/hide quantity' },
      { type: 'toggle', path: 'sections.itemTable.showUnitPrice', label: 'Show/hide unit price' },
      { type: 'toggle', path: 'sections.itemTable.showTotal', label: 'Show/hide total' },
      { type: 'toggle', path: 'sections.itemTable.showTaxColumn', label: 'Show/hide tax column if tax is enabled' }
    ] },
    { title: 'Total Summary', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.totalSummary.show', label: 'Show/hide total summary' },
      { type: 'toggle', path: 'sections.totalSummary.showSubtotal', label: 'Show/hide subtotal' },
      { type: 'toggle', path: 'sections.totalSummary.showTax', label: 'Show/hide tax' },
      { type: 'toggle', path: 'sections.totalSummary.showFinalTotal', label: 'Show/hide final total' }
    ] },
    { title: 'Validity Note', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.validityNote.show', label: 'Show/hide validity note' },
      { type: 'textarea', path: 'sections.validityNote.text', label: 'Validity note', rows: 3 }
    ] },
    { title: 'WhatsApp Approval Message', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.whatsappApprovalMessage.show', label: 'Show/hide message card' },
      { type: 'text', path: 'sections.whatsappApprovalMessage.title', label: 'Title' },
      { type: 'lines', path: 'sections.whatsappApprovalMessage.messageLines', label: 'Message lines', rows: 4 }
    ] },
    { title: 'Terms', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.terms.show', label: 'Show/hide terms' },
      { type: 'textarea', path: 'sections.terms.text', label: 'Terms text', rows: 6 }
    ] },
    footerSection('Footer'),
    pageBreakSection()
  ],
  'service-completed': [
    { title: 'Header', icon: Palette, fields: headerFields('Main title') },
    { title: 'Customer Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.customerDetails.show', label: 'Show/hide customer greeting' },
      { type: 'toggle', path: 'sections.customerDetails.showCustomerName', label: 'Show/hide customer name' }
    ] },
    { title: 'Service Summary', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.serviceSummary.show', label: 'Show/hide service summary' },
      { type: 'text', path: 'sections.serviceSummary.title', label: 'Summary title' }
    ] },
    { title: 'What We Did', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.whatWeDid.show', label: 'Show/hide message body' },
      { type: 'lines', path: 'sections.whatWeDid.messageLines', label: 'Letter message lines', rows: 7 }
    ] },
    { title: 'Support Message', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.supportMessage.show', label: 'Show/hide support section' },
      { type: 'lines', path: 'sections.supportMessage.highlightLines', label: 'Highlight points', rows: 4 },
      { type: 'text', path: 'sections.supportMessage.amcTitle', label: 'AMC card heading' },
      { type: 'textarea', path: 'sections.supportMessage.amcText', label: 'AMC card text', rows: 3 },
      { type: 'text', path: 'sections.supportMessage.amcFinalLine', label: 'AMC final line' }
    ] },
    { title: 'Terms', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.terms.show', label: 'Show/hide terms' },
      { type: 'textarea', path: 'sections.terms.text', label: 'Terms text', rows: 4 }
    ] },
    { title: 'Thank You Footer', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.thankYouFooter.show', label: 'Show/hide closing footer' },
      { type: 'text', path: 'sections.thankYouFooter.contactLabel', label: 'Contact label' },
      { type: 'text', path: 'footer.thankYouMessage', label: 'Bottom strip message' }
    ] }
  ],
  'amc-contract': [
    { title: 'Header', icon: Palette, fields: headerFields('Contract title') },
    { title: 'Customer Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.customerDetails.showCustomerName', label: 'Show/hide customer name' },
      { type: 'toggle', path: 'sections.customerDetails.showPhoneNumber', label: 'Show/hide phone number' },
      { type: 'toggle', path: 'sections.customerDetails.showAddress', label: 'Show/hide address' }
    ] },
    { title: 'AMC Period', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.amcPeriod.showAmcReference', label: 'Show/hide AMC reference' },
      { type: 'toggle', path: 'sections.amcPeriod.showContractDate', label: 'Show/hide contract date' },
      { type: 'toggle', path: 'sections.amcPeriod.showAmcPeriod', label: 'Show/hide AMC period' },
      { type: 'toggle', path: 'sections.amcPeriod.showStatus', label: 'Show/hide status' }
    ] },
    { title: 'Covered Devices', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.coveredDevices.show', label: 'Show/hide covered devices table' },
      { type: 'toggle', path: 'sections.coveredDevices.showCoveredFor', label: 'Show/hide covered-for field' },
      { type: 'toggle', path: 'sections.coveredDevices.showSerialNumber', label: 'Show/hide serial number column' }
    ] },
    { title: 'Visit Frequency', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.visitFrequency.show', label: 'Show/hide plan details' },
      { type: 'toggle', path: 'sections.visitFrequency.showPlanName', label: 'Show/hide plan name' },
      { type: 'toggle', path: 'sections.visitFrequency.showCoverageType', label: 'Show/hide coverage type' },
      { type: 'toggle', path: 'sections.visitFrequency.showTechnician', label: 'Show/hide technician' }
    ] },
    { title: 'Payment Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.paymentDetails.show', label: 'Show/hide payment details' },
      { type: 'toggle', path: 'sections.paymentDetails.showContractValue', label: 'Show/hide AMC value' },
      { type: 'toggle', path: 'sections.paymentDetails.showPaymentStatus', label: 'Show/hide payment status' }
    ] },
    { title: 'AMC Terms', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.amcTerms.show', label: 'Show/hide AMC terms' },
      { type: 'textarea', path: 'sections.amcTerms.text', label: 'AMC terms text', rows: 6 }
    ] },
    { title: 'Signature', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.signature.show', label: 'Show/hide signature' },
      { type: 'text', path: 'sections.signature.label', label: 'Signature label' }
    ] },
    footerSection('Footer')
  ],
  'amc-service-visit': [
    { title: 'Header', icon: Palette, fields: headerFields('Report title') },
    { title: 'Visit Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.visitDetails.showAmcReference', label: 'Show/hide AMC reference' },
      { type: 'toggle', path: 'sections.visitDetails.showVisitDate', label: 'Show/hide visit date' },
      { type: 'toggle', path: 'sections.visitDetails.showVisitStatus', label: 'Show/hide visit status' },
      { type: 'toggle', path: 'sections.visitDetails.showNextVisitDate', label: 'Show/hide next visit date' },
      { type: 'toggle', path: 'sections.visitDetails.showJobReference', label: 'Show/hide job reference' }
    ] },
    { title: 'Customer Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.customerDetails.showCustomerName', label: 'Show/hide customer name' },
      { type: 'toggle', path: 'sections.customerDetails.showPhoneNumber', label: 'Show/hide phone number' },
      { type: 'toggle', path: 'sections.customerDetails.showAddress', label: 'Show/hide address' }
    ] },
    { title: 'Device Checked', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.deviceChecked.show', label: 'Show/hide device checked section' },
      { type: 'toggle', path: 'sections.deviceChecked.showPlanName', label: 'Show/hide plan name' },
      { type: 'toggle', path: 'sections.deviceChecked.showAmcPeriod', label: 'Show/hide AMC period' },
      { type: 'toggle', path: 'sections.deviceChecked.showCoveredFor', label: 'Show/hide covered-for field' },
      { type: 'toggle', path: 'sections.deviceChecked.showTechnician', label: 'Show/hide technician' }
    ] },
    { title: 'Work Completed', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.workCompleted.show', label: 'Show/hide work completed table' }
    ] },
    { title: 'Parts Used', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.partsUsed.show', label: 'Show/hide additional charges/parts used' }
    ] },
    { title: 'Next Visit Note', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.nextVisitNote.show', label: 'Show/hide next visit note' }
    ] },
    { title: 'Customer Acknowledgement', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.customerAcknowledgement.show', label: 'Show/hide acknowledgement' },
      { type: 'textarea', path: 'sections.customerAcknowledgement.text', label: 'Acknowledgement text', rows: 3 }
    ] },
    footerSection('Footer')
  ],
  'amc-renewal-reminder': [
    { title: 'Header', icon: Palette, fields: headerFields('Reminder title') },
    { title: 'Customer Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.customerDetails.showCustomerName', label: 'Show/hide customer name' },
      { type: 'toggle', path: 'sections.customerDetails.showPhoneNumber', label: 'Show/hide phone number' },
      { type: 'toggle', path: 'sections.customerDetails.showAddress', label: 'Show/hide address' }
    ] },
    { title: 'AMC Expiry Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.amcExpiryDetails.showAmcReference', label: 'Show/hide AMC reference' },
      { type: 'toggle', path: 'sections.amcExpiryDetails.showReminderDate', label: 'Show/hide reminder date' },
      { type: 'toggle', path: 'sections.amcExpiryDetails.showExpiryDate', label: 'Show/hide expiry date' },
      { type: 'toggle', path: 'sections.amcExpiryDetails.showRenewalStatus', label: 'Show/hide renewal status' }
    ] },
    { title: 'Renewal Message', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.renewalMessage.show', label: 'Show/hide renewal message' },
      { type: 'text', path: 'sections.renewalMessage.title', label: 'Message title' }
    ] },
    { title: 'Plan Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.planDetails.showPlanName', label: 'Show/hide plan name' },
      { type: 'toggle', path: 'sections.planDetails.showCurrentPeriod', label: 'Show/hide current period' },
      { type: 'toggle', path: 'sections.planDetails.showRenewalPeriod', label: 'Show/hide renewal period' },
      { type: 'toggle', path: 'sections.planDetails.showCoveredFor', label: 'Show/hide covered for' }
    ] },
    { title: 'Renewal Amount', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.renewalAmount.show', label: 'Show/hide renewal amount' }
    ] },
    { title: 'Contact / WhatsApp Message', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.contactWhatsappMessage.show', label: 'Show/hide contact message' },
      { type: 'text', path: 'sections.contactWhatsappMessage.title', label: 'Title' },
      { type: 'textarea', path: 'sections.contactWhatsappMessage.text', label: 'Message text', rows: 3 },
      { type: 'text', path: 'sections.contactWhatsappMessage.finalLine', label: 'Final line' }
    ] },
    footerSection('Footer')
  ]
};

function StructuredTemplateEditor({
  template,
  draft,
  setDraft,
  canEdit,
  saving,
  busyKey,
  token,
  onSave,
  onCancel,
  onPreview,
  onDownload,
  onReset,
  versions,
  restoring,
  onRestore,
  onShowVariables,
  onDesignDirtyChange,
  onDesignModeChange
}) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [designConfirmOpen, setDesignConfirmOpen] = useState(false);
  const [uiMode, setUiMode] = useState('structured');
  const [designDraft, setDesignDraft] = useState(() => designStateFromConfig(draft));
  const previewUrlRef = useRef('');
  const requestIdRef = useRef(0);
  const sections = templateSectionDefinitions[template.key] || [];
  const busy = Boolean(busyKey) || saving;
  const designMode = uiMode === 'design';
  const draftDesignSignature = stableJson(draft.design || {});
  const designDraftDirty = stableJson(designDraft) !== draftDesignSignature;

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  useEffect(() => {
    setUiMode('structured');
    setDesignConfirmOpen(false);
    setDesignDraft(designStateFromConfig(draft));
  }, [template.key]);

  useEffect(() => {
    if (!designMode && !designDraftDirty) setDesignDraft(designStateFromConfig(draft));
  }, [draftDesignSignature, designMode, designDraftDirty, draft]);

  useEffect(() => {
    onDesignDirtyChange?.(designDraftDirty);
    return () => onDesignDirtyChange?.(false);
  }, [designDraftDirty, onDesignDirtyChange]);

  useEffect(() => {
    onDesignModeChange?.(designMode);
    return () => onDesignModeChange?.(false);
  }, [designMode, onDesignModeChange]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setPreviewLoading(true);
      setPreviewError('');
      try {
        const response = await fetch(`${apiBase}/pdf-templates/${template.key}/preview`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ config: draft })
        });
        const blob = await response.blob();
        if (!response.ok) throw new Error('PDF preview failed');
        if (requestId !== requestIdRef.current) return;
        const nextUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = nextUrl;
        setPreviewUrl(nextUrl);
      } catch (err) {
        if (requestId === requestIdRef.current) setPreviewError(err.message || 'PDF preview failed');
      } finally {
        if (requestId === requestIdRef.current) setPreviewLoading(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [draft, template.key, token]);

  function submit(event) {
    event.preventDefault();
    const designForSave = designStateWithTemplateSections(designDraft, sections, draft, template);
    onSave(event, designMode || designDraftDirty ? mergeDesignStateForSave(draft, designForSave) : draft);
  }

  function switchToStructuredMode() {
    setUiMode('structured');
  }

  function activateDesignMode() {
    setUiMode('design');
  }

  function switchToDesignMode() {
    if (designMode) return;
    setDesignConfirmOpen(true);
  }

  return (
    <>
      <form className={`grid gap-5 ${designMode ? 'pdf-design-editor-form' : ''}`} onSubmit={submit}>
        {!designMode ? <section className="surface admin-control-card pdf-editor-hero p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <button
                type="button"
                className="btn btn-secondary admin-compact-button mb-4"
                onClick={() => {
                  if (designDraftDirty && !window.confirm('Discard unsaved design mode changes?')) return;
                  onCancel();
                }}
              >
                <X className="h-4 w-4" />
                Back to Templates
              </button>
              <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Structured PDF Editor</p>
              <h2 className="mt-1 text-2xl font-black">{template.name}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 muted">Edit this fixed PDF from top to bottom using cards that follow the real PDF layout. Preview refreshes automatically after edits.</p>
              <div className="mt-4 inline-flex flex-wrap rounded-card border border-white/10 bg-slate-950/35 p-1">
                <button type="button" className={`btn admin-compact-button border-0 ${!designMode ? 'btn-primary' : 'btn-secondary'}`} disabled={busy} onClick={switchToStructuredMode}>
                  <LayoutGrid className="h-4 w-4" />
                  Structured Mode
                </button>
                <button type="button" className={`btn admin-compact-button border-0 ${designMode ? 'btn-primary' : 'btn-secondary'}`} disabled={!canEdit || busy} onClick={switchToDesignMode}>
                  <Edit3 className="h-4 w-4" />
                  Design Mode
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-secondary admin-compact-button" onClick={onShowVariables}>
                <ShieldCheck className="h-4 w-4" />
                Template Variables
              </button>
              <button type="button" className="btn btn-secondary admin-compact-button" disabled={busy} onClick={() => onPreview(template, designMode ? null : draft)}>
                {busyKey === `preview-${template.key}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Preview PDF
              </button>
              <button type="button" className="btn btn-secondary admin-compact-button" disabled={busy} onClick={() => onDownload(template, designMode ? null : draft)}>
                {busyKey === `download-${template.key}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download Sample PDF
              </button>
              <button type="button" className="btn btn-secondary admin-compact-button" disabled={!canEdit || busy} onClick={() => onReset(template)}>
                <RotateCcw className="h-4 w-4" />
                Reset to Default
              </button>
              <button type="submit" className="btn btn-primary admin-compact-button" disabled={!canEdit || busy}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </section> : null}

      {designMode ? (
        <DesignModeWorkspace
          template={template}
          sections={sections}
          draft={draft}
          setDraft={setDraft}
          designDraft={designDraft}
          setDesignDraft={setDesignDraft}
          canEdit={canEdit}
          saving={saving}
          busyKey={busyKey}
          versions={versions}
          restoring={restoring}
          onRestore={onRestore}
          hasUnsavedDesignChanges={designDraftDirty}
          previewUrl={previewUrl}
          previewLoading={previewLoading}
          previewError={previewError}
          onBack={switchToStructuredMode}
          onPreview={onPreview}
          onDownload={onDownload}
          onShowVariables={onShowVariables}
        />
      ) : (
        <StructuredBuilderWorkspace
          sections={sections}
          draft={draft}
          setDraft={setDraft}
          canEdit={canEdit}
          saving={saving}
          previewUrl={previewUrl}
          previewLoading={previewLoading}
          previewError={previewError}
          template={template}
          versions={versions}
          restoring={restoring}
          onRestore={onRestore}
        />
      )}
      </form>
      {designConfirmOpen ? (
        <ConfirmModal
          title="Switch to Design Mode?"
          message="Design Mode gives visual layout control. Existing PDF design will not change until you save. Continue?"
          confirmLabel="Continue"
          onCancel={() => setDesignConfirmOpen(false)}
          onConfirm={() => {
            setDesignConfirmOpen(false);
            activateDesignMode();
          }}
        />
      ) : null}
    </>
  );
}

export function PdfTemplatesSection({ onDirtyChange = null, onDesignModeChange = null }) {
  const { request, token, user } = useAuth();
  const { push } = useToast();
  const [editingKey, setEditingKey] = useState('');
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [resetCandidate, setResetCandidate] = useState(null);
  const [restoreCandidate, setRestoreCandidate] = useState(null);
  const [designEditorDirty, setDesignEditorDirty] = useState(false);
  const canEdit = hasRole(user, 'admin') && can(user, 'manage_pdf_templates');
  const { data, loading, error, reload } = useResource(() => request('/pdf-templates'), [request]);
  const templates = data?.templates || [];
  const activeTemplate = templates.find((template) => template.key === editingKey) || null;
  const editorDirty = Boolean(activeTemplate && stableJson(draft) !== stableJson(activeTemplate.config || {})) || designEditorDirty;
  const grouped = useMemo(() => ({
    service: templates.filter((template) => template.category === 'service'),
    amc: templates.filter((template) => template.category === 'amc')
  }), [templates]);

  useEffect(() => {
    onDirtyChange?.(editorDirty);
  }, [editorDirty, onDirtyChange]);

  useEffect(() => {
    if (!activeTemplate) onDesignModeChange?.(false);
  }, [activeTemplate, onDesignModeChange]);

  function startEdit(template) {
    if (!canEdit) {
      push('Only admin users can edit PDF templates', 'error');
      return;
    }
    setEditingKey(template.key);
    setDesignEditorDirty(false);
    setDraft(JSON.parse(JSON.stringify(template.config || {})));
  }

  async function fetchTemplatePdf(template, config = null) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const body = config ? JSON.stringify({ config }) : undefined;
    if (config) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${apiBase}/pdf-templates/${template.key}/preview`, {
      method: 'POST',
      headers,
      body
    });
    const blob = await response.blob();
    if (!response.ok) throw new Error('PDF preview failed');
    return new Blob([blob], { type: 'application/pdf' });
  }

  async function previewTemplate(template, config = null) {
    setBusyKey(`preview-${template.key}`);
    try {
      const blob = await fetchTemplatePdf(template, config);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function downloadTemplate(template, config = null) {
    setBusyKey(`download-${template.key}`);
    try {
      const blob = await fetchTemplatePdf(template, config);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${template.key}-sample.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function saveTemplate(event, configOverride = null) {
    event?.preventDefault?.();
    if (!activeTemplate) return;
    if (!canEdit) {
      push('Only admin users can save PDF templates', 'error');
      return;
    }
    const configToSave = configOverride || draft;
    setSaving(true);
    try {
      const result = await request(`/pdf-templates/${activeTemplate.key}`, {
        method: 'PATCH',
        body: JSON.stringify({ config: configToSave })
      });
      push(result.message || 'PDF template saved');
      await reload({ silent: true });
      setEditingKey(result.template?.key || activeTemplate.key);
      setDraft(JSON.parse(JSON.stringify(result.template?.config || configToSave)));
      setDesignEditorDirty(false);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function resetTemplate(template) {
    if (!canEdit) {
      push('Only admin users can reset PDF templates', 'error');
      return;
    }
    setBusyKey(`reset-${template.key}`);
    try {
      const result = await request(`/pdf-templates/${template.key}/reset`, { method: 'POST' });
      push(result.message || 'PDF template reset');
      await reload({ silent: true });
      if (editingKey === template.key) setDraft(JSON.parse(JSON.stringify(result.template?.config || {})));
      if (editingKey === template.key) setDesignEditorDirty(false);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function restoreVersion(version) {
    if (!activeTemplate || !canEdit) return;
    setRestoring(true);
    try {
      const versionId = version.id || version.version;
      const result = await request(`/pdf-templates/${activeTemplate.key}/restore/${versionId}`, { method: 'POST' });
      push(result.message || 'PDF template version restored');
      await reload({ silent: true });
      setDraft(JSON.parse(JSON.stringify(result.template?.config || {})));
      setDesignEditorDirty(false);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setRestoring(false);
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  if (activeTemplate) {
    return (
      <>
        <StructuredTemplateEditor
          template={activeTemplate}
          draft={draft}
          setDraft={setDraft}
          canEdit={canEdit}
          saving={saving}
          busyKey={busyKey}
          token={token}
          onSave={saveTemplate}
          onCancel={() => {
            if (editorDirty && !window.confirm('Discard unsaved template changes?')) return;
            setDesignEditorDirty(false);
            setEditingKey('');
          }}
          onPreview={previewTemplate}
          onDownload={downloadTemplate}
          onReset={(template) => setResetCandidate(template)}
          versions={activeTemplate.versions || []}
          restoring={restoring}
          onRestore={(version) => setRestoreCandidate(version)}
          onShowVariables={() => setVariablesOpen(true)}
          onDesignDirtyChange={setDesignEditorDirty}
          onDesignModeChange={onDesignModeChange}
        />
        {variablesOpen ? <TemplateVariablesModal onClose={() => setVariablesOpen(false)} /> : null}
        {resetCandidate ? (
          <ConfirmModal
            title="Reset template?"
            message={`Reset ${resetCandidate.name} to the default text and styling. Existing generated PDFs will not be changed.`}
            confirmLabel="Reset Template"
            onCancel={() => setResetCandidate(null)}
            onConfirm={async () => {
              const template = resetCandidate;
              setResetCandidate(null);
              await resetTemplate(template);
            }}
          />
        ) : null}
        {restoreCandidate ? (
          <ConfirmModal
            title="Restore template version?"
            message={`Restore version v${restoreCandidate.version}. Existing generated PDFs will not be changed.`}
            confirmLabel="Restore Version"
            onCancel={() => setRestoreCandidate(null)}
            onConfirm={async () => {
              const version = restoreCandidate;
              setRestoreCandidate(null);
              await restoreVersion(version);
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="surface admin-control-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">DOCUMENT TEMPLATES</p>
              <span className="admin-premium-badge">6 FIXED TEMPLATES</span>
            </div>
            <h2 className="text-2xl font-black">PDF / Document Templates</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Edit the fixed Universal Systems PDF templates with structured cards and real server-rendered previews.</p>
          </div>
          <div className="rounded-card border border-sky-300/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            <div className="flex items-center gap-2 font-black">
              <Palette className="h-4 w-4" />
              Fresh PDFs use current templates
            </div>
            <p className="mt-1 text-xs text-sky-100/80">Existing generated PDFs are not changed automatically.</p>
          </div>
          <button type="button" className="btn btn-secondary admin-compact-button" onClick={() => setVariablesOpen(true)}>
            <ShieldCheck className="h-4 w-4" />
            Template Variables
          </button>
        </div>
      </section>

      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-black">{sectionLabels[category]}</h3>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-slate-200">{items.length} templates</span>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {items.map((template) => (
              <TemplateCard
                key={template.key}
                template={template}
                canEdit={canEdit}
                busyKey={busyKey}
                onEdit={startEdit}
                onPreview={previewTemplate}
                onDownload={downloadTemplate}
                onReset={(item) => setResetCandidate(item)}
              />
            ))}
          </div>
        </section>
      ))}
      {variablesOpen ? <TemplateVariablesModal onClose={() => setVariablesOpen(false)} /> : null}
      {resetCandidate ? (
        <ConfirmModal
          title="Reset template?"
          message={`Reset ${resetCandidate.name} to the default text and styling. Existing generated PDFs will not be changed.`}
          confirmLabel="Reset Template"
          onCancel={() => setResetCandidate(null)}
          onConfirm={async () => {
            const template = resetCandidate;
            setResetCandidate(null);
            await resetTemplate(template);
          }}
        />
      ) : null}
    </div>
  );
}
