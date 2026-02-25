import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export interface ISCData {
  values: (string | number)[][];
}

export interface EFSData {
  values: (string | number)[][];
}

export const processNameplate = async (base64Images: string[]): Promise<ISCData> => {
  const model = "gemini-3-flash-preview";
  
  const imageParts = base64Images.map(img => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: img.split(',')[1] || img
    }
  }));

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          ...imageParts,
          {
            text: `You are the Lead Data Architect for American Energy Solutions. Your task is to transform unstructured industrial site survey images and text into a JSON schema specifically designed for the Microsoft Graph API Excel Workbooks endpoint.

PRIORITIZE LABEL DATA: Your primary objective is to extract technical specifications (Model, Serial, Voltage, etc.) directly from the physical labels or nameplates. However, you must also analyze the entire image area to identify the unit's overall category, physical condition, and surrounding environment features. Use the "Observations" field to describe these non-label details.

Output Format:
Always return a JSON object with a values array of arrays. Each inner array must represent one row in the 'Project Profile' table.

Schema:
{"values": [["Site_Name", "Category", "Subcategory", "Manufacturer", "Model", "Serial", "Year", "Voltage", "Phase", "Amperage", "Capacity", "Fan_RLA", "Compressor_RLA", "FLA", "LRA", "Indoor_Fan", "Outdoor_Fan", "Manual_Link", "Observations"]]}

Ensure all technical specs (Voltages, BTUs, Amperage, RLA, FLA, LRA) are formatted as numbers, not strings, to enable Excel formulas to work immediately upon submission.

CLASSIFICATION LOGIC:
1. Identify the CATEGORY: "HVAC", "Cold Storage", or "Electrical".
2. Identify the SUBCATEGORY based on the Madison Template:
   - HVAC: "RTU-Thermostat", "Roof Top Units", "Split Systems", "Split System - Thermostat", "Ptacs-Vtacs", "Ptac - Thermostats", "Boiler", "Chiller"
   - Cold Storage: "Walk in Coolers", "Beverage Coolers"
   - Electrical: "Main Electrical Panel", "Sub Panels"`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      safetySettings,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          values: {
            type: Type.ARRAY,
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING, // We'll handle number conversion in the prompt or post-processing if needed, but Gemini 3 can handle mixed types if we describe it. Actually Type.STRING is safer for the schema if we want to be strict, but the prompt asks for numbers.
              }
            }
          }
        },
        required: ["values"]
      }
    }
  });

  const data = JSON.parse(response.text || "{\"values\": []}");
  return data;
};

export const processRoofImage = async (base64Images: string[]): Promise<EFSData> => {
  const model = "gemini-3-flash-preview";
  
  const imageParts = base64Images.map(img => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: img.split(',')[1] || img
    }
  }));

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          ...imageParts,
          {
            text: `You are the Lead Data Architect for American Energy Solutions. Your task is to transform unstructured industrial site survey images and text into a JSON schema specifically designed for the Microsoft Graph API Excel Workbooks endpoint.

PRIORITIZE LABEL DATA: If any labels, tags, or markings are visible on the roofing materials or equipment, prioritize extracting information from them. However, always analyze the entire image area to identify materials, defects, and features, even if no label is present.

Output Format:
Always return a JSON object with a values array of arrays. Each inner array must represent one row in the 'Project Profile' table.

Schema:
{"values": [["Site_Name", "Category", "Subcategory", "Material", "Defects", "Features", "Classification"]]}

Ensure all technical specs are formatted as numbers where applicable.

CLASSIFICATION LOGIC:
1. CATEGORY is always "Roofing".
2. Identify the SUBCATEGORY based on the Madison Template:
   - "Start Here-Roof Assessment"
   - "Sky Lights"
   - "Drains"
   - "Debris"
   - "Ponding Water"`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      safetySettings,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          values: {
            type: Type.ARRAY,
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              }
            }
          }
        },
        required: ["values"]
      }
    }
  });

  const data = JSON.parse(response.text || "{\"values\": []}");
  return data;
};
