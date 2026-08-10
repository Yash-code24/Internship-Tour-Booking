
(function () {
    'use strict';

    function prefix(level) {
        return ['', '../', '../../'][Number(level) || 0];
    }

    function headerHTML(level) {
        const p = prefix(level);
        return `
<header class=\"header\">
    <div class=\"container\">
        <nav class=\"nav\" aria-label=\"Primary\">
            <a href=\"${p}index.html\" class=\"nav__brand\"><i class=\"fa-solid fa-plane-departure\"></i> Voyagio</a>
            <div class=\"nav__menu\">
                <a href=\"${p}index.html\">Home</a>
                <a href=\"${p}pages/about.html\">About</a>
                <a href=\"${p}pages/tour-packages.html\">Tour Packages</a>
                <a href=\"${p}pages/contact.html\">Contact</a>
            </div>
            <div class=\"nav__actions\">
                <a href=\"${p}pages/login.html\" class=\"btn btn--ghost btn--sm\">Login</a>
                <a href=\"${p}pages/register.html\" class=\"btn btn--primary btn--sm\">Sign Up</a>
                <button class=\"nav__toggle\" id=\"navToggle\" aria-label=\"Menu\"><i class=\"fa-solid fa-bars\"></i></button>
            </div>
        </nav>
    </div>
    <div class=\"nav__mobile\" id=\"navMobile\">
        <a href=\"${p}index.html\">Home</a>
        <a href=\"${p}pages/about.html\">About</a>
        <a href=\"${p}pages/tour-packages.html\">Tour Packages</a>
        <a href=\"${p}pages/contact.html\">Contact</a>
        <a href=\"${p}pages/login.html\">Login</a>
        <a href=\"${p}pages/register.html\">Sign Up</a>
    </div>
</header>`;
    }

    function footerHTML(level) {
        const p = prefix(level);
        return `
<footer class=\"footer\">
    <div class=\"container\">
        <div class=\"footer__grid\">
            <div>
                <a href=\"${p}index.html\" class=\"footer__brand\"><i class=\"fa-solid fa-plane-departure\"></i> Voyagio</a>
                <p class=\"footer__desc\">Discover handpicked tour-packages and curated tour packages around the world. Travel confidently with Voyagio.</p>
                <div class=\"footer__socials\">
                    <a href=\"#\" aria-label=\"Facebook\"><i class=\"fa-brands fa-facebook-f\"></i></a>
                    <a href=\"#\" aria-label=\"Instagram\"><i class=\"fa-brands fa-instagram\"></i></a>
                    <a href=\"#\" aria-label=\"Twitter\"><i class=\"fa-brands fa-x-twitter\"></i></a>
                    <a href=\"#\" aria-label=\"YouTube\"><i class=\"fa-brands fa-youtube\"></i></a>
                </div>
            </div>
            <div>
                <h3 class=\"footer__title\">Explore</h3>
                <ul class=\"footer__list\">
                    <li><a href=\"${p}pages/tour-packages.html\">Tour Packages</a></li>
                    <li><a href=\"${p}pages/about.html\">About Us</a></li>
                    <li><a href=\"${p}pages/contact.html\">Contact</a></li>
                </ul>
            </div>
            <div>
                <h3 class=\"footer__title\">Support</h3>
                <ul class=\"footer__list\">
                    <li><a href=\"${p}pages/contact.html\">Help Center</a></li>
                    <li><a href=\"#\">Cancellation Policy</a></li>
                    <li><a href=\"#\">Terms & Privacy</a></li>
                    <li><a href=\"${p}pages/admin/admin-login.html\">Admin</a></li>
                </ul>
            </div>
            <div>
                <h3 class=\"footer__title\">Contact</h3>
                <ul class=\"footer__list\">
                    <li><i class=\"fa-solid fa-location-dot\"></i> 42 Palm Avenue, Colombo</li>
                    <li><i class=\"fa-solid fa-phone\"></i> +94 771 234 567</li>
                    <li><i class=\"fa-solid fa-envelope\"></i> hello@voyagio.travel</li>
                </ul>
            </div>
        </div>
        <div class=\"footer__bottom\">
            <p>&copy; <span id=\"year\"></span> Voyagio. All rights reserved.</p>
            <p>Crafted for wanderers.</p>
        </div>
    </div>
</footer>`;
    }

    function adminSidebarHTML(active) {
        const links = [
            { key: 'dashboard', href: 'dashboard.html', icon: 'fa-gauge', label: 'Dashboard' },
            { key: 'packages', href: 'manage-packages.html', icon: 'fa-map-location-dot', label: 'Manage Packages' },
            // { key: 'users', href: 'manage-users.html', icon: 'fa-users', label: 'Manage Users' },
            { key: 'bookings', href: 'manage-bookings.html', icon: 'fa-calendar-check', label: 'Manage Bookings' },
            { key: 'messages', href: 'contact-messages.html', icon: 'fa-envelope-open-text', label: 'Contact Messages' }
        ];
        return `
<div class="admin-mobilebar">
    <a href="dashboard.html" class="sidebar__brand"><i class="fa-solid fa-plane-departure"></i> Voyagio · Admin</a>
    <button class="admin-mobilebar__toggle" type="button" aria-label="Open admin menu"><i class="fa-solid fa-bars"></i></button>
</div>
<div class="admin-mobile-overlay" data-admin-close></div>
<aside class="sidebar" id="adminSidebar">
    <div class="sidebar__brand"><i class="fa-solid fa-plane-departure"></i> Voyagio · Admin</div>
    <nav class="sidebar__nav">
        ${links.map(l => `<a class="sidebar__link ${active === l.key ? 'active' : ''}" href="${l.href}"><i class="fa-solid ${l.icon}"></i> ${l.label}</a>`).join('')}
        <a class="sidebar__link" href="../../index.html"><i class="fa-solid fa-globe"></i> Back to site</a>
        <button type="button" class="sidebar__link sidebar__logout" data-admin-logout><i class="fa-solid fa-arrow-right-from-bracket"></i> Logout</button>
    </nav>
</aside>`;
    }

    document.querySelectorAll('[data-partial]').forEach(el => {
        const kind = el.getAttribute('data-partial');
        const level = el.getAttribute('data-level') || '0';
        if (kind === 'header') el.outerHTML = headerHTML(level);
        else if (kind === 'footer') el.outerHTML = footerHTML(level);
        else if (kind === 'admin-sidebar') el.outerHTML = adminSidebarHTML(el.getAttribute('data-active') || '');
    });

    // Set current year after footer injection
    const yr = document.getElementById('year');
    if (yr) yr.textContent = new Date().getFullYear();
})();
