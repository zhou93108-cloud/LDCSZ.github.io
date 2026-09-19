/**
 * VideoSliderComparator - A draggable slider for comparing two videos
 * Generic comparator for any left/right video comparison
 */
class VideoSliderComparator {
  /**
   * Create a video slider comparator
   *
   * @param {HTMLElement} container - The container element
   * @param {Object} config - Configuration object
   * @param {Array} config.videoGroups - Array of video group objects
   * @param {Object} config.videoGroups[].left - Left side configuration
   * @param {string} config.videoGroups[].left.video - Left video URL
   * @param {string} config.videoGroups[].left.label - Left side label
   * @param {string} config.videoGroups[].left.details - Left side details text
   * @param {Object} config.videoGroups[].right - Right side configuration
   * @param {string} config.videoGroups[].right.video - Right video URL
   * @param {string} config.videoGroups[].right.label - Right side label
   * @param {string} config.videoGroups[].right.logo - Optional logo image URL
   * @param {string} config.videoGroups[].right.details - Right side details text
   * @param {Array} config.videoGroups[].contextImages - Optional array of context images
   */
  constructor(container, config) {
    this.container = container;
    this.videoGroups = config.videoGroups || [];
    this.currentGroupIndex = 0;
    this.isDragging = false;
    this.isVisible = true;

    this.init();

    // Store instance on container for external access (e.g., tab handlers)
    this.container._videoComparatorInstance = this;
  }

  init() {
    this.createHTML();
    this.cacheElements();
    this.bindEvents();
    this.loadVideoGroup(0);
  }

  createHTML() {
    const firstGroup = this.videoGroups[0] || { left: {}, right: {} };

    this.container.innerHTML = `
            <div class="video-comparison-container">
                <div class="video-caption" style="text-align: center; font-weight: bold; margin-bottom: 0.25rem; color: #444444;"></div>
                <div class="video-nav-container">
                    <div class="video-wrapper">
                        <video class="comparison-video video-left" loop muted playsinline preload="auto"></video>
                        <div class="video-overlay">
                            <video class="comparison-video video-right" loop muted playsinline preload="auto"></video>
                            <div class="video-label video-label-right">
                                <span class="label-text"></span>
                                <span class="label-logo"></span>
                            </div>
                            <div class="video-slider-details-right"></div>
                        </div>
                        <div class="slider-handle">
                            <div class="slider-line"></div>
                            <div class="slider-button">
                                <i class="bi bi-chevron-left"></i>
                                <i class="bi bi-chevron-right"></i>
                            </div>
                        </div>
                        <div class="video-label video-label-left">
                            <span class="label-text"></span>
                        </div>
                        <div class="video-slider-details-left"></div>
                    </div>
                    ${
                      this.videoGroups.length > 1
                        ? `
                        <div class="video-nav-btn-wrapper video-nav-prev-wrapper">
                            <button class="video-nav-btn video-nav-prev">
                                <i class="bi bi-chevron-left"></i>
                            </button>
                            <span class="video-nav-label">Prev.<br>Scene</span>
                        </div>
                        <div class="video-nav-btn-wrapper video-nav-next-wrapper">
                            <button class="video-nav-btn video-nav-next">
                                <i class="bi bi-chevron-right"></i>
                            </button>
                            <span class="video-nav-label">Next<br>Scene</span>
                        </div>
                    `
                        : ""
                    }
                </div>

                ${
                  this.shouldShowContextImages()
                    ? `
                    <div class="mt-2">
                        <div class="d-flex justify-content-end align-items-end">
                            <p class="text-muted small mb-0 me-2">Input views:</p>
                            <div class="d-flex gap-2 context-images-container"></div>
                        </div>
                    </div>
                `
                    : ""
                }
            </div>
        `;
  }

  shouldShowContextImages() {
    return this.videoGroups.some(
      (group) => group.contextImages && group.contextImages.length > 0
    );
  }

