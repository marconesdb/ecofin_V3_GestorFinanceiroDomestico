// ============================================================
//  EcoFin — Backend Profissional  |  Node.js + Express + MySQL
//  Arquivo: server.js
// ============================================================

import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { body, param, validationResult } from 'express-validator';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// ─── Configuração do App ────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;

// ─── Origens permitidas ─────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

// ─── Middlewares Globais ────────────────────────────────────

// ⚠️  IMPORTANTE: Remove qualquer header CORS injetado por proxies
// externos (Render, Clever Cloud) ANTES do cors() agir,
// evitando o erro "header contains multiple values".
app.use((req, res, next) => {
  res.removeHeader('Access-Control-Allow-Origin');
  res.removeHeader('Access-Control-Allow-Methods');
  res.removeHeader('Access-Control-Allow-Headers');
  res.removeHeader('Access-Control-Allow-Credentials');
  next();
});

// Responde preflight OPTIONS imediatamente (antes do helmet/rate-limit)
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.some(o => origin.startsWith(o))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // cache preflight por 24h
  return res.sendStatus(204);
});

// Configura CORS para todas as demais rotas
app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (ex: curl, Postman, mobile)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) {
      return callback(null, true);
    }
    return callback(new Error(`CORS bloqueado para origem: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
}));

app.use(helmet({
  // Desativa o crossOriginResourcePolicy para não conflitar com CORS
  crossOriginResourcePolicy: false,
}));

app.use(express.json());
app.use(morgan('dev'));

// Rate Limiter (100 req/15min por IP)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em breve.' }
}));

// ─── Pool de Conexões MySQL ─────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'ecofin',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone: '-03:00',
  ssl: { rejectUnauthorized: false }  // ← SSL para Clever Cloud
});

// ─── Inicialização do Banco de Dados ────────────────────────
async function initDB() {
  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS expenses (
        id          VARCHAR(36)    NOT NULL PRIMARY KEY,
        description VARCHAR(255)   NOT NULL,
        amount      DECIMAL(10,2)  NOT NULL CHECK (amount > 0),
        category    ENUM(
          'Alimentação','Transporte','Moradia',
          'Contas Fixas','Lazer','Saúde','Educação','Outros'
        ) NOT NULL,
        date        DATE           NOT NULL,
        isRecurring TINYINT(1)     NOT NULL DEFAULT 0,
        created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_date     (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS budgets (
        id            INT UNSIGNED   NOT NULL AUTO_INCREMENT PRIMARY KEY,
        category      ENUM(
          'Alimentação','Transporte','Moradia',
          'Contas Fixas','Lazer','Saúde','Educação','Outros'
        ) NOT NULL UNIQUE,
        monthly_limit DECIMAL(10,2)  NOT NULL CHECK (monthly_limit >= 0),
        created_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅  Banco de dados inicializado com sucesso.');
  } finally {
    conn.release();
  }
}

// ─── Helper: validação de erros ────────────────────────────
function validate(req, res, next) {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    return res.status(422).json({ errors: errs.array() });
  }
  next();
}

// ─── Categorias válidas ─────────────────────────────────────
const VALID_CATEGORIES = [
  'Alimentação','Transporte','Moradia',
  'Contas Fixas','Lazer','Saúde','Educação','Outros'
];

// ════════════════════════════════════════════════════════════
//  ROTAS — DESPESAS
// ════════════════════════════════════════════════════════════

app.get('/api/expenses', async (req, res, next) => {
  try {
    const { category, startDate, endDate, search, page = 1, limit = 50 } = req.query;

    let sql    = 'SELECT * FROM expenses WHERE 1=1';
    const vals = [];

    if (category)  { sql += ' AND category = ?';         vals.push(category); }
    if (startDate) { sql += ' AND date >= ?';             vals.push(startDate); }
    if (endDate)   { sql += ' AND date <= ?';             vals.push(endDate); }
    if (search)    { sql += ' AND description LIKE ?';    vals.push(`%${search}%`); }

    sql += ' ORDER BY date DESC, created_at DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const [rows] = await pool.execute(sql, vals);

    // Reconstrói vals para o COUNT sem o LIMIT/OFFSET
    const countVals = [];
    if (category)  countVals.push(category);
    if (startDate) countVals.push(startDate);
    if (endDate)   countVals.push(endDate);
    if (search)    countVals.push(`%${search}%`);

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM expenses WHERE 1=1${
        category  ? ' AND category = ?'          : ''}${
        startDate ? ' AND date >= ?'             : ''}${
        endDate   ? ' AND date <= ?'             : ''}${
        search    ? ' AND description LIKE ?'    : ''}`,
      countVals
    );

    const mapped = rows.map(r => ({
      ...r,
      amount:      parseFloat(r.amount),
      isRecurring: !!r.isRecurring,
      date:        r.date instanceof Date
                     ? r.date.toISOString().split('T')[0]
                     : r.date,
    }));

    res.json({ data: mapped, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

app.get('/api/expenses/:id',
  param('id').isUUID(),
  validate,
  async (req, res, next) => {
    try {
      const [[row]] = await pool.execute('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
      if (!row) return res.status(404).json({ error: 'Despesa não encontrada.' });
      res.json({
        ...row,
        amount:      parseFloat(row.amount),
        isRecurring: !!row.isRecurring,
        date:        row.date instanceof Date
                       ? row.date.toISOString().split('T')[0]
                       : row.date,
      });
    } catch (err) { next(err); }
  }
);

app.post('/api/expenses',
  body('description').trim().notEmpty().isLength({ max: 255 }),
  body('amount').isFloat({ gt: 0 }),
  body('category').isIn(VALID_CATEGORIES),
  body('date').isDate(),
  body('isRecurring').optional().isBoolean(),
  validate,
  async (req, res, next) => {
    try {
      const { description, amount, category, date, isRecurring = false } = req.body;
      const id = req.body.id || uuidv4();

      await pool.execute(
        `INSERT INTO expenses (id, description, amount, category, date, isRecurring)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           description = VALUES(description),
           amount      = VALUES(amount),
           category    = VALUES(category),
           date        = VALUES(date),
           isRecurring = VALUES(isRecurring)`,
        [id, description, parseFloat(amount), category, date, isRecurring ? 1 : 0]
      );

      res.status(201).json({ id, description, amount: parseFloat(amount), category, date, isRecurring });
    } catch (err) { next(err); }
  }
);

app.put('/api/expenses/:id',
  param('id').isUUID(),
  body('description').optional().trim().notEmpty().isLength({ max: 255 }),
  body('amount').optional().isFloat({ gt: 0 }),
  body('category').optional().isIn(VALID_CATEGORIES),
  body('date').optional().isDate(),
  body('isRecurring').optional().isBoolean(),
  validate,
  async (req, res, next) => {
    try {
      const fields = [];
      const vals   = [];
      const allowed = ['description','amount','category','date','isRecurring'];

      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          fields.push(`${key} = ?`);
          vals.push(key === 'isRecurring' ? (req.body[key] ? 1 : 0) : req.body[key]);
        }
      }

      if (!fields.length) return res.status(400).json({ error: 'Nenhum campo para atualizar.' });

      vals.push(req.params.id);
      const [result] = await pool.execute(
        `UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`, vals
      );

      if (result.affectedRows === 0) return res.status(404).json({ error: 'Despesa não encontrada.' });
      res.json({ message: 'Despesa atualizada com sucesso.' });
    } catch (err) { next(err); }
  }
);

app.delete('/api/expenses/:id',
  param('id').isUUID(),
  validate,
  async (req, res, next) => {
    try {
      const [result] = await pool.execute('DELETE FROM expenses WHERE id = ?', [req.params.id]);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Despesa não encontrada.' });
      res.json({ message: 'Despesa removida com sucesso.' });
    } catch (err) { next(err); }
  }
);

// ════════════════════════════════════════════════════════════
//  ROTAS — ORÇAMENTOS
// ════════════════════════════════════════════════════════════

app.get('/api/budgets', async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM budgets ORDER BY category');
    res.json(rows.map(r => ({ ...r, monthly_limit: parseFloat(r.monthly_limit) })));
  } catch (err) { next(err); }
});

