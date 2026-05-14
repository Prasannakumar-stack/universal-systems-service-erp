import mongoose from 'mongoose';
import { clean } from './http.js';

export function escapeRegex(value = '') {
  return clean(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function searchRegex(value = '') {
  const escaped = escapeRegex(value);
  return escaped ? new RegExp(escaped, 'i') : null;
}

export function parsePagination(query = {}, { defaultLimit = 20, maxLimit = 50 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const requestedLimit = Number.parseInt(query.limit, 10) || defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, requestedLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function paginationMeta(page, limit, total) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
}

export function addDateRange(filter, query = {}, field = 'createdAt') {
  const dateFrom = clean(query.dateFrom);
  const dateTo = clean(query.dateTo);
  if (!dateFrom && !dateTo) return filter;
  filter[field] = {};
  if (dateFrom) {
    const from = new Date(dateFrom);
    if (!Number.isNaN(from.getTime())) filter[field].$gte = from;
  }
  if (dateTo) {
    const to = new Date(dateTo);
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      filter[field].$lte = to;
    }
  }
  if (!Object.keys(filter[field]).length) delete filter[field];
  return filter;
}

export function validObjectId(value) {
  const id = clean(value);
  return mongoose.Types.ObjectId.isValid(id) ? id : '';
}

export function withId(record) {
  if (!record) return record;
  const row = typeof record.toObject === 'function' ? record.toObject({ virtuals: true }) : record;
  const id = row.id || row._id;
  return id ? { ...row, id: String(id) } : row;
}

export function withIds(rows = []) {
  return rows.map(withId);
}

export function withNestedIds(record, fields = []) {
  const row = withId(record);
  fields.forEach((field) => {
    if (row?.[field] && typeof row[field] === 'object') row[field] = withId(row[field]);
  });
  return row;
}

export function paginatedPayload(name, rows, pagination, extra = {}) {
  return {
    success: true,
    data: rows,
    [name]: rows,
    pagination,
    ...extra
  };
}
