# User Guide — StudyMate ICT

StudyMate ICT runs entirely in your browser. Nothing is installed, nothing is uploaded, and none of your study data leaves your computer.

---

## 1. Getting started

1. Open the project folder and double-click **`index.html`**, or serve the folder and open it in your browser:
   ```bash
   cd StudyMate-ICT
   python3 -m http.server 8000
   ```
   then visit <http://localhost:8000>.
2. The **Dashboard** opens first. It shows your saved items and the six study tools.
3. Use the sidebar to move between tools, or the **Home** button in the top bar to return to the landing page and the API-key panel. On a phone or tablet, tap the **menu button** (☰) at the top-left; press `Escape` to close it.

### Installing StudyMate as an app

If you opened the app through a web address (the live demo or a local server, not `file://`):

1. Let the first page finish loading — this stores the app on your device.
2. Use your browser's **Install** / **Add to Home screen** option.
3. Open it from the new icon. It runs full-screen and still works with Wi-Fi and mobile data switched off.

Nothing is uploaded during this process: the app caches its own files locally, in the same way it stores your notes.

**What StudyMate does and does not do:** it writes a prompt for you. It does **not** contact an AI. After generating a prompt you copy it into an AI assistant you are allowed to use.

### Understanding the two panels

Every tool has a form on the left and an output panel on the right (stacked on smaller screens).

- The **form** collects your information.
- The **output panel** shows the finished prompt, a **Copy** button and a **Save** button.
- A dark code-style panel is a prompt, not an answer.

---

## 2. ICT Concept Explainer

Use this to get a complete, structured explanation of one topic.

1. Open **Explain ICT**.
2. Type the topic — e.g. `RAM`, `the CPU`, `virtual memory`, `how a router works`.
3. Choose your **learner level** (beginner, TVET Level 4, intermediate, advanced).
4. Choose **prior knowledge** — this stops the prompt from assuming too much.
5. Choose **explanation length**: short (~150 words per section), medium (~300) or detailed (~500).
6. Press **Generate prompt**.
7. Review it, press **Copy prompt**, then paste it into your AI assistant.
8. Press **Save to Saved Learning** if you want to reuse it.

**What you will get from the AI:** nine sections — definition, why it matters, step-by-step explanation, practical example, real-world application, misconceptions, summary, five practice questions and the answers.

**Tips**
- One concept per prompt works best. "How RAM differs from ROM" is a better topic than "computers".
- If a section feels too advanced, regenerate with "Beginner (first ICT course)" and "None — complete beginner".
- Answer the practice questions before reading section 9.

---

## 3. Quiz Generator

Use this to test yourself on material you have already been given.

1. Open **Quiz Generator**.
2. Paste your **study notes** into the large box. The word counter shows how much you pasted.
3. Choose the **number of questions** (5, 10, 15 or 20).
4. Choose **difficulty**: easy (recall), medium (understanding and application) or hard (analysis and troubleshooting).
5. Choose the **question type**: multiple choice, true/false, short answer or mixed.
6. Press **Generate quiz prompt**, then **Copy prompt**.
7. Ask the AI for the quiz, answer it, then reveal the answer key.

**Why notes are required:** a quiz without a source would be invented. The app blocks generation when the notes box is empty and explains why.

**What the prompt guarantees**
- Every question must be answerable from your notes.
- Each question is followed by a "Source:" line quoting your notes.
- The answer key is a separate section with an explanation per answer.
- If your notes are too short for the requested number of questions, the AI must say how many they support instead of padding.

**Marking tip:** if an "answer" cannot be found in your notes, treat that question as unreliable and check with your lecturer.

---

## 4. Smart Study Planner

This tool builds the study plan itself — no AI is needed.

1. Open **Study Planner**.
2. List your **topics**, one per line (commas also work). Up to 12 topics.
3. Enter the **study time per day** in minutes. Be honest: 45 focused minutes beats 3 imagined hours.
4. Enter the **number of days** you can study (1–30).
5. Choose **study difficulty**: light (revision), standard (new learning) or intensive (exam crunch).
6. Optionally set the **examination date**. If the exam is sooner than the number of days you entered, the plan is shortened to reach it and you are told why.
7. Press **Build my study plan**.

**Reading the plan**
- Each day shows its date, minutes used ("60 / 60 min used") and a learning objective.
- Sessions are timed from 09:00 for display purposes only; use them as a sequence.
- Breaks are real breaks — no work is scheduled inside them.
- The last study block on review days becomes a **revision** session.
- Every day ends with a **practice activity** and **self-assessment questions**.

