// ============================================
// OPTION 1: Spinning Union Logo with Pulse
// ============================================
function showLoading() {
    const loading = document.createElement('div');
    loading.id = 'loadingOverlay';
    loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.95), rgba(220, 38, 38, 0.95));
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        backdrop-filter: blur(10px);
    `;

    loading.innerHTML = `
        <div class="union-logo-loader">
            <div class="logo-ring"></div>
            <div class="logo-center">
                <span style="color: white; font-size: 2rem; font-weight: bold;">Z</span>
            </div>
        </div>
        <div style="margin-top: 30px; color: white; font-weight: 600; font-size: 1.2rem; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
            Loading.....
        </div>
    `;

    document.body.appendChild(loading);

    const style = document.createElement('style');
    style.textContent = `
        .union-logo-loader {
            position: relative;
            width: 100px;
            height: 100px;
        }
        
        .logo-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 6px solid rgba(255, 255, 255, 0.3);
            border-top: 6px solid white;
            border-radius: 50%;
            animation: spinLogo 1s linear infinite;
        }
        
        .logo-center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: pulse 2s ease-in-out infinite;
            backdrop-filter: blur(5px);
        }
        
        @keyframes spinLogo {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
            0%, 100% { 
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
            }
            50% { 
                transform: translate(-50%, -50%) scale(1.1);
                opacity: 0.8;
            }
        }
    `;

    document.head.appendChild(style);
}

function hideLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.opacity = '0';
        loading.style.transition = 'opacity 0.3s ease';
        setTimeout(() => loading.remove(), 300);
    }

    const styles = document.querySelectorAll('style');
    styles.forEach(style => {
        if (style.textContent.includes('union-logo-loader')) {
            style.remove();
        }
    });
}

// CENTERED POPUP SYSTEM
function showSuccess(message) {
    showCenteredPopup(message, 'success');
}

function showError(message) {
    showCenteredPopup(message, 'error');
}

function showWarning(message) {
    showCenteredPopup(message, 'warning');
}

function showInfo(message) {
    showCenteredPopup(message, 'info');
}

function showCenteredPopup(message, type = 'info') {
    // Remove any existing popup
    const existingPopup = document.querySelector('.popup-overlay');
    if (existingPopup) {
        existingPopup.remove();
    }

    // Create popup overlay
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';

    // Create popup container
    const popup = document.createElement('div');
    popup.className = `popup-container popup-${type}`;

    // Icon based on type
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    popup.innerHTML = `
        <div class="popup-icon">${icons[type]}</div>
        <div class="popup-message">${message}</div>
        <button class="popup-close-btn" onclick="closeCenteredPopup()">OK</button>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Auto close after 5 seconds
    setTimeout(() => {
        closeCenteredPopup();
    }, 5000);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeCenteredPopup();
        }
    });

    // Add popup styles if not already added
    addPopupStyles();
}

function closeCenteredPopup() {
    const popup = document.querySelector('.popup-overlay');
    if (popup) {
        popup.style.animation = 'fadeIn 0.2s ease-out reverse';
        setTimeout(() => {
            popup.remove();
        }, 200);
    }
}

function addPopupStyles() {
    // Check if styles already exist
    if (document.getElementById('popup-styles')) return;

    const style = document.createElement('style');
    style.id = 'popup-styles';
    style.textContent = `
        .popup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            animation: fadeIn 0.2s ease-in;
        }

        .popup-container {
            background: white;
            border-radius: 8px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            animation: slideUp 0.3s ease-out;
            position: relative;
        }

        .popup-icon {
            width: 48px;
            height: 48px;
            margin: 0 auto 16px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
        }

        .popup-success .popup-icon {
            background: #d1fae5;
            color: #10b981;
        }

        .popup-error .popup-icon {
            background: #fee2e2;
            color: #ef4444;
        }

        .popup-warning .popup-icon {
            background: #fef3c7;
            color: #f59e0b;
        }

        .popup-info .popup-icon {
            background: #dbeafe;
            color: #3b82f6;
        }

        .popup-message {
            text-align: center;
            font-size: 16px;
            color: #333;
            margin-bottom: 20px;
            line-height: 1.5;
        }

        .popup-close-btn {
            width: 100%;
            padding: 10px 20px;
            background: var(--primary, #2563eb);
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;
        }

        .popup-close-btn:hover {
            opacity: 0.9;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from {
                transform: translateY(20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
    `;

    document.head.appendChild(style);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
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
