export class QuizUI {
    constructor(app) {
        this.app = app;
    }

    displayQuestionView() {
        this.app.game.setTimer(); 
        const state = this.app.game.gameState;
        const currentKey = state.currentQuizKeys[state.step - 1];
        
        // Берем вопрос из правильного источника (кастомный или глобальный)
        const source = state.isCustomMode 
            ? this.app.user.profile.customQuestions[state.category]
            : this.app.game.quizData[state.category];
            
        const currentQuestion = source[currentKey];
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
        this.app.ui.replaceView(parentElm);
    }

    renderTimeLimitStr() {
        const secElm = this.app.ui.rootElm.querySelector('.sec');
        if (secElm) secElm.innerText = `残り解答時間: ${this.app.game.gameState.timeLimit} 秒`;
    }

    async displayResultView() {
        sessionStorage.removeItem('quizState'); 
        this.app.game.gameState.currentQuizKeys = []; 

        const correctCount = this.app.game.calcScore();
        const totalQuestions = this.app.game.gameState.results.length;
        const scorePercent = totalQuestions > 0 ? Math.floor((correctCount / totalQuestions) * 100) : 0;
        const expGained = correctCount * 10;
        
        const isQuestCompleted = await this.app.user.checkDailyQuest(totalQuestions, correctCount);
        
        if (!this.app.game.gameState.expAwarded && totalQuestions > 0) {
            this.app.game.gameState.lastExpResult = this.app.user.addExp(expGained);
            this.app.game.gameState.expAwarded = true; 
        }

        const expResult = this.app.game.gameState.lastExpResult || { leveledUp: false, newLevel: this.app.user.profile.level };
        
        let alertsHtml = '';
        if (expResult.leveledUp) {
            alertsHtml += `<div style="color: var(--color-correct); font-weight: bold; margin-top: 10px;">🎉 Уровень повышен до ${expResult.newLevel}! 🎉</div>`;
        }
        if (isQuestCompleted) {
            alertsHtml += `<div style="color: #F1C40F; font-weight: bold; margin-top: 10px;">📅 Ежедневное задание выполнено! День засчитан.</div>`;
        }

        const html = `
            <h2>結果発表</h2>
            <div class="card" style="text-align:center;">
                <div style="font-size: 20px; margin-bottom: 10px;">正解数: ${totalQuestions}問中 ${correctCount}問正解 (${scorePercent}%)</div>
                <div style="color: var(--btn-primary); font-weight: bold;">+ ${expGained} EXP 獲得！</div>
                ${alertsHtml}
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
            this.app.ui.displayStartView(); 
        });
        parentElm.querySelector('.reviewBtn').addEventListener('click', () => this.displayReviewView());

        this.app.ui.replaceView(parentElm);
    }

    displayReviewView() {
        let reviewHtml = `<h2>解答結果の詳細</h2>`;
        const isCustomMode = this.app.game.gameState.isCustomMode;

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

            // Кнопка добавления в свои задания (Делаем ее заметной!)
            const addBtnHtml = !isCustomMode 
                ? `<button class="btn add-custom-btn" data-index="${index}" style="padding: 4px 10px; font-size: 12px; margin-left: 15px; background: #27AE60; color:white; border-radius:4px;">➕ В мои задания</button>`
                : '';

            reviewHtml += `
                <div class="review-item card ${result.skipped ? 'review-skipped' : ''}" style="margin-bottom: 25px;">
                    <div style="font-size: 16px; margin-bottom: 10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div>問 ${index + 1}: ${q.word} ${statusBadge}</div>
                        ${addBtnHtml}
                    </div>
                    <div>${choicesDetails}</div>
                    ${q.explanation ? `<details style="margin-top:10px;"><summary style="cursor:pointer; color:var(--btn-primary);">文法解説を見る</summary><div style="padding:10px;">${q.explanation}</div></details>` : ''}
                </div>
            `;
        });

        reviewHtml += `<div style="text-align:center;"><button class="btn btn-secondary backToResultBtn">結果画面に戻る</button></div>`;
        const parentElm = document.createElement('div');
        parentElm.innerHTML = reviewHtml;
        
        parentElm.querySelectorAll('.add-custom-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const qIndex = e.target.getAttribute('data-index');
                const questionToSave = this.app.game.gameState.results[qIndex].question;
                const category = this.app.game.gameState.category;
                
                this.app.user.addCustomQuestion(category, questionToSave);
                
                e.target.innerText = '✔️ Добавлено';
                e.target.disabled = true;
                e.target.style.background = '#7f8c8d';
            });
        });

        parentElm.querySelector('.backToResultBtn').addEventListener('click', () => this.displayResultView());
        this.app.ui.replaceView(parentElm);
    }

    // --- НОВЫЙ МЕТОД: Личный Кабинет кастомных заданий (Блокнот) ---
    displayCustomQuestionsManager(categoryId) {
        const customQuestions = this.app.user.profile.customQuestions?.[categoryId] || {};
        const totalCustom = Object.keys(customQuestions).length;

        // Генерация списка уже существующих личных вопросов
        let questionsListHtml = '';
        if (totalCustom === 0) {
            questionsListHtml = '<p style="opacity:0.6; font-style:italic;">В этом блоке пока нет вопросов. Пропишите их ниже вручную или добавьте из общих тестов!</p>';
        } else {
            Object.keys(customQuestions).forEach(key => {
                const q = customQuestions[key];
                questionsListHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-color); border:1px solid var(--border-color); padding:10px; margin-bottom:8px; border-radius:6px;">
                        <div style="font-size:14px; max-width:80%; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
                            <strong>${q.word.replace(/<[^>]*>?/gm, '')}</strong> <span style="opacity:0.6;">(Ответ: ${q.answer})</span>
                        </div>
                        <button class="btn btn-danger delete-custom-btn" data-key="${key}" style="padding:2px 8px; font-size:11px;">Удалить</button>
                    </div>
                `;
            });
        }

        const catNames = {
            kanji_reading: '漢字・語彙',
            kanji_writing: '漢字表記',
            affix_matching: '派生語・複合語',
            grammar: '文法'
        };

        const html = `
            <h2>📓 Мой блокнот: ${catNames[categoryId] || categoryId}</h2>
            
            <div class="card" style="text-align:center;">
                <div style="font-size:16px; margin-bottom:12px;">У вас создано: <strong>${totalCustom}</strong> вопросов.</div>
                <button class="btn btn-primary start-custom-test-btn" style="background:#9b59b6; width:100%;" ${totalCustom === 0 ? 'disabled style="background:#bdc3c7; cursor:not-allowed;"' : ''}>
                    ▶️ Запустить тест по моим заданиям
                </button>
            </div>

            <h3>📋 Список моих карточек</h3>
            <div class="card" style="max-height:200px; overflow-y:auto; background:rgba(0,0,0,0.02);">
                ${questionsListHtml}
            </div>

            <h3>✍️ Добавить новое задание вручную</h3>
            <div class="card" style="border-left: 5px solid #9b59b6;">
                <div style="margin-bottom:10px;">
                    <label>Текст вопроса (используйте &lt;u&gt;слово&lt;/u&gt; для нижнего подчеркивания):</label>
                    <textarea id="c-word" rows="2" style="width:100%; padding:8px; margin-top:5px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color); border-radius:4px;" placeholder="Пример: この計画を<u>普及</u>させる。"></textarea>
                </div>
                
                <div style="margin-bottom:10px;">
                    <label>Варианты ответов (4 штуки):</label>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:5px;">
                        <input type="text" class="c-choice" placeholder="Вариант 1">
                        <input type="text" class="c-choice" placeholder="Вариант 2">
                        <input type="text" class="c-choice" placeholder="Вариант 3">
                        <input type="text" class="c-choice" placeholder="Вариант 4">
                    </div>
                </div>

                <div style="margin-bottom:10px;">
                    <label>Правильный ответ (должен в точности совпадать с одним из вариантов):</label>
                    <input type="text" id="c-answer" style="width:100%; padding:8px; margin-top:5px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color); border-radius:4px;" placeholder="Пример: ふきゅう">
                </div>

                <div style="margin-bottom:15px;">
                    <label>Пояснение / Грамматический разбор (необязательно):</label>
                    <textarea id="c-explanation" rows="3" style="width:100%; padding:8px; margin-top:5px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color); border-radius:4px;" placeholder="Пример: Грамматика означает..."></textarea>
                </div>

                <button class="btn btn-primary" id="saveManualBtn" style="background:#9b59b6; width:100%;">💾 Сохранить в блокнот</button>
            </div>

            <div style="text-align:center; margin-top:20px;">
                <button class="btn btn-secondary backToMenuBtn">← Назад в меню выбора</button>
            </div>
        `;

        const container = document.createElement('div');
        container.innerHTML = html;

        // Навешиваем событие запуска теста
        if (totalCustom > 0) {
            container.querySelector('.start-custom-test-btn').addEventListener('click', () => {
                this.app.game.startQuiz(categoryId, 'custom');
            });
        }

        // Кнопка Назад
        container.querySelector('.backToMenuBtn').addEventListener('click', () => this.app.ui.displayStartView());

        // Удаление вопроса
        container.querySelectorAll('.delete-custom-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.target.getAttribute('data-key');
                if (confirm('Удалить этот вопрос из вашего блокнота?')) {
                    this.app.user.removeCustomQuestion(categoryId, key);
                    this.displayCustomQuestionsManager(categoryId); // Перерисовываем экран
                }
            });
        });

        // Ручное сохранение вопроса
        container.querySelector('#saveManualBtn').addEventListener('click', () => {
            const word = container.querySelector('#c-word').value.trim();
            const answer = container.querySelector('#c-answer').value.trim();
            const explanation = container.querySelector('#c-explanation').value.trim();
            
            const choiceInputs = container.querySelectorAll('.c-choice');
            const choices = Array.from(choiceInputs).map(inp => inp.value.trim()).filter(val => val !== "");

            if (!word || !answer) return alert('Пожалуйста, заполните текст вопроса и правильный ответ!');
            if (choices.length !== 4) return alert('Вы должны заполнить все 4 варианта ответа!');
            if (!choices.includes(answer)) return alert('Правильный ответ должен в точности совпадать с одним из четырех заполненных вариантов!');

            const newQ = { word, choices, answer };
            if (explanation) newQ.explanation = explanation;

            // Записываем в localStorage через UserManager
            this.app.user.addCustomQuestion(categoryId, newQ);
            alert('Вопрос успешно сохранен в ваш личный блокнот!');
            
            // Обновляем текущий менеджер-экран
            this.displayCustomQuestionsManager(categoryId);
        });

        this.app.ui.replaceView(container);
    }
}