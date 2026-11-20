# StudyMate ICT

An offline-first, AI-assisted study assistant for beginner ICT students — built with HTML5, CSS3 and vanilla JavaScript, with no build step, no dependencies and no API key.

**Live demo:** <https://studymate-ict-04s0d8.freebuff.site/>

- Application, screenshots and documentation: [`StudyMate-ICT/`](StudyMate-ICT/)
- Start reading at [`StudyMate-ICT/README.md`](StudyMate-ICT/README.md)
- Test results: [`StudyMate-ICT/TESTING_REPORT.md`](StudyMate-ICT/TESTING_REPORT.md)

The app installs as a PWA and keeps working with the network off: `sw.js` precaches all 20 application files, and every request the app makes is same-origin.

## Build the deploy bundle

`./build.sh` regenerates `dist/` from `StudyMate-ICT/`, excluding documentation and screenshots that the deployed site does not need. Upload `dist/` with `sites/site.manifest.json` (`assetsDirectory: ../dist`).

## Licence

[MIT](LICENSE)
