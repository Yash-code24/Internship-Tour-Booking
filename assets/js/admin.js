
(function () {
    'use strict';

    const page = document.body.dataset.adminPage || '';
    const $ = (selector, parent = document) => parent.querySelector(selector);

    async function api(url, options = {}) {
        const response = await fetch(url, {
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options
        });
        let result = {};
        try { result = await response.json(); } catch (_) {}
        if (response.status === 401) {
            window.location.href = 'admin-login.html';
            throw new Error('Admin login required.');
        }
        if (!response.ok || result.success === false) {
            throw new Error(result.message || 'Request failed.');
        }
        return result;
    }

    function esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        }[ch]));
    }

    function formatDate(value) {
        if (!value) return '-';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function statusClass(status) {
        return status === 'confirmed' || status === 'active' ? 'status--success' :
            status === 'pending' || status === 'unread' ? 'status--pending' :
            status === 'cancelled' || status === 'inactive' ? 'status--info' : '';
    }

    function emptyRow(colspan, text) {
        return `<tr><td colspan="${colspan}" style="text-align:center;padding:2rem;color:var(--color-text-muted);">${esc(text)}</td></tr>`;
    }

    async function protectAdminPage() {
        try {
            const result = await api('/api/admin/me');
            const name = result.admin?.name || 'Admin';
            const welcome = $('[data-admin-name]');
            if (welcome) welcome.textContent = name;
        } catch (_) {}
    }

    function initAdminMobileMenu() {
        document.addEventListener('click', e => {
            if (e.target.closest('.admin-mobilebar__toggle')) {
                $('#adminSidebar')?.classList.add('mobile-open');
                $('.admin-mobile-overlay')?.classList.add('open');
                document.body.style.overflow = 'hidden';
            }
            if (e.target.closest('[data-admin-close]') || e.target.closest('#adminSidebar a')) {
                $('#adminSidebar')?.classList.remove('mobile-open');
                $('.admin-mobile-overlay')?.classList.remove('open');
                document.body.style.overflow = '';
            }
        });
    }

    function initLogout() {
        document.addEventListener('click', async e => {
            const btn = e.target.closest('[data-admin-logout]');
            if (!btn) return;
            try {
                await api('/api/admin/logout', { method: 'POST', body: '{}' });
                window.location.href = 'admin-login.html';
            } catch (err) {
                window.showToast?.(err.message, 'error');
            }
        });
    }

    async function initDashboard() {
        const result = await api('/api/admin/stats');
        const s = result.stats || {};
        const set = (key, value) => {
            const el = document.querySelector(`[data-stat="${key}"]`);
            if (el) el.textContent = value ?? 0;
        };
        set('users', s.users);
        set('packages', s.packages);
        set('bookings', s.bookings);
        set('messages', s.messages);

        const tbody = $('#recentBookingsBody');
        if (!tbody) return;
        const rows = result.recentBookings || [];
        tbody.innerHTML = rows.length ? rows.map(b => `
            <tr>
                <td><strong>${esc(b.booking_code)}</strong></td>
                <td>${esc(b.full_name)}</td>
                <td>${esc(b.package_name)}</td>
                <td>${formatDate(b.start_date)}</td>
                <td><span class="status ${statusClass(b.status)}">${esc(cap(b.status))}</span></td>
                <td><a class="icon-btn" href="manage-bookings.html" title="Manage bookings"><i class="fa-regular fa-eye"></i></a></td>
            </tr>`).join('') : emptyRow(6, 'No bookings yet.');
    }

    function cap(value) {
        return String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1);
    }

    function addPackageModal() {
        if ($('#packageModal')) return;
        const modal = document.createElement('div');
        modal.id = 'packageModal';
        modal.className = 'admin-modal';
        modal.innerHTML = `
            <div class="admin-modal__backdrop" data-close-modal></div>
            <section class="admin-modal__card" role="dialog" aria-modal="true" aria-labelledby="packageModalTitle">
                <div class="admin-modal__head">
                    <div><h2 id="packageModalTitle">Add Tour Package</h2><p>Enter the package information below.</p></div>
                    <button type="button" class="icon-btn" data-close-modal aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <form id="packageForm" class="form">
                    <input type="hidden" name="id">
                    <div class="form__row">
                        <div class="form__group"><label class="form__label">Package Code</label><input class="form__control" name="packageCode" placeholder="Auto e.g. P006"></div>
                        <div class="form__group"><label class="form__label">Package Name</label><input class="form__control" name="name" required></div>
                    </div>
                    <div class="form__row">
                        <div class="form__group"><label class="form__label">Destination</label><input class="form__control" name="destination" required></div>
                        <div class="form__group"><label class="form__label">Duration</label><input class="form__control" name="duration" placeholder="7 days / 6 nights" required></div>
                    </div>
                    <div class="form__row">
                        <div class="form__group"><label class="form__label">Category</label><input class="form__control" name="category" placeholder="Beach, Adventure..." required></div>
                        <div class="form__group"><label class="form__label">Price</label><input class="form__control" name="price" type="number" min="0" step="0.01" required></div>
                    </div>
                    <div class="form__row">
                        <div class="form__group"><label class="form__label">Image URL</label><input class="form__control" name="image" type="url" placeholder="https://..."></div>
                        <div class="form__group"><label class="form__label">Status</label>
                            <select class="form__control" name="status"><option value="active">Active</option><option value="inactive">Inactive</option></select>
                        </div>
                    </div>
                    <div class="form__group"><label class="form__label">Description</label><textarea class="form__control" name="description" rows="4"></textarea></div>
                    <div class="admin-modal__actions">
                        <button type="button" class="btn btn--ghost" data-close-modal>Cancel</button>
                        <button type="submit" class="btn btn--primary"><i class="fa-solid fa-save"></i> Save Package</button>
                    </div>
                </form>
            </section>`;
        document.body.appendChild(modal);
        const form = $('#packageForm');

        document.addEventListener('click', e => {
            if (e.target.closest('[data-close-modal]')) closeModal();
        });

        form.addEventListener('submit', async e => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(form).entries());
            const id = data.id;
            delete data.id;
            data.price = Number(data.price);
            try {
                const result = await api(id ? `/api/admin/packages/${id}` : '/api/admin/packages', {
                    method: id ? 'PUT' : 'POST',
                    body: JSON.stringify(data)
                });
                window.showToast?.(result.message, 'success');
                closeModal();
                loadPackages();
            } catch (err) {
                window.showToast?.(err.message, 'error');
            }
        });
    }

    function openPackageModal(pkg = null) {
        const form = $('#packageForm');
        if (!form) return;
        form.reset();
        form.elements['id'].value = pkg?.id || '';
        form.elements['packageCode'].value = pkg?.package_code || '';
        form.elements['name'].value = pkg?.name || '';
        form.elements['destination'].value = pkg?.destination || '';
        form.elements['duration'].value = pkg?.duration || '';
        form.elements['category'].value = pkg?.category || '';
        form.elements['price'].value = pkg?.price ?? '';
        form.elements['image'].value = pkg?.image || '';
        form.elements['description'].value = pkg?.description || '';
        form.elements['status'].value = pkg?.status || 'active';
        $('#packageModalTitle').textContent = pkg ? 'Edit Tour Package' : 'Add Tour Package';
        $('#packageModal').classList.add('open');
        document.body.style.overflow = 'hidden';
        form.name.focus();
    }

    function closeModal() {
        const modal = $('#packageModal');
        if (modal) modal.classList.remove('open');
        document.body.style.overflow = '';
    }

    async function loadPackages() {
        const tbody = $('#packagesBody');
        if (!tbody) return;
        tbody.innerHTML = emptyRow(8, 'Loading packages...');
        try {
            const result = await api('/api/admin/packages');
            const packages = result.packages || [];
            window.adminPackages = packages;
            tbody.innerHTML = packages.length ? packages.map(p => `
                <tr>
                    <td>${esc(p.package_code)}</td>
                    <td><strong>${esc(p.name)}</strong></td>
                    <td>${esc(p.destination)}</td>
                    <td>${esc(p.duration)}</td>
                    <td>${esc(p.category)}</td>
                    <td>${Number(p.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td><span class="status ${statusClass(p.status)}">${esc(cap(p.status))}</span></td>
                    <td><div class="table__actions">
                        <button class="icon-btn" data-edit-package="${p.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                        <button class="icon-btn icon-btn--danger" data-delete-package="${p.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </div></td>
                </tr>`).join('') : emptyRow(8, 'No packages found.');
        } catch (err) {
            tbody.innerHTML = emptyRow(8, err.message);
        }
    }

    function initPackages() {
        addPackageModal();
        document.addEventListener('click', async e => {
            const add = e.target.closest('[data-add-package]');
            if (add) openPackageModal();

            const edit = e.target.closest('[data-edit-package]');
            if (edit) {
                const pkg = (window.adminPackages || []).find(p => Number(p.id) === Number(edit.dataset.editPackage));
                if (pkg) openPackageModal(pkg);
            }

            const del = e.target.closest('[data-delete-package]');
            if (del) {
                const pkg = (window.adminPackages || []).find(p => Number(p.id) === Number(del.dataset.deletePackage));
                if (!pkg || !confirm(`Delete "${pkg.name}"? This cannot be undone.`)) return;
                try {
                    const result = await api(`/api/admin/packages/${pkg.id}`, { method: 'DELETE' });
                    window.showToast?.(result.message, 'success');
                    loadPackages();
                } catch (err) {
                    window.showToast?.(err.message, 'error');
                }
            }
        });
        loadPackages();
    }

    function bookingModal(booking) {
        if ($('#bookingModal')) $('#bookingModal').remove();
        const modal = document.createElement('div');
        modal.id = 'bookingModal';
        modal.className = 'admin-modal open';
        modal.innerHTML = `
            <div class="admin-modal__backdrop" data-close-booking></div>
            <section class="admin-modal__card" role="dialog" aria-modal="true">
                <div class="admin-modal__head"><div><h2>Booking ${esc(booking.booking_code)}</h2><p>Booking details</p></div>
                    <button class="icon-btn" data-close-booking><i class="fa-solid fa-xmark"></i></button></div>
                <div class="admin-detail-grid">
                    <div><small>Customer</small><strong>${esc(booking.full_name)}</strong></div>
                    <div><small>Email</small><strong>${esc(booking.email)}</strong></div>
                    <div><small>Mobile</small><strong>${esc(booking.mobile)}</strong></div>
                    <div><small>Package</small><strong>${esc(booking.package_name)}</strong></div>
                    <div><small>Travel date</small><strong>${formatDate(booking.start_date)}</strong></div>
                    <div><small>Travellers</small><strong>${booking.adults} adult(s), ${booking.children} child(ren)</strong></div>
                    <div><small>Rooms</small><strong>${booking.rooms}</strong></div>
                    <div><small>Status</small><strong>${esc(cap(booking.status))}</strong></div>
                    <div class="admin-detail-grid__wide"><small>Special requests</small><strong>${esc(booking.special_requests || 'None')}</strong></div>
                </div>
                <div class="admin-modal__actions">
                    <button class="btn btn--ghost" data-close-booking>Close</button>
                    ${booking.status !== 'confirmed' ? `<button class="btn btn--primary" data-booking-status="${booking.id}:confirmed">Confirm</button>` : ''}
                    ${booking.status !== 'cancelled' ? `<button class="btn btn--outline" data-booking-status="${booking.id}:cancelled">Cancel Booking</button>` : ''}
                </div>
            </section>`;
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    }

    async function loadBookings() {
        const tbody = $('#bookingsBody');
        if (!tbody) return;
        tbody.innerHTML = emptyRow(6, 'Loading bookings...');
        try {
            const result = await api('/api/admin/bookings');
            window.adminBookings = result.bookings || [];
            tbody.innerHTML = window.adminBookings.length ? window.adminBookings.map(b => `
                <tr>
                    <td><strong>${esc(b.booking_code)}</strong></td>
                    <td>${esc(b.full_name)}</td>
                    <td>${esc(b.package_name)}</td>
                    <td>${formatDate(b.start_date)}</td>
                    <td><span class="status ${statusClass(b.status)}">${esc(cap(b.status))}</span></td>
                    <td><div class="table__actions">
                        <button class="icon-btn" data-view-booking="${b.id}" title="View"><i class="fa-regular fa-eye"></i></button>
                        ${b.status !== 'cancelled' ? `<button class="icon-btn icon-btn--danger" data-booking-status="${b.id}:cancelled" title="Cancel"><i class="fa-solid fa-xmark"></i></button>` : ''}
                    </div></td>
                </tr>`).join('') : emptyRow(6, 'No bookings found.');
        } catch (err) {
            tbody.innerHTML = emptyRow(6, err.message);
        }
    }

    function initBookings() {
        document.addEventListener('click', async e => {
            const view = e.target.closest('[data-view-booking]');
            if (view) {
                const booking = (window.adminBookings || []).find(b => Number(b.id) === Number(view.dataset.viewBooking));
                if (booking) bookingModal(booking);
            }

            if (e.target.closest('[data-close-booking]')) {
                $('#bookingModal')?.remove();
                document.body.style.overflow = '';
            }

            const statusBtn = e.target.closest('[data-booking-status]');
            if (statusBtn) {
                const [id, status] = statusBtn.dataset.bookingStatus.split(':');
                if (status === 'cancelled' && !confirm('Cancel this booking?')) return;
                try {
                    const result = await api(`/api/admin/bookings/${id}/status`, {
                        method: 'PATCH', body: JSON.stringify({ status })
                    });
                    window.showToast?.(result.message, 'success');
                    $('#bookingModal')?.remove();
                    document.body.style.overflow = '';
                    loadBookings();
                } catch (err) {
                    window.showToast?.(err.message, 'error');
                }
            }
        });
        loadBookings();
    }

    function messageModal(message) {
        if ($('#messageModal')) $('#messageModal').remove();
        const modal = document.createElement('div');
        modal.id = 'messageModal';
        modal.className = 'admin-modal open';
        modal.innerHTML = `
            <div class="admin-modal__backdrop" data-close-message></div>
            <section class="admin-modal__card">
                <div class="admin-modal__head"><div><h2>${esc(message.name)}</h2><p>${esc(message.email)}</p></div>
                    <button class="icon-btn" data-close-message><i class="fa-solid fa-xmark"></i></button></div>
                <div class="admin-message">
                    <strong>${esc(message.subject || 'Contact message')}</strong>
                    <p><strong>Mobile:</strong> ${esc(message.mobile || 'Not provided')}</p>
                    <p>${esc(message.message)}</p>
                </div>
                <div class="admin-modal__actions">
                    <button class="btn btn--ghost" data-close-message>Close</button>
                </div>
            </section>`;
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    }

    async function loadMessages() {
        const tbody = $('#messagesBody');
        if (!tbody) return;
        tbody.innerHTML = emptyRow(6, 'Loading messages...');
        try {
            const result = await api('/api/admin/messages');
            window.adminMessages = result.messages || [];
            tbody.innerHTML = window.adminMessages.length ? window.adminMessages.map(m => `
                <tr>
                    <td><strong>${esc(m.name)}</strong></td>
                    <td>${esc(m.email)}</td>
                    <td>${esc(m.mobile || '-')}</td>
                    <td>${esc((m.message || '').slice(0, 55))}${(m.message || '').length > 55 ? '…' : ''}</td>
                    <td>${formatDate(m.created_at)}</td>
                    <td><div class="table__actions">
                        <button class="icon-btn" data-view-message="${m.id}" title="View"><i class="fa-regular fa-eye"></i></button>
                        <button class="icon-btn icon-btn--danger" data-delete-message="${m.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </div></td>
                </tr>`).join('') : emptyRow(6, 'No contact messages found.');
        } catch (err) {
            tbody.innerHTML = emptyRow(6, err.message);
        }
    }

    function initMessages() {
        document.addEventListener('click', async e => {
            const view = e.target.closest('[data-view-message]');
            if (view) {
                const message = (window.adminMessages || []).find(m => Number(m.id) === Number(view.dataset.viewMessage));
                if (message) {
                    messageModal(message);
                    if (message.status === 'unread') {
                        try {
                            await api(`/api/admin/messages/${message.id}/status`, {
                                method: 'PATCH', body: JSON.stringify({ status: 'read' })
                            });
                            message.status = 'read';
                            loadMessages();
                        } catch (_) {}
                    }
                }
            }

            if (e.target.closest('[data-close-message]')) {
                $('#messageModal')?.remove();
                document.body.style.overflow = '';
            }

            const read = e.target.closest('[data-message-read]');
            if (read) {
                try {
                    const result = await api(`/api/admin/messages/${read.dataset.messageRead}/status`, {
                        method: 'PATCH', body: JSON.stringify({ status: 'read' })
                    });
                    window.showToast?.(result.message, 'success');
                    $('#messageModal')?.remove();
                    document.body.style.overflow = '';
                    loadMessages();
                } catch (err) {
                    window.showToast?.(err.message, 'error');
                }
            }

            const del = e.target.closest('[data-delete-message]');
            if (del) {
                const message = (window.adminMessages || []).find(m => Number(m.id) === Number(del.dataset.deleteMessage));
                if (!message || !confirm(`Delete message from ${message.name}?`)) return;
                try {
                    const result = await api(`/api/admin/messages/${message.id}`, { method: 'DELETE' });
                    window.showToast?.(result.message, 'success');
                    loadMessages();
                } catch (err) {
                    window.showToast?.(err.message, 'error');
                }
            }
        });
        loadMessages();
    }

    document.addEventListener('DOMContentLoaded', async () => {
        initLogout();
        initAdminMobileMenu();
        if (page !== 'login') {
            await protectAdminPage();
            if (page === 'dashboard') initDashboard();
            if (page === 'packages') initPackages();
            if (page === 'bookings') initBookings();
            if (page === 'messages') initMessages();
        }
    });
})();
