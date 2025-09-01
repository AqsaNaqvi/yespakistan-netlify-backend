// netlify-backend/functions/submit-story.js (Final and Complete Version)

const nodemailer = require('nodemailer');
const Busboy = require('busboy');

const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
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
        'Access-Control-Allow-Origin': 'https://yespakistan.com',
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

        const mailOptions = {
            from: `"${fields.name}" <${process.env.EMAIL_USER}>`,
            to: process.env.RECEIVER_EMAIL,
            replyTo: fields.email,
            subject: `New Story Submission: ${fields.story_title}`,
            html: `
                <div style="font-family: Arial, sans-serif;">
                    <h2>New Story Submission</h2>
                    <p><strong>Name:</strong> ${fields.name}</p>
                    <p><strong>Email:</strong> ${fields.email}</p>
                    <p><strong>Category:</strong> ${fields.category}</p>
                    <hr>
                    <h3>Story:</h3>
                    <p>${fields.message}</p>
                </div>
            `,
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
            body: JSON.stringify({ message: "Your story has been submitted successfully!" }),
        };
    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: `Failed to process your request. Error: ${error.toString()}` }),
        };
    }
};