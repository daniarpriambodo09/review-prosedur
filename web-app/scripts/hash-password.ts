// scripts/hash-password.ts

import bcrypt from 'bcryptjs';

async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  console.log('Password:', password);
  console.log('Hash:', hash);
  
  // SQL untuk insert
  console.log('\nSQL Query:');
  console.log(`INSERT INTO users (username, password, full_name, email, role) VALUES ('username', '${hash}', 'Full Name', 'email@example.com', 'admin');`);
}

// Ganti dengan password yang ingin di-hash
hashPassword('admin123');