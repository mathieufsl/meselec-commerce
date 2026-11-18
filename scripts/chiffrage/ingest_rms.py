#!/usr/bin/env python3
"""Ingestion des prix des AO du dossier « RMS Commerce / General / AO » (rangé par statut).

Usage:
  python3 scripts/chiffrage/ingest_rms.py <dossier AO> [--sql <fichier.sql>] [--json <fichier.json>]

Chaque AO suit la trame 1_DCE / 2_Chiffrage / 3_Mémoire technique / 4_Réponse.
- Le PU de l'offre déposée (4_Réponse) fait foi.
- La décomposition vient des sous-détails de prix (MO, matériel, fournitures, location,
  sous-traitance, frais, aléas/bénéfice) ou des offres fournisseurs (fourniture).
"""
from __future__ import annotations

import json
import re
import subprocess
import tempfile
import sys
from pathlib import Path

import openpyxl

sys.path.insert(0, str(Path(__file__).parent))
from ingest import (  # noqa: E402
    NS, dimensions_de, famille_de, norm, num, report, sheet_names, to_sql, txt, unite_norm,
)

SOURCES = [
    dict(code="fontenay", nom="Fontenay-sous-Bois — travaux et entretien EP (26108)", client="Ville de Fontenay-sous-Bois",
         activite="ep", ao_ref=None),
    dict(code="coye", nom="Coye-la-Forêt — passage aux LED des bâtiments communaux", client="Commune de Coye-la-Forêt",
         activite="cfo", ao_ref="BOAMP-26-94024"),
    dict(code="evry-l1", nom="Évry-Courcouronnes — av. de la République, lot 1 VRD", client="Ville d'Évry-Courcouronnes",
         activite="vrd", ao_ref="AO-EVRY",
         note="AE déposé : 1 185 956,50 € HT (ferme 836 740,25 ; TO1 173 115 ; TO2 1 073,50 ; TO3 153 952,75 ; "
              "TO4 14 925 ; TO5 6 150). Certaines quantités du DPGF sont vides : les PU font foi, pas les totaux."),
    dict(code="evry-l2", nom="Évry-Courcouronnes — av. de la République, lot 2 espaces verts", client="Ville d'Évry-Courcouronnes",
         activite="vrd", ao_ref="AO-EVRY", note="NON DÉPOSÉ : l'attestation de dépôt ne porte que sur le lot 1. Prix chiffrés (4_Réponse/OFFRE) mais jamais remis."),
    dict(code="compans-l1", nom="Compans — rue des Cerisiers, lot 1 VRD", client="Commune de Compans",
         activite="vrd", ao_ref=None),
    dict(code="grigny-l1", nom="Grigny — ZAC Cœur de Ville phase 2, lot 1 VRD", client="Grand Paris Aménagement",
         activite="vrd", ao_ref="BOAMP-26-103684"),
    dict(code="grigny-l2", nom="Grigny — ZAC Cœur de Ville phase 2, lot 2 éclairage / SLT", client="Grand Paris Aménagement",
         activite="ep", ao_ref="BOAMP-26-103684"),
]


_WB: dict[Path, openpyxl.Workbook] = {}
_TMP: Path | None = None


def recalc(path: Path) -> Path:
    """Copie recalculée par LibreOffice : certains fichiers (générés par script) n'ont pas de valeurs
    en cache pour leurs formules (quantités du DQE Grigny…), openpyxl lirait alors des cellules vides."""
    global _TMP
    if _TMP is None:
        _TMP = Path(tempfile.mkdtemp(prefix="ingest_rms_"))
    out = _TMP / f"{abs(hash(str(path)))}" / path.name
    if not out.exists():
        out.parent.mkdir(parents=True, exist_ok=True)
        try:
            subprocess.run(["soffice", "--headless", "--calc", "--convert-to", "xlsx", "--outdir", str(out.parent), str(path)],
                           capture_output=True, timeout=180, check=True)
        except (OSError, subprocess.SubprocessError):
            print(f"  ⚠ recalcul LibreOffice impossible pour {path.name} : valeurs en cache utilisées", file=sys.stderr)
            return path
    return out if out.exists() else path


def rows_of(path: Path, sheet: str | int = 0):
    if path not in _WB:
        _WB[path] = openpyxl.load_workbook(recalc(path), data_only=True)
    wb = _WB[path]
    ws = wb[sheet] if isinstance(sheet, str) else wb.worksheets[sheet]
    for i, r in enumerate(ws.iter_rows(values_only=True), 1):
        yield i, list(r) + [None] * 30


