/**
 * Shared utility functions for video comparators
 */
class VideoComparatorUtils {
  /**
   * Load a video source
   *
   * @param {HTMLVideoElement} video - The video element
   * @param {string} url - The video URL
   */
  static loadVideo(video, url) {
    video.innerHTML = "";
    const source = document.createElement("source");
    source.src = url;
    source.type = "video/mp4";
    video.appendChild(source);
    video.load();
  }

  /**
   * Initialize image zoom on hover
   *
   * @param {HTMLElement} wrapper - The image wrapper element
   * @param {number} zoomFactor - The zoom factor (default: 4)
   * @param {string} logoUrl - Optional logo URL to display in zoom popup
   */
  static initializeImageZoom(wrapper, zoomFactor = 4, logoUrl = null) {
    const img = wrapper.querySelector(".context-image");
    const popup = wrapper.querySelector(".zoom-popup");
    const indicator = wrapper.querySelector(".region-indicator");

    if (!img || !popup || !indicator) return;

    // Add logo if specified
    if (logoUrl) {
      const logo = document.createElement("img");
      logo.src = logoUrl;
      logo.className = "zoom-popup-logo";
      logo.style.cssText =
        "position: absolute; bottom: 4%; right: 4%; height: 14%; max-height: 48px; width: auto; z-index: 10; pointer-events: none;";
      popup.appendChild(logo);
    }

    // Set popup size
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

    // Hover listeners
    img.addEventListener("mouseenter", function () {
      popup.style.display = "block";
      indicator.style.display = "block";
    });

    img.addEventListener("mousemove", function (e) {
      const imgRect = img.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      const imgWidth = img.offsetWidth;
      const imgHeight = img.offsetHeight;

      const relativeX = (e.clientX - imgRect.left) / imgRect.width;
      const relativeY = (e.clientY - imgRect.top) / imgRect.height;
      const clampedX = Math.max(0, Math.min(1, relativeX));
      const clampedY = Math.max(0, Math.min(1, relativeY));

      const popupSize = imgWidth;
      const regionSize = imgWidth / zoomFactor;

      // Get the image's offset within the wrapper
      const imgOffsetLeft = imgRect.left - wrapperRect.left;
      const imgOffsetTop = imgRect.top - wrapperRect.top;

      let regionX = clampedX * imgWidth - regionSize / 2;
      let regionY = clampedY * imgHeight - regionSize / 2;

      regionX = Math.max(0, Math.min(imgWidth - regionSize, regionX));
      regionY = Math.max(0, Math.min(imgHeight - regionSize, regionY));

      // Position indicator relative to wrapper, accounting for image offset
      indicator.style.left = imgOffsetLeft + regionX + "px";
      indicator.style.top = imgOffsetTop + regionY + "px";
      indicator.style.width = regionSize + "px";
      indicator.style.height = regionSize + "px";

      const bgLeft = -(regionX * zoomFactor);
      const bgTop = -(regionY * zoomFactor);

      popup.style.backgroundImage = `url('${img.src}')`;
      popup.style.backgroundPosition = `${bgLeft}px ${bgTop}px`;
      popup.style.backgroundSize = `${imgWidth * zoomFactor}px ${
        imgHeight * zoomFactor
      }px`;
    });

    img.addEventListener("mouseleave", function () {
      popup.style.display = "none";
      indicator.style.display = "none";
    });
  }

  /**
   * Initialize image comparison row with zoom
   *
   * @param {HTMLElement} row - The row element containing images
   * @param {number} zoomFactor - The zoom factor (default: 4)
   */
  static initializeImageComparisonRow(row, zoomFactor = 4) {
    const images = row.querySelectorAll("img");

    // Create zoom popup and region indicator for each image
    images.forEach((img, index) => {
      const col = img.parentElement;

      const popup = document.createElement("div");
      popup.className = "zoom-popup";
      popup.setAttribute("data-zoom", zoomFactor);
      col.appendChild(popup);

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
    });

    // Add hover listeners to each image
    images.forEach((img, index) => {
      img.addEventListener("mouseenter", function () {
        VideoComparatorUtils.handleRowHover(row, images, true);
      });

      img.addEventListener("mousemove", function (e) {
        VideoComparatorUtils.handleImageRowMouseMove(
          row,
          images,
          e,
          zoomFactor
        );
      });

      img.addEventListener("mouseleave", function () {
        VideoComparatorUtils.handleRowHover(row, images, false);
      });
    });
  }

  /**
   * Handle row hover state
   *
   * @param {HTMLElement} row - The row element
   * @param {NodeList} images - The images in the row
   * @param {boolean} isHovering - Whether hovering
   */
  static handleRowHover(row, images, isHovering) {
    const popups = row.querySelectorAll(".zoom-popup");
    const indicators = row.querySelectorAll(".region-indicator");

    popups.forEach((popup) => {
      popup.style.display = isHovering ? "block" : "none";
    });

    indicators.forEach((indicator) => {
      indicator.style.display = isHovering ? "block" : "none";
    });
  }

  /**
   * Handle mouse move on image comparison row
   *
   * @param {HTMLElement} row - The row element
   * @param {NodeList} images - The images in the row
   * @param {MouseEvent} event - The mouse event
   * @param {number} zoomFactor - The zoom factor
   */
  static handleImageRowMouseMove(row, images, event, zoomFactor) {
    const hoveredImg = event.currentTarget;
    const imgRect = hoveredImg.getBoundingClientRect();

    const relativeX = (event.clientX - imgRect.left) / imgRect.width;
    const relativeY = (event.clientY - imgRect.top) / imgRect.height;
    const clampedX = Math.max(0, Math.min(1, relativeX));
    const clampedY = Math.max(0, Math.min(1, relativeY));

    images.forEach((img, index) => {
      const parent = img.parentElement;
      const popup = parent.querySelector(".zoom-popup");
      const indicator = parent.querySelector(".region-indicator");
      if (!popup || !indicator) return;

      const imgWidth = img.offsetWidth;
      const imgHeight = img.offsetHeight;
      const popupSize = imgWidth;
      const regionSize = imgWidth / zoomFactor;

      // Get the image's offset within its parent element
      const imgRect = img.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      const imgOffsetLeft = imgRect.left - parentRect.left;
      const imgOffsetTop = imgRect.top - parentRect.top;

      let regionX = clampedX * imgWidth - regionSize / 2;
      let regionY = clampedY * imgHeight - regionSize / 2;

      regionX = Math.max(0, Math.min(imgWidth - regionSize, regionX));
      regionY = Math.max(0, Math.min(imgHeight - regionSize, regionY));

      // Position indicator relative to parent, accounting for image offset
      indicator.style.left = imgOffsetLeft + regionX + "px";
      indicator.style.top = imgOffsetTop + regionY + "px";
      indicator.style.width = regionSize + "px";
      indicator.style.height = regionSize + "px";

      const bgLeft = -(regionX * zoomFactor);
      const bgTop = -(regionY * zoomFactor);

      popup.style.backgroundImage = `url('${img.src}')`;
      popup.style.backgroundPosition = `${bgLeft}px ${bgTop}px`;
      popup.style.backgroundSize = `${imgWidth * zoomFactor}px ${
        imgHeight * zoomFactor
      }px`;
    });
  }
}
