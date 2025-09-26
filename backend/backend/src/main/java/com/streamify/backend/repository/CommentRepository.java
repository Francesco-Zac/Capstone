package com.streamify.backend.repository;

import com.streamify.backend.model.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    Page<Comment> findByVideoIdOrderByCreatedAtDesc(Long videoId, Pageable pageable);
}
