FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install root dependencies (skip dev)
RUN npm install --production

# Copy everything else
COPY . .

# Build client app
WORKDIR /app/client
RUN npm install
RUN npm run build

# Back to root
WORKDIR /app

# Expose port 3001
EXPOSE 3001

# Start production server
CMD ["node", "server-prod.js"]
