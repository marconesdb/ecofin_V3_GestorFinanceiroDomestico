-- ============================================================
--  EcoFin — Schema MySQL
--  Execute antes de iniciar o servidor pela primeira vez
--  (o servidor também cria as tabelas automaticamente)
-- ============================================================

CREATE DATABASE IF NOT EXISTS ecofin
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ecofin;

-- Tabela de despesas
CREATE TABLE IF NOT EXISTS expenses (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  description VARCHAR(255)  NOT NULL,
  amount      DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  category    ENUM(
    'Alimentação','Transporte','Moradia',
    'Contas Fixas','Lazer','Saúde','Educação','Outros'
  ) NOT NULL,
  date        DATE          NOT NULL,
  isRecurring TINYINT(1)    NOT NULL DEFAULT 0,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_date     (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de orçamentos mensais por categoria
CREATE TABLE IF NOT EXISTS budgets (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  category      ENUM(
    'Alimentação','Transporte','Moradia',
    'Contas Fixas','Lazer','Saúde','Educação','Outros'
  ) NOT NULL UNIQUE,
  monthly_limit DECIMAL(10,2) NOT NULL CHECK (monthly_limit >= 0),
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dados iniciais de orçamento (opcional)
INSERT IGNORE INTO budgets (category, monthly_limit) VALUES
  ('Alimentação',  1500.00),
  ('Transporte',    500.00),
  ('Moradia',      2000.00),
  ('Contas Fixas',  800.00),
  ('Lazer',         400.00),
  ('Saúde',         300.00),
  ('Educação',      600.00),
  ('Outros',        200.00);
