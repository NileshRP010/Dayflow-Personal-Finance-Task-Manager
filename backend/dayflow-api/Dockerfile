FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw
COPY src src
RUN ./mvnw -B -Dmaven.test.skip=true package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar /app/dayflow-api.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/dayflow-api.jar"]
