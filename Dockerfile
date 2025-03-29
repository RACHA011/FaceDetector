# syntax=docker/dockerfile:1

# Create a stage for resolving and downloading dependencies
FROM eclipse-temurin:21-jdk-jammy as deps

WORKDIR /build

# Copy Maven wrapper and project files
COPY --chmod=0755 mvnw mvnw
COPY .mvn/ .mvn/
COPY pom.xml ./

# Download dependencies
RUN --mount=type=bind,source=pom.xml,target=pom.xml \
    --mount=type=cache,target=/root/.m2 ./mvnw dependency:go-offline -DskipTests

# Create a stage for building the application
FROM deps as package

WORKDIR /build

# Copy source code
COPY ./src src/

# Package the application
RUN --mount=type=bind,source=pom.xml,target=pom.xml \
    --mount=type=cache,target=/root/.m2 \
    ./mvnw package -DskipTests && \
    mv target/$(./mvnw help:evaluate -Dexpression=project.artifactId -q -DforceStdout)-$(./mvnw help:evaluate -Dexpression=project.version -q -DforceStdout).jar target/app.jar

# Create a stage for extracting layers
FROM package as extract

WORKDIR /build

RUN java -Djarmode=layertools -jar target/app.jar extract --destination target/extracted

# Final runtime stage
FROM eclipse-temurin:21-jre-jammy AS final

# Create a non-privileged user
ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser
USER appuser

# Copy extracted layers
COPY --from=extract build/target/extracted/dependencies/ ./
COPY --from=extract build/target/extracted/spring-boot-loader/ ./
COPY --from=extract build/target/extracted/snapshot-dependencies/ ./
COPY --from=extract build/target/extracted/application/ ./

# Copy OpenCV resources
COPY src/main/resources/static/opencv /app/resources/static/opencv

# Expose the application port
EXPOSE 8080

# Set the entrypoint
ENTRYPOINT [ "java", "org.springframework.boot.loader.launch.JarLauncher" ]