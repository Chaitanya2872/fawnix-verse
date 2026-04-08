package com.hirepath.forms.controller;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hirepath.forms.domain.ApplicationFieldType;
import com.hirepath.forms.domain.ApplicationForm;
import com.hirepath.forms.domain.ApplicationFormCollection;
import com.hirepath.forms.domain.ApplicationFormFavorite;
import com.hirepath.forms.domain.ApplicationFormField;
import com.hirepath.forms.domain.ApplicationFormLink;
import com.hirepath.forms.domain.ApplicationFormStatus;
import com.hirepath.forms.domain.ApplicationFormTemplate;
import com.hirepath.forms.domain.ApplicationFormVersion;
import com.hirepath.forms.domain.FormFieldSnapshot;
import com.hirepath.forms.domain.FormLinkStatus;
import com.hirepath.forms.dto.CollectionCreateRequest;
import com.hirepath.forms.dto.FormCreateRequest;
import com.hirepath.forms.dto.FormFieldDto;
import com.hirepath.forms.dto.FormUpdateRequest;
import com.hirepath.forms.dto.LinkCreateRequest;
import com.hirepath.forms.dto.TemplateCreateRequest;
import com.hirepath.forms.repository.ApplicationFormCollectionRepository;
import com.hirepath.forms.repository.ApplicationFormFavoriteRepository;
import com.hirepath.forms.repository.ApplicationFormFieldRepository;
import com.hirepath.forms.repository.ApplicationFormLinkRepository;
import com.hirepath.forms.repository.ApplicationFormRepository;
import com.hirepath.forms.repository.ApplicationFormSubmissionRepository;
import com.hirepath.forms.repository.ApplicationFormTemplateRepository;
import com.hirepath.forms.repository.ApplicationFormVersionRepository;
import com.hirepath.forms.security.service.AppUserDetails;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recruitment/forms")
public class FormsController {

    private static final Set<String> ALLOWED_MODULES = Set.of("recruitment", "preboarding", "internal", "general");

    private final ApplicationFormRepository formRepository;
    private final ApplicationFormFieldRepository fieldRepository;
    private final ApplicationFormTemplateRepository templateRepository;
    private final ApplicationFormCollectionRepository collectionRepository;
    private final ApplicationFormLinkRepository linkRepository;
    private final ApplicationFormFavoriteRepository favoriteRepository;
    private final ApplicationFormVersionRepository versionRepository;
    private final ApplicationFormSubmissionRepository submissionRepository;

    public FormsController(
        ApplicationFormRepository formRepository,
        ApplicationFormFieldRepository fieldRepository,
        ApplicationFormTemplateRepository templateRepository,
        ApplicationFormCollectionRepository collectionRepository,
        ApplicationFormLinkRepository linkRepository,
        ApplicationFormFavoriteRepository favoriteRepository,
        ApplicationFormVersionRepository versionRepository,
        ApplicationFormSubmissionRepository submissionRepository
    ) {
        this.formRepository = formRepository;
        this.fieldRepository = fieldRepository;
        this.templateRepository = templateRepository;
        this.collectionRepository = collectionRepository;
        this.linkRepository = linkRepository;
        this.favoriteRepository = favoriteRepository;
        this.versionRepository = versionRepository;
        this.submissionRepository = submissionRepository;
    }

