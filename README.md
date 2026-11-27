# StreamHub

Toutes vos plateformes de streaming réunies dans une seule appli Android (et une version web installable). StreamHub ne lit aucune vidéo et ne voit jamais vos mots de passe : chaque tuile ouvre l'appli officielle (Netflix, Disney+, Prime Video...) où vous êtes déjà connecté.

## Ce qu'elle fait

- **Accueil** : une tuile par service choisi, un appui ouvre l'appli du service.
- **Recherche** : cherche un film ou une série et dit sur quelle plateforme il se trouve en France (TMDB, clé gratuite).
- **Ma liste** : à regarder, déjà vu, avec la plateforme de chaque titre.
- **Direct** : chaînes gratuites (Arte, France 24, franceinfo...) et liens YouTube, Dailymotion, Twitch ou Arte collés.
- **VPN** : indique si un VPN est actif et ouvre l'appli VPN de votre choix.
- **Synchro** (facultative) : seulement si vous entrez l'adresse de votre propre serveur de synchro.

Toutes les données restent sur l'appareil.

## Installer

Téléchargez l'APK dans la page **Releases** et ouvrez-le sur le téléphone (autoriser l'installation depuis cette source).

## Construire depuis le code

1. Mettez une clé TMDB gratuite (https://www.themoviedb.org/settings/api) : `python tools/make_key.py` lit `TMDB_API_KEY` dans un fichier `.env` placé à côté du dossier du dépôt.
2. Créez votre clé de signature avec `keytool` et remplissez `android/keystore.properties` (`storeFile`, `storePassword`, `keyAlias`, `keyPassword`), jamais dans git.
3. Avec JDK 17 et Gradle 8 : `cd android` puis `gradle assembleRelease` (APK) ou `gradle bundleRelease` (Google Play).

Tester sur le PC : `python -m http.server 8097 --bind 127.0.0.1`, puis ouvrir http://127.0.0.1:8097.

Le dossier `site/` contient la page de présentation et la politique de confidentialité.

## Licence

MIT, voir `LICENSE`. Le filtre AdGuard DNS téléchargé par l'appli est sous GPL-3.0.
