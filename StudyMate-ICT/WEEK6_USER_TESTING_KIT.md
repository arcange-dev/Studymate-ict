# Week 6 — User Testing Kit

Everything needed to run the two Week 6 test sessions required by the Ishvexa Hub handbook: **two consenting testers, anonymised feedback, and a change log of at least three justified improvements**.

This kit is a template. Nothing in it should be filled in until a real session has happened. Empty fields mean "not yet run", and that is the honest state to submit.

---

## 1. How to run the sessions

**Before the session**

1. Recruit two people who are not you and who have not used the app before. Beginner ICT students are the intended audience; a friend who has never opened the app is acceptable if they are told what it is and agree.
2. Send tester A the consent note (section 2) **before** the session and keep their reply. Read it aloud at the start of the session and answer questions.
3. Give each tester an ID: `T1` and `T2`. Record only the ID in every note, form and change-log row. Do not write real names, phone numbers, email addresses or student numbers anywhere in the repository.
4. Reset the browser to a clean state (Settings → reset data, or a private window) so both testers start from the same empty app. The demo data used for screenshots must not be present.
5. Have the live URL ready: https://studymate-ict-04s0d8.freebuff.site/
6. Start a timer. Allow 25–30 minutes per tester: 5 minutes briefing, 20 minutes tasks, 5 minutes questions.

**During the session**

- Read each task aloud exactly as written in section 3. Do not explain the interface, point at buttons or correct the tester.
- Say only neutral prompts when they stall: *"What are you looking for?"*, *"What would you try next?"*, *"Say what you are thinking."*
- After 90 seconds of being stuck on one task, note "blocked at …" and move on. A block is a finding, not a failure.
- Write down what you saw, in the tester's words where possible, not what you expected.
- Do not record audio or video without explicit permission on the consent note. Written notes are enough.

**After the session**

1. Fill the feedback form (section 4) from your notes with the tester in the room, or send it to them and wait for their reply.
2. Anonymise: replace any name with `T1`/`T2`.
3. Decide the three or more improvements and fill the change log (section 5) with the reason each one follows from a specific observation.
4. Rerun the affected tests (the planner, quiz and glossary tasks map to automated tests and the manual cases in `TESTING_REPORT.md`), and record the rerun result in the change log.
5. Update section 11 of `FINAL_CAPSTONE_REPORT.md` with the session summary and the change-log summary.

**Rules that come from the handbook**

- Public or fictional information only: testers must not paste real customer data, passwords or private notes.
- No identifying details in the repository, the presentation or any social post.
- Stop immediately if a tester withdraws; delete their form and notes.
- No incentives that could pressure a tester into praising the app. Praise is not a requirement and does not count as evidence.

---

## 2. Consent note

> **StudyMate ICT — user testing consent (Week 6)**
>
> I am testing StudyMate ICT, a study app I built for an AI and Prompt Engineering internship at Ishvexa Hub. The session takes about 30 minutes.
>
> **What you will do:** use the app on a browser while I take notes. I will ask you to try five short tasks and then ask what helped, what confused you and what you would change.
>
> **What I will record:** your task attempts, any place you got stuck, and your answers to a short written feedback form. You will be identified only as **T1** or **T2**. I will not record your name, contact details, school, student number or anything else that identifies you, and I will not photograph or record your screen, voice or video unless you tick the box below.
>
> **What I will not do:** I will not publish your name or feedback in a way that identifies you, and I will not use your feedback for anything except improving this project and reporting the internship work.
>
> **Your choice:** participation is voluntary. You can skip any task, take a break, or stop at any time, and you can ask me to delete your notes and form afterwards without giving a reason. If you stop, nothing you said will be used.
>
> **Data:** your notes and form stay in the project's private testing record. The anonymised version (T1/T2) may appear in the internship report, the presentation and the repository.
>
> **Contact:** Mukamyi Izere Arcange — repository: https://github.com/arcange-dev/Studymate-ict
>
> Please confirm each line:
>
> - [ ] I have read or heard this note and I had the chance to ask questions.
> - [ ] I agree to take part in this session.
> - [ ] I agree to my anonymised feedback being used in the internship report and presentation.
> - [ ] *(optional)* I agree to the session being recorded for my own review by the developer only.
>
> Tester ID: ______ Date: ______ Signature (or typed name): ______________________

Keep the signed or typed reply in the private testing record, **not** in the public repository. In the repository, record only: "T1 and T2 consented on [date]; consent notes held privately."

---

## 3. Tester tasks

Five tasks, in this order. Read each one exactly as written. Each task has a success signal so you can score it without guessing.

### Task 1 — Understand a term (5 minutes)

> "You are revising for an ICT test and you are not sure what **subnetting** means. Use the app to get an explanation you could revise from, at a level you can follow."

**Success signal:** an explanation is produced (or a prompt is produced and copied) for *subnetting* at the tester's chosen level, and the tester can say in one sentence what they would revise.
**Watch for:** whether they find the Explainer without help, whether the level control is noticed, whether "prompt mode" is understood or mistaken for a broken feature.

### Task 2 — Practise and mark a quiz (5 minutes)

> "Now practise **DNS and IP addresses**. Generate some questions, answer them, and mark your answers. Tell me your score when you are done."

