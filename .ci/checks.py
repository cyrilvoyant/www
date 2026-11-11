"""Site checks run on every push (audit of 11 Nov 2026, lot 5). Standard library only, read-only.
Exit code 1 if any blocking check fails. Warnings never fail the run."""
import json, pathlib, re, sys
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://www.cyrilvoyant.com"
NO_SHARE_IMAGE_OK = set()  # pages allowed without og:image


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.h1 = 0; self.desc = None; self.canon = None; self.robots = ""; self.og = False
        self.links = []; self.ld = []; self._ld = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "h1": self.h1 += 1
        elif tag == "meta":
            if a.get("name", "").lower() == "description": self.desc = a.get("content")
            elif a.get("name", "").lower() == "robots": self.robots = a.get("content") or ""
            elif a.get("property", "").lower() == "og:image": self.og = True
        elif tag == "link" and a.get("rel") == "canonical": self.canon = a.get("href")
        elif tag == "a" and a.get("href"): self.links.append(a["href"])
        elif tag == "script" and a.get("type") == "application/ld+json": self._ld = []

    def handle_endtag(self, tag):
        if tag == "script" and self._ld is not None:
            self.ld.append("".join(self._ld)); self._ld = None

    def handle_data(self, data):
        if self._ld is not None: self._ld.append(data)


def url_of(f):
    rel = "/" + f.relative_to(ROOT).as_posix()
    return rel[:-10] if rel.endswith("index.html") else rel


def resolve(src, href):
    href = href.split("#")[0].split("?")[0]
    if href.startswith(SITE): href = href[len(SITE):] or "/"
    if not href or re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", href) or href.startswith("//"): return None
    if not href.startswith("/"):
        base = src if src.endswith("/") else src.rsplit("/", 1)[0] + "/"
        parts = []
        for seg in (base + href).split("/"):
            if seg == "..": parts and parts.pop()
            elif seg != ".": parts.append(seg)
        href = "/" + "/".join(p for p in parts if p) + ("/" if href.endswith("/") else "")
    return href


pages = {}
for f in ROOT.rglob("*.html"):
    if any(p.startswith(".") for p in f.relative_to(ROOT).parts): continue
    p = Page(); p.feed(f.read_text(encoding="utf8", errors="replace")); pages[url_of(f)] = (f, p)

errors, warnings = [], []
indexable = {u for u, (f, p) in pages.items() if "noindex" not in p.robots and u != "/404.html"}

for u in sorted(indexable):
    f, p = pages[u]
    if p.h1 != 1: errors.append(f"{u}: {p.h1} h1")
    if not p.desc: errors.append(f"{u}: no meta description")
    if not p.canon: errors.append(f"{u}: no canonical")
    if not p.og and u not in NO_SHARE_IMAGE_OK: errors.append(f"{u}: no og:image")
    for block in p.ld:
        try: json.loads(block)
        except Exception as e: errors.append(f"{u}: invalid JSON-LD ({str(e)[:50]})")
    for h in p.links:
        t = resolve(u, h)
        if t is None: continue
        target = ROOT / t.lstrip("/")
        if not (t in pages or t + "/" in pages or target.is_file() or (target / "index.html").is_file()):
            errors.append(f"{u}: broken link {h}")

sm = set(re.findall(r"<loc>([^<]+)</loc>", (ROOT / "sitemap.xml").read_text(encoding="utf8")))
sm = {s[len(SITE):] or "/" for s in sm}
for u in sorted(sm - set(pages)): errors.append(f"sitemap: {u} has no file")
canonical = {u for u in indexable if pages[u][1].canon == SITE + u}
for u in sorted(canonical - sm): errors.append(f"sitemap: indexable page {u} is missing")

for lang, path, pat in (("fr", "fr/outils/index.html", r"(\d+) outils pour le cours"), ("en", "tools/index.html", r"(\d+) tools for courses")):
    s = (ROOT / path).read_text(encoding="utf8"); n = s.count("data-domain="); m = re.search(pat, s)
    if not m or int(m.group(1)) != n: errors.append(f"{path}: announces {m.group(1) if m else '?'} tools, lists {n}")

for u in sorted(canonical):
    s = re.sub(r"<[^>]+>", " ", pages[u][0].read_text(encoding="utf8", errors="replace"))
    if re.search(r"nRMSE[^.]{0,60}\d\d[,.]\d(?:&nbsp;|\s)%", s): warnings.append(f"{u}: nRMSE written as a percentage")

print(f"pages {len(pages)} | indexable {len(indexable)} | sitemap {len(sm)}")
for w in warnings: print("WARNING", w)
for e in errors: print("ERROR", e)
print(f"{len(errors)} error(s), {len(warnings)} warning(s)")
sys.exit(1 if errors else 0)
