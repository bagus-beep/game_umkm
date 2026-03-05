/**
 * Google Auth Module
 * Handles Google Sign-In with registration flow
 */

import AUTH_CONFIG from './config.js';

class GoogleAuth {
  constructor() {
    this.initialized = false;
    this.currentUser = null;
    this.callbacks = [];
    this.role = null;
    this.googleUser = null;
  }

  /**
   * Initialize Google Identity Services
   */
  async init() {
    if (this.initialized) return;

    return new Promise((resolve) => {
      window.handleGoogleCredentialResponse = (response) => {
        this.handleCredentialResponse(response);
      };

      if (window.google?.accounts?.identity) {
        this.setupGIS();
        this.initialized = true;
        resolve();
      } else {
        window.addEventListener('load', () => {
          this.setupGIS();
          this.initialized = true;
          resolve();
        });
      }
    });
  }

  /**
   * Setup Google Identity Services
   */
  setupGIS() {
    if (!window.google?.accounts?.identity) return;

    window.google.accounts.identity.initialize({
      client_id: AUTH_CONFIG.CLIENT_ID,
      callback: 'handleGoogleCredentialResponse',
      auto_select: false,
      cancel_on_tap_outside: false
    });
  }

  /**
   * Handle credential response from Google
   */
  async handleCredentialResponse(response) {
    try {
      // Decode JWT to get user info
      const userInfo = this.parseJwt(response.credential);
      
      this.googleUser = {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        sub: userInfo.sub
      };

      // Send to backend to validate
      const authResult = await this.validateWithBackend(userInfo);
      
      if (!authResult.success) {
        this.showError(authResult.message || 'Login gagal');
        return;
      }

      if (authResult.registered) {
        // User exists - login and route to dashboard
        this.currentUser = {
          ...authResult.user,
          picture: userInfo.picture
        };
        this.role = authResult.role;
        
        localStorage.setItem('user', JSON.stringify(this.currentUser));
        this.triggerCallbacks(this.currentUser);
        this.routeToDashboard(this.role);
      } else {
        // New user - show registration form
        this.triggerCallbacks(null, {
          needRegister: true,
          googleUser: this.googleUser
        });
      }
      
    } catch (error) {
      console.error('Auth error:', error);
      this.showError('Login gagal. Silakan coba lagi.');
    }
  }

  /**
   * Validate user with backend
   */
  async validateWithBackend(userInfo) {
    try {
      const payload = {
        action: 'login',
        email: userInfo.email,
        name: userInfo.name,
        sub: userInfo.sub
      };

      const res = await fetch(AUTH_CONFIG.API_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Backend validation failed:', error);
      return { success: false, message: 'Koneksi gagal' };
    }
  }

  /**
   * Register new user
   */
  async register(userData) {
    try {
      const payload = {
        action: 'register',
        email: this.googleUser.email,
        name: this.googleUser.name,
        sub: this.googleUser.sub,
        role: userData.role,
        noWa: userData.noWa,
        kelas: userData.kelas || '',
        sekolah: userData.sekolah || '',
        foto: this.googleUser.picture || '',
        // Extra fields for MITRA
        namaMitra: userData.namaMitra || '',
        kategori: userData.kategori || '',
        alamat: userData.alamat || ''
      };

      const res = await fetch(AUTH_CONFIG.API_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (data.success) {
        this.currentUser = {
          userId: data.user.userId,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          noWa: data.user.noWa,
          kelas: data.user.kelas,
          sekolah: data.user.sekolah,
          picture: this.googleUser.picture
        };
        
        this.role = data.user.role;
        
        localStorage.setItem('user', JSON.stringify(this.currentUser));
        this.triggerCallbacks(this.currentUser);
        this.routeToDashboard(this.role);
        
        return { success: true };
      }
      
      return { success: false, message: data.message };
      
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, message: 'Koneksi gagal' };
    }
  }

  /**
   * Parse JWT token
   */
  parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  }

  /**
   * Route to appropriate dashboard based on role
   */
  routeToDashboard(role) {
    const dashboards = {
      'admin': 'dashboard-admin.html',
      'siswa': 'dashboard-siswa.html',
      'mitra': 'dashboard-mitra.html',
      'guru': 'dashboard-guru.html'
    };

    const dashboard = dashboards[role];
    if (dashboard) {
      window.location.href = dashboard;
    }
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    const user = localStorage.getItem('user');
    if (user) {
      this.currentUser = JSON.parse(user);
      this.role = this.currentUser.role;
      return true;
    }
    return false;
  }

  /**
   * Get current user
   */
  getUser() {
    return this.currentUser;
  }

  /**
   * Get current role
   */
  getRole() {
    return this.role;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role) {
    return this.role === role;
  }

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem('user');
    this.currentUser = null;
    this.role = null;
    this.googleUser = null;
    
    if (window.google?.accounts?.identity) {
      window.google.accounts.identity.disableAutoSelect();
    }
    
    window.location.href = 'index.html';
  }

  /**
   * Register callback for auth state changes
   */
  onAuthChange(callback) {
    this.callbacks.push(callback);
    
    if (this.isLoggedIn()) {
      callback(this.currentUser);
    }
  }

  /**
   * Trigger all registered callbacks
   */
  triggerCallbacks(user, extra = null) {
    this.callbacks.forEach(cb => cb(user, extra));
  }

  /**
   * Show error message
   */
  showError(message) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }
}

// Export singleton instance
export default new GoogleAuth();

