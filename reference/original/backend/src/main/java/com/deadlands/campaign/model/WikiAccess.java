package com.deadlands.campaign.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Tracks which users have been granted access to private wiki entries.
 * GM can grant access to players over time as they discover secrets.
 */
@Entity
@Table(name = "wiki_access", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"wiki_entry_id", "user_id"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class WikiAccess {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wiki_entry_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "accessGrants"})
    private WikiEntry wikiEntry;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password"})
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "granted_by")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password"})
    private User grantedBy; // GM who granted access

    @Column(length = 500)
    private String grantReason; // Why was access granted? (e.g., "Discovered Bob's secret in Session 5")

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime grantedAt;
}
