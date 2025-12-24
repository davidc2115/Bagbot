#!/bin/bash
# Télécharger vraies photos hyperréalistes

# Naruto - Fan art réaliste
curl -L "https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=400&h=400&fit=crop" -o naruto.jpg

# Sasuke - Homme asiatique mystérieux
curl -L "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop" -o sasuke.jpg

# Sakura - Femme asiatique cheveux roses
curl -L "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop" -o sakura.jpg

# Kakashi - Homme masqué
curl -L "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop" -o kakashi.jpg

# Hinata - Femme timide asiatique
curl -L "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop" -o hinata.jpg

# Itachi - Homme sombre
curl -L "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop" -o itachi.jpg

# Brad Pitt
curl -L "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop" -o brad.jpg

# Leonardo DiCaprio
curl -L "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop" -o leo.jpg

# Dwayne Johnson
curl -L "https://images.unsplash.com/photo-1605993439219-9d09d2020fa5?w=400&h=400&fit=crop" -o rock.jpg

# Scarlett Johansson
curl -L "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop" -o scarlett.jpg

# Margot Robbie
curl -L "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop" -o margot.jpg

# Emma Watson
curl -L "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop" -o emma.jpg

# Zendaya
curl -L "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop" -o zendaya.jpg

echo "✅ Photos téléchargées !"
ls -lh *.jpg
