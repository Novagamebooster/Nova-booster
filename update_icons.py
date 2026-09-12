import json, urllib.request, urllib.parse, os

GAMES = {
    "mlbb": ("com.mobile.legends", "sg"),
    "codm": ("com.activision.callofduty.shooter", "us"),
    "df":   ("com.proxima.dfm", "us"),
    "pubg": ("com.tencent.ig", "us"),
    "ff":   ("com.dts.freefireth", "us"),
    "fc":   ("com.ea.ios.fifamobile", "us"),
    "ef":   ("jp.konami.pesactionmobile", "us"),
    "hok":  ("com.levelinfinite.sgameGlobal", "us"),
}

def get_json(url):
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            return json.load(r)
    except Exception:
        proxy = "https://api.allorigins.win/raw?url=" + urllib.parse.quote(url, safe="")
        with urllib.request.urlopen(proxy, timeout=30) as r:
            return json.load(r)

def download(url, path):
    prox = "https://wsrv.nl/?url=" + urllib.parse.quote(url, safe="") + "&w=512&h=512&fit=cover"
    for u in (prox, url):
        try:
            req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
            data = urllib.request.urlopen(req, timeout=30).read()
            if len(data) > 5000:
                with open(path, "wb") as f:
                    f.write(data)
                return True
        except Exception:
            continue
    return False

os.makedirs("icons/games", exist_ok=True)
print("=== شروع آپدیت آیکون‌ها ===")
for gid, (bid, country) in GAMES.items():
    api = "https://itunes.apple.com/lookup?bundleId=" + bid + "&country=" + country
    try:
        data = get_json(api)
        if data.get("resultCount", 0) >= 1:
            icon = data["results"][0]["artworkUrl512"]
            ok = download(icon, "icons/games/" + gid + ".png")
            print(("OK   " if ok else "FAIL ") + gid)
        else:
            print("FAIL " + gid + " (not found)")
    except Exception as e:
        print("FAIL " + gid + " : " + str(e))
print("=== پایان ===")
