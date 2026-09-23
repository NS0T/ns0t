(function () {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  function syncToggleState() {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    toggle.setAttribute("aria-pressed", String(isDark));
  }

  syncToggleState();

  toggle.addEventListener("click", () => {
    const current =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
    const next = current === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", next);

    try {
      localStorage.setItem("theme", next);
    } catch (e) {}

    syncToggleState();
  });
})();

(function () {
  const header = document.querySelector(".site-header");
  const links = Array.from(
    document.querySelectorAll('.header-nav a[href^="#"]'),
  );

  if (!links.length) return;

  const linkById = new Map(
    links.map((link) => [link.getAttribute("href").slice(1), link]),
  );
  const targets = links
    .map((link) => document.getElementById(link.getAttribute("href").slice(1)))
    .filter(Boolean);
  let activeId = null;
  let pendingId = null;
  let pendingDirection = 0;
  let lastScrollY = window.scrollY;
  let ticking = false;

  function setActive(id) {
    const nextId = linkById.has(id) ? id : "home";
    if (activeId === nextId) return;

    activeId = nextId;
    links.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${nextId}`;
      link.classList.toggle("is-active", isActive);
      if (isActive) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  function getMarkerPosition() {
    const headerOffset = header ? header.offsetHeight + 24 : 80;
    return (
      window.scrollY + Math.min(headerOffset + window.innerHeight * 0.24, 260)
    );
  }

  function getSectionAtScroll() {
    const marker = getMarkerPosition();
    let currentId = "home";

    targets.forEach((target) => {
      const top = target.getBoundingClientRect().top + window.scrollY;
      if (top <= marker) currentId = target.id;
    });

    return currentId;
  }

  function syncActiveFromScroll() {
    const currentScrollY = window.scrollY;
    const movementDirection = Math.sign(currentScrollY - lastScrollY);

    if (
      pendingId &&
      pendingDirection &&
      movementDirection &&
      movementDirection !== pendingDirection
    ) {
      pendingId = null;
      pendingDirection = 0;
    }

    if (pendingId) {
      const pendingTarget = document.getElementById(pendingId);
      if (pendingTarget) {
        const marker = getMarkerPosition();
        const targetTop =
          pendingTarget.getBoundingClientRect().top + currentScrollY;
        setActive(pendingId);

        if (Math.abs(targetTop - marker) <= 140) {
          pendingId = null;
          pendingDirection = 0;
        }
      } else {
        pendingId = null;
        pendingDirection = 0;
      }
    }

    if (!pendingId) setActive(getSectionAtScroll());
    lastScrollY = currentScrollY;
  }

  function scheduleActiveSync() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      syncActiveFromScroll();
      ticking = false;
    });
  }

  links.forEach((link) => {
    link.addEventListener("click", () => {
      const id = link.getAttribute("href").slice(1);
      if (!linkById.has(id)) return;

      const target = document.getElementById(id);
      pendingId = id;
      pendingDirection = target
        ? Math.sign(
            target.getBoundingClientRect().top +
              window.scrollY -
              window.scrollY,
          )
        : 0;
      lastScrollY = window.scrollY;
      setActive(id);
      history.replaceState(null, "", `#${id}`);
    });
  });

  window.addEventListener("hashchange", () => {
    const id = window.location.hash.slice(1);
    pendingId = null;
    pendingDirection = 0;
    setActive(id || "home");
    scheduleActiveSync();
  });
  window.addEventListener("scroll", scheduleActiveSync, { passive: true });

  const initialId = window.location.hash.slice(1);
  setActive(initialId || getSectionAtScroll());
  scheduleActiveSync();
})();

(function () {
  const header = document.querySelector(".site-header");
  const threshold = 40;
  let ticking = false;

  function updateHeader() {
    if (window.scrollY > threshold) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) {
      requestAnimationFrame(updateHeader);
      ticking = true;
    }
  });
})();

