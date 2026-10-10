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
class HealthControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void returnsTheEnglishHealthMessageByDefault() throws Exception {
    mockMvc.perform(get("/health"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.success").value(true))
      .andExpect(jsonPath("$.message").value("AURIUS API is running"))
      .andExpect(jsonPath("$.data.status").value("UP"));
  }

  @Test
  void returnsTheChineseHealthMessageWhenRequested() throws Exception {
    mockMvc.perform(get("/health").header(HttpHeaders.ACCEPT_LANGUAGE, "zh-CN"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.success").value(true))
      .andExpect(jsonPath("$.message").value("AURIUS API 正在运行"))
      .andExpect(jsonPath("$.data.status").value("UP"));
  }
}
