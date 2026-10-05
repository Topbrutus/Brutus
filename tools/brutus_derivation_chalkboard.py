import tkinter as tk
from tkinter import ttk
from decimal import Decimal, getcontext, InvalidOperation
import random
from PIL import Image, ImageTk, ImageDraw, ImageFilter

# ------------------------------------------------------------
# Brutus Dérivation — Chalkboard Edition
# Petit outil local en Python / Tkinter
# ------------------------------------------------------------

BG = "#163b2b"          # tableau vert foncé
PANEL = "#1d4a36"
CHALK = "#f4f3ea"       # craie blanche
CHALK_SOFT = "#d9efe1"  # craie douce
ACCENT = "#f3d36b"      # craie jaune
RED = "#ffb3b3"         # craie rouge pâle

DEFAULT_F0 = "240.1"
DEFAULT_TAU = "1e-15"
DEFAULT_N = "2401"
DEFAULT_PREC = "50"

class BrutusChalkboardApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Brutus Dérivation — Chalkboard Edition")
        self.root.configure(bg=BG)
        self.root.geometry("1280x860")
        self.root.minsize(1100, 760)

        style = ttk.Style()
        try:
            style.theme_use("clam")
        except Exception:
            pass

        style.configure("TLabel", background=BG, foreground=CHALK, font=("Bahnschrift Condensed", 6))
        style.configure("Title.TLabel", background=BG, foreground=ACCENT, font=("Bahnschrift Condensed", 9, "bold"))
        style.configure("Sub.TLabel", background=BG, foreground=CHALK_SOFT, font=("Bahnschrift Condensed", 5))
        style.configure("Board.TFrame", background=BG)
        style.configure("Panel.TFrame", background=PANEL)
        style.configure("TButton", font=("Bahnschrift Condensed", 6, "bold"))
        style.map("TButton", background=[("active", "#ece7d1")])

        self.f0_var = tk.StringVar(value=DEFAULT_F0)
        self.tau_var = tk.StringVar(value=DEFAULT_TAU)
        self.n_var = tk.StringVar(value=DEFAULT_N)
        self.prec_var = tk.StringVar(value=DEFAULT_PREC)

        self.result = {
            "ok": True,
            "message": "",
            "f0": Decimal(DEFAULT_F0),
            "tau": Decimal(DEFAULT_TAU),
            "N": Decimal(DEFAULT_N),
            "f": Decimal(DEFAULT_F0),
            "delta": Decimal("0"),
            "Nf": Decimal(DEFAULT_F0) * Decimal(DEFAULT_N),
            "Ndelta": Decimal("0"),
            "denom": Decimal("1"),
        }

        self._texture_size = None
        self.texture_bg = None
        self.texture_fg = None
        self.build_ui()
        self.recalculate()

    def build_ui(self):
        top = ttk.Frame(self.root, style="Board.TFrame")
        top.pack(fill="both", expand=True, padx=12, pady=12)

        left = ttk.Frame(top, style="Panel.TFrame")
        left.pack(side="left", fill="y", padx=(0, 12))

        right = ttk.Frame(top, style="Board.TFrame")
        right.pack(side="right", fill="both", expand=True)

        # -------------------------
        # Left control panel
        # -------------------------
        title = ttk.Label(left, text="Brutus Dérivation", style="Title.TLabel")
        title.pack(anchor="w", padx=14, pady=(14, 4))

        subtitle = ttk.Label(
            left,
            text="Forme générale :  1/f₀ − 1/f = τ\n"
                 "Donc :             f = f₀ / (1 − f₀τ)\n"
                 "Puis :             Δf = f − f₀\n"
                 "Et à l’échelle N : Nf  |  NΔf",
            style="Sub.TLabel"
        )
        subtitle.pack(anchor="w", padx=14, pady=(0, 12))

        form = ttk.Frame(left, style="Panel.TFrame")
        form.pack(fill="x", padx=14, pady=6)

        self.make_entry(form, "Fréquence de base f₀ (Hz)", self.f0_var)
        self.make_entry(form, "Décalage temporel τ (s)", self.tau_var)
        self.make_entry(form, "Échelle N", self.n_var)
        self.make_entry(form, "Précision décimale", self.prec_var)

        btn_row = ttk.Frame(left, style="Panel.TFrame")
        btn_row.pack(fill="x", padx=14, pady=(10, 8))

        calc_btn = tk.Button(
            btn_row, text="Recalculer",
            command=self.recalculate,
            bg="#efe9d0", fg="#1b2b22",
            font=("Bahnschrift Condensed", 6, "bold"),
            relief="raised", bd=2
        )
        calc_btn.pack(side="left", fill="x", expand=True, padx=(0, 6))

        reset_btn = tk.Button(
            btn_row, text="Réinitialiser",
            command=self.reset_defaults,
            bg="#d9efe1", fg="#1b2b22",
            font=("Bahnschrift Condensed", 6, "bold"),
            relief="raised", bd=2
        )
        reset_btn.pack(side="left", fill="x", expand=True, padx=(6, 0))

        note = ttk.Label(
            left,
            text=(
                "Idée : un petit tableau style craie.\n"
                "Tu changes f₀, τ, N ou la précision,\n"
                "et le tableau à droite se met à jour.\n\n"
                "Ceci reste un calcul algébrique reproductible.\n"
                "Aucune nouvelle identification physique\n"
                "n’est affirmée ici."
            ),
            style="Sub.TLabel"
        )
        note.pack(anchor="w", padx=14, pady=(8, 12))

        sample_btn = tk.Button(
            left,
            text="Exemple 2.0.0  (240.1 / 1e-15 / 2401)",
            command=self.load_v2000,
            bg="#f3d36b", fg="#1b2b22",
            font=("Bahnschrift Condensed", 5, "bold"),
            relief="raised", bd=2
        )
        sample_btn.pack(fill="x", padx=14, pady=(0, 14))

        # -------------------------
        # Chalkboard canvas
        # -------------------------
        self.canvas = tk.Canvas(
            right, bg=BG, highlightthickness=0, relief="flat"
        )
        self.canvas.pack(fill="both", expand=True)
        self.canvas.bind("<Configure>", lambda e: self.redraw_board())

        # live update
        for var in (self.f0_var, self.tau_var, self.n_var, self.prec_var):
            var.trace_add("write", lambda *args: self.recalculate(live=True))

    def make_entry(self, parent, label, var):
        ttk.Label(parent, text=label).pack(anchor="w", pady=(6, 2))
        entry = tk.Entry(
            parent,
            textvariable=var,
            bg="#f5f0de",
            fg="#10261b",
            insertbackground="#10261b",
            font=("Bahnschrift Condensed", 6),
            relief="sunken",
            bd=2,
            width=28
        )
        entry.pack(fill="x", pady=(0, 4))

    def reset_defaults(self):
        self.f0_var.set(DEFAULT_F0)
        self.tau_var.set(DEFAULT_TAU)
        self.n_var.set(DEFAULT_N)
        self.prec_var.set(DEFAULT_PREC)
        self.recalculate()

    def load_v2000(self):
        self.f0_var.set("240.1")
        self.tau_var.set("1e-15")
        self.n_var.set("2401")
        self.prec_var.set("50")
        self.recalculate()

    def recalculate(self, live=False):
        try:
            precision = int(self.prec_var.get().strip())
            if precision < 20:
                precision = 20
            if precision > 150:
                precision = 150
        except Exception:
            precision = 50

        getcontext().prec = precision

        try:
            f0 = Decimal(self.f0_var.get().strip())
            tau = Decimal(self.tau_var.get().strip())
            N = Decimal(self.n_var.get().strip())

            if f0 <= 0:
                raise ValueError("f₀ doit être > 0.")
            denom = Decimal("1") - (f0 * tau)
            if denom == 0:
                raise ValueError("1 − f₀τ vaut 0.")
            if denom < 0:
                raise ValueError("1 − f₀τ est négatif.")

            f = f0 / denom
            delta = f - f0
            Nf = N * f
            Ndelta = N * delta

            self.result = {
                "ok": True,
                "message": "Calcul réussi.",
                "precision": precision,
                "f0": f0,
                "tau": tau,
                "N": N,
                "f": f,
                "delta": delta,
                "Nf": Nf,
                "Ndelta": N * delta,
                "denom": denom,
            }
        except (InvalidOperation, ValueError) as e:
            self.result = {
                "ok": False,
                "message": str(e),
                "precision": precision
            }

        self.redraw_board()

    def fmt(self, value, digits=40):
        if not isinstance(value, Decimal):
            return str(value)
        try:
            # exponential for tiny/huge values
            av = abs(value)
            if value != 0 and (av < Decimal("1e-8") or av >= Decimal("1e12")):
                return f"{value:.{max(5, min(digits, 25))}E}"
            s = format(value, 'f')
            if '.' in s:
                whole, frac = s.split('.', 1)
                frac = frac[:digits]
                s = whole + '.' + frac
                s = s.rstrip('0').rstrip('.') if '.' in s else s
            return s
        except Exception:
            return str(value)

    def _ensure_textures(self, w, h):
        size=(max(2,int(w)), max(2,int(h)))
        if self._texture_size == size:
            return
        self._texture_size=size
        random.seed(2401 + size[0]*7 + size[1])

        # Photo 1: matière du tableau, sous les équations.
        base=Image.new("RGB", size, BG)
        noise=Image.effect_noise(size, 34).convert("L").point(lambda x: int(x*0.12))
        tint=Image.new("RGB", size, "#31513f")
        base=Image.composite(tint, base, noise)
        d=ImageDraw.Draw(base, "RGBA")
        for _ in range(90):
            x=random.randint(0,size[0]); y=random.randint(0,size[1])
            rw=random.randint(40,240); rh=random.randint(6,35)
            d.ellipse((x-rw,y-rh,x+rw,y+rh), fill=(230,235,220,random.randint(2,8)))
        base=base.filter(ImageFilter.GaussianBlur(1.2))
        self.texture_bg=ImageTk.PhotoImage(base)

        # Photo 2: grain / craie sèche PAR-DESSUS texte + lignes.
        fg=Image.new("RGBA", size, (0,0,0,0))
        g=ImageDraw.Draw(fg, "RGBA")
        for _ in range(1300):
            x=random.randrange(size[0]); y=random.randrange(size[1])
            if random.random() < .72:
                r=random.choice((1,1,1,2))
                a=random.randint(5,22)
                g.ellipse((x-r,y-r,x+r,y+r), fill=(245,244,230,a))
            else:
                ln=random.randint(8,70); a=random.randint(5,18)
                g.line((x,y,min(size[0]-1,x+ln),y+random.randint(-2,2)), fill=(245,244,230,a), width=1)
        for _ in range(55):
            y=random.randrange(size[1]); x=random.randrange(size[0])
            ln=random.randint(80,420)
            g.line((x,y,min(size[0]-1,x+ln),y), fill=(16,49,36,random.randint(12,28)), width=random.choice((1,2,3)))
        fg=fg.filter(ImageFilter.GaussianBlur(.25))
        self.texture_fg=ImageTk.PhotoImage(fg)

    def chalk_text(self, x, y, text, font=("Bahnschrift Condensed", 9, "bold"),
                   fill=CHALK, anchor="nw", shadow=True, max_width=None):
        if shadow:
            self.canvas.create_text(
                x+1, y+1, text=text, anchor=anchor, fill="#7aa18d",
                font=font, width=max_width
            )
        self.canvas.create_text(
            x, y, text=text, anchor=anchor, fill=fill,
            font=font, width=max_width
        )

    def draw_box(self, x1, y1, x2, y2, outline="#b9d7c5"):
        self.canvas.create_rectangle(x1, y1, x2, y2, outline=outline, width=2)

    def redraw_board(self):
        self.canvas.delete("all")
        w = max(900, self.canvas.winfo_width())
        h = max(700, self.canvas.winfo_height())
        self._ensure_textures(w, h)
        if self.texture_bg:
            self.canvas.create_image(0, 0, image=self.texture_bg, anchor="nw")

        # decorative chalk smudges
        for y in (28, 30, 32):
            self.canvas.create_line(20, y, w-20, y, fill="#214b39", width=1)
        for x in (w*0.32, w*0.64):
            self.canvas.create_line(x, 20, x, h-20, fill="#214b39", width=1)

        self.chalk_text(w/2, 24, "BRUTUS DÉRIVATION  —  CHALKBOARD EDITION",
                        font=("Bahnschrift Condensed", 10, "bold"), fill=ACCENT, anchor="n")

        self.chalk_text(int(w*0.30), 72, "Forme générale", font=("Bahnschrift Condensed", 8, "bold"), fill=CHALK_SOFT, anchor="n")
        self.chalk_text(int(w*0.30), 108, "1 / f₀ − 1 / f = τ", font=("Bahnschrift Condensed", 12, "bold"), anchor="n")
        self.chalk_text(int(w*0.30), 150, "f = f₀ / (1 − f₀τ)", font=("Bahnschrift Condensed", 12, "bold"), anchor="n")
        self.chalk_text(int(w*0.30), 190, "Δf = f − f₀", font=("Bahnschrift Condensed", 11, "bold"), anchor="n")
        self.chalk_text(int(w*0.30), 226, "Nf = N × f   |   NΔf = N × Δf", font=("Bahnschrift Condensed", 10, "bold"), anchor="n")

        # explanation
        self.draw_box(28, 280, int(w*0.60), 430)
        self.chalk_text(int(w*0.30), 294, "Explication courte", font=("Bahnschrift Condensed", 8, "bold"), fill=ACCENT, anchor="n")
        explanation = (
            "On part d’une fréquence de base f₀.\n"
            "On applique un petit décalage temporel τ.\n"
            "Cela produit une fréquence corrigée f.\n"
            "Le résidu Δf mesure l’écart exact entre f et f₀.\n"
            "Puis on propage ce résidu à une échelle N.\n\n"
            "But pratique : comparer le comportement de la même\n"
            "construction à plusieurs échelles, sans perdre la précision."
        )
        self.chalk_text(int(w*0.30), 318, explanation, font=("Bahnschrift Condensed", 8), fill=CHALK_SOFT, anchor="n", max_width=int(w*0.54))

        if not self.result.get("ok"):
            self.draw_box(int(w*0.63), 72, w-28, 220)
            self.chalk_text(int(w*0.65), 92, "ERREUR", font=("Bahnschrift Condensed", 9, "bold"), fill=RED)
            self.chalk_text(int(w*0.65), 130, self.result.get("message", ""), font=("Bahnschrift Condensed", 8), fill=RED, max_width=int(w*0.28))
            return

        r = self.result
        # results box
        self.draw_box(int(w*0.63), 72, w-28, 430)
        self.chalk_text(int(w*0.815), 92, "Valeurs courantes", font=("Bahnschrift Condensed", 8, "bold"), fill=ACCENT, anchor="n")

        y = 132
        lines = [
            ("f₀", f"{self.fmt(r['f0'], 32)} Hz"),
            ("τ", f"{self.fmt(r['tau'], 32)} s"),
            ("N", self.fmt(r['N'], 32)),
            ("1 − f₀τ", self.fmt(r['denom'], 32)),
            ("f", f"{self.fmt(r['f'], 36)} Hz"),
            ("Δf", f"{self.fmt(r['delta'], 36)} Hz"),
            ("Nf", self.fmt(r['Nf'], 36)),
            ("NΔf", self.fmt(r['Ndelta'], 36)),
            ("précision", str(r['precision']) + " décimales de travail"),
        ]
        for label, value in lines:
            self.chalk_text(int(w*0.66), y, f"{label:>8}  =  {value}",
                            font=("Bahnschrift Condensed", 8, "bold" if label in ("f", "Δf", "Nf", "NΔf") else "normal"),
                            fill=CHALK)
            y += 30

        # chalkboard "tableau d'Einstein"
        self.draw_box(28, 458, w-28, h-28)
        self.chalk_text(w/2, 472, "Tableau de calcul", font=("Bahnschrift Condensed", 8, "bold"), fill=ACCENT, anchor="n")

        row_y = 510
        rows = [
            ("Étape 1", f"Entrée :  f₀ = {self.fmt(r['f0'], 28)}  Hz"),
            ("Étape 2", f"Décalage :  τ = {self.fmt(r['tau'], 28)}  s"),
            ("Étape 3", f"Dénominateur :  1 − f₀τ = {self.fmt(r['denom'], 28)}"),
            ("Étape 4", f"Résultat :  f = f₀ / (1 − f₀τ) = {self.fmt(r['f'], 32)}  Hz"),
            ("Étape 5", f"Résidu :  Δf = f − f₀ = {self.fmt(r['delta'], 32)}  Hz"),
            ("Étape 6", f"Propagation :  N = {self.fmt(r['N'], 20)}"),
            ("Étape 7", f"Échelle :  Nf = {self.fmt(r['Nf'], 32)}"),
            ("Étape 8", f"Résidu propagé :  NΔf = {self.fmt(r['Ndelta'], 32)}"),
        ]
        for step, txt in rows:
            self.chalk_text(52, row_y, f"{step:<8}  {txt}",
                            font=("Bahnschrift Condensed", 8), fill=CHALK_SOFT)
            row_y += 34

        footer = (
            "Note : ceci est une construction algébrique reproductible.\n"
            "Le tableau se met à jour quand on change les valeurs à gauche."
        )
        self.chalk_text(52, h-88, footer, font=("Bahnschrift Condensed", 7), fill="#bfe2d2")

        # La seconde photo est volontairement au-dessus des chiffres et des lignes :
        # elle casse légèrement la craie pour donner l'effet pochoir / éponge / tableau usé.
        if self.texture_fg:
            self.canvas.create_image(0, 0, image=self.texture_fg, anchor="nw")

def main():
    root = tk.Tk()
    app = BrutusChalkboardApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()
