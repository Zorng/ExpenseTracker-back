import bcrypt from 'bcrypt';
import db from './models/index.js';

async function seed() {
    try {
        await db.sequelize.sync({ force: true }); // DEV ONLY — drops all tables

        // 1. Create Categories
        const categories = await db.Category.bulkCreate([
            { name: 'Food', color: '#ff5722' },
            { name: 'Gas', color: '#2196f3' },
            { name: 'Services', color: '#4caf50' }
        ]);

        // 2. Create Users
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

        // 3. Create Records (10 per user)
        const currencies = ['USD', 'KHR'];
        const titles = ['Coffee', 'Lunch', 'Gas Refill', 'Repair', 'Car Wash', 'Subscription'];

        const records = [];

        for (const user of users) {
            for (let i = 0; i < 10; i++) {
                const category = categories[Math.floor(Math.random() * categories.length)];
                const title = titles[Math.floor(Math.random() * titles.length)];
                const currency = currencies[Math.floor(Math.random() * currencies.length)];
                const amount = parseFloat((Math.random() * 100).toFixed(2));
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