package com.fawnix.procurement.common.exception;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import com.fawnix.procurement.common.response.ApiErrorResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;

@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler({
      BadRequestException.class,
      IllegalArgumentException.class,
      ConstraintViolationException.class,
      DataIntegrityViolationException.class
  })
  public ResponseEntity<ApiErrorResponse> handleBadRequest(
      RuntimeException exception,
      HttpServletRequest request
  ) {
    LOGGER.warn("Bad request for {} {}: {}", request.getMethod(), request.getRequestURI(), exception.getMessage());
    return build(HttpStatus.BAD_REQUEST, exception.getMessage(), request, Map.of());
  }

  @ExceptionHandler(ForbiddenOperationException.class)
  public ResponseEntity<ApiErrorResponse> handleForbiddenOperation(
      ForbiddenOperationException exception,
      HttpServletRequest request
  ) {
    LOGGER.warn("Forbidden operation for {} {}: {}", request.getMethod(), request.getRequestURI(), exception.getMessage());
    return build(HttpStatus.FORBIDDEN, exception.getMessage(), request, Map.of());
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiErrorResponse> handleAccessDenied(
      AccessDeniedException exception,
      HttpServletRequest request
  ) {
    LOGGER.warn("Access denied for {} {}: {}", request.getMethod(), request.getRequestURI(), exception.getMessage());
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
    LOGGER.warn("Validation failed for {} {}: {}", request.getMethod(), request.getRequestURI(), fieldErrors);
    return build(HttpStatus.BAD_REQUEST, "Validation failed.", request, fieldErrors);
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ApiErrorResponse> handleUnreadableMessage(
      HttpMessageNotReadableException exception,
      HttpServletRequest request
  ) {
    LOGGER.warn("Malformed JSON for {} {}: {}", request.getMethod(), request.getRequestURI(), exception.getMessage());
    return build(HttpStatus.BAD_REQUEST, "Malformed JSON request body.", request, Map.of());
  }

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  public ResponseEntity<ApiErrorResponse> handleMethodNotSupported(
      HttpRequestMethodNotSupportedException exception,
      HttpServletRequest request
  ) {
    LOGGER.warn("Method not supported for {} {}: {}", request.getMethod(), request.getRequestURI(), exception.getMessage());
    return build(HttpStatus.METHOD_NOT_ALLOWED, "Request method is not supported for this endpoint.", request, Map.of());
  }

  @ExceptionHandler(NoResourceFoundException.class)
  public ResponseEntity<ApiErrorResponse> handleNoResourceFound(
      NoResourceFoundException exception,
      HttpServletRequest request
  ) {
    LOGGER.warn("No handler or static resource found for {} {}: {}", request.getMethod(), request.getRequestURI(), exception.getMessage());
    return build(HttpStatus.NOT_FOUND, "Endpoint not found.", request, Map.of());
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiErrorResponse> handleUnexpected(
      Exception exception,
      HttpServletRequest request
  ) {
    LOGGER.error("Unexpected error for {} {}", request.getMethod(), request.getRequestURI(), exception);
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
