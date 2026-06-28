/**
 * Rekapan Iuran Piknik Keluarga - Frontend App v2
 * SEMUA REQUEST PAKAI GET (CORS-safe)
 */

// ==========================================
// CONFIGURATION
// ==========================================
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwWGitnYYfouZ4Y5AGLBohRdHcm3sCKyKv51oprp-xnGQundcRqBEXHPsF2wuVCIh-t/exec';

// Target iuran default (akan di-overwrite dari API)
let IURAN_PER_ORANG = 260000;

// ==========================================
// STATE
// ==========================================
let allData = [];
let currentFilter = 'all';

// ==========================================
// DOM ELEMENTS
// ==========================================
const elements = {
    loadingOverlay: document.getElementById('loadingOverlay'),
    nameList: document.getElementById('nameList'),
    searchInput: document.getElementById('searchInput'),
    btnRefresh: document.getElementById('btnRefresh'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    modalOverlay: document.getElementById('modalOverlay'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    btnCancel: document.getElementById('btnCancel'),
    btnSave: document.getElementById('btnSave'),
    modalNama: document.getElementById('modalNama'),
    modalKeluarga: document.getElementById('modalKeluarga'),
    modalTanggal: document.getElementById('modalTanggal'),
    modalJumlah: document.getElementById('modalJumlah'),
    modalKeterangan: document.getElementById('modalKeterangan'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    totalPeserta: document.getElementById('totalPeserta'),
    totalLunas: document.getElementById('totalLunas'),
    totalBelum: document.getElementById('totalBelum'),
    totalIuran: document.getElementById('totalIuran'),
    emptyState: document.getElementById('emptyState'),
    tableContainer: document.getElementById('tableContainer')
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
});

function setupEventListeners() {
    elements.searchInput.addEventListener('input', debounce(filterData, 300));
    elements.btnRefresh.addEventListener('click', loadData);
    
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            filterData();
        });
    });
    
    elements.btnCloseModal.addEventListener('click', closeModal);
    elements.btnCancel.addEventListener('click', closeModal);
    elements.modalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.modalOverlay) closeModal();
    });
    
    elements.btnSave.addEventListener('click', savePayment);
}

// ==========================================
// DATA LOADING (GET - CORS SAFE)
// ==========================================
async function loadData() {
    showLoading(true);
    
    try {
        if (GAS_API_URL.includes('xxxxxxxx')) {
            console.log('API URL masih default, menggunakan data sample...');
            await new Promise(r => setTimeout(r, 1000));
            allData = getSampleData();
        } else {
            // GET request - tidak butuh preflight CORS
            const response = await fetch(`${GAS_API_URL}?action=getData`);
            const result = await response.json();
            
            if (result.success) {
                allData = result.data;
                // Update target iuran dari server
                if (result.targetIuran) {
                    IURAN_PER_ORANG = result.targetIuran;
                }
            } else {
                throw new Error(result.message);
            }
        }
        
        updateStats();
        filterData();
        showToast('Data berhasil dimuat!', 'success');
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Gagal memuat data: ' + error.message, 'error');
        allData = getSampleData();
        updateStats();
        filterData();
    } finally {
        showLoading(false);
    }
}

function updateStats() {
    const totalPeserta = allData.length;
    const totalLunas = allData.filter(p => p.status === 'Lunas').length;
    const totalBelum = totalPeserta - totalLunas;
    const totalIuran = allData.reduce((sum, p) => sum + (p.total || 0), 0);
    
    animateValue(elements.totalPeserta, 0, totalPeserta, 1000);
    animateValue(elements.totalLunas, 0, totalLunas, 1000);
    animateValue(elements.totalBelum, 0, totalBelum, 1000);
    elements.totalIuran.textContent = formatRupiah(totalIuran);
}

// ==========================================
// FILTER & DISPLAY
// ==========================================
function filterData() {
    const searchTerm = elements.searchInput.value.toLowerCase().trim();
    
    let filtered = allData.filter(person => {
        const matchSearch = !searchTerm || 
            person.nama.toLowerCase().includes(searchTerm) ||
            person.keluarga.toLowerCase().includes(searchTerm);
        
        let matchStatus = true;
        if (currentFilter === 'lunas') matchStatus = person.status === 'Lunas';
        if (currentFilter === 'belum') matchStatus = person.status === 'Belum Lunas';
        
        return matchSearch && matchStatus;
    });
    
    renderList(filtered);
}

