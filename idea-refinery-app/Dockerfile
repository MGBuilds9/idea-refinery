# Use Node.js LTS (Long Term Support) version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Expose the port the app runs on
EXPOSE 3001

# Start the server
CMD ["npm", "run", "server"]
