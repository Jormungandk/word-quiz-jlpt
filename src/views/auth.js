export class AuthUI {
    constructor(app) {
        this.app = app;
    }

    displayAuthView() {
        const html = `
            <h2>Вход / Регистрация</h2>
            <div class="card">
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button class="btn btn-primary" id="tabLogin" style="flex:1;">Войти</button>
                    <button class="btn btn-secondary" id="tabRegister" style="flex:1;">Регистрация</button>
                </div>

                <div id="authForm">
                    <div style="margin-bottom: 10px;">
                        <label>Email:</label>
                        <input type="email" id="authEmail" style="width: 100%; padding: 8px; margin-top: 5px;">
                    </div>
                    <div id="usernameGroup" style="display: none; margin-bottom: 10px;">
                        <label>Имя пользователя:</label>
                        <input type="text" id="authUsername" value="${this.app.user.profile.username === 'Гость' ? '' : this.app.user.profile.username}" style="width: 100%; padding: 8px; margin-top: 5px;">
                        <span style="font-size: 11px; color: var(--color-correct);">*Ваш текущий гостевой опыт будет перенесен</span>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label>Пароль:</label>
                        <input type="password" id="authPassword" style="width: 100%; padding: 8px; margin-top: 5px;">
                    </div>
                    <p id="authError" style="color: var(--color-wrong); font-size: 14px; display:none;"></p>
                    <button class="btn btn-primary" id="submitAuth" style="width: 100%;">Войти</button>
                </div>
            </div>
            <div style="text-align:center; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="window.quiz.displayMainMenu()">← Назад</button>
            </div>
        `;

        const container = document.createElement('div');
        container.innerHTML = html;

        let isLoginMode = true;
        const tabLogin = container.querySelector('#tabLogin');
        const tabRegister = container.querySelector('#tabRegister');
        const usernameGroup = container.querySelector('#usernameGroup');
        const submitBtn = container.querySelector('#submitAuth');
        const errorMsg = container.querySelector('#authError');

        const switchMode = (login) => {
            isLoginMode = login;
            tabLogin.className = login ? 'btn btn-primary' : 'btn btn-secondary';
            tabRegister.className = login ? 'btn btn-secondary' : 'btn btn-primary';
            usernameGroup.style.display = login ? 'none' : 'block';
            submitBtn.innerText = login ? 'Войти' : 'Зарегистрироваться';
            errorMsg.style.display = 'none';
        };

        tabLogin.addEventListener('click', () => switchMode(true));
        tabRegister.addEventListener('click', () => switchMode(false));

        submitBtn.addEventListener('click', async () => {
            const email = container.querySelector('#authEmail').value;
            const password = container.querySelector('#authPassword').value;
            const username = container.querySelector('#authUsername').value;

            try {
                if (isLoginMode) {
                    await this.app.user.login(email, password);
                } else {
                    await this.app.user.register(email, username, password);
                }
                this.app.ui.displayMainMenu();
            } catch (error) {
                errorMsg.innerText = error.message;
                errorMsg.style.display = 'block';
            }
        });

        this.app.ui.replaceView(container);
    }

    displayProfileView() {
        const profile = this.app.user.profile;
        const html = `
            <h2>Настройки профиля</h2>
            <div class="card">
                <div style="margin-bottom: 15px;">
                    <label>Email (Использовался при регистрации):</label>
                    <input type="email" value="${profile.email}" disabled style="width: 100%; padding: 8px; margin-top: 5px; background: #e9ecef; cursor: not-allowed; color: #333;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label>Имя пользователя:</label>
                    <input type="text" id="profUsername" value="${profile.username}" style="width: 100%; padding: 8px; margin-top: 5px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label>Новый пароль (оставьте пустым, если не хотите менять):</label>
                    <input type="password" id="profPassword" placeholder="Новый пароль..." style="width: 100%; padding: 8px; margin-top: 5px;">
                </div>
                
                <p id="profMsg" style="font-size: 14px; display:none;"></p>
                <button class="btn btn-primary" id="saveProfileBtn">Сохранить изменения</button>
            </div>
            <div style="text-align:center; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="window.quiz.displayMainMenu()">← Назад в меню</button>
            </div>
        `;

        const container = document.createElement('div');
        container.innerHTML = html;

        container.querySelector('#saveProfileBtn').addEventListener('click', async () => {
            const newUsername = container.querySelector('#profUsername').value;
            const newPassword = container.querySelector('#profPassword').value;
            const msgElm = container.querySelector('#profMsg');

            try {
                await this.app.user.updateProfile(newUsername, newPassword);
                msgElm.style.color = 'var(--color-correct)';
                msgElm.innerText = 'Профиль успешно обновлен!';
                msgElm.style.display = 'block';
                setTimeout(() => msgElm.style.display = 'none', 3000);
            } catch (error) {
                msgElm.style.color = 'var(--color-wrong)';
                msgElm.innerText = error.message;
                msgElm.style.display = 'block';
            }
        });

        this.app.ui.replaceView(container);
    }
}