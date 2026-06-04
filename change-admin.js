const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const readline = require('readline');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n--- Eagle Sports Admin Credential Updater ---\n');

rl.question('Enter new Admin Email: ', (newEmail) => {
    rl.question('Enter new Admin Password: ', (newPassword) => {
        
        if (!newEmail || !newPassword) {
            console.log('Error: Email and Password cannot be empty.');
            rl.close();
            return;
        }

        // Hash the new password
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(newPassword, salt);

        // Update the database (Assuming there's only 1 admin user, we just update the first row, or we can clear and insert)
        db.serialize(() => {
            db.run('DELETE FROM users', (err) => {
                if (err) {
                    console.error('Error clearing old admin:', err);
                    rl.close();
                    return;
                }
                
                db.run('INSERT INTO users (email, password) VALUES (?, ?)', [newEmail, hash], (err) => {
                    if (err) {
                        console.error('Error creating new admin:', err);
                    } else {
                        console.log('\n✅ Success! Admin credentials updated securely.');
                        console.log(`New Email: ${newEmail}`);
                        console.log('Your password has been securely hashed and stored.');
                    }
                    rl.close();
                });
            });
        });
    });
});
