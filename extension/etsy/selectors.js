// Isolated Etsy DOM selector strategies for the Shop Manager listing
// editor — the ONLY module allowed to reference Etsy markup. Etsy's DOM
// is external and can change without notice, so every selector here is a
// best-effort heuristic (name/aria-label/id substring matching, not
// hardcoded class names), and every extractor fails safe: it returns
// null/empty rather than throwing, and a failure on one field must never
// prevent extraction of the others.
//
// NOT VERIFIED against Etsy's live DOM — no authenticated Shop Manager
// session was available while building this bridge (see Phase P2 report,
// "known Etsy DOM limitations"). These heuristics must be validated/tuned
// against the real page before any later phase treats their output as
// reliable.
//
// LIMITATION (documented, not solved here): Etsy's editor never exposes
// the underlying numeric taxonomy ID in visible markup, only the
// human-readable category name. Mapping a category name back to a
// taxonomyId would require the Etsy Buyer Taxonomy tree (already fetched
// server-side in Phase E) — out of scope for a content-script DOM read.
// extractCategoryName() is therefore a low-confidence, display-only
// proxy; taxonomyId itself is always reported unavailable.

function safeQuery(root, selector) {
  try {
    return root.querySelector(selector);
  } catch {
    return null;
  }
}

function safeQueryAll(root, selector) {
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch {
    return [];
  }
}

function textOf(el) {
  if (!el) return null;
  try {
    const raw = "value" in el ? el.value : el.textContent;
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

// A single input/textarea whose name, aria-label, or id loosely matches
// one of the given keywords (case-insensitive substring match) — chosen
// over hardcoded class/data-test-id names because semantic attributes
// like these are far less likely to churn across Etsy's CSS refactors.
function findFieldByKeywords(root, keywords) {
  const candidates = safeQueryAll(root, "input, textarea");
  for (const el of candidates) {
    const haystack = `${el.getAttribute("name") || ""} ${el.getAttribute("aria-label") || ""} ${el.id || ""}`.toLowerCase();
    if (keywords.some((kw) => haystack.includes(kw))) {
      return el;
    }
  }
  return null;
}

export const EtsyEditorSelectors = {
  /** Presence of a title-like field is what flips editorState from
   * LOADING to READY — the one anchor every listing editor render must
   * include, so it's the cheapest reliable "is the editor mounted" check. */
  isEditorMounted(root = document) {
    return Boolean(findFieldByKeywords(root, ["title"]));
  },

  extractTitle(root = document) {
    return textOf(findFieldByKeywords(root, ["title"]));
  },

  extractDescription(root = document) {
    return textOf(findFieldByKeywords(root, ["description"]));
  },

  extractTags(root = document) {
    // Etsy's tag input is typically rendered as a chip/pill list inside a
    // labelled container; fall back to a single delimited text input if
    // no chip container is found.
    const chipContainer = safeQuery(root, '[aria-label*="tag" i]');
    if (chipContainer) {
      const chips = safeQueryAll(chipContainer, '[data-tag], .tag, li, [role="listitem"]')
        .map((el) => textOf(el))
        .filter((v) => Boolean(v));
      if (chips.length > 0) return chips;
    }

    const raw = textOf(findFieldByKeywords(root, ["tag"]));
    if (!raw) return [];
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  },

  // Best-effort category *name* only — see module-level comment.
  extractCategoryName(root = document) {
    return textOf(safeQuery(root, '[aria-label*="category" i]'));
  },

  // --------------------------------------------------------------------
  // Phase P4 — write path. Used ONLY in direct response to an explicit
  // user "Apply" click relayed from the side panel (see etsy-content-
  // script.js's APPLY_SUGGESTION handler); never called automatically,
  // and never touches a Save/Publish control.
  // --------------------------------------------------------------------

  /** Sets a value via the framework-aware native setter so React-
   * controlled inputs (Etsy's editor is presumed React-based) actually
   * observe the change — a plain `el.value = x` is silently ignored by
   * React's own controlled-input state in most such apps. */
  _setNativeValue(el, value) {
    const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  },

  setTitleValue(value, root = document) {
    const el = findFieldByKeywords(root, ["title"]);
    if (!el) return { applied: false, reason: "TITLE_FIELD_NOT_FOUND" };
    try {
      this._setNativeValue(el, value);
      return { applied: true };
    } catch {
      return { applied: false, reason: "APPLY_FAILED" };
    }
  },

  /** Only supports a plain delimited tag `<input>` — Etsy's tag widget
   * may instead be chip-based, which this cannot safely drive (see
   * extractTags' fallback comment); in that case this reports
   * TAG_FIELD_NOT_FOUND_OR_UNSUPPORTED rather than guessing at chip
   * interaction. */
  setTagsValue(tagsArray, root = document) {
    const el = findFieldByKeywords(root, ["tag"]);
    if (!el) return { applied: false, reason: "TAG_FIELD_NOT_FOUND_OR_UNSUPPORTED" };
    try {
      this._setNativeValue(el, tagsArray.join(", "));
      return { applied: true };
    } catch {
      return { applied: false, reason: "APPLY_FAILED" };
    }
  },
};
