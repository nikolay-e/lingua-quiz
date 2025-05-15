import { config } from '../config.js';
import { AuthUtils } from '../utils/authUtils.js';
import { errorHandler } from '../utils/errorHandler.js';

import { populateWordLists } from './eventHandlers.js';
import { PasswordValidator } from './passwordValidator.js';

export class AuthManager {
  constructor() {
    this.token = AuthUtils.getToken();
    this.email = localStorage.getItem(AuthUtils.EMAIL_KEY);
    this.passwordValidator = new PasswordValidator();
  }

  isAuthenticated() {
    return AuthUtils.isValidToken(this.token);
  }

  static redirectToLogin() {
    AuthUtils.redirectToLogin();
  }

  logout() {
    // First clear the auth
    AuthUtils.clearAuth();

    // Force immediate check and redirect
    AuthUtils.shouldRedirectToLogin();

    // Update UI
    this.updateLoginStatus();

    // Use replace instead of href to prevent back navigation
    window.location.replace('login.html');
  }

  static async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginMessage = document.getElementById('login-message');

    try {
      const response = await fetch(config.getUrl('login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        AuthUtils.setToken(data.token);
        AuthUtils.setEmail(email);
        loginMessage.textContent = 'Login successful. Loading word lists...';
        try {
          window.location.replace('/');
          await populateWordLists();
        } catch (error) {
          console.error('Error loading word lists:', error);
          errorHandler.handleApiError(error);
        }
      } else {
        errorHandler.showError(data.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      errorHandler.handleApiError(error);
    }
  }

  updateLoginStatus() {
    const loginLogoutBtn = document.getElementById('login-logout-btn');
    this.token = AuthUtils.getToken();
    this.email = localStorage.getItem(AuthUtils.EMAIL_KEY);

    if (loginLogoutBtn) {
      if (this.isAuthenticated()) {
        loginLogoutBtn.innerHTML = `
          <i class="fas fa-sign-out-alt"></i> 
          <span>Logout (${this.email})</span>
        `;
        loginLogoutBtn.removeEventListener('click', AuthManager.redirectToLogin);
        loginLogoutBtn.addEventListener('click', this.logout.bind(this));
      } else {
        loginLogoutBtn.innerHTML = `
          <i class="fas fa-sign-in-alt"></i> 
          <span>Login</span>
        `;
        loginLogoutBtn.removeEventListener('click', this.logout);
        if (!window.location.pathname.includes('login.html')) {
          loginLogoutBtn.addEventListener('click', AuthManager.redirectToLogin);
        }
      }
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const registerMessage = document.getElementById('register-message');

    console.log('Registration attempt for:', email);

    if (!this.passwordValidator.validatePassword(password)) {
      console.log('Password validation failed for:', email);
      errorHandler.showError('Please meet all password requirements');
      return;
    }

    try {
      console.log('Sending registration request to:', config.getUrl('register'));
      
      const response = await fetch(config.getUrl('register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Registration response status:', response.status);
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Error parsing registration response:', parseError);
        data = { message: 'Error processing server response' };
      }

      if (response.ok) {
        console.log('Registration successful for:', email);
        registerMessage.textContent = 'Registration successful. You can now log in.';
        registerMessage.style.color = 'var(--success-color)';
        // Clear the form
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        // Reset password validation display
        this.passwordValidator.validatePassword('');
      } else {
        console.warn(`Registration failed: ${data.message || 'Registration failed'}`);
        errorHandler.showError(data.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      errorHandler.handleApiError(error);
    }
  }

  initializePasswordValidation(passwordInput, registerForm) {
    const validationContainer = this.passwordValidator.createValidationContainer();
    passwordInput.parentNode.insertBefore(validationContainer, passwordInput.nextSibling);

    // Add show/hide password toggle
    const togglePasswordBtn = document.createElement('button');
    togglePasswordBtn.type = 'button';
    togglePasswordBtn.className = 'toggle-password-btn';
    togglePasswordBtn.innerHTML = '<i class="fas fa-eye"></i>';
    togglePasswordBtn.addEventListener('click', () => {
      const newInputType = passwordInput.type === 'password' ? 'text' : 'password';

      // Create a new input element with the updated type
      const newPasswordInput = document.createElement('input');
      // Copy all attributes from the original input
      [...passwordInput.attributes].forEach((attr) => {
        newPasswordInput.setAttribute(attr.name, attr.value);
      });
      // Set the new type
      newPasswordInput.setAttribute('type', newInputType);
      // Copy the value
      newPasswordInput.value = passwordInput.value;

      // Replace the old input with the new one
      passwordInput.parentNode.replaceChild(newPasswordInput, passwordInput);

      togglePasswordBtn.innerHTML = `<i class="fas fa-eye${newInputType === 'password' ? '' : '-slash'}"></i>`;
    });
    passwordInput.parentNode.appendChild(togglePasswordBtn);

    // Add real-time validation
    passwordInput.addEventListener('input', (e) => {
      const isValid = this.passwordValidator.validatePassword(e.target.value);
      const submitButton = registerForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = !isValid;
      }
    });

    // Show validation on focus
    passwordInput.addEventListener('focus', () => {
      validationContainer.style.display = 'block';
    });
  }

  initializeForms() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      const passwordInput = document.getElementById('register-password');
      if (passwordInput) {
        this.initializePasswordValidation(passwordInput, registerForm);
      }
      registerForm.addEventListener('submit', this.handleRegister.bind(this));
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', AuthManager.handleLogin);
    }

    // Initialize login toggle buttons
    const loginToggleBtns = document.querySelectorAll('.toggle-password-btn');
    loginToggleBtns.forEach((btn) => {
      const input = btn.previousElementSibling;
      if (input) {
        btn.addEventListener('click', () => {
          const newType = input.type === 'password' ? 'text' : 'password';

          // Create a new input element with the updated type
          const newInput = document.createElement('input');
          // Copy all attributes from the original input
          [...input.attributes].forEach((attr) => {
            newInput.setAttribute(attr.name, attr.value);
          });
          // Set the new type
          newInput.setAttribute('type', newType);
          // Copy the value
          newInput.value = input.value;

          // Replace the old input with the new one
          input.parentNode.replaceChild(newInput, input);

          const newBtn = btn.cloneNode(false);
          newBtn.innerHTML = `<i class="fas fa-eye${newType === 'password' ? '' : '-slash'}"></i>`;
          btn.parentNode.replaceChild(newBtn, btn);
        });
      }
    });
  }

  checkAuthAndRedirect() {
    if (AuthUtils.shouldRedirectToLogin()) {
      AuthUtils.redirectToLogin();
    }
  }
}

export function initAuth() {
  errorHandler.init();
  const authManager = new AuthManager();
  authManager.initializeForms();
  authManager.updateLoginStatus();
  authManager.checkAuthAndRedirect();
  AuthUtils.initAuthCheck();
}
