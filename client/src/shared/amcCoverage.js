export const amcCoverageTypes = ['Full AMC', 'Service Only AMC', 'Parts Only AMC', 'Preventive AMC', 'Custom AMC'];
export const defaultAmcCoverageType = 'Service Only AMC';
export const autoAmcPartChargeType = 'Auto by AMC Coverage';
export const autoAmcPartChargeMode = 'Auto';
export const manualAmcPartChargeMode = 'Manual';
export const coveredAmcPart = 'Covered under AMC';
export const chargeableAmcPart = 'Chargeable';
export const serviceChargeCoveredByAmc = 'covered';
export const serviceChargeChargeable = 'chargeable';
export const serviceChargeNone = 'none';

const coveragePresets = {
  'Full AMC': { coverParts: true, coverService: true, coverVisits: true },
  'Service Only AMC': { coverParts: false, coverService: true, coverVisits: true },
  'Parts Only AMC': { coverParts: true, coverService: false, coverVisits: false },
  'Preventive AMC': { coverParts: false, coverService: false, coverVisits: true }
};

export function normalizeAmcCoverageType(value) {
  const raw = String(value || '').trim();
  return amcCoverageTypes.includes(raw) ? raw : defaultAmcCoverageType;
}

function booleanValue(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export function amcCoverageFlags(contract = {}) {
  const coverageType = normalizeAmcCoverageType(contract.coverageType);
  if (coverageType === 'Custom AMC') {
    return {
      coverParts: booleanValue(contract.coverParts),
      coverService: booleanValue(contract.coverService),
      coverVisits: booleanValue(contract.coverVisits)
    };
  }
  return coveragePresets[coverageType] || coveragePresets[defaultAmcCoverageType];
}

export function amcCoverageRules(contract = {}) {
  const coverageType = normalizeAmcCoverageType(contract.coverageType);
  const flags = amcCoverageFlags(contract);
  if (coverageType === 'Full AMC') return ['Parts covered', 'Service/labor covered', 'Visits covered', 'Extra payable is zero'];
  if (coverageType === 'Service Only AMC') return ['Service/labor covered', 'Inventory parts are chargeable'];
  if (coverageType === 'Parts Only AMC') return ['Replacement parts covered', 'Service/labor is chargeable'];
  if (coverageType === 'Preventive AMC') return ['Inspection and maintenance visits covered', 'Parts, repairs, and labor are chargeable'];
  return [
    flags.coverParts ? 'Parts covered' : 'Parts chargeable',
    flags.coverService ? 'Service/labor covered' : 'Service/labor chargeable',
    flags.coverVisits ? 'Visits covered' : 'Visits chargeable'
  ];
}

export function amcCoverageSummary(contract = {}) {
  const coverageType = normalizeAmcCoverageType(contract.coverageType);
  const flags = amcCoverageFlags({ ...contract, coverageType });
  return {
    coverageType,
    ...flags,
    coverageRules: amcCoverageRules({ ...contract, coverageType, ...flags })
  };
}

const coverageStopWords = new Set([
  'all',
  'amc',
  'and',
  'asset',
  'assets',
  'covered',
  'device',
  'devices',
  'for',
  'include',
  'included',
  'item',
  'items',
  'or',
  'part',
  'parts',
  'repair',
  'repairs',
  'service',
  'services',
  'under',
  'warranty',
  'with'
]);

function normalizeCoverageText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function addCoverageTextPieces(value, pieces) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => addCoverageTextPieces(item, pieces));
    return;
  }
  if (typeof value === 'object') {
    ['name', 'partName', 'item', 'label', 'sku', 'category', 'device', 'deviceName', 'description'].forEach((key) => {
      addCoverageTextPieces(value[key], pieces);
    });
    return;
  }
  String(value)
    .split(/[\n,;|/]+/)
    .map(normalizeCoverageText)
    .filter(Boolean)
    .forEach((piece) => pieces.push(piece));
}

function coveragePhrases(contract = {}) {
  const pieces = [];
  [
    contract.warrantyCoveredItems,
    contract.coveredDevices,
    contract.coveredService,
    contract.warrantyTerms
  ].forEach((value) => addCoverageTextPieces(value, pieces));

  return Array.from(new Set(pieces)).filter((phrase) => {
    if (phrase.length < 3) return false;
    const words = phrase.split(' ').filter((word) => !coverageStopWords.has(word));
    return words.length > 0;
  });
}

function partTextPieces(part = {}) {
  const inventoryPart = part.inventoryPartId && typeof part.inventoryPartId === 'object' ? part.inventoryPartId : {};
  return [
    part.name,
    part.partName,
    part.sku,
    part.category,
    part.brand,
    part.deviceBrand,
    part.deviceModel,
    inventoryPart.partName,
    inventoryPart.name,
    inventoryPart.sku,
    inventoryPart.category,
    inventoryPart.brand,
    inventoryPart.deviceBrand,
    inventoryPart.deviceModel
  ].map(normalizeCoverageText).filter(Boolean);
}

