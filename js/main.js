// LGTM - Minimal Academic Website JavaScript

// Prevent browser scroll restoration (fixes page not being at top on refresh)
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.scrollTo(0, 0);

document.addEventListener("DOMContentLoaded", function () {
  window.scrollTo(0, 0);

  initializeTheme();

  if (document.body.classList.contains("home-page")) {
    initializeLogoTransition();
  }

  initializeVideoComparators();
  initializeImageComparators();
  initializeMobileMenuCloseOnOutsideClick();
});

function initializeLogoTransition() {
  const navbarBrand = document.querySelector(".navbar-brand");
  const centeredText = document.querySelector(".navbar-centered-text");
  const headerSection = document.querySelector("#top");

  if (!navbarBrand || !headerSection) return;

  let ticking = false;

  function updateNavbarBrandOpacity() {
    const scrollY = window.pageYOffset;
    const headerHeight = headerSection.offsetHeight;

    const fadeStartScroll = headerHeight * 0.15;
    const fadeEndScroll = headerHeight * 0.25;

    let opacity = 0;
    if (scrollY <= fadeStartScroll) {
      opacity = 0;
    } else if (scrollY >= fadeEndScroll) {
      opacity = 1;
    } else {
      opacity = (scrollY - fadeStartScroll) / (fadeEndScroll - fadeStartScroll);
    }

    navbarBrand.style.opacity = opacity;

    if (centeredText) {
      centeredText.style.opacity = opacity;
    }

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(updateNavbarBrandOpacity);
      ticking = true;
    }
  }

  updateNavbarBrandOpacity();

  window.addEventListener("scroll", onScroll, { passive: true });

  window.addEventListener("resize", () => {
    if (!ticking) {
      window.requestAnimationFrame(updateNavbarBrandOpacity);
      ticking = true;
    }
  });
}

/**
 * Initialize all video comparators on the page
 */
function initializeVideoComparators() {
  const allComparators = document.querySelectorAll("[data-video-comparator]");

  allComparators.forEach((container) => {
    // Skip comparators in inactive tabs (initialized lazily when tab is shown)
    const tabPane = container.closest(".tab-pane");
    if (tabPane && !tabPane.classList.contains("active")) return;
    initializeComparator(container);
  });

  initializeTabVideoHandlers();
}

/**
 * Initialize a single video comparator based on its type
 */
function initializeComparator(container) {
  if (container._videoComparatorInstance) {
    return;
  }

  const config = JSON.parse(container.dataset.config || "{}");
  const type = container.dataset.videoComparator;

  if (type === "sidebyside") {
    new VideoSideBySideComparator(container, config);
  } else if (type === "slider") {
    new VideoSliderComparator(container, config);
  } else if (type === "looped") {
    new VideoLoopedPlayer(container, config);
  }

  // Set up scene tracking for comparators inside tab containers
  const instance = container._videoComparatorInstance;
  const tabContainer = container.closest(".video-tabs-container");
  if (instance && tabContainer) {
    if (tabContainer._currentSceneIndex === undefined) {
      tabContainer._currentSceneIndex = 0;
    }
    const originalLoadVideoGroup = instance.loadVideoGroup.bind(instance);
    instance.loadVideoGroup = function (index) {
      tabContainer._currentSceneIndex = index;
      return originalLoadVideoGroup(index);
    };
  }
}

/**
 * Initialize handlers for video playback when switching tabs
 */