  cacheElements() {
    this.videoLeft = this.container.querySelector(".video-left");
    this.videoRight = this.container.querySelector(".video-right");
    this.videoOverlay = this.container.querySelector(".video-overlay");
    this.sliderHandle = this.container.querySelector(".slider-handle");
    this.videoWrapper = this.container.querySelector(".video-wrapper");
    this.prevBtn = this.container.querySelector(".video-nav-prev");
    this.nextBtn = this.container.querySelector(".video-nav-next");
    this.contextImagesContainer = this.container.querySelector(
      ".context-images-container"
    );
    this.caption = this.container.querySelector(".video-caption");
    this.leftLabelText = this.container.querySelector(
      ".video-label-left .label-text"
    );
    this.rightLabelText = this.container.querySelector(
      ".video-label-right .label-text"
    );
    this.rightLabelLogo = this.container.querySelector(
      ".video-label-right .label-logo"
    );
    this.leftDetails = this.container.querySelector(
      ".video-slider-details-left"
    );
    this.rightDetails = this.container.querySelector(
      ".video-slider-details-right"
    );
  }

  bindEvents() {
    // Slider dragging
    this.sliderHandle.addEventListener("mousedown", (e) =>
      this.startDragging(e)
    );
    document.addEventListener("mousemove", (e) => this.handleSliderMove(e));
    document.addEventListener("mouseup", () => this.stopDragging());
    this.sliderHandle.addEventListener(
      "touchstart",
      (e) => this.startDragging(e),
      { passive: false }
    );
    document.addEventListener("touchmove", (e) => this.handleSliderMove(e), {
      passive: false,
    });
    document.addEventListener("touchend", () => this.stopDragging());

    // Video sync: left follows right (master)
    this.videoRight.addEventListener("play", () => {
      if (this.videoLeft.readyState >= 2) {
        this.videoLeft.currentTime = this.videoRight.currentTime;
        this.videoLeft.play().catch(() => {});
      }
    });
    this.videoRight.addEventListener("seeked", () => {
      if (this.videoLeft.readyState >= 2) {
        this.videoLeft.currentTime = this.videoRight.currentTime;
      }
    });

    // Loading state
    this.videoLeft.addEventListener("loadeddata", () => this.checkLoaded());
    this.videoRight.addEventListener("loadeddata", () => this.checkLoaded());

    // Auto-play with IntersectionObserver (also pauses when not visible)
    this.setupAutoPlay();

    // Navigation (clicking the wrapper or button navigates)
    const prevWrapper = this.container.querySelector(".video-nav-prev-wrapper");
    const nextWrapper = this.container.querySelector(".video-nav-next-wrapper");
    if (prevWrapper) {
      prevWrapper.addEventListener("click", () => this.navigate(-1));
    }
    if (nextWrapper) {
      nextWrapper.addEventListener("click", () => this.navigate(1));
    }

    // Initialize slider position
    this.updateSlider(50);
  }

