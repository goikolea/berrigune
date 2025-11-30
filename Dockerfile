# Use Node 20 (Debian Slim) for stability with SQLite
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package definition first to cache dependencies
COPY package*.json ./

# Install dependencies (only production ones)
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Create the database directory and ensure 'node' user owns it
RUN mkdir -p server/database && chown -R node:node server/database

# Switch to non-root user for security
USER node

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]