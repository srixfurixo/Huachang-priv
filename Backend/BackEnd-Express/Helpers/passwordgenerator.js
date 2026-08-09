const crypto = require('crypto');

function pass_generator(length = 12) {

    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const specialChars = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
    const allChars = uppercase + lowercase + digits + specialChars;

    let taken_chars = [
        uppercase[crypto.randomInt(0, uppercase.length)],
        lowercase[crypto.randomInt(0, lowercase.length)],
        digits[crypto.randomInt(0, digits.length)],
        specialChars[crypto.randomInt(0, specialChars.length)]
    ]

    for (let i = taken_chars.length; i < length; i++) {
        taken_chars.push(allChars[crypto.randomInt(0, allChars.length)]);
    }

    // fisher-yates shuffle
    for (let i = taken_chars.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [taken_chars[i], taken_chars[j]] = [taken_chars[j], taken_chars[i]];
    }

    return taken_chars.join(''); 

}
module.exports = pass_generator;