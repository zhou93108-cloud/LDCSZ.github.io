/**
 * ImageComparisonRow - Image comparison with synchronized zoom
 * Generic comparator for comparing multiple images in a row
 */
class ImageComparisonRow {
  /**
   * Create an image comparison row
   *
   * @param {HTMLElement} container - The container element
   * @param {Object} config - Configuration object
   * @param {Array} config.images - Array of image objects
   * @param {string} config.images[].src - Image source URL
   * @param {string} config.images[].label - Image label text
   * @param {boolean} config.images[].bold - Whether to bold the label (default: false)
   * @param {string} config.images[].alt - Optional alt text
   * @param {boolean} config.images[].disable_zoom - Whether to disable zoom for this image (default: false)
   * @param {string} config.caption - Optional caption text
   * @param {number} config.zoomFactor - Base zoom factor (default: 6)
   * @param {number} config.zoomRatio - Multiplier for zoom factor (default: 1). Set to 2 for 2x zoom, etc.
   * @param {boolean} config.showHoverHint - Show hover hint (default: true)
   */
  constructor(container, config) {
    this.container = container;
    this.images = config.images || [];
    this.caption = config.caption || "";
    const baseZoomFactor = config.zoomFactor || 6;
    const zoomRatio = config.zoomRatio || 1;
    this.zoomFactor = baseZoomFactor * zoomRatio;
    this.showHoverHint = config.showHoverHint !== false;

    this.init();
  }

  init() {
    this.createHTML();
    this.cacheElements();
    this.initializeZoom();
  }

  createHTML() {
    // Build images row with loading wrappers
    const imagesHTML = this.images
      .map(
        (img) => `
            <div class="col">
                <div class="image-wrapper">
                    <img src="${img.src}" class="img-fluid" alt="${
          img.alt || ""
        }" fetchpriority="low">
                </div>
            </div>
        `
      )
      .join("");

    // Build labels row
    const labelsHTML = this.images
      .map((img) => {
        const labelClass = img.bold ? "fw-bold" : "";
        return `<div class="col ${labelClass}">${img.label || ""}</div>`;
      })
      .join("");

    this.container.innerHTML = `
            <div class="image-comparison-container">
                ${
                  this.caption
                    ? `
                    <p class="text-muted small mb-2">${this.caption}</p>
                `
                    : ""
                }
                <div class="row g-1 image-comparison-row">
                    ${imagesHTML}
                </div>
                <div class="row g-1 small text-center">
                    ${labelsHTML}
                </div>
                ${
                  this.showHoverHint
                    ? `
                    <p class="text-muted small mb-2 mt-3 text-center" style="font-style: italic;">
                        ( <i class="bi bi-cursor"></i> Hover over images to zoom. )
                    </p>
                `
                    : ""
                }
            </div>
        `;
  }

  cacheElements() {
    this.row = this.container.querySelector(".image-comparison-row");
    this.imageElements = Array.from(this.row.querySelectorAll("img"));
    this.imageWrappers = Array.from(
      this.row.querySelectorAll(".image-wrapper")
    );
  }

