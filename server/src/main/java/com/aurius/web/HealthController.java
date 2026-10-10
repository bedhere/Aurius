package com.aurius.web;

import java.util.Collections;
import javax.servlet.http.HttpServletRequest;
import com.aurius.i18n.RequestLocaleService;
import org.springframework.context.MessageSource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
  private final MessageSource messageSource;
  private final RequestLocaleService requestLocaleService;

  public HealthController(MessageSource messageSource, RequestLocaleService requestLocaleService) {
    this.messageSource = messageSource;
    this.requestLocaleService = requestLocaleService;
  }

  @GetMapping("/health")
  public ApiEnvelope<Object> health(HttpServletRequest request) {
    String message = messageSource.getMessage("health.running", null, requestLocaleService.resolve(request));
    return ApiEnvelope.success(Collections.<String, String>singletonMap("status", "UP"), message);
  }
}
