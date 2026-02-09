# build
FROM node:18-alpine AS builder

# Create app directory
WORKDIR /usr/src/bot

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (dev + prod) for building
RUN npm ci

# Copy the rest of the source code
COPY . .

# create runtime
FROM node:18-alpine

WORKDIR /usr/src/bot

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder stage (or source if JS)
COPY --from=builder /usr/src/bot .

# Start the bot
CMD ["node", "oh-wow.js"]