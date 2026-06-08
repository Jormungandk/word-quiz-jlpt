export class AppAdmin {
    constructor(app) {
        this.app = app;
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
            
            if (this.app.game.quizData && this.app.game.quizData[category]) {
                Object.keys(this.app.game.quizData[category]).forEach(key => {
                    const q = this.app.game.quizData[category][key];
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
                    wordInput.value = ''; choicesInput.value = ''; answerInput.value = ''; explanationInput.value = '';
                }
            });
        });

        categorySelect.addEventListener('change', () => {
            if (parentElm.querySelector('input[name="admin-mode"]:checked').value === 'edit') updateQuestionSelect();
        });

        questionSelect.addEventListener('change', (e) => {
            const key = e.target.value;
            const category = categorySelect.value;
            if (key && this.app.game.quizData[category][key]) {
                const q = this.app.game.quizData[category][key];
                wordInput.value = q.word; choicesInput.value = q.choices.join(', ');
                answerInput.value = q.answer; explanationInput.value = q.explanation || '';
            } else {
                wordInput.value = ''; choicesInput.value = ''; answerInput.value = ''; explanationInput.value = '';
            }
        });

        parentElm.querySelector('#backBtn').addEventListener('click', () => this.app.ui.displayStartView());

        parentElm.querySelector('#saveQuestionBtn').addEventListener('click', async () => {
            // Оставил логику отправки на сервер без изменений
            const mode = parentElm.querySelector('input[name="admin-mode"]:checked').value;
            const category = categorySelect.value;
            const stepKey = mode === 'edit' ? questionSelect.value : null;

            if (mode === 'edit' && !stepKey) return alert("編集する問題を選択してください！");

            const word = wordInput.value.trim(), choicesStr = choicesInput.value;
            const answer = answerInput.value.trim(), explanation = explanationInput.value.trim();

            if (!word || !choicesStr || !answer) return alert("必須項目を入力してください！");

            const choices = choicesStr.split(',').map(c => c.trim()).filter(c => c !== "");
            if (choices.length !== 4) return alert(`選択肢は4つである必要があります。`);

            const newQuestion = { word, choices, answer };
            if (explanation) newQuestion.explanation = explanation;

            try {
                const response = await fetch('/api/save_question', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    // ДОБАВИЛИ level: this.app.game.currentLevel
                    body: JSON.stringify({ 
                        level: this.app.game.currentLevel, 
                        category, 
                        question: newQuestion, 
                        stepKey 
                    })
                });

                const result = await response.json();
                if (result.status === 'success') {
                    alert(`保存しました！ (${result.step})`);
                    await this.app.game.fetchQuizData();
                    if (mode === 'new') {
                        wordInput.value = ''; choicesInput.value = ''; answerInput.value = ''; explanationInput.value = '';
                    } else {
                        updateQuestionSelect();
                        questionSelect.value = result.step;
                    }
                } else alert("サーバーエラー: " + result.message);
            } catch (error) { alert("通信エラー。"); }
        });
        
        const deleteBtn = parentElm.querySelector('#deleteQuestionBtn');
        modeRadios.forEach(radio => radio.addEventListener('change', (e) => deleteBtn.style.display = (e.target.value === 'edit') ? 'block' : 'none'));

        deleteBtn.addEventListener('click', async () => {
            const category = categorySelect.value, stepKey = questionSelect.value;
            if (!stepKey) return alert("削除する問題を選択してください！");
            if (!confirm("本当に削除しますか？")) return;

            try {
                const response = await fetch('/api/delete_question', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    // ДОБАВИЛИ level: this.app.game.currentLevel
                    body: JSON.stringify({ 
                        level: this.app.game.currentLevel, 
                        category, 
                        stepKey 
                    })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    alert("削除しました！");
                    await this.app.game.fetchQuizData();
                    updateQuestionSelect();
                    wordInput.value = ''; choicesInput.value = ''; answerInput.value = ''; explanationInput.value = '';
                } else alert("削除エラー: " + result.message);
            } catch (error) { alert("通信エラー。"); }
        });

        this.app.ui.replaceView(parentElm);
    }
}