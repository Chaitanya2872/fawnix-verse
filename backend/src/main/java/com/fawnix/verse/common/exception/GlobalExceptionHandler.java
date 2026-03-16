package com.fawnix.verse.common.exception;

import com.fawnix.verse.common.response.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(ResourceNotFoundException.class)
  public ResponseEntity<ApiErrorResponse> handleNotFound(
      ResourceNotFoundException exception,
      HttpServletRequest request
  ) {
    return build(HttpStatus.NOT_FOUND, exception.getMessage(), request, Map.of());
  }

  @ExceptionHandler({
      BadRequestException.class,
      IllegalArgumentException.class,
      ConstraintViolationException.class
  })
  public ResponseEntity<ApiErrorResponse> handleBadRequest(
      RuntimeException exception,
      HttpServletRequest request
  ) {
    return build(HttpStatus.BAD_REQUEST, exception.getMessage(), request, Map.of());
  }

  @ExceptionHandler(ForbiddenOperationException.class)
  public ResponseEntity<ApiErrorResponse> handleForbiddenOperation(
      ForbiddenOperationException exception,
      HttpServletRequest request
  ) {
    return build(HttpStatus.FORBIDDEN, exception.getMessage(), request, Map.of());
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiErrorResponse> handleAccessDenied(
      AccessDeniedException exception,
      HttpServletRequest request
  ) {
    return build(HttpStatus.FORBIDDEN, "You do not have permission to perform this action.", request, Map.of());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiErrorResponse> handleValidation(
      MethodArgumentNotValidException exception,
      HttpServletRequest request
  ) {
    Map<String, String> fieldErrors = new LinkedHashMap<>();
    for (FieldError fieldError : exception.getBindingResult().getFieldErrors()) {
      fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
    }
    return build(HttpStatus.BAD_REQUEST, "Validation failed.", request, fieldErrors);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiErrorResponse> handleUnexpected(
      Exception exception,
      HttpServletRequest request
  ) {
    return build(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred.", request, Map.of());
  }

  private ResponseEntity<ApiErrorResponse> build(
      HttpStatus status,
      String message,
      HttpServletRequest request,
      Map<String, String> fieldErrors
  ) {
    return ResponseEntity.status(status).body(new ApiErrorResponse(
        Instant.now(),
        status.value(),
        status.getReasonPhrase(),
        message,
        request.getRequestURI(),
        fieldErrors
    ));
  }
}
