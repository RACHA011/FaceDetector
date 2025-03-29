package com.racha.RachaFaceDetector.service;

import static org.bytedeco.opencv.global.opencv_core.CV_32F;
import static org.bytedeco.opencv.global.opencv_dnn.blobFromImage;
import static org.bytedeco.opencv.global.opencv_dnn.readNetFromCaffe;
import static org.bytedeco.opencv.global.opencv_imgproc.rectangle;
import static org.bytedeco.opencv.global.opencv_imgproc.resize;

import java.io.IOException;
import java.net.URL;
import java.nio.IntBuffer;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.ListIterator;

import org.bytedeco.javacpp.BytePointer;
import org.bytedeco.javacpp.DoublePointer;
import org.bytedeco.javacpp.IntPointer;
import org.bytedeco.javacpp.indexer.FloatIndexer;
import org.bytedeco.opencv.global.opencv_imgcodecs;
import org.bytedeco.opencv.global.opencv_imgproc;
import org.bytedeco.opencv.opencv_core.Mat;
import org.bytedeco.opencv.opencv_core.MatVector;
import org.bytedeco.opencv.opencv_core.Point;
import org.bytedeco.opencv.opencv_core.Rect;
import org.bytedeco.opencv.opencv_core.Scalar;
import org.bytedeco.opencv.opencv_core.Size;
import org.bytedeco.opencv.opencv_dnn.Net;
import org.bytedeco.opencv.opencv_face.FaceRecognizer;
import org.bytedeco.opencv.opencv_face.LBPHFaceRecognizer;
import org.opencv.imgproc.Imgproc;
import org.springframework.stereotype.Service;

import static org.bytedeco.opencv.global.opencv_core.CV_32SC1;

import com.racha.RachaFaceDetector.models.FaceCoordinates;
import com.racha.RachaFaceDetector.models.FaceDetectionResult;
import com.racha.RachaFaceDetector.models.FaceRecognitionResult;

@Service
public class FaceRecognitionService {

    private static final String PROTO_FILE = "/static/opencv/deploy.prototxt";
    private static final String CAFFE_MODEL_FILE = "/static/opencv/res10_300x300_ssd_iter_140000.caffemodel";

    private static Net net = null;

    static {
        try {
            // Get file paths correctly
            URL protoFileUrl = FaceRecognitionService.class.getResource(PROTO_FILE);
            URL caffeModelFileUrl = FaceRecognitionService.class.getResource(CAFFE_MODEL_FILE);

            if (protoFileUrl == null || caffeModelFileUrl == null) {
                throw new IOException("Error: Model files not found!");
            }

            String protoPath = Paths.get(protoFileUrl.toURI()).toString();
            String caffeModelPath = Paths.get(caffeModelFileUrl.toURI()).toString();

            // Load model correctly
            net = readNetFromCaffe(protoPath, caffeModelPath);

            if (net.empty()) {
                throw new RuntimeException("Error: Could not load the deep learning model.");
            }
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Failed to initialize FaceRecognitionService", e);
        }
    }

    /**
     * Detects faces in an image provided as a MultipartFile and returns the
     * processed
     * image as a byte array.
     *
     * @param file The input image as a MultipartFile.
     * @return The processed image with detected faces as a byte array.
     */
    public byte[] detectFaces(byte[] fileBytes) {
        try {

            // Convert byte array to Mat using OpenCV
            Mat originalImage = opencv_imgcodecs.imdecode(new Mat(fileBytes), opencv_imgcodecs.IMREAD_COLOR);
            if (originalImage == null || originalImage.empty()) {
                throw new RuntimeException("Error: Could not read the saved image.");
            }

            // Get original dimensions
            int originalWidth = originalImage.cols();
            int originalHeight = originalImage.rows();

            // Resize the image to a manageable size for processing
            Mat resizedImage = new Mat();
            opencv_imgproc.resize(originalImage, resizedImage, new Size(1000, 1000));

            // Perform face detection on the resized image
            Mat processedImage = detectFacesInImage(resizedImage);

            // Resize the processed image back to the original dimensions
            Mat restoredImage = new Mat();
            opencv_imgproc.resize(processedImage, restoredImage, new Size(originalWidth, originalHeight));

            BytePointer bytePointer = new BytePointer();
            opencv_imgcodecs.imencode(".jpg", restoredImage, bytePointer);
            return bytePointer.getStringBytes();
        } catch (Exception e) {
            throw new RuntimeException("Error: Could not process the image.", e);
        }
    }

