// ============================================================
// NAVYA FINTECH — Main Application JavaScript
// ============================================================

// --- 1. LOADING SCREEN ---
window.addEventListener('load', () => {
    const loader = document.getElementById('loadingScreen');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('hidden');
            // Trigger initial reveals after loading screen fades
            setTimeout(() => {
                initScrollReveals();
                runCounters();
            }, 300);
        }, 2000);
    }
});

// --- 2. SCROLL REVEAL (IntersectionObserver) ---
function initScrollReveals() {
    const reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach(el => observer.observe(el));
}

// Reveal elements on the active page immediately
function revealActivePage() {
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;
    const reveals = activePage.querySelectorAll('.reveal');
    reveals.forEach(el => {
        el.classList.remove('revealed');
        // Force reflow
        void el.offsetWidth;
    });
    // Re-observe
    setTimeout(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
        reveals.forEach(el => observer.observe(el));
    }, 50);
}

// --- 3. NUMBER COUNTERS ---
const runCounters = () => {
    const counters = document.querySelectorAll('.page.active .counter');
    counters.forEach(counter => {
        const target = parseFloat(counter.getAttribute('data-target')) || 0;
        const isFloat = target % 1 !== 0;
        const duration = 2200;
        const startTime = performance.now();
        counter.innerText = "0";

        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentVal = eased * target;

            counter.innerText = isFloat ? currentVal.toFixed(1) : Math.floor(currentVal).toLocaleString('en-IN');

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                counter.innerText = isFloat ? target.toFixed(1) : target.toLocaleString('en-IN');
            }
        };
        requestAnimationFrame(updateCounter);
    });
};

// --- 4. SPA ROUTER ---
const transitionSwipe = document.querySelector('.transition-swipe');

function navigateToPage(targetId) {
    const currentActive = document.querySelector('.page.active');
    const targetPage = document.getElementById(targetId);

    if (!targetPage || currentActive === targetPage) return;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active-link'));
    const linkedNav = document.querySelector(`.nav-item[data-target="${targetId}"]`);
    if (linkedNav) linkedNav.classList.add('active-link');

    // Close mobile menu
    document.getElementById('navLinks')?.classList.remove('active');

    if (typeof gsap !== "undefined") {
        const tl = gsap.timeline();
        tl.to(transitionSwipe, { left: "0%", duration: 0.45, ease: "power4.inOut" })
          .add(() => {
              currentActive.classList.remove('active');
              targetPage.classList.add('active');
              window.scrollTo(0, 0);
              if (targetId === 'home-page') runCounters();
          })
          .to(transitionSwipe, { left: "100%", duration: 0.45, ease: "power4.inOut" })
          .add(() => {
              gsap.set(transitionSwipe, { left: "-100%" });
              revealActivePage();
              if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
          });
    } else {
        currentActive.classList.remove('active');
        targetPage.classList.add('active');
        window.scrollTo(0, 0);
        if (targetId === 'home-page') runCounters();
        revealActivePage();
    }
}

// Attach nav click handlers
document.querySelectorAll('.nav-item, .nav-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute('data-target');
        if (targetId) navigateToPage(targetId);
    });
});

// --- 5. NAVBAR SCROLL EFFECT ---
let lastScroll = 0;
const mainNav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
    const current = window.scrollY;
    if (current > 50) {
        mainNav?.classList.add('scrolled');
    } else {
        mainNav?.classList.remove('scrolled');
    }
    lastScroll = current;
}, { passive: true });

// --- 6. ECOSYSTEM TAB FILTERS ---
const filterBtns = document.querySelectorAll('.filter-btn');
const serviceCards = document.querySelectorAll('.service-card');

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filterValue = btn.getAttribute('data-filter');

        serviceCards.forEach(card => {
            if (filterValue === 'all' || card.getAttribute('data-category') === filterValue) {
                card.classList.remove('hide-service');
                if (typeof gsap !== "undefined") {
                    gsap.fromTo(card, { opacity: 0, scale: 0.85, y: 20 },
                        { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "back.out(1.5)" });
                } else {
                    card.style.opacity = 1;
                }
            } else {
                card.classList.add('hide-service');
            }
        });
        if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
    });
});

