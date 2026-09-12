import crypto from 'node:crypto';

function secret(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}

console.log('Cole estes valores no Railway > serviço da aplicação > Variables:');
console.log('');
console.log(`COOKIE_SECRET=${secret()}`);
console.log(`API_KEY=${secret()}`);
console.log('');
console.log('Cada execução gera valores novos. Não publique essas chaves no GitHub.');