app.put('/api/budgets',
  body('category').isIn(VALID_CATEGORIES),
  body('limit').isFloat({ min: 0 }),
  validate,
  async (req, res, next) => {
    try {
      const { category, limit } = req.body;
      await pool.execute(
        `INSERT INTO budgets (category, monthly_limit) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE monthly_limit = VALUES(monthly_limit)`,
        [category, parseFloat(limit)]
      );
      res.json({ category, monthly_limit: parseFloat(limit) });
    } catch (err) { next(err); }
  }
);

app.delete('/api/budgets/:category',
  param('category').isIn(VALID_CATEGORIES),
  validate,
  async (req, res, next) => {
    try {
      await pool.execute('DELETE FROM budgets WHERE category = ?', [req.params.category]);
      res.json({ message: 'Orçamento removido.' });
    } catch (err) { next(err); }
  }
);

// ════════════════════════════════════════════════════════════
//  ROTAS — RELATÓRIOS / ANALYTICS
// ════════════════════════════════════════════════════════════

app.get('/api/reports/summary', async (req, res, next) => {
  try {
    const { month } = req.query;
    let where = '';
    const vals = [];

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      where = 'WHERE DATE_FORMAT(date, "%Y-%m") = ?';
      vals.push(month);
    }

    const [byCategory] = await pool.execute(
      `SELECT category, SUM(amount) AS total, COUNT(*) AS count
       FROM expenses ${where}
       GROUP BY category ORDER BY total DESC`, vals
    );

    const [[totals]] = await pool.execute(
      `SELECT SUM(amount) AS grand_total, COUNT(*) AS tx_count
       FROM expenses ${where}`, vals
    );

    const [budgets] = await pool.execute('SELECT * FROM budgets');
    const budgetMap = {};
    budgets.forEach(b => { budgetMap[b.category] = parseFloat(b.monthly_limit); });

    const summary = byCategory.map(r => ({
      category:      r.category,
      total:         parseFloat(r.total),
      count:         r.count,
      budget_limit:  budgetMap[r.category] || 0,
      budget_pct:    budgetMap[r.category]
                       ? ((parseFloat(r.total) / budgetMap[r.category]) * 100).toFixed(1)
                       : null,
    }));

    res.json({
      grand_total: parseFloat(totals.grand_total || 0),
      tx_count:    totals.tx_count,
      by_category: summary,
    });
  } catch (err) { next(err); }
});

app.get('/api/reports/monthly', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`
      SELECT DATE_FORMAT(date, '%Y-%m') AS month,
             SUM(amount) AS total, COUNT(*) AS count
      FROM expenses
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY month ORDER BY month ASC
    `);
    res.json(rows.map(r => ({ ...r, total: parseFloat(r.total) })));
  } catch (err) { next(err); }
});

// ─── Health Check ────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await pool.execute('SELECT 1');
    res.json({ status: 'ok', db: 'connected', ts: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ─── 404 ─────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

// ─── Error Handler Global ─────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('❌  Erro interno:', err);

  // Erro de CORS: retorna 403 com mensagem clara
  if (err.message && err.message.startsWith('CORS bloqueado')) {
    return res.status(403).json({ error: err.message });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Erro interno do servidor.' : err.message
  });
});

// ─── Inicialização ────────────────────────────────────────────
(async () => {
  await initDB();
  app.listen(PORT, () =>
    console.log(`🚀  EcoFin API rodando em http://localhost:${PORT}`)
  );
})();