function renderList(data) {
    if (data.length === 0) {
        elements.tableContainer.style.display = 'none';
        elements.emptyState.style.display = 'block';
        return;
    }
    
    elements.tableContainer.style.display = 'block';
    elements.emptyState.style.display = 'none';
    
    elements.nameList.innerHTML = data.map((person, idx) => {
        const isLunas = person.status === 'Lunas';
        const statusBorder = isLunas ? 'var(--success)' : 'var(--danger)';
        const statusBg = isLunas ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.06)';
        
        return `
            <div onclick="event.stopPropagation(); openDetailCard(event, '${escapeHtml(person.nama)}')" class="name-item" style="border-left-color: ${statusBorder}; background: ${statusBg};">
                <span class="name-text">${escapeHtml(person.nama)}</span>
                <span class="name-status-dot ${isLunas ? 'dot-lunas' : 'dot-belum'}"></span>
            </div>
        `;
    }).join('');
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==========================================
// MODAL & PAYMENT (GET - CORS SAFE)
// ==========================================
let currentEditingPerson = null;
let currentEditingDate = null;

function openPaymentModal(nama, keluarga, tanggal) {
    currentEditingPerson = nama;
    currentEditingDate = tanggal;
    
    elements.modalNama.value = nama;
    elements.modalKeluarga.value = keluarga || '-';
    elements.modalTanggal.value = tanggal || new Date().toISOString().split('T')[0];
    elements.modalJumlah.value = '';
    elements.modalKeterangan.value = '';
    
    elements.modalOverlay.classList.add('active');
}

function closeModal() {
    elements.modalOverlay.classList.remove('active');
    currentEditingPerson = null;
    currentEditingDate = null;
}

