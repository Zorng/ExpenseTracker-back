import bcrypt from 'bcrypt';
import db from './models/index.js';

async function seed() {
    try {
        await db.sequelize.sync();

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

        // 3. Create Records spanning 3 months (at least 30 per month per user)
        const currencies = ['USD', 'KHR'];
        const titles = [
            'Coffee', 'Lunch', 'Dinner', 'Breakfast', 'Snacks', 'Groceries',
            'Gas Refill', 'Car Wash', 'Parking', 'Taxi', 'Bus Fare', 'Uber',
            'Phone Bill', 'Internet', 'Electricity', 'Water Bill', 'Repair', 'Subscription',
            'Movie', 'Concert', 'Books', 'Gym', 'Healthcare', 'Shopping',
            'Insurance', 'Bank Fees', 'ATM Fee', 'Transfer Fee', 'Maintenance', 'Cleaning'
        ];

        const records = [];
        
        // Generate dates for the past 3 months
        const currentDate = new Date();
        const monthsData = [];
        
        for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
            const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - monthOffset, 1);
            const year = targetDate.getFullYear();
            const month = targetDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            monthsData.push({
                year,
                month,
                daysInMonth,
                monthName: targetDate.toLocaleString('default', { month: 'long' })
            });
        }

        for (let userIndex = 0; userIndex < users.length; userIndex++) {
            const user = users[userIndex];
            const userCategories = allCategories.filter(cat => cat.userId === user.id);
            
            // Create records for each of the 3 months
            for (const monthData of monthsData) {
                const recordsPerMonth = 30 + Math.floor(Math.random() * 10); // 30-39 records per month
                
                for (let i = 0; i < recordsPerMonth; i++) {
                    const category = userCategories[Math.floor(Math.random() * userCategories.length)];
                    const title = titles[Math.floor(Math.random() * titles.length)];
                    const currency = currencies[Math.floor(Math.random() * currencies.length)];
                    
                    // Generate realistic amounts based on currency
                    let amount;
                    if (currency === 'USD') {
                        // Vary amounts by category type
                        if (category.name === 'Food') {
                            amount = parseFloat((Math.random() * 80 + 5).toFixed(2)); // $5-$85
                        } else if (category.name === 'Gas') {
                            amount = parseFloat((Math.random() * 120 + 30).toFixed(2)); // $30-$150
                        } else { // Services
                            amount = parseFloat((Math.random() * 200 + 20).toFixed(2)); // $20-$220
                        }
                    } else { // KHR
                        // Convert USD ranges to KHR (1 USD = 4000 KHR)
                        if (category.name === 'Food') {
                            amount = parseFloat((Math.random() * 320000 + 20000).toFixed(0)); // 20K-340K KHR
                        } else if (category.name === 'Gas') {
                            amount = parseFloat((Math.random() * 480000 + 120000).toFixed(0)); // 120K-600K KHR
                        } else { // Services
                            amount = parseFloat((Math.random() * 800000 + 80000).toFixed(0)); // 80K-880K KHR
                        }
                    }
                    
                    // Generate random day within the month
                    const day = Math.floor(Math.random() * monthData.daysInMonth) + 1;
                    const date = new Date(monthData.year, monthData.month, day).toISOString().split('T')[0];

                    records.push({
                        title,
                        date,
                        currency,
                        amount,
                        note: `${monthData.monthName} expense #${i + 1}`,
                        userId: user.id,
                        categoryId: category.id
                    });
                }
            }
        }

        await db.Record.bulkCreate(records);

        console.log(`✅ Database seeded with:`);
        console.log(`   - ${users.length} users`);
        console.log(`   - ${allCategories.length} categories (${allCategories.length / users.length} per user)`);
        console.log(`   - ${records.length} records spanning 3 months`);
        console.log(`   - ~${Math.floor(records.length / (users.length * 3))} records per user per month`);
        console.log(`   - Date range: ${new Date(Math.min(...records.map(r => new Date(r.date)))).toDateString()} to ${new Date(Math.max(...records.map(r => new Date(r.date)))).toDateString()}`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding database:', err);
        process.exit(1);
    }
}

seed();