    @GetMapping
    public ResponseEntity<?> listForms(
        @RequestParam(value = "status", required = false) String status,
        @RequestParam(value = "module", required = false) String module,
        @RequestParam(value = "collection_id", required = false) String collectionId,
        @RequestParam(value = "search", required = false) String search
    ) {
        List<ApplicationForm> forms = formRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        List<ApplicationForm> filtered = new ArrayList<>(forms);

        if (status != null && !status.isBlank()) {
            ApplicationFormStatus parsed = parseStatus(status);
            if (parsed == null) {
                return ResponseEntity.badRequest().body("Invalid status");
            }
            filtered = filtered.stream()
                .filter(form -> parsed == form.getStatus())
                .toList();
        }

        if (module != null && !module.isBlank()) {
            String normalized;
            try {
                normalized = normalizeModule(module, "recruitment");
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body(ex.getMessage());
            }
            String finalNormalized = normalized;
            filtered = filtered.stream()
                .filter(form -> finalNormalized.equalsIgnoreCase(form.getModule()))
                .toList();
        }

        if (collectionId != null && !collectionId.isBlank()) {
            filtered = filtered.stream()
                .filter(form -> collectionId.equals(form.getCollectionId()))
                .toList();
        }

        if (search != null && !search.isBlank()) {
            String needle = search.trim().toLowerCase();
            filtered = filtered.stream()
                .filter(form -> (form.getName() != null && form.getName().toLowerCase().contains(needle))
                    || (form.getDescription() != null && form.getDescription().toLowerCase().contains(needle)))
                .toList();
        }

        Map<String, String> collectionNames = collectionRepository.findAll().stream()
            .collect(Collectors.toMap(c -> c.getId().toString(), ApplicationFormCollection::getName, (a, b) -> a));

        List<Map<String, Object>> data = filtered.stream().map(form -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", form.getId());
            row.put("name", form.getName());
            row.put("description", form.getDescription());
            row.put("status", toStatusValue(form.getStatus()));
            row.put("public_slug", form.getPublicSlug());
            row.put("position_id", form.getPositionId());
            row.put("position_title", null);
            row.put("module", form.getModule() != null ? form.getModule() : "recruitment");
            row.put("owner", form.getOwner() != null ? form.getOwner() : "HR Operations");
            row.put("visibility", form.getVisibility() != null ? form.getVisibility() : List.of());
            row.put("tags", form.getTags() != null ? form.getTags() : List.of());
            row.put("version", form.getVersion() != null ? form.getVersion() : "v1.0");
            row.put("collection_id", form.getCollectionId());
            row.put("collection_name", form.getCollectionId() != null ? collectionNames.get(form.getCollectionId()) : null);
            row.put("created_at", form.getCreatedAt());
            row.put("updated_at", form.getUpdatedAt() != null ? form.getUpdatedAt() : form.getCreatedAt());
            return row;
        }).toList();

