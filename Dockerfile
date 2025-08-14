# Use an official Node.js runtime as a parent image
FROM node:lts-alpine3.22

# Set the working directory to /app
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install dependencies
RUN npm install

# Build the application
RUN npm run build

# Expose port 3000
EXPOSE 4000

# Start the application
CMD ["npm", "start"]
