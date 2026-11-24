localStorage.removeItem("bibleGroupDrafts");
localStorage.removeItem("bibleGroupMessages");
localStorage.removeItem("bibleCallDrafts");
localStorage.removeItem("bibleCallJoinRequests");

const state = {
  books: [],
  bookIndex: 0,
  chapterIndex: 0,
  testament: "old",
  selectedVerseIndex: 0,
  highlights: new Set(JSON.parse(localStorage.getItem("bibleHighlights") || "[]")),
  bookmarks: JSON.parse(localStorage.getItem("bibleBookmarks") || "[]"),
  notes: JSON.parse(localStorage.getItem("bibleNotes") || "{}"),
  verseLabels: JSON.parse(localStorage.getItem("bibleVerseLabels") || "{}"),
  prayerRequests: JSON.parse(localStorage.getItem("biblePrayerRequests") || "[]"),
  currentSpeechVerse: null,
  currentSpeechMode: null,
  currentSpeechWord: "",
  currentSpeechTimer: null,
  kidsPractice: false,
  kidsPracticeTimer: null,
  quietMode: false,
  bedtimeMode: false,
  darkMode: false,
  kidsMode: false,
  backgroundTheme: "plain"
};

const OWNER_EMAIL = "v949265289@gmail.com";
const SITE_CONFIG = window.BIBLE_SITE_CONFIG || {};
const SHARE_URL = SITE_CONFIG.publicUrl || window.location.href;
let supabaseClient = null;
let reminderClient = null;
let visitorPresenceChannel = null;

const elements = {
  bookName: document.querySelector("#bookName"),
  chapterLabel: document.querySelector("#chapterLabel"),
  chapterTitle: document.querySelector("#chapterTitle"),
  verses: document.querySelector("#verses"),
  bookList: document.querySelector("#bookList"),
  bookPanel: document.querySelector("#bookPanel"),
  overlay: document.querySelector("#overlay"),
  chapterSelect: document.querySelector("#chapterSelect"),
  verseSelect: document.querySelector("#verseSelect"),
  oldTestamentTab: document.querySelector("#oldTestamentTab"),
  newTestamentTab: document.querySelector("#newTestamentTab"),
  previousChapter: document.querySelector("#previousChapter"),
  nextChapter: document.querySelector("#nextChapter"),
  searchDialog: document.querySelector("#searchDialog"),
  searchInput: document.querySelector("#searchInput"),
  searchResults: document.querySelector("#searchResults"),
  playSelection: document.querySelector("#playSelection"),
  playVerse: document.querySelector("#playVerse"),
  playChapter: document.querySelector("#playChapter"),
  pauseSpeech: document.querySelector("#pauseSpeech"),
  stopSpeech: document.querySelector("#stopSpeech"),
  speechControls: document.querySelector(".speech-controls"),
  speechVoice: document.querySelector("#speechVoice"),
  speechSpeed: document.querySelector("#speechSpeed"),
  speechVolume: document.querySelector("#speechVolume"),
  speechVolumeValue: document.querySelector("#speechVolumeValue"),
  quietMode: document.querySelector("#quietMode"),
  sleepTimer: document.querySelector("#sleepTimer"),
  bedtimeMode: document.querySelector("#bedtimeMode"),
  darkMode: document.querySelector("#darkMode"),
  themeButton: document.querySelector("#themeButton"),
  kidsMode: document.querySelector("#kidsMode"),
  kidsPractice: document.querySelector("#kidsPractice"),
  readingReminderTime: document.querySelector("#readingReminderTime"),
  enableReadingReminder: document.querySelector("#enableReadingReminder"),
  disableReadingReminder: document.querySelector("#disableReadingReminder"),
  readingReminderStatus: document.querySelector("#readingReminderStatus"),
  backgroundTheme: document.querySelector("#backgroundTheme"),
  settingsDialog: document.querySelector("#settingsDialog"),
  accountDialog: document.querySelector("#accountDialog"),
  profileName: document.querySelector("#profileName"),
  accountEmail: document.querySelector("#accountEmail"),
  profileForm: document.querySelector("#profileForm"),
  ownerAccessButton: document.querySelector("#ownerAccessButton"),
  ownerDialog: document.querySelector("#ownerDialog"),
  closeOwnerDialog: document.querySelector("#closeOwnerDialog"),
  ownerLoginForm: document.querySelector("#ownerLoginForm"),
  ownerGoogleSignIn: document.querySelector("#ownerGoogleSignIn"),
  ownerStatus: document.querySelector("#ownerStatus"),
  ownerWorkspace: document.querySelector("#ownerWorkspace"),
  activeVisitorCount: document.querySelector("#activeVisitorCount"),
  eventTitle: document.querySelector("#eventTitle"),
  eventDate: document.querySelector("#eventDate"),
  eventTime: document.querySelector("#eventTime"),
  eventDetails: document.querySelector("#eventDetails"),
  saveOwnerEvent: document.querySelector("#saveOwnerEvent"),
  clearEvent: document.querySelector("#clearEvent"),
  updateForm: document.querySelector("#updateForm"),
  updateTitle: document.querySelector("#updateTitle"),
  updateBody: document.querySelector("#updateBody"),
  ownerUpdatesList: document.querySelector("#ownerUpdatesList"),
  ownerSignOut: document.querySelector("#ownerSignOut"),
  updatesSection: document.querySelector("#updatesSection"),
  updatesStatus: document.querySelector("#updatesStatus"),
  publicUpdatesList: document.querySelector("#publicUpdatesList"),
  siteVisitCount: document.querySelector("#siteVisitCount"),
  siteVisitStatus: document.querySelector("#siteVisitStatus"),
  shareButton: document.querySelector("#shareButton"),
  shareDialog: document.querySelector("#shareDialog"),
  closeShare: document.querySelector("#closeShare"),
  shareLink: document.querySelector("#shareLink"),
  copyShareLink: document.querySelector("#copyShareLink"),
  shareStatus: document.querySelector("#shareStatus"),
  whatsappShare: document.querySelector("#whatsappShare"),
  notesDialog: document.querySelector("#notesDialog"),
  verseLabelForm: document.querySelector("#verseLabelForm"),
  verseLabelInput: document.querySelector("#verseLabelInput"),
  verseLabelStatus: document.querySelector("#verseLabelStatus"),
  verseLabelsList: document.querySelector("#verseLabelsList"),
  noteReference: document.querySelector("#noteReference"),
  noteText: document.querySelector("#noteText"),
  notesList: document.querySelector("#notesList"),
  deleteNote: document.querySelector("#deleteNote"),
  prayerDialog: document.querySelector("#prayerDialog"),
  prayerText: document.querySelector("#prayerText"),
  prayerReference: document.querySelector("#prayerReference"),
  prayerList: document.querySelector("#prayerList"),
  readingStatus: document.querySelector("#readingStatus"),
  bookmarkButton: document.querySelector("#bookmarkButton"),
  bookmarksButton: document.querySelector("#bookmarksButton"),
  bookmarksDialog: document.querySelector("#bookmarksDialog"),
  bookmarksList: document.querySelector("#bookmarksList"),
  closeBookmarks: document.querySelector("#closeBookmarks")
};

async function loadBible() {
  if (!Array.isArray(ASV_BIBLE)) throw new Error("Could not load the Bible text.");
  state.books = ASV_BIBLE;
  buildBookList();
  loadSavedLocation();
  buildBookList();
  renderChapter();
  renderBookmarks();
}

function buildBookList() {
  const start = state.testament === "old" ? 0 : 39;
  const end = state.testament === "old" ? 39 : state.books.length;
  elements.bookList.innerHTML = state.books.slice(start, end).map((book, offset) => {
    const index = start + offset;
    return `<button class="book-item${index === state.bookIndex ? " active" : ""}" type="button" data-book="${index}">${book.name}</button>`;
  }).join("");

  elements.bookList.querySelectorAll("[data-book]").forEach(button => {
    button.addEventListener("click", () => {
      state.bookIndex = Number(button.dataset.book);
      state.chapterIndex = 0;
      state.testament = state.bookIndex < 39 ? "old" : "new";
      closeBooks();
      renderChapter();
    });
  });
}

