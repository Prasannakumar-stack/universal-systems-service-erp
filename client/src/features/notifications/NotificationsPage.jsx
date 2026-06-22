import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpenCheck,
  Boxes,
  CalendarCheck2,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileCheck2,
  Filter,
  Loader2,
  MailCheck,
  ReceiptText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Wrench
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ConfirmModal } from '../../components/Ui.jsx';
import {
  clearFallbackNotifications,
  clearReadNotificationIds,
  fallbackNotificationRows,
  filterClearedNotifications,
  markAllFallbackNotificationsRead,
  markFallbackNotificationRead,
  normalizeNotification,
  notificationCategories,
  resetClearedNotificationIds,
  timeAgo,
  unreadNotificationCount
} from './notificationCenterData.js';

const statusTabs = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'read', label: 'Read' }
];

const pageSize = 8;

const categoryVisuals = {
  Bookings: { icon: CalendarCheck2, tone: 'booking' },
  'Work Orders': { icon: Wrench, tone: 'work-order' },
  Invoices: { icon: ReceiptText, tone: 'invoice' },
  Payments: { icon: CreditCard, tone: 'payment' },
  AMC: { icon: ShieldCheck, tone: 'amc' },
  Inventory: { icon: Boxes, tone: 'inventory' },
  Quotations: { icon: FileCheck2, tone: 'quotation' },
  System: { icon: Settings, tone: 'system' }
};

function statusMatches(row, status) {
  if (status === 'unread') return !row.read;
  if (status === 'read') return row.read;
  return true;
}

