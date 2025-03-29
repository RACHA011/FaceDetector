package com.racha.RachaFaceDetector.models;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;


@NoArgsConstructor
@AllArgsConstructor
@ToString
@Getter
@Setter
public class FaceCoordinates {
    private int x;
    private int y;
    private int width;
    private int height;
    private double confidence;
    private int label;

    public FaceCoordinates(int x, int y, int width, int height,double confidence){
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.confidence = confidence;
    }

}

