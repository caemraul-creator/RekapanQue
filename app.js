/**
 * Rekapan Iuran Piknik Keluarga - Frontend App
 * Connects to Google Apps Script Web API
 */

// ==========================================
// CONFIGURATION
// ==========================================
// Ganti dengan URL Web App Google Apps Script Anda setelah deploy
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxw0dq4knjgiLlltgbDycMfzRfu_wNDlgf-mMpHZ0pVodBzTm7KNfxU5xR5yL8JX0Wn/exec';

// Jumlah iuran per orang (sesuaikan)
const IURAN_PER_ORANG = 260000;

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
    tableBody: document.getElementById('tableBody'),
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
    // Search
    elements.searchInput.addEventListener('input', debounce(filterData, 300));
    
    // Refresh
    elements.btnRefresh.addEventListener('click', loadData);
    
    // Filter buttons
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            filterData();
        });
    });
    
    // Modal
    elements.btnCloseModal.addEventListener('click', closeModal);
    elements.btnCancel.addEventListener('click', closeModal);
    elements.modalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.modalOverlay) closeModal();
    });
    
    // Save payment
    elements.btnSave.addEventListener('click', savePayment);
}

// ==========================================
// DATA LOADING
// ==========================================
async function loadData() {
    showLoading(true);
    
    try {
        // Untuk demo, gunakan data sample jika API belum di-setup
        if (GAS_API_URL.includes('xxxxxxxx')) {
            console.log('API URL masih default, menggunakan data sample...');
            await new Promise(r => setTimeout(r, 1000));
            allData = getSampleData();
        } else {
            const response = await fetch(`${GAS_API_URL}?action=getData`);
            const result = await response.json();
            if (result.success) {
                allData = result.data;
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
        // Fallback ke data sample
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
        // Search filter
        const matchSearch = !searchTerm || 
            person.nama.toLowerCase().includes(searchTerm) ||
            person.keluarga.toLowerCase().includes(searchTerm);
        
        // Status filter
        let matchStatus = true;
        if (currentFilter === 'lunas') matchStatus = person.status === 'Lunas';
        if (currentFilter === 'belum') matchStatus = person.status === 'Belum Lunas';
        
        return matchSearch && matchStatus;
    });
    
    renderTable(filtered);
}

function renderTable(data) {
    if (data.length === 0) {
        elements.tableContainer.style.display = 'none';
        elements.emptyState.style.display = 'block';
        return;
    }
    
    elements.tableContainer.style.display = 'block';
    elements.emptyState.style.display = 'none';
    
    elements.tableBody.innerHTML = data.map((person, idx) => {
        const statusClass = person.status === 'Lunas' ? 'status-lunas' : 'status-belum';
        const totalFormatted = formatRupiah(person.total || 0);
        
        // Generate payment cells for dates (if available)
        let paymentCells = '';
        if (person.pembayaran && person.pembayaran.length > 0) {
            paymentCells = person.pembayaran.map(p => {
                const paid = p.jumlah > 0;
                return `<td class="payment-cell ${paid ? 'paid' : 'unpaid'}" 
                           onclick="openPaymentModal('${person.nama}', '${person.keluarga}', '${p.tanggal}')">
                    ${paid ? `<i class="fas fa-check-circle"></i> ${formatRupiah(p.jumlah)}` : '-'}
                </td>`;
            }).join('');
        }
        
        return `
            <tr>
                <td class="col-no">${person.no || idx + 1}</td>
                <td class="col-keluarga">${person.keluarga || '-'}</td>
                <td class="col-nama">${person.nama}</td>
                <td class="col-status"><span class="status-badge ${statusClass}">${person.status || 'Belum Lunas'}</span></td>
                <td class="col-total">${totalFormatted}</td>
                <td>${paymentCells || '<em>Belum ada data</em>'}</td>
            </tr>
        `;
    }).join('');
}

// ==========================================
// MODAL & PAYMENT
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
                if (person.total >= IURAN_PER_ORANG) person.status = 'Lunas';
            }
        } else {
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updatePayment',
                    nama: currentEditingPerson,
                    tanggal,
                    jumlah,
                    keterangan
                })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);
        }
        
        closeModal();
        updateStats();
        filterData();
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
// SAMPLE DATA (Demo Mode)
// ==========================================
function getSampleData() {
    return [
        { no: 1, keluarga: 'De Is', nama: 'De Istiqomah', status: 'Lunas', total: 50000, pembayaran: [{ tanggal: '2026-06-27', jumlah: 50000, keterangan: 'Lunas' }] },
        { no: 2, keluarga: 'De Is', nama: 'Ica', status: 'Belum Lunas', total: 0, pembayaran: [] },
        { no: 3, keluarga: 'Dedi', nama: 'Dedi', status: 'Lunas', total: 50000, pembayaran: [{ tanggal: '2026-06-28', jumlah: 50000, keterangan: 'Transfer' }] },
        { no: 4, keluarga: 'Dedi', nama: 'Faza', status: 'Belum Lunas', total: 0, pembayaran: [] },
        { no: 5, keluarga: 'Syarif', nama: 'Syarief', status: 'Lunas', total: 50000, pembayaran: [{ tanggal: '2026-06-27', jumlah: 50000, keterangan: 'Cash' }] },
        { no: 6, keluarga: 'Syarif', nama: 'Adey', status: 'Belum Lunas', total: 0, pembayaran: [] },
        { no: 7, keluarga: 'Bella', nama: 'Maimon', status: 'Lunas', total: 50000, pembayaran: [{ tanggal: '2026-06-29', jumlah: 50000, keterangan: 'Transfer' }] },
        { no: 8, keluarga: 'Bella', nama: 'Bella', status: 'Belum Lunas', total: 0, pembayaran: [] },
        { no: 9, keluarga: 'Bella', nama: 'De Solekan', status: 'Belum Lunas', total: 0, pembayaran: [] },
        { no: 10, keluarga: 'Bella', nama: 'De Nur', status: 'Belum Lunas', total: 0, pembayaran: [] },
        { no: 11, keluarga: 'Bella', nama: 'Mujib', status: 'Belum Lunas', total: 0, pembayaran: [] },
        { no: 12, keluarga: 'De Arif', nama: 'De Arif', status: 'Lunas', total: 50000, pembayaran: [{ tanggal: '2026-06-30', jumlah: 50000, keterangan: 'Cash' }] },
        { no: 13, keluarga: 'De Arif', nama: 'De Khanif', status: 'Belum Lunas', total: 0, pembayaran: [] },
        { no: 14, keluarga: 'De Arif', nama: 'Lina', status: 'Belum Lunas', total: 0, pembayaran: [] },
        { no: 15, keluarga: 'Iwan', nama: 'Iwan', status: 'Lunas', total: 50000, pembayaran: [{ tanggal: '2026-07-01', jumlah: 50000, keterangan: 'Transfer' }] },
        { no: 16, keluarga: 'Iwan', nama: 'Vira', status: 'Belum Lunas', total: 0, pembayaran: [] },
        { no: 17, keluarga: 'Imdad', nama: 'Imdad', status: 'Lunas', total: 50000, pembayaran: [{ tanggal: '2026-07-02', jumlah: 50000, keterangan: 'Cash' }] },
        { no: 18, keluarga: 'Imdad', nama: 'Vina', status: 'Belum Lunas', total: 0, pembayaran: [] },
        { no: 19, keluarga: 'De Tando', nama: 'De Tandho', status: 'Lunas', total: 50000, pembayaran: [{ tanggal: '2026-07-03', jumlah: 50000, keterangan: 'Transfer' }] },
        { no: 20, keluarga: 'De Tando', nama: 'De Hidayah', status: 'Belum Lunas', total: 0, pembayaran: [] },
    ];
}