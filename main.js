// ============================================================
// DEEPRUST — main.js
// ============================================================

// ============================================================
// AUTH — Login & Register forms
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const loginForm    = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm)    initLoginForm(loginForm);
    if (registerForm) initRegisterForm(registerForm);
});

function initLoginForm(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn   = document.getElementById('loginBtn');
        const email = (document.getElementById('loginEmail') || form.querySelector('input[type="email"]')).value.trim();
        const pass  = (document.getElementById('loginPassword') || form.querySelector('input[type="password"]')).value;

        setAuthBtnLoading(btn, true, 'Signing in...');

        const fd = new FormData();
        fd.append('email', email);
        fd.append('password', pass);

        try {
            const res  = await fetch('/api/auth/login', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success) {
                window.location.href = data.redirect || '/home';
            } else {
                showAuthError(form, data.error || 'Login failed.');
            }
        } catch {
            showAuthError(form, 'Network error. Please try again.');
        } finally {
            setAuthBtnLoading(btn, false, 'Sign In');
        }
    });
}

function initRegisterForm(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn      = document.getElementById('registerBtn');
        const username = (document.getElementById('regUsername') || form.querySelectorAll('input')[0]).value.trim();
        const email    = (document.getElementById('regEmail')    || form.querySelectorAll('input')[1]).value.trim();
        const password = (document.getElementById('regPassword') || form.querySelectorAll('input')[2]).value;
        const confirm  = (document.getElementById('regConfirm')  || form.querySelectorAll('input')[3]).value;

        // Client-side quick checks
        if (password !== confirm) {
            showAuthError(form, 'Passwords do not match.');
            return;
        }
        if (password.length < 8) {
            showAuthError(form, 'Password must be at least 8 characters.');
            return;
        }

        setAuthBtnLoading(btn, true, 'Creating account...');

        const fd = new FormData();
        fd.append('username', username);
        fd.append('email',    email);
        fd.append('password', password);
        fd.append('confirm',  confirm);

        try {
            const res  = await fetch('/api/auth/register', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success) {
                window.location.href = data.redirect || '/home';
            } else {
                showAuthError(form, data.error || 'Registration failed.');
            }
        } catch {
            showAuthError(form, 'Network error. Please try again.');
        } finally {
            setAuthBtnLoading(btn, false, 'Create Account');
        }
    });
}

function setAuthBtnLoading(btn, loading, text) {
    btn.disabled     = loading;
    btn.textContent  = text;
    btn.style.opacity = loading ? '0.7' : '1';
}

function showAuthError(form, message) {
    // Remove any existing error
    form.querySelector('.auth-form-error')?.remove();
    const el = document.createElement('p');
    el.className = 'auth-form-error';
    el.style.cssText = `
        color: var(--accent-red);
        font-size: 0.8125rem;
        margin-top: 0.75rem;
        text-align: center;
        padding: 0.625rem 0.875rem;
        background: rgba(255,71,87,0.08);
        border: 1px solid rgba(255,71,87,0.25);
        border-radius: var(--radius-sm);
    `;
    el.textContent = message;
    form.appendChild(el);
}

