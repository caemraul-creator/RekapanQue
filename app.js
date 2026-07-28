/**
 * Rekapan Iuran Piknik Keluarga - Frontend App v4
 * DEWASA + ANAK dari 1 Sheet (baris 2-49 dewasa, 50+ anak)
 * SEMUA REQUEST PAKAI GET (CORS-safe)
 */

// ==========================================
// CONFIGURATION
// ==========================================
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwWGitnYYfouZ4Y5AGLBohRdHcm3sCKyKv51oprp-xnGQundcRqBEXHPsF2wuVCIh-t/exec';

let IURAN_PER_ORANG = 260000;
let HARGA_TIKET = 75000;

// ==========================================
// STATE
// ==========================================
let dewasaData = [];
let anakData = [];
let currentFilter = 'all';
let currentFilterAnak = 'all';
let currentTab = 'dewasa';

// ==========================================
// DOM ELEMENTS
// ==========================================
const $ = id => document.getElementById(id);

const el = {
    loadingOverlay: $('loadingOverlay'),
    nameList: $('nameList'),
    searchInput: $('searchInput'),
    btnRefresh: $('btnRefresh'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    modalOverlay: $('modalOverlay'),
    btnCloseModal: $('btnCloseModal'),
    btnCancel: $('btnCancel'),
    btnSave: $('btnSave'),
    modalNama: $('modalNama'),
    modalKeluarga: $('modalKeluarga'),
    modalTanggal: $('modalTanggal'),
    modalJumlah: $('modalJumlah'),
    modalKeterangan: $('modalKeterangan'),
    emptyState: $('emptyState'),
    tableContainer: $('tableContainer'),

    // Anak
    tiketList: $('tiketList'),
    searchInputAnak: $('searchInputAnak'),
    btnRefreshAnak: $('btnRefreshAnak'),
    btnAddTiket: $('btnAddTiket'),
    filterBtnsAnak: document.querySelectorAll('.filter-btn-anak'),
    tiketTableContainer: $('tiketTableContainer'),
    controlsDewasa: $('controlsDewasa'),
    controlsAnak: $('controlsAnak'),

    // Header stats (dynamic)
    statPeserta: $('statPeserta'),
    statLunas: $('statLunas'),
    statBelum: $('statBelum'),
    statTotal: $('statTotal'),
    statPesertaLabel: $('statPesertaLabel'),

    // Tabs
    tabDewasa: $('tabDewasa'),
    tabAnak: $('tabAnak'),

    // Modals
    modalTiketOverlay: $('modalTiketOverlay'),
    btnCloseTiketModal: $('btnCloseTiketModal'),
    btnCancelTiket: $('btnCancelTiket'),
    btnSaveTiket: $('btnSaveTiket'),
    tiketNamaAnak: $('tiketNamaAnak'),
    tiketKeluarga: $('tiketKeluarga'),
    tiketOrangTua: $('tiketOrangTua'),

    modalTiketPayOverlay: $('modalTiketPayOverlay'),
    btnCloseTiketPay: $('btnCloseTiketPay'),
    btnCancelTiketPay: $('btnCancelTiketPay'),
    btnSaveTiketPay: $('btnSaveTiketPay'),
    tiketPayNama: $('tiketPayNama'),
    tiketPayKeluarga: $('tiketPayKeluarga'),
    tiketPayTanggal: $('tiketPayTanggal'),
    tiketPayJumlah: $('tiketPayJumlah'),
    tiketPayKeterangan: $('tiketPayKeterangan'),

    toast: $('toast'),
    toastMessage: $('toastMessage')
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
});

