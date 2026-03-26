package com.hirepath.recruitment.service;

import java.io.IOException;
import java.net.URI;
import java.util.UUID;

import com.hirepath.recruitment.config.StorageProperties;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetUrlRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
public class StorageService {

    private final S3Client s3Client;
    private final StorageProperties properties;

    public StorageService(S3Client s3Client, StorageProperties properties) {
        this.s3Client = s3Client;
        this.properties = properties;
    }

    public String upload(String folder, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }
        String extension = StringUtils.getFilenameExtension(file.getOriginalFilename());
        String key = folder + "/" + UUID.randomUUID();
        if (StringUtils.hasText(extension)) {
            key = key + "." + extension;
        }

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                .bucket(properties.getBucket())
                .key(key)
                .contentType(file.getContentType())
                .build();
            s3Client.putObject(request, RequestBody.fromBytes(file.getBytes()));
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to upload file");
        }

        return buildUrl(key);
    }

    private String buildUrl(String key) {
        if (StringUtils.hasText(properties.getEndpoint())) {
            URI endpoint = URI.create(properties.getEndpoint());
            String base = endpoint.toString();
            if (base.endsWith("/")) {
                base = base.substring(0, base.length() - 1);
            }
            return base + "/" + properties.getBucket() + "/" + key;
        }
        return s3Client.utilities()
            .getUrl(GetUrlRequest.builder().bucket(properties.getBucket()).key(key).build())
            .toExternalForm();
    }
}
