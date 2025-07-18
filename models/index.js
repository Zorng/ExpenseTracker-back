import sequelize from '../config/db.js';
import User from './User.js';
import Record from './Record.js';
import Category from './Category.js';

// Associations
User.hasMany(Record, { foreignKey: 'userId', onDelete: 'CASCADE' });
Record.belongsTo(User, { foreignKey: 'userId' });

Category.hasMany(Record, { foreignKey: 'categoryId', onDelete: 'SET NULL' });
Record.belongsTo(Category, { foreignKey: 'categoryId' });

const db = {
    sequelize,
    User,
    Record,
    Category
};

export default db;