// --- 7. ACCORDION FORM LOGIC ---
const formCatCards = document.querySelectorAll('.form-cat-card');
const formSubPanels = document.querySelectorAll('.form-sub-panel');
const hiddenCategoryInput = document.getElementById('selectedCategory');
const hiddenServiceInput = document.getElementById('selectedService');

formCatCards.forEach(card => {
    card.addEventListener('click', () => {
        formCatCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        const category = card.getAttribute('data-category');
        if (hiddenCategoryInput) hiddenCategoryInput.value = category;
        if (hiddenServiceInput) hiddenServiceInput.value = "";

        formSubPanels.forEach(panel => {
            panel.classList.remove('open');
            panel.querySelectorAll('.sub-pill').forEach(pill => pill.classList.remove('active'));
        });

        const activePanel = document.getElementById(`panel-${category}`);
        if (activePanel) activePanel.classList.add('open');
    });
});

document.querySelectorAll('.sub-pill').forEach(pill => {
    pill.addEventListener('click', function() {
        const parentPanel = this.closest('.form-sub-panel');
        parentPanel.querySelectorAll('.sub-pill').forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        if (hiddenServiceInput) hiddenServiceInput.value = this.getAttribute('data-value');
    });
});

// --- 8. SERVICE DATA & MODAL ---
const serviceData = {
    home_loan: { icon: "fa-home", title: "Home Loan Details", desc: "Purchase your dream home with zero-prepayment penalty structures.", rate: "8.35%", tenure: "30 Yrs", funding: "90%", speed: "3-5 Days", eligibility: ["Age between 21 to 65 years.", "Salaried or Self-Employed status.", "CIBIL Score of 650+.", "Monthly stable income > ₹25,000."], docs: ["Aadhar & PAN Card.", "Last 6 months Bank Statements.", "Salary Slips (3 months) or ITR returns.", "Property Documents."] },
    personal_loan: { icon: "fa-user-tie", title: "Personal Capital", desc: "Unsecured instant capital for medical emergencies, travel, or weddings without collateral constraints.", rate: "10.5%", tenure: "5 Yrs", funding: "₹20L", speed: "24 Hrs", eligibility: ["Age between 21 to 58 years.", "Employed continuously for 1+ year.", "CIBIL Score of 700+."], docs: ["KYC Identification documents.", "Last 3 months Salary Slips.", "Last 6 months Bank Statements."] },
    car_loan: { icon: "fa-car", title: "Vehicle Financing", desc: "Drive home your dream car immediately with custom tailormade up-to 100% on-road funding setups.", rate: "8.75%", tenure: "7 Yrs", funding: "100%", speed: "48 Hrs", eligibility: ["Age between 21 to 60 years.", "Valid Government Driving License.", "Minimum 1 year job profile stability."], docs: ["Proforma Invoice from Dealership.", "KYC Documents.", "Income Proof docs."] },
    business_loan: { icon: "fa-briefcase", title: "MSME Business Scaling", desc: "Scale your inventory or expand operational workspaces with unsecured capital loans.", rate: "11.25%", tenure: "4 Yrs", funding: "₹50L", speed: "48 Hrs", eligibility: ["Business active for 2+ years.", "Annual Verified Turnover > ₹40 Lakhs.", "Profit stability for last 12 months."], docs: ["GST Registration certificate.", "12 months Bank Statements.", "2 years Audited Financial books."] },
    tractor_loan: { icon: "fa-tractor", title: "Agri-Equip Finance", desc: "Empowering rural agricultural growth with custom EMIs mapped directly to crop harvesting seasons.", rate: "Subsidized", tenure: "5 Yrs", funding: "85%", speed: "3 Days", eligibility: ["Minimum 3 Acres land in applicant's name.", "Clear previous bank records."], docs: ["Land Holding Proof (7/12 records).", "Equipment Commercial Quotation.", "6 months Bank Statements."] },
    tax_services: { icon: "fa-file-invoice-dollar", title: "Corporate & Personal Tax", desc: "Certified Chartered Accountants to handle corporate GST filings, income audits, and swift PF handling.", rate: "Fixed Fee", tenure: "Annual", funding: "Max Tax", speed: "Same Day", eligibility: ["Salaried profiles seeking refunds.", "Freelancers & Contractors.", "Registered MSMEs."], docs: ["Form 16 / corporate statements.", "Investment declaration certificates.", "Previous accounting records."] },
    life_insurance: { icon: "fa-heartbeat", title: "Term Life Insurance", desc: "Secure your family's financial future with high-cover, low-premium term life policies.", rate: "Custom", tenure: "Up to 85 Yrs", funding: "₹1Cr+", speed: "24 Hrs", eligibility: ["Age 18 to 65 years.", "Medical history declaration required.", "Smokers and Non-Smokers accepted."], docs: ["Aadhar & PAN.", "Last 3 months Salary Slips / ITR.", "Recent Medical Reports (if applicable)."] },
    health_insurance: { icon: "fa-notes-medical", title: "Health & Mediclaim", desc: "Comprehensive cashless hospital networks for you and your entire family.", rate: "Premium Based", tenure: "Yearly Renewal", funding: "Cashless", speed: "Instant", eligibility: ["Individual or Family Floater Options.", "No prior severe illness (wait periods apply).", "Age 18+ (dependents included)."], docs: ["Aadhar Card.", "Age Proof.", "Basic Health Declaration Form."] },
    motor_insurance: { icon: "fa-car-crash", title: "Motor & Zero-Dep Cover", desc: "Safeguard your commercial and personal vehicles against accidents, theft, and third-party liabilities instantly.", rate: "IDV Based", tenure: "1 to 3 Yrs", funding: "Up to 100% IDV", speed: "5 Mins", eligibility: ["Valid RC Book.", "Previous Policy Copy (if renewing).", "Vehicle Inspection (if lapsed)."], docs: ["Vehicle RC Copy.", "Aadhar Card.", "Previous Year Policy Document."] },
    legal_ids: { icon: "fa-id-card", title: "PAN & Licence Services", desc: "Bypass the endless queues. Let our experts handle your government identification processing.", rate: "Flat Fee", tenure: "Govt Timelines", funding: "N/A", speed: "Fast-Track", eligibility: ["Indian Citizenship.", "Minimum Age 18 (for License).", "Valid Proof of Address."], docs: ["Aadhar Card (Linked to mobile).", "Passport Size Photos.", "School Leaving Certificate / Birth Proof."] }
};