function NotificationIcon({ category }) {
  const visual = categoryVisuals[category] || categoryVisuals.System;
  const Icon = visual.icon;
  return (
    <span className={`notifications-row-icon notifications-row-icon-${visual.tone}`}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

function NotificationStatusTabs({ active, counts, onChange }) {
  return (
    <div className="notifications-tabs" role="tablist" aria-label="Notification status filters">
      {statusTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`notifications-tab ${active === tab.id ? 'notifications-tab-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span>{tab.label}</span>
          <span className="notifications-tab-count">{counts[tab.id]}</span>
        </button>
      ))}
    </div>
  );
}

function NotificationPagination({ page, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="notifications-pagination">
      <p className="font-semibold muted">Showing {from} to {to} of {total} notifications</p>
      <div className="notifications-page-buttons" aria-label="Notification pagination">
        <button type="button" className="notifications-page-button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>
        {pages.map((item) => (
          <button
            key={item}
            type="button"
            className={`notifications-page-number ${page === item ? 'notifications-page-number-active' : ''}`}
            onClick={() => onPageChange(item)}
            aria-current={page === item ? 'page' : undefined}
          >
            {item}
          </button>
        ))}
        <button type="button" className="notifications-page-button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function NotificationRow({ item, onOpen }) {
  return (
    <article className={`notifications-row ${item.read ? 'notifications-row-read' : 'notifications-row-unread'}`}>
      <span className="notifications-unread-cell" aria-hidden="true">
        {!item.read ? <span className="notifications-unread-dot" /> : null}
      </span>
      <NotificationIcon category={item.category} />
      <div className="notifications-row-copy">
        <div className="flex flex-wrap items-center gap-2">
          <h2>{item.title}</h2>
          <span className="notifications-category-badge notifications-category-badge-mobile">{item.category}</span>
        </div>
        <p>{item.message}</p>
      </div>
      <div className="notifications-row-meta">
        <span className="notifications-category-badge">{item.category}</span>
        <span className="notifications-time">{timeAgo(item.createdAt)}</span>
      </div>
      <button type="button" className="notifications-action-button" onClick={() => onOpen(item)}>
        {item.actionLabel}
      </button>
    </article>
  );
}

export function NotificationsPage({ role = 'admin' }) {
  const { request } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState('');
  const [clearConfirm, setClearConfirm] = useState(null);

  async function fetchAllNotificationRows() {
    const firstPage = await request('/notifications?limit=100&page=1');
    const firstRows = firstPage.notifications || [];
    const totalPages = Math.min(20, Number(firstPage.pagination?.totalPages || 1));
    if (totalPages <= 1) return firstRows;
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        request(`/notifications?limit=100&page=${index + 2}`).catch(() => ({ notifications: [] }))
      )
    );
    return [...firstRows, ...rest.flatMap((payload) => payload.notifications || [])];
  }

  async function loadNotifications({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const remoteRows = await fetchAllNotificationRows();
      const rows = remoteRows.length ? remoteRows : fallbackNotificationRows();
      setNotifications(filterClearedNotifications(rows.map((item) => normalizeNotification(item, role))));
    } catch {
      setNotifications(filterClearedNotifications(fallbackNotificationRows().map((item) => normalizeNotification(item, role))));
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, [request, role]);

  const counts = useMemo(() => ({
    all: notifications.length,
    unread: unreadNotificationCount(notifications),
    read: notifications.filter((item) => item.read).length
  }), [notifications]);

  const filteredNotifications = useMemo(() => notifications.filter((item) => {
    const categoryMatches = categoryFilter === 'All Categories' || item.category === categoryFilter;
    return categoryMatches && statusMatches(item, statusFilter);
  }), [categoryFilter, notifications, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visibleNotifications = filteredNotifications.slice((page - 1) * pageSize, page * pageSize);
  const hasNotifications = notifications.length > 0;
  const hasUnread = counts.unread > 0;
  const hasRead = counts.read > 0;

  function notifyNotificationChange() {
    window.dispatchEvent(new Event('us:notifications-updated'));
  }

  async function markNotificationRead(item) {
    if (item.read) return;
    if (item.isFallback) {
      markFallbackNotificationRead(item.id);
    } else {
      await request(`/notifications/${item.id}/read`, { method: 'PATCH' });
    }
    setNotifications((current) => current.map((row) => (row.id === item.id ? { ...row, read: true } : row)));
    notifyNotificationChange();
  }

  async function markAllRead() {
    if (!hasUnread) return;
    setActionBusy('mark-all');
    try {
      const remoteUnread = notifications.filter((item) => !item.read && !item.isFallback);
      if (remoteUnread.length) {
        try {
          await request('/notifications/read-all', { method: 'PATCH' });
        } catch {
          await Promise.all(remoteUnread.map((item) => request(`/notifications/${item.id}/read`, { method: 'PATCH' }).catch(() => null)));
        }
      }
      if (notifications.some((item) => item.isFallback)) markAllFallbackNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      notifyNotificationChange();
      push('All notifications marked as read');
    } catch (error) {
      push(error.message || 'Unable to mark notifications as read', 'error');
    } finally {
      setActionBusy('');
    }
  }

  async function confirmClearAll() {
    if (!hasNotifications) return;
    setActionBusy('clear-all');
    try {
      const hasRemoteRows = notifications.some((item) => !item.isFallback);
      if (hasRemoteRows) {
        await request('/notifications', { method: 'DELETE' });
      }
      clearFallbackNotifications();
      resetClearedNotificationIds();
      setNotifications([]);
      notifyNotificationChange();
      setClearConfirm(null);
      push('Notifications cleared');
    } catch (error) {
      push(error.message || 'Unable to clear notifications', 'error');
    } finally {
      setActionBusy('');
    }
  }

  async function confirmClearRead() {
    if (!hasRead) return;
    const readItems = notifications.filter((item) => item.read);
    setActionBusy('clear-read');
    try {
      clearReadNotificationIds(readItems.map((item) => item.id));
      setNotifications((current) => current.filter((item) => !item.read));
      notifyNotificationChange();
      setClearConfirm(null);
      push('Read notifications cleared');
    } catch (error) {
      push(error.message || 'Unable to clear read notifications', 'error');
    } finally {
      setActionBusy('');
    }
  }

  async function openNotification(item) {
    try {
      await markNotificationRead(item);
    } catch {
      setNotifications((current) => current.map((row) => (row.id === item.id ? { ...row, read: true } : row)));
    }
    navigate(item.target);
  }

  return (
    <div className={`notifications-page ${hasUnread ? 'notifications-page-has-unread' : 'notifications-page-no-unread'}`}>
      <section className="notifications-hero">
        <div className="min-w-0">
          <div className="notifications-hero-kicker">
            <Bell className="h-4 w-4" />
            Notification Center
          </div>
          <h1>Notifications</h1>
          <p>View all alerts and important updates</p>
        </div>
        <div className="notifications-hero-actions">
          <button
            type="button"
            className={`btn btn-primary notifications-mark-all-button ${hasUnread ? '' : 'notifications-mark-all-button-disabled'}`}
            onClick={markAllRead}
            disabled={!hasUnread || actionBusy === 'mark-all'}
          >
            {actionBusy === 'mark-all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
            Mark all as read
          </button>
          <Link className="btn btn-secondary notifications-settings-button" to="/app/admin/settings">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </section>

      <section className="notifications-toolbar">
        <NotificationStatusTabs active={statusFilter} counts={counts} onChange={setStatusFilter} />
        <div className="notifications-toolbar-actions">
          <label className="notifications-category-select">
            <Filter className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Filter by category</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              {notificationCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <div className="notifications-toolbar-clear-group">
            <button
              type="button"
              className="btn notifications-clear-read-button"
              onClick={() => setClearConfirm({ type: 'read', count: counts.read })}
              disabled={!hasRead || actionBusy === 'clear-read'}
            >
              {actionBusy === 'clear-read' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Clear Read
            </button>
            <button type="button" className="btn notifications-clear-button" onClick={() => setClearConfirm({ type: 'all', count: notifications.length })} disabled={!hasNotifications || actionBusy === 'clear-all'}>
              {actionBusy === 'clear-all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Clear All
            </button>
          </div>
        </div>
      </section>

      <section className="notifications-list-card" aria-live="polite">
        {loading ? (
          <div className="notifications-loading">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
            <span>Loading notifications</span>
          </div>
        ) : visibleNotifications.length ? (
          visibleNotifications.map((item) => <NotificationRow key={item.id} item={item} onOpen={openNotification} />)
        ) : (
          <div className="notifications-empty-state">
            <CheckCheck className="h-9 w-9 text-[var(--brand)]" />
            <h2>No notifications found</h2>
            <p>{hasNotifications ? 'Try a different status or category filter.' : 'New alerts and important updates will appear here.'}</p>
            {hasNotifications ? (
              <button type="button" className="btn btn-secondary" onClick={() => {
                setStatusFilter('all');
                setCategoryFilter('All Categories');
              }}>
                <SlidersHorizontal className="h-4 w-4" />
                Reset Filters
              </button>
            ) : null}
          </div>
        )}
      </section>

      <NotificationPagination page={page} total={filteredNotifications.length} onPageChange={setPage} />
      {clearConfirm ? (
        <ConfirmModal
          title={clearConfirm.type === 'all' ? 'Clear notifications permanently?' : 'Clear read notifications?'}
          message={clearConfirm.type === 'all'
            ? `Clear ${clearConfirm.count} notification${clearConfirm.count === 1 ? '' : 's'} from this notification center. Remote notifications are permanently deleted.`
            : `Clear ${clearConfirm.count} read notification${clearConfirm.count === 1 ? '' : 's'} from this notification center. Unread notifications will be kept.`}
          confirmLabel={clearConfirm.type === 'all' ? 'Delete Permanently' : 'Clear Read'}
          loading={actionBusy === (clearConfirm.type === 'all' ? 'clear-all' : 'clear-read')}
          loadingLabel="Clearing..."
          onCancel={() => setClearConfirm(null)}
          onConfirm={clearConfirm.type === 'all' ? confirmClearAll : confirmClearRead}
        />
      ) : null}
    </div>
  );
}

