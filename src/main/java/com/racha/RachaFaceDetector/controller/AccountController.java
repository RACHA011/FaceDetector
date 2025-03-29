package com.racha.RachaFaceDetector.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AccountController {

    @GetMapping("/test")
    public String Home() {
        return new String("hello world");
    }

}