const modalOverlay = document.getElementById('serviceModal');
const modalBody = document.getElementById('modal-body');

window.openModal = function(serviceKey) {
    const data = serviceData[serviceKey];
    if (!data) return;
    modalBody.innerHTML = `
        <div class="text-center mb-4">
            <i class="fas ${data.icon} fa-3x gradient-text mb-3" style="display:inline-block;"></i>
            <h2>${data.title}</h2>
            <p class="text-muted mt-2">${data.desc}</p>
        </div>
        <div class="glass-container p-3 mb-4">
            <div class="modal-stats-grid">
                <div class="text-center"><h5>Rate</h5><span class="gradient-text">${data.rate}</span></div>
                <div class="text-center"><h5>Tenure</h5><span class="gradient-text">${data.tenure}</span></div>
                <div class="text-center"><h5>Limit</h5><span class="gradient-text">${data.funding}</span></div>
                <div class="text-center"><h5>Speed</h5><span class="gradient-text">${data.speed}</span></div>
            </div>
        </div>
        <div class="split-layout" style="gap: 20px;">
            <div class="glass-container p-4">
                <h4 class="mb-2"><i class="fas fa-check-circle text-gradient"></i> Eligibility Criteria</h4>
                <ul class="modal-list">${data.eligibility.map(e => `<li><i class="fas fa-angle-right"></i> ${e}</li>`).join('')}</ul>
            </div>
            <div class="glass-container p-4">
                <h4 class="mb-2"><i class="fas fa-file-alt text-gradient"></i> Required Documents</h4>
                <ul class="modal-list">${data.docs.map(d => `<li><i class="fas fa-angle-right"></i> ${d}</li>`).join('')}</ul>
            </div>
        </div>
        <button class="btn primary-btn w-100 mt-4" onclick="closeModalAndApply()"><i class="fas fa-rocket"></i> Start Application</button>
    `;
    modalOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
};

