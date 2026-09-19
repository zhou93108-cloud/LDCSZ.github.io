// Back to Top Button functionality
(function () {
  // Wait for DOM to be ready
  document.addEventListener("DOMContentLoaded", function () {
    const backToTopButton = document.getElementById("backToTop");

    if (!backToTopButton) return;

    // Show/hide button based on scroll position
    window.addEventListener("scroll", function () {
      if (window.scrollY > 300) {
        backToTopButton.style.display = "flex";
      } else {
        backToTopButton.style.display = "none";
      }
    });

    // Scroll to top when button is clicked
    backToTopButton.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  });
})();
