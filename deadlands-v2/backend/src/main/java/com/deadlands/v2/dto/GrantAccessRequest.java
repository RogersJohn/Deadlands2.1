package com.deadlands.v2.dto;

import jakarta.validation.constraints.Size;

public class GrantAccessRequest {

    @Size(max = 255, message = "Reason must be less than 255 characters")
    private String reason;

    public GrantAccessRequest() {
    }

    public GrantAccessRequest(String reason) {
        this.reason = reason;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