async function savePayment() {
    const jumlah = parseInt(elements.modalJumlah.value) || 0;
    const tanggal = elements.modalTanggal.value;
    const keterangan = elements.modalKeterangan.value;
    
    if (jumlah <= 0) {
        showToast('Jumlah pembayaran harus lebih dari 0!', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        if (GAS_API_URL.includes('xxxxxxxx')) {
            // Demo mode - update local data
            await new Promise(r => setTimeout(r, 800));
            const person = allData.find(p => p.nama === currentEditingPerson);
            if (person) {
                person.total = (person.total || 0) + jumlah;
                if (!person.pembayaran) person.pembayaran = [];
                person.pembayaran.push({ tanggal, jumlah, keterangan });
                person.status = person.total >= IURAN_PER_ORANG ? 'Lunas' : 'Belum Lunas';
            }
        } else {
            // GET request dengan query parameter - CORS safe!
            const params = new URLSearchParams({
                action: 'updatePayment',
                nama: currentEditingPerson,
                tanggal: tanggal,
                jumlah: jumlah.toString(),
                keterangan: keterangan
            });
            
            const response = await fetch(`${GAS_API_URL}?${params.toString()}`);
            const result = await response.json();
            
            if (!result.success) throw new Error(result.message);
        }
        
        closeModal();
        await loadData(); // Refresh data dari server
        showToast('Pembayaran berhasil disimpan!', 'success');
    } catch (error) {
        showToast('Gagal menyimpan: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// UTILITIES
// ==========================================
function showLoading(show) {
    elements.loadingOverlay.classList.toggle('hidden', !show);
}

function showToast(message, type = 'success') {
    elements.toastMessage.textContent = message;
    elements.toast.className = 'toast';
    if (type === 'error') elements.toast.classList.add('error');
    
    elements.toast.classList.add('show');
    setTimeout(() => elements.toast.classList.remove('show'), 3000);
}

function formatRupiah(angka) {
    return 'Rp ' + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            element.textContent = end;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// ==========================================
// SAMPLE DATA (Demo Mode - Target 260.000)
// ==========================================
function getSampleData() {
    return [
        { no: 1, keluarga: 'De Is', nama: 'De Istiqomah', status: 'Lunas', total: 260000, pembayaran: [{ tanggal: '2026-06-27', jumlah: 260000, keterangan: 'Lunas cash' }] },
        { no: 2, keluarga: 'De Is', nama: 'Ica', status: 'Belum Lunas', total: 100000, pembayaran: [{ tanggal: '2026-06-28', jumlah: 100000, keterangan: 'Cicilan 1' }] },
        { no: 3, keluarga: 'Dedi', nama: 'Dedi', status: 'Lunas', total: 260000, pembayaran: [{ tanggal: '2026-06-28', jumlah: 260000, keterangan: 'Transfer' }] },
        { no: 4, keluarga: 'Dedi', nama: 'Faza', status: 'Belum Lunas', total: 150000, pembayaran: [{ tanggal: '2026-06-30', jumlah: 150000, keterangan: 'Cicilan' }] },
        { no: 5, keluarga: 'Syarif', nama: 'Syarief', status: 'Lunas', total: 260000, pembayaran: [{ tanggal: '2026-06-27', jumlah: 260000, keterangan: 'Cash' }] },
        { no: 6, keluarga: 'Syarif', nama: 'Adey', status: 'Belum Lunas', total: 0, pembayaran: [] },
        { no: 7, keluarga: 'Bella', nama: 'Maimon', status: 'Lunas', total: 260000, pembayaran: [{ tanggal: '2026-06-29', jumlah: 260000, keterangan: 'Transfer' }] },
        { no: 8, keluarga: 'Bella', nama: 'Bella', status: 'Belum Lunas', total: 0, pembayaran: [] },
        { no: 9, keluarga: 'Bella', nama: 'De Solekan', status: 'Belum Lunas', total: 200000, pembayaran: [{ tanggal: '2026-07-01', jumlah: 200000, keterangan: 'Cicilan' }] },
        { no: 10, keluarga: 'Bella', nama: 'De Nur', status: 'Belum Lunas', total: 0, pembayaran: [] },
        { no: 11, keluarga: 'Bella', nama: 'Mujib', status: 'Belum Lunas', total: 0, pembayaran: [] },
        { no: 12, keluarga: 'De Arif', nama: 'De Arif', status: 'Lunas', total: 260000, pembayaran: [{ tanggal: '2026-06-30', jumlah: 260000, keterangan: 'Cash' }] },
        { no: 13, keluarga: 'De Arif', nama: 'De Khanif', status: 'Belum Lunas', total: 0, pembayaran: [] },
        { no: 14, keluarga: 'De Arif', nama: 'Lina', status: 'Belum Lunas', total: 0, pembayaran: [] },
        { no: 15, keluarga: 'Iwan', nama: 'Iwan', status: 'Lunas', total: 260000, pembayaran: [{ tanggal: '2026-07-01', jumlah: 260000, keterangan: 'Transfer' }] },
        { no: 16, keluarga: 'Iwan', nama: 'Vira', status: 'Belum Lunas', total: 0, pembayaran: [] },
        { no: 17, keluarga: 'Imdad', nama: 'Imdad', status: 'Lunas', total: 260000, pembayaran: [{ tanggal: '2026-07-02', jumlah: 260000, keterangan: 'Cash' }] },
        { no: 18, keluarga: 'Imdad', nama: 'Vina', status: 'Belum Lunas', total: 0, pembayaran: [] },
        { no: 19, keluarga: 'De Tando', nama: 'De Tandho', status: 'Lunas', total: 260000, pembayaran: [{ tanggal: '2026-07-03', jumlah: 260000, keterangan: 'Transfer' }] },
        { no: 20, keluarga: 'De Tando', nama: 'De Hidayah', status: 'Belum Lunas', total: 0, pembayaran: [] },
    ];
}

// ==========================================
// DETAIL CARD - KLIK NAMA
// ==========================================
function openDetailCard(event, nama) {
    const person = allData.find(p => p.nama === nama);
    if (!person) return;

    const sisa = Math.max(0, IURAN_PER_ORANG - (person.total || 0));
    const progress = Math.min(100, ((person.total || 0) / IURAN_PER_ORANG) * 100);
    const isLunas = person.status === 'Lunas';
    const cicilanCount = person.pembayaran ? person.pembayaran.length : 0;

    const initials = nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

    let timelineHTML = '';
    if (person.pembayaran && person.pembayaran.length > 0) {
        timelineHTML = person.pembayaran.map((p, i) => {
            const isLast = i === person.pembayaran.length - 1;
            return `
            <div class="detail-tl-item">
                <div class="detail-tl-connector">
                    <div class="detail-tl-dot"></div>
                    ${!isLast ? '<div class="detail-tl-line"></div>' : ''}
                </div>
                <div class="detail-tl-body ${!isLast ? 'detail-tl-border' : ''}">
                    <div class="detail-tl-row">
                        <span class="detail-tl-date"><i class="fas fa-calendar-day"></i> ${formatTanggalIndo(p.tanggal)}</span>
                        <span class="detail-tl-amount">+${formatRupiah(p.jumlah)}</span>
                    </div>
                    ${p.keterangan ? `<span class="detail-tl-note">${escapeHtml(p.keterangan)}</span>` : ''}
                </div>
            </div>`;
        }).join('');
    } else {
        timelineHTML = `<p class="detail-empty-pay"><i class="fas fa-clock"></i> Belum ada pembayaran</p>`;
    }

    const footerHTML = isLunas
        ? `<div class="detail-footer-lunas"><i class="fas fa-check-circle"></i> Lunas! Terima kasih sudah membayar penuh.</div>`
        : `<div class="detail-footer-kurang"><i class="fas fa-exclamation-triangle"></i> Masih kurang <strong>${formatRupiah(sisa)}</strong> lagi</div>`;

    document.getElementById('detailCardContent').innerHTML = `
        <div class="detail-header">
            <div class="detail-avatar">${initials}</div>
            <div class="detail-info">
                <p class="detail-nama">${escapeHtml(nama)}</p>
                <p class="detail-keluarga"><i class="fas fa-users"></i> ${escapeHtml(person.keluarga || '-')}</p>
                <div class="detail-meta-row">
                    <span class="detail-meta"><i class="fas fa-hashtag"></i> No. ${person.no || '-'}</span>
                    <span class="detail-meta"><i class="fas fa-receipt"></i> ${cicilanCount} kali cicilan</span>
                </div>
            </div>
            <span class="status-badge ${isLunas ? 'status-lunas' : 'status-belum'}">${person.status || 'Belum Lunas'}</span>
        </div>
        <div class="detail-progress-section">
            <div class="detail-progress-row">
                <span>Terkumpul</span>
                <span class="detail-progress-amount">${formatRupiah(person.total || 0)} <span class="detail-progress-target">/ ${formatRupiah(IURAN_PER_ORANG)}</span></span>
            </div>
            <div class="detail-progress-track">
                <div class="detail-progress-fill ${isLunas ? 'lunas' : ''}" style="width:${progress}%"></div>
            </div>
            <div class="detail-progress-row">
                <span class="detail-pct">${Math.round(progress)}%</span>
                ${!isLunas ? `<span class="detail-sisa">Kurang ${formatRupiah(sisa)}</span>` : '<span class="detail-lunas-text"><i class="fas fa-check"></i> Lunas</span>'}
            </div>
        </div>
        <div class="detail-timeline-section">
            <p class="detail-timeline-title"><i class="fas fa-history"></i> Riwayat pembayaran</p>
            ${timelineHTML}
        </div>
        <div class="detail-footer">${footerHTML}</div>
    `;

    const popup = document.getElementById('detailCardOverlay');
    const card = popup.querySelector('.detail-card');
    const isMobile = window.innerWidth <= 640;

    popup.classList.add('active');

    if (isMobile) {
        card.classList.add('mobile-card');
        card.style.position = '';
        card.style.left = '';
        card.style.top = '';
        card.style.width = '';
        card.style.margin = '';
        card.style.transformOrigin = '';
        card.style.opacity = '';
    } else {
        card.classList.remove('mobile-card');
        card.style.position = 'fixed';
        card.style.margin = '0';
        card.style.opacity = '0';
        card.style.width = Math.min(360, window.innerWidth - 16) + 'px';

        const item = event.currentTarget;
        const itemRect = item.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Force layout reflow agar ukuran terhitung
        void card.offsetHeight;
        const cardRect = card.getBoundingClientRect();
        const cardH = cardRect.height;
        const cardW = cardRect.width;

        let left = itemRect.left;
        if (left + cardW > vw - 8) left = vw - cardW - 8;
        if (left < 8) left = 8;

        const spaceAbove = itemRect.top - 8;
        const spaceBelow = vh - itemRect.bottom - 8;

        let top, transformOrigin;
        if (spaceAbove >= cardH) {
            top = itemRect.top - cardH - 6;
            transformOrigin = 'bottom left';
        } else if (spaceBelow >= cardH) {
            top = itemRect.bottom + 6;
            transformOrigin = 'top left';
        } else {
            top = Math.max(8, vh - cardH - 8);
            transformOrigin = 'top left';
        }

        card.style.top = top + 'px';
        card.style.left = left + 'px';
        card.style.transformOrigin = transformOrigin;
        card.style.opacity = '1';
    }
}

function closeDetailCard() {
    document.getElementById('detailCardOverlay').classList.remove('active');
}

function formatTanggalIndo(tanggal) {
    if (!tanggal) return '-';
    const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
    const parts = tanggal.split('-');
    if (parts.length === 3) {
        return `${parseInt(parts[2])} ${BULAN[parseInt(parts[1]) - 1]} ${parts[0]}`;
    }
    return tanggal;
}

// Tutup detail card dengan klik di luar / Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeDetailCard();
});