function phraseMatchesPart(candidate, phrase) {
  if (!candidate || !phrase) return false;
  if (candidate.includes(phrase) || phrase.includes(candidate)) return true;
  const words = phrase.split(' ').filter((word) => word.length > 2 && !coverageStopWords.has(word));
  if (!words.length) return false;
  if (words.every((word) => candidate.includes(word))) return true;
  return words.some((word) => word.length >= 4 && candidate.includes(word));
}

export function partMatchesAmcCoverage(contract = {}, part = {}) {
  const candidates = partTextPieces(part);
  if (!candidates.length) return false;
  const phrases = coveragePhrases(contract);
  return phrases.some((phrase) => candidates.some((candidate) => phraseMatchesPart(candidate, phrase)));
}

export function amcPartChargeType(contract = {}, part = {}) {
  if (amcCoverageFlags(contract).coverParts) return coveredAmcPart;
  return partMatchesAmcCoverage(contract, part) ? coveredAmcPart : chargeableAmcPart;
}

export function normalizeAmcPartChargeType(value, contract = {}, mode = autoAmcPartChargeMode, part = {}) {
  const raw = String(value || '').trim();
  if (contract && mode !== manualAmcPartChargeMode) return amcPartChargeType(contract, part);
  if (!raw || raw === autoAmcPartChargeType) return amcPartChargeType(contract, part);
  if (raw === coveredAmcPart || raw === 'Covered By AMC' || raw === 'Covered by AMC') return coveredAmcPart;
  return chargeableAmcPart;
}

export function normalizeAmcServiceChargeBillingType(value, fallback = serviceChargeChargeable) {
  const raw = String(value || '').trim().toLowerCase();
  if (['covered', 'covered_by_amc', 'covered by amc', 'amc'].includes(raw)) return serviceChargeCoveredByAmc;
  if (['chargeable', 'extra', 'extra_payable', 'extra payable', 'customer'].includes(raw)) return serviceChargeChargeable;
  if (['none', 'no_service_charge', 'no service charge', 'no charge'].includes(raw)) return serviceChargeNone;
  return fallback;
}

export function amcPartBadgeLabel(contract = {}) {
  return amcPartChargeType(contract) === coveredAmcPart ? 'Covered by AMC' : 'Chargeable';
}

function amount(value) {
  const next = Number(value || 0);
  return Number.isFinite(next) && next > 0 ? next : 0;
}

export function calculateAmcCoverageBreakdown(workOrder = {}, options = {}) {
  const contract = workOrder.amcContractId || {};
  const coverage = amcCoverageSummary(contract);
  const serviceChargeBillingType = normalizeAmcServiceChargeBillingType(options.serviceChargeBillingType ?? workOrder.serviceChargeBillingType);
  const serviceCharge = serviceChargeBillingType === serviceChargeNone ? 0 : amount(options.serviceCharge ?? workOrder.serviceCharge);
  const parts = (workOrder.partsUsed || []).map((part) => {
    const total = amount(part.total);
    const chargeType = normalizeAmcPartChargeType(part.chargeType, contract, part.chargeTypeMode, part);
    return { ...part, total, chargeType, coveredByAmc: chargeType === coveredAmcPart };
  });
  const coveredParts = parts.filter((part) => part.coveredByAmc);
  const chargeableParts = parts.filter((part) => !part.coveredByAmc);
  const coveredPartsTotal = coveredParts.reduce((sum, part) => sum + amount(part.total), 0);
  const chargeablePartsTotal = chargeableParts.reduce((sum, part) => sum + amount(part.total), 0);
  const coveredServiceTotal = serviceChargeBillingType === serviceChargeCoveredByAmc ? serviceCharge : 0;
  const chargeableServiceTotal = serviceChargeBillingType === serviceChargeChargeable ? serviceCharge : 0;
  const coveredItems = [
    ...coveredParts.map((part) => ({ label: part.name, amount: amount(part.total), type: 'part' })),
    ...(coveredServiceTotal > 0 ? [{ label: 'Service charge covered by AMC', amount: coveredServiceTotal, type: 'service' }] : []),
    ...(coverage.coverVisits ? [{ label: 'AMC Visit', amount: 0, type: 'visit' }] : [])
  ];
  const chargeableItems = [
    ...chargeableParts.map((part) => ({ label: part.name, amount: amount(part.total), type: 'part' })),
    ...(chargeableServiceTotal > 0 ? [{ label: 'Service charge chargeable to customer', amount: chargeableServiceTotal, type: 'service' }] : [])
  ];

  return {
    ...coverage,
    serviceCharge,
    serviceChargeBillingType,
    parts,
    coveredParts,
    chargeableParts,
    coveredPartsTotal,
    chargeablePartsTotal,
    coveredServiceTotal,
    chargeableServiceTotal,
    coveredTotal: coveredPartsTotal + coveredServiceTotal,
    extraPayable: chargeablePartsTotal + chargeableServiceTotal,
    coveredItems,
    chargeableItems
  };
}