(function () {
  const menuButton = document.querySelector(".header-toggle");
  const player = document.querySelector(".mp-card");
  const header = document.querySelector(".site-header");
  const headerInner = document.querySelector(".header-inner");
  const phoneViewport = window.matchMedia("(max-width: 768px)");

  if (!menuButton || !player || !header || !headerInner) return;

  const playerParent = player.parentNode;
  const playerNextSibling = player.nextSibling;

  function closePlayer() {
    player.classList.remove("is-open");
    header.classList.remove("menu-open");
    menuButton.setAttribute("aria-expanded", "false");
  }

  function syncPlayerLocation() {
    closePlayer();

    if (phoneViewport.matches) {
      if (player.parentNode !== headerInner) {
        headerInner.append(player);
      }
    } else {
      if (player.parentNode === headerInner) {
        playerParent.insertBefore(player, playerNextSibling);
      }
    }
  }

  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-controls", "music-player");
  player.id = "music-player";

  menuButton.addEventListener("click", () => {
    if (!phoneViewport.matches) return;

    const isOpen = player.classList.toggle("is-open");
    header.classList.toggle("menu-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("pointerdown", (event) => {
    if (
      phoneViewport.matches &&
      player.classList.contains("is-open") &&
      !header.contains(event.target)
    ) {
      closePlayer();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePlayer();
  });

  header.querySelectorAll(".header-nav a").forEach((link) => {
    link.addEventListener("click", closePlayer);
  });

  phoneViewport.addEventListener("change", syncPlayerLocation);
  syncPlayerLocation();
})();

const DISCORD_USER_ID = "1293228247341072496";

const $ = (id) => document.getElementById(id);

function setImage(img, placeholder, src) {
  if (!img) return;

  if (!src) {
    img.style.display = "none";
    if (placeholder) placeholder.style.display = "flex";
    return;
  }

  img.onload = () => {
    img.style.display = "block";
    if (placeholder) placeholder.style.display = "none";
  };

  img.onerror = () => {
    img.style.display = "none";
    if (placeholder) placeholder.style.display = "flex";
  };

  img.src = src;
}

function setAvatarDecoration(user) {
  const deco = $("avatar-decoration");
  if (!deco) return;

  const decoData = user && user.avatar_decoration_data;

  if (!decoData || !decoData.asset) {
    deco.onload = null;
    deco.onerror = null;
    deco.removeAttribute("src");
    deco.hidden = true;
    return;
  }

  const decoURL = `https://cdn.discordapp.com/avatar-decoration-presets/${decoData.asset}.png?size=160`;

  deco.onload = () => {
    deco.hidden = false;
  };

  deco.onerror = () => {
    deco.hidden = true;
  };

  deco.src = decoURL;
}

async function updateLanyard() {
  try {
    const response = await fetch(
      `https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`,
    );

    const { success, data } = await response.json();

    if (!success) return;

    const avatar = $("discord-avatar-img");
    const avatarPlaceholder = document.querySelector(".avatar-placeholder");

    const avatarURL = `https://cdn.discordapp.com/avatars/${data.discord_user.id}/${data.discord_user.avatar}.png?size=512`;

    setImage(avatar, avatarPlaceholder, avatarURL);
    setAvatarDecoration(data.discord_user);

    $("discord-username").textContent =
      data.discord_user.global_name || data.discord_user.username;

    const status = data.discord_status;

    $("status-text").textContent =
      status.charAt(0).toUpperCase() + status.slice(1);

    $("status-dot").className = `status-dot ${status}`;

    const smallAvatar = $("discord-avatar-small");
    setImage(smallAvatar, null, avatarURL);
    $("discord-tag").textContent = `@${data.discord_user.username}`;
    $("small-status-text").textContent =
      status.charAt(0).toUpperCase() + status.slice(1);
    $("small-status-dot").className = `status-dot ${status}`;

    const spotify = data.spotify;
    if (spotify) {
      $("spotify-song").textContent = spotify.song || "Unknown track";
      $("spotify-artist").textContent = spotify.artist || "Unknown artist";
      setImage($("spotify-cover"), null, spotify.album_art_url);
    } else {
      $("spotify-song").textContent = "Nothing Playing";
      $("spotify-artist").textContent = "Spotify Offline";
      setImage($("spotify-cover"), null, null);
    }

    const activities = data.activities || [];

    const activity = activities.find((a) => a.type === 0);

    const card = $("activity-card");
    const name = $("activity-name");
    const details = $("activity-details");
    const icon = $("activity-icon");
    const dot = $("act-dot-activity");
    const iconPlaceholder = document.querySelector(".activity-placeholder");
    const divider = $("activity-divider");
    const profileCard = document.querySelector(".profile-card");

    if (activity) {
      card.hidden = false;
      if (divider) divider.hidden = false;
      if (profileCard) profileCard.classList.remove("no-activity");

      name.textContent = activity.name || "Playing a game";

      details.textContent = activity.details || activity.state || "Active now";

      let imageURL = null;
      if (activity.assets && activity.assets.large_image) {
        if (activity.assets.large_image.startsWith("mp:external")) {
          imageURL = activity.assets.large_image.replace(
            /mp:external\/([^\/]*)\/(.*)/,
            "https://$2",
          );
        } else {
          imageURL = `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png`;
        }
      }

      setImage(icon, iconPlaceholder, imageURL);
    } else {
      card.hidden = true;
      if (divider) divider.hidden = true;
      if (profileCard) profileCard.classList.add("no-activity");

      setImage(icon, iconPlaceholder, null);
    }

    if (dot) dot.className = `status-dot ${status}`;
  } catch (err) {
    console.error("Lanyard Error:", err);
  }
}

updateLanyard();
setInterval(updateLanyard, 10000);

function updateAmmanTime() {
  const now = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Amman",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date());

  $("current-time").textContent = now;
  $("timezone-name").textContent = "Asia/Amman";
}

updateAmmanTime();
setInterval(updateAmmanTime, 1000);
const playlist = [
  {
    name: "Landed",
    artist: "Drake",
    src: "music/Landed.mp3",
    cover: "music/cover/Landed.jpg",
  },
  {
    name: "Way 2 Sexy",
    artist: "Drake",
    src: "music/Way2Sexy.mp3",
    cover: "music/cover/drake.jpg",
  },
  {
    name: "Figure.09",
    artist: "Linkin Park",
    src: "music/Figure.09.mp3",
    cover: "music/cover/meteora.jpg",
  },
  {
    name: "Jezebel",
    artist: "Lithe",
    src: "music/Jezebel.mp3",
    cover: "music/cover/lithe.jpg",
  },
  {
    name: "Let It Happen",
    artist: "Tame Impala",
    src: "music/Let It Happen.mp3",
    cover: "music/cover/currents.jpg",
  },
  {
    name: "loser.",
    artist: "Stheppi",
    src: "music/loser..mp3",
    cover: "music/cover/shteppi.jpg",
  },
  {
    name: "Morë",
    artist: "Yeat",
    src: "music/Morë.mp3",
    cover: "music/cover/2093.jpg",
  },
  {
    name: "One Two",
    artist: "Future",
    src: "music/One Two.mp3",
    cover: "music/cover/realme.jpg",
  },
  {
    name: "BLITZ!",
    artist: "SSJ Daki",
    src: "music/BLITZ!.mp3",
    cover: "music/cover/blitz.jpg",
  },
];

function setMarqueeText(el, text) {
  el.classList.remove("marquee");
  el.innerHTML = `<span class="${el.classList.contains("mp-song") ? "mp-song-inner" : "mp-artist-inner"}">${text}</span>`;

  requestAnimationFrame(() => {
    const inner = el.firstElementChild;
    if (inner.scrollWidth > el.clientWidth) {
      el.classList.add("marquee");
    }
  });
}

(function () {
  let trackIndex = 0;
  let isPlaying = false;

  const audio = document.getElementById("player-audio");
  if (!audio) return;

  const coverBtn = document.getElementById("mp-cover-btn");
  const coverImg = document.getElementById("player-cover");
  const songEl = document.getElementById("player-song");
  const artistEl = document.getElementById("player-artist");
  const progressEl = document.getElementById("player-progress");
  const volumeEl = document.getElementById("player-volume");
  const playBtn = document.getElementById("player-play");
  const playIcon = document.getElementById("player-play-icon");
  const pauseIcon = document.getElementById("player-pause-icon");
  const prevBtn = document.getElementById("player-prev");
  const nextBtn = document.getElementById("player-next");

  const progressFill = document.getElementById("progress-fill");
  const progressThumb = document.getElementById("progress-thumb");
  const volumeFill = document.getElementById("volume-fill");
  const volumeThumb = document.getElementById("volume-thumb");

  function updateSliderVisual(inputEl, fillEl, thumbEl) {
    const min = Number(inputEl.min) || 0;
    const max = Number(inputEl.max) || 100;
    const value = Number(inputEl.value) || 0;
    const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;

    if (window.matchMedia("(max-width: 768px)").matches) {
      fillEl.style.width = percent + "%";
      fillEl.style.height = "";
      thumbEl.style.left = percent + "%";
      thumbEl.style.bottom = "";
    } else {
      fillEl.style.height = percent + "%";
      fillEl.style.width = "";
      thumbEl.style.bottom = percent + "%";
      thumbEl.style.left = "";
    }
  }

  function loadTrack(index, autoplay) {
    trackIndex = (index + playlist.length) % playlist.length;
    const track = playlist[trackIndex];

    coverImg.src = track.cover;
    setMarqueeText(songEl, track.name);
    setMarqueeText(artistEl, track.artist);

    audio.src = track.src;
    progressEl.value = 0;

    if (autoplay) {
      audio.play();
      isPlaying = true;
      updatePlayIcon();
    }
  }

  function updatePlayIcon() {
    playIcon.style.display = isPlaying ? "none" : "block";
    pauseIcon.style.display = isPlaying ? "block" : "none";
  }

  function togglePlay() {
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    isPlaying = !isPlaying;
    updatePlayIcon();
  }

  coverBtn.addEventListener("click", togglePlay);
  playBtn.addEventListener("click", togglePlay);
  prevBtn.addEventListener("click", () => loadTrack(trackIndex - 1, isPlaying));
  nextBtn.addEventListener("click", () => loadTrack(trackIndex + 1, isPlaying));

  audio.addEventListener("loadedmetadata", () => {
    progressEl.max = audio.duration || 100;
  });

  audio.addEventListener("timeupdate", () => {
    progressEl.value = audio.currentTime;
    updateSliderVisual(progressEl, progressFill, progressThumb);
  });

  audio.addEventListener("ended", () => {
    loadTrack(trackIndex + 1, true);
  });

  progressEl.addEventListener("input", () => {
    audio.currentTime = progressEl.value;
    updateSliderVisual(progressEl, progressFill, progressThumb);
  });

  volumeEl.addEventListener("input", () => {
    audio.volume = volumeEl.value / 100;
    updateSliderVisual(volumeEl, volumeFill, volumeThumb);
  });

  audio.volume = volumeEl.value / 100;
  updateSliderVisual(progressEl, progressFill, progressThumb);
  updateSliderVisual(volumeEl, volumeFill, volumeThumb);
  loadTrack(0, false);

  window.matchMedia("(max-width: 768px)").addEventListener("change", () => {
    updateSliderVisual(progressEl, progressFill, progressThumb);
    updateSliderVisual(volumeEl, volumeFill, volumeThumb);
  });

  document.body.classList.add("no-scroll");

  const overlay = document.getElementById("enter-overlay");

  if (overlay) {
    overlay.addEventListener(
      "click",
      () => {
        overlay.classList.add("hidden");
        document.body.classList.remove("no-scroll");
        document.body.classList.add("has-entered");

        setTimeout(() => {
          overlay.style.display = "none";
        }, 500);

        if (!isPlaying) {
          togglePlay();
        }
      },
      { once: true },
    );
  }
})();
(function () {
  const sections = document.querySelectorAll(
    ".about-card, .work-container, .skills-container, .tools-container, .repos-container, .contact-container",
  );

  if (!sections.length || !("IntersectionObserver" in window)) return;

  const reveal = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 },
  );

  sections.forEach((section) => {
    section.classList.add("reveal");
    reveal.observe(section);
  });
})();
(function () {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("contact-status");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitBtn = form.querySelector(".contact-submit");
    const data = new FormData(form);

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
    status.textContent = "";
    status.className = "contact-status";

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: data,
      });
      const result = await res.json();

      if (result.success) {
        status.textContent = "Message sent, thanks!";
        status.classList.add("success");
        form.reset();
      } else {
        status.textContent = "Something went wrong. Try again.";
        status.classList.add("error");
      }
    } catch (err) {
      status.textContent = "Network error. Try again.";
      status.classList.add("error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Message";
    }
  });
})();

