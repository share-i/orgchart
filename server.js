const express = require('express');
const app = express();
const port = 8891;

// Middleware для парсинга JSON-тела запросов
app.use(express.json());

// Middleware для приема бинарных данных (изображений) для конкретного роута
app.use('/api/users/:userId/avatar', express.raw({
  type: 'image/*',
  limit: '10mb' // Ограничение на размер файла 10МБ
}));

// В реальном проекте используйте переменные окружения (process.env)
const YANDEX_API_TOKEN = "y0__xDIlJukqveAAhjH4C0gkYLLpBJbVQ8p04iwjjjScwamCcGgM1x74w";
const YANDEX_ORG_ID = "7109889";

// Отдаем статические файлы (index.html, style.css)
app.use(express.static(__dirname));

// Прокси-эндпоинт для API Яндекса
app.get('/api/users', async (req, res) => {
    let allUsers = [];
    let page = 1;
    let totalPages = 1;

    try {
        do {
            const url = `https://api360.yandex.net/directory/v1/org/${YANDEX_ORG_ID}/users?page=${page}&perPage=1000`;
            console.log(`[YANDEX API] GET:`, url);
            console.log(`[YANDEX API] Headers:`, { 'Authorization': `OAuth ${YANDEX_API_TOKEN}` });
            let apiRes;
            try {
                apiRes = await fetch(url, {
                    headers: {
                        'Authorization': `OAuth ${YANDEX_API_TOKEN}`
                    }
                });
            } catch (err) {
                console.error('[YANDEX API] Ошибка сети или DNS:', err);
                return res.status(500).json({ error: 'Ошибка сети или DNS при обращении к Яндекс API', details: err.message });
            }

            console.log(`[YANDEX API] Status:`, apiRes.status);
            if (!apiRes.ok) {
                const errorText = await apiRes.text();
                console.error('[YANDEX API] Error response:', errorText);
                // Прерываем, если один из запросов неудачен
                return res.status(apiRes.status).send(`Ошибка запроса к API Яндекса: ${errorText}`);
            }

            let data;
            try {
                data = await apiRes.json();
            } catch (err) {
                console.error('[YANDEX API] Ошибка парсинга JSON:', err);
                return res.status(500).json({ error: 'Ошибка парсинга JSON от Яндекс API', details: err.message });
            }
            console.log(`[YANDEX API] Получено пользователей:`, data.users ? data.users.length : 0, 'на странице', page);
            if (data.users && data.users.length > 0) {
                allUsers = allUsers.concat(data.users);
            }
            totalPages = data.pages || 1;
            page++;

        } while (page <= totalPages);
        console.log(`[YANDEX API] Всего пользователей собрано:`, allUsers.length);
        res.json(allUsers); 
    } catch (error) {
        console.error('Ошибка на сервере-прокси:', error);
        res.status(500).send('Внутренняя ошибка сервера');
    }
});

app.patch('/api/users/:userId', async (req, res) => {
    const { userId } = req.params;
    const userData = req.body;
    
    const url = `https://api360.yandex.net/directory/v1/org/${YANDEX_ORG_ID}/users/${userId}`;

    try {
        const apiRes = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `OAuth ${YANDEX_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        if (!apiRes.ok) {
            const errorText = await apiRes.text();
            console.error('Yandex API Update Error:', errorText);
            return res.status(apiRes.status).send(`Ошибка обновления данных в API Яндекса: ${errorText}`);
        }
        
        const data = await apiRes.json();
        res.json(data); 
    } catch (error) {
        console.error('Ошибка на сервере-прокси при обновлении:', error);
        res.status(500).send('Внутренняя ошибка сервера при обновлении');
    }
});

app.get('/api/departments', async (req, res) => {
    let allDepts = [];
    let page = 1;
    let totalPages = 1;

    try {
        do {
            const url = `https://api360.yandex.net/directory/v1/org/${YANDEX_ORG_ID}/departments?page=${page}&perPage=1000`;
            const apiRes = await fetch(url, {
                headers: { 'Authorization': `OAuth ${YANDEX_API_TOKEN}` }
            });
            if (!apiRes.ok) {
                const errorText = await apiRes.text();
                throw new Error(`Yandex API Department Error: ${errorText}`);
            }
            const data = await apiRes.json();
            if (data.departments && data.departments.length > 0) {
                allDepts = allDepts.concat(data.departments);
            }
            totalPages = data.pages || 1;
            page++;
        } while (page <= totalPages);
        
        res.json(allDepts);

    } catch (error) {
        console.error('Ошибка на сервере-прокси при получении отделов:', error);
        res.status(500).send('Внутренняя ошибка сервера при получении отделов');
    }
});

app.put('/api/users/:userId/avatar', async (req, res) => {
    const { userId } = req.params;
    const contentType = req.headers['content-type'];

    if (!req.body || req.body.length === 0) {
        return res.status(400).send('Тело запроса с изображением не может быть пустым.');
    }

    const url = `https://api360.yandex.net/directory/v1/org/${YANDEX_ORG_ID}/users/${userId}/avatar`;

    try {
        const apiRes = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `OAuth ${YANDEX_API_TOKEN}`,
                'Content-Type': contentType
            },
            body: req.body
        });

        if (!apiRes.ok) {
            const errorText = await apiRes.text();
            console.error('Yandex API Avatar Upload Error:', errorText);
            return res.status(apiRes.status).send(`Ошибка загрузки аватара в API Яндекса: ${errorText}`);
        }
        
        const data = await apiRes.json();
        res.json(data); 
    } catch (error) {
        console.error('Ошибка на сервере-прокси при загрузке аватара:', error);
        res.status(500).send('Внутренняя ошибка сервера при загрузке аватара');
    }
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
}); 