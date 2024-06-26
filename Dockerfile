# Use the official Node.js image as base image
FROM node:latest AS app

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and yarn.lock to the working directory
COPY app/package.json app/yarn.lock ./

# Install dependencies
RUN yarn

# Copy the rest of the application code
COPY app .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=80
ENV SSL_PORT=443

# Expose ports
EXPOSE 80
EXPOSE 443

# Start the application
CMD ["npm", "start"]



