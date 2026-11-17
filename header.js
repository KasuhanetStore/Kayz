// header.js - Customized Header & Transitions for KasuhaNET.Store index.html
document.addEventListener("DOMContentLoaded", function () {

    // 1. Injected Header HTML Structure (Matching index.html Classes)
    const headerHTML = `
        <div class="logo">
            <a href="index.html">
                <img src="img/logo3.png" style="height:25px; width:auto;" alt="KasuhaNET Logo">
            </a>
        </div>

        <div class="header-right">
            <nav>
                
                <a href="index.html">HOME</a>
                <a href="About-Us.html">ABOUT US</a>
                <a href="privacy-policy-EN.html">PRIVACY POLICY</a>
                <a href="support-centre.html">SUPPORT</a>
            </nav>

            <div class="lang-wrapper">
                <div class="lang">
                    <a href="index.html"><button id="btn-en" class="active">EN</button></a>
                    <a href="MS.html"><button id="btn-ms">BM</button></a>
                </div>
            </div>
        </div>
    `;

    // 2. Target Injection Container
    const mainHeaderContainer = document.getElementById("main-header");
    
    if (mainHeaderContainer) {
        // Jika ada container #main-header, cipta element header
        const headerElement = document.createElement("header");
        headerElement.innerHTML = headerHTML;
        mainHeaderContainer.appendChild(headerElement);

        // Padamkan tag <header> asal jika wujud bertindih
        const existingHeader = document.querySelector("body > header");
        if (existingHeader && existingHeader.parentNode !== mainHeaderContainer) {
            existingHeader.remove();
        }
    }

    // 3. Setup Smooth Page Fade-Out Transition
    setupPageTransitions();
});

// Dropdown Toggle Handlers
function toggleDropdown(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById("servicesDropdown");
    if (dropdown) dropdown.classList.toggle("show");
}

// Global Click Event for Closing Dropdown
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

// Kesan Modern Page Fade-Out bila Klik Mana-mana Link
function setupPageTransitions() {
    const links = document.querySelectorAll("a");
    links.forEach(function(link) {
        link.addEventListener("click", function(e) {
            const href = this.getAttribute("href");
            const target = this.getAttribute("target");

            // Abaikan link luar, anchor `#`, atau `javascript:`
            if (href && !href.startsWith("#") && !href.startsWith("javascript") && target !== "_blank") {
                e.preventDefault();
                document.body.classList.add("page-fade-out");
                setTimeout(function() {
                    window.location.href = href;
                }, 400); // 400ms sepadan dengan animasi CSS index.html
            }
        });
    });
}
