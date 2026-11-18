/* PWA MOBILE VIEW: force device-width only inside the installed KasuhaNET app.
   Normal browser sessions keep the user's Desktop Site preference untouched. */
(function () {
  const standalone = window.matchMedia &&
    (window.matchMedia('(display-mode: standalone)').matches ||
     window.matchMedia('(display-mode: fullscreen)').matches ||
     window.navigator.standalone === true);
  const phoneScreen = Math.min(window.screen.width, window.screen.height) <= 850;
  if (!standalone || !phoneScreen) return;

  const applyMobileViewport = function () {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
  };
  applyMobileViewport();
  window.addEventListener('pageshow', applyMobileViewport);
})();

/**
 * KASUHANET.STORE - MASTER ENGINE & AUTO-RECOVERY SCRIPT
 * Mengendalikan Navigasi, Dropdown, Menu Mobile, dan Auto-Fix Layout.
 */

// 1. KAWALAN MENU MOBILE (TOGGLE)
function toggleMobileMenu() {
  const navLinks = document.getElementById("navLinks");
  if (navLinks) {
    navLinks.classList.toggle("active");
  }
}

// 2. KAWALAN DROPDOWN SERVIS
function toggleDropdown() {
  const dropdown = document.getElementById("servicesDropdown");
  if (dropdown) {
    dropdown.classList.toggle("show");
  }
}

// 3. EVENT LISTENER: PENCEGAHAN SEKATAN & AUTO-CLOSE BILA KLIK LUAR
window.addEventListener('click', function(e) {
  // A. Tutup Dropdown jika pengguna klik di luar kawasan dropdown
  if (!e.target.closest('.dropdown')) {
    const dropdowns = document.getElementsByClassName("dropdown-content");
    for (let i = 0; i < dropdowns.length; i++) {
      if (dropdowns[i].classList.contains('show')) {
        dropdowns[i].classList.remove('show');
      }
    }
  }

  // B. Tutup Mobile Menu jika pengguna klik di luar menu/button
  const navLinks = document.getElementById("navLinks");
  const menuToggle = document.querySelector(".menu-toggle");
  if (navLinks && navLinks.classList.contains("active")) {
    if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
      navLinks.classList.remove("active");
    }
  }
});

// 4. AUTO-SET PAUTAN WHATSAPP & PEMBERSIHAN AUTOMATIK DOM
document.addEventListener("DOMContentLoaded", function() {
  // Setup WhatsApp Automatik
  const WHATSAPP_NUMBER = "60167390501"; 
  const DEFAULT_MESSAGE = "Hello, I am interested in KasuhaNET.STORE services.";  
  const waURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;  

  const floatingWa = document.getElementById("floating-whatsapp");
  const mainWa = document.getElementById("main-whatsapp");

  if (floatingWa) floatingWa.href = waURL;
  if (mainWa) mainWa.href = waURL;

  // Auto-Fix: Menghapuskan sebarang garisan neon hiasan yang tersangkut pada tag tajuk secara automatik
  const neonTitles = document.querySelectorAll('.neon-title, .typing-box h2');
  neonTitles.forEach(title => {
    title.style.borderBottom = 'none';
    title.style.textDecoration = 'none';
  });
});
