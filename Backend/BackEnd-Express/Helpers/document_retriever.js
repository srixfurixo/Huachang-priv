const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

router.get('/:document_type/:reference_number', authenticate, async (req, res) => {
  const { document_type, reference_number } = req.params;
  if (!document_type || !reference_number) {
    return res.status(400).json({ error: 'Missing required parameters: document_type, reference_number.' });
  }

  try {
    const query =
     `  
      select id,
            attachments.document_type,
            attachments.reference_no,
            attachments.file_name,
            attachments.file_path,
            attachments.file_size_bytes,
            attachments.uploaded_by,
            attachments.created_at
      from attachments
      where document_type = $1
        and reference_no = $2
      ORDER BY created_at DESC;
    `;
    const values = [document_type, reference_number];
    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No documents found for the specified document_type and reference_number.' });
    } else { 
      return res.status(200).json({
        success: true,
        message: 'Documents retrieved successfully.',
        documents: rows
      });
    }


  } catch (error) {
    console.error('Error retrieving documents:', error);
    return res.status(500).json({ error: 'An error occurred while retrieving documents.' });
  }
});

router.get('/:id/view', authenticate, async (req, res) => {
  const { id } = req.params;
  if (!id) { 
    return res.status(400).json({ error: 'Missing required parameter: id.' });
  }
  
  try { 
    const query = `
    Select * from attachments
    where id = $1;
    `;
    const values = [id];
    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Document not found for the specified id.' });
    } else { 
      const document = rows[0];
      const absolutePath = path.resolve(__dirname, '../../', document.file_path);

      const file_checker = fs.existsSync(absolutePath);
      if (!file_checker) {
        return res.status(404).json({ error: 'File not found on the server.' });
      } else { 
        res.sendFile(absolutePath);

      }
    }
  } catch (error) {
    console.error('Error retrieving document:', error);
    return res.status(500).json({ error: 'An error occurred while retrieving the document.' });
  }

});

module.exports = router;