    /**
     * Detects faces in an image and draws rectangles around them.
     *
     * @param image The input image as a Mat object.
     * @return The processed image with detected faces as a Mat object.
     */
    private Mat detectFacesInImage(Mat image) {
        // Create a 4-dimensional blob from the image (resize to 300x300 for the model)
        Mat resizedImage = new Mat();
        resize(image, resizedImage, new Size(300, 300));
        Mat blob = blobFromImage(resizedImage, 1.0, new Size(300, 300), new Scalar(104.0, 177.0, 123.0, 0), false,
                false, CV_32F);

        // Set the input to the network model
        net.setInput(blob);

        // Perform forward pass to get the output matrix
        Mat output = net.forward();

        // Process the output to draw rectangles around detected faces
        try (Mat ne = new Mat(new Size(output.size(3), output.size(2)), CV_32F, output.ptr(0, 0))) {
            FloatIndexer srcIndexer = ne.createIndexer();

            for (int i = 0; i < output.size(3); i++) {
                float confidence = srcIndexer.get(i, 2);
                float f1 = srcIndexer.get(i, 3);
                float f2 = srcIndexer.get(i, 4);
                float f3 = srcIndexer.get(i, 5);
                float f4 = srcIndexer.get(i, 6);

                if (confidence > 0.6) {
                    // Scale the bounding box coordinates back to the original image size
                    float tx = f1 * image.cols(); // Top-left x
                    float ty = f2 * image.rows(); // Top-left y
                    float bx = f3 * image.cols(); // Bottom-right x
                    float by = f4 * image.rows(); // Bottom-right y

                    // Draw a rectangle around the detected face on the original image
                    rectangle(
                            image,
                            new Rect(new Point((int) tx, (int) ty), new Point((int) bx, (int) by)),
                            new Scalar(255, 0, 0, 0), // Green color (BGR format)
                            5, // Thickness of the rectangle (increased from default 1)
                            opencv_imgproc.LINE_8, // Line type
                            0 // Shift
                    );
                }
            }
        }

        return image;
    }

    /**
     * Detects faces in a base64-encoded image and returns the face coordinates.
     *
     * @param frameData The base64-encoded image data.
     * @return A FaceDetectionResult containing the detected faces.
     */
    public FaceDetectionResult detectFacesInFrame(String frameData) {
        try {
            // Decode the base64 image
            String base64Image = frameData.split(",")[1];
            byte[] imageBytes = Base64.getDecoder().decode(base64Image);

            // Convert byte array to Mat using OpenCV
            Mat image = opencv_imgcodecs.imdecode(new Mat(imageBytes), opencv_imgcodecs.IMREAD_COLOR);
            if (image.empty()) {
                return new FaceDetectionResult(new ArrayList<>(), "Failed to decode image");
            }

            // Perform face detection
            List<FaceCoordinates> faces = detectFacesInImages(image, true);
            return new FaceDetectionResult(faces, "Success");
        } catch (Exception e) {
            e.printStackTrace();
            return new FaceDetectionResult(new ArrayList<>(), "Error: " + e.getMessage());
        }
    }

