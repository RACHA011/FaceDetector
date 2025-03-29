package com.racha.RachaFaceDetector.models;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@ToString
public class FaceDetectionResult {
    @JsonProperty("faces")
    private List<FaceCoordinates> faces;
    
    @JsonProperty("message")
    private String message;
    
    // Remove this method since we're using ObjectMapper now
    // public String toJson() {
    //    // Not needed anymore
    // }
}