**The time guarantee:** study minutes + break minutes + self-assessment always equals the minutes you entered, and never exceeds it. You can verify this on each day's header.

**Extra actions**
- **Copy plan as text** — paste into a document or message.
- **Print / save PDF** — opens the print dialog; the form and navigation are hidden automatically.
- **Build an AI enrichment prompt** — asks an AI to add micro-tasks and active-recall activities without changing any minutes.
- **Save plan** — stores the plan (and the enrichment prompt, if built) in Saved Learning.

---

## 5. ICT Glossary

Works fully offline.

1. Open **ICT Glossary**.
2. Type in the search box — it searches the term, the acronym expansion, the definition, the example and the category. Use the **category** dropdown to narrow further.
3. Read the definition and its practical example.
4. Press **Copy** to copy the definition, or **Save** to keep it in your saved list (the button changes to "Saved").
5. Press **Clear search** in the empty state if nothing matches.

**Adding your own terms**
1. Open **Add your own term** at the bottom of the page.
2. Enter the term, a category, a simple definition and (optionally) an example.
3. Press **Save term**. Your terms appear first in the list and in *Your personal terms*, where each can be deleted.

**Tip:** write personal definitions in your own words. If you can explain it to a classmate, you know it.

---

## 6. Source-Grounded Learning

Use this when an answer must come only from specific notes.

1. Open **Source-Grounded**.
2. Paste the exact notes or textbook extract the answer must come from.
3. Type your question.
4. Watch the **offline coverage check**. It compares key words from your question with your notes:
   - "All N key words appear…" — promising, but still verify.
   - "N of M key words appear…" — parts of the answer may be unsupported.
   - "None of the important words…" — the notes probably cannot answer; expect a refusal.
5. Press **Generate grounded prompt**, then **Copy prompt**.

**What the prompt forces the AI to do**
- Use only your notes, even if it "knows" more.
- Quote the sentence supporting each point.
- Label its own reasoning as `Inference (not stated in the notes):`.
- Correct a false assumption in your question using the notes.
- Reply with exactly this sentence if the notes are insufficient:

  > "The supplied notes do not provide enough information to answer that reliably."

**What to do with the answer**
- If you see the refusal sentence, the notes genuinely lack the answer — find a better source.
- If you see an answer, check each quoted line really exists in your notes.
- Never submit a "fact" you cannot find in your own material.

**Note:** the coverage check is a simple keyword comparison, not an AI judgement. The prompt is what controls the answer.

---

## 7. Prompt Library

1. Open **Prompt Library**.
2. Browse the eight templates, or filter with the search box (try "quiz", "planner", "hardware", "error", "summarise").
3. Each card shows: purpose, required inputs, expected output, example use.
4. Expand **View full prompt** to read it.
5. Press **Copy prompt** and replace the `[PLACEHOLDERS]` before use, or **Save** to keep it in Saved Learning.

**Templates included:** ICT concept explainer · hardware comparison · quiz generator · study planner · programming tutor · programming error troubleshooter · notes summariser · ICT glossary creator.

---

## 8. Dashboard

The dashboard is the first screen and gives you an overview:

- **Welcome panel:** a greeting (your optional display name from Settings), *Start learning* and *Create a quiz*, and a note telling you which AI mode you are in.
- **Six metrics:** saved topics, saved prompts, quizzes marked, average score, plan progress and glossary terms. Each one is calculated from what you have actually saved in this browser; empty metrics say so instead of showing invented numbers.
- **Continue learning:** your most recent saved items, each with a *Resume*, *Open* or *Practise* action.
- **Study plan progress:** the latest saved plan with a progress bar, days and start date.
- **Your study tools:** six cards linking to each tool.
- **Quiz results:** best score and a bar per marked quiz (hidden until you mark one), then the quiz list.
- **Recent activity and study focus:** your last actions with relative times, and your latest topics with one-click copy.

Counts update immediately whenever you save, delete or generate something.

---

## 9. Saved Learning

1. Open **Saved Learning**.
2. Each section lists your saved **topics**, **prompts**, **glossary terms** and **activity**.
3. Use the search box to filter every section at once, and the category menu to show only topics, prompts, glossary terms or activity. The count next to the toolbar tells you how many items match, and **Clear search** resets both.
4. Use the copy icon to copy an item and the bin icon to delete it.
5. Use the **Clear** links to empty a section (you will be asked to confirm).
6. **Delete all saved data** removes everything and cannot be undone.

