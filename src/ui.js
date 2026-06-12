import { MenuUI } from './views/menu.js';
import { AuthUI } from './views/auth.js';
import { QuizUI } from './views/quiz.js';
import { AchievementsUI } from './views/achievements.js';

export class AppUI {
    constructor(app) {
        this.app = app;
        this.rootElm = app.rootElm;

        // Инициализируем блоки UI
        this.menuUI = new MenuUI(app);
        this.authUI = new AuthUI(app);
        this.quizUI = new QuizUI(app);
        this.achievementsUI = new AchievementsUI(app);
    }

    // --- БАЗОВЫЕ ФУНКЦИИ ---
    replaceView(elm) {
        this.rootElm.innerHTML = '';
        this.rootElm.appendChild(elm);
    }

    addGlobalButtons() {
        // Кнопка темы
        const toggleBtn = document.createElement('button');
        toggleBtn.innerText = '🌓 Тема';
        toggleBtn.className = 'btn btn-secondary';
        toggleBtn.style.position = 'fixed';
        toggleBtn.style.top = '10px';
        toggleBtn.style.right = '10px';
        toggleBtn.style.zIndex = '1000';
        if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-theme');
        toggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
        });
        document.body.appendChild(toggleBtn);

        // Кнопка календаря
        const calBtn = document.createElement('button');
        calBtn.innerHTML = '📅';
        calBtn.className = 'btn btn-secondary';
        calBtn.style.position = 'fixed';
        calBtn.style.top = '50%';
        calBtn.style.left = '10px';
        calBtn.style.transform = 'translateY(-50%)';
        calBtn.style.zIndex = '1000';
        calBtn.style.fontSize = '24px';
        calBtn.style.padding = '10px';
        calBtn.addEventListener('click', () => this.displayCalendarModal());
        document.body.appendChild(calBtn);
    }

    displayCalendarModal() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let gridHtml = '<div class="calendar-grid">';
        const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        days.forEach(d => gridHtml += `<div class="cal-header">${d}</div>`);
        
        for (let i = 0; i < firstDay; i++) gridHtml += `<div class="cal-day empty"></div>`;
        
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isMarked = this.app.user.profile.markedDates?.includes(dateStr);
            gridHtml += `<div class="cal-day ${isMarked ? 'marked' : ''}">${d}</div>`;
        }
        gridHtml += '</div>';

        const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

        overlay.innerHTML = `
            <div class="calendar-modal" onclick="event.stopPropagation()">
                <h3 style="text-align:center; margin-top:0;">Активность</h3>
                <p style="text-align:center; font-size:12px; opacity:0.8; margin-top:-10px;">Выполни 20+ вопросов с 80% успеха для отметки</p>
                <div style="text-align:center; font-weight:bold; margin-bottom: 10px;">${monthNames[month]} ${year}</div>
                ${gridHtml}
            </div>
        `;
        overlay.addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
    }

    // --- ПРОКСИ-МЕТОДЫ ДЛЯ ОСТАЛЬНЫХ БЛОКОВ ---
    // Это позволяет нам не переписывать код в других файлах (game.js, admin.js и т.д.)
    displayMainMenu() { this.menuUI.displayMainMenu(); }
    displayStartView() { this.menuUI.displayStartView(); }
    displayAuthView() { this.authUI.displayAuthView(); }
    displayProfileView() { this.authUI.displayProfileView(); }
    displayQuestionView() { this.quizUI.displayQuestionView(); }
    renderTimeLimitStr() { this.quizUI.renderTimeLimitStr(); }
    displayResultView() { this.quizUI.displayResultView(); }
    displayReviewView() { this.quizUI.displayReviewView(); }
    displayAchievementsView() { this.achievementsUI.displayAchievementsView(); }
    displayCustomQuestionsManager(categoryId) { this.quizUI.displayCustomQuestionsManager(categoryId); }
}