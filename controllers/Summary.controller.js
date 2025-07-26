import db from "../models/index.js";
import { Op } from "sequelize";

// Currency conversion rates (should match Record controller)
const EXCHANGE_RATES = {
    USD_TO_KHR: 4000, // 1 USD = 4000 KHR
    KHR_TO_USD: 0.00025 // 1 KHR = 0.00025 USD
};

// Helper function to convert amounts to USD for percentage calculations
const convertToUSD = (amount, currency) => {
    if (currency === 'USD') return parseFloat(amount);
    if (currency === 'KHR') return parseFloat(amount) * EXCHANGE_RATES.KHR_TO_USD;
    return parseFloat(amount);
};

/**
 * @openapi
 * tags:
 *  - name: Summary
 *    description: Analytics and Summary Management
 */

/**
 * @openapi
 * /api/summary/monthly:
 *   get:
 *     tags: [Summary]
 *     summary: Get monthly expense summary and category breakdown
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Month (1-12). Defaults to current month
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           minimum: 2020
 *           maximum: 2030
 *         description: Year. Defaults to current year
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           enum: [USD, KHR, ALL]
 *           default: ALL
 *         description: Currency filter - USD, KHR, or ALL for both
 *     responses:
 *       200:
 *         description: Monthly summary data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     month:
 *                       type: integer
 *                     year:
 *                       type: integer
 *                     currency:
 *                       type: string
 *                     totalExpenses:
 *                       type: object
 *                       properties:
 *                         USD:
 *                           type: number
 *                         KHR:
 *                           type: number
 *                     recordCount:
 *                       type: integer
 *                     averagePerDay:
 *                       type: object
 *                       properties:
 *                         USD:
 *                           type: number
 *                         KHR:
 *                           type: number
 *                     isEmpty:
 *                       type: boolean
 *                 categoryBreakdown:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       categoryId:
 *                         type: integer
 *                       categoryName:
 *                         type: string
 *                       categoryColor:
 *                         type: string
 *                       totalUSD:
 *                         type: number
 *                       totalKHR:
 *                         type: number
 *                       recordCount:
 *                         type: integer
 *                       percentage:
 *                         type: number
 *       400:
 *         description: Invalid month or year
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
export const getMonthlySummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const currentDate = new Date();
        
        // Parse and validate parameters
        const month = parseInt(req.query.month) || (currentDate.getMonth() + 1);
        const year = parseInt(req.query.year) || currentDate.getFullYear();
        const currency = req.query.currency || 'ALL';
        
        // Validate month and year
        if (month < 1 || month > 12) {
            return res.status(400).json({ error: 'Month must be between 1 and 12' });
        }
        if (year < 2020 || year > 2030) {
            return res.status(400).json({ error: 'Year must be between 2020 and 2030' });
        }
        
        // Calculate date range for the selected month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        
        // Build where conditions
        let whereConditions = {
            userId: userId,
            date: {
                [Op.gte]: startDate,
                [Op.lte]: endDate
            }
        };
        
        // Add currency filter if not 'ALL'
        if (currency !== 'ALL') {
            whereConditions.currency = currency;
        }
        
        // Get all records for the month with category information
        const records = await db.Record.findAll({
            where: whereConditions,
            include: [
                {
                    model: db.Category,
                    attributes: ['id', 'name', 'color'],
                    required: false // Include records without categories
                }
            ],
            order: [['date', 'DESC']]
        });
        
        // Calculate totals by currency
        const totals = { USD: 0, KHR: 0 };
        records.forEach(record => {
            totals[record.currency] += parseFloat(record.amount);
        });
        
        // Round totals to 2 decimal places
        totals.USD = Math.round(totals.USD * 100) / 100;
        totals.KHR = Math.round(totals.KHR * 100) / 100;
        
        // Calculate days in month for average calculation
        const daysInMonth = new Date(year, month, 0).getDate();
        const averagePerDay = {
            USD: totals.USD / daysInMonth,
            KHR: totals.KHR / daysInMonth
        };
        
        // Group records by category for breakdown
        const categoryMap = new Map();
        
        records.forEach(record => {
            const categoryId = record.Category?.id || null;
            const categoryName = record.Category?.name || 'Uncategorized';
            const categoryColor = record.Category?.color || '#808080';
            
            if (!categoryMap.has(categoryId)) {
                categoryMap.set(categoryId, {
                    categoryId,
                    categoryName,
                    categoryColor,
                    totalUSD: 0,
                    totalKHR: 0,
                    recordCount: 0
                });
            }
            
            const categoryData = categoryMap.get(categoryId);
            categoryData.totalUSD += record.currency === 'USD' ? parseFloat(record.amount) : 0;
            categoryData.totalKHR += record.currency === 'KHR' ? parseFloat(record.amount) : 0;
            categoryData.recordCount += 1;
        });
        
        // Convert map to array and calculate percentages
        const categoryBreakdown = Array.from(categoryMap.values()).map(category => {
            // Round category totals to 2 decimal places
            category.totalUSD = Math.round(category.totalUSD * 100) / 100;
            category.totalKHR = Math.round(category.totalKHR * 100) / 100;
            
            // Convert to USD for accurate percentage calculation
            const categoryTotalUSD = convertToUSD(category.totalUSD, 'USD') + convertToUSD(category.totalKHR, 'KHR');
            const grandTotalUSD = convertToUSD(totals.USD, 'USD') + convertToUSD(totals.KHR, 'KHR');
            const percentage = grandTotalUSD > 0 ? (categoryTotalUSD / grandTotalUSD) * 100 : 0;
            
            return {
                ...category,
                percentage: Math.round(percentage * 100) / 100 // Round to 2 decimal places
            };
        });
        
        // Sort by total amount (converted to USD for fair comparison) descending
        categoryBreakdown.sort((a, b) => {
            const aTotalUSD = convertToUSD(a.totalUSD, 'USD') + convertToUSD(a.totalKHR, 'KHR');
            const bTotalUSD = convertToUSD(b.totalUSD, 'USD') + convertToUSD(b.totalKHR, 'KHR');
            return bTotalUSD - aTotalUSD;
        });
        
        const summary = {
            month,
            year,
            currency,
            totalExpenses: totals,
            recordCount: records.length,
            averagePerDay: {
                USD: Math.round(averagePerDay.USD * 100) / 100,
                KHR: Math.round(averagePerDay.KHR * 100) / 100
            },
            isEmpty: records.length === 0
        };
        
        res.json({
            summary,
            categoryBreakdown
        });
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @openapi
 * /api/summary/recent-average:
 *   get:
 *     tags: [Summary]
 *     summary: Get average daily expenses for the most recent 3 months with proper currency conversion
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: displayCurrency
 *         schema:
 *           type: string
 *           enum: [USD, KHR, BOTH]
 *           default: BOTH
 *         description: |
 *           Currency to display results in:
 *           - USD: Convert all amounts to USD
 *           - KHR: Convert all amounts to KHR  
 *           - BOTH: Show both currencies with proper conversion
 *     responses:
 *       200:
 *         description: Recent 3 months average data with proper currency conversion
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 displayCurrency:
 *                   type: string
 *                 recentMonths:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: integer
 *                       year:
 *                         type: integer
 *                       monthName:
 *                         type: string
 *                       totalExpenses:
 *                         type: object
 *                         properties:
 *                           USD:
 *                             type: number
 *                           KHR:
 *                             type: number
 *                       averagePerDay:
 *                         type: object
 *                         properties:
 *                           USD:
 *                             type: number
 *                           KHR:
 *                             type: number
 *                       recordCount:
 *                         type: integer
 *                       rawTotals:
 *                         type: object
 *                         description: Original amounts before conversion
 *                         properties:
 *                           USD:
 *                             type: number
 *                           KHR:
 *                             type: number
 *                 overallAverage:
 *                   type: object
 *                   properties:
 *                     USD:
 *                       type: number
 *                     KHR:
 *                       type: number
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
export const getRecentAverage = async (req, res) => {
    try {
        const userId = req.user.id;
        const displayCurrency = req.query.displayCurrency || 'BOTH';
        const currentDate = new Date();
        
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const recentMonths = [];
        let totalDays = 0;
        let overallTotalsUSD = 0; // Track everything in USD for accurate averaging
        
        // Get data for the most recent 3 months
        for (let i = 0; i < 3; i++) {
            const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const month = targetDate.getMonth() + 1;
            const year = targetDate.getFullYear();
            
            // Calculate date range for this month
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59, 999);
            
            // Build where conditions - always get ALL records regardless of currency
            let whereConditions = {
                userId: userId,
                date: {
                    [Op.gte]: startDate,
                    [Op.lte]: endDate
                }
            };
            
            // Get records for this month
            const records = await db.Record.findAll({
                where: whereConditions,
                attributes: ['amount', 'currency']
            });
            
            // Calculate raw totals and convert everything to USD for proper totaling
            const rawTotals = { USD: 0, KHR: 0 };
            let monthTotalUSD = 0;
            
            records.forEach(record => {
                const amount = parseFloat(record.amount);
                rawTotals[record.currency] += amount;
                
                // Convert everything to USD for accurate total calculation
                monthTotalUSD += convertToUSD(amount, record.currency);
            });
            
            // Round raw totals to 2 decimal places
            rawTotals.USD = Math.round(rawTotals.USD * 100) / 100;
            rawTotals.KHR = Math.round(rawTotals.KHR * 100) / 100;
            
            // Calculate proper totals based on display currency
            let totalExpenses = { USD: 0, KHR: 0 };
            
            if (displayCurrency === 'USD') {
                totalExpenses.USD = Math.round(monthTotalUSD * 100) / 100;
                totalExpenses.KHR = Math.round(monthTotalUSD * EXCHANGE_RATES.USD_TO_KHR * 100) / 100;
            } else if (displayCurrency === 'KHR') {
                const monthTotalKHR = monthTotalUSD * EXCHANGE_RATES.USD_TO_KHR;
                totalExpenses.USD = Math.round(monthTotalUSD * 100) / 100;
                totalExpenses.KHR = Math.round(monthTotalKHR * 100) / 100;
            } else { // BOTH
                totalExpenses.USD = Math.round(monthTotalUSD * 100) / 100;
                totalExpenses.KHR = Math.round(monthTotalUSD * EXCHANGE_RATES.USD_TO_KHR * 100) / 100;
            }
            
            // Calculate days in this month
            const daysInMonth = new Date(year, month, 0).getDate();
            totalDays += daysInMonth;
            
            // Calculate average per day
            const averagePerDay = {
                USD: Math.round((totalExpenses.USD / daysInMonth) * 100) / 100,
                KHR: Math.round((totalExpenses.KHR / daysInMonth) * 100) / 100
            };
            
            // Add to overall total (in USD for accurate calculation)
            overallTotalsUSD += monthTotalUSD;
            
            recentMonths.push({
                month,
                year,
                monthName: monthNames[month - 1],
                totalExpenses,
                averagePerDay,
                recordCount: records.length,
                rawTotals // Include raw amounts for transparency
            });
        }
        
        // Calculate overall average across 3 months
        const overallAverage = {
            USD: Math.round((overallTotalsUSD / totalDays) * 100) / 100,
            KHR: Math.round((overallTotalsUSD * EXCHANGE_RATES.USD_TO_KHR / totalDays) * 100) / 100
        };
        
        res.json({
            displayCurrency,
            recentMonths,
            overallAverage
        });
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @openapi
 * /api/summary/top5:
 *   get:
 *     tags: [Summary]
 *     summary: Get top 5 biggest spending records from the past 3 months
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: displayCurrency
 *         schema:
 *           type: string
 *           enum: [USD, KHR]
 *           default: USD
 *         description: Currency to display amounts in (converts using fixed rate)
 *     responses:
 *       200:
 *         description: Top 5 expenses from last 3 months
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 displayCurrency:
 *                   type: string
 *                 totalRecords:
 *                   type: integer
 *                 top5Expenses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       amount:
 *                         type: number
 *                         description: Amount converted to display currency
 *                       originalAmount:
 *                         type: number
 *                       originalCurrency:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date
 *                       categoryName:
 *                         type: string
 *                       categoryColor:
 *                         type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
export const getTop5Expenses = async (req, res) => {
    try {
        const userId = req.user.id;
        const displayCurrency = req.query.displayCurrency || 'USD';
        const currentDate = new Date();
        
        // Calculate date range for the past 3 months
        const threeMonthsAgo = new Date(currentDate);
        threeMonthsAgo.setMonth(currentDate.getMonth() - 3);
        threeMonthsAgo.setDate(1); // Start from first day of the month 3 months ago
        threeMonthsAgo.setHours(0, 0, 0, 0);
        
        const endDate = new Date(currentDate);
        endDate.setHours(23, 59, 59, 999);
        
        // Build where conditions
        let whereConditions = {
            userId: userId,
            date: {
                [Op.gte]: threeMonthsAgo,
                [Op.lte]: endDate
            }
        };
        
        // Get all records from the past 3 months with category information
        const records = await db.Record.findAll({
            where: whereConditions,
            include: [
                {
                    model: db.Category,
                    attributes: ['id', 'name', 'color'],
                    required: false // Include records without categories
                }
            ],
            attributes: ['id', 'title', 'amount', 'currency', 'date', 'note'],
            order: [['date', 'DESC']]
        });
        
        // Convert amounts to display currency and sort by converted amount
        const recordsWithConvertedAmounts = records.map(record => {
            const originalAmount = parseFloat(record.amount);
            
            // Use helper function for conversion
            let convertedAmount;
            if (record.currency === displayCurrency) {
                convertedAmount = originalAmount;
            } else if (displayCurrency === 'USD') {
                convertedAmount = convertToUSD(originalAmount, record.currency);
            } else if (displayCurrency === 'KHR') {
                // Convert to USD first, then to KHR
                const usdAmount = convertToUSD(originalAmount, record.currency);
                convertedAmount = usdAmount * EXCHANGE_RATES.USD_TO_KHR;
            } else {
                convertedAmount = originalAmount;
            }
            
            // Handle date formatting
            let formattedDate;
            if (record.date instanceof Date) {
                formattedDate = record.date.toISOString().split('T')[0];
            } else if (typeof record.date === 'string') {
                // If it's already a string, try to format it properly
                const dateObj = new Date(record.date);
                formattedDate = dateObj.toISOString().split('T')[0];
            } else {
                formattedDate = record.date; // Fallback to whatever it is
            }
            
            return {
                id: record.id,
                title: record.title,
                amount: Math.round(convertedAmount * 100) / 100, // Converted amount
                originalAmount: originalAmount,
                originalCurrency: record.currency,
                date: formattedDate, // Safely formatted date
                categoryName: record.Category?.name || 'Uncategorized',
                categoryColor: record.Category?.color || '#808080',
                convertedAmount: convertedAmount // For sorting
            };
        });
        
        // Sort by converted amount descending and limit to top 5
        const top5Expenses = recordsWithConvertedAmounts
            .sort((a, b) => b.convertedAmount - a.convertedAmount)
            .slice(0, 5)
            .map(record => {
                // Remove the convertedAmount field from final response
                const { convertedAmount, ...recordWithoutSortField } = record;
                return recordWithoutSortField;
            });
        
        res.json({
            displayCurrency,
            totalRecords: records.length,
            top5Expenses
        });
        
    } catch (err) {
        console.error('Error in getTop5Expenses:', err);
        res.status(500).json({ error: err.message });
    }
};