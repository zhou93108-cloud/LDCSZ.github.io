/**
 * VideoSideBySideComparator - Side-by-side video comparison with zoom
 * Generic comparator for any left/right video comparison
 */
class VideoSideBySideComparator {
  /**
   * Create a video side-by-side comparator
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
   * @param {number} config.zoomFactor - Zoom factor (default: 4)
   */
  constructor(container, config) {
    this.container = container;
    this.videoGroups = config.videoGroups || [];
    this.zoomFactor = config.zoomFactor || 4;
    this.currentGroupIndex = 0;
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
            <div class="video-sidebyside-container">
                <div class="video-caption" style="text-align: center; font-weight: bold; margin-bottom: 0.25rem; color: #444444;"></div>
                <div class="video-nav-container">
                    <div class="video-sidebyside-content">
                        <div class="video-sidebyside-video-wrapper">
                            <div class="video-sidebyside-row">
                                <div class="video-sidebyside-col">
                                    <div class="video-sidebyside-wrapper">
                                        <video class="video-sidebyside video-left" loop muted playsinline preload="auto"></video>
                                        <div class="video-zoom-popup"></div>
                                        <div class="video-region-indicator"></div>
                                        <div class="video-sidebyside-label">
                                            <span class="label-text"></span>
                                        </div>
                                        <div class="video-sidebyside-details"></div>
                                    </div>
                                </div>
                                <div class="video-sidebyside-col">
                                    <div class="video-sidebyside-wrapper">
                                        <video class="video-sidebyside video-right" loop muted playsinline preload="auto"></video>
                                        <div class="video-zoom-popup"></div>
                                        <div class="video-region-indicator"></div>
                                        <div class="video-sidebyside-label-right">
                                            <span class="label-text"></span>
                                            <span class="label-logo"></span>
                                        </div>
                                        <div class="video-sidebyside-details"></div>
                                    </div>
                                </div>
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
                </div>
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
    this.videos = [this.videoLeft, this.videoRight];
    this.wrappers = Array.from(
      this.container.querySelectorAll(".video-sidebyside-wrapper")
    );
    this.prevBtn = this.container.querySelector(".video-nav-prev");
    this.nextBtn = this.container.querySelector(".video-nav-next");
    this.contextImagesContainer = this.container.querySelector(
      ".context-images-container"
    );
    this.caption = this.container.querySelector(".video-caption");
    this.leftLabelText = this.container.querySelector(
      ".video-sidebyside-label .label-text"
    );
    this.rightLabelText = this.container.querySelector(
      ".video-sidebyside-label-right .label-text"
    );
    this.rightLabelLogo = this.container.querySelector(
      ".video-sidebyside-label-right .label-logo"
    );
    this.leftDetails = this.wrappers[0]?.querySelector(
      ".video-sidebyside-details"
    );
    this.rightDetails = this.wrappers[1]?.querySelector(
      ".video-sidebyside-details"
    );
  }