  initializeZoom() {
    if (!this.row || this.imageElements.length === 0) return;

    // Set up loading state for each image
    this.imageElements.forEach((img, index) => {
      const wrapper = this.imageWrappers[index];
      if (wrapper) {
        // Set default 16:9 aspect ratio for loading state
        wrapper.style.aspectRatio = "16 / 9";

        // Handle image load
        const handleImageLoad = () => {
          wrapper.classList.add("loaded");
          // Adjust to actual image aspect ratio
          if (img.naturalWidth && img.naturalHeight) {
            const aspectRatio = img.naturalWidth / img.naturalHeight;
            wrapper.style.aspectRatio = aspectRatio.toString();
          }
        };

        if (img.complete && img.naturalWidth > 0) {
          handleImageLoad();
        } else {
          img.addEventListener("load", handleImageLoad);
        }
      }
    });

    // Create zoom popup and region indicator for each image (only if zoom is enabled)
    this.imageElements.forEach((img, index) => {
      const imageConfig = this.images[index];
      const isZoomDisabled = imageConfig && imageConfig.disable_zoom === true;

      const col = img.parentElement.parentElement;

      if (!isZoomDisabled) {
        const popup = document.createElement("div");
        popup.className = "zoom-popup";
        col.appendChild(popup);

        // Add logo if specified
        if (imageConfig && imageConfig.logo) {
          const logo = document.createElement("img");
          logo.src = imageConfig.logo;
          logo.className = "zoom-popup-logo";
          logo.fetchPriority = "low";
          logo.style.cssText =
            "position: absolute; bottom: 4%; right: 4%; height: 14%; max-height: 48px; width: auto; z-index: 10; pointer-events: none;";
          popup.appendChild(logo);
        }

        const indicator = document.createElement("div");
        indicator.className = "region-indicator";
        col.appendChild(indicator);

        const updatePopupSize = () => {
          const imgWidth = img.offsetWidth;
          if (imgWidth > 0) {
            popup.style.width = imgWidth + "px";
            popup.style.height = imgWidth + "px";
          }
        };

        const ensurePopupSize = () => {
          requestAnimationFrame(() => {
            updatePopupSize();
          });
        };

        if (img.complete) {
          ensurePopupSize();
        } else {
          img.addEventListener("load", ensurePopupSize);
        }
        window.addEventListener("resize", ensurePopupSize);
        img.addEventListener("mouseenter", updatePopupSize, { once: true });
      }
    });

    // Add hover listeners to each image for synchronized zoom (only if zoom is enabled)
    this.imageElements.forEach((img, index) => {
      const imageConfig = this.images[index];
      const isZoomDisabled = imageConfig && imageConfig.disable_zoom === true;

      if (!isZoomDisabled) {
        img.addEventListener("mouseenter", (e) => {
          this.handleRowHover(true);
          // Update zoom view immediately on enter
          this.handleImageRowMouseMove(e);
        });

        img.addEventListener("mousemove", (e) => {
          this.handleImageRowMouseMove(e);
        });

        img.addEventListener("mouseleave", () => {
          this.handleRowHover(false);
        });
      }
    });
  }

  handleRowHover(isHovering) {
    const popups = this.row.querySelectorAll(".zoom-popup");
    const indicators = this.row.querySelectorAll(".region-indicator");

    popups.forEach((popup) => {
      popup.style.display = isHovering ? "block" : "none";
    });

    indicators.forEach((indicator) => {
      indicator.style.display = isHovering ? "block" : "none";
    });
  }

  handleImageRowMouseMove(event) {
    const hoveredImg = event.currentTarget;
    const imgRect = hoveredImg.getBoundingClientRect();

    const relativeX = (event.clientX - imgRect.left) / imgRect.width;
    const relativeY = (event.clientY - imgRect.top) / imgRect.height;
    const clampedX = Math.max(0, Math.min(1, relativeX));
    const clampedY = Math.max(0, Math.min(1, relativeY));

    this.imageElements.forEach((img, index) => {
      const imageConfig = this.images[index];
      const isZoomDisabled = imageConfig && imageConfig.disable_zoom === true;

      if (isZoomDisabled) return;

      const col = img.parentElement.parentElement;
      const popup = col.querySelector(".zoom-popup");
      const indicator = col.querySelector(".region-indicator");
      if (!popup || !indicator) return;

      const imgWidth = img.offsetWidth;
      const imgHeight = img.offsetHeight;
      const regionSize = imgWidth / this.zoomFactor;

      // Get the image's position relative to its parent col
      const imgRect = img.getBoundingClientRect();
      const colRect = col.getBoundingClientRect();
      const imgOffsetLeft = imgRect.left - colRect.left;
      const imgOffsetTop = imgRect.top - colRect.top;

      let regionX = clampedX * imgWidth - regionSize / 2;
      let regionY = clampedY * imgHeight - regionSize / 2;

      regionX = Math.max(0, Math.min(imgWidth - regionSize, regionX));
      regionY = Math.max(0, Math.min(imgHeight - regionSize, regionY));

      // Position indicator relative to col, accounting for image offset within col
      indicator.style.left = imgOffsetLeft + regionX + "px";
      indicator.style.top = imgOffsetTop + regionY + "px";
      indicator.style.width = regionSize + "px";
      indicator.style.height = regionSize + "px";

      const bgLeft = -(regionX * this.zoomFactor);
      const bgTop = -(regionY * this.zoomFactor);

      popup.style.backgroundImage = `url('${img.src}')`;
      popup.style.backgroundPosition = `${bgLeft}px ${bgTop}px`;
      popup.style.backgroundSize = `${imgWidth * this.zoomFactor}px ${
        imgHeight * this.zoomFactor
      }px`;
    });
  }
}
