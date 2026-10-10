package com.aurius.web;

import java.util.Collections;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiEnvelope<T> {
  private final boolean success;
  private final String message;
  private final T data;
  private final List<?> errors;

  private ApiEnvelope(boolean success, String message, T data, List<?> errors) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.errors = errors;
  }

  public static <T> ApiEnvelope<T> success(T data, String message) {
    return new ApiEnvelope<T>(true, message, data, Collections.emptyList());
  }

  public static <T> ApiEnvelope<T> failure(String message, List<?> errors) {
    return new ApiEnvelope<T>(false, message, null, errors);
  }

  public boolean isSuccess() {
    return success;
  }

  public String getMessage() {
    return message;
  }

  public T getData() {
    return data;
  }

  public List<?> getErrors() {
    return errors;
  }
}
