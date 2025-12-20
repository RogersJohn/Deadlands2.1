FROM node:18-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy test files
COPY . .

# Copy and make wait script executable
COPY wait-for-grid.sh /wait-for-grid.sh
RUN chmod +x /wait-for-grid.sh

# Create reports directory
RUN mkdir -p reports

# Wait for Selenium Grid then run tests
CMD ["/bin/sh", "-c", "/wait-for-grid.sh http://selenium-hub:4444 && npm test"]
