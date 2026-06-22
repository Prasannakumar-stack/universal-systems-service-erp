import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bell,
  Box,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Columns2,
  Copy,
  CreditCard,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FilePlus2,
  FileText,
  Globe,
  GripVertical,
  Grid2X2,
  Handshake,
  Headphones,
  History,
  Image as ImageIcon,
  IndianRupee,
  Layers,
  LayoutGrid,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Maximize2,
  MessageCircle,
  Minus,
  Move,
  Palette,
  Phone,
  Plus,
  QrCode,
  Redo2,
  ReceiptText,
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
import { createPortal } from 'react-dom';
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
  '{{company_website}}',
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
  '{{payment_status}}',
  '{{amc_contract_no}}',
  '{{amc_reference}}',
  '{{service_name}}',
  '{{service_type}}',
  '{{device}}',
  '{{device_name}}',
  '{{device_brand}}',
  '{{device_model}}',
  '{{brand_model}}',
  '{{problem_complaint}}',
  '{{problem_description}}',
  '{{technician_name}}',
  '{{total_amount}}',
  '{{subtotal_amount}}',
  '{{final_total}}',
  '{{amount_paid}}',
  '{{balance_due}}',
  '{{amount_in_words}}',
  '{{item_index}}',
  '{{item_description}}',
  '{{item_quantity}}',
  '{{item_unit_price}}',
  '{{item_total}}',
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
  { type: 'table', label: 'Add Table', icon: Columns2 },
  { type: 'card', label: 'Add Card', icon: Square },
  { type: 'icon', label: 'Add Icon', icon: Box },
  { type: 'qr', label: 'Add QR', icon: QrCode },
  { type: 'signature', label: 'Add Signature', icon: Signature },
  { type: 'divider', label: 'Add Divider', icon: Minus },
  { type: 'spacer', label: 'Add Spacer', icon: Maximize2 },
  { type: 'image', label: 'Add Image / Logo', icon: ImageIcon }
];

const iconVariantOptions = [
  ['generic', 'Generic'],
  ['check', 'Check'],
  ['dot', 'Dot'],
  ['completion', 'Completion badge'],
  ['rupee', 'Rupee'],
  ['document', 'Document'],
  ['address', 'Address'],
  ['phone', 'Phone'],
  ['email', 'Email'],
  ['website', 'Website'],
  ['invoice', 'Invoice'],
  ['work', 'Work'],
  ['date', 'Date'],
  ['status', 'Status'],
  ['handshake', 'Handshake']
];

const iconModeOptions = [
  ['vector', 'Vector icon'],
  ['emoji', 'Emoji']
];

const emojiIconOptions = [
  ['📍', '📍 Location'],
  ['☎️', '☎️ Phone'],
  ['✉️', '✉️ Email'],
  ['🌐', '🌐 Website'],
  ['✅', '✅ Check'],
  ['₹', '₹ Rupee']
];

const builderRailItems = [
  { id: 'templates', label: 'Templates', icon: LayoutGrid },
  { id: 'elements', label: 'Elements', icon: Plus },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'uploads', label: 'Uploads / Logo', icon: ImageIcon },
  { id: 'variables', label: 'Variables', icon: ShieldCheck },
  { id: 'pages', label: 'Pages', icon: FilePlus2 },
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'history', label: 'Saved Versions', icon: History }
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
  ['Company variables', ['{{company_name}}', '{{company_phone}}', '{{company_email}}', '{{company_website}}', '{{company_address}}']],
  ['Customer variables', ['{{customer_name}}', '{{customer_phone}}', '{{customer_address}}']],
  ['Work Order variables', ['{{work_order_id}}', '{{service_type}}', '{{device_name}}', '{{device_brand}}', '{{device_model}}', '{{problem_description}}', '{{technician_name}}']],
  ['Invoice variables', ['{{invoice_number}}', '{{invoice_date}}', '{{payment_status}}', '{{subtotal_amount}}', '{{amount_paid}}', '{{balance_due}}', '{{final_total}}', '{{amount_in_words}}']],
  ['Item row variables', ['{{item_index}}', '{{item_description}}', '{{item_quantity}}', '{{item_unit_price}}', '{{item_total}}']],
  ['Quotation variables', ['{{quotation_number}}', '{{quotation_date}}']],
  ['AMC variables', ['{{amc_contract_no}}', '{{amc_start_date}}', '{{amc_end_date}}']]
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
  rowHeight: 18,
  paddingX: 4,
  paddingY: 5,
  rowBackgroundColor: '#ffffff',
  alternateRowBackgroundColor: '#f8fafc',
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

function editorConfigForTemplate(template = {}) {
  return cloneValue(template.draftConfig || template.config || {});
}

function designStateFromConfig(config = {}) {
  return normalizeDesignState(cloneValue(config.design || {}));
}