    public FaceDetectionResult recogniseFacesInFrame(String frameData, String referenceImage) {
        try {
            // Decode the base64 image
            String base64Image = frameData.split(",")[1];
            byte[] imageBytes = Base64.getDecoder().decode(base64Image);

            String base64ReferenceImage = referenceImage.split(",")[1];
            byte[] referenceImageBytes = Base64.getDecoder().decode(base64ReferenceImage);

            // Convert byte array to Mat using OpenCV
            Mat image = opencv_imgcodecs.imdecode(new Mat(imageBytes), opencv_imgcodecs.IMREAD_COLOR);
            if (image.empty()) {
                return new FaceDetectionResult(new ArrayList<>(), "Failed to decode image");
            }

            Mat refImage = opencv_imgcodecs.imdecode(new Mat(referenceImageBytes), opencv_imgcodecs.IMREAD_COLOR);
            if (refImage.empty()) {
                return new FaceDetectionResult(new ArrayList<>(), "Failed to decode reference Image");
            }

            // Perform face detection
            List<FaceCoordinates> faces = recogniseFacesInImages(image, refImage);

            return new FaceDetectionResult(faces, "Success");
        } catch (Exception e) {
            e.printStackTrace();
            return new FaceDetectionResult(new ArrayList<>(), "Error: " + e.getMessage());
        }
    }

    public List<FaceRecognitionResult> recogniseImage(byte[] image, List<byte[]> images) {
        // handle images
        Mat referenceImage = opencv_imgcodecs.imdecode(new Mat(image), opencv_imgcodecs.IMREAD_COLOR);

        List<FaceRecognitionResult> recognitionResult = new ArrayList<>();

        // convert all the images to Mat
        for (byte[] trainingImage : images) {
            Mat trImage = opencv_imgcodecs.imdecode(new Mat(trainingImage), opencv_imgcodecs.IMREAD_COLOR);

            // perform recognition here
            recognitionResult.add(recogniseInImages(referenceImage, trImage));

        }

        return recognitionResult;
    }

    /**
     * Detects faces in an image and returns their coordinates.
     *
     * @param image The input image as a Mat object.
     * @return A list of FaceCoordinates representing the detected faces.
     */
    private List<FaceCoordinates> detectFacesInImages(Mat image, boolean isDetect) {
        List<FaceCoordinates> faces = new ArrayList<>();

        // Ensure the image is in RGB format
        if (image.channels() == 1 && !isDetect) {
            opencv_imgproc.cvtColor(image, image, opencv_imgproc.COLOR_GRAY2BGR);
        }

        // Resize the image to a manageable size for processing
        Mat resizedImage = new Mat();
        resize(image, resizedImage, new Size(300, 300));

        // Create a 4-dimensional blob from the image
        Mat blob = blobFromImage(resizedImage, 1.0, new Size(300, 300), new Scalar(104.0, 177.0, 123.0, 0), false,
                false, CV_32F);

        // Set the input to the network model
        net.setInput(blob);

        // Perform forward pass to get the output matrix
        Mat output = net.forward();

        // Process the output to extract face coordinates
        try (Mat ne = new Mat(new Size(output.size(3), output.size(2)), CV_32F, output.ptr(0, 0))) {
            FloatIndexer srcIndexer = ne.createIndexer();

            for (int i = 0; i < output.size(3); i++) {
                float confidence = srcIndexer.get(i, 2);
                if (confidence > 0.6) {
                    // Scale the bounding box coordinates back to the original image size
                    float tx = srcIndexer.get(i, 3) * image.cols(); // Top-left x
                    float ty = srcIndexer.get(i, 4) * image.rows(); // Top-left y
                    float bx = srcIndexer.get(i, 5) * image.cols(); // Bottom-right x
                    float by = srcIndexer.get(i, 6) * image.rows(); // Bottom-right y

                    int width = (int) (bx - tx);
                    int height = (int) (by - ty);

                    faces.add(new FaceCoordinates((int) tx, (int) ty, width, height, confidence));
                }
            }
        }

        return faces;
    }

