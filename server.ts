import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import { google } from "googleapis";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_SHEET_ID = process.env.TEMPLATE_SHEET_ID || "1dxIqh9ShWimPI1186uH7tZ1SJUPQqc8LtOcngI902Go";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  
  console.log("Checking Google Service Account configuration...");
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    console.log("✅ Google Service Account configured:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  } else {
    console.warn("❌ Google Service Account NOT configured. Sheets integration will be disabled.");
  }

  app.use(session({
    secret: process.env.SESSION_SECRET || "madison-energy-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: true, 
      sameSite: 'none',
      httpOnly: true 
    }
  }));

  // Initialize Service Account Auth
  const getGoogleAuth = (): any => {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let key = process.env.GOOGLE_PRIVATE_KEY;

    if (!email || !key) {
      throw new Error("Google Service Account credentials missing (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY)");
    }

    // 1. Handle JSON input (if user pasted the whole service account file)
    if (key.trim().startsWith('{')) {
      try {
        const serviceAccount = JSON.parse(key);
        if (serviceAccount.private_key && serviceAccount.client_email) {
          console.log("[Google Auth] Using credentials from JSON input");
          const auth = google.auth.fromJSON(serviceAccount);
          (auth as any).scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'];
          return auth;
        }
        if (serviceAccount.private_key) {
          key = serviceAccount.private_key;
        }
      } catch (e) {
        console.warn("[Google Auth] Failed to parse GOOGLE_PRIVATE_KEY as JSON, treating as string");
      }
    }

    // 2. Clean up the string for environment variable issues
    // Handle literal \n characters and other common escaping issues
    key = key.replace(/\\n/g, '\n');
    // Remove surrounding quotes and trim
    key = key.trim().replace(/^["']|["']$/g, '');

    // 3. Ensure proper PEM formatting
    // If it's already a valid-looking PEM, we might just need to ensure newlines are correct
    if (key.includes('-----BEGIN')) {
      // Extract the header, footer and the content between them
      const lines = key.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const beginIndex = lines.findIndex(l => l.startsWith('-----BEGIN'));
      const endIndex = lines.findIndex(l => l.startsWith('-----END'));

      if (beginIndex !== -1 && endIndex !== -1) {
        const header = lines[beginIndex];
        const footer = lines[endIndex];
        const content = lines.slice(beginIndex + 1, endIndex).join('');
        // Re-wrap content at 64 chars
        const wrappedContent = content.match(/.{1,64}/g)?.join('\n') || content;
        key = `${header}\n${wrappedContent}\n${footer}\n`;
      }
    } else {
      // If no headers, assume it's the base64 body and add PKCS#8 headers
      const content = key.replace(/\s/g, '');
      const wrappedContent = content.match(/.{1,64}/g)?.join('\n') || content;
      key = `-----BEGIN PRIVATE KEY-----\n${wrappedContent}\n-----END PRIVATE KEY-----\n`;
    }

    // 4. Final validation check using Node's crypto module
    try {
      crypto.createPrivateKey(key);
      console.log("[Google Auth] Private key validated successfully");
    } catch (err: any) {
      console.error("[Google Auth] Private key validation failed:", err.message);
      console.error("[Google Auth] Key start:", key.substring(0, 50));
    }

    try {
      return new google.auth.JWT({
        email,
        key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file']
      });
    } catch (err: any) {
      console.error("Failed to create Google JWT client:", err.message);
      throw err;
    }
  };

  // Google Status Route (now checks if server is configured)
  app.get("/api/google/status", (req, res) => {
    res.json({ 
      connected: !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY),
      mode: 'service_account'
    });
  });

  // Create and Setup New Sheet
  app.post("/api/google/setup-sheet", async (req, res) => {
    const { boardName } = req.body;
    if (!boardName) return res.status(400).json({ error: "Board name required" });

    try {
      console.log(`Attempting to copy template sheet: ${TEMPLATE_SHEET_ID} for board: ${boardName}`);
      const auth = getGoogleAuth();
      const drive = google.drive({ version: 'v3', auth: auth as any });
      const sheets = google.sheets({ version: 'v4', auth: auth as any });

      // 1. Copy the template
      const copy = await drive.files.copy({
        fileId: TEMPLATE_SHEET_ID,
        requestBody: {
          name: boardName, // Named exactly as the Monday board ID
        }
      });

      const spreadsheetId = copy.data.id;

      // 2. Ensure headers are correct (optional if template is already set up)
      const headers = [
        "Timestamp", "Category", "Subcategory", "Manufacturer", "Model", "Serial", 
        "Year", "Voltage", "Phase", "Amperage", "Capacity", 
        "Fan RLA", "Compressor RLA", "FLA", "LRA", "Indoor Fan", "Outdoor Fan", "AI Observations", "Notes"
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId!,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers]
        }
      });

      res.json({ spreadsheetId });
    } catch (error: any) {
      console.error("Google Sheets Setup Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Sync Monday Data to Sheet
  app.post("/api/google/sync-monday-to-sheet", async (req, res) => {
    const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
    if (!MONDAY_API_KEY) return res.status(500).json({ error: "Monday API Key missing" });

    const { spreadsheetId, boardId } = req.body;
    if (!spreadsheetId || !boardId) return res.status(400).json({ error: "Missing spreadsheetId or boardId" });

    try {
      const auth = getGoogleAuth();
      const sheets = google.sheets({ version: 'v4', auth: auth as any });
      // 1. Fetch all items and subitems from Monday
      const query = `
        query ($boardId: [ID!]) {
          boards (ids: $boardId) {
            items_page (limit: 100) {
              items {
                id
                name
                column_values {
                  id
                  text
                }
                subitems {
                  id
                  name
                  column_values {
                    id
                    text
                  }
                }
              }
            }
          }
        }
      `;

      const mondayRes = await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": MONDAY_API_KEY,
          "API-Version": "2023-10"
        },
        body: JSON.stringify({ query, variables: { boardId: [boardId] } })
      });

      const mondayData = await mondayRes.json();
      const items = mondayData.data?.boards?.[0]?.items_page?.items || [];

      // 2. Flatten and parse data
      const rows: any[][] = [];
      
      const processItem = (item: any) => {
        const textCol = item.column_values.find((c: any) => c.id === 'text');
        if (!textCol?.text) return;

        try {
          const data = JSON.parse(textCol.text);
          rows.push([
            new Date().toLocaleString(), // We don't have original timestamp in Monday column usually, using current
            data.category || '',
            data.subcategory || '',
            data.manufacturer || data.material || '',
            data.modelNumber || '',
            data.serialNumber || '',
            data.year || '',
            data.voltage || '',
            data.phase || '',
            data.amperage || '',
            data.capacity || '',
            data.fanRLA || '',
            data.compressorRLA || '',
            data.fla || '',
            data.lra || '',
            data.indoorFan || '',
            data.outdoorFan || '',
            data.observations || '',
            item.name // Using item name as notes/detail
          ]);
        } catch (e) {
          console.error("Failed to parse Monday data for item", item.id);
        }
      };

      items.forEach((item: any) => {
        processItem(item);
        if (item.subitems) {
          item.subitems.forEach((sub: any) => processItem(sub));
        }
      });

      // 3. Clear existing data (except headers) and write new rows
      if (rows.length > 0) {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: 'Sheet1!A2:Z1000'
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'Sheet1!A2',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: rows
          }
        });
      }

      res.json({ success: true, count: rows.length });
    } catch (error: any) {
      console.error("Sync to Sheet Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Check configuration status
  app.get("/api/monday/config", (req, res) => {
    res.json({
      hasApiKey: !!process.env.MONDAY_API_KEY,
      hasDefaultBoard: !!process.env.MONDAY_BOARD_ID
    });
  });

  // Verify a specific board ID
  app.get("/api/monday/verify-board/:boardId", async (req, res) => {
    const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
    if (!MONDAY_API_KEY) return res.status(500).json({ error: "No API Key" });

    const boardId = req.params.boardId;
    const query = `query ($boardId: [ID!]) { boards (ids: $boardId) { name } }`;

    try {
      const response = await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": MONDAY_API_KEY,
          "API-Version": "2023-10"
        },
        body: JSON.stringify({ query, variables: { boardId: [boardId] } })
      });
      const data = await response.json();
      if (data.data?.boards?.[0]) {
        res.json({ name: data.data.boards[0].name });
      } else {
        res.status(404).json({ error: "Board not found" });
      }
    } catch (err) {
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Monday.com API Proxy
  app.post("/api/monday/push", async (req, res) => {
    const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
    const ENV_BOARD_ID = process.env.MONDAY_BOARD_ID;

    if (!MONDAY_API_KEY) {
      return res.status(500).json({ 
        error: "Monday.com API Key (MONDAY_API_KEY) is missing from Secrets. Please add it in the Secrets panel and restart the server." 
      });
    }

    const { itemName, columnValues, boardId, notes, images, parentItemId, existingItemId } = req.body;
    const targetBoardId = (boardId || ENV_BOARD_ID)?.toString().trim();

    if (!targetBoardId && !existingItemId) {
      return res.status(400).json({ error: "Monday Board ID or Existing Item ID is required" });
    }

    try {
      let itemId = existingItemId;

      if (!itemId) {
        // Use create_subitem if parentItemId is provided, otherwise create_item
        const mutation = parentItemId ? `
          mutation ($parentItemId: ID!, $itemName: String!, $columnValues: JSON!) {
            create_subitem (parent_item_id: $parentItemId, item_name: $itemName, column_values: $columnValues) {
              id
            }
          }
        ` : `
          mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
            create_item (board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
              id
            }
          }
        `;

        const response = await fetch("https://api.monday.com/v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": MONDAY_API_KEY,
            "API-Version": "2023-10"
          },
          body: JSON.stringify({
            query: mutation,
            variables: {
              boardId: targetBoardId,
              parentItemId,
              itemName,
              columnValues: JSON.stringify(columnValues)
            }
          })
        });

        const data = await response.json();
        
        if (data.errors) {
          return res.status(400).json({ error: data.errors[0].message });
        }

        itemId = parentItemId ? data.data.create_subitem.id : data.data.create_item.id;
      }

      // Create a rich update with extraction results and notes
      if (itemId) {
        let updateBody = notes || "New survey captured.";
        
        // Add extraction results to the update body for visibility
        if (columnValues.text) {
          try {
            const extracted = JSON.parse(columnValues.text);
            const tableRows = Object.entries(extracted)
              .map(([key, val]) => `<b>${key.toUpperCase()}:</b> ${val}`)
              .join("<br/>");
            updateBody = `<h3>Extraction Results</h3>${tableRows}<br/><br/><h3>Field Notes</h3>${updateBody}`;
          } catch (e) {
            // Fallback if parsing fails
          }
        }

        const createUpdateQuery = `
          mutation ($itemId: ID!, $body: String!) {
            create_update (item_id: $itemId, body: $body) {
              id
            }
          }
        `;

        const updateResponse = await fetch("https://api.monday.com/v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": MONDAY_API_KEY,
            "API-Version": "2023-10"
          },
          body: JSON.stringify({
            query: createUpdateQuery,
            variables: { itemId, body: updateBody }
          })
        });

        const updateData = await updateResponse.json();
        const updateId = updateData.data?.create_update?.id;

        // ⚡ BOLT OPTIMIZATION: Upload images in parallel for faster synchronization (O(N) -> O(1) network-wise)
        if (images && Array.isArray(images) && images.length > 0 && updateId) {
          await Promise.allSettled(images.map(async (image, i) => {
            try {
              // Convert base64 to Buffer
              const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
              const buffer = Buffer.from(base64Data, 'base64');
              
              const formData = new FormData();
              const query = `mutation ($file: File!) { add_file_to_update (update_id: ${updateId}, file: $file) { id } }`;
              
              formData.append('query', query);
              
              // Create a blob-like object for fetch
              const blob = new Blob([buffer], { type: 'image/jpeg' });
              formData.append('variables[file]', blob, `survey_image_${i + 1}.jpg`);

              const response = await fetch("https://api.monday.com/v2/file", {
                method: "POST",
                headers: {
                  "Authorization": MONDAY_API_KEY
                },
                body: formData
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.errors?.[0]?.message || `HTTP ${response.status}`);
              }
            } catch (imgErr) {
              console.error(`Image ${i + 1} upload failed:`, imgErr);
              throw imgErr; // Propagate for Promise.allSettled
            }
          }));
        }
      }

      res.json({ success: true, itemId });
    } catch (error) {
      console.error("Monday.com API Error:", error);
      res.status(500).json({ error: "Failed to push to Monday.com" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