  throttle(func, delay) {
    let lastCall = 0;
    return function (...args) {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func.apply(this, args);
      }
    };
  }

  setupAutoPlay() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          this.isVisible = entry.isIntersecting;
          if (entry.isIntersecting) {
            this.checkAutoPlay();
          } else {
            this.videoLeft.pause();
            this.videoRight.pause();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(this.container);
    this.intersectionObserver = observer;

    this.videoRight.addEventListener("loadeddata", () => this.checkAutoPlay());
    this.videoLeft.addEventListener("loadeddata", () => this.checkAutoPlay());
  }

  loadVideoGroup(index) {
    const group = this.videoGroups[index];
    if (!group) return;

    this.currentGroupIndex = index;

    // Show loading state
    this.videoWrapper.classList.remove("loaded");

    // Set default 16:9 aspect ratio for loading state
    this.videoWrapper.style.aspectRatio = "16 / 9";

    // Pause videos
    this.videoLeft.pause();
    this.videoRight.pause();

    // Load videos
    VideoComparatorUtils.loadVideo(this.videoLeft, group.left.video);
    VideoComparatorUtils.loadVideo(this.videoRight, group.right.video);

    // Update caption
    if (group.caption) {
      this.caption.textContent = group.caption;
      this.caption.style.display = "block";
    } else {
      this.caption.textContent = "";
      this.caption.style.display = "none";
    }

    // Update labels
    this.leftLabelText.textContent = group.left.label || "";
    this.rightLabelText.textContent = group.right.label || "";

    // Update logo
    if (group.right.logo) {
      this.rightLabelLogo.innerHTML = `<img src="${group.right.logo}" class="ms-2" style="height: 20px; width: auto;" fetchpriority="low">`;
    } else {
      this.rightLabelLogo.innerHTML = "";
    }

    // Update details
    this.leftDetails.textContent = group.left.details || "";
    this.rightDetails.textContent = group.right.details || "";

    // Load context images
    this.loadContextImages(group.contextImages);

    // Reset playback
    this.videoLeft.currentTime = 0;
    this.videoRight.currentTime = 0;

    // Adjust container aspect ratio when video metadata is loaded
    this.adjustVideoAspectRatio();
  }

  loadContextImages(contextImages) {
    if (
      !this.contextImagesContainer ||
      !contextImages ||
      contextImages.length === 0
    )
      return;

    this.contextImagesContainer.innerHTML = "";

    contextImages.forEach((img) => {
      const wrapper = document.createElement("div");
      wrapper.className = "context-image-wrapper";
      wrapper.innerHTML = `
                <img class="context-image" src="${img.src}" alt="${
        img.alt || ""
      }" fetchpriority="low">
                <div class="zoom-popup"></div>
                <div class="region-indicator"></div>
            `;
      this.contextImagesContainer.appendChild(wrapper);

      // Initialize zoom
      VideoComparatorUtils.initializeImageZoom(wrapper);
    });
  }

  navigate(direction) {
    const newIndex =
      (this.currentGroupIndex + direction + this.videoGroups.length) %
      this.videoGroups.length;
    this.loadVideoGroup(newIndex);
  }

  checkLoaded() {
    if (this.videoRight.readyState >= 2 && this.videoLeft.readyState >= 2) {
      this.videoWrapper.classList.add("loaded");
      // Adjust aspect ratio when both videos are loaded
      this.adjustVideoAspectRatio();
    }
  }

  /**
   * Adjust the video wrapper aspect ratio based on the loaded video dimensions
   */
  adjustVideoAspectRatio() {
    // Use the right video as reference (both should have same dimensions)
    const video = this.videoRight;

    if (video.readyState >= 1) {
      // Video metadata is loaded, we have dimensions
      const aspectRatio = video.videoWidth / video.videoHeight;

      // Set the wrapper to maintain this aspect ratio
      // The wrapper uses width: 100%, so we only need to set the height
      this.videoWrapper.style.aspectRatio = aspectRatio.toString();
    } else {
      // Listen for metadata to be loaded and update aspect ratio
      const onMetadataLoaded = () => {
        const aspectRatio = video.videoWidth / video.videoHeight;
        this.videoWrapper.style.aspectRatio = aspectRatio.toString();
        video.removeEventListener("loadedmetadata", onMetadataLoaded);
      };
      video.addEventListener("loadedmetadata", onMetadataLoaded);
    }
  }

  checkAutoPlay() {
    if (!this.isVisible) return;
    if (
      this.videoRight.readyState >= 3 &&
      this.videoLeft.readyState >= 3 &&
      this.videoRight.paused
    ) {
      this.videoRight.play().catch(() => {});
    }
  }

  /**
   * Start synchronized playback of both videos from the beginning.
   * Can be called externally (e.g., from tab handlers).
   */
  startSyncedPlayback() {
    if (!this.isVisible) return;
    if (this.videoRight.readyState >= 3 && this.videoLeft.readyState >= 3) {
      this.videoLeft.currentTime = 0;
      this.videoRight.currentTime = 0;
      this.videoRight.play().catch(() => {});
    }
  }

  updateSlider(percentage) {
    percentage = Math.max(0, Math.min(100, percentage));
    this.sliderHandle.style.left = percentage + "%";
    this.videoOverlay.style.clipPath = `inset(0 0 0 ${percentage}%)`;
  }

  handleSliderMove(e) {
    if (!this.isDragging) return;

    const rect = this.videoLeft.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const percentage = (x / rect.width) * 100;

    this.updateSlider(percentage);
  }

  startDragging(e) {
    this.isDragging = true;
    this.handleSliderMove(e);
    e.preventDefault();
  }

  stopDragging() {
    this.isDragging = false;
  }
}
