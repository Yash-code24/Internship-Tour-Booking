
(function () {
    'use strict';

    /* -------- Loader -------- */
    window.addEventListener('load', function () {
        const loader = document.getElementById('loader');
        if (loader) {
            setTimeout(() => loader.classList.add('hidden'), 350);
        }
    });

    /* -------- Mobile Nav Toggle -------- */
    const toggle = document.getElementById('navToggle');
    const mobile = document.getElementById('navMobile');
    const toggleIcon = toggle ? toggle.querySelector('i') : null;

    // Keep the drawer outside the backdrop-filtered header. A fixed element
    // inside a backdrop-filtered ancestor can otherwise be positioned relative
    // to that ancestor instead of the viewport, which clips the menu.
    if (mobile && mobile.parentElement !== document.body) {
        document.body.appendChild(mobile);
    }

    if (toggle && mobile) {
        toggle.addEventListener('click', function () {
            const open = mobile.classList.toggle('open');
            document.body.style.overflow = open ? 'hidden' : '';
            if (toggleIcon) toggleIcon.className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
        });
        // Close on link click
        mobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
            mobile.classList.remove('open');
            document.body.style.overflow = '';
            if (toggleIcon) toggleIcon.className = 'fa-solid fa-bars';
        }));
    }

    /* -------- FAQ Accordion -------- */
    document.querySelectorAll('.faq__item').forEach(item => {
        const q = item.querySelector('.faq__q');
        if (!q) return;
        q.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');
            item.parentElement.querySelectorAll('.faq__item').forEach(i => i.classList.remove('open'));
            if (!isOpen) item.classList.add('open');
        });
    });

    /* -------- Toast System -------- */
    function ensureToastWrap() {
        let wrap = document.getElementById('toastWrap');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.id = 'toastWrap';
            wrap.className = 'toast-wrap';
            document.body.appendChild(wrap);
        }
        return wrap;
    }

    window.showToast = function (message, type = 'info') {
        const wrap = ensureToastWrap();
        const icons = {
            success: 'fa-solid fa-circle-check',
            error: 'fa-solid fa-circle-exclamation',
            info: 'fa-solid fa-circle-info',
            warning: 'fa-solid fa-triangle-exclamation'
        };
        const t = document.createElement('div');
        t.className = `toast toast--${type}`;
        t.innerHTML = `<i class=\"${icons[type] || icons.info}\"></i><div class=\"toast__body\">${message}</div>`;
        wrap.appendChild(t);
        requestAnimationFrame(() => t.classList.add('show'));
        setTimeout(() => {
            t.classList.remove('show');
            setTimeout(() => t.remove(), 320);
        }, 3500);
    };

    /* -------- Form Handlers -------- */
    document.querySelectorAll('form[data-form]').forEach(form => {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            const kind = form.getAttribute('data-form');
            const data = Object.fromEntries(new FormData(form).entries());

            const endpoints = {
                login: '/api/login',
                register: '/api/register',
                'admin-login': '/api/admin/login',
                booking: '/api/bookings',
                contact: '/api/contact'
            };

            if (!endpoints[kind]) {
                const messages = {
                    profile: 'Profile backend will be connected next.',
                    search: 'Searching... (backend will be connected next)'
                };
                window.showToast(messages[kind] || 'Form submitted.', 'info');
                return;
            }

            try {
                const response = await fetch(endpoints[kind], {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Something went wrong.');
                }
                window.showToast(result.message, 'success');
                if (kind === 'register') {
                    form.reset();
                    setTimeout(() => { window.location.href = 'login.html'; }, 700);
                } else if (kind === 'booking' || kind === 'contact') {
                    form.reset();
                } else if (result.redirect) {
                    setTimeout(() => { window.location.href = result.redirect; }, 700);
                }
            } catch (error) {
                window.showToast(error.message || 'Unable to connect to the server.', 'error');
            }
        });
    });

    /* -------- Scroll reveal (light) -------- */
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-up');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
    }

    /* -------- Set active nav link based on filename -------- */
    const currentFile = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('.nav__menu a, .nav__mobile a').forEach(a => {
        const href = (a.getAttribute('href') || '').split('/').pop().toLowerCase();
        if (href === currentFile) a.classList.add('active');
    });

    /* -------- Header components inject (optional pattern) -------- */
    // If a page includes <div data-include=\"header\"></div>, we could fetch; but static includes are fine.
})();
