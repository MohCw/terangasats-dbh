# Contexte de construction : la RACINE du dépôt (l'app importe ../verifier/ui)
#   docker build -f app/Dockerfile --build-arg VITE_VERIFIER_URL=https://... --build-arg VITE_BREEZ_API_KEY=... .
FROM node:22-alpine AS build
WORKDIR /repo
ARG VITE_VERIFIER_URL
ARG VITE_BREEZ_API_KEY
ENV VITE_VERIFIER_URL=$VITE_VERIFIER_URL VITE_BREEZ_API_KEY=$VITE_BREEZ_API_KEY
COPY app ./app
COPY verifier/core ./verifier/core
COPY verifier/ui ./verifier/ui
WORKDIR /repo/app
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=build /repo/app/dist /usr/share/nginx/html
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  location / { try_files $uri /index.html; }\n  location ~* \\.wasm$ { types { application/wasm wasm; } }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