def code_prix(v: object) -> str:
    """Numéro de prix : 2.0199999 -> « 2.02 » (numéros saisis comme nombres dans Excel)."""
    if isinstance(v, float):
        return f"{v:.2f}"
    return txt(v)


def poste(**kw) -> dict:
    p = {"quantite": None, "montant_ht": None, **kw}
    q, pu = p.get("quantite"), p.get("pu_ht")
    if q and pu and not p.get("montant_ht"):
        p["montant_ht"] = round(q * pu, 2)
    return p


# ------------------------------------------------------------------ Fontenay (BPU)
def parse_fontenay(f: Path) -> list[dict]:
    out = []
    for sheet in ("Travaux", "Maintenance"):
        stack: dict[int, str] = {}
        for i, r in rows_of(f, sheet):
            a, b, c, d, e = txt(r[0]), txt(r[1]), txt(r[2]), r[3], num(r[4])
            if a and b and e is not None and e > 0:
                out.append(poste(numero=f"{a}{b}", section=" > ".join(v for _, v in sorted(stack.items())) or None,
                                 designation=c.split("\n")[0] if c else "", unite=unite_norm(d), pu_ht=e,
                                 fichier=f.name, feuille=sheet, ligne=i))
            elif a and not b and e is None:
                lvl = 0 if norm(a).startswith("partie") else 1 if norm(a).startswith("chapitre") else 2
                stack = {k: v for k, v in stack.items() if k < lvl}
                stack[lvl] = a
            elif c and not a and e is None and len(c) < 80:
                stack = {k: v for k, v in stack.items() if k < 3}
                stack[3] = c
    return out


# ------------------------------------------------------------------ Coye (DPGF + offre Sylvania)
COYE_SYLVANIA = [  # mot-clé(s) de la désignation DPGF -> articles Sylvania (offre 8005194)
    (("OPTICLIP 1200",), ["0034023", "0044614"]),
    (("OPTICLIP 600",), ["0034008"]),
    (("SYLSMART", "INTERRUPTEUR"), ["V970004"]),
    (("RESISTO MW", "1500"), ["0010461"]),
    (("RESISTO MW", "1200"), ["0010460"]),
    (("RESISTO SSA", "1500"), ["0010485"]),
    (("RESISTO SSA", "1200"), ["0010484"]),
    (("START SURFACE PIR",), ["0043407"]),
    (("START SURFACE",), ["0043405"]),
    (("PIXO",), ["0004703"]),
    (("HIGHBAY",), ["0039443", "0039446", "0039632"]),
    (("NOVELLA",), ["0040152"]),
    (("OPTIX",), ["2023935"]),
    (("PANEL", "600"), ["0042782"]),
    (("PANEL", "1200"), ["0042786"]),
    (("SPORTSBAY",), ["0044067"]),
    (("INSAVER",), ["0030519"]),
    (("CADRE DE MONTAGE", "600"), ["0044613"]),
]


def sylvania_prices(pdf: Path) -> dict[str, float]:
    text = subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True, text=True, check=True).stdout
    prices: dict[str, float] = {}
    for m in re.finditer(r"\b([0-9V]\d{6})\s+.+?\s(\d+)\s+PC\s+([\d ]+,\d+)\s+[\d ]+,\d+", text):
        prices[m.group(1)] = float(m.group(3).replace(" ", "").replace(",", "."))
    return prices