    /**
     * Recognizes faces in an image by comparing them to a reference image.
     *
     * @param image    The image containing the face(s) to recognize.
     * @param refImage The reference image used for training the face recognizer.
     * @return A list of FaceCoordinates objects representing the detected faces and
     *         their confidence scores.
     */
    private List<FaceCoordinates> recogniseFacesInImages(Mat image, Mat refImage) {
        List<FaceCoordinates> faces = new ArrayList<>();

        // Ensure the image and reference image are in RGB format
        if (refImage.channels() == 1 && image.channels() == 1) {
            opencv_imgproc.cvtColor(image, image, opencv_imgproc.COLOR_GRAY2BGR);
            opencv_imgproc.cvtColor(refImage, refImage, opencv_imgproc.COLOR_GRAY2BGR);
        }

        // Resize the reference image to a manageable size for processing
        Mat resizedImage = new Mat();
        resize(refImage, resizedImage, new Size(300, 300));

        // Create a 4-dimensional blob from the resized reference image
        Mat blob = blobFromImage(resizedImage, 1.0, new Size(300, 300), new Scalar(104.0, 177.0, 123.0, 0), false,
                false, CV_32F);

        // Set the input to the neural network model
        net.setInput(blob);

        // Perform a forward pass to get the output matrix
        Mat output = net.forward();

        // Initialize the face recognizer (LBPH in this case)
        FaceRecognizer recognizer = LBPHFaceRecognizer.create();

        // Prepare the training data
        MatVector trainingMatVector = new MatVector(1); // Holds the training images
        Mat labels = new Mat(1, 1, CV_32SC1); // Holds the labels for the training images
        IntBuffer labelsBuf = labels.createBuffer(); // Buffer to manipulate labels

        // Convert the reference image to grayscale (required for training)
        Mat grayTrainingImage = new Mat();
        opencv_imgproc.cvtColor(refImage, grayTrainingImage, Imgproc.COLOR_BGR2GRAY);

        // Add the reference image to the training data and assign it a label (e.g., 1)
        trainingMatVector.put(0, grayTrainingImage);
        labelsBuf.put(0, 1); // Label 1 for the reference image

        // Train the face recognizer with the reference image
        recognizer.train(trainingMatVector, labels);

        // Process the output matrix to extract face coordinates
        try (Mat ne = new Mat(new Size(output.size(3), output.size(2)), CV_32F, output.ptr(0, 0))) {
            FloatIndexer srcIndexer = ne.createIndexer();

            // Iterate over the detected faces in the output matrix
            for (int i = 0; i < output.size(3); i++) {
                float confidence = srcIndexer.get(i, 2); // Confidence score for the detected face

                // Only consider faces with a confidence score above 0.6
                if (confidence > 0.6) {
                    // Scale the bounding box coordinates back to the original image size
                    float tx = srcIndexer.get(i, 3) * refImage.cols(); // Top-left x
                    float ty = srcIndexer.get(i, 4) * refImage.rows(); // Top-left y
                    float bx = srcIndexer.get(i, 5) * refImage.cols(); // Bottom-right x
                    float by = srcIndexer.get(i, 6) * refImage.rows(); // Bottom-right y

                    // Predict the label and confidence for the detected face
                    IntPointer label = new IntPointer(1);
                    DoublePointer recogniseConfidence = new DoublePointer(1);

                    Mat grayImage = new Mat();
                    opencv_imgproc.cvtColor(image, grayImage, Imgproc.COLOR_BGR2GRAY);

                    recognizer.predict(grayImage, label, recogniseConfidence);

                    // Get the confidence score for the recognized face
                    double confidenceScore = recogniseConfidence.get(0);

                    // Calculate the width and height of the bounding box
                    int width = (int) (bx - tx);
                    int height = (int) (by - ty);

                    // Add the detected face to the list of faces
                    faces.add(new FaceCoordinates((int) tx, (int) ty, width, height, confidenceScore));
                }
            }
        }

        return faces;
    }

