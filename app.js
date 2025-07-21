import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './models/index.js';
import {serveSwagger, setupSwagger} from "./config/swagger.js";
import categoryRoutes from './routes/Category.route.js';
import userRoutes from './routes/User.route.js';
import recordRoutes from './routes/Record.route.js';
import summaryRoutes from './routes/Summary.route.js';


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/docs', serveSwagger, setupSwagger);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);

// Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/users', userRoutes);
app.use('/api/summary', summaryRoutes);

app.get('/', (req, res) => {
    res.send('Expense Tracker API');
});

// Sync DB
    try {
        await db.sequelize.sync(); // Removed force: true to preserve data
        console.log('Database synced');
    } catch (err) {
        console.error('DB sync failed:', err);
    }
export default app;