        return ResponseEntity.ok(Map.of("data", data));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_REPORTING_MANAGER','ROLE_HR_MANAGER','ROLE_RECRUITER')")
    public ResponseEntity<?> createForm(
        @RequestBody FormCreateRequest request,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        if (request.getFields() == null || request.getFields().isEmpty()) {
            return ResponseEntity.badRequest().body("At least one field is required");
        }
        try {
            validateFields(request.getFields());
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }

        String module;
        try {
            module = normalizeModule(request.getModule(), "recruitment");
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }

        String positionId = normalizeBlank(request.getPositionId());
        if ("recruitment".equals(module) && positionId == null) {
            return ResponseEntity.badRequest().body("position_id is required for recruitment forms");
        }

        ApplicationForm form = new ApplicationForm();
        form.setName(request.getName());
        form.setDescription(request.getDescription());
        form.setPositionId(positionId);
        form.setModule(module);
        form.setOwner(request.getOwner() != null ? request.getOwner() : "HR Operations");
        form.setVisibility(request.getVisibility() != null ? request.getVisibility() : List.of("hr"));
        form.setTags(request.getTags() != null ? request.getTags() : List.of());
        form.setVersion(request.getVersion() != null ? request.getVersion() : "v1.0");
        form.setCollectionId(request.getCollectionId());
        form.setCreatedBy(user != null ? user.getUserId() : null);
        form.setStatus(ApplicationFormStatus.DRAFT);

        ApplicationForm saved = formRepository.save(form);
        int idx = 0;
        for (FormFieldDto fieldDto : request.getFields()) {
            ApplicationFormField field = toField(saved, fieldDto, idx++);
            fieldRepository.save(field);
        }
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("id", saved.getId(), "message", "Form created"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getForm(@PathVariable UUID id) {
        ApplicationForm form = formRepository.findWithFieldsById(id).orElse(null);
        if (form == null) {
            return ResponseEntity.notFound().build();
        }
        List<ApplicationFormField> fields = form.getFields().stream()
            .sorted(Comparator.comparing(f -> f.getOrderIndex() == null ? 0 : f.getOrderIndex()))
            .toList();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", form.getId());
        payload.put("name", form.getName());
        payload.put("description", form.getDescription());
        payload.put("status", toStatusValue(form.getStatus()));
        payload.put("public_slug", form.getPublicSlug());
        payload.put("position_id", form.getPositionId());
        payload.put("position_title", null);
        payload.put("module", form.getModule() != null ? form.getModule() : "recruitment");
        payload.put("owner", form.getOwner() != null ? form.getOwner() : "HR Operations");
        payload.put("visibility", form.getVisibility() != null ? form.getVisibility() : List.of());
        payload.put("tags", form.getTags() != null ? form.getTags() : List.of());
        payload.put("version", form.getVersion() != null ? form.getVersion() : "v1.0");
        payload.put("collection_id", form.getCollectionId());
        payload.put("created_at", form.getCreatedAt());
        payload.put("updated_at", form.getUpdatedAt() != null ? form.getUpdatedAt() : form.getCreatedAt());
        payload.put("fields", fields.stream().map(this::fieldToMap).toList());
        return ResponseEntity.ok(payload);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_REPORTING_MANAGER','ROLE_HR_MANAGER','ROLE_RECRUITER')")
    public ResponseEntity<?> updateForm(@PathVariable UUID id, @RequestBody FormUpdateRequest request) {
        ApplicationForm form = formRepository.findById(id).orElse(null);
        if (form == null) {
            return ResponseEntity.notFound().build();
        }

        String currentModule = form.getModule() != null ? form.getModule() : "recruitment";
        String nextModule = currentModule;
        if (request.getModule() != null) {
            try {
                nextModule = normalizeModule(request.getModule(), currentModule);
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body(ex.getMessage());
            }
            form.setModule(nextModule);
        }

        String requestedPositionId = request.getPositionId();
        if (requestedPositionId != null) {
            requestedPositionId = normalizeBlank(requestedPositionId);
            form.setPositionId(requestedPositionId);
        }

        String effectivePositionId = form.getPositionId();
        if ("recruitment".equals(nextModule) && effectivePositionId == null) {
            return ResponseEntity.badRequest().body("position_id is required for recruitment forms");
        }

        if (request.getName() != null) form.setName(request.getName());
        if (request.getDescription() != null) form.setDescription(request.getDescription());
        if (request.getOwner() != null) form.setOwner(request.getOwner());
        if (request.getVisibility() != null) form.setVisibility(request.getVisibility());
        if (request.getTags() != null) form.setTags(request.getTags());
        if (request.getVersion() != null) form.setVersion(request.getVersion());
        if (request.getCollectionId() != null) {
            form.setCollectionId(normalizeBlank(request.getCollectionId()));
        }

        formRepository.save(form);

        if (request.getFields() != null) {
            try {
                validateFields(request.getFields());
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().body(ex.getMessage());
            }
            fieldRepository.deleteByForm_Id(id);
            int idx = 0;
            for (FormFieldDto fieldDto : request.getFields()) {
                fieldRepository.save(toField(form, fieldDto, idx++));
            }
        }

        return ResponseEntity.ok(Map.of("message", "Form updated"));
    }

    @PostMapping("/{id}/publish")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_REPORTING_MANAGER','ROLE_HR_MANAGER','ROLE_RECRUITER')")
    public ResponseEntity<?> publish(@PathVariable UUID id) {
        ApplicationForm form = formRepository.findWithFieldsById(id).orElse(null);
        if (form == null) {
            return ResponseEntity.notFound().build();
        }
        String module = form.getModule() != null ? form.getModule() : "recruitment";
        if ("recruitment".equals(module)) {
            if (form.getPositionId() == null) {
                return ResponseEntity.badRequest().body("position_id is required for recruitment forms");
            }
            if (!hasCoreFields(form.getFields())) {
                return ResponseEntity.badRequest().body("Form must include full_name and email fields");
            }
        }

        if (form.getPublicSlug() == null || form.getPublicSlug().isBlank()) {
            form.setPublicSlug(generateUniqueSlug(form.getName()));
        }
        form.setStatus(ApplicationFormStatus.PUBLISHED);
        formRepository.save(form);
        createVersionSnapshot(form);
        return ResponseEntity.ok(Map.of(
            "public_slug", form.getPublicSlug(),
            "message", "Form published"
        ));
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_REPORTING_MANAGER','ROLE_HR_MANAGER','ROLE_RECRUITER')")
    public ResponseEntity<?> archive(@PathVariable UUID id) {
        ApplicationForm form = formRepository.findById(id).orElse(null);
        if (form == null) {
            return ResponseEntity.notFound().build();
        }
        form.setStatus(ApplicationFormStatus.ARCHIVED);
        formRepository.save(form);
        return ResponseEntity.ok(Map.of("message", "Form archived"));
    }

    @GetMapping("/templates")
    public ResponseEntity<?> listTemplates(@AuthenticationPrincipal AppUserDetails user) {
        List<ApplicationFormTemplate> templates = templateRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        String userId = user != null ? user.getUserId() : null;
        final Set<String> favorites = userId != null
            ? favoriteRepository.findByUserId(userId).stream()
                .map(ApplicationFormFavorite::getTemplateId)
                .collect(Collectors.toSet())
            : Collections.emptySet();

        List<Map<String, Object>> data = templates.stream().map(template -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", template.getId());
            row.put("name", template.getName());
            row.put("description", template.getDescription());
            row.put("fields", template.getFields().stream().map(this::snapshotToMap).toList());
            row.put("is_favorite", favorites.contains(template.getId().toString()));
            row.put("created_at", template.getCreatedAt());
            return row;
        }).toList();

        return ResponseEntity.ok(Map.of("data", data));
    }

    @PostMapping("/templates")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_REPORTING_MANAGER','ROLE_HR_MANAGER','ROLE_RECRUITER')")
    public ResponseEntity<?> createTemplate(
        @RequestBody TemplateCreateRequest request,
        @AuthenticationPrincipal AppUserDetails user
    ) {
        if (request.getFields() == null || request.getFields().isEmpty()) {
            return ResponseEntity.badRequest().body("At least one field is required");
        }
        try {
            validateFields(request.getFields());
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }

        ApplicationFormTemplate template = new ApplicationFormTemplate();
        template.setName(request.getName());
        template.setDescription(request.getDescription());
        template.setCreatedBy(user != null ? user.getUserId() : null);
        template.setFields(request.getFields().stream().map(this::toSnapshot).toList());

        ApplicationFormTemplate saved = templateRepository.save(template);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("id", saved.getId(), "message", "Template created"));
    }

    @PostMapping("/templates/{id}/favorite")
    public ResponseEntity<?> toggleFavorite(@PathVariable UUID id, @AuthenticationPrincipal AppUserDetails user) {
        String userId = user != null ? user.getUserId() : null;
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        return favoriteRepository.findByUserIdAndTemplateId(userId, id.toString())
            .map(existing -> {
                favoriteRepository.delete(existing);
                return ResponseEntity.ok(Map.of("is_favorite", false));
            })
            .orElseGet(() -> {
                ApplicationFormFavorite fav = new ApplicationFormFavorite();
                fav.setUserId(userId);
                fav.setTemplateId(id.toString());
                favoriteRepository.save(fav);
                return ResponseEntity.ok(Map.of("is_favorite", true));
            });
    }

    @GetMapping("/collections")
    public ResponseEntity<?> listCollections() {
        List<ApplicationFormCollection> collections = collectionRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        Map<String, List<String>> formIdsByCollection = new HashMap<>();
        for (ApplicationFormCollection collection : collections) {
            List<String> formIds = formRepository.findByCollectionId(collection.getId().toString()).stream()
                .map(form -> form.getId().toString())
                .toList();
            formIdsByCollection.put(collection.getId().toString(), formIds);
        }
        List<Map<String, Object>> data = collections.stream().map(collection -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", collection.getId());
            row.put("name", collection.getName());
            row.put("description", collection.getDescription());
            row.put("module", collection.getModule());
            row.put("owner", collection.getOwner() != null ? collection.getOwner() : "HR Operations");
            row.put("form_ids", formIdsByCollection.getOrDefault(collection.getId().toString(), List.of()));
            row.put("created_at", collection.getCreatedAt());
            row.put("updated_at", collection.getUpdatedAt() != null ? collection.getUpdatedAt() : collection.getCreatedAt());
            return row;
        }).toList();
        return ResponseEntity.ok(Map.of("data", data));
    }

    @PostMapping("/collections")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_REPORTING_MANAGER','ROLE_HR_MANAGER','ROLE_RECRUITER')")
    public ResponseEntity<?> createCollection(@RequestBody CollectionCreateRequest request) {
        String module;
        try {
            module = normalizeModule(request.getModule(), "recruitment");
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }

        ApplicationFormCollection collection = new ApplicationFormCollection();
        collection.setName(request.getName());
        collection.setDescription(request.getDescription());
        collection.setModule(module);
        collection.setOwner(request.getOwner() != null ? request.getOwner() : "HR Operations");

        ApplicationFormCollection saved = collectionRepository.save(collection);

        if (request.getFormIds() != null && !request.getFormIds().isEmpty()) {
            List<UUID> formIds = request.getFormIds().stream()
                .map(UUID::fromString)
                .toList();
            List<ApplicationForm> forms = formRepository.findAllById(formIds);
            for (ApplicationForm form : forms) {
                form.setCollectionId(saved.getId().toString());
            }
            formRepository.saveAll(forms);
        }

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("id", saved.getId(), "message", "Collection created"));
    }

