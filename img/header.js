// header.js - Reusable Header Component untuk KasuhaNET.store
document.addEventListener("DOMContentLoaded", function () {
    const headerHTML = `
    <header>
        <div class="logo">
            <a href="index.html">
                <img src="img/logo3.png" style="height:25px; width:auto;" alt="KasuhaNET Logo">
            </a>
        </div>

        <div class="header-right">
            <nav>
                <!-- Dropdown Menu Oversea Modern -->
                <div class="dropdown">
                    <a href="javascript:void(0)" onclick="toggleDropdown(event)" style="cursor: pointer;">
                        Oversea <i class="fa-solid fa-chevron-down" style="font-size: 10px; margin-left: 3px; color: #00F0FF;"></i>
                    </a>
                    <div class="dropdown-content" id="servicesDropdown">
                        <a href="https://kasuhanet.store/Rwanda-SupportDevelopement.html">
                            <i class="fa-solid fa-globe" style="margin-right: 8px; color: #00F0FF;"></i> RWANDA (Africa)
                        </a>
                        <a href="https://kasuhanet.store/Timor-Leste-SupportDevelopement.html">
                            <i class="fa-solid fa-globe" style="margin-right: 8px; color: #E600A4;"></i> TIMOR LESTE (Asia)
                        </a>
                    </div>
                </div>
                <a href="index.html" id="nav-home">HOME</a>
                <a href="About-Us.html" id="nav-about">ABOUT US</a>
                <a href="terms-EN.html" id="nav-terms">TERMS & POLICY</a>
                <a href="support-centre.html" id="nav-support">SUPPORT</a>
            </nav>

            <div class="lang-wrapper">
                <div class="lang">
                    <a href="index.html"><button id="btn-en" class="active">EN</button></a>
                    <a href="MS.html"><button id="btn-ms">BM</button></a>
                </div>
            </div>
        </div>
    </header>
    `;

    // Inject header ke dalam div placeholder
    const headerContainer = document.getElementById("main-header");
    if (headerContainer) {
        headerContainer.innerHTML = headerHTML;
    }
});

// Function Toggle Dropdown Oversea
function toggleDropdown(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById("servicesDropdown");
    if (dropdown) {
        dropdown.classList.toggle("show");
    }
}

// Tutup dropdown bila tekan luar menu
window.addEventListener('click', function(e) {
    if (!e.target.matches('.dropdown a') && !e.target.matches('.dropdown i')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
});
