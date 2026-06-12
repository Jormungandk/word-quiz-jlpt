export class UserManager {
    constructor(app) {
        this.app = app;
        this.profile = this.loadProfile();
    }

    // Загружаем профиль и динамически подтягиваем блокнот по ID пользователя
    loadProfile() {
        const saved = localStorage.getItem('jlpt_user_profile');
        if (saved) {
            const profile = JSON.parse(saved);
            // Определяем уникальный идентификатор для ключа блокнота
            const userId = profile.isGuest ? 'guest' : (profile.id || profile.email);
            profile.customQuestions = JSON.parse(localStorage.getItem(`jlpt_custom_questions_${userId}`)) || {};
            return profile;
        }
        return {
            isGuest: true,
            username: 'Гость',
            email: '',
            exp: 0,
            level: 1,
            avatar: '🟢',
            markedDates: [],
            customQuestions: JSON.parse(localStorage.getItem('jlpt_custom_questions_guest')) || {}
        };
    }

    saveProfile() {
        // 1. Сохраняем блокнот в отдельный изолированный ключ, защищенный от логаута
        const userId = this.profile.isGuest ? 'guest' : (this.profile.id || this.profile.email);
        localStorage.setItem(`jlpt_custom_questions_${userId}`, JSON.stringify(this.profile.customQuestions || {}));

        // 2. Создаем копию профиля без блокнота, чтобы не дублировать данные в jlpt_user_profile
        const profileToSave = { ...this.profile };
        delete profileToSave.customQuestions;

        localStorage.setItem('jlpt_user_profile', JSON.stringify(profileToSave));

        if (!this.profile.isGuest && this.profile.id) {
            fetch('/api/user/sync_exp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: this.profile.id,
                    exp: this.profile.exp,
                    level: this.profile.level
                })
            }).catch(e => console.error("Ошибка синхронизации EXP:", e));
        }
    }

    addCustomQuestion(categoryId, questionObj) {
        if (!this.profile.customQuestions) this.profile.customQuestions = {};
        if (!this.profile.customQuestions[categoryId]) this.profile.customQuestions[categoryId] = {};

        const keys = Object.keys(this.profile.customQuestions[categoryId]);
        const nextStep = `c_step${keys.length + 1}_${Date.now()}`; 
        
        this.profile.customQuestions[categoryId][nextStep] = questionObj;
        this.saveProfile();
        return true;
    }

    removeCustomQuestion(categoryId, stepKey) {
        if (this.profile.customQuestions?.[categoryId]?.[stepKey]) {
            delete this.profile.customQuestions[categoryId][stepKey];
            this.saveProfile();
            return true;
        }
        return false;
    }

    addExp(amount) {
        this.profile.exp += amount;
        const newLevel = Math.floor(this.profile.exp / 100) + 1;
        let leveledUp = false;

        if (newLevel > this.profile.level) {
            this.profile.level = newLevel;
            leveledUp = true;
        }

        this.saveProfile();
        return { added: amount, leveledUp: leveledUp, newLevel: this.profile.level };
    }

    getExpToNextLevel() {
        return (this.profile.level * 100) - this.profile.exp;
    }

    getProgressPercent() {
        const currentLevelBaseExp = (this.profile.level - 1) * 100;
        return this.profile.exp - currentLevelBaseExp;
    }

    async fetchCalendar() {
        if (this.profile.isGuest) return;
        try {
            const res = await fetch('/api/user/calendar', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id: this.profile.id})
            });
            const data = await res.json();
            if (data.status === 'success') {
                this.profile.markedDates = data.dates;
                this.saveProfile();
            }
        } catch(e) { console.error("Ошибка загрузки календаря:", e); }
    }

    async checkDailyQuest(totalQuestions, correctCount) {
        if (totalQuestions >= 20 && (correctCount / totalQuestions) >= 0.8) {
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            if (!this.profile.markedDates) this.profile.markedDates = [];
            
            if (!this.profile.markedDates.includes(dateStr)) {
                this.profile.markedDates.push(dateStr);
                this.saveProfile();
                
                if (!this.profile.isGuest) {
                    fetch('/api/user/mark_day', {
                        method: 'POST', headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({id: this.profile.id, date: dateStr})
                    }).catch(e => console.error(e));
                }
                return true;
            }
        }
        return false;
    }

    async register(email, username, password) {
        // Запоминаем кастомные вопросы гостя, чтобы перенести их в новый аккаунт
        const guestQuestions = this.profile.customQuestions || {};

        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email, username, password, 
                exp: this.profile.exp, 
                level: this.profile.level 
            })
        });
        const data = await response.json();
        if (data.status === 'success') {
            await this.login(email, password);
            
            // Переносим накопленные гостем вопросы в созданную учетную запись
            const userId = this.profile.id || this.profile.email;
            const userQuestions = JSON.parse(localStorage.getItem(`jlpt_custom_questions_${userId}`)) || {};
            
            for (const catId in guestQuestions) {
                if (!userQuestions[catId]) userQuestions[catId] = {};
                Object.assign(userQuestions[catId], guestQuestions[catId]);
            }
            
            this.profile.customQuestions = userQuestions;
            localStorage.removeItem('jlpt_custom_questions_guest'); // Очищаем гостевой временный архив
            this.saveProfile();
            return true;
        }
        throw new Error(data.message);
    }

    async login(email, password) {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (data.status === 'success') {
            this.profile = data.profile;
            
            // Восстанавливаем блокнот конкретно этого пользователя при входе
            const userId = this.profile.id || this.profile.email;
            this.profile.customQuestions = JSON.parse(localStorage.getItem(`jlpt_custom_questions_${userId}`)) || {};
            
            await this.fetchCalendar();
            this.saveProfile();
            return true;
        }
        throw new Error(data.message);
    }

    logout() {
        // Удаляем только текущую сессию. Сами файлы блокнотов лежат в других ключах и не пострадают!
        localStorage.removeItem('jlpt_user_profile');
        this.profile = this.loadProfile(); // Метод сбросит состояние до Гостя и подгрузит 'jlpt_custom_questions_guest'
    }
}