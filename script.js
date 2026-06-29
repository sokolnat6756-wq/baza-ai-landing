/* ============================================================
   База ИИ — интерактив
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Год в подвале ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Мобильное меню (бургер) ---------- */
  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");

  function closeNav() {
    if (!nav || !burger) return;
    nav.classList.remove("is-open");
    burger.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
  }

  if (burger && nav) {
    burger.addEventListener("click", function () {
      const open = nav.classList.toggle("is-open");
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
    });
    // Закрываем меню при клике по ссылке
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });
    // Закрываем при ресайзе на десктоп
    window.addEventListener("resize", function () {
      if (window.innerWidth > 760) closeNav();
    });
  }

  /* ---------- Аккордеоны (программа + FAQ) ---------- */
  document.querySelectorAll(".accordion").forEach(function (acc) {
    const items = acc.querySelectorAll(".acc-item");
    items.forEach(function (item) {
      const trigger = item.querySelector(".acc-trigger");
      if (!trigger) return;
      trigger.addEventListener("click", function () {
        const isOpen = item.classList.contains("is-open");
        // Закрываем остальные внутри той же группы (поведение «один открыт»)
        items.forEach(function (other) {
          other.classList.remove("is-open");
          const t = other.querySelector(".acc-trigger");
          if (t) t.setAttribute("aria-expanded", "false");
        });
        if (!isOpen) {
          item.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
        }
      });
    });
  });

  /* ---------- Reveal-анимации при скролле ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry, i) {
          if (entry.isIntersecting) {
            // Лёгкая каскадная задержка для соседних элементов
            const delay = Math.min(i * 60, 240);
            setTimeout(function () {
              entry.target.classList.add("is-visible");
            }, delay);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Липкая мобильная кнопка покупки ---------- */
  const stickyCta = document.getElementById("stickyCta");
  const pricing = document.getElementById("pricing");

  if (stickyCta) {
    let ticking = false;

    function updateSticky() {
      ticking = false;
      // Показываем после прокрутки первого экрана
      const scrolled = window.scrollY > window.innerHeight * 0.6;

      // Прячем, когда секция тарифов на экране (чтобы не дублировать)
      let pricingVisible = false;
      if (pricing) {
        const r = pricing.getBoundingClientRect();
        pricingVisible = r.top < window.innerHeight && r.bottom > 0;
      }

      stickyCta.classList.toggle("is-visible", scrolled && !pricingVisible);
    }

    window.addEventListener("scroll", function () {
      if (!ticking) {
        window.requestAnimationFrame(updateSticky);
        ticking = true;
      }
    }, { passive: true });

    updateSticky();
  }

  /* ---------- Согласия и оплата ---------- */
  const offerCta = document.getElementById("offerCta");
  const consentPrivacy = document.getElementById("consentPrivacy");
  const consentOffer = document.getElementById("consentOffer");
  const offerEmail = document.getElementById("offerEmail");
  const offerName = document.getElementById("offerName");
  const offerPromo = document.getElementById("offerPromo");
  const offerPromoApply = document.getElementById("offerPromoApply");
  const offerPromoMessage = document.getElementById("offerPromoMessage");
  const offerEmailMessage = document.getElementById("offerEmailMessage");
  const offerFormError = document.getElementById("offerFormError");
  const offerPriceNow = document.getElementById("offerPriceNow");
  const offerPriceSave = document.getElementById("offerPriceSave");
  const stickyCtaPrice = document.getElementById("stickyCtaPrice");

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const ALLOWED_EMAIL_DOMAINS = new Set([
    "mail.ru",
    "yandex.ru",
    "ya.ru",
    "inbox.ru",
    "list.ru",
    "bk.ru",
  ]);
  const EMAIL_DOMAIN_HINT =
    "Укажите email на mail.ru, yandex.ru, inbox.ru, list.ru или bk.ru — на него придёт доступ к обучению.";
  const BASE_AMOUNT = 450000;
  const LIST_PRICE = 19000;

  let appliedPromoCode = "";
  let currentAmount = BASE_AMOUNT;

  function formatRub(kopecks) {
    return (kopecks / 100).toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽";
  }

  function ctaLabel(amountKopecks) {
    return "Получить доступ за " + formatRub(amountKopecks);
  }

  function normalizeEmail(value) {
    return value.trim().toLowerCase();
  }

  function getEmailDomain(email) {
    const at = email.lastIndexOf("@");
    if (at < 0) return "";
    return email.slice(at + 1);
  }

  function getEmailState() {
    if (!offerEmail) return { valid: false, showDomainError: false };
    const value = normalizeEmail(offerEmail.value);
    if (!value) return { valid: false, showDomainError: false };
    if (!EMAIL_RE.test(value)) return { valid: false, showDomainError: false };
    if (!ALLOWED_EMAIL_DOMAINS.has(getEmailDomain(value))) {
      return { valid: false, showDomainError: true };
    }
    return { valid: true, showDomainError: false };
  }

  function isEmailValid() {
    return getEmailState().valid;
  }

  function hideEmailMessage() {
    if (!offerEmailMessage) return;
    offerEmailMessage.hidden = true;
    offerEmailMessage.textContent = "";
  }

  function showEmailMessage(message) {
    if (!offerEmailMessage) return;
    offerEmailMessage.textContent = message;
    offerEmailMessage.hidden = false;
  }

  function updateEmailFeedback() {
    const state = getEmailState();
    if (state.showDomainError) {
      showEmailMessage(EMAIL_DOMAIN_HINT);
    } else {
      hideEmailMessage();
    }
  }

  function hideFormError() {
    if (!offerFormError) return;
    offerFormError.hidden = true;
    offerFormError.textContent = "";
  }

  function showFormError(message) {
    if (!offerFormError) return;
    offerFormError.textContent = message;
    offerFormError.hidden = false;
  }

  function hidePromoMessage() {
    if (!offerPromoMessage) return;
    offerPromoMessage.hidden = true;
    offerPromoMessage.textContent = "";
    offerPromoMessage.classList.remove("offer-promo__message--success", "offer-promo__message--error");
  }

  function showPromoMessage(message, type) {
    if (!offerPromoMessage) return;
    offerPromoMessage.textContent = message;
    offerPromoMessage.classList.remove("offer-promo__message--success", "offer-promo__message--error");
    offerPromoMessage.classList.add(type === "success" ? "offer-promo__message--success" : "offer-promo__message--error");
    offerPromoMessage.hidden = false;
  }

  function updatePriceUI(amountKopecks) {
    currentAmount = amountKopecks;
    const rub = formatRub(amountKopecks);
    const isDiscounted = amountKopecks < BASE_AMOUNT;

    if (offerPriceNow) {
      offerPriceNow.textContent = rub;
      offerPriceNow.classList.toggle("is-discounted", isDiscounted);
    }

    if (offerPriceSave) {
      const save = LIST_PRICE - amountKopecks / 100;
      offerPriceSave.textContent = "экономия " + save.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽";
    }

    if (stickyCtaPrice) {
      stickyCtaPrice.textContent = rub;
    }

    if (offerCta && !offerCta.classList.contains("is-loading")) {
      offerCta.textContent = ctaLabel(amountKopecks);
    }
  }

  function resetPromoState() {
    appliedPromoCode = "";
    updatePriceUI(BASE_AMOUNT);
    hidePromoMessage();
  }

  async function applyPromo() {
    if (!offerPromo || !offerPromoApply) return;

    hideFormError();
    const code = offerPromo.value.trim();

    if (!code) {
      resetPromoState();
      return;
    }

    offerPromoApply.disabled = true;
    offerPromoApply.textContent = "Проверка…";

    try {
      const response = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoCode: code }),
      });

      const data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        throw new Error(data.error || "Не удалось проверить промокод.");
      }

      if (data.valid) {
        appliedPromoCode = data.code || code.toUpperCase();
        updatePriceUI(data.finalAmount);
        showPromoMessage(data.message || "Промокод применён", "success");
      } else {
        appliedPromoCode = "";
        updatePriceUI(BASE_AMOUNT);
        showPromoMessage(data.message || "Промокод не найден или уже не действует", "error");
      }
    } catch (err) {
      showFormError(err.message || "Ошибка проверки промокода.");
    } finally {
      offerPromoApply.disabled = false;
      offerPromoApply.textContent = "Применить";
    }
  }

  function updateOfferCta() {
    if (!offerCta || !consentPrivacy || !consentOffer) return;
    const enabled =
      consentPrivacy.checked &&
      consentOffer.checked &&
      isEmailValid() &&
      !offerCta.classList.contains("is-loading");

    offerCta.classList.toggle("is-disabled", !enabled);
    offerCta.setAttribute("aria-disabled", String(!enabled));
    offerCta.disabled = !enabled;
  }

  async function startPayment() {
    if (!offerCta || offerCta.classList.contains("is-disabled") || offerCta.disabled) return;

    hideFormError();

    const payload = {
      name: offerName ? offerName.value.trim() : "",
      email: normalizeEmail(offerEmail.value),
      promoCode: appliedPromoCode,
      consentPrivacy: consentPrivacy.checked,
      consentOffer: consentOffer.checked,
    };

    offerCta.classList.add("is-loading");
    offerCta.textContent = "Подготовка оплаты…";
    updateOfferCta();

    try {
      const response = await fetch("/api/payment/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        throw new Error(data.message || data.error || "Не удалось начать оплату. Попробуйте позже.");
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }

      throw new Error("Сервер не вернул ссылку на оплату.");
    } catch (err) {
      showFormError(err.message || "Ошибка соединения с сервером.");
      offerCta.classList.remove("is-loading");
      offerCta.textContent = ctaLabel(currentAmount);
      updateOfferCta();
    }
  }

  if (offerCta && consentPrivacy && consentOffer && offerEmail) {
    consentPrivacy.addEventListener("change", updateOfferCta);
    consentOffer.addEventListener("change", updateOfferCta);
    offerEmail.addEventListener("input", function () {
      hideFormError();
      updateEmailFeedback();
      updateOfferCta();
    });
    offerEmail.addEventListener("blur", function () {
      if (offerEmail.value.trim()) {
        offerEmail.value = normalizeEmail(offerEmail.value);
      }
      updateEmailFeedback();
      updateOfferCta();
    });

    if (offerPromoApply) {
      offerPromoApply.addEventListener("click", applyPromo);
    }

    if (offerPromo) {
      offerPromo.addEventListener("input", function () {
        if (appliedPromoCode && offerPromo.value.trim().toUpperCase() !== appliedPromoCode) {
          appliedPromoCode = "";
          updatePriceUI(BASE_AMOUNT);
          hidePromoMessage();
        }
      });

      offerPromo.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          applyPromo();
        }
      });
    }

    offerCta.addEventListener("click", startPayment);

    document.querySelectorAll(".offer-check__link").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    });

    updatePriceUI(BASE_AMOUNT);
    updateOfferCta();
  }
})();
