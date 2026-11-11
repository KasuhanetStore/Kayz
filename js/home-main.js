// ==========================================
// KAWALAN UTAMA UTILITY & NAVIGASI (KASUHANET)
// ==========================================

// 1. Kawalan Mobile Menu Toggle (Buka/Tutup Menu Telefon)
function toggleMobileMenu() {
  const navLinks = document.getElementById("navLinks");
  if (navLinks) {
    navLinks.classList.toggle("active");
  }
}

// 2. Kawalan Dropdown Servis
function toggleDropdown() {
  const dropdown = document.getElementById("servicesDropdown");
  if (dropdown) {
    dropdown.classList.toggle("show");
  }
}

// 3. Tutup Semua Menu & Dropdown Apabila Klik Di Luar Area Menu
window.addEventListener('click', function(e) {
  // Tutup Dropdown jika klik di luar
  if (!e.target.closest('.dropdown')) {
    const dropdowns = document.getElementsByClassName("dropdown-content");
    for (let i = 0; i < dropdowns.length; i++) {
      if (dropdowns[i].classList.contains('show')) {
        dropdowns[i].classList.remove('show');
      }
    }
  }

  // Tutup Mobile Menu jika klik di luar header
  const navLinks = document.getElementById("navLinks");
  const menuToggle = document.querySelector(".menu-toggle");
  if (navLinks && navLinks.classList.contains("active")) {
    if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
      navLinks.classList.remove("active");
    }
  }
});

// 4. Auto-Set Pautan WhatsApp
document.addEventListener("DOMContentLoaded", function() {
  const WHATSAPP_NUMBER = "60167390501"; 
  const DEFAULT_MESSAGE = "Hello, I am interested in KasuhaNET.STORE services.";
  const waURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;

  const floatingWa = document.getElementById("floating-whatsapp");
  const mainWa = document.getElementById("main-whatsapp");

  if (floatingWa) floatingWa.href = waURL;
  if (mainWa) mainWa.href = waURL;
});
