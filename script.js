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

  /* ---------- Согласия перед оплатой ---------- */
  const offerCta = document.getElementById("offerCta");
  const consentPrivacy = document.getElementById("consentPrivacy");
  const consentOffer = document.getElementById("consentOffer");

  function updateOfferCta() {
    if (!offerCta || !consentPrivacy || !consentOffer) return;
    const enabled = consentPrivacy.checked && consentOffer.checked;
    offerCta.classList.toggle("is-disabled", !enabled);
    offerCta.setAttribute("aria-disabled", String(!enabled));
    if (enabled) {
      offerCta.removeAttribute("tabindex");
    } else {
      offerCta.setAttribute("tabindex", "-1");
    }
  }

  if (offerCta && consentPrivacy && consentOffer) {
    consentPrivacy.addEventListener("change", updateOfferCta);
    consentOffer.addEventListener("change", updateOfferCta);

    offerCta.addEventListener("click", function (e) {
      if (offerCta.classList.contains("is-disabled")) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      alert(
        "Оплата скоро будет доступна. Если вы хотите получить доступ сейчас, напишите нам на Y-kopasova@inbox.ru"
      );
    });

    document.querySelectorAll(".offer-check__link").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    });

    updateOfferCta();
  }
})();
