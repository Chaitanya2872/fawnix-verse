package com.hirepath.recruitment.client;

import com.hirepath.recruitment.client.dto.SendNotificationRequest;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "notifications-service")
public interface NotificationsClient {

    @PostMapping("/internal/notifications/events")
    Object sendEvent(@RequestBody SendNotificationRequest request);
}
