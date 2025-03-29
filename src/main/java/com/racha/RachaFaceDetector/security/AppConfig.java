// package com.racha.RachaFaceDetector.security;

// import org.springframework.context.annotation.Bean;
// import org.springframework.context.annotation.Configuration;
// import org.springframework.security.config.annotation.web.builders.HttpSecurity;
// import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
// import org.springframework.security.web.SecurityFilterChain;

// @Configuration
// @EnableWebSecurity
// public class AppConfig {

//     @Bean
//     public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
//         http
//                 .csrf(csrf -> csrf.disable()) // Disable CSRF for simplicity (enable it for production)
//                 .authorizeHttpRequests(authorize -> authorize
//                         // Allow access to public pages and static resources
//                         .requestMatchers("/", "/home", "/about", "/login", "/css/**", "/js/**", "/images/**",
//                                 "swagger-ui/**", "/v3/api-docs/**", "/test")
//                         .permitAll()
//                         // Restrict access to admin pages
//                         .requestMatchers("/admin/**").hasRole("ADMIN") // Only admins can access /admin/**
//                         // Restrict access to user pages
//                         .requestMatchers("/user/**").hasRole("USER") // Only users can access /user/**
//                         // Allow access to authenticated pages
//                         .requestMatchers("/dashboard", "/profile").authenticated()
//                         // All other requests require authentication
//                         .anyRequest().authenticated())
//                 .formLogin(formLogin -> formLogin
//                         .loginPage("/login") // Custom login page
//                         .defaultSuccessUrl("/dashboard") // Redirect after successful login
//                         .permitAll())
//                 .logout(logout -> logout
//                         .logoutUrl("/logout") // Custom logout URL
//                         .logoutSuccessUrl("/login?logout") // Redirect after logout
//                         .permitAll());

//         return http.build();
//     }
// }