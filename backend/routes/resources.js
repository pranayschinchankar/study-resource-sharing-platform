const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../middleware/db');
const { authMiddleware } = require('../middleware/auth');

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf','.doc','.docx','.ppt','.pptx','.txt','.png','.jpg','.jpeg','.zip'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('File type not allowed'));
  }
});

// Helper: resource with ratings
async function resourceWithMeta(id) {
  const r = await pool.query(`
    SELECT r.*, u.name as uploader_name,
      COALESCE(AVG(rt.rating),0) as avg_rating,
      COUNT(DISTINCT rt.id) as total_ratings
    FROM resources r
    LEFT JOIN users u ON r.uploader_id = u.id
    LEFT JOIN ratings rt ON rt.resource_id = r.id
    WHERE r.id=$1 AND r.is_removed=false
    GROUP BY r.id, u.name
  `, [id]);
  if (!r.rows.length) return null;
  const res = r.rows[0];

  const comments = await pool.query(
    'SELECT * FROM comments WHERE resource_id=$1 ORDER BY created_at ASC', [id]
  );
  const ratings = await pool.query(
    'SELECT * FROM ratings WHERE resource_id=$1', [id]
  );
  res.comments = comments.rows;
  res.ratings = ratings.rows;
  return res;
}

// GET /api/resources — browse with filters
router.get('/', async (req, res) => {
  try {
    const { q, subject, sort = 'newest', type } = req.query;
    let where = ['r.is_removed=false'];
    const params = [];
    if (q) { params.push(`%${q}%`); where.push(`(r.title ILIKE $${params.length} OR r.description ILIKE $${params.length} OR r.tags ILIKE $${params.length})`); }
    if (subject && subject !== 'All') { params.push(subject); where.push(`r.subject=$${params.length}`); }
    if (type) { params.push(type); where.push(`r.type=$${params.length}`); }

    const orderMap = { newest:'r.created_at DESC', oldest:'r.created_at ASC', popular:'r.downloads DESC', rating:'avg_rating DESC' };
    const order = orderMap[sort] || 'r.created_at DESC';

    const sql = `
      SELECT r.*, u.name as uploader_name,
        COALESCE(AVG(rt.rating),0) as avg_rating,
        COUNT(DISTINCT rt.id) as total_ratings
      FROM resources r
      LEFT JOIN users u ON r.uploader_id = u.id
      LEFT JOIN ratings rt ON rt.resource_id = r.id
      WHERE ${where.join(' AND ')}
      GROUP BY r.id, u.name
      ORDER BY ${order}
    `;
    const result = await pool.query(sql, params);
    res.json({ resources: result.rows, total: result.rowCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/resources/user/my-uploads
router.get('/user/my-uploads', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, COALESCE(AVG(rt.rating),0) as avg_rating
      FROM resources r
      LEFT JOIN ratings rt ON rt.resource_id = r.id
      WHERE r.uploader_id=$1
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/resources/user/saved
router.get('/user/saved', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, COALESCE(AVG(rt.rating),0) as avg_rating
      FROM resources r
      INNER JOIN saved_resources s ON s.resource_id = r.id
      LEFT JOIN ratings rt ON rt.resource_id = r.id
      WHERE s.user_id=$1 AND r.is_removed=false
      GROUP BY r.id
      ORDER BY s.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/resources/:id
router.get('/:id', async (req, res) => {
  try {
    const r = await resourceWithMeta(req.params.id);
    if (!r) return res.status(404).json({ error: 'Resource not found' });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/resources/upload
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { title, subject, description, tags, type, link } = req.body;
    if (!title || !subject) return res.status(400).json({ error: 'Title and subject required' });

    let filename = null, original_name = null, file_size = null, url = null, lnk = null;

    if (type === 'link') {
      if (!link) return res.status(400).json({ error: 'Link URL required' });
      lnk = link;
      url = link;
    } else {
      if (!req.file) return res.status(400).json({ error: 'File required' });
      filename = req.file.filename;
      original_name = req.file.originalname;
      file_size = req.file.size;
      url = `/uploads/${req.file.filename}`;
    }

    const result = await pool.query(
      `INSERT INTO resources (title,subject,description,tags,type,filename,original_name,file_size,url,link,uploader_id,uploader_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [title, subject, description || null, tags || null, type || 'file', filename, original_name, file_size, url, lnk, req.user.id, req.user.email]
    );

    // update uploader_name from users table
    await pool.query('UPDATE resources SET uploader_name=(SELECT name FROM users WHERE id=$1) WHERE id=$2', [req.user.id, result.rows[0].id]);

    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Upload failed' });
  }
});

// POST /api/resources/:id/download
router.post('/:id/download', async (req, res) => {
  try {
    await pool.query('UPDATE resources SET downloads=downloads+1 WHERE id=$1', [req.params.id]);
    const r = await pool.query('SELECT url,link,type FROM resources WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ url: r.rows[0].url || r.rows[0].link });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/resources/:id/rate
router.post('/:id/rate', authMiddleware, async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    await pool.query(
      'INSERT INTO ratings (resource_id,user_id,rating) VALUES ($1,$2,$3) ON CONFLICT (resource_id,user_id) DO UPDATE SET rating=$3',
      [req.params.id, req.user.id, rating]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/resources/:id/comment
router.post('/:id/comment', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });
    const user = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    const name = user.rows[0]?.name || 'Unknown';
    const result = await pool.query(
      'INSERT INTO comments (resource_id,user_id,user_name,text) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, req.user.id, name, text.trim()]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/resources/:id/save
router.post('/:id/save', authMiddleware, async (req, res) => {
  try {
    const exists = await pool.query('SELECT id FROM saved_resources WHERE resource_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (exists.rows.length) {
      await pool.query('DELETE FROM saved_resources WHERE resource_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
      return res.json({ saved: false });
    }
    await pool.query('INSERT INTO saved_resources (resource_id,user_id) VALUES ($1,$2)', [req.params.id, req.user.id]);
    res.json({ saved: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/resources/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query('SELECT uploader_id FROM resources WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    if (r.rows[0].uploader_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await pool.query('DELETE FROM resources WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
