function isAdmin(req, res, next) {
    if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
    if (req.session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
}

module.exports = isAdmin;