**Success signal:** at least three questions generated, answered and marked, with a visible score.
**Watch for:** whether the correct answer is obvious after marking, whether they understand the explanation, whether they try to save the quiz.

### Task 3 — Build a plan you would actually follow (5 minutes)

> "You have **45 minutes a day for the next 4 days** and three topics to revise: hardware, networking and databases. Build a plan you would actually follow, then tell me what you would do on day one."

**Success signal:** a plan is built with 45 minutes per day and 4 days, day one is read out accurately, and the plan does not book more than 45 minutes.
**Watch for:** whether they notice the planner is not AI, whether the saved-plan panel and the form are confused with each other, whether the examination-date field is understood.

### Task 4 — Ground an answer in notes (5 minutes)

> "Here are your own notes about the ICT club's opening hours: *'The club room is open Monday to Thursday, 4–6 pm. There is no session on Friday.'* Ask the app whether the club is open on Saturday, and tell me whether you would trust the answer."

**Success signal:** the tester asks the question and can explain that the notes do not cover Saturday, so the app must refuse rather than guess.
**Watch for:** whether the refusal sentence is read as an error, whether the "notes only" rule is understood, whether they test an override sentence themselves.

### Task 5 — Find something you saved (3 minutes)

> "Find everything you saved in this session in one place, and tell me which item you would delete and why."

**Success signal:** the Saved Learning view lists the topic, prompt, term and activity from the earlier tasks, and the tester can identify one item.
**Watch for:** whether the empty-state wording is understood, whether delete asks for confirmation, whether they expect the data to follow them to another device.

### Wrap-up questions (5 minutes)

1. Which task felt easiest, and why?
2. Where did you hesitate or guess?
3. Was there a moment you expected something to happen that did not?
4. Did anything look broken or unfinished?
5. What one change would make you use this again?
6. Would you have known the app was not contacting an AI? Does that matter to you?

Ask the questions open-ended first, then use the form in section 4 for the ratings.

---

## 4. Feedback form

One form per tester. Complete with the tester present or send it to them; keep their reply private.

**Tester ID:** ______ **Date:** ______ **Device and browser:** ______________________

**Before this session, had you used StudyMate ICT?** No / Once or twice / Often

**Ratings** — 1 = strongly disagree, 5 = strongly agree

| # | Statement | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| 1 | I could complete every task without help. | | | | | |
| 2 | The screen I needed was easy to find. | | | | | |
| 3 | The app explained what it was doing at each step. | | | | | |
| 4 | I understood that the app builds a prompt instead of calling an AI when no key is set. | | | | | |
| 5 | The quiz marking was clear and useful. | | | | | |
| 6 | The study plan looked realistic enough to follow. | | | | | |
| 7 | I knew when the app could not answer from my notes. | | | | | |
| 8 | I would use this app again for ICT revision. | | | | | |
| 9 | The text was comfortable to read (size, spacing, typeface). | | | | | |
| 10 | Nothing looked broken or unfinished. | | | | | |

**Task outcomes** — completed / completed with difficulty / blocked

| Task | Outcome | Where it went wrong (tester's words) |
|---|---|---|
| 1 Understand a term | | |
| 2 Practise and mark a quiz | | |
| 3 Build a plan | | |
| 4 Ground an answer in notes | | |
| 5 Find something saved | | |

**Open questions**

1. What was the most useful thing the app did for you?
2. What confused you most?
3. Was there anything you expected the app to do that it did not?
4. Did any wording suggest the app was doing something it was not?
5. If you could change one thing, what would it be?
6. Anything else you want to tell me?

**Permission check**

- [ ] Tester agreed that their anonymised answers may be quoted in the report and presentation.
- [ ] No name, contact detail, school or student number appears anywhere on this form.

---

## 5. Change-log template

At least three improvements, each traceable to a specific observation. Copy this table into the completed record and add rows as needed; do not delete rows that turned out to be bad ideas — record the outcome instead.

| ID | Date | Source (T1/T2, task) | Observation (what happened) | Change made | Why this change follows from the observation | Files / screens touched | Tests rerun and result | Outcome after rerun |
|---|---|---|---|---|---|---|---|---|
| C1 | | | | | | | | |
| C2 | | | | | | | | |
| C3 | | | | | | | | |
| C4 | | | | | | | | |

**Completion rule:** a row is only finished when the "tests rerun and result" column contains a real command or check and its outcome — for example `npm test` 54/54, or the planner task repeated with the new build. A change with no rerun stays marked "not verified".

**Summary block** (paste into `FINAL_CAPSTONE_REPORT.md` §11 when the sessions are done):

```
Sessions: T1 and T2, [dates], desktop and phone respectively.
Completed without help: [n]/10 task attempts.
Blocked: [list].
Improvements made: [C1..Cn, one line each].
Tests rerun: [commands and results].
Still unresolved: [list].
```

---

## 6. What this does and does not satisfy

- **Satisfies:** Week 6 items 1–5 — two consenting testers, observed struggle, anonymised summary, at least three justified improvements, rerun results — once the sessions are actually run and the tables filled.
- **Does not satisfy:** the social post requirement. The Wednesday "feedback" post and the Friday final-demonstration post still need to be published and linked in the submission.
- **Does not replace:** the Week 4 ten-case grounded-assistant test set, which is a separate gap recorded in the report.

Do not fill these tables from imagination. An empty row is defensible; a fabricated session is not.
