  // --- 1. Prevent Flickering on initial load ---
        window.addEventListener('load', () => {
            document.body.classList.remove('preload');
        });

        // --- 2. Dynamic Active Navigation Highlighting ---
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });

        // --- 3. Sidebar Toggle Logic ---
        const sidebar = document.querySelector('.sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');

        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('expanded');
            if (sidebar.classList.contains('expanded')) {
                sidebarToggle.innerText = '<<';
            } else {
                sidebarToggle.innerText = '>>';
            }
        });

        // --- 4. Search and Mobile Drawer Logic ---
        const searchInput = document.getElementById('searchInput');
        const searchPopup = document.getElementById('searchPopup');
        const searchContainer = document.getElementById('searchContainer');
        const searchIcon = document.getElementById('searchIcon');

        searchIcon.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                searchContainer.classList.add('mobile-expanded');
                searchInput.focus();
            }
        });

        searchInput.addEventListener('focus', () => {
            searchPopup.classList.add('active');
        });

        document.addEventListener('click', (e) => {
            const isClickInsideSearch = searchContainer.contains(e.target);
            const isClickInsidePopup = searchPopup.contains(e.target);

            if (!isClickInsideSearch && !isClickInsidePopup) {
                searchPopup.classList.remove('active');

                if (window.innerWidth <= 768) {
                    searchContainer.classList.remove('mobile-expanded');
                }
            }
        });

        const mobileDrawer = document.getElementById('mobileDrawer');

        function toggleMobileDrawer() {
            mobileDrawer.classList.toggle('open');
        }
