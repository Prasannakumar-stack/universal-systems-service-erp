function isCurrentAppWindow(targetWindow) {
  if (!targetWindow || typeof window === 'undefined') return false;
  if (targetWindow === window) return true;
  try {
    return targetWindow.document === window.document;
  } catch {
    return false;
  }
}

const PDF_PREVIEW_BODY_CLASS = 'pdf-preview-open';

function setPdfPreviewOpen(isOpen) {
  if (typeof document === 'undefined') return;
  document.documentElement?.classList?.toggle(PDF_PREVIEW_BODY_CLASS, Boolean(isOpen));
  document.body?.classList?.toggle(PDF_PREVIEW_BODY_CLASS, Boolean(isOpen));
}

function safeWriteShell(targetWindow, title, message) {
  if (!targetWindow || targetWindow.closed || isCurrentAppWindow(targetWindow)) return;
  try {
    targetWindow.document.title = title;
    targetWindow.document.body.style.margin = '0';
    targetWindow.document.body.style.minHeight = '100vh';
    targetWindow.document.body.style.display = 'grid';
    targetWindow.document.body.style.placeItems = 'center';
    targetWindow.document.body.style.background = '#061426';
    targetWindow.document.body.style.color = '#eaf6ff';
    targetWindow.document.body.style.fontFamily = 'Inter, system-ui, sans-serif';
    targetWindow.document.body.innerHTML = `<main style="max-width:28rem;padding:2rem;text-align:center"><h1 style="margin:0 0 .75rem;font-size:1.2rem">${title}</h1><p style="margin:0;color:#b9d7ee;line-height:1.6">${message}</p></main>`;
  } catch {
    // Some browser contexts do not allow writing into the new window.
  }
}

function removeExistingPdfPanel(id) {
  try {
    const existing = document.getElementById(id);
    if (existing) {
      existing.remove();
      if (id === 'pdf-inline-preview-panel') setPdfPreviewOpen(false);
    }
  } catch {
    // Ignore DOM cleanup failures in restricted browser contexts.
  }
}

function closePdfPreviewPanel(overlay) {
  try {
    overlay?.remove?.();
  } finally {
    setPdfPreviewOpen(false);
  }
}

function styleActionButton(element, variant = 'secondary') {
  element.style.border = variant === 'primary' ? '1px solid rgba(125, 211, 252, 0.72)' : '1px solid rgba(226, 232, 240, 0.22)';
  element.style.borderRadius = '8px';
  element.style.background = variant === 'primary' ? 'rgba(14, 165, 233, 0.18)' : 'rgba(15, 23, 42, 0.52)';
  element.style.color = variant === 'primary' ? '#e0f2fe' : '#f8fafc';
  element.style.padding = '8px 12px';
  element.style.fontWeight = '800';
  element.style.fontSize = '13px';
  element.style.textDecoration = 'none';
  element.style.cursor = 'pointer';
}

