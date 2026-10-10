package com.aurius.web;

import java.util.Collections;
import javax.servlet.http.HttpServletRequest;
import com.aurius.i18n.RequestLocaleService;
import org.springframework.context.MessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ApiFallbackController {
  private final MessageSource messageSource;
  private final RequestLocaleService requestLocaleService;

  public ApiFallbackController(MessageSource messageSource, RequestLocaleService requestLocaleService) {
    this.messageSource = messageSource;
    this.requestLocaleService = requestLocaleService;
  }

  @RequestMapping("/api/**")
  public ResponseEntity<ApiEnvelope<Object>> notFound(HttpServletRequest request) {
    String message = messageSource.getMessage(
      "error.resource-not-found",
      null,
      requestLocaleService.resolve(request)
    );
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
      .body(ApiEnvelope.failure(message, Collections.emptyList()));
  }
}