function setupEventListeners() {
    // Dewasa
    el.searchInput.addEventListener('input', debounce(filterDewasa, 300));
    el.btnRefresh.addEventListener('click', loadData);
    el.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            el.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            filterDewasa();
        });
    });
    el.btnCloseModal.addEventListener('click', closeModal);
    el.btnCancel.addEventListener('click', closeModal);
    el.modalOverlay.addEventListener('click', e => { if (e.target === el.modalOverlay) closeModal(); });
    el.btnSave.addEventListener('click', saveDewasaPayment);

    // Anak
    el.searchInputAnak.addEventListener('input', debounce(filterAnak, 300));
    el.btnRefreshAnak.addEventListener('click', loadData);
    el.btnAddTiket.addEventListener('click', openAddTiketModal);
    el.filterBtnsAnak.forEach(btn => {
        btn.addEventListener('click', () => {
            el.filterBtnsAnak.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilterAnak = btn.dataset.filterAnak;
            filterAnak();
        });
    });

    // Tiket modals
    el.btnCloseTiketModal.addEventListener('click', closeTiketModal);
    el.btnCancelTiket.addEventListener('click', closeTiketModal);
    el.modalTiketOverlay.addEventListener('click', e => { if (e.target === el.modalTiketOverlay) closeTiketModal(); });
    el.btnSaveTiket.addEventListener('click', saveTiketAnak);

    el.btnCloseTiketPay.addEventListener('click', closeTiketPayModal);
    el.btnCancelTiketPay.addEventListener('click', closeTiketPayModal);
    el.modalTiketPayOverlay.addEventListener('click', e => { if (e.target === el.modalTiketPayOverlay) closeTiketPayModal(); });
    el.btnSaveTiketPay.addEventListener('click', saveTiketPayment);

    // Tabs
    el.tabDewasa.addEventListener('click', () => switchTab('dewasa'));
    el.tabAnak.addEventListener('click', () => switchTab('anak'));

    // Escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { closeDetailCard(); closeTiketDetailCard(); }
    });
}

// ==========================================
// TAB SWITCHING
// ==========================================
function switchTab(tab) {
    currentTab = tab;
    closeDetailCard();
    closeTiketDetailCard();

    if (tab === 'dewasa') {
        el.tabDewasa.classList.add('active');
        el.tabAnak.classList.remove('active');
        el.controlsDewasa.classList.remove('hidden');
        el.controlsAnak.classList.add('hidden');
        el.tableContainer.classList.remove('hidden');
        el.tiketTableContainer.classList.add('hidden');
        updateHeaderStats('dewasa');
        filterDewasa();
    } else {
        el.tabAnak.classList.add('active');
        el.tabDewasa.classList.remove('active');
        el.controlsDewasa.classList.add('hidden');
        el.controlsAnak.classList.remove('hidden');
        el.tableContainer.classList.add('hidden');
        el.tiketTableContainer.classList.remove('hidden');
        updateHeaderStats('anak');
        filterAnak();
    }
}

// ==========================================
// HEADER STATS (dynamic per tab)
// ==========================================
function updateHeaderStats(tab) {
    let data, target, label;
    if (tab === 'dewasa') {
        data = dewasaData; target = IURAN_PER_ORANG; label = 'Dewasa';
    } else {
        data = anakData; target = HARGA_TIKET; label = 'Anak';
    }
    const total = data.length;
    const lunas = data.filter(p => p.status === 'Lunas').length;
    const belum = total - lunas;
    const revenue = data.reduce((s, p) => s + (p.total || 0), 0);

    el.statPesertaLabel.textContent = label;
    animateValue(el.statPeserta, parseInt(el.statPeserta.textContent) || 0, total, 600);
    animateValue(el.statLunas, parseInt(el.statLunas.textContent) || 0, lunas, 600);
    animateValue(el.statBelum, parseInt(el.statBelum.textContent) || 0, belum, 600);
    el.statTotal.textContent = formatRupiah(revenue);
}

