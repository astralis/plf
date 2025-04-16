const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Sample API endpoint
app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello from Azure!' });
});

// Fallback to index.html for unmatched routes (e.g., for SPA routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Use Azure's assigned port (e.g., 8080) or 3000 for local development
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
