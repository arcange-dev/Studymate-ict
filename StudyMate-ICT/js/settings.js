/* StudyMate ICT — appearance, preferences and data management.
   Applies theme / accessibility classes to <html> and persists preferences in
   the same LocalStorage record as the rest of the app. */
(function () {
  'use strict';

  var SM = window.SM;
  var ui = SM.ui;

  var root = document.documentElement;
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function apply(settings) {
    var theme = settings.theme === 'system'
      ? (media && media.matches ? 'dark' : 'light')
      : settings.theme;
    root.dataset.theme = theme;
    root.dataset.reduceMotion = settings.reduceMotion ? 'true' : 'false';
    root.dataset.textSize = settings.largerText ? 'large' : 'normal';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#071427' : '#0b1c33');
  }

  function current() {
    return SM.store.getSettings();
  }

  /** Public helper: apply a patch from anywhere in the app. */
  function update(patch) {
    var settings = SM.store.setSettings(patch);
    apply(settings);
    return settings;
  }

  apply(current());

  if (media && media.addEventListener) {
    media.addEventListener('change', function () {
      if (current().theme === 'system') apply(current());
    });
  }

  /* ---------------------------------------------------------- settings page */

  var form = ui.$('#settings-form');
  if (form) {
    var nameEl = ui.$('#set-name');
    var themeEl = ui.$('#set-theme');
    var levelEl = ui.$('#set-level');
    var subjectsEl = ui.$('#set-subjects');
    var motionEl = ui.$('#set-motion');
    var textEl = ui.$('#set-text');
    var discloseEl = ui.$('#set-disclose');
    var messageEl = ui.$('#settings-message');
    var exportBtn = ui.$('#data-export');
    var importInput = ui.$('#data-import');
    var deleteBtn = ui.$('#data-delete');

    function fillForm() {
      var s = current();
      nameEl.value = s.name || '';
      themeEl.value = s.theme;
      levelEl.value = s.level;
      subjectsEl.value = s.subjects.join(', ');
      motionEl.checked = s.reduceMotion;
      textEl.checked = s.largerText;
      discloseEl.checked = s.discloseNotes;
    }

    function saveForm() {
      var settings = update({
        name: nameEl.value,
        theme: themeEl.value,
        level: levelEl.value,
        subjects: subjectsEl.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
        reduceMotion: motionEl.checked,
        largerText: textEl.checked,
        discloseNotes: discloseEl.checked
      });
      messageEl.textContent = 'Saved. These preferences apply immediately.';
      messageEl.hidden = false;
      messageEl.dataset.kind = 'ok';
      window.setTimeout(function () { messageEl.hidden = true; }, 3200);
      return settings;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      saveForm();
      ui.toast('Settings saved');
    });

    form.addEventListener('reset', function () {
      window.setTimeout(fillForm, 0);
    });

    exportBtn.addEventListener('click', function () {
      var json = SM.store.exportData();
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = 'studymate-ict-backup-' + stamp + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      ui.toast('Backup downloaded');
    });

    importInput.addEventListener('change', function () {
      var file = importInput.files && importInput.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        ui.toast('That file is too large to be a StudyMate backup', 'error');
        importInput.value = '';
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var result = SM.store.importData(reader.result);
        ui.toast(result.message, result.ok ? 'ok' : 'error');
        if (result.ok) {
          fillForm();
          apply(current());
        }
      };
      reader.onerror = function () { ui.toast('That file could not be read', 'error'); };
      reader.readAsText(file);
      importInput.value = '';
    });

    deleteBtn.addEventListener('click', function () {
      if (!window.confirm('Delete all saved topics, prompts, quizzes, plans, glossary terms and settings from this browser, plus any AI key saved here? This cannot be undone.')) return;
      // The personal AI key is stored separately from study data; clear it too.
      if (SM.localAi) SM.localAi.clear();
      SM.store.resetAll();
      fillForm();
      apply(current());
      ui.toast('All local data deleted');
    });

    fillForm();
  }

  SM.settings = { apply: apply, update: update, current: current };
})();