// ==========================================
// DATA LOADING (1 API call)
// ==========================================
async function loadData() {
    showLoading(true);
    try {
        const response = await fetch(`${GAS_API_URL}?action=getData`);
        const result = await response.json();
        if (result.success) {
            dewasaData = result.dewasa || [];
            anakData = result.anak || [];
            if (result.targetIuran) IURAN_PER_ORANG = result.targetIuran;
            if (result.hargaTiket) HARGA_TIKET = result.hargaTiket;
        } else {
            throw new Error(result.message);
        }

        if (currentTab === 'dewasa') {
            updateHeaderStats('dewasa');
            filterDewasa();
        } else {
            updateHeaderStats('anak');
            filterAnak();
        }
        showToast('Data berhasil dimuat!', 'success');
    } catch (error) {
        console.error('Error:', error);
        showToast('Gagal memuat: ' + error.message, 'error');
        dewasaData = [];
        anakData = [];
        updateHeaderStats(currentTab);
        if (currentTab === 'dewasa') filterDewasa(); else filterAnak();
    } finally {
        showLoading(false);
    }
}

// ==========================================
// DEWASA: FILTER & RENDER
// ==========================================
function filterDewasa() {
    const q = el.searchInput.value.toLowerCase().trim();
    let filtered = dewasaData.filter(p => {
        const match = !q || p.nama.toLowerCase().includes(q) || p.keluarga.toLowerCase().includes(q);
        let statusOk = true;
        if (currentFilter === 'lunas') statusOk = p.status === 'Lunas';
        if (currentFilter === 'belum') statusOk = p.status === 'Belum Lunas';
        return match && statusOk;
    });
    renderDewasaList(filtered);
}

function renderDewasaList(data) {
    if (!data.length) { el.tableContainer.style.display = 'none'; el.emptyState.style.display = 'block'; return; }
    el.tableContainer.style.display = 'block'; el.emptyState.style.display = 'none';
    el.nameList.innerHTML = data.map(p => {
        const ok = p.status === 'Lunas';
        return `<div onclick="event.stopPropagation(); openDetailCard(event, '${esc(p.nama)}','dewasa')" class="name-item" style="border-left-color:${ok?'var(--success)':'var(--danger)'};background:${ok?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.06)'};"><span class="name-text">${esc(p.nama)}</span><span class="name-status-dot ${ok?'dot-lunas':'dot-belum'}"></span></div>`;
    }).join('');
}

// ==========================================
// ANAK: FILTER & RENDER
// ==========================================
function filterAnak() {
    const q = el.searchInputAnak.value.toLowerCase().trim();
    let filtered = anakData.filter(p => {
        const match = !q || p.nama.toLowerCase().includes(q) || p.keluarga.toLowerCase().includes(q);
        let statusOk = true;
        if (currentFilterAnak === 'lunas') statusOk = p.status === 'Lunas';
        if (currentFilterAnak === 'belum') statusOk = p.status === 'Belum Lunas';
        return match && statusOk;
    });
    renderAnakList(filtered);
}

function renderAnakList(data) {
    if (!data.length) { el.tiketTableContainer.style.display = 'none'; el.emptyState.style.display = 'block'; return; }
    el.tiketTableContainer.style.display = 'block'; el.emptyState.style.display = 'none';
    el.tiketList.innerHTML = data.map(p => {
        const ok = p.status === 'Lunas';
        return `
        <div onclick="event.stopPropagation(); openDetailCard(event, '${esc(p.nama)}','anak')" class="kid-item" style="border-left-color:${ok?'#10b981':'#f97316'};background:${ok?'rgba(16,185,129,0.06)':'rgba(249,115,22,0.05)'};">
            <div class="kid-item-left">
                <span class="kid-emoji">${ok?'🎉':'🧒'}</span>
                <div class="kid-item-info">
                    <span class="kid-name">${esc(p.nama)}</span>
                    <span class="kid-family">${esc(p.keluarga || '-')}</span>
                </div>
            </div>
            <span class="kid-amount">${ok?'<span class=\'kid-lunas-text\'>Lunas</span>':formatRupiah(p.total||0)}</span>
        </div>`;
    }).join('');
}

// ==========================================
// DETAIL CARD (shared for dewasa & anak)
// ==========================================
let currentOpenName = null;
let currentOpenType = null;

