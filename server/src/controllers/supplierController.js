import { createSupplier, deleteSupplier, listSuppliers, updateSupplier } from '../services/supplierService.js';

export async function list(req, res) {
  return listSuppliers(req, res);
}

export async function create(req, res) {
  const supplier = await createSupplier(req.body, req.user);
  res.status(201).json({ supplier, message: 'Supplier saved' });
}

export async function update(req, res) {
  const supplier = await updateSupplier(req.params.id, req.body, req.user);
  res.json({ supplier, message: 'Supplier updated' });
}

export async function remove(req, res) {
  await deleteSupplier(req.params.id);
  res.json({ message: 'Supplier deleted' });
}
