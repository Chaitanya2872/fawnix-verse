package com.hirepath.notifications.config;

import java.time.Duration;
import java.util.Map;

import com.hirepath.notifications.service.OutboxStreamListener;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.stream.StreamMessageListenerContainer;
import org.springframework.data.redis.stream.StreamMessageListenerContainer.StreamMessageListenerContainerOptions;

@Configuration
public class RedisStreamConfig {

    private static final Logger log = LoggerFactory.getLogger(RedisStreamConfig.class);

    @Bean(destroyMethod = "stop")
    public StreamMessageListenerContainer<String, MapRecord<String, String, String>> streamContainer(
        RedisConnectionFactory connectionFactory,
        NotificationProperties properties,
        OutboxStreamListener listener,
        StringRedisTemplate redisTemplate
    ) {
        ensureStreamAndGroup(redisTemplate, properties);

        StreamMessageListenerContainerOptions<String, MapRecord<String, String, String>> options =
            StreamMessageListenerContainerOptions.<String, MapRecord<String, String, String>>builder()
                .pollTimeout(Duration.ofSeconds(1))
                .build();

        StreamMessageListenerContainer<String, MapRecord<String, String, String>> container =
            StreamMessageListenerContainer.create(connectionFactory, options);

        String streamName = properties.getStream().getName();
        String group = properties.getStream().getGroup();
        String consumer = properties.getStream().getConsumer();

        container.receive(
            Consumer.from(group, consumer),
            StreamOffset.create(streamName, ReadOffset.lastConsumed()),
            listener
        );
        container.start();
        return container;
    }

    private void ensureStreamAndGroup(StringRedisTemplate redisTemplate, NotificationProperties properties) {
        String streamName = properties.getStream().getName();
        String group = properties.getStream().getGroup();
        StreamOperations<String, String, String> ops = redisTemplate.opsForStream();
        try {
            ops.add(streamName, Map.of("init", "1"));
        } catch (Exception ex) {
            log.warn("Unable to init stream {}: {}", streamName, ex.getMessage());
        }
        try {
            ops.createGroup(streamName, ReadOffset.latest(), group);
        } catch (Exception ex) {
            log.debug("Stream group already exists or cannot be created: {}", ex.getMessage());
        }
    }
}
