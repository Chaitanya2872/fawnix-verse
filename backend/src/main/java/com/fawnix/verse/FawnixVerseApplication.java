package com.fawnix.verse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class FawnixVerseApplication {

  public static void main(String[] args) {
    SpringApplication.run(FawnixVerseApplication.class, args);
  }
}
