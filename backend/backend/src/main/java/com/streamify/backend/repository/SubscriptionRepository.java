package com.streamify.backend.repository;

import com.streamify.backend.model.Subscription;
import com.streamify.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    long countByTarget(User target);

    Optional<Subscription> findBySubscriberAndTarget(User subscriber, User target);

    boolean existsBySubscriberAndTarget(User subscriber, User target);

    void deleteBySubscriberAndTarget(User subscriber, User target);
}
