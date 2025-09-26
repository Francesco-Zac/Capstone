package com.streamify.backend.controller;

import com.streamify.backend.dto.CommentDto;
import com.streamify.backend.dto.VideoDto;
import com.streamify.backend.model.*;
import com.streamify.backend.repository.CommentRepository;
import com.streamify.backend.repository.UserRepository;
import com.streamify.backend.repository.VideoLikeRepository;
import com.streamify.backend.repository.VideoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.ByteBuffer;
import java.nio.channels.SeekableByteChannel;
import java.nio.file.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/videos")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class VideoController {

    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final VideoLikeRepository videoLikeRepository;
    private final Path storageRoot;

    public VideoController(VideoRepository videoRepository,
                           UserRepository userRepository,
                           CommentRepository commentRepository,
                           VideoLikeRepository videoLikeRepository,
                           @Value("${app.videos.path:videos}") String videosPath) {
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;
        this.commentRepository = commentRepository;
        this.videoLikeRepository = videoLikeRepository;
        this.storageRoot = Paths.get(videosPath).toAbsolutePath();
        try {
            Files.createDirectories(this.storageRoot);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                    @RequestParam("title") String title,
                                    @RequestParam(value = "description", required = false) String description,
                                    @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        try {
            String original = file.getOriginalFilename() != null ? Path.of(file.getOriginalFilename()).getFileName().toString() : "upload";
            String filename = UUID.randomUUID().toString() + "-" + original;
            Path target = storageRoot.resolve(filename);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
            Video v = new Video();
            v.setTitle(title);
            v.setDescription(description);
            v.setStoragePath(target.toString());
            v.setContentType(file.getContentType() != null ? file.getContentType() : "video/mp4");
            v.setFileSize(file.getSize());
            v.setCreatedAt(OffsetDateTime.now());
            Optional<User> u = userRepository.findByUsername(userDetails.getUsername());
            u.ifPresent(v::setOwner);
            v.setUrl("/api/videos/temp-" + UUID.randomUUID());
            Video saved = videoRepository.save(v);
            saved.setUrl("/api/videos/" + saved.getId());
            videoRepository.save(saved);
            return ResponseEntity.created(URI.create("/api/videos/" + saved.getId())).body(mapToDto(saved));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @RequestBody Map<String, String> body,
                                    @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        Optional<Video> opt = videoRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        Video v = opt.get();
        if (v.getOwner() == null || !v.getOwner().getUsername().equals(userDetails.getUsername()))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        if (body.containsKey("title")) v.setTitle(body.get("title"));
        if (body.containsKey("description")) v.setDescription(body.get("description"));
        return ResponseEntity.ok(mapToDto(videoRepository.save(v)));
    }

    @GetMapping
    public Page<VideoDto> list(@RequestParam(defaultValue = "0") int page,
                               @RequestParam(defaultValue = "10") int size) {
        return videoRepository.findAll(PageRequest.of(page, size)).map(this::mapToDto);
    }

    @GetMapping("/{id}")
    public ResponseEntity<VideoDto> get(@PathVariable Long id) {
        return videoRepository.findById(id)
                .map(video -> ResponseEntity.ok(mapToDto(video)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public Page<VideoDto> search(@RequestParam String q,
                                 @RequestParam(defaultValue = "0") int page,
                                 @RequestParam(defaultValue = "10") int size) {
        return videoRepository.findByTitleContainingIgnoreCase(q, PageRequest.of(page, size))
                .map(this::mapToDto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        Optional<Video> o = videoRepository.findById(id);
        if (o.isEmpty()) return ResponseEntity.notFound().build();
        Video v = o.get();

        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));


        boolean isAdmin = user.getRoles().contains(Role.ADMIN);
        if (!isAdmin && (v.getOwner() == null || !v.getOwner().getUsername().equals(user.getUsername()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Path p = Paths.get(v.getStoragePath());
        videoRepository.deleteById(id);
        try {
            Files.deleteIfExists(p);
        } catch (Exception ignored) {
        }
        return ResponseEntity.noContent().build();
    }


    @GetMapping("/{id}/stream")
    public ResponseEntity<byte[]> stream(@PathVariable Long id, @RequestHeader HttpHeaders headers) throws IOException {
        Video v = videoRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        Path path = Paths.get(v.getStoragePath());
        if (!Files.exists(path)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        long fileLength = Files.size(path);
        String rangeHeader = headers.getFirst(HttpHeaders.RANGE);
        long start = 0, end = fileLength - 1;
        if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
            String[] ranges = rangeHeader.replace("bytes=", "").split("-");
            try {
                start = Long.parseLong(ranges[0]);
                if (ranges.length > 1 && !ranges[1].isEmpty()) end = Long.parseLong(ranges[1]);
            } catch (NumberFormatException ex) {
                throw new ResponseStatusException(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
            }
        }
        if (start < 0 || start > end || start >= fileLength)
            throw new ResponseStatusException(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
        if (end >= fileLength) end = fileLength - 1;
        long contentLength = end - start + 1;
        byte[] data = new byte[(int) contentLength];
        try (SeekableByteChannel sbc = Files.newByteChannel(path, StandardOpenOption.READ)) {
            sbc.position(start);
            sbc.read(ByteBuffer.wrap(data));
        }
        HttpHeaders respHeaders = new HttpHeaders();
        respHeaders.set(HttpHeaders.CONTENT_TYPE, v.getContentType() != null ? v.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE);
        respHeaders.set(HttpHeaders.ACCEPT_RANGES, "bytes");
        respHeaders.set(HttpHeaders.CONTENT_LENGTH, String.valueOf(contentLength));
        respHeaders.set(HttpHeaders.CONTENT_RANGE, "bytes " + start + "-" + end + "/" + fileLength);
        if (start == 0) videoRepository.incrementViews(id);
        return new ResponseEntity<>(data, respHeaders, rangeHeader != null ? HttpStatus.PARTIAL_CONTENT : HttpStatus.OK);
    }

    @PostMapping("/{id}/likes")
    public ResponseEntity<?> like(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        Video v = videoRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        User user = userRepository.findByUsername(userDetails.getUsername()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        Optional<VideoLike> existing = videoLikeRepository.findByVideoAndUser(v, user);
        if (existing.isPresent())
            return ResponseEntity.ok(Map.of("likes", videoLikeRepository.countByVideo(v), "liked", true));
        VideoLike like = new VideoLike();
        like.setVideo(v);
        like.setUser(user);
        like.setCreatedAt(OffsetDateTime.now());
        videoLikeRepository.save(like);
        return ResponseEntity.ok(Map.of("likes", videoLikeRepository.countByVideo(v), "liked", true));
    }

    @DeleteMapping("/{id}/likes")
    public ResponseEntity<?> unlike(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        Video v = videoRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        User user = userRepository.findByUsername(userDetails.getUsername()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        videoLikeRepository.findByVideoAndUser(v, user).ifPresent(videoLikeRepository::delete);
        return ResponseEntity.ok(Map.of("likes", videoLikeRepository.countByVideo(v), "liked", false));
    }

    @GetMapping("/{id}/likes")
    public ResponseEntity<?> likesInfo(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        Video v = videoRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        long count = videoLikeRepository.countByVideo(v);
        boolean liked = false;
        if (userDetails != null) {
            liked = userRepository.findByUsername(userDetails.getUsername())
                    .flatMap(u -> videoLikeRepository.findByVideoAndUser(v, u))
                    .isPresent();
        }
        return ResponseEntity.ok(Map.of("likes", count, "liked", liked));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<?> comment(@PathVariable Long id, @RequestBody Map<String, String> body, @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String text = body.get("text");
        if (text == null || text.isBlank()) return ResponseEntity.badRequest().build();
        Video v = videoRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        User user = userRepository.findByUsername(userDetails.getUsername()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        Comment c = new Comment();
        c.setVideo(v);
        c.setAuthor(user);
        c.setText(text);
        c.setCreatedAt(OffsetDateTime.now());
        Comment saved = commentRepository.save(c);
        CommentDto dto = new CommentDto();
        dto.setId(saved.getId());
        dto.setAuthorUsername(saved.getAuthor() != null ? saved.getAuthor().getUsername() : null);
        dto.setText(saved.getText());
        dto.setCreatedAt(saved.getCreatedAt());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @GetMapping("/{id}/comments")
    public Page<CommentDto> listComments(@PathVariable Long id, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return commentRepository.findByVideoIdOrderByCreatedAtDesc(id, PageRequest.of(page, size))
                .map(c -> {
                    CommentDto dto = new CommentDto();
                    dto.setId(c.getId());
                    dto.setAuthorUsername(c.getAuthor() != null ? c.getAuthor().getUsername() : null);
                    dto.setText(c.getText());
                    dto.setCreatedAt(c.getCreatedAt());
                    return dto;
                });
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<?> deleteComment(@PathVariable Long commentId, @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        Comment c = commentRepository.findById(commentId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (c.getAuthor() == null || !c.getAuthor().getUsername().equals(userDetails.getUsername()))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        commentRepository.deleteById(commentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/related")
    public ResponseEntity<List<VideoDto>> related(@PathVariable Long id) {
        List<Video> relatedVideos = videoRepository.findTop5ByIdNotOrderByViewsDesc(id);
        List<VideoDto> dtos = relatedVideos.stream().map(this::mapToDto).toList();
        return ResponseEntity.ok(dtos);
    }

    private VideoDto mapToDto(Video v) {
        VideoDto dto = new VideoDto();
        dto.setId(v.getId());
        dto.setTitle(v.getTitle());
        dto.setDescription(v.getDescription());
        dto.setThumbnailUrl(v.getThumbnailPath());
        dto.setViews(v.getViews());
        dto.setOwnerUsername(v.getOwner() != null ? v.getOwner().getUsername() : null);
        dto.setCreatedAt(v.getCreatedAt());
        dto.setContentType(v.getContentType());
        dto.setFileSize(v.getFileSize());
        dto.setUrl("/api/videos/" + v.getId());
        return dto;
    }
}
