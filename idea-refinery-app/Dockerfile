# Use Node.js LTS (Long Term Support) version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install root dependencies
RUN npm install

# Copy server package files
COPY server/package*.json ./server/

# Install server dependencies
RUN cd server && npm install

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Expose the port the app runs on
EXPOSE 3001

# Start the server
CMD ["npm", "run", "server"]
