# Plan: Fix Offline Maven Dependencies in Docker Sandbox

## Problem
RUN mvn -f /tmp/pom.xml -B \
    test -DskipTests \
 && rm /tmp/pom.xml
Maven's surefire plugin does **lazy dependency resolution**. 
When you run `mvn test -DskipTests`, it doesn't actually trigger surefire to resolve the 
JUnit platform launcher because there's no test code to scan.

## Root Cause
The Dockerfile only has a pom.xml but no actual test files, so Maven never fully 
initializes the surefire plugin and doesn't download `junit-platform-launcher`.

## Solution
Create a dummy test file during the Docker build so Maven actually runs the surefire plugin
 and downloads ALL dependencies including transitive ones.





 Maven will run the junit tests and download dependencies that are needed. 
 You current setup won't work since the container is offline, the tests
 are run in the offline container to dependencies can't be downloaded.

 # Create dummy test structure to force surefire to resolve ALL dependencies
RUN mkdir -p /tmp/src/main/java /tmp/src/test/java && \
    echo 'public class Dummy {}' > /tmp/src/main/java/Dummy.java && \
    echo 'import org.junit.jupiter.api.Test; import static org.junit.jupiter.api.Assertions.*; public class DummyTest { @Test public void test() { assertTrue(true); } }' > /tmp/src/test/java/DummyTest.java



# Why Previous Attempts Failed
- `dependency:go-offline` - doesn't trigger surefire's test provider resolution
- `dependency:resolve` - only resolves declared dependencies, not dynamic plugin deps
- `test -DskipTests` - skips test execution so surefire never scans for test files
- Missing test file - surefire had nothing to scan, so it never knew it needed junit-platform-launcher
