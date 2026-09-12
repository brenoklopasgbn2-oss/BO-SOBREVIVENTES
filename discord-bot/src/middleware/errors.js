export function notFound(req, res) {
  res.status(404).render('error', { title: 'Página não encontrada', message: 'Essa página não existe.' });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  const message = err.message || 'Erro interno.';
  if (req.path.startsWith('/api') || req.path.startsWith('/webhooks')) {
    return res.status(500).json({ ok: false, error: message });
  }
  res.status(500).render('error', { title: 'Erro', message });
}
