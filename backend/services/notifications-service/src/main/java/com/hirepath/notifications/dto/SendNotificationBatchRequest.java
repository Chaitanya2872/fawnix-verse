package com.hirepath.notifications.dto;

import java.util.List;

public class SendNotificationBatchRequest {
    private List<SendNotificationRequest> items;

    public List<SendNotificationRequest> getItems() {
        return items;
    }

    public void setItems(List<SendNotificationRequest> items) {
        this.items = items;
    }
}
