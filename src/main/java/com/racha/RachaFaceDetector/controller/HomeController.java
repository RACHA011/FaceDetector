package com.racha.RachaFaceDetector.controller;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import com.racha.RachaFaceDetector.models.FaceRecognitionResult;
import com.racha.RachaFaceDetector.service.FaceRecognitionService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

/**
 * Controller for handling face detection, tracking and recognition
 * functionality.
 */
@Controller
public class HomeController {

    @Autowired
    private FaceRecognitionService faceRecognitionService;

    /**
     * Displays the home page with face detection as the active tab.
     */
    @GetMapping("/")
    public String home(Model model) {
        model.addAttribute("activePage", "detect");
        return "home";
    }

    /**
     * Displays the face detection page.
     */
    @GetMapping("/detect")
    public String detection(Model model) {
        model.addAttribute("activePage", "detect");
        return "home";
    }

    /**
     * Processes an uploaded image for face detection.
     * 
     * @param file    The image file to process
     * @param session The HTTP session
     * @param model   The Spring model
     * @return The view name with processed results
     */
    @PostMapping("/detect")
    public String handleFileUpload(@RequestParam("file") MultipartFile file, HttpSession session, Model model) {
        if (file.isEmpty()) {
            model.addAttribute("error", "No file uploaded");
            return "home";
        }

        try {
            // Process the image for face detection
            byte[] fileBytes = file.getBytes();
            byte[] processedImageBytes = faceRecognitionService.detectFaces(fileBytes);

            // Encode the processed image as Base64 for displaying in the view
            String base64Image = Base64.getEncoder().encodeToString(processedImageBytes);
            model.addAttribute("outputImage", base64Image);
            model.addAttribute("activePage", "result");

            return "home";
        } catch (IOException e) {
            handleException(e, model, "Could not process the image");
            return "home";
        } catch (RuntimeException e) {
            handleException(e, model, "Face detection failed");
            return "home";
        }
    }

    
    /**
     * Displays the result page.
     */
    @GetMapping("/result")
    public String result(Model model) {
        model.addAttribute("activePage", "result");
        return "home";
    }

    /**
     * Displays the tracking page.
     */
    @GetMapping("/tracking")
    public String tracking(Model model) {
        model.addAttribute("activePage", "tracking");
        return "home";
    }

    /**
     * Displays the face recognition page.
     */
    @GetMapping("/recognize")
    public String recognise(Model model) {
        model.addAttribute("activePage", "recognize");
        return "home";
    }

    /**
     * Processes uploaded images for face recognition.
     * 
     * @param reference The reference image for comparison
     * @param images    The list of images to recognize faces in
     * @param model     The Spring model
     * @return ResponseEntity containing the recognition results
     */
    @PostMapping("/recognize")
    public ResponseEntity<?> handleRecognize(
            HttpServletRequest request,
            Model model) throws Exception {

        MultipartHttpServletRequest multipartRequest = (MultipartHttpServletRequest) request;

        MultipartFile reference = multipartRequest.getFile("reference");
        List<MultipartFile> images = multipartRequest.getFiles("images");

        // @PostMapping("/recognize")
        // public ResponseEntity<?> handleRecognize(
        // @RequestParam("reference") MultipartFile reference,
        // @RequestParam("images") List<MultipartFile> images,
        // Model model) {
        if (reference.isEmpty() || images.isEmpty()) {
            model.addAttribute("error", "File not found");
            return ResponseEntity.badRequest().body("File not found");
        }

        try {
            // Process the reference image
            byte[] referenceBytes = reference.getBytes();
            List<byte[]> imageList = new ArrayList<>();

            // Process all uploaded images
            for (MultipartFile file : images) {
                imageList.add(file.getBytes());

            }

            // Perform face recognition
            List<FaceRecognitionResult> result = faceRecognitionService.recogniseImage(referenceBytes, imageList);
            return ResponseEntity.ok(result);

        } catch (IOException e) {
            return handleApiException(e, model, "Could not process the image");
        } catch (RuntimeException e) {
            return handleApiException(e, model, "Face detection failed");
        }
    }

    /**
     * Processes uploaded images for face recognition.
     * 
     * @param reference The reference image for comparison
     * @param images    The list of images to recognize faces in
     * @param model     The Spring model
     * @return ResponseEntity containing the recognition results
     */
    @PostMapping("/recognize-frame")
    public ResponseEntity<?> handleRecognizeFrame(
            @RequestParam("reference") MultipartFile reference,
            @RequestParam("images") List<String> images,
            Model model) {
        if (reference.isEmpty() || images.isEmpty()) {
            model.addAttribute("error", "File not found");
            return ResponseEntity.badRequest().body("File not found");
        }

        try {
            // Process the reference image
            byte[] referenceBytes = reference.getBytes();
            List<byte[]> imageList = new ArrayList<>();

            // Process all uploaded images
            for (String file : images) {
                String base64Image = file.split(",")[1];
                byte[] imageBytes = Base64.getDecoder().decode(base64Image);
                imageList.add(imageBytes);

            }

            // Perform face recognition
            List<FaceRecognitionResult> result = faceRecognitionService.recogniseImage(referenceBytes, imageList);
            return ResponseEntity.ok(result);

        } catch (IOException e) {
            return handleApiException(e, model, "Could not process the image");
        } catch (RuntimeException e) {
            return handleApiException(e, model, "Face detection failed");
        }
    }

    /**
     * Displays the settings page.
     */
    @GetMapping("/settings")
    public String settings(Model model) {
        model.addAttribute("activePage", "settings");
        return "home";
    }

    @GetMapping("/about")
    public String about(Model model) {
        model.addAttribute("activePage", "about");
        return "home";
    }

    /**
     * Displays the help page.
     */
    @GetMapping("/help")
    public String help(Model model) {
        model.addAttribute("activePage", "help");
        return "home";
    }

    /**
     * Helper method to handle exceptions for regular requests.
     */
    private void handleException(Exception e, Model model, String messagePrefix) {
        e.printStackTrace();
        model.addAttribute("error", messagePrefix + ": " + e.getMessage());
    }

    /**
     * Helper method to handle exceptions for API requests.
     */
    private ResponseEntity<?> handleApiException(Exception e, Model model, String messagePrefix) {
        e.printStackTrace();
        String errorMessage = messagePrefix + ": " + e.getMessage();
        model.addAttribute("error", errorMessage);
        return ResponseEntity.badRequest().body(errorMessage);
    }
}