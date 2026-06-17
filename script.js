// ==================== DADOS DE HOSPITAIS ====================
const mockHospitals = [
    { id: 1, name: "Hospital das Clínicas", lat: -23.5613, lng: -46.6729, address: "Av. Dr. Enéas de Carvalho Aguiar, 255", queue: 15 },
    { id: 2, name: "Hospital Geral de Fortaleza", lat: -3.7319, lng: -38.5267, address: "Rua Ávila Goulart, 900", queue: 8 },
    { id: 3, name: "Hospital de Base do DF", lat: -15.7942, lng: -47.8822, address: "SMHS 101", queue: 22 },
    { id: 4, name: "Hospital São Paulo", lat: -23.5989, lng: -46.6422, address: "Rua Napoleão de Barros, 715", queue: 12 },
    { id: 5, name: "Hospital Albert Einstein - Rio", lat: -22.9068, lng: -43.1729, address: "Av. das Américas, 4666", queue: 5 }
];

// ==================== VARIÁVEIS GLOBAIS ====================
let currentScreen = 'splash';
let userData = null;
let userLocation = null;
let map = null;
let markers = [];
let transportMode = 'car';
let hospitals = [];

// ==================== VALIDAÇÕES ====================
function validateCPF(cpf) {
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length !== 11 || /^(\d)\1{10}$/.test(numbers)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(numbers.charAt(i)) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    digit1 = digit1 >= 10 ? 0 : digit1;
    if (digit1 !== parseInt(numbers.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(numbers.charAt(i)) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    digit2 = digit2 >= 10 ? 0 : digit2;
    return digit2 === parseInt(numbers.charAt(10));
}

function validateRG(rg) {
    const numbers = rg.replace(/\D/g, '');
    return numbers.length >= 7 && numbers.length <= 9 && !/^(\d)\1+$/.test(numbers);
}

function validatePhone(phone) {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length !== 10 && numbers.length !== 11) return false;
    const ddd = parseInt(numbers.substring(0, 2));
    if (ddd < 11 || ddd > 99) return false;
    if (numbers.length === 11 && numbers.charAt(2) !== '9') return false;
    return true;
}

function validateCEP(cep) {
    const numbers = cep.replace(/\D/g, '');
    return numbers.length === 8 && !/^(\d)\1{7}$/.test(numbers);
}

function validateFullName(name) {
    const trimmed = name.trim();
    return trimmed.length >= 3 && trimmed.includes(' ') && /^[a-záàâãéèêíïóôõöúçñ\s]+$/i.test(trimmed);
}

// ==================== FORMATAÇÃO ====================
function formatCPF(value) {
    const numbers = value.replace(/\D/g, '').substring(0, 11);
    return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatRG(value) {
    const numbers = value.replace(/\D/g, '').substring(0, 9);
    return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1})$/, '$1-$2');
}

function formatPhone(value) {
    const numbers = value.replace(/\D/g, '').substring(0, 11);
    return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
}

function formatCEP(value) {
    const numbers = value.replace(/\D/g, '').substring(0, 8);
    return numbers.replace(/(\d{5})(\d)/, '$1-$2');
}

// ==================== CÁLCULOS ====================
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function calculateTravelTime(distance, mode) {
    const speeds = { walk: 5, bike: 15, car: 40 };
    return Math.round((distance / speeds[mode]) * 60);
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ==================== NAVEGAÇÃO DE TELAS ====================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    currentScreen = screenId;
}

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const savedUser = localStorage.getItem('radarSaudeUser');
        if (savedUser) {
            userData = JSON.parse(savedUser);
            showScreen('main-screen');
            initMainScreen();
        } else {
            showScreen('login-screen');
        }
    }, 2000);
    
    setupLoginForm();
    setupMainScreen();
    setupProfileModal();
});