function loadSavedLocation() {
  const saved = JSON.parse(localStorage.getItem("bibleLocation") || "null");
  if (!saved) return;
  const bookIndex = state.books.findIndex(book => book.name === saved.book);
  if (bookIndex >= 0) {
    state.bookIndex = bookIndex;
    state.chapterIndex = Math.min(saved.chapter, state.books[bookIndex].chapters.length - 1);
    state.testament = bookIndex < 39 ? "old" : "new";
  }
}

function renderChapter() {
  stopSpeech(false);
  const book = state.books[state.bookIndex];
  const chapter = book.chapters[state.chapterIndex];
  state.selectedVerseIndex = Math.min(state.selectedVerseIndex, chapter.length - 1);
  const chapterNumber = state.chapterIndex + 1;

  elements.bookName.textContent = book.name;
  elements.chapterLabel.textContent = `Chapter ${chapterNumber}`;
  elements.chapterTitle.textContent = `${book.name} ${chapterNumber}`;
  document.title = `${book.name} ${chapterNumber} | Bible Highlight`;

  elements.verses.innerHTML = chapter.map((text, index) => {
    const key = verseKey(state.bookIndex, state.chapterIndex, index);
    return `<div class="verse${state.highlights.has(key) ? " selected" : ""}" data-key="${key}">
      <span class="verse-number">${index + 1}</span>
      <span>${escapeHtml(text)}</span>
      <span class="verse-labels">${renderVerseLabelBadges(key)}</span>
    </div>`;
  }).join("");

  elements.verses.querySelectorAll(".verse").forEach((verse, verseIndex) => {
    verse.addEventListener("click", () => {
      if (getPassageSelection()) return;
      state.selectedVerseIndex = verseIndex;
      elements.verseSelect.value = String(verseIndex);
      updateBookmarkButton();
      updateReadingSceneBackground(verseIndex);
      if (state.kidsMode) {
        speakVerse();
        return;
      }
      setReadingStatus(`Selected ${currentReference()}. Drag over words to choose a reading range.`);
      toggleHighlight(verse.dataset.key, verse);
    });
  });

  elements.chapterSelect.innerHTML = book.chapters.map((_, index) =>
    `<option value="${index}"${index === state.chapterIndex ? " selected" : ""}>${index + 1}</option>`
  ).join("");
  elements.verseSelect.innerHTML = chapter.map((_, index) =>
    `<option value="${index}"${index === state.selectedVerseIndex ? " selected" : ""}>V. ${index + 1}</option>`
  ).join("");
  elements.previousChapter.disabled = state.bookIndex === 0 && state.chapterIndex === 0;
  elements.nextChapter.disabled =
    state.bookIndex === state.books.length - 1 &&
    state.chapterIndex === book.chapters.length - 1;

  elements.oldTestamentTab.classList.toggle("active", state.testament === "old");
  elements.newTestamentTab.classList.toggle("active", state.testament === "new");
  elements.oldTestamentTab.setAttribute("aria-selected", state.testament === "old");
  elements.newTestamentTab.setAttribute("aria-selected", state.testament === "new");
  updateBookmarkButton();

  localStorage.setItem("bibleLocation", JSON.stringify({ book: book.name, chapter: state.chapterIndex }));
  if (state.backgroundTheme === "auto") updateReadingSceneBackground();
  window.scrollTo(0, 0);
}

function toggleHighlight(key, element) {
  if (state.highlights.has(key)) state.highlights.delete(key);
  else state.highlights.add(key);
  element.classList.toggle("selected");
  localStorage.setItem("bibleHighlights", JSON.stringify([...state.highlights]));
}

function verseKey(bookIndex, chapterIndex, verseIndex) {
  return `${bookIndex}:${chapterIndex}:${verseIndex}`;
}

function renderVerseLabelBadges(key) {
  const labels = getVerseLabels(key);
  return labels.map(label => `<span class="verse-label-badge">${escapeHtml(label)}</span>`).join("");
}

function getVerseLabels(key) {
  return Array.isArray(state.verseLabels[key])
    ? state.verseLabels[key].filter(label => typeof label === "string")
    : [];
}

function escapeHtml(text) {
  const node = document.createElement("span");
  node.textContent = text;
  return node.innerHTML;
}

function openBooks() {
  elements.bookPanel.classList.add("open");
  elements.overlay.classList.add("open");
  elements.bookPanel.setAttribute("aria-hidden", "false");
  document.querySelector("#menuButton").setAttribute("aria-expanded", "true");
}

function closeBooks() {
  elements.bookPanel.classList.remove("open");
  elements.overlay.classList.remove("open");
  elements.bookPanel.setAttribute("aria-hidden", "true");
  document.querySelector("#menuButton").setAttribute("aria-expanded", "false");
}

function currentReference(verseIndex = state.selectedVerseIndex) {
  const book = state.books[state.bookIndex];
  return `${book.name} ${state.chapterIndex + 1}:${verseIndex + 1}`;
}

function setReadingStatus(message, active = false) {
  elements.readingStatus.textContent = message;
  elements.readingStatus.classList.toggle("active", active);
}

function createUtterance(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = state.bedtimeMode
    ? Math.min(Number(elements.speechSpeed.value), 0.75)
    : Number(elements.speechSpeed.value);
  utterance.volume = state.quietMode ? 0 : Number(elements.speechVolume.value);
  const voices = speechSynthesis.getVoices();
  const selectedVoice = voices.find(voice => voice.voiceURI === elements.speechVoice.value);
  const automaticVoice = getPreferredEnglishVoice(voices);
  const voice = selectedVoice || automaticVoice;
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
  return utterance;
}

function loadReadingSettings() {
  const savedVolume = localStorage.getItem("bibleSpeechVolume");
  const volume = savedVolume === null ? 1 : Number(savedVolume);
  elements.speechVolume.value = Number.isFinite(volume)
    ? String(Math.max(0, Math.min(1, volume)))
    : "1";
  elements.speechVolumeValue.value = `${Math.round(Number(elements.speechVolume.value) * 100)}%`;
  state.quietMode = localStorage.getItem("bibleQuietMode") === "true";
  state.bedtimeMode = localStorage.getItem("bibleBedtimeMode") === "true";
  const savedDarkMode = localStorage.getItem("bibleDarkMode");
  state.darkMode = savedDarkMode === null
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : savedDarkMode === "true";
  state.kidsMode = localStorage.getItem("bibleKidsMode") === "true";
  elements.quietMode.checked = state.quietMode;
  elements.bedtimeMode.checked = state.bedtimeMode;
  elements.darkMode.checked = state.darkMode;
  elements.kidsMode.checked = state.kidsMode;
  elements.kidsPractice.checked = false;
  elements.sleepTimer.value = localStorage.getItem("bibleSleepTimer") || "0";
  applyBackgroundTheme(localStorage.getItem("bibleBackgroundTheme") || "plain");
  applyDarkMode(state.darkMode);
  document.body.classList.toggle("bedtime-mode", state.bedtimeMode);
  document.body.classList.toggle("kids-mode", state.kidsMode);
  elements.speechControls.open = state.kidsMode || !compactSpeechControls.matches;
}

function applyDarkMode(enabled) {
  state.darkMode = enabled;
  document.body.classList.toggle("dark-mode", enabled);
  elements.darkMode.checked = enabled;
  elements.themeButton.textContent = enabled ? "☀" : "☾";
  elements.themeButton.setAttribute("aria-label", enabled ? "Switch to light mode" : "Switch to dark mode");
  elements.themeButton.title = enabled ? "Switch to light mode" : "Switch to dark mode";
  localStorage.setItem("bibleDarkMode", String(enabled));
}

function setOwnerStatus(message, isError = false) {
  elements.ownerStatus.textContent = message;
  elements.ownerStatus.classList.toggle("error", isError);
}

function renderUpdate(update, allowDelete = false) {
  const article = document.createElement(allowDelete ? "div" : "article");
  article.className = allowDelete ? "owner-update-item" : "public-update";
  const content = document.createElement("div");
  content.className = "update-content";
  const title = document.createElement(allowDelete ? "strong" : "h3");
  title.textContent = update.title;
  const body = document.createElement("p");
  body.textContent = update.body;
  const time = document.createElement("time");
  time.dateTime = update.created_at;
  const date = new Date(update.created_at);
  time.textContent = Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
  content.append(title, body, time);
  article.appendChild(content);

  if (allowDelete) {
    const removeButton = document.createElement("button");
    removeButton.className = "owner-update-delete";
    removeButton.type = "button";
    removeButton.dataset.deleteUpdate = update.id;
    removeButton.textContent = "Delete";
    article.appendChild(removeButton);
  }
  return article;
}

