import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { v4 as uuidv4 }  from 'uuid';

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4, // or DataTypes.UUIDV4
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false
        // no unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

export default User;