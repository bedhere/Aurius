package com.aurius.i18n;

import java.util.Locale;
import javax.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;

@Service
public class RequestLocaleService {

  public Locale resolve(HttpServletRequest request) {
    String acceptLanguage = request.getHeader(HttpHeaders.ACCEPT_LANGUAGE);
    if (acceptLanguage == null || acceptLanguage.trim().isEmpty()) {
      return Locale.ENGLISH;
    }

    String language = acceptLanguage.toLowerCase(Locale.ROOT);
    return language.startsWith("zh") ? Locale.SIMPLIFIED_CHINESE : Locale.ENGLISH;
  }
}