**Where the data lives:** in this browser's LocalStorage. It is not synced, not backed up, and not visible on another device or browser. Clearing browser data deletes it.

---

## 10. API Reference page

**Developers → API Reference** documents the HTTP API this build ships, for anyone self-hosting it or writing against it. It is documentation only: it makes no AI request and changes nothing.

1. **Endpoints** — `GET /api/health` and `POST /api/ai`, with every request field, its rules and its limits.
2. **Responses** — the success shape for an explanation and for a quiz, plus the full error map with status codes (for example `503 ai-not-configured` when the server has no key).
3. **Self-hosting** — the environment variables the Node server and the Cloudflare Worker read, and the request-size limit (64 KiB).
4. **Browser API** — the `window.SM` surface, and the three protocols the key panel speaks: OpenAI-compatible, Anthropic Messages and native Gemini.
5. **Live status** — the card reads this deployment's own `/api/health`, so it shows the real mode, provider, model and rate limits. On the public demo that is prompt mode with no key, which is expected.

Like the rest of the app, the page works offline after the first visit.

---

## 11. Keyboard and accessibility

- `Tab` / `Shift+Tab` move through every control; focus rings are always visible.
- Press `/` or `Ctrl/Cmd + K` anywhere to open global search. Type to filter pages, glossary terms, saved items and your plan; use `↑` / `↓` to choose a result, `Enter` to open it and `Escape` to close.
- The sidebar's collapse button shrinks it to icons; each icon keeps a tooltip and a screen-reader label, and your choice is remembered on this device.
- `Enter` submits the focused form; `Space` activates buttons.
- On mobile and tablet, `Escape` closes the navigation drawer.
- Generated prompts are focusable: `Tab` to the dark panel and use `Ctrl/Cmd + C` to copy manually if the clipboard is blocked.
- The first `Tab` on any page reveals a **Skip to main content** link.
- Error messages are announced by screen readers (`role="alert"`), as are toasts and result counts.

---

## 12. Troubleshooting

| Problem | What to do |
|---|---|
| "Copy failed — select the text and press Ctrl+C" | Your browser blocked clipboard access. The prompt panel is focused: press `Ctrl/Cmd + C`. |
| "LocalStorage is blocked" | Private browsing or strict file restrictions. The app still works, but saved items last only for the session. Use the served version (section 1) or a normal window. |
| Nothing appears after pressing a button | Check the inline red message — a required field is missing. |
| The plan is shorter than the days I entered | Your exam date is sooner than those days; the plan was shortened deliberately. |
| Search finds nothing in the glossary | Try a shorter word, or add the term as a personal term. |
| Too many prompts in Saved Learning | Delete individual items, or use **Clear** for a section. |

---

## 13. Remember

StudyMate ICT helps you ask better questions. It cannot make an AI answer correct. Always check generated content against your class notes, textbook or lecturer, and follow your institution's rules on AI assistance.

---

## 14. AI mode: what changes when a key is configured

The app runs in one of two modes, and the chip in the top bar always tells you which:

- **Prompt mode · no API key** — the app never contacts a model. It builds a prompt you copy into an assistant you are allowed to use. Everything works offline.
- **AI live · model-name** — the deployment has a key, so the AI buttons work. The key stays on the server; your browser never sees it.

When AI is enabled you will also see a short orange note above the AI button saying your topic or notes are sent to the provider. Nothing is sent until you press the button.

### 14.1 Explain a topic with AI

1. Open **Explain ICT**.
2. Type a topic (for example `RAM`), choose your learner level, prior knowledge and how long you want the explanation.
3. Press **Explain with AI**. A spinner shows while the tutor is writing.
4. Read the nine sections: definition, why it matters, step by step, practical example, real-world application, common misconceptions, technical vocabulary, summary, and revision questions.
5. Revision answers are hidden behind each question — answer it yourself first, then click to check.
6. Press **Save explanation** to keep it in Saved Learning.

If something goes wrong, the message under the button explains it and **Retry** sends the same request again. A malformed AI answer is rejected rather than shown, so you never have to guess which parts are real.

Still want a prompt? Press **Build copy-paste prompt** — that path is unchanged and works offline.

### 14.2 Practise a quiz and get marked

