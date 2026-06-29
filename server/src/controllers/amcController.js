import {
  archiveAmcContract,
  createAmcContract,
  createWorkOrderFromAmc,
  deleteOrArchiveAmcContract,
  listAmcContracts,
  listAmcRenewals,
  listAmcSchedule,
  moveAmcContractToTrash,
  permanentlyDeleteAmcContract,
  restoreAmcContract,
  updateAmcContractAssignment
} from '../services/amcService.js';
import { required } from '../utils/http.js';

export async function listContracts(req, res) {
  const data = await listAmcContracts(req.query, req.user);
  res.json(data);
}

export async function createContract(req, res) {
  required(req.body, ['customerName', 'phone', 'contractType', 'serviceFrequency', 'startDate', 'endDate']);
  const contract = await createAmcContract(req.body, req.user);
  res.status(201).json({ contract, message: 'AMC contract created' });
}

export async function listSchedule(req, res) {
  const data = await listAmcSchedule(req.query, req.user);
  res.json(data);
}

export async function listRenewals(req, res) {
  const data = await listAmcRenewals(req.user);
  res.json(data);
}

export async function postWorkOrder(req, res) {
  const data = await createWorkOrderFromAmc(req.params.id, req.body, req.user);
  res.status(201).json({ ...data, message: 'Repair & Service Job created from AMC visit' });
}

export async function patchAssignment(req, res) {
  const contract = await updateAmcContractAssignment(req.params.id, req.body, req.user);
  res.json({ contract, message: 'AMC contract reassigned successfully.' });
}

export async function removeContract(req, res) {
  const result = await deleteOrArchiveAmcContract(req.params.id, req.user);
  res.json({ success: true, ...result });
}

export async function archiveContract(req, res) {
  const result = await archiveAmcContract(req.params.id, req.user);
  res.json({ success: true, ...result });
}

export async function moveContractToTrash(req, res) {
  const result = await moveAmcContractToTrash(req.params.id, req.user);
  res.json({ success: true, ...result });
}

export async function restoreContract(req, res) {
  const result = await restoreAmcContract(req.params.id, req.user);
  res.json({ success: true, ...result });
}

export async function removeContractPermanently(req, res) {
  const result = await permanentlyDeleteAmcContract(req.params.id, req.user);
  res.json({ success: true, ...result });
}
