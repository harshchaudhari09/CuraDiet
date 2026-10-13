// CuraDiet front-end: smooth scrolling, scroll reveals, count-up numbers and the
// step-by-step form. Every page still works without this file (plain form + server).
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Smooth scrolling (Lenis); falls back to native scrolling if the CDN fails ──
  var lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new Lenis({ lerp: 0.09 });
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  function scrollToEl(el, immediate) {
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -96, duration: 1.3, immediate: !!immediate });
    else el.scrollIntoView({ behavior: immediate ? "auto" : "smooth" });
  }

  // In-page links ("#check" or "/#check" while on the home page) scroll smoothly
  document.querySelectorAll('a[href^="#"], a[href^="/#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var hash = a.getAttribute("href").replace(/^\//, "");
      var target = hash.length > 1 && document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      scrollToEl(target);
      history.replaceState(null, "", hash);
    });
  });
  // Arriving with a hash (e.g. /?example=1#check): jump there once the layout settles
  if (location.hash.length > 1) {
    var start = document.querySelector(location.hash);
    if (start) window.addEventListener("load", function () { scrollToEl(start, true); });
  }

  // ── Nav: frosted once scrolled, tucks away while scrolling down ──
  var nav = document.getElementById("nav");
  var lastY = 0;
  window.addEventListener("scroll", function () {
    var y = window.scrollY;
    nav.classList.toggle("scrolled", y > 24);
    if (y > 480 && y > lastY + 4) nav.classList.add("hide");
    else if (y < lastY - 4 || y <= 480) nav.classList.remove("hide");
    lastY = y;
  }, { passive: true });

  // ── Count-up numbers (the real value is already in the HTML) ──
  function format(n, el) {
    var decimals = Number(el.dataset.decimals || 0);
    var s = n.toFixed(decimals);
    if (el.dataset.format === "comma") s = Number(s).toLocaleString("en-IN");
    return s;
  }
  function countUp(el) {
    var end = Number(el.dataset.count);
    if (reduceMotion || !isFinite(end)) return;
    var t0 = performance.now(), dur = 1400;
    (function step(t) {
      var p = Math.min(1, (t - t0) / dur), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(end * eased, el);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  // ── Reveal on scroll: sections fade up, charts fill, numbers count ──
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      el.classList.add("in");
      el.querySelectorAll("[data-count]").forEach(countUp);
      if (el.dataset.count) countUp(el);
      io.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -30px 0px" });
  document.querySelectorAll(".reveal, #steps, #demoCard").forEach(function (el) { io.observe(el); });

  // ── Hero example card tilts gently toward the cursor ──
  var demo = document.getElementById("demoCard");
  if (demo && !reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    var hero = document.querySelector(".hero");
    hero.addEventListener("mousemove", function (e) {
      var r = demo.getBoundingClientRect();
      var x = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      var y = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      demo.style.transform = "perspective(1200px) rotateY(" + x * 10 + "deg) rotateX(" + -y * 8 + "deg)";
    });
    hero.addEventListener("mouseleave", function () { demo.style.transform = ""; });
  }

  // ── Step-by-step form (only for a fresh, empty form) ──
  var form = document.getElementById("riskForm");
  if (form && form.dataset.stepper === "on") {
    var steps = Array.prototype.slice.call(form.querySelectorAll(".fstep"));
    var labels = form.querySelectorAll(".ps");
    var bar = form.querySelector(".progress-bar i");
    var back = form.querySelector('.step-btn[data-dir="-1"]');
    var next = form.querySelector('.step-btn[data-dir="1"]');
    var submit = form.querySelector(".submit-btn");
    var current = 0;

    form.classList.add("stepper");

    var show = function (i) {
      current = i;
      steps.forEach(function (s, n) { s.classList.toggle("is-active", n === i); });
      labels.forEach(function (l, n) { l.classList.toggle("is-on", n <= i); });
      bar.style.width = ((i + 1) / steps.length) * 100 + "%";
      back.classList.toggle("is-hidden", i === 0);
      next.classList.toggle("is-hidden", i === steps.length - 1);
      submit.classList.toggle("is-hidden", i !== steps.length - 1);
    };

    // Uses the browser's own checks (required, min, max) for the fields on this step;
    // the server validates everything again on submit.
    var stepIsValid = function (i) {
      var fields = steps[i].querySelectorAll("input, select");
      for (var n = 0; n < fields.length; n++) {
        if (!fields[n].checkValidity()) { fields[n].reportValidity(); return false; }
      }
      return true;
    };

    form.querySelectorAll(".step-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var dir = Number(b.dataset.dir);
        if (dir > 0 && !stepIsValid(current)) return;
        show(Math.max(0, Math.min(steps.length - 1, current + dir)));
        scrollToEl(form.closest(".form-card"));
      });
    });

    // Enter on an earlier step moves forward instead of submitting half a form
    form.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.tagName === "INPUT" && current < steps.length - 1) {
        e.preventDefault();
        next.click();
      }
    });

    show(0);
  }
})();
