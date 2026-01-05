// // netlify-backend/functions/submit-story.js (Final and Complete Version)

// const nodemailer = require('nodemailer');
// const Busboy = require('busboy');

// const transporter = nodemailer.createTransport({
//     host: 'smtp-relay.brevo.com',
//     port: 587,
//     auth: {
//         user: 'apikey',
//         pass: process.env.EMAIL_PASS,
//     },
// });

// const parseMultipartForm = (event) =>
//     new Promise((resolve, reject) => {
//         const busboy = Busboy({
//             headers: { 'content-type': event.headers['content-type'] || event.headers['Content-Type'] }
//         });
//         const fields = {};
//         const files = {};

//         busboy.on('file', (fieldname, file, G) => {
//             const chunks = [];
//             file.on('data', (chunk) => chunks.push(chunk));
//             file.on('end', () => {
//                 files[fieldname] = {
//                     filename: G.filename,
//                     contentType: G.mimeType,
//                     content: Buffer.concat(chunks),
//                 };
//             });
//         });

//         busboy.on('field', (fieldname, val) => {
//             fields[fieldname] = val;
//         });

//         busboy.on('error', err => reject(err));
//         busboy.on('finish', () => resolve({ fields, files }));

//         busboy.end(Buffer.from(event.body, 'base64'));
//     });

// exports.handler = async (event) => {
//     const headers = {
//         'Access-Control-Allow-Origin': 'https://yespakistan.com',
//         'Access-Control-Allow-Headers': 'Content-Type',
//         'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
//     };

//     if (event.httpMethod === 'OPTIONS') {
//         return {
//             statusCode: 204,
//             headers,
//             body: '',
//         };
//     }

//     try {
//         const { fields, files } = await parseMultipartForm(event);
//         const attachment = files.attachment;

//         const mailOptions = {
//             from: `"${fields.name}" <${process.env.EMAIL_USER}>`,
//             to: process.env.RECEIVER_EMAIL,
//             replyTo: fields.email,
//             subject: `New Story Submission: ${fields.story_title}`,
//             html: `
//                 <div style="font-family: Arial, sans-serif;">
//                     <h2>New Story Submission</h2>
//                     <p><strong>Name:</strong> ${fields.name}</p>
//                     <p><strong>Email:</strong> ${fields.email}</p>
//                     <p><strong>Category:</strong> ${fields.category}</p>
//                     <hr>
//                     <h3>Story:</h3>
//                     <p>${fields.message}</p>
//                 </div>
//             `,
//             attachments: attachment ? [{
//                 filename: attachment.filename,
//                 content: attachment.content,
//                 contentType: attachment.contentType,
//             }] : [],
//         };

//         await transporter.sendMail(mailOptions);

//         return {
//             statusCode: 200,
//             headers,
//             body: JSON.stringify({ message: "Your story has been submitted successfully!" }),
//         };
//     } catch (error) {
//         console.error("Error:", error);
//         return {
//             statusCode: 500,
//             headers,
//             body: JSON.stringify({ message: `Failed to process your request. Error: ${error.toString()}` }),
//         };
//     }
// };

// netlify-backend/functions/submit-story.js

const nodemailer = require('nodemailer');
const Busboy = require('busboy');

// 1. Transporter Configuration (Fixed for Brevo)
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
        // Yahan 'apikey' nahi, apka variable aana chahiye
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS,
    },
});

const parseMultipartForm = (event) =>
    new Promise((resolve, reject) => {
        const busboy = Busboy({
            headers: { 'content-type': event.headers['content-type'] || event.headers['Content-Type'] }
        });
        const fields = {};
        const files = {};

        busboy.on('file', (fieldname, file, G) => {
            const chunks = [];
            file.on('data', (chunk) => chunks.push(chunk));
            file.on('end', () => {
                files[fieldname] = {
                    filename: G.filename,
                    contentType: G.mimeType,
                    content: Buffer.concat(chunks),
                };
            });
        });

        busboy.on('field', (fieldname, val) => {
            fields[fieldname] = val;
        });

        busboy.on('error', err => reject(err));
        busboy.on('finish', () => resolve({ fields, files }));

        busboy.end(Buffer.from(event.body, 'base64'));
    });

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': 'https://yespakistan.netlify.app', // Update with your actual domain if needed
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers,
            body: '',
        };
    }

    try {
        const { fields, files } = await parseMultipartForm(event);
        const attachment = files.attachment;

        // 2. Email Subject Logic
        const subject = fields.formType === 'Internship' 
            ? `New Internship Application: ${fields.name}`
            : `New Story Submission: ${fields.story_title || fields.subject || 'No Title'}`;

        // 3. Email Body Logic (Handle Internship vs Story fields)
        let htmlContent = `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #009876;">${fields.formType || 'Submission'} Received</h2>
                <p><strong>Name:</strong> ${fields.name}</p>
                <p><strong>Email:</strong> ${fields.email}</p>
        `;

        // Add Internship Specific Fields if they exist
        if (fields.phone) htmlContent += `<p><strong>Phone:</strong> ${fields.phone}</p>`;
        if (fields.city) htmlContent += `<p><strong>City:</strong> ${fields.city}</p>`;
        if (fields.onSiteAvailability) htmlContent += `<p><strong>On-site Availability:</strong> ${fields.onSiteAvailability}</p>`;
        
        // Add Story/General Fields
        if (fields.category) htmlContent += `<p><strong>Category:</strong> ${fields.category}</p>`;
        if (fields.story_title) htmlContent += `<p><strong>Title:</strong> ${fields.story_title}</p>`;
        
        // Add Message/Guidelines
        htmlContent += `<hr><h3>Message / details:</h3><p>${fields.message || 'No message provided.'}</p>`;
        
        if (fields.guidelines_accepted) {
            htmlContent += `<p style="font-size: 12px; color: gray;">* User accepted guidelines.</p>`;
        }
        
        htmlContent += `</div>`;

        const mailOptions = {
            from: `"${fields.name}" <${process.env.EMAIL_USER}>`, // SENDER (Must be your Brevo email)
            to: process.env.EMAIL_USER, // RECEIVER (Receive on same email to test)
            replyTo: fields.email, // Reply to the user who filled the form
            subject: subject,
            html: htmlContent,
            attachments: attachment ? [{
                filename: attachment.filename,
                content: attachment.content,
                contentType: attachment.contentType,
            }] : [],
        };

        await transporter.sendMail(mailOptions);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: "Received successfully!" }),
        };
    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: `Failed to process. Error: ${error.toString()}` }),
        };
    }
};