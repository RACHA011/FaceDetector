package com.racha.RachaFaceDetector.models;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class FaceRecognitionResult {
    private byte[] image;
    
    private double confidence;
  
}