import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Category = sequelize.define('Category', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    color: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            is: /^#[0-9A-Fa-f]{6}$/i  // Validates hex color like #00ffcc
        }
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    }
});

export default Category;