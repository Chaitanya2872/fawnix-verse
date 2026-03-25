package com.hirepath.notifications.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "notifications")
public class NotificationProperties {

    private final Stream stream = new Stream();
    private final Retries retries = new Retries();
    private final Deeplink deeplink = new Deeplink();
    private final Email email = new Email();
    private final Outbox outbox = new Outbox();

    public Stream getStream() {
        return stream;
    }

    public Retries getRetries() {
        return retries;
    }

    public Deeplink getDeeplink() {
        return deeplink;
    }

    public Email getEmail() {
        return email;
    }

    public Outbox getOutbox() {
        return outbox;
    }

    public static class Stream {
        private String name;
        private String group;
        private String consumer;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getGroup() {
            return group;
        }

        public void setGroup(String group) {
            this.group = group;
        }

        public String getConsumer() {
            return consumer;
        }

        public void setConsumer(String consumer) {
            this.consumer = consumer;
        }
    }

    public static class Retries {
        private int maxAttempts = 5;
        private int baseDelaySeconds = 30;

        public int getMaxAttempts() {
            return maxAttempts;
        }

        public void setMaxAttempts(int maxAttempts) {
            this.maxAttempts = maxAttempts;
        }

        public int getBaseDelaySeconds() {
            return baseDelaySeconds;
        }

        public void setBaseDelaySeconds(int baseDelaySeconds) {
            this.baseDelaySeconds = baseDelaySeconds;
        }
    }

    public static class Deeplink {
        private List<String> allowedOrigins;

        public List<String> getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(List<String> allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }
    }

    public static class Email {
        private String from;

        public String getFrom() {
            return from;
        }

        public void setFrom(String from) {
            this.from = from;
        }
    }

    public static class Outbox {
        private long scanMs = 10000;

        public long getScanMs() {
            return scanMs;
        }

        public void setScanMs(long scanMs) {
            this.scanMs = scanMs;
        }
    }
}
