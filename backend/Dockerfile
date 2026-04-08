FROM maven:3.9.9-eclipse-temurin-17 AS build

ARG MODULE_PATH
ENV MAVEN_OPTS="-Dhttps.protocols=TLSv1.2 -Djdk.tls.client.protocols=TLSv1.2 -Dmaven.wagon.http.retryHandler.count=3 -Dmaven.wagon.http.retryHandler.requestSentEnabled=true -Dcom.sun.net.ssl.checkRevocation=false -Dcom.sun.security.enableCRLDP=false -Dcom.sun.security.enableAIAcaIssuers=false -Djava.net.preferIPv4Stack=true -Djava.net.preferIPv4Addresses=true"

WORKDIR /workspace

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY backend ./backend

RUN set -eux; \
    for attempt in 1 2 3; do \
      mvn -s backend/maven-settings.xml -q -DskipTests -Dmaven.wagon.http.ssl.insecure=true -Dmaven.wagon.http.ssl.allowall=true -pl "${MODULE_PATH}" -am package -f backend/pom.xml && break; \
      if [ "$attempt" -eq 3 ]; then exit 1; fi; \
      echo "Maven build failed on attempt $attempt, retrying..."; \
      sleep 10; \
    done

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
