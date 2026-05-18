# =============================================================
# Stage 1: build — Angular production build
# =============================================================
FROM node:20-alpine AS build

WORKDIR /app

# Kopiuj package.json i zablokowany lockfile — cache warstwy node_modules
COPY package*.json ./
RUN npm ci --prefer-offline

# Kopiuj źródła i buduj produkcyjnie
COPY . .
RUN npx ng build --configuration=production

# =============================================================
# Stage 2: runtime — Nginx serwuje pliki statyczne
# =============================================================
FROM nginx:alpine AS runtime

# Skopiuj wynik buildu do katalogu nginx
COPY --from=build /app/dist/furniture-front/browser /usr/share/nginx/html

# Konfiguracja Nginx dla Angular SPA (try_files dla client-side routing)
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
