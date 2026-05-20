package com.hirepath.task.client.dto;

public class NotificationContentRequest {
  private String title;
  private String bodyText;

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getBodyText() {
    return bodyText;
  }

  public void setBodyText(String bodyText) {
    this.bodyText = bodyText;
  }
}
