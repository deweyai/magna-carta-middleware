const axios = require('axios');

// Test data mimicking Salesforce contact and opportunity
const testData = {
    contact: {
        id: '003XXXXXXXXXXXXXX',
        firstName: 'Michael',
        lastName: 'Moore',
        fullName: 'Michael Moore',
        title: 'Director of Operations',
        email: 'mmoore@canadianrail.com',
        phone: '555-0123',
        companyName: 'Canadian National Railway',
        industry: 'Transportation',
        accountType: 'Customer',
        city: 'Montreal',
        state: 'Quebec',
        country: 'Canada',
        numberOfEmployees: 25000
    },
    opportunity: {
        id: '006XXXXXXXXXXXXXX',
        name: 'CN Railroad',
        type: 'New Business',
        stage: 'Discovery',
        amount: 500000,
        closeDate: '2025-07-31',
        ownerName: 'Sales Rep'
    }
};

async function testMiddlewareService() {
    const serviceUrl = process.env.SERVICE_URL || 'http://localhost:3000';
    
    console.log('Testing Magna Carta Middleware Service');
    console.log('Service URL:', serviceUrl);
    console.log('Test Data:', JSON.stringify(testData, null, 2));
    
    try {
        console.log('\n🚀 Sending document generation request...');
        
        const response = await axios.post(`${serviceUrl}/generate-document`, testData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 180000 // 3 minutes timeout
        });
        
        console.log('\n✅ Success! Response:');
        console.log(JSON.stringify(response.data, null, 2));
        
        if (response.data.success && response.data.downloadUrl) {
            console.log('\n📄 Document generated successfully!');
            console.log('Download URL:', response.data.downloadUrl);
            console.log('Personalized for:', response.data.personalizedFor);
            console.log('Opportunity:', response.data.opportunityName);
        }
        
    } catch (error) {
        console.error('\n❌ Error testing service:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        } else if (error.request) {
            console.error('No response received:', error.message);
        } else {
            console.error('Error:', error.message);
        }
    }
}

// Run the test
if (require.main === module) {
    testMiddlewareService();
}

module.exports = { testMiddlewareService, testData };