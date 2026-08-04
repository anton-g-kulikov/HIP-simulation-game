# Facilitator Run Sheet

The practical companion to [HIP_Playtest_Protocol.md](HIP_Playtest_Protocol.md). That document owns *what is being measured and why*; this one owns *how to run the session without losing the data*.

---

## Before the first session

**Build the playtest artifact.** The dev server must not be used with participants — it ships the debug panel, and a participant who sees true probabilities is no longer answering the question the playtest asks.

```bash
npm run build
```

**Verify the build is clean.** This takes ten seconds and protects the whole round:

```bash
grep -c "True probabilities" dist/assets/*.js
```

Expect `0`. Then open the build, triple-tap the month counter, and confirm nothing opens.

**Look at it.** Open the built app at a phone width and check one screen end to
end — bars have visible fills, cards show signals, nothing is cut off. The test
suite runs in jsdom and computes no layout, so a visual pass is the only thing
that catches rendering faults.

**Serve it.**

```bash
npx vite preview --port 4173
```

Open `http://localhost:4173` on the device the participant will use. A phone-sized window (375×812) is the design target; a real phone is better than a desktop browser at a phone width.

**Check the balance is the balance you think it is.** If content or tuning changed since the last round, re-run `npm run harness` and confirm 10 of 10 invariants still hold. A round played against a broken balance tells you nothing about the loop.

---

## Between participants

The campaign is stored in the browser, so it must be cleared or the next participant inherits the last one's career.

1. Collect the previous participant's export first (see below).
2. Clear site data for the origin, or run `localStorage.clear()` in the console, then reload.
3. Confirm the app opens on **Where you are** — that is the sign of a fresh campaign.

Each participant should get a different seed, which happens automatically on a fresh campaign. Do **not** reuse a seed unless you are deliberately comparing two participants on the same world; if you do, note it, because the allocation-divergence metric in the protocol assumes a shared seed.

---

## During the session

**What you say at the start** is in the protocol, §3 step 1. Keep to it. Do not explain Energy, repetition cost, personal fit, or how outcomes resolve.

**When the participant asks a rules question, write it down and do not answer it.** Say "play it however seems right to you". Every question logged is a UI finding; every question answered is a finding destroyed.

**Two probes appear in-app** after months 4, 8 and 12 — how hard the decision felt, then whether they know what they are waiting on. Let the participant answer them without discussion.

**If the app breaks mid-session**, note the month and what they had just done, then reload. The campaign is saved after every commit, so at most the current turn's un-committed allocation is lost. Do not clear storage — that would discard the session.

**Expect a session to take 20–30 minutes** of play plus 10 minutes of debrief. If it runs past 45 minutes total, note it: that is itself a finding about session length.

---

## Collecting the data

At the end of the campaign the retrospective shows **Export this session** as the main action. Tap it. A file called `hip-playtest-session.json` downloads.

Rename it immediately to `p01.json`, `p02.json` and so on. Do not use participant names.

The export contains every campaign played in that browser session, so if a participant restarts and plays again, one file still holds everything. Nothing is lost by tapping "Start another campaign" — but collect the file first anyway, out of habit.

**What the file contains:** per turn — energy available, spent and held back, every allocation, the cards offered, cards that expired unused, time spent on each screen, any repetition-cost inflation the participant saw, and their probe answers. Plus every outcome shown, with the turn it came from.

**What it does not contain:** anything identifying. No names, no device information, no network calls. The file never leaves the machine unless you move it. This is worth saying to the participant.

---

## After the round

Analyse against the thresholds in the protocol, §5. Two things to do before drawing conclusions:

- **Check the probe response rate.** If most turns have no probe answer, the participants skipped past them and the difficulty metric is thin.
- **Check the session times.** A median under a minute means people were clicking through rather than deciding, and the other metrics should be read with that in mind.

Write up findings against the four claims (C1–C4), not against a general impression. The protocol's §6 says what each combination of outcomes means and what to do about it.

---

## Known rough edges to expect

These are known and do not need reporting again. Note them only if a participant reacts to them strongly.

- The game has one starting profile, so every participant plays the same person.
- There is no impact model, so nothing in the game rewards mission-driven choices except in the fiction. A participant who optimises for "doing good" will find the ending flat.
- The retrospective has no score by design. Some participants will ask how they did; that reaction is data, and the answer is "it does not score you".
- Personal fit may never become legible in twelve months. If nobody mentions it, that is an expected result, not a bug.
