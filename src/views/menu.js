export class MenuUI {
    constructor(app) {
        this.app = app;
    }

    displayMainMenu() {
        const profile = this.app.user.profile;
        const percent = this.app.user.getProgressPercent();

        const authButtonHtml = profile.isGuest 
            ? `<button class="btn btn-primary" onclick="window.quiz.displayAuthView()">💾 Вход / Регистрация</button>`
            : `<button class="btn btn-secondary" onclick="window.quiz.displayAchievementsView()">🏆 Достижения</button>
               <button class="btn btn-secondary" onclick="window.quiz.displayProfileView()">⚙️ Профиль</button>
               <button class="btn btn-danger" onclick="window.quiz.logout()">Выйти</button>`;

        const html = `
            <div class="card" style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-color); border: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 40px;">${profile.avatar}</div>
                    <div>
                        <strong style="font-size: 18px;">${profile.username}</strong>
                        <div style="font-size: 14px; opacity: 0.8;">Уровень ${profile.level} ${profile.isGuest ? '(Гость)' : ''}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 12px; opacity: 0.8; margin-bottom: 5px;">До следующего уровня: ${this.app.user.getExpToNextLevel()} EXP</div>
                    <div style="width: 150px; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden;">
                        <div style="width: ${percent}%; height: 100%; background: var(--color-correct); transition: width 0.5s;"></div>
                    </div>
                </div>
            </div>

            <div style="text-align: right; margin-top: 10px; display: flex; gap: 10px; justify-content: flex-end;">
                ${authButtonHtml}
            </div>

            <h1 style="text-align:center; margin-top: 20px;">Welcome to JLPT Prep</h1>
            <p style="text-align:center; color: var(--text-color); opacity: 0.8;">Выберите уровень:</p>
            <div class="level-grid">
                <button class="level-btn" onclick="window.quiz.loadLevel('n5')">N5</button>
                <button class="level-btn" onclick="window.quiz.loadLevel('n4')">N4</button>
                <button class="level-btn" onclick="window.quiz.loadLevel('n3')">N3</button>
                <button class="level-btn" onclick="window.quiz.loadLevel('n2')">N2</button>
                <button class="level-btn" onclick="window.quiz.loadLevel('n1')">N1</button>
            </div>
            
            ${profile.isGuest ? `<p style="text-align:center; font-size: 12px; margin-top:20px; opacity: 0.7;">Сохраните свой прогресс, создав аккаунт!</p>` : ''}
        `;
        const container = document.createElement('div');
        container.innerHTML = html;
        this.app.ui.replaceView(container);
    }

    displayStartView() {
        let categoryHtml = '';
        const categories = [
            { id: 'kanji_reading', name: '漢字・語彙' },
            { id: 'kanji_writing', name: '漢字表記' },
            { id: 'affix_matching', name: '派生語・複合語' },
            { id: 'grammar', name: '文法' }
        ];

        categories.forEach(cat => {
            const keys = this.app.game.quizData[cat.id] ? Object.keys(this.app.game.quizData[cat.id]) : [];
            const total = keys.length;
            
            // Считаем сколько у юзера своих вопросов
            const customCount = this.app.user.profile.customQuestions?.[cat.id] ? Object.keys(this.app.user.profile.customQuestions[cat.id]).length : 0;

            let optionsHtml = '';
            for (let i = 0; i < total; i += 20) { 
                optionsHtml += `<option value="${i+1}-${Math.min(i+20, total)}">${i+1}〜${Math.min(i+20, total)}</option>`; 
            }

            categoryHtml += `
                <div class="card">
                    <strong style="font-size: 16px;">${cat.name}</strong>
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top:10px;">
                        ${total > 20 ? `<select id="range-${cat.id}" style="padding: 8px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-color);">${optionsHtml}</select>` : `<span>全${total}問</span>`}
                        <button class="btn btn-primary start-seq-btn" data-cat="${cat.id}">順番</button>
                        <button class="btn btn-primary start-rnd-btn" data-cat="${cat.id}">ランダム</button>
                        <button class="btn btn-secondary start-custom-btn" data-cat="${cat.id}" style="background-color: #9b59b6;">Мои задания (${customCount})</button>
                    </div>
                </div>
            `;
        });

        // Показываем кнопку админки только если юзер isAdmin
        const adminBtnHtml = this.app.user.profile.isAdmin 
            ? `<div style="text-align: right; margin-bottom: 20px;"><button class="btn btn-secondary adminBtn" style="background: #E74C3C;">⚙️ База (Админ)</button></div>` 
            : '';

        const html = `
            <h2>JLPT ${this.app.game.currentLevel.toUpperCase()}</h2>
            ${adminBtnHtml}
            ${categoryHtml}
            <div style="text-align:center; margin-top: 20px;"><button class="btn btn-secondary" onclick="window.quiz.displayMainMenu()">← 戻る</button></div>
        `;

        const parentElm = document.createElement('div');
        parentElm.innerHTML = html;

        if (this.app.user.profile.isAdmin) {
            parentElm.querySelector('.adminBtn').addEventListener('click', () => this.app.admin.displayAdminView());
        }

        // Биндим кнопку "По порядку" (восстановленная логика)
        parentElm.querySelectorAll('.start-seq-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const categoryId = e.target.getAttribute('data-cat');
                const select = parentElm.querySelector(`#range-${categoryId}`);
                let rangeStart = 1, rangeEnd = 20;
                
                if (select && select.value) {
                    const parts = select.value.split('-');
                    rangeStart = parseInt(parts[0]);
                    rangeEnd = parseInt(parts[1]);
                } else {
                    rangeEnd = Object.keys(this.app.game.quizData[categoryId] || {}).length;
                }
                this.app.game.startQuiz(categoryId, 'sequential', rangeStart, rangeEnd);
            });
        });

        // Биндим кнопку "Рандом"
        parentElm.querySelectorAll('.start-rnd-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.app.game.startQuiz(e.target.getAttribute('data-cat'), 'random'));
        });
        
        parentElm.querySelectorAll('.start-custom-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const categoryId = e.target.getAttribute('data-cat');
                this.app.ui.displayCustomQuestionsManager(categoryId);
            });
        });

        // ВАЖНО: Если ты используешь разделенные файлы (views/menu.js), оставь так:
        this.app.ui.replaceView(parentElm);
    }
}