window.closeModal = function() {
    modalOverlay.classList.remove('show');
    document.body.style.overflow = '';
};
window.closeModalAndApply = function() {
    closeModal();
    navigateToPage('apply-page');
};
modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});
// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// --- 9. FAQ ACCORDION ---
window.toggleFaq = function(element) {
    document.querySelectorAll('.faq-item').forEach(item => {
        if (item !== element) item.classList.remove('open');
    });
    element.classList.toggle('open');
};

// --- 10. THREE.JS PARTICLE NETWORK ---
const initThreeJS = () => {
    if (typeof THREE === "undefined") return;

    const container = document.getElementById('three-canvas-container');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 250;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for perf
    container.appendChild(renderer.domElement);

    // Reduce particles on mobile
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 80 : 180;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 600;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 600;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
        velocities.push({
            x: (Math.random() - 0.5) * 0.25,
            y: (Math.random() - 0.5) * 0.25,
            z: (Math.random() - 0.5) * 0.25
        });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: 0x00f2fe, size: isMobile ? 2 : 2.5,
        transparent: true, opacity: 0.5
    });
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x4facfe, transparent: true, opacity: 0.08
    });

    // Throttled mouse
    let mouse = { x: 0, y: 0 };
    let mouseMoveThrottle = false;
    window.addEventListener('mousemove', (e) => {
        if (mouseMoveThrottle) return;
        mouseMoveThrottle = true;
        requestAnimationFrame(() => {
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            mouseMoveThrottle = false;
        });
    }, { passive: true });

    let oldLines = null;
    const connectionDist = isMobile ? 50 : 55;

    function animate() {
        requestAnimationFrame(animate);
        const posArr = geometry.getAttribute('position').array;
        const linePositions = [];

        for (let i = 0; i < particleCount; i++) {
            posArr[i * 3] += velocities[i].x;
            posArr[i * 3 + 1] += velocities[i].y;
            posArr[i * 3 + 2] += velocities[i].z;

            if (Math.abs(posArr[i * 3]) > 300) velocities[i].x *= -1;
            if (Math.abs(posArr[i * 3 + 1]) > 300) velocities[i].y *= -1;
            if (Math.abs(posArr[i * 3 + 2]) > 200) velocities[i].z *= -1;

            for (let j = i + 1; j < particleCount; j++) {
                const dx = posArr[i * 3] - posArr[j * 3];
                const dy = posArr[i * 3 + 1] - posArr[j * 3 + 1];
                const dz = posArr[i * 3 + 2] - posArr[j * 3 + 2];
                const dist = dx * dx + dy * dy + dz * dz;
                if (dist < connectionDist * connectionDist) {
                    linePositions.push(
                        posArr[i * 3], posArr[i * 3 + 1], posArr[i * 3 + 2],
                        posArr[j * 3], posArr[j * 3 + 1], posArr[j * 3 + 2]
                    );
                }
            }
        }
        geometry.getAttribute('position').needsUpdate = true;

        if (oldLines) { scene.remove(oldLines); oldLines.geometry.dispose(); }
        const linesGeo = new THREE.BufferGeometry();
        linesGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        oldLines = new THREE.LineSegments(linesGeo, lineMaterial);
        scene.add(oldLines);

        camera.position.x += (mouse.x * 50 - camera.position.x) * 0.03;
        camera.position.y += (mouse.y * 50 - camera.position.y) * 0.03;
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });
};
initThreeJS();

