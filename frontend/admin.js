const API_BASE = window.PORTFOLIO_API_BASE || "http://localhost:8080";

const byId = (id) => document.getElementById(id);
const authView = byId("auth-view");
const dashboard = byId("dashboard");
const loginStatus = byId("login-status");
const dashboardStatus = byId("dashboard-status");

const portfolioStatus = byId("portfolio-status");
const portfolioItemsList = byId("portfolio-items-list");
const newPortfolioItemBtn = byId("new-portfolio-item");
const portfolioForm = byId("portfolio-form");
const portfolioFormTitle = byId("portfolio-form-title");
const portfolioTitleInput = byId("portfolio-title");
const portfolioDescriptionInput = byId("portfolio-description");
const portfolioProjectUrlInput = byId("portfolio-project-url");
const portfolioImageUrlInput = byId("portfolio-image-url");
const portfolioTechnologiesInput = byId("portfolio-technologies");
const portfolioCategoryInput = byId("portfolio-category");
const portfolioSortOrderInput = byId("portfolio-sort-order");
const portfolioIsPublishedInput = byId("portfolio-is-published");
const portfolioSubmitBtn = byId("portfolio-submit");
const portfolioCancelBtn = byId("portfolio-cancel");
const portfolioImageFile = byId("portfolio-image-file");
const portfolioImageURL = byId("portfolio-image-url");
const portfolioUploadStatus = byId("portfolio-upload-status");

const commentsAdminStatus = byId("comments-admin-status");
const commentsAdminList = byId("comments-admin-list");
const commentsCount = byId("comments-count");
const commentsFilter = byId("comments-filter");

const repliesAdminStatus = byId("replies-admin-status");
const repliesAdminList = byId("replies-admin-list");
const repliesCount = byId("replies-count");
const repliesFilter = byId("replies-filter");

let editingId = null;
let portfolioItemsCache = [];
let cloudinaryPublicID = "";
let cloudinaryResourceType = "image";

async function api(path, options = {}) {
  const hasBody = options.body !== undefined && options.body !== null;
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

function showSignedOut(message = "") {
  authView.hidden = false;
  dashboard.hidden = true;
  loginStatus.textContent = message;
}

function showSignedIn(admin) {
  authView.hidden = true;
  dashboard.hidden = false;
  dashboardStatus.textContent = `Signed in as ${admin.email} (${admin.role}).`;
  loadAdminPortfolio();
  loadAdminComments();
}

async function restoreSession() {
  const { response, body } = await api("/api/auth/me", {
    headers: { Accept: "application/json" },
  });
  if (response.ok) showSignedIn(body.admin);
  else showSignedOut();
}

byId("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.textContent = "Signing in…";
  const { response, body } = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: byId("login-email").value,
      password: byId("login-password").value,
    }),
  });
  byId("login-password").value = "";
  if (!response.ok) {
    loginStatus.textContent = body.error || "Unable to sign in.";
    return;
  }
  showSignedIn(body.admin);
});

byId("sign-out").addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST" });
  showSignedOut("Signed out.");
});

