FROM eclipse-temurin:17-jdk-alpine

# Install Maven for compiling and running Java code
RUN apk add --no-cache maven

# Set working directory
WORKDIR /workspace

# The /tmp/pom.xml in the Dockerfile is just a "dummy" to pre-populate
# the Maven cache. The real pom.xml comes from your code at runtime.
COPY pom.xml /tmp/pom.xml

# PRE-DOWNLOAD JUnit and Surefire dependencies (optimization)
# Surefire is the Maven test plugin - it must be pre-downloaded since network is off at runtime
# PRE-DOWNLOAD dependencies - go-offline + resolve all dependencies transitively
#RUN mvn -f /tmp/pom.xml dependency:go-offline dependency:resolve dependency:resolve-plugins && rm /tmp/pom.xml
# Create dummy test structure to force surefire to resolve ALL dependencies
RUN mkdir -p /tmp/src/main/java /tmp/src/test/java && \
    echo 'public class Dummy {}' > /tmp/src/main/java/Dummy.java && \
    echo 'import org.junit.jupiter.api.Test; import static org.junit.jupiter.api.Assertions.*; public class DummyTest { @Test public void test() { assertTrue(true); } }' > /tmp/src/test/java/DummyTest.java

#the go-offline ensures all dependencies of a dependency listed in pom.xml is downloaded


#the pom.xml file is deleted after dependencies are downloaded to keep the image size small
#pom.xml file gets copied into the container at runtime when the student code is copied


# Run actual test to force Maven to download everything
# This downloads all plugins, dependencies, and transitive dependencies
RUN cd /tmp && mvn clean test && cd / && rm -rf /tmp/*
    

#//node lab-creator/server/docker/java-sandbox/build-sandbox.js
#build command: docker build -t java-grading-sandbox:latest ./lab-creator/server/docker/java-sandbox



# Why PRE-DOWNLOAD?
# Without pre-downloading:  the containers starts and network mode is off anyways... there is not internet access

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