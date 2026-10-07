import bcrypt from 'bcryptjs';

if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
  process.stderr.write('Run this command in an interactive terminal so the password is not echoed.\n');
  process.exit(2);
}

process.stdout.write('Admin password (minimum 14 characters; input hidden): ');
process.stdin.setRawMode(true);
process.stdin.setEncoding('utf8');
process.stdin.resume();

let password = '';
process.stdin.on('data', (character) => {
  if (character === '\u0003') {
    process.stdout.write('\nCancelled.\n');
    process.exit(130);
  }
  if (character === '\r' || character === '\n') {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write('\n');
    if (password.length < 14) {
      process.stderr.write('Use at least 14 characters. No hash was generated.\n');
      process.exit(2);
    }
    process.stdout.write(`${bcrypt.hashSync(password, 12)}\n`);
    password = '';
    return;
  }
  if (character === '\u007f' || character === '\b') password = password.slice(0, -1);
  else if (character >= ' ' && character <= '~') password += character;
});
