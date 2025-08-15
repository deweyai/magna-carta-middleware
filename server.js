const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// NDAQ API Configuration
const NDAQ_CONFIG = {
    username: 'jrom',
    password: 'Accent1995',
    submitUrl: 'http://lo-n02.accent-technologies.com/webclient/_libraries/ndaq/package.ashx?out=dgrid&m=cpack&replace=1',
    statusUrl: 'https://lo-n14.accent-technologies.com/webclient/_libraries/dhl/default.ashx?m=getfifr&out=ujson&in=cjson',
    downloadUrl: 'http://lo-n02.accent-technologies.com/webclient/_libraries/ndaq/download.ashx?mode=dnld'
};

// Utility functions
function createBasicAuth(username, password) {
    return 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
}

function createPersonalizedXML(contactData, opportunityData) {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<package version="1">
    <content count="1" resolve="0">
        <item fileId="4412"
              addType="0"
              ext="docx"
              exts=""
              catType="0"
              target="4"/>
    </content>
    <output>
        <file name="${contactData.fullName} - ${opportunityData.name} Proposal"
              type="DOC">
            <notifyOnCreate>true</notifyOnCreate>
            <notification>
                <from>support@accent-technologies.com</from>
                <subject>Personalized Document Generated</subject>
            </notification>
            <textReplace>
                <text target="0">
                    <find>{{{ContactName}}}</find>
                    <replace>${contactData.fullName || 'Valued Contact'}</replace>
                </text>
                <text target="0">
                    <find>{{{FirstName}}}</find>
                    <replace>${contactData.firstName || 'Valued'}</replace>
                </text>
                <text target="0">
                    <find>{{{LastName}}}</find>
                    <replace>${contactData.lastName || 'Contact'}</replace>
                </text>
                <text target="0">
                    <find>{{{CompanyName}}}</find>
                    <replace>${contactData.companyName || 'Your Company'}</replace>
                </text>
                <text target="0">
                    <find>{{{Industry}}}</find>
                    <replace>${contactData.industry || 'Industry'}</replace>
                </text>
                <text target="0">
                    <find>{{{ContactTitle}}}</find>
                    <replace>${contactData.title || 'Professional'}</replace>
                </text>
                <text target="0">
                    <find>{{{OpportunityName}}}</find>
                    <replace>${opportunityData.name || 'Business Opportunity'}</replace>
                </text>
                <text target="0">
                    <find>{{{OpportunityStage}}}</find>
                    <replace>${opportunityData.stage || 'In Progress'}</replace>
                </text>
                <text target="0">
                    <find>{{{City}}}</find>
                    <replace>${contactData.city || 'Your City'}</replace>
                </text>
                <text target="0">
                    <find>{{{State}}}</find>
                    <replace>${contactData.state || 'Your State'}</replace>
                </text>
                <text target="0">
                    <find>{{{Country}}}</find>
                    <replace>${contactData.country || 'Your Country'}</replace>
                </text>
            </textReplace>
        </file>
    </output>
</package>`;
    
    return Buffer.from(xml).toString('base64');
}

async function submitToNDAQ(base64XML) {
    console.log('Submitting to NDAQ API...');
    
    const response = await axios.post(NDAQ_CONFIG.submitUrl, base64XML, {
        headers: {
            'Authorization': createBasicAuth(NDAQ_CONFIG.username, NDAQ_CONFIG.password),
            'Content-Type': 'text/plain'
        },
        timeout: 30000
    });
    
    console.log('NDAQ Submit Response:', response.data);
    
    if (response.data && response.data.data && response.data.data[0] && response.data.data[0].files) {
        return response.data.data[0].files[0].requestid;
    }
    
    throw new Error('Invalid response from NDAQ API');
}

async function pollNDAQStatus(requestId) {
    console.log(`Polling status for request ${requestId}...`);
    
    const maxAttempts = 30;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        const response = await axios.get(`${NDAQ_CONFIG.statusUrl}&rid=${requestId}`, {
            headers: {
                'Authorization': createBasicAuth(NDAQ_CONFIG.username, NDAQ_CONFIG.password)
            },
            timeout: 10000
        });
        
        console.log(`Status check ${attempts + 1}:`, response.data);
        
        if (response.data && response.data[0]) {
            const status = response.data[0];
            
            if (status.Failed) {
                throw new Error('Document generation failed');
            }
            
            if (status.Complete && status.FileId && status.FileId > 0) {
                return status.FileId;
            }
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    }
    
    throw new Error('Timeout waiting for document completion');
}

function createDownloadUrl(fileId, requestId) {
    return `${NDAQ_CONFIG.downloadUrl}&fid=${fileId}&rid=${requestId}`;
}

// Routes
app.get('/', (req, res) => {
    res.send(`
        <html>
            <body>
                <h1>Magna Carta Document Generation Service</h1>
                <p>Middleware service for Salesforce → NDAQ integration</p>
                <p>Status: Running</p>
                <p>Time: ${new Date().toISOString()}</p>
            </body>
        </html>
    `);
});

app.post('/generate-document', async (req, res) => {
    try {
        console.log('Received document generation request:', JSON.stringify(req.body, null, 2));
        
        const { contact, opportunity } = req.body;
        
        if (!contact || !opportunity) {
            return res.status(400).json({
                success: false,
                message: 'Missing contact or opportunity data'
            });
        }
        
        // Step 1: Create personalized XML
        console.log('Creating personalized XML...');
        const base64XML = createPersonalizedXML(contact, opportunity);
        
        // Step 2: Submit to NDAQ
        const requestId = await submitToNDAQ(base64XML);
        console.log(`Document submitted with request ID: ${requestId}`);
        
        // Step 3: Poll for completion
        const fileId = await pollNDAQStatus(requestId);
        console.log(`Document completed with file ID: ${fileId}`);
        
        // Step 4: Create download URL
        const downloadUrl = createDownloadUrl(fileId, requestId);
        console.log(`Download URL: ${downloadUrl}`);
        
        // Return success response with OUR download URL (not NDAQ's)
        res.json({
            success: true,
            message: 'Document generated successfully',
            downloadUrl: `https://${req.get('host')}/download/${requestId}/${fileId}`,
            requestId: requestId,
            fileId: fileId,
            personalizedFor: contact.fullName,
            opportunityName: opportunity.name
        });
        
    } catch (error) {
        console.error('Error generating document:', error);
        
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Download proxy endpoint - handles authentication for us
app.get('/download/:requestId/:fileId', async (req, res) => {
    try {
        const { requestId, fileId } = req.params;
        
        console.log(`Proxying download for request ${requestId}, file ${fileId}`);
        
        const downloadUrl = createDownloadUrl(fileId, requestId);
        
        // Download from NDAQ with authentication
        const response = await axios.get(downloadUrl, {
            headers: {
                'Authorization': createBasicAuth(NDAQ_CONFIG.username, NDAQ_CONFIG.password)
            },
            responseType: 'stream',
            timeout: 30000
        });
        
        // Set appropriate headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="Personalized_Document_${requestId}.docx"`);
        
        // Pipe the file directly to the response
        response.data.pipe(res);
        
    } catch (error) {
        console.error('Error proxying download:', error);
        res.status(500).json({
            error: 'Failed to download document',
            message: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'magna-carta-middleware'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// Start server
app.listen(port, () => {
    console.log(`Magna Carta Middleware Server running on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`Main endpoint: http://localhost:${port}/generate-document`);
});

module.exports = app;