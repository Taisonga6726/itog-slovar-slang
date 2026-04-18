/**
 * ТЗ VIBE Dictionary: навигация по экранам (глобально для HTML onclick / тестов).
 */
(function () {
  "use strict";
  window.showScreen = function (screenId) {
    const root = document.getElementById("main-content");
    if (!root) return;
    document.body.dataset.activeScreen = screenId;
    root.querySelectorAll(":scope > .screen").forEach((el) => {
      const on = el.id === screenId;
      el.classList.toggle("active", on);
      if (on) {
        el.classList.remove("screen-enter-anim");
        void el.offsetWidth;
        el.classList.add("screen-enter-anim");
      }
    });
    window.dispatchEvent(new CustomEvent("vibe-screenchange", { detail: { screenId } }));
  };
})();

/**
     * Словарь вайбкодера — логика в одном замыкании (без глобальных имён).
     * Разделы: CONFIG → state → dom → utils → storage → render → events → init.
     */
    (() => {
      "use strict";

      /** ТЗ: счётчик неверных попыток ввода кодового слова */
      let attempts = 0;

      let grainShaderCleanup = null;
      let magicRingsCleanup = null;
      let bookElectricFxCleanup = null;
      let coverBookPerimeterCleanup = null;

      /* --- Конфигурация --- */
      const CONFIG = {
        accessCodes: ["vibecoder", "вайбкодер"],
        storageKey: "vibe_dictionary_words",
        accessStorageKey: "vibe_dictionary_access",
        storageFormatVersion: 1,
        /** ТЗ: на странице режима «книга» — ровно 2 слова на разворот */
        wordsPerPage: 2,
        /** Сколько строк помещается на правой странице в режиме записи (перелист после заполнения) */
        writeWordsPerRightPage: 12,
        coverAnimationMs: 1450,
        typingSpeed: 15,
        maxWordLength: 30,
        maxDescriptionLength: 150,
        /** ТЗ: реакции { like, funny, wow, fire } */
        reactionDefs: [
          { key: "like", emoji: "👍", title: "Нравится" },
          { key: "funny", emoji: "😂", title: "Смешно" },
          { key: "wow", emoji: "😮", title: "Вау" },
          { key: "fire", emoji: "🔥", title: "Огонь" }
        ],
        /**
         * Цепочка источников для <img>: первый успешно загрузившийся используется.
         * Поставьте свои файлы в images/ и при необходимости переставьте строки (например jpg первым).
         */
        images: {
          bookViewSource: "images/book-open.png",
          bookWriteSource: "images/forma_cl.png",
          coverSources: [
            "images/book-cover%2001.png",
            "images/book-cover%2001%20.png",
            "images/cover.svg",
            "images/cover.jpg",
            "images/cover.png",
            "images/cover.webp",
            "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=1600&auto=format&fit=crop"
          ],
          bookSources: [
            "images/book-open.png",
            "images/book-open.svg",
            "images/forma_cl.png",
            "images/book.jpg",
            "images/book.png",
            "images/book.webp",
            "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1600&auto=format&fit=crop"
          ]
        }
      };

      /* --- Состояние --- */
      const state = {
        words: [],
        currentPage: 1,
        currentPageWords: [],
        bookMode: "view",
        typingTimer: null,
        writingTimer: null,
        isBookInitialized: false,
        coverAnimationEndHandler: null,
        isEnteringBook: false,
        /** Код верный, ждём клика по обложке для анимации «открытия» */
        coverAwaitingClick: false,
        /** Текущий «разворот» правой страницы в writeMode (1..) */
        writeSpreadPage: 1,
        /** Редактирование сохранённой записи (id) или null */
        editingWordId: null,
        /** Индекс разворота для экрана «книга» (ТЗ), по 2 слова */
        tzFlipSpreadIndex: 0,
        /** Фильтр каталога: all | like | funny | wow | fire */
        tzCatalogFilter: "all"
      };

      /* --- Ссылки на DOM --- */
      const dom = {
        sceneStage: document.getElementById("sceneStage"),
        sceneBgWrap: document.getElementById("sceneBgWrap"),
        sceneBg: document.getElementById("sceneBg"),
        aiLogoHotspot: document.getElementById("aiLogoHotspot"),
        bookSlot: document.getElementById("bookSlot"),
        bookHitZone: document.getElementById("bookHitZone"),
        bookOpenLayer: document.getElementById("bookOpenLayer"),
        accessOverlay: document.getElementById("accessOverlay"),
        bookImageWrap: document.getElementById("bookImageWrap"),
        bookImage: document.getElementById("bookImage"),
        accessForm: document.getElementById("accessForm"),
        accessWordInput: document.getElementById("accessWord"),
        loginMessage: document.getElementById("loginMessage"),
        wordForm: document.getElementById("wordForm"),
        viewMode: document.getElementById("viewMode"),
        writeMode: document.getElementById("writeMode"),
        wordInput: document.getElementById("wordInput"),
        descriptionInput: document.getElementById("descriptionInput"),
        saveBtn: document.getElementById("saveBtn"),
        writeBtn: document.getElementById("writeBtn"),
        writeWordList: document.getElementById("writeWordList"),
        writeNextBtn: document.getElementById("writeNextBtn"),
        closeBookBtn: document.getElementById("closeBookBtn"),
        writingPreview: document.getElementById("writingPreview"),
        formMessage: document.getElementById("formMessage"),
        dictionaryPage: document.getElementById("dictionaryPage"),
        pageCounter: document.getElementById("pageCounter"),
        prevBtn: document.getElementById("prevBtn"),
        nextBtn: document.getElementById("nextBtn"),
        sceneFlash: document.getElementById("sceneFlash"),
        bookFxFlash: document.getElementById("bookFxFlash"),
        pageLightBurst: document.getElementById("pageLightBurst"),
        accessSubmitBtn: document.getElementById("accessSubmitBtn"),
        bookCtaBanner: document.getElementById("bookCtaBanner")
      };

      /** Блок 3: полный UI книги (после снятия step2-visual), без декоративного шага «только картинка». */
      function isBookBlock3() {
        return (
          dom.sceneStage &&
          dom.sceneStage.classList.contains("scene--book-open") &&
          !dom.sceneStage.classList.contains("scene--step2-visual")
        );
      }

      /* --- Утилиты --- */
      function prefersReducedMotion() {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      }

      function normalizeText(value) {
        return String(value).trim().replace(/\s+/g, " ");
      }

      /**
       * Сборка Magic Book (Vite dist) с явным входом из Словаря: форма внесения слов.
       * Перед загрузкой script.js можно задать window.MAGIC_BOOK_URL — путь к index.html сборки.
       */
      function getMagicBookFormUrl() {
        var custom = typeof window !== "undefined" && window.MAGIC_BOOK_URL;
        var href = "";
        if (custom && String(custom).trim()) {
          href = String(custom).trim();
        } else if (
          window.location.protocol === "file:" ||
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1"
        ) {
          /* Локальный режим склейки: Magic Book уже поднят отдельным сервером dist на :5501 */
          href = "http://localhost:5501/";
        } else if (window.location.hostname.indexOf("github.io") !== -1) {
          /* GitHub Pages: собранный Magic Book лежит в корне Pages сайта */
          href = "/itog-slovar-slang/";
        } else {
          href = new URL(
            "../magic-book-before-pagination-fix-main (1)/magic-book-before-pagination-fix-main/dist/index.html",
            window.location.href
          ).href;
        }
        try {
          var u = new URL(href, window.location.href);
          u.searchParams.set("entry", "slovar");
          u.searchParams.set("screen", "form");
          return u.href;
        } catch (e) {
          return href;
        }
      }

      function initMagicOverlayParticles() {
        const container = document.getElementById("particles");
        if (!container || container.childElementCount > 0) return;

        for (let i = 0; i < 25; i++) {
          const p = document.createElement("div");
          p.className = "particle";
          p.style.left = Math.random() * 100 + "%";
          p.style.animationDuration = 2 + Math.random() * 3 + "s";
          p.style.opacity = Math.random();
          container.appendChild(p);
        }
      }

      function createId() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
          return window.crypto.randomUUID();
        }
        return `word_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      }

      /**
       * Подключает цепочку URL для декоративного изображения: при ошибке загрузки — следующий источник,
       * после исчерпания списка включается графический fallback на контейнере.
       */
      function setupImageSourceChain(img, wrap, sources) {
        if (!img || !wrap || !sources || sources.length === 0) return;

        let index = 0;

        const tryNext = () => {
          index += 1;
          if (index < sources.length) {
            img.src = sources[index];
          } else {
            wrap.classList.add("image-error");
          }
        };

        img.addEventListener("error", tryNext, { passive: true });
        img.addEventListener(
          "load",
          () => {
            wrap.classList.remove("image-error");
          },
          { passive: true }
        );

        img.src = sources[0];
      }

      function clearCoverAnimationListeners() {
        if (state.coverAnimationEndHandler && dom.sceneBg) {
          dom.sceneBg.removeEventListener("animationend", state.coverAnimationEndHandler);
          state.coverAnimationEndHandler = null;
        }
      }

      function defaultReactions() {
        const o = {};
        CONFIG.reactionDefs.forEach((d) => {
          o[d.key] = 0;
        });
        return o;
      }

      function normalizeReactions(raw) {
        const out = defaultReactions();
        if (!raw || typeof raw !== "object") return out;
        const migrate = {
          like: ["like", "heart"],
          funny: ["funny", "nice"],
          wow: ["wow", "smile", "star"],
          fire: ["fire"]
        };
        CONFIG.reactionDefs.forEach((d) => {
          const keys = migrate[d.key] || [d.key];
          let sum = 0;
          keys.forEach((k) => {
            const n = raw[k];
            if (Number.isFinite(n)) sum += Math.max(0, Math.floor(n));
          });
          out[d.key] = sum;
        });
        return out;
      }

      /* --- Нормализация записей в хранилище --- */
      function normalizeStoredWord(raw) {
        if (!raw || typeof raw !== "object") return null;
        const legacyWord = typeof raw.word === "string" ? raw.word.trim() : "";
        const legacyDescription = typeof raw.description === "string" ? raw.description.trim() : "";
        const text = typeof raw.text === "string" ? raw.text.trim() : "";
        const normalizedText = text || [legacyWord, legacyDescription].filter(Boolean).join(" — ");
        const emoji = typeof raw.emoji === "string" ? raw.emoji.trim() : "";
        const likes = Number.isFinite(raw.likes) ? raw.likes : 0;
        let id = typeof raw.id === "string" ? raw.id : "";
        if (!id) id = createId();

        if (!normalizedText) return null;

        return {
          id,
          text: normalizedText.slice(0, CONFIG.maxWordLength + CONFIG.maxDescriptionLength + 3),
          emoji: emoji.slice(0, 8),
          likes: Math.max(0, Math.floor(likes)),
          reactions: normalizeReactions(raw.reactions),
          createdAt: (() => {
            if (typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)) return raw.createdAt;
            if (typeof raw.createdAt === "string") {
              const t = Date.parse(raw.createdAt);
              if (Number.isFinite(t)) return t;
            }
            return Date.now();
          })()
        };
      }

      /* --- localStorage --- */
      const storage = {
        loadWords() {
          try {
            const raw = localStorage.getItem(CONFIG.storageKey);
            if (!raw) return [];

            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              return parsed.map(normalizeStoredWord).filter(Boolean);
            }
            if (parsed && typeof parsed === "object" && Array.isArray(parsed.words)) {
              return parsed.words.map(normalizeStoredWord).filter(Boolean);
            }
            return [];
          } catch (e) {
            console.error("Словарь: не удалось прочитать localStorage", e);
            return [];
          }
        },

        saveWords(words) {
          try {
            const payload = {
              v: CONFIG.storageFormatVersion,
              words
            };
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(payload));
            return { ok: true };
          } catch (e) {
            const name = e && e.name ? e.name : "";
            const quota = name === "QuotaExceededError";
            console.error("Словарь: не удалось записать localStorage", e);
            return {
              ok: false,
              quota,
              message: quota
                ? "Хранилище браузера переполнено. Удалите лишние данные на сайте или освободите место."
                : "Не удалось сохранить слово. Проверьте настройки приватности и доступ к хранилищу."
            };
          }
        },

        setAccessGranted() {
          try {
            localStorage.setItem(CONFIG.accessStorageKey, "granted");
            return true;
          } catch (e) {
            console.error("Доступ: не удалось записать localStorage", e);
            return false;
          }
        },

        isAccessGranted() {
          try {
            return localStorage.getItem(CONFIG.accessStorageKey) === "granted";
          } catch (e) {
            console.error("Доступ: не удалось прочитать localStorage", e);
            return false;
          }
        }
      };

      /* --- Сообщения и валидация UI --- */
      function setLoginMessage(text, type = "") {
        dom.loginMessage.textContent = text;
        dom.loginMessage.className = `helper-text cover-login-msg ${type}`.trim();
        if (type.includes("error")) {
          // Перезапускаем анимацию появления сообщения на каждую новую ошибку
          dom.loginMessage.classList.remove("msg-animate");
          void dom.loginMessage.offsetWidth;
          dom.loginMessage.classList.add("msg-animate");
        }
      }

      function setLoginMessageHtml(html, type = "") {
        dom.loginMessage.innerHTML = html;
        dom.loginMessage.className = `helper-text cover-login-msg ${type}`.trim();
        if (type.includes("error")) {
          dom.loginMessage.classList.remove("msg-animate");
          void dom.loginMessage.offsetWidth;
          dom.loginMessage.classList.add("msg-animate");
        }
      }

      function showAccessErrorMessage() {
        const cycleStep = ((attempts - 1) % 3) + 1;
        if (cycleStep === 1) {
          setLoginMessageHtml(
            'НЕТ! осталось <span class="login-msg-number">2</span> попытки',
            "error error-hard error-attempt"
          );
          return;
        }
        if (cycleStep === 2) {
          setLoginMessageHtml(
            'НЕТ! осталось <span class="login-msg-number">1</span> попытка',
            "error error-hard error-attempt"
          );
          return;
        }
        setLoginMessageHtml(
          '<span class="login-msg-emoji">😄</span> <span class="login-msg-pop-text">СПРОСИТЬ У ТАНИ?</span> <span class="login-msg-emoji">😄</span>',
          "error error-pop"
        );
      }

      function setFormMessage(text, type = "") {
        dom.formMessage.textContent = text;
        dom.formMessage.className = `helper-text form-helper ${type}`.trim();
      }

      function setAccessFieldInvalid(invalid) {
        dom.accessWordInput.setAttribute("aria-invalid", invalid ? "true" : "false");
      }

      function setWordFieldsInvalid(invalid) {
        dom.wordInput.setAttribute("aria-invalid", invalid ? "true" : "false");
        dom.descriptionInput.setAttribute("aria-invalid", invalid ? "true" : "false");
      }

      function setAccessControlsDisabled(disabled) {
        dom.accessWordInput.disabled = disabled;
        if (dom.accessSubmitBtn) dom.accessSubmitBtn.disabled = disabled;
        dom.accessForm.setAttribute("aria-busy", disabled ? "true" : "false");
        dom.sceneStage.setAttribute("aria-busy", disabled ? "true" : "false");
      }

      function setAccessButtonState(state = "default") {
        if (!dom.accessSubmitBtn) return;
        dom.accessSubmitBtn.classList.remove("state-default", "state-error", "state-success");
        dom.accessSubmitBtn.classList.add(
          state === "error" ? "state-error" : state === "success" ? "state-success" : "state-default"
        );
      }

      function triggerSceneFlash(kind) {
        const el = dom.sceneFlash;
        if (!el) return;
        el.classList.remove("flash--success-pulse", "flash--error-pulse", "flash--open-pulse");
        void el.offsetWidth;
        if (kind === "open") {
          el.classList.add("flash--open-pulse");
        } else if (kind === "success") {
          el.classList.add("flash--success-pulse");
        } else {
          el.classList.add("flash--error-pulse");
        }
        const onEnd = () => {
          el.removeEventListener("animationend", onEnd);
          el.classList.remove("flash--success-pulse", "flash--error-pulse", "flash--open-pulse");
        };
        el.addEventListener("animationend", onEnd, { once: true });
      }

      function triggerBookFlash(kind) {
        const el = dom.bookFxFlash;
        if (!el) return;
        el.classList.remove("flash--success-pulse", "flash--error-pulse");
        void el.offsetWidth;
        el.classList.add(kind === "success" ? "flash--success-pulse" : "flash--error-pulse");
        const onEnd = () => {
          el.removeEventListener("animationend", onEnd);
          el.classList.remove("flash--success-pulse", "flash--error-pulse");
        };
        el.addEventListener("animationend", onEnd, { once: true });
      }

      function triggerAccessShake() {
        const el = dom.accessOverlay;
        if (!el || prefersReducedMotion()) return;
        el.classList.remove("access-shake");
        void el.offsetWidth;
        el.classList.add("access-shake");
        const onEnd = () => {
          el.removeEventListener("animationend", onEnd);
          el.classList.remove("access-shake");
        };
        el.addEventListener("animationend", onEnd, { once: true });
      }

      /** Короткий звук перелистывания (ТЗ: 100–200 ms от клика) */
      function playPageTurnSound(direction) {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          const ctx = new AC();
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.connect(g);
          g.connect(ctx.destination);
          osc.frequency.value = direction === "prev" ? 360 : 520;
          osc.type = "sine";
          g.gain.setValueAtTime(0.0001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.065, ctx.currentTime + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.085);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.09);
          window.setTimeout(() => {
            ctx.close().catch(() => {});
          }, 220);
        } catch (_) {
          /* без звука — ок */
        }
      }

      /**
       * ТЗ: FLASH + CROSSFADE + LIGHT BURST; тайминг ~0 / ~150 / ~350 / ~600 ms
       */
      function runPageTurnVfx(direction) {
        if (!dom.bookImageWrap || prefersReducedMotion()) return;

        const wrap = dom.bookImageWrap;
        const burst = dom.pageLightBurst;

        wrap.classList.remove("page-turn-fx");
        if (burst) burst.classList.remove("is-animating");

        void wrap.offsetWidth;
        wrap.classList.add("page-turn-fx");

        window.setTimeout(() => {
          playPageTurnSound(direction);
        }, 150);

        window.setTimeout(() => {
          if (burst) {
            burst.classList.remove("is-animating");
            void burst.offsetWidth;
            burst.classList.add("is-animating");
          }
          triggerBookFlash("success");
        }, 320);

        window.setTimeout(() => {
          wrap.classList.remove("page-turn-fx");
          if (burst) burst.classList.remove("is-animating");
        }, 620);
      }

      function isAccessCodeValid() {
        const code = normalizeText(dom.accessWordInput.value).toLowerCase();
        return Array.isArray(CONFIG.accessCodes) && CONFIG.accessCodes.includes(code);
      }

      function clearCoverReadyUi() {
        state.coverAwaitingClick = false;
        dom.sceneStage.classList.remove("cover-ready");
      }

      function prepareCoverReadyUi() {
        state.coverAwaitingClick = true;
        dom.sceneStage.classList.add("cover-ready");
        setAccessButtonState("success");
        setLoginMessage("Нажмите на книгу", "success");
      }

      /** Длительность вспышки и энергии на обложке перед переходом в разворот */
      const COVER_OPEN_ANIM_MS = 920;

      /**
       * Клик по книге: звук и визуальная анимация сразу, затем по таймеру — переход в разворот.
       */
      function runCoverOpenAnimationAndGoToBook() {
        if (state.isEnteringBook) return;

        state.isEnteringBook = true;
        setAccessControlsDisabled(true);
        clearCoverReadyUi();
        storage.setAccessGranted();

        const audio = document.getElementById("hymnAudio");
        if (audio) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        }

        setLoginMessage("", "");
        clearCoverAnimationListeners();

        triggerSceneFlash("open");
        if (dom.sceneStage) dom.sceneStage.classList.add("scene--opening-book");
        const burst = document.getElementById("coverEnergyBurst");
        if (burst) burst.classList.add("is-active");

        window.setTimeout(() => {
          if (dom.sceneStage) dom.sceneStage.classList.remove("scene--opening-book");
          if (burst) burst.classList.remove("is-active");
          state.isEnteringBook = false;
          setAccessControlsDisabled(false);
          goToBook();
          window.dispatchEvent(new CustomEvent("vibe-book-opened"));
        }, COVER_OPEN_ANIM_MS);
      }

      function setButtonLoading(button, isLoading, loadingText = "загрузка...") {
        if (isLoading) {
          button.disabled = true;
          button.dataset.originalText = button.textContent;
          button.textContent = loadingText;
          button.setAttribute("aria-busy", "true");
          return;
        }
        button.disabled = false;
        button.textContent = button.dataset.originalText || button.textContent;
        delete button.dataset.originalText;
        button.removeAttribute("aria-busy");
      }

      function setDictionaryBusy(busy) {
        dom.dictionaryPage.setAttribute("aria-busy", busy ? "true" : "false");
      }

      /* --- Данные и действия со словами --- */
      function getTotalPages() {
        return Math.max(1, Math.ceil(state.words.length / CONFIG.wordsPerPage));
      }

      function isDuplicateWord(word, excludeId = null) {
        const normalized = word.trim().toLowerCase();
        return state.words.some((item) => {
          if (excludeId && item.id === excludeId) return false;
          const itemText = String(item.text || "").toLowerCase();
          const baseWord = itemText.split("—")[0].trim();
          return baseWord === normalized;
        });
      }

      function createWordEntry(word, description, emoji) {
        return {
          id: createId(),
          text: `${word} — ${description}`,
          emoji: emoji || "",
          likes: 0,
          reactions: defaultReactions(),
          createdAt: Date.now()
        };
      }

      function splitSavedText(text) {
        const s = String(text || "");
        const i = s.indexOf(" — ");
        if (i === -1) return { word: s.trim(), description: "" };
        return {
          word: s.slice(0, i).trim(),
          description: s.slice(i + 3).trim()
        };
      }

      function validateWordForm(word, description, excludeId = null) {
        if (!word || !description) {
          return "Введите слово и описание";
        }
        if (word.length > CONFIG.maxWordLength) {
          return `Слово должно быть не длиннее ${CONFIG.maxWordLength} символов`;
        }
        if (description.length > CONFIG.maxDescriptionLength) {
          return `Описание должно быть не длиннее ${CONFIG.maxDescriptionLength} символов`;
        }
        if (isDuplicateWord(word, excludeId)) {
          return "Такое слово уже есть";
        }
        return "";
      }

      function renderReactionRow(wordId, reactionsObj) {
        const row = document.createElement("div");
        row.className = "word-reactions";
        row.setAttribute("role", "group");
        row.setAttribute("aria-label", "Реакции читателей");
        CONFIG.reactionDefs.forEach((def) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "word-reaction-btn";
          btn.setAttribute("data-word-id", wordId);
          btn.setAttribute("data-reaction-key", def.key);
          btn.title = def.title;
          const count = reactionsObj && reactionsObj[def.key] != null ? reactionsObj[def.key] : 0;
          btn.textContent = `${def.emoji} ${count}`;
          row.appendChild(btn);
        });
        return row;
      }

      function handleReactionClick(wordId, reactionKey) {
        const item = state.words.find((w) => w.id === wordId);
        if (!item || !item.reactions || item.reactions[reactionKey] == null) return;
        item.reactions[reactionKey] += 1;
        const saved = storage.saveWords(state.words);
        if (!saved.ok) {
          item.reactions[reactionKey] -= 1;
          return;
        }
        if (state.bookMode === "write") {
          renderWriteWordList();
          renderWriteRightPane();
        } else {
          renderCurrentPage();
        }
        tzRefreshMvpScreens();
      }

      function tzRefreshMvpScreens() {
        const s4 = document.getElementById("screen4");
        const s5 = document.getElementById("screen5");
        if (s4 && s4.classList.contains("active")) renderBook();
        if (s5 && s5.classList.contains("active")) renderCatalog();
      }

      /* --- Рендер --- */
      function clearTypingTimer() {
        if (state.typingTimer) {
          clearInterval(state.typingTimer);
          state.typingTimer = null;
        }
      }


      function clearWritingTimer() {
        if (state.writingTimer) {
          clearInterval(state.writingTimer);
          state.writingTimer = null;
        }
      }

      function setBookImageByMode(mode) {
        if (!dom.bookImage) return;
        const nextSrc =
          mode === "write" ? CONFIG.images.bookWriteSource : CONFIG.images.bookViewSource;
        if (!nextSrc) return;
        if (!dom.bookImage.src.endsWith(nextSrc)) {
          dom.bookImage.src = nextSrc;
        }
      }

      function syncWriteSpreadFromWordCount() {
        const cap = CONFIG.writeWordsPerRightPage;
        state.writeSpreadPage = Math.max(1, Math.ceil(Math.max(state.words.length, 1) / cap));
      }

      function startEditWord(id) {
        const item = state.words.find((w) => w.id === id);
        if (!item) return;
        const { word, description } = splitSavedText(item.text);
        state.editingWordId = id;
        dom.wordInput.value = word;
        dom.descriptionInput.value = description;
        setWordFieldsInvalid(false);
        const n = state.words.indexOf(item) + 1;
        setFormMessage(`Редактируете запись №${n}. Сохраните изменения.`, "");
        renderWriteWordList();
        renderWriteRightPane();
        dom.wordInput.focus();
      }

      function beginEditLastSaved() {
        if (!state.words.length) {
          setFormMessage("Пока нет сохранённых слов. Сначала сохраните новую запись.", "error");
          return;
        }
        startEditWord(state.words[state.words.length - 1].id);
      }

      function renderWriteWordList() {
        const list = dom.writeWordList;
        if (!list) return;
        list.innerHTML = "";
        if (isBookBlock3()) {
          return;
        }
        state.words.forEach((item, i) => {
          const li = document.createElement("li");
          li.className = "write-word-li";
          if (state.editingWordId === item.id) li.classList.add("is-editing");

          const row = document.createElement("div");
          row.className = "write-word-li-messenger";

          const textBtn = document.createElement("button");
          textBtn.type = "button";
          textBtn.className = "write-word-li-text";
          textBtn.dataset.id = item.id;
          textBtn.textContent = `${item.emoji ? `${item.emoji} ` : ""}${item.text}`;
          textBtn.setAttribute(
            "aria-label",
            `Редактировать запись ${i + 1}: ${item.text.slice(0, 80)}`
          );

          row.appendChild(textBtn);
          row.appendChild(renderReactionRow(item.id, item.reactions || defaultReactions()));
          li.appendChild(row);
          list.appendChild(li);
        });
      }

      function renderWriteRightPane() {
        if (!dom.writingPreview || state.bookMode !== "write") return;
        if (isBookBlock3()) {
          dom.writingPreview.innerHTML = "";
          return;
        }
        clearWritingTimer();
        const cap = CONFIG.writeWordsPerRightPage;
        syncWriteSpreadFromWordCount();
        const spread = state.writeSpreadPage;
        const start = (spread - 1) * cap;
        const slice = state.words.slice(start, start + cap);
        const { word, description, text: draftFull } = buildWritingText();
        const hasDraft = Boolean(
          normalizeText(word) || normalizeText(description)
        );
        let draftNum = state.words.length + 1;
        if (state.editingWordId) {
          const ei = state.words.findIndex((w) => w.id === state.editingWordId);
          if (ei >= 0) draftNum = ei + 1;
        }

        dom.writingPreview.innerHTML = "";
        slice.forEach((item, idx) => {
          const n = start + idx + 1;
          const line = document.createElement("div");
          line.className = "word-line write-right-line";
          line.textContent = `${n}. ${item.emoji ? `${item.emoji} ` : ""}${item.text}`;
          const entry = document.createElement("div");
          entry.className = "write-right-entry";
          entry.appendChild(line);
          const react = item.reactions || defaultReactions();
          entry.appendChild(renderReactionRow(item.id, react));
          dom.writingPreview.appendChild(entry);
        });
        if (hasDraft) {
          const d = document.createElement("div");
          d.className = "word-line write-right-draft";
          d.textContent = `${draftNum}. ${draftFull}`;
          dom.writingPreview.appendChild(d);
        }
      }

      function playWriteRightPageTurn(direction) {
        if (!dom.writingPreview) return;
        if (direction === "next" || direction === "prev") {
          runPageTurnVfx(direction);
        }
        dom.writingPreview.classList.remove("turn-next", "turn-prev");
        if (direction === "none" || prefersReducedMotion()) {
          return;
        }
        void dom.writingPreview.offsetWidth;
        if (direction === "next") {
          dom.writingPreview.classList.add("turn-next");
        } else if (direction === "prev") {
          dom.writingPreview.classList.add("turn-prev");
        }
        const onEnd = (ev) => {
          if (ev.target !== dom.writingPreview) return;
          dom.writingPreview.removeEventListener("animationend", onEnd);
          dom.writingPreview.classList.remove("turn-next", "turn-prev");
        };
        dom.writingPreview.addEventListener("animationend", onEnd, { once: true });
      }

      /** Логотип AI: только screen4–5. screen1 открытая книга и screen3 — логотип на картинке, без #tzVibeAiBrand */
      function syncVibeBrandOverlay() {
        const id = document.body.dataset.activeScreen || "screen1";
        const brand = document.getElementById("tzVibeAiBrand");
        const rings = document.getElementById("tzGlobalMagicRings");
        const s1 = document.getElementById("screen1");
        const st = document.getElementById("sceneStage");
        const bookOpen = st && st.classList.contains("scene--book-open");
        const brandShow = id === "screen4" || id === "screen5";
        const ringsShow =
          id === "screen3" ||
          id === "screen4" ||
          id === "screen5" ||
          (id === "screen1" && s1 && s1.classList.contains("active") && bookOpen);
        if (brand) {
          brand.classList.toggle("tz-vibe-ai-brand--visible", brandShow);
          brand.setAttribute("aria-hidden", brandShow ? "false" : "true");
        }
        if (rings) {
          rings.classList.toggle("magic-rings-fx--global--visible", ringsShow);
        }
      }

      function closeBookToCover() {
        clearWritingTimer();
        clearTypingTimer();
        state.editingWordId = null;
        state.bookMode = "view";
        state.writeSpreadPage = 1;
        if (dom.viewMode) dom.viewMode.classList.add("is-active");
        if (dom.writeMode) dom.writeMode.classList.remove("is-active");
        if (dom.bookImage) dom.bookImage.src = CONFIG.images.bookViewSource;
        if (dom.bookImageWrap) dom.bookImageWrap.classList.remove("book-mode--write-active");
        dom.sceneStage.classList.remove("scene--book-open", "scene--step2-visual");
        if (dom.bookOpenLayer) {
          dom.bookOpenLayer.classList.add("hidden");
          dom.bookOpenLayer.setAttribute("hidden", "");
          dom.bookOpenLayer.setAttribute("aria-hidden", "true");
        }
        if (dom.accessOverlay) {
          dom.accessOverlay.removeAttribute("hidden");
        }
        syncVibeBrandOverlay();
      }

      function switchBookMode(mode) {
        state.bookMode = mode === "write" ? "write" : "view";
        setBookImageByMode(state.bookMode);
        if (dom.viewMode) {
          dom.viewMode.classList.toggle("is-active", state.bookMode === "view");
        }
        if (dom.writeMode) {
          dom.writeMode.classList.toggle("is-active", state.bookMode === "write");
        }
        if (dom.bookImageWrap) {
          dom.bookImageWrap.classList.toggle("book-mode--write-active", state.bookMode === "write");
        }

        if (state.bookMode === "write") {
          syncWriteSpreadFromWordCount();
          renderWriteWordList();
          renderWriteRightPane();
          dom.wordInput.focus();
        } else if (state.bookMode === "view") {
          clearWritingTimer();
          renderCurrentPage();
        }
      }

      function updatePagination(totalPages) {
        dom.pageCounter.textContent = `${state.currentPage} / ${totalPages}`;
        dom.prevBtn.disabled = state.currentPage === 1;
        dom.nextBtn.disabled = state.currentPage === totalPages;
      }

      function playPageAnimation(direction) {
        if (direction === "next" || direction === "prev") {
          runPageTurnVfx(direction);
        }

        dom.dictionaryPage.classList.remove("turn-next", "turn-prev");

        if (direction === "none" || prefersReducedMotion()) {
          return;
        }

        void dom.dictionaryPage.offsetWidth;

        if (direction === "next") {
          dom.dictionaryPage.classList.add("turn-next");
        } else if (direction === "prev") {
          dom.dictionaryPage.classList.add("turn-prev");
        }

        const onEnd = (ev) => {
          if (ev.target !== dom.dictionaryPage) return;
          dom.dictionaryPage.removeEventListener("animationend", onEnd);
          dom.dictionaryPage.classList.remove("turn-next", "turn-prev");
        };
        dom.dictionaryPage.addEventListener("animationend", onEnd, { once: true });
      }

      function runTypeWriter(element, text, speed) {
        let index = 0;
        element.textContent = "";

        state.typingTimer = window.setInterval(() => {
          if (index >= text.length) {
            clearTypingTimer();
            element.classList.remove("typing");
            return;
          }
          element.textContent += text.charAt(index);
          index += 1;
        }, speed);
      }

      function syncLiveWritingPreview() {
        renderWriteRightPane();
      }

      /**
       * Рисует текущую страницу словаря.
       * Исправлено: при анимации печати новой строки остальные строки страницы тоже отображаются.
       */
      function renderCurrentPage(options = {}) {
        const animateId = options.animateId != null ? options.animateId : null;
        const turnDirection = options.turnDirection || "none";

        clearTypingTimer();
        setDictionaryBusy(true);

        const totalPages = getTotalPages();
        const startIndex = (state.currentPage - 1) * CONFIG.wordsPerPage;
        const endIndex = startIndex + CONFIG.wordsPerPage;
        const wordsForPage = state.words.slice(startIndex, endIndex);
        state.currentPageWords = wordsForPage.slice();

        updatePagination(totalPages);
        playPageAnimation(turnDirection);
        dom.dictionaryPage.innerHTML = "";

        if (wordsForPage.length === 0) {
          const empty = document.createElement("p");
          empty.className = "empty-note";
          empty.textContent = "Пока здесь пусто...";
          dom.dictionaryPage.appendChild(empty);
          setDictionaryBusy(false);
          return;
        }

        const fragment = document.createDocumentFragment();
        let typingTarget = null;
        let typingText = null;

        wordsForPage.forEach((item, index) => {
          const wrap = document.createElement("div");
          wrap.className = "dictionary-entry-wrap";
          const line = document.createElement("div");
          line.className = "word-line";
          const text = `${startIndex + index + 1}. ${item.emoji ? `${item.emoji} ` : ""}${item.text}`;

          if (item.id === animateId) {
            line.classList.add("typing");
            typingTarget = line;
            typingText = text;
          } else {
            line.textContent = text;
          }
          wrap.appendChild(line);
          if (!isBookBlock3()) {
            wrap.appendChild(renderReactionRow(item.id, item.reactions || defaultReactions()));
          }
          fragment.appendChild(wrap);
        });

        dom.dictionaryPage.appendChild(fragment);

        if (typingTarget && typingText) {
          const typingMs = prefersReducedMotion() ? 0 : CONFIG.typingSpeed;
          if (typingMs === 0) {
            typingTarget.textContent = typingText;
            typingTarget.classList.remove("typing");
          } else {
            runTypeWriter(typingTarget, typingText, typingMs);
          }
        }

        setDictionaryBusy(false);
      }

      function changePage(step) {
        const nextPage = state.currentPage + step;
        const totalPages = getTotalPages();

        if (nextPage < 1 || nextPage > totalPages) return;

        state.currentPage = nextPage;

        renderCurrentPage({
          turnDirection: step > 0 ? "next" : "prev"
        });
      }

      function resetWordForm() {
        state.editingWordId = null;
        dom.wordInput.value = "";
        dom.descriptionInput.value = "";
        setWordFieldsInvalid(false);
        if (dom.writeWordList) {
          dom.writeWordList.querySelectorAll(".write-word-li.is-editing").forEach((el) => {
            el.classList.remove("is-editing");
          });
        }
        dom.wordInput.focus();
      }

      function buildWritingText() {
        const word = normalizeText(dom.wordInput.value);
        const description = normalizeText(dom.descriptionInput.value);
        const text = `${word}${description ? ` — ${description}` : ""}`.trim();
        return { word, description, emoji: "", text };
      }

      function handleAddWord() {
        const { word, description, emoji } = buildWritingText();
        const excludeId = state.editingWordId;

        const validationError = validateWordForm(word, description, excludeId);
        if (validationError) {
          setFormMessage(validationError, "error");
          setWordFieldsInvalid(true);
          return;
        }

        setWordFieldsInvalid(false);
        setButtonLoading(dom.saveBtn, true, "пишем...");

        if (state.editingWordId) {
          const idx = state.words.findIndex((w) => w.id === state.editingWordId);
          if (idx === -1) {
            state.editingWordId = null;
            setButtonLoading(dom.saveBtn, false);
            setFormMessage("Запись не найдена. Начните снова.", "error");
            return;
          }
          const prev = state.words[idx];
          state.words[idx] = {
            ...prev,
            text: `${word} — ${description}`,
            emoji: emoji || prev.emoji || ""
          };
          const saved = storage.saveWords(state.words);
          if (!saved.ok) {
            state.words[idx] = prev;
            setButtonLoading(dom.saveBtn, false);
            setFormMessage(saved.message || "Не удалось сохранить изменения.", "error");
            return;
          }
          resetWordForm();
          setFormMessage("Изменения сохранены", "success");
          renderWriteWordList();
          renderWriteRightPane();
          setButtonLoading(dom.saveBtn, false);
          tzRefreshMvpScreens();
          return;
        }

        const spreadBefore = state.writeSpreadPage;
        const newWord = createWordEntry(word, description, emoji);
        state.words.push(newWord);

        const saved = storage.saveWords(state.words);
        if (!saved.ok) {
          state.words.pop();
          setButtonLoading(dom.saveBtn, false);
          setFormMessage(saved.message || "Не удалось сохранить слово.", "error");
          return;
        }

        syncWriteSpreadFromWordCount();
        if (state.writeSpreadPage > spreadBefore) {
          playWriteRightPageTurn("next");
        }

        resetWordForm();
        setFormMessage("Слово вписано", "success");
        renderWriteWordList();
        renderWriteRightPane();

        setButtonLoading(dom.saveBtn, false);
        tzRefreshMvpScreens();
      }

      /**
       * Шаг 2 (визуальный): физически удаляем форму и словарь из DOM.
       * Оставляем только картинку и все декоративные эффекты.
       */
      function pruneBookUiForStep2() {
        // UI формы скрывается CSS-классом scene--step2-visual; DOM не удаляем,
        // чтобы можно было перейти к заполнению по клику на плашку.
        if (!dom.bookImageWrap) return;
      }

      function goToBook() {
        clearCoverAnimationListeners();
        state.isEnteringBook = false;
        setAccessControlsDisabled(false);

        dom.sceneStage.classList.add("scene--book-open");
        dom.sceneStage.classList.add("scene--step2-visual");
        dom.bookOpenLayer.classList.remove("hidden");
        dom.bookOpenLayer.removeAttribute("hidden");
        dom.bookOpenLayer.setAttribute("aria-hidden", "false");
        dom.accessOverlay.setAttribute("hidden", "");

        if (dom.sceneStage.classList.contains("scene--step2-visual")) {
          pruneBookUiForStep2();
          state.words = storage.loadWords();
          state.isBookInitialized = true;
          syncVibeBrandOverlay();
          return;
        }
        initBook();
      }

      function showBookInstantly() {
        dom.sceneStage.classList.add("scene--book-open");
        dom.sceneStage.classList.add("scene--step2-visual");
        dom.bookOpenLayer.classList.remove("hidden");
        dom.bookOpenLayer.removeAttribute("hidden");
        dom.bookOpenLayer.setAttribute("aria-hidden", "false");
        dom.accessOverlay.setAttribute("hidden", "");
        if (dom.sceneStage.classList.contains("scene--step2-visual")) {
          pruneBookUiForStep2();
          state.words = storage.loadWords();
          state.isBookInitialized = true;
          syncVibeBrandOverlay();
          return;
        }
        initBook();
      }

      function initBook() {
        if (!state.isBookInitialized) {
          state.words = storage.loadWords();
          state.currentPage = getTotalPages();
          state.isBookInitialized = true;
        }

        renderCurrentPage();
        setFormMessage("", "");
        switchBookMode("view");
      }

      function handleAccessSubmit(e) {
        e.preventDefault();
        if (state.isEnteringBook) return;

        if (!isAccessCodeValid()) {
          attempts += 1;
          setAccessButtonState("error");
          setAccessFieldInvalid(true);
          clearCoverReadyUi();
          triggerAccessShake();
          triggerSceneFlash("error");
          showAccessErrorMessage();
          return;
        }

        attempts = 0;
        setAccessFieldInvalid(false);
        setAccessButtonState("default");
        dom.accessWordInput.disabled = true;
        if (dom.accessSubmitBtn) dom.accessSubmitBtn.disabled = true;
        dom.accessForm.setAttribute("aria-busy", "true");
        setLoginMessage("Пароль загружается…", "");

        window.setTimeout(() => {
          dom.accessWordInput.disabled = false;
          if (dom.accessSubmitBtn) dom.accessSubmitBtn.disabled = false;
          dom.accessForm.setAttribute("aria-busy", "false");
          triggerSceneFlash("success");
          prepareCoverReadyUi();
        }, 420);
      }

      /** Открытие книги — только клик по зоне книги (#bookHitZone), не по всей сцене */
      function handleBookOpenClick(e) {
        if (dom.sceneStage.classList.contains("scene--book-open")) return;
        e.preventDefault();
        if (state.isEnteringBook) return;

        if (state.coverAwaitingClick) {
          runCoverOpenAnimationAndGoToBook();
          return;
        }

        if (!isAccessCodeValid()) {
          attempts += 1;
          setAccessButtonState("error");
          setAccessFieldInvalid(true);
          triggerAccessShake();
          triggerSceneFlash("error");
          showAccessErrorMessage();
          return;
        }

        attempts = 0;
        setAccessFieldInvalid(false);
        prepareCoverReadyUi();
      }

      function bindDecorativeImages() {
        setupImageSourceChain(dom.sceneBg, dom.sceneBgWrap, CONFIG.images.coverSources);
        setupImageSourceChain(dom.bookImage, dom.bookImageWrap, CONFIG.images.bookSources);
      }

      function bindEvents() {
        dom.accessForm.addEventListener("submit", handleAccessSubmit);

        dom.bookHitZone.addEventListener("click", handleBookOpenClick);
        if (dom.bookCtaBanner) {
          dom.bookCtaBanner.addEventListener("click", () => {
            if (!dom.sceneStage.classList.contains("scene--book-open")) return;
            if (window.parent && window.parent !== window) {
              try {
                window.parent.postMessage({ type: "SLOVAR_OPEN_FORM" }, window.location.origin);
              } catch (e) {
                window.parent.postMessage({ type: "SLOVAR_OPEN_FORM" }, "*");
              }
              return;
            }
            window.location.assign(getMagicBookFormUrl());
          });
          dom.bookCtaBanner.addEventListener("keydown", (e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            dom.bookCtaBanner.click();
          });
        }
        dom.accessWordInput.addEventListener("input", () => {
          if (dom.accessWordInput.getAttribute("aria-invalid") === "true") {
            setAccessFieldInvalid(false);
          }
          setAccessButtonState("default");
          if (state.coverAwaitingClick) {
            clearCoverReadyUi();
            setLoginMessage("", "");
          }
        });

        dom.wordForm.addEventListener("submit", (e) => {
          e.preventDefault();
          handleAddWord();
        });

        if (dom.writeBtn) {
          dom.writeBtn.addEventListener("click", beginEditLastSaved);
        }

        if (dom.writeWordList) {
          dom.writeWordList.addEventListener("click", (e) => {
            if (e.target.closest(".word-reaction-btn")) return;
            const tb = e.target.closest(".write-word-li-text");
            if (!tb || !tb.dataset.id) return;
            startEditWord(tb.dataset.id);
          });
        }

        function bindReactionClicks(container) {
          if (!container) return;
          container.addEventListener("click", (e) => {
            const btn = e.target.closest(".word-reaction-btn");
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            const wid = btn.getAttribute("data-word-id");
            const key = btn.getAttribute("data-reaction-key");
            if (wid && key) handleReactionClick(wid, key);
          });
        }
        bindReactionClicks(dom.writingPreview);
        bindReactionClicks(dom.dictionaryPage);
        bindReactionClicks(dom.writeWordList);
        const tzCatalogGrid = document.getElementById("tzCatalogGrid");
        const tzPageLeft = document.getElementById("tzPageLeft");
        if (tzCatalogGrid) bindReactionClicks(tzCatalogGrid);
        if (tzPageLeft) {
          const tzFlipRoot = document.getElementById("tzFlipBook");
          if (tzFlipRoot) bindReactionClicks(tzFlipRoot);
        }

        if (dom.writeNextBtn) {
          dom.writeNextBtn.addEventListener("click", () => {
            switchBookMode("view");
          });
        }

        if (dom.closeBookBtn) {
          dom.closeBookBtn.addEventListener("click", () => {
            closeBookToCover();
          });
        }

        dom.wordInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            dom.descriptionInput.focus();
          }
        });

        dom.wordInput.addEventListener("input", () => {
          if (dom.wordInput.getAttribute("aria-invalid") === "true") {
            setWordFieldsInvalid(false);
            setFormMessage("", "");
          }
          syncLiveWritingPreview();
        });

        dom.descriptionInput.addEventListener("input", () => {
          if (dom.descriptionInput.getAttribute("aria-invalid") === "true") {
            setWordFieldsInvalid(false);
            setFormMessage("", "");
          }
          syncLiveWritingPreview();
        });

        dom.descriptionInput.addEventListener("keydown", (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            handleAddWord();
          }
        });

        dom.        prevBtn.addEventListener("click", () => changePage(-1));
        dom.nextBtn.addEventListener("click", () => changePage(1));
      }

      /**
       * Фон «dynamic wave» (порт HeroWave / React): один мастер-кадр на requestAnimationFrame,
       * копирование на все .wave-canvas-bg — плашка CTA и карточки каталога.
       */
      const WAVE_SIN_TABLE = new Float32Array(1024);
      const WAVE_COS_TABLE = new Float32Array(1024);
      for (let wi = 0; wi < 1024; wi++) {
        const ang = (wi / 1024) * Math.PI * 2;
        WAVE_SIN_TABLE[wi] = Math.sin(ang);
        WAVE_COS_TABLE[wi] = Math.cos(ang);
      }
      function waveFastSin(x) {
        const idx = Math.floor(((x % (Math.PI * 2)) / (Math.PI * 2)) * 1024) & 1023;
        return WAVE_SIN_TABLE[idx];
      }
      function waveFastCos(x) {
        const idx = Math.floor(((x % (Math.PI * 2)) / (Math.PI * 2)) * 1024) & 1023;
        return WAVE_COS_TABLE[idx];
      }

      const WAVE_MASTER_W = 200;
      const WAVE_MASTER_H = 112;
      const WAVE_SCALE = 2;
      let waveMasterCanvas = null;
      let waveMasterCtx = null;
      let waveMasterImageData = null;
      let waveMasterData = null;
      let waveMasterStartMs = 0;
      const waveConsumerSet = new Set();
      let waveRafId = 0;

      function waveEnsureMaster() {
        if (waveMasterCanvas) return;
        waveMasterCanvas = document.createElement("canvas");
        waveMasterCanvas.width = WAVE_MASTER_W;
        waveMasterCanvas.height = WAVE_MASTER_H;
        waveMasterCtx = waveMasterCanvas.getContext("2d");
        if (!waveMasterCtx) return;
        const bw = Math.floor(WAVE_MASTER_W / WAVE_SCALE);
        const bh = Math.floor(WAVE_MASTER_H / WAVE_SCALE);
        waveMasterImageData = waveMasterCtx.createImageData(bw, bh);
        waveMasterData = waveMasterImageData.data;
      }

      function waveRenderMaster(timeSec) {
        waveEnsureMaster();
        if (!waveMasterCtx || !waveMasterImageData || !waveMasterData) return;
        const width = Math.floor(WAVE_MASTER_W / WAVE_SCALE);
        const height = Math.floor(WAVE_MASTER_H / WAVE_SCALE);
        const data = waveMasterData;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const u_x = (2 * x - width) / height;
            const u_y = (2 * y - height) / height;
            let a = 0;
            let d = 0;
            for (let i = 0; i < 4; i++) {
              a += waveFastCos(i - d + timeSec * 0.5 - a * u_x);
              d += waveFastSin(i * u_y + a);
            }
            const wave = (waveFastSin(a) + waveFastCos(d)) * 0.5;
            const intensity = 0.3 + 0.4 * wave;
            const baseVal = 0.1 + 0.15 * waveFastCos(u_x + u_y + timeSec * 0.3);
            const blueAccent = 0.2 * waveFastSin(a * 1.5 + timeSec * 0.2);
            const purpleAccent = 0.15 * waveFastCos(d * 2 + timeSec * 0.1);
            const r = Math.max(0, Math.min(1, baseVal + purpleAccent * 0.8)) * intensity;
            const g = Math.max(0, Math.min(1, baseVal + blueAccent * 0.6)) * intensity;
            const b = Math.max(0, Math.min(1, baseVal + blueAccent * 1.2 + purpleAccent * 0.4)) * intensity;
            const index = (y * width + x) * 4;
            data[index] = r * 255;
            data[index + 1] = g * 255;
            data[index + 2] = b * 255;
            data[index + 3] = 255;
          }
        }
        waveMasterCtx.putImageData(waveMasterImageData, 0, 0);
        if (WAVE_SCALE > 1) {
          waveMasterCtx.imageSmoothingEnabled = false;
          waveMasterCtx.drawImage(
            waveMasterCanvas,
            0,
            0,
            width,
            height,
            0,
            0,
            WAVE_MASTER_W,
            WAVE_MASTER_H
          );
        }
      }

      function waveResizeConsumer(canvas) {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const cw = Math.max(1, Math.floor(rect.width * dpr));
        const ch = Math.max(1, Math.floor(rect.height * dpr));
        if (canvas.width !== cw || canvas.height !== ch) {
          canvas.width = cw;
          canvas.height = ch;
        }
      }

      function waveDrawConsumersStatic(timeSec) {
        waveRenderMaster(timeSec);
        if (!waveMasterCanvas) return;
        waveConsumerSet.forEach((canvas) => {
          if (!(canvas instanceof HTMLCanvasElement) || !canvas.isConnected) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          waveResizeConsumer(canvas);
          ctx.imageSmoothingEnabled = true;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(waveMasterCanvas, 0, 0, canvas.width, canvas.height);
        });
      }

      function waveFrame() {
        waveRafId = 0;
        const stale = [];
        waveConsumerSet.forEach((c) => {
          if (!c.isConnected) stale.push(c);
        });
        stale.forEach((c) => waveConsumerSet.delete(c));
        if (waveConsumerSet.size === 0) return;

        const timeSec = prefersReducedMotion()
          ? 0
          : (Date.now() - waveMasterStartMs) * 0.001;
        waveRenderMaster(timeSec);
        if (!waveMasterCanvas) return;

        waveConsumerSet.forEach((canvas) => {
          if (!(canvas instanceof HTMLCanvasElement)) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          waveResizeConsumer(canvas);
          ctx.imageSmoothingEnabled = true;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(waveMasterCanvas, 0, 0, canvas.width, canvas.height);
        });

        if (!prefersReducedMotion() && waveConsumerSet.size > 0) {
          waveRafId = requestAnimationFrame(waveFrame);
        }
      }

      function syncWaveCanvasConsumers() {
        document.querySelectorAll(".wave-canvas-bg").forEach((node) => {
          if (node instanceof HTMLCanvasElement) waveConsumerSet.add(node);
        });
        waveEnsureMaster();
        if (!waveMasterCtx) return;
        if (waveMasterStartMs === 0) waveMasterStartMs = Date.now();

        if (prefersReducedMotion()) {
          waveDrawConsumersStatic(0);
          return;
        }
        if (!waveRafId && waveConsumerSet.size > 0) {
          waveRafId = requestAnimationFrame(waveFrame);
        }
      }

      window.addEventListener("resize", () => {
        if (prefersReducedMotion()) {
          syncWaveCanvasConsumers();
        }
      });

      /**
       * Аналог @paper-design/shaders-react GrainGradient: без npm, Canvas 2D.
       * Параметры как в промпте: чёрный фон, мягкие пятна в углах, HSL-палитра, speed.
       * Обложка сцены: #grainShaderBg.
       */
      function initGrainShaderBackground() {
        function initOneGrainShader(containerId, canvasId, grainOptions) {
          const container = document.getElementById(containerId);
          const canvas = document.getElementById(canvasId);
          if (!container || !canvas) return function noop() {};

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            container.setAttribute("hidden", "");
            return function noop() {};
          }

          if (prefersReducedMotion()) {
            if (grainOptions && grainOptions.primaryScene && dom.sceneStage) {
              dom.sceneStage.classList.add("grain-shader-off");
            }
            container.setAttribute("hidden", "");
            return function noop() {};
          }

          const intensity = 0.28;
          const softness = 0.76;
          const speed = 0.72;
          const colors = [
            { h: 14, s: 100, l: 57 },
            { h: 45, s: 100, l: 51 },
            { h: 340, s: 82, l: 52 }
          ];

          let dpr = 1;
          let raf = 0;
          let running = true;

          function resize() {
            const rect = container.getBoundingClientRect();
            dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
            const cw = Math.max(1, Math.floor(rect.width * dpr));
            const ch = Math.max(1, Math.floor(rect.height * dpr));
            canvas.width = cw;
            canvas.height = ch;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
          }

          function hsla(c, a) {
            return `hsla(${c.h}, ${c.s}%, ${c.l}%, ${a})`;
          }

          function drawCorner(cx, cy, r, colorIndex, tOff, wPx, hPx) {
            const c = colors[colorIndex % colors.length];
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            const pulse = 0.92 + 0.08 * Math.sin(tOff);
            g.addColorStop(0, hsla(c, intensity * pulse));
            g.addColorStop(0.38, hsla(c, intensity * 0.42 * pulse));
            g.addColorStop(0.72, hsla(c, intensity * 0.12));
            g.addColorStop(1, "hsla(0, 0%, 0%, 0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, wPx, hPx);
          }

          function frame(now) {
            if (!running) return;
            const wPx = canvas.width / dpr;
            const hPx = canvas.height / dpr;
            if (wPx < 2 || hPx < 2) {
              raf = requestAnimationFrame(frame);
              return;
            }

            const t = now * 0.00012 * speed;
            const ox = Math.sin(t * 0.55) * wPx * 0.028;
            const oy = Math.cos(t * 0.48) * hPx * 0.024;
            const baseR = Math.min(wPx, hPx) * (0.34 + softness * 0.36);

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = "hsl(0, 0%, 0%)";
            ctx.fillRect(0, 0, wPx, hPx);

            ctx.globalCompositeOperation = "screen";
            drawCorner(wPx * 0.18 + ox, hPx * 0.2 + oy, baseR, 0, t, wPx, hPx);
            drawCorner(wPx * 0.82 - ox, hPx * 0.22 + oy, baseR * 0.98, 1, t + 1.2, wPx, hPx);
            drawCorner(wPx * 0.78 + ox, hPx * 0.8 - oy, baseR * 0.95, 2, t + 2.1, wPx, hPx);
            drawCorner(wPx * 0.22 - ox, hPx * 0.78 - oy, baseR * 0.92, 0, t + 0.7, wPx, hPx);

            ctx.globalCompositeOperation = "source-over";
            raf = requestAnimationFrame(frame);
          }

          resize();
          window.addEventListener("resize", resize, { passive: true });
          let ro = null;
          if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(resize);
            ro.observe(container);
          }
          raf = requestAnimationFrame(frame);

          return function disposeOneGrain() {
            running = false;
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", resize);
            if (ro) ro.disconnect();
          };
        }

        const disposeGrain1 = initOneGrainShader("grainShaderBg", "grainShaderCanvas", {
          primaryScene: true
        });
        return function disposeGrainShaderAll() {
          disposeGrain1();
        };
      }

      /**
       * Адаптация @react-bits/MagicRings под текущий проект (vanilla JS + WebGL2).
       * Эффект курсора в неоновой палитре сайта: слой обложки (#sceneStage).
       */
      function initMagicRingsFor(containerId, canvasId, stage, ringOptions) {
        const container = document.getElementById(containerId);
        const canvas = document.getElementById(canvasId);
        const opts = ringOptions || {};
        const globalViewport = Boolean(opts.globalViewport);
        /** Сила «вспышки» колец при клике (как на обложке); для полноэкранного слоя — сильнее */
        const burstImpulse = typeof opts.burstImpulse === "number" ? opts.burstImpulse : 1;
        if (!container || !canvas || (!stage && !globalViewport)) return function noop() {};

        if (prefersReducedMotion()) {
          container.setAttribute("hidden", "");
          return function noop() {};
        }

        const gl = canvas.getContext("webgl2", {
          alpha: true,
          antialias: true,
          premultipliedAlpha: false
        });
        if (!gl) {
          container.setAttribute("hidden", "");
          return function noop() {};
        }

        const props = {
          color: "#fc42ff",
          colorTwo: "#42fcff",
          ringCount: 6,
          speed: 0.38,
          attenuation: 10,
          lineThickness: 2,
          baseRadius: 0.35,
          radiusStep: 0.1,
          scaleRate: 0.07,
          opacity: 1,
          noiseAmount: 0.035,
          rotation: 0,
          ringGap: 1.5,
          fadeIn: 0.7,
          fadeOut: 0.5,
          followMouse: true,
          mouseInfluence: 0.2,
          hoverScale: 1.2,
          parallax: 0.05,
          clickBurst: true
        };

        const vertexShaderSource = `#version 300 es
precision highp float;
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

        const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 O;

uniform float uTime, uAttenuation, uLineThickness;
uniform float uBaseRadius, uRadiusStep, uScaleRate;
uniform float uOpacity, uNoiseAmount, uRotation, uRingGap;
uniform float uFadeIn, uFadeOut;
uniform float uMouseInfluence, uHoverAmount, uHoverScale, uParallax, uBurst;
uniform vec2 uResolution, uMouse;
uniform vec3 uColor, uColorTwo;
uniform int uRingCount;

const float HP = 1.5707963;
const float CYCLE = 3.45;

float fadeAnim(float t) {
  return t < uFadeIn ? smoothstep(0.0, uFadeIn, t) : 1.0 - smoothstep(uFadeOut, CYCLE - 0.2, t);
}

float ring(vec2 p, float ri, float cut, float t0, float px) {
  float t = mod(uTime + t0, CYCLE);
  float r = ri + t / CYCLE * uScaleRate;
  float d = abs(length(p) - r);
  float a = atan(abs(p.y), abs(p.x)) / HP;
  float th = max(1.0 - a, 0.5) * px * uLineThickness;
  float h = (1.0 - smoothstep(th, th * 1.5, d)) + 1.0;
  d += pow(cut * a, 3.0) * r;
  return h * exp(-uAttenuation * d) * fadeAnim(t);
}

void main() {
  float px = 1.0 / min(uResolution.x, uResolution.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) * px;
  float cr = cos(uRotation), sr = sin(uRotation);
  p = mat2(cr, -sr, sr, cr) * p;
  p -= uMouse * uMouseInfluence;
  float sc = mix(1.0, uHoverScale, uHoverAmount) + uBurst * 0.3;
  p /= sc;
  vec3 c = vec3(0.0);
  float rcf = max(float(uRingCount) - 1.0, 1.0);
  for (int i = 0; i < 10; i++) {
    if (i >= uRingCount) break;
    float fi = float(i);
    vec2 pr = p - fi * uParallax * uMouse;
    vec3 rc = mix(uColor, uColorTwo, fi / rcf);
    float rv = ring(pr, uBaseRadius + fi * uRadiusStep, pow(uRingGap, fi), i == 0 ? 0.0 : 2.95 * fi, px);
    c = mix(c, rc, vec3(rv));
  }
  c *= 1.0 + uBurst * 2.0;
  float n = fract(sin(dot(gl_FragCoord.xy + uTime * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
  c += (n - 0.5) * uNoiseAmount;
  O = vec4(c, max(c.r, max(c.g, c.b)) * uOpacity);
}`;

        function compile(type, source) {
          const shader = gl.createShader(type);
          if (!shader) return null;
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            gl.deleteShader(shader);
            return null;
          }
          return shader;
        }

        const vs = compile(gl.VERTEX_SHADER, vertexShaderSource);
        const fs = compile(gl.FRAGMENT_SHADER, fragmentShaderSource);
        if (!vs || !fs) {
          if (vs) gl.deleteShader(vs);
          if (fs) gl.deleteShader(fs);
          container.setAttribute("hidden", "");
          return function noop() {};
        }

        const program = gl.createProgram();
        if (!program) {
          gl.deleteShader(vs);
          gl.deleteShader(fs);
          container.setAttribute("hidden", "");
          return function noop() {};
        }
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          gl.deleteProgram(program);
          gl.deleteShader(vs);
          gl.deleteShader(fs);
          container.setAttribute("hidden", "");
          return function noop() {};
        }
        gl.useProgram(program);

        const pos = gl.getAttribLocation(program, "position");
        const vbo = gl.createBuffer();
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);

        function u(name) {
          return gl.getUniformLocation(program, name);
        }

        const uniforms = {
          time: u("uTime"),
          attenuation: u("uAttenuation"),
          lineThickness: u("uLineThickness"),
          baseRadius: u("uBaseRadius"),
          radiusStep: u("uRadiusStep"),
          scaleRate: u("uScaleRate"),
          opacity: u("uOpacity"),
          noiseAmount: u("uNoiseAmount"),
          rotation: u("uRotation"),
          ringGap: u("uRingGap"),
          fadeIn: u("uFadeIn"),
          fadeOut: u("uFadeOut"),
          mouseInfluence: u("uMouseInfluence"),
          hoverAmount: u("uHoverAmount"),
          hoverScale: u("uHoverScale"),
          parallax: u("uParallax"),
          burst: u("uBurst"),
          resolution: u("uResolution"),
          mouse: u("uMouse"),
          color: u("uColor"),
          colorTwo: u("uColorTwo"),
          ringCount: u("uRingCount")
        };

        function hexToRgb(hex) {
          const value = String(hex || "").trim().replace("#", "");
          const full = value.length === 3 ? value.split("").map((ch) => ch + ch).join("") : value;
          if (!/^[0-9a-fA-F]{6}$/.test(full)) return [1, 1, 1];
          return [
            parseInt(full.slice(0, 2), 16) / 255,
            parseInt(full.slice(2, 4), 16) / 255,
            parseInt(full.slice(4, 6), 16) / 255
          ];
        }

        const colorA = hexToRgb(props.color);
        const colorB = hexToRgb(props.colorTwo);
        const mouse = [0, 0];
        const smoothMouse = [0, 0];
        let hover = 0;
        let isHovered = false;
        let burst = 0;
        let raf = 0;
        let dpr = 1;

        function getStageRect() {
          if (globalViewport) {
            return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
          }
          return stage.getBoundingClientRect();
        }

        function resize() {
          const rect = container.getBoundingClientRect();
          dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
          const w = Math.max(1, Math.floor(rect.width * dpr));
          const h = Math.max(1, Math.floor(rect.height * dpr));
          canvas.width = w;
          canvas.height = h;
          canvas.style.width = `${rect.width}px`;
          canvas.style.height = `${rect.height}px`;
          gl.viewport(0, 0, w, h);
        }

        function onMouseMove(e) {
          const r = getStageRect();
          mouse[0] = (e.clientX - r.left) / r.width - 0.5;
          mouse[1] = -((e.clientY - r.top) / r.height - 0.5);
        }
        function onMouseEnter() {
          isHovered = true;
        }
        function onMouseLeave() {
          isHovered = false;
          mouse[0] = 0;
          mouse[1] = 0;
        }
        function triggerBurst() {
          if (props.clickBurst) burst = burstImpulse;
        }

        function onPointerDown() {
          triggerBurst();
        }

        if (globalViewport) {
          window.addEventListener("mousemove", onMouseMove, { passive: true });
          window.addEventListener("pointerdown", onPointerDown, { passive: true });
          window.addEventListener("resize", resize, { passive: true });
        } else {
          stage.addEventListener("mousemove", onMouseMove);
          stage.addEventListener("mouseenter", onMouseEnter);
          stage.addEventListener("mouseleave", onMouseLeave);
          stage.addEventListener("pointerdown", onPointerDown, { passive: true });
          window.addEventListener("resize", resize, { passive: true });
        }
        let ro = null;
        if (typeof ResizeObserver !== "undefined") {
          ro = new ResizeObserver(resize);
          ro.observe(container);
        }
        resize();

        function draw(now) {
          raf = requestAnimationFrame(draw);

          if (globalViewport) {
            isHovered = true;
          }

          smoothMouse[0] += (mouse[0] - smoothMouse[0]) * 0.045;
          smoothMouse[1] += (mouse[1] - smoothMouse[1]) * 0.045;
          hover += ((isHovered ? 1 : 0) - hover) * 0.05;
          burst *= globalViewport ? 0.92 : 0.95;
          if (burst < 0.001) burst = 0;

          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.useProgram(program);
          gl.bindVertexArray(vao);

          gl.uniform1f(uniforms.time, now * 0.001 * props.speed);
          gl.uniform1f(uniforms.attenuation, props.attenuation);
          gl.uniform1f(uniforms.lineThickness, props.lineThickness);
          gl.uniform1f(uniforms.baseRadius, props.baseRadius);
          gl.uniform1f(uniforms.radiusStep, props.radiusStep);
          gl.uniform1f(uniforms.scaleRate, props.scaleRate);
          gl.uniform1f(uniforms.opacity, props.opacity);
          gl.uniform1f(uniforms.noiseAmount, props.noiseAmount);
          gl.uniform1f(uniforms.rotation, (props.rotation * Math.PI) / 180);
          gl.uniform1f(uniforms.ringGap, props.ringGap);
          gl.uniform1f(uniforms.fadeIn, props.fadeIn);
          gl.uniform1f(uniforms.fadeOut, props.fadeOut);
          gl.uniform1f(uniforms.mouseInfluence, props.followMouse ? props.mouseInfluence : 0);
          gl.uniform1f(uniforms.hoverAmount, hover);
          gl.uniform1f(uniforms.hoverScale, props.hoverScale);
          gl.uniform1f(uniforms.parallax, props.parallax);
          const burstUniform = props.clickBurst ? burst * (globalViewport ? 1.15 : 1) : 0;
          gl.uniform1f(uniforms.burst, burstUniform);
          gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
          gl.uniform2f(uniforms.mouse, smoothMouse[0], smoothMouse[1]);
          gl.uniform3f(uniforms.color, colorA[0], colorA[1], colorA[2]);
          gl.uniform3f(uniforms.colorTwo, colorB[0], colorB[1], colorB[2]);
          gl.uniform1i(uniforms.ringCount, Math.max(1, Math.min(10, props.ringCount)));

          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          gl.bindVertexArray(null);
        }

        raf = requestAnimationFrame(draw);

        return function dispose() {
          cancelAnimationFrame(raf);
          if (globalViewport) {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("resize", resize);
          } else {
            stage.removeEventListener("mousemove", onMouseMove);
            stage.removeEventListener("mouseenter", onMouseEnter);
            stage.removeEventListener("mouseleave", onMouseLeave);
            stage.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("resize", resize);
          }
          if (ro) ro.disconnect();
          gl.deleteBuffer(vbo);
          gl.deleteVertexArray(vao);
          gl.deleteProgram(program);
          gl.deleteShader(vs);
          gl.deleteShader(fs);
        };
      }

      function initMagicRingsFx() {
        const d1 = initMagicRingsFor("magicRingsFx", "magicRingsCanvas", dom.sceneStage);
        const d2 = initMagicRingsFor("tzGlobalMagicRings", "tzGlobalMagicRingsCanvas", null, {
          globalViewport: true,
          burstImpulse: 1.45
        });
        return function disposeMagicRingsAll() {
          d1();
          d2();
        };
      }

      /**
       * Картинка 2: лучи от переплёта (без колец). Основание — «камень на солнце», из него пышный веер лучей вверх.
       */
      function initBookElectricFxVariantsDEF() {
        const canvas = document.getElementById("bookElectricFxCanvas");
        const wrap = dom.bookImageWrap;
        if (!canvas || !wrap || prefersReducedMotion()) return function noop() {};
        const ctx = canvas.getContext("2d");
        if (!ctx) return function noop() {};

        let raf = 0;
        let dpr = 1;
        let running = true;
        /* Лучи от верхнего сгиба переплёта (начало свечения); низ страниц свободен под записи слов */
        const rayCount = 38;
        const rays = Array.from({ length: rayCount }, (_, i) => ({
          a: i / Math.max(1, rayCount - 1),
          seed: Math.random() * 1000
        }));

        function resize() {
          const rect = wrap.getBoundingClientRect();
          dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
          const w = Math.max(1, Math.floor(rect.width * dpr));
          const h = Math.max(1, Math.floor(rect.height * dpr));
          canvas.width = w;
          canvas.height = h;
          canvas.style.width = `${rect.width}px`;
          canvas.style.height = `${rect.height}px`;
        }

        function setBookFxMode() {
          if (!dom.sceneStage) return;
          dom.sceneStage.classList.remove("book-fx-mode-e", "book-fx-mode-f");
          dom.sceneStage.classList.add("book-fx-mode-d");
        }

        function drawRaysFromGem(gemCx, gemCy, w, h, t, layer) {
          const maxHalf = w * 0.052;
          rays.forEach((r, idx) => {
            const phase = layer * 0.52 + idx * 0.03;
            const u = r.a - 0.5;
            let spread = u * 2 * maxHalf + Math.sin(t * 1.4 + r.seed * 0.02) * w * 0.003;
            const jitter = Math.sin(t * 2.4 + r.seed) * w * 0.0045;
            spread = Math.max(-maxHalf, Math.min(maxHalf, spread));
            const x1 = gemCx + spread * 0.03;
            const y1 = gemCy;
            let x2 = gemCx + spread * 0.92 + jitter + layer * 0.45;
            x2 = Math.max(gemCx - maxHalf, Math.min(gemCx + maxHalf, x2));
            const y2 = h * (0.05 + 0.2 * (0.32 + (idx % 7) * 0.09) + layer * 0.018);
            const glow = 0.52 + 0.48 * Math.sin(t * 4.2 + r.seed * 0.12 + phase);

            const g = ctx.createLinearGradient(x1, y1, x2, y2);
            g.addColorStop(0, `rgba(255,214,120,${0.72 * glow})`);
            g.addColorStop(0.4, `rgba(255,170,90,${0.48 * glow})`);
            g.addColorStop(0.68, `rgba(140,230,255,${0.42 * glow})`);
            g.addColorStop(1, "rgba(120,80,200,0)");

            ctx.strokeStyle = g;
            ctx.lineWidth = 1.1 + glow * 1.75 + layer * 0.35;
            ctx.lineCap = "round";
            ctx.globalAlpha = layer === 0 ? 0.88 : 0.38;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            const midX = Math.max(
              gemCx - maxHalf * 1.08,
              Math.min(gemCx + maxHalf * 1.08, gemCx + spread * 0.22 + jitter * 0.25)
            );
            const midY = (y1 + y2) * 0.5 - h * 0.065;
            ctx.quadraticCurveTo(midX, midY, x2, y2);
            ctx.stroke();
            ctx.globalAlpha = 1;
          });
        }

        /**
         * gemCy — линия верхнего сгиба корешка (где сходятся страницы): начало свечения, не у «НЕЙРО».
         */
        function drawGemstone(gemCx, gemCy, w, h, t) {
          const pulse = 0.55 + 0.45 * Math.sin(t * 1.9);
          const twinkle = 0.4 + 0.6 * Math.sin(t * 3.3 + 0.7);
          const cy = gemCy + h * 0.015;

          const outer = ctx.createRadialGradient(gemCx, cy, 0, gemCx, cy, h * 0.056);
          outer.addColorStop(0, `rgba(255,230,180,${0.28 * pulse})`);
          outer.addColorStop(0.25, `rgba(255,160,70,${0.26 * pulse})`);
          outer.addColorStop(0.55, `rgba(180,100,255,${0.14 * pulse})`);
          outer.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = outer;
          ctx.beginPath();
          ctx.ellipse(gemCx, cy, w * 0.05, h * 0.022, 0, 0, Math.PI * 2);
          ctx.fill();

          const body = ctx.createRadialGradient(
            gemCx - w * 0.012,
            cy - h * 0.006,
            0,
            gemCx,
            cy,
            h * 0.042
          );
          body.addColorStop(0, `rgba(255,255,250,${0.92 * twinkle})`);
          body.addColorStop(0.18, `rgba(255,210,130,${0.85 * pulse})`);
          body.addColorStop(0.45, `rgba(255,140,80,${0.55 * pulse})`);
          body.addColorStop(0.72, `rgba(140,90,220,${0.35 * pulse})`);
          body.addColorStop(1, "rgba(40,20,80,0)");
          ctx.fillStyle = body;
          ctx.beginPath();
          ctx.ellipse(gemCx, cy, w * 0.042, h * 0.018, 0, 0, Math.PI * 2);
          ctx.fill();

          const specX = gemCx - w * 0.02 + Math.sin(t * 2.1) * w * 0.005;
          const specY = cy - h * 0.008 + Math.cos(t * 2.4) * h * 0.003;
          const spec = ctx.createRadialGradient(specX, specY, 0, specX, specY, h * 0.016);
          spec.addColorStop(0, `rgba(255,255,255,${0.75 * twinkle})`);
          spec.addColorStop(0.4, "rgba(255,240,200,0.25)");
          spec.addColorStop(1, "rgba(255,200,120,0)");
          ctx.fillStyle = spec;
          ctx.beginPath();
          ctx.ellipse(specX, specY, w * 0.026, h * 0.01, -0.35, 0, Math.PI * 2);
          ctx.fill();

          const rim = ctx.createRadialGradient(gemCx, gemCy + h * 0.004, 0, gemCx, gemCy, h * 0.03);
          rim.addColorStop(0, "rgba(255,200,100,0)");
          rim.addColorStop(0.65, `rgba(255,120,60,${0.22 * pulse})`);
          rim.addColorStop(1, "rgba(255,80,40,0)");
          ctx.fillStyle = rim;
          ctx.beginPath();
          ctx.ellipse(gemCx, gemCy + h * 0.003, w * 0.044, h * 0.01, 0, 0, Math.PI * 2);
          ctx.fill();

          const spineGlint = ctx.createLinearGradient(gemCx - w * 0.05, gemCy, gemCx + w * 0.05, gemCy);
          spineGlint.addColorStop(0, "rgba(255,200,140,0)");
          spineGlint.addColorStop(0.45, `rgba(255,245,220,${0.52 * twinkle})`);
          spineGlint.addColorStop(0.55, `rgba(255,255,255,${0.62 * twinkle})`);
          spineGlint.addColorStop(1, "rgba(255,200,140,0)");
          ctx.fillStyle = spineGlint;
          ctx.beginPath();
          ctx.ellipse(gemCx, gemCy, w * 0.04, h * 0.006, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        function draw(now) {
          if (!running) return;
          raf = requestAnimationFrame(draw);

          const active = dom.sceneStage.classList.contains("scene--book-open");
          if (!active) {
            return;
          }

          const w = canvas.width / dpr;
          const h = canvas.height / dpr;
          if (w < 2 || h < 2) return;

          const t = now * 0.001;
          setBookFxMode();

          const gemCx = w * 0.5;
          const gemCy = h * 0.662;

          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, w, h);
          ctx.globalCompositeOperation = "lighter";

          drawRaysFromGem(gemCx, gemCy, w, h, t, 0);

          drawGemstone(gemCx, gemCy, w, h, t);

          ctx.globalCompositeOperation = "source-over";
        }

        resize();
        window.addEventListener("resize", resize, { passive: true });
        let ro = null;
        if (typeof ResizeObserver !== "undefined") {
          ro = new ResizeObserver(resize);
          ro.observe(wrap);
        }
        raf = requestAnimationFrame(draw);

        return function dispose() {
          running = false;
          cancelAnimationFrame(raf);
          window.removeEventListener("resize", resize);
          if (ro) ro.disconnect();
        };
      }

      function renderBook() {
        state.words = storage.loadWords();
        const words = state.words;
        const left = document.getElementById("tzPageLeft");
        const right = document.getElementById("tzPageRight");
        const counter = document.getElementById("tzFlipCounter");
        const prevBtn = document.getElementById("tzFlipPrev");
        const nextBtn = document.getElementById("tzFlipNext");
        if (!left || !right) return;
        const totalSpreads = Math.max(1, Math.ceil(Math.max(words.length, 1) / 2));
        state.tzFlipSpreadIndex = Math.min(Math.max(0, state.tzFlipSpreadIndex), totalSpreads - 1);
        const i0 = state.tzFlipSpreadIndex * 2;
        const fill = (el, item) => {
          el.innerHTML = "";
          if (!item) {
            const p = document.createElement("p");
            p.className = "tz-page-empty";
            p.textContent =
              words.length === 0 ? "Слов пока нет — внесите слово в форме." : "Пустая страница";
            el.appendChild(p);
            return;
          }
          const art = document.createElement("article");
          art.className = "tz-page-card";
          const { word, description } = splitSavedText(item.text);
          const h = document.createElement("h3");
          h.className = "tz-page-word";
          h.textContent = word || "—";
          const d = document.createElement("p");
          d.className = "tz-page-desc";
          d.textContent = description || "";
          art.appendChild(h);
          art.appendChild(d);
          art.appendChild(renderReactionRow(item.id, item.reactions || defaultReactions()));
          el.appendChild(art);
        };
        fill(left, words[i0]);
        fill(right, words[i0 + 1]);
        if (counter) counter.textContent = `${state.tzFlipSpreadIndex + 1} / ${totalSpreads}`;
        if (prevBtn) prevBtn.disabled = state.tzFlipSpreadIndex <= 0;
        if (nextBtn) nextBtn.disabled = state.tzFlipSpreadIndex >= totalSpreads - 1;
      }

      function tzFlipStep(dir) {
        const flipAudio = document.getElementById("audioFlip");
        if (flipAudio) {
          try {
            flipAudio.currentTime = 0;
            flipAudio.play().catch(() => {});
          } catch (_) {
            /* ignore */
          }
        }
        const words = storage.loadWords();
        const totalSpreads = Math.max(1, Math.ceil(Math.max(words.length, 1) / 2));
        const book = document.getElementById("tzFlipBook");
        const after = () => {
          if (dir === "next") state.tzFlipSpreadIndex += 1;
          else state.tzFlipSpreadIndex -= 1;
          state.tzFlipSpreadIndex = Math.min(
            Math.max(0, state.tzFlipSpreadIndex),
            totalSpreads - 1
          );
          if (book) {
            book.classList.remove("tz-flip-book--anim-next", "tz-flip-book--anim-prev");
          }
          renderBook();
        };
        if (!book || prefersReducedMotion()) {
          after();
          return;
        }
        book.classList.remove("tz-flip-book--anim-next", "tz-flip-book--anim-prev");
        void book.offsetWidth;
        book.classList.add(dir === "next" ? "tz-flip-book--anim-next" : "tz-flip-book--anim-prev");
        const onEnd = () => {
          book.removeEventListener("animationend", onEnd);
          after();
        };
        book.addEventListener("animationend", onEnd, { once: true });
        window.setTimeout(onEnd, 900);
      }

      function getCatalogFilteredList() {
        const input = document.getElementById("tzCatalogSearch");
        const q = normalizeText((input && input.value) || "")
          .toLowerCase();
        const f = state.tzCatalogFilter;
        return state.words.filter((w) => {
          const { word, description } = splitSavedText(w.text);
          const hay = `${word} ${description}`.toLowerCase();
          if (q && !hay.includes(q)) return false;
          if (f !== "all") {
            const r = w.reactions || defaultReactions();
            if (!(r[f] > 0)) return false;
          }
          return true;
        });
      }

      function renderCatalog() {
        state.words = storage.loadWords();
        const grid = document.getElementById("tzCatalogGrid");
        if (!grid) return;
        grid.innerHTML = "";
        const items = getCatalogFilteredList();
        if (items.length === 0) {
          const p = document.createElement("p");
          p.className = "tz-catalog-empty";
          p.textContent = "Нет записей по выбранным условиям.";
          grid.appendChild(p);
          syncWaveCanvasConsumers();
          return;
        }
        items.forEach((item) => {
          const { word, description } = splitSavedText(item.text);
          const card = document.createElement("article");
          card.className = "tz-cat-card";
          const wave = document.createElement("canvas");
          wave.className = "wave-canvas-bg tz-cat-card__wave";
          wave.setAttribute("aria-hidden", "true");
          const inner = document.createElement("div");
          inner.className = "tz-cat-card__inner";
          const t = document.createElement("h3");
          t.className = "tz-cat-word";
          t.textContent = word;
          const desc = document.createElement("p");
          desc.className = "tz-cat-desc";
          desc.textContent = description;
          inner.appendChild(t);
          inner.appendChild(desc);
          inner.appendChild(renderReactionRow(item.id, item.reactions || defaultReactions()));
          card.appendChild(wave);
          card.appendChild(inner);
          grid.appendChild(card);
        });
        syncWaveCanvasConsumers();
      }

      function initTzScreens() {
        const audioPen = document.getElementById("audioPen");
        if (audioPen) {
          try {
            audioPen.volume = 0.32;
            audioPen.loop = false;
          } catch (_) {
            /* ignore */
          }
        }
        let penIdleTimer = null;

        function stopPenIdleTimer() {
          if (penIdleTimer) {
            window.clearTimeout(penIdleTimer);
            penIdleTimer = null;
          }
        }

        function pausePenSound() {
          if (!audioPen) return;
          try {
            audioPen.pause();
            audioPen.currentTime = 0;
          } catch (_) {
            /* ignore */
          }
        }

        /** Звук письма: один экземпляр, без play() на каждый символ — только сброс таймера паузы */
        function touchPenSound() {
          if (!audioPen) return;
          stopPenIdleTimer();
          if (audioPen.paused) {
            try {
              audioPen.currentTime = 0;
            } catch (_) {
              /* ignore */
            }
            audioPen.play().catch(() => {});
          }
          penIdleTimer = window.setTimeout(() => {
            pausePenSound();
            penIdleTimer = null;
          }, 420);
        }

        const hymnAudioEl = document.getElementById("hymnAudio");
        const btnHymnToggle = document.getElementById("btnHymnToggle");

        function syncHymnToggleUi() {
          if (!hymnAudioEl || !btnHymnToggle) return;
          const on = !hymnAudioEl.paused;
          btnHymnToggle.textContent = "🔊 Гимн Вайбкодера";
          btnHymnToggle.classList.toggle("ui-btn--hymn-playing", on);
          btnHymnToggle.classList.toggle("ui-btn--hymn-idle", !on);
        }

        function updateHymnToggleForScreen(screenId) {
          if (!btnHymnToggle) return;
          const show =
            screenId === "screen3" || screenId === "screen4" || screenId === "screen5";
          btnHymnToggle.hidden = !show;
          btnHymnToggle.setAttribute("aria-hidden", show ? "false" : "true");
          if (show) syncHymnToggleUi();
        }

        document.addEventListener("vibe-book-opened", () => {
          syncHymnToggleUi();
          window.requestAnimationFrame(() => syncWaveCanvasConsumers());
        });

        /** Записи на правой странице screen3: после 6 строк — «перелистывание», звук, очистка, нумерация глобальная */
        let formaSpellbookPage = [];
        const FORMA_SPELLBOOK_PAGE_MAX = 6;

        function playFormFlipSound() {
          const a = document.getElementById("audioFormFlip");
          if (!a) return;
          try {
            a.currentTime = 0;
            a.play().catch(() => {});
          } catch (_) {
            /* ignore */
          }
        }

        /** Краткое свечение и искры у переплёта (screen3, центр forma_cl.png) */
        function triggerFormaMagicBurst() {
          const spine = document.getElementById("tzFormaSpineMagic");
          if (!spine) return;
          spine.classList.remove("tz-forma-spine-magic--save-burst");
          void spine.offsetWidth;
          spine.classList.add("tz-forma-spine-magic--save-burst");
          window.setTimeout(() => {
            spine.classList.remove("tz-forma-spine-magic--save-burst");
          }, 920);
        }

        document.addEventListener("vibe-screenchange", (ev) => {
          const id = ev.detail && ev.detail.screenId;
          state.words = storage.loadWords();
          if (id !== "screen3") {
            stopPenIdleTimer();
            pausePenSound();
          }
          if (id === "screen3") {
            formaSpellbookPage = [];
            renderFormaSpellbookPage();
            const wEl = document.getElementById("tzInputWord");
            const dEl = document.getElementById("tzInputDesc");
            const mEl = document.getElementById("tzFormMsg");
            if (wEl) wEl.value = "";
            if (dEl) dEl.value = "";
            if (mEl) {
              mEl.textContent = "";
              mEl.className = "tz-form-msg tz-form-msg--forma";
            }
          }
          if (id === "screen4") {
            state.tzFlipSpreadIndex = 0;
            renderBook();
          }
          if (id === "screen5") renderCatalog();
          updateHymnToggleForScreen(id || "");
          syncWaveCanvasConsumers();
        });

        if (hymnAudioEl && btnHymnToggle) {
          btnHymnToggle.addEventListener("click", () => {
            if (hymnAudioEl.paused) {
              hymnAudioEl.play().catch(() => {});
            } else {
              hymnAudioEl.pause();
            }
            syncHymnToggleUi();
          });
          hymnAudioEl.addEventListener("play", syncHymnToggleUi);
          hymnAudioEl.addEventListener("pause", syncHymnToggleUi);
        }

        const form = document.getElementById("tzFormWord");
        const wIn = document.getElementById("tzInputWord");
        const dIn = document.getElementById("tzInputDesc");
        const msg = document.getElementById("tzFormMsg");
        const textSave = document.getElementById("tzTextSave");
        const textEdit = document.getElementById("tzTextEdit");

        function renderFormaSpellbookPage() {
          const el = document.getElementById("tzLivePreview");
          if (!el) return;
          el.innerHTML = "";
          if (formaSpellbookPage.length === 0) {
            const p = document.createElement("p");
            p.className = "tz-ink-page-hint";
            p.textContent = "Пустой разворот — строки появятся после сохранения.";
            el.appendChild(p);
            return;
          }
          const ol = document.createElement("ol");
          ol.className = "tz-ink-ol tz-ink-ol--spellbook-page";
          ol.setAttribute("aria-label", "Сохранённые слова по порядку");
          formaSpellbookPage.forEach((entry) => {
            const li = document.createElement("li");
            li.className = "tz-ink-spellbook-li";
            li.textContent = `${entry.word} — ${entry.description}`;
            ol.appendChild(li);
          });
          el.appendChild(ol);
        }

        function onFormInput() {
          touchPenSound();
        }

        if (wIn) wIn.addEventListener("input", onFormInput);
        if (dIn) dIn.addEventListener("input", onFormInput);

        /** Сохранение с экрана формы: опционально эффект у переплёта */
        function submitFormaEntry(withMagicBurst) {
          const word = normalizeText((wIn && wIn.value) || "");
          const description = normalizeText((dIn && dIn.value) || "");
          const err = validateWordForm(word, description, null);
          if (err) {
            if (msg) {
              msg.textContent = err;
              msg.className = "tz-form-msg tz-form-msg--err tz-form-msg--forma";
            }
            return false;
          }
          const newWord = createWordEntry(word, description, "");
          state.words = storage.loadWords();
          state.words.push(newWord);
          const saved = storage.saveWords(state.words);
          if (!saved.ok) {
            state.words.pop();
            if (msg) {
              msg.textContent = saved.message || "Не удалось сохранить.";
              msg.className = "tz-form-msg tz-form-msg--err tz-form-msg--forma";
            }
            return false;
          }
          if (wIn) wIn.value = "";
          if (dIn) dIn.value = "";
          if (wIn) {
            window.requestAnimationFrame(() => {
              try {
                wIn.focus();
              } catch (_) {
                /* ignore */
              }
            });
          }
          /* Нумерация 1…n сверху вниз на текущем развороте (после сброса снова с 1) */
          const entryNum = formaSpellbookPage.length + 1;
          formaSpellbookPage.push({
            word,
            description,
            num: entryNum
          });
          renderFormaSpellbookPage();
          if (formaSpellbookPage.length >= FORMA_SPELLBOOK_PAGE_MAX) {
            playFormFlipSound();
            formaSpellbookPage = [];
            renderFormaSpellbookPage();
          }
          if (msg) {
            msg.textContent = "Сохранено.";
            msg.className = "tz-form-msg tz-form-msg--ok tz-form-msg--forma";
          }
          if (withMagicBurst) {
            triggerFormaMagicBurst();
          }
          tzRefreshMvpScreens();
          return true;
        }

        function bindTextControl(el, fn) {
          if (!el) return;
          el.addEventListener("click", (e) => {
            e.preventDefault();
            fn();
          });
          el.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fn();
            }
          });
        }

        bindTextControl(textSave, () => {
          const ok = submitFormaEntry(true);
          if (ok && textSave) {
            textSave.classList.add("tz-forma-text-action--pulse");
            window.setTimeout(() => textSave.classList.remove("tz-forma-text-action--pulse"), 650);
          }
        });

        bindTextControl(textEdit, () => {
          if (msg) {
            msg.textContent = "";
            msg.className = "tz-form-msg tz-form-msg--forma";
          }
          if (wIn) {
            wIn.focus();
            try {
              wIn.select();
            } catch (_) {
              /* ignore */
            }
          }
        });

        if (form) {
          form.addEventListener("submit", (e) => {
            e.preventDefault();
            submitFormaEntry(true);
          });
        }

        renderFormaSpellbookPage();

        const cancel = document.getElementById("tzFormCancel");
        if (cancel) cancel.addEventListener("click", () => window.showScreen("screen1"));

        const fp = document.getElementById("tzFlipPrev");
        const fn = document.getElementById("tzFlipNext");
        if (fp) fp.addEventListener("click", () => tzFlipStep("prev"));
        if (fn) fn.addEventListener("click", () => tzFlipStep("next"));

        const bm = document.getElementById("tzBtnBookToMenu");
        const cm = document.getElementById("tzBtnCatalogToMenu");
        if (bm) bm.addEventListener("click", () => window.showScreen("screen1"));
        if (cm) cm.addEventListener("click", () => window.showScreen("screen1"));

        const search = document.getElementById("tzCatalogSearch");
        if (search) {
          search.addEventListener("input", () => {
            window.clearTimeout(initTzScreens._t);
            initTzScreens._t = window.setTimeout(() => renderCatalog(), 160);
          });
        }

        document.querySelectorAll("[data-tz-filter]").forEach((btn) => {
          btn.addEventListener("click", () => {
            document.querySelectorAll("[data-tz-filter]").forEach((b) => b.classList.remove("is-active"));
            btn.classList.add("is-active");
            state.tzCatalogFilter = btn.getAttribute("data-tz-filter") || "all";
            renderCatalog();
          });
        });

        window.renderBook = renderBook;
        window.renderCatalog = renderCatalog;

        updateHymnToggleForScreen(document.body.dataset.activeScreen || "screen1");
      }

      function initApp() {
        const DICTIONARY_RESET_VERSION = "2";
        try {
          const resetKey = "vibe_dictionary_reset_v";
          if (localStorage.getItem(resetKey) !== DICTIONARY_RESET_VERSION) {
            storage.saveWords([]);
            localStorage.setItem(resetKey, DICTIONARY_RESET_VERSION);
          }
        } catch (_) {
          /* ignore */
        }
        state.words = [];
        state.isBookInitialized = false;
        state.writeSpreadPage = 1;
        bindEvents();
        bindDecorativeImages();
        initMagicOverlayParticles();
        setAccessButtonState("default");
        magicRingsCleanup = initMagicRingsFx();
        grainShaderCleanup = initGrainShaderBackground();
        bookElectricFxCleanup = initBookElectricFxVariantsDEF();
        state.words = storage.loadWords();
        document.body.dataset.activeScreen = "screen1";
        initTzScreens();
        document.addEventListener("vibe-screenchange", syncVibeBrandOverlay);
        document.addEventListener("vibe-book-opened", syncVibeBrandOverlay);
        syncVibeBrandOverlay();
        renderBook();
        renderCatalog();
        syncWaveCanvasConsumers();
        // Первый экран всегда статичный: без автоперехода в раскрытую книгу при открытии файла.
        // Переход в книгу только после явного ввода кода и клика по зоне книги.
      }

      document.addEventListener("DOMContentLoaded", initApp);
    })();