// ==================== LOGIN ====================
function setupLoginForm() {
    const form = document.getElementById('login-form');
    const cpfInput = document.getElementById('cpf');
    const rgInput = document.getElementById('rg');
    const phoneInput = document.getElementById('phone');
    const cepInput = document.getElementById('cep');
    const disabilityCheckbox = document.getElementById('has-disability');
    const proofSection = document.getElementById('disability-proof-section');
    const uploadBtn = document.getElementById('upload-proof-btn');
    const proofInput = document.getElementById('disability-proof');
    
    cpfInput.addEventListener('input', (e) => {
        e.target.value = formatCPF(e.target.value);
    });
    
    rgInput.addEventListener('input', (e) => {
        e.target.value = formatRG(e.target.value);
    });
    
    phoneInput.addEventListener('input', (e) => {
        e.target.value = formatPhone(e.target.value);
    });
    
    cepInput.addEventListener('input', (e) => {
        e.target.value = formatCEP(e.target.value);
    });
    
    disabilityCheckbox.addEventListener('change', (e) => {
        proofSection.style.display = e.target.checked ? 'block' : 'none';
    });
    
    uploadBtn.addEventListener('click', () => {
        proofInput.click();
    });
    
    proofInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadBtn.classList.add('success');
            uploadBtn.innerHTML = `<span>✅</span> ${file.name}`;
        }
    });
    
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            input.type = input.type === 'password' ? 'text' : 'password';
            btn.textContent = input.type === 'password' ? '👁️' : '🙈';
        });
    });
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const cpf = cpfInput.value;
        const rg = rgInput.value;
        const phone = phoneInput.value;
        const cep = cepInput.value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const hasDisability = disabilityCheckbox.checked;
        
        let errors = {};
        
        if (!validateFullName(name)) {
            errors.name = 'Por favor, insira seu nome completo (nome e sobrenome)';
        }
        if (!validateCPF(cpf)) {
            errors.cpf = 'CPF inválido. Verifique os dígitos digitados';
        }
        if (!validateRG(rg)) {
            errors.rg = 'RG inválido. Digite entre 7 e 9 dígitos válidos';
        }
        if (!validatePhone(phone)) {
            errors.phone = 'Telefone inválido. Verifique o DDD e o número';
        }
        if (cep && !validateCEP(cep)) {
            errors.cep = 'CEP inválido. Digite um CEP válido';
        }
        if (!password || password.length < 6) {
            errors.password = 'A senha deve ter no mínimo 6 caracteres';
        }
        if (password !== confirmPassword) {
            errors['confirm-password'] = 'As senhas não coincidem';
        }
        if (hasDisability && !proofInput.files[0]) {
            showToast('Por favor, envie o comprovante de deficiência', 'error');
            return;
        }
        
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-group input').forEach(el => el.classList.remove('error'));
        
        if (Object.keys(errors).length > 0) {
            for (let field in errors) {
                const errorEl = document.getElementById(`${field}-error`);
                if (errorEl) {
                    errorEl.textContent = errors[field];
                    document.getElementById(field).classList.add('error');
                }
            }
            return;
        }
        
        userData = { name, cpf, rg, phone, cep, password, hasDisability };
        localStorage.setItem('radarSaudeUser', JSON.stringify(userData));
        
        showScreen('main-screen');
        initMainScreen();
        showToast('Login realizado com sucesso!', 'success');
    });
}

// ==================== TELA PRINCIPAL ====================
function setupMainScreen() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const logoutBtn = document.getElementById('logout-btn');
    const profileBtn = document.getElementById('profile-btn');
    
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    
    logoutBtn.addEventListener('click', () => {
        userData = null;
        localStorage.removeItem('radarSaudeUser');
        showScreen('login-screen');
        showToast('Você saiu do sistema', 'info');
    });
    
    profileBtn.addEventListener('click', () => {
        openProfileModal();
    });
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
            document.getElementById(`${view}-view`).classList.add('active');
        });
    });
    
    document.querySelectorAll('.transport-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.transport-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            transportMode = btn.dataset.mode;
            updateHospitalDistances();
        });
    });
}

function initMainScreen() {
    getUserLocation();
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = [position.coords.latitude, position.coords.longitude];
                document.getElementById('user-location').textContent = 
                    `${userLocation[0].toFixed(4)}, ${userLocation[1].toFixed(4)}`;
                loadHospitals();
            },
            () => {
                userLocation = [-23.3045, -51.1696];
                document.getElementById('user-location').textContent = 
                    `${userLocation[0].toFixed(4)}, ${userLocation[1].toFixed(4)}`;
                loadHospitals();
                showToast('📍 Usando localização padrão', 'info');
            }
        );
    } else {
        userLocation = [-23.3045, -51.1696];
        loadHospitals();
    }
}

function loadHospitals() {
    hospitals = mockHospitals.map(h => {
        const distance = calculateDistance(userLocation[0], userLocation[1], h.lat, h.lng);
        return {
            ...h,
            distance: Number(distance.toFixed(1)),
            travelTime: calculateTravelTime(distance, transportMode)
        };
    });
    
    hospitals.sort((a, b) => a.distance - b.distance);
    
    document.getElementById('hospital-count').textContent = `${hospitals.length} Hospitais`;
    document.getElementById('hospital-list-count').textContent = `${hospitals.length} hospitais públicos encontrados`;
    
    initMap();
    renderHospitalList();
}

function updateHospitalDistances() {
    hospitals = hospitals.map(h => ({
        ...h,
        travelTime: calculateTravelTime(h.distance, transportMode)
    }));
    renderHospitalList();
}

