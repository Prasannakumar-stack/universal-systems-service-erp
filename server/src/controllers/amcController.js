import { createAmcContract, createWorkOrderFromAmc, listAmcContracts, listAmcRenewals, listAmcSchedule } from '../services/amcService.js';
import { required } from '../utils/http.js';

export async function listContracts(req, res) {
  const data = await listAmcContracts(req.query);
  res.json(data);
}

export async function createContract(req, res) {
  required(req.body, ['customerName', 'phone', 'contractType', 'serviceFrequency', 'startDate', 'endDate']);
  const contract = await createAmcContract(req.body, req.user);
  res.status(201).json({ contract, message: 'AMC contract created' });
}

export async function listSchedule(req, res) {
  const data = await listAmcSchedule(req.query);
  res.json(data);
}

export async function listRenewals(req, res) {
  const data = await listAmcRenewals();
  res.json(data);
}

export async function postWorkOrder(req, res) {
  const data = await createWorkOrderFromAmc(req.params.id, req.body, req.user);
  res.status(201).json({ ...data, message: 'Repair & Service Job created from AMC visit' });
}
