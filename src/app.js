import { AppGame } from './game.js';
import { AppUI } from './ui.js';
import { AppAdmin } from './admin.js';
import { UserManager } from './user.js';
import { AchievementsManager } from './achievements.js';

class QuizApp {
    constructor(rootElm) {
        this.rootElm = rootElm;
        // Инициализируем наши модули, передавая в них ссылку на себя (this)
        this.user = new UserManager(this);
        this.achievements = new AchievementsManager(this);
        this.game = new AppGame(this);
        this.ui = new AppUI(this);
        this.admin = new AppAdmin(this);
    }

    async init() {
        this.ui.addGlobalButtons();

        if (!this.user.profile.isGuest) {
            this.user.fetchCalendar();
        }

        this.rootElm.classList.add('quiz-container');

        window.addEventListener('beforeunload', (event) => {
            if (this.game.gameState && this.game.gameState.intervalKey !== null) {
                event.preventDefault();
                event.returnValue = '';
            }
        });

        const saved = sessionStorage.getItem('quizState');
        if (saved) {
            const parsedState = JSON.parse(saved);
            if (parsedState.currentQuizKeys && parsedState.currentQuizKeys.length > 0) {
                this.game.gameState = parsedState;
                this.game.gameState.intervalKey = null; 
                this.game.currentLevel = this.game.gameState.currentLevel || 'n2'; 
                
                await this.game.fetchQuizData(this.game.currentLevel);
                this.ui.displayQuestionView();
                return;
            }
        }

        this.ui.displayMainMenu();
    }
}

// Запуск приложения
const appInstance = new QuizApp(document.getElementById('app'));

// Мы создаем алиасы для старых кнопок в HTML (onclick="window.quiz.loadLevel(...)")
window.quiz = {
    loadLevel: (level) => appInstance.game.loadLevel(level),
    displayMainMenu: () => appInstance.ui.displayMainMenu(),
    displayAuthView: () => appInstance.ui.displayAuthView(),
    displayProfileView: () => appInstance.ui.displayProfileView(),
    displayAchievementsView: () => appInstance.ui.displayAchievementsView(),
    logout: () => {
        appInstance.user.logout();
        appInstance.ui.displayMainMenu();
    }
};

appInstance.init();