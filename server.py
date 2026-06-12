from flask import Flask, request, jsonify, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
import json
import os
import sqlite3

app = Flask(__name__, static_folder='.')

def init_db():
    os.makedirs('data', exist_ok=True)
    conn = sqlite3.connect('data/users.db')
    c = conn.cursor()
    # Добавлено поле is_admin
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            exp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            is_admin INTEGER DEFAULT 0
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS daily_marks (
            user_id INTEGER,
            mark_date TEXT,
            PRIMARY KEY (user_id, mark_date)
        )
    ''')
    conn.commit()
    conn.close()

init_db()

def get_db_connection():
    conn = sqlite3.connect('data/users.db')
    conn.row_factory = sqlite3.Row
    return conn

# Раздаем главный HTML файл
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# Раздаем остальные файлы (main.js, style.css, папка data и т.д.)
@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)


# Наш API-эндпоинт для удаления вопросов
@app.route('/api/delete_question', methods=['POST'])
def delete_question():
    data = request.json
    if not check_admin(data.get('user_id')):
        return jsonify({"status": "error", "message": "Нет прав администратора"}), 403
    
    # 1. Получаем уровень из запроса (по умолчанию 'n2', если не передан)
    level = data.get('level', 'n2') 
    category = data.get('category')
    step_key = data.get('stepKey')

    # 2. Формируем путь к нужному файлу (например: data/n2.json)
    file_path = f"data/{level}.json"

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            quiz_db = json.load(f)

        if category in quiz_db and step_key in quiz_db[category]:
            # Удаляем выбранный вопрос
            del quiz_db[category][step_key]

            # Получаем список оставшихся ключей и сортируем их числовым образом
            remaining_keys = sorted(
                quiz_db[category].keys(), 
                key=lambda x: int(x.replace('step', ''))
            )

            # Пересоздаем словарь с правильной нумерацией (step1, step2, ...)
            new_category_data = {}
            for i, old_key in enumerate(remaining_keys, 1):
                new_category_data[f"step{i}"] = quiz_db[category][old_key]

            # Сохраняем обратно
            quiz_db[category] = new_category_data
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(quiz_db, f, ensure_ascii=False, indent=2)

            return jsonify({"status": "success", "message": "Deleted and reindexed"})
        
        return jsonify({"status": "error", "message": "Question not found"}), 404
    
    except FileNotFoundError:
        return jsonify({"status": "error", "message": f"Файл {file_path} не найден"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# Наш API-эндпоинт для добавления/редактирования вопросов
@app.route('/api/save_question', methods=['POST'])
@app.route('/api/save_question', methods=['POST'])
def save_question():
    data = request.json
    if not check_admin(data.get('user_id')):
        return jsonify({"status": "error", "message": "Нет прав администратора"}), 403
    
    # 1. Получаем уровень из запроса
    level = data.get('level', 'n2')
    category = data.get('category')
    new_question = data.get('question')
    step_key = data.get('stepKey') # Получаем ключ (step1, step2...), если он есть

    # 2. Формируем путь к нужному файлу (например: data/n3.json)
    file_path = f"data/{level}.json"

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            quiz_db = json.load(f)
        
        # Защита: если категории еще нет в файле (например, пустой n5.json), создаем её
        if category not in quiz_db:
            quiz_db[category] = {}

        # Если это новый вопрос (режим добавления)
        if not step_key:
            category_keys = quiz_db.get(category, {}).keys()
            step_numbers = [int(k.replace('step', '')) for k in category_keys if k.startswith('step')]
            next_step_num = max(step_numbers) + 1 if step_numbers else 1
            step_key = f"step{next_step_num}"

        # Сохраняем или обновляем вопрос
        quiz_db[category][step_key] = new_question

        # 3. Сохраняем обновленные данные в тот же файл
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(quiz_db, f, ensure_ascii=False, indent=2)

        return jsonify({"status": "success", "step": step_key})
    
    except FileNotFoundError:
        return jsonify({"status": "error", "message": f"Файл {file_path} не найден"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
# --- НОВЫЕ ЭНДПОИНТЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ---

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    username = data.get('username')
    password = data.get('password')
    guest_exp = data.get('exp', 0)
    guest_level = data.get('level', 1)

    if not email or not username or not password:
        return jsonify({"status": "error", "message": "Заполните все поля"}), 400

    hashed_password = generate_password_hash(password)
    conn = get_db_connection()
    try:
        # Если это первый пользователь в базе - делаем его админом
        user_count = conn.execute('SELECT COUNT(*) FROM users').fetchone()[0]
        is_admin = 1 if user_count == 0 else 0

        conn.execute(
            'INSERT INTO users (email, username, password, exp, level, is_admin) VALUES (?, ?, ?, ?, ?, ?)',
            (email, username, hashed_password, guest_exp, guest_level, is_admin)
        )
        conn.commit()
        return jsonify({"status": "success", "message": "Регистрация успешна"})
    except sqlite3.IntegrityError:
        return jsonify({"status": "error", "message": "Этот email уже зарегистрирован"}), 409
    finally:
        conn.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()

    if user and check_password_hash(user['password'], password):
        return jsonify({
            "status": "success",
            "profile": {
                "id": user['id'],
                "email": user['email'],
                "username": user['username'],
                "exp": user['exp'],
                "level": user['level'],
                "isGuest": False,
                "isAdmin": bool(user['is_admin']), # <-- Добавили статус админа
                "avatar": '🟢' 
            }
        })
    return jsonify({"status": "error", "message": "Неверный email или пароль"}), 401

# --- 4. ЗАЩИТА ЭНДПОИНТОВ АДМИНА ---
def check_admin(user_id):
    if not user_id: return False
    conn = get_db_connection()
    user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    return user and bool(user['is_admin'])

@app.route('/api/auth/update_profile', methods=['POST'])
def update_profile():
    data = request.json
    user_id = data.get('id')
    new_username = data.get('username')
    new_password = data.get('password')

    conn = get_db_connection()
    
    if new_password:
        hashed_password = generate_password_hash(new_password)
        conn.execute('UPDATE users SET username = ?, password = ? WHERE id = ?', (new_username, hashed_password, user_id))
    else:
        conn.execute('UPDATE users SET username = ? WHERE id = ?', (new_username, user_id))
        
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Профиль обновлен"})

@app.route('/api/user/sync_exp', methods=['POST'])
def sync_exp():
    data = request.json
    user_id = data.get('id')
    exp = data.get('exp')
    level = data.get('level')

    if user_id:
        conn = get_db_connection()
        conn.execute('UPDATE users SET exp = ?, level = ? WHERE id = ?', (exp, level, user_id))
        conn.commit()
        conn.close()
        
    return jsonify({"status": "success"})

@app.route('/api/user/calendar', methods=['POST'])
def get_calendar():
    data = request.json
    user_id = data.get('id')
    
    conn = get_db_connection()
    rows = conn.execute('SELECT mark_date FROM daily_marks WHERE user_id = ?', (user_id,)).fetchall()
    conn.close()
    
    dates = [row['mark_date'] for row in rows]
    return jsonify({"status": "success", "dates": dates})

@app.route('/api/user/mark_day', methods=['POST'])
def mark_day():
    data = request.json
    user_id = data.get('id')
    mark_date = data.get('date') # Ожидаем формат YYYY-MM-DD
    
    if user_id and mark_date:
        conn = get_db_connection()
        # INSERT OR IGNORE предотвратит дублирование, если день уже отмечен
        conn.execute('INSERT OR IGNORE INTO daily_marks (user_id, mark_date) VALUES (?, ?)', (user_id, mark_date))
        conn.commit()
        conn.close()
        
    return jsonify({"status": "success"})
    

if __name__ == '__main__':
    print("Сервер запущен! Открой в браузере: http://127.0.0.1:8000")
    app.run(debug=True, port=8000)