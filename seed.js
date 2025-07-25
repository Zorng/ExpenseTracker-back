import bcrypt from 'bcrypt';
import db from './models/index.js';

async function seed() {
    try {
        await db.sequelize.sync({ force: true }); // DEV ONLY — drops all tables

        // 1. Create Users first
        const users = await Promise.all(
            ['alice', 'bob', 'charlie'].map(async (username, index) => {
                const hashedPassword = await bcrypt.hash(`pass${index + 1}`, 10);
                return db.User.create({
                    username,
                    email: `${username}@example.com`,
                    password: hashedPassword
                });
            })
        );

        // 2. Create Categories for each user
        const allCategories = [];
        for (const user of users) {
            const userCategories = await db.Category.bulkCreate([
                { name: 'Food', color: '#ff5722', userId: user.id },
                { name: 'Gas', color: '#2196f3', userId: user.id },
                { name: 'Services', color: '#4caf50', userId: user.id }
            ]);
            allCategories.push(...userCategories);
        }

        // 3. Create Records (10 per user)
        const currencies = ['USD', 'KHR'];
        const titles = ['Coffee', 'Lunch', 'Gas Refill', 'Repair', 'Car Wash', 'Subscription'];

        const records = [];

        for (let userIndex = 0; userIndex < users.length; userIndex++) {
            const user = users[userIndex];
            const userCategories = allCategories.filter(cat => cat.userId === user.id);
            
            for (let i = 0; i < 10; i++) {
                const category = userCategories[Math.floor(Math.random() * userCategories.length)];
                const title = titles[Math.floor(Math.random() * titles.length)];
                const currency = currencies[Math.floor(Math.random() * currencies.length)];
                
                // Generate realistic amounts based on currency
                let amount;
                if (currency === 'USD') {
                    amount = parseFloat((Math.random() * 100 + 5).toFixed(2)); // $5-$105
                } else { // KHR
                    amount = parseFloat((Math.random() * 400000 + 20000).toFixed(2)); // 20,000-420,000 KHR
                }
                
                const date = new Date(2025, 6, 1 + i).toISOString().split('T')[0]; // July 1-10, 2025

                records.push({
                    title,
                    date,
                    currency,
                    amount,
                    note: `Seeded record #${i + 1}`,
                    userId: user.id,
                    categoryId: category.id
                });
            }
        }

        await db.Record.bulkCreate(records);

        console.log('✅ Database seeded with 3 users, 3 categories, and 30 records.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding database:', err);
        process.exit(1);
    }
}

seed();