function openDetailCard(event, nama, type) {
    const data = type === 'dewasa' ? dewasaData : anakData;
    const person = data.find(p => p.nama === nama);
    if (!person) return;

    const target = type === 'dewasa' ? IURAN_PER_ORANG : HARGA_TIKET;
    const isKid = type === 'anak';
    const sisa = Math.max(0, target - (person.total || 0));
    const progress = Math.min(100, ((person.total || 0) / target) * 100);
    const isLunas = person.status === 'Lunas';
    const cicilanCount = person.pembayaran ? person.pembayaran.length : 0;
    const initials = nama.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const themeColor = isKid ? '#f97316' : '#7c3aed';
    const themeBg = isKid ? 'linear-gradient(135deg, #fff7ed, #ffedd5)' : 'linear-gradient(135deg, #ede9fe, #fce7f3)';
    const themeBorder = isKid ? '#fdba74' : '#c4b5fd';
    const avatarBg = isKid ? 'linear-gradient(135deg, #f97316, #f59e0b)' : 'linear-gradient(135deg, #7c3aed, #ec4899)';

    let timelineHTML = '';
    if (person.pembayaran && person.pembayaran.length > 0) {
        timelineHTML = person.pembayaran.map((p, i) => {
            const isLast = i === person.pembayaran.length - 1;
            return `
            <div class="detail-tl-item">
                <div class="detail-tl-connector">
                    <div class="detail-tl-dot" style="background:linear-gradient(135deg,${themeColor},${isKid?'#f59e0b':'#ec4899'})"></div>
                    ${!isLast ? '<div class="detail-tl-line"></div>' : ''}
                </div>
                <div class="detail-tl-body ${!isLast ? 'detail-tl-border' : ''}">
                    <div class="detail-tl-row">
                        <span class="detail-tl-date"><i class="fas fa-calendar-day"></i> ${fmtTgl(p.tanggal)}</span>
                        <span class="detail-tl-amount">+${formatRupiah(p.jumlah)}</span>
                    </div>
                    ${p.keterangan ? `<span class="detail-tl-note">${esc(p.keterangan)}</span>` : ''}
                </div>
            </div>`;
        }).join('');
    } else {
        timelineHTML = `<p class="detail-empty-pay"><i class="fas fa-clock"></i> Belum ada pembayaran</p>`;
    }

    const footerHTML = isLunas
        ? `<div class="detail-footer-lunas"><i class="fas fa-check-circle"></i> Lunas! Terima kasih.</div>`
        : `<div class="detail-footer-kurang"><i class="fas fa-exclamation-triangle"></i> Masih kurang <strong>${formatRupiah(sisa)}</strong> lagi</div>`;

    const payBtn = (!isLunas && isKid)
        ? `<div class="detail-tiket-actions"><button class="btn btn-kid" onclick="openTiketPayModal('${esc(nama)}','${esc(person.keluarga||'')}')"><i class="fas fa-money-bill-wave"></i> Bayar Tiket</button></div>`
        : (!isLunas && !isKid)
        ? `<div class="detail-tiket-actions"><button class="btn btn-primary" onclick="openDewasaPayModal('${esc(nama)}','${esc(person.keluarga||'')}')"><i class="fas fa-money-bill-wave"></i> Bayar Iuran</button></div>`
        : '';

    const cardHTML = `
        <div class="detail-header" style="background:${themeBg};border-bottom-color:${themeBorder}">
            <div class="detail-avatar" style="background:${avatarBg}">${initials}</div>
            <div class="detail-info">
                <p class="detail-nama">${esc(nama)}</p>
                <p class="detail-keluarga"><i class="fas fa-users"></i> ${esc(person.keluarga || '-')}</p>
                <div class="detail-meta-row">
                    <span class="detail-meta"><i class="fas fa-hashtag"></i> No. ${person.no || '-'}</span>
                    <span class="detail-meta"><i class="fas fa-receipt"></i> ${cicilanCount}x bayar</span>
                    ${isKid ? `<span class="detail-meta kid-badge-meta"><i class="fas fa-child"></i> Tiket Anak</span>` : ''}
                </div>
            </div>
            <span class="status-badge ${isLunas ? 'status-lunas' : 'status-belum'}">${person.status}</span>
        </div>
        <div class="detail-progress-section">
            <div class="detail-progress-row">
                <span>Terkumpul</span>
                <span class="detail-progress-amount">${formatRupiah(person.total || 0)} <span class="detail-progress-target">/ ${formatRupiah(target)}</span></span>
            </div>
            <div class="detail-progress-track" style="background:${isKid?'#ffedd5':'#e9d5ff'}">
                <div class="detail-progress-fill ${isLunas ? 'lunas' : ''}" style="width:${progress}%;background:${isLunas?'linear-gradient(90deg,#10b981,#059669)':`linear-gradient(90deg,${themeColor},${isKid?'#f59e0b':'#ec4899'})`}"></div>
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
        ${payBtn}
    `;

    const item = event.currentTarget;
    const key = type + ':' + nama;

    if (currentOpenName === nama && currentOpenType === type) {
        closeDetailCard();
        return;
    }
    closeDetailCard();
    closeTiketDetailCard();
    currentOpenName = nama;
    currentOpenType = type;
    item.classList.add(isKid ? 'kid-item-active' : 'name-item-active');

    const wrapper = document.createElement('div');
    wrapper.className = 'detail-inline-wrapper';
    wrapper.id = 'inlineDetailCard';
    wrapper.style.gridColumn = '1 / -1';
    wrapper.innerHTML = `<div class="detail-card detail-card-inline" style="border-color:${themeBorder}"><button class="detail-close-btn" onclick="closeDetailCard()"><i class="fas fa-times"></i></button>${cardHTML}</div>`;

    item.parentNode.insertBefore(wrapper, item.nextSibling);
    requestAnimationFrame(() => {
        wrapper.classList.add('open');
        setTimeout(() => wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150);
    });
}

