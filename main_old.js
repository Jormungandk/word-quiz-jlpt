class WordQuiz {
    constructor(rootElm) {
        this.rootElm = rootElm;
        this.gameState = {
            category: null,
            step: 1,
            currentQuizKeys: [],
            results: [],
            currentLevel: 'n2',
            intervalKey: null,
            timeLimit: 60
        };
    }

    addThemeToggle() {
        const toggleBtn = document.createElement('button');
        toggleBtn.innerText = '🌓 Тема';
        toggleBtn.className = 'btn btn-secondary';
        toggleBtn.style.position = 'fixed';
        toggleBtn.style.top = '10px';
        toggleBtn.style.right = '10px';

        // 1. При инициализации кнопки проверяем, сохраняли ли мы темную тему ранее
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-theme');
        }

        // 2. При клике переключаем класс и сразу записываем новый выбор в память
        toggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            
            if (document.body.classList.contains('dark-theme')) {
                localStorage.setItem('theme', 'dark');
            } else {
                localStorage.setItem('theme', 'light');
            }
        });

        document.body.appendChild(toggleBtn);
    }

    async init() {
        this.addThemeToggle();
        this.rootElm.classList.add('quiz-container');

        window.addEventListener('beforeunload', (event) => {
            if (this.gameState && this.gameState.intervalKey !== null) {
                event.preventDefault();
                event.returnValue = '';
            }
        });

        const saved = sessionStorage.getItem('quizState');
        if (saved) {
            const parsedState = JSON.parse(saved);
            if (parsedState.currentQuizKeys && parsedState.currentQuizKeys.length > 0) {
                this.gameState = parsedState;
                this.gameState.intervalKey = null; // Сбрасываем старый таймер
                
                // ВОТ ЭТА СТРОКА ИСПРАВЛЯЕТ ОШИБКУ:
                // Восстанавливаем текущий уровень класса из сохраненной сессии
                this.currentLevel = this.gameState.currentLevel || 'n2'; 
                
                await this.fetchQuizData(this.currentLevel);
                this.displayQuestionView();
                return;
            }
        }

        this.displayMainMenu();
    }

    displayMainMenu() {
        const html = `
            <h1 style="text-align:center;">Welcome to JLPT Prep</h1>
            <p style="text-align:center; color: var(--text-color); opacity: 0.8;">Выберите уровень:</p>
            <div class="level-grid">
                <button class="level-btn" onclick="quiz.loadLevel('n5')">N5</button>
                <button class="level-btn" onclick="quiz.loadLevel('n4')">N4</button>
                <button class="level-btn" onclick="quiz.loadLevel('n3')">N3</button>
                <button class="level-btn" onclick="quiz.loadLevel('n2')">N2</button>
                <button class="level-btn" onclick="quiz.loadLevel('n1')">N1</button>
            </div>
        `;
        const container = document.createElement('div');
        container.innerHTML = html;
        this.replaceView(container);
    }

    // Метод загрузки данных по уровню
    async loadLevel(level) {
        this.currentLevel = level; // Сохраняем текущий уровень (например, 'n3')
        this.rootElm.innerHTML = '<p style="text-align:center;">Загрузка данных...</p>';
        await this.fetchQuizData(level);
        this.displayStartView();
    }

    async fetchQuizData(level = 'n2') {
        // 1. Очищаем старые данные, чтобы они не висели в памяти
        this.quizData = null; 
        
        try {
            // 2. Добавляем cache: 'no-store', чтобы браузер не подсовывал старый N2
            const response = await fetch(`data/${level}.json`, { cache: 'no-store' });
            
            // 3. fetch не бросает ошибку при 404, поэтому проверяем вручную
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.quizData = await response.json();
        } catch (e) {
            // 4. Твой любимый стиль вывода ошибки
            this.rootElm.innerHTML = `<div class="card">Уровень ${level.toUpperCase()} пока не доступен.</div>
            <button class="btn btn-secondary" onclick="quiz.displayMainMenu()">Назад</button>`;
            console.error(e);
        }
    }

    resetGame() {
        this.clearTimer(); // СНАЧАЛА останавливаем таймер, пока мы не удалили intervalKey!
        this.gameState = {
            category: null,
            step: 1,
            currentQuizKeys: [],
            results: [],
            currentLevel: this.currentLevel || 'n2',
            intervalKey: null,
            timeLimit: 60
        };
    }

    replaceView(elm) {
        this.rootElm.innerHTML = '';
        this.rootElm.appendChild(elm);
    }

    setTimer() {
        if (this.gameState.intervalKey !== null) return;
        
        // Если времени нет (вдруг ошибка), ставим 60
        if (typeof this.gameState.timeLimit === 'undefined') {
            this.gameState.timeLimit = 60;
        }

        this.gameState.intervalKey = setInterval(() => {
            this.gameState.timeLimit--;
            this.saveState(); // Записываем каждую секунду, чтобы при F5 время не сбросилось
            
            if (this.gameState.timeLimit <= 0) {
                this.addResult(true); 
                this.nextStep();
            } else {
                this.renderTimeLimitStr();
            }
        }, 1000);
    }

    clearTimer() {
        if (this.gameState.intervalKey) {
            clearInterval(this.gameState.intervalKey);
            this.gameState.intervalKey = null;
        }
    }

    renderTimeLimitStr() {
        const secElm = this.rootElm.querySelector('.sec');
        if (secElm) {
            secElm.innerText = `残り解答時間: ${this.gameState.timeLimit} 秒`;
        }
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    saveState() {
        this.gameState.currentLevel = this.currentLevel;
        sessionStorage.setItem('quizState', JSON.stringify(this.gameState));
    }

    loadSavedState() {
        const saved = localStorage.getItem('quizState');
        if (saved) {
            this.gameState = JSON.parse(saved);
            if (this.gameState.currentQuizKeys && this.gameState.currentQuizKeys.length > 0) return true;
        }
        return false;
    }

    startQuiz(categoryId, mode = 'random', rangeStart = 1, rangeEnd = 20) {
        const allKeys = Object.keys(this.quizData[categoryId]).sort((a, b) => {
            return parseInt(a.replace('step', '')) - parseInt(b.replace('step', ''));
        });

        this.gameState.category = categoryId;
        this.gameState.currentQuizKeys = (mode === 'sequential') ? allKeys.slice(rangeStart - 1, rangeEnd) : this.shuffleArray(allKeys).slice(0, 20);
        this.gameState.step = 1;
        this.gameState.results = [];
        this.gameState.timeLimit = 60; // Устанавливаем 60 сек для первого вопроса

        this.displayQuestionView();
        this.saveState();
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
            const keys = this.quizData[cat.id] ? Object.keys(this.quizData[cat.id]) : [];
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
            <h2>JLPT ${this.currentLevel.toUpperCase()} 総合模擬クイズ</h2>
            <div style="text-align: right; margin-bottom: 20px;">
                <button class="btn btn-secondary adminBtn">⚙️ データベース管理</button>
            </div>
            ${categoryHtml}
            <div style="text-align:center; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="quiz.displayMainMenu()">← 戻る</button>
            </div>
        `;

        const parentElm = document.createElement('div');
        parentElm.innerHTML = html;

        parentElm.querySelector('.adminBtn').addEventListener('click', () => this.displayAdminView());

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
                    const totalKeys = Object.keys(this.quizData[categoryId]).length;
                    rangeEnd = totalKeys;
                }
                
                this.startQuiz(categoryId, 'sequential', rangeStart, rangeEnd);
            });
        });

        parentElm.querySelectorAll('.start-rnd-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.startQuiz(e.target.getAttribute('data-cat'), 'random');
            });
        });

        this.replaceView(parentElm);
    }

    displayAdminView() {
        const html = `
            <h2>データベース管理</h2>
            <div class="admin-panel">                
                <div>
                    <label style="font-weight: bold;">操作モード:</label><br>
                    <label><input type="radio" name="admin-mode" value="new" checked> 新規追加</label>
                    <label style="margin-left: 15px;"><input type="radio" name="admin-mode" value="edit"> 既存編集</label>
                </div>

                <div>
                    <label style="font-weight: bold;">カテゴリー:</label><br>
                    <select id="admin-category" style="width: 100%; padding: 8px; background: var(--bg-color); color: var(--text-color);">
                        <option value="kanji_reading">漢字・語彙 (文字の読み)</option>
                        <option value="kanji_writing">漢字表記 (正しく書く)</option>
                        <option value="affix_matching">派生語・複合語 (接頭辞・接尾辞)</option>
                        <option value="grammar">文法</option>
                    </select>
                </div>

                <div id="admin-question-selector-container" style="display: none;">
                    <label style="font-weight: bold;">編集する問題:</label><br>
                    <select id="admin-question-select" style="width: 100%; padding: 8px; background: var(--bg-color); color: var(--text-color);">
                        <option value="">問題を選択してください...</option>
                    </select>
                </div>

                <div>
                    <label style="font-weight: bold;">問題文:</label><br>
                    <span style="font-size: 12px; opacity: 0.7;">※下線は &lt;u&gt; と &lt;/u&gt; で囲んでください</span>
                    <textarea id="admin-word" rows="2" style="width: 100%; padding: 8px; background: var(--bg-color); color: var(--text-color);" placeholder="例: 彼を<u>非難</u>するつもりはない。"></textarea>
                </div>

                <div>
                    <label style="font-weight: bold;">選択肢:</label><br>
                    <span style="font-size: 12px; opacity: 0.7;">※カンマ(,)区切りで4つ入力してください</span>
                    <input type="text" id="admin-choices" style="width: 100%; padding: 8px; background: var(--bg-color); color: var(--text-color);" placeholder="例: ひなん, びなん, ひねん, はいなん">
                </div>

                <div>
                    <label style="font-weight: bold;">正解:</label><br>
                    <span style="font-size: 12px; opacity: 0.7;">※選択肢のいずれかと完全一致させてください</span>
                    <input type="text" id="admin-answer" style="width: 100%; padding: 8px; background: var(--bg-color); color: var(--text-color);" placeholder="例: ひなん">
                </div>

                <div>
                    <label style="font-weight: bold;">解説:</label><br>
                    <span style="font-size: 12px; opacity: 0.7;">※任意：改行はそのまま反映されます</span>
                    <textarea id="admin-explanation" rows="4" style="width: 100%; padding: 8px; background: var(--bg-color); color: var(--text-color);" placeholder="例: 【意味】：〜を責めること。"></textarea>
                </div>

                <div class="actions" style="margin-top: 15px; display: flex; flex-direction: column; gap: 10px;">
                    <button class="btn btn-primary" id="saveQuestionBtn">保存</button>
                    <button class="btn btn-danger" id="deleteQuestionBtn" style="display: none;">削除</button>
                    <button class="btn btn-secondary" id="backBtn">キャンセル</button>
                </div>
            </div>
        `;

        const parentElm = document.createElement('div');
        parentElm.innerHTML = html;

        const modeRadios = parentElm.querySelectorAll('input[name="admin-mode"]');
        const categorySelect = parentElm.querySelector('#admin-category');
        const questionSelectorContainer = parentElm.querySelector('#admin-question-selector-container');
        const questionSelect = parentElm.querySelector('#admin-question-select');
        
        const wordInput = parentElm.querySelector('#admin-word');
        const choicesInput = parentElm.querySelector('#admin-choices');
        const answerInput = parentElm.querySelector('#admin-answer');
        const explanationInput = parentElm.querySelector('#admin-explanation');

        const updateQuestionSelect = () => {
            const category = categorySelect.value;
            questionSelect.innerHTML = '<option value="">問題を選択してください...</option>';
            
            if (this.quizData && this.quizData[category]) {
                Object.keys(this.quizData[category]).forEach(key => {
                    const q = this.quizData[category][key];
                    const cleanWord = q.word.replace(/<[^>]*>?/gm, '').substring(0, 20) + '...';
                    questionSelect.innerHTML += `<option value="${key}">${key}: ${cleanWord}</option>`;
                });
            }
        };

        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'edit') {
                    questionSelectorContainer.style.display = 'block';
                    updateQuestionSelect();
                } else {
                    questionSelectorContainer.style.display = 'none';
                    wordInput.value = '';
                    choicesInput.value = '';
                    answerInput.value = '';
                    explanationInput.value = '';
                }
            });
        });

        categorySelect.addEventListener('change', () => {
            if (parentElm.querySelector('input[name="admin-mode"]:checked').value === 'edit') {
                updateQuestionSelect();
            }
        });

        questionSelect.addEventListener('change', (e) => {
            const key = e.target.value;
            const category = categorySelect.value;
            if (key && this.quizData[category][key]) {
                const q = this.quizData[category][key];
                wordInput.value = q.word;
                choicesInput.value = q.choices.join(', ');
                answerInput.value = q.answer;
                explanationInput.value = q.explanation || '';
            } else {
                wordInput.value = '';
                choicesInput.value = '';
                answerInput.value = '';
                explanationInput.value = '';
            }
        });

        parentElm.querySelector('#backBtn').addEventListener('click', () => {
            this.displayStartView();
        });

        parentElm.querySelector('#saveQuestionBtn').addEventListener('click', async () => {
            const mode = parentElm.querySelector('input[name="admin-mode"]:checked').value;
            const category = categorySelect.value;
            const stepKey = mode === 'edit' ? questionSelect.value : null;

            if (mode === 'edit' && !stepKey) {
                alert("編集する問題を選択してください！");
                return;
            }

            const word = wordInput.value.trim();
            const choicesStr = choicesInput.value;
            const answer = answerInput.value.trim();
            const explanation = explanationInput.value.trim();

            if (!word || !choicesStr || !answer) {
                alert("必須項目を入力してください！");
                return;
            }

            const choices = choicesStr.split(',').map(c => c.trim()).filter(c => c !== "");
            if (choices.length !== 4) {
                alert(`選択肢は4つである必要があります。`);
                return;
            }

            const newQuestion = { word, choices, answer };
            if (explanation) {
                newQuestion.explanation = explanation;
            }

            try {
                const response = await fetch('/api/save_question', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category, question: newQuestion, stepKey })
                });

                const result = await response.json();
                
                if (result.status === 'success') {
                    alert(`保存しました！ (${result.step})`);
                    await this.fetchQuizData();
                    
                    if (mode === 'new') {
                        wordInput.value = '';
                        choicesInput.value = '';
                        answerInput.value = '';
                        explanationInput.value = '';
                    } else {
                        updateQuestionSelect();
                        questionSelect.value = result.step;
                    }
                } else {
                    alert("サーバーエラー: " + result.message);
                }
            } catch (error) {
                alert("通信エラー。");
            }
        });
        
        const deleteBtn = parentElm.querySelector('#deleteQuestionBtn');

        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                deleteBtn.style.display = (e.target.value === 'edit') ? 'block' : 'none';
            });
        });

        deleteBtn.addEventListener('click', async () => {
            const category = categorySelect.value;
            const stepKey = questionSelect.value;
            
            if (!stepKey) {
                alert("削除する問題を選択してください！");
                return;
            }

            if (!confirm("本当に削除しますか？")) return;

            try {
                const response = await fetch('/api/delete_question', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category, stepKey })
                });

                const result = await response.json();
                if (result.status === 'success') {
                    alert("削除しました！");
                    await this.fetchQuizData();
                    updateQuestionSelect();
                    wordInput.value = ''; 
                    choicesInput.value = '';
                    answerInput.value = '';
                    explanationInput.value = '';
                } else {
                    alert("削除エラー: " + result.message);
                }
            } catch (error) {
                alert("通信エラー。");
            }
        });

        this.replaceView(parentElm);
    }

    displayQuestionView() {
        this.setTimer(); 
        const currentKey = this.gameState.currentQuizKeys[this.gameState.step - 1];
        const currentQuestion = this.quizData[this.gameState.category][currentKey];
        this.gameState.currentShuffledChoices = this.shuffleArray(currentQuestion.choices);
        
        const html = `
            <h2>問題 ${this.gameState.step} / ${this.gameState.currentQuizKeys.length}</h2>
            <div class="card">${currentQuestion.word.replace('\n', '<br>')}</div>
            <div class="card">
                ${this.gameState.currentShuffledChoices.map((c, i) => `
                    <label style="display:block; margin: 10px 0;"><input type="radio" name="choice" value="${c}" /> ${i + 1}. ${c}</label>
                `).join('')}
            </div>
            <div class="actions">
                <button class="btn btn-secondary emergencyBtn">テストを強制終了</button>
                <button class="btn btn-primary nextBtn">解答する</button>
            </div>
            <p class="sec" style="margin-top: 10px;">残り解答時間: ${this.gameState.timeLimit} 秒</p>
        `;

        const parentElm = document.createElement('div');
        parentElm.innerHTML = html;
        parentElm.querySelector('.emergencyBtn').addEventListener('click', () => this.emergencyExit());
        parentElm.querySelector('.nextBtn').addEventListener('click', () => {
            if (!parentElm.querySelector('input[name="choice"]:checked')) return alert('回答を選んでください');
            this.addResult(false); 
            this.nextStep();
        });
        this.replaceView(parentElm);
    }

    addResult(isSkipped = false) {
        const currentKey = this.gameState.currentQuizKeys[this.gameState.step - 1];
        const currentQuestion = this.quizData[this.gameState.category][currentKey];
        
        let answer = '';
        if (!isSkipped) {
            const checkedElm = this.rootElm.querySelector('input[name="choice"]:checked');
            answer = checkedElm ? checkedElm.value : '';
        }

        this.gameState.results.push({
            question: currentQuestion,
            selectedAnswer: answer,
            skipped: isSkipped,
            presentedChoices: this.gameState.currentShuffledChoices
        });
    }

    emergencyExit() {
        const confirmExit = confirm("本当にテストを強制終了して結果画面へ進みますか？");
        if (confirmExit) {
            this.clearTimer();
            
            const totalQuestions = this.gameState.currentQuizKeys.length;
            while (this.gameState.results.length < totalQuestions) {
                const nextKey = this.gameState.currentQuizKeys[this.gameState.results.length];
                const nextQ = this.quizData[this.gameState.category][nextKey];
                
                this.gameState.results.push({
                    question: nextQ,
                    selectedAnswer: '',
                    skipped: true,
                    presentedChoices: this.shuffleArray(nextQ.choices)
                });
            }
            
            this.displayResultView();
        }
    }

    isLastStep() {
        return this.gameState.step === this.gameState.currentQuizKeys.length; 
    }

    nextStep() {
        this.clearTimer(); 

        if (this.isLastStep()) {
            this.displayResultView();
        } else {
            this.gameState.step++;
            this.gameState.timeLimit = 60; // Устанавливаем 60 сек для следующего вопроса
            this.displayQuestionView();
            this.saveState();
        }
    }

    calcScore() {
        let correctNum = 0;
        for (const result of this.gameState.results) {
            if (!result.skipped && result.selectedAnswer === result.question.answer) {
                correctNum++;
            }
        }
        return correctNum;
    }

    displayResultView() {
        sessionStorage.removeItem('quizState'); // Удаляем тест (чтобы F5 не кидал обратно)
        this.gameState.currentQuizKeys = []; // Полностью очищаем активный список

        const correctCount = this.calcScore();
        const totalQuestions = this.gameState.results.length;
        const scorePercent = totalQuestions > 0 ? Math.floor((correctCount / totalQuestions) * 100) : 0;

        const html = `
            <h2>結果発表</h2>
            <div class="card" style="text-align:center;">正解数: ${totalQuestions}問中 ${correctCount}問正解 (${scorePercent}%)</div>
            <div style="text-align:center; margin-top:30px;">
                <button class="btn btn-secondary resetBtn">メニューに戻る</button>
                <button class="btn btn-primary reviewBtn" style="background-color: #2F2FE4;">結果を確認する</button>
            </div>
        `;

        const parentElm = document.createElement('div');
        parentElm.className = 'results';
        parentElm.innerHTML = html;

        parentElm.querySelector('.resetBtn').addEventListener('click', () => {
            this.resetGame(); 
            this.displayStartView(); 
        });

        parentElm.querySelector('.reviewBtn').addEventListener('click', () => {
            this.displayReviewView();
        });

        this.replaceView(parentElm);
    }

    displayReviewView() {
        let reviewHtml = `<h2>解答結果の詳細</h2>`;

        this.gameState.results.forEach((result, index) => {
            const q = result.question;
            const userAns = result.selectedAnswer;
            const correctAns = q.answer;
            const isCorrect = (!result.skipped && userAns === correctAns);

            let statusBadge = result.skipped ? `<span class="badge badge-skipped">未解答</span>` : (isCorrect ? `<span class="badge badge-correct">正解</span>` : `<span class="badge badge-wrong">不正解</span>`);
            
            let choicesDetails = result.presentedChoices.map((choice, i) => {
                let cls = '';
                let label = '';
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

window.quiz = new WordQuiz(document.getElementById('app'));
window.quiz.init();