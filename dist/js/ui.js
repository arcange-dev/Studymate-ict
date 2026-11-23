/* StudyMate ICT — shared UI helpers: DOM shortcuts, toasts, clipboard,
   formatting and the tool metadata used across pages. */
(function () {
  'use strict';

  var SM = window.SM = window.SM || {};

  var TOOLS = [
    { id: 'explain', name: 'ICT Concept Explainer', icon: 'i-book', href: '#/explain', blurb: 'Turn any ICT topic into a nine-part teaching prompt at the right level.', meta: 'Definition → practice questions' },
    { id: 'quiz', name: 'Quiz Generator', icon: 'i-quiz', href: '#/quiz', blurb: 'Build a quiz prompt from your own notes, with an answer key.', meta: 'Notes-locked · no invented facts' },
    { id: 'planner', name: 'Smart Study Planner', icon: 'i-calendar', href: '#/planner', blurb: 'Fit topics into the minutes you really have, day by day.', meta: 'Breaks · revision · self-tests' },
    { id: 'glossary', name: 'ICT Glossary', icon: 'i-glossary', href: '#/glossary', blurb: 'Search plain-language definitions with practical examples.', meta: 'Works fully offline' },
    { id: 'source', name: 'Source-Grounded Learning', icon: 'i-shield', href: '#/source', blurb: 'Ask questions that must be answered only from your notes.', meta: 'Refuses unsupported answers' },
    { id: 'library', name: 'Prompt Library', icon: 'i-library', href: '#/library', blurb: 'Eight ready-to-use templates with inputs and examples.', meta: 'Copy · adapt · reuse' }
  ];

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function icon(name, cls) {
    return '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="#' + name + '"/></svg>';
  }

  var toastTimer = null;
  function toast(message, kind) {
    var el = $('#toast');
    if (!el) return;
    el.innerHTML = icon(kind === 'error' ? 'i-info' : 'i-check') + '<span></span>';
    el.querySelector('span').textContent = message;
    el.dataset.kind = kind || 'ok';
    el.hidden = false;
    // Force a frame so the transition runs even on repeated toasts.
    void el.offsetWidth;
    el.dataset.show = 'true';
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      el.dataset.show = 'false';
      window.setTimeout(function () { el.hidden = true; }, 220);
    }, 3000);
  }

  /** Copy text with a graceful fallback for browsers without the async API. */
  function copyText(text) {
    var value = String(text == null ? '' : text);
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(value).then(function () { return true; })
        .catch(function () { return legacyCopy(value); });
    }
    return Promise.resolve(legacyCopy(value));
  }

  function legacyCopy(value) {
    try {
      var ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, value.length);
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (err) {
      return false;
    }
  }

  function formatDate(ms) {
    var d = new Date(ms);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function timeAgo(ms) {
    var diff = Date.now() - ms;
    if (diff < 60000) return 'just now';
    var mins = Math.round(diff / 60000);
    if (mins < 60) return mins + ' min ago';
    var hours = Math.round(mins / 60);
    if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
    var days = Math.round(hours / 24);
    if (days < 7) return days + (days === 1 ? ' day ago' : ' days ago');
    return formatDate(ms);
  }

  function toolMeta(id) {
    for (var i = 0; i < TOOLS.length; i++) {
      if (TOOLS[i].id === id) return TOOLS[i];
    }
    return { id: id, name: 'StudyMate', icon: 'i-spark', href: '#/dashboard' };
  }

  /** Show a field error: message text, aria-invalid on the first input. */
  function showError(errorEl, message, fields) {
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
    (fields || []).forEach(function (f) { if (f) f.setAttribute('aria-invalid', 'true'); });
  }

  function clearError(errorEl, fields) {
    if (errorEl) { errorEl.hidden = true; errorEl.textContent = ''; }
    (fields || []).forEach(function (f) { if (f) f.removeAttribute('aria-invalid'); });
  }

  /** Wire every [data-copy="id"] button to copy that element's text. */
  function bindCopyButtons(root) {
    $all('[data-copy]', root || document).forEach(function (btn) {
      if (btn.dataset.copyBound === '1') return;
      btn.dataset.copyBound = '1';
      btn.addEventListener('click', function () {
        var target = document.getElementById(btn.dataset.copy);
        if (!target) return;
        copyText(target.textContent).then(function (ok) {
          if (ok) {
            toast('Prompt copied to clipboard');
            var original = btn.innerHTML;
            btn.innerHTML = icon('i-check') + 'Copied';
            window.setTimeout(function () { btn.innerHTML = original; }, 1600);
          } else {
            toast('Copy failed — select the text and press Ctrl+C', 'error');
            target.focus();
          }
        });
      });
    });
  }

  SM.ui = {
    $: $,
    $all: $all,
    esc: esc,
    icon: icon,
    toast: toast,
    copy: copyText,
    formatDate: formatDate,
    timeAgo: timeAgo,
    toolMeta: toolMeta,
    showError: showError,
    clearError: clearError,
    bindCopyButtons: bindCopyButtons,
    tools: TOOLS
  };
})();
