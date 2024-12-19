const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Updated CORS configuration
const corsOptions = {
    origin: function(origin, callback) {
        const allowedOrigins = [
            'https://frontend-282uhmhsf-janaki799s-projects.vercel.app',  // Production frontend
            'http://127.0.0.1:5500',                    // Local development
            'http://localhost:5500'                     // Alternative local
        ];
        
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('CORS', `Blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    }
};

// Enable CORS for all routes
app.use(cors(corsOptions));

// Middleware
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
});

// Report schema and model
const reportSchema = new mongoose.Schema({
    collegeCode: String,
    incidentCategory: String,
    incidentType: String,
    description: String,
    date: Date
});

const Report = mongoose.model('Report', reportSchema);

// Routes
app.post('/reports', async (req, res) => {
    const { collegeCode, incidentCategory, incidentType, description, date } = req.body;

    if (!collegeCode || !incidentCategory || !incidentType || !description || !date) {
        return res.status(400).send({ error: 'Bad Request: Missing required fields' });
    }

    try {
        const report = new Report({ collegeCode, incidentCategory, incidentType, description, date });
        await report.save();

        // Send notification (e.g., email)
        const transporter = nodemailer.createTransport({
            service: 'your_email_service',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'recipient@example.com',
            subject: 'New Incident Report',
            html: `
                <p>A new incident report has been submitted:</p>
                <ul>
                    <li>Category: ${incidentCategory}</li>
                    <li>Type: ${incidentType}</li>
                    <li>Description: ${description}</li>
                    <li>Date: ${date}</li>
                </ul>
                <hr>
                <p><small>Environment: ${process.env.NODE_ENV || 'development'}</small></p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Email', 'Notification sent successfully');

        res.status(201).json({
            message: 'Report submitted successfully!',
            reportId: report._id,
            emailSent: true
        });
    } catch (error) {
        console.error('Report Submission', error);
        res.status(500).json({
            error: 'Error submitting report',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});




