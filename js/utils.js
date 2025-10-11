// Utility functions
function showLoading() {
    // Create loading overlay
    const loading = document.createElement('div');
    loading.id = 'loadingOverlay';
    loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.95);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;

    loading.innerHTML = `
        <div class="windows-loader">
            <div class="dot red"></div>
            <div class="dot blue"></div>
            <div class="dot black"></div>
        </div>
        <div style="margin-top: 20px; color: #2563eb; font-weight: 500;">Loading...</div>
    `;

    document.body.appendChild(loading);

    // Add CSS for the loader
    const style = document.createElement('style');
    style.textContent = `
        .windows-loader {
            display: flex;
            gap: 8px;
            align-items: center;
            justify-content: center;
        }
        
        .dot {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out both;
        }
        
        .red {
            background: #dc2626;
            animation-delay: -0.32s;
        }
        
        .blue {
            background: #2563eb;
            animation-delay: -0.16s;
        }
        
        .black {
            background: #1e293b;
        }
        
        @keyframes bounce {
            0%, 80%, 100% {
                transform: scale(0.8);
                opacity: 0.5;
            }
            40% {
                transform: scale(1.2);
                opacity: 1;
            }
        }
        
        /* Alternative wave animation */
        .windows-loader.wave {
            gap: 6px;
        }
        
        .windows-loader.wave .dot {
            animation: wave 1.2s infinite ease-in-out both;
        }
        
        @keyframes wave {
            0%, 60%, 100% {
                transform: translateY(0);
            }
            30% {
                transform: translateY(-10px);
            }
        }
    `;

    document.head.appendChild(style);
}

function hideLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.remove();
    }

    // Also remove the style element we added
    const styles = document.querySelectorAll('style');
    styles.forEach(style => {
        if (style.textContent.includes('windows-loader')) {
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

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
}

// Debounce function for search
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

// Optional: Alternative loader style with wave animation
function showLoadingWave() {
    const loading = document.createElement('div');
    loading.id = 'loadingOverlay';
    loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.95);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;

    loading.innerHTML = `
        <div class="windows-loader wave">
            <div class="dot red"></div>
            <div class="dot blue"></div>
            <div class="dot black"></div>
        </div>
        <div style="margin-top: 20px; color: #2563eb; font-weight: 500;">Loading...</div>
    `;

    document.body.appendChild(loading);

    // Add CSS for the wave loader
    const style = document.createElement('style');
    style.textContent = `
        .windows-loader {
            display: flex;
            gap: 8px;
            align-items: center;
            justify-content: center;
        }
        
        .windows-loader.wave {
            gap: 6px;
        }
        
        .dot {
            width: 14px;
            height: 14px;
            border-radius: 50%;
        }
        
        .red {
            background: #f51a1aff;
        }
        
        .blue {
            background: #0553fcff;
        }
        
        .black {
            background: #000000ff;
        }
        
        .windows-loader.wave .dot {
            animation: wave 1.2s infinite ease-in-out both;
        }
        
        .windows-loader.wave .dot.red {
            animation-delay: -0.32s;
        }
        
        .windows-loader.wave .dot.blue {
            animation-delay: -0.16s;
        }
        
        @keyframes wave {
            0%, 60%, 100% {
                transform: translateY(0);
            }
            30% {
                transform: translateY(-10px);
            }
        }
    `;

    document.head.appendChild(style);
}