def parse_coye(f: Path, quote: Path | None, warns: list[str]) -> list[dict]:
    prices = sylvania_prices(quote) if quote else {}
    out, part = [], "DPGF luminaires"
    for i, r in rows_of(f, "DPGF"):
        a = txt(r[0])
        if norm(a).startswith("luminaires / equipements complementaires"):
            part = "Compléments proposés par le candidat"
            continue
        if norm(a).startswith("prestations forfaitaires"):
            part = "Prestations forfaitaires"
            continue
        if not a.isdigit():
            continue
        if part == "Prestations forfaitaires":
            pu = num(r[10])
            if pu:
                out.append(poste(numero=f"F{a}", section=part, designation=txt(r[1]), unite=unite_norm(r[8]),
                                 quantite=num(r[9]), pu_ht=pu, montant_ht=num(r[11]), fichier=f.name, feuille="DPGF", ligne=i))
            continue
        des, pu = txt(r[2]), num(r[10])
        spec = " ; ".join(t for t in (txt(r[3]), txt(r[4]), txt(r[5]), txt(r[6]), txt(r[7])) if t)
        p = poste(numero=a if part == "DPGF luminaires" else f"C{a}",
                  section=f"{part} > {txt(r[1])}" if txt(r[1]) else part, designation=des,
                  unite=unite_norm(r[8]) or "u", quantite=num(r[9]) or None, pu_ht=pu, montant_ht=num(r[11]) or None,
                  detail=spec or None, fichier=f.name, feuille="DPGF", ligne=i)
        if not p.get("pu_ht"):
            continue
        up = des.upper()
        for keys, arts in COYE_SYLVANIA:
            if all(k in up for k in keys):
                if all(x in prices for x in arts):
                    fo = round(sum(prices[x] for x in arts), 4)
                    if abs(fo * 1.2 - p["pu_ht"]) <= 0.02:
                        p.update(fourniture_ht=fo, fournisseur="Sylvania (offre 8005194)", pu_brouillon_ht=None,
                                 decomposition_origine="offre_fournisseur",
                                 detail=((p.get("detail") or "") + " | PU = fourniture Sylvania × 1,20 ; pose et dépose "
                                         "comptées dans les prestations forfaitaires").strip(" |"))
                    else:
                        warns.append(f"coye n°{p['numero']} : PU {p['pu_ht']} ≠ 1,2 × Sylvania {fo}")
                break
        out.append(p)
    return out


# ------------------------------------------------------------------ Évry (DPGF tranches ferme / options)
def option_rows(f: Path, sheet: str) -> dict[int, str]:
    """Lignes rattachées à une option par les formules des sous-totaux « MONTANT TOTAL … TOn »
    (les options TO1 / TO2 sont mêlées aux lignes de la tranche ferme dans la même feuille)."""
    ws = openpyxl.load_workbook(f)[sheet]
    tag: dict[int, str] = {}
    for row in ws.iter_rows(min_col=2, max_col=6):
        des, tot = txt(row[0].value), row[4].value
        m = re.search(r"\bTO\s*(\d)", des, re.I)
        if norm(des).startswith("montant") and m and isinstance(tot, str) and tot.startswith("="):
            for a, b in re.findall(r"F(\d+)(?::F(\d+))?", tot):
                for k in range(int(a), int(b or a) + 1):
                    tag[k] = f"Option TO{m.group(1)}"
    return tag


def parse_evry(f: Path) -> list[dict]:
    out = []
    for sheet in [s for s in sheet_names(f) if s.upper().startswith("DPGF")]:
        base = "Tranche ferme" if sheet.replace(" ", "").upper() in ("DPGF-VRD", "DPGF-EV") else f"Option {sheet.split('-')[-1].strip()}"
        opts = option_rows(f, sheet) if base == "Tranche ferme" else {}
        stack: dict[int, str] = {}
        for i, r in rows_of(f, sheet):
            n, des, u, pu, q = txt(r[0]), txt(r[1]), r[2], num(r[3]), num(r[4])
            if not des or norm(des).startswith("montant") or re.match(r"^TO\s*\d", n, re.I):
                continue
            if pu and pu > 0:
                # quantité négative = moins-value (ex. TO1 Évry) : on la garde, elle entre dans le total
                out.append(poste(numero=n or None, section=" > ".join([opts.get(i, base)] + [v for _, v in sorted(stack.items())]),
                                 designation=des, unite=unite_norm(u), quantite=q if q else None, pu_ht=pu,
                                 fichier=f.name, feuille=sheet, ligne=i))
            elif n and u is None:
                d = 0 if norm(n).startswith("titre") else n.count(".") + 1
                stack = {k: v for k, v in stack.items() if k < d}
                stack[d] = des
    return out


# ------------------------------------------------------------------ Compans (DPGF format CAO)
def parse_compans(f: Path) -> list[dict]:
    out, stack = [], {}
    for i, r in rows_of(f, "DPGF"):
        niv, code, des = txt(r[0]), txt(r[1]), txt(r[3])
        if not niv.isdigit() or not des:
            continue
        pu = num(r[9])
        if pu and pu > 0:
            q = num(r[7])
            out.append(poste(numero=code or None, section=" > ".join(v for _, v in sorted(stack.items())) or None,
                             designation=des, unite=unite_norm(r[6]), quantite=q if q and q > 0 else None, pu_ht=pu,
                             montant_ht=num(r[10]), fichier=f.name, feuille="DPGF", ligne=i))
        else:
            lvl = int(niv)
            stack = {k: v for k, v in stack.items() if k < lvl}
            stack[lvl] = des
    return out


