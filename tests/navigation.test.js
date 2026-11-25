/* Structural checks on the app shell: every navigation entry points at a real
   view, and the Home page is reachable from both the topbar and the sidebar. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../StudyMate-ICT/index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../StudyMate-ICT/js/app.js', import.meta.url), 'utf8');

test('every navigation entry has a matching view', () => {
  const routes = [...html.matchAll(/data-route="([a-z]+)"/g)].map((match) => match[1]);
  const views = [...html.matchAll(/data-view="([a-z]+)"/g)].map((match) => match[1]);
  assert.ok(routes.length >= 11, 'expected at least 11 navigation entries, found ' + routes.length);
  routes.forEach((route) => {
    assert.ok(views.includes(route), 'no view element for route "' + route + '"');
  });
});

test('Home is reachable from the topbar and the sidebar', () => {
  assert.match(html, /id="topbar-home"[^>]*href="#\/home"/, 'topbar Home button is missing');
  assert.match(html, /class="nav-link" href="#\/home" data-route="home"/, 'sidebar Home link is missing');
  assert.match(html, /id="view-home" data-view="home"/, 'home view is missing');
});

test('the router marks the topbar Home button as current', () => {
  assert.match(app, /ui\.\$\('#topbar-home'\)/, 'router does not look up the topbar Home button');
  assert.match(app, /topbarHome\.setAttribute\('aria-current', 'page'\)/, 'router does not set aria-current on Home');
});
