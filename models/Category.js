import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Category = sequelize.define('Category', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    color: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            is: /^#[0-9A-Fa-f]{6}$/i  // Validates hex color like #00ffcc
        }
    }
});

export default Category;