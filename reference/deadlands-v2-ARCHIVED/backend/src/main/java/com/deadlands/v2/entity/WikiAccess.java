package com.deadlands.v2.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "wiki_access",
       uniqueConstraints = @UniqueConstraint(columnNames = {"wiki_entry_id", "user_id"}))
public class WikiAccess {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wiki_entry_id", nullable = false)
    private WikiEntry wikiEntry;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "granted_by_id")
    private User grantedBy;

    @Column(name = "grant_reason", length = 255)
    private String grantReason;

    @Column(name = "granted_at", nullable = false, updatable = false)
    private LocalDateTime grantedAt;

    public WikiAccess() {
    }

    public WikiAccess(WikiEntry wikiEntry, User user, User grantedBy, String grantReason) {
        this.wikiEntry = wikiEntry;
        this.user = user;
        this.grantedBy = grantedBy;
        this.grantReason = grantReason;
    }

    @PrePersist
    protected void onCreate() {
        grantedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public WikiEntry getWikiEntry() {
        return wikiEntry;
    }

    public void setWikiEntry(WikiEntry wikiEntry) {
        this.wikiEntry = wikiEntry;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public User getGrantedBy() {
        return grantedBy;
    }

    public void setGrantedBy(User grantedBy) {
        this.grantedBy = grantedBy;
    }

    public String getGrantReason() {
        return grantReason;
    }

    public void setGrantReason(String grantReason) {
        this.grantReason = grantReason;
    }

    public LocalDateTime getGrantedAt() {
        return grantedAt;
    }
}
