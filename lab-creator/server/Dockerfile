FROM node:18-alpine

# Install JDK 17 and Maven for Java code grading (replaces Docker-in-Docker for Railway)
RUN apk add --no-cache openjdk17 maven

WORKDIR /app

COPY package*.json ./
RUN npm install

#copy prisma folder from build context (host machine)
#int oa folder named prisma in the containers current working directory
COPY prisma ./prisma
#need to create @prisma in node_modules
RUN npx prisma generate --schema=./prisma/schema.prisma

COPY . .

# Optional: Pre-download Maven/JUnit dependencies for faster first execution
#you will need to use this when you create an offline container 
# Comment out for local dev to speed up builds, uncomment for production deployments
# RUN mkdir -p /tmp/mvn-warmup/src/main/java /tmp/mvn-warmup/src/test/java && \
#     echo 'public class Dummy {}' > /tmp/mvn-warmup/src/main/java/Dummy.java && \
#     echo 'import org.junit.jupiter.api.Test; import static org.junit.jupiter.api.Assertions.*; public class DummyTest { @Test public void test() { assertTrue(true); } }' > /tmp/mvn-warmup/src/test/java/DummyTest.java && \
#     cp docker/java-sandbox/pom.xml /tmp/mvn-warmup/pom.xml && \
#     cd /tmp/mvn-warmup && mvn clean test && \
#     rm -rf /tmp/mvn-warmup

# RUN mkdir -p /app/uploads && chown node:node /app/uploads
# VOLUME /app/uploads

EXPOSE 4000

# CMD ["npx","nodemon", "app.js"]
# Production run: plain node (nodemon is provided via docker-compose.override.yml for local dev)
CMD ["node", "app.js"]