async function loadSiteUpdates() {
  const { data, error } = await supabaseClient
    .from("site_updates")
    .select("id,title,body,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    elements.updatesStatus.textContent = `Updates could not be loaded: ${error.message}`;
    setOwnerStatus(`Updates could not be loaded: ${error.message}`, true);
    return;
  }

  elements.updatesStatus.textContent = data.length ? "" : "There are no updates yet.";
  elements.publicUpdatesList.replaceChildren(...data.map(update => renderUpdate(update)));
  elements.ownerUpdatesList.replaceChildren(...data.map(update => renderUpdate(update, true)));
}

async function updateOwnerSession(session) {
  const user = session && session.user;
  const isOwner = Boolean(
    user &&
    typeof user.email === "string" &&
    user.email.toLowerCase() === OWNER_EMAIL &&
    user.email_confirmed_at
  );
  elements.ownerLoginForm.hidden = isOwner;
  elements.ownerWorkspace.hidden = !isOwner;

  if (isOwner) {
    setOwnerStatus(`Signed in as ${OWNER_EMAIL}.`);
    const savedEvent = JSON.parse(localStorage.getItem("ownerBibleEvent") || "null");
    elements.eventTitle.value = savedEvent && typeof savedEvent.title === "string" ? savedEvent.title : "";
    elements.eventDate.value = savedEvent && typeof savedEvent.date === "string" ? savedEvent.date : "";
    elements.eventTime.value = savedEvent && typeof savedEvent.time === "string" ? savedEvent.time : "";
    elements.eventDetails.value = savedEvent && typeof savedEvent.details === "string" ? savedEvent.details : "";
    await loadSiteUpdates();
  } else if (user && user.email) {
    setOwnerStatus("This account is not authorized for the owner panel.", true);
  }
}

function connectVisitorPresence() {
  const presenceKey = window.crypto && typeof window.crypto.randomUUID === "function"
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  visitorPresenceChannel = supabaseClient.channel("bible-live-visitors", {
    config: { presence: { key: presenceKey } }
  });
  visitorPresenceChannel.on("presence", { event: "sync" }, () => {
    const presence = visitorPresenceChannel.presenceState();
    const count = Object.values(presence).reduce((total, sessions) => total + sessions.length, 0);
    elements.activeVisitorCount.textContent = String(count);
  });
  visitorPresenceChannel.subscribe(async status => {
    if (status === "SUBSCRIBED") {
      try {
        const result = await visitorPresenceChannel.track({ online: true });
        if (result !== "ok") {
          setOwnerStatus(`Live visitor count could not start: ${result}.`, true);
        }
      } catch (error) {
        setOwnerStatus(`Live visitor count could not start: ${error.message}`, true);
      }
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      setOwnerStatus(`Live visitor count connection failed: ${status}.`, true);
    }
  });
}

async function initializeOwnerFeatures() {
  const config = window.BIBLE_SUPABASE_CONFIG;
  if (!config || !config.url || !config.anonKey) {
    setOwnerStatus("Set up Supabase to enable owner sign-in and live visitor counts. See supabase/setup.md.");
    return;
  }

  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    supabaseClient = createClient(config.url, config.anonKey);
    elements.updatesSection.hidden = false;
    await loadSiteUpdates();
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    await updateOwnerSession(data.session);
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        updateOwnerSession(session).catch(error => {
          setOwnerStatus(`Owner session could not be checked: ${error.message}`, true);
        });
      }, 0);
    });
    connectVisitorPresence();
  } catch (error) {
    setOwnerStatus(`Owner tools could not connect: ${error.message}`, true);
  }
}

function setReadingReminderStatus(message, isError = false) {
  elements.readingReminderStatus.textContent = message;
  elements.readingReminderStatus.classList.toggle("error", isError);
}

async function getReminderClient() {
  const config = window.BIBLE_SUPABASE_CONFIG;
  if (!config || !config.url || !config.anonKey) {
    throw new Error("Set up the Supabase project first. See supabase/setup.md.");
  }
  if (reminderClient) return reminderClient;

  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  reminderClient = createClient(config.url, config.anonKey, {
    auth: { storageKey: "bible-reading-reminder-auth" }
  });
  return reminderClient;
}

async function getReminderUser(client) {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session) return sessionData.session.user;

  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw error;
  if (!data.user) throw new Error("Supabase did not create a reminder account.");
  return data.user;
}

function decodeVapidPublicKey(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const raw = window.atob(padded);
  return Uint8Array.from(raw, character => character.charCodeAt(0));
}

async function initializeReadingReminder() {
  const siteConfig = window.BIBLE_SUPABASE_CONFIG;
  if (!siteConfig || !siteConfig.url || !siteConfig.anonKey) {
    setReadingReminderStatus("Set up Supabase and the VAPID public key to enable reminders.");
    return;
  }

  try {
    const client = await getReminderClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session) {
      setReadingReminderStatus("No daily reminder is enabled on this device.");
      return;
    }

    const { data: reminder, error: reminderError } = await client
      .from("reading_reminders")
      .select("enabled, reminder_time")
      .eq("user_id", data.session.user.id)
      .maybeSingle();
    if (reminderError) throw reminderError;
    if (reminder && reminder.enabled) {
      elements.readingReminderTime.value = reminder.reminder_time;
      setReadingReminderStatus(`Daily reminder is on for ${reminder.reminder_time}.`);
    } else {
      setReadingReminderStatus("No daily reminder is enabled on this device.");
    }
  } catch (error) {
    setReadingReminderStatus(`Reminder setup could not be checked: ${error.message}`, true);
  }
}

async function enableReadingReminder() {
  const siteConfig = window.BIBLE_SITE_CONFIG || {};
  if (!siteConfig.vapidPublicKey) {
    throw new Error("Add the VAPID public key to site-config.js first.");
  }
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("This browser does not support background notifications.");
  }
  if (!window.isSecureContext) {
    throw new Error("Reminders require the site to be open over HTTPS or localhost.");
  }
  if (!elements.readingReminderTime.value) {
    throw new Error("Choose a daily reminder time.");
  }

  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Allow notifications for this site in your browser settings, then try again.");
  }

  const applicationServerKey = decodeVapidPublicKey(siteConfig.vapidPublicKey);
  if (applicationServerKey.length !== 65) {
    throw new Error("The VAPID public key in site-config.js is invalid.");
  }
  const client = await getReminderClient();
  const user = await getReminderUser(client);
  const registration = await navigator.serviceWorker.register("./service-worker.js");
  await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  const existingKey = subscription && subscription.options.applicationServerKey;
  if (subscription && existingKey) {
    const existingKeyBytes = new Uint8Array(existingKey);
    const keysMatch = existingKeyBytes.length === applicationServerKey.length &&
      existingKeyBytes.every((byte, index) => byte === applicationServerKey[index]);
    if (!keysMatch) {
      const unsubscribed = await subscription.unsubscribe();
      if (!unsubscribed) throw new Error("The existing browser subscription could not be replaced.");
      subscription = null;
    }
  }
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const { error } = await client.from("reading_reminders").upsert({
    user_id: user.id,
    enabled: true,
    reminder_time: elements.readingReminderTime.value,
    timezone,
    subscription: subscription.toJSON()
  }, { onConflict: "user_id" });
  if (error) throw error;

  setReadingReminderStatus(`Daily reminder enabled for ${elements.readingReminderTime.value}.`);
}

async function disableReadingReminder() {
  if (!reminderClient) {
    setReadingReminderStatus("No reminder account is saved on this device.");
    return;
  }
  const { data, error: sessionError } = await reminderClient.auth.getSession();
  if (sessionError) throw sessionError;
  if (!data.session) {
    setReadingReminderStatus("No reminder account is saved on this device.");
    return;
  }

  const { error } = await reminderClient
    .from("reading_reminders")
    .delete()
    .eq("user_id", data.session.user.id);
  if (error) throw error;

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = registration && await registration.pushManager.getSubscription();
  if (subscription) await subscription.unsubscribe();
  setReadingReminderStatus("Daily reminder turned off.");
}