# ------------------------------------------------------------------ Grigny (BPU + DQE + sous-détails)
def sous_detail(path: Path, sheet: str) -> dict:
    """Cadre GPA « sous-détail de prix » : lignes 11-23, frais en 27-29, prix arrondi en F37."""
    rows = dict(rows_of(path, sheet))
    mo = mat = fo = loc = st = heures = 0.0
    lignes = []
    for i in range(11, 24):
        r = rows.get(i)
        if not r or not txt(r[0]):
            continue
        q = num(r[2]) or 0
        cu = {k: num(r[c]) or 0 for k, c in (("mo", 3), ("mat", 5), ("fo", 7), ("loc", 9), ("st", 12))}
        mo += q * cu["mo"]; mat += q * cu["mat"]; fo += q * cu["fo"]; loc += q * cu["loc"]; st += q * cu["st"]
        if cu["mo"] and norm(r[1]) == "h":
            heures += q
        lignes.append(txt(r[0]))
    pct = [num(rows[i][2]) or 0 for i in (27, 28, 29)]
    deb = mo + mat + fo + loc
    pu = num(rows[37][5]) if rows.get(37) else None
    libelle = txt(rows[5][1]) or re.sub(r"^libell[ée]\s*:\s*", "", txt(rows[5][0]), flags=re.I)
    return {
        "numero": code_prix(rows[3][1]) or re.sub(r"^n° de prix\s*:\s*", "", txt(rows[3][0]), flags=re.I),
        "designation": libelle,
        "fourniture_ht": round(fo, 4) or None, "mo_ht": round(mo, 4) or None, "heures_mo": round(heures, 4) or None,
        "materiel_ht": round(mat + loc, 4) or None, "sous_traitance_ht": round(st, 4) or None,
        # les % s'appliquent au déboursé (travaux propres + sous-traités) — vérifié sur Grigny L1/L2
        "frais_generaux_ht": round((deb + st) * (pct[0] + pct[1]) / 100, 4) or None,
        "marge_nette_ht": round((deb + st) * pct[2] / 100, 4) or None,
        "pu_sd": pu, "deb": deb,
        "detail": f"Sous-détail : déboursé sec {deb:.2f} € ; frais chantier {pct[0]:g} %, siège {pct[1]:g} %, "
                  f"aléas + bénéfice {pct[2]:.2f} % (sur déboursé + sous-traitance) ; " + " / ".join(lignes)[:400],
    }


def dqe_quantites(f: Path, sheet: str) -> list[tuple[float, float]]:
    """(PU, quantité totale) pour chaque ligne chiffrée, dans l'ordre du DQE."""
    out = []
    for _, r in rows_of(f, sheet):
        pu = num(r[3])
        if pu and pu > 0 and unite_norm(r[2]):
            tot = num(r[18])
            if tot is None:
                tot = sum(num(r[c]) or 0 for c in (4, 6, 8, 10, 12, 14, 16))
            out.append((pu, tot))
    return out


def attach_sd(p: dict, sd: dict, warns: list[str], code: str) -> None:
    for k in ("fourniture_ht", "mo_ht", "heures_mo", "materiel_ht", "sous_traitance_ht", "frais_generaux_ht", "marge_nette_ht"):
        p[k] = sd[k]
    p["detail"], p["decomposition_origine"] = sd["detail"], "sous_detail"
    if sd["pu_sd"] and abs(sd["pu_sd"] - p["pu_ht"]) > 0.02:
        warns.append(f"{code} n°{p['numero']} : PU sous-détail {sd['pu_sd']} ≠ PU BPU {p['pu_ht']}")


