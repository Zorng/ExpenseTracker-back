import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Record = sequelize.define('Record', {
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    currency: {
        type: DataTypes.ENUM('USD', 'KHR'),
        allowNull: false
    },
    note: {
        type: DataTypes.STRING,
        allowNull: true
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    }
});

export default Record;