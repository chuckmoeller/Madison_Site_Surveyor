
const MOCK_AI_LATENCY = 1500;
const MOCK_DB_LATENCY = 50;

async function mockProcessImage(id: number) {
  // console.log(`[AI] Processing image ${id}...`);
  await new Promise(resolve => setTimeout(resolve, MOCK_AI_LATENCY));
  return { id, data: `data_${id}` };
}

async function mockSaveSurvey(record: any) {
  // console.log(`[DB] Saving record ${record.id}...`);
  await new Promise(resolve => setTimeout(resolve, MOCK_DB_LATENCY));
}

async function sequentialProcess(images: number[]) {
  const start = Date.now();
  const results = [];
  for (const img of images) {
    const data = await mockProcessImage(img);
    const record = { id: img, data };
    await mockSaveSurvey(record);
    results.push(record);
  }
  const end = Date.now();
  return end - start;
}

async function parallelProcess(images: number[]) {
  const start = Date.now();
  const promises = images.map(async (img) => {
    const data = await mockProcessImage(img);
    const record = { id: img, data };
    await mockSaveSurvey(record);
    return record;
  });
  const results = await Promise.all(promises);
  const end = Date.now();
  return end - start;
}

async function run() {
  const images = [1, 2, 3];
  console.log(`Benchmarking with ${images.length} images...`);

  const seqTime = await sequentialProcess(images);
  console.log(`Sequential: ${seqTime}ms`);

  const parTime = await parallelProcess(images);
  console.log(`Parallel: ${parTime}ms`);

  const improvement = ((seqTime - parTime) / seqTime * 100).toFixed(2);
  console.log(`Improvement: ${improvement}%`);
}

run();
