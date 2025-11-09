# AquaMind Irrigation Controller - Production Dockerfile

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Expose ports
EXPOSE 3001 3003

# Set production environment
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
