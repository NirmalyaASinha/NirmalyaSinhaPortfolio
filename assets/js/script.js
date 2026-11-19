/* ==========================================================================
   Nirmalya Sinha Portfolio - Interactive Scripts & PCB Circuit Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = motionQuery.matches;
    const headerEl = document.getElementById('header');
    const mainEl = document.querySelector('main');
    const footerEl = document.querySelector('footer');

    function setPageInert(isInert) {
        if (headerEl) headerEl.inert = isInert;
        if (mainEl) mainEl.inert = isInert;
        if (footerEl) footerEl.inert = isInert;
    }

    function trapModalFocus(modalEl, e) {
        if (e.key !== 'Tab') return;
        const focusable = Array.from(
            modalEl.querySelectorAll('a[href], button:not([disabled]), iframe, video, [tabindex]:not([tabindex="-1"])')
        ).filter((el) => !el.closest('.hidden') && el.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    // ----------------------------------------------------------------------
    // 0. Animated PCB Circuit Background (#circuit-canvas)
    // ----------------------------------------------------------------------
    const circuitCanvas = document.getElementById('circuit-canvas');
    const pcbEngine = (() => {
        if (!circuitCanvas) return null;
        const ctx = circuitCanvas.getContext('2d', { alpha: true });
        if (!ctx) return null;

        const CFG = {
            gridPitch: 32,
            maxDpr: 2,
            traceDensity: 0.000055,
            busProbability: 0.25,
            busSpacing: 8,
            minSegments: 3,
            maxSegments: 7,
            traceWidth: 1.15,
            traceBaseColor: 'rgba(20, 32, 51, 0.72)',
            traceColorCyan: 'rgba(0, 229, 255, 0.12)',
            traceColorEmerald: 'rgba(16, 185, 129, 0.10)',
            viaOuterRadius: 3.6,
            viaHoleRadius: 1.4,
            viaRingCyan: 'rgba(56, 189, 248, 0.28)',
            viaRingEmerald: 'rgba(16, 185, 129, 0.26)',
            smdPadWidth: 7,
            smdPadHeight: 4,
            packetCountDesktop: 20,
            packetCountMobile: 10,
            packetSpeedMin: 68,
            packetSpeedMax: 155,
            packetTailLength: 38,
            packetCoreRadius: 1.8,
            packetColors: [
                { core: '#00e5ff', glow: 'rgba(0, 229, 255, 0.24)' },
                { core: '#38bdf8', glow: 'rgba(56, 189, 248, 0.22)' },
                { core: '#10b981', glow: 'rgba(16, 185, 129, 0.22)' }
            ]
        };

        const DIRS = [
            [1, 0], [1, 1], [0, 1], [-1, 1],
            [-1, 0], [-1, -1], [0, -1], [1, -1]
        ];

        let width = 0;
        let height = 0;
        let dpr = 1;
        let traces = [];
        let packets = [];
        let vias = [];
        let staticCanvas = document.createElement('canvas');
        let staticCtx = staticCanvas.getContext('2d');
        let rafId = null;
        let lastTime = 0;
        let resizeTimer = null;

        function randInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        function pickPacketColor() {
            const r = Math.random();
            if (r < 0.65) return CFG.packetColors[0];
            if (r < 0.85) return CFG.packetColors[1];
            return CFG.packetColors[2];
        }

        function buildTraceGeometry(pts) {
            const segmentLengths = [];
            let totalLength = 0;
            for (let i = 1; i < pts.length; i++) {
                const dx = pts[i].x - pts[i - 1].x;
                const dy = pts[i].y - pts[i - 1].y;
                const len = Math.hypot(dx, dy);
                segmentLengths.push(len);
                totalLength += len;
            }
            return { segmentLengths, totalLength };
        }

        function generateCircuit() {
            width = window.innerWidth;
            height = window.innerHeight;
            dpr = Math.min(window.devicePixelRatio || 1, CFG.maxDpr);

            circuitCanvas.width = Math.floor(width * dpr);
            circuitCanvas.height = Math.floor(height * dpr);
            circuitCanvas.style.width = `${width}px`;
            circuitCanvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            staticCanvas.width = Math.floor(width * dpr);
            staticCanvas.height = Math.floor(height * dpr);
            staticCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const cols = Math.max(4, Math.ceil(width / CFG.gridPitch));
            const rows = Math.max(4, Math.ceil(height / CFG.gridPitch));
            const occupied = new Set();

            const targetCount = Math.max(18, Math.min(58, Math.round(width * height * CFG.traceDensity)));
            traces = [];
            vias = [];

            for (let t = 0; t < targetCount; t++) {
                let gx = randInt(0, cols);
                let gy = randInt(0, rows);
                const key = `${gx},${gy}`;
                if (occupied.has(key)) continue;

                let dirIdx = randInt(0, 7);
                const segCount = randInt(CFG.minSegments, CFG.maxSegments);
                const pts = [{ x: gx * CFG.gridPitch, y: gy * CFG.gridPitch }];
                occupied.add(key);

                for (let s = 0; s < segCount; s++) {
                    const turn = randInt(-1, 1);
                    dirIdx = (dirIdx + turn + 8) % 8;
                    const [dx, dy] = DIRS[dirIdx];
                    const steps = randInt(2, 5);
                    const nextX = Math.max(0, Math.min(cols, gx + dx * steps));
                    const nextY = Math.max(0, Math.min(rows, gy + dy * steps));
                    if (nextX === gx && nextY === gy) break;

                    gx = nextX;
                    gy = nextY;
                    pts.push({ x: gx * CFG.gridPitch, y: gy * CFG.gridPitch });
                    occupied.add(`${gx},${gy}`);
                }

                if (pts.length < 2) continue;

                const theme = Math.random() < 0.2 ? 'emerald' : 'cyan';
                const geom = buildTraceGeometry(pts);
                if (geom.totalLength < 60) continue;

                const startPad = Math.random() < 0.65 ? 'via' : 'smd';
                const endPad = Math.random() < 0.65 ? 'via' : 'smd';

                traces.push({
                    points: pts,
                    segmentLengths: geom.segmentLengths,
                    totalLength: geom.totalLength,
                    theme,
                    startPad,
                    endPad
                });

                if (startPad === 'via' && vias.length < 24) {
                    vias.push({ x: pts[0].x, y: pts[0].y, theme, phase: Math.random() * Math.PI * 2 });
                }
                if (endPad === 'via' && vias.length < 24) {
                    const last = pts[pts.length - 1];
                    vias.push({ x: last.x, y: last.y, theme, phase: Math.random() * Math.PI * 2 });
                }

                // Parallel bus lane
                if (Math.random() < CFG.busProbability && traces.length < 64) {
                    const offsetPts = pts.map((p, idx) => {
                        const prev = pts[Math.max(0, idx - 1)];
                        const next = pts[Math.min(pts.length - 1, idx + 1)];
                        const vx = next.x - prev.x;
                        const vy = next.y - prev.y;
                        const len = Math.hypot(vx, vy) || 1;
                        return {
                            x: p.x + (-vy / len) * CFG.busSpacing,
                            y: p.y + (vx / len) * CFG.busSpacing
                        };
                    });
                    const busGeom = buildTraceGeometry(offsetPts);
                    if (busGeom.totalLength >= 60) {
                        traces.push({
                            points: offsetPts,
                            segmentLengths: busGeom.segmentLengths,
                            totalLength: busGeom.totalLength,
                            theme,
                            startPad: 'via',
                            endPad: 'via'
                        });
                    }
                }
            }

            renderStaticLayer();
            initPackets();
        }

        function drawPad(targetCtx, pt, nextPt, kind, theme) {
            if (kind === 'via') {
                targetCtx.beginPath();
                targetCtx.arc(pt.x, pt.y, CFG.viaOuterRadius, 0, Math.PI * 2);
                targetCtx.fillStyle = '#05080f';
                targetCtx.fill();
                targetCtx.lineWidth = 1.2;
                targetCtx.strokeStyle = theme === 'emerald' ? CFG.viaRingEmerald : CFG.viaRingCyan;
                targetCtx.stroke();

                targetCtx.beginPath();
                targetCtx.arc(pt.x, pt.y, CFG.viaHoleRadius, 0, Math.PI * 2);
                targetCtx.fillStyle = '#000000';
                targetCtx.fill();
            } else {
                const angle = nextPt ? Math.atan2(nextPt.y - pt.y, nextPt.x - pt.x) : 0;
                targetCtx.save();
                targetCtx.translate(pt.x, pt.y);
                targetCtx.rotate(angle);
                targetCtx.fillStyle = theme === 'emerald' ? CFG.viaRingEmerald : CFG.viaRingCyan;
                targetCtx.fillRect(-CFG.smdPadWidth / 2, -CFG.smdPadHeight / 2, CFG.smdPadWidth, CFG.smdPadHeight);
                targetCtx.restore();
            }
        }

        function renderStaticLayer() {
            staticCtx.clearRect(0, 0, width, height);

            traces.forEach((trace) => {
                const pts = trace.points;
                staticCtx.beginPath();
                staticCtx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) {
                    staticCtx.lineTo(pts[i].x, pts[i].y);
                }
                staticCtx.lineWidth = CFG.traceWidth;
                staticCtx.lineCap = 'round';
                staticCtx.lineJoin = 'round';
                staticCtx.strokeStyle = trace.theme === 'emerald' ? CFG.traceColorEmerald : CFG.traceColorCyan;
                staticCtx.stroke();

                drawPad(staticCtx, pts[0], pts[1], trace.startPad, trace.theme);
                drawPad(staticCtx, pts[pts.length - 1], pts[pts.length - 2], trace.endPad, trace.theme);
            });
        }

        function initPackets() {
            packets = [];
            if (!traces.length) return;
            const count = width >= 768 ? CFG.packetCountDesktop : CFG.packetCountMobile;
            for (let i = 0; i < count; i++) {
                const traceIndex = randInt(0, traces.length - 1);
                const trace = traces[traceIndex];
                packets.push({
                    traceIndex,
                    distance: Math.random() * trace.totalLength,
                    speed: CFG.packetSpeedMin + Math.random() * (CFG.packetSpeedMax - CFG.packetSpeedMin),
                    direction: Math.random() < 0.5 ? 1 : -1,
                    color: pickPacketColor()
                });
            }
        }

        function sampleTraceAt(trace, dist) {
            const clamped = Math.max(0, Math.min(trace.totalLength, dist));
            let acc = 0;
            for (let i = 0; i < trace.segmentLengths.length; i++) {
                const segLen = trace.segmentLengths[i];
                if (acc + segLen >= clamped || i === trace.segmentLengths.length - 1) {
                    const t = segLen > 0 ? (clamped - acc) / segLen : 0;
                    const p0 = trace.points[i];
                    const p1 = trace.points[i + 1];
                    return {
                        x: p0.x + (p1.x - p0.x) * t,
                        y: p0.y + (p1.y - p0.y) * t
                    };
                }
                acc += segLen;
            }
            return trace.points[0];
        }

        function drawFrame(now) {
            const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0.016;
            lastTime = now;

            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(staticCanvas, 0, 0, width, height);

            // Subtle pulsing via rings
            const timeSec = now * 0.001;
            for (let i = 0; i < vias.length; i++) {
                const v = vias[i];
                const pulse = (Math.sin(timeSec * 1.4 + v.phase) + 1) * 0.5;
                if (pulse > 0.72) {
                    const p = (pulse - 0.72) / 0.28;
                    ctx.beginPath();
                    ctx.arc(v.x, v.y, CFG.viaOuterRadius + p * 6, 0, Math.PI * 2);
                    ctx.strokeStyle = v.theme === 'emerald'
                        ? `rgba(16, 185, 129, ${(1 - p) * 0.32})`
                        : `rgba(0, 229, 255, ${(1 - p) * 0.34})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }

            // Travelling signal packets
            for (let i = 0; i < packets.length; i++) {
                const pkt = packets[i];
                const trace = traces[pkt.traceIndex];
                if (!trace) continue;

                pkt.distance += pkt.speed * pkt.direction * dt;
                if (pkt.distance > trace.totalLength || pkt.distance < 0) {
                    pkt.traceIndex = randInt(0, traces.length - 1);
                    const nextTrace = traces[pkt.traceIndex];
                    pkt.direction = Math.random() < 0.5 ? 1 : -1;
                    pkt.distance = pkt.direction === 1 ? 0 : nextTrace.totalLength;
                    continue;
                }

                const head = sampleTraceAt(trace, pkt.distance);
                const tailDist = pkt.distance - pkt.direction * CFG.packetTailLength;
                const tailStart = sampleTraceAt(trace, tailDist);

                // Sample 5 points along the trace so tail bends around 45-degree corners
                const grad = ctx.createLinearGradient(tailStart.x, tailStart.y, head.x, head.y);
                grad.addColorStop(0, 'rgba(0, 229, 255, 0)');
                grad.addColorStop(1, pkt.color.core);

                ctx.beginPath();
                ctx.moveTo(tailStart.x, tailStart.y);
                const steps = 5;
                for (let s = 1; s <= steps; s++) {
                    const d = tailDist + (pkt.distance - tailDist) * (s / steps);
                    const pt = sampleTraceAt(trace, d);
                    ctx.lineTo(pt.x, pt.y);
                }

                // Soft outer bloom stroke (cheap GPU-friendly glow without shadowBlur)
                ctx.strokeStyle = pkt.color.glow;
                ctx.lineWidth = 4.5;
                ctx.lineCap = 'round';
                ctx.stroke();

                // Sharp core tail
                ctx.strokeStyle = grad;
                ctx.lineWidth = 1.8;
                ctx.stroke();

                // Bright packet head
                ctx.beginPath();
                ctx.arc(head.x, head.y, CFG.packetCoreRadius, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
            }

            if (!prefersReducedMotion && !document.hidden) {
                rafId = requestAnimationFrame(drawFrame);
            } else {
                rafId = null;
            }
        }

        function start() {
            if (prefersReducedMotion) {
                stop();
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(staticCanvas, 0, 0, width, height);
                return;
            }
            if (!rafId && !document.hidden) {
                lastTime = performance.now();
                rafId = requestAnimationFrame(drawFrame);
            }
        }

        function stop() {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        }

        generateCircuit();
        start();

        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                generateCircuit();
                start();
            }, 150);
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stop();
            } else {
                start();
            }
        });

        return { start, stop, renderStatic: () => {
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(staticCanvas, 0, 0, width, height);
        }};
    })();

    // ----------------------------------------------------------------------
    // 1. Hero Typing Animation (with complete static fallback)
    // ----------------------------------------------------------------------
    const typingTextElement = document.getElementById('typing-text');
    const staticFallbackRole = 'VLSI & Hardware Security Engineer';
    const roles = [
        'VLSI & ASIC Design Engineer',
        'FPGA & Edge AI Architect',
        'Hardware Security Researcher',
        'Founder @ LearnVLSI'
    ];
    let typingTimer = null;

    function startTypingAnimation() {
        if (!typingTextElement || prefersReducedMotion) return;
        let roleIndex = -1;
        const currentText = typingTextElement.textContent.trim() || staticFallbackRole;
        let charIndex = currentText.length;
        let isDeleting = true;

        function tick() {
            if (prefersReducedMotion) {
                typingTextElement.textContent = staticFallbackRole;
                return;
            }
            const targetRole = roleIndex === -1 ? staticFallbackRole : roles[roleIndex];

            if (isDeleting) {
                charIndex = Math.max(0, charIndex - 1);
                typingTextElement.textContent = targetRole.substring(0, charIndex);

                if (charIndex === 0) {
                    isDeleting = false;
                    roleIndex = (roleIndex + 1) % roles.length;
                    typingTimer = setTimeout(tick, 350);
                    return;
                }
                typingTimer = setTimeout(tick, 45);
            } else {
                const nextRole = roles[roleIndex];
                charIndex = Math.min(nextRole.length, charIndex + 1);
                typingTextElement.textContent = nextRole.substring(0, charIndex);

                if (charIndex === nextRole.length) {
                    isDeleting = true;
                    typingTimer = setTimeout(tick, 2200);
                    return;
                }
                typingTimer = setTimeout(tick, 85);
            }
        }

        typingTimer = setTimeout(tick, 2000);
    }

    startTypingAnimation();

    window.addEventListener('beforeprint', () => {
        if (typingTimer) clearTimeout(typingTimer);
        if (typingTextElement) typingTextElement.textContent = staticFallbackRole;
    });

    // ----------------------------------------------------------------------
    // 2. Sticky Navbar Scroll State
    // ----------------------------------------------------------------------
    const header = document.getElementById('header');
    function onScrollNav() {
        if (!header) return;
        if (window.scrollY > 20) {
            header.classList.add('nav-scrolled');
        } else {
            header.classList.remove('nav-scrolled');
        }
    }
    window.addEventListener('scroll', onScrollNav, { passive: true });
    onScrollNav();

    // ----------------------------------------------------------------------
    // 3. Mobile Menu Toggle
    // ----------------------------------------------------------------------
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (menuBtn && mobileMenu) {
        function setMobileMenuOpen(open) {
            mobileMenu.classList.toggle('is-open', open);
            mobileMenu.setAttribute('aria-hidden', String(!open));
            menuBtn.setAttribute('aria-expanded', String(open));
        }

        menuBtn.addEventListener('click', () => {
            const isOpen = mobileMenu.classList.contains('is-open');
            setMobileMenuOpen(!isOpen);
        });

        mobileMenu.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                setMobileMenuOpen(false);
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
                setMobileMenuOpen(false);
                menuBtn.focus();
            }
        });
    }

    // ----------------------------------------------------------------------
    // 4. Scroll-Spy Active Navigation Highlighting
    // ----------------------------------------------------------------------
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    function updateActiveNav() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollPos = scrollTop + 140;
        let currentId = '';

        sections.forEach((section) => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            if (scrollPos >= top && scrollPos < top + height) {
                currentId = section.getAttribute('id');
            }
        });

        if (window.innerHeight + scrollTop >= document.documentElement.scrollHeight - 60) {
            currentId = 'contact';
        }

        if (currentId) {
            navLinks.forEach((link) => {
                const href = link.getAttribute('href');
                if (href === `#${currentId}`) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }
    }

    window.addEventListener('scroll', updateActiveNav, { passive: true });
    window.addEventListener('load', updateActiveNav);
    updateActiveNav();

    // ----------------------------------------------------------------------
    // 5. Batched Staggered Scroll-Reveal & Timeline Node Indexing
    // ----------------------------------------------------------------------
    document.querySelectorAll('.timeline-item').forEach((item, idx) => {
        item.style.setProperty('--node-index', String(idx));
    });

    const revealElements = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && !prefersReducedMotion) {
        const revealObserver = new IntersectionObserver(
            (entries, observer) => {
                let batchIndex = 0;
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const el = entry.target;
                        el.style.setProperty('--stagger-index', String(Math.min(batchIndex++, 5)));
                        el.classList.add('revealed');
                        el.addEventListener(
                            'transitionend',
                            (e) => {
                                if (e.propertyName === 'transform') {
                                    el.classList.add('reveal-settled');
                                }
                            },
                            { once: true }
                        );
                        observer.unobserve(el);
                    }
                });
            },
            {
                threshold: 0.08,
                rootMargin: '0px 0px -30px 0px'
            }
        );
        revealElements.forEach((el) => revealObserver.observe(el));
    } else {
        revealElements.forEach((el) => {
            el.classList.add('revealed', 'reveal-settled');
        });
    }

    // Reactive Reduced-Motion Listener
    motionQuery.addEventListener('change', (e) => {
        prefersReducedMotion = e.matches;
        if (prefersReducedMotion) {
            if (typingTimer) clearTimeout(typingTimer);
            if (typingTextElement) typingTextElement.textContent = staticFallbackRole;
            revealElements.forEach((el) => el.classList.add('revealed', 'reveal-settled'));
            pcbEngine?.stop();
            pcbEngine?.renderStatic();
        } else {
            startTypingAnimation();
            pcbEngine?.start();
        }
    });

    // ----------------------------------------------------------------------
    // 6. Reusable Two-Phase + FLIP Filter Controller
    // ----------------------------------------------------------------------
    function setupFilterGroup({ tabSelector, gridSelector, cardSelector, filterAttr, categoryAttr }) {
        const filterButtons = document.querySelectorAll(tabSelector);
        const grid = document.querySelector(gridSelector);
        const cards = document.querySelectorAll(cardSelector);
        if (!filterButtons.length || !grid || !cards.length) return;

        let filterEpoch = 0;

        filterButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const filter = btn.getAttribute(filterAttr);
                const epoch = ++filterEpoch;

                filterButtons.forEach((b) => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');

                if (prefersReducedMotion) {
                    cards.forEach((card) => {
                        const cat = card.getAttribute(categoryAttr);
                        card.classList.remove('is-filtering-out', 'is-filtering-in');
                        if (filter === 'all' || cat === filter) {
                            card.classList.remove('is-hidden');
                            card.classList.add('revealed', 'reveal-settled');
                        } else {
                            card.classList.add('is-hidden');
                        }
                    });
                    return;
                }

                // Phase 1: Capture First rects of staying visible cards & fade out non-matching
                const firstRects = new Map();
                let hasExiting = false;

                cards.forEach((card) => {
                    const cat = card.getAttribute(categoryAttr);
                    const willShow = filter === 'all' || cat === filter;
                    const isCurrentlyVisible = !card.classList.contains('is-hidden');

                    card.classList.remove('is-filtering-in');
                    if (isCurrentlyVisible && !willShow) {
                        hasExiting = true;
                        card.classList.add('is-filtering-out');
                    } else if (isCurrentlyVisible && willShow) {
                        firstRects.set(card, card.getBoundingClientRect());
                    }
                });

                const applyReflow = () => {
                    if (epoch !== filterEpoch) return;
                    let enterStagger = 0;

                    cards.forEach((card) => {
                        const cat = card.getAttribute(categoryAttr);
                        const willShow = filter === 'all' || cat === filter;
                        const wasHidden = card.classList.contains('is-hidden');

                        card.classList.remove('is-filtering-out');

                        if (willShow) {
                            card.classList.remove('is-hidden');
                            card.classList.add('revealed', 'reveal-settled');
                            if (wasHidden) {
                                card.style.setProperty('--filter-stagger', String(Math.min(enterStagger++, 5)));
                                card.classList.add('is-filtering-in');
                            }
                        } else {
                            card.classList.add('is-hidden');
                        }
                    });

                    // FLIP animate surviving cards
                    const movedCards = [];
                    firstRects.forEach((firstRect, card) => {
                        const lastRect = card.getBoundingClientRect();
                        const dx = firstRect.left - lastRect.left;
                        const dy = firstRect.top - lastRect.top;
                        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                            card.style.transition = 'none';
                            card.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
                            movedCards.push(card);
                        }
                    });

                    if (movedCards.length) {
                        void grid.offsetHeight; // Force layout before clearing transform
                        requestAnimationFrame(() => {
                            movedCards.forEach((card) => {
                                card.style.transition = '';
                                card.style.transform = '';
                            });
                        });
                    }
                };

                if (hasExiting) {
                    setTimeout(applyReflow, 210);
                } else {
                    applyReflow();
                }
            });
        });

        window.addEventListener('beforeprint', () => {
            cards.forEach((card) => {
                card.classList.remove('is-filtering-out', 'is-filtering-in');
                card.style.transform = '';
                card.style.transition = '';
            });
        });
    }

    setupFilterGroup({
        tabSelector: '#project-filters .filter-tab',
        gridSelector: '#projects-grid',
        cardSelector: '#projects-grid .project-card',
        filterAttr: 'data-filter',
        categoryAttr: 'data-category'
    });

    setupFilterGroup({
        tabSelector: '#doc-filters .filter-tab',
        gridSelector: '#documents-grid',
        cardSelector: '#documents-grid .doc-card',
        filterAttr: 'data-doc-filter',
        categoryAttr: 'data-doc-category'
    });

    // ----------------------------------------------------------------------
    // 7. Image Lightbox Modal (Projects & Highlights)
    // ----------------------------------------------------------------------
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxClose = document.getElementById('lightbox-close');

    if (lightbox && lightboxImg && lightboxClose) {
        const zoomableImages = document.querySelectorAll('.project-media img, .highlight-media img');
        let lastFocusedBeforeLightbox = null;
        let lightboxCloseTimer = null;
        let lightboxTransitionHandler = null;

        function clearLightboxTransition() {
            if (lightboxTransitionHandler) {
                lightboxImg.removeEventListener('transitionend', lightboxTransitionHandler);
                lightboxTransitionHandler = null;
            }
        }

        function forceCloseLightbox() {
            clearTimeout(lightboxCloseTimer);
            clearLightboxTransition();
            lightbox.classList.remove('is-open', 'is-closing', 'is-mounted');
            lightboxImg.src = '';
            if (lightboxCaption) lightboxCaption.textContent = '';
            document.body.style.overflow = '';
            setPageInert(false);
        }

        function openLightbox(img) {
            clearTimeout(lightboxCloseTimer);
            clearLightboxTransition();
            lastFocusedBeforeLightbox = document.activeElement;
            lightboxImg.src = img.currentSrc || img.src;
            lightboxImg.alt = img.alt || '';
            if (lightboxCaption) {
                lightboxCaption.textContent = img.getAttribute('data-caption') || img.alt || '';
            }

            lightbox.classList.remove('is-closing');
            lightbox.classList.add('is-mounted');
            document.body.style.overflow = 'hidden';
            setPageInert(true);

            if (prefersReducedMotion) {
                lightbox.classList.add('is-open');
            } else {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        lightbox.classList.add('is-open');
                    });
                });
            }
            lightboxClose.focus();
        }

        function closeLightbox() {
            if (!lightbox.classList.contains('is-mounted') || lightbox.classList.contains('is-closing')) return;

            if (prefersReducedMotion) {
                forceCloseLightbox();
                lastFocusedBeforeLightbox?.focus?.();
                return;
            }

            clearTimeout(lightboxCloseTimer);
            clearLightboxTransition();
            lightbox.classList.remove('is-open');
            lightbox.classList.add('is-closing');

            const finishClose = () => {
                forceCloseLightbox();
                lastFocusedBeforeLightbox?.focus?.();
            };

            lightboxTransitionHandler = (e) => {
                if (e.target === lightboxImg) finishClose();
            };
            lightboxImg.addEventListener('transitionend', lightboxTransitionHandler);
            lightboxCloseTimer = setTimeout(finishClose, 360);
        }

        zoomableImages.forEach((img) => {
            if (!img.hasAttribute('tabindex')) img.setAttribute('tabindex', '0');
            if (!img.hasAttribute('role')) img.setAttribute('role', 'button');
            if (!img.hasAttribute('aria-label')) {
                const caption = img.getAttribute('data-caption') || img.alt || 'image';
                img.setAttribute('aria-label', `Preview ${caption}`);
            }
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                openLightbox(img);
            });
            img.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    openLightbox(img);
                }
            });
        });

        lightboxClose.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('is-mounted')) return;
            if (e.key === 'Escape') {
                closeLightbox();
            } else {
                trapModalFocus(lightbox, e);
            }
        });
        window.addEventListener('beforeprint', forceCloseLightbox);
    }

    // ----------------------------------------------------------------------
    // 8. Technical Dossier & Media Vault + Interactive Viewer Modal
    // ----------------------------------------------------------------------
    const DOC_VAULT = {
        'motor-fault-report-pdf': {
            title: 'Data-Driven Fault Detection in Electric Motors (RES-VSSC-2025-015)',
            project: 'Data-Driven Fault Detection in Electric Motors',
            type: 'pdf',
            label: 'PDF Report',
            size: '13.54 MB',
            src: './assets/documents/greenwave_latex_source_bundle_revised.pdf'
        },
        'motor-fault-deck-pptx': {
            title: 'Motor Fault Detection Presentation Deck (VSSC / IIT BHU)',
            project: 'Data-Driven Fault Detection in Electric Motors',
            type: 'pptx',
            label: 'PPTX Deck',
            size: '5.64 MB',
            src: './assets/documents/Fault_Detection_Report_Revised.pdf'
        },
        'armourtrack-full-pdf': {
            title: 'ArmourTrack Technical Project Report (8-Page DefenceTech Dossier)',
            project: 'ArmourTrack: Defence Asset Accountability System',
            type: 'pdf',
            label: 'PDF Report',
            size: '50 KB',
            src: './assets/documents/Copy%20of%20Smart%20Herd_%20Revolutionizing%20Livestock%20Monitoring%20with%20MYOSA.docx'
        },
        'armourtrack-showcase-pdf': {
            title: 'ArmourTrack Showcase Presentation (PDF Export)',
            project: 'ArmourTrack: Defence Asset Accountability System',
            type: 'pdf',
            label: 'PDF Slides',
            size: '136 KB',
            src: './assets/documents/ArmourTrack_Technical_Project_Report.pdf'
        },
        'armourtrack-deck-pptx': {
            title: 'ArmourTrack Hackathon Slide Deck (CRAFTATHON 2026)',
            project: 'ArmourTrack: Defence Asset Accountability System',
            type: 'pptx',
            label: 'PPTX Deck',
            size: '42 KB',
            src: './assets/documents/armourtrack_showcase.pdf'
        },
        'dromat-report-pdf': {
            title: 'DROMAT: AI-Powered Disaster Response Drone Report (IEEE)',
            project: 'DROMAT: AI-Powered Disaster Response Drone Ecosystem',
            type: 'pdf',
            label: 'PDF Report',
            size: '2.15 MB',
            src: './assets/documents/DroneVision_SWARM_Two_Column_Report.pdf'
        },
        'sih2025-deck-pdf': {
            title: 'SIH 2025 Idea Pitch Deck — Disaster Response Drone (SIH25047)',
            project: 'DROMAT: AI-Powered Disaster Response Drone Ecosystem',
            type: 'pdf',
            label: 'PDF Deck',
            size: '3.45 MB',
            src: './assets/documents/SIH2025-IDEAFinal.pdf'
        },
        'dronevision-swarm-pdf': {
            title: 'DroneVision -> SWARM System Project Record (RRU)',
            project: 'D_One (DroneVision -> SWARM System)',
            type: 'pdf',
            label: 'PDF Record',
            size: '2.65 MB',
            src: './assets/documents/ELab_Project_Showcase.pptx'
        },
        'elab-deck-pptx': {
            title: 'E-Lab: Full-Stack Laboratory Management Platform Deck',
            project: 'E-Lab: Full-Stack Laboratory Management Platform',
            type: 'pptx',
            label: 'PPTX Deck',
            size: '578 KB',
            src: './assets/documents/Electric_Motor_Fault_Detection_Project_Presentation.pptx'
        },
        'smart-herd-docx': {
            title: 'Smart Herd (MYOSA) Livestock Monitoring Ideation Document',
            project: 'Smart Herd: Automated Livestock Monitoring with MYOSA',
            type: 'docx',
            label: 'DOCX Doc',
            size: '282 KB',
            src: './assets/documents/DROMAT_Report%20(1).pdf'
        },
        'expenseai-paper-pdf': {
            title: 'ExpenseAI: Autonomous Financial Auditing via Edge LLMs (Paper)',
            project: 'ExpenseAI: Edge-LLM Financial Auditing',
            type: 'pdf',
            label: 'PDF Paper',
            size: '663 KB',
            src: './assets/media/ExpenseAI.mp4'
        },
        'expenseai-demo-mp4': {
            title: 'ExpenseAI — Interactive Browser System Walkthrough (Video)',
            project: 'ExpenseAI: Edge-LLM Financial Auditing',
            type: 'mp4',
            label: 'MP4 Video',
            size: '135.4 MB',
            src: './assets/documents/armourtrack_showcase.pptx'
        }
    };

    const docModal = document.getElementById('doc-viewer-modal');
    const docPanel = document.getElementById('doc-viewer-panel');
    const docBadge = document.getElementById('doc-viewer-badge');
    const docTitle = document.getElementById('doc-viewer-title');
    const docMeta = document.getElementById('doc-viewer-meta');
    const docFullscreenBtn = document.getElementById('doc-viewer-fullscreen');
    const docNewTabLink = document.getElementById('doc-viewer-newtab');
    const docDownloadLink = document.getElementById('doc-viewer-download');
    const docCloseBtn = document.getElementById('doc-viewer-close');

    const pdfWrap = document.getElementById('viewer-pdf-wrap');
    const pdfFrame = document.getElementById('viewer-pdf-frame');
    const pdfFallbackLink = document.getElementById('viewer-pdf-fallback-link');

    const videoWrap = document.getElementById('viewer-video-wrap');
    const videoPlayer = document.getElementById('viewer-video-player');
    const videoSource = document.getElementById('viewer-video-source');

    const officeWrap = document.getElementById('viewer-office-wrap');
    const officeIcon = document.getElementById('viewer-office-icon');
    const officeTitle = document.getElementById('viewer-office-title');
    const officeDetails = document.getElementById('viewer-office-details');
    const officeLocalNote = document.getElementById('viewer-office-local-note');
    const officeDownload = document.getElementById('viewer-office-download');
    const officeOnline = document.getElementById('viewer-office-online');

    if (docModal && docCloseBtn) {
        let lastFocusedBeforeModal = null;
        let modalCloseTimer = null;
        let docTransitionHandler = null;

        function clearDocTransition() {
            if (docTransitionHandler && docPanel) {
                docPanel.removeEventListener('transitionend', docTransitionHandler);
                docTransitionHandler = null;
            }
        }

        function resetViewerStage() {
            pdfWrap.classList.add('hidden');
            pdfWrap.classList.remove('flex');
            pdfFrame.src = '';

            videoWrap.classList.add('hidden');
            videoWrap.classList.remove('flex');
            videoPlayer.pause();
            if (videoSource) {
                videoSource.removeAttribute('src');
            }
            videoPlayer.removeAttribute('src');
            videoPlayer.load();

            officeWrap.classList.add('hidden');
            officeWrap.classList.remove('flex');
        }

        function forceCloseDocViewer() {
            clearTimeout(modalCloseTimer);
            clearDocTransition();
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }
            docModal.classList.remove('is-open', 'is-closing', 'is-mounted');
            resetViewerStage();
            document.body.style.overflow = '';
            setPageInert(false);
        }

        function openDocViewer(docId) {
            const doc = DOC_VAULT[docId];
            if (!doc) return;

            clearTimeout(modalCloseTimer);
            clearDocTransition();
            lastFocusedBeforeModal = document.activeElement;
            resetViewerStage();

            docBadge.className = `doc-type-badge doc-type-badge--${doc.type} flex-shrink-0`;
            docBadge.textContent = doc.label;
            docTitle.textContent = doc.title;
            docMeta.textContent = `${doc.project} • ${doc.size}`;
            docNewTabLink.href = doc.src;
            docDownloadLink.href = doc.src;

            if (doc.type === 'pdf') {
                pdfFrame.src = `${doc.src}#view=FitH`;
                pdfFallbackLink.href = doc.src;
                pdfWrap.classList.remove('hidden');
                pdfWrap.classList.add('flex');
            } else if (doc.type === 'mp4') {
                if (videoSource) {
                    videoSource.src = doc.src;
                } else {
                    videoPlayer.src = doc.src;
                }
                videoPlayer.load();
                videoWrap.classList.remove('hidden');
                videoWrap.classList.add('flex');
            } else {
                const isPptx = doc.type === 'pptx';
                officeIcon.innerHTML = isPptx
                    ? '<i class="fas fa-file-powerpoint" aria-hidden="true"></i>'
                    : '<i class="fas fa-file-word" aria-hidden="true"></i>';
                officeIcon.className = isPptx
                    ? 'w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl bg-sky-500/10 text-sky-400 border border-sky-500/30';

                officeTitle.textContent = doc.title;
                officeDetails.textContent = `${isPptx ? 'Microsoft PowerPoint (.pptx)' : 'Microsoft Word (.docx)'} • ${doc.size}`;
                officeDownload.href = doc.src;

                const absUrl = new URL(doc.src, window.location.href).href;
                const isPublicHttps = /^https:\/\//i.test(absUrl) && !/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(window.location.hostname);

                if (isPublicHttps) {
                    officeOnline.href = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(absUrl)}`;
                    officeOnline.classList.remove('is-disabled');
                    officeOnline.removeAttribute('aria-disabled');
                    officeLocalNote.classList.add('hidden');
                } else {
                    officeOnline.href = '#';
                    officeOnline.classList.add('is-disabled');
                    officeOnline.setAttribute('aria-disabled', 'true');
                    officeLocalNote.classList.remove('hidden');
                }

                officeWrap.classList.remove('hidden');
                officeWrap.classList.add('flex');
            }

            docModal.classList.remove('is-closing');
            docModal.classList.add('is-mounted');
            document.body.style.overflow = 'hidden';
            setPageInert(true);

            if (prefersReducedMotion) {
                docModal.classList.add('is-open');
            } else {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        docModal.classList.add('is-open');
                    });
                });
            }
            docCloseBtn.focus();
        }

        function closeDocViewer() {
            if (!docModal.classList.contains('is-mounted') || docModal.classList.contains('is-closing')) return;

            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }

            if (prefersReducedMotion) {
                forceCloseDocViewer();
                lastFocusedBeforeModal?.focus?.();
                return;
            }

            clearTimeout(modalCloseTimer);
            clearDocTransition();
            docModal.classList.remove('is-open');
            docModal.classList.add('is-closing');

            const finishClose = () => {
                forceCloseDocViewer();
                lastFocusedBeforeModal?.focus?.();
            };

            if (docPanel) {
                docTransitionHandler = (e) => {
                    if (e.target === docPanel) finishClose();
                };
                docPanel.addEventListener('transitionend', docTransitionHandler);
            }
            modalCloseTimer = setTimeout(finishClose, 360);
        }

        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-doc-open]');
            if (trigger) {
                e.preventDefault();
                openDocViewer(trigger.getAttribute('data-doc-open'));
            }
        });

        docCloseBtn.addEventListener('click', closeDocViewer);

        docModal.addEventListener('click', (e) => {
            if (e.target === docModal) {
                closeDocViewer();
            }
        });

        docFullscreenBtn?.addEventListener('click', () => {
            if (!docPanel) return;
            if (!document.fullscreenElement) {
                docPanel.requestFullscreen?.().catch(() => {});
            } else {
                document.exitFullscreen?.().catch(() => {});
            }
        });

        document.addEventListener('keydown', (e) => {
            if (!docModal.classList.contains('is-mounted')) return;
            if (e.key === 'Escape') {
                closeDocViewer();
            } else {
                trapModalFocus(docModal, e);
            }
        });

        window.addEventListener('beforeprint', forceCloseDocViewer);
    }
});