function createPdfPreviewPanel({ url = '', title = '', filename = '', state = 'ready', message = '', details = '' } = {}) {
  if (typeof document === 'undefined') return false;
  removeExistingPdfPanel('pdf-inline-preview-panel');
  setPdfPreviewOpen(true);
  const overlay = document.createElement('div');
  overlay.id = 'pdf-inline-preview-panel';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '2147483647';
  overlay.style.background = 'radial-gradient(circle at top, rgba(15, 42, 82, 0.38), transparent 32%), rgba(2, 6, 23, 0.86)';
  overlay.style.display = 'grid';
  overlay.style.placeItems = 'center';
  overlay.style.padding = '14px';
  overlay.style.backdropFilter = 'blur(12px)';

  const panel = document.createElement('section');
  panel.style.width = 'min(94vw, 1320px)';
  panel.style.height = 'min(94vh, 940px)';
  panel.style.background = 'linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(8, 13, 26, 0.98))';
  panel.style.border = '1px solid rgba(148, 163, 184, 0.34)';
  panel.style.borderRadius = '8px';
  panel.style.boxShadow = '0 28px 100px rgba(2, 6, 23, 0.62)';
  panel.style.display = 'grid';
  panel.style.gridTemplateRows = 'auto 1fr';
  panel.style.overflow = 'hidden';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.flexWrap = 'wrap';
  header.style.gap = '16px';
  header.style.padding = '14px 18px';
  header.style.background = 'linear-gradient(135deg, rgba(8, 20, 38, 0.98), rgba(15, 42, 82, 0.86))';
  header.style.color = '#eaf6ff';
  header.style.fontFamily = 'Inter, system-ui, sans-serif';
  header.style.borderBottom = '1px solid rgba(148, 163, 184, 0.22)';

  const titleGroup = document.createElement('div');
  titleGroup.style.minWidth = '0';

  const headingRow = document.createElement('div');
  headingRow.style.display = 'flex';
  headingRow.style.alignItems = 'center';
  headingRow.style.gap = '10px';
  headingRow.style.minWidth = '0';

  const heading = document.createElement('strong');
  heading.textContent = 'PDF Preview';
  heading.style.fontSize = '15px';
  heading.style.letterSpacing = '0';

  const status = document.createElement('span');
  status.textContent = state === 'loading' ? 'Preparing' : state === 'error' ? 'Error' : 'Ready';
  status.style.border = state === 'error' ? '1px solid rgba(248, 113, 113, 0.44)' : '1px solid rgba(125, 211, 252, 0.42)';
  status.style.borderRadius = '999px';
  status.style.background = state === 'error' ? 'rgba(127, 29, 29, 0.28)' : 'rgba(14, 165, 233, 0.16)';
  status.style.color = state === 'error' ? '#fecaca' : '#bae6fd';
  status.style.padding = '3px 8px';
  status.style.fontSize = '11px';
  status.style.fontWeight = '900';

  const subtitle = document.createElement('p');
  subtitle.textContent = title || (state === 'loading' ? 'Preparing PDF...' : 'Preview document');
  subtitle.style.margin = '4px 0 0';
  subtitle.style.color = '#b9d7ee';
  subtitle.style.fontSize = '12px';
  subtitle.style.whiteSpace = 'nowrap';
  subtitle.style.overflow = 'hidden';
  subtitle.style.textOverflow = 'ellipsis';

  headingRow.append(heading, status);
  titleGroup.append(headingRow, subtitle);

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.alignItems = 'center';
  actions.style.justifyContent = 'flex-end';
  actions.style.flexWrap = 'wrap';
  actions.style.gap = '8px';
  actions.style.marginLeft = 'auto';

  if (url && state === 'ready') {
    const openLink = document.createElement('a');
    openLink.href = url;
    openLink.target = '_blank';
    openLink.rel = 'noopener';
    openLink.textContent = 'Open';
    styleActionButton(openLink, 'primary');

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename || 'document.pdf';
    downloadLink.textContent = 'Download';
    styleActionButton(downloadLink);
    actions.append(openLink, downloadLink);
  }

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = 'Close';
  styleActionButton(closeButton);
  closeButton.addEventListener('click', () => closePdfPreviewPanel(overlay));

  actions.append(closeButton);
  header.append(titleGroup, actions);

  const body = document.createElement('div');
  body.style.background = '#0b1120';
  body.style.padding = '16px';
  body.style.display = 'grid';
  body.style.placeItems = 'center';
  body.style.minHeight = '0';

  if (state === 'ready' && url) {
    const viewer = document.createElement('div');
    viewer.style.width = 'min(100%, 1040px)';
    viewer.style.height = '100%';
    viewer.style.background = '#f8fafc';
    viewer.style.border = '1px solid rgba(203, 213, 225, 0.5)';
    viewer.style.borderRadius = '8px';
    viewer.style.boxShadow = '0 18px 70px rgba(0, 0, 0, 0.34)';
    viewer.style.overflow = 'hidden';

    const frame = document.createElement('iframe');
    frame.title = title || 'PDF preview';
    frame.src = url;
    frame.style.width = '100%';
    frame.style.height = '100%';
    frame.style.border = '0';
    frame.style.background = '#ffffff';
    viewer.append(frame);
    body.append(viewer);
  } else {
    const stateBox = document.createElement('div');
    stateBox.style.maxWidth = '34rem';
    stateBox.style.textAlign = 'center';
    stateBox.style.fontFamily = 'Inter, system-ui, sans-serif';
    stateBox.style.color = '#eaf6ff';
    const stateTitle = document.createElement('strong');
    stateTitle.textContent = state === 'error' ? 'Could not prepare PDF. Try again.' : 'Preparing PDF...';
    stateTitle.style.display = 'block';
    stateTitle.style.fontSize = '18px';
    const stateMessage = document.createElement('p');
    stateMessage.textContent = message || (state === 'error' ? 'The PDF could not be prepared right now.' : 'The PDF is being prepared securely inside the app.');
    stateMessage.style.margin = '10px 0 0';
    stateMessage.style.color = '#b9d7ee';
    stateMessage.style.lineHeight = '1.6';
    stateBox.append(stateTitle, stateMessage);
    if (details) {
      const debug = document.createElement('details');
      debug.style.marginTop = '14px';
      debug.style.color = '#93c5fd';
      const summary = document.createElement('summary');
      summary.textContent = 'Debug details';
      summary.style.cursor = 'pointer';
      const detailText = document.createElement('pre');
      detailText.textContent = details;
      detailText.style.whiteSpace = 'pre-wrap';
      detailText.style.textAlign = 'left';
      detailText.style.color = '#cbd5e1';
      detailText.style.marginTop = '10px';
      debug.append(summary, detailText);
      stateBox.append(debug);
    }
    body.append(stateBox);
  }

  panel.append(header, body);
  overlay.append(panel);
  document.body.append(overlay);
  return true;
}

