export class UserManager {
    constructor(app) {
        this.app = app;
        this.profile = this.loadProfile();
    }

    // Загружаем профиль или создаем нового Гостя
    loadProfile() {
        const saved = localStorage.getItem('jlpt_user_profile');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            isGuest: true,
            username: 'Гость',
            exp: 0,
            level: 1,
            avatar: '🟢' // Заглушка: начальный слайм
        };
    }

    saveProfile() {
        localStorage.setItem('jlpt_user_profile', JSON.stringify(this.profile));
    }

    // Начисляем опыт (например, +10 за каждый правильный ответ)
    addExp(amount) {
        this.profile.exp += amount;
        
        // Считаем новый уровень (каждые 100 exp = 1 уровень)
        const newLevel = Math.floor(this.profile.exp / 100) + 1;
        let leveledUp = false;

        if (newLevel > this.profile.level) {
            this.profile.level = newLevel;
            leveledUp = true;
            // Здесь в будущем можно менять аватар слайма (🟢 -> 🛡️🟢 -> 👑🟢)
        }

        this.saveProfile();
        return { added: amount, leveledUp: leveledUp, newLevel: this.profile.level };
    }

    // Вспомогательные методы для шкалы прогресса (UI)
    getExpToNextLevel() {
        return (this.profile.level * 100) - this.profile.exp;
    }

    getProgressPercent() {
        const currentLevelBaseExp = (this.profile.level - 1) * 100;
        const currentLevelExp = this.profile.exp - currentLevelBaseExp;
        return currentLevelExp; // Так как шаг 100, то опыт и есть процент (0-99%)
    }
}