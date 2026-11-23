// ระบบสมาชิกเพื่อสาธิตในห้องเรียน: localStorage + sessionStorage เท่านั้น
// ไม่ใช่การยืนยันตัวตนที่ปลอดภัยสำหรับเว็บจริง
(() => {
  'use strict';
  const USERS_KEY = 'travel_demo_users_v1';
  const SESSION_KEY = 'travel_demo_signed_in';
  const $ = (id) => document.getElementById(id);

  function setFeedback(message, kind='error') {
    const out = $('feedback');
    if (out) { out.textContent = message; out.className = 'feedback ' + kind; }
  }
  function getUsers() {
    try {
      const data = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch (_) { return []; }
  }
  function bufferToHex(bytes) {
    return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  async function digest(password,salt) {
    if (!window.crypto || !crypto.subtle) throw new Error('เบราว์เซอร์ไม่รองรับ Web Crypto กรุณาเปิดผ่าน Chrome หรือ localhost');
    const raw = new TextEncoder().encode(salt + ':' + password);
    return bufferToHex(await crypto.subtle.digest('SHA-256',raw));
  }
  function makeSalt() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return bufferToHex(bytes.buffer);
  }
  function storageError() {
    setFeedback('ไม่สามารถเก็บข้อมูลในเบราว์เซอร์นี้ได้ โปรดตรวจสอบการตั้งค่า localStorage หรือทดลองเปิดผ่าน localhost');
  }

  const register = $('register-form');
  if (register) {
    register.addEventListener('submit', async (event) => {
      event.preventDefault();
      const username = $('reg-username').value.trim();
      const email = $('reg-email').value.trim().toLowerCase();
      const password = $('reg-password').value;
      const confirm = $('reg-confirm').value;
      if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
        setFeedback('ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษ ตัวเลข หรือ _ จำนวน 3–30 ตัว'); return;
      }
      if (password.length < 8) { setFeedback('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return; }
      if (password !== confirm) { setFeedback('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน'); return; }
      try {
        const users = getUsers();
        if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
          setFeedback('ชื่อผู้ใช้นี้มีอยู่แล้ว กรุณาเลือกชื่ออื่น'); return;
        }
        if (users.some(u => u.email === email)) {
          setFeedback('อีเมลนี้เคยใช้สมัครแล้ว'); return;
        }
        const salt = makeSalt();
        const passwordHash = await digest(password,salt);
        users.push({username,email,salt,passwordHash});
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        register.reset();
        setFeedback('สมัครสมาชิกสำเร็จ! คลิก “เข้าสู่ระบบ” ด้านล่าง เพื่อทดลองเข้าใช้งาน','ok');
      } catch (error) {
        if (error.name === 'QuotaExceededError' || error.name === 'SecurityError') storageError();
        else setFeedback('สมัครสมาชิกไม่สำเร็จ: ' + error.message);
      }
    });
  }
  const login = $('login-form');
  if (login) {
    login.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = $('username').value.trim();
      const password = $('password').value;
      try {
        const user = getUsers().find(u => u.username.toLowerCase() === name.toLowerCase());
        if (!user || (await digest(password,user.salt)) !== user.passwordHash) {
          setFeedback('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้สมัครสมาชิก'); return;
        }
        sessionStorage.setItem(SESSION_KEY,user.username);
        $('password').value = '';
        setFeedback('เข้าสู่ระบบสาธิตสำเร็จ! กลับไปหน้าแรกได้เลย','ok');
        refreshNavigation();
      } catch (error) {
        setFeedback('เข้าสู่ระบบไม่ได้: ' + error.message);
      }
    });
  }
  function refreshNavigation() {
    let signedIn = null;
    try { signedIn = sessionStorage.getItem(SESSION_KEY); } catch (_) {}
    const nav = document.querySelector('header nav');
    if (!nav) return;
    const existing = nav.querySelector('.auth-logout');
    if (existing) existing.remove();
    if (signedIn) {
      const loginLink = nav.querySelector('a[href="login.html"]');
      const registerLink = nav.querySelector('a[href="register.html"]');
      if (loginLink) loginLink.textContent = 'ผู้ใช้: ' + signedIn;
      if (registerLink) registerLink.style.display = 'none';
      const button = document.createElement('a');
      button.href='#'; button.textContent = 'ออกจากระบบ'; button.className='auth-logout';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href='index.html';
      });
      nav.appendChild(button);
    }
  }
  refreshNavigation();
})();
