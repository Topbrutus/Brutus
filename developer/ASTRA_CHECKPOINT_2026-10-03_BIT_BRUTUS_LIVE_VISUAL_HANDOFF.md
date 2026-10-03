# ASTRA CHECKPOINT — BIT / BRUTUS LIVE VISUAL HANDOFF

Date: 2026-10-03
Repository: Topbrutus/Brutus
Checkpoint branch: astra/checkpoint-developer-20261002-live-transport
Purpose: persist the current Astra live-visual workstream in the repository developer area.

## Recovery rule

Use this checkpoint plus the sibling Python source as the restart point for the BIT / Brutus visual machine.

Live source > checkpoint > hypothesis.

Do not claim a visual particle is a proof by itself. Exact numeric transitions come from the Brutoconvoyeur trace source.

## Current Brutus working clone

Primary working clone:
`D:\Brutus-Aquarium-Live`

Feature branch observed before checkpoint:
`astra/antmux-live-transport-adapter-v01-20261002`

Exact feature HEAD:
`c58fdc2c4f080fbf1b2b509806fbb04e4b3c7e48`

The working clone also had two unrelated untracked HTTP log files; they were not added to this checkpoint.
## Saved visual application

Repository copy:
`developer/BIT_BRUTUS_VISUAL_MACHINE_v0.3_LIVE_TRACE.py`

Source copied from:
`C:\Users\casho\Downloads\bit_brutus_visual_machine_v03_live_traces.py`

The application is read-only with respect to Brotoculateur.

It reads aggregate status/formula material from:
- `http://127.0.0.1:8778/api/status`
- `http://127.0.0.1:8778/api/zel/outbox`

For exact live numeric movement it tails the active Brutoconvoyeur JSONL directly, avoiding the dashboard service lock.

Current trace source observed:
`C:\Users\casho\AppData\Local\Brotoculateur\seven-runtime2\traces\run-20261002T194025-561792Z-continuity\trace_7.jsonl`

Exact trace fields:
`INPUT · OUTPUT · FORMULE · PARENT · BRANCHE · RONDE · TRACE`

The UI turns each newly appended trace into a labeled mechanical movement while preserving the exact input/output/formula text.
## Live observation at checkpoint

Visual process was running as `pythonw.exe`, PID 23816.

Trace file was actively growing and measured at 171149996 bytes at the observation point.

Latest exact trace observed:

```json
{"BRANCHE":"ROOT/Y:T/Y:T/Y:T/Y:T/Y:T","FORMULE":"ZEL_F1_8999c20385","INPUT":"9","OUTPUT":"151291437444","PARENT":"7893a512657f4a75bb7ef2908ded80a8","RONDE":96,"TRACE":"b01e8ca9027f498586208ae2c97201fe"}
```

Meaning the live visual source had a real transition:

`9 --ZEL_F1_8999c20385--> 151291437444`

at round 96 on the recorded branch path.

## Important implementation fixes already made

- fixed Tkinter method collision by renaming the custom `_bind()` helper to `_bind_controls()`;
- moved the live exact trace feed away from repeated `/api/seven-traces` polling because that endpoint can block while the dashboard service lock is held;
- switched to direct read-only tailing of the persisted `trace_7.jsonl`;
- baseline starts at EOF so opening the app does not replay the historical ~170 MB trace file;
- new run files are detected automatically;
- visual drawing is bounded so high trace throughput does not create unlimited canvas objects;
- target rendering reduced to ~15 FPS to keep CPU load low.
## Visual semantics

Exact:
`INPUT -> FORMULE -> OUTPUT`

Source of exactness:
Brutoconvoyeur JSONL.

Semantic overlays:
- canonical/authenticated/testing/rejected counters;
- ZEL registered count;
- gears, return paths, particles and movement speed.

These overlays are explanatory UI. They are not independent proof claims.

## Next action

Make the moving piece itself visibly carry the current INPUT, show the FORMULE while crossing the corresponding gear, then replace the label with OUTPUT on exit.

After that, add exact trace/proof correlation when a low-contention proof feed is available.

Do not modify Brotoculateur core merely for animation if the required fact already exists in the persisted trace stream.

## Resume

1. Fetch Topbrutus/Brutus.
2. Read this checkpoint.
3. Open `developer/BIT_BRUTUS_VISUAL_MACHINE_v0.3_LIVE_TRACE.py`.
4. Verify port 8778 and the active trace directory.
5. Launch the visual application with Python 3.12+.
6. Confirm the active trace file is growing before calling the display live.