function closeDetailCard() {
    const w = document.getElementById('inlineDetailCard');
    if (w) { w.classList.remove('open'); setTimeout(() => w.remove(), 250); }
    document.querySelectorAll('.name-item-active,.kid-item-active').forEach(e => e.classList.remove('name-item-active','kid-item-active'));
    currentOpenName = null;
    currentOpenType = null;
}

function closeTiketDetailCard() { closeDetailCard(); }

// ==========================================
// MODAL: BAYAR DEWASA
// ==========================================
let currentEditingPerson = null;

function openDewasaPayModal(nama, keluarga) {
    currentEditingPerson = nama;
    el.modalNama.value = nama;
    el.modalKeluarga.value = keluarga || '-';
    el.modalTanggal.value = new Date().toISOString().split('T')[0];
    el.modalJumlah.value = '';
    el.modalKeterangan.value = '';
    el.modalOverlay.classList.add('active');
}

function closeModal() { el.modalOverlay.classList.remove('active'); currentEditingPerson = null; }

async function saveDewasaPayment() {
    const jumlah = parseInt(el.modalJumlah.value) || 0;
    const tanggal = el.modalTanggal.value;
    if (jumlah <= 0) { showToast('Jumlah harus > 0!', 'error'); return; }
    showLoading(true);
    try {
        const params = new URLSearchParams({ action:'updatePayment', nama:currentEditingPerson, tanggal, jumlah:String(jumlah), keterangan:el.modalKeterangan.value });
        const r = await fetch(`${GAS_API_URL}?${params}`);
        const res = await r.json();
        if (!res.success) throw new Error(res.message);
        closeModal(); closeDetailCard(); await loadData(); showToast('Pembayaran berhasil!', 'success');
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    finally { showLoading(false); }
}

// ==========================================
// MODAL: TAMBAH TIKET ANAK
// ==========================================
function openAddTiketModal() {
    el.tiketNamaAnak.value = '';
    el.tiketKeluarga.value = '';
    const sel = el.tiketOrangTua;
    sel.innerHTML = '<option value="">-- Pilih orang tua --</option>';
    dewasaData.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.nama; opt.textContent = `${p.nama} (${p.keluarga})`;
        sel.appendChild(opt);
    });
    sel.onchange = function() {
        const found = dewasaData.find(p => p.nama === this.value);
        if (found) el.tiketKeluarga.value = found.keluarga || '';
    };
    el.modalTiketOverlay.classList.add('active');
}

