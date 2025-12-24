import requests
import time
import os

# Pollination AI API (alternative: utiliser Eden AI qui agrège plusieurs services)
# Pour images anime-style haute qualité

prompts = {
    "naruto": "anime character portrait, blonde spiky hair, blue eyes, orange ninja outfit, headband with leaf symbol, energetic smile, high quality anime art, detailed, vibrant colors",
    "sasuke": "anime character portrait, dark black hair, black eyes, serious expression, blue ninja outfit, cool and mysterious, high quality anime art, detailed",
    "sakura": "anime character portrait, pink hair, green eyes, red ninja outfit, kind smile, medical ninja, high quality anime art, detailed, vibrant colors",
    "kakashi": "anime character portrait, silver spiky hair, one visible eye, face mask covering lower face, ninja headband, reading book, high quality anime art, detailed",
    "hinata": "anime character portrait, long dark blue hair, white pupil-less eyes (byakugan), lavender jacket, shy expression, gentle smile, high quality anime art, detailed",
    "itachi": "anime character portrait, long black hair, red sharingan eyes, ANBU outfit, serious mysterious expression, high quality anime art, detailed, dark atmosphere",
    
    # Célébrités - style photo réaliste
    "brad": "professional headshot photo, Brad Pitt, Hollywood actor, handsome face, short hair, professional lighting, high quality photography, realistic",
    "leo": "professional headshot photo, Leonardo DiCaprio, Hollywood actor, handsome face, professional lighting, high quality photography, realistic",
    "rock": "professional headshot photo, Dwayne The Rock Johnson, muscular, bald, smiling, professional lighting, high quality photography, realistic",
    "scarlett": "professional headshot photo, Scarlett Johansson actress, beautiful face, red hair, professional lighting, high quality photography, realistic",
    "margot": "professional headshot photo, Margot Robbie actress, blonde hair, beautiful smile, professional lighting, high quality photography, realistic",
    "emma": "professional headshot photo, Emma Watson actress, brunette hair, elegant, professional lighting, high quality photography, realistic",
    "zendaya": "professional headshot photo, Zendaya actress, beautiful face, curly hair, professional lighting, high quality photography, realistic"
}

print("Génération d'images via API...")
print("Note: Pollinations AI est gratuit et illimité!")

for name, prompt in prompts.items():
    # Pollinations AI - gratuit et illimité
    url = f"https://image.pollinations.ai/prompt/{requests.utils.quote(prompt)}?width=800&height=800&nologo=true"
    
    try:
        print(f"Génération {name}...")
        response = requests.get(url, timeout=60)
        if response.status_code == 200:
            with open(f"{name}.jpg", "wb") as f:
                f.write(response.content)
            print(f"✓ {name}.jpg généré")
        else:
            print(f"✗ Erreur {name}: {response.status_code}")
        time.sleep(1)
    except Exception as e:
        print(f"✗ Erreur {name}: {e}")

print("\nConversion en PNG...")
from PIL import Image
for name in prompts.keys():
    try:
        if os.path.exists(f"{name}.jpg"):
            img = Image.open(f"{name}.jpg")
            img.save(f"{name}.png")
            print(f"✓ {name}.png créé")
    except Exception as e:
        print(f"✗ Erreur conversion {name}: {e}")

print("Terminé!")
