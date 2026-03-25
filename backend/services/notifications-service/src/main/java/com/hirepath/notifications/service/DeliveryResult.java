package com.hirepath.notifications.service;

public class DeliveryResult {
    private final boolean success;
    private final String error;

    private DeliveryResult(boolean success, String error) {
        this.success = success;
        this.error = error;
    }

    public static DeliveryResult ok() {
        return new DeliveryResult(true, null);
    }

    public static DeliveryResult failed(String error) {
        return new DeliveryResult(false, error);
    }

    public boolean isSuccess() {
        return success;
    }

    public String getError() {
        return error;
    }
}
