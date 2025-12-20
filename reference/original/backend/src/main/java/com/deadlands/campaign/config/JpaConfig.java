package com.deadlands.campaign.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * JPA Configuration for enabling auditing features.
 *
 * Separated from main application class to allow easier exclusion in tests.
 */
@Configuration
@EnableJpaAuditing
public class JpaConfig {
    // Configuration class for JPA auditing
}
