(function () {
    const data = window.MEDIA_KIT_DATA;
    const root = document.getElementById("app");

    if (!data || !root) {
        return;
    }

    const escapeHtml = (value) =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");

    const setMeta = (selector, value, attribute = "content") => {
        if (!value) {
            return;
        }

        const node = document.querySelector(selector);
        if (node) {
            node.setAttribute(attribute, value);
        }
    };

    const applyTheme = (theme) => {
        if (!theme) {
            return;
        }

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
            if (value) {
                document.documentElement.style.setProperty(key, value);
            }
        });
    };

    const initAnalytics = (analytics) => {
        const googleTagId = analytics && analytics.googleTagId;

        if (!googleTagId) {
            return;
        }

        const script = document.createElement("script");
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleTagId)}`;
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag() {
            window.dataLayer.push(arguments);
        };
        window.gtag("js", new Date());
        window.gtag("config", googleTagId);
    };

    const renderMetrics = (items) =>
        (items || [])
            .map(
                (item) => `
                    <article class="metric-card">
                        <div class="metric-icon tone-${escapeHtml(item.tone)}">
                            <i data-lucide="${escapeHtml(item.icon)}"></i>
                        </div>
                        <p class="metric-value">${escapeHtml(item.value)}</p>
                        <div class="metric-label">${escapeHtml(item.label)}</div>
                    </article>
                `
            )
            .join("");

    const renderAudience = (audience) => {
        const segments = audience.segments || [];
        const radius = 42;
        const circumference = 2 * Math.PI * radius;

        let cumulative = 0;
        const arcs = segments
            .map((segment) => {
                const percentage = Number(segment.percentage) || 0;
                const dash = (percentage / 100) * circumference;
                const stroke =
                    segment.tone === "accent"
                        ? "var(--accent)"
                        : segment.tone === "berry"
                          ? "#8f52aa"
                          : segment.tone === "sky"
                            ? "#2563eb"
                            : segment.tone === "mint"
                              ? "#14815c"
                              : "#cfc7be";
                const arc = `
                    <circle
                        class="audience-donut-segment"
                        cx="60"
                        cy="60"
                        r="${radius}"
                        fill="none"
                        stroke="${stroke}"
                        stroke-width="16"
                        stroke-linecap="round"
                        stroke-dasharray="${dash} ${circumference - dash}"
                        stroke-dashoffset="${-cumulative}"
                    ></circle>
                `;
                cumulative += dash;
                return arc;
            })
            .join("");

        const legend = segments
            .map(
                (segment) => `
                    <div class="audience-legend-item">
                        <span class="audience-legend-swatch tone-${escapeHtml(segment.tone)}"></span>
                        <span class="audience-legend-label">${escapeHtml(segment.label)}</span>
                        <span class="audience-legend-value">${escapeHtml(segment.percentage)}%</span>
                    </div>
                `
            )
            .join("");

        return `
            <div class="audience-donut-wrap">
                <div class="audience-donut-chart" aria-label="${escapeHtml(audience.heading)}">
                    <svg class="audience-donut-svg" viewBox="0 0 120 120" role="img" aria-hidden="true">
                        <circle
                            class="audience-donut-track"
                            cx="60"
                            cy="60"
                            r="${radius}"
                            fill="none"
                            stroke="#ece4da"
                            stroke-width="16"
                        ></circle>
                        <g transform="rotate(-90 60 60)">
                            ${arcs}
                        </g>
                    </svg>
                    <div class="audience-donut-center" aria-hidden="true"></div>
                </div>
                <div class="audience-legend">
                    ${legend}
                </div>
            </div>
        `;
    };

    const renderRanges = (items) =>
        (items || [])
            .map(
                (item) => `
                    <div>
                        <div class="range-row-head">
                            <span class="range-label">${escapeHtml(item.label)}</span>
                            <span class="range-value">${escapeHtml(item.percentage)}%</span>
                        </div>
                        <div class="progress">
                            <div class="progress-bar" style="width: ${Number(item.percentage) || 0}%;"></div>
                        </div>
                    </div>
                `
            )
            .join("");

    const renderCountries = (items) =>
        (items || [])
            .map(
                (item) => `
                    <div class="country-row">
                        <div class="country-meta">
                            <i data-lucide="map-pin"></i>
                            <span class="country-name">${escapeHtml(item.label)}</span>
                        </div>
                        <div class="country-meta">
                            <div class="country-progress">
                                <div class="country-progress-bar" style="width: ${Number(item.percentage) || 0}%;"></div>
                            </div>
                            <span class="country-value">${escapeHtml(item.percentage)}%</span>
                        </div>
                    </div>
                `
            )
            .join("");

    const renderPortfolio = (items) =>
        (items || [])
            .map(
                (item) => `
                    <figure class="portfolio-item">
                        <img
                            src="${escapeHtml(item.src)}"
                            alt="${escapeHtml(item.alt)}"
                            onerror="this.onerror=null;this.src='${escapeHtml(item.fallback || "")}'"
                        >
                    </figure>
                `
            )
            .join("");

    const renderServices = (items) =>
        (items || [])
            .map(
                (item) => `
                    <article class="service-card">
                        <div class="service-top">
                            <div class="service-icon">
                                <i data-lucide="${escapeHtml(item.icon)}"></i>
                            </div>
                            <div class="service-price">${escapeHtml(item.price)}</div>
                        </div>
                        <h3 class="service-name">${escapeHtml(item.name)}</h3>
                        <p class="service-copy">${escapeHtml(item.description)}</p>
                    </article>
                `
            )
            .join("");

    const renderBrands = (items) =>
        (items || []).map((item) => `<span class="brand-chip">${escapeHtml(item)}</span>`).join("");

    root.innerHTML = `
        <div class="site-shell">
            <div class="print-page print-page-cover">
                <header class="hero">
                    <div class="hero-backdrop" aria-hidden="true">
                        <div class="blob blob-one"></div>
                        <div class="blob blob-two"></div>
                        <div class="blob blob-three"></div>
                    </div>
                    <div class="hero-inner">
                        <p class="eyebrow">${escapeHtml(data.hero.monthLabel)}</p>
                        <h1 class="hero-title">
                            ${escapeHtml(data.hero.firstName)}
                            <span class="hero-title-accent">${escapeHtml(data.hero.lastName)}</span>
                        </h1>
                        <p class="hero-tagline">${escapeHtml(data.hero.tagline)}</p>
                        <div class="hero-print-meta print-only">
                            <a class="hero-print-link" href="${escapeHtml(data.hero.platformUrl)}">${escapeHtml(data.hero.platformLabel)}</a>
                            <a class="hero-print-link" href="mailto:${escapeHtml(data.footer.email)}">${escapeHtml(data.footer.email)}</a>
                        </div>
                        <div class="hero-actions hidden-print">
                            <a class="button button-primary" href="${escapeHtml(data.hero.platformUrl)}" target="_blank" rel="noreferrer">
                                <i data-lucide="instagram"></i>
                                ${escapeHtml(data.hero.platformLabel)}
                            </a>
                            <a class="button button-secondary" href="mailto:${escapeHtml(data.hero.contactEmail)}">
                                <i data-lucide="mail"></i>
                                ${escapeHtml(data.hero.contactLabel)}
                            </a>
                            <button class="button button-accent" type="button" data-print-trigger>
                                <i data-lucide="download"></i>
                                ${escapeHtml(data.hero.downloadLabel)}
                            </button>
                        </div>
                    </div>
                </header>

                <section class="section section-about">
                    <div class="container about-grid">
                        <div class="portrait-wrap">
                            <div class="portrait-card">
                                <img
                                    src="${escapeHtml(data.about.image)}"
                                    alt="${escapeHtml(data.about.imageAlt)}"
                                    onerror="this.onerror=null;this.src='${escapeHtml(data.about.fallbackImage || "")}'"
                                >
                            </div>
                        </div>
                        <div class="about-copy">
                            <h2 class="section-title">${escapeHtml(data.about.heading)}</h2>
                            ${(data.about.paragraphs || [])
                                .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
                                .join("")}
                            <div class="chips">
                                ${(data.about.tags || []).map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <div class="print-page print-page-stats">
                <section class="section stats-section">
                    <div class="container">
                        <div class="stats-header">
                            <h2 class="section-title">${escapeHtml(data.stats.heading)}</h2>
                            <div class="stats-updated">${escapeHtml(data.stats.updatedLabel)}</div>
                        </div>
                        <div class="metric-grid">
                            ${renderMetrics(data.stats.keyMetrics)}
                        </div>
                        <div class="panel-grid">
                            <article class="panel-card">
                                <h3 class="panel-title">${escapeHtml(data.stats.audience.heading)}</h3>
                                <div class="audience-bars">
                                    ${renderAudience(data.stats.audience)}
                                </div>
                            </article>
                            <article class="panel-card">
                                <h3 class="panel-title">${escapeHtml(data.stats.ageRanges.heading)}</h3>
                                <div class="range-list">
                                    ${renderRanges(data.stats.ageRanges.items)}
                                </div>
                            </article>
                            <article class="panel-card panel-card-wide">
                                <h3 class="panel-title">${escapeHtml(data.stats.topCountries.heading)}</h3>
                                <div class="country-list">
                                    ${renderCountries(data.stats.topCountries.items)}
                                </div>
                            </article>
                        </div>
                    </div>
                </section>
            </div>

            <div class="print-page print-page-offers">
                <section class="section-tight section-portfolio">
                    <div class="portfolio-container">
                        <div class="portfolio-track">
                            ${renderPortfolio(data.portfolio)}
                        </div>
                    </div>
                </section>

                <section class="section section-services">
                    <div class="container">
                        <div class="services-header">
                            <h2 class="section-title">${escapeHtml(data.services.heading)}</h2>
                            <p class="section-copy">${escapeHtml(data.services.description)}</p>
                        </div>
                        <div class="service-grid">
                            ${renderServices(data.services.items)}
                        </div>
                    </div>
                </section>
            </div>

            <div class="print-page print-page-brands">
                <section class="section brands-section">
                    <div class="container brands-container">
                        <p class="eyebrow">${escapeHtml(data.brands.eyebrow)}</p>
                        <div class="brand-list">
                            ${renderBrands(data.brands.items)}
                        </div>
                    </div>
                </section>
            </div>

            <footer class="footer hidden-print">
                <div class="container">
                    <h2 class="section-title">${escapeHtml(data.footer.title)}</h2>
                    <p class="footer-copy">${escapeHtml(data.footer.subtitle)}</p>
                    <a class="footer-email" href="mailto:${escapeHtml(data.footer.email)}">${escapeHtml(data.footer.email)}</a>
                    <div class="footer-legal">${escapeHtml(data.footer.legal)}</div>
                </div>
            </footer>
        </div>
    `;

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

    const printTrigger = root.querySelector("[data-print-trigger]");
    if (printTrigger) {
        printTrigger.addEventListener("click", () => window.print());
    }

    initAnalytics(data.analytics);

    if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
    }
})();