function isSafeHttpUrl(value) {
  try {
    const url = new URL(String(value || ""), window.location.href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function renderWorkCard(item, isLast) {
  const link = document.createElement("a");
  link.className = "work-card";

  if (isSafeHttpUrl(item.project_url)) {
    link.href = item.project_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  } else {
    link.href = "#";
  }

  const image = document.createElement("img");
  image.className = "work-logo";
  image.alt = String(item.title || "");
  if (isSafeHttpUrl(item.image_url)) image.src = item.image_url;

  const info = document.createElement("div");
  info.className = "work-card-info";

  const title = document.createElement("h4");
  title.className = "work-name";
  title.textContent = String(item.title || "");

  const summary = document.createElement("p");
  summary.className = "work-summary";
  summary.textContent = String(item.description || "");

  const arrow = document.createElement("span");
  arrow.className = "work-arrow";
  arrow.innerHTML = "&rarr;";

  info.append(title, summary);
  link.append(image, info, arrow);
  return link;
}

function renderSimpleCard(item, cardClass) {
  const div = document.createElement("div");
  div.className = cardClass;

  const image = document.createElement("img");
  image.alt = String(item.title || "");
  if (isSafeHttpUrl(item.image_url)) image.src = item.image_url;

  const title = document.createElement("h3");
  title.className = "skill-name";
  title.textContent = String(item.title || "");

  div.append(image, title);
  return div;
}

function escapeHtml(value = "") {
  const node = document.createElement("span");
  node.textContent = String(value);
  return node.innerHTML;
}

function renderRepoCard(item) {
  const link = document.createElement("a");
  const repoUrl = item.project_url || "https://github.com/NS0T";
  const description =
    item.description || "An open-source experiment from my GitHub.";
  const imageUrl =
    item.image_url || "https://github.githubassets.com/favicons/favicon.svg";

  link.className = "repo-card";
  link.href = repoUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.innerHTML = `
    <div class="repo-card-top">
      <img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" class="repo-logo" onerror="this.src='https://github.githubassets.com/favicons/favicon.svg'">
    </div>
    <div class="repo-card-body">
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(description)}</p>
    </div>
    <span class="repo-card-link">View repository <span aria-hidden="true">→</span></span>
  `;
  return link;
}

const PORTFOLIO_API_URL = "http://localhost:8080/api/portfolio";

async function loadPortfolioItems() {
  const workGrid = $("work-grid");
  const skillsGrid = $("skills-grid");
  const toolsGrid = $("tools-grid");
  const reposGrid = $("repos-grid");

  try {
    const response = await fetch(PORTFOLIO_API_URL);

    if (!response.ok) {
      throw new Error(`Portfolio API returned ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Portfolio API returned invalid data");
    }

    const work = data.filter((item) => item.category === "work");

    const skills = data.filter(
      (item) => item.category === "skill" || item.category === "skills",
    );

    const tools = data.filter(
      (item) => item.category === "tool" || item.category === "tools",
    );

    const repos = data.filter(
      (item) =>
        item.category === "repository" ||
        item.category === "repositories" ||
        item.category === "repos",
    );

    if (workGrid) {
      workGrid.innerHTML = "";

      work.forEach((item, index) => {
        workGrid.appendChild(renderWorkCard(item, index === work.length - 1));
      });
    }

    if (skillsGrid) {
      skillsGrid.innerHTML = "";

      skills.forEach((item) => {
        skillsGrid.appendChild(renderSimpleCard(item, "skills-card"));
      });
    }

    if (toolsGrid) {
      toolsGrid.innerHTML = "";

      tools.forEach((item) => {
        toolsGrid.appendChild(renderSimpleCard(item, "tools-card"));
      });
    }

    if (reposGrid) {
      reposGrid.innerHTML = "";

      if (repos.length) {
        repos.forEach((item) => {
          reposGrid.appendChild(renderRepoCard(item));
        });
      } else {
        reposGrid.innerHTML =
          '<p class="repos-state">No repositories added yet. Check back soon.</p>';
      }
    }
  } catch (error) {
    console.error("Portfolio API load error:", error);

    if (workGrid) {
      workGrid.innerHTML =
        '<p class="repos-state">Portfolio is unavailable right now.</p>';
    }

    if (skillsGrid) {
      skillsGrid.innerHTML = "";
    }

    if (toolsGrid) {
      toolsGrid.innerHTML = "";
    }

    if (reposGrid) {
      reposGrid.innerHTML =
        '<p class="repos-state">GitHub repos are unavailable right now.</p>';
    }
  }
}

document.addEventListener("DOMContentLoaded", loadPortfolioItems);

function SmoothScroll(target, speed, smooth) {
  if (target === document)
    target =
      document.scrollingElement ||
      document.documentElement ||
      document.body.parentNode ||
      document.body;

  var moving = false;
  var pos = target.scrollTop;
  var frame =
    target === document.body && document.documentElement
      ? document.documentElement
      : target;

  target.addEventListener("wheel", scrolled, { passive: false });

  document.addEventListener("click", handleAnchorClick);

  function scrolled(e) {
    const scrollableParent = e.target.closest(
      ".guestbook-feed-panel, .guestbook-list, .github-contributions .calender, .github-contributions-graph",
    );

    if (scrollableParent) {
      const atTop = scrollableParent.scrollTop <= 0;
      const atBottom =
        Math.ceil(scrollableParent.scrollTop + scrollableParent.clientHeight) >=
        scrollableParent.scrollHeight;

      const scrollingdown = e.deltaY > 0;

      if (!(scrollingdown && atBottom) && !(!scrollingdown && atTop)) {
        return;
      }
    }
    e.preventDefault();
    var delta = normalizeWheelDelta(e);
    scrollTo(pos + -delta * speed);
  }

  function handleAnchorClick(e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;

    var id = link.getAttribute("href").slice(1);
    if (!id) return;

    var el = document.getElementById(id);
    if (!el) return;

    e.preventDefault();

    var offset = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    var destination =
      el.getBoundingClientRect().top + target.scrollTop - offset;

    scrollTo(destination);
  }

  function scrollTo(newPos) {
    pos = Math.max(
      0,
      Math.min(newPos, target.scrollHeight - frame.clientHeight),
    );
    if (!moving) update();
  }

  function normalizeWheelDelta(e) {
    var deltaY = e.deltaY;

    if (e.deltaMode === 1) deltaY *= 18;
    else if (e.deltaMode === 2) deltaY *= frame.clientHeight;

    return -deltaY / 100;
  }

  function update() {
    moving = true;

    var delta = (pos - target.scrollTop) / smooth;

    target.scrollTop += delta;

    if (Math.abs(delta) > 0.5) requestFrame(update);
    else moving = false;
  }

  var requestFrame = (function () {
    return (
      window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function (func) {
        window.setTimeout(func, 1000 / 50);
      }
    );
  })();
}

window.addEventListener("DOMContentLoaded", () => {
  SmoothScroll(document, 200, 12);
});

(function syncGitHubGraphTheme() {
  const graph = document.querySelector(".github-contributions-image");
  if (!graph) return;

  const lightGraph = "https://ghchart.rshah.org/2ea44f/NS0T";
  const darkGraph = "https://ghchart.rshah.org/39d353/NS0T";

  function updateGraph() {
    const isDark = document.documentElement.dataset.theme === "dark";
    const nextSource = isDark ? darkGraph : lightGraph;
    if (graph.src !== nextSource) graph.src = nextSource;
  }

  updateGraph();
  new MutationObserver(updateGraph).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
})();

(function renderNativeGitHubContributions() {
  const graph = document.getElementById("github-contributions-graph");
  if (!graph) return;

  const username = "NS0T";
  const endpoint = `https://github-contributions-api.jogruber.de/v4/${username}?y=last`;
  const dayNames = ["", "Mon", "", "Wed", "", "Fri", ""];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  function dateFromString(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  function formatYearLabel(contributions) {
    const years = [
      ...new Set(contributions.map((item) => item.date.slice(0, 4))),
    ];
    return years.length > 1
      ? `${years[0]}–${years[years.length - 1]}`
      : years[0];
  }

  function render(data) {
    const contributions = data.contributions || [];
    if (!contributions.length) throw new Error("No contribution data");

    const byDate = new Map(contributions.map((item) => [item.date, item]));
    const firstDate = dateFromString(contributions[0].date);
    const lastDate = dateFromString(
      contributions[contributions.length - 1].date,
    );
    const firstSunday = new Date(firstDate);
    firstSunday.setUTCDate(firstSunday.getUTCDate() - firstSunday.getUTCDay());
    const lastSaturday = new Date(lastDate);
    lastSaturday.setUTCDate(
      lastSaturday.getUTCDate() + (6 - lastSaturday.getUTCDay()),
    );

    const columns = [];
    for (
      let cursor = new Date(firstSunday);
      cursor <= lastSaturday;
      cursor.setUTCDate(cursor.getUTCDate() + 7)
    ) {
      const week = [];
      for (let offset = 0; offset < 7; offset += 1) {
        const date = new Date(cursor);
        date.setUTCDate(cursor.getUTCDate() + offset);
        const iso = date.toISOString().slice(0, 10);
        week.push(byDate.get(iso) || { date: iso, count: 0, level: 0 });
      }
      columns.push(week);
    }

    const total =
      data.total?.lastYear ??
      contributions.reduce((sum, item) => sum + item.count, 0);
    const months = [];
    columns.forEach((week, index) => {
      const first = dateFromString(week[0].date);
      if (
        index === 0 ||
        first.getUTCDate() <= 7 ||
        first.getUTCMonth() !==
          dateFromString(columns[index - 1][0].date).getUTCMonth()
      ) {
        months.push({ name: monthNames[first.getUTCMonth()], index });
      }
    });

    const monthMarkup = months
      .map((month) => {
        const left = (month.index / columns.length) * 100;
        return `<span class="github-calendar-month" style="left:${left}%">${month.name}</span>`;
      })
      .join("");

    const gridMarkup = columns
      .map((week) =>
        week
          .map((item) => {
            const date = dateFromString(item.date);
            const label = `${item.count} contribution${item.count === 1 ? "" : "s"} on ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
            return `<span class="github-calendar-day" data-level="${item.level || 0}" title="${label}"></span>`;
          })
          .join(""),
      )
      .join("");

    const dayMarkup = dayNames.map((day) => `<span>${day}</span>`).join("");
    const legendMarkup = [0, 1, 2, 3, 4]
      .map(
        (level) =>
          `<span class="github-calendar-day" data-level="${level}" aria-hidden="true"></span>`,
      )
      .join("");

    graph.innerHTML = `
      <div class="github-calendar-shell">
        <div class="github-calendar-top">
          <strong>${total} contributions in ${formatYearLabel(contributions)}</strong>
          <span class="github-calendar-settings">Contribution settings⌄</span>
        </div>
        <div class="github-calendar-body">
          <div class="github-calendar-day-labels">${dayMarkup}</div>
          <div class="github-calendar-grid-wrap">
            <div class="github-calendar-months">${monthMarkup}</div>
            <div class="github-calendar-grid">${gridMarkup}</div>
          </div>
        </div>
        <div class="github-calendar-bottom">
          <span>meow</span>
          <span class="github-calendar-legend"><span>Less</span>${legendMarkup}<span>More</span></span>
        </div>
      </div>`;
  }

  fetch(endpoint, { headers: { Accept: "application/json" } })
    .then((response) => {
      if (!response.ok)
        throw new Error(`GitHub API returned ${response.status}`);
      return response.json();
    })
    .then(render)
    .catch(() => {
      graph.innerHTML =
        '<span class="github-contributions-error">GitHub contributions are unavailable right now.</span>';
    });
})();

(function initGuestbook() {
  const form = document.getElementById("guestbook-form");
  const list = document.getElementById("guestbook-list");
  const count = document.getElementById("guestbook-count");
  const nameInput = document.getElementById("guestbook-name");
  const messageInput = document.getElementById("guestbook-message");
  const websiteInput = document.getElementById("guestbook-website");
  const charCount = document.getElementById("guestbook-char-count");
  const submitButton = document.getElementById("guestbook-submit");
  const cancelButton = document.getElementById("guestbook-cancel");
  const status = document.getElementById("guestbook-status");

  if (
    !form ||
    !list ||
    !count ||
    !nameInput ||
    !messageInput ||
    !websiteInput ||
    !charCount ||
    !submitButton ||
    !cancelButton ||
    !status
  ) {
    return;
  }

  form.noValidate = true;
  messageInput.required = false;

  const TABLE_NAME = "guestbook_comments";
  const SUBMISSION_COOLDOWN_MS = 45 * 1000;
  const STORAGE_KEY = "guestbook-last-submission";
  const REPLY_STORAGE_KEY = "guestbook-last-reply";
  const REPLY_COOLDOWN_MS = 20 * 1000;
  const OWNED_COMMENTS_STORAGE_KEY = "guestbook-owned-comments";

  const KLIPY_API_KEY =
    "cp8gxtfp41L4LWqZXm13jbj6GOB8Zi3HSvWZOZeeFUou2jcGaL4Fj4DtBgsJqcov";
  const KLIPY_PROXY_URL = "";
  const KLIPY_RATING = "pg";
  const KLIPY_RESULTS_PER_PAGE = 24;

  let editingComment = null;
  let selectedCommentGif = null;

  function setStatus(message, type) {
    status.textContent = message;
    status.className = "guestbook-status";
    if (type) status.classList.add(`is-${type}`);
  }

  function updateCharacterCount() {
    charCount.textContent = `${messageInput.value.length} / 500`;
  }

  function createKlipyPicker() {
    const gifButton = document.getElementById("guestbook-gif-button");
    const picker = document.getElementById("guestbook-gif-picker");
    const closeButton = document.getElementById("guestbook-gif-close");
    const searchInput = document.getElementById("guestbook-gif-search");
    const results = document.getElementById("guestbook-gif-results");
    const pickerStatus = document.getElementById("guestbook-gif-picker-status");
    const preview = document.getElementById("guestbook-gif-preview");
    const previewImage = document.getElementById("guestbook-gif-preview-image");
    const removeGifButton = document.getElementById("guestbook-gif-remove");

    results.addEventListener(
      "wheel",
      (event) => {
        event.stopPropagation();
      },
      { passive: true },
    );
    if (
      !gifButton ||
      !picker ||
      !closeButton ||
      !searchInput ||
      !results ||
      !pickerStatus ||
      !preview ||
      !previewImage ||
      !removeGifButton
    ) {
      return { setSelectedGif() {} };
    }

    let searchTimer = null;
    let activeRequest = null;
    let trendingLoaded = false;
    let onReplyGifSelected = null;
    let replyGifFocusTarget = null;

    function setPickerStatus(text) {
      pickerStatus.textContent = text;
    }

    function setSelectedGif(gif) {
      selectedCommentGif = gif;

      if (!gif) {
        preview.hidden = true;
        previewImage.removeAttribute("src");
        return;
      }

      previewImage.src = gif.previewUrl || gif.url;
      preview.hidden = false;
    }

    function getGifUrls(item) {
      const file = item?.file || item?.files || {};
      const gifUrl =
        file.md?.gif?.url ||
        file.sm?.gif?.url ||
        file.hd?.gif?.url ||
        file.xs?.gif?.url ||
        null;
      const previewUrl =
        file.xs?.webp?.url ||
        file.xs?.gif?.url ||
        file.sm?.webp?.url ||
        file.sm?.gif?.url ||
        gifUrl;

      return { gifUrl, previewUrl };
    }

    function renderResults(items, label) {
      results.replaceChildren();
      const usableItems = items
        .map((item) => ({ item, ...getGifUrls(item) }))
        .filter(
          ({ gifUrl }) =>
            typeof gifUrl === "string" && gifUrl.startsWith("https://"),
        );

      if (!usableItems.length) {
        setPickerStatus("No GIFs found. Try another search.");
        return;
      }

      usableItems.forEach(({ item, gifUrl, previewUrl }) => {
        const resultButton = document.createElement("button");
        resultButton.type = "button";
        resultButton.className = "guestbook-gif-result";
        resultButton.setAttribute(
          "aria-label",
          `Attach GIF: ${item.title || "GIF"}`,
        );
        resultButton.title = item.title || "Attach GIF";

        const image = document.createElement("img");
        image.src = previewUrl || gifUrl;
        image.alt = "";
        image.loading = "lazy";
        image.addEventListener("error", () => {
          if (image.src !== gifUrl) image.src = gifUrl;
        });

        resultButton.append(image);
        resultButton.addEventListener("click", () => {
          const selectedGif = {
            id: String(item.id || item.slug || gifUrl),
            url: gifUrl,
            previewUrl: previewUrl || gifUrl,
          };

          if (onReplyGifSelected) {
            const chooseForReply = onReplyGifSelected;
            const focusTarget = replyGifFocusTarget;
            onReplyGifSelected = null;
            replyGifFocusTarget = null;
            chooseForReply(selectedGif);
            closePicker(false);
            focusTarget?.focus();
            return;
          }

          setSelectedGif(selectedGif);
          closePicker(false);
          messageInput.focus();
        });
        results.append(resultButton);
      });

      setPickerStatus(`${label} · ${usableItems.length} GIFs`);
    }

    function buildKlipyUrl(endpoint, query) {
      if (KLIPY_PROXY_URL) {
        const url = new URL(KLIPY_PROXY_URL, window.location.origin);
        url.searchParams.set("endpoint", endpoint);
        if (query) url.searchParams.set("q", query);
        return url;
      }

      const url = new URL(
        `https://api.klipy.com/api/v1/${encodeURIComponent(KLIPY_API_KEY)}/gifs/${endpoint}`,
      );
      if (query) url.searchParams.set("q", query);
      return url;
    }

    async function loadKlipy({ query = "", trending = false } = {}) {
      const endpoint = trending ? "trending" : "search";
      const label = trending ? "Trending GIFs" : `Results for “${query}”`;

      if (
        !KLIPY_PROXY_URL &&
        (!KLIPY_API_KEY || KLIPY_API_KEY.startsWith("PASTE_"))
      ) {
        setPickerStatus("Add your Klipy API key in script.js first.");
        return;
      }

      if (activeRequest) activeRequest.abort();
      const requestController = new AbortController();
      activeRequest = requestController;
      results.replaceChildren();
      setPickerStatus(
        trending ? "Loading trending GIFs..." : "Searching GIFs...",
      );

      try {
        const requestUrl = buildKlipyUrl(endpoint, query);
        requestUrl.searchParams.set("per_page", String(KLIPY_RESULTS_PER_PAGE));
        requestUrl.searchParams.set("rating", KLIPY_RATING);
        requestUrl.searchParams.set(
          "locale",
          navigator.language.replace("-", "_"),
        );

        const response = await fetch(requestUrl, {
          headers: { Accept: "application/json" },
          signal: requestController.signal,
        });
        if (!response.ok) throw new Error(`Klipy returned ${response.status}`);

        const payload = await response.json();
        const items = payload?.data?.data;
        if (!payload?.result || !Array.isArray(items)) {
          throw new Error("Unexpected Klipy response.");
        }

        renderResults(items, label);
        trendingLoaded = trending || trendingLoaded;
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("Klipy GIF search error:", error);
        setPickerStatus("GIF search is unavailable. Please try again.");
      } finally {
        if (activeRequest === requestController) activeRequest = null;
      }
    }

    function openPicker() {
      if (editingComment) {
        setStatus(
          "GIF attachments cannot be changed while editing yet.",
          "error",
        );
        return;
      }

      picker.hidden = false;
      gifButton.setAttribute("aria-expanded", "true");
      searchInput.focus();
      if (!trendingLoaded) loadKlipy({ trending: true });
    }

    function closePicker(restoreFocus = true) {
      picker.hidden = true;
      gifButton.setAttribute("aria-expanded", "false");
      if (restoreFocus) gifButton.focus();
    }

    gifButton.addEventListener("click", () => {
      if (picker.hidden) openPicker();
      else closePicker();
    });

    closeButton.addEventListener("click", () => closePicker());
    removeGifButton.addEventListener("click", () => setSelectedGif(null));

    searchInput.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      const query = searchInput.value.trim();
      searchTimer = window.setTimeout(() => {
        if (query.length >= 2) loadKlipy({ query });
        else if (!query) loadKlipy({ trending: true });
        else setPickerStatus("Keep typing to search.");
      }, 240);
    });

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const query = searchInput.value.trim();
        if (query) loadKlipy({ query });
      }
    });

    document.addEventListener("pointerdown", (event) => {
      if (
        !picker.hidden &&
        !picker.contains(event.target) &&
        !gifButton.contains(event.target)
      ) {
        closePicker(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !picker.hidden) closePicker();
    });

    function openForReply(onSelect, focusTarget) {
      if (typeof onSelect !== "function") return;

      onReplyGifSelected = onSelect;
      replyGifFocusTarget = focusTarget || null;
      picker.hidden = false;
      gifButton.setAttribute("aria-expanded", "true");
      searchInput.focus();

      if (!trendingLoaded) loadKlipy({ trending: true });
    }

    return { setSelectedGif, openForReply };
  }

  const gifPicker = createKlipyPicker();

  function getOwnedComments() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(OWNED_COMMENTS_STORAGE_KEY) || "{}",
      );
      return saved && typeof saved === "object" && !Array.isArray(saved)
        ? saved
        : {};
    } catch (error) {
      return {};
    }
  }

  function saveOwnedComments(ownedComments) {
    localStorage.setItem(
      OWNED_COMMENTS_STORAGE_KEY,
      JSON.stringify(ownedComments),
    );
  }

  function getOwnerToken(commentId) {
    return getOwnedComments()[commentId] || null;
  }

  function rememberOwnerToken(commentId, token) {
    const ownedComments = getOwnedComments();
    ownedComments[commentId] = token;
    saveOwnedComments(ownedComments);
  }

  function forgetOwnerToken(commentId) {
    const ownedComments = getOwnedComments();
    delete ownedComments[commentId];
    saveOwnedComments(ownedComments);
  }

  function createOwnerToken() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    throw new Error(
      "Your browser does not support secure comment ownership tokens.",
    );
  }

  function setEditingState(comment) {
    editingComment = comment || null;
    const isEditing = Boolean(editingComment);
    form.classList.toggle("is-editing", isEditing);
    cancelButton.hidden = !isEditing;
    submitButton.querySelector("span").textContent = isEditing
      ? "Save changes"
      : "Send comment";
  }

  function resetGuestbookForm() {
    form.reset();
    gifPicker?.setSelectedGif(null);
    updateCharacterCount();
    setEditingState(null);
  }

  function startEditing(comment) {
    if (!getOwnerToken(comment.id)) return;

    gifPicker?.setSelectedGif(null);
    nameInput.value =
      comment.author_name === "Anonymous" ? "" : comment.author_name;
    messageInput.value = comment.message;
    updateCharacterCount();
    setEditingState(comment);
    setStatus("Editing your comment.", "");
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    messageInput.focus();
  }

  function relativeTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "recently";

    const seconds = Math.max(
      0,
      Math.floor((Date.now() - date.getTime()) / 1000),
    );
    const units = [
      ["year", 31536000],
      ["month", 2592000],
      ["week", 604800],
      ["day", 86400],
      ["hour", 3600],
      ["minute", 60],
    ];

    for (const [unit, size] of units) {
      if (seconds >= size) {
        const amount = Math.floor(seconds / size);
        return `${amount} ${unit}${amount === 1 ? "" : "s"} ago`;
      }
    }

    return "just now";
  }

  function createReplyElement(reply) {
    const article = document.createElement("article");
    article.className = "guestbook-reply";

    const meta = document.createElement("div");
    meta.className = "guestbook-reply-meta";

    const author = document.createElement("strong");
    author.className = "guestbook-reply-name";
    author.textContent = reply.author_name;

    const time = document.createElement("time");
    time.className = "guestbook-reply-time";
    time.dateTime = reply.created_at;
    time.title = new Date(reply.created_at).toLocaleString();
    time.textContent = relativeTime(reply.created_at);

    const message = document.createElement("p");
    message.className = "guestbook-reply-message";
    renderTextWithLinks(message, reply.message);

    let gif = null;
    try {
      const gifUrl = new URL(reply.gif_url);
      if (gifUrl.protocol === "https:") {
        gif = document.createElement("img");
        gif.className = "guestbook-comment-gif";
        gif.src = gifUrl.href;
        gif.alt = "GIF attached to this reply";
        gif.loading = "lazy";
      }
    } catch (error) {}

    const actions = document.createElement("div");
    actions.className = "guestbook-comment-actions";

    const ownerToken = getOwnerToken(reply.id);
    if (ownerToken) {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "guestbook-comment-action";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", async () => {
        const nextName = window.prompt(
          "Edit your reply name:",
          reply.author_name || "",
        );
        if (nextName === null) return;
        const nextMessage = window.prompt(
          "Edit your reply:",
          reply.message || "",
        );
        if (nextMessage === null) return;
        try {
          const response = await fetch(
            `http://localhost:8080/api/guestbook/replies/${reply.id}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-Owner-Token": ownerToken,
              },
              body: JSON.stringify({
                name: nextName.trim(),
                message: nextMessage.trim(),
              }),
            },
          );
          const body = await response.json().catch(() => null);
          if (!response.ok)
            throw new Error(body?.error || "Could not update reply.");
          await loadGuestbook();
        } catch (error) {
          setStatus(error.message || "Could not update reply.", "error");
        }
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "guestbook-comment-action is-delete";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", async () => {
        if (!window.confirm("Delete this reply permanently?")) return;
        try {
          const response = await fetch(
            `http://localhost:8080/api/guestbook/replies/${reply.id}`,
            {
              method: "DELETE",
              headers: {
                Accept: "application/json",
                "X-Owner-Token": ownerToken,
              },
            },
          );
          const body = await response.json().catch(() => null);
          if (!response.ok)
            throw new Error(body?.error || "Could not delete reply.");
          forgetOwnerToken(reply.id);
          await loadGuestbook();
        } catch (error) {
          setStatus(error.message || "Could not delete reply.", "error");
        }
      });
      actions.append(editButton, deleteButton);
    }

    meta.append(author, time, actions);
    article.append(meta, message);
    if (gif) article.append(gif);
    else appendTrustedGifPreview(article, reply.message);
    return article;
  }

  function createReplyForm(comment) {
    const form = document.createElement("form");
    form.className = "guestbook-reply-form";
    form.noValidate = true;
    let selectedReplyGif = null;

    const fields = document.createElement("div");
    fields.className = "guestbook-reply-fields";

    const nameField = document.createElement("label");
    nameField.textContent = "Your name";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = 32;
    nameInput.minLength = 2;
    nameInput.placeholder = "Your name";
    nameInput.autocomplete = "nickname";
    nameField.append(nameInput);

    const messageField = document.createElement("label");
    messageField.textContent = "Your reply";
    const messageInput = document.createElement("textarea");
    messageInput.maxLength = 500;
    messageInput.placeholder = "Write a reply...";
    messageField.append(messageInput);
    const replyGifControls = document.createElement("div");
    replyGifControls.className = "guestbook-reply-gif-controls";

    const replyGifButton = document.createElement("button");
    replyGifButton.type = "button";
    replyGifButton.className = "guestbook-reply-gif-button";
    replyGifButton.textContent = "GIF";
    replyGifButton.setAttribute("aria-label", "Choose a GIF for this reply");

    const replyGifPreview = document.createElement("div");
    replyGifPreview.className = "guestbook-reply-gif-preview";
    replyGifPreview.hidden = true;

    const replyGifImage = document.createElement("img");
    replyGifImage.alt = "Selected GIF";

    const removeReplyGif = document.createElement("button");
    removeReplyGif.type = "button";
    removeReplyGif.textContent = "Remove GIF";
    removeReplyGif.className = "guestbook-reply-gif-remove";

    replyGifPreview.append(replyGifImage, removeReplyGif);
    replyGifControls.append(replyGifButton, replyGifPreview);
    messageField.append(replyGifControls);

    function setReplyGif(gif) {
      selectedReplyGif = gif || null;
      replyGifPreview.hidden = !selectedReplyGif;

      if (!selectedReplyGif) {
        replyGifImage.removeAttribute("src");
        return;
      }

      replyGifImage.src = selectedReplyGif.previewUrl || selectedReplyGif.url;
    }

    replyGifButton.addEventListener("click", () => {
      gifPicker.openForReply(setReplyGif, messageInput);
    });

    removeReplyGif.addEventListener("click", () => setReplyGif(null));

    fields.append(nameField, messageField);

    const footer = document.createElement("div");
    footer.className = "guestbook-reply-footer";
    const replyStatus = document.createElement("p");
    replyStatus.className = "guestbook-reply-status";
    replyStatus.setAttribute("aria-live", "polite");
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Post reply";
    footer.append(replyStatus, submit);

    form.append(fields, footer);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const authorName = nameInput.value.replace(/\s+/g, " ").trim();
      const rawReplyMessage = messageInput.value.trim();
      const replyMessage = rawReplyMessage || null;
      const replyGifUrl = selectedReplyGif?.url || null;

      if (authorName.length < 2 || authorName.length > 32) {
        replyStatus.textContent = "Enter a name between 2 and 32 characters.";
        replyStatus.className = "guestbook-reply-status is-error";
        nameInput.focus();
        return;
      }

      if (
        (!replyMessage && !replyGifUrl) ||
        (replyMessage && replyMessage.length > 500)
      ) {
        replyStatus.textContent =
          "Add a reply message or GIF. Messages can be up to 500 characters.";
        replyStatus.className = "guestbook-reply-status is-error";
        messageInput.focus();
        return;
      }

      const blockedReplyWord = findBlockedWord(replyMessage);
      if (blockedReplyWord) {
        replyStatus.textContent =
          "Please remove prohibited language before posting.";
        replyStatus.className = "guestbook-reply-status is-error";
        messageInput.focus();
        return;
      }

      const lastReply = Number(localStorage.getItem(REPLY_STORAGE_KEY) || 0);
      const remaining = REPLY_COOLDOWN_MS - (Date.now() - lastReply);
      if (remaining > 0) {
        replyStatus.textContent = `Please wait ${Math.ceil(remaining / 1000)} seconds before replying again.`;
        replyStatus.className = "guestbook-reply-status is-error";
        return;
      }

      submit.disabled = true;
      submit.textContent = "Posting...";
      replyStatus.textContent = "";
      replyStatus.className = "guestbook-reply-status";

      try {
        const response = await fetch(
          `http://localhost:8080/api/guestbook/${comment.id}/reply`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              name: authorName,
              // Keep GIF-only replies supported by putting the URL in message.
              message: [replyMessage, replyGifUrl].filter(Boolean).join("\n"),
            }),
          },
        );
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error || "Reply was rejected.");
        if (body?.id && body?.owner_token)
          rememberOwnerToken(body.id, body.owner_token);
      } catch (error) {
        console.error("Guestbook reply error:", error);
        replyStatus.textContent =
          error.message || "Could not post your reply. Please try again.";
        replyStatus.className = "guestbook-reply-status is-error";
        submit.disabled = false;
        submit.textContent = "Post reply";
        return;
      }

      localStorage.setItem(REPLY_STORAGE_KEY, String(Date.now()));
      await loadGuestbook();
    });

    return form;
  }

  function createCommentElement(comment) {
    const article = document.createElement("article");
    article.className = "guestbook-comment";

    const meta = document.createElement("div");
    meta.className = "guestbook-comment-meta";

    const author = document.createElement("strong");
    author.className = "guestbook-comment-name";
    author.textContent = comment.author_name;

    const time = document.createElement("time");
    time.className = "guestbook-comment-time";
    time.dateTime = comment.created_at;
    time.title = new Date(comment.created_at).toLocaleString();
    time.textContent = relativeTime(comment.created_at);

    const message = document.createElement("p");
    message.className = "guestbook-comment-message";
    renderTextWithLinks(message, comment.message);
    let gif = null;
    try {
      const gifUrl = new URL(comment.gif_url);
      if (gifUrl.protocol === "https:") {
        gif = document.createElement("img");
        gif.className = "guestbook-comment-gif";
        gif.src = gifUrl.href;
        gif.alt = "GIF attached to this comment";
        gif.loading = "lazy";
      }
    } catch (error) {}

    const actions = document.createElement("div");
    actions.className = "guestbook-comment-actions";

    const replyButton = document.createElement("button");
    replyButton.className = "guestbook-comment-action is-reply";
    replyButton.type = "button";
    replyButton.textContent = "Reply";
    replyButton.addEventListener("click", () => {
      const existingForm = article.querySelector(".guestbook-reply-form");
      if (existingForm) {
        existingForm.remove();
        replyButton.textContent = "Reply";
        return;
      }

      article.append(createReplyForm(comment));
      replyButton.textContent = "Close";
      article.querySelector(".guestbook-reply-form input")?.focus();
    });

    actions.append(replyButton);

    if (getOwnerToken(comment.id)) {
      const editButton = document.createElement("button");
      editButton.className = "guestbook-comment-action";
      editButton.type = "button";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => startEditing(comment));

      const deleteButton = document.createElement("button");
      deleteButton.className = "guestbook-comment-action is-delete";
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => deleteComment(comment));

      actions.append(editButton, deleteButton);
    }

    meta.append(author, time, actions);
    article.append(meta, message);

    if (gif) {
      article.append(gif);
    } else {
      appendKlipyLinkPreview(article, comment.message);
    }

    if (comment.replies?.length) {
      const replies = document.createElement("div");
      replies.className = "guestbook-replies";
      comment.replies.forEach((reply) =>
        replies.append(createReplyElement(reply)),
      );
      article.append(replies);
    }

    return article;
  }

  function renderState(message) {
    list.replaceChildren();
    const state = document.createElement("p");
    state.className = "guestbook-state";
    state.textContent = message;
    list.append(state);
  }

  const BLOCKED_URL_HOSTS = ["thepiratebay.org", "1337x.to"];

  const BLOCKED_URL_TERMS = [
    "dild",
    "vibrat",
    "sex-toy",
    "sextoy",
    "adult-toy",
    "porn",
    "xxx",
    "onlyfans",

    "torrent",
    "warez",
    "keygen",
    "crack",
  ];

  function isBlockedExternalUrl(url) {
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const comparable = `${host}${url.pathname}${url.search}`.toLowerCase();

    const blockedHost = BLOCKED_URL_HOSTS.some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );

    return (
      blockedHost || BLOCKED_URL_TERMS.some((term) => comparable.includes(term))
    );
  }

  function findBlockedUrl(text) {
    const urlPattern = /https?:\/\/[^\s<>"']+/gi;

    for (const match of String(text || "").matchAll(urlPattern)) {
      try {
        const url = new URL(match[0]);
        if (
          (url.protocol === "http:" || url.protocol === "https:") &&
          isBlockedExternalUrl(url)
        ) {
          return match[0];
        }
      } catch {}
    }

    return null;
  }

  function renderTextWithLinks(element, text) {
    const value = String(text || "");
    const urlPattern = /https?:\/\/[^\s<>"']+/gi;

    element.replaceChildren();

    let lastIndex = 0;
    for (const match of value.matchAll(urlPattern)) {
      const url = match[0];
      const index = match.index ?? 0;

      element.append(document.createTextNode(value.slice(lastIndex, index)));

      try {
        const parsed = new URL(url);

        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          throw new Error("Unsupported URL protocol");
        }

        const link = document.createElement("a");
        link.href = parsed.href;
        link.textContent = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "guestbook-link";

        element.append(link);
      } catch {
        element.append(document.createTextNode(url));
      }

      lastIndex = index + url.length;
    }

    element.append(document.createTextNode(value.slice(lastIndex)));
  }
  function getKlipySlug(text) {
    const match = String(text || "").match(
      /https?:\/\/(?:www\. )?klipy\.com\/gifs\/([^/?#\s]+)/i,
    );
    return match ? match[1] : null;
  }

  async function appendKlipyLinkPreview(container, text) {
    const slug = getKlipySlug(text);
    if (!slug || !KLIPY_API_KEY) return;

    try {
      const endpoint = new URL(
        `https://api.klipy.com/api/v1/${encodeURIComponent(KLIPY_API_KEY)}/gifs/items`,
      );
      endpoint.searchParams.set("slugs", slug);
      endpoint.searchParams.set("rating", KLIPY_RATING);

      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return;

      const payload = await response.json();
      const item = payload?.data?.data?.[0];
      const gifUrl =
        item?.file?.md?.gif?.url ||
        item?.file?.sm?.gif?.url ||
        item?.file?.xs?.gif?.url;

      if (!gifUrl) return;

      const gif = document.createElement("img");
      gif.className = "guestbook-comment-gif";
      gif.src = gifUrl;
      gif.alt = item.title || "GIF from Klipy";
      gif.loading = "lazy";
      container.append(gif);
    } catch (error) {
      console.warn("Could not load Klipy link preview.", error);
    }
  }

  function getFirstHttpUrl(text) {
    const match = String(text || "").match(/https?:\/\/[^\s<>"']+/i);
    return match ? match[0] : null;
  }

  function appendDirectGif(container, src, alt) {
    const gif = document.createElement("img");
    gif.className = "guestbook-comment-gif";
    gif.src = src;
    gif.alt = alt;
    gif.loading = "lazy";
    container.append(gif);
  }

  function appendGifIframe(container, src, title) {
    const frame = document.createElement("iframe");
    frame.className = "guestbook-gif-embed";
    frame.src = src;
    frame.title = title;
    frame.loading = "lazy";
    frame.referrerPolicy = "no-referrer";
    frame.setAttribute("allowfullscreen", "");
    container.append(frame);
  }

  function appendTrustedGifPreview(container, text) {
    const rawUrl = getFirstHttpUrl(text);
    if (!rawUrl) return;

    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      return;
    }

    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname;

    if (host === "klipy.com" && path.startsWith("/gifs/")) {
      appendKlipyLinkPreview(container, rawUrl);
      return;
    }

    if (host === "tenor.com" && path.startsWith("/view/")) {
      const id = path.match(/-(\d+)\/?$/)?.[1];
      if (id) {
        appendGifIframe(
          container,
          `https://tenor.com/embed/${id}`,
          "GIF from Tenor",
        );
      }
      return;
    }

    if (host === "giphy.com" && path.startsWith("/gifs/")) {
      const lastSegment = path.split("/").filter(Boolean).pop();
      const id = lastSegment?.split("-").pop();
      if (id && /^[A-Za-z0-9]+$/.test(id)) {
        appendGifIframe(
          container,
          `https://giphy.com/embed/${id}`,
          "GIF from Giphy",
        );
      }
      return;
    }

    const trustedMediaHosts = new Set([
      "media1.tenor.com",
      "media.tenor.com",
      "media.giphy.com",
      "i.giphy.com",
      "static.klipy.com",
    ]);

    const isDirectGif = /\.(gif|webp)$/i.test(path);
    if (trustedMediaHosts.has(host) && isDirectGif) {
      appendDirectGif(container, url.href, "GIF attachment");
    }
  }

  function renderComments(comments) {
    list.replaceChildren();

    if (!comments.length) {
      renderState("No comments yet. Be the first to leave one.");
      return;
    }

    const fragment = document.createDocumentFragment();
    comments.forEach((comment) =>
      fragment.append(createCommentElement(comment)),
    );
    list.append(fragment);
  }

  async function loadGuestbook() {
    renderState("Loading comments...");
    count.textContent = "Loading...";

    try {
      const response = await fetch("http://localhost:8080/api/guestbook", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.error || `Guestbook API returned ${response.status}`,
        );
      }

      const comments = (Array.isArray(body) ? body : []).map((comment) => ({
        ...comment,
        // Keep the existing UI field names while Go returns name.
        author_name: comment.author_name ?? comment.name ?? "Anonymous",
        replies: (comment.replies || []).map((reply) => ({
          ...reply,
          author_name: reply.author_name ?? "Anonymous",
        })),
      }));
      renderComments(comments);
      count.textContent = `${comments.length} comment${comments.length === 1 ? "" : "s"}`;
    } catch (error) {
      console.error("Guestbook load error:", error);
      renderState("Comments are unavailable right now.");
      count.textContent = "Offline";
    }
  }

  async function deleteComment(comment) {
    const ownerToken = getOwnerToken(comment.id);
    if (!ownerToken) return;

    const confirmed = window.confirm("Delete this comment permanently?");
    if (!confirmed) return;

    const response = await fetch(
      `http://localhost:8080/api/guestbook/${comment.id}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "X-Owner-Token": ownerToken,
        },
      },
    );
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("Guestbook delete error:", body);
      setStatus(
        body?.error || "Could not delete this comment. Please try again.",
        "error",
      );
      return;
    }

    forgetOwnerToken(comment.id);
    if (editingComment && editingComment.id === comment.id)
      resetGuestbookForm();
    setStatus("Comment deleted.", "success");
    await loadGuestbook();
  }

  messageInput.addEventListener("input", updateCharacterCount);
  cancelButton.addEventListener("click", () => {
    resetGuestbookForm();
    setStatus("Edit cancelled.", "");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (websiteInput.value.trim()) return;

    const enteredName = nameInput.value.replace(/\s+/g, " ").trim();
    const name = enteredName || "Anonymous";
    const message = messageInput.value.trim();
    const gifUrl = selectedCommentGif?.url || null;
    const blockedWord = findBlockedWord(message);
    const isEditing = Boolean(editingComment);

    if (enteredName && (enteredName.length < 2 || enteredName.length > 32)) {
      setStatus(
        "Use a nickname between 2 and 32 characters, or leave it blank.",
        "error",
      );
      nameInput.focus();
      return;
    }

    if ((!message && !gifUrl) || message.length > 500) {
      setStatus(
        "Add a message or GIF. Messages can be up to 500 characters.",
        "error",
      );
      messageInput.focus();
      return;
    }

    if (blockedWord) {
      setStatus("Please remove prohibited language before posting.", "error");
      messageInput.focus();
      return;
    }

    if (!isEditing) {
      const lastSubmission = Number(localStorage.getItem(STORAGE_KEY) || 0);
      const remaining = SUBMISSION_COOLDOWN_MS - (Date.now() - lastSubmission);

      if (remaining > 0) {
        setStatus(
          `Please wait ${Math.ceil(remaining / 1000)} seconds before posting again.`,
          "error",
        );
        return;
      }
    }

    submitButton.disabled = true;
    submitButton.querySelector("span").textContent = isEditing
      ? "Saving..."
      : "Sending...";
    setStatus("", "");

    try {
      if (isEditing) {
        const ownerToken = getOwnerToken(editingComment.id);
        if (!ownerToken) throw new Error("Missing comment ownership token.");

        const response = await fetch(
          `http://localhost:8080/api/guestbook/${editingComment.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              "X-Owner-Token": ownerToken,
            },
            body: JSON.stringify({ name, message }),
          },
        );
        const body = await response.json().catch(() => null);
        if (!response.ok)
          throw new Error(body?.error || "Comment update was rejected.");

        resetGuestbookForm();
        setStatus("Comment updated and is waiting for approval.", "success");
      } else {
        const response = await fetch("http://localhost:8080/api/guestbook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name,
            // The current Go input accepts message only. Keep GIF-only posts usable
            // by storing the selected GIF URL in the message for preview rendering.
            message: [message, gifUrl].filter(Boolean).join("\n"),
          }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok)
          throw new Error(body?.error || "Comment insert failed.");

        if (body?.id && body?.owner_token)
          rememberOwnerToken(body.id, body.owner_token);
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
        resetGuestbookForm();
        setStatus("Comment sent. Thank you!", "success");
      }

      await loadGuestbook();
    } catch (error) {
      console.error("Guestbook save error:", error);
      setStatus(
        isEditing
          ? "Could not update this comment. Please try again."
          : "Could not send your comment. Please try again.",
        "error",
      );
    } finally {
      submitButton.disabled = false;
      setEditingState(editingComment);
    }
  });

  updateCharacterCount();
  loadGuestbook();
})();

