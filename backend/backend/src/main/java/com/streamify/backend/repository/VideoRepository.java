package com.streamify.backend.repository;

import com.streamify.backend.model.Video;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface VideoRepository extends JpaRepository<Video, Long> {

    Page<Video> findByTitleContainingIgnoreCase(String q, Pageable pageable);

    @Modifying
    @Transactional
    @Query("UPDATE Video v SET v.views = v.views + 1 WHERE v.id = :id")
    void incrementViews(@Param("id") Long id);

    // Nuovo metodo per prendere i 5 video con più views, escludendo quello corrente
    List<Video> findTop5ByIdNotOrderByViewsDesc(Long id);

    List<Video> findTop5ByOwnerUsernameAndIdNotOrderByCreatedAtDesc(String ownerUsername, Long id);
}