def parse_grigny(lot_dir: Path, lot: int, warns: list[str]) -> list[dict]:
    o = lot_dir / "2_OFFRE"
    code = f"grigny-l{lot}"
    sd_file = next(o.glob("*Sous-detail*MESELEC*.xlsx"))
    dqe_file = next(o.glob("*DQE*MESELEC*.xlsx"))
    sheet = f"LOT0{lot}"
    out: list[dict] = []
    if lot == 1:  # le BPU n'a pas de numéros : on part du sommaire des sous-détails
        for i, r in rows_of(sd_file, "Sommaire"):
            if i < 5 or not txt(r[1]) or num(r[5]) is None:
                continue
            p = poste(numero=txt(r[1]), designation=txt(r[2]), unite=unite_norm(r[3]), pu_ht=num(r[5]),
                      fichier=sd_file.name, feuille="Sommaire", ligne=i)
            sd = sous_detail(sd_file, txt(r[0]))
            attach_sd(p, sd, warns, code)
            if "sous-trait" in norm(r[6]):
                p["sous_traitant"] = txt(r[6]).split("Sous-traité")[-1].strip() or None
                p["sous_traitance_ht"] = p.get("sous_traitance_ht") or round(num(r[4]) or 0, 4) or None
            out.append(p)
    else:
        bpu = next(o.glob("*BPU*MESELEC*.xlsx"))
        sds = {}
        for s in sheet_names(sd_file):
            if s.lower().startswith("prix"):
                sd = sous_detail(sd_file, s)
                sds[sd["numero"]] = sd
        cur = None
        for i, r in rows_of(bpu, sheet):
            n, des, pu = code_prix(r[0]), txt(r[1]), num(r[3])
            if n and des and re.match(r"^\d+\.\d+", n):
                cur = (n, des)
            elif pu and pu > 0 and cur:
                p = poste(numero=cur[0], designation=cur[1], unite=unite_norm(r[2]), pu_ht=pu,
                          fichier=bpu.name, feuille=sheet, ligne=i)
                if cur[0] in sds:
                    attach_sd(p, sds[cur[0]], warns, code)
                else:
                    warns.append(f"{code} n°{cur[0]} : pas de sous-détail")
                out.append(p)
                cur = None
    # quantités du DQE, dans l'ordre, contrôle sur le PU
    q = dqe_quantites(dqe_file, sheet)
    if len(q) != len(out):
        warns.append(f"{code} : {len(q)} lignes DQE pour {len(out)} prix")
    for p, (pu, qt) in zip(out, q):
        if abs(pu - p["pu_ht"]) <= 0.02 and qt:
            p["quantite"], p["montant_ht"] = qt, round(qt * pu, 2)
        elif abs(pu - p["pu_ht"]) > 0.02:
            warns.append(f"{code} n°{p['numero']} : PU DQE {pu} ≠ {p['pu_ht']}")
    for p in out:
        p.pop("pu_sd", None)
    return out


# ------------------------------------------------------------------ assemblage
def build(root: Path) -> tuple[list[dict], dict[str, list[dict]], list[str]]:
    warns: list[str] = []
    P: dict[str, list[dict]] = {}
    dep, enc = root / "4_Déposé", root / "3_En cours"

    P["fontenay"] = parse_fontenay(dep / "Fontenay-sous-Bois_EP/4_Réponse/OFFRE/26108_Tvx_et_entretien_EP_BPU_MESELEC.xlsx")
    coye = dep / "Coye-la-Foret_CFO"
    P["coye"] = parse_coye(coye / "4_Réponse/OFFRE/DPGF Coye-la-Foret - MESELEC.xlsx",
                           next((coye / "2_Chiffrage").glob("QT *.pdf"), None), warns)
    ev = dep / "Evry-Courcouronnes_VRD/4_Réponse"
    P["evry-l1"] = parse_evry(ev / "LOT1/OFFRE/Chiffrage_Lot_1_VRD.xlsx")
    P["evry-l2"] = parse_evry(ev / "OFFRE/Chiffrage_Lot_2_Espaces_verts.xlsx")
    P["compans-l1"] = parse_compans(enc / "Compans_VRD_(EP)/4_Réponse/2_OFFRE/02_DPGF_Lot1_MESELEC.xlsx")
    g = enc / "Grigny_EP_VRD/4_Réponse"
    P["grigny-l1"] = parse_grigny(g / "LOT 1 VRD", 1, warns)
    P["grigny-l2"] = parse_grigny(g / "LOT 2 EP", 2, warns)

    for code, rows in P.items():
        for k, r in enumerate(rows):
            r["ordre"] = k
            r["famille"] = r.get("famille") or famille_de(r["designation"], r.get("section") or "")
            r["dimensions"] = dimensions_de(r["designation"])
            r.setdefault("decomposition_origine", None)
    return SOURCES, P, warns


def main() -> None:
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    sql_out = args[args.index("--sql") + 1] if "--sql" in args else None
    json_out = args[args.index("--json") + 1] if "--json" in args else None
    sources, P, warns = build(Path(args[0]))
    report(sources, P, warns)
    for s in sources:
        r = P[s["code"]]
        print(f"  {s['code']:12} total HT (lignes avec quantité) : {sum(x.get('montant_ht') or 0 for x in r):14,.2f}")
    if json_out:
        Path(json_out).write_text(json.dumps(P, ensure_ascii=False, indent=1, default=str))
    if sql_out:
        Path(sql_out).write_text(to_sql(sources, P, header="scripts/chiffrage/ingest_rms.py — AO du dossier RMS Commerce"))
        print(f"\nSQL écrit : {sql_out}")


if __name__ == "__main__":
    main()
