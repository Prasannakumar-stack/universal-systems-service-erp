export const DEFAULT_AMC_COVERAGE_TYPE = 'Service Only AMC';
export const AMC_COVERAGE_TYPES = ['Full AMC', 'Service Only AMC', 'Parts Only AMC', 'Preventive AMC', 'Custom AMC'];
export const AUTO_AMC_PART_CHARGE_TYPE = 'Auto by AMC Coverage';
export const AUTO_AMC_PART_CHARGE_MODE = 'Auto';
export const MANUAL_AMC_PART_CHARGE_MODE = 'Manual';
export const COVERED_AMC_PART = 'Covered under AMC';
export const CHARGEABLE_AMC_PART = 'Chargeable';

const COVERAGE_PRESETS = {
  'Full AMC': { coverParts: true, coverService: true, coverVisits: true },
  'Service Only AMC': { coverParts: false, coverService: true, coverVisits: true },
  'Parts Only AMC': { coverParts: true, coverService: false, coverVisits: false },
  'Preventive AMC': { coverParts: false, coverService: false, coverVisits: true }
};

export function normalizeAmcCoverageType(value) {
  const raw = String(value || '').trim();
  return AMC_COVERAGE_TYPES.includes(raw) ? raw : DEFAULT_AMC_COVERAGE_TYPE;
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
  return COVERAGE_PRESETS[coverageType] || COVERAGE_PRESETS[DEFAULT_AMC_COVERAGE_TYPE];
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

export function amcPartChargeType(contract = {}) {
  return amcCoverageFlags(contract).coverParts ? COVERED_AMC_PART : CHARGEABLE_AMC_PART;
}

export function normalizePartChargeType(value, contract = {}, mode = AUTO_AMC_PART_CHARGE_MODE) {
  const raw = String(value || '').trim();
  if (contract && mode !== MANUAL_AMC_PART_CHARGE_MODE) return amcPartChargeType(contract);
  if (!raw || raw === AUTO_AMC_PART_CHARGE_TYPE) return amcPartChargeType(contract);
  if (raw === COVERED_AMC_PART || raw === 'Covered By AMC') return COVERED_AMC_PART;
  return CHARGEABLE_AMC_PART;
}

function amount(value) {
  const next = Number(value || 0);
  return Number.isFinite(next) && next > 0 ? next : 0;
}

export function calculateAmcCoverageBreakdown(workOrder = {}, options = {}) {
  const contract = workOrder.amcContractId || {};
  const coverage = amcCoverageSummary(contract);
  const serviceCharge = amount(options.serviceCharge ?? workOrder.serviceCharge);
  const parts = (workOrder.partsUsed || []).map((part) => {
    const total = amount(part.total);
    const chargeType = normalizePartChargeType(part.chargeType, contract, part.chargeTypeMode);
    return {
      id: part.id || part._id,
      name: part.name || '',
      quantity: Number(part.quantity || 0),
      unitPrice: amount(part.unitPrice),
      total,
      chargeType,
      coveredByAmc: chargeType === COVERED_AMC_PART
    };
  });
  const coveredParts = parts.filter((part) => part.coveredByAmc);
  const chargeableParts = parts.filter((part) => !part.coveredByAmc);
  const coveredPartsTotal = coveredParts.reduce((sum, part) => sum + amount(part.total), 0);
  const chargeablePartsTotal = chargeableParts.reduce((sum, part) => sum + amount(part.total), 0);
  const coveredServiceTotal = coverage.coverService ? serviceCharge : 0;
  const chargeableServiceTotal = coverage.coverService ? 0 : serviceCharge;
  const coveredItems = [
    ...coveredParts.map((part) => ({ label: part.name, amount: amount(part.total), type: 'part' })),
    ...(coveredServiceTotal > 0 ? [{ label: 'Service Charge', amount: coveredServiceTotal, type: 'service' }] : []),
    ...(coverage.coverVisits ? [{ label: 'AMC Visit', amount: 0, type: 'visit' }] : [])
  ];
  const chargeableItems = [
    ...chargeableParts.map((part) => ({ label: part.name, amount: amount(part.total), type: 'part' })),
    ...(chargeableServiceTotal > 0 ? [{ label: 'Service Charge', amount: chargeableServiceTotal, type: 'service' }] : [])
  ];

  return {
    ...coverage,
    serviceCharge,
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