async function uploadPortfolioImage(file) {
  if (!file) {
    return null;
  }

  const allowedTypes = [
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/jpeg",
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("only JPG, PNG, GIF, WEBP, and JPEG images are allowed");
  }

  const maxSize = 10 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error("Image size must be 10MB or less");
  }

  const formData = new FormData();
  formData.append("image", file);

  portfolioUploadStatus.textContent = "Uploading Image...";

  const response = await fetch(`${API_BASE}/api/admin/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const body = await response.json().catch(() => ({}));

  if (response.status === 401) {
    showSignedOut("Session expired, Please sign in again");
    throw new Error("Authentication required");
  }

  if (!response.ok) {
    throw new Error(body.error || "Image upload failed");
  }

  if (!body.image_url) {
    throw new Error("Upload succeeded but no image URL was returned");
  }

  portfolioUploadStatus.textContent = "Image uploaded successfully";

  return body;
}

function resetPortfolioForm() {
  portfolioForm.reset();
  portfolioTitleInput.value = "";
  portfolioDescriptionInput.value = "";
  portfolioProjectUrlInput.value = "";
  portfolioImageUrlInput.value = "";
  portfolioTechnologiesInput.value = "";
  portfolioCategoryInput.value = "work";
  portfolioSortOrderInput.value = "";
  portfolioIsPublishedInput.checked = true;
}

function fillPortfolioForm(item) {
  portfolioTitleInput.value = item.title || "";
  portfolioDescriptionInput.value = item.description || "";
  portfolioProjectUrlInput.value = item.project_url || "";
  portfolioImageUrlInput.value = item.image_url || "";
  portfolioTechnologiesInput.value = Array.isArray(item.technologies)
    ? item.technologies.join(", ")
    : "";
  portfolioCategoryInput.value = item.category || "work";
  portfolioSortOrderInput.value =
    item.sort_order !== undefined && item.sort_order !== null
      ? item.sort_order
      : "";
  portfolioIsPublishedInput.checked = !!item.is_published;
}

function showPortfolioForm() {
  portfolioForm.hidden = false;
}

function hidePortfolioForm() {
  portfolioForm.hidden = true;
}

function openAddForm() {
  editingId = null;
  resetPortfolioForm();
  portfolioFormTitle.textContent = "Add portfolio item";
  portfolioSubmitBtn.textContent = "Create item";
  showPortfolioForm();
}

function openEditForm(item) {
  editingId = item.id;

  byId("portfolio-form-title").textContent = "Edit portfolio item";
  byId("portfolio-submit").textContent = "Update item";

  byId("portfolio-title").value = item.title || "";
  byId("portfolio-description").value = item.description || "";
  byId("portfolio-project-url").value = item.project_url || "";
  byId("portfolio-image-url").value = item.image_url || "";
  portfolioImageFile.value = "";
  cloudinaryPublicID = item.cloudinary_public_id || "";
  cloudinaryResourceType = item.cloudinary_resource_type || "image";
  byId("portfolio-technologies").value = Array.isArray(item.technologies)
    ? item.technologies.join(", ")
    : "";
  byId("portfolio-category").value = item.category || "work";
  byId("portfolio-sort-order").value = item.sort_order ?? 0;
  byId("portfolio-is-published").checked = Boolean(item.is_published);

  portfolioUploadStatus.textContent = "";
  portfolioForm.hidden = false;
}

newPortfolioItemBtn.addEventListener("click", openAddForm);

portfolioCancelBtn.addEventListener("click", () => {
  editingId = null;
  resetPortfolioForm();
  hidePortfolioForm();
});

async function loadAdminPortfolio() {
  portfolioStatus.textContent = "Loading…";
  const { response, body } = await api("/api/admin/portfolio");

  if (response.status === 401) {
    showSignedOut("Session expired. Please sign in again.");
    return;
  }

  if (!response.ok) {
    portfolioStatus.textContent =
      body.error || "Unable to load portfolio items.";
    return;
  }

  const items = Array.isArray(body.items)
    ? body.items
    : Array.isArray(body)
      ? body
      : [];
  portfolioItemsCache = items;
  portfolioStatus.textContent = "";
  renderAdminPortfolio(items);
}

function renderAdminPortfolio(items) {
  portfolioItemsList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.textContent = "No portfolio items yet.";
    portfolioItemsList.appendChild(empty);
    return;
  }

  for (const item of items) {
    const card = document.createElement("div");
    card.className = "portfolio-item-card";

    const title = document.createElement("h3");
    title.textContent = item.title || "(untitled)";
    card.appendChild(title);

    const meta = document.createElement("p");
    meta.className = "portfolio-item-meta";
    meta.textContent = `${item.category || ""} • sort ${item.sort_order ?? ""} • ${
      item.is_published ? "Published" : "Hidden"
    }`;
    card.appendChild(meta);

    if (item.description) {
      const description = document.createElement("p");
      description.textContent = item.description;
      card.appendChild(description);
    }

    if (item.project_url) {
      const link = document.createElement("a");
      link.href = item.project_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = item.project_url;
      card.appendChild(link);
    }

    if (item.image_url) {
      const img = document.createElement("img");
      const imageURL = String(item.image_url).trim();

      img.src = imageURL;
      img.alt = item.title || "";
      img.loading = "lazy";
      img.className = "portfolio-admin-image";

      img.onload = () => {
        console.log("Portfolio image loaded:", imageURL);
      };

      img.onerror = () => {
        console.error("Portfolio image failed:", imageURL);
        img.title = "Image failed to load";
      };

      card.appendChild(img);
    }

    if (Array.isArray(item.technologies) && item.technologies.length) {
      const tech = document.createElement("p");
      tech.className = "portfolio-item-technologies";
      tech.textContent = item.technologies.join(", ");
      card.appendChild(tech);
    }

    const actions = document.createElement("div");
    actions.className = "portfolio-item-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openEditForm(item));
    actions.appendChild(editBtn);

    const publishBtn = document.createElement("button");
    publishBtn.type = "button";
    publishBtn.textContent = item.is_published ? "Hide" : "Publish";
    publishBtn.addEventListener("click", () => handlePublishToggle(item));
    actions.appendChild(publishBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => handleDelete(item.id));
    actions.appendChild(deleteBtn);

    card.appendChild(actions);
    portfolioItemsList.appendChild(card);
  }
}

portfolioForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = byId("portfolio-submit");
  submitButton.disabled = true;
  portfolioStatus.textContent = "";

  try {
    let imageURL = portfolioImageURL.value.trim();
    const selectedFile = portfolioImageFile.files[0];

    if (selectedFile) {
      const uploadedImage = await uploadPortfolioImage(selectedFile);
      imageURL = uploadedImage.image_url;
      cloudinaryPublicID = uploadedImage.public_id;
      cloudinaryResourceType = uploadedImage.resource_type || "image";
    }

    const technologies = byId("portfolio-technologies")
      .value.split(",")
      .map((technology) => technology.trim())
      .filter(Boolean);

    const payload = {
      title: byId("portfolio-title").value.trim(),
      description: byId("portfolio-description").value.trim(),
      project_url: byId("portfolio-project-url").value.trim(),
      image_url: imageURL,
      cloudinary_public_id: cloudinaryPublicID,
      cloudinary_resource_type: cloudinaryResourceType,
      technologies,
      category: byId("portfolio-category").value,
      sort_order: Number(byId("portfolio-sort-order").value),
      is_published: byId("portfolio-is-published").checked,
    };

    const isEditing = Boolean(editingId);
    const endpoint = isEditing
      ? `${API_BASE}/api/admin/portfolio/${isEditing}`
      : `${API_BASE}/api/admin/portfolio`;

    const method = isEditing ? "PUT" : "POST";

    const { response, body } = await api(endpoint.replace(API_BASE, ""), {
      method,
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      showSignedOut("Session expired. Please sign in again.");
      return;
    }
    if (!response.ok) {
      throw new Error(body.error || "Failed to save portfolio item.");
    }

    portfolioStatus.textContent = isEditing
      ? "Portfolio item updated."
      : "Portfolio item created.";

    portfolioForm.reset();
    portfolioImageFile.value = "";
    portfolioImageURL.value = "";
    editingId = null;

    byId("portfolio-form-title").textContent = "Add portfolio item";
    submitButton.textContent = "Create item";
    portfolioForm.hidden = true;

    await loadAdminPortfolio();
  } catch (error) {
    console.error("Save portfolio item error:", error);
    portfolioStatus.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

async function handlePublishToggle(item) {
  portfolioStatus.textContent = "Updating…";
  const { response, body } = await api(
    `/api/admin/portfolio/${item.id}/publish`,
    {
      method: "PATCH",
      body: JSON.stringify({ is_published: !item.is_published }),
    },
  );

  if (response.status === 401) {
    showSignedOut("Session expired. Please sign in again.");
    return;
  }

  if (!response.ok) {
    portfolioStatus.textContent =
      body.error || "Unable to update publish state.";
    return;
  }

  portfolioStatus.textContent = "";
  loadAdminPortfolio();
}

async function handleDelete(id) {
  if (!window.confirm("Delete this portfolio item? This cannot be undone."))
    return;

  portfolioStatus.textContent = "Deleting…";
  const { response, body } = await api(`/api/admin/portfolio/${id}`, {
    method: "DELETE",
  });

  if (response.status === 401) {
    showSignedOut("Session expired. Please sign in again.");
    return;
  }

  if (!response.ok) {
    portfolioStatus.textContent = body.error || "Unable to delete item.";
    return;
  }

  portfolioStatus.textContent = "Item deleted.";
  loadAdminPortfolio();
}


let adminCommentsCache = [];

function getItemId(item) {
  return item?.id ?? item?.ID ?? item?._id ?? item?.uuid ?? null;
}

function truncate(text, max) {
  const value = String(text || "");
  return value.length > max ? `${value.slice(0, max).trim()}…` : value;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

async function loadAdminComments() {
  commentsAdminStatus.textContent = "Loading…";
  repliesAdminStatus.textContent = "Loading…";

  const { response, body } = await api("/api/admin/guestbook");

  if (response.status === 401) {
    showSignedOut("Session expired. Please sign in again.");
    return;
  }

  if (!response.ok) {
    const message = body.error || "Unable to load comments.";
    commentsAdminStatus.textContent = message;
    repliesAdminStatus.textContent = message;
    return;
  }

  const rawItems = Array.isArray(body.items)
    ? body.items
    : Array.isArray(body)
      ? body
      : [];

  const items = rawItems.map((comment) => ({
    ...comment,
    is_published: comment.is_published ?? comment.is_approved ?? false,

    replies: Array.isArray(comment.replies)
      ? comment.replies.map((reply) => ({
          ...reply,
          is_published: Boolean(reply.is_published),
        }))
      : [],
  }));

  adminCommentsCache = items;

  commentsAdminStatus.textContent = "";
  repliesAdminStatus.textContent = "";

  renderAdminComments();
  renderAdminReplies();
}

function matchesFilter(item, filterValue) {
  if (filterValue === "published") return Boolean(item.is_published);
  if (filterValue === "hidden") return !item.is_published;
  return true;
}

function renderAdminCard({ item, kind, parent }) {
  const card = document.createElement("div");
  card.className = "comment-admin";
  if (!item.is_published) card.classList.add("is-hidden");

  const meta = document.createElement("div");
  meta.className = "comment-admin-meta";

  const who = document.createElement("div");

  const author = document.createElement("span");
  author.className = "comment-admin-author";
  author.textContent = item.name || "Anonymous";
  who.appendChild(author);

  const state = document.createElement("span");
  state.className = "comment-admin-state";
  state.textContent = item.is_published ? "Published" : "Hidden";
  who.appendChild(state);

  meta.appendChild(who);

  const date = document.createElement("span");
  date.className = "comment-admin-date";
  date.textContent = formatDate(item.created_at);
  meta.appendChild(date);

  card.appendChild(meta);

  if (kind === "reply" && parent) {
    const parentBlock = document.createElement("p");
    parentBlock.className = "comment-admin-parent";

    const parentLabel = document.createElement("strong");
    parentLabel.textContent = `Replying to ${parent.name || "Anonymous"}: `;
    parentBlock.appendChild(parentLabel);
    parentBlock.appendChild(
      document.createTextNode(truncate(parent.message, 140)),
    );

    card.appendChild(parentBlock);
  }

  const message = document.createElement("p");
  message.className = "comment-admin-message";
  message.textContent = item.message || "";
  card.appendChild(message);

  const actions = document.createElement("div");
  actions.className = "comment-admin-actions";

  const publishButton = document.createElement("button");
  publishButton.type = "button";
  publishButton.textContent = item.is_published ? "Hide" : "Publish";
  publishButton.addEventListener("click", () =>
    kind === "reply"
      ? handleReplyPublishToggle(parent, item)
      : handleCommentPublishToggle(item),
  );
  actions.appendChild(publishButton);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "danger";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () =>
    kind === "reply"
      ? handleReplyDelete(parent, item)
      : handleCommentDelete(item),
  );
  actions.appendChild(deleteButton);

  card.appendChild(actions);

  return card;
}

function renderAdminComments() {
  const filterValue = commentsFilter ? commentsFilter.value : "all";
  const items = adminCommentsCache.filter((item) =>
    matchesFilter(item, filterValue),
  );

  commentsAdminList.innerHTML = "";
  commentsCount.textContent = `${items.length} comment${
    items.length === 1 ? "" : "s"
  }`;

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No comments match this filter.";
    commentsAdminList.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const item of items) {
    fragment.appendChild(renderAdminCard({ item, kind: "comment" }));
  }
  commentsAdminList.appendChild(fragment);
}

function renderAdminReplies() {
  const filterValue = repliesFilter ? repliesFilter.value : "all";

  const flatReplies = [];
  for (const comment of adminCommentsCache) {
    const replies = Array.isArray(comment.replies) ? comment.replies : [];
    for (const reply of replies) {
      if (matchesFilter(reply, filterValue)) {
        flatReplies.push({ reply, parent: comment });
      }
    }
  }

  repliesAdminList.innerHTML = "";
  repliesCount.textContent = `${flatReplies.length} repl${
    flatReplies.length === 1 ? "y" : "ies"
  }`;

  if (!flatReplies.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No replies match this filter.";
    repliesAdminList.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const { reply, parent } of flatReplies) {
    fragment.appendChild(
      renderAdminCard({ item: reply, kind: "reply", parent }),
    );
  }
  repliesAdminList.appendChild(fragment);
}

if (commentsFilter) {
  commentsFilter.addEventListener("change", renderAdminComments);
}

if (repliesFilter) {
  repliesFilter.addEventListener("change", renderAdminReplies);
}

async function handleCommentPublishToggle(item) {
  commentsAdminStatus.textContent = "Updating…";

  const { response, body } = await api(
    `/api/admin/guestbook/${item.id}/publish`,
    {
      method: "PATCH",
      body: JSON.stringify({ is_published: !item.is_published }),
    },
  );

  if (response.status === 401) {
    showSignedOut("Session expired. Please sign in again.");
    return;
  }

  if (!response.ok) {
    commentsAdminStatus.textContent =
      body.error || "Unable to update that comment.";
    return;
  }

  commentsAdminStatus.textContent = "";
  loadAdminComments();
}

async function handleCommentDelete(item) {
  if (!window.confirm("Delete this comment and all of its replies?")) return;

  commentsAdminStatus.textContent = "Deleting…";

  const { response, body } = await api(`/api/admin/guestbook/${item.id}`, {
    method: "DELETE",
  });

  if (response.status === 401) {
    showSignedOut("Session expired. Please sign in again.");
    return;
  }

  if (!response.ok) {
    commentsAdminStatus.textContent = body.error || "Unable to delete comment.";
    return;
  }

  commentsAdminStatus.textContent = "Comment deleted.";
  loadAdminComments();
}

async function handleReplyPublishToggle(parent, reply) {
  repliesAdminStatus.textContent = "Updating…";

  const { response, body } = await api(
    `/api/admin/guestbook/${getItemId(reply)}/publish`,
    {
      method: "PATCH",
      body: JSON.stringify({ is_published: !reply.is_published }),
    },
  );

  if (response.status === 401) {
    showSignedOut("Session expired. Please sign in again.");
    return;
  }

  if (!response.ok) {
    repliesAdminStatus.textContent =
      body.error || "Unable to update that reply.";
    return;
  }

  repliesAdminStatus.textContent = "";
  loadAdminComments();
}

async function handleReplyDelete(parent, reply) {
  if (!window.confirm("Delete this reply?")) return;

  repliesAdminStatus.textContent = "Deleting…";

  const { response, body } = await api(
    `/api/admin/guestbook/${getItemId(parent)}/reply/${getItemId(reply)}`,
    { method: "DELETE" },
  );

  if (response.status === 401) {
    showSignedOut("Session expired. Please sign in again.");
    return;
  }

  if (!response.ok) {
    repliesAdminStatus.textContent = body.error || "Unable to delete reply.";
    return;
  }

  repliesAdminStatus.textContent = "Reply deleted.";
  loadAdminComments();
}

restoreSession().catch(() => showSignedOut("Unable to reach the server."));