  bindEvents() {
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
    this.videoLeft.addEventListener("loadeddata", () => {
      this.videoLeft
        .closest(".video-sidebyside-wrapper")
        .classList.add("loaded");
    });
    this.videoRight.addEventListener("loadeddata", () => {
      this.videoRight
        .closest(".video-sidebyside-wrapper")
        .classList.add("loaded");
    });

    // Adjust aspect ratio when video metadata is loaded
    this.videoLeft.addEventListener("loadedmetadata", () => {
      this.adjustVideoAspectRatio(this.videoLeft);
    });
    this.videoRight.addEventListener("loadedmetadata", () => {
      this.adjustVideoAspectRatio(this.videoRight);
    });

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

    // Video zoom
    this.initializeVideoZoom();
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

  initializeVideoZoom() {
    const canvases = [];
    const contexts = [];

    this.videos.forEach((video, index) => {
      const wrapper = this.wrappers[index];
      if (!wrapper) return;

      const popup = wrapper.querySelector(".video-zoom-popup");
      const indicator = wrapper.querySelector(".video-region-indicator");

      if (!popup || !indicator) return;

      // Create canvas for zoom
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      popup.appendChild(canvas);
      canvases.push(canvas);
      contexts.push(ctx);

      // Update popup size
      const updatePopupSize = () => {
        const videoWidth = video.offsetWidth;
        if (videoWidth > 0) {
          popup.style.width = videoWidth + "px";
          popup.style.height = videoWidth + "px";
          canvas.width = videoWidth;
          canvas.height = videoWidth;
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      };

      video.addEventListener("loadedmetadata", updatePopupSize);
      video.addEventListener("loadeddata", updatePopupSize);
      window.addEventListener("resize", this.throttle(updatePopupSize, 250));
      setTimeout(updatePopupSize, 100);
    });

    // Handle hover
    this.videos.forEach((video, index) => {
      const wrapper = this.wrappers[index];
      if (!wrapper) return;

      const popup = wrapper.querySelector(".video-zoom-popup");
      const indicator = wrapper.querySelector(".video-region-indicator");
      const canvas = canvases[index];
      const ctx = contexts[index];

      if (!popup || !indicator || !canvas || !ctx) return;

      let isHovering = false;
      let animationFrameId = null;
      let mouseX = 0;
      let mouseY = 0;
      let lastUpdateTime = 0;
      const fps = 30; // 30fps is smooth enough for 24fps video content
      const frameInterval = 1000 / fps;

      const showZoomPopups = () => {
        this.wrappers.forEach((w) => {
          const p = w.querySelector(".video-zoom-popup");
          const i = w.querySelector(".video-region-indicator");
          if (p && i) {
            p.style.display = "block";
            i.style.display = "block";
          }
        });
      };

      const hideZoomPopups = () => {
        this.wrappers.forEach((w) => {
          const p = w.querySelector(".video-zoom-popup");
          const i = w.querySelector(".video-region-indicator");
          if (p && i) {
            p.style.display = "none";
            i.style.display = "none";
          }
        });
      };

      const updateZoomView = (currentTime) => {
        if (!isHovering) return;

        // Throttle to 30fps
        if (currentTime - lastUpdateTime < frameInterval) {
          return;
        }
        lastUpdateTime = currentTime;

        const videoRect = video.getBoundingClientRect();
        const relativeX = (mouseX - videoRect.left) / videoRect.width;
        const relativeY = (mouseY - videoRect.top) / videoRect.height;
        const clampedX = Math.max(0, Math.min(1, relativeX));
        const clampedY = Math.max(0, Math.min(1, relativeY));

        this.videos.forEach((v, i) => {
          const w = this.wrappers[i];
          if (!w) return;

          const p = w.querySelector(".video-zoom-popup");
          const ind = w.querySelector(".video-region-indicator");
          const c = canvases[i];
          const context = contexts[i];

          if (!p || !ind || !c || !context || v.readyState < 2) return;

          const videoWidth = v.offsetWidth;
          const videoHeight = v.offsetHeight;
          const regionSize = videoWidth / this.zoomFactor;

          let regionX = clampedX * videoWidth - regionSize / 2;
          let regionY = clampedY * videoHeight - regionSize / 2;

          regionX = Math.max(0, Math.min(videoWidth - regionSize, regionX));
          regionY = Math.max(0, Math.min(videoHeight - regionSize, regionY));

          ind.style.left = regionX + "px";
          ind.style.top = regionY + "px";
          ind.style.width = regionSize + "px";
          ind.style.height = regionSize + "px";

          const scaleX = v.videoWidth / videoWidth;
          const scaleY = v.videoHeight / videoHeight;
          const sourceX = regionX * scaleX;
          const sourceY = regionY * scaleY;
          const sourceWidth = regionSize * scaleX;
          const sourceHeight = regionSize * scaleY;

          context.drawImage(
            v,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            c.width,
            c.height
          );
        });
      };

      video.addEventListener("mouseenter", (e) => {
        isHovering = true;
        mouseX = e.clientX;
        mouseY = e.clientY;
        showZoomPopups();

        function animate(currentTime) {
          if (!isHovering) return;
          updateZoomView(currentTime);
          animationFrameId = requestAnimationFrame(animate);
        }
        animationFrameId = requestAnimationFrame(animate);
      });

      video.addEventListener("mousemove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
      });

      video.addEventListener("mouseleave", () => {
        isHovering = false;
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        hideZoomPopups();
      });
    });
  }

  loadVideoGroup(index) {
    const group = this.videoGroups[index];
    if (!group) return;

    this.currentGroupIndex = index;

    // Show loading state
    this.wrappers.forEach((w) => {
      w.classList.remove("loaded");
      // Set default 16:9 aspect ratio for loading state
      w.style.aspectRatio = "16 / 9";
    });

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
    if (this.leftDetails)
      this.leftDetails.textContent = group.left.details || "";
    if (this.rightDetails)
      this.rightDetails.textContent = group.right.details || "";

    // Load context images
    this.loadContextImages(group.contextImages);

    // Update zoom popup logos
    this.updateZoomLogos();

    // Reset playback
    this.videoLeft.currentTime = 0;
    this.videoRight.currentTime = 0;
  }

  updateZoomLogos() {
    const group = this.videoGroups[this.currentGroupIndex];
    if (!group) return;

    this.wrappers.forEach((wrapper, index) => {
      const popup = wrapper.querySelector(".video-zoom-popup");
      if (!popup) return;

      // Remove existing logo if any
      const existingLogo = popup.querySelector(".video-zoom-popup-logo");
      if (existingLogo) {
        existingLogo.remove();
      }

      // Add new logo for right video if specified
      if (index === 1 && group.right.logo) {
        const logo = document.createElement("img");
        logo.src = group.right.logo;
        logo.className = "video-zoom-popup-logo";
        logo.fetchPriority = "low";
        logo.style.cssText =
          "position: absolute; bottom: 4%; right: 4%; height: 14%; max-height: 48px; width: auto; z-index: 10; pointer-events: none;";
        popup.appendChild(logo);
      }
    });
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

  /**
   * Adjust the video wrapper aspect ratio based on the loaded video dimensions
   */
  adjustVideoAspectRatio(video) {
    if (video.videoWidth && video.videoHeight) {
      const wrapper = video.closest(".video-sidebyside-wrapper");
      if (wrapper) {
        const aspectRatio = video.videoWidth / video.videoHeight;
        wrapper.style.aspectRatio = aspectRatio.toString();
      }
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
}
