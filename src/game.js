export class AppGame {
    constructor(app) {
        this.app = app; // Ссылка на главное приложение
        this.quizData = null;
        this.currentLevel = 'n2';
        this.gameState = {
            category: null, step: 1, currentQuizKeys: [], results: [],
            currentLevel: 'n2', intervalKey: null, timeLimit: 60
        };
    }

    async loadLevel(level) {
        this.currentLevel = level;
        this.app.rootElm.innerHTML = '<p style="text-align:center;">Загрузка данных...</p>';
        await this.fetchQuizData(level);
        this.app.ui.displayStartView();
    }

    async fetchQuizData(level = 'n2') {
        this.quizData = null; 
        try {
            const response = await fetch(`data/${level}.json`, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            this.quizData = await response.json();
        } catch (e) {
            this.app.rootElm.innerHTML = `<div class="card">Уровень ${level.toUpperCase()} пока не доступен.</div>
            <button class="btn btn-secondary" onclick="window.quiz.displayMainMenu()">Назад</button>`;
            console.error(e);
        }
    }

    resetGame() {
        this.clearTimer(); 
        this.gameState = {
            category: null, step: 1, currentQuizKeys: [], results: [],
            currentLevel: this.currentLevel || 'n2', intervalKey: null, timeLimit: 60
        };
    }

    setTimer() {
        if (this.gameState.intervalKey !== null) return;
        if (typeof this.gameState.timeLimit === 'undefined') this.gameState.timeLimit = 60;

        this.gameState.intervalKey = setInterval(() => {
            this.gameState.timeLimit--;
            this.saveState(); 
            
            if (this.gameState.timeLimit <= 0) {
                this.addResult(true); 
                this.nextStep();
            } else {
                this.app.ui.renderTimeLimitStr();
            }
        }, 1000);
    }

    clearTimer() {
        if (this.gameState.intervalKey) {
            clearInterval(this.gameState.intervalKey);
            this.gameState.intervalKey = null;
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

    startQuiz(categoryId, mode = 'random', rangeStart = 1, rangeEnd = 20) {
        const allKeys = Object.keys(this.quizData[categoryId]).sort((a, b) => {
            return parseInt(a.replace('step', '')) - parseInt(b.replace('step', ''));
        });

        this.gameState.category = categoryId;
        this.gameState.currentQuizKeys = (mode === 'sequential') ? allKeys.slice(rangeStart - 1, rangeEnd) : this.shuffleArray(allKeys).slice(0, 20);
        this.gameState.step = 1;
        this.gameState.results = [];
        this.gameState.timeLimit = 60; 

        this.app.ui.displayQuestionView();
        this.saveState();
    }

    addResult(isSkipped = false) {
        const currentKey = this.gameState.currentQuizKeys[this.gameState.step - 1];
        const currentQuestion = this.quizData[this.gameState.category][currentKey];
        
        let answer = '';
        if (!isSkipped) {
            const checkedElm = this.app.rootElm.querySelector('input[name="choice"]:checked');
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
        if (confirm("本当にテストを強制終了して結果画面へ進みますか？")) {
            this.clearTimer();
            const totalQuestions = this.gameState.currentQuizKeys.length;
            while (this.gameState.results.length < totalQuestions) {
                const nextKey = this.gameState.currentQuizKeys[this.gameState.results.length];
                const nextQ = this.quizData[this.gameState.category][nextKey];
                this.gameState.results.push({
                    question: nextQ, selectedAnswer: '', skipped: true,
                    presentedChoices: this.shuffleArray(nextQ.choices)
                });
            }
            this.app.ui.displayResultView();
        }
    }

    isLastStep() {
        return this.gameState.step === this.gameState.currentQuizKeys.length; 
    }

    nextStep() {
        this.clearTimer(); 
        if (this.isLastStep()) {
            this.app.ui.displayResultView();
        } else {
            this.gameState.step++;
            this.gameState.timeLimit = 60; 
            this.app.ui.displayQuestionView();
            this.saveState();
        }
    }

    calcScore() {
        let correctNum = 0;
        for (const result of this.gameState.results) {
            if (!result.skipped && result.selectedAnswer === result.question.answer) correctNum++;
        }
        return correctNum;
    }
}