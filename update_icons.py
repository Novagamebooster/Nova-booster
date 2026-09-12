import re, urllib.request, urllib.parse, os

GAMES = {
    "mlbb": "com.mobile.legends.usa",
    "codm": "com.activision.callofduty.shooter",
    "df":   "com.proxima.dfm",
    "pubg": "com.tencent.ig",
    "ff":   "com.dts.freefireth",
    "fc":   "com.ea.gp.fifamobile",
    "ef":   "jp.konami.pesactionmobile",
    "hok":  "com.levelinfinite.sgameGlobal",
}

UA = {"User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36"}

def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=30).read()

def play_icon(pkg):
    html = fetch("https://play.google.com/store/apps/details?id=" + pkg + "&hl=en_US").decode("utf-8", "ignore")
    m = re.search(r'property="og:image"\s+content="([^"]+)"', html)
    if not m:
        m = re.search(r'(https://play-lh\.googleusercontent\.com/[^"\s]+)', html)
    return m.group(1) if m else None

def save(url, path):
    tries = [
        url,
        "https://wsrv.nl/?url=" + urllib.parse.quote(url, safe="") + "&w=512&h=512&fit=cover"
    ]
    for u in tries:
        try:
            data = fetch(u)
            if len(data) > 5000:
                with open(path, "wb") as f:
                    f.write(data)
                return True
        except Exception:
            pass
    return False

os.makedirs("icons/games", exist_ok=True)
print("=== دانلود آیکون‌ها مستقیم از Google Play ===")
for gid, pkg in GAMES.items():
    try:
        icon = play_icon(pkg)
        ok = save(icon, "icons/games/" + gid + ".png") if icon else False
        print(("OK   " if ok else "FAIL ") + gid)
    except Exception as e:
        print("FAIL " + gid + " : " + str(e))
print("=== پایان ===")
