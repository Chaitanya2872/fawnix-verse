FROM mcr.microsoft.com/openjdk/jdk:21-ubuntu AS build
WORKDIR /app
RUN apt-get update && apt-get install -y maven ca-certificates && update-ca-certificates && rm -rf /var/lib/apt/lists/*
COPY pom.xml .
COPY maven-settings.xml /tmp/maven-settings.xml
COPY src ./src
RUN mvn -s /tmp/maven-settings.xml -q -DskipTests -Dmaven.wagon.http.ssl.insecure=true -Dmaven.wagon.http.ssl.allowall=true -Dmaven.wagon.http.retryHandler.count=3 -Dcom.sun.net.ssl.checkRevocation=false -Dcom.sun.security.enableCRLDP=false -Dcom.sun.security.enableAIAcaIssuers=false -Dhttps.protocols=TLSv1.2 -Djava.net.preferIPv4Stack=true -Djava.net.preferIPv4Addresses=true package

FROM mcr.microsoft.com/openjdk/jdk:21-ubuntu
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "/app/app.jar"]