    @GetMapping("/links")
    public ResponseEntity<?> listLinks() {
        List<ApplicationFormLink> links = linkRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        Map<String, String> formNames = new HashMap<>();
        if (!links.isEmpty()) {
            List<UUID> formIds = links.stream()
                .map(ApplicationFormLink::getFormId)
                .filter(id -> id != null && !id.isBlank())
                .map(UUID::fromString)
                .toList();
            formRepository.findAllById(formIds).forEach(form -> formNames.put(form.getId().toString(), form.getName()));
        }

        List<Map<String, Object>> data = links.stream().map(link -> {
            refreshLinkStatus(link);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", link.getId());
            row.put("form_id", link.getFormId());
            row.put("form_name", link.getFormId() != null ? formNames.get(link.getFormId()) : null);
            row.put("slug", link.getSlug());
            row.put("candidate_name", link.getCandidateName());
            row.put("candidate_email", link.getCandidateEmail());
            row.put("module", link.getModule() != null ? link.getModule() : "recruitment");
            row.put("status", link.getStatus() != null ? link.getStatus().name().toLowerCase() : null);
            row.put("is_active", link.isActive());
            row.put("max_submissions", link.getMaxSubmissions());
            row.put("current_submissions", link.getCurrentSubmissions());
            row.put("access_type", link.getAccessType());
            row.put("url", link.getUrl());
            row.put("expires_at", link.getExpiresAt());
            row.put("created_at", link.getCreatedAt());
            row.put("last_sent_at", link.getLastSentAt());
            return row;
        }).toList();
        return ResponseEntity.ok(Map.of("data", data));
    }