function initMap() {
    if (map) {
        map.remove();
    }
    
    map = L.map('map').setView(userLocation, 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    L.marker(userLocation, {
        icon: L.divIcon({
            className: 'user-marker',
            html: '📍',
            iconSize: [30, 30]
        })
    }).addTo(map).bindPopup('Você está aqui');
    
    hospitals.forEach(h => {
        const marker = L.marker([h.lat, h.lng], {
            icon: L.divIcon({
                className: 'hospital-marker',
                html: '🏥',
                iconSize: [30, 30]
            })
        }).addTo(map);
        
        marker.bindPopup(`
            <strong>${h.name}</strong><br>
            ${h.address}<br>
            <em>${h.distance}km - ${h.travelTime}min</em><br>
            Fila: ${h.queue} pessoas
        `);
        
        markers.push(marker);
    });
}

function renderHospitalList() {
    const list = document.getElementById('hospital-list');
    list.innerHTML = '';
    
    hospitals.forEach((h, index) => {
        const card = document.createElement('div');
        card.style.cssText = 'background: white; padding: 16px; border-radius: 12px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer;';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="background: #667eea; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">${index + 1}</span>
                        <strong style="font-size: 16px;">${h.name}</strong>
                    </div>
                    <p style="font-size: 14px; color: #666; margin-bottom: 4px;">📍 ${h.address}</p>
                    <p style="font-size: 13px; color: #999;">🚗 ${h.distance}km - ${h.travelTime}min | Fila: ${h.queue} pessoas</p>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

// ==================== MODAL DE PERFIL ====================
function setupProfileModal() {
    const modal = document.getElementById('profile-modal');
    const closeBtn = document.querySelector('.modal-close');
    const closeProfileBtn = document.getElementById('close-profile-btn');
    const saveBtn = document.getElementById('save-profile-btn');
    const editCepBtn = document.getElementById('edit-cep-btn');
    const editPasswordBtn = document.getElementById('edit-password-btn');
    const uploadPhotoBtn = document.getElementById('upload-photo-btn');
    const photoInput = document.getElementById('profile-photo-input');
    
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    closeProfileBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    let isEditingCep = false;
    let isEditingPassword = false;
    
    editCepBtn.addEventListener('click', () => {
        isEditingCep = !isEditingCep;
        const cepInput = document.getElementById('profile-cep');
        cepInput.readOnly = !isEditingCep;
        editCepBtn.textContent = isEditingCep ? 'Cancelar' : 'Editar';
    });
    
    editPasswordBtn.addEventListener('click', () => {
        isEditingPassword = !isEditingPassword;
        const passwordFields = document.getElementById('password-edit-fields');
        passwordFields.style.display = isEditingPassword ? 'block' : 'none';
        editPasswordBtn.textContent = isEditingPassword ? 'Cancelar' : 'Alterar Senha';
        
        if (!isEditingPassword) {
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-new-password').value = '';
        }
    });
    
    uploadPhotoBtn.addEventListener('click', () => {
        photoInput.click();
    });
    
    photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.getElementById('profile-photo-img');
                img.src = e.target.result;
                img.style.display = 'block';
                document.querySelector('.profile-photo-placeholder').style.display = 'none';
                userData.profilePhoto = e.target.result;
            };
            reader.readAsDataURL(file);
            showToast('Foto carregada! Lembre-se de salvar as alterações', 'success');
        }
    });
    
    saveBtn.addEventListener('click', () => {
        const cep = document.getElementById('profile-cep').value;
        
        if (isEditingCep && cep && !validateCEP(cep)) {
            showToast('CEP inválido', 'error');
            return;
        }
        
        if (isEditingPassword) {
            const current = document.getElementById('current-password').value;
            const newPass = document.getElementById('new-password').value;
            const confirm = document.getElementById('confirm-new-password').value;
            
            if (current !== userData.password) {
                showToast('Senha atual incorreta', 'error');
                return;
            }
            
            if (newPass.length < 6) {
                showToast('A nova senha deve ter no mínimo 6 caracteres', 'error');
                return;
            }
            
            if (newPass !== confirm) {
                showToast('As senhas não coincidem', 'error');
                return;
            }
            
            userData.password = newPass;
        }
        
        userData.cep = cep;
        localStorage.setItem('radarSaudeUser', JSON.stringify(userData));
        
        showToast('Perfil atualizado com sucesso!', 'success');
        modal.classList.remove('active');
        isEditingCep = false;
        isEditingPassword = false;
    });
}

function openProfileModal() {
    const modal = document.getElementById('profile-modal');
    
    document.getElementById('profile-name').value = userData.name;
    document.getElementById('profile-cpf').value = userData.cpf;
    document.getElementById('profile-rg').value = userData.rg;
    document.getElementById('profile-phone').value = userData.phone;
    document.getElementById('profile-cep').value = userData.cep || '';
    
    if (userData.profilePhoto) {
        const img = document.getElementById('profile-photo-img');
        img.src = userData.profilePhoto;
        img.style.display = 'block';
        document.querySelector('.profile-photo-placeholder').style.display = 'none';
    }
    
    modal.classList.add('active');
}
