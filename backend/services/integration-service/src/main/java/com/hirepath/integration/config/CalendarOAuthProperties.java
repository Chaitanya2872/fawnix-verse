package com.hirepath.integration.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "calendar")
public class CalendarOAuthProperties {

    private String oauthSuccessRedirect = "http://localhost:5173/settings/calendar-integrations";
    private Provider google = new Provider();
    private Provider microsoft = new Provider();

    public String getOauthSuccessRedirect() {
        return oauthSuccessRedirect;
    }

    public void setOauthSuccessRedirect(String oauthSuccessRedirect) {
        this.oauthSuccessRedirect = oauthSuccessRedirect;
    }

    public Provider getGoogle() {
        return google;
    }

    public Provider getMicrosoft() {
        return microsoft;
    }

    public static class Provider {
        private String clientId;
        private String clientSecret;
        private String redirectUri;
        private String scopes;

        public String getClientId() {
            return clientId;
        }

        public void setClientId(String clientId) {
            this.clientId = clientId;
        }

        public String getClientSecret() {
            return clientSecret;
        }

        public void setClientSecret(String clientSecret) {
            this.clientSecret = clientSecret;
        }

        public String getRedirectUri() {
            return redirectUri;
        }

        public void setRedirectUri(String redirectUri) {
            this.redirectUri = redirectUri;
        }

        public String getScopes() {
            return scopes;
        }

        public void setScopes(String scopes) {
            this.scopes = scopes;
        }
    }
}
