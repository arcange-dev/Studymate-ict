# Presentation Guide — StudyMate ICT

A five-minute capstone demonstration. Rehearse twice with a timer. Open the app beforehand, clear saved data, and have one browser tab ready with an AI assistant (optional — the demo works without it).

---

## Before you start (2 minutes, not part of the five)

1. Open `index.html` (or the served URL).
2. Clear saved data: **Saved Learning → Delete all saved data**.
3. Have these ready to paste:
   - Notes for the quiz:
     > RAM is volatile memory that holds programs and data in use. It loses its contents when power is removed. ROM is non-volatile and stores firmware. Cache is small, fast memory inside the CPU. More RAM allows more applications to run at once.
   - Notes for grounded mode:
     > Cache memory is a small amount of very fast memory close to the CPU. It stores recently used instructions and data. The CPU checks the cache before reading from RAM. A cache hit is much faster than a RAM read.
4. Set the browser window to a comfortable size; zoom to 100%.
5. Keep the clock visible.

---

## 0:00–0:45 — Introduce the project and the problem

**On screen:** Dashboard.

**Say:**

> "This is StudyMate ICT, my capstone for the AI and Prompt Engineering internship at Ishvexa Hub. It helps beginner ICT students understand technical concepts, test themselves, and plan revision.
>
> The problem isn't that AI can't explain RAM. It's that a beginner doesn't know how to ask. They type 'explain RAM' and get an unsorted wall of text, with no way to tell what's correct.
>
> So I didn't build another chatbot. I built the prompt layer: six tools that turn a beginner's inputs into structured, constrained prompts — plus an offline glossary and planner that need no AI at all. Important: this application makes no AI calls and holds no API key. You copy the prompt into an assistant you trust. That keeps it free, offline and honest."

**Point at:** the sidebar's six study tools, the "Prompt mode · no API key" chip, the "Works offline" badge.

---

## 0:45–1:30 — ICT Concept Explainer

**Do:** *Explain ICT* → topic `RAM` → level "Beginner (first ICT course)" → length "Short" → **Generate prompt**.

**Say:**

> "One topic, four inputs, and the prompt now contains a role, the learner's context, and a numbered contract for exactly nine sections — definition, why it matters, step-by-step, a practical example, real-world use, misconceptions, summary, five practice questions and a separate answer key.
>
> The rules matter as much as the structure: define every technical term, stay inside a word budget, and if it isn't sure of something, say so instead of inventing detail. That last rule is what stops confident nonsense."

**Do:** scroll the prompt panel briefly to show the numbered sections, then press **Copy prompt** and show the toast.

---

## 1:30–2:15 — Quiz Generator

**Do:** *Quiz Generator* → paste the RAM/ROM/cache notes → 5 questions → Mixed → **Generate quiz prompt**.

**Say:**

> "Students already have notes. This tool locks the quiz to those notes. The notes sit inside a delimited block marked as the only permitted source, so the model can't quietly add outside facts.
>
> Every question must be answerable from those notes, must carry a 'Source:' line quoting them, and the answer key is forced into a separate section with an explanation. If the notes are too short for five questions, it must say how many they support instead of padding."

**Do:** press **Clear**, then press **Generate** with empty notes.

> "And it refuses to build a quiz without a source — a quiz with no source is a guessing game. Notice the old prompt is also cleared, so you can't mistake a stale quiz for a new one."

---

## 2:15–3:00 — Smart Study Planner

**Do:** *Study Planner* → topics `CPU architecture`, `RAM and ROM`, `Operating systems` → 60 minutes → 3 days → **Build my study plan**.

**Say:**

> "This one doesn't need AI at all — it's my own scheduling algorithm. It takes the minutes the student actually has and splits them into study blocks, a real five-minute break, a second block, and a self-assessment quiz.
>
> The rule I enforce is that it never books more time than the student declared. Every day header reads '60 / 60 min used' — you can add the session minutes yourself.
>
> Day three becomes a revision day, each day has a learning objective, a practice activity and self-assessment questions. And if the exam is sooner than the days they entered, the plan is shortened to reach it."

