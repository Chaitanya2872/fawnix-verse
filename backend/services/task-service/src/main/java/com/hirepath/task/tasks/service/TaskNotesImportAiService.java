package com.hirepath.task.tasks.service;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hirepath.task.common.exception.BadRequestException;
import com.hirepath.task.tasks.domain.TaskPriority;
import com.hirepath.task.tasks.dto.TaskDtos;
import io.micrometer.observation.ObservationRegistry;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class TaskNotesImportAiService {

  private final boolean enabled;
  private final String apiKey;
  private final String model;
  private final double temperature;
  private final ObjectMapper objectMapper;

  public TaskNotesImportAiService(
      @Value("${app.ai.task-import.enabled:false}") boolean enabled,
      @Value("${app.ai.task-import.api-key:}") String apiKey,
      @Value("${app.ai.task-import.model:gpt-4o-mini}") String model,
      @Value("${app.ai.task-import.temperature:0.2}") double temperature
  ) {
    this.enabled = enabled;
    this.apiKey = apiKey;
    this.model = model;
    this.temperature = temperature;
    this.objectMapper = new ObjectMapper()
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
  }

  public NotesImportPlan generatePlan(TaskDtos.TaskNotesImportRequest request, String noteText) {
    if (!enabled) {
      throw new BadRequestException("AI task import is disabled.");
    }
    if (!StringUtils.hasText(apiKey)) {
      throw new BadRequestException("AI task import is not configured.");
    }
    if (!StringUtils.hasText(noteText)) {
      throw new BadRequestException("Paste notes or upload a text file.");
    }

    String memberDirectory = request.assignees().stream()
        .filter(Objects::nonNull)
        .map(assignee -> "- id: " + assignee.assignedToId()
            + ", name: " + assignee.assignedToName()
            + ", email: " + firstNonBlank(assignee.assignedToEmail(), ""))
        .reduce((left, right) -> left + "\n" + right)
        .orElse("");

    String systemPrompt = """
        You are a project operations assistant.
        Convert the provided planning notes into actionable tasks and subtasks.
        Use only the assignee ids from the provided member list.
        Return strict JSON only with this shape:
        {
          "tasks": [
            {
              "title": "string",
              "description": "string",
              "priority": "LOW|MEDIUM|HIGH|CRITICAL",
              "assigneeId": "string or null",
              "subtasks": [
                {
                  "title": "string",
                  "description": "string",
                  "priority": "LOW|MEDIUM|HIGH|CRITICAL",
                  "assigneeId": "string or null",
                  "subtasks": []
                }
              ]
            }
          ]
        }
        Rules:
        - Create clear, implementation-ready tasks.
        - Prefer 3 to 10 top-level tasks.
        - Use concise titles.
        - If a task naturally breaks down, create subtasks.
        - Keep subtasks nested only one level deep.
        - Assign each task to the best matching member id from the provided list.
        - If notes do not make ownership obvious, still choose the most reasonable member from the list.
        - Do not invent members outside the provided list.
        - Do not include markdown fences or explanations.
        """;

    String userPrompt = """
        Project: %s
        Module: %s
        Allowed members:
        %s

        Notes:
        %s
        """.formatted(
        request.projectRef(),
        firstNonBlank(request.moduleRef(), "General"),
        memberDirectory,
        noteText
    );

    OpenAiApi openAiApi = OpenAiApi.builder().apiKey(apiKey).build();
    OpenAiChatOptions options = OpenAiChatOptions.builder()
        .model(model)
        .temperature(temperature)
        .build();
    OpenAiChatModel chatModel = OpenAiChatModel.builder()
        .openAiApi(openAiApi)
        .defaultOptions(options)
        .observationRegistry(ObservationRegistry.NOOP)
        .build();
    ChatResponse response = chatModel.call(new Prompt(
        new SystemMessage(systemPrompt),
        new UserMessage(userPrompt)
    ));
    String content = response == null || response.getResult() == null || response.getResult().getOutput() == null
        ? null
        : response.getResult().getOutput().getText();

    if (!StringUtils.hasText(content)) {
      throw new BadRequestException("AI task import returned an empty response.");
    }

    try {
      NotesImportPlan plan = objectMapper.readValue(stripCodeFences(content.trim()), NotesImportPlan.class);
      if (plan.tasks() == null || plan.tasks().isEmpty()) {
        throw new BadRequestException("AI task import could not derive tasks from the notes.");
      }
      return plan;
    } catch (BadRequestException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new BadRequestException("AI task import returned an invalid task plan.");
    }
  }

  private String stripCodeFences(String value) {
    String normalized = value;
    if (normalized.startsWith("```")) {
      int firstNewline = normalized.indexOf('\n');
      if (firstNewline >= 0) {
        normalized = normalized.substring(firstNewline + 1);
      }
    }
    if (normalized.endsWith("```")) {
      normalized = normalized.substring(0, normalized.lastIndexOf("```"));
    }
    return normalized.trim();
  }

  private String firstNonBlank(String value, String fallback) {
    return StringUtils.hasText(value) ? value.trim() : fallback;
  }

  public record NotesImportPlan(List<ImportedTask> tasks) {
  }

  public record ImportedTask(
      String title,
      String description,
      String priority,
      String assigneeId,
      List<ImportedTask> subtasks
  ) {
    public TaskPriority normalizedPriority() {
      if (!StringUtils.hasText(priority)) {
        return TaskPriority.MEDIUM;
      }
      try {
        return TaskPriority.valueOf(priority.trim().toUpperCase(Locale.ROOT));
      } catch (IllegalArgumentException ignored) {
        return TaskPriority.MEDIUM;
      }
    }
  }
}
