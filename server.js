// server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
const Report = require('./models/report');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Allowed origins for CORS
const allowedOrigins = [
    'https://frontend-282uhmhsf-janaki799s-projects.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001'
];

// CORS configuration
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
    maxAge: 86400
}));

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
});

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Routes
app.get('/', (req, res) => {
    res.send('Incident Reporting API is running');
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

app.post('/reports', async (req, res) => {
    try {
        const { collegeCode, incidentCategory, incidentType, description, date } = req.body;

        // Validation
        if (!collegeCode || !incidentCategory || !incidentType || !description) {
            return res.status(400).json({
                error: 'Missing required fields',
                requiredFields: ['collegeCode', 'incidentCategory', 'incidentType', 'description']
            });
        }

        // Create report
        const report = new Report({
            collegeCode,
            incidentCategory,
            incidentType,
            description,
            date: date || new Date()
        });

        // Save report
        await report.save();

        // Send email notification
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: process.env.EMAIL_USER,
                subject: 'New Incident Report',
                html: `
                    <h2>New Incident Report</h2>
                    <p><strong>College Code:</strong> ${collegeCode}</p>
                    <p><strong>Category:</strong> ${incidentCategory}</p>
                    <p><strong>Type:</strong> ${incidentType}</p>
                    <p><strong>Description:</strong> ${description}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                `
            });
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            // Continue execution even if email fails
        }

        res.status(201).json({
            success: true,
            message: 'Report submitted successfully',
            reportId: report._id
        });
    } catch (error) {
        console.error('Report submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting report',
            error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Environment:', process.env.NODE_ENV);
});



