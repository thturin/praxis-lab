FROM node:18-bullseye-slim

ARG GRADLE_VERSION=8.5

RUN apt-get update && \
    apt-get install -y --no-install-recommends git openjdk-17-jdk wget unzip ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN wget -q https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip -O /tmp/gradle.zip && \
    unzip -q /tmp/gradle.zip -d /opt && \
    ln -s /opt/gradle-${GRADLE_VERSION}/bin/gradle /usr/local/bin/gradle && \
    rm /tmp/gradle.zip

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="$PATH:/opt/gradle-${GRADLE_VERSION}/bin"

WORKDIR /app

# Copy package files first for better cache
COPY ./package*.json ./
COPY prisma ./prisma
# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate 


# Copy the rest of your server code
COPY . .

EXPOSE 5000

# Production run: plain node (nodemon is provided via docker-compose.override.yml for local dev)
CMD ["node", "app.js"]

