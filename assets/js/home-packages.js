(function () {
    'use strict';
    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>\'"]/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[ch]));
    }
    function formatPrice(value) {
        return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    function packageCard(pkg) {
        const image = pkg.image || 'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=800';
        return `
            <article class="card" data-reveal>
                <div class="card__img">
                    <img src="${escapeHTML(image)}" alt="${escapeHTML(pkg.name)}" loading="lazy" />
                    <span class="card__badge">${escapeHTML(pkg.category || 'Tour')}</span>
                </div>
                <div class="card__body">
                    <span class="card__loc"><i class="fa-solid fa-location-dot"></i> ${escapeHTML(pkg.destination)} · ${escapeHTML(pkg.duration)}</span>
                    <h3 class="card__title">${escapeHTML(pkg.name)}</h3>
                    <p style="color:var(--color-text-muted);font-size:0.9rem;">${escapeHTML(pkg.description || 'Explore this tour package with Voyagio.')}</p>
                    <div class="card__meta"><span class="card__price">₹${formatPrice(pkg.price)} <small>/ person</small></span></div>
                    <a href="pages/package-details.html?id=${encodeURIComponent(pkg.id)}" class="btn btn--primary btn--block mt-6">View Details</a>
                </div>
            </article>`;
    }
    async function loadHomePackages() {
        const grid = document.getElementById('homePackagesGrid');
        if (!grid) return;
        try {
            const response = await fetch('/api/packages', { headers: { 'Accept': 'application/json' } });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load tour packages.');
            const packages = (result.packages || []).slice(0, 3);
            grid.innerHTML = packages.length ? packages.map(packageCard).join('') : '<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:3rem 1rem;"><h3>No tour packages available</h3><p>New packages will appear here when the administrator publishes them.</p></div>';
        } catch (error) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:3rem 1rem;"><h3>Unable to load tour packages</h3><p>${escapeHTML(error.message)}</p></div>`;
        }
    }
    document.addEventListener('DOMContentLoaded', loadHomePackages);
})();
