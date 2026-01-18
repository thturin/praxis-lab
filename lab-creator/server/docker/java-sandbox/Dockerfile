FROM eclipse-temurin:17-jdk-alpine

# Install Maven for compiling and running Java code
RUN apk add --no-cache maven

# Create non-root user for security
RUN addgroup -S sandbox && adduser -S sandbox -G sandbox

# Set working directory
WORKDIR /workspace

# Pre-install JUnit for test execution
RUN mkdir -p /home/sandbox/.m2 && \
    chown -R sandbox:sandbox /home/sandbox

# Switch to non-root user
USER sandbox

# PRE-DOWNLOAD JUnit dependencies (optimization)
RUN echo '<?xml version="1.0" encoding="UTF-8"?><project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion><groupId>edu.platform</groupId><artifactId>temp</artifactId><version>1.0</version><dependencies><dependency><groupId>org.junit.jupiter</groupId><artifactId>junit-jupiter</artifactId><version>5.10.0</version></dependency></dependencies></project>' > /tmp/pom.xml && \
    mvn -f /tmp/pom.xml dependency:resolve && \
    rm /tmp/pom.xml

    #build command: docker build -t java-grading-sandbox:latest ./lab-creator/server/docker/java-sandbox 


# Why PRE-DOWNLOAD?
# Without pre-downloading:

# Student submits code
#   → Container starts
#   → Maven runs `mvn clean test`
#   → Maven: "I need JUnit!"
#   → Maven downloads JUnit from internet (10-30 seconds) ⏱️
#   → Runs tests
#   → Container stops
# With pre-downloading:

# Student submits code
#   → Container starts
#   → Maven runs `mvn clean test`
#   → Maven: "I need JUnit!"
#   → Maven: "Oh! It's already in .m2/repository!" ✅
#   → Runs tests immediately (1-5 seconds) ⚡
#   → Container stops