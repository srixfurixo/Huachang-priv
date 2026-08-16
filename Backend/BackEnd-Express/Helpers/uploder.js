const express = require('express');
const router = express.Router();
const pool = require('../Static/db_main');
const authenticate = require('../middleware/authenticate');
const upload = require('../middleware/document_processor');
const { MulterError } = require('multer');

router.post('/upload', authenticate, (req, res) => {
  upload.single('document')(req, res, async (err) => {
    if (err instanceof MulterError) {
      return res.status(400).json({ 
        error_general: err.message,
        // pending specific error handling on multer codes. like LIMIT_FILE_SIZE, LIMIT_UNEXPECTED_FILE, etc.
      });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    // file data checks
    const { document_type, document_name, reference_number } = req.body;
    if (!document_type || !document_name || !reference_number) {
      return res.status(400).json({ error: 'Missing required fields: document_type, document_name, reference_number.' });
    }

    try {
      const file_path = `uploads/documents/${req.file.filename}`;
      const file_size_bytes = req.file.size;
      const file_type = req.file.mimetype;
      const uploaded_by = req.user ? req.user.id : null;  

      const query = `
        INSERT INTO attachments (
          document_type,
          reference_no,
          file_name,
          file_path,
          file_size_bytes,
          file_type,
          uploaded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;

      const values = [
        document_type,
        reference_number,
        document_name,
        file_path,
        file_size_bytes,
        file_type,
        uploaded_by
      ];

      const { rows } = await pool.query(query, values);

      return res.status(201).json({
        success: true,
        message: 'Document uploaded successfully.',
        attachment: rows[0]
      });
    } catch (err) {
      console.error('Error saving document attachment:', err);
      return res.status(500).json({ error: 'Database error while saving attachment.' });
    }
  });
});

module.exports = router;