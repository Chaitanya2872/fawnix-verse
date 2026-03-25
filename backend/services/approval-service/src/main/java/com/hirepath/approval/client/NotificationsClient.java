package com.hirepath.approval.client;

import com.hirepath.approval.client.dto.SendNotificationRequest;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "notifications-service")
public interface NotificationsClient {

    @PostMapping("/internal/notifications/events")
    void send(@RequestBody SendNotificationRequest request);
}
