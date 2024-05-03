function fadeOutOnScroll() {
  const body = document.querySelector("body");
  const element = document.querySelector("nav");
  const background = element.querySelector(".background");
  const logo = element.querySelector(".headerLogo");

  if (!element || !body) {
    return;
  }

  const elementHeight = element.offsetHeight;
  const distanceToTop = Math.abs(body.getBoundingClientRect().top);

  let opacity = 1;

  if (distanceToTop < elementHeight) {
    opacity = 1 - distanceToTop / elementHeight;
  } else {
    opacity = 0;
  }

  background.style.opacity = opacity;
  logo.style.opacity = opacity;
}

window.addEventListener("scroll", fadeOutOnScroll);
