import urllib.request
urls = [
    "https://images.unsplash.com/photo-1542125387-c71274d94f0a",
    "https://images.unsplash.com/photo-1550831107-1553da8c8464",
    "https://images.unsplash.com/photo-1556679343-c7306c1976bc",
    "https://images.unsplash.com/photo-1505252585461-04db1eb84625"
]
for url in urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        res = urllib.request.urlopen(req)
        print(f"OK: {url}")
    except Exception as e:
        print(f"FAIL: {url} - {e}")
