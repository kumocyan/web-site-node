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
  const collapseBtn = document.getElementById('collapse-btn');
  const timeline = document.getElementById('announcements-timeline');
  const loadMoreContainer = document.getElementById('load-more-container');

  if (loadMoreBtn && timeline && loadMoreContainer) {
    let offset = 3; // 初期表示はサーバー側で3件
    const pageSize = 3;
    const maxItems = 6;

    // 初期状態のボタン可視性
    const initialCount = timeline.children.length;
    if (initialCount >= maxItems) {
      loadMoreBtn.style.display = 'none';
      collapseBtn && (collapseBtn.style.display = 'inline-flex');
    }

    const updateButtons = () => {
      const count = timeline.children.length;
      if (count >= maxItems) {
        loadMoreBtn.style.display = 'none';
        if (collapseBtn) collapseBtn.style.display = 'inline-flex';
      } else if (count <= 3) {
        if (collapseBtn) collapseBtn.style.display = 'none';
        loadMoreBtn.style.display = 'inline-flex';
      } else {
        loadMoreBtn.style.display = 'inline-flex';
        if (collapseBtn) collapseBtn.style.display = 'inline-flex';
      }
    };

    loadMoreBtn.addEventListener('click', async () => {
      const currentlyShown = timeline.children.length;
      if (currentlyShown >= maxItems) {
        updateButtons();
        return;
      }

      loadMoreBtn.disabled = true;
      loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>読み込み中...';

      try {
        // 通常は3件ずつ取得。最大6件を超えないように制御
        const remaining = maxItems - currentlyShown;
        const limit = Math.min(pageSize, remaining);
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
        loadMoreBtn.disabled = false;
        loadMoreBtn.innerHTML = '<i class="fas fa-history me-2"></i>過去のお知らせを見る';
        updateButtons();
      } catch (error) {
        console.error('Failed to load announcements:', error);
        loadMoreContainer.innerHTML = '<p class="text-danger mt-3">読み込みに失敗しました。時間をおいて再度お試しください。</p>';
      }
    });

    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        // 先頭3件を残し、それ以降を削除
        while (timeline.children.length > 3) {
          timeline.removeChild(timeline.lastElementChild);
        }
        // オフセットを初期値に戻す（次回の読み込みを3件目以降からにする）
        offset = 3;
        updateButtons();
      });
    }
  }
});
  