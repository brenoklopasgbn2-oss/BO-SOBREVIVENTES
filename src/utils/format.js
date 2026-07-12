export function brl(value) {
  const n = Number(value || 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function coins(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

export function dateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function shortId(value) {
  return String(value || '').slice(0, 8);
}

export function steamLooksValid(steam64) {
  return /^\d{17}$/.test(String(steam64 || '').trim());
}
