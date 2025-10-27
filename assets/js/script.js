document.addEventListener('DOMContentLoaded', () => {
  /* ------------------------------------------------------------
   * Sticky header / mobile nav
   * ------------------------------------------------------------ */
  const header = document.getElementById('globalHeader');
  const nav = document.getElementById('globalNav');
  const toggle = document.getElementById('globalNavToggle');
  const overlay = document.getElementById('globalNavOverlay');

  console.log('Header elements:', { header, nav, toggle, overlay });

  const setHeaderState = () => {
    if (!header) return;
    header.classList.toggle('global-header--solid', window.scrollY > 40);
  };

  const closeNav = () => {
    console.log('Closing nav');
    nav?.classList.remove('is-open');
    toggle?.classList.remove('is-active');
    toggle?.setAttribute('aria-expanded', 'false');
    overlay?.classList.remove('is-visible');
  };

  const openNav = () => {
    console.log('Opening nav');
    nav?.classList.add('is-open');
    toggle?.classList.add('is-active');
    toggle?.setAttribute('aria-expanded', 'true');
    overlay?.classList.add('is-visible');
  };

  if (toggle) {
    toggle.addEventListener('click', (e) => {
      console.log('Toggle clicked', e);
      if (nav?.classList.contains('is-open')) {
        closeNav();
      } else {
        openNav();
      }
    });
  } else {
    console.error('Toggle button not found!');
  }

  overlay?.addEventListener('click', closeNav);
  window.addEventListener('resize', () => { if (window.innerWidth > 1080) closeNav(); });
  window.addEventListener('scroll', setHeaderState, { passive: true });
  setHeaderState();

  /* ------------------------------------------------------------
   * Reveal animation observer
   * ------------------------------------------------------------ */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  /* ------------------------------------------------------------
   * Hero video fallback
   * ------------------------------------------------------------ */
  const heroVideo = document.querySelector('.hero-block__video');
  const heroPlaceholder = document.querySelector('.js-hero-placeholder');
  if (heroVideo) {
    const hidePlaceholder = () => {
      console.log('Hiding video placeholder');
      heroPlaceholder?.classList.add('is-hidden');
    };
    const showFallback = () => {
      console.log('Showing video fallback');
      heroVideo.parentElement?.classList.add('hero-video--fallback');
    };

    console.log('Video element found, readyState:', heroVideo.readyState);
    console.log('Video src:', heroVideo.querySelector('source')?.src);

    if (heroVideo.readyState >= 2) {
      console.log('Video already loaded, hiding placeholder');
      hidePlaceholder();
    }

    heroVideo.addEventListener('loadstart', () => console.log('Video loadstart'));
    heroVideo.addEventListener('loadeddata', () => {
      console.log('Video loadeddata');
      hidePlaceholder();
    }, { once: true });
    heroVideo.addEventListener('canplay', () => console.log('Video canplay'));
    heroVideo.addEventListener('play', () => console.log('Video play'));
    heroVideo.addEventListener('error', (e) => {
      console.log('Video error:', e);
      showFallback();
    });

    // Fallback: hide placeholder after 3 seconds if video hasn't loaded
    setTimeout(() => {
      if (!heroPlaceholder?.classList.contains('is-hidden')) {
        console.log('Fallback: hiding placeholder after timeout');
        hidePlaceholder();
      }
    }, 3000);
  }

  /* ------------------------------------------------------------
   * Announcements lazy load
   * ------------------------------------------------------------ */
  const loadMoreBtn = document.getElementById('load-more-btn');
  const timeline = document.getElementById('announcements-timeline');
  const loadMoreContainer = document.getElementById('load-more-container');

  if (loadMoreBtn && timeline && loadMoreContainer) {
    let offset = 3;
    const limit = 3;

    loadMoreBtn.addEventListener('click', async () => {
      loadMoreBtn.disabled = true;
      loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>読み込み中...';

      try {
        const response = await fetch(`/api/announcements?offset=${offset}&limit=${limit}`);
        if (!response.ok) throw new Error(`Status ${response.status}`);

        const items = await response.json();
        if (items.length === 0) {
          loadMoreContainer.innerHTML = '<p class="text-muted mt-3">すべてのお知らせを表示しました。</p>';
          return;
        }

        items.forEach((announcement) => {
          const card = document.createElement('article');
          card.className = 'timeline-card reveal';
          card.innerHTML = `
            <h3 class="timeline-card__title">${announcement.title}</h3>
            <p class="timeline-card__body">${announcement.content}</p>
            <div class="timeline-card__meta"><i class="fas fa-calendar me-2"></i>${new Date(announcement.created_at).toLocaleDateString('ja-JP')}</div>
          `;
          timeline.appendChild(card);
          revealObserver.observe(card);
        });

        offset += items.length;
        if (items.length < limit) {
          loadMoreContainer.innerHTML = '<p class="text-muted mt-3">すべてのお知らせを表示しました。</p>';
        } else {
          loadMoreBtn.disabled = false;
          loadMoreBtn.innerHTML = '<i class="fas fa-history me-2"></i>過去のお知らせを見る';
        }
      } catch (error) {
        console.error('Failed to load announcements:', error);
        loadMoreContainer.innerHTML = '<p class="text-danger mt-3">読み込みに失敗しました。時間をおいて再度お試しください。</p>';
      }
    });
  }
});
  