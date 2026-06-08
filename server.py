from flask import Flask, request, jsonify, send_from_directory
import json
import os

# Инициализируем Flask, указывая текущую папку для статических файлов
app = Flask(__name__, static_folder='.')

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
def save_question():
    data = request.json
    
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
    

if __name__ == '__main__':
    print("Сервер запущен! Открой в браузере: http://127.0.0.1:8000")
    app.run(debug=True, port=8000)