const blockedWords = [
  "fuck",
  "fucks",
  "fucked",
  "fucker",
  "fuckers",
  "fucking",
  "fuckface",
  "fuckhead",

  "shit",
  "shits",
  "shitty",
  "bullshit",
  "shithead",
  "shitface",

  "bitch",
  "bitches",
  "bitchy",
  "bitching",

  "ass",
  "asses",
  "asshole",
  "assholes",
  "dumbass",
  "smartass",
  "jackass",
  "badass",
  "asshat",

  "dick",
  "dicks",
  "dickhead",
  "dickheads",

  "cunt",
  "cunts",

  "bastard",
  "bastards",

  "damn",
  "damned",
  "goddamn",
  "goddammit",

  "crap",
  "crappy",

  "piss",
  "pissed",
  "pissing",

  "prick",
  "pricks",

  "douche",
  "douchebag",
  "douchebags",

  "motherfucker",
  "motherfuckers",
  "motherfucking",

  "bullcrap",

  "slut",
  "sluts",
  "slutty",

  "whore",
  "whores",

  "jerkoff",
  "jerkoff",

  "twat",
  "twats",

  "wanker",
  "wankers",

  "dumbfuck",
  "dumbfucks",
  "dumbfucking",

  "fuckwit",
  "fuckwits",

  "dipshit",
  "dipshits",

  "shitbag",
  "shitbags",

  "scumbag",
  "scumbags",

  "merde",
  "putain",
  "pute",
  "putes",
  "connard",
  "connards",
  "connasse",
  "connasses",
  "con",
  "cons",
  "conne",
  "connes",
  "salaud",
  "salauds",
  "salope",
  "salopes",
  "enculé",
  "enculés",
  "enculée",
  "enculées",
  "encule",
  "encules",
  "enculer",
  "nique",
  "niquer",
  "niqué",
  "niquée",
  "niqués",
  "niquées",
  "nique ta mère",
  "bordel",
  "bordels",
  "foutre",
  "foutu",
  "foutue",
  "foutus",
  "foutues",
  "foutoir",
  "cul",
  "culs",
  "couille",
  "couilles",
  "bite",
  "bites",
  "chatte",
  "chattes",
  "zob",
  "zobs",
  "queue",
  "queues",
  "branleur",
  "branleurs",
  "branleuse",
  "branleuses",
  "branler",
  "branlé",
  "ta gueule",
  "gueule",
  "gueules",
  "crétin",
  "crétins",
  "crétine",
  "crétines",
  "abruti",
  "abrutis",
  "abrutie",
  "abruties",
  "idiot",
  "idiots",
  "idiote",
  "idiotes",
  "imbécile",
  "imbéciles",
  "enfoiré",
  "enfoirés",
  "enfoirée",
  "enfoirées",
  "bâtard",
  "bâtards",
  "bâtarde",
  "bâtardes",
  "salopard",
  "salopards",
  "salopardes",
  "va te faire foutre",
  "va te faire",
  "ferme ta gueule",
  "merdique",
  "merdiques",

  "kut",
  "kutwijf",
  "klootzak",
  "klootzakken",
  "lul",
  "lullen",
  "lulhannes",
  "eikel",
  "eikels",
  "hoer",
  "hoeren",
  "hoerenjong",
  "slet",
  "sletje",
  "sukkeltje",
  "sukkel",
  "sukkels",
  "idioot",
  "idioten",
  "imbeciel",
  "imbecielen",
  "debiel",
  "debielen",
  "debiele",
  "mongool",
  "mongolen",
  "tering",
  "tyfus",
  "kanker",
  "godverdomme",
  "godver",
  "verdomme",
  "verdomd",
  "fuck",
  "fucking",
  "fucker",
  "shit",
  "shitty",
  "bitch",
  "bastard",
  "hoerenzoon",
  "klootviool",
  "pislul",
  "zak",
  "zakken",
  "schoft",
  "schoften",
  "rotzak",
  "rotzakken",
  "rotzooi",
  "rotwijf",
  "teringlijer",
  "tyfuslijer",
  "kutkop",
  "kuthoofd",
  "kutfuck",
  "kankerlijer",
  "kankerhoer",
  "kankerkop",
  "kankerwijf",
  "godverdomme",
  "neuk",
  "neuken",
  "geneukt",
  "neuker",
  "neukerd",
  "reet",
  "reetgat",
  "aars",
  "aarsgat",
  "klote",
  "kloten",

  "scheiße",
  "scheisse",
  "scheiß",
  "scheiss",
  "scheißkerl",
  "scheisskerl",
  "scheißkopf",
  "scheisskopf",
  "fick",
  "ficken",
  "gefickt",
  "ficker",
  "fickkopf",
  "verfickt",
  "verfickte",
  "verfickter",
  "hurensohn",
  "hurensöhne",
  "hure",
  "huren",
  "nutte",
  "nutten",
  "schlampe",
  "schlampen",
  "fotze",
  "fotzen",
  "arsch",
  "arschloch",
  "arschlöcher",
  "arschloch",
  "arschgesicht",
  "arschkopf",
  "arschgeige",
  "wichser",
  "wichserin",
  "wichsen",
  "wixer",
  "wixxer",
  "wixxer",
  "miststück",
  "drecksau",
  "drecksack",
  "dreckskerl",
  "dreckstück",
  "schwein",
  "sau",
  "blödmann",
  "blödmann",
  "blöde",
  "blöder",
  "idiot",
  "idioten",
  "idiotin",
  "trottel",
  "trotteln",
  "depp",
  "deppen",
  "vollidiot",
  "vollidioten",
  "spasti",
  "spast",
  "behindert",
  "behinderten",
  "verpiss",
  "verpissen",
  "verpisst",
  "pisse",
  "pissen",
  "pisser",
  "kacke",
  "kacken",
  "kack",
  "kackkopf",
  "kackarsch",
  "mist",
  "verdammt",
  "verdammte",
  "verflucht",
  "gottverdammt",
  "halsabschneider",
  "bastard",
  "bastarde",
  "fotzenlecker",
  "schwanz",
  "schwanzlutscher",
  "schwanzkopf",
  "lümmel",
  "dreck",
  "drecks",
  "leck mich",
  "leckarsch",
  "halt die fresse",
  "fresse",
  "maul",
  "halt's maul",
];

function normalizeForModeration(text) {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase();
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findBlockedWord(text) {
  const normalizedText = normalizeForModeration(text);

  return blockedWords.find((word) => {
    const letters = Array.from(normalizeForModeration(word)).filter((char) =>
      /[\p{L}\p{N}]/u.test(char),
    );

    const flexibleWord = letters.map(escapeRegExp).join("[^\\p{L}\\p{N}]*");

    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${flexibleWord}(?![\\p{L}\\p{N}])`,
      "iu",
    );

    return pattern.test(normalizedText);
  });
}