// --- 11. DYNAMIC AD FETCHING ---
let adSwiperInstance = null;

async function loadDynamicAds() {
    try {
        const response = await fetch('/api/ads');
        if (!response.ok) throw new Error('Failed to fetch ads');
        const ads = await response.json();
        const adWrapper = document.getElementById('dynamicAdsWrapper');
        const adContainer = document.getElementById('dynamicAdsContainer');

        if (adWrapper && adContainer && ads.length > 0) {
            adWrapper.style.display = 'block';
            adContainer.innerHTML = '';

            ads.forEach(ad => {
                const mediaElement = ad.mediaType === 'video'
                    ? `<video src="${ad.mediaUrl}" autoplay loop muted playsinline></video>`
                    : `<img src="${ad.mediaUrl}" alt="${ad.title}">`;

                const slide = document.createElement('div');
                slide.className = 'swiper-slide';
                slide.innerHTML = `
                    <div class="ad-slide-card">
                        ${mediaElement}
                        <div class="ad-slide-overlay">
                            <h4>${ad.title}</h4>
                        </div>
                    </div>
                `;
                adContainer.appendChild(slide);
            });

            // Destroy old instance if exists
            if (adSwiperInstance) {
                adSwiperInstance.destroy(true, true);
                adSwiperInstance = null;
            }

            // Wait for DOM to update before initializing Swiper
            requestAnimationFrame(() => {
                if (typeof Swiper !== "undefined") {
                    adSwiperInstance = new Swiper(".adSwiper", {
                        slidesPerView: 1, spaceBetween: 20,
                        loop: ads.length > 1,
                        autoplay: { delay: 4000, disableOnInteraction: false },
                        pagination: { el: ".adSwiper .swiper-pagination", clickable: true },
                        breakpoints: {
                            768: { slidesPerView: 2 },
                            1024: { slidesPerView: 3 }
                        }
                    });
                }
            });
        } else if (adWrapper) {
            adWrapper.style.display = 'none';
        }
    } catch (error) {
        console.warn("Ad system offline or unavailable:", error.message);
    }
}

// Auto-refresh ads every 30 seconds
setInterval(loadDynamicAds, 30000);

// --- 12. MAGNETIC BUTTONS ---
document.querySelectorAll('.magnetic-btn').forEach(btn => {
    btn.addEventListener('mousemove', function(e) {
        const pos = btn.getBoundingClientRect();
        const x = e.clientX - pos.left - pos.width / 2;
        const y = e.clientY - pos.top - pos.height / 2;
        btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
    });
    btn.addEventListener('mouseout', function() {
        btn.style.transform = 'translate(0px, 0px)';
    });
});

// --- 13. VANILLA TILT ---
if (typeof VanillaTilt !== "undefined") {
    VanillaTilt.init(document.querySelectorAll("[data-tilt]"), {
        max: 6, speed: 400, glare: true, "max-glare": 0.08
    });
}

// --- 14. TESTIMONIAL SWIPER ---
if (typeof Swiper !== "undefined") {
    new Swiper(".mySwiper", {
        effect: "coverflow", grabCursor: true,
        centeredSlides: true, slidesPerView: "auto", loop: true,
        coverflowEffect: { rotate: 15, stretch: 0, depth: 250, modifier: 1, slideShadows: false },
        pagination: { el: ".mySwiper .swiper-pagination", clickable: true },
        autoplay: { delay: 3500, disableOnInteraction: false }
    });
}