// ============================================================
// IMAGE SCAN
// ============================================================
function initImageScan() {
    const uploadZone      = document.getElementById('uploadZone');
    const fileInput       = document.getElementById('fileInput');
    const uploadPreview   = document.getElementById('uploadPreview');
    const previewImage    = document.getElementById('previewImage');
    const removeBtn       = document.getElementById('removeBtn');
    const analyzeBtn      = document.getElementById('analyzeBtn');
    const resultContainer = document.getElementById('resultContainer');
    const newScanBtn      = document.getElementById('newScanBtn');

    uploadZone.addEventListener('click', (e) => {
        if (removeBtn.contains(e.target)) return;
        fileInput.click();
    });
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault(); uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => { if (e.target.files.length) handleFile(e.target.files[0]); });
    removeBtn.addEventListener('click', (e) => { e.stopPropagation(); resetUpload(); });
    analyzeBtn.addEventListener('click', () => analyzeFile('image'));
    newScanBtn.addEventListener('click', resetUpload);

    function handleFile(file) {
        if (!['image/jpeg','image/png','image/webp','image/bmp'].includes(file.type)) {
            showToast('Invalid format. Use JPG, PNG, or WEBP.', 'error'); return;
        }
        if (file.size > 10 * 1024 * 1024) { showToast('Image exceeds 10 MB limit.', 'error'); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            uploadPreview.hidden = false;
            uploadZone.querySelector('.upload-content').style.display = 'none';
            analyzeBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    function resetUpload() {
        fileInput.value = '';
        previewImage.src = '';
        uploadPreview.hidden = true;
        uploadZone.querySelector('.upload-content').style.display = '';
        analyzeBtn.disabled = true;
        resultContainer.hidden = true;
        setButtonIdle(analyzeBtn);
    }
}

// ============================================================
// AUDIO SCAN
// ============================================================
function initAudioScan() {
    const uploadZone      = document.getElementById('uploadZone');
    const fileInput       = document.getElementById('fileInput');
    const audioPreview    = document.getElementById('audioPreview');
    const audioFilename   = document.getElementById('audioFilename');
    const removeBtn       = document.getElementById('removeBtn');
    const analyzeBtn      = document.getElementById('analyzeBtn');
    const resultContainer = document.getElementById('resultContainer');
    const newScanBtn      = document.getElementById('newScanBtn');

    uploadZone.addEventListener('click', (e) => { if (removeBtn.contains(e.target)) return; fileInput.click(); });
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault(); uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => { if (e.target.files.length) handleFile(e.target.files[0]); });
    removeBtn.addEventListener('click', (e) => { e.stopPropagation(); resetUpload(); });
    analyzeBtn.addEventListener('click', () => analyzeFile('audio'));
    newScanBtn.addEventListener('click', resetUpload);

    function handleFile(file) {
        const validExts  = ['wav','mp3','flac','ogg','m4a'];
        const ext        = file.name.split('.').pop().toLowerCase();
        const validTypes = ['audio/wav','audio/mpeg','audio/flac','audio/ogg','audio/x-m4a','audio/mp4'];
        if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
            showToast('Invalid format. Use WAV, MP3, or FLAC.', 'error'); return;
        }
        if (file.size > 25 * 1024 * 1024) { showToast('Audio exceeds 25 MB limit.', 'error'); return; }
        audioFilename.textContent = file.name;
        audioPreview.hidden = false;
        uploadZone.querySelector('.upload-content').style.display = 'none';
        analyzeBtn.disabled = false;
    }

    function resetUpload() {
        fileInput.value = '';
        audioFilename.textContent = '';
        audioPreview.hidden = true;
        uploadZone.querySelector('.upload-content').style.display = '';
        analyzeBtn.disabled = true;
        resultContainer.hidden = true;
        setButtonIdle(analyzeBtn);
    }
}

// ============================================================
// ANALYZE — shared
// ============================================================
async function analyzeFile(type) {
    const analyzeBtn      = document.getElementById('analyzeBtn');
    const resultContainer = document.getElementById('resultContainer');
    const fileInput       = document.getElementById('fileInput');

    if (!fileInput.files.length) { showToast('Please select a file first.', 'error'); return; }

    setButtonLoading(analyzeBtn);
    resultContainer.hidden = true;

    const fd = new FormData();
    fd.append('file', fileInput.files[0]);

    const endpoint = type === 'image' ? '/api/analyze/image' : '/api/analyze/audio';

    try {
        const res = await fetch(endpoint, { method: 'POST', body: fd });

        // Handle 401 — redirect to login
        if (res.status === 401) { window.location.href = '/login'; return; }

        let data;
        try { data = await res.json(); }
        catch { throw new Error(`Unexpected server response (HTTP ${res.status}).`); }

        if (!res.ok || !data.success) {
            showToast(data.error || `Error ${res.status}. Please try again.`, 'error');
            return;
        }
        showResult(data);
    } catch (err) {
        console.error('[DEEPRUST]', err);
        showToast(err.message.includes('fetch') ? 'Cannot reach server.' : err.message, 'error');
    } finally {
        setButtonIdle(analyzeBtn);
    }
}