1. Open **Quiz Generator** and paste your notes (the quiz can only use what you paste).
2. Choose the number of questions, difficulty and question type.
3. Press **Generate & practise**.
4. Answer every question — multiple choice and true/false are clickable, short answers are typed.
5. Press **Mark my answers**. If any question is blank, the app says how many and does not mark yet.
6. Read your score. Every question you got wrong is listed with your answer, the correct answer, a one-line explanation and the sentence from your notes that supports it.
7. Short answers marked **“for self-check”** may still be right — compare your wording with the model answer.

Your score is saved and appears on the dashboard. Use **New quiz** to generate another set from the same notes.

### 14.3 Tick off your study plan

1. Build a plan in **Study Planner** as usual, then press **Save plan**.
2. Each study, revision and self-assessment activity now has a checkbox.
3. Tick activities as you finish them. The progress bar and “x of y activities done” update immediately.
4. Come back later: the planner restores your most recent saved plan with its ticks, and the dashboard shows the same progress.

## 15. Settings, themes and backups

**Settings** has four groups.

- **Appearance** — theme (match your device, light or dark), default explanation level, and preferred study subjects. Subjects pre-fill the planner's topic box on your next visit.
- **Accessibility** — reduce motion (removes smooth scrolling and transitions) and larger text.
- **AI privacy** — keep the “notes are sent to the AI provider” notice visible even after you dismiss it.
- **Your data** — download a JSON backup, import one, or delete everything.

### Backing up

1. Settings → **Download backup (.json)**. The file is named `studymate-ict-backup-YYYY-MM-DD.json`.
2. Keep it somewhere safe (cloud drive, email to yourself).
3. To restore, Settings → **Import backup**. Importing **replaces** your current data; it does not merge.

### Theme

Choose **Match my device** to follow your operating system, or force light/dark. The choice applies before the first paint, so there is no flash of the wrong colours, and it persists across reloads.

## 16. If a button is greyed out

- **Explain with AI** / **Generate & practise** — disabled when the deployment has no key (prompt mode), when you are offline, or while a request is already running. The note above the button says which.
- **Save explanation** — enable after an explanation exists.
- **Mark my answers** — disappears once you have marked that quiz; use **New quiz** to start again.

## 17. Adding your own AI key (recommended)

StudyMate works without any key — it builds prompts you can paste into an AI assistant. To get real answers inside the app, add your own key. It is free to add, and it stays on this computer.

### Step by step

1. Open **Home** in the sidebar (or **Settings**).
2. Choose your provider in the **Provider** list — search or scroll through 47 presets (OpenAI, Anthropic Claude, Google Gemini, OpenRouter, Groq, Mistral, DeepSeek, Together, Qwen, Kimi, local Ollama and many more). Choose **Other provider** if your provider is not listed.
3. Check the **Base URL**. It is the address your provider gives for its OpenAI-compatible API (for example `https://api.openai.com/v1`). It must **not** end in `/chat/completions`; StudyMate adds that part itself.
4. Check the **Model** name — it must be a model your key is allowed to use.
5. Paste your **API key** and press **Save & test key**.
6. If you see “Connected … AI is ready”, you are done: **Start studying** and **Create a study plan** now use the AI. If you see an error, read it — a rejected key, a wrong model name and a base-URL problem each have their own message.

### Where the key is stored

- In **this browser, on this computer**, in LocalStorage. It is never sent to this website's server and never built into the app.
- Requests go straight from this page to the provider you chose, using your key.
- **Show/Hide** reveals the key only in the input box; the saved key is never printed back on screen.
- **Remove saved key** (Home or Settings) deletes it immediately and the app returns to prompt mode.
- **Settings → Delete all local data** also deletes the key.
- Backups (.json) never contain the key.

### Good habits

- Do not save a key on a shared, school or public computer.
- If a device is lost, revoke the key in your provider's dashboard.
- Some providers block requests made directly from a browser (CORS). If the test fails with “Could not reach your provider from this browser”, use a provider that allows it, or ask the site owner to set a server-side key.

### Which mode am I in?

The chip in the top bar tells you:

| Chip | Meaning |
|---|---|
| `Prompt mode · no API key` | No key anywhere: every tool still works and builds a prompt to copy |
| `AI ready · <model> (your key)` | Your key is saved and tested; the first AI answer will confirm it |
| `AI live · <model> (your key)` | Your own key is answering requests from this browser |
| `AI live · <model>` | The deployment has its own server-side key |
| `Prompt mode · offline` | You are offline (or opening the file from disk) |
