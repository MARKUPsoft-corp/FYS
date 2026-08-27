import urllib.request

urls = [
    "https://images.unsplash.com/photo-1610970881699-44a5587cabec",
    "https://images.unsplash.com/photo-1600271886742-f049cd451bba",
    "https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38",
    "https://images.unsplash.com/photo-1546173159-315724a31696",
    "https://images.unsplash.com/photo-1560717789-0ac7c58ac90a",
    "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea",
    "https://images.unsplash.com/photo-1622597467836-f3824974f177",
    "https://images.unsplash.com/photo-1619566636858-adf3ef46400b",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd",
    "https://images.unsplash.com/photo-1570696516188-ade861b84a49",
    "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6"
]

for url in urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        res = urllib.request.urlopen(req)
        print(f"OK: {url}")
    except Exception as e:
        print(f"FAIL: {url} - {e}")
