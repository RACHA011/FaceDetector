# RachaFaceDetector - Face Detection and Recognition System

![Project Logo](https://rachafacedetector.onrender.com/images/image.png) *(app logo)*

## Overview

RachaFaceDetector is a Spring Boot application that provides real-time face detection and recognition capabilities using OpenCV's deep learning models. The system can:

- Detect faces in images and video streams
- Recognize faces by comparing them against reference images
- Provide confidence scores for matches
- Offer WebSocket API for real-time processing

## Features

- **Face Detection**: Identify faces in images using OpenCV's DNN module
- **Face Recognition**: Compare faces against reference images using LBPH algorithm
- **WebSocket API**: Real-time face detection/recognition for web applications
- **RESTful Endpoints**: For image processing and analysis
- **Spring Boot**: Easy deployment and configuration

## Prerequisites

Before you begin, ensure you have the following installed:

- Java JDK 21
- Maven 3.8+
- OpenCV 4.10.0 (automatically managed by Maven)
- Docker (optional, for containerized deployment)

## Installation

### 1. Clone the Repository

```bash
git clonehttps://github.com/RACHA011/RachaFaceDetector.git
cd RachaFaceDetector
```

### 2. Build the Project

```bash
mvn clean package
```

### 3. Run the Application

```bash
java -jar target/RachaFaceDetector-0.0.1-SNAPSHOT.jar
```
or
```bash
./mvnw spring-boot:run
```

### 4. Docker Deployment (Optional)

```bash
docker build -t rachafacedetector .
docker run -p 8080:8080 rachafacedetector
```

## API Documentation

### WebSocket Endpoint

```
ws://localhost:8080/face-tracking-socket
```

#### Message Formats:

**Face Detection Request:**
```json
{
  "type": "detection",
  "frameData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
}
```

**Face Recognition Request:**
```json
{
  "type": "recognition",
  "frameData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...",
  "referenceImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
}
```

**Response Format:**
```json
{
  "faces": [
    {
      "x": 100,
      "y": 150,
      "width": 200,
      "height": 200,
      "confidence": 95.5
    }
  ],
  "message": "Success"
}
```

### Endpoints

- **Face Detection**
  - `POST /detect` - Detect faces in an uploaded image.

- **Face Recognition**
  - `POST /recognize` - Recognize faces against a reference image.
  - `POST /recognize-frame` - Recognize faces using base64-encoded images.

- **Navigation & UI**
  - `GET /` - Display the home page.
  - `GET /detect` - Display the face detection page.
  - `GET /tracking` - Display the tracking page.
  - `GET /recognize` - Display the face recognition page.
  - `GET /result` - Display the result page.
  - `GET /settings` - Display the settings page.
  - `GET /about` - Display the about page.
  - `GET /help` - Display the help page.

## Project Structure

```
src/
├── main/
│   ├── java/
│   │   └── com/racha/RachaFaceDetector/
│   │       ├── components/          # WebSocket handler
│   │       ├── config/              # Configuration classes
│   │       ├── controller/          # REST controllers
│   │       ├── models/              # Data transfer objects
│   │       ├── service/             # Business logic
│   │       └── RachaFaceDetectorApplication.java
│   └── resources/
│       ├── static/
│       │   └── opencv/              # OpenCV model files
|       ├── template/                # Thymeleaf tempates
│       └── application.properties
└── test/                            # Test classes
```

## Troubleshooting

1. **Model files not found**:
   - Verify the files exist in `src/main/resources/static/opencv/`
   - Check the files are included in the final JAR (`jar tf target/*.jar`)

2. **OpenCV loading errors**:
   - Ensure you have the correct OpenCV version (4.10.0)
   - On Windows, you might need to add OpenCV DLLs to your PATH

3. **WebSocket connection issues**:
   - Verify the client is connecting to the correct endpoint
   - Check CORS settings if connecting from a web application

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature-branch`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature-branch`)
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenCV team for the excellent computer vision library
- Spring Boot team for the powerful framework
- JavaCV for the Java bindings to OpenCV

---

For any questions or support, please contact [ratshalingwaadivhaho106@gmail.com] / [rachadev032@gmail.com].#
