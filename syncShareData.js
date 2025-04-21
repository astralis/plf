const fs = require('fs').promises;
const path = require('path');
const { ClientSecretCredential } = require('@azure/identity');

const baseUrl = 'https://graph.microsoft.com/v1.0/sites/painterlawfirm.sharepoint.com,fdaf6079-2921-4594-bd21-e516b94e12dd,de73440f-f554-4997-b866-56e8d5c9cbba/lists/725b164b-8117-4f31-854f-688197be328b/items';
const batchSize = 100;
const dataDir = './data';

async function getAccessToken() {
  try {
    const credential = new ClientSecretCredential(
      process.env.GRAPH_TENANT_ID,
      process.env.GRAPH_CLIENT_ID,
      process.env.GRAPH_CLIENT_SECRET
    );
    const token = await credential.getToken('https://graph.microsoft.com/.default');
    return token.token;
  } catch (err) {
    throw new Error('Failed to acquire token: ' + err.message);
  }
}

async function ensureDataDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (err) {
    console.error('Error creating data directory:', err);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAllItems() {
  const accessToken = await getAccessToken();
  let query = `${baseUrl}?expand=fields($select=ID,Status,Track,AssignedTo,Title,First,Contact,Email,Condition_x0028_Now_x0029_,Created,Date,Notes,Author)&$top=${batchSize}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };

  let allItems = [];
  let requestCount = 0;

  while (query) {
    console.log(`Fetching batch ${requestCount + 1}...`);
    try {
      const response = await fetch(query, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      const data = await response.json();
      allItems.push(...data.value);
      query = data['@odata.nextLink'] || null;
      requestCount++;
      if (query) await delay(500);
    } catch (err) {
      console.error('Error fetching batch:', err.message);
      break;
    }
  }

  console.log(`Fetched ${allItems.length} items.`);
  return allItems;
}

async function organizeItems(items) {
  await ensureDataDir();
  let index = {};
  try {
    index = JSON.parse(await fs.readFile('list_data_index.json', 'utf8'));
  } catch (err) {
    console.log('No index file, creating new.');
  }

  for (const item of items) {
    const fields = item.fields;
    const id = fields.ID;
    const created = new Date(fields.Created);
    const yearMonth = created.toISOString().slice(0, 7);
    const fileName = path.join(dataDir, `${yearMonth}.json`);

    index[id] = { file: fileName, ID: id };
    let monthlyData = {};
    try {
      monthlyData = JSON.parse(await fs.readFile(fileName, 'utf8'));
    } catch (err) {
      console.log(`No data for ${yearMonth}, creating new file.');
    }

    monthlyData[id] = fields;
    await fs.writeFile(fileName, JSON.stringify(monthlyData, null, 2));
  }

  await fs.writeFile('list_data_index.json', JSON.stringify(index, null, 2));
  console.log('Updated index and monthly files.');
}

async function syncAllData() {
  try {
    const items = await fetchAllItems();
    await organizeItems(items);
    console.log('Data sync completed.');
  } catch (err) {
    console.error('Sync failed:', err.message, err.stack);
  }
}

syncAllData();
