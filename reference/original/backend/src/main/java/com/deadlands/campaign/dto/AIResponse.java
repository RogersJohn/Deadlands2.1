package com.deadlands.campaign.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AIResponse {
    private String content;
    private long timestamp;

    public AIResponse(String content) {
        this.content = content;
        this.timestamp = System.currentTimeMillis();
    }
}
