package com.hirepath.recruitment.util;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class PublicFormRateLimiter {

    private final int capacity;
    private final long refillMillis;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public PublicFormRateLimiter(
        @Value("${app.public-forms.rate-limit.max:10}") int capacity,
        @Value("${app.public-forms.rate-limit.window-seconds:300}") int windowSeconds
    ) {
        this.capacity = capacity;
        this.refillMillis = Math.max(1000L, windowSeconds * 1000L);
    }

    public RateLimitResult allow(String key) {
        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(capacity, Instant.now().toEpochMilli()));
        synchronized (bucket) {
            refill(bucket);
            if (bucket.tokens >= 1d) {
                bucket.tokens -= 1d;
                return RateLimitResult.permit();
            }
            long retryAfter = Math.max(1, Math.round((1d - bucket.tokens) * refillMillis / capacity));
            return RateLimitResult.deny(retryAfter);
        }
    }

    private void refill(Bucket bucket) {
        long now = Instant.now().toEpochMilli();
        long elapsed = now - bucket.lastRefill;
        if (elapsed <= 0) {
            return;
        }
        double tokensToAdd = (elapsed / (double) refillMillis) * capacity;
        bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
    }

    private static class Bucket {
        private double tokens;
        private long lastRefill;

        private Bucket(double tokens, long lastRefill) {
            this.tokens = tokens;
            this.lastRefill = lastRefill;
        }
    }

    public record RateLimitResult(boolean allowed, long retryAfterSeconds) {
        public static RateLimitResult permit() {
            return new RateLimitResult(true, 0);
        }

        public static RateLimitResult deny(long retryAfterSeconds) {
            return new RateLimitResult(false, retryAfterSeconds);
        }
    }
}
