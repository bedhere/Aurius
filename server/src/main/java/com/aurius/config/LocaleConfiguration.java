package com.aurius.config;

import java.util.Arrays;
import java.util.Locale;
import javax.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

@Configuration
public class LocaleConfiguration {

  @Bean
  public LocaleResolver localeResolver() {
    AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver() {
      @Override
      public Locale resolveLocale(HttpServletRequest request) {
        String acceptLanguage = request.getHeader(HttpHeaders.ACCEPT_LANGUAGE);
        if (acceptLanguage == null || acceptLanguage.trim().isEmpty()) {
          return Locale.ENGLISH;
        }
        return super.resolveLocale(request);
      }
    };
    resolver.setDefaultLocale(Locale.ENGLISH);
    resolver.setSupportedLocales(Arrays.asList(Locale.ENGLISH, Locale.SIMPLIFIED_CHINESE));
    return resolver;
  }
}
