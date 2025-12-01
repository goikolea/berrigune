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

# --- NEW: Create the data directory and the local database directory ---
# We create /app/data for Production mounting
# We keep server/database owned by node for robustness
RUN mkdir -p /app/data && mkdir -p server/database

# Grant permission to the 'node' user for both locations
RUN chown -R node:node /app/data && chown -R node:node server/database

# Switch to non-root user for security
USER node

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]