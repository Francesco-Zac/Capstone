package com.streamify.backend.controller;

import com.streamify.backend.model.Subscription;
import com.streamify.backend.model.User;
import com.streamify.backend.repository.SubscriptionRepository;
import com.streamify.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/channels")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class SubscriptionController {

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;

    public SubscriptionController(SubscriptionRepository subscriptionRepository, UserRepository userRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/{username}/subscribe")
    public ResponseEntity<?> info(@PathVariable String username, @AuthenticationPrincipal UserDetails userDetails) {
        User target = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        long count = subscriptionRepository.countByTarget(target);
        boolean subscribed = false;
        if (userDetails != null) {
            User subscriber = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
            subscribed = subscriptionRepository.existsBySubscriberAndTarget(subscriber, target);
        }
        return ResponseEntity.ok(Map.of("count", count, "subscribed", subscribed));
    }

    @PostMapping("/{username}/subscribe")
    public ResponseEntity<?> subscribe(@PathVariable String username, @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User target = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        User subscriber = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        if (target.getId().equals(subscriber.getId())) {
            return ResponseEntity.badRequest().body(Map.of("error", "cannot_subscribe_to_self"));
        }

        if (!subscriptionRepository.existsBySubscriberAndTarget(subscriber, target)) {
            Subscription s = new Subscription();
            s.setSubscriber(subscriber);
            s.setTarget(target);
            s.setCreatedAt(OffsetDateTime.now());
            subscriptionRepository.save(s);
        }

        long count = subscriptionRepository.countByTarget(target);
        return ResponseEntity.ok(Map.of("count", count, "subscribed", true));
    }

    @DeleteMapping("/{username}/subscribe")
    public ResponseEntity<?> unsubscribe(@PathVariable String username, @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User target = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        User subscriber = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        subscriptionRepository.findBySubscriberAndTarget(subscriber, target)
                .ifPresent(subscriptionRepository::delete);

        long count = subscriptionRepository.countByTarget(target);
        return ResponseEntity.ok(Map.of("count", count, "subscribed", false));
    }
}