    @PostMapping("/links")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_REPORTING_MANAGER','ROLE_HR_MANAGER','ROLE_RECRUITER')")
    public ResponseEntity<?> createLink(@RequestBody LinkCreateRequest request) {
        if (request.getFormId() == null || request.getFormId().isBlank()) {
            return ResponseEntity.badRequest().body("form_id is required");
        }
        ApplicationForm form = formRepository.findById(UUID.fromString(request.getFormId())).orElse(null);
        if (form == null) {
            return ResponseEntity.notFound().build();
        }
        if (form.getStatus() != ApplicationFormStatus.PUBLISHED) {
            return ResponseEntity.badRequest().body("Form must be published before creating links");
        }

        String linkSlug = generateUniqueLinkSlug(form.getName());
        ApplicationFormLink link = new ApplicationFormLink();
        link.setFormId(form.getId().toString());
        link.setSlug(linkSlug);
        link.setCandidateName(request.getCandidateName() != null ? request.getCandidateName() : "Candidate");
        link.setCandidateEmail(request.getCandidateEmail() != null ? request.getCandidateEmail() : "unknown@email");
        link.setModule(normalizeModule(request.getModule(), form.getModule() != null ? form.getModule() : "recruitment"));
        link.setStatus(FormLinkStatus.ACTIVE);
        link.setActive(true);
        link.setMaxSubmissions(request.getMaxSubmissions());
        link.setCurrentSubmissions(0);
        link.setAccessType(request.getAccessType() != null ? request.getAccessType() : "public");
        link.setExpiresAt(request.getExpiresAt());
        link.setUrl("/apply/" + form.getPublicSlug() + "?link=" + linkSlug);
        ApplicationFormLink saved = linkRepository.save(link);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "id", saved.getId(),
            "url", saved.getUrl()
        ));
    }

    @PostMapping("/links/{id}/resend")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_REPORTING_MANAGER','ROLE_HR_MANAGER','ROLE_RECRUITER')")
    public ResponseEntity<?> resendLink(@PathVariable UUID id) {
        ApplicationFormLink link = linkRepository.findById(id).orElse(null);
        if (link == null) {
            return ResponseEntity.notFound().build();
        }
        link.setLastSentAt(OffsetDateTime.now());
        link.setStatus(FormLinkStatus.ACTIVE);
        link.setActive(true);
        linkRepository.save(link);
        return ResponseEntity.ok(Map.of("message", "Link resent"));
    }

    @PostMapping("/links/{id}/expire")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_REPORTING_MANAGER','ROLE_HR_MANAGER','ROLE_RECRUITER')")
    public ResponseEntity<?> expireLink(@PathVariable UUID id) {
        ApplicationFormLink link = linkRepository.findById(id).orElse(null);
        if (link == null) {
            return ResponseEntity.notFound().build();
        }
        link.setStatus(FormLinkStatus.DISABLED);
        link.setActive(false);
        linkRepository.save(link);
        return ResponseEntity.ok(Map.of("message", "Link disabled"));
    }

    @GetMapping("/analytics")
    public ResponseEntity<?> analytics() {
        long total = formRepository.count();
        long published = formRepository.findAll().stream()
            .filter(f -> f.getStatus() == ApplicationFormStatus.PUBLISHED)
            .count();
        OffsetDateTime since = OffsetDateTime.now().minusDays(7);
        long submissionsLast7 = submissionRepository.findBySubmittedAtAfter(since).size();
        List<Map<String, Object>> trend = buildTrend();
        return ResponseEntity.ok(Map.of(
            "total_forms", total,
            "published_forms", published,
            "submissions_last_7", submissionsLast7,
            "completion_rate", null,
            "avg_completion_time_days", null,
            "trend", trend
        ));
    }

    @GetMapping("/{id}/submissions")
    public ResponseEntity<?> listSubmissions(@PathVariable UUID id) {
        int limit = 50;
        List<Map<String, Object>> rows = submissionRepository
            .findByFormIdOrderBySubmittedAtDesc(id, org.springframework.data.domain.PageRequest.of(0, limit))
            .stream()
            .map(submission -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", submission.getId());
                row.put("candidate_name", submission.getCandidateName());
                row.put("candidate_email", submission.getCandidateEmail());
                row.put("submitted_at", submission.getSubmittedAt());
                return row;
            }).toList();
        long total = submissionRepository.countByFormId(id);
        long last7 = submissionRepository.countByFormIdAndSubmittedAtAfter(id, OffsetDateTime.now().minusDays(7));
        return ResponseEntity.ok(Map.of(
            "total", total,
            "last_7_days", last7,
            "data", rows
        ));
    }

    private void validateFields(List<FormFieldDto> fields) {
        Set<String> keys = new HashSet<>();
        for (FormFieldDto field : fields) {
            if (field.getFieldKey() == null || field.getFieldKey().isBlank()) {
                throw new IllegalArgumentException("Field key is required");
            }
            if (!keys.add(field.getFieldKey())) {
                throw new IllegalArgumentException("Field keys must be unique");
            }
        }
    }

    private boolean hasCoreFields(List<ApplicationFormField> fields) {
        Set<String> keys = fields.stream()
            .map(field -> field.getFieldKey() != null ? field.getFieldKey().toLowerCase() : "")
            .collect(Collectors.toSet());
        return keys.contains("full_name") && keys.contains("email");
    }

    private ApplicationFormField toField(ApplicationForm form, FormFieldDto dto, int index) {
        ApplicationFormField field = new ApplicationFormField();
        field.setForm(form);
        field.setFieldKey(dto.getFieldKey());
        field.setLabel(dto.getLabel());
        field.setType(parseFieldType(dto.getType()));
        field.setRequired(dto.isRequired());
        field.setOptions(dto.getOptions());
        if (dto.getConfig() instanceof Map<?, ?> configMap) {
            field.setConfig((Map<String, Object>) configMap);
        } else {
            field.setConfig(null);
        }
        field.setOrderIndex(dto.getOrder() != null ? dto.getOrder() : index);
        return field;
    }

    private FormFieldSnapshot toSnapshot(FormFieldDto dto) {
        FormFieldSnapshot snap = new FormFieldSnapshot();
        snap.setFieldKey(dto.getFieldKey());
        snap.setLabel(dto.getLabel());
        snap.setType(dto.getType());
        snap.setRequired(dto.isRequired());
        snap.setOptions(dto.getOptions());
        if (dto.getConfig() instanceof Map<?, ?> configMap) {
            snap.setConfig((Map<String, Object>) configMap);
        }
        snap.setOrder(dto.getOrder());
        return snap;
    }

    private Map<String, Object> snapshotToMap(FormFieldSnapshot field) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("field_key", field.getFieldKey());
        row.put("label", field.getLabel());
        row.put("type", field.getType());
        row.put("required", field.isRequired());
        row.put("options", field.getOptions());
        row.put("config", field.getConfig() != null ? field.getConfig() : Map.of());
        row.put("order", field.getOrder());
        return row;
    }

    private Map<String, Object> fieldToMap(ApplicationFormField field) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", field.getId());
        row.put("field_key", field.getFieldKey());
        row.put("label", field.getLabel());
        row.put("type", field.getType() != null ? field.getType().name().toLowerCase() : null);
        row.put("required", field.isRequired());
        row.put("options", field.getOptions());
        row.put("config", field.getConfig() != null ? field.getConfig() : Map.of());
        row.put("order", field.getOrderIndex());
        return row;
    }

    private void createVersionSnapshot(ApplicationForm form) {
        List<Map<String, Object>> snapshot = form.getFields().stream()
            .sorted(Comparator.comparing(f -> f.getOrderIndex() == null ? 0 : f.getOrderIndex()))
            .map(this::fieldToMap)
            .toList();
        ApplicationFormVersion version = new ApplicationFormVersion();
        version.setFormId(form.getId());
        version.setVersion(form.getVersion() != null ? form.getVersion() : "v1.0");
        version.setSchemaSnapshot(snapshot);
        versionRepository.save(version);
    }

    private void refreshLinkStatus(ApplicationFormLink link) {
        if (link.getExpiresAt() != null && link.getExpiresAt().isBefore(OffsetDateTime.now())) {
            link.setStatus(FormLinkStatus.EXPIRED);
            link.setActive(false);
            linkRepository.save(link);
        }
    }

    private List<Map<String, Object>> buildTrend() {
        OffsetDateTime start = OffsetDateTime.now().minusDays(13).withHour(0).withMinute(0).withSecond(0).withNano(0);
        List<Map<String, Object>> trend = new ArrayList<>();
        Map<String, Long> counts = new HashMap<>();
        submissionRepository.findBySubmittedAtAfter(start).forEach(submission -> {
            String key = submission.getSubmittedAt().toLocalDate().toString();
            counts.put(key, counts.getOrDefault(key, 0L) + 1);
        });
        for (int i = 0; i < 14; i++) {
            OffsetDateTime day = start.plusDays(i);
            String key = day.toLocalDate().toString();
            long submissions = counts.getOrDefault(key, 0L);
            trend.add(Map.of(
                "label", key,
                "submissions", submissions,
                "completed", 0
            ));
        }
        return trend;
    }

    private ApplicationFieldType parseFieldType(String value) {
        if (value == null) {
            return ApplicationFieldType.TEXT;
        }
        return ApplicationFieldType.valueOf(value.toUpperCase());
    }

    private String normalizeModule(String module, String fallback) {
        String normalized = (module == null || module.isBlank()) ? fallback : module.trim().toLowerCase();
        if (!ALLOWED_MODULES.contains(normalized)) {
            throw new IllegalArgumentException("Invalid module");
        }
        return normalized;
    }

    private String normalizeBlank(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private ApplicationFormStatus parseStatus(String value) {
        if (value == null) {
            return null;
        }
        try {
            return ApplicationFormStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private String toStatusValue(ApplicationFormStatus status) {
        return status == null ? null : status.name().toLowerCase();
    }

    private String slugify(String value) {
        if (value == null) {
            return "form";
        }
        return value.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
    }

    private String generateUniqueSlug(String base) {
        String baseSlug = slugify(base);
        for (int i = 0; i < 5; i++) {
            String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6);
            String candidate = baseSlug + "-" + suffix;
            if (!formRepository.existsByPublicSlug(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Unable to generate unique slug");
    }

    private String generateUniqueLinkSlug(String base) {
        String baseSlug = slugify(base);
        for (int i = 0; i < 5; i++) {
            String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6);
            String candidate = baseSlug + "-" + suffix;
            if (!linkRepository.existsBySlug(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Unable to generate unique link slug");
    }
}
