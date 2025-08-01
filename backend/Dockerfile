FROM node:20-slim

# Install compilers and runtimes for C, C++, Java, and Python
RUN echo "deb http://deb.debian.org/debian bullseye main" > /etc/apt/sources.list.d/bullseye.list && \
    apt-get update --fix-missing && \
    apt-get install -y gcc g++ openjdk-11-jdk python3 && \
    rm -rf /var/lib/apt/lists/* && \
    rm /etc/apt/sources.list.d/bullseye.list

# Create a temporary directory and set permissions
RUN mkdir -p /app/temp && \
    chown -R node:node /app/temp && \
    chmod -R 775 /app/temp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy the rest of your code
COPY server.js .

# Expose app port
EXPOSE 3000

# Start server as node user
USER node
CMD ["node", "server.js"]