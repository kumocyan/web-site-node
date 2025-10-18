// N-STYLE ウェブサイト - シンプルなJavaScript
document.addEventListener('DOMContentLoaded', function() {

    // シンプルなフェードインアニメーション
    // MEMO: ページ上の 'animate-fade-in' クラスを持つ要素が画面に入ったときにアニメーションを開始します。
    try {
      const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
          }
        });
      });
      document.querySelectorAll('.animate-fade-in, .animate-slide-up').forEach(el => {
        observer.observe(el);
      });
    } catch (e) {
      console.error('Animation observer failed:', e);
    }

    // --- ここから「もっと見る」機能のコード ---
    const loadMoreBtn = document.getElementById('load-more-btn');
    const timeline = document.getElementById('announcements-timeline');
    const loadMoreContainer = document.getElementById('load-more-container');
  
    if (loadMoreBtn && timeline && loadMoreContainer) {
      let offset = 3; // 最初の3件は表示済み
      const limit = 3;  // 一度に読み込む件数
  
      loadMoreBtn.addEventListener('click', async () => {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>読み込み中...`;

        try {
          const response = await fetch(`/api/announcements?offset=${offset}&limit=${limit}`);
  
          if (!response.ok) {
            throw new Error(`サーバーからの応答が不正です: ${response.status}`);
          }
  
          const newAnnouncements = await response.json();
  
          if (newAnnouncements.length > 0) {
            newAnnouncements.forEach(announcement => {
              const timelineItem = document.createElement('div');
              timelineItem.classList.add('timeline-item', 'animate-slide-up');
              
              const iconClass = announcement.icon_class || 'fas fa-info-circle';
              const createdAt = new Date(announcement.created_at).toLocaleDateString('ja-JP');
  
              timelineItem.innerHTML = `
                <div class="timeline-marker bg-primary"></div>
                <div class="card border-0 shadow-sm">
                  <div class="card-body p-4">
                    <div class="d-flex align-items-start">
                      <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center me-4" style="width: 60px; height: 60px; min-width: 60px;">
                        <i class="${iconClass} fa-lg"></i>
                      </div>
                      <div class="flex-grow-1">
                        <h6 class="fw-bold mb-2 text-primary">${announcement.title}</h6>
                        <p class="text-muted mb-3">${announcement.content}</p>
                        <div class="d-flex align-items-center">
                          <small class="text-muted me-3">
                            <i class="fas fa-calendar me-1"></i>${createdAt}
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
              timeline.appendChild(timelineItem);
            });
  
            offset += newAnnouncements.length;

            if (newAnnouncements.length < limit) {
                // 取得した件数がリミットより少ない場合、それが最後のデータ
                loadMoreContainer.innerHTML = '<p class="text-muted mt-3">すべてのお知らせを表示しました。</p>';
            } else {
                loadMoreBtn.disabled = false;
                loadMoreBtn.innerHTML = `<i class="fas fa-history me-2"></i>過去のお知らせを見る`;
            }
  
          } else {
            loadMoreContainer.innerHTML = '<p class="text-muted mt-3">すべてのお知らせを表示しました。</p>';
          }
  
        } catch (error) {
          console.error('お知らせの読み込みに失敗しました:', error);
          loadMoreContainer.innerHTML = '<p class="text-danger mt-3">読み込みに失敗しました。時間をおいて再度お試しください。</p>';
        }
      });
    }

    console.log('🚗 N-STYLE ウェブサイト - 読み込み完了');
});
  