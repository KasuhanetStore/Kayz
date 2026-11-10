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
