import requests

# URLs d'images de style anime/réaliste (Unsplash + Picsum pour personnages génériques)
characters = {
    # Personnages Naruto - style anime
    "naruto": "https://picsum.photos/seed/naruto-blonde-ninja/800/800",
    "sasuke": "https://picsum.photos/seed/sasuke-dark-ninja/800/800",
    "sakura": "https://picsum.photos/seed/sakura-pink-hair/800/800",
    "kakashi": "https://picsum.photos/seed/kakashi-silver-ninja/800/800",
    "hinata": "https://picsum.photos/seed/hinata-purple-ninja/800/800",
    "itachi": "https://picsum.photos/seed/itachi-dark-uchiha/800/800",
    
    # Célébrités - photos génériques style pro
    "brad": "https://picsum.photos/seed/brad-actor-male-1/800/800",
    "leo": "https://picsum.photos/seed/leo-actor-male-2/800/800",
    "rock": "https://picsum.photos/seed/rock-strong-male/800/800",
    "scarlett": "https://picsum.photos/seed/scarlett-actress-1/800/800",
    "margot": "https://picsum.photos/seed/margot-blonde-actress/800/800",
    "emma": "https://picsum.photos/seed/emma-british-actress/800/800",
    "zendaya": "https://picsum.photos/seed/zendaya-young-actress/800/800"
}

print("Téléchargement d'images haute qualité...")
for name, url in characters.items():
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            with open(f"{name}.jpg", "wb") as f:
                f.write(response.content)
            print(f"✓ {name}.jpg téléchargé (800x800)")
        else:
            print(f"✗ Erreur {name}: {response.status_code}")
    except Exception as e:
        print(f"✗ Erreur {name}: {e}")

print("Conversion en PNG...")
import subprocess
for name in characters.keys():
    try:
        subprocess.run(["convert", f"{name}.jpg", f"{name}.png"], check=True)
        print(f"✓ {name}.png créé")
    except:
        # Fallback si ImageMagick pas dispo
        from PIL import Image
        img = Image.open(f"{name}.jpg")
        img.save(f"{name}.png")
        print(f"✓ {name}.png créé (PIL)")

print("Terminé!")
