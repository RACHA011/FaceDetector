document.addEventListener("DOMContentLoaded", function () {
  // Elements
  const video = document.getElementById("video-feed");
  const canvas = document.getElementById("tracking-canvas");
  const overlay = document.getElementById("video-overlay");
  const trackingToggle = document.getElementById("tracking-toggle");
  const trackingStatus = document.getElementById("tracking-status");

  let isTracking = false;
  let stream = null;
  let animationId = null;
  let socket = null;

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

      // Only attempt to reconnect if tracking is still active
      if (isTracking) {
        console.log("Attempting to reconnect WebSocket...");
        setTimeout(() => {
          if (isTracking) {
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
          width: { ideal: 640 },
          height: { ideal: 480 },
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
      trackingStatus.textContent = "Error: Unable to access camera";
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
    overlay.innerHTML = "<p>Click Start Tracking to begin</p>";
  }

  // Toggle tracking
  trackingToggle.addEventListener("click", async function () {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  });

  // Start face tracking
  async function startTracking() {
    trackingStatus.textContent = "Initializing camera...";

    if (await initCamera()) {
      initWebSocket();
      isTracking = true;
      trackingToggle.textContent = "Stop Tracking";
      trackingStatus.textContent = "Tracking active";

      // Wait for video to be ready before starting to process frames
      video.addEventListener("loadeddata", function onVideoReady() {
        //   console.log(
        //   console.log(
        //     "Video ready, dimensions:",
        //     video.videoWidth,
        //     "x",
        //     video.videoHeight
        //   );
        // Start processing frames
        processVideoFrames();
        // Remove the event listener to avoid multiple calls
        video.removeEventListener("loadeddata", onVideoReady);
      });

      // Backup timer in case loadeddata doesn't fire
      setTimeout(() => {
        if (isTracking && !animationId && video.videoWidth > 0) {
          // console.log("Starting frame processing after timeout");
          processVideoFrames();
        }
      }, 1000);
    }
  }

  // Stop face tracking
  function stopTracking() {
    isTracking = false;
    trackingToggle.textContent = "Start Tracking";
    trackingStatus.textContent = "Tracking inactive";

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
    if (!isTracking) return;

    // Capture current frame
    captureFrame()
      .then((frameData) => {
        // Send frame to server via WebSocket
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({ type: "detection", frameData: frameData })
          );
          // socket.send(frameData);
          // .send(JSON.stringify({ type: "detection", frameData: frameData}));
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

  // Draw detected faces on the canvas
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
});
