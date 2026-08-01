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

  /* ---- Intro: video de fuego, primeros 6 s a pantalla completa → esfuma → entra ---- */
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
    /* Sólo se parte "del Sur". La línea "Estampas" lleva el collage con
       background-clip:text, y envolver cada letra en spans transformados
       rompe ese recorte (cada letra pasaría a ser su propia capa y el
       mosaico se cortaría por letra en vez de correr continuo). Esa línea
       entra con el revelado tipo cortina, que sí lo respeta. */
    title.querySelectorAll(".line-mask.hero__title-em").forEach((line) => {
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

  /* El video del intro pesa ~2 MB. En "ahorro de datos" o en conexiones
     lentas (2g/3g) eso es una pantalla negra esperando como primera
     impresión: en ese caso se saltea y se entra directo al hero. */
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const slowNet = !!conn && (conn.saveData === true ||
                  /^(slow-2g|2g|3g)$/.test(conn.effectiveType || ""));

  if (!intro || reduceMotion || slowNet || sessionStorage.getItem("introSeen")) {
    if (intro) intro.remove();
    startHero();
  } else {
    document.body.classList.add("intro-open");

    const CUT = 6; // reproducir los primeros 6 s del video, luego esfumar

    // Cierre: congela el frame y esfuma (recién ahí se revela la página)
    const finishIntro = () => { freezeVideo(); dismissIntro(); };

    // Fallback por tiempo real, contado desde que el video EMPIEZA a verse
    const beginTimers = () => {
      if (timersOn) return; timersOn = true;
      endTimer = setTimeout(finishIntro, CUT * 1000 + 150);
    };

    if (introVideo) {
      introVideo.addEventListener("loadedmetadata", () => { introVideo.playbackRate = 1; });
      introVideo.addEventListener("playing", beginTimers);

      // Recién acá arranca la descarga del video del intro
      introVideo.preload = "auto";
      introVideo.src = introVideo.dataset.src;
      introVideo.load();

      // Cierre preciso al alcanzar los 6 s reales de reproducción
      const onTime = () => {
        if (introVideo.currentTime >= CUT) {
          introVideo.removeEventListener("timeupdate", onTime);
          finishIntro();
        }
      };
      introVideo.addEventListener("timeupdate", onTime);

      const startPlay = () => {
        introVideo.playbackRate = 1;
        const p = introVideo.play?.();
        if (p && p.catch) p.catch(() => {});
      };
      // Esperar a tener buffer suficiente para que no se trabe
      if (introVideo.readyState >= 3) startPlay();
      else introVideo.addEventListener("canplaythrough", startPlay, { once: true });
      // Si en 2.5s no arrancó (buffer lento/autoplay), arrancar igual
      setTimeout(() => { if (!timersOn) { startPlay(); beginTimers(); } }, 2500);
    } else {
      beginTimers();
    }

    introSkip?.addEventListener("click", finishIntro);
    capTimer = setTimeout(finishIntro, 9000); // tope duro de seguridad
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
    document.body.classList.toggle("menu-open", isOpen);
    // Al abrir, el foco entra al panel; al cerrar, vuelve al botón que lo abrió
    if (isOpen) links.querySelector("a")?.focus();
    else if (document.activeElement && links.contains(document.activeElement)) burger.focus();
  };
  burger.addEventListener("click", () => toggleMenu());
  links.querySelectorAll("a").forEach(a =>
    a.addEventListener("click", () => toggleMenu(false))
  );

  // Escape cierra el menú (vía de salida estándar)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && links.classList.contains("is-open")) toggleMenu(false);
  });
  // Tocar fuera del panel también lo cierra
  document.addEventListener("pointerdown", (e) => {
    if (!links.classList.contains("is-open")) return;
    if (links.contains(e.target) || burger.contains(e.target)) return;
    toggleMenu(false);
  });
  // El foco no se escapa del panel abierto mientras se tabula
  links.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || !links.classList.contains("is-open")) return;
    const focusables = [...links.querySelectorAll("a")];
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

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
        // data-suffix="" fuerza cifra exacta; sin el atributo, sigue el "+"
        const suffix = el.dataset.suffix !== undefined ? el.dataset.suffix : "+";
        el.textContent = Math.round(target * eased) + (p === 1 ? suffix : "");
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
        angle += 0.5 + dv * 0.35;              // giro base + aporte del scroll
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
    const wrap = btn.closest(".video");
    if (!wrap) return;
    const title = btn.dataset.title || "Estampas del Sur";
    // El estado vive ACÁ, fuera del click. Antes el listener de Escape se
    // registraba adentro del handler: cada apertura sumaba uno nuevo, y los
    // viejos seguían apuntando al iframe ya borrado. Al reabrir, Escape
    // corría primero el cierre viejo — sacaba is-playing (volvía la
    // miniatura) pero dejaba el iframe NUEVO reproduciendo abajo.
    let frame = null, close = null;

    const closeVideo = () => {
      if (!frame) return;
      frame.remove();
      close.remove();
      frame = close = null;
      wrap.classList.remove("is-playing");
      btn.focus();                         // el foco vuelve de donde salió
    };

    // Una sola vez por tarjeta, no una por apertura
    wrap.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeVideo();
    });

    btn.addEventListener("click", () => {
      if (frame) return;
      const id = btn.dataset.yt;

      frame = document.createElement("iframe");
      frame.className = "video__frame";
      frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
      frame.title = `Videoclip «${title}» de Estampas del Sur`;
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.allowFullscreen = true;
      frame.loading = "lazy";

      // Botón de cierre: antes se hacía btn.replaceWith(frame), que DESTRUÍA
      // el botón — abierto un video no había forma de volver a la miniatura
      // sin recargar la página.
      close = document.createElement("button");
      close.type = "button";
      close.className = "video__close";
      close.setAttribute("aria-label", `Cerrar «${title}» y volver a la miniatura`);
      close.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      close.addEventListener("click", closeVideo);

      wrap.classList.add("is-playing");
      // Después del botón (oculto) y ANTES del <figcaption>: si se agregara al
      // final, el player quedaría debajo del título de la tarjeta.
      btn.after(frame, close);
      close.focus();
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

    // Precargar sólo el metadata de cada tema para mostrar su duración.
    // Se difiere hasta que la sección se acerca: antes esto disparaba tres
    // pedidos de red apenas cargaba la página, incluso para quien nunca
    // bajaba hasta el repertorio (y hay servidores que ignoran el Range y
    // mandan el archivo entero — «La Refalosa» pesa varios MB).
    let probed = false;
    const probeDurations = () => {
      if (probed) return;
      probed = true;
      repTracks.forEach((t) => {
        const probe = new Audio();
        probe.preload = "metadata";
        probe.src = t.dataset.src;
        probe.addEventListener("loadedmetadata", () => {
          const el = t.querySelector("[data-dur]");
          if (el) el.textContent = fmt(probe.duration);
        });
      });
    };
    const repSection = document.getElementById("repertorio");
    if (repSection && "IntersectionObserver" in window) {
      const durIO = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        durIO.disconnect();
        probeDurations();
      }, { rootMargin: "600px 0px" });
      durIO.observe(repSection);
      // Red de seguridad: si el observer no llega a disparar nunca, las
      // duraciones se quedarían en "--:--" para siempre. Igual se espera a
      // que la página termine de cargar, que era el punto: no competir con
      // la portada y las tipografías durante el arranque.
      setTimeout(probeDurations, 6000);
    } else {
      probeDurations();
    }

    const seekOf = (t) => t.querySelector(".track__seek");
    const curOf  = (t) => t.querySelector("[data-cur]");
    const errOf  = (t) => t.querySelector(".track__error");
    let current = null, scrubbing = false;

    // Pinta la porción ya reproducida de la barra
    const paint = (s) => {
      const max = Number(s.max) || 0;
      s.style.setProperty("--pct", max ? (Number(s.value) / max) * 100 : 0);
    };

    // Deja la fila anterior como si nunca se hubiera tocado
    const resetTrack = (t) => {
      if (!t) return;
      t.classList.remove("is-current", "is-playing", "is-loading");
      const s = seekOf(t); if (s) { s.value = 0; s.disabled = true; paint(s); }
      const c = curOf(t);  if (c) c.textContent = "0:00";
      const e = errOf(t);  if (e) e.hidden = true;
    };

    const play = (t) => {
      if (current === t && !repAudio.paused) { repAudio.pause(); return; }
      if (current !== t) {
        resetTrack(current);
        repAudio.src = t.dataset.src;
        current = t;
        t.classList.add("is-current", "is-loading");
        errOf(t) && (errOf(t).hidden = true);
      }
      const p = repAudio.play();
      // El fallo YA NO se traga en silencio: antes la fila simplemente no
      // hacía nada y el usuario no sabía si había roto algo.
      if (p && p.catch) p.catch((err) => {
        t.classList.remove("is-loading");
        // AbortError = el usuario saltó a otro tema antes de que arrancara
        // éste. Es uso normal, no una falla: no hay que alarmarlo.
        if (err && err.name === "AbortError") return;
        const e = errOf(t); if (e) e.hidden = false;
      });
    };

    repTracks.forEach((t) => {
      t.querySelector(".track__toggle").addEventListener("click", () => play(t));

      const seek = seekOf(t);
      if (!seek) return;
      // input = arrastre y flechas del teclado; se marca scrubbing para que
      // timeupdate no pelee con la mano del usuario
      seek.addEventListener("input", () => {
        if (current !== t || !isFinite(repAudio.duration)) return;
        scrubbing = true;
        paint(seek);
        const c = curOf(t); if (c) c.textContent = fmt(Number(seek.value));
      });
      const commit = () => {
        if (current !== t || !isFinite(repAudio.duration)) return;
        repAudio.currentTime = Number(seek.value);
        scrubbing = false;
      };
      seek.addEventListener("change", commit);
      seek.addEventListener("pointerup", commit);
    });

    repAudio.addEventListener("loadedmetadata", () => {
      if (!current) return;
      const s = seekOf(current);
      if (s && isFinite(repAudio.duration)) { s.max = repAudio.duration; s.disabled = false; paint(s); }
      const d = current.querySelector("[data-dur]");
      if (d) d.textContent = fmt(repAudio.duration);
    });
    repAudio.addEventListener("timeupdate", () => {
      if (!current || scrubbing) return;
      const s = seekOf(current); if (s) { s.value = repAudio.currentTime; paint(s); }
      const c = curOf(current);  if (c) c.textContent = fmt(repAudio.currentTime);
    });
    // Buffer vacío a mitad de camino: vuelve el spinner
    repAudio.addEventListener("waiting", () => current && current.classList.add("is-loading"));
    repAudio.addEventListener("playing", () => current && current.classList.remove("is-loading"));
    repAudio.addEventListener("canplay", () => current && current.classList.remove("is-loading"));
    repAudio.addEventListener("error", () => {
      if (!current) return;
      current.classList.remove("is-loading", "is-playing");
      const e = errOf(current); if (e) e.hidden = false;
    });

    // El botón dice lo que va a hacer, no lo que está pasando
    const syncLabels = () => {
      repTracks.forEach((t) => {
        const b = t.querySelector(".track__toggle");
        const title = t.querySelector(".track__title").textContent.trim();
        const playing = t === current && !repAudio.paused;
        b.setAttribute("aria-label", (playing ? "Pausar " : "Reproducir ") + title);
      });
    };

    repAudio.addEventListener("play", () => {
      repTracks.forEach((t) => t.classList.remove("is-playing"));
      if (current) current.classList.add("is-playing");
      syncLabels();
    });
    repAudio.addEventListener("pause", () => {
      current && current.classList.remove("is-playing");
      syncLabels();
    });
    repAudio.addEventListener("ended", () => {
      // Queda "current" para que se vea dónde terminó, pero vuelve a cero
      if (current) {
        current.classList.remove("is-playing", "is-loading");
        const s = seekOf(current); if (s) { s.value = 0; paint(s); }
        const c = curOf(current);  if (c) c.textContent = "0:00";
      }
    });
  }

  /* ---- Galería: slideshow con crossfade, Ken Burns y auto-avance ---- */
  (function initSlideshow() {
    const box = document.getElementById("slideshow");
    if (!box) return;
    const slides = [...box.querySelectorAll(".slide")];
    if (slides.length < 2) return;
    const dotsWrap = box.querySelector(".slideshow__dots");
    const status = document.getElementById("slideshowStatus");
    const INTERVAL = 5000;
    const total = slides.length;
    let idx = 0, timer = 0;

    const dots = slides.map((_, i) => {
      const d = document.createElement("button");
      d.className = "slideshow__dot"; d.type = "button";
      d.setAttribute("aria-label", `Ir a la foto ${i + 1} de ${total}`);
      d.addEventListener("click", () => go(i, true));
      dotsWrap.appendChild(d);
      return d;
    });

    const render = () => {
      slides.forEach((s, i) => s.classList.toggle("is-active", i === idx));
      dots.forEach((d, i) => {
        d.classList.toggle("is-active", i === idx);
        // aria-current reemplaza al aria-selected del tablist que había antes:
        // acá los puntos son botones, no pestañas.
        if (i === idx) d.setAttribute("aria-current", "true");
        else d.removeAttribute("aria-current");
      });
      if (status) status.textContent = `Foto ${idx + 1} de ${total}`;
    };
    const go = (i, manual) => {
      idx = (i + total) % total;
      render();
      if (manual) restart();
    };
    const restart = () => {
      clearInterval(timer);
      if (reduceMotion) return;
      // Mientras el usuario está encima o con el foco adentro, nada se mueve
      // solo: reanudar el ciclo bajo la mano de alguien que está eligiendo
      // una foto es exactamente lo que hace odioso a un carrusel.
      if (box.matches(":hover") || box.contains(document.activeElement)) return;
      timer = setInterval(() => go(idx + 1), INTERVAL);
    };
    const pause = () => clearInterval(timer);

    box.querySelector(".slideshow__nav--next").addEventListener("click", () => go(idx + 1, true));
    box.querySelector(".slideshow__nav--prev").addEventListener("click", () => go(idx - 1, true));
    box.addEventListener("mouseenter", pause);
    box.addEventListener("mouseleave", restart);
    // El auto-avance se frenaba SÓLO con el mouse encima. Quien navega con
    // teclado quedaba peleando contra un carrusel que se le movía solo
    // mientras tabulaba por los puntos.
    box.addEventListener("focusin", pause);
    box.addEventListener("focusout", (e) => {
      if (!box.contains(e.relatedTarget)) restart();
    });
    // Flechas para moverse, como en cualquier carrusel
    box.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(idx + 1, true); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(idx - 1, true); }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pause(); else restart();
    });

    render();
    restart();
  })();

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

    /* (Acá había un parallax sobre ".gallery__item img". Esa grilla ya no
       existe: la galería pasó a ser el slideshow, así que el selector no
       encontraba nada.) */

    /* Stagger de las tarjetas de integrantes */
    const cards = document.querySelector(".cards[data-stagger]");
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
