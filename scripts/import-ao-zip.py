#!/usr/bin/env python3
"""Import AO documents from zip without full extraction (disk-safe)."""
from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import PurePosixPath

ZIP_PATH = sys.argv[1] if len(sys.argv) > 1 else "/Users/mathieufaessel/Downloads/OneDrive_1_30-08-2026.zip"
MAX_BYTES = 50 * 1024 * 1024
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL", "")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

AO_MAP = [
    ("260702_Arc de triomphe", "260702"),
    ("260713_12H_GOUSSAINVILLE", "260713"),
    (
        "Exploitation, maintenance préventive et corrective des installations d’éclairage et d’électricité de l’Arc de Triomphe",
        "26-641",
    ),
    ("MAIRIE DE JOUARS PONTCHARTRAIN", "AO-JOUARS"),
    ("MAIRIE DE OSNY", "AO-OSNY"),
    ("Mairie d'Evry-Courcouronnes", "AO-EVRY"),
    ("Mairie de champagne sur oise", "AO-CHAMP"),
    ("rue flachat Asniére sur seine", "AO-ASN"),
]


def api(method: str, path: str, data: bytes | None = None, content_type: str = "application/json", extra: dict | None = None):
    url = f"{SUPABASE_URL.rstrip('/')}{path}"
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
    }
    if content_type:
        headers["Content-Type"] = content_type
    if extra:
        headers.update(extra)
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            body = res.read()
            if not body:
                return None
            return json.loads(body)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{e.code} {path}: {e.read().decode()[:300]}") from e


def doc_type(path: str) -> str:
    lower = path.lower()
    if "/00_dce/" in lower or "\\00_dce\\" in lower:
        if "rc_" in lower or "reglement" in lower:
            return "rc"
        if "cctp" in lower:
            return "cctp"
        if "ccap" in lower:
            return "ae"
        if "dpgf" in lower:
            return "dpgf"
        if "bpu" in lower:
            return "bpu"
        return "dce"
    if "memoire" in lower or "m+moire" in lower or "mémoire" in lower:
        return "memoire"
    if "/03_" in lower or "reponse" in lower or "réponse" in lower:
        return "reponse"
    if "attestationdepot" in lower:
        return "reponse"
    if "chiffrage" in lower:
        return "annexe"
    return "annexe"


def should_skip(name: str) -> bool:
    base = PurePosixPath(name).name
    if base.startswith("~$") or base.startswith("._") or base == ".DS_Store":
        return True
    if "__MACOSX" in name:
        return True
    if base.endswith(".tmp"):
        return True
    if base.lower().endswith(".zip"):
        return True
    return False


def fmt_size(n: int) -> str:
    if n < 1024 * 1024:
        return f"{n / 1024:.0f} Ko"
    return f"{n / (1024 * 1024):.1f} Mo"


def sanitize(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]", "_", name)


def folder_match(entry: str, prefix: str) -> bool:
    parts = PurePosixPath(entry).parts
    if not parts:
        return False
    root = parts[0]
    return root == prefix or root.lower().strip() == prefix.lower().strip()


def main():
    if not SUPABASE_URL or not SERVICE_KEY:
        print("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        sys.exit(1)

    print(f"[1/2] Lecture zip {ZIP_PATH}…")
    aos = api("GET", "/rest/v1/appels_offres?select=id,reference")
    ao_by_ref = {a["reference"]: a["id"] for a in aos}

    uploaded = skipped = skipped_large = 0

    with zipfile.ZipFile(ZIP_PATH, "r") as zf:
        names = [n for n in zf.namelist() if not n.endswith("/")]
        print(f"[2/2] {len(names)} entrées — upload (< 50 Mo)…\n")

        for folder_prefix, reference in AO_MAP:
            ao_id = ao_by_ref.get(reference)
            if not ao_id:
                print(f"⚠ AO manquant: {reference}")
                continue

            ao_count = 0
            for entry in names:
                if not folder_match(entry, folder_prefix):
                    continue
                if should_skip(entry):
                    skipped += 1
                    continue

                info = zf.getinfo(entry)
                if info.file_size > MAX_BYTES:
                    print(f"  ⊘ {PurePosixPath(entry).name} ({fmt_size(info.file_size)} > 50 Mo)")
                    skipped_large += 1
                    skipped += 1
                    continue

                file_name = PurePosixPath(entry).name
                dtype = doc_type(entry)
                storage_path = f"{ao_id}/{dtype}/{int(time.time() * 1000)}_{sanitize(file_name)}"

                try:
                    data = zf.read(entry)
                    encoded = "/".join(urllib.request.quote(p) for p in storage_path.split("/"))
                    api(
                        "POST",
                        f"/storage/v1/object/ao-documents/{encoded}",
                        data=data,
                        content_type="application/octet-stream",
                        extra={"x-upsert": "false"},
                    )
                    api(
                        "POST",
                        "/rest/v1/ao_documents",
                        data=json.dumps(
                            {
                                "ao_id": ao_id,
                                "type": dtype,
                                "nom_fichier": file_name,
                                "storage_path": storage_path,
                                "fichier_url": storage_path,
                                "taille_octets": len(data),
                                "notes": "Import OneDrive 30/08/2026",
                                "uploaded_by_email": "import@meselec.fr",
                            }
                        ).encode(),
                        extra={"Prefer": "return=minimal"},
                    )
                    uploaded += 1
                    ao_count += 1
                    print(f"  ✓ {file_name} ({fmt_size(len(data))})")
                except Exception as e:
                    print(f"  ✗ {file_name}: {e}")
                    skipped += 1

            print(f"→ {reference}: {ao_count} fichier(s)\n")

    print(
        f"Terminé — {uploaded} uploadés, {skipped_large} ignorés (> 50 Mo), {skipped - skipped_large} autres ignorés"
    )


if __name__ == "__main__":
    main()
