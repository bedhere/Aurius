package com.aurius.web;

import com.aurius.AuriusApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = AuriusApplication.class)
@AutoConfigureMockMvc
class ApiErrorHandlingTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void wrapsUnknownApiRoutesInTheEnglishFailureEnvelope() throws Exception {
    mockMvc.perform(get("/api/not-a-route"))
      .andExpect(status().isNotFound())
      .andExpect(jsonPath("$.success").value(false))
      .andExpect(jsonPath("$.message").value("Resource not found"))
      .andExpect(jsonPath("$.data").doesNotExist())
      .andExpect(jsonPath("$.errors").isArray());
  }

  @Test
  void localizesUnknownApiRoutesInChinese() throws Exception {
    mockMvc.perform(get("/api/not-a-route").header(HttpHeaders.ACCEPT_LANGUAGE, "zh-CN"))
      .andExpect(status().isNotFound())
      .andExpect(jsonPath("$.success").value(false))
      .andExpect(jsonPath("$.message").value("未找到资源"))
      .andExpect(jsonPath("$.errors").isArray());
  }
}