**Do:** point to the "60 / 60 min used" values, the break row, the revision tag, and one self-assessment question.

---

## 3:00–3:45 — Source-Grounded Learning

**Do:** *Source-Grounded* → paste the cache notes → question `Why does the CPU need cache memory?` → **Generate grounded prompt**.

**Say:**

> "This is the responsible-AI centrepiece. The notes are the only allowed evidence. Every point must quote the sentence that supports it, and the model's own reasoning must be labelled 'Inference (not stated in the notes)'.
>
> And the refusal is fixed, not left to chance: if the notes can't answer, it must reply with exactly this sentence — 'The supplied notes do not provide enough information to answer that reliably.'
>
> The coverage indicator is a keyword heuristic, and I label it as such. Watch what happens when I ask something the notes can't possibly cover."

**Do:** change the question to `How does quantum entanglement work?` → **Generate** → point to "None of the important words appear in your notes — expect the refusal message."

> "It warns the student before they waste time, and the refusal rule stays in the prompt."

---

## 3:45–4:30 — Prompt engineering and responsible AI

**On screen:** *Prompt Library*, then *About the Project* (optional).

**Say:**

> "Every prompt in this project follows the same seven-layer pattern: role, context, task, output contract, constraints, a refusal rule where grounding matters, and a responsible-use footer.
>
> That pattern is why the outputs are usable. A numbered contract makes an answer markable. A word budget stops padding. A source block stops drift. A fixed refusal string makes the failure mode testable.
>
> The library exposes eight templates so a student or lecturer can reuse the technique, with the purpose, required inputs, expected output and an example for each.
>
> On responsible AI: the app never fabricates an AI response, never stores a key, collects no personal data, and every prompt ends by telling the learner to check against their own notes. It's a study aid, not an authority."

---

## 4:30–5:00 — Limitations and lessons learned

**On screen:** *About the Project*, limitations section (or Saved Learning to show persistence).

**Say:**

> "What it does not do: this public demo has no server key, so it runs in prompt mode and answer accuracy depends on the assistant the student uses — I didn't measure that. You can add your own provider key in the browser and it will call the provider directly. The planner is a straightforward scheduler, not an optimiser. Saved data is LocalStorage only — this browser, this device, no backup. And the coverage check is a keyword heuristic, not understanding.
>
> The biggest lesson was that prompt engineering is software engineering: constraints, output contracts and refusal rules are testable requirements. I ran seventeen browser checks during development — functional flows, validation, storage, navigation, three screen sizes and console errors — and for the final build I re-checked all twelve routes at desktop and phone width on both live addresses, with no layout or console errors. I found six real defects along the way and fixed all of them.
>
> One last screen: **Developers → API Reference**. The app documents the API it actually ships — the health check and the AI endpoint, every field and error code, and this deployment's live status, read from `/api/health` rather than hard-coded. It's the page a lecturer would need to self-host it.
>
> Next steps would be real-provider evaluation, shared rate limiting, export and backup, and spaced repetition from quiz results.
>
> Thank you — I'm happy to take questions."

---

## Likely questions and short answers

**"Why isn't it connected to an AI? Is that a weakness?"**
The public demo has no key, so it deliberately stays in prompt mode and says so. But the app is not prompt-only: the panel on Home accepts your own provider key — 47 presets, automatic URL testing, native OpenAI, Anthropic and Gemini protocols — and the repository also ships a server endpoint for an owner-supplied key. Keeping the prompt layer as the default makes the project free, offline-capable and impossible to confuse with an answer machine.

**"How do you know the prompts work?"**
I can show the structure and the constraints, and I tested the app end to end. Response quality depends on the model, which is why I don't claim measured accuracy — I claim measurable prompt structure, and I say that in the testing report.

**"What stops the AI from making things up?"**
Three mechanisms: notes as the only permitted source, per-question source lines and quoted evidence, and a fixed refusal sentence. None is a guarantee — the learner still has to check, which the interface says repeatedly.

**"Could a student use this to cheat?"**
It generates practice material from the student's own notes and refuses when evidence is missing. It doesn't write assignments, and the responsible-use text asks learners to follow institutional rules.