async function updateTotalVisitCount(counterUrl) {
  try {
    const response = await fetch(counterUrl);
    if (!response.ok) throw new Error(`Counter returned HTTP ${response.status}`);
    const result = await response.json();
    if (typeof result.count !== "string" && typeof result.count !== "number") {
      throw new Error("Counter response did not include a valid total.");
    }
    elements.siteVisitCount.textContent = String(result.count);
    elements.siteVisitStatus.textContent = "Page views";
  } catch (error) {
    elements.siteVisitStatus.textContent = `Visit count unavailable: ${error.message}`;
  }
}

function initializeVisitCounter() {
  const code = SITE_CONFIG.goatCounterCode;
  if (!code || !/^[a-z0-9-]+$/i.test(code)) {
    elements.siteVisitStatus.textContent = "Add your GoatCounter site code in site-config.js.";
    return;
  }

  const publicUrl = SITE_CONFIG.publicUrl;
  if (!publicUrl || window.location.origin !== new URL(publicUrl).origin) {
    elements.siteVisitStatus.textContent = "Visit counter is active on the published website.";
    return;
  }

  const goatCounterUrl = `https://${code}.goatcounter.com`;
  const counterUrl = `${goatCounterUrl}/counter/TOTAL.json`;
  const script = document.createElement("script");
  script.src = "https://gc.zgo.at/count.js";
  script.async = true;
  script.dataset.goatcounter = `${goatCounterUrl}/count`;
  script.addEventListener("load", () => {
    window.setTimeout(() => updateTotalVisitCount(counterUrl), 1200);
  });
  script.addEventListener("error", () => {
    elements.siteVisitStatus.textContent = "Visit tracking could not load; check your connection or blocker.";
  });
  document.head.appendChild(script);
}

function stopKidsPractice() {
  state.kidsPractice = false;
  elements.kidsPractice.checked = false;
  if (state.kidsPracticeTimer !== null) {
    window.clearTimeout(state.kidsPracticeTimer);
    state.kidsPracticeTimer = null;
  }
}

function startKidsPractice() {
  if (!("speechSynthesis" in window)) {
    elements.kidsPractice.checked = false;
    setReadingStatus("Text-to-speech is not supported in this browser.");
    return;
  }

  state.kidsPractice = true;
  state.kidsPracticeTimer = window.setTimeout(() => {
    state.kidsPracticeTimer = null;
    stopSpeech(false);
    setReadingStatus("Kids Practice stopped automatically after 50 minutes.");
  }, 50 * 60 * 1000);
  speakChapter();
}

function applyBackgroundTheme(theme) {
  const themes = ["plain", "auto", "space", "cross", "jesus"];
  state.backgroundTheme = themes.includes(theme) ? theme : "plain";
  elements.backgroundTheme.value = state.backgroundTheme;
  document.body.classList.remove(
    "background-auto",
    "background-space",
    "background-cross",
    "background-jesus",
    "reading-scene-sea",
    "reading-scene-desert",
    "reading-scene-mountains",
    "reading-scene-city",
    "reading-scene-garden",
    "reading-scene-night",
    "reading-scene-village"
  );
  if (state.backgroundTheme === "auto") {
    document.body.classList.add("background-auto");
    updateReadingSceneBackground();
  } else if (state.backgroundTheme !== "plain") {
    document.body.classList.add(`background-${state.backgroundTheme}`);
  }
  localStorage.setItem("bibleBackgroundTheme", state.backgroundTheme);
}

function updateReadingSceneBackground(verseIndex = null) {
  if (state.backgroundTheme !== "auto") return;
  const book = state.books[state.bookIndex];
  const chapter = book && book.chapters[state.chapterIndex];
  const chapterPassage = Array.isArray(chapter) ? chapter.join(" ").toLowerCase() : "";
  const scenePatterns = {
    sea: /\b(sea|seas|waters|river|lake|boat|ship|fish|shore|waves|storm)\b/g,
    desert: /\b(wilderness|deserts?|egypt|sand|drought|thirst)\b/g,
    mountains: /\b(mountain|mount|hill|sinai|horeb|zion|olivet|rock)\b/g,
    city: /\b(jerusalem|jericho|bethlehem|nazareth|temple|city|cities|gate|walls)\b/g,
    garden: /\b(garden|eden|tree|trees|vineyard|vine|fruit|field|olive)\b/g,
    night: /\b(night|stars|star|moon|darkness|dream|dawn|sunrise)\b/g
  };
  const scorePassage = passage => Object.entries(scenePatterns).map(([scene, pattern]) => ({
    scene,
    score: (passage.match(pattern) || []).length
  })).reduce((best, current) =>
    current.score > best.score ? current : best, { scene: "", score: 0 });
  const chapterMatch = scorePassage(chapterPassage);
  const versePassage = Number.isInteger(verseIndex) && Array.isArray(chapter)
    ? (chapter[verseIndex] || "").toLowerCase()
    : "";
  const verseMatch = versePassage ? scorePassage(versePassage) : null;
  const bestMatch = verseMatch && verseMatch.score > 0 ? verseMatch : chapterMatch;
  const fallbackScene = state.bookIndex < 39 ? "desert" : "village";
  const scene = bestMatch.score > 0 ? bestMatch.scene : fallbackScene;
  const sceneClasses = [
    "reading-scene-sea",
    "reading-scene-desert",
    "reading-scene-mountains",
    "reading-scene-city",
    "reading-scene-garden",
    "reading-scene-night",
    "reading-scene-village"
  ];
  document.body.classList.remove(...sceneClasses);
  document.body.classList.add(`reading-scene-${scene}`);
}

function clearSleepTimer() {
  if (state.currentSpeechTimer !== null) {
    window.clearTimeout(state.currentSpeechTimer);
    state.currentSpeechTimer = null;
  }
}

function startSleepTimer() {
  clearSleepTimer();
  const minutes = Number(elements.sleepTimer.value);
  if (!minutes) return;
  state.currentSpeechTimer = window.setTimeout(() => {
    state.currentSpeechTimer = null;
    stopSpeech(false);
    setReadingStatus("Sleep timer finished. Narration stopped.");
  }, minutes * 60 * 1000);
}

function getPreferredEnglishVoice(voices) {
  const englishVoices = voices.filter(voice => voice.lang.toLowerCase().startsWith("en"));
  return englishVoices.find(voice => /natural|neural|premium|enhanced/i.test(voice.name)) ||
    englishVoices.find(voice => /aria|jenny|samantha|zira/i.test(voice.name)) ||
    englishVoices.find(voice => /google.*english/i.test(voice.name)) ||
    englishVoices.find(voice => voice.lang.toLowerCase() === "en-us") ||
    englishVoices[0];
}

function populateSpeechVoices() {
  const voices = speechSynthesis.getVoices();
  const englishVoices = voices.filter(voice => voice.lang.toLowerCase().startsWith("en"));
  const availableVoices = englishVoices.length ? englishVoices : voices;
  const savedVoice = localStorage.getItem("bibleSpeechVoice") || "";

  elements.speechVoice.innerHTML = "";
  const automaticOption = document.createElement("option");
  automaticOption.value = "";
  const preferredVoice = getPreferredEnglishVoice(voices);
  automaticOption.textContent = preferredVoice
    ? `Automatic — ${preferredVoice.name}`
    : "System default voice";
  elements.speechVoice.appendChild(automaticOption);

  availableVoices.forEach(voice => {
    const option = document.createElement("option");
    option.value = voice.voiceURI;
    option.textContent = `${voice.name} (${voice.lang})`;
    elements.speechVoice.appendChild(option);
  });

  elements.speechVoice.value = availableVoices.some(voice => voice.voiceURI === savedVoice)
    ? savedVoice
    : "";
}