function closeTiketModal() { el.modalTiketOverlay.classList.remove('active'); }

async function saveTiketAnak() {
    const namaAnak = el.tiketNamaAnak.value.trim();
    const keluarga = el.tiketKeluarga.value.trim();
    const orangTua = el.tiketOrangTua.value;
    if (!namaAnak) { showToast('Nama anak harus diisi!', 'error'); return; }
    showLoading(true);
    try {
        const params = new URLSearchParams({ action:'addTiketAnak', namaAnak, keluarga, orangTua });
        const r = await fetch(`${GAS_API_URL}?${params}`);
        const res = await r.json();
        if (!res.success) throw new Error(res.message);
        closeTiketModal(); await loadData(); showToast('Tiket anak ditambahkan!', 'success');
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    finally { showLoading(false); }
}

// ==========================================
// MODAL: BAYAR TIKET ANAK
// ==========================================
let currentEditingAnak = null;

function openTiketPayModal(nama, keluarga) {
    currentEditingAnak = nama;
    el.tiketPayNama.value = nama;
    el.tiketPayKeluarga.value = keluarga || '-';
    el.tiketPayTanggal.value = new Date().toISOString().split('T')[0];
    el.tiketPayJumlah.value = '';
    el.tiketPayKeterangan.value = '';
    el.modalTiketPayOverlay.classList.add('active');
}

function closeTiketPayModal() { el.modalTiketPayOverlay.classList.remove('active'); currentEditingAnak = null; }

async function saveTiketPayment() {
    const jumlah = parseInt(el.tiketPayJumlah.value) || 0;
    const tanggal = el.tiketPayTanggal.value;
    if (jumlah <= 0) { showToast('Jumlah harus > 0!', 'error'); return; }
    showLoading(true);
    try {
        const params = new URLSearchParams({ action:'updateTiketPayment', namaAnak:currentEditingAnak, tanggal, jumlah:String(jumlah), keterangan:el.tiketPayKeterangan.value });
        const r = await fetch(`${GAS_API_URL}?${params}`);
        const res = await r.json();
        if (!res.success) throw new Error(res.message);
        closeTiketPayModal(); closeDetailCard(); await loadData(); showToast('Pembayaran tiket berhasil!', 'success');
    } catch (e) { showToast('Gagal: ' + e.message, 'error'); }
    finally { showLoading(false); }
}

// ==========================================
// UTILITIES
// ==========================================
function esc(t) { return t ? t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;') : ''; }
function showLoading(s) { el.loadingOverlay.classList.toggle('hidden', !s); }
function showToast(msg, type='success') { el.toastMessage.textContent=msg; el.toast.className='toast'; if(type==='error') el.toast.classList.add('error'); el.toast.classList.add('show'); setTimeout(()=>el.toast.classList.remove('show'),3000); }
function formatRupiah(n) { return 'Rp ' + (n||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function debounce(fn, w) { let t; return function(...a) { clearTimeout(t); t = setTimeout(() => fn(...a), w); }; }
function animateValue(el, start, end, dur) {
    if (start === end) { el.textContent = end; return; }
    const inc = (end - start) / (dur / 16);
    let cur = start;
    const timer = setInterval(() => {
        cur += inc;
        if ((inc > 0 && cur >= end) || (inc < 0 && cur <= end)) { el.textContent = end; clearInterval(timer); }
        else el.textContent = Math.floor(cur);
    }, 16);
}
function fmtTgl(t) {
    if (!t) return '-';
    const B = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
    const p = t.split('-');
    return p.length===3 ? `${parseInt(p[2])} ${B[parseInt(p[1])-1]} ${p[0]}` : t;
}


