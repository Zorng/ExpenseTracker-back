import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Record = sequelize.define('Record', {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    currency: {
        type: DataTypes.ENUM('USD', 'KHR'),
        allowNull: false
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    note: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

export default Record;