function speakVerse() {
  if (!("speechSynthesis" in window)) {
    setReadingStatus("Text-to-speech is not supported in this browser.");
    return;
  }
  stopSpeech(false);
  const book = state.books[state.bookIndex];
  const chapterNumber = state.chapterIndex + 1;
  const verseNumber = state.selectedVerseIndex + 1;
  const verseIndex = state.selectedVerseIndex;
  const text = book.chapters[state.chapterIndex][verseIndex];
  if (!text) return;
  const utterance = createUtterance(`${book.name} chapter ${chapterNumber}, verse ${verseNumber}. ${text}`);
  state.currentSpeechMode = "verse";
  state.currentSpeechVerse = verseIndex;
  utterance.addEventListener("start", () => setReadingStatus(`Reading ${currentReference(verseIndex)} — press Stop to stop`, true));
  utterance.addEventListener("end", () => finishSpeechAt(verseIndex));
  utterance.addEventListener("error", event => {
    if (event.error !== "canceled" && event.error !== "interrupted") {
      if (state.kidsPractice) stopSpeech(false);
      setReadingStatus("Speech could not be played. Try again.");
    }
  });
  setReadingStatus(`Starting ${currentReference(verseIndex)}…`, true);
  speechSynthesis.speak(utterance);
  startSleepTimer();
}

function speakChapter() {
  if (!("speechSynthesis" in window)) {
    setReadingStatus("Text-to-speech is not supported in this browser.");
    return;
  }
  stopSpeech(false, state.kidsPractice);
  const book = state.books[state.bookIndex];
  const verses = book.chapters[state.chapterIndex];
  state.currentSpeechMode = "chapter";
  for (let index = state.selectedVerseIndex; index < verses.length; index++) {
    const text = verses[index];
    const utterance = createUtterance(`${index + 1}. ${text}`);
    utterance.addEventListener("start", () => {
      state.currentSpeechVerse = index;
      setReadingStatus(`Reading ${currentReference(index)} — press Stop to stop`, true);
    });
    utterance.addEventListener("error", event => {
      if (event.error !== "canceled" && event.error !== "interrupted") {
        if (state.kidsPractice) stopSpeech(false);
        setReadingStatus("Speech could not be played. Try again.");
      }
    });
    if (index === verses.length - 1) {
      utterance.addEventListener("end", () => finishSpeechAt(index, true));
    }
    speechSynthesis.speak(utterance);
  }
  state.currentSpeechVerse = state.selectedVerseIndex;
  setReadingStatus(`Starting at ${currentReference()}…`, true);
  startSleepTimer();
}

function getPassageSelection() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed ||
      !elements.verses.contains(selection.anchorNode) ||
      !elements.verses.contains(selection.focusNode)) {
    return "";
  }
  return selection.toString().replace(/\s+/g, " ").trim();
}

function speakSelection() {
  const text = getPassageSelection();
  if (!text) {
    setReadingStatus("Drag across the Bible words you want to read first.");
    return;
  }
  if (!("speechSynthesis" in window)) {
    setReadingStatus("Text-to-speech is not supported in this browser.");
    return;
  }

  stopSpeech(false);
  const utterance = createUtterance(text);
  state.currentSpeechMode = "selection";
  state.currentSpeechWord = "";
  utterance.addEventListener("start", () => setReadingStatus("Reading your selected text — press Stop to stop", true));
  utterance.addEventListener("boundary", event => {
    const spokenText = text.slice(0, event.charIndex + (event.charLength || 0)).trimEnd();
    const word = spokenText.match(/[^\s]+$/);
    if (word) {
      state.currentSpeechWord = word[0];
      setReadingStatus(`Reading selected text — near “${word[0]}”`, true);
    }
  });
  utterance.addEventListener("end", () => {
    state.currentSpeechMode = null;
    state.currentSpeechWord = "";
    setReadingStatus("Finished reading the selected text.");
  });
  utterance.addEventListener("error", event => {
    if (event.error !== "canceled" && event.error !== "interrupted") {
      state.currentSpeechMode = null;
      setReadingStatus("Speech could not be played. Try again.");
    }
  });
  setReadingStatus("Starting your selected text…", true);
  speechSynthesis.speak(utterance);
  startSleepTimer();
}

function updateSelectionStatus() {
  const text = getPassageSelection();
  if (!text) return;
  const words = text.split(/\s+/).length;
  setReadingStatus(`${words} word${words === 1 ? "" : "s"} selected. Press Read selection.`);
}

function finishSpeechAt(index, chapterFinished = false) {
  clearSleepTimer();
  state.selectedVerseIndex = index;
  state.currentSpeechVerse = null;
  state.currentSpeechMode = null;
  elements.verseSelect.value = String(index);
  updateBookmarkButton();
  updateReadingSceneBackground(index);
  if (state.kidsPractice && chapterFinished) {
    stopKidsPractice();
    setReadingStatus(`Kids Practice finished reading this chapter at ${currentReference(index)}.`);
  } else {
    setReadingStatus(`${chapterFinished ? "Finished" : "Finished reading"} at ${currentReference(index)}`);
  }
}

function stopSpeech(showStatus = true, preserveKidsPractice = false) {
  if (state.kidsPractice && !preserveKidsPractice) stopKidsPractice();
  const stoppedAt = state.currentSpeechVerse;
  const mode = state.currentSpeechMode;
  const stoppedWord = state.currentSpeechWord;
  clearSleepTimer();
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
  }
  state.currentSpeechMode = null;
  state.currentSpeechVerse = null;
  state.currentSpeechWord = "";
  elements.pauseSpeech.textContent = "Ⅱ";
  elements.pauseSpeech.title = "Pause speech";
  if (!showStatus) return;
  if (mode === "selection") {
    const position = stoppedWord ? ` after “${stoppedWord}”` : "";
    setReadingStatus(`Stopped${position}. Drag to choose where to start and stop, then press Read selection.`);
  } else if (stoppedAt !== null) {
    state.selectedVerseIndex = stoppedAt;
    elements.verseSelect.value = String(stoppedAt);
    updateBookmarkButton();
    updateReadingSceneBackground(stoppedAt);
    setReadingStatus(`Stopped at ${currentReference(stoppedAt)}. Choose a word range and press Read selection.`);
  }
}

function saveBookmark() {
  const book = state.books[state.bookIndex];
  const chapter = state.chapterIndex + 1;
  const verse = state.selectedVerseIndex + 1;
  const id = `${state.bookIndex}:${state.chapterIndex}:${state.selectedVerseIndex}`;
  const existing = state.bookmarks.find(bookmark => bookmark.id === id);
  if (!existing) {
    state.bookmarks.unshift({
      id,
      bookIndex: state.bookIndex,
      chapterIndex: state.chapterIndex,
      verseIndex: state.selectedVerseIndex,
      label: `${book.name} ${chapter}:${verse}`
    });
  }
  localStorage.setItem("bibleBookmarks", JSON.stringify(state.bookmarks));
  updateBookmarkButton();
  renderBookmarks();
}

function updateBookmarkButton() {
  const id = `${state.bookIndex}:${state.chapterIndex}:${state.selectedVerseIndex}`;
  const saved = state.bookmarks.some(bookmark => bookmark.id === id);
  elements.bookmarkButton.textContent = saved ? "★" : "☆";
  elements.bookmarkButton.title = saved ? "Remove bookmark" : "Save bookmark";
  elements.bookmarkButton.setAttribute("aria-label", elements.bookmarkButton.title);
}

function toggleBookmark() {
  const id = `${state.bookIndex}:${state.chapterIndex}:${state.selectedVerseIndex}`;
  const saved = state.bookmarks.some(bookmark => bookmark.id === id);
  if (saved) {
    state.bookmarks = state.bookmarks.filter(bookmark => bookmark.id !== id);
  } else {
    saveBookmark();
    return;
  }
  localStorage.setItem("bibleBookmarks", JSON.stringify(state.bookmarks));
  updateBookmarkButton();
  renderBookmarks();
}

