const express = require('express');
const {
  getAlumni,
  getAlumniByYear,
  searchAlumni,
  getAlumniById,
} = require('../controllers/alumniController');

const router = express.Router();

router.get('/', getAlumni);
router.get('/search', searchAlumni);
router.get('/year/:year', getAlumniByYear);
router.get('/:id', getAlumniById);

module.exports = router;