// ============================================================
// BUTTON STATE HELPERS
// ============================================================
function setButtonLoading(btn) {
    btn.querySelector('.btn-text').hidden  = true;
    btn.querySelector('.btn-loader').hidden = false;
    btn.disabled = true;
}
function setButtonIdle(btn) {
    btn.querySelector('.btn-text').hidden  = false;
    btn.querySelector('.btn-loader').hidden = true;
    btn.disabled = false;
}

// ============================================================
// SHOW RESULT
// ============================================================
function showResult(data) {
    const resultContainer = document.getElementById('resultContainer');
    const resultIcon      = document.getElementById('resultIcon');
    const resultTitle     = document.getElementById('resultTitle');
    const confidenceFill  = document.getElementById('confidenceFill');
    const confidenceValue = document.getElementById('confidenceValue');
    const resultDetails   = document.getElementById('resultDetails');

    const isReal  = data.result.toLowerCase().includes('real');
    const cls     = isReal ? 'real' : 'fake';

    resultIcon.className  = `result-icon ${cls}`;
    resultTitle.className = `result-title ${cls}`;
    resultTitle.textContent = isReal ? '✔ Authentic Content' : '✘ AI Generated Detected';

    confidenceFill.className   = `confidence-fill ${cls}`;
    confidenceFill.style.width = '0%';
    confidenceValue.textContent = `${data.confidence}% Confidence`;

    requestAnimationFrame(() => requestAnimationFrame(() => {
        confidenceFill.style.width = `${data.confidence}%`;
    }));

    let html = '<div style="display:flex;flex-direction:column;gap:0.4rem;">';
    for (const [k, v] of Object.entries(data.details || {})) {
        html += `<div><strong>${formatKey(k)}:</strong> ${Array.isArray(v) ? v.join(', ') : v}</div>`;
    }
    html += '</div>';
    resultDetails.innerHTML = html;

    resultContainer.hidden = false;
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = 'error') {
    document.getElementById('deeprust-toast')?.remove();
    const toast = document.createElement('div');
    toast.id = 'deeprust-toast';
    const isErr = type === 'error';
    toast.style.cssText = `
        position:fixed; bottom:calc(1.5rem + env(safe-area-inset-bottom,0px));
        left:50%; transform:translateX(-50%) translateY(80px);
        background:var(--bg-card,#0f1520);
        border:1px solid ${isErr ? 'var(--accent-red,#ff4757)' : 'var(--accent-green,#00d26a)'};
        color:${isErr ? 'var(--accent-red,#ff4757)' : 'var(--accent-green,#00d26a)'};
        padding:.8rem 1.375rem; border-radius:12px; font-size:.875rem;
        font-family:'Inter',sans-serif; box-shadow:0 8px 32px rgba(0,0,0,.55);
        z-index:9999; max-width:min(90vw,360px); text-align:center;
        transition:transform .3s cubic-bezier(.34,1.56,.64,1); pointer-events:none;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }));
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(80px)';
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 4000);
}

// ============================================================
// UTILS
// ============================================================
function formatKey(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Parallax (landing page only)
document.addEventListener('mousemove', (e) => {
    const mx = (e.clientX - innerWidth  / 2) * 0.01;
    const my = (e.clientY - innerHeight / 2) * 0.01;
    document.querySelectorAll('.float-circle').forEach((c, i) => {
        c.style.transform = `translate(${mx*(i+1)*.5}px,${my*(i+1)*.5}px)`;
    });
});