    /**
     * Recognizes faces in an input image by comparing it with a reference image.
     *
     * @param inputImage    The input image to recognize faces in.
     * @param trainingImage A single reference image to compare against.
     * @return FaceCoordinates with recognition results.
     */
    public FaceRecognitionResult recogniseInImages(Mat inputImage, Mat trainingImage) {
        List<FaceCoordinates> faces = new ArrayList<>();
        FaceRecognitionResult result = new FaceRecognitionResult();

        // Step 1: Detect faces in the input image
        List<FaceCoordinates> detectedFaces = detectFacesInImages(inputImage, false);
        if (detectedFaces.isEmpty()) {
            // Handle case when no faces are detected in input image
            result.setConfidence(Double.MAX_VALUE);

            // Return original training image in result
            BytePointer bytePointer = new BytePointer();
            opencv_imgcodecs.imencode(".jpg", trainingImage, bytePointer);
            result.setImage(bytePointer.getStringBytes());

            return result;
        }

        // Step 2: Detect faces in the training image
        List<FaceCoordinates> trainingFaces = detectFacesInImages(trainingImage, false);
        if (trainingFaces.isEmpty()) {
            // Handle case when no face is detected in training image
            result.setConfidence(Double.MAX_VALUE);

            // Process input image to show no matches
            Mat processedImage = trainingImage.clone();
            for (FaceCoordinates face : trainingFaces) {
                // Draw red rectangles for all faces (no match)
                rectangle(
                        processedImage,
                        new Rect(new Point(face.getX(), face.getY()),
                                new Point(face.getX() + face.getWidth(), face.getY() + face.getHeight())),
                        new Scalar(0, 0, 255, 0), // Red for no match
                        3,
                        opencv_imgproc.LINE_8,
                        0);

                // Add "No Reference" text
                opencv_imgproc.putText(
                        processedImage,
                        "No Reference Face",
                        new Point(face.getX(), face.getY() - 10),
                        opencv_imgproc.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        new Scalar(0, 0, 255, 0),
                        2,
                        opencv_imgproc.LINE_AA,
                        false);
            }

            BytePointer bytePointer = new BytePointer();
            opencv_imgcodecs.imencode(".jpg", processedImage, bytePointer);
            result.setImage(bytePointer.getStringBytes());

            return result;
        }

        // Get the first face from training image for recognition training
        FaceCoordinates trainingFace = trainingFaces.get(0);

        // Crop the face from training image
        Mat trainingFaceROI = new Mat(trainingImage, new Rect(
                trainingFace.getX(), trainingFace.getY(),
                trainingFace.getWidth(), trainingFace.getHeight()));

        // Create a copy of the training image with face detection visualization
        Mat processedImage = trainingImage.clone();

        // Draw rectangle on the training face
        rectangle(
                processedImage,
                new Rect(new Point(trainingFace.getX(), trainingFace.getY()),
                        new Point(trainingFace.getX() + trainingFace.getWidth(),
                                trainingFace.getY() + trainingFace.getHeight())),
                new Scalar(0, 255, 0, 0), // Green for reference face
                3,
                opencv_imgproc.LINE_8,
                0);

        // Step 3: Resize the training face to standard size and convert to grayscale
        Mat resizedTrainingFace = new Mat();
        opencv_imgproc.resize(trainingFaceROI, resizedTrainingFace, new Size(160, 160));

        Mat grayTrainingFace = new Mat();
        opencv_imgproc.cvtColor(resizedTrainingFace, grayTrainingFace, Imgproc.COLOR_BGR2GRAY);

        // Enhance contrast with histogram equalization
        opencv_imgproc.equalizeHist(grayTrainingFace, grayTrainingFace);

        // Step 4: Train the face recognizer on the processed reference image
        FaceRecognizer recognizer = LBPHFaceRecognizer.create(2, 8, 8, 8, 90.0);
        MatVector trainingMatVector = new MatVector(1);
        Mat labels = new Mat(1, 1, CV_32SC1);
        IntBuffer labelsBuf = labels.createBuffer();

        // Add the single training image
        trainingMatVector.put(0, grayTrainingFace);
        labelsBuf.put(0, 1); // Assign label 1 to the reference image

        // Train the face recognizer
        recognizer.train(trainingMatVector, labels);

        // Step 5: Recognize each detected face
        double bestConfidence = Double.MAX_VALUE; // Lower is better for LBPH

        ListIterator<FaceCoordinates> trainingIterator = trainingFaces.listIterator();

        for (FaceCoordinates face : detectedFaces) {
            // Crop the detected face
            Mat faceImage = new Mat(inputImage, new Rect(
                    face.getX(), face.getY(), face.getWidth(), face.getHeight()));

            // Resize the face image to the same size used for training
            Mat resizedFace = new Mat();
            opencv_imgproc.resize(faceImage, resizedFace, new Size(160, 160));

            // Convert face image to grayscale
            Mat grayFaceImage = new Mat();
            opencv_imgproc.cvtColor(resizedFace, grayFaceImage, Imgproc.COLOR_BGR2GRAY);

            // Enhance contrast with histogram equalization (same as training)
            opencv_imgproc.equalizeHist(grayFaceImage, grayFaceImage);

            // Predict the label and confidence for the detected face
            IntPointer label = new IntPointer(1);
            DoublePointer confidence = new DoublePointer(1);
            recognizer.predict(grayFaceImage, label, confidence);

            int predictedLabel = label.get(0);
            double confidenceScore = confidence.get(0);

            // Keep track of the best match (lowest confidence score)
            if (confidenceScore < bestConfidence) {
                bestConfidence = confidenceScore;
            }
            FaceCoordinates temp = trainingIterator.next();

            face = temp;

            // Update the face coordinates with recognition results
            face.setLabel(predictedLabel);
            face.setConfidence(confidenceScore);
            faces.add(face);
        }

        // Draw all detected faces on a copy of the input image
        Mat resultImage = trainingImage.clone();
        for (FaceCoordinates face : faces) {
            // Set confidence threshold for matches for now ill make it 99.99
            boolean isMatch = face.getConfidence() < 99.99;

            // Draw the bounding box (green for matches, red for non-matches)
            rectangle(
                    resultImage,
                    new Rect(new Point(face.getX(), face.getY()),
                            new Point(face.getX() + face.getWidth(), face.getY() + face.getHeight())),
                    new Scalar(0, isMatch ? 255 : 0, isMatch ? 0 : 255, 0),
                    3,
                    opencv_imgproc.LINE_8,
                    0);

            // Add text for match percentage if it's a match
            if (isMatch) {
                double matchPercentage = Math.max(0, 100 - face.getConfidence());
                opencv_imgproc.putText(
                        resultImage,
                        String.format("Match: %.1f%%", matchPercentage),
                        new Point(face.getX(), face.getY() - 10),
                        opencv_imgproc.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        new Scalar(0, 255, 0, 0),
                        2,
                        opencv_imgproc.LINE_AA,
                        false);
            } else {
                opencv_imgproc.putText(
                        resultImage,
                        "No Match",
                        new Point(face.getX(), face.getY() - 10),
                        opencv_imgproc.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        new Scalar(0, 0, 255, 0),
                        2,
                        opencv_imgproc.LINE_AA,
                        false);
            }
        }

        // Set the best confidence score for the result
        result.setConfidence(bestConfidence);

        // Encode the processed result image
        BytePointer bytePointer = new BytePointer();
        opencv_imgcodecs.imencode(".jpg", resultImage, bytePointer);
        result.setImage(bytePointer.getStringBytes());

        return result;
    }

}
