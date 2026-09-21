document.addEventListener("DOMContentLoaded", function () {
    // 1. Cari container main-footer
    let footerContainer = document.getElementById("main-footer");

    // Jika container tiada dalam HTML, cipta satu di bahagian bawah body
    if (!footerContainer) {
        footerContainer = document.createElement("div");
        footerContainer.id = "main-footer";
        document.body.appendChild(footerContainer);
    }

    // 2. Inject HTML Footer secara selamat
    footerContainer.innerHTML = `
        <style>
            #main-footer {
                width: 100%;
                background: #090d16;
                border-top: 2px solid #4F31E8;
                box-shadow: 0 -5px 25px rgba(79, 49, 232, 0.2);
                margin-top: 50px;
                padding: 40px 20px 20px 20px;
                color: #fff;
                font-family: 'Orbitron', sans-serif !important;
                clear: both;
                position: relative;
                z-index: 999;
            }
            .footer-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 30px;
                max-width: 1200px;
                margin: 0 auto;
            }
            .footer-col h3 {
                color: #00F0FF;
                font-size: 16px;
                margin-bottom: 12px;
                text-shadow: 0 0 8px rgba(0, 240, 255, 0.4);
            }
            .footer-col h4 {
                color: #E600A4;
                font-size: 14px;
                margin-bottom: 10px;
            }
            .footer-col p {
                color: #aaa;
                font-size: 11px;
                line-height: 1.6;
            }
            .footer-links {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .footer-links a {
                color: #ccc;
                text-decoration: none;
                font-size: 12px;
                transition: color 0.2s;
            }
            .footer-links a:hover {
                color: #00F0FF;
            }
            .footer-socials {
                display: flex;
                gap: 15px;
                margin-top: 10px;
            }
            .footer-socials a {
                color: #00F0FF;
                font-size: 18px;
                transition: transform 0.2s;
            }
            .footer-socials a:hover {
                transform: scale(1.2);
                color: #E600A4;
            }
            .footer-bottom {
                text-align: center;
                font-size: 11px;
                color: #666;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                margin-top: 30px;
            }
        </style>

        <footer class="footer-grid">
            <div class="footer-col">
                <h3>KASUHANET</h3>
                <p>Official Affiliate & Digital Solution Hub. Connecting users with verified products, tech components, and server management tools.</p>
            </div>
            <div class="footer-col">
                <h4>QUICK LINKS</h4>
                <div class="footer-links">
                    <a href="https://kasuhanet.store/">Home</a>
                    <a href="https://kasuhanet.store/Shop-MyAffliate-homeEN.html">Affiliate Store</a>
                    <a href="#">Terms & Conditions</a>
                    <a href="#">Privacy Policy</a>
                </div>
            </div>
            <div class="footer-col">
                <h4>CONNECT WITH US</h4>
                <p>Follow our socials or direct line for support:</p>
                <div class="footer-socials">
                    <a href="https://wa.me/601139318182" target="_blank"><i class="fa-brands fa-whatsapp"></i></a>
                    <a href="#" target="_blank"><i class="fa-brands fa-facebook"></i></a>
                    <a href="#" target="_blank"><i class="fa-brands fa-tiktok"></i></a>
                </div>
            </div>
        </footer>
        <div class="footer-bottom">
            &copy; ${new Date().getFullYear()} KasuhaNET Resources. All Rights Reserved.
        </div>
    `;
});
