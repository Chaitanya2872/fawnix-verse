package com.hirepath.forms.client;

import com.hirepath.forms.client.dto.NotificationEventRequest;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "notifications-service")
public interface NotificationsClient {

    @PostMapping("/internal/notifications/events")
    Object sendEvent(@RequestBody NotificationEventRequest request);
}
