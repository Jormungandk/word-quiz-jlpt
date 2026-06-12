export class AchievementsManager {
    constructor(app) {
        this.app = app;
        this.achievementsList = this.generateAchievementsList();
    }

    generateAchievementsList() {
        const list = [];
        
        // 1. Ачивки за Уровни
        const levelGoals = [
            10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
            125, 150, 175, 200, 225, 250, 275, 300,
            350, 400, 450, 500
        ];
        
        levelGoals.forEach(goal => {
            list.push({
                id: `level_${goal}`,
                type: 'level',
                title: `Уровень ${goal}`,
                description: `Достигните ${goal}-го уровня в приложении.`,
                icon: '🎓',
                target: goal
            });
        });

        // 2. Ачивки за Стрик (подряд дней)
        const streakGoals = [
            { target: 5, title: 'Хороший старт', desc: 'Выполняйте норму 5 дней подряд.' },
            { target: 10, title: 'В ритме', desc: 'Выполняйте норму 10 дней подряд.' },
            { target: 30, title: 'Месяц упорства', desc: 'Занимайтесь 30 дней подряд.' },
            { target: 90, title: 'Квартал знаний', desc: 'Удерживайте стрик 3 месяца (90 дней).' },
            { target: 180, title: 'Полугодие', desc: 'Непрерывная учеба полгода (180 дней).' },
            { target: 270, title: 'Железная воля', desc: 'Стрик 9 месяцев (270 дней).' },
            { target: 365, title: 'Год самурая', desc: 'Не прерывайте занятия целый год!' }
        ];

        streakGoals.forEach(g => {
            list.push({
                id: `streak_${g.target}`,
                type: 'streak',
                title: g.title,
                description: g.desc,
                icon: '🔥',
                target: g.target
            });
        });

        return list;
    }

    // Высчитывает максимальную серию дней из массива дат ['YYYY-MM-DD', ...]
    calculateMaxStreak(datesArray) {
        if (!datesArray || datesArray.length === 0) return 0;
        
        // Сортируем даты по возрастанию
        const sorted = [...datesArray].sort();
        let maxStreak = 1;
        let currentStreak = 1;

        for (let i = 1; i < sorted.length; i++) {
            const prev = new Date(sorted[i - 1]);
            const curr = new Date(sorted[i]);
            
            // Разница в днях
            const diffTime = Math.abs(curr - prev);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else if (diffDays > 1) {
                currentStreak = 1; // Серия прервалась
            }
        }
        return maxStreak;
    }

    getStats() {
        const userLevel = this.app.user.profile.level || 1;
        const dates = this.app.user.profile.markedDates || [];
        const maxStreak = this.calculateMaxStreak(dates);

        let unlockedCount = 0;
        const totalCount = this.achievementsList.length;

        const enrichedList = this.achievementsList.map(ach => {
            let currentValue = 0;
            if (ach.type === 'level') currentValue = userLevel;
            if (ach.type === 'streak') currentValue = maxStreak;

            const isUnlocked = currentValue >= ach.target;
            if (isUnlocked) unlockedCount++;

            return {
                ...ach,
                currentValue: Math.min(currentValue, ach.target), // Чтобы не было 12/10
                isUnlocked
            };
        });

        return {
            unlockedCount,
            totalCount,
            achievements: enrichedList
        };
    }
}