function initializeTabVideoHandlers() {
  const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');

  tabButtons.forEach((button) => {
    button.addEventListener("shown.bs.tab", function (event) {
      const targetPane = document.querySelector(
        this.getAttribute("data-bs-target")
      );

      if (targetPane) {
        const tabContainer = this.closest(".video-tabs-container");

        let targetSceneIndex = 0;
        if (tabContainer && tabContainer._currentSceneIndex !== undefined) {
          targetSceneIndex = tabContainer._currentSceneIndex;
        }

        setTimeout(() => {
          const resizeEvent = new Event("resize");
          window.dispatchEvent(resizeEvent);

          const comparatorContainers = targetPane.querySelectorAll(
            "[data-video-comparator]"
          );
          comparatorContainers.forEach((container) => {
            // Lazily initialize comparators on first tab activation
            if (!container._videoComparatorInstance) {
              initializeComparator(container);
            }
            const instance = container._videoComparatorInstance;
            if (instance) {
              if (targetSceneIndex !== instance.currentGroupIndex) {
                const maxIndex = instance.videoGroups.length - 1;
                const clampedIndex = Math.min(targetSceneIndex, maxIndex);
                instance.loadVideoGroup(clampedIndex);
              }

              if (instance.startSyncedPlayback) {
                instance.startSyncedPlayback();
              }
            }
          });
        }, 50);
      }

      const tabContainer = this.closest(".video-tabs-container");
      if (tabContainer) {
        const tabPanesInThisContainer =
          tabContainer.querySelectorAll(".tab-pane");
        tabPanesInThisContainer.forEach((pane) => {
          if (pane !== targetPane) {
            const videos = pane.querySelectorAll("video");
            videos.forEach((video) => {
              video.pause();
            });
          }
        });
      }
    });
  });

}

/**
 * Initialize all image comparators on the page
 */
function initializeImageComparators() {
  document
    .querySelectorAll('[data-image-comparator="row"]')
    .forEach((container) => {
      const config = JSON.parse(container.dataset.config || "{}");
      new ImageComparisonRow(container, config);
    });
}

/**
 * Initialize mobile menu close on outside click
 */
function initializeMobileMenuCloseOnOutsideClick() {
  const navbarCollapse = document.querySelector(".navbar-collapse");
  const navbarToggler = document.querySelector(".navbar-toggler");

  if (!navbarCollapse || !navbarToggler) return;

  const bsToggle = navbarToggler.getAttribute("data-bs-toggle");
  const bsTarget = navbarToggler.getAttribute("data-bs-target");

  if (bsToggle) {
    navbarToggler.removeAttribute("data-bs-toggle");
    navbarToggler.setAttribute("data-original-bs-toggle", bsToggle);
  }
  if (bsTarget) {
    navbarToggler.removeAttribute("data-bs-target");
    navbarToggler.setAttribute("data-original-bs-target", bsTarget);
  }

  navbarToggler.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (navbarCollapse.classList.contains("show")) {
      navbarCollapse.classList.remove("show");
      navbarToggler.setAttribute("aria-expanded", "false");
    } else {
      navbarCollapse.classList.add("show");
      navbarToggler.setAttribute("aria-expanded", "true");
    }
  });

  document.addEventListener("click", function (e) {
    if (navbarCollapse.classList.contains("show")) {
      const isClickInsideMenu = navbarCollapse.contains(e.target);
      const isClickOnToggler = navbarToggler.contains(e.target);

      if (!isClickInsideMenu && !isClickOnToggler) {
        navbarCollapse.classList.remove("show");
        navbarToggler.setAttribute("aria-expanded", "false");
      }
    }
  });
}

/**
 * Initialize dark/light theme toggle.
 * The blocking script in <head> sets data-theme before render.
 * This function wires up the toggle button and OS preference listener.
 */
function initializeTheme() {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  updateToggleIcon();

  toggle.addEventListener("click", function () {
    const html = document.documentElement;
    const current = html.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    updateToggleIcon();
  });

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", function (e) {
      if (!localStorage.getItem("theme")) {
        const theme = e.matches ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", theme);
        updateToggleIcon();
      }
    });
}

function updateToggleIcon() {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;
  const isDark =
    document.documentElement.getAttribute("data-theme") === "dark";
  const icon = toggle.querySelector("i");
  icon.className = isDark ? "bi bi-sun-fill" : "bi bi-moon-fill";
  toggle.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode"
  );
}
