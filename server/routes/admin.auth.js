'use strict';

const express = require('express');
const { authenticate } = require('../auth');
const router  = express.Router();

router.get('/login', (req, res) => {
  if (req.session?.user) return res.redirect('/admin/dashboard');
  res.render('admin/login', { title: 'Sign In', error: null, email: '' });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await authenticate(email, password);

  if (!result.ok) {
    let error = 'Invalid email or password.';
    if (result.reason === 'locked') {
      const until = new Date(result.until).toLocaleTimeString('en-GB');
      error = `Account locked after too many failed attempts. Try again after ${until}.`;
    }
    return res.render('admin/login', { title: 'Sign In', error, email: email || '' });
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).send('Session error');
    req.session.user = result.user;
    res.redirect('/admin/dashboard');
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

module.exports = router;