function renderBookmarks() {
  elements.bookmarksList.innerHTML = state.bookmarks.length
    ? state.bookmarks.map(bookmark => `
      <div class="bookmark-item">
        <button class="bookmark-open" type="button" data-id="${bookmark.id}">
          <strong>${escapeHtml(bookmark.label)}</strong>
        </button>
        <button class="bookmark-delete" type="button" data-id="${bookmark.id}" aria-label="Delete bookmark">×</button>
      </div>
    `).join("")
    : `<div class="search-empty">No bookmarks saved.</div>`;

  elements.bookmarksList.querySelectorAll(".bookmark-open").forEach(button => {
    button.addEventListener("click", () => {
      const bookmark = state.bookmarks.find(item => item.id === button.dataset.id);
      if (!bookmark) return;
      state.bookIndex = bookmark.bookIndex;
      state.chapterIndex = bookmark.chapterIndex;
      state.selectedVerseIndex = bookmark.verseIndex;
      state.testament = state.bookIndex < 39 ? "old" : "new";
      buildBookList();
      renderChapter();
      updateReadingSceneBackground(state.selectedVerseIndex);
      elements.bookmarksDialog.close();
      requestAnimationFrame(() => {
        const verse = elements.verses.querySelectorAll(".verse")[state.selectedVerseIndex];
        if (verse) verse.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  });

  elements.bookmarksList.querySelectorAll(".bookmark-delete").forEach(button => {
    button.addEventListener("click", () => {
      state.bookmarks = state.bookmarks.filter(bookmark => bookmark.id !== button.dataset.id);
      localStorage.setItem("bibleBookmarks", JSON.stringify(state.bookmarks));
      updateBookmarkButton();
      renderBookmarks();
    });
  });
}

function renderNotesList() {
  const entries = Object.entries(state.notes)
    .filter(([, note]) => typeof note === "string" && note.trim())
    .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }));

  elements.notesList.innerHTML = entries.length
    ? entries.map(([key, note]) => {
        const [bookIndex, chapterIndex, verseIndex] = key.split(":").map(Number);
        const book = state.books[bookIndex];
        if (!book || !book.chapters[chapterIndex]) return "";
        const label = `${book.name} ${chapterIndex + 1}:${verseIndex + 1}`;
        return `<button class="note-item" type="button" data-key="${key}">
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(note.slice(0, 180))}</span>
        </button>`;
      }).join("")
    : `<div class="search-empty">No notes saved yet.</div>`;

  elements.notesList.querySelectorAll(".note-item").forEach(button => {
    button.addEventListener("click", () => {
      const [bookIndex, chapterIndex, verseIndex] = button.dataset.key.split(":").map(Number);
      state.bookIndex = bookIndex;
      state.chapterIndex = chapterIndex;
      state.selectedVerseIndex = verseIndex;
      state.testament = bookIndex < 39 ? "old" : "new";
      buildBookList();
      elements.notesDialog.close();
      renderChapter();
      updateReadingSceneBackground(verseIndex);
      requestAnimationFrame(() => {
        const verse = elements.verses.querySelectorAll(".verse")[verseIndex];
        if (verse) verse.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  });
}

function openNotes() {
  const key = verseKey(state.bookIndex, state.chapterIndex, state.selectedVerseIndex);
  elements.verseLabelInput.value = "";
  elements.verseLabelStatus.textContent = "";
  renderVerseLabels();
  elements.noteReference.textContent = `Note for ${currentReference()}`;
  elements.noteText.value = state.notes[key] || "";
  elements.deleteNote.disabled = !state.notes[key];
  renderNotesList();
  elements.notesDialog.showModal();
}

function renderVerseLabels() {
  const key = verseKey(state.bookIndex, state.chapterIndex, state.selectedVerseIndex);
  const labels = getVerseLabels(key);
  elements.verseLabelsList.innerHTML = labels.length
    ? labels.map((label, index) => `
      <span class="verse-label-chip">
        ${escapeHtml(label)}
        <button type="button" data-remove-label="${index}" aria-label="Remove label">×</button>
      </span>
    `).join("")
    : `<span class="verse-label-empty">No labels for this verse yet.</span>`;

  elements.verseLabelsList.querySelectorAll("[data-remove-label]").forEach(button => {
    button.addEventListener("click", () => {
      const currentLabels = getVerseLabels(key);
      currentLabels.splice(Number(button.dataset.removeLabel), 1);
      if (currentLabels.length) state.verseLabels[key] = currentLabels;
      else delete state.verseLabels[key];
      localStorage.setItem("bibleVerseLabels", JSON.stringify(state.verseLabels));
      elements.verseLabelStatus.textContent = "Label removed.";
      renderVerseLabels();
      const verse = elements.verses.querySelectorAll(".verse")[state.selectedVerseIndex];
      const badges = verse && verse.querySelector(".verse-labels");
      if (badges) badges.innerHTML = renderVerseLabelBadges(key);
    });
  });
}

function addVerseLabel(event) {
  event.preventDefault();
  const label = elements.verseLabelInput.value.trim();
  if (!label) {
    elements.verseLabelStatus.textContent = "Type a label before adding it.";
    elements.verseLabelInput.focus();
    return;
  }
  const key = verseKey(state.bookIndex, state.chapterIndex, state.selectedVerseIndex);
  const labels = getVerseLabels(key);
  if (labels.some(existing => existing.toLowerCase() === label.toLowerCase())) {
    elements.verseLabelStatus.textContent = "That label is already on this verse.";
    elements.verseLabelInput.focus();
    return;
  }
  labels.push(label);
  state.verseLabels[key] = labels;
  localStorage.setItem("bibleVerseLabels", JSON.stringify(state.verseLabels));
  elements.verseLabelInput.value = "";
  elements.verseLabelStatus.textContent = `Added "${label}" to ${currentReference()}.`;
  renderVerseLabels();
  const verse = elements.verses.querySelectorAll(".verse")[state.selectedVerseIndex];
  const badges = verse && verse.querySelector(".verse-labels");
  if (badges) badges.innerHTML = renderVerseLabelBadges(key);
}

function saveNote() {
  const key = verseKey(state.bookIndex, state.chapterIndex, state.selectedVerseIndex);
  const note = elements.noteText.value.trim();
  if (!note) {
    setReadingStatus(state.notes[key]
      ? "Use Delete note to remove this saved note."
      : "Write a note before saving.");
    return;
  }
  state.notes[key] = note;
  localStorage.setItem("bibleNotes", JSON.stringify(state.notes));
  elements.deleteNote.disabled = false;
  renderNotesList();
  setReadingStatus(`Note saved for ${currentReference()}.`);
}

function renderPrayerRequests() {
  elements.prayerList.innerHTML = state.prayerRequests.length
    ? state.prayerRequests.map(request => `
      <article class="prayer-item${request.prayed ? " prayed" : ""}">
        <div class="prayer-item-top">
          <strong>${escapeHtml(request.reference || "Prayer request")}</strong>
          <time datetime="${escapeHtml(request.createdAt)}">${new Date(request.createdAt).toLocaleDateString()}</time>
        </div>
        <p>${escapeHtml(request.text)}</p>
        <label>
          <input type="checkbox" data-prayed="${escapeHtml(request.id)}"${request.prayed ? " checked" : ""}>
          <span>Prayed for</span>
        </label>
        <button type="button" data-delete-prayer="${escapeHtml(request.id)}">Delete request</button>
      </article>
    `).join("")
    : `<div class="search-empty">Your prayer list is empty.</div>`;

  elements.prayerList.querySelectorAll("[data-prayed]").forEach(input => {
    input.addEventListener("change", () => {
      const request = state.prayerRequests.find(item => item.id === input.dataset.prayed);
      if (!request) return;
      request.prayed = input.checked;
      localStorage.setItem("biblePrayerRequests", JSON.stringify(state.prayerRequests));
      renderPrayerRequests();
    });
  });

  elements.prayerList.querySelectorAll("[data-delete-prayer]").forEach(button => {
    button.addEventListener("click", () => {
      if (!window.confirm("Delete this prayer request?")) return;
      state.prayerRequests = state.prayerRequests.filter(item => item.id !== button.dataset.deletePrayer);
      localStorage.setItem("biblePrayerRequests", JSON.stringify(state.prayerRequests));
      renderPrayerRequests();
    });
  });
}

function addPrayerRequest() {
  const text = elements.prayerText.value.trim();
  if (!text) {
    elements.prayerText.focus();
    return;
  }
  state.prayerRequests.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text,
    reference: elements.prayerReference.value.trim(),
    createdAt: new Date().toISOString(),
    prayed: false
  });
  localStorage.setItem("biblePrayerRequests", JSON.stringify(state.prayerRequests));
  elements.prayerText.value = "";
  renderPrayerRequests();
}

function changeChapter(direction) {
  const book = state.books[state.bookIndex];
  const next = state.chapterIndex + direction;
  if (next >= 0 && next < book.chapters.length) {
    state.chapterIndex = next;
  } else if (direction > 0 && state.bookIndex < state.books.length - 1) {
    state.bookIndex++;
    state.chapterIndex = 0;
  } else if (direction < 0 && state.bookIndex > 0) {
    state.bookIndex--;
    state.chapterIndex = state.books[state.bookIndex].chapters.length - 1;
  }
  renderChapter();
}

function search(query) {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) {
    elements.searchResults.innerHTML = "";
    return;
  }

  const matches = [];
  for (let bookIndex = 0; bookIndex < state.books.length && matches.length < 100; bookIndex++) {
    const book = state.books[bookIndex];
    for (let chapterIndex = 0; chapterIndex < book.chapters.length && matches.length < 100; chapterIndex++) {
      for (let verseIndex = 0; verseIndex < book.chapters[chapterIndex].length && matches.length < 100; verseIndex++) {
        const text = book.chapters[chapterIndex][verseIndex];
        if (text.toLowerCase().includes(needle)) {
          matches.push({ bookIndex, chapterIndex, verseIndex, text });
        }
      }
    }
  }

  elements.searchResults.innerHTML = matches.length
    ? matches.map(match => {
        const book = state.books[match.bookIndex];
        const label = `${book.name} ${match.chapterIndex + 1}:${match.verseIndex + 1}`;
        return `<button class="search-result" type="button" data-book="${match.bookIndex}" data-chapter="${match.chapterIndex}">
          <strong>${label}</strong><br>${escapeHtml(match.text)}
        </button>`;
      }).join("")
    : `<div class="search-empty">No matches found.</div>`;

  elements.searchResults.querySelectorAll(".search-result").forEach(result => {
    result.addEventListener("click", () => {
      state.bookIndex = Number(result.dataset.book);
      state.chapterIndex = Number(result.dataset.chapter);
      state.testament = state.bookIndex < 39 ? "old" : "new";
      buildBookList();
      elements.searchDialog.close();
      renderChapter();
    });
  });
}

document.querySelector("#menuButton").addEventListener("click", openBooks);
document.querySelector("#bookButton").addEventListener("click", openBooks);
document.querySelector("#closeBooks").addEventListener("click", closeBooks);
elements.overlay.addEventListener("click", closeBooks);
elements.previousChapter.addEventListener("click", () => changeChapter(-1));
elements.nextChapter.addEventListener("click", () => changeChapter(1));
elements.chapterSelect.addEventListener("change", event => {
  state.chapterIndex = Number(event.target.value);
  renderChapter();
});
elements.verseSelect.addEventListener("change", event => {
  state.selectedVerseIndex = Number(event.target.value);
  updateReadingSceneBackground(state.selectedVerseIndex);
  setReadingStatus(`Selected ${currentReference()}. Drag over words to choose a reading range.`);
  updateBookmarkButton();
  const verse = elements.verses.querySelectorAll(".verse")[state.selectedVerseIndex];
  if (verse) {
    verse.scrollIntoView({ behavior: "smooth", block: "center" });
  }
});
elements.oldTestamentTab.addEventListener("click", () => {
  state.testament = "old";
  buildBookList();
  renderChapter();
});
elements.newTestamentTab.addEventListener("click", () => {
  state.testament = "new";
  buildBookList();
  renderChapter();
});
document.querySelector("#searchButton").addEventListener("click", () => {
  elements.searchDialog.showModal();
  elements.searchInput.focus();
});
document.querySelector("#settingsButton").addEventListener("click", () => {
  elements.settingsDialog.showModal();
});
document.querySelector("#closeSettings").addEventListener("click", () => {
  elements.settingsDialog.close();
});
elements.enableReadingReminder.addEventListener("click", async () => {
  elements.enableReadingReminder.disabled = true;
  try {
    await enableReadingReminder();
  } catch (error) {
    setReadingReminderStatus(`Reminder could not be enabled: ${error.message}`, true);
  } finally {
    elements.enableReadingReminder.disabled = false;
  }
});
elements.disableReadingReminder.addEventListener("click", async () => {
  elements.disableReadingReminder.disabled = true;
  try {
    await disableReadingReminder();
  } catch (error) {
    setReadingReminderStatus(`Reminder could not be turned off: ${error.message}`, true);
  } finally {
    elements.disableReadingReminder.disabled = false;
  }
});
document.querySelector("#accountButton").addEventListener("click", () => {
  const savedProfile = JSON.parse(localStorage.getItem("bibleGuestProfile") || "null");
  elements.profileName.value = savedProfile && typeof savedProfile.name === "string" ? savedProfile.name : "";
  elements.accountEmail.value = savedProfile && typeof savedProfile.email === "string" ? savedProfile.email : "";
  elements.accountDialog.showModal();
});
document.querySelector("#closeAccount").addEventListener("click", () => elements.accountDialog.close());
elements.profileName.addEventListener("input", () => elements.profileName.setCustomValidity(""));
elements.profileForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = elements.profileName.value.trim();
  const email = elements.accountEmail.value.trim();
  if (!name) {
    elements.profileName.setCustomValidity("Enter a name to save this profile.");
    elements.profileName.reportValidity();
    return;
  }
  elements.profileName.value = name;
  elements.accountEmail.value = email;
  localStorage.setItem("bibleGuestProfile", JSON.stringify({ name, email }));
  localStorage.setItem("bibleAccountMode", "guest");
  elements.accountDialog.close();
  setReadingStatus(`Welcome, ${name}. Your guest profile is saved on this device.`);
});
document.querySelector("#continueAsGuest").addEventListener("click", () => {
  localStorage.setItem("bibleAccountMode", "guest");
  elements.accountDialog.close();
  setReadingStatus("You're continuing as a guest without saving a name or email.");
});
elements.ownerAccessButton.addEventListener("click", () => {
  elements.accountDialog.close();
  elements.ownerDialog.showModal();
});
elements.closeOwnerDialog.addEventListener("click", () => elements.ownerDialog.close());
elements.ownerLoginForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!supabaseClient) {
    setOwnerStatus("Set up Supabase first. See supabase/setup.md.");
    return;
  }

  elements.ownerGoogleSignIn.disabled = true;
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.href
      }
    });
    if (error) throw error;
  } catch (error) {
    setOwnerStatus(`Sign-in failed: ${error.message}`, true);
    elements.ownerGoogleSignIn.disabled = false;
  }
});
elements.ownerSignOut.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    setOwnerStatus(`Could not sign out: ${error.message}`, true);
    return;
  }
  setOwnerStatus("Signed out.");
});
elements.saveOwnerEvent.addEventListener("click", () => {
  localStorage.setItem("ownerBibleEvent", JSON.stringify({
    title: elements.eventTitle.value.trim(),
    date: elements.eventDate.value,
    time: elements.eventTime.value,
    details: elements.eventDetails.value.trim()
  }));
  setOwnerStatus("Event saved for the owner.");
});
elements.clearEvent.addEventListener("click", () => {
  elements.eventTitle.value = "";
  elements.eventDate.value = "";
  elements.eventTime.value = "";
  elements.eventDetails.value = "";
  localStorage.removeItem("ownerBibleEvent");
  setOwnerStatus("Owner event cleared.");
});
elements.updateForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!supabaseClient) {
    setOwnerStatus("Set up Supabase before publishing updates.", true);
    return;
  }

  const title = elements.updateTitle.value.trim();
  const body = elements.updateBody.value.trim();
  if (!title || !body) {
    setOwnerStatus("Enter both an update title and details.", true);
    return;
  }

  const submitButton = document.querySelector("#publishUpdate");
  submitButton.disabled = true;
  try {
    const { error } = await supabaseClient.from("site_updates").insert({ title, body });
    if (error) throw error;
    elements.updateForm.reset();
    setOwnerStatus("Update published.");
    await loadSiteUpdates();
  } catch (error) {
    setOwnerStatus(`Update could not be published: ${error.message}`, true);
  } finally {
    submitButton.disabled = false;
  }
});
elements.ownerUpdatesList.addEventListener("click", async event => {
  const button = event.target.closest("[data-delete-update]");
  if (!button || !window.confirm("Delete this update from the public feed?")) return;
  try {
    const { error } = await supabaseClient
      .from("site_updates")
      .delete()
      .eq("id", button.dataset.deleteUpdate);
    if (error) throw error;
    setOwnerStatus("Update deleted.");
    await loadSiteUpdates();
  } catch (error) {
    setOwnerStatus(`Update could not be deleted: ${error.message}`, true);
  }
});
elements.shareButton.addEventListener("click", () => {
  elements.shareLink.value = SHARE_URL;
  elements.whatsappShare.href = `https://wa.me/?text=${encodeURIComponent(`Bible Highlight: ${SHARE_URL}`)}`;
  elements.shareStatus.textContent = "";
  elements.shareStatus.classList.remove("error");
  elements.shareDialog.showModal();
});
elements.closeShare.addEventListener("click", () => elements.shareDialog.close());
elements.shareLink.addEventListener("click", event => event.target.select());
elements.copyShareLink.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(SHARE_URL);
    elements.shareStatus.textContent = "Website link copied.";
  } catch (error) {
    elements.shareStatus.textContent = `Could not copy the link: ${error.message}`;
    elements.shareStatus.classList.add("error");
  }
});
elements.speechVolume.addEventListener("input", event => {
  const volume = Number(event.target.value);
  elements.speechVolumeValue.value = `${Math.round(volume * 100)}%`;
  localStorage.setItem("bibleSpeechVolume", String(volume));
});
elements.quietMode.addEventListener("change", event => {
  state.quietMode = event.target.checked;
  localStorage.setItem("bibleQuietMode", String(state.quietMode));
  if (state.quietMode && "speechSynthesis" in window && speechSynthesis.speaking) {
    stopSpeech(false);
  }
  setReadingStatus(state.quietMode
    ? "Quiet mode is on. New narration will be muted."
    : "Quiet mode is off. Narration volume restored.");
});
elements.sleepTimer.addEventListener("change", event => {
  localStorage.setItem("bibleSleepTimer", event.target.value);
});
elements.bedtimeMode.addEventListener("change", event => {
  state.bedtimeMode = event.target.checked;
  localStorage.setItem("bibleBedtimeMode", String(state.bedtimeMode));
  document.body.classList.toggle("bedtime-mode", state.bedtimeMode);
  setReadingStatus(state.bedtimeMode
    ? "Bedtime mode is on: the screen is dimmed and narration is slower."
    : "Bedtime mode is off.");
});
elements.darkMode.addEventListener("change", event => {
  applyDarkMode(event.target.checked);
  setReadingStatus(event.target.checked ? "Dark mode is on." : "Dark mode is off.");
});
elements.themeButton.addEventListener("click", () => {
  applyDarkMode(!state.darkMode);
  setReadingStatus(state.darkMode ? "Dark mode is on." : "Dark mode is off.");
});
elements.kidsMode.addEventListener("change", event => {
  state.kidsMode = event.target.checked;
  localStorage.setItem("bibleKidsMode", String(state.kidsMode));
  document.body.classList.toggle("kids-mode", state.kidsMode);
  elements.speechControls.open = state.kidsMode || !compactSpeechControls.matches;
  setReadingStatus(state.kidsMode
    ? "Kids Mode is on. Tap any verse to hear it read aloud."
    : "Kids Mode is off.");
});
elements.kidsPractice.addEventListener("change", event => {
  if (event.target.checked) {
    startKidsPractice();
  } else {
    stopKidsPractice();
    stopSpeech(false);
    setReadingStatus("Kids Practice is off.");
  }
});
elements.backgroundTheme.addEventListener("change", event => {
  applyBackgroundTheme(event.target.value);
  const labels = {
    plain: "Plain paper",
    auto: "the scene for this chapter",
    space: "Space",
    cross: "Sunrise cross",
    jesus: "Jesus illustration"
  };
  setReadingStatus(`Background set to ${labels[state.backgroundTheme]}.`);
});
document.querySelector("#openNotes").addEventListener("click", openNotes);
document.querySelector("#closeNotes").addEventListener("click", () => elements.notesDialog.close());
elements.verseLabelForm.addEventListener("submit", addVerseLabel);
document.querySelector("#saveNote").addEventListener("click", saveNote);
elements.deleteNote.addEventListener("click", () => {
  const key = verseKey(state.bookIndex, state.chapterIndex, state.selectedVerseIndex);
  if (!state.notes[key] || !window.confirm(`Delete your note for ${currentReference()}?`)) return;
  delete state.notes[key];
  localStorage.setItem("bibleNotes", JSON.stringify(state.notes));
  elements.noteText.value = "";
  elements.deleteNote.disabled = true;
  renderNotesList();
  setReadingStatus(`Note deleted for ${currentReference()}.`);
});
document.querySelector("#openPrayerList").addEventListener("click", () => {
  elements.prayerReference.value = currentReference();
  elements.prayerText.value = "";
  renderPrayerRequests();
  elements.prayerDialog.showModal();
});
document.querySelector("#closePrayerList").addEventListener("click", () => elements.prayerDialog.close());
document.querySelector("#addPrayerRequest").addEventListener("click", addPrayerRequest);
elements.searchInput.addEventListener("input", event => search(event.target.value));
elements.verses.addEventListener("mouseup", updateSelectionStatus);
elements.verses.addEventListener("touchend", updateSelectionStatus);
document.addEventListener("selectionchange", updateSelectionStatus);
if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = populateSpeechVoices;
  populateSpeechVoices();
} else {
  elements.speechVoice.disabled = true;
}
const compactSpeechControls = window.matchMedia("(max-width: 520px)");
function updateSpeechControlsLayout(event) {
  elements.speechControls.open = state.kidsMode || !event.matches;
}
updateSpeechControlsLayout(compactSpeechControls);
if (compactSpeechControls.addEventListener) {
  compactSpeechControls.addEventListener("change", updateSpeechControlsLayout);
} else {
  compactSpeechControls.addListener(updateSpeechControlsLayout);
}
if (compactSpeechControls.matches) {
  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
    setReadingStatus("Touch and hold a word, drag the handles, then choose Read selection.");
  }
}
loadReadingSettings();
elements.speechVoice.addEventListener("change", event => {
  localStorage.setItem("bibleSpeechVoice", event.target.value);
});
elements.playSelection.addEventListener("click", speakSelection);
elements.playVerse.addEventListener("click", speakVerse);
elements.playChapter.addEventListener("click", speakChapter);
elements.stopSpeech.addEventListener("click", () => {
  stopSpeech();
});
elements.pauseSpeech.addEventListener("click", () => {
  if (!("speechSynthesis" in window) || !speechSynthesis.speaking) return;
  if (speechSynthesis.paused) {
    speechSynthesis.resume();
    elements.pauseSpeech.textContent = "Ⅱ";
    elements.pauseSpeech.title = "Pause speech";
    const message = state.currentSpeechMode === "selection"
      ? state.currentSpeechWord
        ? `Reading selected text — near “${state.currentSpeechWord}”`
        : "Reading your selected text"
      : `Reading ${currentReference(state.currentSpeechVerse)} — press Stop to stop`;
    setReadingStatus(message, true);
  } else {
    speechSynthesis.pause();
    elements.pauseSpeech.textContent = "▶";
    elements.pauseSpeech.title = "Resume speech";
    const message = state.currentSpeechMode === "selection"
      ? state.currentSpeechWord
        ? `Paused after “${state.currentSpeechWord}”`
        : "Paused in selected text"
      : `Paused at ${currentReference(state.currentSpeechVerse)}`;
    setReadingStatus(message);
  }
});
elements.bookmarkButton.addEventListener("click", toggleBookmark);
elements.bookmarksButton.addEventListener("click", () => {
  renderBookmarks();
  elements.bookmarksDialog.showModal();
});
elements.closeBookmarks.addEventListener("click", () => elements.bookmarksDialog.close());

loadBible().catch(error => {
  elements.verses.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
});
initializeOwnerFeatures();
initializeReadingReminder();
initializeVisitCounter();
