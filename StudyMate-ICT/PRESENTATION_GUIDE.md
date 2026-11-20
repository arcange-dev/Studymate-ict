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

**Point at:** the sidebar (six tools), the "Prompt mode · no API key" chip, the "Works offline" badge.

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

> "What it does not do: it doesn't call an AI, so answer accuracy depends on whatever assistant the student uses, and I didn't measure that. The planner is a straightforward scheduler, not an optimiser. Saved data is LocalStorage only — this browser, this device, no backup. And the coverage check is a keyword heuristic, not understanding.
>
> The biggest lesson was that prompt engineering is software engineering: constraints, output contracts and refusal rules are testable requirements. I ran seventeen browser checks against this build — functional flows, validation, storage, navigation, three screen sizes and console errors — found six real defects, and fixed all of them.
>
> Next steps would be a server-side proxy for an AI key, export and backup, and spaced repetition from quiz results.
>
> Thank you — I'm happy to take questions."

---

## Likely questions and short answers

**"Why isn't it connected to an AI? Is that a weakness?"**
It's a deliberate scope decision. Connecting an AI needs a server-side proxy to protect the key, plus cost and rate limits. Keeping the prompt layer separate makes the project free, offline and impossible to confuse with an answer machine. The proxy is the first item on the future-work list.

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
