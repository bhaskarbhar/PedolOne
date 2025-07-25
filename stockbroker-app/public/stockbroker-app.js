// StockBroker Demo Application

const API_BASE_URL = 'https://pedolone.onrender.com' || 'http://localhost:8000';

// DOM Elements
const consentForm = document.getElementById('consentForm');
const otpSection = document.getElementById('otpSection');
const successSection = document.getElementById('successSection');
const submitBtn = document.getElementById('submitBtn');
const verifyBtn = document.getElementById('verifyBtn');
const resendBtn = document.getElementById('resendBtn');

let currentSessionId = null;
let currentEmail = null;

// Handle consent form submission
consentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const aadhaar = document.getElementById('aadhaar').value;
    const pan = document.getElementById('pan').value;
    const consent = document.getElementById('consent').checked;

    if (!consent) {
        showNotification('Please provide consent to continue', 'error');
        return;
    }

    if (!email) {
        showNotification('Email is required', 'error');
        return;
    }

    // At least one PII field should be provided
    if (!aadhaar && !pan) {
        showNotification('Please provide at least one form of identification', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';

    try {
        const response = await fetch(`${API_BASE_URL}/stockbroker/consent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                aadhaar: aadhaar || null,
                pan: pan || null,
                consent: consent
            })
        });

        const data = await response.json();

        if (response.ok) {
            currentSessionId = data.session_id;
            currentEmail = email;
            
            // Show OTP section
            consentForm.parentElement.parentElement.classList.add('hidden');
            otpSection.classList.remove('hidden');
            
            showNotification('Verification code sent to your email', 'success');
        } else {
            showNotification(data.detail || 'Failed to process consent', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-shield-alt mr-2"></i>Verify Identity & Continue';
    }
});

// Handle OTP verification
document.getElementById('otpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const otp = document.getElementById('otp').value;

    if (!otp || otp.length !== 6) {
        showNotification('Please enter a valid 6-digit code', 'error');
        return;
    }

    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Verifying...';

    try {
        const response = await fetch(`${API_BASE_URL}/stockbroker/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: currentSessionId,
                otp: otp
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Show success section
            otpSection.classList.add('hidden');
            successSection.classList.remove('hidden');
            
            showNotification('Identity verified successfully!', 'success');
        } else {
            showNotification(data.detail || 'Invalid verification code', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Verify & Complete';
    }
});

// Handle resend OTP
resendBtn.addEventListener('click', async () => {
    if (!currentSessionId || !currentEmail) {
        showNotification('Session expired. Please start over.', 'error');
        return;
    }

    resendBtn.disabled = true;
    resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending...';

    try {
        const response = await fetch(`${API_BASE_URL}/stockbroker/resend-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: currentSessionId,
                email: currentEmail
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('New verification code sent to your email', 'success');
        } else {
            showNotification(data.detail || 'Failed to resend code', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    } finally {
        resendBtn.disabled = false;
        resendBtn.innerHTML = '<i class="fas fa-redo mr-2"></i>Resend Code';
    }
});

// Input formatting
document.getElementById('aadhaar').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 12) value = value.slice(0, 12);
    e.target.value = value;
});

document.getElementById('pan').addEventListener('input', function(e) {
    let value = e.target.value.replace(/[^A-Z0-9]/g, '').toUpperCase();
    if (value.length > 10) value = value.slice(0, 10);
    e.target.value = value;
});

document.getElementById('otp').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 6) value = value.slice(0, 6);
    e.target.value = value;
});

// Notification function
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full`;
    
    const bgColor = type === 'success' ? 'bg-green-500' : 
                   type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    
    notification.className += ` ${bgColor} text-white`;
    
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Add some interactive effects
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects to feature cards
    const featureCards = document.querySelectorAll('.grid > div');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Add hover effects to trading feature cards
    const tradingCards = document.querySelectorAll('.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4 > div');
    tradingCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
}); 