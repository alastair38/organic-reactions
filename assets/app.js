(function () {
  "use strict";

  const THEME_KEY = "higherOrganic.theme.v1";
  const PROGRESS_KEY = "higherOrganic.progress.v1";
  const FLASH_KEY = "higherOrganic.flashKnown.v1";

  function safeGet(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      /* Storage may be unavailable when opening a local file in some browsers. */
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* -----------------------------------------------------------------------
     Theme
  ----------------------------------------------------------------------- */

  function setupTheme() {
    const root = document.documentElement;
    const saved = safeGet(THEME_KEY, null);
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = saved || (prefersDark ? "dark" : "light");
    root.setAttribute("data-theme", initial);

    const button = document.getElementById("themeToggle");
    if (!button) return;

    function paintLabel() {
      const dark = root.getAttribute("data-theme") === "dark";
      button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
      button.setAttribute("title", dark ? "Switch to light theme" : "Switch to dark theme");
    }

    paintLabel();

    button.addEventListener("click", function () {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      safeSet(THEME_KEY, next);
      paintLabel();
    });
  }

  /* -----------------------------------------------------------------------
     Mobile navigation
  ----------------------------------------------------------------------- */

  function setupNavigation() {
    const toggle = document.getElementById("menuToggle");
    const links = document.getElementById("navLinks");
    if (!toggle || !links) return;

    toggle.addEventListener("click", function () {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    links.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* -----------------------------------------------------------------------
     Revision progress
  ----------------------------------------------------------------------- */

  function setupProgress() {
    const boxes = Array.from(document.querySelectorAll("[data-progress]"));
    const saved = safeGet(PROGRESS_KEY, {});

    boxes.forEach(function (box) {
      if (saved[box.dataset.progress]) box.checked = true;
      box.addEventListener("change", function () {
        const current = safeGet(PROGRESS_KEY, {});
        current[box.dataset.progress] = box.checked;
        safeSet(PROGRESS_KEY, current);
        paintProgress();
      });
    });

    const reset = document.getElementById("resetProgress");
    if (reset) {
      reset.addEventListener("click", function () {
        boxes.forEach(function (box) {
          box.checked = false;
        });
        safeSet(PROGRESS_KEY, {});
        paintProgress();
      });
    }

    function paintProgress() {
      const stored = boxes.length ? null : safeGet(PROGRESS_KEY, {});
      const done = boxes.length
        ? boxes.filter(function (box) { return box.checked; }).length
        : Object.keys(stored).filter(function (key) { return stored[key]; }).length;
      const total = boxes.length || 30;
      const percent = total ? Math.round((done / total) * 100) : 0;

      document.querySelectorAll("[data-progress-percent]").forEach(function (node) {
        node.textContent = percent + "%";
      });
      document.querySelectorAll("[data-progress-count]").forEach(function (node) {
        node.textContent = done + " of " + total;
      });

      const bar = document.getElementById("progressBar");
      if (bar) bar.style.width = percent + "%";

      const ring = document.getElementById("progressRingFill");
      if (ring) {
        const circumference = 157;
        ring.style.strokeDashoffset = String(circumference - (circumference * percent) / 100);
      }

      const ringWrap = document.querySelector(".progress-ring");
      if (ringWrap) ringWrap.setAttribute("aria-valuenow", String(percent));

      const nav = document.getElementById("navProgress");
      if (nav) nav.textContent = percent + "%";
    }

    paintProgress();
    window.paintProgress = paintProgress;
  }

  /* -----------------------------------------------------------------------
     Random revision prompt
  ----------------------------------------------------------------------- */

  function setupPrompts() {
    const prompt = document.getElementById("todayPrompt");
    const button = document.getElementById("newPrompt");
    if (!prompt || !button || !window.HIGHER_ORG || !window.HIGHER_ORG.prompts) return;

    const prompts = window.HIGHER_ORG.prompts;
    let last = -1;

    function show() {
      let index = Math.floor(Math.random() * prompts.length);
      if (prompts.length > 1 && index === last) index = (index + 1) % prompts.length;
      last = index;
      prompt.textContent = prompts[index];
    }

    button.addEventListener("click", show);
    show();
  }

  /* -----------------------------------------------------------------------
     Reaction lab filters and animation
  ----------------------------------------------------------------------- */

  function setupReactions() {
    const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
    const cards = Array.from(document.querySelectorAll("[data-category]"));

    filterButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        const filter = button.dataset.filter;
        filterButtons.forEach(function (item) {
          item.classList.toggle("active", item === button);
          item.setAttribute("aria-pressed", String(item === button));
        });
        cards.forEach(function (card) {
          card.classList.toggle("is-hidden", filter !== "all" && card.dataset.category !== filter);
        });
      });
    });

    document.querySelectorAll("[data-anim]").forEach(function (button) {
      button.addEventListener("click", function () {
        const card = button.closest(".reaction-card");
        if (!card) return;

        if (button.animationTimer) window.clearTimeout(button.animationTimer);

        card.classList.remove("is-playing");
        void card.offsetWidth;
        card.classList.add("is-playing");
        card.setAttribute("aria-busy", "true");
        button.textContent = "Playing…";

        button.animationTimer = window.setTimeout(function () {
          card.classList.remove("is-playing");
          card.removeAttribute("aria-busy");
          button.textContent = "Replay animation";
        }, 3600);
      });
    });
  }

  /* -----------------------------------------------------------------------
     Flashcards
  ----------------------------------------------------------------------- */

  function setupFlashcards() {
    const card = document.getElementById("flashcard");
    if (!card || !window.HIGHER_ORG || !window.HIGHER_ORG.flashcards) return;

    const allCards = window.HIGHER_ORG.flashcards;
    const front = document.getElementById("flashFront");
    const back = document.getElementById("flashBack");
    const tag = document.getElementById("flashTag");
    const counter = document.getElementById("flashCounter");
    const knownCount = document.getElementById("knownCount");
    const reviewCount = document.getElementById("reviewCount");
    const tagList = document.getElementById("flashTags");
    const knownButton = document.getElementById("markKnown");
    const reviewButton = document.getElementById("markReview");

    const saved = safeGet(FLASH_KEY, { known: [], review: [] });
    const known = new Set(Array.isArray(saved.known) ? saved.known : []);
    const review = new Set(Array.isArray(saved.review) ? saved.review : []);

    let activeTag = "All";
    let deck = allCards.slice();
    let index = 0;
    let flipped = false;

    const tags = ["All"].concat(Array.from(new Set(allCards.map(function (item) { return item.tag; }))));

    tags.forEach(function (item, i) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "filter-chip" + (i === 0 ? " active" : "");
      button.textContent = item;
      button.dataset.flashTag = item;
      button.setAttribute("aria-pressed", String(i === 0));
      button.addEventListener("click", function () {
        activeTag = item;
        deck = activeTag === "All" ? allCards.slice() : allCards.filter(function (cardItem) {
          return cardItem.tag === activeTag;
        });
        index = 0;
        tagList.querySelectorAll("[data-flash-tag]").forEach(function (chip) {
          const active = chip.dataset.flashTag === activeTag;
          chip.classList.toggle("active", active);
          chip.setAttribute("aria-pressed", String(active));
        });
        render();
      });
      tagList.appendChild(button);
    });

    function currentCard() {
      return deck[index];
    }

    function paintCounts() {
      if (counter) counter.textContent = deck.length ? "Card " + (index + 1) + " of " + deck.length : "No cards";
      if (knownCount) knownCount.textContent = String(known.size);
      if (reviewCount) reviewCount.textContent = String(review.size);
    }

    function paintCardState() {
      const item = currentCard();
      if (!item) return;
      if (knownButton) {
        knownButton.setAttribute("aria-pressed", String(known.has(item.id)));
        knownButton.textContent = known.has(item.id) ? "Got it ✓" : "Got it";
      }
      if (reviewButton) {
        reviewButton.setAttribute("aria-pressed", String(review.has(item.id)));
        reviewButton.textContent = review.has(item.id) ? "Review ✓" : "Review";
      }
    }

    function render() {
      const item = currentCard();
      if (!item) {
        if (front) front.textContent = "No cards in this filter.";
        if (back) back.textContent = "Choose another topic.";
        if (tag) tag.textContent = activeTag;
        paintCounts();
        return;
      }

      flipped = false;
      card.classList.remove("is-flipped");
      card.setAttribute("aria-pressed", "false");
      if (front) front.textContent = item.front;
      if (back) back.textContent = item.back;
      if (tag) tag.textContent = item.tag;
      card.setAttribute("aria-label", "Flashcard: " + item.front + ". Press Space or click to flip.");
      paintCounts();
      paintCardState();
    }

    function flip() {
      if (!currentCard()) return;
      flipped = !flipped;
      card.classList.toggle("is-flipped", flipped);
      card.setAttribute("aria-pressed", String(flipped));
      card.setAttribute("aria-label", flipped ? "Answer side of flashcard. Press Space or click to flip back." : "Question side of flashcard. Press Space or click to flip.");
    }

    function move(step) {
      if (!deck.length) return;
      index = (index + step + deck.length) % deck.length;
      render();
    }

    function shuffle() {
      for (let i = deck.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = deck[i];
        deck[i] = deck[j];
        deck[j] = temp;
      }
      index = 0;
      render();
    }

    function mark(setName) {
      const item = currentCard();
      if (!item) return;
      if (setName === "known") {
        known.add(item.id);
        review.delete(item.id);
      } else {
        review.add(item.id);
        known.delete(item.id);
      }
      safeSet(FLASH_KEY, { known: Array.from(known), review: Array.from(review) });
      paintCounts();
      paintCardState();
    }

    card.addEventListener("click", flip);
    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        flip();
      }
    });

    const prev = document.getElementById("prevCard");
    const next = document.getElementById("nextCard");
    const flipButton = document.getElementById("flipCard");
    const shuffleButton = document.getElementById("shuffleCards");

    if (prev) prev.addEventListener("click", function () { move(-1); });
    if (next) next.addEventListener("click", function () { move(1); });
    if (flipButton) flipButton.addEventListener("click", flip);
    if (shuffleButton) shuffleButton.addEventListener("click", shuffle);
    if (knownButton) knownButton.addEventListener("click", function () { mark("known"); });
    if (reviewButton) reviewButton.addEventListener("click", function () { mark("review"); });

    document.addEventListener("keydown", function (event) {
      if (event.target.matches("input, textarea, select, button, a")) return;
      if (event.target.closest("#flashcard")) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      } else if (event.key === " ") {
        event.preventDefault();
        flip();
      }
    });

    render();
  }

  /* -----------------------------------------------------------------------
     Quiz
  ----------------------------------------------------------------------- */

  function setupQuiz() {
    const quizRoot = document.getElementById("quizRoot");
    if (!quizRoot || !window.HIGHER_ORG || !window.HIGHER_ORG.quiz) return;

    const quiz = window.HIGHER_ORG.quiz;
    const answers = {};
    const tabs = Array.from(document.querySelectorAll("[data-quiz-tab]"));
    const panels = Array.from(document.querySelectorAll("[data-quiz-panel]"));

    function record(id, correct) {
      answers[id] = Boolean(correct);
      paintScore();
    }

    function paintScore() {
      const ids = Object.keys(answers);
      const correct = ids.filter(function (id) { return answers[id]; }).length;
      const attempted = ids.length;
      const percent = attempted ? Math.round((correct / attempted) * 100) : 0;

      const correctNode = document.getElementById("quizCorrect");
      const attemptedNode = document.getElementById("quizAttempted");
      const percentNode = document.getElementById("quizPercent");
      if (correctNode) correctNode.textContent = String(correct);
      if (attemptedNode) attemptedNode.textContent = String(attempted);
      if (percentNode) percentNode.textContent = percent + "%";
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        const target = tab.dataset.quizTab;
        tabs.forEach(function (item) {
          const active = item === tab;
          item.classList.toggle("active", active);
          item.setAttribute("aria-selected", String(active));
        });
        panels.forEach(function (panel) {
          panel.classList.toggle("active", panel.dataset.quizPanel === target);
        });
      });
    });

    function renderMcq() {
      const host = document.getElementById("mcqList");
      if (!host) return;
      host.innerHTML = quiz.mcq.map(function (item, qIndex) {
        return (
          '<article class="question-card" data-qid="' + escapeHtml(item.id) + '">' +
            '<div class="question-top">' +
              '<span class="q-num">' + (qIndex + 1) + '</span>' +
              '<h3>' + escapeHtml(item.q) + '</h3>' +
            '</div>' +
            '<div class="options">' +
              item.options.map(function (option, optionIndex) {
                return (
                  '<button type="button" class="option" data-option="' + optionIndex + '">' +
                    '<span class="letter">' + String.fromCharCode(65 + optionIndex) + '</span>' +
                    '<span>' + escapeHtml(option) + '</span>' +
                  '</button>'
                );
              }).join("") +
            '</div>' +
            '<div class="feedback" role="status"></div>' +
          '</article>'
        );
      }).join("");

      host.querySelectorAll(".question-card").forEach(function (card) {
        const item = quiz.mcq.find(function (entry) { return entry.id === card.dataset.qid; });
        card.querySelectorAll(".option").forEach(function (button) {
          button.addEventListener("click", function () {
            if (card.dataset.answered === "true") return;
            card.dataset.answered = "true";
            const picked = Number(button.dataset.option);
            const isCorrect = picked === item.answer;
            card.querySelectorAll(".option").forEach(function (other, otherIndex) {
              other.disabled = true;
              if (otherIndex === item.answer) other.classList.add("correct");
              if (otherIndex === picked && !isCorrect) other.classList.add("wrong");
            });
            const feedback = card.querySelector(".feedback");
            feedback.classList.add("show");
            feedback.innerHTML = "<strong>" + (isCorrect ? "Correct." : "Not quite.") + "</strong> " + escapeHtml(item.explain);
            record(item.id, isCorrect);
          });
        });
      });
    }

    function renderTf() {
      const host = document.getElementById("tfList");
      if (!host) return;
      host.innerHTML = quiz.tf.map(function (item, qIndex) {
        return (
          '<article class="question-card" data-qid="' + escapeHtml(item.id) + '">' +
            '<div class="question-top">' +
              '<span class="q-num">' + (qIndex + 1) + '</span>' +
              '<h3>' + escapeHtml(item.q) + '</h3>' +
            '</div>' +
            '<div class="tf-row">' +
              '<button type="button" class="btn secondary small tf-btn" data-value="true">True</button>' +
              '<button type="button" class="btn secondary small tf-btn" data-value="false">False</button>' +
            '</div>' +
            '<div class="feedback" role="status"></div>' +
          '</article>'
        );
      }).join("");

      host.querySelectorAll(".question-card").forEach(function (card) {
        const item = quiz.tf.find(function (entry) { return entry.id === card.dataset.qid; });
        card.querySelectorAll(".tf-btn").forEach(function (button) {
          button.addEventListener("click", function () {
            if (card.dataset.answered === "true") return;
            card.dataset.answered = "true";
            const picked = button.dataset.value === "true";
            const isCorrect = picked === item.answer;
            card.querySelectorAll(".tf-btn").forEach(function (other) {
              other.disabled = true;
              other.classList.toggle("selected", other === button);
            });
            const feedback = card.querySelector(".feedback");
            feedback.classList.add("show");
            feedback.innerHTML = "<strong>" + (isCorrect ? "Correct." : "Not quite.") + "</strong> " + escapeHtml(item.explain);
            record(item.id, isCorrect);
          });
        });
      });
    }

    function normalise(value) {
      return String(value)
        .toLowerCase()
        .replace(/[–—]/g, "-")
        .replace(/[.,;:()]/g, "")
        .replace(/\s+/g, "")
        .trim();
    }

    function renderFib() {
      const host = document.getElementById("fibList");
      if (!host) return;
      host.innerHTML = quiz.fib.map(function (item, qIndex) {
        return (
          '<article class="question-card" data-qid="' + escapeHtml(item.id) + '">' +
            '<div class="question-top">' +
              '<span class="q-num">' + (qIndex + 1) + '</span>' +
              '<h3>' + escapeHtml(item.q) + '</h3>' +
            '</div>' +
            '<div class="blank-row">' +
              '<label class="sr-only" for="fib-' + escapeHtml(item.id) + '">Your answer</label>' +
              '<input class="blank-input" id="fib-' + escapeHtml(item.id) + '" type="text" autocomplete="off" placeholder="Type your answer" />' +
              '<button type="button" class="btn small check-fib">Check</button>' +
            '</div>' +
            '<div class="feedback" role="status"></div>' +
          '</article>'
        );
      }).join("");

      host.querySelectorAll(".question-card").forEach(function (card) {
        const item = quiz.fib.find(function (entry) { return entry.id === card.dataset.qid; });
        const input = card.querySelector(".blank-input");
        const check = card.querySelector(".check-fib");
        const feedback = card.querySelector(".feedback");

        function submit() {
          if (card.dataset.answered === "true") return;
          const value = normalise(input.value);
          const accepted = item.accepted.map(normalise);
          const isCorrect = accepted.includes(value);
          card.dataset.answered = "true";
          input.disabled = true;
          check.disabled = true;
          input.classList.add(isCorrect ? "correct" : "wrong");
          feedback.classList.add("show");
          feedback.innerHTML = "<strong>" + (isCorrect ? "Correct." : "Not quite.") + "</strong> Accepted answer: " + escapeHtml(item.answer) + ". " + escapeHtml(item.explain);
          record(item.id, isCorrect);
        }

        check.addEventListener("click", submit);
        input.addEventListener("keydown", function (event) {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
        });
      });
    }

    function renderMatch() {
      const host = document.getElementById("matchList");
      if (!host) return;
      const options = quiz.match.map(function (item) { return item.answer; });
      host.innerHTML = quiz.match.map(function (item, qIndex) {
        return (
          '<div class="question-card" data-qid="' + escapeHtml(item.id) + '" data-correct="' + escapeHtml(item.answer) + '">' +
            '<div class="question-top">' +
              '<span class="q-num">' + (qIndex + 1) + '</span>' +
              '<h3>' + escapeHtml(item.term) + '</h3>' +
            '</div>' +
            '<div class="match-row">' +
              '<span class="match-term">Choose a match</span>' +
              '<select class="match-select" aria-label="Match for ' + escapeHtml(item.term) + '">' +
                '<option value="">Select...</option>' +
                options.map(function (option) {
                  return '<option value="' + escapeHtml(option) + '">' + escapeHtml(option) + '</option>';
                }).join("") +
              '</select>' +
            '</div>' +
            '<div class="feedback" role="status"></div>' +
          '</div>'
        );
      }).join("");

      const checkAll = document.getElementById("checkMatches");
      if (!checkAll) return;
      checkAll.onclick = function () {
        host.querySelectorAll(".question-card").forEach(function (card) {
          if (card.dataset.answered === "true") return;
          const select = card.querySelector(".match-select");
          const isCorrect = select.value === card.dataset.correct;
          card.dataset.answered = "true";
          select.disabled = true;
          select.classList.add(isCorrect ? "correct" : "wrong");
          const feedback = card.querySelector(".feedback");
          feedback.classList.add("show");
          feedback.innerHTML = "<strong>" + (isCorrect ? "Correct." : "Not quite.") + "</strong> Correct match: " + escapeHtml(card.dataset.correct);
          record(card.dataset.qid, isCorrect);
        });
        checkAll.disabled = true;
      };
    }

    function renderEquations() {
      const host = document.getElementById("equationList");
      if (!host) return;
      host.innerHTML = quiz.equations.map(function (item, qIndex) {
        return (
          '<article class="question-card" data-qid="' + escapeHtml(item.id) + '">' +
            '<div class="question-top">' +
              '<span class="q-num">' + (qIndex + 1) + '</span>' +
              '<h3>' + escapeHtml(item.q) + '</h3>' +
            '</div>' +
            '<div class="equation-row">' +
              '<select class="eq-select" aria-label="Choose the missing product">' +
                '<option value="">Choose...</option>' +
                item.options.map(function (option, optionIndex) {
                  return '<option value="' + optionIndex + '">' + escapeHtml(option) + '</option>';
                }).join("") +
              '</select>' +
              '<button type="button" class="btn small check-eq">Check</button>' +
            '</div>' +
            '<div class="feedback" role="status"></div>' +
          '</article>'
        );
      }).join("");

      host.querySelectorAll(".question-card").forEach(function (card) {
        const item = quiz.equations.find(function (entry) { return entry.id === card.dataset.qid; });
        const select = card.querySelector(".eq-select");
        const check = card.querySelector(".check-eq");
        const feedback = card.querySelector(".feedback");

        check.addEventListener("click", function () {
          if (card.dataset.answered === "true") return;
          if (!select.value) {
            feedback.classList.add("show");
            feedback.innerHTML = "<strong>Choose an option first.</strong>";
            return;
          }
          const picked = Number(select.value);
          const isCorrect = picked === item.answer;
          card.dataset.answered = "true";
          select.disabled = true;
          check.disabled = true;
          select.classList.add(isCorrect ? "correct" : "wrong");
          feedback.classList.add("show");
          feedback.innerHTML = "<strong>" + (isCorrect ? "Correct." : "Not quite.") + "</strong> " + escapeHtml(item.explain);
          record(item.id, isCorrect);
        });
      });
    }

    function renderExam() {
      const host = document.getElementById("examList");
      if (!host) return;
      host.innerHTML = quiz.exam.map(function (item, qIndex) {
        return (
          '<article class="question-card">' +
            '<div class="question-top">' +
              '<span class="q-num">' + (qIndex + 1) + '</span>' +
              '<h3>' + escapeHtml(item.q) + ' <span class="muted small">(' + item.marks + ' marks)</span></h3>' +
            '</div>' +
            '<label class="sr-only" for="exam-' + escapeHtml(item.id) + '">Your answer</label>' +
            '<textarea class="exam-answer" id="exam-' + escapeHtml(item.id) + '" placeholder="Write your answer here, then reveal the model answer."></textarea>' +
            '<div class="match-actions">' +
              '<button type="button" class="btn small reveal-model" data-model="' + escapeHtml(item.id) + '">Reveal model answer</button>' +
            '</div>' +
            '<div class="model-answer" id="model-' + escapeHtml(item.id) + '">' +
              '<strong>Model answer:</strong> ' + escapeHtml(item.model) +
            '</div>' +
          '</article>'
        );
      }).join("");

      host.querySelectorAll(".reveal-model").forEach(function (button) {
        button.addEventListener("click", function () {
          const model = document.getElementById("model-" + button.dataset.model);
          if (!model) return;
          const show = model.classList.toggle("show");
          button.textContent = show ? "Hide model answer" : "Reveal model answer";
        });
      });
    }

    function resetQuiz() {
      Object.keys(answers).forEach(function (key) { delete answers[key]; });
      renderMcq();
      renderTf();
      renderFib();
      renderMatch();
      renderEquations();
      renderExam();
      paintScore();
      const checkMatches = document.getElementById("checkMatches");
      if (checkMatches) checkMatches.disabled = false;
    }

    renderMcq();
    renderTf();
    renderFib();
    renderMatch();
    renderEquations();
    renderExam();
    paintScore();

    const reset = document.getElementById("resetQuiz");
    if (reset) reset.addEventListener("click", resetQuiz);
  }

  /* -----------------------------------------------------------------------
     Boot
  ----------------------------------------------------------------------- */

  document.addEventListener("DOMContentLoaded", function () {
    setupTheme();
    setupNavigation();
    setupProgress();
    setupPrompts();
    setupReactions();
    setupFlashcards();
    setupQuiz();
  });
})();