**"How is the plan really limited to the available time?"**
It's arithmetic, not AI: each day's study minutes plus break minutes plus 5 minutes of self-assessment equal the entered budget. The header shows the total, and the test report verifies 60/60 for three days.

**"What would you do with two more months?"**
A server-side AI proxy with a key and rate limits, JSON export/import for backup, an installable offline PWA, and quiz results feeding spaced repetition.

---

## Delivery tips

- Speak to the audience, not the screen; point at one thing at a time.
- Do not read prompts aloud — show the structure and name the technique.
- Keep the copy step visible: it is the honest boundary of the project.
- If something fails live, say what you expected, show the validation message, and continue; the app is designed to fail with a clear message.
- End on limitations, not features. It is the part assessors remember as maturity.

---

## 3-minute demonstration script (version 2.4.0)

Rehearse this against the live URL in prompt mode. Do not claim the AI is live on the public demo — the chip says prompt mode, and the script says so too.

**[0:00–0:25] The problem and the product**
> “Beginner ICT students meet dense vocabulary before they have the words to decode it. StudyMate ICT is an offline-first study assistant: explanations, practice quizzes, a planner, a glossary and source-grounded learning. It installs like an app and works with the network off.”

**Action:** open `https://studymate-ict-04s0d8.freebuff.site/`. Point at the status chip.

> “That chip is honest: this deployment has no AI key, so it says *Prompt mode*. Nothing here pretends to be a model.”

**[0:25–1:05] Explain ICT (prompt mode)**
1. **Explain ICT** → topic `RAM` → *Build copy-paste prompt*.
2. Scroll the nine-section contract.
3. Say: “Nine sections, a level, a length, and a rule against invented facts. Press Copy and it runs in any assistant the student is allowed to use.”

**[1:05–1:45] Live AI, when a key exists**
1. Open **Home** and point at the provider panel: choose a provider, watch the URL test run, press **Test connection**. Say: “The key stays in this browser; the app proves the URL and the key before saving anything.”
2. Switch to the locally running server (or state plainly that the key is not on the demo).
2. **Explain ICT** → *Explain with AI*. The chip changes to *AI live* only after the answer arrives.
3. Show sections 1–3 and open one revision answer.
4. Say: “The key never reaches the browser. The server validates the request, calls one provider, and rejects any answer that is not the exact JSON shape — so a broken answer is an error, not a half-drawn page.”

**[1:45–2:20] Quiz with real marking**
1. **Quiz Generator** → paste two sentences of notes → *Generate & practise*.
2. Answer two questions wrongly on purpose → *Mark my answers*.
3. Show the score and the review block: your answer, the correct answer, the explanation, the quoted source line.
4. Say: “Marking happens in this browser, so it is deterministic and free. Short answers that use different words are flagged for self-check instead of being failed silently.”

**[2:20–2:45] Planner, progress and settings**
1. **Study Planner** → two topics, 45 minutes, 2 days → build → **Save plan**.
2. Tick one activity; point at “1 of 6 activities done · 17%”.
3. **Dashboard** → the same progress and the quiz score.
4. **Settings** → toggle dark theme; mention the JSON backup.

**[2:45–3:00] Close**
> “Fifty-four automated tests cover the AI contract, the HTTP surface, the marking logic, the provider catalogue and the navigation. Offline was verified with the server stopped. Known limitations — no key on this demo, heuristic short-answer marking, per-instance rate limits — are written down rather than hidden. The source and the full test report are on GitHub.”

### Questions you should be ready for

| Question | Answer |
|---|---|
| “Is the AI real?” | Yes, there is a real endpoint and provider adapter; this deployment has no key, so it runs in prompt mode. I verified the path with a stub provider and documented that a real provider is untested. |
| “Where is the key?” | Server environment only. `/api/health` reports whether it exists, never its value. |
| “What if the model returns nonsense?” | The schema check rejects it with a 502 and the UI offers Retry. |
| “Why no accounts or database?” | Nothing in the feature set needs sync; LocalStorage plus export/import keeps cost and personal data at zero. |
| “What is not finished?” | Real-provider testing and the Render deployment need credentials; both are documented with the exact steps. |
