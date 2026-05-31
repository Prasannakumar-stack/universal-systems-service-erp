import { createPurchase, deletePurchase, getPurchase, listPurchases, savePurchaseBill, updatePurchase } from '../services/purchaseImportService.js';

export async function list(req, res) {
  return listPurchases(req, res);
}

export async function detail(req, res) {
  const purchase = await getPurchase(req.params.id);
  res.json({ purchase });
}

export async function create(req, res) {
  const purchase = await createPurchase(req.body, req.user);
  res.status(201).json({ purchase, message: 'Purchase / import saved' });
}

export async function update(req, res) {
  const purchase = await updatePurchase(req.params.id, req.body, req.user);
  res.json({ purchase, message: 'Purchase / import updated' });
}

export async function remove(req, res) {
  await deletePurchase(req.params.id, req.user);
  res.json({ message: 'Purchase / import deleted' });
}

export async function uploadBill(req, res) {
  const purchase = await savePurchaseBill(req.params.id, req.file, req.user);
  res.json({ purchase, message: 'Bill / invoice uploaded' });
}
