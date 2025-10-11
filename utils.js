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

function showError(message) {
    alert('Error: ' + message);
}

function showSuccess(message) {
    alert('Success: ' + message);
}

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