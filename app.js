import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './models/index.js';
import {serveSwagger, setupSwagger} from "./config/swagger.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/docs', serveSwagger, setupSwagger);

app.get('/', (req, res) => {
    res.send('Expense Tracker API');
});

// Sync DB
try {
    await db.sequelize.sync(); // use { force: true } if testing
    console.log('Database synced');
} catch (err) {
    console.error('DB sync failed:', err);
}

export default app;