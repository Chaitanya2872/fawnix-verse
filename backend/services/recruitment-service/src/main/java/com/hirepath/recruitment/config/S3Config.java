package com.hirepath.recruitment.config;

import java.net.URI;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.S3Configuration;

@Configuration
@EnableConfigurationProperties(StorageProperties.class)
public class S3Config {

    @Bean
    public S3Client s3Client(StorageProperties props) {
        AwsCredentialsProvider credentialsProvider;
        if (StringUtils.hasText(props.getAccessKey()) && StringUtils.hasText(props.getSecretKey())) {
            credentialsProvider = StaticCredentialsProvider.create(
                AwsBasicCredentials.create(props.getAccessKey(), props.getSecretKey())
            );
        } else {
            credentialsProvider = DefaultCredentialsProvider.create();
        }

        S3ClientBuilder builder = S3Client.builder()
            .credentialsProvider(credentialsProvider)
            .region(Region.of(StringUtils.hasText(props.getRegion()) ? props.getRegion() : "us-east-1"));

        if (StringUtils.hasText(props.getEndpoint())) {
            builder = builder
                .endpointOverride(URI.create(props.getEndpoint()))
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build());
        }

        return builder.build();
    }
}
