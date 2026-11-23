/* StudyMate ICT — 3D landing scene.
   The cube rotation is pure CSS. This file only nudges the perspective with the
   pointer, and skips that entirely when the learner asked for reduced motion or
   is not using a precise pointer. Nothing here is needed for the app to work. */
(function () {
  'use strict';

  var SM = window.SM;
  var stage = document.getElementById('landing-stage');
  if (!stage || !SM || !SM.ui) return;

  var reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function reduced() {
    return document.documentElement.dataset.reduceMotion === 'true' || Boolean(reduceQuery && reduceQuery.matches);
  }

  function reset() {
    stage.style.perspectiveOrigin = '50% 50%';
  }

  function onMove(event) {
    if (reduced()) return;
    var rect = stage.getBoundingClientRect();
    var x = (event.clientX - rect.left) / rect.width - 0.5;
    var y = (event.clientY - rect.top) / rect.height - 0.5;
    stage.style.perspectiveOrigin = (50 + x * 34).toFixed(1) + '% ' + (50 + y * 30).toFixed(1) + '%';
  }

  if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerleave', reset);
  }

  if (reduceQuery && reduceQuery.addEventListener) {
    reduceQuery.addEventListener('change', function () { if (reduced()) reset(); });
  }

  reset();
})();
