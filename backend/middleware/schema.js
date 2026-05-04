const pool = require('./db');

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'student',
      avatar VARCHAR(255) DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS resources (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      subject VARCHAR(100) NOT NULL,
      description TEXT,
      tags TEXT,
      type VARCHAR(10) DEFAULT 'file',
      filename VARCHAR(255),
      original_name VARCHAR(255),
      file_size BIGINT,
      url VARCHAR(500),
      link VARCHAR(500),
      uploader_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      uploader_name VARCHAR(100),
      downloads INTEGER DEFAULT 0,
      is_removed BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id SERIAL PRIMARY KEY,
      resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER CHECK (rating BETWEEN 1 AND 5),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(resource_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      user_name VARCHAR(100),
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS saved_resources (
      id SERIAL PRIMARY KEY,
      resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(resource_id, user_id)
    );
  `);
  console.log('✅ Database schema initialized');
}

module.exports = { initSchema };