// seed.js
import bcrypt from 'bcrypt';
import db from './models/index.js';

async function seed() {
    try {
        await db.sequelize.sync({ force: true }); // WARNING: drops and recreates all tables

        // Create user
        const hashedPassword = await bcrypt.hash('password123', 10);
        const user = await db.User.create({
            username: 'testuser',
            email: 'test@example.com',
            password: hashedPassword,
        });

        // Create categories
        const categories = await db.Category.bulkCreate([
            { name: 'Food', type: 'expense' },
            { name: 'Transport', type: 'expense' },
            { name: 'Salary', type: 'income' },
        ]);

        // Create records
        await db.Record.bulkCreate([
            {
                amount: 5.5,
                currency: 'USD',
                note: 'Lunch',
                date: '2025-07-18',
                userId: user.id,
                categoryId: categories[0].id, // Food
            },
            {
                amount: 2.0,
                currency: 'USD',
                note: 'Bus ticket',
                date: '2025-07-17',
                userId: user.id,
                categoryId: categories[1].id, // Transport
            },
            {
                amount: 150,
                currency: 'USD',
                note: 'Monthly salary',
                date: '2025-07-01',
                userId: user.id,
                categoryId: categories[2].id, // Salary
            },
        ]);

        console.log('✅ Database seeded successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding database:', err);
        process.exit(1);
    }
}

seed();