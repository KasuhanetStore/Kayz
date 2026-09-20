function loadHeader() {
    const container = document.getElementById("main-header");
    if (!container) return;

    container.innerHTML = `
    <header>
        <div class="logo">
            <a href="index.html" style="text-decoration:none; color:#fff; font-weight:900; font-size:18px;">
                KasuhaNET<span style="color:#00F0FF;">.STORE</span>
            </a>
        </div>
        <div class="header-right">
            <nav>
            <button class="dropbtn">OVERSEA SERVICES ▼</button>
            <div class="dropdown-content">
            <div class="dropdown">
            
                <a href="index.html">HOME</a>
                <a href="CommandCanDoLIST.html">COMMAND CANDO</a>
                <a href="Shop-MyAffliate-homeMS.html">MY AFFILIATE</a>
                    
                        <a href="custom-web-EN.html">CUSTOM WEB WORKSHOP</a>
                        <a href="CashOutServicePayLater.html">PAYLATER CASH OUT</a>
                    </div>
                </div>
            </nav>
            <div class="lang-wrapper">
                <div class="lang">
                    <button class="active" onclick="location.href='custom-web-EN.html'">EN</button>
                    <button onclick="location.href='custom-web-MS.html'">MS</button>
                </div>
            </div>
        </div>
    </header>

    <!-- MAIN TITLE SECTION -->
    <section class="section">
        <h1 class="neon-title">Kasuha<span>NET.STORE</span></h1>
        
        <div class="typing-box">
            <h2 style="font-size: 18px; margin: 10px 0; color:#4F31E8;">
                <span style="color:#4F31E8; text-shadow:0 0 20px #4F31E8;">KasuhaNET •</span>
                <span style="color:#E600A4; text-shadow:0 0 20px #E600A4;">Digital Store Platform</span>
            </h2>
            
            <p class="neon-desc">
                Hybrid Sales Platform and Multi-Service Digital Tools.
            </p>
        </div>
    </section>
    `;
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadHeader);
} else {
    loadHeader();
}
