const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { mkdir } = require('fs').promises; // Add mkdir
require('isomorphic-fetch');
const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello from Azure!' });
});

app.get('/api/lists', async (req, res) => {
    try {
        const credential = new ClientSecretCredential(
            process.env.GRAPH_TENANT_ID,
            process.env.GRAPH_CLIENT_ID,
            process.env.GRAPH_CLIENT_SECRET
        );
        const client = Client.initWithMiddleware({
            authProvider: {
                getAccessToken: async () => {
                    const token = await credential.getToken('https://graph.microsoft.com/.default');
                    return token.token;
                }
            }
        });
        const siteId = 'painterlawfirm.sharepoint.com,fdaf6079-2921-4594-bd21-e516b94e12dd,de73440f-f554-4997-b866-56e8d5c9cbba';
        const listId = '725b164b-8117-4f31-854f-688197be328b';
        const items = await client
            .api(`/sites/${siteId}/lists/${listId}/items?expand=fields($select=ID,Status,Track,AssignedTo,Title,First,Contact,Email,Condition_x0028_Now_x0029_,Created,Date,Notes,Author)&$top=10&$orderby=ID desc&$filter=fields/Created ge '2025-01-01T00:00:00Z'`)
            .get();
        
        const fetchedItems = items.value || [];
        console.log(`Fetched ${fetchedItems.length} items, latest ID: ${fetchedItems[0]?.fields?.ID}, Created: ${fetchedItems[0]?.fields?.Created}`);
        
        // Create /data directory if it doesn't exist
        const dataDir = path.join(__dirname, 'data');
        try {
            await mkdir(dataDir, { recursive: true });
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
        }
        
        await fs.writeFile(
            path.join(dataDir, 'lists.json'),
            JSON.stringify(fetchedItems, null, 2),
            'utf8'
        );
        
        res.json(fetchedItems);
    } catch (error) {
        console.error('Graph API error:', error.message, error.statusCode, error.body);
        res.status(500).json({ error: 'Failed to fetch list data', details: error.message });
    }
});

app.get('/data/lists.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'data', 'lists.json'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
