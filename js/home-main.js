function toggleDropdown() {
  const dropdown = document.getElementById("servicesDropdown");
  dropdown.classList.toggle("show");
}

// Menutup dropdown jika pengguna mengklik di luar area dropdown
window.onclick = function(event) {
  if (!event.target.matches('.dropdown a') && !event.target.matches('.fa-chevron-down')) {
    const dropdowns = document.getElementsByClassName("dropdown-content");
    for (let i = 0; i < dropdowns.length; i++) {
      let openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
}
// 1. Kawalan Mobile Menu Toggle
function toggleMobileMenu() {
  const navLinks = document.getElementById("navLinks");
  if (navLinks) {
    navLinks.classList.toggle("active");
  }
}

// 2. Kawalan Dropdown (Luar Negara)
function toggleDropdown() {
  const dropdown = document.getElementById("servicesDropdown");
  if (dropdown) {
    dropdown.classList.toggle("show");
  }
}

// 3. Tutup Dropdown Apabila Klik Di Luar Menu
window.addEventListener('click', function(e) {
  if (!e.target.matches('.dropdown a') && !e.target.matches('.dropdown i')) {
    const dropdowns = document.getElementsByClassName("dropdown-content");
    for (let i = 0; i < dropdowns.length; i++) {
      if (dropdowns[i].classList.contains('show')) {
        dropdowns[i].classList.remove('show');
      }
    }
  }
});

// 4. Auto-Set Pautan WhatsApp (Selamat dari Error jika elemen tiada)
document.addEventListener("DOMContentLoaded", function() {
  const WHATSAPP_NUMBER = "60167390501"; 
  const DEFAULT_MESSAGE = "Hello, I am interested in KasuhaNET.STORE services.";
  const waURL = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(DEFAULT_MESSAGE);

  const floatingWa = document.getElementById("floating-whatsapp");
  const mainWa = document.getElementById("main-whatsapp");

  if (floatingWa) floatingWa.href = waURL;
  if (mainWa) mainWa.href = waURL;
});
