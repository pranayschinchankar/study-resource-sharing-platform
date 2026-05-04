const express = require('express');
const router = express.Router();
const pool = require('../middleware/db');
const { adminMiddleware } = require('../middleware/auth');

// GET /api/admin/stats
router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const [resources, removed, users, downloads, subjects] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM resources WHERE is_removed=false'),
      pool.query('SELECT COUNT(*) FROM resources WHERE is_removed=true'),
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COALESCE(SUM(downloads),0) as total FROM resources'),
      pool.query('SELECT subject, COUNT(*) as count FROM resources WHERE is_removed=false GROUP BY subject ORDER BY count DESC')
    ]);

    const subjectBreakdown = {};
    subjects.rows.forEach(r => { subjectBreakdown[r.subject] = parseInt(r.count); });

    res.json({
      totalResources: parseInt(resources.rows[0].count),
      removedResources: parseInt(removed.rows[0].count),
      totalUsers: parseInt(users.rows[0].count),
      totalDownloads: parseInt(downloads.rows[0].total),
      subjectBreakdown
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/resources
router.get('/resources', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, u.name as uploader_name
      FROM resources r
      LEFT JOIN users u ON r.uploader_id = u.id
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/resources/:id/remove
router.patch('/resources/:id/remove', adminMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE resources SET is_removed=true WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/resources/:id/restore
router.patch('/resources/:id/restore', adminMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE resources SET is_removed=false WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/users
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.created_at,
        COUNT(r.id) as uploads_count
      FROM users u
      LEFT JOIN resources r ON r.uploader_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    const rows = result.rows.map(u => ({
      ...u,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=6c63ff&color=fff&size=128`
    }));
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
