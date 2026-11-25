# Stage 1: Build the Vite + React application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package configuration files
COPY package*.json ./

# Install dependencies (using clean-install)
RUN npm ci

# Copy the rest of the application files
COPY . .


# Build-time BHIV Auth configuration (API origin vs independent Login SPA origin)
# Pass `--build-arg VITE_AUTH_UI_URL=<confirmed-login-spa-origin>` once confirmed; never falls back to API origin.
ARG VITE_AUTH_SERVER_URL="https://auth.blackholeinfiverse.com"
ARG VITE_AUTH_UI_URL=""
ENV VITE_AUTH_SERVER_URL=${VITE_AUTH_SERVER_URL}
ENV VITE_AUTH_UI_URL=${VITE_AUTH_UI_URL}

# Set non-sensitive environment variables directly in the Dockerfile
ENV VITE_CONTROL_PLANE_URL="/api/control-plane"
ENV VITE_BUCKET_SERVICE_URL="/api/bucket"
ENV VITE_PRANA_SERVICE_URL="/api/prana"
ENV VITE_NIYANTRAN_URL="https://niyantran.blackholeinfiverse.com"
ENV VITE_INSIGHTFLOW_URL="/api/insightflow"
ENV VITE_TANTRA_BASE_URL="/api/tantra"
ENV VITE_RAJYA_BASE_URL="/api/rajya"
ENV VITE_SANSKAR_BASE_URL="/api/sanskar"
ENV VITE_KARMA_URL="/api/karma"
ENV VITE_KESHAV_URL="/api/keshav"
ENV VITE_SETU_URL="https://setu.blackholeinfiverse.com"
ENV VITE_PRAVAH_URL="/api/pravah"

# Build the production bundle
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache curl && npm install -g serve
COPY --from=build /app/dist ./dist
RUN adduser --disabled-password --gecos "" frontend && \
    chown -R frontend:frontend /app
USER frontend
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]

