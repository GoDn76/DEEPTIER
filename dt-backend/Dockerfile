FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app

RUN useradd --create-home --uid 10001 appuser
COPY --from=build /app/target/dt-backend-*.jar /app/app.jar
RUN chown appuser:appuser /app/app.jar

USER appuser
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD ["sh", "-c", "exec 3<>/dev/tcp/127.0.0.1/8080"]

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
