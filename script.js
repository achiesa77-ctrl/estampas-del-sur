/* =========================================================
   ESTAMPAS DEL SUR — interacciones
   Base en vanilla (funciona sin internet) + GSAP como mejora.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer  = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---- Año dinámico en el footer ---- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Intro: video 6s a pantalla completa → imagen del logo 2s → entrar ---- */
  const intro = document.getElementById("intro");
  const introVideo = document.getElementById("introVideo");
  const introSkip = document.getElementById("introSkip");
  // Al entrar al sitio: revela el hero y DIFIERE las animaciones GSAP
  // (así el video del intro no compite por CPU y no se traba).
  const startHero = () => {
    if (!reduceMotion) splitHeroTitle();
    requestAnimationFrame(() => document.body.classList.add("is-loaded"));
    setTimeout(initScrollFX, 350);
  };

  /* ---- Split del título del hero: envuelve cada letra en su propio span ----
     Preserva el <em> (itálica serif) y numera las letras con --i para la
     cascada. El movimiento lo hace el CSS (.hero__title .ch). */
  function splitHeroTitle() {
    const title = document.querySelector(".hero__title");
    if (!title || title.dataset.split) return;
    title.dataset.split = "1";
    let i = 0;
    const wrap = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {                 // nodo de texto
          const frag = document.createDocumentFragment();
          [...child.textContent].forEach((chr) => {
            if (chr === " " || chr === " ") {
              frag.appendChild(document.createTextNode(" "));
              return;
            }
            const outer = document.createElement("span");
            outer.className = "char";
            const inner = document.createElement("span");
            inner.className = "ch";
            inner.textContent = chr;
            inner.style.setProperty("--i", i++);
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          wrap(child);                              // p.ej. <em>del Sur</em>
        }
      });
    };
    title.querySelectorAll(".line-mask").forEach((line) => {
      line.classList.add("is-split");
      wrap(line.querySelector(":scope > span") || line);
    });
  }

  let freezeTimer, endTimer, capTimer, timersOn = false;
  const freezeVideo = () => { try { introVideo && introVideo.pause(); } catch (e) {} };
  const dismissIntro = () => {
    if (!intro || intro.classList.contains("is-hidden")) return;
    clearTimeout(freezeTimer); clearTimeout(endTimer); clearTimeout(capTimer);
    intro.classList.add("is-hidden");
    document.body.classList.remove("intro-open");
    sessionStorage.setItem("introSeen", "1");
    startHero();
    setTimeout(() => intro.remove(), 1000);
  };

  if (!intro || reduceMotion || sessionStorage.getItem("introSeen")) {
    if (intro) intro.remove();
    startHero();
  } else {
    document.body.classList.add("intro-open");

    // Los 5s se cuentan desde que el video EMPIEZA a verse (no desde la carga)
    const beginTimers = () => {
      if (timersOn) return; timersOn = true;
      freezeTimer = setTimeout(freezeVideo, 5000);   // 5s de video → congelar
      endTimer    = setTimeout(dismissIntro, 7000);  // +2s leyendo → entrar
    };

    if (introVideo) {
      const fit5s = () => {
        const d = introVideo.duration;
        introVideo.playbackRate = (d && isFinite(d)) ? Math.min(2, Math.max(0.5, d / 5)) : 2;
      };
      introVideo.addEventListener("loadedmetadata", fit5s);
      introVideo.addEventListener("playing", beginTimers);
      introVideo.addEventListener("ended", freezeVideo);

      const startPlay = () => {
        fit5s();
        const p = introVideo.play?.();
        if (p && p.catch) p.catch(() => {});
      };
      // Esperar a tener buffer suficiente para que no se trabe
      if (introVideo.readyState >= 3) startPlay();
      else introVideo.addEventListener("canplaythrough", startPlay, { once: true });
      // Si en 2.5s no arrancó (buffer lento/autoplay), arrancar igual la secuencia
      setTimeout(() => { if (!timersOn) { startPlay(); beginTimers(); } }, 2500);
    } else {
      beginTimers();
    }

    introSkip?.addEventListener("click", dismissIntro);
    capTimer = setTimeout(dismissIntro, 11000); // tope duro de seguridad
  }

  /* ---- Nav: fondo sólido al hacer scroll ---- */
  const nav = document.getElementById("nav");
  const progress = document.getElementById("progress");
  const toTop = document.getElementById("toTop");
  const onScroll = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 40);
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
    }
    if (toTop) toTop.classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  toTop?.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })
  );

  /* ---- Nav inteligente: resalta la sección actual (scrollspy) ---- */
  const navLinkMap = new Map();
  document.querySelectorAll('.nav__links a[href^="#"]').forEach(a => {
    const id = a.getAttribute("href").slice(1);
    if (id) navLinkMap.set(id, a);
  });
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const link = navLinkMap.get(entry.target.id);
      if (!link) return;
      navLinkMap.forEach(a => a.classList.remove("is-active"));
      link.classList.add("is-active");
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  navLinkMap.forEach((_, id) => {
    const sec = document.getElementById(id);
    if (sec) spy.observe(sec);
  });

  /* ---- Menú móvil ---- */
  const burger = document.getElementById("navBurger");
  const links = document.getElementById("navLinks");
  const toggleMenu = (open) => {
    const isOpen = open ?? !links.classList.contains("is-open");
    links.classList.toggle("is-open", isOpen);
    burger.classList.toggle("is-open", isOpen);
    burger.setAttribute("aria-expanded", String(isOpen));
  };
  burger.addEventListener("click", () => toggleMenu());
  links.querySelectorAll("a").forEach(a =>
    a.addEventListener("click", () => toggleMenu(false))
  );

  /* ---- Revelados al hacer scroll (IntersectionObserver, siempre) ---- */
  const reveals = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const delay = Number(el.dataset.delay || 0) * 90;
      setTimeout(() => el.classList.add("is-in"), delay);
      io.unobserve(el);
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });
  reveals.forEach(el => io.observe(el));

  /* ---- Contador animado de estadísticas ---- */
  const nums = document.querySelectorAll(".stat__num");
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count);
      const dur = 1600, start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + (p === 1 ? "+" : "");
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      countIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  nums.forEach(el => countIO.observe(el));

  /* ---- Parallax del hero: scroll + mouse ---- */
  const parallaxEls = [...document.querySelectorAll("[data-parallax]")];
  let mx = 0, my = 0, sy = 0;
  const applyParallax = () => {
    parallaxEls.forEach(el => {
      const depth = parseFloat(el.dataset.parallax);
      el.style.transform =
        `translate3d(${mx * depth * 40}px, ${my * depth * 40 + sy * depth}px, 0)`;
    });
  };
  if (!reduceMotion && parallaxEls.length) {
    window.addEventListener("mousemove", (e) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
      requestAnimationFrame(applyParallax);
    }, { passive: true });
    window.addEventListener("scroll", () => {
      if (window.scrollY < window.innerHeight) { sy = window.scrollY; requestAnimationFrame(applyParallax); }
    }, { passive: true });
  }

  /* ---- Micro-interacción: presionar botones (scale 0.97) ---- */
  document.querySelectorAll(".btn").forEach(b => {
    b.addEventListener("pointerdown", () => b.style.transform = "translateY(-1px) scale(0.97)");
    const reset = () => b.style.transform = "";
    b.addEventListener("pointerup", reset);
    b.addEventListener("pointerleave", reset);
  });

  /* ---- Vinilo: siempre girando + el scroll lo acelera ----
     Giro base continuo (como un disco andando) y, al scrollear, suma
     rotación según la velocidad. El loop sólo corre cuando la sección
     está a la vista (eficiencia). Con reduced-motion queda el spin CSS. */
  const vinylDisc = document.querySelector(".vinyl__disc");
  const discoSec  = document.getElementById("disco");
  if (vinylDisc && discoSec && !reduceMotion) {
    vinylDisc.style.animation = "none";
    let angle = 0, lastY = window.scrollY;
    // El navegador ya congela rAF cuando la pestaña está oculta y lo
    // reanuda al volver: no hace falta pausar a mano.
    const loop = () => {
      const rect = discoSec.getBoundingClientRect();
      const near = rect.bottom > -200 && rect.top < window.innerHeight + 200;
      if (near) {
        const y = window.scrollY;
        const dv = y - lastY; lastY = y;
        angle += 0.22 + dv * 0.35;             // giro base + aporte del scroll
        vinylDisc.style.transform = `rotate(${angle}deg)`;
      } else {
        lastY = window.scrollY;                // fuera de vista: sólo sigue el scroll
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---- Videos de YouTube: miniatura (facade) → player al clickear ----
     No carga el iframe hasta el click: página más liviana y sin cookies
     de YouTube hasta que el usuario decide reproducir. */
  document.querySelectorAll(".video__btn[data-yt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.yt;
      const frame = document.createElement("iframe");
      frame.className = "video__frame";
      frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
      frame.title = "Video de Estampas del Sur";
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.allowFullscreen = true;
      frame.loading = "lazy";
      btn.replaceWith(frame);
    });
  });

  /* ---- Repertorio: reproductor de audio ----
     Una sola pista de <audio> compartida (así suena de a una). Cada fila
     toca su archivo; la duración se lee del metadata de cada uno. */
  const repTracks = [...document.querySelectorAll(".track[data-src]")];
  const repAudio = document.getElementById("repAudio");
  if (repTracks.length && repAudio) {
    const fmt = (s) => (isFinite(s) && s > 0)
      ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`
      : "--:--";

    // Precargar sólo el metadata de cada tema para mostrar su duración
    repTracks.forEach((t) => {
      const probe = new Audio();
      probe.preload = "metadata";
      probe.src = t.dataset.src;
      probe.addEventListener("loadedmetadata", () => {
        const el = t.querySelector("[data-dur]");
        if (el) el.textContent = fmt(probe.duration);
      });
    });

    let current = null;
    const play = (t) => {
      if (current === t && !repAudio.paused) { repAudio.pause(); return; }
      if (current !== t) { repAudio.src = t.dataset.src; current = t; }
      repAudio.play().catch(() => {});
    };
    repTracks.forEach((t) => {
      t.addEventListener("click", () => play(t));
      t.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); play(t); }
      });
    });
    repAudio.addEventListener("play", () => {
      repTracks.forEach((t) => t.classList.remove("is-playing"));
      if (current) current.classList.add("is-playing");
    });
    repAudio.addEventListener("pause", () => current && current.classList.remove("is-playing"));
    repAudio.addEventListener("ended", () => {
      repTracks.forEach((t) => t.classList.remove("is-playing"));
      current = null;
    });
  }

  /* ---- Brasas del fogón: partículas cálidas que suben (canvas) ---- */
  initEmbers();

  function initEmbers() {
    const canvas = document.getElementById("embers");
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1, parts = [], raf = 0;

    // Menos brasas en móvil: en pantalla chica distraen y cuestan batería
    const count = () => {
      const w = window.innerWidth;
      if (w < 640) return Math.max(6, Math.round(w / 46));  // ~8 en 375px
      return Math.min(48, Math.round(w / 26));               // desktop igual que antes
    };
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.width  = Math.floor(window.innerWidth  * dpr);
      h = canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width  = window.innerWidth  + "px";
      canvas.style.height = window.innerHeight + "px";
    };
    const make = (fromBottom) => ({
      x: Math.random() * w,
      y: fromBottom ? h + Math.random() * 40 * dpr : Math.random() * h,
      r: (0.6 + Math.random() * 1.8) * dpr,
      vy: (0.15 + Math.random() * 0.5) * dpr,
      drift: (Math.random() - 0.5) * 0.35 * dpr,
      life: 0, ttl: 240 + Math.random() * 380,
      hue: 22 + Math.random() * 20,
      phase: Math.random() * Math.PI * 2,
    });
    const seed = () => { parts = Array.from({ length: count() }, () => make(false)); };

    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const p of parts) {
        p.life++;
        p.y -= p.vy;
        p.x += p.drift + Math.sin((p.life + p.phase) * 0.02) * 0.3 * dpr;
        const inOut = Math.min(1, p.life / 40) * Math.max(0, 1 - p.life / p.ttl);
        const flick = 0.55 + Math.sin(p.life * 0.15 + p.phase) * 0.3;
        const a = inOut * flick;
        const rad = p.r * 3.6;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        g.addColorStop(0, `hsla(${p.hue},95%,63%,${a})`);
        g.addColorStop(0.4, `hsla(${p.hue - 6},92%,50%,${a * 0.5})`);
        g.addColorStop(1, "hsla(28,90%,40%,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
        if (p.y < -20 * dpr || p.life > p.ttl) Object.assign(p, make(true));
      }
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    };

    resize(); seed();
    window.addEventListener("resize", () => { resize(); seed(); }, { passive: true });
    document.addEventListener("visibilitychange", () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(frame);
    });
    raf = requestAnimationFrame(frame);
  }

  /* ========================================================
     MEJORAS CON GSAP — diferidas hasta después del intro
     (si cargó desde el CDN). Se ejecuta una sola vez.
     ======================================================== */
  function initScrollFX() {
    if (initScrollFX.done) return;
    initScrollFX.done = true;
    if (!(window.gsap && window.ScrollTrigger) || reduceMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    /* Parallax de la foto de "El Grupo" */
    const grupoImg = document.querySelector("[data-parallax-img]");
    if (grupoImg) {
      gsap.fromTo(grupoImg, { yPercent: -8 }, {
        yPercent: 8, ease: "none",
        scrollTrigger: { trigger: grupoImg.closest(".grupo"), scrub: true }
      });
    }

    /* Parallax sutil en la galería (velocidades distintas por ítem) */
    gsap.utils.toArray(".gallery__item img").forEach((img, i) => {
      gsap.fromTo(img, { yPercent: -6 }, {
        yPercent: 6 + (i % 3) * 3, ease: "none",
        scrollTrigger: { trigger: img.parentElement, scrub: 0.6 }
      });
    });

    /* Stagger de las tarjetas de integrantes */
    const cards = document.querySelector("[data-stagger]");
    if (cards) {
      gsap.from(cards.children, {
        opacity: 0, y: 40, duration: 0.6, stagger: 0.08, ease: "expo.out",
        scrollTrigger: { trigger: cards, start: "top 80%" }
      });
    }

    /* Los temas del repertorio entran deslizando */
    gsap.utils.toArray(".track").forEach((t) => {
      gsap.from(t, {
        opacity: 0, x: -24, duration: 0.5, ease: "expo.out",
        scrollTrigger: { trigger: t, start: "top 90%" }
      });
    });

    ScrollTrigger.refresh();
  }
});
