FROM gradle:8.6-jdk17 as builder
WORKDIR /home/gradle/project
COPY . /home/gradle/project
# Use gradlew if present, else the container's gradle
RUN if [ -f ./gradlew ]; then chmod +x ./gradlew && ./gradlew --no-daemon shadowJar; else gradle --no-daemon shadowJar; fi

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=builder /home/gradle/project/build/libs/*.jar /app/ameba-sidecar.jar
EXPOSE 4001
CMD ["java", "-jar", "/app/ameba-sidecar.jar"]