function showInlinePdfPanel(url, title, filename = '') {
  return createPdfPreviewPanel({ url, title, filename, state: 'ready' });
}

function showPreparingPdfPanel(title) {
  return createPdfPreviewPanel({ title, state: 'loading' });
}

function showPdfErrorPanel(title, message, details = '') {
  return createPdfPreviewPanel({ title, state: 'error', message, details });
}

function showDownloadFallback(url, filename) {
  if (typeof document === 'undefined') return;
  removeExistingPdfPanel('pdf-download-fallback-panel');
  createPdfPreviewPanel({
    url,
    title: 'PDF ready',
    filename: filename || 'document.pdf',
    state: 'ready'
  });
}

export function openPdfShell(title = 'Preparing PDF') {
  if (typeof window === 'undefined') return null;
  // Some installed-app and embedded browser contexts reuse the current tab for
  // a pre-opened about:blank shell. Avoid that path so the staff app never gets
  // stranded on a blank page while the PDF request is still running.
  showPreparingPdfPanel(title || 'Preparing PDF...');
  return null;
}

export function showPdfShellError(targetWindow, message = 'Could not prepare the PDF. Please try again.') {
  if (!targetWindow || targetWindow.closed || isCurrentAppWindow(targetWindow)) {
    showPdfErrorPanel('PDF unavailable', 'Could not prepare PDF. Try again.', message);
    return;
  }
  safeWriteShell(targetWindow, 'PDF unavailable', message);
}

export function showPdfInShell(targetWindow, blob, title = 'PDF Preview') {
  const pdfBlob = blob instanceof Blob && blob.type === 'application/pdf'
    ? blob
    : new Blob([blob], { type: 'application/pdf' });
  const url = URL.createObjectURL(pdfBlob);
  if (targetWindow && !targetWindow.closed && !isCurrentAppWindow(targetWindow)) {
    try {
      targetWindow.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 120000);
      return true;
    } catch {
      // Fall through to a direct open attempt.
    }
  }
  if (showInlinePdfPanel(url, title)) {
    window.setTimeout(() => URL.revokeObjectURL(url), 120000);
    return true;
  }
  try {
    window.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 120000);
    return true;
  } catch {
    URL.revokeObjectURL(url);
    throw new Error(`${title} was prepared, but the browser blocked the PDF window. Please allow pop-ups for this app and try again.`);
  }
}

export function downloadPdfBlob(blob, filename, fallbackWindow = null) {
  const pdfBlob = blob instanceof Blob && blob.type === 'application/pdf'
    ? blob
    : new Blob([blob], { type: 'application/pdf' });
  const url = URL.createObjectURL(pdfBlob);
  const safeFilename = filename || 'document.pdf';
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeFilename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  if (fallbackWindow && !fallbackWindow.closed && !isCurrentAppWindow(fallbackWindow)) {
    try {
      fallbackWindow.document.title = 'PDF ready';
      fallbackWindow.document.body.innerHTML = `<main style="max-width:30rem;padding:2rem;text-align:center;font-family:Inter,system-ui,sans-serif"><h1 style="font-size:1.15rem">PDF ready</h1><p style="line-height:1.6;color:#b9d7ee">If the download did not start automatically, use the link below.</p><p><a href="${url}" download="${safeFilename}" style="color:#7dd3fc;font-weight:800">Download PDF</a></p><p><a href="${url}" target="_self" style="color:#eaf6ff">Open PDF in this window</a></p></main>`;
    } catch {
      // Keep the automatic download attempt as the primary behavior.
    }
  } else {
    showDownloadFallback(url, safeFilename);
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 120000);
}

export function navigateShell(targetWindow, url) {
  if (!url) return false;
  if (targetWindow && !targetWindow.closed && !isCurrentAppWindow(targetWindow)) {
    try {
      targetWindow.location.href = url;
      return true;
    } catch {
      // Fall through to direct open.
    }
  }
  const opened = window.open(url, '_blank');
  if (opened && !isCurrentAppWindow(opened)) {
    opened.opener = null;
    return true;
  }
  if (opened && isCurrentAppWindow(opened)) return true;
  try {
    window.location.href = url;
    return true;
  } catch {
    return false;
  }
}
