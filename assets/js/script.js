/* ==========================================================================
   Nirmalya Sinha Multi-Page Portfolio — Unified Interactive Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;

    // ----------------------------------------------------------------------
    // 1. Dual-Theme Controller (Green/White/Black Dark <-> High-Contrast Light)
    // ----------------------------------------------------------------------
    const THEME_KEY = 'nirmalya-theme';
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeMeta = document.querySelector('meta[name="theme-color"]');

    function getTheme() {
        return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }

    function applyTheme(theme, animate = false) {
        if (animate) {
            root.classList.add('theme-transitioning');
            setTimeout(() => root.classList.remove('theme-transitioning'), 240);
        }
        root.setAttribute('data-theme', theme);
        root.style.colorScheme = theme;
        if (themeMeta) {
            themeMeta.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff');
        }
        if (themeToggleBtn) {
            const isDark = theme === 'dark';
            themeToggleBtn.setAttribute('aria-pressed', String(isDark));
            themeToggleBtn.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Pitch-Black Dark Mode');
            themeToggleBtn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Pitch-Black Dark Mode');
        }
        if (window.pcbEngine) window.pcbEngine.setTheme(theme);
        if (window.logicAnalyzer) window.logicAnalyzer.setTheme(theme);
        if (window.dieExplorer) window.dieExplorer.setTheme(theme);
    }

    applyTheme(getTheme(), false);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const next = getTheme() === 'dark' ? 'light' : 'dark';
            try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
            applyTheme(next, true);
        });
    }

    window.addEventListener('storage', (e) => {
        if (e.key === THEME_KEY && (e.newValue === 'dark' || e.newValue === 'light')) {
            applyTheme(e.newValue, false);
        }
    });

    // ----------------------------------------------------------------------
    // 2. Sticky Header & Mobile Navigation
    // ----------------------------------------------------------------------
    const header = document.getElementById('header');
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    function onScrollHeader() {
        if (!header) return;
        header.classList.toggle('nav-scrolled', window.scrollY > 12);
    }
    window.addEventListener('scroll', onScrollHeader, { passive: true });
    onScrollHeader();

    if (menuBtn && mobileMenu) {
        function closeMenu(returnFocus = false) {
            mobileMenu.classList.remove('is-open');
            menuBtn.setAttribute('aria-expanded', 'false');
            mobileMenu.setAttribute('aria-hidden', 'true');
            if (returnFocus) menuBtn.focus();
        }

        menuBtn.addEventListener('click', () => {
            const isOpen = mobileMenu.classList.contains('is-open');
            if (isOpen) {
                closeMenu(false);
            } else {
                mobileMenu.classList.add('is-open');
                menuBtn.setAttribute('aria-expanded', 'true');
                mobileMenu.setAttribute('aria-hidden', 'false');
            }
        });

        mobileMenu.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => closeMenu(false));
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
                closeMenu(true);
            }
        });
    }

    // ----------------------------------------------------------------------
    // 3. Scroll Reveal Observer
    // ----------------------------------------------------------------------
    const revealEls = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && !prefersReducedMotion) {
        const observer = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        obs.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.06, rootMargin: '0px 0px -24px 0px' }
        );
        revealEls.forEach((el) => observer.observe(el));
    } else {
        revealEls.forEach((el) => el.classList.add('revealed'));
    }

    // ----------------------------------------------------------------------
    // 4. Cursor-Reactive PCB Circuit Canvas (Dual-Theme)
    // ----------------------------------------------------------------------
    const circuitCanvas = document.getElementById('circuit-canvas');
    if (circuitCanvas) {
        const ctx = circuitCanvas.getContext('2d');
        let width = 0;
        let height = 0;
        let traces = [];
        let packets = [];
        let mouseX = -9999;
        let mouseY = -9999;
        let currentTheme = getTheme();
        let rafId = null;

        function getPalette(theme) {
            if (theme === 'light') {
                return {
                    trace: 'rgba(3, 105, 161, 0.11)',
                    traceProbe: 'rgba(3, 105, 161, 0.38)',
                    via: 'rgba(4, 120, 87, 0.22)',
                    packetA: '#0369a1',
                    packetB: '#047857'
                };
            }
            return {
                trace: 'rgba(34, 197, 94, 0.12)',
                traceProbe: 'rgba(74, 222, 128, 0.45)',
                via: 'rgba(255, 255, 255, 0.22)',
                packetA: '#22c55e',
                packetB: '#ffffff'
            };
        }

        function buildTraces() {
            width = circuitCanvas.width = window.innerWidth;
            height = circuitCanvas.height = window.innerHeight;
            traces = [];
            packets = [];

            const grid = 48;
            const count = Math.min(28, Math.max(12, Math.floor((width * height) / 55000)));
            for (let i = 0; i < count; i++) {
                const startX = Math.floor((Math.random() * width) / grid) * grid;
                const startY = Math.floor((Math.random() * height) / grid) * grid;
                const pts = [{ x: startX, y: startY }];
                let cx = startX;
                let cy = startY;
                const segs = 2 + Math.floor(Math.random() * 3);
                for (let s = 0; s < segs; s++) {
                    const step = (1 + Math.floor(Math.random() * 4)) * grid;
                    const dir = Math.floor(Math.random() * 4);
                    if (dir === 0) cx += step;
                    else if (dir === 1) cx -= step;
                    else if (dir === 2) cy += step;
                    else {
                        cx += step * 0.7;
                        cy += step * 0.7;
                    }
                    pts.push({ x: cx, y: cy });
                }
                traces.push(pts);
                if (i % 2 === 0) {
                    packets.push({
                        traceIdx: i,
                        segIdx: 0,
                        t: Math.random(),
                        speed: 0.006 + Math.random() * 0.008,
                        alt: i % 4 === 0
                    });
                }
            }
        }

        function drawFrame() {
            const pal = getPalette(currentTheme);
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < traces.length; i++) {
                const pts = traces[i];
                let nearProbe = false;
                for (let p = 0; p < pts.length; p++) {
                    const dx = pts[p].x - mouseX;
                    const dy = pts[p].y - mouseY;
                    if (dx * dx + dy * dy < 13000) {
                        nearProbe = true;
                        break;
                    }
                }

                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                for (let p = 1; p < pts.length; p++) {
                    ctx.lineTo(pts[p].x, pts[p].y);
                }
                ctx.strokeStyle = nearProbe ? pal.traceProbe : pal.trace;
                ctx.lineWidth = nearProbe ? 1.5 : 1;
                ctx.stroke();

                const start = pts[0];
                const end = pts[pts.length - 1];
                [start, end].forEach((node) => {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, nearProbe ? 3.2 : 2.2, 0, Math.PI * 2);
                    ctx.fillStyle = pal.via;
                    ctx.fill();
                });
            }

            if (!prefersReducedMotion) {
                for (let i = 0; i < packets.length; i++) {
                    const pk = packets[i];
                    const pts = traces[pk.traceIdx];
                    if (!pts || pts.length < 2) continue;

                    const a = pts[pk.segIdx];
                    const b = pts[pk.segIdx + 1];
                    const px = a.x + (b.x - a.x) * pk.t;
                    const py = a.y + (b.y - a.y) * pk.t;

                    ctx.beginPath();
                    ctx.arc(px, py, 2.3, 0, Math.PI * 2);
                    ctx.fillStyle = pk.alt ? pal.packetB : pal.packetA;
                    ctx.fill();

                    pk.t += pk.speed;
                    if (pk.t >= 1) {
                        pk.t = 0;
                        pk.segIdx++;
                        if (pk.segIdx >= pts.length - 1) pk.segIdx = 0;
                    }
                }
                rafId = requestAnimationFrame(drawFrame);
            }
        }

        window.pcbEngine = {
            setTheme(theme) {
                currentTheme = theme;
                if (prefersReducedMotion) drawFrame();
            }
        };

        const startCanvas = () => {
            buildTraces();
            drawFrame();
        };

        if ('requestIdleCallback' in window) {
            requestIdleCallback(startCanvas, { timeout: 500 });
        } else {
            setTimeout(startCanvas, 80);
        }

        window.addEventListener('resize', () => {
            if (rafId) cancelAnimationFrame(rafId);
            buildTraces();
            drawFrame();
        });

        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        }, { passive: true });
    }

    // ----------------------------------------------------------------------
    // 5. Canonical Document Vault Manifest (14 Assets)
    // ----------------------------------------------------------------------
    const DOC_VAULT = {
        'cv-nirmalya': {
            title: 'Curriculum Vitae — Nirmalya Sinha',
            type: 'PDF',
            size: '88 KB',
            project: 'Resume / CV',
            summary: 'B.Tech EE (VLSI Design, 9.05 SGPA) CV covering IIT (BHU) & RRU DFA research, FPGA/RTL projects, hackathon podiums, and certifications.',
            src: './assets/documents/CV_NirmalyaSinha.pdf'
        },
        'picorv32-report': {
            title: 'PicoRV32 RISC-V SoC: RTL-to-GDSII Complete Report',
            type: 'PDF',
            size: '6.6 MB',
            project: 'PicoRV32 SkyWater 130nm ASIC',
            summary: '31-page end-to-end OpenLane/Sky130 physical design report: 50 MHz, 1.00 mm² die, 32.09% utilization, 0 DRC, 0 LVS, +13.76 ns setup slack.',
            src: './assets/documents/picorv32_rtl_to_gds_overleaf_complete.pdf'
        },
        'motor-fault-report-pdf': {
            title: 'VSSC Motor Fault Detection — Technical Report',
            type: 'PDF',
            size: '13.5 MB',
            project: 'IIT (BHU) / VSSC Edge AI',
            summary: 'Complete CWRU bearing spectrogram classification study (99.73% ResNet-18, 97.29% RF) and PYNQ-Z2 / ZCU-104 FPGA deployment.',
            src: './assets/documents/greenwave_latex_source_bundle_revised.pdf',
            downloadName: 'Motor_Fault_Detection_Technical_Report.pdf'
        },
        'motor-fault-deck-pptx': {
            title: 'VSSC Motor Fault Detection — Project Deck',
            type: 'PPTX',
            size: '5.6 MB',
            project: 'IIT (BHU) / VSSC Edge AI',
            summary: 'Presentation deck detailing Vitis HLS Random Forest IP synthesis and ZCU-104 hardware-in-the-loop inference.',
            src: './assets/documents/Fault_Detection_Report_Revised.pdf',
            downloadName: 'Motor_Fault_Detection_Presentation.pptx'
        },
        'armourtrack-full-docx': {
            title: 'ArmourTrack — Full Technical Documentation',
            type: 'DOCX',
            size: '136 KB',
            project: 'ArmourTrack (CRAFTATHON 2026)',
            summary: 'Detailed architecture specification for RSA-signed QR, RFID custody, ESP32 + GPS geofencing, and SHA-256 audit ledger.',
            src: './assets/documents/ArmourTrack_Technical_Project_Report.pdf',
            downloadName: 'ArmourTrack_Technical_Documentation.docx'
        },
        'armourtrack-brief-pdf': {
            title: 'ArmourTrack — Technical Project Report',
            type: 'PDF',
            size: '50 KB',
            project: 'ArmourTrack (CRAFTATHON 2026)',
            summary: 'Condensed engineering report covering hardware authentication flow and tamper-evident custody logging.',
            src: './assets/documents/Copy%20of%20Smart%20Herd_%20Revolutionizing%20Livestock%20Monitoring%20with%20MYOSA.docx',
            downloadName: 'ArmourTrack_Brief_Report.pdf'
        },
        'armourtrack-showcase-pdf': {
            title: 'ArmourTrack — Hardware Showcase Brief',
            type: 'PDF',
            size: '42 KB',
            project: 'ArmourTrack (CRAFTATHON 2026)',
            summary: 'Competition pitch and custody-chain verification summary from IEEE CRAFTATHON 2026 (1st Runner Up).',
            src: './assets/documents/armourtrack_showcase.pdf'
        },
        'dromat-ieee-pdf': {
            title: 'DROMAT — Disaster Response Drone IEEE Paper',
            type: 'PDF',
            size: '2.15 MB',
            project: 'DROMAT UAV Ecosystem',
            summary: 'Autonomous Pixhawk + Raspberry Pi relief-delivery UAV with A* pathfinding, YOLOv8, and 868 MHz LoRa telemetry.',
            src: './assets/documents/DroneVision_SWARM_Two_Column_Report.pdf',
            downloadName: 'DROMAT_IEEE_Paper.pdf'
        },
        'dronevision-swarm-pdf': {
            title: 'D_One & SWARM — Project Record & Deck',
            type: 'PDF',
            size: '2.65 MB',
            project: 'D_One (DroneVision -> SWARM)',
            summary: 'Custom X-frame quadcopter flight telemetry (22.3 min flight, ±1.5 m waypoint) and Gazebo/SITL MAVLink swarm testbed.',
            src: './assets/documents/ELab_Project_Showcase.pptx',
            downloadName: 'DroneVision_SWARM_Project_Record.pdf'
        },
        'trishuli-sih-pdf': {
            title: 'Trishuli — SIH 2026 Finalist Proposal',
            type: 'PDF',
            size: '3.45 MB',
            project: 'Trishuli Early Warning (SIH 2026)',
            summary: 'Top 10 Finalist proposal for ~Rs. 1,100/node ESP8266 Wi-Fi mesh and Raspberry Pi Edge ML mine-subsidence warning.',
            src: './assets/documents/SIH2025-IDEAFinal.pdf',
            downloadName: 'Trishuli_SIH2026_Proposal.pdf'
        },
        'elab-showcase-pptx': {
            title: 'E-Lab — Campus Lab ERP Showcase Deck',
            type: 'PPTX',
            size: '578 KB',
            project: 'E-Lab Management Platform',
            summary: 'Slide deck covering Next.js 14 RBAC portal, PostgreSQL/Drizzle ORM schema, and ESP8266 + RFID-RC522 lab telemetry.',
            src: './assets/documents/Electric_Motor_Fault_Detection_Project_Presentation.pptx',
            downloadName: 'ELab_Platform_Showcase.pptx'
        },
        'smart-herd-docx': {
            title: 'Smart Herd — MYOSA Livestock Ideation',
            type: 'DOCX',
            size: '282 KB',
            project: 'Smart Herd (MYOSA ESP32)',
            summary: 'Sensor-fusion prototype report using MYOSA ESP32, MPU6050 6-axis IMU, and SI7021 temperature/humidity sensing.',
            src: './assets/documents/DROMAT_Report%20(1).pdf',
            downloadName: 'Smart_Herd_MYOSA_Ideation.docx'
        },
        'expenseai-paper-pdf': {
            title: 'ExpenseAI — Edge-LLM Financial Paper',
            type: 'PDF',
            size: '663 KB',
            project: 'ExpenseAI',
            summary: 'Technical paper on privacy-first edge-LLM receipt extraction and automated expense categorization.',
            src: './assets/media/ExpenseAI.mp4',
            downloadName: 'ExpenseAI_Technical_Paper.pdf'
        },
        'expenseai-demo-mp4': {
            title: 'ExpenseAI — Live Demo Walkthrough',
            type: 'MP4',
            size: 'YouTube Demo',
            project: 'ExpenseAI',
            summary: 'Full end-to-end video walkthrough of the ExpenseAI application and inference pipeline (hosted externally due to 25 MiB Cloudflare asset limit).',
            src: 'https://www.youtube.com/@Nirmalya-Sinha',
            external: true
        }
    };

    // ----------------------------------------------------------------------
    // 6. Document Viewer Modal (PDF iframe, Video player, Office card)
    // ----------------------------------------------------------------------
    const docModal = document.getElementById('doc-viewer-modal');
    const docTitle = document.getElementById('doc-viewer-title');
    const docSubtitle = document.getElementById('doc-viewer-subtitle');
    const docBadge = document.getElementById('doc-viewer-badge');
    const docOpenTab = document.getElementById('doc-viewer-open-tab');
    const docDownload = document.getElementById('doc-viewer-download');
    const docClose = document.getElementById('doc-viewer-close');
    const docPdfWrap = document.getElementById('doc-pdf-wrap');
    const docPdfFrame = document.getElementById('doc-pdf-frame');
    const docVideoWrap = document.getElementById('doc-video-wrap');
    const docVideoPlayer = document.getElementById('doc-video-player');
    const docOfficeWrap = document.getElementById('doc-office-wrap');
    const docOfficeTitle = document.getElementById('doc-office-title');
    const docOfficeDetails = document.getElementById('doc-office-details');
    const docOfficeDownload = document.getElementById('doc-office-download');

    let lastFocusedEl = null;

    function openDocument(docId) {
        const doc = DOC_VAULT[docId];
        if (!doc || !docModal) return;

        lastFocusedEl = document.activeElement;
        if (docTitle) docTitle.textContent = doc.title;
        if (docSubtitle) docSubtitle.textContent = `${doc.project} • ${doc.size}`;
        if (docBadge) {
            docBadge.textContent = doc.type;
            docBadge.className = `doc-type-badge doc-type-badge--${doc.type.toLowerCase()}`;
        }

        if (docOpenTab) docOpenTab.href = doc.src;
        if (docDownload) {
            docDownload.href = doc.src;
            docDownload.setAttribute('download', doc.downloadName || doc.src.split('/').pop());
        }

        if (docPdfWrap) docPdfWrap.classList.add('hidden');
        if (docVideoWrap) docVideoWrap.classList.add('hidden');
        if (docOfficeWrap) docOfficeWrap.classList.add('hidden');
        if (docPdfFrame) docPdfFrame.src = 'about:blank';
        if (docVideoPlayer) {
            docVideoPlayer.pause();
            docVideoPlayer.removeAttribute('src');
        }

        if (doc.type === 'PDF' && docPdfWrap && docPdfFrame) {
            docPdfFrame.src = doc.src;
            docPdfWrap.classList.remove('hidden');
        } else if (doc.type === 'MP4' && docVideoWrap && docVideoPlayer) {
            docVideoPlayer.src = doc.src;
            docVideoWrap.classList.remove('hidden');
        } else if (docOfficeWrap) {
            if (docOfficeTitle) docOfficeTitle.textContent = doc.title;
            if (docOfficeDetails) {
                docOfficeDetails.textContent = `${doc.type === 'PPTX' ? 'Microsoft PowerPoint (.pptx)' : 'Microsoft Word (.docx)'} • ${doc.size}`;
            }
            if (docOfficeDownload) {
                docOfficeDownload.href = doc.src;
                docOfficeDownload.setAttribute('download', doc.downloadName || doc.src.split('/').pop());
            }
            docOfficeWrap.classList.remove('hidden');
        }

        docModal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        if (docClose) docClose.focus();
    }

    function closeDocument() {
        if (!docModal || !docModal.classList.contains('is-open')) return;
        docModal.classList.remove('is-open');
        document.body.style.overflow = '';
        if (docPdfFrame) docPdfFrame.src = 'about:blank';
        if (docVideoPlayer) {
            docVideoPlayer.pause();
            docVideoPlayer.removeAttribute('src');
        }
        if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
            lastFocusedEl.focus();
        }
    }

    if (docModal) {
        if (docClose) docClose.addEventListener('click', closeDocument);
        docModal.addEventListener('click', (e) => {
            if (e.target === docModal) closeDocument();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && docModal.classList.contains('is-open')) closeDocument();
        });

        document.querySelectorAll('[data-open-doc]').forEach((btn) => {
            btn.addEventListener('click', () => openDocument(btn.getAttribute('data-open-doc')));
        });

        const params = new URLSearchParams(window.location.search);
        const targetDoc = params.get('doc');
        if (targetDoc && DOC_VAULT[targetDoc]) {
            openDocument(targetDoc);
        }
    }

    // ----------------------------------------------------------------------
    // 7. Vault Filter Tabs (vault.html)
    // ----------------------------------------------------------------------
    const docFilterBtns = document.querySelectorAll('#doc-filters .filter-tab');
    const docCards = document.querySelectorAll('#docs-grid .doc-card');
    if (docFilterBtns.length && docCards.length) {
        docFilterBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                const filter = btn.getAttribute('data-doc-filter');
                docFilterBtns.forEach((b) => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');

                docCards.forEach((card) => {
                    const type = card.getAttribute('data-doc-type');
                    card.classList.toggle('is-hidden', !(filter === 'all' || type === filter));
                });
            });
        });
    }

    // ----------------------------------------------------------------------
    // 8. Project Filter Tabs (projects.html)
    // ----------------------------------------------------------------------
    const projectFilterBtns = document.querySelectorAll('#project-filters .filter-tab');
    const projectCards = document.querySelectorAll('#projects-grid .project-card');
    if (projectFilterBtns.length && projectCards.length) {
        function applyProjectFilter(filter) {
            projectFilterBtns.forEach((b) => {
                const active = b.getAttribute('data-filter') === filter;
                b.classList.toggle('active', active);
                b.setAttribute('aria-pressed', String(active));
            });
            projectCards.forEach((card) => {
                const cat = card.getAttribute('data-category');
                card.classList.toggle('is-hidden', !(filter === 'all' || cat === filter));
            });
        }

        projectFilterBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                const filter = btn.getAttribute('data-filter');
                applyProjectFilter(filter);
                const url = new URL(window.location.href);
                if (filter === 'all') url.searchParams.delete('cat');
                else url.searchParams.set('cat', filter);
                window.history.replaceState({}, '', url);
            });
        });

        const initialCat = new URLSearchParams(window.location.search).get('cat');
        if (initialCat) applyProjectFilter(initialCat);
    }

    // ----------------------------------------------------------------------
    // 9. Interactive Sky130 RTL-to-GDSII Explorer (projects.html)
    // ----------------------------------------------------------------------
    const stageButtons = document.querySelectorAll('#sky130-stages .stage-btn');
    const stageTitleEl = document.getElementById('sky130-stage-title');
    const stageToolEl = document.getElementById('sky130-stage-tool');
    const stageDescEl = document.getElementById('sky130-stage-desc');
    const stageMetricEl = document.getElementById('sky130-stage-metric');

    const SKY130_STAGES = {
        spec: {
            title: 'Step 1: Design Specification & Constraints',
            tool: 'PDK: sky130A (sky130_fd_sc_hd) • top.sdc • pin_order.cfg',
            desc: 'Defined 50 MHz clock constraint (20.0 ns period, 0.25 ns uncertainty), 4 cardinal I/O pins (clk North, reset East, uart_tx South, uart_rx West), and 1000 µm × 1000 µm square die floorplan.',
            metric: '1.00 mm² Die • 50 MHz Target'
        },
        rtl: {
            title: 'Step 2: ASIC-Clean Verilog-2005 RTL Hierarchy',
            tool: 'Verilator v5.052 (--lint-only -Wall) • Yosys RTLIL',
            desc: 'Architected 9 synthesizable Verilog-2005 modules (top.v, picorv32.v, 5-state Native-to-AXI4-Lite bridge, 1-to-3 AXI4-Lite crossbar, 8 KB Boot ROM, 256 B SRAM, 115,200 baud 8N1 UART with 2-FF RX synchronizer).',
            metric: '9 RTL Modules • 0.113s Lint'
        },
        sim: {
            title: 'Step 3: Multi-Tier Functional Verification',
            tool: 'Verilator --binary --trace • GTKWave',
            desc: 'Verified standalone UART loopback, AXI4-Lite write-then-read handshake (0x000000A5 at 0x10000000), and full-chip Boot ROM firmware execution streaming ASCII PING frames.',
            metric: '3/3 Testbench Tiers Passed'
        },
        synth: {
            title: 'Step 4: Logic Synthesis & Tech Mapping',
            tool: 'Yosys 0.64+26 • Berkeley ABC • sky130_fd_sc_hd__tt_025C_1v80.lib',
            desc: 'Mapped RTL to 18,584 post-ABC standard cells (68.99% sequential DFFs via sky130_fd_sc_hd__edfxtp_1, 31.01% combinational AOI/OAI gates) in 10.07s.',
            metric: '164,256.28 µm² Gate Area'
        },
        lec: {
            title: 'Step 5: Formal Logic Equivalence Check (LEC)',
            tool: 'Yosys Formal (equiv_make, flatten, equiv_simple, equiv_induct)',
            desc: 'Constructed SAT miter comparing golden RTL against synthesized gate-level netlist synth.v, proving 3/3 output cones with 0 unproven cells.',
            metric: '100% Equivalence Proven'
        },
        pnr: {
            title: 'Step 6: Physical Design (PnR, CTS & Routing)',
            tool: 'OpenLane 1 • OpenROAD • TritonCTS • TritonRoute',
            desc: 'Placed 24,441 standard logic cells (32.09% utilization), 50,603 decaps, 16,020 antenna diodes, 13,718 well-taps, and 27,416 fillers; routed 11,765 nets across met1–met4 with met5 PDN straps.',
            metric: '132,198 Total Cells • 954,519 µm Wire'
        },
        signoff: {
            title: 'Step 7: Physical Verification & Multi-Corner STA',
            tool: 'Magic 8.3 DRC • Netgen LVS • OpenSTA 2.4.0 • CVC v1.1.4',
            desc: 'Achieved 0 Magic DRC violations, LVS clean (24,446 nets & 27,126 devices matched), 0 CVC electrical errors, +13.76 ns setup slack, +0.72 ns hold slack, and 35.9 mW total power.',
            metric: '0 DRC • 0 LVS • +13.76 ns Slack'
        },
        gds: {
            title: 'Step 8: Final GDSII Mask Stream-Out',
            tool: 'Magic 8.3 Stream-Out • KLayout 0.26.12',
            desc: 'Streamed out foundry-ready GDSII Release 3.0 mask database (results/final/gds/top.gds) and verified diffusion, poly, li1, and met1–met5 mask layers in KLayout.',
            metric: '85.88 MB top.gds Ready'
        }
    };

    if (stageButtons.length && stageTitleEl) {
        stageButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-stage');
                const info = SKY130_STAGES[key];
                if (!info) return;
                stageButtons.forEach((b) => {
                    const active = b === btn;
                    b.classList.toggle('active', active);
                    b.setAttribute('aria-pressed', String(active));
                });
                stageTitleEl.textContent = info.title;
                if (stageToolEl) stageToolEl.textContent = info.tool;
                if (stageDescEl) stageDescEl.textContent = info.desc;
                if (stageMetricEl) stageMetricEl.textContent = info.metric;
            });
        });
    }

    // ----------------------------------------------------------------------
    // 10. Interactive 4-Channel Mini Logic Analyzer (projects.html)
    // ----------------------------------------------------------------------
    const laCanvas = document.getElementById('logic-analyzer-canvas');
    const laReadout = document.getElementById('logic-analyzer-readout');
    if (laCanvas) {
        const lctx = laCanvas.getContext('2d');
        let laTheme = getTheme();
        let cursorRatio = 0.38;

        function drawWaveform() {
            const dpr = window.devicePixelRatio || 1;
            const rect = laCanvas.getBoundingClientRect();
            laCanvas.width = Math.max(300, Math.floor(rect.width * dpr));
            laCanvas.height = Math.floor(150 * dpr);
            lctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const w = rect.width;
            const h = 150;
            const dark = laTheme === 'dark';
            const labelColor = dark ? '#d1d5db' : '#475569';
            const gridColor = dark ? 'rgba(22, 41, 29, 0.85)' : 'rgba(203, 213, 225, 0.8)';
            const sigColors = dark
                ? ['#22c55e', '#ffffff', '#4ade80', '#86efac']
                : ['#0369a1', '#047857', '#1d4ed8', '#b45309'];

            lctx.clearRect(0, 0, w, h);

            for (let i = 1; i < 10; i++) {
                const gx = 92 + ((w - 104) * i) / 10;
                lctx.beginPath();
                lctx.moveTo(gx, 8);
                lctx.lineTo(gx, h - 8);
                lctx.strokeStyle = gridColor;
                lctx.lineWidth = 1;
                lctx.stroke();
            }

            const channels = [
                { name: 'sys_clk', fn: (x) => (Math.floor(x * 16) % 2 === 0 ? 1 : 0) },
                { name: 'rst_n', fn: (x) => (x > 0.12 ? 1 : 0) },
                { name: 'axi_valid', fn: (x) => ((x > 0.25 && x < 0.48) || (x > 0.62 && x < 0.85) ? 1 : 0) },
                { name: 'fault_irq', fn: (x) => (x > 0.72 && x < 0.82 ? 1 : 0) }
            ];

            channels.forEach((ch, idx) => {
                const baseY = 26 + idx * 32;
                const highY = baseY - 12;
                const lowY = baseY + 4;

                lctx.fillStyle = labelColor;
                lctx.font = '600 11px "JetBrains Mono", monospace';
                lctx.fillText(ch.name, 10, baseY - 1);

                lctx.beginPath();
                const startX = 92;
                const span = w - 104;
                let prev = ch.fn(0);
                lctx.moveTo(startX, prev ? highY : lowY);
                for (let px = 1; px <= span; px++) {
                    const norm = px / span;
                    const val = ch.fn(norm);
                    const y = val ? highY : lowY;
                    if (val !== prev) {
                        lctx.lineTo(startX + px, prev ? highY : lowY);
                    }
                    lctx.lineTo(startX + px, y);
                    prev = val;
                }
                lctx.strokeStyle = sigColors[idx];
                lctx.lineWidth = 1.8;
                lctx.stroke();
            });

            const cx = 92 + (w - 104) * cursorRatio;
            lctx.beginPath();
            lctx.moveTo(cx, 6);
            lctx.lineTo(cx, h - 6);
            lctx.strokeStyle = dark ? '#ffffff' : '#020617';
            lctx.lineWidth = 1.5;
            lctx.setLineDash([4, 3]);
            lctx.stroke();
            lctx.setLineDash([]);

            if (laReadout) {
                const ns = Math.round(cursorRatio * 200);
                const axi = (cursorRatio > 0.25 && cursorRatio < 0.48) || (cursorRatio > 0.62 && cursorRatio < 0.85) ? '1 (0x000000A5)' : '0 (IDLE)';
                const irq = cursorRatio > 0.72 && cursorRatio < 0.82 ? 'FAULT_DETECTED' : 'OK';
                laReadout.textContent = `t = ${ns} ns  |  axi_valid = ${axi}  |  irq = ${irq}`;
            }
        }

        window.logicAnalyzer = {
            setTheme(theme) {
                laTheme = theme;
                drawWaveform();
            }
        };

        laCanvas.addEventListener('mousemove', (e) => {
            const rect = laCanvas.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            if (relX >= 92 && rect.width > 104) {
                cursorRatio = Math.min(1, Math.max(0, (relX - 92) / (rect.width - 104)));
                drawWaveform();
            }
        });
        window.addEventListener('resize', drawWaveform);
        drawWaveform();
    }

    // ----------------------------------------------------------------------
    // 11. Accessible Image Lightbox (index.html, about.html & projects.html)
    // ----------------------------------------------------------------------
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxClose = document.getElementById('lightbox-close');

    if (lightbox && lightboxImg && lightboxClose) {
        let lbPrevFocus = null;

        document.querySelectorAll('.media-trigger-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const img = btn.querySelector('img');
                if (!img) return;
                lbPrevFocus = btn;
                lightboxImg.src = img.currentSrc || img.src;
                lightboxImg.alt = img.alt || '';
                if (lightboxCaption) {
                    lightboxCaption.textContent = img.getAttribute('data-caption') || img.alt || '';
                }
                lightbox.classList.add('is-open');
                document.body.style.overflow = 'hidden';
                lightboxClose.focus();
            });
        });

        function closeLightbox() {
            if (!lightbox.classList.contains('is-open')) return;
            lightbox.classList.remove('is-open');
            lightboxImg.src = '';
            document.body.style.overflow = '';
            if (lbPrevFocus) lbPrevFocus.focus();
        }

        lightboxClose.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
        });
    }

    // ----------------------------------------------------------------------
    // 12. One-Click Copy Buttons (contact.html)
    // ----------------------------------------------------------------------
    document.querySelectorAll('[data-copy-text]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const text = btn.getAttribute('data-copy-text');
            if (!text) return;
            try {
                await navigator.clipboard.writeText(text);
                const label = btn.querySelector('.copy-label');
                if (label) {
                    const prev = label.textContent;
                    label.textContent = 'Copied!';
                    setTimeout(() => { label.textContent = prev; }, 1600);
                }
            } catch (_) {}
        });
    });

    // ----------------------------------------------------------------------
    // 13. Global Cmd+K / Ctrl+K Engineering Command Palette
    // ----------------------------------------------------------------------
    const cmdOpenBtns = document.querySelectorAll('[data-open-cmd]');
    const cmdItems = [
        { title: 'Home — Portrait, Silicon Die Explorer & Milestones', tag: 'Page', href: 'index.html' },
        { title: 'About — Journey, Research Experience & Highlights', tag: 'Page', href: 'about.html' },
        { title: 'Projects — Hardware, FPGA, ASIC & Case Studies', tag: 'Page', href: 'projects.html' },
        { title: 'Technical Vault — PDFs, Decks & Video Demos', tag: 'Page', href: 'vault.html' },
        { title: 'Contact — Emails, Socials & CV', tag: 'Page', href: 'contact.html' },
        { title: 'PicoRV32 SkyWater 130nm RTL-to-GDSII Report', tag: 'PDF', href: 'vault.html?doc=picorv32-report' },
        { title: 'Curriculum Vitae — Nirmalya Sinha', tag: 'CV', href: 'vault.html?doc=cv-nirmalya' },
        { title: 'VSSC Motor Fault Detection (ZCU-104 / PYNQ-Z2)', tag: 'FPGA', href: 'projects.html?cat=fpga-ai' },
        { title: 'ArmourTrack (1st Runner Up • CRAFTATHON 2026)', tag: 'Defence', href: 'projects.html?cat=defence-uavs' },
        { title: 'LearnVLSI / VPlay & eSim Platform', tag: 'Live', href: 'https://learnvlsi.in', external: true },
        { title: 'Toggle Light / Pitch-Black Dark Theme', tag: 'Action', action: 'theme' },
        { title: 'Copy Email (n.nirmalya.n@gmail.com)', tag: 'Action', action: 'copy-email' }
    ];

    const cmdModal = document.createElement('div');
    cmdModal.id = 'cmd-palette-modal';
    cmdModal.className = 'modal-backdrop';
    cmdModal.setAttribute('role', 'dialog');
    cmdModal.setAttribute('aria-modal', 'true');
    cmdModal.setAttribute('aria-label', 'Quick Navigation Command Palette');
    cmdModal.innerHTML = `
        <div class="modal-panel max-w-xl">
            <div class="flex items-center gap-3 px-4 py-3 border-b" style="border-color: var(--border-subtle);">
                <span class="font-mono-tech text-xs font-bold highlight">&gt;_</span>
                <input id="cmd-input" type="text" placeholder="Search pages, projects, PDFs, or actions..." class="w-full bg-transparent text-sm focus:outline-none" style="color: var(--text-heading);" autocomplete="off">
                <button id="cmd-close" type="button" class="text-xs font-mono-tech px-2 py-1 rounded border" style="border-color: var(--border-control); color: var(--text-muted);">ESC</button>
            </div>
            <div id="cmd-results" class="p-2 max-h-80 overflow-y-auto space-y-1"></div>
        </div>
    `;
    document.body.appendChild(cmdModal);

    const cmdInput = document.getElementById('cmd-input');
    const cmdResults = document.getElementById('cmd-results');
    const cmdClose = document.getElementById('cmd-close');

    function renderCmdItems(query = '') {
        const q = query.trim().toLowerCase();
        const filtered = cmdItems.filter((item) =>
            item.title.toLowerCase().includes(q) || item.tag.toLowerCase().includes(q)
        );
        cmdResults.innerHTML = '';
        if (!filtered.length) {
            cmdResults.innerHTML = `<p class="text-xs px-3 py-4 text-center" style="color: var(--text-muted);">No matching commands.</p>`;
            return;
        }
        filtered.forEach((item) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'cmd-item';
            btn.innerHTML = `
                <span class="text-sm font-medium">${item.title}</span>
                <span class="font-mono-tech text-[11px] px-2 py-0.5 rounded" style="background: var(--bg-surface-subtle); color: var(--accent); border: 1px solid var(--border-subtle);">${item.tag}</span>
            `;
            btn.addEventListener('click', () => {
                closeCmd();
                if (item.action === 'theme' && themeToggleBtn) {
                    themeToggleBtn.click();
                } else if (item.action === 'copy-email') {
                    navigator.clipboard?.writeText('n.nirmalya.n@gmail.com');
                } else if (item.external) {
                    window.open(item.href, '_blank', 'noopener,noreferrer');
                } else if (item.href) {
                    window.location.href = item.href;
                }
            });
            cmdResults.appendChild(btn);
        });
    }

    function openCmd() {
        cmdModal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        cmdInput.value = '';
        renderCmdItems('');
        setTimeout(() => cmdInput.focus(), 20);
    }

    function closeCmd() {
        if (!cmdModal.classList.contains('is-open')) return;
        cmdModal.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    cmdOpenBtns.forEach((b) => b.addEventListener('click', openCmd));
    cmdClose.addEventListener('click', closeCmd);
    cmdModal.addEventListener('click', (e) => {
        if (e.target === cmdModal) closeCmd();
    });
    cmdInput.addEventListener('input', (e) => renderCmdItems(e.target.value));
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (cmdModal.classList.contains('is-open')) closeCmd();
            else openCmd();
        } else if (e.key === 'Escape' && cmdModal.classList.contains('is-open')) {
            closeCmd();
        }
    });

    // ----------------------------------------------------------------------
    // 14. Interactive Silicon Die Explorer (index.html)
    // ----------------------------------------------------------------------
    const dieCanvas = document.getElementById('die-explorer-canvas');
    if (dieCanvas) {
        const dctx = dieCanvas.getContext('2d');
        const tagEl = document.getElementById('die-block-tag');
        const coordEl = document.getElementById('die-block-coord');
        const titleEl = document.getElementById('die-block-title');
        const descEl = document.getElementById('die-block-desc');
        const metricEl = document.getElementById('die-block-metric');
        const linkEl = document.getElementById('die-block-link');
        const autoBtn = document.getElementById('die-autopilot-btn');
        const jumpBtns = document.querySelectorAll('[data-die-jump]');

        const MACRO_BLOCKS = [
            {
                id: 'CORE_0',
                title: 'LearnVLSI / VPlay & eSim',
                desc: 'Browser-based 90-day Verilog practice arena, interactive K-Map/FSM simulator (esim.learnvlsi.in), and 7-track Sky130 RTL-to-GDSII studio.',
                metric: 'Live Platform • learnvlsi.in',
                href: 'projects.html?cat=vlsi-asic',
                nx: 0.25, ny: 0.30, nw: 0.30, nh: 0.28
            },
            {
                id: 'SOC_TOP',
                title: 'PicoRV32 Sky130 GDSII',
                desc: '1.00 mm² open-source RISC-V SoC @ 50 MHz (+13.76 ns setup slack), 24,441 logic cells, 0 Magic DRC & 0 Netgen LVS errors.',
                metric: '85.88 MB top.gds • 35.9 mW',
                href: 'vault.html?doc=picorv32-report',
                nx: 0.72, ny: 0.30, nw: 0.32, nh: 0.28
            },
            {
                id: 'FPGA_AI',
                title: 'VSSC Motor Fault Edge AI',
                desc: 'IIT (BHU) / VSSC-sponsored CWRU bearing fault classifier (99.7%+ test accuracy) deployed via Vitis HLS on PYNQ-Z2 & ZCU-104 FPGAs.',
                metric: 'RES-VSSC-2025-015 • 99.7%+ Acc',
                href: 'projects.html?cat=fpga-ai',
                nx: 0.25, ny: 0.72, nw: 0.30, nh: 0.28
            },
            {
                id: 'SEC_UAV',
                title: 'ArmourTrack & D_One UAV',
                desc: "1st Runner Up (484 participants) at IEEE CRAFTHON 2026 + SIH 2026 Top 10 Trishuli + D_One UAV showcased to Hon'ble Governor of TN.",
                metric: 'RSA/SHA-256 • MAVLink SWARM',
                href: 'projects.html?cat=defence-uavs',
                nx: 0.72, ny: 0.72, nw: 0.32, nh: 0.28
            }
        ];

        let dieTheme = getTheme();
        let activeIdx = 1;
        let pulseX = MACRO_BLOCKS[1].nx;
        let pulseY = MACRO_BLOCKS[1].ny;
        let targetX = pulseX;
        let targetY = pulseY;
        let autoRoute = !prefersReducedMotion;
        let autoTimer = 0;
        const keys = {};
        const trail = [];

        function updatePanel(idx) {
            const b = MACRO_BLOCKS[idx];
            if (!b) return;
            activeIdx = idx;
            if (tagEl) tagEl.textContent = b.id;
            if (titleEl) titleEl.textContent = b.title;
            if (descEl) descEl.textContent = b.desc;
            if (metricEl) metricEl.textContent = b.metric;
            if (linkEl) linkEl.href = b.href;
            jumpBtns.forEach((btn, i) => {
                btn.classList.toggle('active', i === idx);
            });
        }

        function setAutoRoute(enabled) {
            autoRoute = enabled;
            if (autoBtn) {
                autoBtn.setAttribute('aria-pressed', String(enabled));
                const span = autoBtn.querySelector('span');
                if (span) span.textContent = enabled ? 'Auto-Route: ON' : 'Auto-Route: OFF';
            }
        }

        function jumpToBlock(idx, disableAuto = false) {
            const b = MACRO_BLOCKS[idx];
            if (!b) return;
            targetX = b.nx;
            targetY = b.ny;
            updatePanel(idx);
            if (disableAuto) setAutoRoute(false);
        }

        function drawDie() {
            const dpr = window.devicePixelRatio || 1;
            const rect = dieCanvas.getBoundingClientRect();
            if (rect.width < 10) return;
            dieCanvas.width = Math.floor(rect.width * dpr);
            dieCanvas.height = Math.floor(rect.height * dpr);
            dctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const w = rect.width;
            const h = rect.height;
            const dark = dieTheme === 'dark';

            const accent = dark ? '#22c55e' : '#0369a1';
            const accentSoft = dark ? 'rgba(34, 197, 94, 0.16)' : 'rgba(3, 105, 161, 0.12)';
            const gridCol = dark ? 'rgba(34, 197, 94, 0.08)' : 'rgba(100, 116, 139, 0.12)';
            const busCol = dark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.16)';
            const textCol = dark ? '#ffffff' : '#020617';
            const subCol = dark ? '#9ca3af' : '#475569';
            const boxBg = dark ? 'rgba(7, 13, 9, 0.92)' : 'rgba(255, 255, 255, 0.94)';

            dctx.clearRect(0, 0, w, h);

            const pad = 16;
            dctx.strokeStyle = dark ? 'rgba(34, 197, 94, 0.35)' : 'rgba(3, 105, 161, 0.35)';
            dctx.lineWidth = 1.5;
            dctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

            for (let gx = pad + 36; gx < w - pad; gx += 36) {
                dctx.beginPath();
                dctx.moveTo(gx, pad);
                dctx.lineTo(gx, h - pad);
                dctx.strokeStyle = gridCol;
                dctx.lineWidth = 1;
                dctx.stroke();
            }
            for (let gy = pad + 36; gy < h - pad; gy += 36) {
                dctx.beginPath();
                dctx.moveTo(pad, gy);
                dctx.lineTo(w - pad, gy);
                dctx.strokeStyle = gridCol;
                dctx.lineWidth = 1;
                dctx.stroke();
            }

            dctx.strokeStyle = busCol;
            dctx.lineWidth = 2;
            const c0 = MACRO_BLOCKS[0], c1 = MACRO_BLOCKS[1], c2 = MACRO_BLOCKS[2], c3 = MACRO_BLOCKS[3];
            [
                [c0.nx * w, c0.ny * h, c1.nx * w, c1.ny * h],
                [c2.nx * w, c2.ny * h, c3.nx * w, c3.ny * h],
                [c0.nx * w, c0.ny * h, c2.nx * w, c2.ny * h],
                [c1.nx * w, c1.ny * h, c3.nx * w, c3.ny * h]
            ].forEach(([x1, y1, x2, y2]) => {
                dctx.beginPath();
                dctx.moveTo(x1, y1);
                dctx.lineTo(x2, y2);
                dctx.stroke();
            });

            MACRO_BLOCKS.forEach((b, i) => {
                const bw = b.nw * w;
                const bh = b.nh * h;
                const bx = b.nx * w - bw / 2;
                const by = b.ny * h - bh / 2;
                const isActive = i === activeIdx;

                dctx.fillStyle = isActive ? accentSoft : boxBg;
                dctx.strokeStyle = isActive ? accent : (dark ? '#223f2c' : '#94a3b8');
                dctx.lineWidth = isActive ? 2 : 1.2;

                dctx.beginPath();
                dctx.roundRect(bx, by, bw, bh, 8);
                dctx.fill();
                dctx.stroke();

                dctx.fillStyle = isActive ? accent : subCol;
                dctx.font = '700 11px "JetBrains Mono", monospace';
                dctx.fillText(b.id, bx + 10, by + 20);

                dctx.fillStyle = textCol;
                dctx.font = '600 12px "Inter", sans-serif';
                const shortTitle = b.title.length > 22 ? b.title.slice(0, 21) + '…' : b.title;
                dctx.fillText(shortTitle, bx + 10, by + 39);

                dctx.fillStyle = subCol;
                dctx.font = '500 10px "JetBrains Mono", monospace';
                dctx.fillText(b.metric.split('•')[0].trim(), bx + 10, by + bh - 12);
            });

            for (let t = 0; t < trail.length; t++) {
                const pt = trail[t];
                const alpha = (t + 1) / trail.length;
                dctx.beginPath();
                dctx.arc(pt.x * w, pt.y * h, 3 + alpha * 2.5, 0, Math.PI * 2);
                dctx.fillStyle = dark ? `rgba(74, 222, 128, ${alpha * 0.45})` : `rgba(3, 105, 161, ${alpha * 0.35})`;
                dctx.fill();
            }

            const px = pulseX * w;
            const py = pulseY * h;
            dctx.beginPath();
            dctx.arc(px, py, 10, 0, Math.PI * 2);
            dctx.fillStyle = dark ? 'rgba(34, 197, 94, 0.25)' : 'rgba(3, 105, 161, 0.22)';
            dctx.fill();

            dctx.beginPath();
            dctx.arc(px, py, 5, 0, Math.PI * 2);
            dctx.fillStyle = accent;
            dctx.fill();
            dctx.lineWidth = 1.5;
            dctx.strokeStyle = '#ffffff';
            dctx.stroke();

            if (coordEl) {
                coordEl.textContent = `X: ${Math.round(pulseX * 1000)} µm • Y: ${Math.round(pulseY * 1000)} µm`;
            }
        }

        function stepDie() {
            let manual = false;
            if (keys['ArrowUp'] || keys['w'] || keys['W']) { targetY = Math.max(0.12, pulseY - 0.04); manual = true; }
            if (keys['ArrowDown'] || keys['s'] || keys['S']) { targetY = Math.min(0.88, pulseY + 0.04); manual = true; }
            if (keys['ArrowLeft'] || keys['a'] || keys['A']) { targetX = Math.max(0.10, pulseX - 0.04); manual = true; }
            if (keys['ArrowRight'] || keys['d'] || keys['D']) { targetX = Math.min(0.90, pulseX + 0.04); manual = true; }
            if (manual && autoRoute) setAutoRoute(false);

            if (autoRoute) {
                autoTimer++;
                if (autoTimer > 210) {
                    autoTimer = 0;
                    jumpToBlock((activeIdx + 1) % MACRO_BLOCKS.length, false);
                }
            }

            pulseX += (targetX - pulseX) * 0.09;
            pulseY += (targetY - pulseY) * 0.09;

            trail.push({ x: pulseX, y: pulseY });
            if (trail.length > 14) trail.shift();

            MACRO_BLOCKS.forEach((b, i) => {
                if (Math.abs(pulseX - b.nx) <= b.nw / 2 && Math.abs(pulseY - b.ny) <= b.nh / 2) {
                    if (activeIdx !== i) updatePanel(i);
                }
            });

            drawDie();
            if (!prefersReducedMotion) requestAnimationFrame(stepDie);
        }

        window.dieExplorer = {
            setTheme(theme) {
                dieTheme = theme;
                drawDie();
            }
        };

        dieCanvas.addEventListener('click', (e) => {
            const rect = dieCanvas.getBoundingClientRect();
            const nx = (e.clientX - rect.left) / rect.width;
            const ny = (e.clientY - rect.top) / rect.height;
            setAutoRoute(false);
            targetX = Math.min(0.92, Math.max(0.08, nx));
            targetY = Math.min(0.90, Math.max(0.10, ny));
            MACRO_BLOCKS.forEach((b, i) => {
                if (Math.abs(nx - b.nx) <= b.nw / 2 && Math.abs(ny - b.ny) <= b.nh / 2) {
                    updatePanel(i);
                }
            });
            if (prefersReducedMotion) {
                pulseX = targetX;
                pulseY = targetY;
                drawDie();
            }
        });

        dieCanvas.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
            if (e.key === 'Enter' && linkEl) {
                window.location.href = linkEl.href;
                return;
            }
            keys[e.key] = true;
        });
        window.addEventListener('keyup', (e) => { keys[e.key] = false; });

        if (autoBtn) {
            autoBtn.addEventListener('click', () => setAutoRoute(!autoRoute));
        }

        jumpBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                const idx = Number(btn.getAttribute('data-die-jump'));
                jumpToBlock(idx, true);
                if (prefersReducedMotion) {
                    pulseX = targetX;
                    pulseY = targetY;
                    drawDie();
                }
            });
        });

        window.addEventListener('resize', drawDie);
        updatePanel(1);
        drawDie();
        if (!prefersReducedMotion) requestAnimationFrame(stepDie);
    }
});