// --- 15. EMI CALCULATOR ---
window.calculateEMI = function() {
    const p = parseFloat(document.getElementById('amount').value);
    const r = parseFloat(document.getElementById('rate').value);
    const n = parseFloat(document.getElementById('months').value);
    const resultEl = document.getElementById('emi-result');
    if (!p || !r || !n || p <= 0 || r <= 0 || n <= 0) {
        if (resultEl) resultEl.innerText = '₹ 0.00';
        return;
    }
    const monthlyRate = r / 12 / 100;
    const emi = (p * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
    if (resultEl) {
        resultEl.innerText = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(emi);
    }
};

// --- 16. FORM SUBMISSION ---
document.getElementById('applyForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const statusMsg = document.getElementById('formStatus');

    if (!hiddenCategoryInput?.value || !hiddenServiceInput?.value) {
        if (statusMsg) {
            statusMsg.style.color = "#ef4444";
            statusMsg.innerText = "Please choose a Business segment and its specific option.";
        }
        return;
    }

    if (submitBtn) submitBtn.innerText = "Encrypting & Sending...";

    const payload = {
        name: e.target.name.value,
        phone: e.target.phone.value,
        category: hiddenCategoryInput.value,
        service: hiddenServiceInput.value
    };

    try {
        const response = await fetch('/api/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            if (statusMsg) {
                statusMsg.style.color = "var(--gradient-1)";
                statusMsg.innerText = "Application secured and submitted successfully!";
            }
            showToast('Application submitted successfully!', 'success');
            e.target.reset();
            formCatCards.forEach(c => c.classList.remove('active'));
            formSubPanels.forEach(p => p.classList.remove('open'));
            if (hiddenCategoryInput) hiddenCategoryInput.value = "";
            if (hiddenServiceInput) hiddenServiceInput.value = "";
        } else throw new Error();
    } catch (error) {
        if (statusMsg) {
            statusMsg.style.color = "#ef4444";
            statusMsg.innerText = "Transmission error. Please retry or call us directly.";
        }
        showToast('Submission failed. Please try again.', 'error');
    } finally {
        if (submitBtn) submitBtn.innerText = "Submit Encrypted Request";
    }
});

// --- 17. MOBILE MENU ---
const mobileMenu = document.getElementById('mobile-menu');
const navLinksEl = document.getElementById('navLinks');

mobileMenu?.addEventListener('click', () => {
    navLinksEl?.classList.toggle('active');
    const icon = mobileMenu.querySelector('i');
    if (icon) {
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
    }
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (navLinksEl?.classList.contains('active') &&
        !navLinksEl.contains(e.target) &&
        !mobileMenu?.contains(e.target)) {
        navLinksEl.classList.remove('active');
        const icon = mobileMenu?.querySelector('i');
        if (icon) { icon.classList.add('fa-bars'); icon.classList.remove('fa-times'); }
    }
});

// Close mobile menu when a nav link is clicked
navLinksEl?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navLinksEl.classList.remove('active');
        const icon = mobileMenu?.querySelector('i');
        if (icon) { icon.classList.add('fa-bars'); icon.classList.remove('fa-times'); }
    });
});

// --- 18. THEME TOGGLE (with localStorage persistence) ---
const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('navya-theme');
if (savedTheme) {
    document.body.dataset.theme = savedTheme;
    updateThemeIcon(savedTheme);
}

themeToggle?.addEventListener('click', () => {
    const current = document.body.dataset.theme;
    const next = current === 'light' ? 'dark' : 'light';
    document.body.dataset.theme = next;
    localStorage.setItem('navya-theme', next);
    updateThemeIcon(next);
});

function updateThemeIcon(theme) {
    const icon = themeToggle?.querySelector('i');
    if (!icon) return;
    if (theme === 'light') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

// --- 19. TOAST NOTIFICATION SYSTEM ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// --- 20. INIT ON DOM READY ---
document.addEventListener('DOMContentLoaded', () => {
    loadDynamicAds();
    // Ensure initial page reveals
    setTimeout(initScrollReveals, 100);
});