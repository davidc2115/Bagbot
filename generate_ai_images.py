import requests
import time
import os

# API Hugging Face pour Stable Diffusion
API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0"
headers = {"Authorization": "Bearer hf_demo"}  # Token demo public

characters = {
    "naruto": "portrait of Naruto Uzumaki, young blonde ninja, orange jumpsuit, headband, blue eyes, anime style, high quality",
    "sasuke": "portrait of Sasuke Uchiha, dark hair, sharingan eyes, ninja, cool expression, anime style, high quality",
    "sakura": "portrait of Sakura Haruno, pink hair, green eyes, medical ninja, anime style, high quality",
    "kakashi": "portrait of Kakashi Hatake, silver hair, masked face, one eye visible, ninja, anime style, high quality",
    "hinata": "portrait of Hinata Hyuga, dark blue hair, white eyes, shy expression, anime style, high quality",
    "itachi": "portrait of Itachi Uchiha, long dark hair, sharingan, serious expression, anime style, high quality",
    "brad": "portrait photo of Brad Pitt, Hollywood actor, realistic, professional headshot",
    "leo": "portrait photo of Leonardo DiCaprio, Hollywood actor, realistic, professional headshot",
    "rock": "portrait photo of Dwayne The Rock Johnson, muscular actor, realistic, professional headshot",
    "scarlett": "portrait photo of Scarlett Johansson, actress, realistic, professional headshot",
    "margot": "portrait photo of Margot Robbie, blonde actress, realistic, professional headshot",
    "emma": "portrait photo of Emma Watson, British actress, realistic, professional headshot",
    "zendaya": "portrait photo of Zendaya, young actress, realistic, professional headshot"
}

def generate_image(prompt, filename):
    print(f"Generating {filename}...")
    try:
        response = requests.post(API_URL, headers=headers, json={"inputs": prompt}, timeout=60)
        if response.status_code == 200:
            with open(filename, "wb") as f:
                f.write(response.content)
            print(f"✓ {filename} generated")
            return True
        else:
            print(f"✗ Error {filename}: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Error {filename}: {e}")
        return False

print("Génération des images par IA (Stable Diffusion)...")
for name, prompt in characters.items():
    generate_image(prompt, f"ai_generated_images/{name}.jpg")
    time.sleep(2)  # Attendre entre les requêtes

print("Terminé!")
