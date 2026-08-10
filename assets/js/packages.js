(function () {
    'use strict';

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>'"]/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[ch]));
    }

    function formatPrice(value) {
        const number = Number(value || 0);
        return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

    function getPackageId() {
        const params = new URLSearchParams(window.location.search);
        return params.get('packageId') || params.get('id');
    }

    async function fetchJSON(url) {
        const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load packages.');
        return result;
    }

    function packageCard(pkg) {
        const image = pkg.image || 'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=600';
        return `
            <article class="card">
                <div class="card__img">
                    <img src="${escapeHTML(image)}" alt="${escapeHTML(pkg.name)}" loading="lazy" />
                    <span class="card__badge">${escapeHTML(pkg.category)}</span>
                </div>
                <div class="card__body">
                    <span class="card__loc"><i class="fa-solid fa-location-dot"></i>
                        ${escapeHTML(pkg.destination)} · ${escapeHTML(pkg.duration)} · ${escapeHTML(pkg.category)}</span>
                    <h3 class="card__title">${escapeHTML(pkg.name)}</h3>
                    <div class="card__meta">
                        <span class="card__price">$${formatPrice(pkg.price)} <small>/ person</small></span>
                    </div>
                    <a href="package-details.html?id=${encodeURIComponent(pkg.id)}" class="btn btn--primary btn--block mt-6">View Details</a>
                </div>
            </article>`;
    }

    async function loadPackages() {
        const grid = document.getElementById('publicPackagesGrid');
        const state = document.getElementById('packagesState');
        if (!grid) return;
        try {
            const result = await fetchJSON('/api/packages');
            grid.innerHTML = result.packages.length
                ? result.packages.map(packageCard).join('')
                : '<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:3rem 1rem;"><h3>No tour packages available</h3><p>New packages will appear here when the administrator publishes them.</p></div>';
            if (state) state.remove();
        } catch (error) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:3rem 1rem;"><h3>Unable to load packages</h3><p>${escapeHTML(error.message)}</p></div>`;
        }
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value ?? '';
    }

    async function loadDetails() {
        const root = document.getElementById('packageDetailsPage');
        if (!root) return;
        const id = getPackageId();
        if (!id) {
            window.location.href = 'tour-packages.html';
            return;
        }
        try {
            const result = await fetchJSON(`/api/packages/${encodeURIComponent(id)}`);
            const pkg = result.package;
            document.title = `${pkg.name} · Voyagio`;
            const image = document.getElementById('packageImage');
            if (image) {
                image.src = pkg.image || 'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1200';
                image.alt = pkg.name;
            }
            setText('packageName', pkg.name);
            setText('packageLocation', `${pkg.destination} · ${pkg.duration} · ${pkg.category}`);
            setText('packageDestination', pkg.destination);
            setText('packageDuration', pkg.duration);
            setText('packageDescription', pkg.description || 'Explore this tour package with Voyagio.');
            setText('packagePrice', formatPrice(pkg.price));
            setText('packageCategory', pkg.category);
            const bookingLink = document.getElementById('bookPackageLink');
            if (bookingLink) bookingLink.href = `book-tour.html?packageId=${encodeURIComponent(pkg.id)}`;
            const breadcrumb = document.getElementById('packageBreadcrumb');
            if (breadcrumb) breadcrumb.textContent = pkg.name;
            const loader = document.getElementById('packageLoading');
            if (loader) loader.remove();
            root.hidden = false;
        } catch (error) {
            const loader = document.getElementById('packageLoading');
            if (loader) loader.innerHTML = `<h2>Package unavailable</h2><p>${escapeHTML(error.message)}</p><a class="btn btn--primary mt-6" href="tour-packages.html">Back to Packages</a>`;
        }
    }

    async function loadBookingPackage() {
        const form = document.getElementById('tourBookingForm');
        if (!form) return;
        const id = getPackageId();
        if (!id) return;
        const input = document.getElementById('bookingPackageId');
        if (input) input.value = id;
        try {
            const result = await fetchJSON(`/api/packages/${encodeURIComponent(id)}`);
            const pkg = result.package;
            setText('bookingPackageSummary', `Booking: ${pkg.name} · ${pkg.destination} · ${pkg.duration}`);
        } catch (error) {
            window.showToast(error.message, 'error');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        loadPackages();
        loadDetails();
        loadBookingPackage();
    });
})();
