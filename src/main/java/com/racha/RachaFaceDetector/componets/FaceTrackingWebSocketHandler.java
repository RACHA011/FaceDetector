package com.racha.RachaFaceDetector.componets;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.racha.RachaFaceDetector.models.FaceDetectionResult;
import com.racha.RachaFaceDetector.service.FaceRecognitionService;

@Component
public class FaceTrackingWebSocketHandler extends TextWebSocketHandler {
    // private static final Gson gson = new Gson();
    @Autowired
    private FaceRecognitionService faceRecognitionService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public FaceTrackingWebSocketHandler(FaceRecognitionService faceRecognitionService) {
        this.faceRecognitionService = faceRecognitionService;
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
        try {
            String payload = message.getPayload();

            FaceDetectionResult result;

            // Check if it's a ping message
            if (payload.contains("\"type\":\"ping\"")) {
                session.sendMessage(new TextMessage("{\"type\":\"pong\"}"));
                return;
            }

            // Parse the JSON payload
            JsonNode jsonNode = objectMapper.readTree(payload);

            // Check if the message type is "detection"
            if ("detection".equals(jsonNode.get("type").asText())) {
                // Extract the frameData field
                String frameData = jsonNode.get("frameData").asText();

                // Process the frame (e.g., detect faces)
                result = faceRecognitionService.detectFacesInFrame(frameData);

                // Send the result back to the client
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(result)));
            } else if ("recognition".equals(jsonNode.get("type").asText())){
                // Extract the frameData field
                String frameData = jsonNode.get("frameData").asText();
                String referenceImage = jsonNode.get("referenceImage").asText();

                // Process the frame (e.g., detect faces)
                result = faceRecognitionService.recogniseFacesInFrame(frameData, referenceImage);

                // Send the result back to the client
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(result)));
            }else {
                // Handle other message types if needed
                session.sendMessage(new TextMessage("{\"message\":\"Unsupported message type\"}"));
            }

            // Send the result back to the client
            // session.sendMessage(new TextMessage(objectMapper.writeValueAsString(result)));
        } catch (Exception e) {
            System.err.println("Error processing frame: " + e.getMessage());
            session.sendMessage(new TextMessage("{\"faces\":[],\"message\":\"Error processing frame\"}"));
        }
    }
}