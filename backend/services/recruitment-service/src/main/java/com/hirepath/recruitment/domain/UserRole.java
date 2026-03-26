package com.hirepath.recruitment.domain;

public enum UserRole {
    ADMIN("admin"),
    HR_MANAGER("hr_manager"),
    RECRUITER("recruiter"),
    HIRING_MANAGER("hiring_manager"),
    INTERVIEWER("interviewer"),
    EMPLOYEE("employee");

    private final String value;

    UserRole(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static UserRole fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (UserRole role : values()) {
            if (role.value.equalsIgnoreCase(value)) {
                return role;
            }
        }
        return null;
    }
}
