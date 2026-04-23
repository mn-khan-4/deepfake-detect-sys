// ============================================================
// DEEPRUST — main.js
// Connects the UI to the FastAPI backend (/api/analyze/image
// and /api/analyze/audio).  Design & CSS are untouched.
// ============================================================

// ============================================================
// IMAGE SCAN  —  called by image_scan.html → initImageScan()
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

    let selectedFile = null;

    // ---- Upload zone interactions ----------------------------------------
    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });

    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetUpload();
    });

    analyzeBtn.addEventListener('click', () => analyzeFile('image'));
    newScanBtn.addEventListener('click', resetUpload);

    // ---- File handling ---------------------------------------------------
    function handleFile(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];
        if (!validTypes.includes(file.type)) {
            showToast('Invalid file format. Please use JPG, PNG, or WEBP.', 'error');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showToast('Image is too large. Maximum size is 10 MB.', 'error');
            return;
        }

        selectedFile = file;
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
        selectedFile = null;
        fileInput.value = '';
        previewImage.src = '';
        uploadPreview.hidden = true;
        uploadZone.querySelector('.upload-content').style.display = '';
        analyzeBtn.disabled = true;
        resultContainer.hidden = true;
        
        // Restore upload UI visibility
        const uploadCont = document.getElementById('uploadContainer');
        if (uploadCont) uploadCont.style.display = '';
        if (analyzeBtn) analyzeBtn.style.display = '';
        const modelSection = document.querySelector('.model-section');
        if (modelSection) modelSection.style.display = '';
    }
}

// ============================================================
// AUDIO SCAN  —  called by audio_scan.html → initAudioScan()
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

    let selectedFile = null;

    // ---- Upload zone interactions ----------------------------------------
    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });

    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetUpload();
    });

    analyzeBtn.addEventListener('click', () => analyzeFile('audio'));
    newScanBtn.addEventListener('click', resetUpload);

    // ---- File handling ---------------------------------------------------
    function handleFile(file) {
        const validTypes = ['audio/wav', 'audio/mpeg', 'audio/flac', 'audio/ogg', 'audio/x-m4a', 'audio/mp3'];
        const validExts  = ['wav', 'mp3', 'flac', 'ogg', 'm4a'];
        const ext        = file.name.split('.').pop().toLowerCase();

        if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
            showToast('Invalid file format. Please use WAV, MP3, or FLAC.', 'error');
            return;
        }
        if (file.size > 25 * 1024 * 1024) {
            showToast('Audio file is too large. Maximum size is 25 MB.', 'error');
            return;
        }

        selectedFile = file;
        audioFilename.textContent = file.name;
        audioPreview.hidden = false;
        uploadZone.querySelector('.upload-content').style.display = 'none';
        analyzeBtn.disabled = false;
    }

    function resetUpload() {
        selectedFile = null;
        fileInput.value = '';
        audioFilename.textContent = '';
        audioPreview.hidden = true;
        uploadZone.querySelector('.upload-content').style.display = '';
        analyzeBtn.disabled = true;
        resultContainer.hidden = true;
        
        // Restore upload UI visibility
        const uploadCont = document.getElementById('uploadContainer');
        if (uploadCont) uploadCont.style.display = '';
        if (analyzeBtn) analyzeBtn.style.display = '';
        const modelSection = document.querySelector('.model-section');
        if (modelSection) modelSection.style.display = '';
    }
}

// ============================================================
// ANALYZE FILE  —  shared by both scan pages
// Sends the file to the appropriate backend endpoint and
// calls showResult() or showToast() based on the response.
// ============================================================
async function analyzeFile(type) {
    const analyzeBtn      = document.getElementById('analyzeBtn');
    const btnText         = analyzeBtn.querySelector('.btn-text');
    const btnLoader       = analyzeBtn.querySelector('.btn-loader');
    const resultContainer = document.getElementById('resultContainer');
    const fileInput       = document.getElementById('fileInput');

    if (!fileInput.files.length) {
        showToast('Please select a file first.', 'error');
        return;
    }

    // ---- Show loading state ---------------------------------------------
    btnText.hidden   = true;
    btnLoader.hidden = false;
    analyzeBtn.disabled = true;
    resultContainer.hidden = true;   // hide previous result while re-scanning

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    // ---- Endpoint map ---------------------------------------------------
    const endpoint = type === 'image' ? '/api/analyze/image' : '/api/analyze/audio';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
            // Do NOT set Content-Type header — browser sets it with boundary automatically
        });

        // Parse JSON regardless of status code (error bodies are also JSON)
        let data;
        try {
            data = await response.json();
        } catch {
            throw new Error(`Server returned non-JSON response (HTTP ${response.status})`);
        }

        if (!response.ok || !data.success) {
            // Use server's error message if available, otherwise generic fallback
            const msg = data.error || `Server error (HTTP ${response.status}). Please try again.`;
            showToast(msg, 'error');
            return;
        }

        showResult(data);

    } catch (err) {
        // Network failure, DNS error, server completely down, etc.
        console.error('[DEEPRUST] analyzeFile error:', err);
        showToast(
            err.message.includes('Failed to fetch')
                ? 'Cannot reach the server. Please check your connection.'
                : err.message,
            'error'
        );
    } finally {
        // Always restore button state
        btnText.hidden   = false;
        btnLoader.hidden = true;
        analyzeBtn.disabled = false;
    }
}

