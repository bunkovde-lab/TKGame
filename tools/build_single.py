"""Собирает платформу в один HTML-файл (для офлайн-игры или публикации).

python3 tools/build_single.py            -> dist/bureau.html (самостоятельный файл)
python3 tools/build_single.py --fragment -> dist/bureau-fragment.html (без doctype/head, для хостингов, которые сами оборачивают страницу)
"""
import re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")
html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">',
              lambda m: "<style>\n" + (root / m.group(1)).read_text(encoding="utf-8") + "\n</style>", html)
html = re.sub(r'<script src="(js/[^"]+)"></script>',
              lambda m: "<script>\n" + (root / m.group(1)).read_text(encoding="utf-8") + "\n</script>", html)
out = root / "dist"
out.mkdir(exist_ok=True)
if "--fragment" in sys.argv:
    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    head = re.sub(r'<meta charset="utf-8">\s*|<meta name="viewport"[^>]*>\s*', "", head)
    body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)
    frag = '<meta name="claude:viewport-fit-sides" content="cover">\n' + head.strip() + "\n" + body.strip() + "\n"
    (out / "bureau-fragment.html").write_text(frag, encoding="utf-8")
    print(out / "bureau-fragment.html")
else:
    (out / "bureau.html").write_text(html, encoding="utf-8")
    print(out / "bureau.html")
