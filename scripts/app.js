(function () {
    const data = window.MEDIA_KIT_DATA;
    const root = document.getElementById("app");
    if (!data || !root) return;

    const isMobile = window.matchMedia("(max-width: 820px)").matches;

    /* =========================================================
       UTILITIES
       ========================================================= */
    const escapeHtml = (value) =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

    const setMeta = (selector, value, attribute = "content") => {
        if (!value) return;
        const node = document.querySelector(selector);
        if (node) node.setAttribute(attribute, value);
    };

    const applyTheme = (theme) => {
        if (!theme) return;
        const styles = {
            "--page-bg": theme.pageBg,
            "--surface": theme.surface,
            "--surface-alt": theme.surfaceAlt,
            "--text": theme.text,
            "--muted": theme.muted,
            "--line": theme.line,
            "--accent": theme.accent,
            "--accent-soft": theme.accentSoft,
            "--accent-strong": theme.accentStrong
        };
        Object.entries(styles).forEach(([key, value]) => {
            if (value) document.documentElement.style.setProperty(key, value);
        });
    };

    const initAnalytics = (analytics) => {
        const googleTagId = analytics && analytics.googleTagId;
        if (!googleTagId) return;
        const script = document.createElement("script");
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleTagId)}`;
        document.head.appendChild(script);
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag() { window.dataLayer.push(arguments); };
        window.gtag("js", new Date());
        window.gtag("config", googleTagId);
    };

    /* =========================================================
       SOUND ENGINE — synthesized XP-ish sounds via WebAudio
       ========================================================= */
    let audioCtx = null;
    let muted = localStorage.getItem("xpMuted") === "1";
    const ensureCtx = () => {
        if (!audioCtx) {
            try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
        }
        if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
        return audioCtx;
    };
    const beep = (freq, duration, type = "sine", gain = 0.08) => {
        if (muted) return;
        const ctx = ensureCtx();
        if (!ctx) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        osc.connect(g).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + duration + 0.05);
    };
    const sounds = {
        startup: () => {
            // 4-note ascending
            [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.35, "triangle", 0.1), i * 130));
        },
        click: () => beep(900, 0.04, "square", 0.04),
        open: () => { beep(660, 0.08, "triangle", 0.07); setTimeout(() => beep(880, 0.08, "triangle", 0.06), 60); },
        close: () => { beep(440, 0.08, "triangle", 0.06); setTimeout(() => beep(330, 0.1, "triangle", 0.05), 60); },
        error: () => { beep(220, 0.18, "sawtooth", 0.08); setTimeout(() => beep(220, 0.18, "sawtooth", 0.08), 200); },
        ding: () => { beep(1320, 0.12, "sine", 0.08); setTimeout(() => beep(1760, 0.18, "sine", 0.06), 80); },
        notify: () => { beep(880, 0.1, "triangle", 0.07); setTimeout(() => beep(1320, 0.14, "triangle", 0.06), 100); }
    };

    /* =========================================================
       RENDERERS (carry over from original)
       ========================================================= */
    const renderMetrics = (items) =>
        (items || []).map((item) => `
            <article class="metric-card">
                <div class="metric-icon tone-${escapeHtml(item.tone)}">
                    <i data-lucide="${escapeHtml(item.icon)}"></i>
                </div>
                <p class="metric-value">${escapeHtml(item.value)}</p>
                <div class="metric-label">${escapeHtml(item.label)}</div>
            </article>
        `).join("");

    const renderAudience = (audience) => {
        const segments = audience.segments || [];
        const radius = 42;
        const circumference = 2 * Math.PI * radius;
        let cumulative = 0;
        const arcs = segments.map((segment) => {
            const percentage = Number(segment.percentage) || 0;
            const dash = (percentage / 100) * circumference;
            const stroke = segment.tone === "accent" ? "var(--accent)"
                : segment.tone === "berry" ? "#8f52aa"
                : segment.tone === "sky" ? "#2563eb"
                : segment.tone === "mint" ? "#14815c" : "#cfc7be";
            const arc = `<circle class="audience-donut-segment" cx="60" cy="60" r="${radius}"
                fill="none" stroke="${stroke}" stroke-width="16" stroke-linecap="round"
                stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-cumulative}"></circle>`;
            cumulative += dash;
            return arc;
        }).join("");
        const legend = segments.map((segment) => `
            <div class="audience-legend-item">
                <span class="audience-legend-swatch tone-${escapeHtml(segment.tone)}"></span>
                <span class="audience-legend-label">${escapeHtml(segment.label)}</span>
                <span class="audience-legend-value">${escapeHtml(segment.percentage)}%</span>
            </div>
        `).join("");
        return `
            <div class="audience-donut-wrap">
                <div class="audience-donut-chart" aria-label="${escapeHtml(audience.heading)}">
                    <svg class="audience-donut-svg" viewBox="0 0 120 120" role="img" aria-hidden="true">
                        <circle class="audience-donut-track" cx="60" cy="60" r="${radius}" fill="none" stroke="#ece4da" stroke-width="16"></circle>
                        <g transform="rotate(-90 60 60)">${arcs}</g>
                    </svg>
                    <div class="audience-donut-center" aria-hidden="true"></div>
                </div>
                <div class="audience-legend">${legend}</div>
            </div>
        `;
    };

    const formatPercentage = (value) => {
        const numericValue = Number(value) || 0;
        return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(1).replace(/\.0$/, "");
    };

    const renderRanges = (items) => {
        const palette = ["#1f1b18", "var(--accent)", "#d99057", "#f0bf95"];
        const normalizedItems = (items || []).map((item) => ({
            label: item.label, percentage: Math.max(0, Number(item.percentage) || 0)
        })).sort((a, b) => b.percentage - a.percentage);
        if (!normalizedItems.length) return "";
        const smallestPercentage = Math.min(...normalizedItems.map((item) => item.percentage));
        const coloredItems = normalizedItems.map((item, index) => ({
            ...item,
            visualWeight: item.percentage === smallestPercentage ? item.percentage * 1.3 : item.percentage,
            color: palette[index % palette.length]
        }));
        const rows = coloredItems.reduce((result, item) => {
            const targetRow = result[0].total <= result[1].total ? result[0] : result[1];
            targetRow.items.push(item);
            targetRow.total += item.visualWeight;
            return result;
        }, [{ items: [], total: 0 }, { items: [], total: 0 }]).filter((row) => row.items.length);

        const renderTile = (item, extraClass = "") => `
            <article class="age-tile ${extraClass}" style="--tile-color: ${item.color}; flex: ${item.visualWeight || 1} 1 0;">
                <div class="age-tile-content">
                    <div class="age-tile-label">${escapeHtml(item.label)}</div>
                    <div class="age-tile-value">${escapeHtml(formatPercentage(item.percentage))}%</div>
                </div>
            </article>
        `;
        return `
            <div class="age-treemap" role="img" aria-label="Distribucion de audiencia por rango de edad">
                ${rows.map((row, rowIndex) => `
                    <div class="age-treemap-row" style="flex: ${row.total || 1} 1 0;">
                        ${row.items.map((item, itemIndex) => renderTile(item, rowIndex === 0 && itemIndex === 0 ? "age-tile-primary" : "age-tile-secondary")).join("")}
                    </div>
                `).join("")}
            </div>
        `;
    };

    const renderCountries = (items) => {
        const palette = ["var(--accent)", "#c96f3a", "#d99057", "#eab27f", "#b95a1b", "#d9d2c8"];
        const normalizedItems = (items || []).map((item) => ({
            label: item.label, percentage: Math.max(0, Number(item.percentage) || 0)
        }));
        const total = normalizedItems.reduce((sum, item) => sum + item.percentage, 0);
        const barScale = total > 100 ? 100 / total : 1;
        const remainder = Math.max(0, 100 - Math.min(total, 100));
        const segments = normalizedItems.map((item, index) => ({
            ...item, barPercentage: item.percentage * barScale, color: palette[index % palette.length]
        }));
        if (remainder > 0) segments.push({ label: "Otros", percentage: remainder, barPercentage: remainder, color: palette[palette.length - 1] });
        const bar = segments.map((item) => `
            <span class="country-stack-segment" style="flex-basis: ${item.barPercentage}%; background: ${item.color};"
                aria-label="${escapeHtml(item.label)} ${escapeHtml(formatPercentage(item.percentage))}%"
                title="${escapeHtml(item.label)} ${escapeHtml(formatPercentage(item.percentage))}%"></span>
        `).join("");
        const legend = segments.map((item) => `
            <div class="country-legend-item">
                <span class="country-legend-swatch" style="background: ${item.color};"></span>
                <span class="country-legend-label">${escapeHtml(item.label)}</span>
                <span class="country-value">${escapeHtml(formatPercentage(item.percentage))}%</span>
            </div>
        `).join("");
        return `
            <div class="country-breakdown">
                <div class="country-stack-bar" role="img" aria-label="Distribucion de audiencia por pais">${bar}</div>
                <div class="country-list">${legend}</div>
            </div>
        `;
    };

    const renderPortfolio = (items) =>
        (items || []).map((item) => `
            <figure class="portfolio-item">
                <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}"
                    onerror="this.onerror=null;this.src='${escapeHtml(item.fallback || "")}'">
            </figure>
        `).join("");

    const renderServices = (items) =>
        (items || []).map((item) => `
            <article class="service-card">
                <div class="service-top">
                    <div class="service-icon"><i data-lucide="${escapeHtml(item.icon)}"></i></div>
                    <div class="service-price">${escapeHtml(item.price)}</div>
                </div>
                <h3 class="service-name">${escapeHtml(item.name)}</h3>
                <p class="service-copy">${escapeHtml(item.description)}</p>
            </article>
        `).join("");

    const renderBrands = (items) =>
        (items || []).map((item) => `<span class="brand-chip">${escapeHtml(item)}</span>`).join("");

    /* =========================================================
       WINDOW SECTION CONTENT
       ========================================================= */
    const heroBody = `
        <div class="print-page print-page-cover">
            <header class="hero">
                <div class="hero-inner">
                    <p class="eyebrow">${escapeHtml(data.hero.monthLabel)}</p>
                    <h1 class="hero-title">
                        ${escapeHtml(data.hero.firstName)}
                        <span class="hero-title-accent">${escapeHtml(data.hero.lastName)}</span>
                    </h1>
                    <p class="hero-tagline">${escapeHtml(data.hero.tagline)}</p>
                    <div class="hero-actions">
                        <a class="button button-primary" href="${escapeHtml(data.hero.platformUrl)}" target="_blank" rel="noreferrer">
                            <i data-lucide="instagram"></i> ${escapeHtml(data.hero.platformLabel)}
                        </a>
                        <a class="button button-secondary" href="mailto:${escapeHtml(data.hero.contactEmail)}">
                            <i data-lucide="mail"></i> ${escapeHtml(data.hero.contactLabel)}
                        </a>
                        <button class="button button-accent" type="button" data-print-trigger>
                            <i data-lucide="download"></i> ${escapeHtml(data.hero.downloadLabel)}
                        </button>
                    </div>
                </div>
            </header>
            <section class="section section-about">
                <div class="container about-grid">
                    <div class="portrait-wrap">
                        <div class="portrait-card">
                            <img src="${escapeHtml(data.about.image)}" alt="${escapeHtml(data.about.imageAlt)}"
                                onerror="this.onerror=null;this.src='${escapeHtml(data.about.fallbackImage || "")}'">
                        </div>
                    </div>
                    <div class="about-copy">
                        <h2 class="section-title">${escapeHtml(data.about.heading)}</h2>
                        ${(data.about.paragraphs || []).map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
                        <div class="chips">
                            ${(data.about.tags || []).map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    `;

    const statsBody = `
        <div class="print-page print-page-stats">
            <section class="section stats-section">
                <div class="container">
                    <div class="stats-header">
                        <h2 class="section-title">${escapeHtml(data.stats.heading)}</h2>
                        <div class="stats-updated">${escapeHtml(data.stats.updatedLabel)}</div>
                    </div>
                    <div class="metric-grid">${renderMetrics(data.stats.keyMetrics)}</div>
                    <div class="panel-grid">
                        <article class="panel-card">
                            <h3 class="panel-title">${escapeHtml(data.stats.audience.heading)}</h3>
                            <div class="audience-bars">${renderAudience(data.stats.audience)}</div>
                        </article>
                        <article class="panel-card">
                            <h3 class="panel-title">${escapeHtml(data.stats.ageRanges.heading)}</h3>
                            <div class="range-list">${renderRanges(data.stats.ageRanges.items)}</div>
                        </article>
                        <article class="panel-card panel-card-wide">
                            <h3 class="panel-title">${escapeHtml(data.stats.topCountries.heading)}</h3>
                            ${renderCountries(data.stats.topCountries.items)}
                        </article>
                    </div>
                </div>
            </section>
        </div>
    `;

    const portfolioBody = `
        <div class="print-page print-page-offers">
            <section class="section-tight section-portfolio">
                <div class="portfolio-container">
                    <div class="portfolio-track">${renderPortfolio(data.portfolio)}</div>
                </div>
            </section>
            <section class="section section-services">
                <div class="container">
                    <div class="services-header">
                        <h2 class="section-title">${escapeHtml(data.services.heading)}</h2>
                        <p class="section-copy">${escapeHtml(data.services.description)}</p>
                    </div>
                    <div class="service-grid">${renderServices(data.services.items)}</div>
                </div>
            </section>
        </div>
    `;

    const brandsBody = `
        <div class="print-page print-page-brands">
            <section class="section brands-section">
                <div class="container brands-container">
                    <p class="eyebrow">${escapeHtml(data.brands.eyebrow)}</p>
                    <div class="brand-list">${renderBrands(data.brands.items)}</div>
                </div>
            </section>
        </div>
    `;

    const contactBody = `
        <footer class="footer">
            <div class="container">
                <h2 class="section-title">${escapeHtml(data.footer.title)}</h2>
                <p class="footer-copy">${escapeHtml(data.footer.subtitle)}</p>
                <a class="footer-email" href="mailto:${escapeHtml(data.footer.email)}">${escapeHtml(data.footer.email)}</a>
                <div class="footer-legal">${escapeHtml(data.footer.legal)}</div>
            </div>
        </footer>
    `;

    const myComputerBody = `
        <div class="xp-explorer-layout">
            <aside class="xp-explorer-sidebar">
                <div class="xp-explorer-task-group">
                    <div class="xp-explorer-task-header">Tareas del sistema</div>
                    <ul class="xp-explorer-task-list">
                        <li><button data-open="display"><i data-lucide="monitor"></i> Ver informaci&oacute;n del sistema</button></li>
                        <li><button data-open="display"><i data-lucide="settings"></i> Cambiar una configuraci&oacute;n</button></li>
                    </ul>
                </div>
                <div class="xp-explorer-task-group">
                    <div class="xp-explorer-task-header">Otros sitios</div>
                    <ul class="xp-explorer-task-list">
                        <li><a href="${escapeHtml(data.hero.platformUrl)}" target="_blank"><i data-lucide="instagram"></i> Mis Documentos</a></li>
                        <li><a href="mailto:${escapeHtml(data.footer.email)}"><i data-lucide="mail"></i> Mis Contactos</a></li>
                    </ul>
                </div>
                <div class="xp-explorer-task-group">
                    <div class="xp-explorer-task-header">Detalles</div>
                    <div style="padding:8px 10px; font-size:11px; line-height:1.5;">
                        <strong>${escapeHtml(data.hero.firstName)} ${escapeHtml(data.hero.lastName)}</strong><br>
                        Sistema de archivos: NTFS<br>
                        Espacio libre: 22.4 GB<br>
                        Tama&ntilde;o total: 40.0 GB
                    </div>
                </div>
            </aside>
            <div class="xp-explorer-content">
                <h2 style="font-family:'Trebuchet MS',sans-serif; color:#0a246a; margin:0 0 12px; font-size:22px;">Mi PC</h2>
                <div style="font-size:11px; color:#666; margin-bottom:12px;">Archivos almacenados en este equipo</div>
                <div class="xp-mycomputer-grid">
                    <div class="xp-icon" data-open="hero">
                        <div class="xp-icon-img"><i data-lucide="user-circle-2"></i></div>
                        <div class="xp-icon-label">Press Kit.doc</div>
                    </div>
                    <div class="xp-icon" data-open="stats">
                        <div class="xp-icon-img"><i data-lucide="bar-chart-3"></i></div>
                        <div class="xp-icon-label">Stats.xls</div>
                    </div>
                    <div class="xp-icon" data-open="portfolio">
                        <div class="xp-icon-img"><i data-lucide="image"></i></div>
                        <div class="xp-icon-label">Portfolio</div>
                    </div>
                    <div class="xp-icon" data-open="brands">
                        <div class="xp-icon-img"><i data-lucide="award"></i></div>
                        <div class="xp-icon-label">Marcas.txt</div>
                    </div>
                    <div class="xp-icon" data-open="contact">
                        <div class="xp-icon-img"><i data-lucide="mail"></i></div>
                        <div class="xp-icon-label">Contacto.eml</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const displayBody = `
        <div style="font-family:'Tahoma',sans-serif; font-size:11px;">
            <div style="display:flex; gap:6px; border-bottom:1px solid #aca899; margin-bottom:14px;">
                <div style="padding:4px 14px; background:#ece9d8; border:1px solid #aca899; border-bottom:1px solid #ece9d8; margin-bottom:-1px; font-weight:700;">Temas</div>
                <div style="padding:4px 14px; color:#888;">Escritorio</div>
                <div style="padding:4px 14px; color:#888;">Protector de pantalla</div>
                <div style="padding:4px 14px; color:#888;">Apariencia</div>
            </div>
            <div>Un tema es un fondo m&aacute;s un conjunto de sonidos, iconos y otros elementos que ayuda a personalizar el equipo con un solo clic.</div>
            <div style="margin-top:14px;">
                <label style="font-weight:700;">Tema:</label>
                <div class="xp-theme-options">
                    <div class="xp-theme-card is-active" data-theme="luna">
                        <div class="xp-theme-preview luna"></div>
                        Windows XP (Azul)
                    </div>
                    <div class="xp-theme-card" data-theme="olive">
                        <div class="xp-theme-preview olive"></div>
                        Verde oliva
                    </div>
                    <div class="xp-theme-card" data-theme="silver">
                        <div class="xp-theme-preview silver"></div>
                        Plata
                    </div>
                </div>
            </div>
            <div style="margin-top:18px; padding:10px; background:#f0eddc; border:1px inset #d4d0c8;">
                <strong>Vista previa:</strong> Click en un tema para aplicar instant&aacute;neamente.
            </div>
        </div>
    `;

    const recyclerBody = `
        <div style="text-align:center; padding:40px 20px; font-family:'Tahoma',sans-serif;">
            <div style="font-size:64px; margin-bottom:16px;">🗑️</div>
            <h2 style="color:#0a246a; font-family:'Trebuchet MS',sans-serif; margin:0 0 8px;">Papelera de reciclaje</h2>
            <p style="font-size:12px; color:#444; margin:0;">La papelera est&aacute; vac&iacute;a.</p>
            <p style="font-size:11px; color:#888; margin-top:24px;">Aqu&iacute; no hay rechazos — solo colaboraciones aprobadas. ✨</p>
        </div>
    `;

    const aboutMaggieBody = `
        <div style="font-family:'Tahoma',sans-serif; font-size:11px; padding:8px;">
            <div style="display:flex; align-items:center; gap:14px; padding-bottom:14px; border-bottom:1px solid #d4d0c8; margin-bottom:14px;">
                <div style="width:64px; height:64px; background:linear-gradient(135deg,#ffd9b3,#ff8c4a); border:2px solid #fff; box-shadow:1px 1px 4px rgba(0,0,0,0.3); display:grid; place-items:center; font-size:32px; font-weight:800; color:#fff; text-shadow:1px 1px 2px rgba(0,0,0,0.3);">${escapeHtml((data.hero.firstName || "M").charAt(0))}</div>
                <div>
                    <h2 style="margin:0; font-family:'Trebuchet MS',sans-serif; color:#0a246a; font-size:20px;">${escapeHtml(data.hero.firstName)} ${escapeHtml(data.hero.lastName)}</h2>
                    <div style="font-size:11px; color:#666;">${escapeHtml(data.hero.tagline || "")}</div>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:auto 1fr; gap:6px 14px; font-size:11px;">
                <strong>Sistema:</strong><span>Maggie OS v${new Date().getFullYear()}</span>
                <strong>Plataforma:</strong><span>${escapeHtml(data.hero.platformLabel || "Instagram")}</span>
                <strong>Email:</strong><span>${escapeHtml(data.footer.email)}</span>
                <strong>Mes:</strong><span>${escapeHtml(data.hero.monthLabel || "")}</span>
                <strong>Estado:</strong><span style="color:#5b9c2a; font-weight:700;">● Disponible para colaboraciones</span>
            </div>
            <div style="margin-top:18px; padding:10px; background:#fffaeb; border:1px solid #d4ba62; font-size:11px;">
                <strong>Aviso legal:</strong> Este media kit es propiedad de ${escapeHtml(data.hero.firstName)} ${escapeHtml(data.hero.lastName)}. Todos los datos verificados.
            </div>
        </div>
    `;

    /* =========================================================
       WINDOWS REGISTRY
       ========================================================= */
    // Position windows so the primary (hero) is centered and on top,
    // with supporting windows fanned around the edges for an inviting "lived-in" desktop.
    const vw = Math.max(960, window.innerWidth);
    const vh = Math.max(640, window.innerHeight - 40);
    const W_DEFAULTS = {
        hero:      { title: "Press Kit.doc — Microsoft Word",        icon: "user",        body: heroBody,         w: 700, h: 580, x: Math.round(vw / 2 - 350),       y: Math.round(vh / 2 - 290) },
        stats:     { title: "Stats.xls — Microsoft Excel",            icon: "bar-chart-3", body: statsBody,        w: 720, h: 500, x: Math.max(20, vw - 760),         y: 40 },
        portfolio: { title: "Portfolio — My Pictures",                icon: "image",       body: portfolioBody,    w: 640, h: 460, x: 30,                              y: Math.max(40, vh - 500) },
        brands:    { title: "Marcas.txt — Bloc de notas",             icon: "award",       body: brandsBody,       w: 480, h: 360, x: Math.max(20, vw - 520),         y: Math.max(40, vh - 400) },
        contact:   { title: "Outlook Express — Nuevo mensaje",        icon: "mail",        body: contactBody,      w: 540, h: 380, x: 60,                              y: 40 },
        mypc:      { title: "Mi PC",                                  icon: "monitor",     body: myComputerBody,   w: 700, h: 460, x: 100,                             y: 80 },
        display:   { title: "Propiedades de Pantalla",                icon: "settings",    body: displayBody,      w: 460, h: 420, x: Math.round(vw / 2 - 230),       y: 80 },
        recycler:  { title: "Papelera de reciclaje",                  icon: "trash-2",     body: recyclerBody,     w: 440, h: 300, x: 240,                             y: 200 },
        about:     { title: `Acerca de ${data.hero.firstName}`,       icon: "info",        body: aboutMaggieBody,  w: 420, h: 360, x: Math.round(vw / 2 - 210),       y: 160 }
    };

    const PRINT_INCLUDE = new Set(["hero", "stats", "portfolio", "brands", "contact"]);
    const xpWindowHTML = (id, def) => `
        <section class="xp-window ${PRINT_INCLUDE.has(id) ? "xp-print-include" : ""}" data-window="${id}" style="left:${def.x}px; top:${def.y}px; width:${def.w}px; height:${def.h}px; display:none;">
            <div class="xp-titlebar">
                <span class="xp-titlebar-icon"><i data-lucide="${def.icon}"></i></span>
                <span class="xp-titlebar-text">${def.title}</span>
                <div class="xp-titlebar-controls">
                    <button class="xp-tb-btn" type="button" data-win-action="minimize" aria-label="Minimizar">_</button>
                    <button class="xp-tb-btn" type="button" data-win-action="maximize" aria-label="Maximizar">&#9633;</button>
                    <button class="xp-tb-btn xp-tb-btn-close" type="button" data-win-action="close" aria-label="Cerrar">&#10005;</button>
                </div>
            </div>
            <div class="xp-window-body">${def.body}</div>
            <div class="xp-statusbar">
                <div class="xp-statusbar-cell">Listo</div>
                <div class="xp-statusbar-cell">${id}</div>
                <div class="xp-statusbar-cell">100%</div>
            </div>
            <div class="xp-resize-handle" data-resize></div>
        </section>
    `;

    /* =========================================================
       BUILD DOM
       ========================================================= */
    const desktopIcons = [
        { id: "hero",      icon: "user-circle-2", label: `${data.hero.firstName} (Press Kit)` },
        { id: "stats",     icon: "bar-chart-3",   label: "Stats.xls" },
        { id: "portfolio", icon: "image",         label: "Mis Im&aacute;genes" },
        { id: "brands",    icon: "award",         label: "Marcas.txt" },
        { id: "contact",   icon: "mail",          label: "Outlook Express" },
        { id: "mypc",      icon: "monitor",       label: "Mi PC" },
        { id: "recycler",  icon: "trash-2",       label: "Papelera" }
    ];

    root.innerHTML = `
        <!-- BOOT SEQUENCE -->
        <div class="xp-boot" id="xpBoot">
            <pre class="xp-boot-bios" id="xpBios"></pre>
            <div class="xp-boot-loading">
                <div class="xp-boot-loading-inner">
                    <div class="xp-boot-logo">
                        <span>m</span><span>a</span><span>g</span><span>gie</span>
                    </div>
                    <div class="xp-boot-bar"></div>
                    <div class="xp-boot-msg">Iniciando Maggie OS&hellip;</div>
                </div>
            </div>
            <div class="xp-welcome" id="xpWelcome">
                <div class="xp-welcome-header">
                    <div>
                        <div class="xp-welcome-title">Para empezar, haz clic en tu nombre de usuario</div>
                    </div>
                    <div class="xp-welcome-instruction">
                        Despu&eacute;s de iniciar sesi&oacute;n, podr&aacute;s explorar el media kit completo.
                    </div>
                </div>
                <div class="xp-welcome-body" id="xpWelcomeTile">
                    <div class="xp-welcome-tile">
                        <div class="xp-welcome-avatar">${escapeHtml((data.hero.firstName || "M").charAt(0))}</div>
                        <div class="xp-welcome-name">${escapeHtml(data.hero.firstName)} ${escapeHtml(data.hero.lastName)}</div>
                    </div>
                </div>
                <div class="xp-welcome-footer">
                    <div>Apague el equipo &nbsp;|&nbsp; Despu&eacute;s de iniciar sesi&oacute;n</div>
                </div>
            </div>
        </div>

        <!-- DESKTOP -->
        <div class="xp-desktop" id="xpDesktop">
            <div class="xp-icon-grid" id="xpIconGrid">
                ${desktopIcons.map((ic) => `
                    <div class="xp-icon" data-open="${ic.id}">
                        <div class="xp-icon-img"><i data-lucide="${ic.icon}"></i></div>
                        <div class="xp-icon-label">${ic.label}</div>
                    </div>
                `).join("")}
            </div>
            ${Object.entries(W_DEFAULTS).map(([id, def]) => xpWindowHTML(id, def)).join("")}
        </div>

        <!-- MOBILE SCROLL CONTAINER -->
        <div class="site-shell" id="xpMobileShell" style="display:none;">
            ${Object.entries(W_DEFAULTS)
                .filter(([id]) => ["hero", "stats", "portfolio", "brands", "contact"].includes(id))
                .map(([id, def]) => `
                    <section class="xp-window" data-mobile-window="${id}">
                        <div class="xp-titlebar">
                            <span class="xp-titlebar-icon"><i data-lucide="${def.icon}"></i></span>
                            <span class="xp-titlebar-text">${def.title}</span>
                            <div class="xp-titlebar-controls">
                                <button class="xp-tb-btn" type="button">_</button>
                                <button class="xp-tb-btn" type="button">&#9633;</button>
                                <button class="xp-tb-btn xp-tb-btn-close" type="button">&#10005;</button>
                            </div>
                        </div>
                        <div class="xp-window-body">${def.body}</div>
                    </section>
                `).join("")}
        </div>

        <!-- TASKBAR -->
        <nav class="xp-taskbar" aria-label="Barra de tareas">
            <button class="xp-start-btn" id="xpStartBtn" type="button">inicio</button>
            <div class="xp-taskbar-tasks" id="xpTaskbarTasks"></div>
            <div class="xp-tray">
                <button class="xp-tray-icon" id="xpTrayMute" title="Silenciar/Activar sonido">
                    <i data-lucide="${muted ? "volume-x" : "volume-2"}"></i>
                </button>
                <button class="xp-tray-icon" id="xpTrayBalloon" title="Notificaciones">
                    <i data-lucide="bell"></i>
                </button>
                <span class="xp-tray-icon" title="Red"><i data-lucide="wifi"></i></span>
                <span class="xp-clock" id="xpClock">--:--</span>
            </div>
        </nav>

        <!-- START MENU -->
        <div class="xp-start-menu" id="xpStartMenu" role="menu" aria-hidden="true">
            <div class="xp-start-header">
                <div class="xp-start-avatar">${escapeHtml((data.hero.firstName || "M").charAt(0))}</div>
                <div class="xp-start-username">${escapeHtml(data.hero.firstName)} ${escapeHtml(data.hero.lastName)}</div>
            </div>
            <div class="xp-start-body">
                <div class="xp-start-col">
                    <button class="xp-start-item" data-open="hero">
                        <i data-lucide="user-circle-2"></i>
                        <div><div class="xp-start-item-name">Press Kit</div><div class="xp-start-item-desc">Documento Word</div></div>
                    </button>
                    <button class="xp-start-item" data-open="stats">
                        <i data-lucide="bar-chart-3"></i>
                        <div><div class="xp-start-item-name">Estad&iacute;sticas</div><div class="xp-start-item-desc">Hoja de c&aacute;lculo</div></div>
                    </button>
                    <button class="xp-start-item" data-open="portfolio">
                        <i data-lucide="image"></i>
                        <div><div class="xp-start-item-name">Portfolio</div><div class="xp-start-item-desc">Carpeta de im&aacute;genes</div></div>
                    </button>
                    <div class="xp-start-divider"></div>
                    <button class="xp-start-item" data-open="brands">
                        <i data-lucide="award"></i>
                        <div><div class="xp-start-item-name">Marcas</div><div class="xp-start-item-desc">Bloc de notas</div></div>
                    </button>
                    <button class="xp-start-item" data-open="contact">
                        <i data-lucide="mail"></i>
                        <div><div class="xp-start-item-name">Contacto</div><div class="xp-start-item-desc">Outlook Express</div></div>
                    </button>
                </div>
                <div class="xp-start-col xp-start-col-right">
                    <button class="xp-start-item" data-open="mypc">
                        <i data-lucide="monitor"></i>
                        <div><div class="xp-start-item-name">Mi PC</div></div>
                    </button>
                    <button class="xp-start-item" data-open="display">
                        <i data-lucide="palette"></i>
                        <div><div class="xp-start-item-name">Panel de control</div></div>
                    </button>
                    <div class="xp-start-divider"></div>
                    <button class="xp-start-item" data-print-trigger>
                        <i data-lucide="printer"></i>
                        <div><div class="xp-start-item-name">Imprimir / PDF</div></div>
                    </button>
                    <button class="xp-start-item" data-open="about">
                        <i data-lucide="info"></i>
                        <div><div class="xp-start-item-name">Acerca de</div></div>
                    </button>
                    <a class="xp-start-item" href="${escapeHtml(data.hero.platformUrl)}" target="_blank">
                        <i data-lucide="instagram"></i>
                        <div><div class="xp-start-item-name">${escapeHtml(data.hero.platformLabel)}</div></div>
                    </a>
                </div>
            </div>
            <div class="xp-start-footer">
                <button class="xp-start-footer-btn" id="xpLogOff"><i data-lucide="log-out"></i> Cerrar sesi&oacute;n</button>
                <button class="xp-start-footer-btn" id="xpShutdown"><i data-lucide="power"></i> Apagar</button>
            </div>
        </div>

        <!-- CONTEXT MENU -->
        <div class="xp-context-menu" id="xpContextMenu" role="menu"></div>

        <!-- BALLOON -->
        <div class="xp-balloon" id="xpBalloon" role="alert">
            <button class="xp-balloon-close" id="xpBalloonClose" type="button">&times;</button>
            <div class="xp-balloon-header"><i data-lucide="info"></i> <span>Maggie tiene novedades</span></div>
            <div class="xp-balloon-body">Hay nuevas colaboraciones disponibles este mes. Haz clic para ver el press kit completo.</div>
        </div>

        <!-- DIALOG -->
        <div class="xp-dialog-backdrop" id="xpDialog" role="dialog" aria-modal="true">
            <div class="xp-dialog">
                <div class="xp-dialog-titlebar">
                    <span class="xp-dialog-titlebar-text" id="xpDialogTitle">Confirmar</span>
                </div>
                <div class="xp-dialog-body">
                    <div class="xp-dialog-icon info" id="xpDialogIcon"><i data-lucide="info"></i></div>
                    <div class="xp-dialog-message" id="xpDialogMessage">Mensaje</div>
                </div>
                <div class="xp-dialog-actions" id="xpDialogActions"></div>
            </div>
        </div>

        <!-- BSOD -->
        <div class="xp-bsod" id="xpBsod">
            <h1>MAGGIE_OS</h1>
            <p>A problem has been detected and Windows has been shut down to prevent damage to your collaborations.</p>
            <p>BRAND_DEAL_OVERFLOW</p>
            <p>If this is the first time you've seen this Stop error screen, restart your computer. If this screen appears again, follow these steps:</p>
            <p>* Check for new sponsorship requests in Maggie's inbox.<br>* Review the audience demographics on Stats.xls.<br>* Contact: ${escapeHtml(data.footer.email)}</p>
            <p>Technical information:</p>
            <p>*** STOP: 0x000000FF (0xC0DE, 0xCAFE, 0xMAGGIE, 0x2026)</p>
            <p style="margin-top:30px;">Beginning dump of physical memory<br>Physical memory dump complete.<br>Click anywhere to continue. _</p>
        </div>

        <!-- SCREENSAVER -->
        <div class="xp-screensaver" id="xpScreensaver">
            <canvas id="xpPipesCanvas"></canvas>
        </div>
    `;

    /* =========================================================
       BOOT SEQUENCE
       ========================================================= */
    const biosEl = document.getElementById("xpBios");
    const biosLines = [
        "MaggieBIOS v2.0.26  Copyright (C) 2026, Maggie OS",
        "",
        "CPU: Maggie Creative Core @ 4.5 GHz",
        "Memory Test : 524288K OK",
        "",
        "Detecting Primary Master   ... PressKit.doc",
        "Detecting Primary Slave    ... Stats.xls",
        "Detecting Secondary Master ... Portfolio.zip",
        "Detecting Secondary Slave  ... None",
        "",
        "Initializing USB Controllers ... Done",
        "Initializing IG Followers ...... Verified",
        "Loading Operating System ......",
        ""
    ];
    if (biosEl) {
        biosEl.innerHTML = biosLines.map((line, i) =>
            `<span class="xp-boot-bios-line" style="animation-delay:${i * 0.08}s">${escapeHtml(line)}</span>`
        ).join("\n");
    }

    const boot = document.getElementById("xpBoot");
    const welcome = document.getElementById("xpWelcome");
    const welcomeTile = document.getElementById("xpWelcomeTile");

    // After loading bar finishes (~5.4s), welcome screen waits for click
    let bootSkipped = false;
    const skipBoot = () => {
        if (bootSkipped) return;
        bootSkipped = true;
        boot.classList.add("xp-boot-done");
        sounds.startup();
        setTimeout(() => sounds.notify(), 3500);
        setTimeout(() => showBalloon(), 3000);
    };

    if (welcomeTile) {
        welcomeTile.addEventListener("click", skipBoot);
    }
    // Allow skipping the entire boot with any key
    document.addEventListener("keydown", function bootKey(e) {
        if (e.key === "Escape" || e.key === "Enter") {
            document.removeEventListener("keydown", bootKey);
            skipBoot();
        }
    });

    /* =========================================================
       MOBILE MODE
       ========================================================= */
    if (isMobile) {
        document.body.classList.add("xp-mobile-mode");
        document.getElementById("xpDesktop").style.display = "none";
        document.getElementById("xpMobileShell").style.display = "block";
        // skip welcome auto-click after boot bar
        setTimeout(() => skipBoot(), 5800);
    }

    /* =========================================================
       WINDOW MANAGER (desktop only)
       ========================================================= */
    let zCounter = 50;
    const openWindowIds = new Set();
    const windowEls = {};
    document.querySelectorAll("[data-window]").forEach((el) => {
        windowEls[el.dataset.window] = el;
    });

    const taskbarTasks = document.getElementById("xpTaskbarTasks");

    const focusWindow = (id) => {
        Object.values(windowEls).forEach((w) => w.classList.remove("is-active"));
        const win = windowEls[id];
        if (!win) return;
        win.classList.add("is-active");
        win.style.zIndex = ++zCounter;
        document.querySelectorAll(`.xp-task[data-task="${id}"]`).forEach((t) => t.classList.add("is-active"));
        document.querySelectorAll(`.xp-task:not([data-task="${id}"])`).forEach((t) => t.classList.remove("is-active"));
    };

    const ensureTaskbarBtn = (id, def) => {
        if (document.querySelector(`.xp-task[data-task="${id}"]`)) return;
        const btn = document.createElement("button");
        btn.className = "xp-task";
        btn.dataset.task = id;
        btn.innerHTML = `<i data-lucide="${def.icon}"></i><span class="xp-task-label">${def.title.split(/[—-]/)[0].trim()}</span>`;
        btn.addEventListener("click", () => {
            const win = windowEls[id];
            if (!win) return;
            if (win.classList.contains("is-minimized") || !openWindowIds.has(id)) {
                openWindow(id);
            } else if (win.classList.contains("is-active")) {
                win.classList.add("is-minimized");
                btn.classList.remove("is-active");
            } else {
                focusWindow(id);
            }
        });
        taskbarTasks.appendChild(btn);
        if (window.lucide) window.lucide.createIcons({ nameAttr: "data-lucide" });
    };

    const removeTaskbarBtn = (id) => {
        const btn = document.querySelector(`.xp-task[data-task="${id}"]`);
        if (btn) btn.remove();
    };

    const openWindow = (id) => {
        if (isMobile) {
            // scroll to mobile section
            const target = document.querySelector(`[data-mobile-window="${id}"]`);
            if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }
        const win = windowEls[id];
        const def = W_DEFAULTS[id];
        if (!win || !def) return;
        const wasOpen = openWindowIds.has(id);
        win.style.display = "flex";
        win.classList.remove("is-minimized");
        if (!wasOpen) {
            openWindowIds.add(id);
            ensureTaskbarBtn(id, def);
            sounds.open();
        }
        focusWindow(id);
    };

    const closeWindow = (id) => {
        const win = windowEls[id];
        if (!win) return;
        win.style.display = "none";
        win.classList.remove("is-maximized", "is-minimized");
        openWindowIds.delete(id);
        removeTaskbarBtn(id);
        sounds.close();
    };

    const toggleMaximize = (id) => {
        const win = windowEls[id];
        if (!win) return;
        win.classList.toggle("is-maximized");
        sounds.click();
    };

    const minimizeWindow = (id) => {
        const win = windowEls[id];
        if (!win) return;
        win.classList.add("is-minimized");
        const btn = document.querySelector(`.xp-task[data-task="${id}"]`);
        if (btn) btn.classList.remove("is-active");
        sounds.click();
    };

    /* =========================================================
       DRAG & RESIZE
       ========================================================= */
    const makeDraggable = (win) => {
        const titlebar = win.querySelector(".xp-titlebar");
        let dx = 0, dy = 0, startX = 0, startY = 0, dragging = false;
        const onDown = (e) => {
            if (win.classList.contains("is-maximized")) return;
            if (e.target.closest(".xp-titlebar-controls")) return;
            dragging = true;
            const evt = e.touches ? e.touches[0] : e;
            startX = evt.clientX;
            startY = evt.clientY;
            dx = parseInt(win.style.left) || 0;
            dy = parseInt(win.style.top) || 0;
            focusWindow(win.dataset.window);
            e.preventDefault();
        };
        const onMove = (e) => {
            if (!dragging) return;
            const evt = e.touches ? e.touches[0] : e;
            const nx = dx + (evt.clientX - startX);
            const ny = dy + (evt.clientY - startY);
            win.style.left = Math.max(0, nx) + "px";
            win.style.top = Math.max(0, ny) + "px";
        };
        const onUp = () => { dragging = false; };
        titlebar.addEventListener("mousedown", onDown);
        titlebar.addEventListener("touchstart", onDown, { passive: false });
        document.addEventListener("mousemove", onMove);
        document.addEventListener("touchmove", onMove, { passive: false });
        document.addEventListener("mouseup", onUp);
        document.addEventListener("touchend", onUp);

        // Double-click titlebar = maximize
        titlebar.addEventListener("dblclick", () => toggleMaximize(win.dataset.window));
    };

    const makeResizable = (win) => {
        const handle = win.querySelector("[data-resize]");
        if (!handle) return;
        let startX = 0, startY = 0, startW = 0, startH = 0, resizing = false;
        const onDown = (e) => {
            resizing = true;
            const evt = e.touches ? e.touches[0] : e;
            startX = evt.clientX;
            startY = evt.clientY;
            startW = win.offsetWidth;
            startH = win.offsetHeight;
            focusWindow(win.dataset.window);
            e.preventDefault();
            e.stopPropagation();
        };
        const onMove = (e) => {
            if (!resizing) return;
            const evt = e.touches ? e.touches[0] : e;
            win.style.width = Math.max(280, startW + (evt.clientX - startX)) + "px";
            win.style.height = Math.max(160, startH + (evt.clientY - startY)) + "px";
        };
        const onUp = () => { resizing = false; };
        handle.addEventListener("mousedown", onDown);
        handle.addEventListener("touchstart", onDown, { passive: false });
        document.addEventListener("mousemove", onMove);
        document.addEventListener("touchmove", onMove, { passive: false });
        document.addEventListener("mouseup", onUp);
        document.addEventListener("touchend", onUp);
    };

    Object.values(windowEls).forEach((win) => {
        makeDraggable(win);
        makeResizable(win);
        win.addEventListener("mousedown", () => focusWindow(win.dataset.window));
    });

    // Window action buttons
    document.querySelectorAll("[data-win-action]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const win = btn.closest(".xp-window");
            const id = win.dataset.window;
            const action = btn.dataset.winAction;
            if (action === "close") closeWindow(id);
            if (action === "maximize") toggleMaximize(id);
            if (action === "minimize") minimizeWindow(id);
        });
    });

    /* =========================================================
       OPEN-WINDOW DELEGATION (icons, start menu, etc.)
       ========================================================= */
    document.addEventListener("click", (e) => {
        const opener = e.target.closest("[data-open]");
        if (opener) {
            e.preventDefault();
            openWindow(opener.dataset.open);
        }
    });

    // Double-click for desktop icons
    document.querySelectorAll("#xpIconGrid .xp-icon").forEach((icon) => {
        let lastClick = 0;
        icon.addEventListener("click", (e) => {
            // single click selects
            document.querySelectorAll("#xpIconGrid .xp-icon").forEach((i) => i.classList.remove("selected"));
            icon.classList.add("selected");
            const now = Date.now();
            if (now - lastClick < 400) {
                openWindow(icon.dataset.open);
                e.stopPropagation();
            }
            lastClick = now;
        });
    });

    // Click on empty desktop deselects
    document.getElementById("xpDesktop").addEventListener("click", (e) => {
        if (e.target.id === "xpDesktop" || e.target.id === "xpIconGrid") {
            document.querySelectorAll("#xpIconGrid .xp-icon").forEach((i) => i.classList.remove("selected"));
        }
    });

    /* =========================================================
       START MENU
       ========================================================= */
    const startBtn = document.getElementById("xpStartBtn");
    const startMenu = document.getElementById("xpStartMenu");
    const toggleStart = (force) => {
        const open = force !== undefined ? force : !startMenu.classList.contains("is-open");
        startMenu.classList.toggle("is-open", open);
        startBtn.classList.toggle("is-open", open);
        if (open) sounds.click();
    };
    startBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleStart();
    });
    document.addEventListener("click", (e) => {
        if (!startMenu.contains(e.target) && e.target !== startBtn) toggleStart(false);
    });
    startMenu.addEventListener("click", (e) => {
        if (e.target.closest("[data-open], [data-print-trigger], a")) {
            toggleStart(false);
        }
    });

    // Log off / shutdown
    document.getElementById("xpLogOff").addEventListener("click", () => {
        toggleStart(false);
        confirmDialog("Cerrar sesi&oacute;n", "&iquest;Est&aacute;s seguro que quieres cerrar sesi&oacute;n?", "warn", () => {
            location.reload();
        });
    });
    document.getElementById("xpShutdown").addEventListener("click", () => {
        toggleStart(false);
        confirmDialog("Apagar el equipo", "&iquest;Realmente quieres apagar Maggie OS?<br><br><em>Es solo un media kit, pero ok.</em>", "warn", () => {
            triggerBSOD();
        });
    });

    /* =========================================================
       CONTEXT MENU (right-click on desktop)
       ========================================================= */
    const ctxMenu = document.getElementById("xpContextMenu");
    const showContextMenu = (x, y, items) => {
        ctxMenu.innerHTML = items.map((item) => {
            if (item.divider) return `<div class="xp-context-divider"></div>`;
            return `<button class="xp-context-item ${item.disabled ? "disabled" : ""}" data-action="${item.action || ""}">${item.label}</button>`;
        }).join("");
        ctxMenu.classList.add("is-open");
        const w = ctxMenu.offsetWidth;
        const h = ctxMenu.offsetHeight;
        ctxMenu.style.left = Math.min(x, window.innerWidth - w - 4) + "px";
        ctxMenu.style.top = Math.min(y, window.innerHeight - h - 4) + "px";
        ctxMenu.querySelectorAll(".xp-context-item").forEach((btn) => {
            btn.addEventListener("click", () => {
                handleContextAction(btn.dataset.action);
                ctxMenu.classList.remove("is-open");
            });
        });
    };
    const handleContextAction = (action) => {
        if (action === "refresh") {
            sounds.ding();
            const desktop = document.getElementById("xpDesktop");
            desktop.style.opacity = "0.4";
            setTimeout(() => { desktop.style.opacity = "1"; }, 200);
        }
        if (action === "properties") openWindow("display");
        if (action === "mypc") openWindow("mypc");
        if (action === "about") openWindow("about");
        if (action === "screensaver") startScreensaver();
        if (action === "bsod") triggerBSOD();
    };
    document.getElementById("xpDesktop").addEventListener("contextmenu", (e) => {
        if (isMobile) return;
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, [
            { label: "Ver", disabled: true },
            { label: "Organizar iconos", disabled: true },
            { label: "Actualizar", action: "refresh" },
            { divider: true },
            { label: "Abrir Mi PC", action: "mypc" },
            { label: "Iniciar protector de pantalla", action: "screensaver" },
            { divider: true },
            { label: "Propiedades de pantalla", action: "properties" },
            { label: "Acerca de Maggie", action: "about" }
        ]);
    });
    document.addEventListener("click", () => ctxMenu.classList.remove("is-open"));
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") ctxMenu.classList.remove("is-open");
    });

    /* =========================================================
       NOTIFICATION BALLOON
       ========================================================= */
    const balloon = document.getElementById("xpBalloon");
    const showBalloon = () => {
        balloon.classList.add("is-open");
        sounds.notify();
        setTimeout(() => balloon.classList.remove("is-open"), 8000);
    };
    document.getElementById("xpBalloonClose").addEventListener("click", () => balloon.classList.remove("is-open"));
    document.getElementById("xpTrayBalloon").addEventListener("click", () => {
        balloon.classList.toggle("is-open");
        if (balloon.classList.contains("is-open")) sounds.notify();
    });
    balloon.addEventListener("click", (e) => {
        if (e.target.id !== "xpBalloonClose") {
            balloon.classList.remove("is-open");
            openWindow("hero");
        }
    });

    /* =========================================================
       MUTE TOGGLE
       ========================================================= */
    const muteBtn = document.getElementById("xpTrayMute");
    muteBtn.addEventListener("click", () => {
        muted = !muted;
        localStorage.setItem("xpMuted", muted ? "1" : "0");
        muteBtn.innerHTML = `<i data-lucide="${muted ? "volume-x" : "volume-2"}"></i>`;
        if (window.lucide) window.lucide.createIcons({ nameAttr: "data-lucide" });
        if (!muted) sounds.ding();
    });

    /* =========================================================
       DIALOGS
       ========================================================= */
    const dialog = document.getElementById("xpDialog");
    const dialogTitle = document.getElementById("xpDialogTitle");
    const dialogMessage = document.getElementById("xpDialogMessage");
    const dialogIcon = document.getElementById("xpDialogIcon");
    const dialogActions = document.getElementById("xpDialogActions");
    const closeDialog = () => dialog.classList.remove("is-open");
    const confirmDialog = (title, message, kind, onConfirm) => {
        dialogTitle.innerHTML = title;
        dialogMessage.innerHTML = message;
        dialogIcon.className = `xp-dialog-icon ${kind || "info"}`;
        const iconName = kind === "error" ? "x-circle" : kind === "warn" ? "alert-triangle" : "info";
        dialogIcon.innerHTML = `<i data-lucide="${iconName}"></i>`;
        dialogActions.innerHTML = `
            <button class="xp-dialog-btn default" data-dlg="ok">Aceptar</button>
            <button class="xp-dialog-btn" data-dlg="cancel">Cancelar</button>
        `;
        dialog.classList.add("is-open");
        if (kind === "error") sounds.error(); else sounds.ding();
        if (window.lucide) window.lucide.createIcons({ nameAttr: "data-lucide" });
        dialogActions.querySelector("[data-dlg='ok']").addEventListener("click", () => {
            closeDialog();
            if (onConfirm) onConfirm();
        }, { once: true });
        dialogActions.querySelector("[data-dlg='cancel']").addEventListener("click", closeDialog, { once: true });
    };

    /* =========================================================
       BSOD
       ========================================================= */
    const bsod = document.getElementById("xpBsod");
    const triggerBSOD = () => {
        sounds.error();
        bsod.classList.add("is-open");
    };
    bsod.addEventListener("click", () => {
        bsod.classList.remove("is-open");
        sounds.startup();
    });
    // Konami-ish: type "bsod"
    let bsodBuffer = "";
    document.addEventListener("keydown", (e) => {
        if (!e.key || e.key.length !== 1) return;
        bsodBuffer = (bsodBuffer + e.key.toLowerCase()).slice(-4);
        if (bsodBuffer === "bsod") triggerBSOD();
    });

    /* =========================================================
       SCREENSAVER (3D Pipes - simplified 2D version)
       ========================================================= */
    const screensaver = document.getElementById("xpScreensaver");
    const canvas = document.getElementById("xpPipesCanvas");
    let pipesAnim = null;
    const startScreensaver = () => {
        screensaver.classList.add("is-open");
        const ctx = canvas.getContext("2d");
        const fit = () => { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; };
        fit();
        window.addEventListener("resize", fit);
        const colors = ["#3a8be8", "#5b9c2a", "#e8443c", "#f4b73d", "#9c5fb8", "#46c5c5"];
        const pipes = Array.from({ length: 6 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            dx: Math.random() < 0.5 ? 2 : -2,
            dy: 0,
            color: colors[Math.floor(Math.random() * colors.length)]
        }));
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const step = () => {
            pipes.forEach((p) => {
                if (Math.random() < 0.04) {
                    if (p.dx !== 0) { p.dy = Math.random() < 0.5 ? 2 : -2; p.dx = 0; }
                    else { p.dx = Math.random() < 0.5 ? 2 : -2; p.dy = 0; }
                }
                p.x += p.dx; p.y += p.dy;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
                ctx.fill();
            });
            pipesAnim = requestAnimationFrame(step);
        };
        step();
    };
    const stopScreensaver = () => {
        screensaver.classList.remove("is-open");
        if (pipesAnim) cancelAnimationFrame(pipesAnim);
    };
    screensaver.addEventListener("click", stopScreensaver);
    document.addEventListener("keydown", () => { if (screensaver.classList.contains("is-open")) stopScreensaver(); });

    let idleTimer;
    const resetIdle = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            if (!isMobile && !document.hidden) startScreensaver();
        }, 90000); // 90s
    };
    ["mousemove", "keydown", "click", "touchstart"].forEach((ev) =>
        document.addEventListener(ev, resetIdle));
    resetIdle();

    /* =========================================================
       THEME SWITCHER
       ========================================================= */
    const applyXpTheme = (theme) => {
        document.body.classList.remove("xp-theme-olive", "xp-theme-silver");
        if (theme === "olive") document.body.classList.add("xp-theme-olive");
        if (theme === "silver") document.body.classList.add("xp-theme-silver");
        localStorage.setItem("xpTheme", theme);
    };
    const savedTheme = localStorage.getItem("xpTheme");
    if (savedTheme) applyXpTheme(savedTheme);

    document.addEventListener("click", (e) => {
        const card = e.target.closest(".xp-theme-card");
        if (card) {
            document.querySelectorAll(".xp-theme-card").forEach((c) => c.classList.remove("is-active"));
            card.classList.add("is-active");
            applyXpTheme(card.dataset.theme);
            sounds.ding();
        }
    });

    /* =========================================================
       CLOCK
       ========================================================= */
    const clock = document.getElementById("xpClock");
    const tick = () => {
        const now = new Date();
        const h = now.getHours();
        const m = String(now.getMinutes()).padStart(2, "0");
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = ((h + 11) % 12) + 1;
        clock.textContent = `${h12}:${m} ${ampm}`;
    };
    tick();
    setInterval(tick, 30000);

    /* =========================================================
       PRINT TRIGGER + AUTO-OPEN ON DESKTOP
       ========================================================= */
    document.querySelectorAll("[data-print-trigger]").forEach((el) => {
        el.addEventListener("click", (e) => {
            e.preventDefault();
            window.print();
        });
    });

    // On desktop, auto-open all main windows in cascade after welcome,
    // ending with hero focused on top so the user lands on the press kit.
    if (!isMobile) {
        const watcher = setInterval(() => {
            if (boot.classList.contains("xp-boot-done")) {
                clearInterval(watcher);
                const cascade = ["portfolio", "stats", "brands", "contact", "hero"];
                cascade.forEach((id, i) => {
                    setTimeout(() => openWindow(id), 350 + i * 220);
                });
            }
        }, 200);
    }

    /* =========================================================
       META + ICONS
       ========================================================= */
    const seo = data.seo || {};
    document.title = seo.title || document.title;
    document.documentElement.lang = seo.locale ? seo.locale.split("_")[0] : "es";
    applyTheme(data.theme);

    setMeta('meta[name="description"]', seo.description);
    setMeta('meta[property="og:title"]', seo.title);
    setMeta('meta[property="og:description"]', seo.description);
    setMeta('meta[property="og:image"]', seo.previewImage);
    setMeta('meta[name="twitter:title"]', seo.title);
    setMeta('meta[name="twitter:description"]', seo.description);
    setMeta('meta[name="twitter:image"]', seo.previewImage);

    if (seo.canonicalUrl) {
        setMeta('meta[property="og:url"]', seo.canonicalUrl);
        setMeta('link[rel="canonical"]', seo.canonicalUrl, "href");
    }

    initAnalytics(data.analytics);

    if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
    }
})();
