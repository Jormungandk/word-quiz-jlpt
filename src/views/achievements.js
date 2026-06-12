export class AchievementsUI {
    constructor(app) {
        this.app = app;
    }

    displayAchievementsView() {
        const stats = this.app.achievements.getStats();
        const percent = Math.floor((stats.unlockedCount / stats.totalCount) * 100) || 0;

        let listHtml = '';
        stats.achievements.forEach(ach => {
            const progressPercent = (ach.currentValue / ach.target) * 100;
            
            listHtml += `
                <div class="ach-card ${ach.isUnlocked ? 'unlocked' : 'locked'}">
                    <div class="ach-icon">${ach.icon}</div>
                    <div class="ach-info">
                        <div class="ach-title">${ach.title}</div>
                        <div class="ach-desc">${ach.description}</div>
                        <div class="ach-progress-container">
                            <div class="ach-progress-bg">
                                <div class="ach-progress-fill" style="width: ${progressPercent}%;"></div>
                            </div>
                            <span>${ach.currentValue} / ${ach.target}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        const html = `
            <div class="achievements-header">
                <h2>🏆 Ваши Достижения</h2>
                <div style="font-size: 14px; opacity: 0.8;">Открыто: ${stats.unlockedCount} из ${stats.totalCount} (${percent}%)</div>
                <div class="global-progress-bar">
                    <div class="global-progress-fill" style="width: ${percent}%;"></div>
                </div>
            </div>
            
            <div class="achievements-list">
                ${listHtml}
            </div>

            <div style="text-align:center; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="window.quiz.displayMainMenu()">← Назад в меню</button>
            </div>
        `;

        const container = document.createElement('div');
        container.innerHTML = html;
        this.app.ui.replaceView(container);
    }
}