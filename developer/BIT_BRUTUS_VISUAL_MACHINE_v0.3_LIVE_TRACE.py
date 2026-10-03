#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BIT / BRUTUS — Machine visuelle interactive v0.3 LIVE TRACE
================================================

Lecture seule:
    http://127.0.0.1:8778/api/status
    http://127.0.0.1:8778/api/zel/outbox
    http://127.0.0.1:8778/api/seven-traces
    http://127.0.0.1:8778/api/proofs

But:
- transformer les changements RÉELS de compteurs en mouvements visibles;
- permettre de cliquer les engrenages, formules et événements;
- visualiser les voies CANONICAL / TESTING / AUTHENTICATED / REJECTED / ZEL;
- animer les transformations exactes INPUT → OUTPUT depuis /api/seven-traces;
- associer les preuves exactes depuis /api/proofs;
- garder les agrégats/formules via /api/status et /api/zel/outbox.

Dépendances: bibliothèque standard Python seulement (Tkinter).
"""

from __future__ import annotations

import json
import math
import queue
import threading
import time
import urllib.request
import tkinter as tk
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

STATUS_URL = "http://127.0.0.1:8778/api/status"
OUTBOX_URL = "http://127.0.0.1:8778/api/zel/outbox"
TRACE_URL = "http://127.0.0.1:8778/api/seven-traces"  # secours seulement
PROOF_URL = "http://127.0.0.1:8778/api/proofs"        # agrégat/diagnostic
TRACE_ROOT = Path(r"C:\Users\casho\AppData\Local\Brotoculateur\seven-runtime2\traces")

POLL_STATUS_SEC = 0.75
POLL_OUTBOX_SEC = 2.0
POLL_TRACE_SEC = 0.12
FRAME_MS = 66  # ~15 FPS: plus léger, suffisant pour le mouvement mécanique

BG = "#0e0d0b"
PAPER = "#eadfc7"
PAPER_2 = "#f7efdc"
INK = "#29231d"
MUTED = "#6d6252"
BLUE = "#397f9a"
ORANGE = "#d66b2e"
GREEN = "#4c9a67"
RED = "#b84e43"
YELLOW = "#d9ad3f"
PURPLE = "#7b69a6"
WHITE = "#fffaf0"
DARK_PANEL = "#1b1916"
DARK_CARD = "#27231f"


def nested(d: dict[str, Any], *keys: str, default: Any = 0) -> Any:
    cur: Any = d
    for key in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(key, default)
    return cur


def http_json(url: str, timeout: float = 1.6) -> dict[str, Any]:
    req = urllib.request.Request(
        url,
        headers={"Cache-Control": "no-cache", "User-Agent": "BIT-Visual-Machine/0.2"},
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


@dataclass
class LiveEvent:
    seq: int
    kind: str
    label: str
    detail: str
    color: str
    ts: float = field(default_factory=time.time)


@dataclass
class Particle:
    path: list[tuple[float, float]]
    speeds: list[float]
    color: str
    label: str
    event_seq: int
    radius: float = 6.0
    distance: float = 0.0
    delay: float = 0.0
    done: bool = False

    def total_length(self) -> float:
        return sum(
            math.hypot(self.path[i + 1][0] - self.path[i][0],
                       self.path[i + 1][1] - self.path[i][1])
            for i in range(len(self.path) - 1)
        )

    def advance(self, dt: float, visual_speed: float) -> None:
        if self.done:
            return
        if self.delay > 0:
            self.delay -= dt
            return

        remaining = dt * visual_speed
        total = self.total_length()
        while remaining > 0 and not self.done:
            cumulative = 0.0
            seg_index = 0
            seg_offset = self.distance

            for i in range(len(self.path) - 1):
                seg_len = math.hypot(
                    self.path[i + 1][0] - self.path[i][0],
                    self.path[i + 1][1] - self.path[i][1],
                )
                if self.distance <= cumulative + seg_len:
                    seg_index = i
                    seg_offset = self.distance - cumulative
                    break
                cumulative += seg_len
            else:
                self.done = True
                return

            x1, y1 = self.path[seg_index]
            x2, y2 = self.path[seg_index + 1]
            seg_len = math.hypot(x2 - x1, y2 - y1)
            speed = self.speeds[min(seg_index, len(self.speeds) - 1)]
            can_move = max(0.0, seg_len - seg_offset)
            move = speed * remaining

            if move < can_move:
                self.distance += move
                remaining = 0
            else:
                self.distance += can_move
                remaining -= can_move / max(speed, 1e-6)
                if self.distance >= total - 0.001:
                    self.done = True

    def position(self) -> tuple[float, float]:
        if not self.path:
            return 0.0, 0.0
        if len(self.path) == 1:
            return self.path[0]

        d = min(max(self.distance, 0.0), self.total_length())
        cumulative = 0.0
        for i in range(len(self.path) - 1):
            x1, y1 = self.path[i]
            x2, y2 = self.path[i + 1]
            seg_len = math.hypot(x2 - x1, y2 - y1)
            if d <= cumulative + seg_len:
                t = 0.0 if seg_len == 0 else (d - cumulative) / seg_len
                return x1 + (x2 - x1) * t, y1 + (y2 - y1) * t
            cumulative += seg_len
        return self.path[-1]


class DataPoller(threading.Thread):
    def __init__(self, out_queue: queue.Queue):
        super().__init__(daemon=True)
        self.out_queue = out_queue
        self.running = True
        self.last_outbox = 0.0

    def run(self) -> None:
        while self.running:
            now = time.time()
            try:
                self.out_queue.put(("status", http_json(STATUS_URL), time.time()))
            except Exception as exc:
                self.out_queue.put(("error", f"STATUS: {exc}", time.time()))

            if now - self.last_outbox >= POLL_OUTBOX_SEC:
                self.last_outbox = now
                try:
                    self.out_queue.put(("outbox", http_json(OUTBOX_URL), time.time()))
                except Exception as exc:
                    self.out_queue.put(("error", f"OUTBOX: {exc}", time.time()))

            time.sleep(POLL_STATUS_SEC)


class TracePoller(threading.Thread):
    """Tail direct du trace_7.jsonl actif: aucun lock HTTP, aucune écriture."""
    def __init__(self, out_queue: queue.Queue):
        super().__init__(daemon=True)
        self.out_queue = out_queue
        self.running = True
        self.current_path: Optional[Path] = None
        self.position = 0
        self.buffer = b""

    def _latest_trace_file(self) -> Optional[Path]:
        try:
            files = list(TRACE_ROOT.glob("*/trace_7.jsonl"))
            if not files:
                return None
            return max(files, key=lambda p: p.stat().st_mtime_ns)
        except OSError:
            return None

    def run(self) -> None:
        while self.running:
            latest = self._latest_trace_file()
            if latest is None:
                time.sleep(0.5)
                continue

            if latest != self.current_path:
                initial = self.current_path is None
                self.current_path = latest
                try:
                    size = latest.stat().st_size
                except OSError:
                    time.sleep(POLL_TRACE_SEC)
                    continue
                # Au premier lancement: on part du EOF pour ne pas rejouer 170 Mo.
                # Au prochain run: on lit le nouveau fichier depuis le début.
                self.position = size if initial else 0
                self.buffer = b""
                last_trace = None
                try:
                    with latest.open("rb") as fh:
                        fh.seek(max(0, size - 16384))
                        tail = fh.read()
                    lines = [line for line in tail.split(b"\n") if line.strip()]
                    if lines:
                        last_trace = json.loads(lines[-1].decode("utf-8"))
                except Exception:
                    last_trace = None
                self.out_queue.put((
                    "trace_source",
                    {
                        "path": str(latest),
                        "baseline_bytes": self.position,
                        "initial": initial,
                        "last_write_epoch": latest.stat().st_mtime,
                        "last_trace": last_trace,
                    },
                    time.time(),
                ))

            try:
                size = self.current_path.stat().st_size
                if size < self.position:
                    self.position = 0
                    self.buffer = b""
                if size > self.position:
                    with self.current_path.open("rb") as fh:
                        fh.seek(self.position)
                        chunk = fh.read(min(262144, size - self.position))
                        self.position = fh.tell()
                    if chunk:
                        data = self.buffer + chunk
                        parts = data.split(b"\n")
                        self.buffer = parts.pop()
                        for raw in parts:
                            if not raw.strip():
                                continue
                            try:
                                trace = json.loads(raw.decode("utf-8"))
                            except (UnicodeDecodeError, json.JSONDecodeError):
                                continue
                            self.out_queue.put(("trace_line", trace, time.time()))
            except OSError as exc:
                self.out_queue.put(("trace_error", f"TRACE FILE: {exc}", time.time()))

            time.sleep(POLL_TRACE_SEC)


class App(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("BIT / BRUTUS — Machine visuelle interactive v0.3 LIVE TRACE")
        self.geometry("1660x960")
        self.minsize(1250, 780)
        self.configure(bg=BG)

        self.q: queue.Queue = queue.Queue()
        self.poller = DataPoller(self.q)
        self.trace_poller = TracePoller(self.q)

        self.canvas = tk.Canvas(self, bg=BG, highlightthickness=0)
        self.canvas.pack(side="left", fill="both", expand=True)

        self.side = tk.Frame(self, bg=DARK_PANEL, width=400)
        self.side.pack(side="right", fill="y")
        self.side.pack_propagate(False)

        self.status: dict[str, Any] = {}
        self.outbox: dict[str, Any] = {}
        self.prev: Optional[dict[str, int]] = None
        self.last_status_ts = 0.0
        self.tps = 0.0
        self.last_error = ""
        self.event_seq = 0
        self.events: list[LiveEvent] = []
        self.particles: list[Particle] = []
        self.seen_trace_ids: set[str] = set()
        self.seen_proof_ids: set[str] = set()
        self.trace_baselined = False
        self.proof_baselined = False
        self.live_trace_count = 0
        self.live_proof_count = 0
        self.event_list_dirty = False
        self.latest_trace_display = "—"
        self.trace_file_mtime = 0.0
        self.trace_source_path = ""

        self.gear_angles = {
            "input": 0.0,
            "filter": 0.0,
            "proof": 0.0,
            "output": 0.0,
            "return": 0.0,
        }
        self.motion_enabled = True
        self.visual_speed = tk.DoubleVar(value=1.0)
        self.show_labels = tk.BooleanVar(value=True)
        self.follow_formula = tk.BooleanVar(value=True)
        self.selected_formula_index: Optional[int] = None
        self.selected_module = "input"
        self.selected_event_seq: Optional[int] = None
        self.last_frame = time.perf_counter()

        self.live_var = tk.StringVar(value="Connexion…")
        self.inspect_var = tk.StringVar(value="Clique un engrenage, une formule ou un événement.")
        self.event_var = tk.StringVar(value="Aucun événement.")
        self.formula_detail_var = tk.StringVar(value="Aucune formule sélectionnée.")

        self._build_sidebar()
        self._bind_controls()
        self.poller.start()
        self.trace_poller.start()

        self.after(80, self._drain)
        self.after(FRAME_MS, self._animate)
        self.protocol("WM_DELETE_WINDOW", self._close)

    # ---------- UI ----------

    def _build_sidebar(self) -> None:
        tk.Label(
            self.side, text="BIT / BRUTUS\nMACHINE INTERACTIVE",
            bg=DARK_PANEL, fg=WHITE,
            font=("Consolas", 16, "bold"), justify="left",
        ).pack(anchor="w", padx=18, pady=(16, 8))

        tk.Label(
            self.side, textvariable=self.live_var,
            bg=DARK_CARD, fg="#a2e6b3",
            font=("Consolas", 9), justify="left",
            wraplength=360, padx=10, pady=10,
        ).pack(fill="x", padx=18, pady=(0, 10))

        controls = tk.Frame(self.side, bg=DARK_PANEL)
        controls.pack(fill="x", padx=18)

        self.pause_btn = tk.Button(
            controls, text="PAUSE", command=self._toggle_motion,
            bg="#37322c", fg=WHITE, relief="flat",
            activebackground="#4a443d", activeforeground=WHITE,
            font=("Consolas", 9, "bold"),
        )
        self.pause_btn.pack(side="left", fill="x", expand=True, padx=(0, 4))

        tk.Button(
            controls, text="IMPULSION", command=self._manual_pulse,
            bg="#37322c", fg=WHITE, relief="flat",
            activebackground="#4a443d", activeforeground=WHITE,
            font=("Consolas", 9, "bold"),
        ).pack(side="left", fill="x", expand=True, padx=4)

        tk.Button(
            controls, text="EFFACER", command=self._clear_visuals,
            bg="#37322c", fg=WHITE, relief="flat",
            activebackground="#4a443d", activeforeground=WHITE,
            font=("Consolas", 9, "bold"),
        ).pack(side="left", fill="x", expand=True, padx=(4, 0))

        tk.Label(
            self.side, text="VITESSE VISUELLE (n'affecte pas le moteur)",
            bg=DARK_PANEL, fg=YELLOW, font=("Consolas", 8, "bold"),
        ).pack(anchor="w", padx=18, pady=(10, 0))

        tk.Scale(
            self.side, variable=self.visual_speed, from_=0.25, to=2.5,
            resolution=0.05, orient="horizontal", showvalue=True,
            bg=DARK_PANEL, fg=WHITE, troughcolor="#3c3832",
            highlightthickness=0, activebackground=ORANGE,
        ).pack(fill="x", padx=18)

        opts = tk.Frame(self.side, bg=DARK_PANEL)
        opts.pack(fill="x", padx=18)
        tk.Checkbutton(
            opts, text="Étiquettes", variable=self.show_labels,
            bg=DARK_PANEL, fg=WHITE, selectcolor=DARK_CARD,
            activebackground=DARK_PANEL, activeforeground=WHITE,
            font=("Consolas", 8),
        ).pack(side="left")
        tk.Checkbutton(
            opts, text="Suivre nouvelle formule", variable=self.follow_formula,
            bg=DARK_PANEL, fg=WHITE, selectcolor=DARK_CARD,
            activebackground=DARK_PANEL, activeforeground=WHITE,
            font=("Consolas", 8),
        ).pack(side="left", padx=10)

        self.notebook = tk.Frame(self.side, bg=DARK_PANEL)
        self.notebook.pack(fill="both", expand=True, padx=18, pady=(8, 14))

        tk.Label(
            self.notebook, text="INSPECTION",
            bg=DARK_PANEL, fg=ORANGE, font=("Consolas", 9, "bold"),
        ).pack(anchor="w")
        tk.Label(
            self.notebook, textvariable=self.inspect_var,
            bg=DARK_CARD, fg=WHITE, font=("Consolas", 9),
            justify="left", wraplength=360, padx=10, pady=8,
        ).pack(fill="x", pady=(2, 8))

        tk.Label(
            self.notebook, text="FORMULES RÉELLES — clique pour épingler",
            bg=DARK_PANEL, fg=BLUE, font=("Consolas", 9, "bold"),
        ).pack(anchor="w")

        formula_frame = tk.Frame(self.notebook, bg=DARK_PANEL)
        formula_frame.pack(fill="both", expand=True, pady=(2, 6))

        self.formula_list = tk.Listbox(
            formula_frame, bg=DARK_CARD, fg=WHITE,
            selectbackground=BLUE, selectforeground=WHITE,
            font=("Consolas", 8), borderwidth=0,
            activestyle="none", height=8,
        )
        self.formula_list.pack(side="left", fill="both", expand=True)
        sb1 = tk.Scrollbar(formula_frame, command=self.formula_list.yview)
        sb1.pack(side="right", fill="y")
        self.formula_list.config(yscrollcommand=sb1.set)
        self.formula_list.bind("<<ListboxSelect>>", self._formula_selected)

        tk.Label(
            self.notebook, textvariable=self.formula_detail_var,
            bg="#211f1c", fg="#e8ddc8", font=("Consolas", 8),
            justify="left", wraplength=360, padx=8, pady=7,
        ).pack(fill="x", pady=(0, 8))

        tk.Label(
            self.notebook, text="TRACES / PREUVES EN DIRECT — données réelles",
            bg=DARK_PANEL, fg=GREEN, font=("Consolas", 9, "bold"),
        ).pack(anchor="w")

        event_frame = tk.Frame(self.notebook, bg=DARK_PANEL)
        event_frame.pack(fill="both", expand=True, pady=(2, 6))

        self.event_list = tk.Listbox(
            event_frame, bg=DARK_CARD, fg=WHITE,
            selectbackground=GREEN, selectforeground=INK,
            font=("Consolas", 8), borderwidth=0,
            activestyle="none", height=7,
        )
        self.event_list.pack(side="left", fill="both", expand=True)
        sb2 = tk.Scrollbar(event_frame, command=self.event_list.yview)
        sb2.pack(side="right", fill="y")
        self.event_list.config(yscrollcommand=sb2.set)
        self.event_list.bind("<<ListboxSelect>>", self._event_selected)

        tk.Label(
            self.notebook, textvariable=self.event_var,
            bg="#211f1c", fg="#e8ddc8", font=("Consolas", 8),
            justify="left", wraplength=360, padx=8, pady=7,
        ).pack(fill="x")

    def _bind_controls(self) -> None:
        # Ne jamais nommer cette méthode _bind: Tkinter utilise déjà Misc._bind().
        self.bind("<space>", lambda e: self._toggle_motion())
        self.bind("<Escape>", lambda e: self._close())
        self.canvas.bind("<Button-1>", self._canvas_click)
        self.canvas.bind("<Motion>", self._canvas_motion)

    # ---------- data ----------

    def _snapshot(self, s: dict[str, Any]) -> dict[str, int]:
        sym = s.get("brutaux_symbolic") or {}
        zel = s.get("zel_bridge") or {}
        return {
            "processed": int(s.get("processed_packets") or 0),
            "round": int(s.get("round_index") or 0),
            "canonical": int(sym.get("canonical_formulas") or 0),
            "authenticated": int(sym.get("authenticated_formulas") or 0),
            "auth_rel": int(sym.get("authenticated_relations") or 0),
            "testing": int(sym.get("testing_formulas") or 0),
            "candidate": int(sym.get("candidate_formulas") or 0),
            "rejected": int(sym.get("rejected_formulas") or 0),
            "proofs": int(sym.get("proofs_total") or 0),
            "invalid": int(sym.get("proofs_invalid") or 0),
            "zel": int(zel.get("registered_formulas") or 0),
        }

    def _on_status(self, s: dict[str, Any], ts: float) -> None:
        cur = self._snapshot(s)

        if self.prev is not None:
            dt = max(0.05, ts - self.last_status_ts)
            dp = max(0, cur["processed"] - self.prev["processed"])
            inst = dp / dt
            self.tps = inst if self.tps == 0 else (0.75 * self.tps + 0.25 * inst)

            if dp and not self.trace_baselined:
                self._emit("PACKETS", f"+{dp} paquets", f"processed_packets +{dp}", ORANGE)

            for key, kind, color in [
                ("canonical", "CANONICAL", ORANGE),
                ("authenticated", "AUTHENTICATED", GREEN),
                ("testing", "TESTING", YELLOW),
                ("rejected", "REJECTED", RED),
                ("zel", "ZEL_NEW", BLUE),
                ("invalid", "INVALID_PROOF", RED),
            ]:
                delta = cur[key] - self.prev[key]
                if delta > 0:
                    self._emit(kind, f"{key} +{delta}", f"{key}: {self.prev[key]} → {cur[key]}", color)

            proof_delta = cur["proofs"] - self.prev["proofs"]
            if proof_delta > 0 and not self.proof_baselined:
                # Log de preuve agrégé, sans spammer chaque seconde.
                if proof_delta >= 1000 or cur["round"] != self.prev["round"]:
                    self._emit(
                        "PROOFS", f"+{proof_delta} preuves",
                        f"proofs_total: {self.prev['proofs']} → {cur['proofs']}",
                        PURPLE
                    )

        self.prev = cur
        self.status = s
        self.last_status_ts = ts
        self.last_error = ""
        self._refresh_live_text()

    def _on_traces(self, payload: dict[str, Any], ts: float) -> None:
        traces = payload.get("traces") if isinstance(payload, dict) else None
        if not isinstance(traces, list):
            return
        current_ids = [str(t.get("TRACE", "")) for t in traces if isinstance(t, dict) and t.get("TRACE")]
        if not self.trace_baselined:
            self.seen_trace_ids.update(current_ids)
            self.trace_baselined = True
            if traces:
                latest = traces[-1]
                self.inspect_var.set(
                    "LIVE TRACE branché sur /api/seven-traces\n"
                    f"Dernière trace de référence : {latest.get('INPUT','?')} → {latest.get('OUTPUT','?')} "
                    f"via {latest.get('FORMULE','?')}\n"
                    "Les prochaines traces nouvelles seront animées une par une."
                )
            return

        for trace in traces:
            if not isinstance(trace, dict):
                continue
            trace_id = str(trace.get("TRACE", ""))
            if not trace_id or trace_id in self.seen_trace_ids:
                continue
            self.seen_trace_ids.add(trace_id)
            self.live_trace_count += 1
            inp = str(trace.get("INPUT", "?"))
            out = str(trace.get("OUTPUT", "?"))
            formula = str(trace.get("FORMULE", "?"))
            parent = str(trace.get("PARENT", "—"))
            branch = str(trace.get("BRANCHE", "—"))
            rnd = trace.get("RONDE", "—")
            short_in = inp if len(inp) <= 14 else inp[:6] + "…" + inp[-6:]
            short_out = out if len(out) <= 14 else out[:6] + "…" + out[-6:]
            label = f"{short_in}→{short_out} {formula}"
            self.latest_trace_display = f"{inp} → {out}   [{formula}]"
            detail = (
                f"TRACE EXACTE\nINPUT = {inp}\nOUTPUT = {out}\nFORMULE = {formula}\n"
                f"PARENT = {parent}\nBRANCHE = {branch}\nRONDE = {rnd}\nTRACE = {trace_id}"
            )
            self._emit("TRACE", label, detail, ORANGE)

        # garde bornée : le serveur expose 20 traces récentes, 500 IDs suffisent largement
        if len(self.seen_trace_ids) > 500:
            keep = set(current_ids)
            for ev in self.events[-120:]:
                if ev.kind == "TRACE" and "TRACE = " in ev.detail:
                    keep.add(ev.detail.rsplit("TRACE = ", 1)[-1])
            self.seen_trace_ids = keep

    def _on_proofs(self, payload: dict[str, Any], ts: float) -> None:
        proofs = payload.get("proofs") if isinstance(payload, dict) else None
        if not isinstance(proofs, list):
            return
        current_ids = [str(p.get("proof_id", "")) for p in proofs if isinstance(p, dict) and p.get("proof_id")]
        if not self.proof_baselined:
            self.seen_proof_ids.update(current_ids)
            self.proof_baselined = True
            return

        for proof in proofs:
            if not isinstance(proof, dict):
                continue
            proof_id = str(proof.get("proof_id", ""))
            if not proof_id or proof_id in self.seen_proof_ids:
                continue
            self.seen_proof_ids.add(proof_id)
            self.live_proof_count += 1
            valid = bool(proof.get("valid"))
            trace_id = str(proof.get("trace_id", "—"))
            expected = str(proof.get("expected_output", "?"))
            reason = str(proof.get("reason", "—"))
            mark = "✓" if valid else "✕"
            label = f"{mark} PROOF {expected}"
            detail = (
                f"PREUVE EXACTE\nvalid = {valid}\nreason = {reason}\n"
                f"expected_output = {expected}\ntrace_id = {trace_id}\nproof_id = {proof_id}"
            )
            self._emit("PROOF" if valid else "INVALID_PROOF", label, detail, GREEN if valid else RED)

        if len(self.seen_proof_ids) > 500:
            self.seen_proof_ids = set(current_ids)

    def _emit(self, kind: str, label: str, detail: str, color: str) -> None:
        self.event_seq += 1
        ev = LiveEvent(self.event_seq, kind, label, detail, color)
        self.events.append(ev)
        self.events = self.events[-80:]
        self._spawn_for_event(ev)
        self.event_list_dirty = True

    def _spawn_for_event(self, ev: LiveEvent) -> None:
        main = [(145, 250), (355, 250), (610, 250), (875, 250), (1110, 250)]
        testing = [(610, 250), (760, 250), (760, 560), (500, 560), (500, 250), (610, 250)]
        rejected = [(875, 250), (1010, 430), (1110, 650)]
        zel = [(145, 360), (355, 360), (610, 250)]
        proof = [(610, 250), (875, 250)]

        if ev.kind == "TESTING":
            path, speeds = testing, [150, 95, 80, 65, 55]
        elif ev.kind in ("REJECTED", "INVALID_PROOF"):
            path, speeds = rejected, [120, 80]
        elif ev.kind == "ZEL_NEW":
            path, speeds = zel, [170, 120]
        elif ev.kind in ("AUTHENTICATED", "PROOFS", "PROOF"):
            path, speeds = proof, [95]
        else:
            path, speeds = main, [260, 190, 125, 70]

        count = 1
        if ev.kind == "PACKETS":
            try:
                n = int(ev.label.split("+", 1)[1].split()[0])
                count = min(8, max(1, int(math.log2(n + 1))))
            except Exception:
                count = 2

        if ev.kind == "TRACE" and len(self.particles) >= 80:
            # La donnée exacte reste dans le journal; on borne seulement le dessin.
            return

        for i in range(count):
            self.particles.append(
                Particle(
                    path=path, speeds=speeds, color=ev.color,
                    label=ev.label, event_seq=ev.seq,
                    radius=5.5 if ev.kind == "TRACE" else (7 if ev.kind != "PACKETS" else 4.5),
                    delay=i * 0.08,
                )
            )

    def _drain(self) -> None:
        changed = False
        while True:
            try:
                kind, payload, ts = self.q.get_nowait()
            except queue.Empty:
                break

            if kind == "status":
                self._on_status(payload, ts)
                changed = True
            elif kind == "outbox":
                self.outbox = payload
                self._refresh_formula_list()
                changed = True
            elif kind == "trace_source":
                self.trace_baselined = True
                self.trace_source_path = str(payload.get("path", ""))
                self.trace_file_mtime = float(payload.get("last_write_epoch", 0.0) or 0.0)
                last_trace = payload.get("last_trace")
                if isinstance(last_trace, dict):
                    inp = str(last_trace.get("INPUT", "?"))
                    out = str(last_trace.get("OUTPUT", "?"))
                    formula = str(last_trace.get("FORMULE", "?"))
                    self.latest_trace_display = f"{inp} → {out}   [{formula}]"
                self.inspect_var.set(
                    "BRANCHEMENT DIRECT ACTIF\n"
                    f"source = {payload.get('path','?')}\n"
                    f"baseline EOF = {payload.get('baseline_bytes',0)} octets\n"
                    "Chaque nouvelle ligne JSONL devient une trace animée."
                )
                changed = True
            elif kind == "trace_line":
                self.trace_file_mtime = ts
                self._on_traces({"traces": [payload]}, ts)
                changed = True
            elif kind == "traces":
                self._on_traces(payload, ts)
                changed = True
            elif kind == "proofs":
                self._on_proofs(payload, ts)
                changed = True
            elif kind in ("trace_error", "proof_error"):
                # Le tail fichier est réessayé automatiquement.
                pass
            else:
                self.last_error = str(payload)
                changed = True

        if changed:
            self._refresh_live_text()
        if self.event_list_dirty:
            self._refresh_event_list()
            self.event_list_dirty = False
        self.after(80, self._drain)

    # ---------- list interaction ----------

    def _formula_rows(self) -> list[dict[str, Any]]:
        f = self.outbox.get("formulas") if isinstance(self.outbox, dict) else None
        return f if isinstance(f, list) else []

    def _formula_label(self, f: dict[str, Any]) -> str:
        auth = f.get("authentication") if isinstance(f.get("authentication"), dict) else {}
        status = auth.get("status") or f.get("status") or "—"
        expr = (
            f.get("canonical_expression")
            or f.get("relation")
            or f.get("formula")
            or f.get("formula_id")
            or "?"
        )
        return f"[{status}] {str(expr)[:54]}"

    def _refresh_formula_list(self) -> None:
        rows = self._formula_rows()
        previous = self.selected_formula_index
        self.formula_list.delete(0, tk.END)
        for f in rows:
            if isinstance(f, dict):
                self.formula_list.insert(tk.END, self._formula_label(f))

        if rows:
            idx = previous if previous is not None and previous < len(rows) else None
            if self.follow_formula.get() and idx is None:
                idx = len(rows) - 1
            if idx is not None:
                self.formula_list.selection_set(idx)
                self.formula_list.see(idx)
                self.selected_formula_index = idx
                self._show_formula(idx)

    def _formula_selected(self, _evt=None) -> None:
        sel = self.formula_list.curselection()
        if not sel:
            return
        self.selected_formula_index = int(sel[0])
        self._show_formula(self.selected_formula_index)

    def _show_formula(self, idx: int) -> None:
        rows = self._formula_rows()
        if not (0 <= idx < len(rows)):
            return
        f = rows[idx]
        if not isinstance(f, dict):
            return
        auth = f.get("authentication") if isinstance(f.get("authentication"), dict) else {}
        expr = (
            f.get("canonical_expression")
            or f.get("relation")
            or f.get("formula")
            or f.get("formula_id")
            or "?"
        )
        lines = [
            str(expr),
            "",
            f"status = {auth.get('status') or f.get('status') or '—'}",
        ]
        for k in ("supports", "formula_hash", "source_formula_id", "proof_hash"):
            if k in f:
                lines.append(f"{k} = {str(f.get(k))[:100]}")
        for k in ("countertests_run", "countertests_passed", "reason", "counterexample"):
            if k in auth and auth.get(k) not in (None, ""):
                lines.append(f"{k} = {str(auth.get(k))[:110]}")
        self.formula_detail_var.set("\n".join(lines))
        self.inspect_var.set("FORMULE ÉPINGLÉE\n" + "\n".join(lines[:5]))

    def _refresh_event_list(self) -> None:
        self.event_list.delete(0, tk.END)
        for ev in self.events[-30:][::-1]:
            t = time.strftime("%H:%M:%S", time.localtime(ev.ts))
            self.event_list.insert(tk.END, f"{t}  #{ev.seq:03d}  {ev.kind:<13} {ev.label}")

    def _event_selected(self, _evt=None) -> None:
        sel = self.event_list.curselection()
        if not sel:
            return
        newest_first = self.events[-30:][::-1]
        idx = int(sel[0])
        if idx >= len(newest_first):
            return
        ev = newest_first[idx]
        self.selected_event_seq = ev.seq
        self.event_var.set(
            f"EVENT #{ev.seq}\n"
            f"type = {ev.kind}\n"
            f"{ev.detail}\n"
            f"time = {time.strftime('%H:%M:%S', time.localtime(ev.ts))}"
        )
        # Rejoue visuellement le même événement sans modifier les données.
        self._spawn_for_event(ev)

    # ---------- canvas interaction ----------

    def _canvas_click(self, e) -> None:
        modules = {
            "input": (145, 250, 78),
            "filter": (355, 250, 92),
            "proof": (610, 250, 102),
            "output": (875, 250, 86),
            "return": (500, 560, 72),
        }
        for name, (cx, cy, r) in modules.items():
            if math.hypot(e.x - cx, e.y - cy) <= r:
                self.selected_module = name
                self._inspect_module(name)
                return

        # clic proche d'une particule = affiche son événement source
        best = None
        best_d = 1e9
        for p in self.particles:
            x, y = p.position()
            d = math.hypot(e.x - x, e.y - y)
            if d < best_d:
                best, best_d = p, d
        if best and best_d < 18:
            ev = next((x for x in self.events if x.seq == best.event_seq), None)
            if ev:
                self.event_var.set(f"PARTICULE → EVENT #{ev.seq}\n{ev.kind}\n{ev.detail}")

    def _canvas_motion(self, e) -> None:
        # Le curseur change au-dessus des engrenages/particules.
        hit = False
        for cx, cy, r in [(145,250,78),(355,250,92),(610,250,102),(875,250,86),(500,560,72)]:
            if math.hypot(e.x-cx, e.y-cy) <= r:
                hit = True
                break
        if not hit:
            for p in self.particles:
                x, y = p.position()
                if math.hypot(e.x-x, e.y-y) < 15:
                    hit = True
                    break
        self.canvas.config(cursor="hand2" if hit else "")

    def _inspect_module(self, name: str) -> None:
        s = self.status
        sym = s.get("brutaux_symbolic") or {}
        zel = s.get("zel_bridge") or {}
        detail = {
            "input": (
                "ENGRENAGE ENTRÉE\n"
                f"processed_packets = {s.get('processed_packets', 0)}\n"
                f"round = {s.get('round_index', 0)}\n"
                f"débit ≈ {self.tps:.1f}/s\n\n"
                "Rotation liée au débit mesuré."
            ),
            "filter": (
                "ENGRENAGE FILTRE\n"
                f"canonical = {sym.get('canonical_formulas', 0)}\n"
                f"testing = {sym.get('testing_formulas', 0)}\n"
                f"candidate = {sym.get('candidate_formulas', 0)}\n\n"
                "Les deltas réels créent les impulsions visibles."
            ),
            "proof": (
                "ENGRENAGE PREUVE\n"
                f"authenticated = {sym.get('authenticated_formulas', 0)}\n"
                f"relations = {sym.get('authenticated_relations', 0)}\n"
                f"proofs = {sym.get('proofs_total', 0)}\n"
                f"invalid = {sym.get('proofs_invalid', 0)}"
            ),
            "output": (
                "ENGRENAGE SORTIE\n"
                f"rejected = {sym.get('rejected_formulas', 0)}\n"
                f"ZEL registered = {zel.get('registered_formulas', 0)}\n"
                f"ZEL status = {zel.get('last_status', '—')}"
            ),
            "return": (
                "ENGRENAGE RETOUR\n"
                "Cette boucle s'anime quand TESTING augmente.\n\n"
                "Elle montre la rétroaction logique; elle ne prétend pas être "
                "la trajectoire interne exacte d'un objet tant que l'API ne "
                "fournit pas le flux item-par-item."
            ),
        }[name]
        self.inspect_var.set(detail)

    # ---------- animation ----------

    def _toggle_motion(self) -> None:
        self.motion_enabled = not self.motion_enabled
        self.pause_btn.config(text="PAUSE" if self.motion_enabled else "REPRENDRE")

    def _manual_pulse(self) -> None:
        self.event_seq += 1
        ev = LiveEvent(
            self.event_seq, "VISUAL_TEST", "impulsion manuelle",
            "Test visuel local — ne modifie aucun compteur.", PURPLE
        )
        self.events.append(ev)
        self.events = self.events[-80:]
        self._spawn_for_event(ev)
        self._refresh_event_list()

    def _clear_visuals(self) -> None:
        self.particles.clear()
        self.selected_event_seq = None
        self.event_var.set("Particules effacées. Les données réelles continuent d'être lues.")

    def _animate(self) -> None:
        now = time.perf_counter()
        dt = min(0.12, now - self.last_frame)
        self.last_frame = now
        speed = float(self.visual_speed.get())

        if self.motion_enabled:
            load = 0.30 + min(1.80, self.tps / 100.0)
            self.gear_angles["input"] = (self.gear_angles["input"] + 8.0 * load * speed) % 360
            self.gear_angles["filter"] = (self.gear_angles["filter"] - 5.0 * load * speed) % 360
            self.gear_angles["proof"] = (self.gear_angles["proof"] + 3.1 * load * speed) % 360
            self.gear_angles["output"] = (self.gear_angles["output"] - 1.9 * load * speed) % 360
            self.gear_angles["return"] = (self.gear_angles["return"] + 2.4 * load * speed) % 360

            for p in self.particles:
                p.advance(dt, speed)
            self.particles = [p for p in self.particles if not p.done]

        self._draw()
        self.after(FRAME_MS, self._animate)

    def _draw(self) -> None:
        c = self.canvas
        c.delete("all")
        w = max(900, c.winfo_width())
        h = max(720, c.winfo_height())

        c.create_rectangle(16, 16, w - 16, h - 16, fill=PAPER, outline=INK, width=3)
        c.create_text(
            40, 42, anchor="nw",
            text="BIT — MACHINE VISUELLE / BROTOCULATEUR",
            fill=INK, font=("Consolas", 19, "bold")
        )
        c.create_text(
            40, 73, anchor="nw",
            text="Clique les engrenages · clique les particules · clique les formules à droite.",
            fill=MUTED, font=("Consolas", 9)
        )
        c.create_text(
            40, 101, anchor="nw",
            text="TRACE LIVE : " + self.latest_trace_display[:135],
            fill=ORANGE, font=("Consolas", 10, "bold")
        )
        age = (time.time() - self.trace_file_mtime) if self.trace_file_mtime else None
        if age is None:
            flow_text, flow_color = "FLUX : EN ATTENTE", MUTED
        elif age <= 3:
            flow_text, flow_color = "FLUX : ACTIF", GREEN
        else:
            mins = age / 60.0
            flow_text = f"FLUX : AUCUNE NOUVELLE TRACE DEPUIS {mins:.1f} min"
            flow_color = RED
        c.create_rectangle(w-410, 40, w-45, 92, fill=PAPER_2, outline=flow_color, width=3)
        c.create_text(
            w-392, 56, anchor="nw", text=flow_text,
            fill=flow_color, font=("Consolas", 9, "bold")
        )

        # pipes
        self._pipe((145,250),(1110,250),BLUE,12)
        self._pipe((610,250),(760,250),GREEN,8)
        self._pipe((760,250),(760,560),GREEN,8)
        self._pipe((760,560),(500,560),GREEN,8)
        self._pipe((500,560),(500,250),GREEN,8)
        self._pipe((875,250),(1010,430),RED,7)
        self._pipe((1010,430),(1110,650),RED,7)
        self._pipe((145,360),(355,360),BLUE,6)
        self._pipe((355,360),(610,250),BLUE,6)

        # gears
        self._gear("input",145,250,62,18,BLUE,"ENTRÉE")
        self._gear("filter",355,250,78,22,ORANGE,"FILTRE")
        self._gear("proof",610,250,88,24,GREEN,"PREUVE")
        self._gear("output",875,250,72,20,BLUE,"SORTIE")
        self._gear("return",500,560,58,16,GREEN,"RETOUR")

        # semantic slow-down labels
        for x, label in [(220,"1.00×"),(455,"0.70×"),(690,"0.40×"),(955,"0.20×")]:
            c.create_text(x,205,text=label,fill=INK,font=("Consolas",9,"bold"))

        sym = self.status.get("brutaux_symbolic") or {}
        zel = self.status.get("zel_bridge") or {}

        self._card(60,390,245,125,"MESURE — ENTRÉE",
                   f"processed = {self.status.get('processed_packets',0)}\n"
                   f"round = {self.status.get('round_index',0)}\n"
                   f"throughput ≈ {self.tps:.1f}/s")

        self._card(325,390,245,125,"FORMULES",
                   f"canonical = {sym.get('canonical_formulas',0)}\n"
                   f"testing = {sym.get('testing_formulas',0)}\n"
                   f"candidate = {sym.get('candidate_formulas',0)}")

        self._card(590,390,245,125,"AUTHENTIFICATION",
                   f"authenticated = {sym.get('authenticated_formulas',0)}\n"
                   f"relations = {sym.get('authenticated_relations',0)}\n"
                   f"rejected = {sym.get('rejected_formulas',0)}")

        self._card(855,390,245,125,"PREUVES / ZEL",
                   f"proofs = {sym.get('proofs_total',0)}\n"
                   f"invalid = {sym.get('proofs_invalid',0)}\n"
                   f"ZEL = {zel.get('registered_formulas',0)}")

        c.create_text(635,590,text="TESTING / rétroaction",fill=GREEN,font=("Consolas",9,"bold"))
        c.create_text(1030,535,text="REJECTED / fail-closed",fill=RED,font=("Consolas",9,"bold"),angle=62)
        c.create_text(240,340,text="ZEL / nouvelle entrée",fill=BLUE,font=("Consolas",9,"bold"))

        # particles
        for p in self.particles:
            x, y = p.position()
            outline = YELLOW if self.selected_event_seq == p.event_seq else WHITE
            c.create_oval(
                x-p.radius,y-p.radius,x+p.radius,y+p.radius,
                fill=p.color,outline=outline,width=2
            )
            if self.show_labels.get() and p.radius >= 7:
                c.create_text(
                    x+10,y-13,anchor="w",text=f"#{p.event_seq} {p.label}",
                    fill=INK,font=("Consolas",7,"bold")
                )

        c.create_text(
            45,h-66,anchor="nw",
            text=(
                "TRACES: INPUT→OUTPUT exacts de /api/seven-traces  |  "
                "PREUVES: /api/proofs  |  lecture seule"
            ),
            fill=MUTED,font=("Consolas",8)
        )
        if self.last_error:
            c.create_text(
                45,h-42,anchor="nw",text=self.last_error[:150],
                fill=RED,font=("Consolas",8,"bold")
            )

    def _pipe(self, a, b, color, width) -> None:
        self.canvas.create_line(*a,*b,fill=color,width=width,capstyle="round")
        self.canvas.create_line(*a,*b,fill=WHITE,width=max(1,width//5),dash=(10,10))

    def _gear(self,name,cx,cy,radius,teeth,color,label) -> None:
        angle = math.radians(self.gear_angles[name])
        selected = self.selected_module == name
        tooth_depth = 12
        half = math.pi/teeth*0.48

        for i in range(teeth):
            a = angle + 2*math.pi*i/teeth
            pts=[]
            for rr,aa in [
                (radius,a-half),
                (radius+tooth_depth,a-half*0.7),
                (radius+tooth_depth,a+half*0.7),
                (radius,a+half)
            ]:
                pts.extend([cx+rr*math.cos(aa),cy+rr*math.sin(aa)])
            self.canvas.create_polygon(pts,fill=color,outline=INK,width=1)

        self.canvas.create_oval(
            cx-radius,cy-radius,cx+radius,cy+radius,
            fill=PAPER_2,outline=YELLOW if selected else INK,
            width=5 if selected else 3
        )
        self.canvas.create_oval(cx-20,cy-20,cx+20,cy+20,fill=color,outline=INK,width=2)

        for off in (0,2*math.pi/3,4*math.pi/3):
            a=angle+off
            self.canvas.create_line(
                cx,cy,cx+(radius-10)*math.cos(a),cy+(radius-10)*math.sin(a),
                fill=color,width=6,capstyle="round"
            )

        self.canvas.create_text(
            cx,cy+radius+28,text=label,fill=INK,font=("Consolas",9,"bold")
        )

    def _card(self,x,y,w,h,title,body) -> None:
        self.canvas.create_rectangle(x,y,x+w,y+h,fill=PAPER_2,outline=INK,width=2)
        self.canvas.create_rectangle(x+14,y-6,x+85,y+7,fill="#cbb88f",outline="")
        self.canvas.create_text(x+14,y+14,anchor="nw",text=title,fill=ORANGE,font=("Consolas",9,"bold"))
        self.canvas.create_text(x+14,y+41,anchor="nw",text=body,fill=INK,font=("Consolas",9))

    def _refresh_live_text(self) -> None:
        if not self.status:
            self.live_var.set("En attente de l'API locale…\n" + self.last_error)
            return
        sym = self.status.get("brutaux_symbolic") or {}
        zel = self.status.get("zel_bridge") or {}
        self.live_var.set(
            "\n".join([
                f"STATE          {self.status.get('state','—')}",
                f"PROCESSED      {self.status.get('processed_packets',0)}",
                f"ROUND          {self.status.get('round_index',0)}",
                f"THROUGHPUT     {self.tps:8.1f}/s",
                "",
                f"CANONICAL      {sym.get('canonical_formulas',0)}",
                f"AUTHENTICATED  {sym.get('authenticated_formulas',0)}",
                f"TESTING        {sym.get('testing_formulas',0)}",
                f"REJECTED       {sym.get('rejected_formulas',0)}",
                f"PROOFS         {sym.get('proofs_total',0)}",
                f"INVALID        {sym.get('proofs_invalid',0)}",
                f"ZEL REGISTERED {zel.get('registered_formulas',0)}",
                f"LIVE TRACES    {self.live_trace_count}",
                f"LIVE PROOFS    {self.live_proof_count}",
            ])
        )

    def _close(self) -> None:
        self.poller.running = False
        self.trace_poller.running = False
        self.destroy()


if __name__ == "__main__":
    App().mainloop()
