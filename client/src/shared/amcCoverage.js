export const amcCoverageTypes = ['Full AMC', 'Service Only AMC', 'Parts Only AMC', 'Preventive AMC', 'Custom AMC'];
export const defaultAmcCoverageType = 'Service Only AMC';
export const autoAmcPartChargeType = 'Auto by AMC Coverage';
export const autoAmcPartChargeMode = 'Auto';
export const manualAmcPartChargeMode = 'Manual';
export const coveredAmcPart = 'Covered under AMC';
export const chargeableAmcPart = 'Chargeable';

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

export function amcPartChargeType(contract = {}) {
  return amcCoverageFlags(contract).coverParts ? coveredAmcPart : chargeableAmcPart;
}

export function normalizeAmcPartChargeType(value, contract = {}, mode = autoAmcPartChargeMode) {
  const raw = String(value || '').trim();
  if (contract && mode !== manualAmcPartChargeMode) return amcPartChargeType(contract);
  if (!raw || raw === autoAmcPartChargeType) return amcPartChargeType(contract);
  if (raw === coveredAmcPart || raw === 'Covered By AMC') return coveredAmcPart;
  return chargeableAmcPart;
}

export function amcPartBadgeLabel(contract = {}) {
  return amcPartChargeType(contract) === coveredAmcPart ? 'Covered By AMC' : 'Chargeable';
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
    const chargeType = normalizeAmcPartChargeType(part.chargeType, contract, part.chargeTypeMode);
    return { ...part, total, chargeType, coveredByAmc: chargeType === coveredAmcPart };
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