// ============================================================
// SHOW RESULT  —  populates the result-container in the UI
// Expects: { success, result, confidence, details }
// ============================================================
function showResult(data) {
    const resultContainer = document.getElementById('resultContainer');
    const resultIcon      = document.getElementById('resultIcon');
    const resultTitle     = document.getElementById('resultTitle');
    const confidenceFill  = document.getElementById('confidenceFill');
    const confidenceValue = document.getElementById('confidenceValue');
    const resultDetails   = document.getElementById('resultDetails');

    // "real" or "fake" – normalise to lower-case
    const isReal      = data.result.toLowerCase().includes('real');
    const resultClass = isReal ? 'real' : 'fake';

    // ---- Icon & title ---------------------------------------------------
    resultIcon.className  = `result-icon ${resultClass}`;
    resultTitle.className = `result-title ${resultClass}`;
    resultTitle.textContent = isReal ? '✔ Authentic Content' : '✘ AI Generated Detected';

    // ---- Confidence bar (animated) --------------------------------------
    confidenceFill.className    = `confidence-fill ${resultClass}`;
    confidenceFill.style.width  = '0%';   // reset for animation
    confidenceValue.textContent = `${data.confidence}% Confidence`;

    // Trigger CSS transition after a brief frame delay
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            confidenceFill.style.width = `${data.confidence}%`;
        });
    });

    // ---- Detail rows & Analysis -----------------------------------------
    let detailsHtml = '<div class="analysis-section" style="margin-top: 1.5rem; padding: 1.5rem; background: rgba(255,255,255,0.03); border-radius: var(--radius-md, 12px); border: 1px solid rgba(255,255,255,0.05);">';
    detailsHtml += '<h3 style="margin-top: 0; margin-bottom: 1rem; font-size: 1.1rem; font-weight: 600; letter-spacing: 0.5px;">Analysis Report</h3>';
    
    // Details grid
    detailsHtml += '<div style="display:flex;flex-direction:column;gap:0.75rem; margin-bottom: 1.5rem;">';
    for (const [key, value] of Object.entries(data.details || {})) {
        const label = formatKey(key);
        const val   = Array.isArray(value) ? value.join(', ') : value;
        detailsHtml += `<div style="display:flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
            <span style="color: var(--text-secondary, rgba(255,255,255,0.6)); font-size: 0.9rem;">${label}</span>
            <strong style="font-size: 0.95rem;">${val}</strong>
        </div>`;
    }
    detailsHtml += '</div>';
    
    // Explanation
    const scoreColor = isReal ? 'var(--accent-green, #00d26a)' : 'var(--accent-red, #ff4757)';
    const reasonText = !isReal
        ? 'Our analysis detected significant artificial patterns, synthetic noise profiles, or anomalies typical of AI-generation tools.'
        : 'Our analysis found natural inconsistencies and an absence of typical artificial signatures, strongly suggesting real human origin.';
        
    detailsHtml += `<div style="padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">
        <p style="margin: 0 0 0.5rem 0; line-height: 1.6; font-size: 0.95rem; color: rgba(255,255,255,0.8);">
            <strong style="display: block; margin-bottom: 0.25rem;">Why is it classified as ${!isReal ? 'AI Generated' : 'Authentic'}?</strong>
            ${reasonText}
        </p>
        <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary, rgba(255,255,255,0.5));">
            Conclusion reached with <strong style="color: ${scoreColor}">${data.confidence}%</strong> confidence.
        </p>
    </div>`;
    
    detailsHtml += '</div>';
    resultDetails.innerHTML = detailsHtml;

    // ---- Show & scroll --------------------------------------------------
    resultContainer.hidden = false;
    
    // Hide upload UI to make it look like a new page
    const uploadContainer = document.getElementById('uploadContainer');
    const analyzeBtn      = document.getElementById('analyzeBtn');
    const modelSection    = document.querySelector('.model-section');
    
    if (uploadContainer) uploadContainer.style.display = 'none';
    if (analyzeBtn) analyzeBtn.style.display = 'none';
    if (modelSection) modelSection.style.display = 'none';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// TOAST NOTIFICATIONS  —  replaces the bare alert() calls
// Creates a styled toast that auto-dismisses after 4 s.
// ============================================================
function showToast(message, type = 'error') {
    // Remove existing toast if present
    const existing = document.getElementById('deeprust-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'deeprust-toast';

    const isError = type === 'error';
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: ${isError ? 'var(--bg-card, #0f1520)' : 'var(--bg-card, #0f1520)'};
        border: 1px solid ${isError ? 'var(--accent-red, #ff4757)' : 'var(--accent-green, #00d26a)'};
        color: ${isError ? 'var(--accent-red, #ff4757)' : 'var(--accent-green, #00d26a)'};
        padding: 0.875rem 1.5rem;
        border-radius: var(--radius-md, 12px);
        font-size: 0.875rem;
        font-family: 'Inter', sans-serif;
        box-shadow: var(--shadow-lg, 0 8px 32px rgba(0,0,0,.5));
        z-index: 9999;
        max-width: 90vw;
        text-align: center;
        transition: transform 0.3s cubic-bezier(.34,1.56,.64,1);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });
    });

    // Auto-dismiss after 4 s
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(100px)';
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 4000);
}

// ============================================================
// FORMAT KEY  —  "ai_generated" → "Ai Generated"
// ============================================================
function formatKey(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// ============================================================
// PARALLAX BACKGROUND  —  landing page floating circles
// ============================================================
document.addEventListener('mousemove', (e) => {
    const moveX = (e.clientX - window.innerWidth  / 2) * 0.01;
    const moveY = (e.clientY - window.innerHeight / 2) * 0.01;

    document.querySelectorAll('.float-circle').forEach((circle, index) => {
        const factor = (index + 1) * 0.5;
        circle.style.transform = `translate(${moveX * factor}px, ${moveY * factor}px)`;
    });
});
