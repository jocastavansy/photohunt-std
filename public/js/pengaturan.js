    const langDropdown = document.getElementById('langDropdown');
    const trigger = langDropdown.querySelector('.st-trigger');
    const options = langDropdown.querySelectorAll('.st-option');
    const label = document.getElementById('currentLangLabel');

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        langDropdown.classList.toggle('open');
    });

    options.forEach(opt => {
        opt.addEventListener('click', () => {
            options.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            label.innerText = opt.innerText;
            langDropdown.classList.remove('open');
            console.log("Language changed to:", opt.dataset.lang);
        });
    });

    document.addEventListener('click', (e) => {
        if (!langDropdown.contains(e.target)) {
            langDropdown.classList.remove('open');
        }
    });

    const themeBoxes = document.querySelectorAll('.st-theme-box');
    themeBoxes.forEach(box => {
        box.addEventListener('click', () => {
            themeBoxes.forEach(b => b.classList.remove('active'));
            box.classList.add('active');
            console.log("Theme changed to:", box.dataset.theme);
        });
    });

    document.getElementById('spLogout').addEventListener('click', () => {
        const confirmLogout = confirm("Apakah Anda yakin ingin keluar?");
        if (confirmLogout) {
            alert("Anda telah keluar.");
             localStorage.removeItem('currentUser'); 
             window.location.href = 'login.html'; 
        }
    });