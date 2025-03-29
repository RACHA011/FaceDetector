// Sidebar toggle
const btn = document.querySelector("#btn");
const sidebar = document.querySelector(".sidebar");
btn.onclick = function () {
  sidebar.classList.toggle("active");
};

// Tab switching

const videoTab = document.getElementById("video-tab");
const uploadTab = document.getElementById("upload-tab");
const videoTabContent = document.getElementById("video-tab-content");
const uploadTabContent = document.getElementById("upload-tab-content");

// const recognitionVideo = document.getElementById("recognition-video");
// const recognitionVideoOverlay = document.getElementById(
//   "recognition-video-overlay"
// );

const detectionToggle = document.getElementById("detection-toggle");
// const recognitionToggle = document.getElementById("recognition-toggle");
const detectionStatus = document.getElementById("detection-status");
// const recognitionStatus = document.getElementById("recognition-status");

const fileInput = document.getElementById("file-input");
const selectImageButton = document.getElementById("select-image-button");
const uploadContainer = document.getElementById("upload-container");
const imagePreviewContainer = document.getElementById(
  "image-preview-container"
);
const uploadedImage = document.getElementById("uploaded-image");
const clearImageButton = document.getElementById("clear-image-button");
const clearImageButton2 = document.getElementById("clear-image-button-2");
const recognizeButton = document.getElementById("recognize-button");
const faceDetectionOverlay = document.getElementById("face-detection-overlay");

// face detection id
const detectionContainer = document.getElementById("detection-container");
const imagePreview = document.getElementById("image-preview");
const upload = document.getElementById("upload");
const updateImage = document.getElementById("update-image");
const clear = document.getElementById("clear-image-detected-button");
const detectButton = document.getElementById("detect-button");
const detectStatus = document.getElementById("detect-status");
const detectToggle = document.getElementById("detect-toggle");

// State
let isRecognizing = false;
let recognitionMode = "video";
let videoStream = null;
let recognitionStream = null;
let animationId = null;

function setRecognitionMode(mode) {
  recognitionMode = mode;

  videoTab.classList.toggle("active", mode === "video");
  uploadTab.classList.toggle("active", mode === "upload");

  videoTabContent.classList.toggle("active", mode === "video");
  uploadTabContent.classList.toggle("active", mode === "upload");

  recognitionToggle.style.display = mode === "video" ? "block" : "none";

  if (isRecognizing && mode !== "video") {
    stopRecognition();
  }
}

videoTab.addEventListener("click", () => setRecognitionMode("video"));
uploadTab.addEventListener("click", () => setRecognitionMode("upload"));

detectToggle.addEventListener("click", () => {
  updateImage.src = "@{${outputImage}}";
  detectionContainer.style.display = "none";
  imagePreview.style.display = "block";
});

// // Recognition Toggle
recognitionToggle.addEventListener("click", () => {
  if (isRecognizing) {
    stopRecognition();
  } else {
    startRecognition();
  }
});

async function startRecognition() {
  try {
    const constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    recognitionVideo.srcObject = stream;
    recognitionStream = stream;

    isRecognizing = true;
    recognitionToggle.textContent = "Stop Recognition";
    recognitionToggle.classList.remove("button-primary");
    recognitionToggle.classList.add("button-destructive");
    recognitionStatus.textContent = "Recognition active";
    recognitionVideoOverlay.style.display = "none";
  } catch (error) {
    console.error("Error accessing camera:", error);
    alert("Could not access camera. Please check permissions.");
  }
}

function stopRecognition() {
  if (recognitionStream) {
    recognitionStream.getTracks().forEach((track) => track.stop());
    recognitionStream = null;
  }

  isRecognizing = false;
  recognitionToggle.textContent = "Start Recognition";
  recognitionToggle.classList.add("button-primary");
  recognitionToggle.classList.remove("button-destructive");
  recognitionStatus.textContent = "Recognition inactive";
  recognitionVideoOverlay.style.display = "flex";
}

// Image Upload
selectImageButton.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", handleFileSelect);

