const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function createTable() {
    try {
        const connection = await db.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS leaderboard (
                id VARCHAR(255) PRIMARY KEY,
                score INT NOT NULL
            );
        `);
        connection.release();
        console.log("Leaderboard table checked/created.");
    } catch (err) {
        console.error("Error creating table:", err);
    }
}
createTable();

app.post('/update', async (req, res) => {
    const { id, score } = req.body;

    if (!id || typeof score !== 'number') {
        return res.status(400).json({ error: 'id와 score를 올바르게 입력하세요.' });
    }

    try {
        const [rows] = await db.query('SELECT score FROM leaderboard WHERE id = ?', [id]);

        if (rows.length === 0) {
            await db.query('INSERT INTO leaderboard (id, score) VALUES (?, ?)', [id, score]);
        } else {
            if (rows[0].score < score) {
                await db.query('UPDATE leaderboard SET score = ? WHERE id = ?', [score, id]);
            }
        }

        res.json({ message: '점수 업데이트 완료', id, score });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB 오류' });
    }
});

app.get('/leaderboard', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, score FROM leaderboard ORDER BY score DESC'
        );

        const result = rows.map((row, index) => ({
            rank: index + 1,
            id: row.id,
            score: row.score
        }));

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB 오류' });
    }
});

app.get('/rank/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT 
                rank, 
                id, 
                score 
            FROM (
                SELECT 
                    RANK() OVER (ORDER BY score DESC) as rank, 
                    id, 
                    score 
                FROM leaderboard
            ) as ranked_leaderboard
            WHERE id = ?;
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: '유저를 찾을 수 없습니다.' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB 오류' });
    }
});

app.listen(port, () => {
    console.log(`Leaderboard server running on port ${port}`);
});