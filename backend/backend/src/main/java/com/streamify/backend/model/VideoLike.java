package com.streamify.backend.model;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "video_like", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"video_id", "user_id"})
})
public class VideoLike {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Video video;

    @ManyToOne(optional = false)
    private User user;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Video getVideo() {
        return video;
    }

    public void setVideo(Video video) {
        this.video = video;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
