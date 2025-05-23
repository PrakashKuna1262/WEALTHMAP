// Function to generate a random password
const generatePassword = (length = 10) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
  let password = '';
  
  // Ensure at least one character from each category
  password += charset.substring(0, 26).charAt(Math.floor(Math.random() * 26)); // lowercase
  password += charset.substring(26, 52).charAt(Math.floor(Math.random() * 26)); // uppercase
  password += charset.substring(52, 62).charAt(Math.floor(Math.random() * 10)); // number
  password += charset.substring(62).charAt(Math.floor(Math.random() * (charset.length - 62))); // special
  
  // Fill the rest of the password
  for (let i = 4; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

module.exports = {
  generatePassword
};