export class AppUI {
    constructor(app) {
        this.app = app;
        this.rootElm = app.rootElm;
    }

    replaceView(elm) {
        this.rootElm.innerHTML = '';
        this.rootElm.appendChild(elm);
    }

    addThemeToggle() {
        const toggleBtn = document.createElement('button');
        toggleBtn.innerText = '🌓 Тема';
        toggleBtn.className = 'btn btn-secondary';
        toggleBtn.style.position = 'fixed';
        toggleBtn.style.top = '10px';
        toggleBtn.style.right = '10px';

        if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-theme');

        toggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            if (document.body.classList.contains('dark-theme')) localStorage.setItem('theme', 'dark');
            else localStorage.setItem('theme', 'light');
        });

        document.body.appendChild(toggleBtn);
    }

    displayMainMenu() {
        const profile = this.app.user.profile;
        const percent = this.app.user.getProgressPercent();

        const html = `
            <div class="card" style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-color); border: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 40px;">${profile.avatar}</div>
                    <div>
                        <strong style="font-size: 18px;">${profile.username}</strong>
                        <div style="font-size: 14px; opacity: 0.8;">Уровень ${profile.level}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 12px; opacity: 0.8; margin-bottom: 5px;">До следующего уровня: ${this.app.user.getExpToNextLevel()} EXP</div>
                    <div style="width: 150px; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden;">
                        <div style="width: ${percent}%; height: 100%; background: var(--color-correct); transition: width 0.5s;"></div>
                    </div>
                </div>
            </div>

            <h1 style="text-align:center; margin-top: 30px;">Welcome to JLPT Prep</h1>
            <p style="text-align:center; color: var(--text-color); opacity: 0.8;">Выберите уровень:</p>
            <div class="level-grid">
                <button class="level-btn" onclick="window.quiz.loadLevel('n5')">N5</button>
                <button class="level-btn" onclick="window.quiz.loadLevel('n4')">N4</button>
                <button class="level-btn" onclick="window.quiz.loadLevel('n3')">N3</button>
                <button class="level-btn" onclick="window.quiz.loadLevel('n2')">N2</button>
                <button class="level-btn" onclick="window.quiz.loadLevel('n1')">N1</button>
            </div>
            
            ${profile.isGuest ? `<div style="text-align:center; margin-top: 20px;"><button class="btn btn-secondary" style="font-size: 12px;">💾 Зарегистрироваться и сохранить прогресс</button></div>` : ''}
        `;
        const container = document.createElement('div');
        container.innerHTML = html;
        this.replaceView(container);
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
            if (total === 0) return;

            let optionsHtml = '';
            for (let i = 0; i < total; i += 20) {
                optionsHtml += `<option value="${i+1}-${Math.min(i+20, total)}">${i+1}〜${Math.min(i+20, total)}</option>`;
            }

            categoryHtml += `
                <div class="card">
                    <strong style="font-size: 16px;">${cat.name}</strong>
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top:10px;">
                        ${total > 20 ? `<select id="range-${cat.id}" style="padding: 8px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-color);">${optionsHtml}</select>` : `<span>全${total}問</span>`}
                        <button class="btn btn-primary start-seq-btn" data-cat="${cat.id}">順番に開始</button>
                        <button class="btn btn-primary start-rnd-btn" data-cat="${cat.id}">ランダム</button>
                    </div>
                </div>
            `;
        });

        const html = `
            <h2>JLPT ${this.app.game.currentLevel.toUpperCase()} 総合模擬クイズ</h2>
            <div style="text-align: right; margin-bottom: 20px;">
                <button class="btn btn-secondary adminBtn">⚙️ データベース管理</button>
            </div>
            ${categoryHtml}
            <div style="text-align:center; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="window.quiz.displayMainMenu()">← 戻る</button>
            </div>
        `;

        const parentElm = document.createElement('div');
        parentElm.innerHTML = html;

        parentElm.querySelector('.adminBtn').addEventListener('click', () => this.app.admin.displayAdminView());

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
                    rangeEnd = Object.keys(this.app.game.quizData[categoryId]).length;
                }
                this.app.game.startQuiz(categoryId, 'sequential', rangeStart, rangeEnd);
            });
        });

        parentElm.querySelectorAll('.start-rnd-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.app.game.startQuiz(e.target.getAttribute('data-cat'), 'random'));
        });

        this.replaceView(parentElm);
    }

    displayQuestionView() {
        this.app.game.setTimer(); 
        const state = this.app.game.gameState;
        const currentKey = state.currentQuizKeys[state.step - 1];
        const currentQuestion = this.app.game.quizData[state.category][currentKey];
        state.currentShuffledChoices = this.app.game.shuffleArray(currentQuestion.choices);
        
        const html = `
            <h2>問題 ${state.step} / ${state.currentQuizKeys.length}</h2>
            <div class="card">${currentQuestion.word.replace('\n', '<br>')}</div>
            <div class="card">
                ${state.currentShuffledChoices.map((c, i) => `
                    <label style="display:block; margin: 10px 0;"><input type="radio" name="choice" value="${c}" /> ${i + 1}. ${c}</label>
                `).join('')}
            </div>
            <div class="actions">
                <button class="btn btn-secondary emergencyBtn">テストを強制終了</button>
                <button class="btn btn-primary nextBtn">解答する</button>
            </div>
            <p class="sec" style="margin-top: 10px;">残り解答時間: ${state.timeLimit} 秒</p>
        `;

        const parentElm = document.createElement('div');
        parentElm.innerHTML = html;
        parentElm.querySelector('.emergencyBtn').addEventListener('click', () => this.app.game.emergencyExit());
        parentElm.querySelector('.nextBtn').addEventListener('click', () => {
            if (!parentElm.querySelector('input[name="choice"]:checked')) return alert('回答を選んでください');
            this.app.game.addResult(false); 
            this.app.game.nextStep();
        });
        this.replaceView(parentElm);
    }

    renderTimeLimitStr() {
        const secElm = this.rootElm.querySelector('.sec');
        if (secElm) secElm.innerText = `残り解答時間: ${this.app.game.gameState.timeLimit} 秒`;
    }

    displayResultView() {
        sessionStorage.removeItem('quizState'); 
        this.app.game.gameState.currentQuizKeys = []; 

        const correctCount = this.app.game.calcScore();
        const totalQuestions = this.app.game.gameState.results.length;
        const scorePercent = totalQuestions > 0 ? Math.floor((correctCount / totalQuestions) * 100) : 0;
        const expGained = correctCount * 10;
        
        // --- ЗАЩИТА ОТ АБУЗА ОПЫТА ---
        // Проверяем, выдавали ли мы уже опыт за этот конкретный тест
        if (!this.app.game.gameState.expAwarded && totalQuestions > 0) {
            this.app.game.gameState.lastExpResult = this.app.user.addExp(expGained);
            this.app.game.gameState.expAwarded = true; // Ставим блокировку
        }

        // Достаем результаты повышения уровня из памяти (чтобы плашка не пропадала при возврате)
        const expResult = this.app.game.gameState.lastExpResult || { leveledUp: false, newLevel: this.app.user.profile.level };
        
        let levelUpHtml = '';
        if (expResult.leveledUp) {
            levelUpHtml = `<div style="color: var(--color-correct); font-weight: bold; margin-top: 10px; animation: pop 0.5s ease;">🎉 Уровень повышен до ${expResult.newLevel}! 🎉</div>`;
        }

        const html = `
            <h2>結果発表</h2>
            <div class="card" style="text-align:center;">
                <div style="font-size: 20px; margin-bottom: 10px;">正解数: ${totalQuestions}問中 ${correctCount}問正解 (${scorePercent}%)</div>
                <div style="color: var(--btn-primary); font-weight: bold;">+ ${expGained} EXP 獲得！</div>
                ${levelUpHtml}
            </div>
            <div style="text-align:center; margin-top:30px;">
                <button class="btn btn-secondary resetBtn">メニューに戻る</button>
                <button class="btn btn-primary reviewBtn" style="background-color: #2F2FE4;">結果を確認する</button>
            </div>
        `;

        const parentElm = document.createElement('div');
        parentElm.className = 'results';
        parentElm.innerHTML = html;

        parentElm.querySelector('.resetBtn').addEventListener('click', () => {
            this.app.game.resetGame(); 
            this.displayStartView(); 
        });
        parentElm.querySelector('.reviewBtn').addEventListener('click', () => this.displayReviewView());

        this.replaceView(parentElm);
    }

    displayReviewView() {
        let reviewHtml = `<h2>解答結果の詳細</h2>`;

        this.app.game.gameState.results.forEach((result, index) => {
            const q = result.question;
            const userAns = result.selectedAnswer;
            const correctAns = q.answer;
            const isCorrect = (!result.skipped && userAns === correctAns);

            let statusBadge = result.skipped ? `<span class="badge badge-skipped">未解答</span>` : (isCorrect ? `<span class="badge badge-correct">正解</span>` : `<span class="badge badge-wrong">不正解</span>`);
            
            let choicesDetails = result.presentedChoices.map((choice, i) => {
                let cls = ''; let label = '';
                if (isCorrect && choice === correctAns) { cls = 'status-correct'; label = '（あなたの正解）'; }
                else if (!isCorrect) {
                    if (choice === userAns && !result.skipped) { cls = 'status-wrong'; label = '（あなたの誤答）'; }
                    else if (choice === correctAns) { cls = 'status-hint'; label = '（正しい解答）'; }
                }
                return `<div class="${cls}" style="margin: 4px 0 4px 20px;">・ ${i + 1}. ${choice} ${label}</div>`;
            }).join('');

            reviewHtml += `
                <div class="review-item card ${result.skipped ? 'review-skipped' : ''}" style="margin-bottom: 25px;">
                    <div style="font-size: 16px; margin-bottom: 10px;">問 ${index + 1}: ${q.word} ${statusBadge}</div>
                    <div>${choicesDetails}</div>
                    ${q.explanation ? `<details style="margin-top:10px;"><summary style="cursor:pointer; color:var(--btn-primary);">文法解説を見る</summary><div style="padding:10px;">${q.explanation}</div></details>` : ''}
                </div>
            `;
        });

        reviewHtml += `<div style="text-align:center;"><button class="btn btn-secondary backToResultBtn">結果画面に戻る</button></div>`;
        const parentElm = document.createElement('div');
        parentElm.innerHTML = reviewHtml;
        parentElm.querySelector('.backToResultBtn').addEventListener('click', () => this.displayResultView());
        this.replaceView(parentElm);
    }
}