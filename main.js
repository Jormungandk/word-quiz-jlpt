class WordQuiz {
    constructor(rootElm) {
        this.rootElm = rootElm;
        this.gameState = {};
        this.resetGame();
    }

    addThemeToggle() {
        const toggleBtn = document.createElement('button');
        toggleBtn.innerText = '🌓 Тема';
        toggleBtn.className = 'btn btn-secondary';
        toggleBtn.style.position = 'fixed';
        toggleBtn.style.top = '10px';
        toggleBtn.style.right = '10px';
        toggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
        });
        document.body.appendChild(toggleBtn);
    }

    async init() {
        this.addThemeToggle(); // Добавляем кнопку переключения
        this.rootElm.classList.add('quiz-container'); // Применяем класс центрирования
        await this.fetchQuizData();
        this.displayStartView();
    }

    async fetchQuizData() {
        try {
            const response = await fetch('./data/quiz.json');
            this.quizData = await response.json();
        } catch (e) {
            this.rootElm.innerText = '問題の読み込みに失敗しました';
            console.error(e);
        }
    }

    resetGame() {
        this.gameState.category = null; 
        this.gameState.step = 1;
        this.gameState.currentQuizKeys = []; 
        this.gameState.results = []; 
        this.clearTimer();            
    }

    replaceView(elm) {
        this.rootElm.innerHTML = '';
        this.rootElm.appendChild(elm);
    }

    setTimer() {
        if (this.gameState.intervalKey !== null) {
            throw new Error('まだタイマーが動いています');
        }
        this.gameState.timeLimit = 60; 
        this.gameState.intervalKey = setInterval(() => {
            this.gameState.timeLimit--;
            
            if (this.gameState.timeLimit === 0) {
                this.addResult(true); 
                this.nextStep();
            } else {
                this.renderTimeLimitStr();
            }
        }, 1000);
    }

    clearTimer() {
        clearInterval(this.gameState.intervalKey);
        this.gameState.intervalKey = null;
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

    startQuiz(categoryId, mode = 'random', rangeStart = 1, rangeEnd = 20) {
        const allKeys = Object.keys(this.quizData[categoryId]).sort((a, b) => {
            const numA = parseInt(a.replace('step', ''));
            const numB = parseInt(b.replace('step', ''));
            return numA - numB;
        });

        let selectedKeys = [];

        if (mode === 'sequential') {
            selectedKeys = allKeys.slice(rangeStart - 1, rangeEnd);
        } else if (mode === 'random') {
            const shuffled = this.shuffleArray(allKeys);
            selectedKeys = shuffled.slice(0, 20);
        }

        this.gameState.category = categoryId;
        this.gameState.currentQuizKeys = selectedKeys;
        this.gameState.step = 1;
        this.gameState.results = [];

        this.displayQuestionView();
    }

    displayStartView() {
        let categoryHtml = '';
        const categories = [
            { id: 'kanji_reading', name: '漢字・語彙 (Чтение)' },
            { id: 'kanji_writing', name: '漢字表記 (Написание)' },
            { id: 'affix_matching', name: '派生語・複合語 (Приставки/Суффиксы)' },
            { id: 'grammar', name: '文法 (Грамматика)' }
        ];

        categories.forEach(cat => {
            const keys = this.quizData[cat.id] ? Object.keys(this.quizData[cat.id]) : [];
            const total = keys.length;
            
            if (total === 0) {
                categoryHtml += `
                <div class="card" style="background: var(--btn-secondary); color: white;">
                    <strong style="display: block; margin-bottom: 5px; font-size: 16px;">${cat.name}</strong>
                    <span>問題がありません (Нет вопросов)</span>
                </div>`;
                return;
            }

            let optionsHtml = '';
            for (let i = 0; i < total; i += 20) {
                const start = i + 1;
                const end = Math.min(i + 20, total);
                optionsHtml += `<option value="${start}-${end}">${start}〜${end}</option>`;
            }

            const selectStyle = total > 20 ? '' : 'display: none;';
            const rangeLabel = total > 20 ? '' : `<span style="font-weight: bold; margin-right: 10px;">全${total}問</span>`;

            categoryHtml += `
                <div class="card">
                    <strong style="font-size: 16px;">${cat.name}</strong>
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top:10px;">
                        ${rangeLabel}
                        <select id="range-${cat.id}" style="${selectStyle} padding: 8px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-color);">
                            ${optionsHtml}
                        </select>
                        <button class="btn btn-primary start-seq-btn" data-cat="${cat.id}">順番に開始</button>
                        <button class="btn btn-primary start-rnd-btn" data-cat="${cat.id}">ランダム</button>
                    </div>
                </div>
            `;
        });

        const html = `
            <h2>JLPT N2 総合模擬クイズ</h2>
            <div style="text-align: right; margin-bottom: 20px;">
                <button class="btn btn-secondary adminBtn">⚙️ データベース管理</button>
            </div>
            <p style="text-align:center; margin-bottom: 20px;">カテゴリーと出題モードを選択してください。</p>
            ${categoryHtml}
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
                        <option value="kanji_reading">漢字・語彙</option>
                        <option value="kanji_writing">漢字表記</option>
                        <option value="affix_matching">派生語・複合語</option>
                        <option value="grammar">文法</option>
                    </select>
                </div>
                <div id="admin-question-selector-container" style="display: none;">
                    <label style="font-weight: bold;">編集する問題:</label><br>
                    <select id="admin-question-select" style="width: 100%; padding: 8px; background: var(--bg-color); color: var(--text-color);"></select>
                </div>
                <div>
                    <label style="font-weight: bold;">問題文:</label>
                    <textarea id="admin-word" rows="2" style="width: 100%; padding: 8px; background: var(--bg-color); color: var(--text-color);"></textarea>
                </div>
                <div>
                    <label style="font-weight: bold;">選択肢:</label>
                    <input type="text" id="admin-choices" style="width: 100%; padding: 8px; background: var(--bg-color); color: var(--text-color);">
                </div>
                <div>
                    <label style="font-weight: bold;">正解:</label>
                    <input type="text" id="admin-answer" style="width: 100%; padding: 8px; background: var(--bg-color); color: var(--text-color);">
                </div>
                <div>
                    <label style="font-weight: bold;">解説:</label>
                    <textarea id="admin-explanation" rows="4" style="width: 100%; padding: 8px; background: var(--bg-color); color: var(--text-color);"></textarea>
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
            this.displayQuestionView();
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

new WordQuiz(document.getElementById('app')).init();