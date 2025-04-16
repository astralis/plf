const express = require('express');
const path = require('path');
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
        // Placeholder IDs - replace with yours
        const siteId = 'painterlawfirm.sharepoint.com,fdaf6079-2921-4594-bd21-e516b94e12dd,de73440f-f554-4997-b866-56e8d5c9cbba';
        const listId = '725b164b-8117-4f31-854f-688197be328b';
        const items = await client
            .api(`/sites/${siteId}/lists/${listId}/items?expand=fields`)
            .get();
        res.json(items.value);
    } catch (error) {
        console.error('Graph API error:', error);
        res.status(500).json({ error: 'Failed to fetch list data' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