// displaying the uploaded image
async function previewImage(event) {
  const input = event.target;

  if (input.files && input.files[0]) {
    try {
      let file = input.files[0];

      // Validate file type
      if (!file.type.match("image/jpeg") && !file.type.match("image/png")) {
        alert("Only JPEG and PNG images are allowed.");
        upload.value = ""; // Clear the file input
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        updateImage.src = e.target.result;
        detectionContainer.style.display = "none";
        imagePreview.style.display = "block";
      };
      reader.readAsDataURL(file);

      // Store the converted file back on the input
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
    } catch (error) {
      console.error("Image processing error:", error);
      alert("Could not process this image. Please try a JPEG or PNG file.");
      clearDetectedImage();
    }
  }
}

async function convertHEICtoJPEG(file) {
  // Check if the file is HEIC
  if (!file.type.match(/^image\/heic$/i)) {
    return file;
  }

  try {
    const formData = new FormData();

    // Add reference image
    formData.append("file", file);

    return await fetch("/heic-to-jpeg", {
      method: "POST",
      body: formData,
      // Do not set Content-Type header manually; let the browser handle it
    })
      .then(async (response) => {
        if (!response.ok) {
          // Parse the error response as text or JSON
          const text = await response.text();
          throw new Error(text || "Image conversion request failed");
        }
        return response.json(); // Parse JSON response
      })
      .then((results) => {
        // Return the image conversion results
        return results;
      })
      .catch((error) => {
        console.error("image conversion error:", error);
        throw error; // Re-throw to allow handling by caller
      });
  } catch (error) {
    console.error("HEIC conversion failed:", error);
    throw new Error("Failed to convert HEIC image");
  }
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  // Validate file type
  if (!file.type.match("image/jpeg") && !file.type.match("image/png")) {
    alert("Only JPEG and PNG images are allowed.");
    fileInput.value = ""; // Clear the file input
    return;
  }
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (event) => {
      uploadedImage.src = event.target.result;
      uploadContainer.style.display = "none";
      imagePreviewContainer.style.display = "block";
      faceDetectionOverlay.classList.add("hidden");
    };
    reader.readAsDataURL(file);
  }
}

// Drag and drop for image upload
uploadContainer.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadContainer.classList.add("drag-over");
});

uploadContainer.addEventListener("dragleave", () => {
  uploadContainer.classList.remove("drag-over");
});

uploadContainer.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadContainer.classList.remove("drag-over");

  const file = e.dataTransfer.files[0];
  // Validate file type
  if (!file.type.match("image/jpeg") && !file.type.match("image/png")) {
    alert("Only JPEG and PNG images are allowed.");
    uploadContainer.value = ""; // Clear the file input
    return;
  }
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (event) => {
      uploadedImage.src = event.target.result;
      uploadContainer.style.display = "none";
      imagePreviewContainer.style.display = "block";
      faceDetectionOverlay.classList.add("hidden");
    };
    reader.readAsDataURL(file);
  }
});

// Clear image buttons
clearImageButton.addEventListener("click", clearImage);
clearImageButton2.addEventListener("click", clearImage);
clear.addEventListener("click", clearDetectedImage);

function clearDetectedImage() {
  updateImage.src = "";
  upload.value = "";
  detectionContainer.style.display = "flex";
  imagePreview.style.display = "none";
}

function clearImage() {
  uploadedImage.src = "";
  fileInput.value = "";
  uploadContainer.style.display = "flex";
  imagePreviewContainer.style.display = "none";
  faceDetectionOverlay.classList.add("hidden");
}

// Recognize button
detectButton.addEventListener("click", () => {
  detectButton.textContent = "Processing...";
  detectButton.disabled = true;

  setTimeout(() => {
    detectButton.textContent = "Detected";
    detectButton.disabled = true;
  }, 2000);
});

recognizeButton.addEventListener("click", () => {
  recognizeButton.textContent = "Processing...";
  recognizeButton.disabled = true;

  setTimeout(() => {
    faceDetectionOverlay.classList.remove("hidden");
    recognizeButton.textContent = "Recognized";
    recognizeButton.disabled = true;
  }, 2000);
});

// face tracking functionality

// Initialize the app
function initApp() {
  setRecognitionMode("video");
}

// Start the app
initApp();
