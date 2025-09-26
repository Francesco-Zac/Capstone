package com.streamify.backend.repository;

import com.streamify.backend.model.User;
import com.streamify.backend.model.Video;
import com.streamify.backend.model.VideoLike;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VideoLikeRepository extends JpaRepository<VideoLike, Long> {
    long countByVideo(Video video);

    Optional<VideoLike> findByVideoAndUser(Video video, User user);
}
