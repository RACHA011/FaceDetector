document.addEventListener("DOMContentLoaded", function () {
  // Elements
  const video = document.getElementById("recognition-video");
  const canvas = document.getElementById("recognise-canvas");
  const overlay = document.getElementById("recognition-video-overlay");
  const recognitionToggle = document.getElementById("recognition-toggle");
  const recognitionStatus = document.getElementById("recognition-status");

  // Tab switching
  const videoTab = document.getElementById("video-tab");
  const uploadTab = document.getElementById("upload-tab");
  const videoTabContent = document.getElementById("video-tab-content");
  const uploadTabContent = document.getElementById("upload-tab-content");

  // Reference face elements
  const referenceFileInput = document.getElementById("reference-file-input");
  const selectReferenceButton = document.getElementById(
    "select-reference-button"
  );
  const referenceUploadContainer = document.getElementById(
    "reference-upload-container"
  );
  const referencePreviewContainer = document.getElementById(
    "reference-preview-container"
  );
  const referenceImage = document.getElementById("reference-image");
  const clearReferenceButton = document.getElementById(
    "clear-reference-button"
  );

  // Target images elements
  const targetFileInput = document.getElementById("target-file-input");
  const selectTargetButton = document.getElementById("select-target-button");
  const targetImagesGrid = document.getElementById("target-images-grid");
  const targetImagesContainer = document.getElementById(
    "target-images-container"
  );
  const clearAllTargetsButton = document.getElementById(
    "clear-all-targets-button"
  );
  const detectInImagesButton = document.getElementById(
    "detect-in-images-button"
  );

  // Add new "Recognize" button for camera
  const recognizeButton = document.createElement("button");
  recognizeButton.id = "recognize-button";
  recognizeButton.className = "button button-primary";
  recognizeButton.innerHTML =
    '<i class="fas fa-search" style="margin-right: 0.5rem;"></i> Recognize Face';
  recognizeButton.style.marginRight = "10px";
  recognizeButton.disabled = true;

  // Add recognition result overlay for camera
  const cameraResultOverlay = document.createElement("div");
  cameraResultOverlay.id = "camera-recognition-result";
  cameraResultOverlay.className = "camera-recognition-result";
  cameraResultOverlay.style.display = "none";

  // Insert the recognize button before the toggle button in the footer
  const cardFooter = document.querySelector(".card-footer");
  cardFooter.insertBefore(recognizeButton, recognitionToggle);

  // Add the result overlay to the video container
  const videoContainer = document.querySelector(".video-container");
  videoContainer.appendChild(cameraResultOverlay);

  let isRecognition = false;
  let stream = null;
  let animationId = null;
  let socket = null;
  let recognitionMode = "video";
  let hasReferenceImage = false;
  let targetImages = [];
  let isRecognizing = false;

  // Set up canvas context
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("Canvas context not available");
    return;
  }

  // Initialize WebSocket
  function initWebSocket() {
    // Close any existing connection first
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close();
    }

    socket = new WebSocket("ws://rachafacedetector.onrender.com/face-tracking-socket");
    // socket = new WebSocket("ws://localhost:8080/face-tracking-socket");

    socket.onopen = () => {
      // console.log("WebSocket connection established");
      startKeepAlive();
    };

    socket.onmessage = (event) => {
      try {
        const result = JSON.parse(event.data);
        drawFaces(result.faces);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onclose = (event) => {
      // console.log("WebSocket connection closed", event.code, event.reason);
      stopKeepAlive();

      // Only attempt to reconnect if Recognition is still active
      if (isRecognition) {
        console.log("Attempting to reconnect WebSocket...");
        setTimeout(() => {
          if (isRecognition) {
            initWebSocket();
          }
        }, 2000); // Try to reconnect after 2 seconds
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  // Keep the connection alive with regular pings
  let keepAliveInterval;

  function startKeepAlive() {
    keepAliveInterval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        // Send a simple ping message
        socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000); // 30 seconds
  }

  function stopKeepAlive() {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
  }

  // Initialize camera
  async function initCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: "user",
        },
      });

      video.srcObject = stream;

      // Set canvas dimensions after video metadata is loaded
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      };

      overlay.style.display = "none";
      return true;
    } catch (err) {
      console.error("Error accessing camera:", err);
      recognitionStatus.textContent = "Error: Unable to access camera";
      overlay.innerHTML = "<p>Camera access denied or not available</p>";
      return false;
    }
  }

  // Stop camera
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
      stream = null;
    }

    overlay.style.display = "flex";
    overlay.innerHTML = "<p>Click Start Recognition to begin</p>";
    recognizeButton.disabled = true;
    hideCameraRecognitionResult();
  }

  // Toggle Recognition
  recognitionToggle.addEventListener("click", async function () {
    if (!hasReferenceImage) {
      alert("Please upload a reference face first");
      return;
    }

    if (isRecognition) {
      stopRecognition();
    } else {
      startRecognition();
    }
  });

  // Start face Recognition
  async function startRecognition() {
    recognitionStatus.textContent = "Initializing camera...";

    if (await initCamera()) {
      initWebSocket();
      isRecognition = true;
      recognitionToggle.textContent = "Close Camera";
      recognitionToggle.classList.remove("button-primary");
      recognitionToggle.classList.add("button-destructive");
      recognitionStatus.textContent = "Recognition active";
      recognizeButton.disabled = false;

      // Wait for video to be ready before starting to process frames
      video.addEventListener("loadeddata", function onVideoReady() {
        // Start processing frames
        processVideoFrames();
        // Remove the event listener to avoid multiple calls
        video.removeEventListener("loadeddata", onVideoReady);
      });

      // Backup timer in case loadeddata doesn't fire
      setTimeout(() => {
        if (isRecognition && !animationId && video.videoWidth > 0) {
          // console.log("Starting frame processing after timeout");
          processVideoFrames();
        }
      }, 1000);
    }
  }

  // Stop face recognition
  function stopRecognition() {
    isRecognition = false;
    recognitionToggle.textContent = "Start Recognition";
    recognitionToggle.classList.add("button-primary");
    recognitionToggle.classList.remove("button-destructive");
    recognitionStatus.textContent = "Recognition inactive";

    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Stop camera
    stopCamera();

    // Close WebSocket connection
    if (socket) {
      socket.close();
    }
  }

  // Process video frames
  function processVideoFrames() {
    if (!isRecognition) return;

    // Capture current frame
    captureFrame()
      .then((frameData) => {
        // Send frame to server via WebSocket
        if (socket && socket.readyState === WebSocket.OPEN) {
          // socket.send(
          //   JSON.stringify({
          //     type: "recognition",
          //     frameData: frameData,
          //     referenceImage: referenceImage.src, // Send reference image
          //   })
          // );
          // socket.send(
          //   JSON.stringify({ type: "detection", frameData: frameData })
          // );
        }
      })
      .catch((err) => {
        console.error("Error capturing frame:", err);
      });

    // Continue processing frames with a delay
    setTimeout(() => {
      animationId = requestAnimationFrame(processVideoFrames);
    }, 100); // Adjust the delay (in milliseconds) as needed
  }

  // Capture a frame from the video with reduced size and quality
  function captureFrame() {
    return new Promise((resolve, reject) => {
      if (!video.videoWidth || !video.videoHeight) {
        // console.log(
        //   "Video dimensions not available yet:",
        //   video.videoWidth,
        //   "x",
        //   video.videoHeight
        // );
        reject(new Error("Video not ready"));
        return;
      }

      const tempCanvas = document.createElement("canvas");
      const scaleFactor = 0.5; // Reduce to 50% of original size
      tempCanvas.width = video.videoWidth * scaleFactor;
      tempCanvas.height = video.videoHeight * scaleFactor;

      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

      // Use lower quality for JPEG encoding
      resolve(tempCanvas.toDataURL("image/jpeg", 0.6)); // Reduce quality to 60%
    });
  }

  // Frontend improvements for face recognition logic
  function drawFaces(faces) {
    // Clear canvas before drawing new faces
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!faces || faces.length === 0) {
      // Clear canvas before drawing new faces
      return;
    }

    ctx.strokeStyle = "#00BFFF"; // Deep sky blue
    ctx.lineWidth = 2;

    faces.forEach((face) => {
      const scaleX = canvas.width / 315;
      const scaleY = canvas.height / 250;

      // Scale face coordinates to match canvas dimensions
      const x = face.x * scaleX;
      const y = face.y * scaleY;
      const width = face.width * scaleX;
      const height = face.height * scaleY;

      // Ensure coordinates are within canvas bounds
      if (
        x >= 0 &&
        y >= 0 &&
        x + width <= canvas.width &&
        y + height <= canvas.height
      ) {
        // Draw rectangle
        ctx.strokeRect(x, y, width, height);

        // Draw confidence score
        ctx.fillStyle = "#00BFFF";
        ctx.font = "12px Arial";
        ctx.fillText(`${Math.round(face.confidence * 100)}%`, x, y - 5);

        // Force canvas update
        canvas.style.display = "block";
      } else {
        console.error("Face coordinates outside canvas bounds:", {
          x,
          y,
          width,
          height,
        });
      }
    });
  }

  // Tab switching
  function setRecognitionMode(mode) {
    recognitionMode = mode;

    videoTab.classList.toggle("active", mode === "video");
    uploadTab.classList.toggle("active", mode === "upload");

    videoTabContent.classList.toggle("active", mode === "video");
    uploadTabContent.classList.toggle("active", mode === "upload");

    if (isRecognition && mode !== "video") {
      stopRecognition();
    }
  }

  videoTab.addEventListener("click", () => {
    recognitionToggle.classList.remove("hidden");
    recognitionToggle.classList.add("button-primary");
    setRecognitionMode("video");
  });
  uploadTab.addEventListener("click", () => {
    if (isRecognition) stopRecognition();
    recognitionToggle.classList.remove("button-primary");

    recognitionToggle.classList.add("hidden");
    setRecognitionMode("upload");
  });

  // Reference image upload
  selectReferenceButton.addEventListener("click", () => {
    referenceFileInput.click();
  });

  referenceFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    // Validate file type
    if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
      alert('Only JPEG and PNG images are allowed.');
      referenceFileInput.value = ''; // Clear the file input
      return;
  }
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        referenceImage.src = event.target.result;
        referenceUploadContainer.style.display = "none";
        referencePreviewContainer.style.display = "block";
        hasReferenceImage = true;
        updateDetectButton();

        // Enable the recognize button if camera is active
        if (isRecognition) {
          recognizeButton.disabled = false;
        }
      };
      reader.readAsDataURL(file);
    }
  });

  clearReferenceButton.addEventListener("click", () => {
    referenceImage.src = "";
    referenceFileInput.value = "";
    referenceUploadContainer.style.display = "flex";
    referencePreviewContainer.style.display = "none";
    hasReferenceImage = false;
    updateDetectButton();
    recognizeButton.disabled = true;
    hideCameraRecognitionResult();
  });

  // Target images upload
  selectTargetButton.addEventListener("click", () => {
    targetFileInput.click();
  });

  targetFileInput.addEventListener("change", (e) => {
    
    if (e.target.files && e.target.files.length > 0) {
      // Show the target images grid if it's hidden
      if (targetImagesGrid.classList.contains("hidden")) {
        targetImagesGrid.classList.remove("hidden");
      }

      Array.from(e.target.files).forEach((file) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (event) => {
            addTargetImage(event.target.result, file);
          };
          reader.readAsDataURL(file);
        }
      });
      targetFileInput.value = "";
    }
  });

  function addTargetImage(src, file) {
    const imageId = `target-image-${Date.now()}`;
    targetImages.push({ id: imageId, src: src, file: file });

    const imageContainer = document.createElement("div");
    imageContainer.className = "target-image-container";
    imageContainer.id = imageId;

    const img = document.createElement("img");
    img.className = "target-image";
    img.src = src;
    img.alt = "Target image";

    const clearButton = document.createElement("button");
    clearButton.className = "clear-button";
    clearButton.innerHTML = '<i class="fas fa-times"></i>';
    clearButton.addEventListener("click", () => removeTargetImage(imageId));

    imageContainer.appendChild(img);
    imageContainer.appendChild(clearButton);
    targetImagesContainer.appendChild(imageContainer);

    updateDetectButton();
  }

  function removeTargetImage(imageId) {
    const element = document.getElementById(imageId);
    if (element) {
      element.remove();
      targetImages = targetImages.filter((img) => img.id !== imageId);

      // Hide the grid if no images left
      if (targetImages.length === 0) {
        targetImagesGrid.classList.add("hidden");
      }

      updateDetectButton();
    }
  }

  // Clear all target images
  clearAllTargetsButton.addEventListener("click", () => {
    targetImagesContainer.innerHTML = "";
    targetImages = [];
    targetImagesGrid.classList.add("hidden");
    updateDetectButton();
  });

  // Update detect button state
  function updateDetectButton() {
    detectInImagesButton.disabled = !(
      hasReferenceImage && targetImages.length > 0
    );
  }

  // Detect in images button
  detectInImagesButton.addEventListener("click", () => {
    if (!hasReferenceImage || targetImages.length === 0) {
      alert("Please select a reference image and at least one image.");
      return;
    }

    const referenceFile = referenceFileInput.files[0];
    const comparisonFiles = targetImages.map((img) => img.file);

    detectInImagesButton.textContent = "Processing...";
    detectInImagesButton.disabled = true;

    recognizeFaces(referenceFile, comparisonFiles)
      .then((results) => {

        results.forEach((result, index) => {
          const container = document.getElementById(targetImages[index].id);
          if (container) {
            // Update image with result
            container.querySelector("img").src =
              "data:image/jpeg;base64," + result.image;

            // Clear existing buttons and overlays
            const existingOverlay = container.querySelector(
              ".face-detection-result"
            );
            if (existingOverlay) existingOverlay.remove();

            const existingButton = container.querySelector(".clear-button");
            if (existingButton) existingButton.remove();

            // Create result overlay
            const resultOverlay = document.createElement("div");
            resultOverlay.className = "face-detection-result";

            // Better handling of confidence values
            // Lower confidence values in LBPH generally mean better matches
            // Set confidence threshold for matches for now ill make it 99.99 for development
            if (result.confidence < 99.99) {
              // container.classList.add("face-match");
              container.classList.remove("face-not-found");

              // Convert to a percentage scale that makes sense to users
              // For LBPH, 0 is perfect match, higher numbers are worse matches
              const matchPercentage = Math.max(0, 100 - result.confidence);
              resultOverlay.textContent = `Face Match! ${matchPercentage.toFixed(
                1
              )}%`;
            } else {
              container.classList.add("face-not-found");
              // container.classList.remove("face-match");
              resultOverlay.textContent = "No Match";
            }

            // Create clear button
            const clearButton = document.createElement("button");
            clearButton.className = "clear-button";
            clearButton.innerHTML = '<i class="fas fa-times"></i>';
            clearButton.addEventListener("click", () =>
              removeTargetImage(targetImages[index].id)
            );

            container.appendChild(resultOverlay);
            container.appendChild(clearButton);
          }
        });
      })
      .catch((error) => {
        alert("Recognition failed: " + error.message);
      })
      .finally(() => {
        detectInImagesButton.innerHTML =
          '<i class="fas fa-search" style="margin-right: 0.5rem;"></i> Recognise Face';
        detectInImagesButton.disabled = false;
      });
  });

  // New function to capture frames from the camera for recognition
  async function captureFramesForRecognition() {
    if (!isRecognition || !hasReferenceImage) {
      alert("Please start camera and upload a reference face first");
      return;
    }

    // Set recognizing state
    isRecognizing = true;
    recognizeButton.textContent = "Processing...";
    recognizeButton.disabled = true;
    recognitionStatus.textContent = "Capturing frames for recognition...";

    try {
      // Capture 5 frames with a slight delay between them
      const frames = [];
      for (let i = 0; i < 5; i++) {
        if (!isRecognition) break; // Stop if recognition has been turned off

        try {
          await captureFrame()
            .then((frameData) => {
              frames.push(frameData);
            })
            .catch((err) => {
              console.error("Error capturing frame:", err);
            });

          // const frame = await captureFrame();
          // // Convert data URL to Blob, then to File
          // const blob = await fetch(frame).then((r) => r.blob());

          // const file = new File([blob], `frame-${i}.jpg`, {
          //   type: "image/jpeg",
          // });

          // Small delay between captures
          if (i < 4) await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
          console.error("Error capturing frame:", error);
        }
      }

      if (frames.length === 0) {
        throw new Error("Failed to capture any frames");
      }

      // Get reference file
      const referenceFile = referenceFileInput.files[0];

      // console.log(frames.join("\n").name)

      // Process the frames
      const results = await recognizeFaces(referenceFile, frames, true);

      // Check if any frame has a match
      let bestMatch = null;
      results.forEach((result) => {
        // Set confidence threshold for matches for now ill make it 99.99 for development
        if (result.confidence < 99.99) {
          if (!bestMatch || result.confidence < bestMatch.confidence) {
            bestMatch = result;
          }
        }
      });

      // Display results
      // if (bestMatch) {
      //   const matchPercentage = Math.max(0, 100 - bestMatch.confidence);
      //   showCameraRecognitionResult(true, matchPercentage.toFixed(1));
      // } else {
      //   showCameraRecognitionResult(false);
      // }

      // console.log("Recognition results:" + results[0].confidence);
    } catch (error) {
      console.error("Recognition error:", error);
      alert("Recognition failed: " + error.message);
      hideCameraRecognitionResult();
    } finally {
      // Reset state
      isRecognizing = false;
      recognizeButton.innerHTML =
        '<i class="fas fa-search" style="margin-right: 0.5rem;"></i> Recognize Face';
      recognizeButton.disabled = false;
      recognitionStatus.textContent = "Recognition active";
    }
  }

  // Function to show camera recognition result
  function showCameraRecognitionResult(isMatch, matchPercentage = null) {
    cameraResultOverlay.style.display = "flex";

    if (isMatch) {
      cameraResultOverlay.classList.add("match-found");
      cameraResultOverlay.classList.remove("match-not-found");
      cameraResultOverlay.textContent = `Match Found! ${matchPercentage}%`;
    } else {
      cameraResultOverlay.classList.add("match-not-found");
      cameraResultOverlay.classList.remove("match-found");
      cameraResultOverlay.textContent = "No Match Found";
    }

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (cameraResultOverlay.style.display !== "none") {
        hideCameraRecognitionResult();
      }
    }, 5000);
  }

  // Function to hide camera recognition result
  function hideCameraRecognitionResult() {
    cameraResultOverlay.style.display = "none";
  }

  // Add event listener for recognize button
  recognizeButton.addEventListener("click", captureFramesForRecognition);

  // Initialize the app
  function initApp() {
    setRecognitionMode("video");

    // Add CSS for camera recognition result
    const style = document.createElement("style");
    style.textContent = `
      .camera-recognition-result {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 10px 20px;
        border-radius: 4px;
        font-weight: bold;
        z-index: 100;
        text-align: center;
      }
      .match-found {
        background-color: rgba(0, 255, 0, 0.7);
        color: #000;
      }
      .match-not-found {
        background-color: rgba(255, 0, 0, 0.7);
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }

  // Start the app
  initApp();
});

/**
 * Sends a reference image and multiple comparison images to the face recognition endpoint
 * @param {File} referenceImage - The reference image file
 * @param {File[]} comparisonImages - Array of image files to compare against the reference
 * @returns {Promise} Promise that resolves to the recognition results
 */
async function recognizeFaces(referenceImage, comparisonImages, isFrames) {
  // Create FormData object to handle file uploads
  const formData = new FormData();

  // Add reference image
  formData.append("reference", referenceImage);

  // Add all comparison images
  comparisonImages.forEach((image, index) => {
    formData.append("images", image); // Use the same parameter name for all images
  });

  // Debugging: Log the files being sent
  // console.log("Reference file:", referenceImage.name);
  // console.log(
  //   "Comparison files:",
  //   comparisonImages.map((img) => img).join(", ")
  // );

  // Configure the fetch request
  return await fetch(isFrames ? "/recognize-frame" : "/recognize", {
    method: "POST",
    body: formData,
    // Do not set Content-Type header manually; let the browser handle it
  })
    .then(async (response) => {
      if (!response.ok) {
        // Parse the error response as text or JSON
        const text = await response.text();
        throw new Error(text || "Recognition request failed");
      }
      return response.json(); // Parse JSON response
    })
    .then((results) => {
      // Return the face recognition results
      return results;
    })
    .catch((error) => {
      console.error("Face recognition error:", error);
      throw error; // Re-throw to allow handling by caller
    });
}
