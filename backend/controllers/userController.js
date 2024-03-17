const db = require('../db');
const passwordUtils = require('../utils/passwordUtils');

async function createUser(username, email, salt, password_encrypted, role, tier, credits, reg_date, api_token) {
    const sql = `INSERT INTO users (username, email, salt, password_encrypted, role, tier, credits, reg_date, api_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    try {
        await db.query(sql, [username, email, salt, password_encrypted, role, tier, credits, reg_date, api_token]);
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}


async function registerUser(username, email, password, role){
    const salt = generateRandomString(16);
    const password_encrypted = passwordUtils.encrypt(password, salt);
    const credits = 50;
    const tier = 1;
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    const seconds = String(currentDate.getSeconds()).padStart(2, '0');
    const reg_date = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    let api_token = passwordUtils.encrypt(username, salt); 
    api_token = api_token.slice(0, 15);
    try {
        await createUser(username, email, salt, password_encrypted, role, tier, credits, reg_date, api_token);
    } catch (error) {
        console.error('Error registering user:', error);
        throw error;
    }
    //createUser(username, email, salt, password_encrypted, role, tier, credits, reg_date, api_token);
}

async function loginUser(username, password){
    try {
        const user = await readUserByUsername(username);
        return user.password_encrypted == passwordUtils.encrypt(password, user.salt);
    } catch (error) {
        console.error('Error logging in user:', error);
        throw error;
    }
}

async function readUserById(id) {
    try {
        const sql = 'SELECT * FROM users WHERE id = ?';
        return new Promise((resolve, reject) => {
            db.query(sql, id, function (err, result, fields) {
                if (err) {
                    console.error('Error getting user by id:', err);
                    return reject(err);
                }
                if (!result || result.length === 0) {
                    const error = new Error('User with id not found');
                    console.error(error.message);
                    return reject(error);
                }
                const output = Object.values(JSON.parse(JSON.stringify(result[0])));
                const user = {
                    id: output[0],
                    username: output[1],
                    email: output[2],
                    salt: output[3],
                    password_encrypted: output[4],
                    role: output[5],
                    tier: output[6],
                    credits: output[7],
                    reg_date: output[8],
                    api_token: output[9]
                };
                resolve(user);
            });
        });
    } 
    
}

async function readUserByUsername(username) {
    try {
        const sql = 'SELECT * FROM users WHERE username = ?';
        return new Promise((resolve, reject) => {
            db.query(sql, username, function (err, result, fields) {
                if (err) {
                    console.error('Error getting user by username:', err);
                    return reject(err);
                }
                if (!result || result.length === 0) {
                    const error = new Error('User not found');
                    console.error(error.message);
                    return reject(error);
                }
                const output = Object.values(JSON.parse(JSON.stringify(result[0])));
                const user = {
                    id: output[0],
                    username: output[1],
                    email: output[2],
                    salt: output[3],
                    password_encrypted: output[4],
                    role: output[5],
                    tier: output[6],
                    credits: output[7],
                    reg_date: output[8],
                    api_token: output[9]
                };
                resolve(user);
            });
        });
    } 
}

async function readUserByApiToken(api_token) {
    try {
        const sql = 'SELECT * FROM users WHERE api_token = ?';
        return new Promise((resolve, reject) => {
            db.query(sql, api_token, function (err, result, fields) {
                if (err) {
                    console.error('Error getting user by api_token:', err);
                    return reject(err);
                }
                if (!result || result.length === 0) {
                    const error = new Error('User not found');
                    console.error(error.message);
                    return reject(error);
                }
                const output = Object.values(JSON.parse(JSON.stringify(result[0])));
                const user = {
                    id: output[0],
                    username: output[1],
                    email: output[2],
                    salt: output[3],
                    password_encrypted: output[4],
                    role: output[5],
                    tier: output[6],
                    credits: output[7],
                    reg_date: output[8],
                    api_token: output[9]
                };
                resolve(user);
            });
        });
    } 
}

async function updateUserById(id, username, email, salt, password_encrypted, role, tier, credits, reg_date, api_token) {
    try {
        const sql = `UPDATE users
                     SET username = ?, email = ?, salt = ?, password_encrypted = ?,
                         role = ?, tier = ?, credits = ?, reg_date = ?, api_token = ?
                     WHERE id = ?`;
        await db.query(sql, [username, email, salt, password_encrypted, role, tier, credits, reg_date, api_token, id]);
        return { success: true, message: 'User updated successfully' };
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
}

async function deleteUserById(id) {
    try {
        const sql = 'DELETE FROM users WHERE id = ?';
        await db.query(sql, [id]);
        return { success: true, message: 'User deleted successfully' };
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
}

function generateRandomString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

module.exports = {
    createUser,
    readUserById,
    updateUserById,
    deleteUserById,
    readUserByApiToken,
    registerUser,
    loginUser
};
