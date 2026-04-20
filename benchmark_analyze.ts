
async function mockProcessImage(id: number) {
  // Simulate Gemini AI processing latency
  await new Promise(resolve => setTimeout(resolve, 1500));
  return { id, data: `Result for image ${id}` };
}

async function mockSaveToDB(data: any) {
  // Simulate local IndexedDB save latency
  await new Promise(resolve => setTimeout(resolve, 50));
  return true;
}

async function runSequential(images: number[]) {
  console.log(`Running sequential for ${images.length} images...`);
  const start = Date.now();
  const results = [];
  for (const img of images) {
    const aiResult = await mockProcessImage(img);
    await mockSaveToDB(aiResult);
    results.push(aiResult);
  }
  const end = Date.now();
  console.log(`Sequential took: ${end - start}ms`);
  return end - start;
}

async function runParallel(images: number[]) {
  console.log(`Running parallel for ${images.length} images...`);
  const start = Date.now();
  const results = await Promise.all(images.map(async (img) => {
    const aiResult = await mockProcessImage(img);
    await mockSaveToDB(aiResult);
    return aiResult;
  }));
  const end = Date.now();
  console.log(`Parallel took: ${end - start}ms`);
  return end - start;
}

async function main() {
  const images = [1, 2, 3];
  const seqTime = await runSequential(images);
  const parTime = await runParallel(images);

  const improvement = ((seqTime - parTime) / seqTime * 100).toFixed(2);
  console.log(`\nPerformance improvement: ${improvement}%`);
}

main();
