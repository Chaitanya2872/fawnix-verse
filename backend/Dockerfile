FROM maven:3.9.9-eclipse-temurin-17 AS build

ARG MODULE_PATH

WORKDIR /workspace

COPY backend ./backend

RUN mvn -q -DskipTests -pl ${MODULE_PATH} -am package -f backend/pom.xml

RUN set -eux; \
    JAR_PATH="$(find "backend/${MODULE_PATH}/target" -maxdepth 1 -type f -name '*.jar' ! -name '*-plain.jar' ! -name '*.original' | head -n 1)"; \
    test -n "${JAR_PATH}"; \
    cp "${JAR_PATH}" /workspace/app.jar

FROM eclipse-temurin:17-jre-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY --from=build /workspace/app.jar /app/app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
