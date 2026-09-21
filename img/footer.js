document.addEventListener("DOMContentLoaded", function () {
    const footerHTML = `
<!-- BOXED CYBER FOOTER -->
<footer class="footer">
    <div class="footer-grid">
    
        <div><h3 class="neon-title">Kasuha<span>NET.STORE</span></h3>
            <p>Digital Shop Platform Service digital Developer and Hybrid Sales Digital.</p>
        </div>

        <div class="footer-links">
            <h4>Services</h4>
            <a href="CommandCanDoLIST.html">CommandCanDo</a>
            <a href="Shop-MyAffliate-homeEN.html">MyAffiliate</a>
            <a href="CashOutServicePayLater.html">PayLater BNPL</a>
        </div>

        <div class="footer-links">
            <h4>Resources</h4>
            <a href="About-Us.html">About Us</a>
            <a href="support-centre.html">Support</a>
            <a href="terms-EN.html">Terms & Policy</a>
        </div>

        <div class="footer-links">
            <h4>Follow Us</h4>
            <div class="social-icons-wrapper">
                <a href="https://www.facebook.com/share/1BfeDZJqjP/" target="_blank" rel="noopener" title="Facebook"><i class="fa-brands fa-facebook"></i></a>
                <a href="https://tiktok.com/@kasuhanet.store" target="_blank" rel="noopener" title="TikTok"><i class="fa-brands fa-tiktok"></i></a>
                <a href="https://t.me/kasuhanetstorebot" target="_blank" rel="noopener" title="Telegram"><i class="fa-brands fa-telegram"></i></a>
            </div>
        </div>
    </div>

    <div class="footer-bottom">
        © 2026 KasuhaNET Resources (202503248308). All Rights Reserved.
    </div>
</footer>

<!-- WHATSAPP FLOATING BUTTON -->
<a href="https://wa.me/qr/4K2RBZZQAPL4G1"
   style="
    position:fixed;
    right:20px;
    bottom:20px;
    width:60px;
    height:60px;
    background:#25D366;
    border-radius:50%;
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:999999;
    box-shadow:0 5px 20px rgba(37,211,102,0.5);
    transition: transform 0.3s ease;
   "
   onmouseover="this.style.transform='scale(1.1)'"
   onmouseout="this.style.transform='scale(1)'"
   target="_blank"
   rel="noopener"
   aria-label="Contact us on WhatsApp">
   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="white">
     <path d="M19.11 17.53c-.28-.14-1.64-.81-1.9-.9-.26-.1-.45-.14-.64.14-.19.28-.73.9-.9 1.09-.17.19-.33.21-.61.07-.28-.14-1.18-.43-2.25-1.38-.83-.74-1.39-1.66-1.55-1.94-.17-.28-.02-.43.12-.57.13-.13.28-.33.42-.50.14-.17.19-.28.28-.47.09-.19.05-.35-.02-.49-.07-.14-.64-1.55-.88-2.12-.23-.56-.47-.48-.64-.49h-.55c-.19 0-.49.07-.74.35-.25.28-.95.93-.95 2.26s.97 2.62 1.11 2.8c.14.19 1.9 2.9 4.6 4.07.64.28 1.14.45 1.53.57.64.2 1.22.17 1.68.1.51-.08 1.64-.67 1.87-1.32.23-.65.23-1.2.16-1.32-.07-.12-.26-.19-.54-.33z"/>
     <path d="M16 3C9.37 3 4 8.37 4 15c0 2.31.66 4.47 1.8 6.32L4 29l7.9-1.75C13.64 28.55 14.78 29 16 29c6.63 0 12-5.37 12-12S22.63 3 16 3zm0 22c-1.1 0-2.16-.2-3.14-.57l-.45-.17-4.69 1.04 1-4.57-.3-.47C7.39 18.35 7 16.72 7 15c0-4.96 4.04-9 9-9s9 4.04 9 9-4.04 10-9 10z"/>
   </svg>
</a>
    `;

    const target = document.getElementById("main-footer");
    if (target) {
        target.innerHTML = footerHTML;
    }
});