function mergeDesignStateForSave(config = {}, designState = {}, options = {}) {
  const currentDesign = config.design || {};
  const normalizedDesign = normalizeDesignState(designState);
  const visualElementMode = normalizedDesign.visualElementMode !== false;
  const saveElements = normalizedDesign.elements.map((element, index) => normalizeBuilderElement(element, index));
  const saveSections = visualElementMode
    ? []
    : normalizedDesign.sections.map((section, index) => normalizeBuilderSection(section, index));
  const savePages = normalizeDesignPages(normalizedDesign, saveElements, saveSections);
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
      visualElementMode,
      pages: savePages,
      sections: saveSections,
      elements: saveElements,
      customElements: saveElements,
      enabled: true,
      confirmed: options.publish === true,
      mode: normalizedDesign.mode === 'manifest' ? 'manifest' : (currentDesign.mode || 'legacy'),
      published: options.publish === true,
      previewDraft: options.previewDraft === true,
      baseTemplateVersion: normalizedDesign.baseTemplateVersion || currentDesign.baseTemplateVersion || config.version || 1,
      overrides: normalizedDesign.overrides || currentDesign.overrides || {},
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

function pdfLayerSelectorValue(value = '') {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function cleanPdfElementLayerTitle(element = {}) {
  const id = String(element.id || '');
  const raw = String(element.name || element.title || element.content?.label || element.type || 'Layer').trim();
  const overrides = {
    'invoice.watermark': 'Watermark',
    'invoice.logo': 'Company Logo',
    'invoice.companyTagline': 'Company Tagline',
    'invoice.title': 'Invoice Title',
    'invoice.detailsCard': 'Invoice Details Card',
    'invoice.serviceCard': 'Service Details Card',
    'invoice.itemsTable': 'Item Table',
    'invoice.amountWordsCard': 'Amount in Words',
    'invoice.amountSummaryCard': 'Amount Summary',
    'invoice.workNoticeCard': 'Work Completion Notice',
    'invoice.termsCard': 'Terms & Conditions',
    'invoice.bottomStrip': 'Thank You Strip',
    'invoice.bottomMessage': 'Thank You Message'
  };
  if (overrides[id]) return overrides[id];
  if (id.startsWith('invoice.header.phone')) return 'Company Phone';
  if (id.startsWith('invoice.header.email')) return 'Company Email';
  if (id.startsWith('invoice.header.website')) return 'Company Website';
  if (id.startsWith('invoice.header.address')) return 'Company Address';
  if (id.startsWith('invoice.footer.')) {
    return raw
      .replace(/\s+Footer\s+(Icon|Label|Value)$/i, ' $1')
      .replace(/\s+Footer$/i, '')
      .trim();
  }
  if (id.startsWith('invoice.terms.')) return raw.replace(/^Terms And Conditions/i, 'Terms').trim();
  if (id.startsWith('invoice.workNotice.')) return raw.replace(/^Work Completion Notice/i, 'Work Notice').trim();
  return cleanLayerTitle(raw);
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

function isNonVisualDesignSection(section = {}) {
  const text = `${section.title || ''} ${section.name || ''} ${section.role || ''} ${section.content?.title || ''}`.toLowerCase();
  return text.includes('page break') || text.includes('pagination') || text.includes('safe zone');
}

function makeVisualElementFromSection(section = {}, patch = {}, index = 0) {
  const role = section.role || designLayerRole(section.title || section.name);
  const style = { ...sectionDefaultStyle(role), ...(section.style || {}), ...(patch.style || {}) };
  const type = normalizeElementType(patch.type || 'text');
  const content = { ...contentDefaultsForElement(type), ...(patch.content || {}) };
  return normalizeBuilderElement({
    id: patch.id || `visual-${section.id || section.sourceKey || index}-${patch.key || index}`,
    type,
    name: patch.name || patch.title || section.name || section.title || elementNameForType(type),
    title: patch.title || patch.name || section.title || section.name || elementNameForType(type),
    pageId: section.pageId || 'page-1',
    x: Number(section.x || 32) + Number(patch.x || 0),
    y: Number(section.y || 30) + Number(patch.y || 0),
    width: patch.width ?? section.width,
    height: patch.height ?? section.height,
    widthMode: 'custom',
    visible: section.visible !== false,
    enabled: section.enabled !== false,
    locked: patch.locked ?? false,
    system: true,
    sourceSectionId: section.id,
    sourceKey: section.sourceKey,
    designGenerated: true,
    showTitle: false,
    showIcon: false,
    zIndex: Number(section.zIndex || 1) * 20 + index,
    content,
    style
  }, index);
}

function visualElementsFromSections(sections = [], template = {}, draft = {}) {
  const output = [];
  const add = (section, patch) => {
    output.push(makeVisualElementFromSection(section, patch, output.length));
  };

  sections.filter((section) => !isNonVisualDesignSection(section)).forEach((section) => {
    const content = section.content || {};
    const title = content.title || section.title || section.name || 'Section';
    const rows = Array.isArray(content.rows) ? content.rows : [];
    const columns = Array.isArray(content.columns) ? content.columns : [];
    const width = Number(section.width || 220);
    const height = Number(section.height || 80);
    const role = content.kind || section.role || 'details';
    const baseStyle = section.style || {};
    const softCardStyle = {
      borderWidth: role === 'header' || role === 'footer' ? 0 : 1,
      borderRadius: role === 'table' ? 4 : 8,
      backgroundColor: baseStyle.backgroundColor || '#ffffff',
      borderColor: baseStyle.borderColor || '#d8e5f7',
      textColor: baseStyle.textColor || '#0f172a',
      fontSize: baseStyle.fontSize || 12,
      fontWeight: baseStyle.fontWeight || 700,
      shadow: false
    };

    if (role === 'header') {
      add(section, {
        key: 'logo',
        type: 'image',
        name: 'Logo',
        x: 14,
        y: 18,
        width: 54,
        height: 54,
        content: { label: 'Company Logo', imageMode: 'logo' },
        style: { borderWidth: 0, backgroundColor: '#ffffff' }
      });
      add(section, {
        key: 'company-name',
        type: 'text',
        name: 'Company name',
        x: 82,
        y: 16,
        width: Math.max(120, width - 180),
        height: 24,
        content: { text: '{{company_name}}' },
        style: { ...softCardStyle, borderWidth: 0, fontSize: 16, fontWeight: 800, backgroundColor: '#ffffff' }
      });
      add(section, {
        key: 'company-details',
        type: 'text',
        name: 'Company details',
        x: 82,
        y: 44,
        width: Math.max(160, width - 180),
        height: 45,
        content: { text: '{{company_phone}} | {{company_email}}\n{{company_address}}' },
        style: { ...softCardStyle, borderWidth: 0, fontSize: 8, fontWeight: 500, backgroundColor: '#ffffff', textColor: '#475569' }
      });
      add(section, {
        key: 'document-title',
        type: 'text',
        name: title,
        x: Math.max(260, width - 170),
        y: 18,
        width: 150,
        height: 28,
        content: { text: title },
        style: { ...softCardStyle, borderWidth: 0, fontSize: 15, fontWeight: 800, alignment: 'right', backgroundColor: '#ffffff' }
      });
      add(section, {
        key: 'header-divider',
        type: 'divider',
        name: 'Header divider',
        x: 0,
        y: Math.max(90, height - 14),
        width,
        height: 10,
        content: { label: '' },
        style: { accentColor: baseStyle.accentColor || '#0f2a52', dividerThickness: 2 }
      });
      return;
    }

    if (role === 'table') {
      add(section, {
        key: 'table',
        type: 'table',
        name: title,
        x: 0,
        y: 0,
        width,
        height,
        content: { title, columns, rows },
        style: { ...softCardStyle, accentColor: baseStyle.accentColor || '#0f2a52', fontSize: 8, borderWidth: 1 }
      });
      return;
    }

    if (role === 'amount') {
      add(section, {
        key: 'amount-card',
        type: 'card',
        name: title,
        x: 0,
        y: 0,
        width,
        height,
        content: { title, body: rows.map(([label, value]) => `${label}: ${value}`).join('\n') },
        style: { ...softCardStyle, accentColor: '#047857', fontSize: 12 }
      });
      return;
    }

    if (role === 'footer') {
      add(section, {
        key: 'footer-text',
        type: 'text',
        name: 'Footer text',
        x: 0,
        y: 6,
        width,
        height: Math.max(28, height - 12),
        content: { text: content.body || '{{company_phone}} | {{company_email}} | {{company_address}}' },
        style: { ...softCardStyle, borderWidth: 0, fontSize: 8, fontWeight: 500, alignment: 'center', textColor: '#64748b', backgroundColor: '#ffffff' }
      });
      return;
    }

    if (rows.length) {
      add(section, {
        key: 'card-bg',
        type: 'card',
        name: `${title} card`,
        x: 0,
        y: 0,
        width,
        height,
        content: { title: '', body: '' },
        style: { ...softCardStyle, fontSize: 1, accentColor: baseStyle.accentColor || '#0f2a52' },
        locked: true
      });
      add(section, {
        key: 'section-title',
        type: 'text',
        name: `${title} title`,
        x: 16,
        y: 10,
        width: Math.max(80, width - 32),
        height: 18,
        content: { text: title },
        style: { ...softCardStyle, borderWidth: 0, fontSize: 9, fontWeight: 800, textColor: baseStyle.accentColor || '#0f2a52', backgroundColor: '#ffffff' }
      });
      rows.slice(0, 6).forEach(([label, value], rowIndex) => {
        const rowY = 34 + rowIndex * 16;
        add(section, {
          key: `label-${rowIndex}`,
          type: 'text',
          name: `${label} label`,
          x: 16,
          y: rowY,
          width: Math.max(55, width * 0.36),
          height: 14,
          content: { text: label },
          style: { ...softCardStyle, borderWidth: 0, fontSize: 7, fontWeight: 600, textColor: '#64748b', backgroundColor: '#ffffff' }
        });
        add(section, {
          key: `value-${rowIndex}`,
          type: 'text',
          name: `${label} value`,
          x: Math.max(80, width * 0.42),
          y: rowY,
          width: Math.max(80, width * 0.55),
          height: 14,
          content: { text: value },
          style: { ...softCardStyle, borderWidth: 0, fontSize: 7.5, fontWeight: 800, backgroundColor: '#ffffff' }
        });
      });
      return;
    }

    add(section, {
      key: 'notice-card',
      type: 'card',
      name: title,
      x: 0,
      y: 0,
      width,
      height,
      content: { title, body: content.body || content.text || '' },
      style: { ...softCardStyle, accentColor: baseStyle.accentColor || '#2563eb', fontSize: role === 'notice' ? 10 : 12 }
    });
  });

  return output.map((element, index) => normalizeBuilderElement({ ...element, zIndex: index + 20 }, index));
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
  const visualElementMode = normalized.visualElementMode !== false;
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

  if (visualElementMode) {
    const sourceElements = normalized.elements.length
      ? normalized.elements
      : visualElementsFromSections(mergedSections, template, draft);
    const visualElements = sourceElements.map((element, index) => normalizeBuilderElement({
      ...element,
      pageId: allowedPageIds.has(element.pageId || 'page-1') ? element.pageId : 'page-1'
    }, index));
    return {
      ...normalized,
      visualElementMode: true,
      sections: [],
      elements: visualElements,
      customElements: visualElements,
      pages: normalizeDesignPages(normalized, visualElements, [])
    };
  }

  const next = {
    ...normalized,
    visualElementMode: false,
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
  if (normalized === 'rectangle' || normalized === 'shape') return 'card';
  if (builderElementTypes.some((item) => item.type === normalized)) return normalized;
  return 'text';
}

function contentDefaultsForElement(type = 'text') {
  if (type === 'table') return {
    title: 'Table',
    columns: ['S.No', 'Description', 'Qty', 'Unit Price', 'Total'],
    columnWidths: [0.6, 2.4, 0.8, 1.2, 1.2],
    previewRowCount: 5,
    dynamicRows: true,
    rowTemplate: ['{{item_index}}', '{{item_description}}', '{{item_quantity}}', '{{item_unit_price}}', '{{item_total}}'],
    rows: [['{{item_index}}', '{{item_description}}', '{{item_quantity}}', '{{item_unit_price}}', '{{item_total}}']]
  };
  if (type === 'icon') return { label: 'Icon', iconName: 'star', iconMode: 'vector', emoji: '✅' };
  if (type === 'card') return { title: 'Card title', body: 'Add details here', twoColumn: false };
  if (type === 'qr') return { label: 'QR CODE', qrType: 'payment', helperText: 'Payment / contact QR placeholder' };
  if (type === 'signature') return { label: 'Authorized Signature', name: '', designation: '' };
  if (type === 'divider') return { label: 'Divider' };
  if (type === 'spacer') return { label: 'Spacer' };
  if (type === 'image') return { label: 'Company Logo', imageMode: 'logo' };
  return { text: 'New text block' };
}

function isInvoiceManifestElement(element = {}) {
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
    return text.startsWith('invoice.')
      || text.startsWith('quotation.')
      || text.startsWith('service-completed.')
      || text.startsWith('amc-contract.')
      || text.startsWith('amc-service-visit.')
      || text.startsWith('amc-renewal-reminder.')
      || compact.startsWith('invoice')
      || compact.startsWith('quotation')
      || compact.startsWith('servicecompleted')
      || compact.startsWith('amccontract')
      || compact.startsWith('amcservicevisit')
      || compact.startsWith('amcrenewalreminder');
  });
}

function contentDefaultsForInvoiceElement(type = 'text') {
  if (type === 'table') return { ...contentDefaultsForElement('table'), title: '' };
  if (type === 'icon') return { label: '', iconName: '', variant: '', iconMode: 'vector', emoji: '✅' };
  if (type === 'card') return { boxOnly: false, twoColumn: false, title: '', body: '' };
  if (type === 'divider' || type === 'spacer') return { label: '' };
  if (type === 'image') return { label: '', imageMode: '', assetPath: '', fitToFrame: true };
  if (type === 'qr') return { label: '', qrType: 'payment', helperText: '' };
  if (type === 'signature') return { label: '', name: '', designation: '' };
  return { text: '' };
}

function styleDefaultsForInvoiceElement(type = 'text') {
  const isTable = type === 'table';
  return {
    ...defaultElementStyles,
    backgroundColor: ['text', 'icon', 'divider', 'image'].includes(type) ? 'transparent' : defaultElementStyles.backgroundColor,
    borderColor: 'transparent',
    borderRadius: type === 'card' ? 0 : defaultElementStyles.borderRadius,
    borderWidth: 0,
    shadow: false,
    padding: 0,
    paddingX: isTable ? defaultElementStyles.paddingX : 0,
    paddingY: isTable ? defaultElementStyles.paddingY : 0,
    lineHeight: 1.16
  };
}

function isWatermarkImageElement(element = {}) {
  const content = element.content || {};
  if (element.type && normalizeElementType(element.type) !== 'image') return false;
  const roleValues = [
    content.imageMode,
    content.imageRole,
    content.role,
    element.imageMode,
    element.imageRole,
    element.role,
    element.groupId
  ].map((value) => String(value || '').trim().toLowerCase());
  return roleValues.includes('watermark')
    || String(element.id || '').toLowerCase() === 'invoice.watermark'
    || content.backgroundElement === true
    || element.backgroundElement === true;
}

function isBackgroundElement(element = {}) {
  const content = element.content || {};
  return content.backgroundElement === true
    || element.backgroundElement === true
    || element.groupId === 'watermark'
    || element.id === 'invoice.watermark'
    || content.imageMode === 'watermark'
    || isWatermarkImageElement(element);
}

function isTinyCanvasElement(element = {}) {
  const width = Number(element.width || 0);
  const height = Number(element.height || 0);
  return width > 0 && height > 0 && (width <= 18 || height <= 18 || (element.type === 'icon' && Math.max(width, height) <= 24));
}

function duplicateZIndexForElement(element = {}, elements = []) {
  if (!isBackgroundElement(element)) {
    return Math.min(999, Math.max(...elements.map((item) => Number(item.zIndex || 1)), 1) + 1);
  }
  const backgroundMax = Math.max(
    ...elements.filter((item) => isBackgroundElement(item)).map((item) => Number(item.zIndex || 1)),
    Number(element.zIndex || 1)
  );
  const foregroundMin = Math.min(
    ...elements.filter((item) => !isBackgroundElement(item)).map((item) => Number(item.zIndex || 999)),
    999
  );
  return Math.max(1, Math.min(foregroundMin - 1, backgroundMax + 1));
}

function imagePreviewSource(content = {}) {
  const assetPath = String(content.assetPath || content.imageUrl || content.src || '').trim();
  if (assetPath) return assetPath;
  if (content.imageMode === 'watermark') return '/logo-icon.png';
  if ((content.imageMode || 'logo') === 'logo') return '/logo-full.png';
  return '';
}

function CanvasIconPreview({ variant = '', mode = 'vector', emoji = '' }) {
  if (mode === 'emoji') {
    return <span className="pdf-canvas-emoji-icon" aria-hidden="true">{emoji || '✅'}</span>;
  }
  const normalized = String(variant || '').toLowerCase();
  if (normalized === 'dot') return <span className="pdf-canvas-dot" />;
  if (normalized === 'check') {
    return (
      <svg className="pdf-canvas-check-dot" viewBox="0 0 8 8" aria-hidden="true" focusable="false">
        <circle cx="4" cy="4" r="4" fill="currentColor" />
        <path d="M2.2 4 3.8 5.8 6.4 2.4" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.05" />
      </svg>
    );
  }
  if (normalized === 'completion') {
    return (
      <svg className="pdf-canvas-completion-badge" viewBox="0 0 34 48" aria-hidden="true" focusable="false">
        <circle cx="17" cy="17" r="17" fill="currentColor" />
        <path d="M9.4 17.2 14.8 22.5 25.5 11.6" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.1" />
        <path d="M7 30 1 48 12 43Z" fill="currentColor" />
        <path d="M26.5 30 34 48 21.5 43Z" fill="currentColor" />
      </svg>
    );
  }

  const iconMap = {
    address: MapPin,
    phone: Phone,
    email: Mail,
    website: Globe,
    whatsapp: MessageCircle,
    invoice: ReceiptText,
    work: ClipboardCheck,
    date: CalendarDays,
    calendar: CalendarDays,
    status: CreditCard,
    document: FileText,
    handshake: Handshake,
    shield: ShieldCheck,
    bell: Bell,
    headset: Headphones,
    rupee: IndianRupee
  };
  const Icon = iconMap[normalized] || Box;
  return <Icon className="h-4 w-4 pdf-canvas-icon-svg" />;
}

function formatTableColumns(columns = []) {
  return (Array.isArray(columns) && columns.length ? columns : contentDefaultsForElement('table').columns).join(' | ');
}

function parseTableColumns(value = '') {
  const columns = String(value || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
  return columns.length ? columns : contentDefaultsForElement('table').columns;
}

function formatTableRows(rows = []) {
  const sourceRows = Array.isArray(rows) && rows.length ? rows : contentDefaultsForElement('table').rows;
  return sourceRows.map((row) => (Array.isArray(row) ? row : [row]).join(' | ')).join('\n');
}

function formatTableColumnWidths(widths = []) {
  return (Array.isArray(widths) && widths.length ? widths : [0.6, 2.4, 0.8, 1.2, 1.2]).join(' | ');
}

function parseTableColumnWidths(value = '', columnCount = 5) {
  const widths = String(value || '')
    .split('|')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
    .slice(0, Math.max(1, columnCount));
  return widths.length ? widths : Array.from({ length: Math.max(1, columnCount) }, () => 1);
}

function parseTableRows(value = '', columnCount = 4) {
  const rows = String(value || '')
    .split('\n')
    .map((line) => line.split('|').map((item) => item.trim()).slice(0, Math.max(1, columnCount)))
    .filter((row) => row.some(Boolean))
    .slice(0, 12);
  return rows.length ? rows : contentDefaultsForElement('table').rows;
}

function defaultSizeForElement(type = 'text') {
  if (type === 'table') return { width: 520, height: 132 };
  if (type === 'icon') return { width: 38, height: 38 };
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
  const invoiceManifestElement = isInvoiceManifestElement(element);
  const minWidth = invoiceManifestElement ? 0.1 : 24;
  const minHeight = invoiceManifestElement ? 0.1 : 8;
  const contentDefaults = invoiceManifestElement ? contentDefaultsForInvoiceElement(type) : contentDefaultsForElement(type);
  const rawContent = typeof element.content === 'object' && element.content !== null
    ? element.content
    : { ...contentDefaults, text: String(element.content || '') };
  const content = { ...contentDefaults, ...rawContent };
  const styleDefaults = invoiceManifestElement ? styleDefaultsForInvoiceElement(type) : defaultElementStyles;
  const style = {
    ...styleDefaults,
    ...(element.style || {}),
    accentColor: element.style?.accentColor || element.accentColor || styleDefaults.accentColor,
    backgroundColor: element.style?.backgroundColor || element.backgroundColor || styleDefaults.backgroundColor,
    textColor: element.style?.textColor || element.textColor || styleDefaults.textColor,
    borderColor: element.style?.borderColor || element.borderColor || styleDefaults.borderColor
  };
  if (type === 'image' && isWatermarkImageElement({ ...element, content }) && element.style?.opacity === undefined && element.opacity === undefined) {
    style.opacity = 0.08;
  }
  if (invoiceManifestElement && type === 'divider' && !style.orientation && Number(element.height || 0) > Number(element.width || 0)) {
    style.orientation = 'vertical';
  }
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
    width: clampBuilderNumber(element.width, size.width, minWidth, builderCanvas.width),
    height: clampBuilderNumber(element.height, size.height, minHeight, builderCanvas.height),
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
    printSafe: invoiceManifestElement ? element.printSafe === true : element.printSafe !== false,
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
  const elementIdsByPage = new Map();
  const rememberPageElement = (pageId = 'page-1', itemId = '') => {
    const id = pageId || 'page-1';
    if (!elementIdsByPage.has(id)) elementIdsByPage.set(id, []);
    if (itemId && !elementIdsByPage.get(id).includes(itemId)) elementIdsByPage.get(id).push(itemId);
  };
  elements.forEach((element) => {
    const pageId = element.pageId || 'page-1';
    pageIds.add(pageId);
    usedPageIds.add(pageId);
    rememberPageElement(pageId, element.id);
  });
  sections.forEach((section) => {
    const pageId = section.pageId || 'page-1';
    pageIds.add(pageId);
    usedPageIds.add(pageId);
    rememberPageElement(pageId, section.id);
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
      elements: elementIdsByPage.get(id) || (Array.isArray(saved.elements) ? saved.elements : []),
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
    mode: source.mode === 'manifest' ? 'manifest' : (source.mode || 'legacy'),
    published: source.published === true,
    previewDraft: source.previewDraft === true,
    baseTemplateVersion: Number(source.baseTemplateVersion || 1),
    overrides: source.overrides && typeof source.overrides === 'object' ? source.overrides : {},
    lockedDefaultSections: true,
    visualElementMode: source.visualElementMode !== false,
    blank: source.blank === true,
    freeLayoutMode: source.freeLayoutMode === true,
    canvas: {
      size: 'A4',
      orientation: 'portrait',
      zoom: source.canvas?.zoom || 'fit-width',
      gridSize: clampBuilderNumber(source.canvas?.gridSize ?? source.gridSize, builderCanvas.gridSize, 4, 24),
      snap: source.canvas?.snap ?? source.snapToGrid ?? true
    },
    gridEnabled: source.gridEnabled === true,
    layoutGuides: source.layoutGuides === true || source.canvas?.layoutGuides === true,
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

function designStateFromManifest(manifest = {}, current = {}) {
  const manifestElements = Array.isArray(manifest.elements) ? manifest.elements : [];
  const elements = manifestElements.map((element, index) => normalizeBuilderElement({
    ...element,
    id: element.id || `manifest-element-${index + 1}`,
    pageId: element.pageId || `page-${element.page || 1}`,
    locked: element.locked === true,
    manifestSource: manifest.source || 'current-pdf-layout',
    manifestSemanticId: element.manifest?.semanticId || element.id || '',
    sourceKey: element.manifest?.semanticId || element.id || '',
    designGenerated: true
  }, index));
  const pages = Array.isArray(manifest.pages) && manifest.pages.length
    ? manifest.pages.map((page, index) => ({
      id: page.id || `page-${index + 1}`,
      name: page.name || `Page ${index + 1}`,
      elements: Array.isArray(page.elements)
        ? page.elements
        : elements.filter((element) => (element.pageId || 'page-1') === (page.id || `page-${index + 1}`)).map((element) => element.id),
      manifest: true
    }))
    : normalizeDesignPages({}, elements, []);
  return normalizeDesignState({
    ...current,
    mode: 'manifest',
    enabled: true,
    published: false,
    confirmed: false,
    blank: false,
    visualElementMode: true,
    freeLayoutMode: true,
    manifestKey: manifest.key || '',
    manifestSource: manifest.source || 'current-pdf-layout',
    manifestLabel: manifest.label || 'Current PDF layout',
    sections: [],
    elements,
    customElements: elements,
    pages,
    canvas: {
      ...(current.canvas || {}),
      size: 'A4',
      orientation: 'portrait',
      zoom: current.canvas?.zoom || 'fit-width'
    }
  });
}

function isPlaceholderDesignState(source = {}) {
  const rawElements = Array.isArray(source.customElements) && source.customElements.length
    ? source.customElements
    : Array.isArray(source.elements)
      ? source.elements
      : [];
  if (source.manifestSource === 'placeholder-adapter') return true;
  return rawElements.some((element) => (
    element?.manifestSource === 'placeholder-adapter'
    || element?.manifest?.source === 'placeholder-adapter'
    || String(element?.id || '').includes('safePlaceholder')
    || String(element?.manifestSemanticId || '').includes('safePlaceholder')
  ));
}

function configForDefaultPdfPreview(config = {}) {
  return {
    ...config,
    editMode: 'structured',
    design: {
      ...(config.design || {}),
      enabled: false,
      published: false,
      previewDraft: false
    }
  };
}

function elementIconForType(type = 'text') {
  return builderElementTypes.find((item) => item.type === normalizeElementType(type))?.icon || Type;
}

function elementPrimaryText(element = {}) {
  const content = element.content || {};
  if (element.type === 'table') return content.title || element.name || 'Table';
  if (element.type === 'icon') return content.label || content.iconName || element.name || 'Icon';
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
  const invoiceManifestElement = isInvoiceManifestElement(element);
  const borderWidth = clampBuilderNumber(style.borderWidth, 1, 0, 8);
  const elementColor = element.type === 'icon'
    ? (style.accentColor || style.textColor || '#0284c7')
    : (style.textColor || '#0f172a');
  return {
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    zIndex: element.zIndex || 20,
    color: elementColor,
    background: element.type === 'divider' ? 'transparent' : style.backgroundColor || '#ffffff',
    borderColor: selected ? '#0284c7' : style.borderColor || '#cbd5e1',
    borderRadius: element.type === 'divider' ? 0 : clampBuilderNumber(style.borderRadius, 10, 0, 32),
    borderWidth: element.type === 'divider' ? 0 : borderWidth,
    boxShadow: style.shadow ? '0 14px 28px rgba(15, 23, 42, 0.16)' : 'none',
    textAlign: style.alignment || element.alignment || 'left',
    fontSize: clampBuilderNumber(style.fontSize, 13, invoiceManifestElement ? 4 : 8, 32),
    fontWeight: style.fontWeight || 700,
    lineHeight: clampBuilderNumber(style.lineHeight, 1.16, 0.85, 2.4),
    padding: element.type === 'divider' ? 0 : (style.padding ?? '0.5rem'),
    opacity: clampBuilderNumber(style.opacity, 1, 0, 1)
  };
}

const draftPreviewRemoveSelectors = [
  '[data-editor-only]',
  '[data-helper]',
  '.design-helper',
  '.pdf-builder-helper',
  '.canvas-debug-label',
  '.pdf-floating-toolbar',
  '.pdf-inline-text-editor',
  '.pdf-element-grip',
  '.pdf-resize-handle',
  '.pdf-element-hit-area',
  '.pdf-element-lock',
  '.pdf-page-break-guide',
  '.pdf-canvas-reference',
  '.pdf-canvas-reference-shield',
  '.pdf-canvas-reference-empty',
  '.pdf-background-hit-target',
  '.pdf-canvas-empty',
  '.pdf-section-lock',
  '.pdf-section-overflow-warning'
];

const draftPreviewStateClasses = [
  'is-selected',
  'is-locked',
  'is-background-passthrough',
  'is-tiny-hit-target',
  'has-reference-layer',
  'has-grid',
  'show-layout-guides'
];

const draftPreviewHelperText = new Set([
  'Divider',
  'Spacer',
  'Add details here',
  'Image / Logo',
  'Text block',
  'New text block',
  'Card title',
  'Card',
  'Table',
  'Icon',
  'Click Reset to Default Design to load the editable PDF canvas.'
]);

const draftPreviewIconHelperText = new Set([
  ...[...draftPreviewHelperText].map((value) => String(value).trim().toLowerCase()),
  'dot',
  'phone',
  'address',
  'shield',
  'handshake',
  'hands hake',
  'a',
  'p',
  'e',
  'w',
  'c',
  'h'
]);

const draftPreviewStyleProperties = [
  'position',
  'inset',
  'top',
  'right',
  'bottom',
  'left',
  'z-index',
  'display',
  'grid-template-columns',
  'align-items',
  'justify-content',
  'place-items',
  'flex-direction',
  'flex-wrap',
  'flex',
  'gap',
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
  'margin',
  'padding',
  'box-sizing',
  'overflow',
  'opacity',
  'transform',
  'transform-origin',
  'color',
  'background',
  'background-color',
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-color',
  'border-style',
  'border-width',
  'border-radius',
  'box-shadow',
  'font',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-transform',
  'text-decoration',
  'white-space',
  'word-break',
  'overflow-wrap',
  'object-fit',
  'object-position',
  'vertical-align',
  'list-style',
  'fill',
  'stroke',
  'stroke-width'
];

function clearDraftHelperText(clone) {
  clone.querySelectorAll('.pdf-canvas-divider span, .pdf-canvas-spacer').forEach((node) => {
    node.textContent = '';
  });
  clone.querySelectorAll('.pdf-canvas-icon span').forEach((node) => {
    const text = String(node.textContent || '').trim().toLowerCase();
    if (draftPreviewIconHelperText.has(text)) node.textContent = '';
  });
  clone.querySelectorAll('*').forEach((node) => {
    if (node.children.length) return;
    const text = String(node.textContent || '').trim();
    if (draftPreviewHelperText.has(text)) node.textContent = '';
  });
}

function inlineDraftPreviewStyles(root) {
  const nodes = [root, ...root.querySelectorAll('*')];
  nodes.forEach((node) => {
    const computed = window.getComputedStyle(node);
    draftPreviewStyleProperties.forEach((property) => {
      const value = computed.getPropertyValue(property);
      if (value) node.style.setProperty(property, value, computed.getPropertyPriority(property));
    });
    node.style.setProperty('cursor', 'default');
    node.style.setProperty('user-select', 'none');
  });
}

function cssLengthValue(value, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? `${value}px` : fallback;
  const text = String(value).trim();
  if (!text) return fallback;
  const numeric = Number(text);
  return Number.isFinite(numeric) ? `${numeric}px` : text;
}

function applyDraftElementPrintOverrides(clone, design = {}) {
  const byId = new Map([
    ...(Array.isArray(design.sections) ? design.sections : []),
    ...(Array.isArray(design.elements) ? design.elements : [])
  ].map((item) => [String(item.id || ''), item]).filter(([id]) => id));
  byId.forEach((item, id) => {
    const node = clone.querySelector(`[data-pdf-layer-id="${pdfLayerSelectorValue(id)}"]`);
    if (!node) return;
    const style = item.style || {};
    node.style.left = cssLengthValue(item.x, node.style.left);
    node.style.top = cssLengthValue(item.y, node.style.top);
    node.style.width = cssLengthValue(item.width, node.style.width);
    node.style.height = cssLengthValue(item.height, node.style.height);
    if (Number.isFinite(Number(item.zIndex))) node.style.zIndex = String(Number(item.zIndex));
    node.style.position = 'absolute';
    node.style.outline = 'none';
    node.style.boxShadow = style.shadow ? node.style.boxShadow : 'none';
    node.style.background = item.type === 'divider' ? 'transparent' : (style.backgroundColor || node.style.background);
    node.style.color = item.type === 'icon'
      ? (style.accentColor || style.textColor || node.style.color)
      : (style.textColor || node.style.color);
    node.style.borderColor = item.type === 'divider' ? 'transparent' : (style.borderColor || node.style.borderColor);
    node.style.borderWidth = item.type === 'divider' ? '0px' : cssLengthValue(style.borderWidth, '0px');
    node.style.borderRadius = item.type === 'divider' ? '0px' : cssLengthValue(style.borderRadius, '0px');
    node.style.fontSize = cssLengthValue(style.fontSize, node.style.fontSize);
    node.style.fontWeight = style.fontWeight || node.style.fontWeight;
    node.style.lineHeight = Number.isFinite(Number(style.lineHeight)) ? String(Number(style.lineHeight)) : node.style.lineHeight;
    node.style.textAlign = style.alignment || item.alignment || node.style.textAlign;
    if (item.type !== 'divider') {
      const padding = style.padding ?? 0;
      node.style.padding = cssLengthValue(padding, '0px');
    }
    if (item.type === 'divider' || item.type === 'spacer') {
      node.querySelectorAll('*').forEach((child) => {
        child.textContent = '';
      });
    }
    if (item.type === 'image') {
      const img = node.querySelector('img');
      if (img) {
        const content = item.content || {};
        img.style.objectFit = ['contain', 'cover', 'fill'].includes(content.objectFit) ? content.objectFit : 'contain';
        img.style.objectPosition = content.objectPosition || 'center center';
      }
    }
  });
}

function resetDesignPrintPageStyles(page) {
  page.className = 'design-print-page';
  page.style.position = 'relative';
  page.style.width = `${builderCanvas.width}px`;
  page.style.height = `${builderCanvas.height}px`;
  page.style.margin = '0';
  page.style.padding = '0';
  page.style.overflow = 'hidden';
  page.style.background = '#ffffff';
  page.style.breakAfter = 'page';
  page.style.pageBreakAfter = 'always';
}

function resetDraftPageContentStyles(page) {
  page.classList.remove('pdf-draft-print-page');
  page.style.position = 'absolute';
  page.style.inset = '0 auto auto 0';
  page.style.left = '0';
  page.style.top = '0';
  page.style.width = `${builderCanvas.width}px`;
  page.style.height = `${builderCanvas.height}px`;
  page.style.minWidth = `${builderCanvas.width}px`;
  page.style.minHeight = `${builderCanvas.height}px`;
  page.style.maxWidth = `${builderCanvas.width}px`;
  page.style.maxHeight = `${builderCanvas.height}px`;
  page.style.margin = '0';
  page.style.padding = '0';
  page.style.overflow = 'hidden';
  page.style.transform = 'none';
  page.style.transformOrigin = 'top left';
  page.style.background = '#ffffff';
  page.style.boxShadow = 'none';
  page.style.border = '0';
  page.style.breakAfter = 'auto';
  page.style.pageBreakAfter = 'auto';
}

function buildDesignPrintDocumentClone(sourceRoot) {
  const sourcePages = sourceRoot?.matches?.('[data-pdf-print-page="true"], .pdf-a4-page')
    ? [sourceRoot]
    : [...(sourceRoot?.querySelectorAll?.('[data-pdf-print-page="true"], .pdf-a4-page') || [])];
  const documentClone = document.createElement('div');
  documentClone.className = 'design-print-document';
  documentClone.setAttribute('data-pdf-print-document', 'true');
  documentClone.style.width = `${builderCanvas.width}px`;
  documentClone.style.margin = '0';
  documentClone.style.padding = '0';
  documentClone.style.background = '#ffffff';
  documentClone.style.overflow = 'visible';
  const pages = sourcePages.length ? sourcePages : [sourceRoot].filter(Boolean);
  pages.forEach((sourcePage, index) => {
    const pageId = sourcePage.getAttribute?.('data-pdf-page-id') || `page-${index + 1}`;
    const section = document.createElement('section');
    resetDesignPrintPageStyles(section);
    section.setAttribute('data-pdf-print-page', 'true');
    section.setAttribute('data-pdf-page-id', pageId);
    section.setAttribute('data-pdf-page-index', String(index + 1));
    const pageClone = sourcePage.cloneNode(true);
    resetDraftPageContentStyles(pageClone);
    section.appendChild(pageClone);
    documentClone.appendChild(section);
  });
  return documentClone;
}

function buildDraftCanvasSnapshot(paper, design = {}, templateKey = 'invoice') {
  const pages = Array.isArray(design.pages) && design.pages.length ? design.pages : [{ id: 'page-1', name: 'Page 1' }];
  const meta = {
    width: builderCanvas.width,
    height: builderCanvas.height,
    templateKey,
    elementCount: (Array.isArray(design.elements) ? design.elements.length : 0) + (Array.isArray(design.sections) ? design.sections.length : 0),
    pageCount: pages.length
  };
  if (!paper || typeof document === 'undefined') {
    return { draftCanvasHtml: '', draftMeta: meta };
  }
  const clone = buildDesignPrintDocumentClone(paper);
  draftPreviewRemoveSelectors.forEach((selector) => clone.querySelectorAll(selector).forEach((node) => node.remove()));
  clone.classList.remove(...draftPreviewStateClasses);
  clone.querySelectorAll('*').forEach((node) => {
    node.classList?.remove?.(...draftPreviewStateClasses);
    node.removeAttribute('role');
    node.removeAttribute('tabindex');
    node.removeAttribute('aria-disabled');
  });
  const clonedPages = clone.querySelectorAll('.design-print-page');
  const pageCount = Math.max(1, clonedPages.length);
  meta.pageCount = pageCount;
  clone.style.width = `${builderCanvas.width}px`;
  clone.style.height = 'auto';
  clone.style.transform = 'none';
  clone.style.margin = '0';
  clone.style.padding = '0';
  clone.style.overflow = 'visible';
  clonedPages.forEach((page) => {
    resetDesignPrintPageStyles(page);
    const content = page.querySelector('.pdf-a4-page');
    if (content) resetDraftPageContentStyles(content);
  });
  clonedPages[clonedPages.length - 1]?.style.setProperty('break-after', 'auto');
  clonedPages[clonedPages.length - 1]?.style.setProperty('page-break-after', 'auto');
  applyDraftElementPrintOverrides(clone, design);
  clearDraftHelperText(clone);

  const sandbox = document.createElement('div');
  sandbox.setAttribute('aria-hidden', 'true');
  sandbox.style.position = 'fixed';
  sandbox.style.left = '-10000px';
  sandbox.style.top = '0';
  sandbox.style.width = `${builderCanvas.width}px`;
  sandbox.style.height = `${builderCanvas.height * pageCount}px`;
  sandbox.style.opacity = '0';
  sandbox.style.pointerEvents = 'none';
  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);
  try {
    inlineDraftPreviewStyles(clone);
    clone.style.width = `${builderCanvas.width}px`;
    clone.style.height = 'auto';
    clone.style.transform = 'none';
    clone.style.margin = '0';
    clone.style.padding = '0';
    clone.style.overflow = 'visible';
    const measuredPages = [...clone.querySelectorAll('.design-print-page')];
    measuredPages.forEach((page, index) => {
      resetDesignPrintPageStyles(page);
      const content = page.querySelector('.pdf-a4-page');
      if (content) resetDraftPageContentStyles(content);
      if (index === measuredPages.length - 1) {
        page.style.breakAfter = 'auto';
        page.style.pageBreakAfter = 'auto';
      }
    });
    applyDraftElementPrintOverrides(clone, design);
    return { draftCanvasHtml: clone.outerHTML, draftMeta: meta };
  } finally {
    sandbox.remove();
  }
}

function TemplateStatusPill({ status = 'Active' }) {
  return <span className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-500/15 px-2.5 py-1 text-xs font-black text-emerald-100">{status}</span>;
}

function TemplateCard({ template, canEdit, busyKey, onEdit, onPreview, onDownload, onReset }) {
  const previewBusy = String(busyKey || '').startsWith(`preview-${template.key}`);
  const downloadBusy = String(busyKey || '').startsWith(`download-${template.key}`);
  const resetBusy = busyKey === `reset-${template.key}`;
  const busy = Boolean(busyKey);
  const publishedDesignAvailable = template.config?.design?.published === true
    && template.config?.design?.publishedMeta?.templateKey === template.key;
  const livePreviewOptions = publishedDesignAvailable ? { intent: 'published' } : undefined;
  const livePreviewTitle = publishedDesignAvailable ? 'Shows the current published design.' : undefined;
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
          Edit Design
        </button>
        <button type="button" className="btn btn-secondary min-h-11" disabled={busy} onClick={() => onPreview(template, null, livePreviewOptions)} title={livePreviewTitle}>
          {previewBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          {previewBusy ? 'Loading...' : 'Preview PDF'}
        </button>
        <button type="button" className="btn btn-secondary min-h-11" disabled={busy} onClick={() => onDownload(template, null, livePreviewOptions)} title={livePreviewTitle}>
          {downloadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {downloadBusy ? 'Downloading...' : 'Download Sample PDF'}
        </button>
        <button type="button" className="btn btn-secondary min-h-11" disabled={!canEdit || busy} onClick={() => onReset(template)}>
          {resetBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Reset to Default Design
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

function versionActionLabel(action = '') {
  switch (action) {
    case 'before_publish_backup':
      return 'Before Publish Backup';
    case 'published_backup':
      return 'Published Backup';
    case 'draft_saved':
      return 'Draft Saved';
    case 'restored_as_draft':
    case 'restore_as_draft':
      return 'Restored as Draft';
    case 'restored':
      return 'Restored';
    case 'reset':
      return 'Reset';
    case 'updated':
      return 'Updated';
    default:
      return action ? action.replace(/_/g, ' ') : 'Saved Version';
  }
}

function formatVersionDateTime(value) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date).replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase());
}

function formatVersionDate(value) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function versionEditedBy(version = {}) {
  return version.editedBy?.name || version.editedBy?.username || 'System default';
}

function versionSummary(version = {}) {
  return `${versionActionLabel(version.action)} - ${formatVersionDateTime(version.editedAt)} - ${versionEditedBy(version)}`;
}

function versionLifecycleLabel(version = {}) {
  const action = String(version.action || '').toLowerCase();
  if (action.includes('draft')) return 'Draft';
  if (action.includes('publish') || action.includes('published')) return 'Published';
  if (action.includes('restore')) return 'Draft';
  return 'Saved';
}

function versionDisplayName(version = {}) {
  const customName = String(version.displayName || '').trim();
  if (customName) return customName;
  const lifecycle = versionLifecycleLabel(version);
  if (lifecycle === 'Draft') return 'Draft';
  if (lifecycle === 'Published') return 'Published Design';
  return versionActionLabel(version.action);
}

function versionMetaLine(version = {}) {
  return `${formatVersionDate(version.editedAt)} \u2022 ${versionEditedBy(version)}`;
}

function versionKey(version = {}) {
  return String(version.id || version.version || '');
}

function VersionHistoryHeader({ versions, onClose = null, compact = false }) {
  const count = versions.length;
  return (
    <div className={`pdf-version-panel-header ${compact ? 'is-compact' : ''}`}>
      <div className="admin-control-icon"><History className="h-5 w-5" /></div>
      <div className="pdf-version-panel-title">
        <div className="pdf-version-title-row">
          <h3>Saved Versions</h3>
          <span className="pdf-version-count-badge">{count} {count === 1 ? 'version' : 'versions'}</span>
        </div>
        <p>Restore opens a version as draft. Publish to make it live.</p>
      </div>
      {onClose ? (
        <button type="button" className="icon-button pdf-version-close-button" onClick={onClose} title="Close saved versions" aria-label="Close saved versions">
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function VersionHistoryRow({
  version,
  isLatest = false,
  restoring,
  onRestore,
  onRenameVersion,
  onDeleteVersion,
  deletingVersionId = ''
}) {
  const key = versionKey(version);
  const displayName = versionDisplayName(version);
  const deleting = deletingVersionId === key;
  const disabled = restoring || deleting || Boolean(deletingVersionId);
  return (
    <div className={`pdf-version-card ${isLatest ? 'is-latest' : ''}`}>
      <div className="pdf-version-card-main">
        <div className="pdf-version-identity">
          <span className="pdf-version-number-badge">v{version.version}</span>
          <div className="pdf-version-copy">
            <div className="pdf-version-name-row">
              <p title={displayName} tabIndex={0}>{displayName}</p>
              {isLatest ? <span className="pdf-version-latest-badge">Latest</span> : null}
            </div>
            <small>{versionMetaLine(version)}</small>
          </div>
        </div>
      </div>
      <div className="pdf-version-actions">
        {onRenameVersion ? (
          <button type="button" className="btn btn-secondary pdf-version-action-button" disabled={disabled} onClick={() => onRenameVersion(version)}>
            <Edit3 className="h-3.5 w-3.5" />
            Rename
          </button>
        ) : null}
        <button type="button" className="btn btn-secondary pdf-version-action-button" disabled={disabled} onClick={() => onRestore(version)}>
          <RotateCcw className="h-3.5 w-3.5" />
          Restore
        </button>
        {onDeleteVersion ? (
          <button
            type="button"
            className="icon-button pdf-version-delete-button"
            disabled={restoring || deleting || Boolean(deletingVersionId)}
            onClick={() => onDeleteVersion(version)}
            title="Delete saved version"
            aria-label={`Delete version v${version.version}`}
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function VersionHistoryPanel({ versions, restoring, onRestore, onRenameVersion, onDeleteVersion, deletingVersionId = '' }) {
  return (
    <section className="surface admin-control-card pdf-version-history-panel p-4">
      <VersionHistoryHeader versions={versions} />
      <div className="mt-4 grid gap-2">
        {versions.length ? versions.slice(0, 4).map((version, index) => (
          <VersionHistoryRow
            key={version.id || version.version}
            version={version}
            isLatest={index === 0}
            restoring={restoring}
            onRestore={onRestore}
            onRenameVersion={onRenameVersion}
            onDeleteVersion={onDeleteVersion}
            deletingVersionId={deletingVersionId}
          />
        )) : <p className="rounded-card border border-white/10 bg-white/[0.035] p-3 text-sm muted">Previous versions will appear after the first edit.</p>}
      </div>
    </section>
  );
}

function RenameVersionModal({ version, saving, onCancel, onConfirm }) {
  const [name, setName] = useState(() => versionDisplayName(version));
  const portalTarget = typeof document === 'undefined' ? null : document.body;
  const trimmedName = name.trim();
  function submitRename(event = null) {
    event?.preventDefault?.();
    if (!trimmedName || saving) return;
    onConfirm(trimmedName);
  }
  if (!portalTarget) return null;
  return createPortal(
    <div className="pdf-modal-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onCancel();
    }}>
      <form className="pdf-rename-version-modal" onSubmit={submitRename}>
        <div className="pdf-advanced-modal-header">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Version v{version.version}</p>
            <h3>Rename Version</h3>
          </div>
          <button type="button" className="icon-button" onClick={onCancel} disabled={saving} aria-label="Close rename version">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="pdf-rename-version-body">
          <label className="pdf-control-field">
            <span className="label">Version name</span>
            <input
              className="input"
              value={name}
              maxLength={120}
              autoFocus
              disabled={saving}
              onChange={(event) => setName(event.target.value)}
              placeholder="Final Invoice Layout"
            />
          </label>
          {!trimmedName ? <p className="pdf-rename-version-error">Enter a version name to continue.</p> : null}
        </div>
        <div className="pdf-advanced-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={saving || !trimmedName} onClick={submitRename}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Name
          </button>
        </div>
      </form>
    </div>,
    portalTarget
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
              <p className="mt-1 text-sm muted">Enable custom sections/cards in Advanced Layout to show custom cards in the backup PDF.</p>
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
            <p className="mt-1 text-xs muted">Add optional cards after the fixed PDF sections. Backup preview uses your current local edits before Save Template.</p>
          </div>
        </div>
        <button type="button" className="btn btn-secondary h-9 px-3 py-1.5 text-xs" onClick={() => setOpen((current) => !current)}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {open ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {open ? (
        <>
      <div className="pdf-custom-status-strip">
        <span className="pdf-state-badge is-on">Custom cards enabled</span>
        <span className="pdf-state-badge is-visible">Visible in backup preview</span>
        <p>Advanced Layout and Custom Sections/Cards are on. Visible cards render in Backup Layout Preview immediately and persist after Save Template. Empty cards are hidden from Backup PDF until content is added.</p>
      </div>
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
          const variableLabel = isQr ? 'Optional QR text/value' : isSignature ? 'Signature image URL or backup text' : 'Optional variable value';
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
                {card.enabled !== false ? <span className="pdf-state-badge is-visible">Visible in backup preview</span> : null}
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
  onRenameVersion,
  onDeleteVersion,
  deletingVersionId = '',
  hasUnsavedDesignChanges,
  previewUrl,
  previewLoading,
  previewError,
  token,
  onBack,
  onPreview,
  onDownload,
  onPublishDesign,
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
  const gridEnabled = canvasDesign.gridEnabled === true;
  const layoutGuidesEnabled = canvasDesign.layoutGuides === true;
  const freeLayoutMode = canvasDesign.freeLayoutMode === true;
  const [activeRail, setActiveRail] = useState('');
  const [selectedLayerId, setSelectedLayerId] = useState('');
  const [currentPageId, setCurrentPageId] = useState(pages[0]?.id || 'page-1');
  const [zoom, setZoom] = useState(canvasDesign.canvas.zoom === 'fit' ? 'fit-width' : canvasDesign.canvas.zoom || 'fit-width');
  const [variableQuery, setVariableQuery] = useState('');
  const [activeInspectorTab, setActiveInspectorTab] = useState('content');
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [rightInspectorOpen, setRightInspectorOpen] = useState(false);
  const [fullScreenEditor, setFullScreenEditor] = useState(true);
  const [showReferenceLayer, setShowReferenceLayer] = useState(false);
  const [selectBackgroundElements, setSelectBackgroundElements] = useState(false);
  const [toolbarMoreOpen, setToolbarMoreOpen] = useState(false);
  const [floatingToolbarPosition, setFloatingToolbarPosition] = useState({ ready: false, left: 12, top: 12, placement: 'above' });
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [interaction, setInteraction] = useState(null);
  const [editingElementId, setEditingElementId] = useState('');
  const [manifestState, setManifestState] = useState({ loading: false, error: '', data: null });
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false);
  const [deleteSavedTemplateCandidate, setDeleteSavedTemplateCandidate] = useState(null);
  const paperRef = useRef(null);
  const printSnapshotRef = useRef(null);
  const designDraftRef = useRef(designDraft);
  const variableCursorRef = useRef(null);
  const clipboardLayerRef = useRef(null);
  const manifestDefaultAppliedRef = useRef('');
  const freeLayoutWarningShownRef = useRef(false);
  const normalizedSignature = stableJson(normalizedDesign);
  const rawDesignSignature = stableJson(designDraft);
  const draftSignature = stableJson(draft);

  useEffect(() => {
    designDraftRef.current = designDraft;
  }, [designDraft]);

  useEffect(() => {
    if (rawDesignSignature !== normalizedSignature) setDesignDraft(normalizedDesign);
  }, [rawDesignSignature, normalizedSignature, normalizedDesign, setDesignDraft]);

  useEffect(() => {
    setUndoStack([]);
    setRedoStack([]);
    setSelectedLayerId('');
    setCurrentPageId('page-1');
    setActiveRail('');
    setRightInspectorOpen(false);
    setShowReferenceLayer(false);
    setSelectBackgroundElements(false);
    setToolbarMoreOpen(false);
    setFloatingToolbarPosition({ ready: false, left: 12, top: 12, placement: 'above' });
    setManifestState({ loading: false, error: '', data: null });
  }, [template.key]);

  useEffect(() => {
    let cancelled = false;
    async function loadManifest() {
      setManifestState((current) => ({ ...current, loading: true, error: '' }));
      try {
        const response = await fetch(`${apiBase}/pdf-templates/${template.key}/manifest`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ config: configForDefaultPdfPreview(draft), previewIntent: 'default' })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || 'PDF layout manifest failed to load');
        if (!cancelled) setManifestState({ loading: false, error: '', data: payload.manifest || null });
      } catch (err) {
        if (!cancelled) setManifestState({ loading: false, error: err.message || 'PDF layout manifest failed to load', data: null });
      }
    }
    loadManifest();
    return () => {
      cancelled = true;
    };
  }, [template.key, token, draftSignature]);

  useEffect(() => {
    const manifest = manifestState.data;
    if (!manifest?.elements?.length || manifest.source === 'placeholder-adapter') return;
    const sourceDesign = designStateFromConfig(draft);
    const currentDesign = normalizeDesignState(designDraftRef.current || {});
    const sourceHasRealManifest = sourceDesign.mode === 'manifest'
      && sourceDesign.elements.length
      && !isPlaceholderDesignState(sourceDesign);
    const currentHasRealManifest = currentDesign.mode === 'manifest'
      && currentDesign.elements.length
      && !isPlaceholderDesignState(currentDesign);
    const shouldReplacePlaceholder = isPlaceholderDesignState(sourceDesign) || isPlaceholderDesignState(currentDesign);
    if (sourceHasRealManifest || (currentHasRealManifest && !shouldReplacePlaceholder)) return;
    if ((sourceDesign.elements?.length || currentDesign.elements?.length) && !shouldReplacePlaceholder) return;
    const applyKey = `${template.key}:${draftSignature}:${manifest.key || ''}:${manifest.elements.length}`;
    if (manifestDefaultAppliedRef.current === applyKey) return;
    manifestDefaultAppliedRef.current = applyKey;
    const manifestDesign = designStateFromManifest(manifest, {
      ...sourceDesign,
      savedTemplates: currentDesign.savedTemplates || sourceDesign.savedTemplates || [],
      canvas: currentDesign.canvas || sourceDesign.canvas || {}
    });
    setDesignDraft(manifestDesign);
  }, [manifestState.data, template.key, draft, draftSignature, setDesignDraft]);

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
  const elementLayers = elements.map((element, index) => {
    const backgroundElement = isBackgroundElement(element);
    const title = cleanPdfElementLayerTitle(element);
    return {
      id: element.id || `element-${index}`,
      name: title,
      title,
      kind: 'element',
      type: element.type,
      badge: backgroundElement ? 'Background' : elementNameForType(element.type),
      pageId: element.pageId || 'page-1',
      locked: element.locked === true,
      editable: true,
      supportsVisibility: true,
      supportsTitle: true,
      supportsIcon: false,
      visible: element.visible !== false && element.enabled !== false,
      role: 'custom',
      backgroundElement,
      element,
      elementIndex: index
    };
  });
  const layers = [...sectionLayers, ...elementLayers];
  const layerSignature = layers.map((layer) => layer.id).join('|');
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) || null;
  const selectedElement = selectedLayer?.kind === 'element' ? selectedLayer.element : null;
  const selectedSectionLayer = selectedLayer?.kind === 'section' ? selectedLayer : null;
  const selectedSection = selectedSectionLayer?.sectionDesign || null;
  const selectedFrame = selectedElement || selectedSection;
  const selectedLayerLocked = selectedElement
    ? selectedElement.locked === true
    : selectedSection
      ? selectedSection.locked === true || !freeLayoutMode
      : false;
  const selectedLayerBackground = selectedElement ? isBackgroundElement(selectedElement) : false;
  const selectedCanEditFrame = selectedElement
    ? !disabled && selectedElement.locked !== true
    : selectedSection
      ? !disabled && freeLayoutMode && selectedSection.locked !== true
      : false;
  const currentPage = pages.find((page) => page.id === currentPageId) || pages[0] || { id: 'page-1', name: 'Page 1' };
  const currentPageIndex = Math.max(0, pages.findIndex((page) => page.id === currentPage.id));
  const referencePdfUrl = previewUrl ? `${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&page=${currentPageIndex + 1}` : '';
  const activeReferencePdfUrl = showReferenceLayer ? referencePdfUrl : '';
  const zoomScale = zoom === '125' ? 1.25 : zoom === '100' ? 1 : zoom === '75' ? 0.75 : zoom === 'fit-width' ? 1.1 : 0.88;
  const hasSavedDesignDraft = Boolean(draft?.designDraft);
  const previewConfig = useMemo(() => mergeDesignStateForSave(draft, canvasDesign, { previewDraft: true }), [draft, canvasDesign]);
  const defaultPreviewConfig = useMemo(() => configForDefaultPdfPreview(draft), [draft]);
  const defaultPreviewBusy = busyKey === `preview-${template.key}-default`;
  const draftPreviewBusy = busyKey === `preview-${template.key}-draft`;
  const draftDownloadBusy = busyKey === `download-${template.key}-draft`;
  const visiblePageSections = canvasSections
    .filter((section) => (section.pageId || 'page-1') === currentPage.id && section.visible !== false && section.enabled !== false)
    .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  const visiblePageElements = elements
    .filter((element) => (element.pageId || 'page-1') === currentPage.id && element.visible !== false && element.enabled !== false)
    .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  const selectedElementOnCurrentPage = selectedElement && (selectedElement.pageId || 'page-1') === currentPage.id ? selectedElement : null;
  const floatingToolbarVisible = Boolean(
    selectedElementOnCurrentPage
    && selectedLayer
    && !toolbarMoreOpen
    && activeRail !== 'history'
    && !publishConfirmOpen
    && !revertConfirmOpen
  );

  function clearSelectedLayer() {
    setSelectedLayerId('');
    setEditingElementId('');
    setFloatingToolbarPosition({ ready: false, left: 12, top: 12, placement: 'above' });
  }

  function previewDefaultPdf() {
    // Default preview intentionally disables design flags so it stays on the structured invoice PDF path.
    onPreview(template, defaultPreviewConfig, { intent: 'default' });
  }

  function confirmApplyDefaultTemplateLayout() {
    if (!window.confirm('Reset the editable design canvas to the default template layout? Unsaved canvas changes will be replaced.')) return;
    applyDefaultTemplateLayout();
  }

  function previewDraftPdf() {
    // Draft preview intentionally sets design.previewDraft without publishing the design.
    const snapshot = buildDraftCanvasSnapshot(printSnapshotRef.current || paperRef.current, canvasDesign, template.key);
    onPreview(template, previewConfig, { intent: 'draft', ...snapshot });
  }

  function downloadDraftPdf() {
    const snapshot = buildDraftCanvasSnapshot(printSnapshotRef.current || paperRef.current, canvasDesign, template.key);
    onDownload(template, previewConfig, { intent: 'draft', ...snapshot });
  }

  function refreshFloatingToolbarPosition() {
    if (!floatingToolbarVisible || !selectedElementOnCurrentPage || typeof window === 'undefined') {
      setFloatingToolbarPosition((current) => current.ready ? { ready: false, left: 12, top: 12, placement: 'above' } : current);
      return;
    }
    const paper = paperRef.current;
    const anchor = paper?.querySelector(`[data-pdf-layer-id="${pdfLayerSelectorValue(selectedLayerId)}"]`);
    if (!anchor) {
      setFloatingToolbarPosition({ ready: false, left: 12, top: 12, placement: 'above' });
      return;
    }
    const anchorRect = anchor.getBoundingClientRect();
    const scrollRect = paper?.closest('.pdf-canvas-scroll')?.getBoundingClientRect();
    const toolbarRect = document.querySelector(`[data-pdf-floating-toolbar-id="${pdfLayerSelectorValue(selectedLayerId)}"]`)?.getBoundingClientRect();
    const margin = 12;
    const gap = 10;
    const toolbarWidth = Math.min(toolbarRect?.width || (selectedElementOnCurrentPage?.type === 'table' ? 560 : 480), window.innerWidth - margin * 2);
    const toolbarHeight = toolbarRect?.height || 42;
    const visibleTop = Math.max(margin, scrollRect?.top ?? margin);
    const visibleBottom = Math.min(window.innerHeight - margin, scrollRect?.bottom ?? window.innerHeight - margin);
    const visibleLeft = Math.max(margin, scrollRect?.left ?? margin);
    const visibleRight = Math.min(window.innerWidth - margin, scrollRect?.right ?? window.innerWidth - margin);
    let top = anchorRect.top - toolbarHeight - gap;
    let placement = 'above';
    if (top < visibleTop) {
      top = anchorRect.bottom + gap;
      placement = 'below';
    }
    if (top + toolbarHeight > visibleBottom) {
      const aboveTop = anchorRect.top - toolbarHeight - gap;
      const belowTop = anchorRect.bottom + gap;
      const roomAbove = anchorRect.top - visibleTop;
      const roomBelow = visibleBottom - anchorRect.bottom;
      if (roomAbove >= roomBelow) {
        top = Math.max(visibleTop, aboveTop);
        placement = 'above';
      } else {
        top = Math.min(belowTop, Math.max(visibleTop, visibleBottom - toolbarHeight));
        placement = 'below';
      }
    }
    top = clampBuilderNumber(top, visibleTop, visibleTop, Math.max(visibleTop, visibleBottom - toolbarHeight));
    const centeredLeft = anchorRect.left + anchorRect.width / 2 - toolbarWidth / 2;
    const left = clampBuilderNumber(centeredLeft, visibleLeft, visibleLeft, Math.max(visibleLeft, visibleRight - toolbarWidth));
    setFloatingToolbarPosition({ ready: true, left: Math.round(left), top: Math.round(top), placement });
  }

  useEffect(() => {
    if (selectedLayerId && !layers.some((layer) => layer.id === selectedLayerId)) setSelectedLayerId('');
  }, [selectedLayerId, layerSignature]);

  useEffect(() => {
    if (selectedLayerId) setInspectorCollapsed(false);
  }, [selectedLayerId]);

  useEffect(() => {
    if (!floatingToolbarVisible || !selectedElementOnCurrentPage || typeof window === 'undefined') {
      setFloatingToolbarPosition({ ready: false, left: 12, top: 12, placement: 'above' });
      return undefined;
    }
    let frameId = 0;
    let secondFrameId = 0;
    const schedule = () => {
      window.cancelAnimationFrame(frameId);
      window.cancelAnimationFrame(secondFrameId);
      frameId = window.requestAnimationFrame(() => {
        refreshFloatingToolbarPosition();
        secondFrameId = window.requestAnimationFrame(refreshFloatingToolbarPosition);
      });
    };
    schedule();
    const scrollContainer = paperRef.current?.closest('.pdf-canvas-scroll');
    scrollContainer?.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.cancelAnimationFrame(secondFrameId);
      scrollContainer?.removeEventListener('scroll', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [
    selectedLayerId,
    selectedFrame?.x,
    selectedFrame?.y,
    selectedFrame?.width,
    selectedFrame?.height,
    selectedFrame?.zIndex,
    selectedElementOnCurrentPage?.type,
    floatingToolbarVisible,
    zoomScale,
    activeRail,
    rightInspectorOpen,
    inspectorCollapsed,
    fullScreenEditor,
    selectBackgroundElements,
    currentPageId,
    interaction?.id,
    interaction?.mode
  ]);

  useEffect(() => {
    if (!toolbarMoreOpen || typeof window === 'undefined') return undefined;
    const closeOnPointerDown = (event) => {
      if (event.target?.closest?.('.pdf-builder-more-menu-wrap')) return;
      setToolbarMoreOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setToolbarMoreOpen(false);
    };
    window.addEventListener('pointerdown', closeOnPointerDown);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeOnPointerDown);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [toolbarMoreOpen]);

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

  function appendHistorySnapshot(history, snapshot) {
    const normalizedSnapshot = normalizeDesignState(snapshot);
    if (history.length && stableJson(history[history.length - 1]) === stableJson(normalizedSnapshot)) return history;
    return [...history.slice(-24), normalizedSnapshot];
  }

  function rememberUndoSnapshot(snapshot) {
    setUndoStack((history) => appendHistorySnapshot(history, snapshot));
    setRedoStack([]);
  }

  function minFrameSizeForItem(item = {}, kind = 'element') {
    if (kind === 'section') return { width: 80, height: 32 };
    return isInvoiceManifestElement(item) ? { width: 0.1, height: 0.1 } : defaultSizeForElement(item.type || 'text');
  }

  function constrainFramePatch(item = {}, patch = {}, kind = 'element') {
    if (!hasFramePatch(patch)) return patch;
    const minSize = minFrameSizeForItem(item, kind);
    const currentWidth = Number(item.width || minSize.width);
    const currentHeight = Number(item.height || minSize.height);
    const width = Object.prototype.hasOwnProperty.call(patch, 'width')
      ? clampBuilderNumber(patch.width, currentWidth, minSize.width, builderCanvas.width)
      : currentWidth;
    const height = Object.prototype.hasOwnProperty.call(patch, 'height')
      ? clampBuilderNumber(patch.height, currentHeight, minSize.height, builderCanvas.height)
      : currentHeight;
    let x = Object.prototype.hasOwnProperty.call(patch, 'x') ? Number(patch.x) : Number(item.x || 0);
    let y = Object.prototype.hasOwnProperty.call(patch, 'y') ? Number(patch.y) : Number(item.y || 0);
    if (!Number.isFinite(x)) x = Number(item.x || 0);
    if (!Number.isFinite(y)) y = Number(item.y || 0);
    if (!freeLayoutMode) {
      x = clampBuilderNumber(x, 0, 0, Math.max(0, builderCanvas.width - width));
      y = clampBuilderNumber(y, 0, 0, Math.max(0, builderCanvas.height - height));
    }
    return {
      ...patch,
      x,
      y,
      width,
      height
    };
  }

  function commitDesign(updater) {
    if (disabled) return;
    setDesignDraft((current) => {
      const currentDesign = currentCanvasDesign(current);
      const next = typeof updater === 'function' ? updater(currentDesign) : updater;
      const normalizedNext = normalizeDesignState(next);
      if (stableJson(currentDesign) === stableJson(normalizedNext)) return current;
      rememberUndoSnapshot(currentDesign);
      return normalizedNext;
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
        const constrainedPatch = hasFramePatch(patchValue) ? constrainFramePatch(element, patchValue, 'element') : patchValue;
        const merged = {
          ...element,
          ...constrainedPatch,
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
        const constrainedPatch = hasFramePatch(patchValue) ? constrainFramePatch(element, patchValue, 'element') : patchValue;
        return normalizeBuilderElement({ ...element, ...constrainedPatch }, index);
      });
      return { ...current, elements: nextElements, customElements: nextElements };
    });
  }

  function patchSection(sectionId, patch) {
    commitDesign((current) => {
      const nextSections = current.sections.map((section, index) => {
        if (section.id !== sectionId) return section;
        const patchValue = typeof patch === 'function' ? patch(section) : patch;
        const constrainedPatch = hasFramePatch(patchValue) ? constrainFramePatch(section, patchValue, 'section') : patchValue;
        const frameEdited = hasFramePatch(patchValue);
        const merged = {
          ...section,
          ...constrainedPatch,
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
        const constrainedPatch = hasFramePatch(patchValue) ? constrainFramePatch(section, patchValue, 'section') : patchValue;
        const frameEdited = hasFramePatch(patchValue);
        return normalizeBuilderSection({
          ...section,
          ...constrainedPatch,
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
  }

  function applyDefaultTemplateLayout() {
    if (disabled) return;
    const livePublishedDesign = designStateFromConfig({ design: template.config?.design || {} });
    if (
      template.key === 'invoice'
      && livePublishedDesign.published === true
      && livePublishedDesign.mode === 'manifest'
      && livePublishedDesign.elements.length
    ) {
      const draftFromPublished = normalizeDesignState({
        ...livePublishedDesign,
        enabled: true,
        confirmed: false,
        published: false,
        previewDraft: false,
        savedTemplates: canvasDesign.savedTemplates || livePublishedDesign.savedTemplates || []
      });
      commitDesign((current) => ({
        ...draftFromPublished,
        savedTemplates: current.savedTemplates || draftFromPublished.savedTemplates || []
      }));
      setSelectedLayerId('');
      setCurrentPageId(draftFromPublished.pages?.[0]?.id || 'page-1');
      setActiveRail('');
      return;
    }
    if (manifestState.data?.elements?.length) {
      const manifestDesign = designStateFromManifest(manifestState.data, {
        savedTemplates: canvasDesign.savedTemplates || [],
        canvas: canvasDesign.canvas || {}
      });
      commitDesign((current) => ({
        ...manifestDesign,
        savedTemplates: current.savedTemplates || []
      }));
      setSelectedLayerId('');
      setCurrentPageId(manifestDesign.pages?.[0]?.id || 'page-1');
      setActiveRail('');
      return;
    }
    const defaultSections = buildDefaultTemplateSections(template, sections, draft);
    const defaultElements = visualElementsFromSections(defaultSections, template, draft);
    commitDesign((current) => ({
      ...current,
      blank: false,
      visualElementMode: true,
      freeLayoutMode: false,
      sections: [],
      elements: defaultElements,
      customElements: defaultElements,
      pages: normalizeDesignPages(current, defaultElements, [])
    }));
    setSelectedLayerId('');
    setCurrentPageId('page-1');
    setActiveRail('');
  }

  function revertDraftDesign() {
    const sourceDesign = designStateFromConfig(draft);
    if (template.key === 'invoice' && manifestState.data?.elements?.length) {
      setDesignDraft(designStateFromManifest(manifestState.data, {
        savedTemplates: sourceDesign.savedTemplates || [],
        canvas: sourceDesign.canvas || {}
      }));
    } else if (sourceDesign.published === true && sourceDesign.mode === 'manifest' && sourceDesign.elements.length && !isPlaceholderDesignState(sourceDesign)) {
      setDesignDraft(sourceDesign);
    } else if (manifestState.data?.elements?.length) {
      setDesignDraft(designStateFromManifest(manifestState.data, sourceDesign));
    } else {
      setDesignDraft(sourceDesign);
    }
    setUndoStack([]);
    setRedoStack([]);
    setSelectedLayerId('');
    setCurrentPageId('page-1');
    setActiveRail('');
  }

  function startBlankDesign() {
    if (disabled) return;
    if (!window.confirm('Start from a blank A4 design? Existing canvas elements in this unsaved draft will be cleared.')) return;
    commitDesign((current) => ({
      ...current,
      blank: true,
      visualElementMode: true,
      freeLayoutMode: true,
      sections: [],
      elements: [],
      customElements: [],
      pages: [{ id: 'page-1', name: 'Blank A4', elements: [] }]
    }));
    setSelectedLayerId('');
    setCurrentPageId('page-1');
    setActiveRail('');
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
    setDeleteSavedTemplateCandidate(null);
  }

  function duplicateElement(element) {
    if (!element || disabled) return;
    const copy = normalizeBuilderElement({
      ...cloneValue(element),
      id: `element-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: `${element.name || 'Element'} Copy`,
      x: Math.min(builderCanvas.width - 24, element.x + 18),
      y: Math.min(builderCanvas.height - 12, element.y + 18),
      zIndex: duplicateZIndexForElement(element, elements)
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

  function patchSelectedLayerFrame(patch) {
    if (!selectedFrame || !selectedCanEditFrame) return;
    if (selectedElement) patchElement(selectedElement.id, patch);
    else if (selectedSection) patchSection(selectedSection.id, patch);
  }

  function duplicateSelectedLayer() {
    if (selectedLayerLocked) return;
    if (selectedElement) duplicateElement(selectedElement);
    else if (selectedSection) duplicateSection(selectedSection);
  }

  function deleteSelectedLayer() {
    if (selectedElement) deleteElement(selectedElement.id);
    else if (selectedSection?.system === false) deleteSection(selectedSection.id);
  }

  function moveSelectedElementToPage(pageId) {
    if (!selectedElement || selectedElement.locked || disabled || !pages.some((page) => page.id === pageId)) return;
    patchElement(selectedElement.id, { pageId });
    setCurrentPageId(pageId);
  }

  function moveSelectedElementToNextPage() {
    if (!selectedElement) return;
    const sourcePageId = selectedElement.pageId || 'page-1';
    const sourceIndex = pages.findIndex((page) => page.id === sourcePageId);
    const nextPage = pages[sourceIndex + 1];
    if (nextPage) moveSelectedElementToPage(nextPage.id);
  }

  function duplicateSelectedElementToAllPages() {
    if (!selectedElement || selectedElement.locked || disabled) return;
    if (!(selectedElement.type === 'image' || isBackgroundElement(selectedElement))) return;
    commitDesign((current) => {
      const sourcePageId = selectedElement.pageId || 'page-1';
      const identity = selectedElement.groupId || selectedElement.content?.imageMode || selectedElement.name || selectedElement.id;
      const copies = current.pages
        .filter((page) => page.id !== sourcePageId)
        .filter((page) => !current.elements.some((element) => {
          if ((element.pageId || 'page-1') !== page.id || element.type !== selectedElement.type) return false;
          const elementIdentity = element.groupId || element.content?.imageMode || element.name || element.id;
          return elementIdentity === identity;
        }))
        .map((page, index) => normalizeBuilderElement({
          ...cloneValue(selectedElement),
          id: `element-${Date.now()}-${page.id}-${index}`,
          pageId: page.id,
          zIndex: duplicateZIndexForElement(selectedElement, current.elements)
        }, current.elements.length + index));
      if (!copies.length) return current;
      const nextElements = [...current.elements, ...copies];
      return {
        ...current,
        elements: nextElements,
        customElements: nextElements,
        pages: normalizeDesignPages(current, nextElements, current.sections)
      };
    });
  }

  function copySelectedLayerToClipboard() {
    if (selectedElement) {
      clipboardLayerRef.current = { kind: 'element', item: cloneValue(selectedElement) };
      return;
    }
    if (selectedSection) {
      clipboardLayerRef.current = { kind: 'section', item: cloneValue(selectedSection) };
    }
  }

  function pasteClipboardLayer() {
    if (disabled || !clipboardLayerRef.current?.item) return;
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    if (clipboardLayerRef.current.kind === 'element') {
      const copy = normalizeBuilderElement({
        ...cloneValue(clipboardLayerRef.current.item),
        id: `element-${stamp}`,
        name: `${clipboardLayerRef.current.item.name || 'Element'} Copy`,
        pageId: currentPage.id,
        x: Math.min(builderCanvas.width - 24, Number(clipboardLayerRef.current.item.x || 0) + 18),
        y: Math.min(builderCanvas.height - 12, Number(clipboardLayerRef.current.item.y || 0) + 18),
        zIndex: duplicateZIndexForElement(clipboardLayerRef.current.item, elements)
      }, elements.length);
      commitDesign((current) => {
        const nextElements = [...current.elements, copy];
        return { ...current, elements: nextElements, customElements: nextElements };
      });
      setSelectedLayerId(copy.id);
      return;
    }
    const copy = normalizeBuilderSection({
      ...cloneValue(clipboardLayerRef.current.item),
      id: `section-${stamp}`,
      sourceKey: '',
      sourceIndex: undefined,
      system: false,
      locked: false,
      rendererFrame: false,
      layoutSource: 'custom',
      name: `${clipboardLayerRef.current.item.name || clipboardLayerRef.current.item.title || 'Section'} Copy`,
      title: `${clipboardLayerRef.current.item.title || clipboardLayerRef.current.item.name || 'Section'} Copy`,
      pageId: currentPage.id,
      x: Math.min(builderCanvas.width - 24, Number(clipboardLayerRef.current.item.x || 0) + 18),
      y: Math.min(builderCanvas.height - 12, Number(clipboardLayerRef.current.item.y || 0) + 18),
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
  }

  function toggleSelectedLayerLock() {
    if (!selectedLayer || disabled) return;
    if (selectedElement) {
      patchElement(selectedElement.id, { locked: !selectedElement.locked });
      return;
    }
    if (selectedSection && freeLayoutMode) {
      patchSection(selectedSection.id, { locked: !selectedSection.locked });
    }
  }

  function bringSelectedLayerForward() {
    if (!selectedFrame || !selectedCanEditFrame) return;
    if (selectedElement && isBackgroundElement(selectedElement)) return;
    const pool = selectedElement ? elements : canvasSections;
    const maxZ = Math.max(...pool.map((item) => Number(item.zIndex || 1)), Number(selectedFrame.zIndex || 1));
    patchSelectedLayerFrame({ zIndex: Math.min(999, maxZ + 1) });
  }

  function sendSelectedLayerBackward() {
    if (!selectedFrame || !selectedCanEditFrame) return;
    if (selectedElement && isBackgroundElement(selectedElement)) return;
    const pool = selectedElement ? elements : canvasSections;
    const minZ = Math.min(...pool.map((item) => Number(item.zIndex || 1)), Number(selectedFrame.zIndex || 1));
    patchSelectedLayerFrame({ zIndex: Math.max(1, minZ - 1) });
  }

  function alignSelectedLayerCenter() {
    if (!selectedFrame || !selectedCanEditFrame) return;
    patchSelectedLayerFrame({
      x: Math.round((builderCanvas.width - Number(selectedFrame.width || 0)) / 2)
    });
  }

  function editSelectedLayer() {
    if (!selectedLayer) return;
    if (selectedElement && ['text', 'card', 'icon'].includes(selectedElement.type) && selectedElement.locked !== true && !disabled) {
      setEditingElementId(selectedElement.id);
      return;
    }
    setRightInspectorOpen(true);
    setInspectorCollapsed(false);
    setActiveInspectorTab('content');
  }

  function toggleRailDrawer(railId) {
    setActiveRail((current) => (current === railId ? '' : railId));
  }

  function commitInlineElementText(elementId, value) {
    const target = elements.find((element) => element.id === elementId);
    if (!target || disabled || target.locked) return;
    const contentPatch = target.type === 'card'
      ? { body: value }
      : target.type === 'icon'
        ? { label: value }
        : { text: value };
    patchElement(elementId, { content: contentPatch });
    setEditingElementId('');
  }

  function moveElementLayer(elementId, direction) {
    if (disabled) return;
    const selected = elements.find((element) => element.id === elementId);
    if (!selected || selected.locked || isBackgroundElement(selected)) return;
    const foregroundIds = elements.filter((element) => !isBackgroundElement(element)).map((element) => element.id);
    const foregroundIndex = foregroundIds.indexOf(elementId);
    const targetForegroundId = foregroundIds[foregroundIndex + direction];
    if (!targetForegroundId) return;
    commitDesign((current) => {
      const nextElements = current.elements.slice();
      const index = nextElements.findIndex((element) => element.id === elementId);
      const target = nextElements.findIndex((element) => element.id === targetForegroundId);
      if (index < 0 || target < 0) return current;
      const sourceElement = nextElements[index];
      const targetElement = nextElements[target];
      nextElements[index] = { ...targetElement, zIndex: sourceElement.zIndex };
      nextElements[target] = { ...sourceElement, zIndex: targetElement.zIndex };
      const normalizedElements = nextElements.map((element, itemIndex) => normalizeBuilderElement(element, itemIndex));
      return {
        ...current,
        elements: normalizedElements,
        customElements: normalizedElements
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

  function toggleBackgroundElementSelection() {
    setSelectBackgroundElements((current) => {
      const nextValue = !current;
      if (!nextValue && selectedElement && isBackgroundElement(selectedElement)) {
        setSelectedLayerId('');
      }
      return nextValue;
    });
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
    setEditingElementId('');
    const rect = paperRef.current?.getBoundingClientRect();
    const scale = rect ? rect.width / builderCanvas.width : zoomScale;
    setSelectedLayerId(element.id);
    setInteraction({
      kind: 'element',
      id: element.id,
      type: element.type,
      invoiceManifestElement: isInvoiceManifestElement(element),
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
      },
      historySnapshot: currentCanvasDesign(designDraft)
    });
  }

  function beginSectionInteraction(event, section, mode = 'move', handle = '') {
    if (disabled || !freeLayoutMode || section.locked) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = paperRef.current?.getBoundingClientRect();
    const scale = rect ? rect.width / builderCanvas.width : zoomScale;
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
      },
      historySnapshot: currentCanvasDesign(designDraft)
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
        if (interaction.mode === 'resize') {
          next.width = snapBuilderValue(next.width, gridSize);
          next.height = snapBuilderValue(next.height, gridSize);
        }
      }
      const sourceFrame = {
        ...start,
        type: interaction.type,
        ...(interaction.invoiceManifestElement ? { manifestSemanticId: 'invoice.drag-frame' } : {})
      };
      next = constrainFramePatch(sourceFrame, next, interaction.kind);
      if (interaction.kind === 'section') patchSectionDirect(interaction.id, next);
      else patchElementDirect(interaction.id, next);
    }
    function onUp() {
      const before = interaction.historySnapshot;
      const after = currentCanvasDesign(designDraftRef.current);
      if (before && stableJson(before) !== stableJson(after)) rememberUndoSnapshot(before);
      setInteraction(null);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [interaction, gridSize, snapEnabled, selectedElement?.type, freeLayoutMode]);

  useEffect(() => {
    function onKeyDown(event) {
      const target = event.target;
      const targetTag = String(target?.tagName || '').toLowerCase();
      if (target?.isContentEditable || ['input', 'textarea', 'select'].includes(targetTag)) return;
      const shortcutKey = String(event.key || '').toLowerCase();
      if (event.key === 'Escape') {
        setToolbarMoreOpen(false);
        clearSelectedLayer();
        return;
      }
      if (disabled) return;
      if ((event.ctrlKey || event.metaKey) && shortcutKey === 'z') {
        event.preventDefault();
        if (event.shiftKey) redoDesign();
        else undoDesign();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && shortcutKey === 'y') {
        event.preventDefault();
        redoDesign();
        return;
      }
      if ((!selectedElement && !selectedSection) || disabled) return;
      if (editingElementId) return;
      if ((event.ctrlKey || event.metaKey) && shortcutKey === 'c') {
        event.preventDefault();
        copySelectedLayerToClipboard();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && shortcutKey === 'v') {
        event.preventDefault();
        pasteClipboardLayer();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && shortcutKey === 'd') {
        event.preventDefault();
        duplicateSelectedLayer();
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedLayerLocked) return;
        event.preventDefault();
        deleteSelectedLayer();
        return;
      }
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
      const amount = snapEnabled ? (event.shiftKey ? gridSize * 4 : gridSize) : (event.shiftKey ? 10 : 1);
      const [xDelta, yDelta] = deltas[event.key];
      if (selectedElement) {
        const nextX = selectedElement.x + xDelta * amount;
        const nextY = selectedElement.y + yDelta * amount;
        patchElement(selectedElement.id, {
          x: snapEnabled ? snapBuilderValue(nextX, gridSize) : nextX,
          y: snapEnabled ? snapBuilderValue(nextY, gridSize) : nextY
        });
        return;
      }
      const nextX = selectedSection.x + xDelta * amount;
      const nextY = selectedSection.y + yDelta * amount;
      patchSection(selectedSection.id, {
        x: snapEnabled ? snapBuilderValue(nextX, gridSize) : nextX,
        y: snapEnabled ? snapBuilderValue(nextY, gridSize) : nextY
      });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedElement, selectedSection, selectedLayerLocked, freeLayoutMode, disabled, editingElementId, undoStack, redoStack, snapEnabled, gridSize]);

  function insertVariable(variable) {
    const cursor = variableCursorRef.current;
    if (!selectedElement && !selectedSection) {
      onShowVariables?.();
      return;
    }
    if (selectedSection) {
      const content = selectedSection.content || {};
      if (cursor?.kind === 'section' && cursor.id === selectedSection.id && cursor.target) {
        const currentValue = String(content[cursor.target] || '');
        const start = clampBuilderNumber(cursor.start, currentValue.length, 0, currentValue.length);
        const end = clampBuilderNumber(cursor.end, start, start, currentValue.length);
        const nextValue = `${currentValue.slice(0, start)}${variable}${currentValue.slice(end)}`;
        variableCursorRef.current = { ...cursor, value: nextValue, start: start + variable.length, end: start + variable.length };
        patchSection(selectedSection.id, { content: { [cursor.target]: nextValue } });
        return;
      }
      patchSection(selectedSection.id, {
        content: {
          body: `${content.body || ''}${content.body ? ' ' : ''}${variable}`
        }
      });
      return;
    }
    const content = selectedElement.content || {};
    if (cursor?.kind === 'element' && cursor.id === selectedElement.id && cursor.target) {
      if (selectedElement.type === 'table' && String(cursor.target).startsWith('rowTemplate.')) {
        const templateIndex = Number(String(cursor.target).split('.')[1]);
        const currentTemplate = Array.isArray(content.rowTemplate) && content.rowTemplate.length
          ? content.rowTemplate.slice()
          : contentDefaultsForElement('table').rowTemplate.slice();
        if (Number.isFinite(templateIndex) && templateIndex >= 0) {
          const currentValue = String(currentTemplate[templateIndex] || '');
          const start = clampBuilderNumber(cursor.start, currentValue.length, 0, currentValue.length);
          const end = clampBuilderNumber(cursor.end, start, start, currentValue.length);
          const nextValue = `${currentValue.slice(0, start)}${variable}${currentValue.slice(end)}`;
          currentTemplate[templateIndex] = nextValue;
          variableCursorRef.current = { ...cursor, value: nextValue, start: start + variable.length, end: start + variable.length };
          patchElement(selectedElement.id, { content: { rowTemplate: currentTemplate } });
          return;
        }
      }
      const currentValue = String(content[cursor.target] || '');
      const start = clampBuilderNumber(cursor.start, currentValue.length, 0, currentValue.length);
      const end = clampBuilderNumber(cursor.end, start, start, currentValue.length);
      const nextValue = `${currentValue.slice(0, start)}${variable}${currentValue.slice(end)}`;
      variableCursorRef.current = { ...cursor, value: nextValue, start: start + variable.length, end: start + variable.length };
      patchElement(selectedElement.id, { content: { [cursor.target]: nextValue } });
      return;
    }
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

  function rememberVariableCursor(kind, id, target, value, event) {
    const control = event?.currentTarget;
    variableCursorRef.current = {
      kind,
      id,
      target,
      value: String(value || ''),
      start: typeof control?.selectionStart === 'number' ? control.selectionStart : String(value || '').length,
      end: typeof control?.selectionEnd === 'number' ? control.selectionEnd : String(value || '').length
    };
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
                <small>{manifestState.loading ? 'Loading real PDF layout...' : manifestState.error ? 'Fallback layout available' : 'Real current PDF layout manifest'}</small>
              </div>
              <button type="button" className="btn btn-secondary justify-center" disabled={disabled} onClick={duplicateCurrentTemplate}>
                <Copy className="h-4 w-4" />
                Duplicate
              </button>
              <button type="button" className="btn btn-primary justify-center" disabled={disabled || manifestState.loading} onClick={confirmApplyDefaultTemplateLayout}>
                <LayoutGrid className="h-4 w-4" />
                Reset to Default Design
              </button>
              {manifestState.error ? <small className="text-amber-200">{manifestState.error}</small> : null}
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
              <button type="button" className="btn btn-secondary justify-center" disabled={disabled} onClick={confirmApplyDefaultTemplateLayout}>
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
                  <button type="button" className="icon-button pdf-danger-icon" disabled={disabled} onClick={() => setDeleteSavedTemplateCandidate(savedTemplate)} title="Delete saved template">
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
                canToggleLock={layer.kind === 'element' || (layer.kind === 'section' && freeLayoutMode)}
                onToggleLock={() => {
                  if (layer.kind === 'element') patchElement(layer.id, { locked: !layer.locked });
                  else if (freeLayoutMode) patchSection(layer.id, { locked: !layer.locked });
                }}
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
                  <button type="button" className="pdf-page-main" onClick={() => {
                    if (page.id !== currentPageId) clearSelectedLayer();
                    setCurrentPageId(page.id);
                  }}>
                  <span className="pdf-page-thumb">{index + 1}</span>
                  <span className="min-w-0">
                    <span className="pdf-page-name">{page.name || `Page ${index + 1}`}</span>
                    <span className="pdf-page-meta">{pageElements.length} editable elements - A4 Portrait</span>
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
            <p className="font-black text-slate-100">Pages</p>
            <p className="mt-1 text-xs muted">Only real design pages are shown. Add a page manually when a template needs more than one PDF page.</p>
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
          <VersionHistoryHeader versions={versions} onClose={() => setActiveRail('')} compact />
          <div className="grid gap-2">
            {versions.length ? versions.slice(0, 8).map((version, index) => (
              <VersionHistoryRow
                key={version.id || version.version}
                version={version}
                isLatest={index === 0}
                restoring={restoring}
                onRestore={onRestore}
                onRenameVersion={onRenameVersion}
                onDeleteVersion={onDeleteVersion}
                deletingVersionId={deletingVersionId}
              />
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
          <p>Select an element to edit.</p>
        </div>
      );
    }

    if (tabId === 'content') {
      if (selectedElement) {
        return (
          <ElementContentControls
            element={selectedElement}
            disabled={disabled || selectedElement.locked}
            onPatch={(patch) => patchElement(selectedElement.id, patch)}
            onOpenVariables={() => setActiveRail('variables')}
            onRememberCursor={(target, value, event) => rememberVariableCursor('element', selectedElement.id, target, value, event)}
          />
        );
      }
      return (
        <div className="pdf-inspector-grid">
          <BuilderTextInput label="Section name" value={selectedSection.name || selectedSection.title} disabled={disabled} onChange={(value) => patchSection(selectedSection.id, { name: value, title: value, content: { title: value } })} />
          <BuilderTextInput label="Preview title" value={selectedSection.content?.title || selectedSection.title} disabled={disabled} onChange={(value) => patchSection(selectedSection.id, { content: { title: value } })} onCursor={(event) => rememberVariableCursor('section', selectedSection.id, 'title', selectedSection.content?.title || selectedSection.title, event)} />
          <BuilderTextarea label="Preview body" value={selectedSection.content?.body || ''} disabled={disabled} rows={3} onChange={(value) => patchSection(selectedSection.id, { content: { body: value } })} onCursor={(event) => rememberVariableCursor('section', selectedSection.id, 'body', selectedSection.content?.body || '', event)} />
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
            onMoveToNextPage={moveSelectedElementToNextPage}
            canMoveToNextPage={pages.findIndex((page) => page.id === (selectedElement.pageId || 'page-1')) < pages.length - 1}
            onApplyToAllPages={duplicateSelectedElementToAllPages}
            canApplyToAllPages={selectedElement.type === 'image' || isBackgroundElement(selectedElement)}
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
            <BuilderNumberInput label="Layer z-index" value={selectedElement.zIndex} min={1} max={999} disabled={disabled || selectedLayerBackground} onChange={(value) => patchElement(selectedElement.id, { zIndex: value })} />
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
            <h3>{selectedLayer ? selectedLayer.title : 'Select an element to edit.'}</h3>
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
                <button type="button" className="icon-button" disabled={disabled || selectedLayerLocked} onClick={() => duplicateElement(selectedElement)} title="Duplicate">
                  <Copy className="h-4 w-4" />
                </button>
                <button type="button" className="icon-button pdf-danger-icon" disabled={disabled || selectedLayerLocked} onClick={() => deleteElement(selectedElement.id)} title="Delete">
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

  function renderPrintSnapshotPage(page) {
    const pageSections = canvasSections
      .filter((section) => (section.pageId || 'page-1') === page.id && section.visible !== false && section.enabled !== false)
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    const pageElements = elements
      .filter((element) => (element.pageId || 'page-1') === page.id && element.visible !== false && element.enabled !== false)
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    return (
      <div key={`print-${page.id}`} className="pdf-draft-print-sheet" data-pdf-print-sheet="true">
        <div
          className="pdf-a4-page pdf-draft-print-page"
          data-pdf-print-page="true"
          data-pdf-page-id={page.id}
          style={{ width: builderCanvas.width, height: builderCanvas.height }}
        >
          {pageSections.map((section) => {
            const layer = sectionLayers.find((item) => item.id === section.id);
            return (
              <BuilderCanvasSection
                key={`print-section-${section.id}`}
                section={section}
                layer={layer}
                selected={false}
                disabled
                freeLayoutMode
                onSelect={() => {}}
                onDragStart={() => {}}
                onResizeStart={() => {}}
              />
            );
          })}
          {pageElements.map((element) => {
            const backgroundElement = isBackgroundElement(element);
            return (
              <BuilderCanvasElement
                key={`print-element-${element.id}`}
                element={element}
                selected={false}
                disabled
                editing={false}
                backgroundElement={backgroundElement}
                backgroundSelectable
                onSelect={() => {}}
                onEditStart={() => {}}
                onInlineCommit={() => {}}
                onInlineCancel={() => {}}
                onInlineCursor={() => {}}
                onDragStart={() => {}}
                onResizeStart={() => {}}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
    <div className={`pdf-builder-workspace ${fullScreenEditor ? 'is-fullscreen' : ''} ${activeRail ? 'has-left-drawer' : ''} ${rightInspectorOpen ? 'has-right-inspector' : ''} ${inspectorCollapsed ? 'is-inspector-collapsed' : ''}`}>
      <section className="pdf-builder-toolbar">
        <div className="pdf-builder-toolbar-title">
          <span className="pdf-builder-warning">Design Mode - PDFs change only after Publish</span>
          <span className="pdf-builder-mode">{canvasDesign.mode === 'manifest' ? 'MANIFEST PDF BUILDER' : 'VISUAL PDF BUILDER'}</span>
          <span className={`pdf-state-badge ${canvasDesign.published ? 'is-on' : 'is-fixed'}`}>{canvasDesign.published ? 'Published Design' : 'Draft Design'}</span>
          {!canvasDesign.published ? <span className="pdf-state-badge is-off">Not Published</span> : null}
          {hasUnsavedDesignChanges ? <span className="pdf-builder-unsaved">Unsaved Changes</span> : hasSavedDesignDraft ? <span className="pdf-builder-saved">Saved Draft</span> : null}
        </div>
        <div className="pdf-builder-toolbar-actions">
          <div className="pdf-toolbar-action-group is-tools" aria-label="Canvas tools">
            <button type="button" className="icon-button" disabled={!undoStack.length || disabled} onClick={undoDesign} title="Undo" aria-label="Undo">
              <Undo2 className="h-4 w-4" />
            </button>
            <button type="button" className="icon-button" disabled={!redoStack.length || disabled} onClick={redoDesign} title="Redo" aria-label="Redo">
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
          <div className="pdf-toolbar-action-group is-primary" aria-label="Draft actions">
            <button type="button" className="btn btn-secondary admin-compact-button" disabled={saving || Boolean(busyKey)} onClick={previewDraftPdf}>
              {draftPreviewBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Preview Draft PDF
            </button>
            <button type="button" className="btn btn-secondary admin-compact-button" disabled={saving || Boolean(busyKey)} onClick={downloadDraftPdf}>
              {draftDownloadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download Draft PDF
            </button>
            <button type="submit" className={`btn admin-compact-button pdf-builder-save-button ${hasUnsavedDesignChanges ? 'btn-primary' : 'btn-secondary'}`} disabled={!canEdit || saving || Boolean(busyKey)}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button type="button" className="btn btn-secondary admin-compact-button pdf-builder-publish-button" disabled={!canEdit || saving || Boolean(busyKey)} onClick={() => {
              setRevertConfirmOpen(false);
              setPublishConfirmOpen(true);
            }}>
              <ShieldCheck className="h-4 w-4" />
              Publish Design
            </button>
          </div>
          <div className="pdf-toolbar-action-group is-right" aria-label="History and navigation">
            <button type="button" className={`btn admin-compact-button ${activeRail === 'history' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => toggleRailDrawer('history')}>
              <History className="h-4 w-4" />
              Saved Versions
            </button>
          <div className="pdf-builder-more-menu-wrap">
            <button type="button" className={`btn admin-compact-button ${toolbarMoreOpen ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setToolbarMoreOpen((value) => !value)} aria-expanded={toolbarMoreOpen}>
              <SlidersHorizontal className="h-4 w-4" />
              More
            </button>
            {toolbarMoreOpen ? (
              <div className="pdf-builder-more-menu" onPointerDown={(event) => event.stopPropagation()}>
                <button type="button" onClick={() => { confirmApplyDefaultTemplateLayout(); setToolbarMoreOpen(false); }} disabled={disabled || manifestState.loading}>
                  {manifestState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutGrid className="h-4 w-4" />}
                  Reset to Default Design
                </button>
                <button type="button" className={rightInspectorOpen ? 'is-active' : ''} onClick={() => { setRightInspectorOpen((value) => !value); setToolbarMoreOpen(false); }}>
                  <Settings2 className="h-4 w-4" />
                  Advanced Inspector
                </button>
                <span className="pdf-more-menu-divider" />
                <button type="button" className={activeRail === 'templates' ? 'is-active' : ''} onClick={() => { toggleRailDrawer('templates'); setToolbarMoreOpen(false); }}>
                  <LayoutGrid className="h-4 w-4" />
                  Templates
                </button>
                <button type="button" className={activeRail === 'layers' ? 'is-active' : ''} onClick={() => { toggleRailDrawer('layers'); setToolbarMoreOpen(false); }}>
                  <Layers className="h-4 w-4" />
                  Layers
                </button>
                <button type="button" className={activeRail === 'elements' ? 'is-active' : ''} onClick={() => { toggleRailDrawer('elements'); setToolbarMoreOpen(false); }}>
                  <Plus className="h-4 w-4" />
                  Elements
                </button>
                <button type="button" className={activeRail === 'variables' ? 'is-active' : ''} onClick={() => { toggleRailDrawer('variables'); setToolbarMoreOpen(false); }}>
                  <ShieldCheck className="h-4 w-4" />
                  Variables
                </button>
                <button type="button" className={activeRail === 'history' ? 'is-active' : ''} onClick={() => { toggleRailDrawer('history'); setToolbarMoreOpen(false); }}>
                  <History className="h-4 w-4" />
                  Saved Versions
                </button>
                <span className="pdf-more-menu-divider" />
                <button type="button" onClick={() => { setFullScreenEditor((value) => !value); setToolbarMoreOpen(false); }}>
                  <Maximize2 className="h-4 w-4" />
                  {fullScreenEditor ? 'Exit Full Screen' : 'Full Screen Editor'}
                </button>
                <button type="button" className={gridEnabled ? 'is-active' : ''} onClick={() => updateCanvasOption('gridEnabled', !gridEnabled)}>
                  <Grid2X2 className="h-4 w-4" />
                  Grid
                </button>
                <button type="button" className={snapEnabled ? 'is-active' : ''} onClick={() => updateCanvasOption('canvas.snap', !snapEnabled)}>
                  <Move className="h-4 w-4" />
                  Snap
                </button>
                <button type="button" className={layoutGuidesEnabled ? 'is-active' : ''} onClick={() => updateCanvasOption('layoutGuides', !layoutGuidesEnabled)}>
                  {layoutGuidesEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  Layout Guides
                </button>
                <button type="button" className={showReferenceLayer ? 'is-active' : ''} disabled={!referencePdfUrl} onClick={() => setShowReferenceLayer((value) => !value)}>
                  {showReferenceLayer ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  PDF Reference Layer
                </button>
                <button type="button" className={selectBackgroundElements ? 'is-active' : ''} onClick={toggleBackgroundElementSelection}>
                  {selectBackgroundElements ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  Select Background Elements
                </button>
                <button type="button" className={freeLayoutMode ? 'is-active' : ''} disabled={disabled} onClick={toggleFreeLayoutMode}>
                  {freeLayoutMode ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  Free Layout Mode
                </button>
                <span className="pdf-more-menu-divider" />
                <button type="button" disabled={saving || Boolean(busyKey)} onClick={() => { downloadDraftPdf(); setToolbarMoreOpen(false); }}>
                  {draftDownloadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download Draft PDF
                </button>
                <button type="button" disabled={!canEdit || saving || Boolean(busyKey)} onClick={() => {
                  setToolbarMoreOpen(false);
                  setPublishConfirmOpen(false);
                  setRevertConfirmOpen(true);
                }}>
                  <RotateCcw className="h-4 w-4" />
                  Revert Draft
                </button>
              </div>
            ) : null}
          </div>
            <button type="button" className="btn btn-secondary admin-compact-button" disabled={saving} onClick={onBack}>
              <LayoutGrid className="h-4 w-4" />
              Back to Templates
            </button>
          </div>
        </div>
      </section>

      <div className="pdf-builder-shell">
        {activeRail ? (
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
        ) : null}

        {activeRail ? (
        <aside className="pdf-builder-panel">
          <div className="pdf-builder-panel-header">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">{builderRailItems.find((item) => item.id === activeRail)?.label}</p>
              <h3>{activeRail === 'templates' ? 'Template Gallery' : activeRail === 'elements' ? 'Elements' : activeRail === 'text' ? 'Text' : activeRail === 'uploads' ? 'Uploads / Logo' : activeRail === 'layers' ? 'Layers' : activeRail === 'pages' ? 'Pages' : activeRail === 'variables' ? 'Variables' : 'Saved Versions'}</h3>
            </div>
            <button type="button" className="icon-button" onClick={() => setActiveRail('')} title="Close drawer">
              <X className="h-4 w-4" />
            </button>
          </div>
          {renderRailPanel()}
        </aside>
        ) : null}

        <div className="pdf-builder-stage">
          <main className="pdf-builder-canvas">
          <div className="pdf-builder-canvas-header">
            <div>
              <h3>A4 Canvas</h3>
              <p>{currentPage.name || 'Page 1'} - White PDF page - editable elements snap to {gridSize}px grid</p>
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
            </div>
          </div>
          <div className="pdf-canvas-scroll">
            <div className="pdf-paper-stage" style={{ width: builderCanvas.width * zoomScale, height: builderCanvas.height * zoomScale }}>
              <div
                ref={paperRef}
                className={`pdf-a4-page ${gridEnabled ? 'has-grid' : ''} ${activeReferencePdfUrl ? 'has-reference-layer' : ''} ${layoutGuidesEnabled ? 'show-layout-guides' : ''}`}
                style={{
                  width: builderCanvas.width,
                  height: builderCanvas.height,
                  transform: `scale(${zoomScale})`
                }}
                onPointerDown={clearSelectedLayer}
              >
                {activeReferencePdfUrl ? (
                  <>
                    <iframe
                      title={`${template.name} rendered PDF reference page ${currentPageIndex + 1}`}
                      src={activeReferencePdfUrl}
                      className="pdf-canvas-reference"
                    />
                    <div className="pdf-canvas-reference-shield" aria-hidden="true" />
                  </>
                ) : showReferenceLayer ? (
                  <div className="pdf-canvas-reference-empty">
                    <FileText className="h-5 w-5" />
                    <span>{previewLoading ? 'Loading rendered PDF reference...' : previewError || 'Rendered PDF reference is not available yet.'}</span>
                  </div>
                ) : null}
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
                {visiblePageElements.map((element) => {
                  const backgroundElement = isBackgroundElement(element);
                  const backgroundSelectable = !backgroundElement || selectBackgroundElements;
                  return (
                    <BuilderCanvasElement
                      key={element.id}
                      element={element}
                      selected={selectedLayerId === element.id}
                      disabled={disabled}
                      editing={editingElementId === element.id}
                      backgroundElement={backgroundElement}
                      backgroundSelectable={backgroundSelectable}
                      onSelect={() => {
                        if (!backgroundSelectable) return;
                        setSelectedLayerId(element.id);
                      }}
                      onEditStart={() => {
                        if (!backgroundSelectable) return;
                        setSelectedLayerId(element.id);
                        if (['text', 'card', 'icon'].includes(element.type)) {
                          setEditingElementId(element.id);
                        } else {
                          setEditingElementId('');
                          setRightInspectorOpen(true);
                          setInspectorCollapsed(false);
                          setActiveInspectorTab(element.type === 'table' ? 'content' : 'style');
                        }
                      }}
                      onInlineCommit={(value) => commitInlineElementText(element.id, value)}
                      onInlineCancel={() => setEditingElementId('')}
                      onInlineCursor={(target, value, event) => rememberVariableCursor('element', element.id, target, value, event)}
                      onDragStart={(event) => beginElementInteraction(event, element, 'move')}
                      onResizeStart={(event, handle) => beginElementInteraction(event, element, 'resize', handle)}
                    />
                  );
                })}
                {selectBackgroundElements ? visiblePageElements.filter((element) => isBackgroundElement(element)).map((element) => (
                  <BackgroundElementHitTarget
                    key={`background-hit-${element.id}`}
                    element={element}
                    selected={selectedLayerId === element.id}
                    disabled={disabled}
                    onSelect={() => {
                      setSelectedLayerId(element.id);
                      setEditingElementId('');
                    }}
                    onEditStart={() => {
                      setSelectedLayerId(element.id);
                      setEditingElementId('');
                      setRightInspectorOpen(true);
                      setInspectorCollapsed(false);
                      setActiveInspectorTab('content');
                    }}
                    onDragStart={(event) => beginElementInteraction(event, element, 'move')}
                    onResizeStart={(event, handle) => beginElementInteraction(event, element, 'resize', handle)}
                  />
                )) : null}
                {floatingToolbarVisible ? (
                  <FloatingLayerToolbar
                    frame={selectedElementOnCurrentPage}
                    layer={selectedLayer}
                    element={selectedElementOnCurrentPage}
                    position={floatingToolbarPosition}
                    locked={selectedLayerLocked}
                    backgroundSelected={selectedLayerBackground}
                    canEditFrame={selectedCanEditFrame}
                    canReorder={!selectedLayerBackground && selectedCanEditFrame}
                    canDelete={!selectedLayerLocked && (Boolean(selectedElement) || selectedSection?.system === false)}
                    canToggleLock={Boolean(selectedElement) || (Boolean(selectedSection) && freeLayoutMode)}
                    onEdit={editSelectedLayer}
                    onDuplicate={duplicateSelectedLayer}
                    onDelete={deleteSelectedLayer}
                    onToggleLock={toggleSelectedLayerLock}
                    onBringForward={bringSelectedLayerForward}
                    onSendBackward={sendSelectedLayerBackward}
                    onAlign={alignSelectedLayerCenter}
                    onPatch={(patch) => {
                      if (selectedElement) patchElement(selectedElement.id, patch);
                      else if (selectedSection) patchSection(selectedSection.id, patch);
                    }}
                    onOpenInspector={(tab = 'content') => {
                      setRightInspectorOpen(true);
                      setInspectorCollapsed(false);
                      setActiveInspectorTab(tab);
                    }}
                  />
                ) : null}
                <div className="pdf-page-break-guide">Page break safe zone</div>
                {visiblePageSections.length === 0 && visiblePageElements.length === 0 ? (
                  <div className="pdf-canvas-empty">
                    <p>Click Reset to Default Design to load the editable PDF canvas.</p>
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
    <div
      ref={printSnapshotRef}
      className="pdf-draft-print-root"
      data-pdf-print-root="true"
      aria-hidden="true"
    >
      {pages.map((page) => renderPrintSnapshotPage(page))}
    </div>
    {publishConfirmOpen ? (
      <ConfirmModal
        title="Publish PDF design?"
        message={`This will apply the current design to future generated ${template.name}. Existing saved PDFs will not be changed.`}
        confirmLabel="Publish Design"
        onCancel={() => setPublishConfirmOpen(false)}
        onConfirm={() => {
          setPublishConfirmOpen(false);
          const snapshot = buildDraftCanvasSnapshot(printSnapshotRef.current || paperRef.current, canvasDesign, template.key);
          onPublishDesign?.(canvasDesign, {
            publishedCanvasHtml: snapshot.draftCanvasHtml,
            publishedMeta: snapshot.draftMeta
          });
        }}
      />
    ) : null}
    {revertConfirmOpen ? (
      <ConfirmModal
        title="Revert draft design?"
        message="Discard draft design changes and return to the last published/default layout?"
        confirmLabel="Revert Draft"
        onCancel={() => setRevertConfirmOpen(false)}
        onConfirm={() => {
          setRevertConfirmOpen(false);
          revertDraftDesign();
        }}
      />
    ) : null}
    {deleteSavedTemplateCandidate ? (
      <ConfirmModal
        title="Remove saved template?"
        message={`Remove ${deleteSavedTemplateCandidate.name || 'this saved template'} from the local design gallery draft?`}
        confirmLabel="Remove Template"
        onCancel={() => setDeleteSavedTemplateCandidate(null)}
        onConfirm={() => deleteSavedTemplate(deleteSavedTemplateCandidate.id)}
      />
    ) : null}
    </>
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
      data-pdf-layer-id={section.id}
      data-pdf-layer-kind="section"
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
        {selected && locked ? <span className="pdf-section-lock"><Lock className="h-3 w-3" />Locked</span> : null}
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
      {selected && overflowRisk ? <span className="pdf-section-overflow-warning">Content may overflow</span> : null}
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

function BuilderCanvasElement({
  element,
  selected,
  disabled,
  editing = false,
  backgroundElement = false,
  backgroundSelectable = true,
  onSelect,
  onEditStart,
  onInlineCommit,
  onInlineCancel,
  onInlineCursor,
  onDragStart,
  onResizeStart
}) {
  const Icon = elementIconForType(element.type);
  const style = styleForBuilderElement(element, selected);
  const content = element.content || {};
  const locked = element.locked || disabled || !backgroundSelectable;
  const inlineInputRef = useRef(null);
  const [inlineValue, setInlineValue] = useState(elementPrimaryText(element));
  const inlineEditable = ['text', 'card', 'icon'].includes(element.type);
  const doubleClickEditable = inlineEditable || element.type === 'table' || element.type === 'divider' || element.type === 'image';
  const inlineTarget = element.type === 'card' ? 'body' : element.type === 'icon' ? 'label' : 'text';
  const iconMode = content.iconMode === 'emoji' ? 'emoji' : 'vector';
  const iconVariant = content.variant || content.iconName || 'generic';
  const iconLabel = content.label || (content.variant ? '' : content.iconName) || '';
  const iconEmoji = content.emoji || '✅';
  const imagePreviewSrc = element.type === 'image' ? imagePreviewSource(content) : '';
  const imageMode = isWatermarkImageElement(element) ? 'watermark' : (content.imageMode || (imagePreviewSrc.includes('logo-icon') ? 'watermark' : 'logo'));
  const tablePaddingX = clampBuilderNumber(element.style?.paddingX, 4, 0, 24);
  const tablePaddingY = clampBuilderNumber(element.style?.paddingY, 5, 0, 24);
  const tableCellStyle = {
    padding: `${tablePaddingY}px ${tablePaddingX}px`,
    textAlign: element.style?.alignment || element.alignment || 'left'
  };
  const tableBorderWidth = clampBuilderNumber(element.style?.borderWidth, 0.7, 0, 4);
  const tableBorderColor = element.style?.borderColor || '#d8e5f7';
  const tableRowBackground = element.style?.rowBackgroundColor || '#ffffff';
  const tableAltRowBackground = element.style?.alternateRowBackgroundColor || '#f8fafc';
  const tableColumns = content.columns?.length ? content.columns : contentDefaultsForElement('table').columns;
  const tableColumnTemplate = Array.isArray(content.columnWidths) && content.columnWidths.length
    ? tableColumns.map((_column, index) => `${Math.max(0.2, Number(content.columnWidths[index]) || 1)}fr`).join(' ')
    : `repeat(${Math.max(1, tableColumns.length || 4)}, minmax(0, 1fr))`;
  const tablePreviewCount = clampBuilderNumber(content.previewRowCount, 5, 1, 12);
  const tinyHitTarget = isTinyCanvasElement(element);

  useEffect(() => {
    if (editing) setInlineValue(elementPrimaryText(element));
  }, [editing, element.id, element.type, content.text, content.body, content.label]);

  useEffect(() => {
    if (!editing) return;
    const timer = window.setTimeout(() => {
      inlineInputRef.current?.focus();
      inlineInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [editing]);

  function finishInlineEdit() {
    if (!editing) return;
    onInlineCommit?.(inlineValue);
  }

  return (
    <div
      className={`pdf-builder-element is-${element.type} ${selected ? 'is-selected' : ''} ${locked ? 'is-locked' : ''} ${backgroundElement ? 'is-background-element' : ''} ${backgroundElement && !backgroundSelectable ? 'is-background-passthrough' : ''} ${tinyHitTarget ? 'is-tiny-hit-target' : ''}`}
      data-pdf-layer-id={element.id}
      data-pdf-layer-kind={backgroundElement ? 'background' : 'element'}
      style={style}
      onPointerDown={(event) => {
        if (!backgroundSelectable) return;
        event.stopPropagation();
        onSelect();
        if (editing) return;
        if (!locked) onDragStart(event);
      }}
      onDoubleClick={(event) => {
        if (!backgroundSelectable || !doubleClickEditable || locked) return;
        event.preventDefault();
        event.stopPropagation();
        onEditStart?.();
      }}
      role="button"
      tabIndex={0}
    >
      {tinyHitTarget ? <span className="pdf-element-hit-area" aria-hidden="true" /> : null}
      <div className="pdf-element-grip"><GripVertical className="h-3.5 w-3.5" /></div>
      {editing && inlineEditable ? (
        <textarea
          ref={inlineInputRef}
          className="pdf-inline-text-editor"
          value={inlineValue}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => setInlineValue(event.target.value)}
          onFocus={(event) => onInlineCursor?.(inlineTarget, inlineValue, event)}
          onSelect={(event) => onInlineCursor?.(inlineTarget, inlineValue, event)}
          onClick={(event) => onInlineCursor?.(inlineTarget, inlineValue, event)}
          onKeyUp={(event) => onInlineCursor?.(inlineTarget, inlineValue, event)}
          onBlur={finishInlineEdit}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') finishInlineEdit();
            if (event.key === 'Escape') {
              setInlineValue(elementPrimaryText(element));
              onInlineCancel?.();
            }
          }}
        />
      ) : element.type === 'table' ? (
        <div
          className="pdf-canvas-table"
          data-pdf-invoice-table="true"
          data-pdf-table-element-id={element.id}
          data-pdf-table-dynamic-rows={content.dynamicRows !== false ? 'true' : 'false'}
          data-pdf-table-columns={encodeURIComponent(JSON.stringify(tableColumns))}
          data-pdf-table-row-template={encodeURIComponent(JSON.stringify(Array.isArray(content.rowTemplate) && content.rowTemplate.length ? content.rowTemplate : contentDefaultsForElement('table').rowTemplate))}
          data-pdf-table-row-height={element.style?.rowHeight || 18}
        >
          {content.title ? <p>{content.title}</p> : null}
          <div className="pdf-canvas-table-grid" style={{ borderColor: tableBorderColor, borderWidth: tableBorderWidth }}>
            <div className="pdf-canvas-table-head" style={{ gridTemplateColumns: tableColumnTemplate, minHeight: element.style?.rowHeight || 18, background: element.style?.headerBackgroundColor || element.style?.accentColor || '#0f2a52', color: element.style?.headerTextColor || '#ffffff' }}>
              {tableColumns.slice(0, 6).map((column, columnIndex) => <span key={`${column}-${columnIndex}`} style={tableCellStyle}>{column}</span>)}
            </div>
            {(content.rows?.length ? content.rows : contentDefaultsForElement('table').rows).slice(0, tablePreviewCount).map((row, rowIndex) => (
              <div key={`table-row-${rowIndex}`} className="pdf-canvas-table-row" style={{ gridTemplateColumns: tableColumnTemplate, minHeight: element.style?.rowHeight || 18, background: rowIndex % 2 ? tableAltRowBackground : tableRowBackground }}>
                {(Array.isArray(row) ? row : [row]).slice(0, Math.max(1, tableColumns.length || 4)).map((cell, cellIndex) => <span key={`${cell}-${cellIndex}`} style={tableCellStyle}>{cell}</span>)}
              </div>
            ))}
          </div>
        </div>
      ) : element.type === 'icon' ? (
        <div className={`pdf-canvas-icon is-${iconMode} is-${iconVariant} ${iconLabel ? 'has-label' : 'is-symbol-only'}`}>
          <CanvasIconPreview variant={iconVariant} mode={iconMode} emoji={iconEmoji} />
          {iconLabel ? <span>{iconLabel}</span> : null}
        </div>
      ) : element.type === 'qr' ? (
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
        <div className={`pdf-canvas-divider ${element.style?.orientation === 'vertical' || Number(element.style?.rotate) === 90 ? 'is-vertical' : ''}`} style={{ borderTopWidth: element.style?.orientation === 'vertical' || Number(element.style?.rotate) === 90 ? 0 : element.style?.dividerThickness || 2, borderLeftWidth: element.style?.orientation === 'vertical' || Number(element.style?.rotate) === 90 ? element.style?.dividerThickness || 2 : 0, borderTopStyle: element.style?.dividerStyle || 'solid', borderLeftStyle: element.style?.dividerStyle || 'solid', borderColor: element.style?.accentColor || '#0284c7' }}>
          {content.label ? <span>{content.label}</span> : null}
        </div>
      ) : element.type === 'spacer' ? (
        <div className="pdf-canvas-spacer">{content.label || 'Spacer'}</div>
      ) : element.type === 'image' ? (
        <div className={`pdf-canvas-image ${imagePreviewSrc ? 'has-image' : ''} is-${imageMode}`}>
          {imagePreviewSrc ? (
            <img
              src={imagePreviewSrc}
              alt={content.label || element.name || 'PDF image'}
              draggable="false"
              style={{
                objectFit: ['contain', 'cover', 'fill'].includes(content.objectFit) ? content.objectFit : 'contain',
                objectPosition: content.objectPosition || 'center center'
              }}
            />
          ) : (
            <>
              <ImageIcon className="h-5 w-5" />
              <span>{content.label || 'Image / Logo'}</span>
            </>
          )}
        </div>
      ) : element.type === 'card' ? (
        content.boxOnly ? <div className="pdf-canvas-card-box" /> : (
          <div className={`pdf-canvas-card ${element.twoColumn ? 'is-two-column' : ''}`}>
            <p><Icon className="h-3.5 w-3.5" />{content.title || element.name}</p>
            <span>{content.body || 'Add details here'}</span>
          </div>
        )
      ) : (
        <div className="pdf-canvas-text">{elementPrimaryText(element) || 'New text block'}</div>
      )}
      {(selected && element.locked) || (backgroundElement && element.locked) ? <span className="pdf-element-lock"><Lock className="h-3 w-3" /><span>Locked</span></span> : null}
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

function BackgroundElementHitTarget({ element, selected, disabled, onSelect, onEditStart, onDragStart, onResizeStart }) {
  const locked = disabled || element.locked === true;
  const style = {
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    zIndex: Math.max(1, Number(element.zIndex || 0) + 1)
  };
  return (
    <div
      className={`pdf-background-hit-target ${selected ? 'is-selected' : ''} ${locked ? 'is-locked' : 'is-unlocked'}`}
      style={style}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={`Select ${element.name || element.title || 'background element'}`}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect?.();
        if (!locked) onDragStart?.(event);
      }}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onEditStart?.();
      }}
      title={`${element.name || element.title || 'Background element'} - double-click to edit`}
    >
      {selected && !locked ? ['nw', 'ne', 'sw', 'se'].map((handle) => (
        <button
          key={handle}
          type="button"
          className={`pdf-resize-handle is-${handle}`}
          onPointerDown={(event) => onResizeStart?.(event, handle)}
          aria-label={`Resize ${handle}`}
        />
      )) : null}
    </div>
  );
}

function FloatingLayerToolbar({
  layer,
  element,
  position,
  locked,
  backgroundSelected = false,
  canEditFrame,
  canReorder = canEditFrame,
  canDelete,
  canToggleLock,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleLock,
  onBringForward,
  onSendBackward,
  onAlign,
  onPatch,
  onOpenInspector
}) {
  const portalTarget = typeof document === 'undefined' ? null : document.body;
  if (!portalTarget) return null;
  const style = element?.style || {};
  const content = element?.content || {};
  const isTable = element?.type === 'table';
  const isImage = element?.type === 'image';
  const isBackground = layer?.backgroundElement || isBackgroundElement(element);
  const toolbarLabel = isTable ? 'Edit Table' : isImage ? 'Replace' : isBackground ? 'Edit Watermark' : 'Edit';
  const patchStyle = (patch) => onPatch?.({ style: patch });
  const patchContent = (patch) => onPatch?.({ content: patch });
  const cycleAlignment = () => {
    const order = ['left', 'center', 'right'];
    const current = style.alignment || element?.alignment || 'left';
    const next = order[(order.indexOf(current) + 1) % order.length] || 'left';
    onPatch?.({ alignment: next, style: { alignment: next } });
  };
  const alignmentIcon = style.alignment === 'right' ? <AlignRight className="h-3.5 w-3.5" /> : style.alignment === 'center' ? <AlignCenter className="h-3.5 w-3.5" /> : <AlignLeft className="h-3.5 w-3.5" />;
  return createPortal(
    <div
      className={`pdf-floating-toolbar is-${position?.placement || 'above'} ${position?.ready ? 'is-ready' : 'is-measuring'} ${isTable ? 'is-table-toolbar' : ''} ${isBackground ? 'is-background-toolbar' : ''}`}
      data-pdf-floating-toolbar-id={layer?.id || ''}
      style={{ left: position?.left ?? 12, top: position?.top ?? 12 }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {isBackground ? <span className="pdf-floating-status"><Lock className="h-3 w-3" />{backgroundSelected ? 'Background selected' : 'Watermark'}</span> : null}
      <button type="button" className="pdf-floating-tool is-primary" disabled={locked && !isBackground} onClick={onEdit} title={toolbarLabel}>
        <Edit3 className="h-3.5 w-3.5" />
        <span>{toolbarLabel}</span>
      </button>
      {isTable ? (
        <>
          <button type="button" className="pdf-floating-tool" disabled={locked} onClick={() => onOpenInspector?.('content')} title="Columns">
            <Columns2 className="h-3.5 w-3.5" />
            <span>Columns</span>
          </button>
          <button type="button" className="pdf-floating-tool" disabled={locked} onClick={() => onOpenInspector?.('style')} title="Table style">
            <Palette className="h-3.5 w-3.5" />
            <span>Style</span>
          </button>
        </>
      ) : null}
      {isImage ? (
        <button type="button" className="pdf-floating-tool" disabled={locked} onClick={() => patchContent({ fitToFrame: content.fitToFrame === false })} title={content.fitToFrame === false ? 'Fit image to frame' : 'Use natural padding'}>
          <ImageIcon className="h-3.5 w-3.5" />
          <span>Fit</span>
        </button>
      ) : null}
      <button type="button" className="pdf-floating-tool" disabled={locked} onClick={onDuplicate} title="Duplicate">
        <Copy className="h-3.5 w-3.5" />
      </button>
      <button type="button" className="pdf-floating-tool pdf-floating-danger" disabled={!canDelete} onClick={onDelete} title={canDelete ? 'Delete' : 'Only custom sections can be deleted'}>
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <button type="button" className="pdf-floating-tool" disabled={!canToggleLock} onClick={onToggleLock} title={locked ? 'Unlock' : 'Lock'}>
        {locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
      </button>
      <button type="button" className="pdf-floating-tool" disabled={!canReorder} onClick={onBringForward} title="Bring forward">
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button type="button" className="pdf-floating-tool" disabled={!canReorder} onClick={onSendBackward} title="Send backward">
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button type="button" className="pdf-floating-tool" disabled={!canEditFrame} onClick={onAlign} title="Align center on page">
        <AlignCenter className="h-3.5 w-3.5" />
      </button>
      {element?.type === 'text' ? (
        <>
          <label className="pdf-floating-mini-field" title="Font size">
            <span>Size</span>
            <input type="number" min="6" max="42" value={style.fontSize ?? 13} disabled={locked} onChange={(event) => patchStyle({ fontSize: Number(event.target.value) })} />
          </label>
          <button type="button" className={`pdf-floating-tool ${Number(style.fontWeight || 700) >= 700 ? 'is-primary' : ''}`} disabled={locked} onClick={() => patchStyle({ fontWeight: Number(style.fontWeight || 700) >= 700 ? 500 : 800 })} title="Bold">
            <span>B</span>
          </button>
          <button type="button" className="pdf-floating-tool" disabled={locked} onClick={cycleAlignment} title="Align text">
            {alignmentIcon}
          </button>
          <label className="pdf-floating-color" title="Text color">
            <Palette className="h-3.5 w-3.5" />
            <input type="color" value={style.textColor || '#0f172a'} disabled={locked} onChange={(event) => patchStyle({ textColor: event.target.value })} />
          </label>
        </>
      ) : null}
      {element?.type === 'card' ? (
        <>
          <label className="pdf-floating-color" title="Fill color">
            <Square className="h-3.5 w-3.5" />
            <input type="color" value={style.backgroundColor && style.backgroundColor !== 'transparent' ? style.backgroundColor : '#ffffff'} disabled={locked} onChange={(event) => patchStyle({ backgroundColor: event.target.value })} />
          </label>
          <label className="pdf-floating-color" title="Border color">
            <Minus className="h-3.5 w-3.5" />
            <input type="color" value={style.borderColor || '#cbd5e1'} disabled={locked} onChange={(event) => patchStyle({ borderColor: event.target.value })} />
          </label>
          <label className="pdf-floating-mini-field" title="Border radius">
            <span>Radius</span>
            <input type="number" min="0" max="32" value={style.borderRadius ?? 8} disabled={locked} onChange={(event) => patchStyle({ borderRadius: Number(event.target.value) })} />
          </label>
        </>
      ) : null}
      {element?.type === 'table' ? (
        <>
          <label className="pdf-floating-color" title="Header background">
            <Palette className="h-3.5 w-3.5" />
            <input type="color" value={style.headerBackgroundColor || style.accentColor || '#0f2a52'} disabled={locked} onChange={(event) => patchStyle({ headerBackgroundColor: event.target.value, accentColor: event.target.value })} />
          </label>
          <label className="pdf-floating-mini-field" title="Row height">
            <span>Row</span>
            <input type="number" min="12" max="34" value={style.rowHeight ?? 18} disabled={locked} onChange={(event) => patchStyle({ rowHeight: Number(event.target.value) })} />
          </label>
          <label className="pdf-floating-mini-field" title="Padding X">
            <span>Pad X</span>
            <input type="number" min="0" max="24" value={style.paddingX ?? 4} disabled={locked} onChange={(event) => patchStyle({ paddingX: Number(event.target.value) })} />
          </label>
          <label className="pdf-floating-mini-field" title="Padding Y">
            <span>Pad Y</span>
            <input type="number" min="0" max="24" value={style.paddingY ?? 5} disabled={locked} onChange={(event) => patchStyle({ paddingY: Number(event.target.value) })} />
          </label>
          <label className="pdf-floating-color" title="Border color">
            <Minus className="h-3.5 w-3.5" />
            <input type="color" value={style.borderColor || '#d8e5f7'} disabled={locked} onChange={(event) => patchStyle({ borderColor: event.target.value })} />
          </label>
          <label className="pdf-floating-mini-field" title="Border width">
            <span>Border</span>
            <input type="number" min="0" max="4" step="0.1" value={style.borderWidth ?? 0.7} disabled={locked} onChange={(event) => patchStyle({ borderWidth: Number(event.target.value) })} />
          </label>
        </>
      ) : null}
      {element && ['icon', 'divider', 'image'].includes(element.type) ? (
        <>
          <label className="pdf-floating-color" title="Stroke / accent color">
            <Palette className="h-3.5 w-3.5" />
            <input type="color" value={style.accentColor || '#0284c7'} disabled={locked} onChange={(event) => patchStyle({ accentColor: event.target.value, textColor: event.target.value })} />
          </label>
          <label className="pdf-floating-mini-field" title={element.type === 'divider' ? 'Stroke' : 'Size'}>
            <span>{element.type === 'divider' ? 'Stroke' : 'Size'}</span>
            <input type="number" min="1" max="42" value={element.type === 'divider' ? style.dividerThickness ?? 2 : style.fontSize ?? 13} disabled={locked} onChange={(event) => patchStyle(element.type === 'divider' ? { dividerThickness: Number(event.target.value) } : { fontSize: Number(event.target.value) })} />
          </label>
          <button type="button" className="pdf-floating-tool" disabled={locked} onClick={() => onOpenInspector?.('content')} title={element.type === 'icon' ? 'Replace icon' : 'More options'}>
            <Box className="h-3.5 w-3.5" />
            <span>{element.type === 'icon' ? 'Replace Icon' : 'Options'}</span>
          </button>
        </>
      ) : null}
      <button type="button" className="pdf-floating-tool" onClick={() => onOpenInspector?.(element?.type === 'table' ? 'content' : 'style')} title={`More options for ${layer?.title || content.title || 'selected element'}`}>
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span>More</span>
      </button>
    </div>,
    portalTarget
  );
}

function BuilderLayerRow({ layer, selected, disabled, canToggleLock = false, onSelect, onToggleVisibility, onToggleLock, onMoveUp, onMoveDown, onDuplicate, onDelete }) {
  const Icon = layer.kind === 'section' ? (layer.section?.icon || FileText) : elementIconForType(layer.type);
  const elementLayer = layer.kind === 'element';
  const canDelete = elementLayer || layer.sectionDesign?.system === false;
  const lockedAction = layer.locked === true;
  const reorderDisabled = lockedAction || layer.backgroundElement === true;
  return (
    <div className={`pdf-layer-row ${selected ? 'is-active' : ''}`}>
      <button type="button" className="pdf-layer-main" onClick={onSelect} title={layer.title}>
        <GripVertical className="h-3.5 w-3.5 text-slate-400" />
        <Icon className="h-4 w-4 text-sky-100" />
        <span className="pdf-layer-text">
          <span className="pdf-layer-name" title={layer.title}>{layer.title}</span>
          <span className="pdf-layer-badges">
            <span className={`pdf-layer-badge ${layer.locked ? 'is-locked' : 'is-free'}`}>{layer.locked ? 'Locked' : 'Editable'}</span>
            {!layer.visible ? <span className="pdf-layer-badge is-hidden">Hidden</span> : null}
            <span className={`pdf-layer-badge ${layer.backgroundElement ? 'is-background' : ''}`}>{layer.kind === 'section' ? 'Section' : layer.badge}</span>
          </span>
        </span>
      </button>
      <div className="pdf-layer-actions">
        <button type="button" className="icon-button" disabled={disabled || !layer.supportsVisibility} onClick={onToggleVisibility} title={layer.visible ? 'Hide' : 'Show'}>
          {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button type="button" className="icon-button" disabled={disabled || !canToggleLock} onClick={onToggleLock} title={layer.locked ? 'Unlock layer' : 'Lock layer'}>
          {layer.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
        </button>
        {elementLayer ? (
          <>
            <button type="button" className="icon-button" disabled={disabled || reorderDisabled} onClick={onMoveUp} title="Move up">
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="icon-button" disabled={disabled || reorderDisabled} onClick={onMoveDown} title="Move down">
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </>
        ) : null}
        <button type="button" className="icon-button" disabled={disabled || lockedAction} onClick={onDuplicate} title={elementLayer ? 'Duplicate' : 'Duplicate as custom section'}>
          <Copy className="h-3.5 w-3.5" />
        </button>
        {canDelete ? (
          <button type="button" className="icon-button pdf-danger-icon" disabled={disabled || lockedAction} onClick={onDelete} title="Delete">
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

function BuilderTextInput({ label, value, disabled, onChange, onCursor = null }) {
  return (
    <label className="pdf-control-field pdf-field-full">
      <span className="label">{label}</span>
      <input
        className="input"
        value={value || ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onCursor || undefined}
        onSelect={onCursor || undefined}
        onClick={onCursor || undefined}
        onKeyUp={onCursor || undefined}
      />
    </label>
  );
}

function BuilderTextarea({ label, value, disabled, rows = 4, onChange, onCursor = null }) {
  return (
    <label className="pdf-control-field pdf-field-full">
      <span className="label">{label}</span>
      <textarea
        className="input min-h-24"
        rows={rows}
        value={value || ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onCursor || undefined}
        onSelect={onCursor || undefined}
        onClick={onCursor || undefined}
        onKeyUp={onCursor || undefined}
      />
    </label>
  );
}

function BuilderHint({ children, tone = 'neutral' }) {
  return <p className={`pdf-control-hint is-${tone}`}>{children}</p>;
}

function BuilderNumberInput({ label, value, min = 0, max = 999, step = 1, disabled, onChange }) {
  return (
    <label className="pdf-control-field">
      <span className="label">{label}</span>
      <input className="input" type="number" min={min} max={max} step={step} value={value ?? ''} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} />
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

function ElementContentControls({ element, disabled, onPatch, onOpenVariables, onRememberCursor = null }) {
  const content = element.content || {};
  const remember = (target, value) => (event) => onRememberCursor?.(target, value, event);
  const tableDefaults = contentDefaultsForElement('table');
  const tableColumns = Array.isArray(content.columns) && content.columns.length ? content.columns : tableDefaults.columns;
  const tableWidths = parseTableColumnWidths(formatTableColumnWidths(content.columnWidths), tableColumns.length);
  const tableTemplate = Array.isArray(content.rowTemplate) && content.rowTemplate.length ? content.rowTemplate : tableDefaults.rowTemplate;
  const tablePreviewRows = Array.isArray(content.rows) && content.rows.length ? content.rows : tableDefaults.rows;
  const iconVariantValue = content.variant || content.iconName || 'generic';
  const iconOptions = iconVariantOptions.some(([value]) => value === iconVariantValue)
    ? iconVariantOptions
    : [[iconVariantValue, iconVariantValue], ...iconVariantOptions];

  function patchTableContent(patch) {
    onPatch({ content: patch });
  }

  function updateTableColumn(index, value) {
    const columns = tableColumns.map((column, columnIndex) => (columnIndex === index ? value : column));
    patchTableContent({ columns });
  }

  function updateTableWidth(index, value) {
    const widths = tableWidths.map((width, widthIndex) => (widthIndex === index ? Math.max(0.1, Number(value) || 1) : width));
    patchTableContent({ columnWidths: widths });
  }

  function updateRowTemplate(index, value) {
    const template = tableColumns.map((_column, columnIndex) => tableTemplate[columnIndex] || '');
    template[index] = value;
    patchTableContent({ rowTemplate: template });
  }

  function addTableColumn() {
    if (tableColumns.length >= 8) return;
    const nextIndex = tableColumns.length + 1;
    patchTableContent({
      columns: [...tableColumns, `Column ${nextIndex}`],
      columnWidths: [...tableWidths, 1],
      rowTemplate: [...tableColumns.map((_column, index) => tableTemplate[index] || ''), `{{custom_${nextIndex}}}`],
      rows: tablePreviewRows.map((row) => [...(Array.isArray(row) ? row : [row]), ''])
    });
  }

  function removeTableColumn(index) {
    if (tableColumns.length <= 1) return;
    const columns = tableColumns.filter((_column, columnIndex) => columnIndex !== index);
    patchTableContent({
      columns,
      columnWidths: tableWidths.filter((_width, widthIndex) => widthIndex !== index),
      rowTemplate: tableTemplate.filter((_cell, cellIndex) => cellIndex !== index),
      rows: tablePreviewRows.map((row) => (Array.isArray(row) ? row : [row]).filter((_cell, cellIndex) => cellIndex !== index))
    });
  }

  return (
    <div className="pdf-inspector-grid">
      <BuilderTextInput label="Element name" value={element.name} disabled={disabled} onChange={(value) => onPatch({ name: value, title: value })} />
      {element.type === 'card' ? (
        <>
          <BuilderTextInput label="Title" value={content.title} disabled={disabled} onChange={(value) => onPatch({ content: { title: value } })} onCursor={remember('title', content.title)} />
          <BuilderTextarea label="Body/content text" value={content.body} disabled={disabled} onChange={(value) => onPatch({ content: { body: value } })} onCursor={remember('body', content.body)} />
        </>
      ) : element.type === 'table' ? (
        <>
          <BuilderTextInput label="Table title" value={content.title} disabled={disabled} onChange={(value) => onPatch({ content: { title: value } })} onCursor={remember('title', content.title)} />
          <div className="pdf-table-editor pdf-field-full">
            <div className="pdf-table-editor-head">
              <div>
                <p>Table structure</p>
                <span>{tableColumns.length} columns - {content.dynamicRows !== false ? 'uses live document rows' : 'uses design preview rows'}</span>
              </div>
              <button type="button" className="btn btn-secondary admin-compact-button" disabled={disabled || tableColumns.length >= 8} onClick={addTableColumn}>
                <Plus className="h-4 w-4" />
                Add Column
              </button>
            </div>
            <div className="pdf-table-column-list">
              {tableColumns.map((column, index) => (
                <div className="pdf-table-column-row" key={`table-column-${index}`}>
                  <span className="pdf-table-column-index">{index + 1}</span>
                  <label>
                    <span>Column</span>
                    <input className="input" value={column} disabled={disabled} onChange={(event) => updateTableColumn(index, event.target.value)} />
                  </label>
                  <label>
                    <span>Width</span>
                    <input className="input" type="number" min="0.1" step="0.1" value={tableWidths[index] ?? 1} disabled={disabled} onChange={(event) => updateTableWidth(index, event.target.value)} />
                  </label>
                  <button type="button" className="icon-button pdf-danger-icon" disabled={disabled || tableColumns.length <= 1} onClick={() => removeTableColumn(index)} title="Remove column">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <BuilderToggle label="Dynamic live rows" checked={content.dynamicRows !== false} disabled={disabled} onChange={(checked) => patchTableContent({ dynamicRows: checked })} />
          <BuilderHint tone="info">
            Dynamic rows use real document line items in Draft Preview and published PDFs. Preview rows below remain design-only sample content.
          </BuilderHint>
          {content.dynamicRows !== false ? (
            <div className="pdf-table-template-editor pdf-field-full">
              <div className="pdf-table-editor-head">
                <div>
                  <p>Live row template</p>
                  <span>Map each table column to an existing variable.</span>
                </div>
              </div>
              <div className="pdf-table-template-grid">
                {tableColumns.map((column, index) => (
                  <label key={`table-template-${index}`} className="pdf-control-field">
                    <span className="label">{column}</span>
                    <input
                      className="input"
                      value={tableTemplate[index] || ''}
                      disabled={disabled}
                      onChange={(event) => updateRowTemplate(index, event.target.value)}
                      onFocus={remember(`rowTemplate.${index}`, tableTemplate[index] || '')}
                      onSelect={remember(`rowTemplate.${index}`, tableTemplate[index] || '')}
                      onClick={remember(`rowTemplate.${index}`, tableTemplate[index] || '')}
                      onKeyUp={remember(`rowTemplate.${index}`, tableTemplate[index] || '')}
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <BuilderNumberInput
            label="Preview row count"
            value={content.previewRowCount ?? 5}
            min={1}
            max={12}
            disabled={disabled}
            onChange={(value) => patchTableContent({ previewRowCount: value })}
          />
          <BuilderTextarea
            label="Preview rows (design only), one row per line"
            value={formatTableRows(content.rows)}
            disabled={disabled}
            rows={5}
            onChange={(value) => patchTableContent({ rows: parseTableRows(value, tableColumns.length || 4) })}
          />
        </>
      ) : element.type === 'icon' ? (
        <>
          <BuilderTextInput label="Icon label" value={content.label} disabled={disabled} onChange={(value) => onPatch({ content: { label: value } })} onCursor={remember('label', content.label)} />
          <BuilderSelect
            label="Icon display"
            value={content.iconMode === 'emoji' ? 'emoji' : 'vector'}
            options={iconModeOptions}
            disabled={disabled}
            onChange={(value) => onPatch({ content: { iconMode: value } })}
          />
          {content.iconMode === 'emoji' ? (
            <>
              <BuilderSelect
                label="Emoji preset"
                value={content.emoji || '✅'}
                options={emojiIconOptions}
                disabled={disabled}
                onChange={(value) => onPatch({ content: { emoji: value } })}
              />
              <BuilderTextInput label="Custom emoji" value={content.emoji || '✅'} disabled={disabled} onChange={(value) => onPatch({ content: { emoji: value } })} onCursor={remember('emoji', content.emoji || '✅')} />
              <BuilderHint tone="info">Draft preview PDFs render these emoji through Chromium; the browser may use a monochrome substitute if color emoji glyphs are unavailable.</BuilderHint>
            </>
          ) : null}
          <BuilderSelect
            label="Icon variant"
            value={iconVariantValue}
            options={iconOptions}
            disabled={disabled || content.iconMode === 'emoji'}
            onChange={(value) => onPatch({ content: { variant: value === 'generic' ? '' : value, iconName: value === 'generic' ? '' : value } })}
          />
          <BuilderTextInput label="Icon name" value={content.iconName} disabled={disabled || content.iconMode === 'emoji'} onChange={(value) => onPatch({ content: { iconName: value } })} onCursor={remember('iconName', content.iconName)} />
        </>
      ) : element.type === 'qr' ? (
        <>
          <BuilderTextInput label="QR label" value={content.label} disabled={disabled} onChange={(value) => onPatch({ content: { label: value } })} onCursor={remember('label', content.label)} />
          <BuilderSelect label="QR type" value={content.qrType || element.qrType || 'payment'} options={[['payment', 'Payment'], ['contact', 'Contact'], ['company', 'Company'], ['custom', 'Custom']]} disabled={disabled} onChange={(value) => onPatch({ qrType: value, content: { qrType: value } })} />
          <BuilderTextarea label="Helper text" value={content.helperText} disabled={disabled} rows={3} onChange={(value) => onPatch({ content: { helperText: value } })} onCursor={remember('helperText', content.helperText)} />
        </>
      ) : element.type === 'signature' ? (
        <>
          <BuilderTextInput label="Label" value={content.label} disabled={disabled} onChange={(value) => onPatch({ content: { label: value } })} onCursor={remember('label', content.label)} />
          <BuilderTextInput label="Name" value={content.name} disabled={disabled} onChange={(value) => onPatch({ content: { name: value } })} onCursor={remember('name', content.name)} />
          <BuilderTextInput label="Designation" value={content.designation} disabled={disabled} onChange={(value) => onPatch({ content: { designation: value } })} onCursor={remember('designation', content.designation)} />
        </>
      ) : element.type === 'image' ? (
        <>
          <BuilderTextInput label="Label" value={content.label} disabled={disabled} onChange={(value) => onPatch({ content: { label: value } })} onCursor={remember('label', content.label)} />
          <BuilderSelect
            label="Image role"
            value={content.imageMode || (isBackgroundElement(element) ? 'watermark' : 'logo')}
            options={[['logo', 'Company logo'], ['watermark', 'Watermark'], ['custom', 'Custom image']]}
            disabled={disabled}
            onChange={(value) => onPatch({
              content: {
                imageMode: value,
                assetPath: value === 'watermark' ? '/logo-icon.png' : value === 'logo' ? '/logo-full.png' : content.assetPath || '',
                backgroundElement: value === 'watermark'
              },
              backgroundElement: value === 'watermark',
              groupId: value === 'watermark' ? 'watermark' : element.groupId,
              zIndex: value === 'watermark' ? 1 : element.zIndex,
              style: value === 'watermark' ? { opacity: 0.08 } : {}
            })}
          />
          <BuilderTextInput
            label="Asset path"
            value={content.assetPath || content.imageUrl || content.src || (content.imageMode === 'watermark' ? '/logo-icon.png' : '/logo-full.png')}
            disabled={disabled || content.imageMode === 'watermark'}
            onChange={(value) => onPatch({ content: { assetPath: value } })}
            onCursor={remember('assetPath', content.assetPath || '')}
          />
          <BuilderSelect
            label="Object fit"
            value={content.fitToFrame === false ? 'contain-padded' : 'contain'}
            options={[['contain', 'Contain'], ['contain-padded', 'Contain with padding']]}
            disabled={disabled}
            onChange={(value) => onPatch({ content: { fitToFrame: value === 'contain' } })}
          />
          {isBackgroundElement(element) ? <BuilderHint tone="info">Watermarks use the real `/logo-icon.png` asset and stay behind the invoice until background selection is enabled.</BuilderHint> : null}
        </>
      ) : element.type === 'divider' || element.type === 'spacer' ? (
        <BuilderTextInput label="Label" value={content.label} disabled={disabled} onChange={(value) => onPatch({ content: { label: value } })} onCursor={remember('label', content.label)} />
      ) : (
        <BuilderTextarea label="Body/content text" value={content.text || elementPrimaryText(element)} disabled={disabled} onChange={(value) => onPatch({ content: { text: value } })} onCursor={remember('text', content.text || elementPrimaryText(element))} />
      )}
      <button type="button" className="btn btn-secondary justify-center pdf-field-full" onClick={onOpenVariables}>
        <ShieldCheck className="h-4 w-4" />
        Variable insert helper
      </button>
    </div>
  );
}

function ElementLayoutControls({
  element,
  pages,
  disabled,
  onPatch,
  onMoveToNextPage = null,
  canMoveToNextPage = false,
  onApplyToAllPages = null,
  canApplyToAllPages = false
}) {
  const pageOptions = pages.map((page, index) => [page.id, page.name || `Page ${index + 1}`]);
  const invoiceManifestElement = isInvoiceManifestElement(element);
  const minWidth = invoiceManifestElement ? 0.1 : 24;
  const minHeight = invoiceManifestElement ? 0.1 : 8;
  const displayNumber = (value) => invoiceManifestElement ? Number(value || 0) : Math.round(value || 0);
  return (
    <div className="pdf-inspector-grid">
      <BuilderNumberInput label="X position" value={displayNumber(element.x)} max={builderCanvas.width} step={invoiceManifestElement ? 0.1 : 1} disabled={disabled} onChange={(value) => onPatch({ x: value })} />
      <BuilderNumberInput label="Y position" value={displayNumber(element.y)} max={builderCanvas.height} step={invoiceManifestElement ? 0.1 : 1} disabled={disabled} onChange={(value) => onPatch({ y: value })} />
      <BuilderSelect label="Width" value={element.widthMode || 'custom'} options={[['full', 'Full width'], ['half', 'Half width'], ['custom', 'Custom']]} disabled={disabled} onChange={(value) => {
        if (value === 'full') onPatch({ widthMode: value, fullWidth: true, x: 32, width: builderCanvas.width - 64 });
        else if (value === 'half') onPatch({ widthMode: value, fullWidth: false, width: Math.round((builderCanvas.width - 80) / 2) });
        else onPatch({ widthMode: value, fullWidth: false });
      }} />
      {element.widthMode === 'custom' || !element.widthMode ? <BuilderNumberInput label="Custom width" value={displayNumber(element.width)} min={minWidth} max={builderCanvas.width} step={invoiceManifestElement ? 0.1 : 1} disabled={disabled} onChange={(value) => onPatch({ width: value, widthMode: 'custom' })} /> : null}
      <BuilderNumberInput label="Height" value={displayNumber(element.height)} min={minHeight} max={builderCanvas.height} step={invoiceManifestElement ? 0.1 : 1} disabled={disabled} onChange={(value) => onPatch({ height: value })} />
      <BuilderSelect label="Alignment" value={element.style?.alignment || element.alignment || 'left'} options={[['left', 'Left'], ['center', 'Center'], ['right', 'Right']]} disabled={disabled} onChange={(value) => onPatch({ alignment: value, style: { alignment: value } })} />
      <BuilderToggle label="Full width" checked={element.fullWidth === true} disabled={disabled} onChange={(checked) => onPatch(checked ? { fullWidth: true, widthMode: 'full', x: 32, width: builderCanvas.width - 64 } : { fullWidth: false, widthMode: 'custom' })} />
      <BuilderToggle label="Two-column card" checked={element.twoColumn === true} disabled={disabled || element.type !== 'card'} onChange={(checked) => onPatch({ twoColumn: checked, content: { twoColumn: checked } })} />
      <BuilderSelect label="Page number" value={element.pageId || 'page-1'} options={pageOptions} disabled={disabled} onChange={(value) => onPatch({ pageId: value })} />
      {onMoveToNextPage || onApplyToAllPages ? (
        <div className="pdf-layout-quick-actions pdf-field-full">
          {onMoveToNextPage ? (
            <button type="button" className="btn btn-secondary justify-center" disabled={disabled || !canMoveToNextPage} onClick={onMoveToNextPage}>
              <ArrowDown className="h-4 w-4" />
              Move to Next Page
            </button>
          ) : null}
          {onApplyToAllPages ? (
            <button type="button" className="btn btn-secondary justify-center" disabled={disabled || !canApplyToAllPages || pages.length <= 1} onClick={onApplyToAllPages}>
              <Copy className="h-4 w-4" />
              Apply to All Pages
            </button>
          ) : null}
        </div>
      ) : null}
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
  const invoiceManifestElement = isInvoiceManifestElement(element);
  const patchAccentColor = (value) => {
    onPatch({ style: element.type === 'icon' ? { accentColor: value, textColor: value } : { accentColor: value } });
  };
  const patchTextColor = (value) => {
    onPatch({ style: element.type === 'icon' ? { textColor: value, accentColor: value } : { textColor: value } });
  };
  return (
    <div className="pdf-inspector-grid">
      <ColorControl label="Accent color" value={style.accentColor} disabled={disabled} onChange={patchAccentColor} />
      <ColorControl label="Background color" value={style.backgroundColor} disabled={disabled || element.type === 'divider'} onChange={(value) => onPatch({ style: { backgroundColor: value } })} />
      <ColorControl label={element.type === 'icon' ? 'Icon color' : 'Text color'} value={style.textColor} disabled={disabled || element.type === 'divider'} onChange={patchTextColor} />
      <ColorControl label="Border color" value={style.borderColor} disabled={disabled || element.type === 'divider'} onChange={(value) => onPatch({ style: { borderColor: value } })} />
      <BuilderNumberInput label="Border radius" value={style.borderRadius ?? 10} max={32} disabled={disabled || element.type === 'divider'} onChange={(value) => onPatch({ style: { borderRadius: value } })} />
      <BuilderNumberInput label="Border" value={style.borderWidth ?? 1} max={8} step={element.type === 'table' ? 0.1 : 1} disabled={disabled || element.type === 'divider'} onChange={(value) => onPatch({ style: { borderWidth: value } })} />
      <BuilderToggle label="Shadow" checked={style.shadow === true} disabled={disabled || element.type === 'divider'} onChange={(checked) => onPatch({ style: { shadow: checked } })} />
      <BuilderNumberInput label="Opacity" value={style.opacity ?? 1} min={0} max={1} step={0.01} disabled={disabled} onChange={(value) => onPatch({ style: { opacity: value } })} />
      <BuilderNumberInput label={element.type === 'icon' ? 'Icon size' : 'Font size'} value={style.fontSize ?? 13} min={invoiceManifestElement ? 4 : 8} max={32} step={invoiceManifestElement ? 0.1 : 1} disabled={disabled || element.type === 'divider'} onChange={(value) => onPatch({ style: { fontSize: value } })} />
      <BuilderSelect label="Font weight" value={String(style.fontWeight || 700)} options={[['400', 'Regular'], ['600', 'Semi bold'], ['700', 'Bold'], ['800', 'Extra bold']]} disabled={disabled || element.type === 'divider'} onChange={(value) => onPatch({ style: { fontWeight: Number(value) } })} />
      <BuilderNumberInput label="Line height" value={style.lineHeight ?? 1.16} min={0.85} max={2.4} step={0.01} disabled={disabled || element.type === 'divider'} onChange={(value) => onPatch({ style: { lineHeight: value } })} />
      {element.type === 'table' ? (
        <>
          <ColorControl label="Header background" value={style.headerBackgroundColor || style.accentColor || '#0f2a52'} disabled={disabled} onChange={(value) => onPatch({ style: { headerBackgroundColor: value, accentColor: value } })} />
          <ColorControl label="Header text color" value={style.headerTextColor || '#ffffff'} disabled={disabled} onChange={(value) => onPatch({ style: { headerTextColor: value } })} />
          <ColorControl label="Row background" value={style.rowBackgroundColor || '#ffffff'} disabled={disabled} onChange={(value) => onPatch({ style: { rowBackgroundColor: value } })} />
          <ColorControl label="Alternate row background" value={style.alternateRowBackgroundColor || '#f8fafc'} disabled={disabled} onChange={(value) => onPatch({ style: { alternateRowBackgroundColor: value } })} />
          <BuilderNumberInput label="Table row height" value={style.rowHeight ?? 18} min={12} max={34} disabled={disabled} onChange={(value) => onPatch({ style: { rowHeight: value } })} />
          <BuilderNumberInput label="Cell padding X" value={style.paddingX ?? 4} min={0} max={24} disabled={disabled} onChange={(value) => onPatch({ style: { paddingX: value } })} />
          <BuilderNumberInput label="Cell padding Y" value={style.paddingY ?? 5} min={0} max={24} disabled={disabled} onChange={(value) => onPatch({ style: { paddingY: value } })} />
          <BuilderSelect label="Table text alignment" value={style.alignment || element.alignment || 'left'} options={[['left', 'Left'], ['center', 'Center'], ['right', 'Right']]} disabled={disabled} onChange={(value) => onPatch({ alignment: value, style: { alignment: value } })} />
        </>
      ) : null}
      {element.type === 'divider' ? (
        <>
          <BuilderSelect label="Orientation" value={style.orientation || (Number(element.height || 0) > Number(element.width || 0) ? 'vertical' : 'horizontal')} options={[['horizontal', 'Horizontal'], ['vertical', 'Vertical']]} disabled={disabled} onChange={(value) => onPatch({ style: { orientation: value, rotate: value === 'vertical' ? 90 : 0 } })} />
          <BuilderNumberInput label="Thickness" value={style.dividerThickness ?? 2} min={invoiceManifestElement ? 0.1 : 1} max={8} step={invoiceManifestElement ? 0.1 : 1} disabled={disabled} onChange={(value) => onPatch({ style: { dividerThickness: value } })} />
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

function pdfViewerUrl(url = '') {
  return url ? `${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH` : '';
}

function LivePreviewPanel({ template, previewUrl, previewLoading, previewError, liveDesignModeActive = false }) {
  const framedPreviewUrl = pdfViewerUrl(previewUrl);

  function openPreviewPdf() {
    if (!previewUrl) return;
    window.open(framedPreviewUrl || previewUrl, '_blank', 'noopener,noreferrer');
  }

  function downloadPreviewPdf() {
    if (!previewUrl) return;
    const anchor = document.createElement('a');
    anchor.href = previewUrl;
    anchor.download = `${template.key}-backup-layout-preview.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <section className={`surface admin-control-card pdf-live-preview-panel p-3 ${liveDesignModeActive ? 'is-secondary' : ''}`}>
      <div className="pdf-backup-preview-head">
        <div className="min-w-0">
          <div className="pdf-structured-badge-row">
            <span className="pdf-structured-mode-badge is-backup">Backup Preview</span>
            {liveDesignModeActive ? <span className="pdf-structured-mode-badge is-live">Live Design Active</span> : null}
          </div>
          <h3>Backup Layout Preview</h3>
          <p>This preview shows the backup structured layout. Your published Design Mode template is used for live invoices.</p>
        </div>
        <div className="pdf-preview-actions">
          <button type="button" className="btn btn-secondary admin-compact-button" disabled={!previewUrl} onClick={openPreviewPdf}>
            <Maximize2 className="h-4 w-4" />
            Open PDF
          </button>
          <button type="button" className="btn btn-secondary admin-compact-button" disabled={!previewUrl} onClick={downloadPreviewPdf}>
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
        {previewLoading ? <Loader2 className="h-4 w-4 animate-spin text-sky-100" /> : null}
      </div>
      <div className="pdf-preview-frame">
        {previewUrl ? (
          <div className="pdf-preview-page-shell">
            <iframe title={`${template.name} backup layout preview`} src={framedPreviewUrl} className="w-full bg-white" />
          </div>
        ) : (
          <div className="pdf-preview-empty grid place-items-center p-6 text-center text-sm muted">
            {previewError || 'Preparing PDF preview...'}
          </div>
        )}
      </div>
      {previewError ? <p className="mt-3 rounded-card border border-rose-400/25 bg-rose-500/10 p-3 text-sm font-semibold text-rose-100">{previewError}</p> : null}
      <p className="mt-3 text-xs muted">Backup layout edits are used only for this preview until you save the template.</p>
    </section>
  );
}

function StructuredFallbackBanner({ liveDesignModeActive }) {
  return (
    <div className="pdf-structured-fallback-banner">
      <div className="min-w-0">
        <div className="pdf-structured-badge-row">
          {liveDesignModeActive ? <span className="pdf-structured-mode-badge is-live">Live Design Active</span> : null}
          <span className="pdf-structured-mode-badge is-backup">Backup Layout</span>
        </div>
        <h3>Backup Invoice Layout</h3>
        <p>Live invoices use your published Design Mode template. This backup layout is used only when no live design is available or for default comparison preview.</p>
      </div>
    </div>
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
  const variableLabel = isQr ? 'Optional QR text/value' : isSignature ? 'Signature image URL or backup text' : 'Optional variable value';

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
  onRestore,
  onRenameVersion,
  onDeleteVersion,
  deletingVersionId = '',
  liveDesignModeActive = false
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
        <LivePreviewPanel
          template={template}
          previewUrl={previewUrl}
          previewLoading={previewLoading}
          previewError={previewError}
          liveDesignModeActive={liveDesignModeActive}
        />
        <VersionHistoryPanel
          versions={versions}
          restoring={restoring}
          onRestore={onRestore}
          onRenameVersion={onRenameVersion}
          onDeleteVersion={onDeleteVersion}
          deletingVersionId={deletingVersionId}
        />
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
  onSaveDraft,
  onPublishDesign: onPublishDesignCommit,
  onCancel,
  onPreview,
  onDownload,
  onReset,
  versions,
  restoring,
  onRestore,
  onRenameVersion,
  onDeleteVersion,
  deletingVersionId,
  onShowVariables,
  onDesignDirtyChange,
  onDesignModeChange
}) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [designDraft, setDesignDraft] = useState(() => designStateFromConfig(draft));
  const previewUrlRef = useRef('');
  const requestIdRef = useRef(0);
  const sections = templateSectionDefinitions[template.key] || [];
  const busy = Boolean(busyKey) || saving;
  const designMode = true;
  const draftDesignSignature = stableJson(draft.design || {});
  const savedDesignState = useMemo(() => designStateFromConfig(draft), [draftDesignSignature]);
  const designDraftDirty = stableJson(normalizeDesignState(designDraft)) !== stableJson(savedDesignState);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  useEffect(() => {
    setDesignDraft(designStateFromConfig(draft));
  }, [template.key]);

  useEffect(() => {
    setDesignDraft(savedDesignState);
  }, [savedDesignState]);

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
          body: JSON.stringify({ config: configForDefaultPdfPreview(draft), previewIntent: 'default' })
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
    if (designMode || designDraftDirty) {
      const draftConfig = mergeDesignStateForSave(draft, designForSave);
      setDesignDraft(designStateFromConfig(draftConfig));
      (onSaveDraft || onSave)(event, draftConfig);
      return;
    }
    onSave(event, draft);
  }

  function publishDesign(designForPublish = designDraft, snapshot = null) {
    const nextDesign = designStateWithTemplateSections(designForPublish, sections, draft, template);
    const publishConfig = mergeDesignStateForSave(draft, nextDesign, { publish: true });
    setDesignDraft(designStateFromConfig(publishConfig));
    onPublishDesignCommit?.(publishConfig, snapshot);
  }

  return (
    <>
      <form className="grid gap-5 pdf-design-editor-form" onSubmit={submit}>
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
          onRestore={(version) => onRestore(version, { asDraft: true })}
          onRenameVersion={onRenameVersion}
          onDeleteVersion={onDeleteVersion}
          deletingVersionId={deletingVersionId}
          hasUnsavedDesignChanges={designDraftDirty}
          previewUrl={previewUrl}
          previewLoading={previewLoading}
          previewError={previewError}
          token={token}
          onBack={onCancel}
          onPreview={onPreview}
          onDownload={onDownload}
          onPublishDesign={publishDesign}
          onShowVariables={onShowVariables}
        />
      </form>
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
  const [deleteVersionCandidate, setDeleteVersionCandidate] = useState(null);
  const [deletingVersionId, setDeletingVersionId] = useState('');
  const [renameVersionCandidate, setRenameVersionCandidate] = useState(null);
  const [renamingVersion, setRenamingVersion] = useState(false);
  const [designEditorDirty, setDesignEditorDirty] = useState(false);
  const canEdit = hasRole(user, 'admin') && can(user, 'manage_pdf_templates');
  const { data, loading, error, reload } = useResource(() => request('/pdf-templates'), [request]);
  const templates = data?.templates || [];
  const activeTemplate = templates.find((template) => template.key === editingKey) || null;
  const activeEditorConfig = activeTemplate ? editorConfigForTemplate(activeTemplate) : {};
  const editorDirty = Boolean(activeTemplate && stableJson(draft) !== stableJson(activeEditorConfig)) || designEditorDirty;
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
    setDraft(editorConfigForTemplate(template));
  }

  function previewIntentForConfig(config = null, fallback = 'saved') {
    if (fallback) return fallback;
    if (config?.design?.previewDraft === true) return 'draft';
    if (config?.design?.enabled === false) return 'default';
    return 'saved';
  }

  async function fetchTemplatePdf(template, config = null, options = {}) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const intent = previewIntentForConfig(config, options.intent || '');
    // Keep the preview intent explicit so draft and default previews never share the same client request path.
    const payload = config || intent || options.draftCanvasHtml
      ? {
        ...(config ? { config } : {}),
        previewIntent: intent
      }
      : null;
    if (payload && intent === 'draft') {
      payload.draftCanvasHtml = options.draftCanvasHtml || '';
      payload.draftMeta = options.draftMeta || null;
    }
    const body = payload ? JSON.stringify(payload) : undefined;
    if (body) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${apiBase}/pdf-templates/${template.key}/preview`, {
      method: 'POST',
      headers,
      body
    });
    if (!response.ok) {
      let message = 'PDF preview failed';
      const contentType = response.headers.get('content-type') || '';
      try {
        if (contentType.includes('application/json')) {
          const errorPayload = await response.json();
          message = errorPayload.message || errorPayload.error || message;
        } else {
          const errorText = await response.text();
          if (errorText) message = errorText;
        }
      } catch {
        // Keep the generic message if the server response body cannot be parsed.
      }
      throw new Error(message);
    }
    const blob = await response.blob();
    return new Blob([blob], { type: 'application/pdf' });
  }

  async function previewTemplate(template, config = null, options = {}) {
    const intent = previewIntentForConfig(config, options.intent || '');
    setBusyKey(`preview-${template.key}-${intent}`);
    try {
      const blob = await fetchTemplatePdf(template, config, { ...options, intent });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function downloadTemplate(template, config = null, options = {}) {
    const intent = previewIntentForConfig(config, options.intent || '');
    setBusyKey(`download-${template.key}-${intent}`);
    try {
      const blob = await fetchTemplatePdf(template, config, { ...options, intent });
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
    const configToSave = activeTemplate.key === 'invoice'
      ? {
        ...(configOverride || draft),
        design: activeTemplate.config?.design || (configOverride || draft).design,
        designDraft: activeTemplate.config?.designDraft || (configOverride || draft).designDraft
      }
      : (configOverride || draft);
    setSaving(true);
    try {
      const result = await request(`/pdf-templates/${activeTemplate.key}`, {
        method: 'PATCH',
        body: JSON.stringify({ config: configToSave })
      });
      push(result.message || 'PDF template saved');
      await reload({ silent: true });
      setEditingKey(result.template?.key || activeTemplate.key);
      setDraft(result.template ? editorConfigForTemplate(result.template) : cloneValue(configToSave));
      setDesignEditorDirty(false);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function saveDesignDraft(event, configOverride = null) {
    event?.preventDefault?.();
    if (!activeTemplate) return;
    if (!canEdit) {
      push('Only admin users can save PDF templates', 'error');
      return;
    }
    const configToSave = configOverride || draft;
    setSaving(true);
    try {
      const result = await request(`/pdf-templates/${activeTemplate.key}/design-draft`, {
        method: 'POST',
        body: JSON.stringify({ config: configToSave })
      });
      push(result.message || 'PDF design draft saved');
      await reload({ silent: true });
      setEditingKey(result.template?.key || activeTemplate.key);
      setDraft(result.template ? editorConfigForTemplate(result.template) : cloneValue(configToSave));
      setDesignEditorDirty(false);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function publishDesign(configOverride = null, snapshot = null) {
    if (!activeTemplate) return;
    if (!canEdit) {
      push('Only admin users can publish PDF templates', 'error');
      return;
    }
    const configToPublish = configOverride || draft;
    const payload = { config: configToPublish };
    payload.publishedCanvasHtml = snapshot?.publishedCanvasHtml || snapshot?.draftCanvasHtml || '';
    payload.publishedMeta = snapshot?.publishedMeta || snapshot?.draftMeta || null;
    setSaving(true);
    try {
      const result = await request(`/pdf-templates/${activeTemplate.key}/publish-design`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      push(result.message || 'PDF design published successfully.');
      await reload({ silent: true });
      setEditingKey(result.template?.key || activeTemplate.key);
      setDraft(result.template ? editorConfigForTemplate(result.template) : cloneValue(configToPublish));
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
      if (editingKey === template.key) setDraft(result.template ? editorConfigForTemplate(result.template) : {});
      if (editingKey === template.key) setDesignEditorDirty(false);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function restoreVersion(candidate) {
    if (!activeTemplate || !canEdit) return;
    const version = candidate?.version || candidate;
    const restoreAsDraft = candidate?.asDraft === true;
    setRestoring(true);
    try {
      const versionId = version.id || version.version;
      const endpoint = restoreAsDraft
        ? `/pdf-templates/${activeTemplate.key}/restore-draft/${versionId}`
        : `/pdf-templates/${activeTemplate.key}/restore/${versionId}`;
      const result = await request(endpoint, { method: 'POST' });
      push(result.message || (restoreAsDraft ? 'Version restored as draft. Preview and publish to make it live.' : 'PDF template version restored'));
      await reload({ silent: true });
      setDraft(result.template ? editorConfigForTemplate(result.template) : {});
      setDesignEditorDirty(false);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setRestoring(false);
    }
  }

  async function deleteSavedVersion(version) {
    if (!activeTemplate || !canEdit) return;
    const versionId = version.id || version.version;
    setDeletingVersionId(String(versionId));
    try {
      const result = await request(`/pdf-templates/${activeTemplate.key}/versions/${versionId}`, { method: 'DELETE' });
      push(result.message || 'Saved version deleted');
      await reload({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setDeletingVersionId('');
    }
  }

  async function renameSavedVersion(version, displayName) {
    if (!activeTemplate || !canEdit) return;
    const versionId = version.id || version.version;
    const nextName = String(displayName || '').trim();
    if (!nextName) {
      push('Version name is required', 'error');
      return;
    }
    setRenamingVersion(true);
    try {
      const result = await request(`/pdf-templates/${activeTemplate.key}/versions/${versionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ displayName: nextName })
      });
      push(result.message || 'Version renamed successfully.');
      await reload({ silent: true });
      setRenameVersionCandidate(null);
    } catch (err) {
      push(err.message || 'Version rename failed', 'error');
    } finally {
      setRenamingVersion(false);
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
          onSaveDraft={saveDesignDraft}
          onPublishDesign={publishDesign}
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
          onRestore={(version, options = {}) => setRestoreCandidate({ version, ...options })}
          onRenameVersion={(version) => setRenameVersionCandidate(version)}
          onDeleteVersion={(version) => setDeleteVersionCandidate(version)}
          deletingVersionId={deletingVersionId}
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
            loading={busyKey === `reset-${resetCandidate.key}`}
            loadingLabel="Resetting..."
            onCancel={() => setResetCandidate(null)}
            onConfirm={async () => {
              const template = resetCandidate;
              await resetTemplate(template);
              setResetCandidate(null);
            }}
          />
        ) : null}
        {restoreCandidate ? (
          <ConfirmModal
            title={restoreCandidate.asDraft ? 'Restore saved version as draft?' : 'Restore template version?'}
            message={restoreCandidate.asDraft
              ? `Restore version v${restoreCandidate.version.version} as a draft. The current published design stays live until you publish again.`
              : `Restore version v${restoreCandidate.version.version}. Existing generated PDFs will not be changed.`}
            confirmLabel={restoreCandidate.asDraft ? 'Restore as Draft' : 'Restore Version'}
            onCancel={() => setRestoreCandidate(null)}
            onConfirm={async () => {
              const version = restoreCandidate;
              setRestoreCandidate(null);
              await restoreVersion(version);
            }}
          />
        ) : null}
        {deleteVersionCandidate ? (
          <ConfirmModal
            title="Delete saved version permanently?"
            message="Delete this saved version only. This will not affect the published design or current draft."
            confirmLabel="Delete Permanently"
            loading={deletingVersionId === String(deleteVersionCandidate.id || deleteVersionCandidate.version)}
            loadingLabel="Deleting..."
            onCancel={() => setDeleteVersionCandidate(null)}
            onConfirm={async () => {
              const version = deleteVersionCandidate;
              await deleteSavedVersion(version);
              setDeleteVersionCandidate(null);
            }}
          />
        ) : null}
        {renameVersionCandidate ? (
          <RenameVersionModal
            version={renameVersionCandidate}
            saving={renamingVersion}
            onCancel={() => !renamingVersion && setRenameVersionCandidate(null)}
            onConfirm={(name) => renameSavedVersion(renameVersionCandidate, name)}
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
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Edit the fixed Universal Systems PDF templates in Design Mode with safe drafts, previews, publishing, and saved versions.</p>
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
          loading={busyKey === `reset-${resetCandidate.key}`}
          loadingLabel="Resetting..."
          onCancel={() => setResetCandidate(null)}
          onConfirm={async () => {
            const template = resetCandidate;
            await resetTemplate(template);
            setResetCandidate(null);
          }}
        />
      ) : null}
    </div>
  );
}
