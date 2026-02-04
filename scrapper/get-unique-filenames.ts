import { Glob } from "bun";

async function getUniqueFilenames() {
  const glob = new Glob("data-set-*.json");
  const uniqueFilenames = new Set<string>();
  const fileStats: { file: string; count: number }[] = [];

  for await (const file of glob.scan(".")) {
    const data = await Bun.file(file).json();

    const count = data.mp4Files?.length || 0;
    fileStats.push({ file, count });

    for (const mp4 of data.mp4Files || []) {
      uniqueFilenames.add(mp4.filename);
    }
  }

  console.log("=== Data Set Statistics ===\n");
  for (const stat of fileStats.sort((a, b) => a.file.localeCompare(b.file))) {
    console.log(`${stat.file}: ${stat.count} files`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total unique filenames: ${uniqueFilenames.size}`);

  // Save to file
  const sortedFilenames = Array.from(uniqueFilenames).sort();
  await Bun.write(
    "./unique-filenames.json",
    JSON.stringify(sortedFilenames, null, 2)
  );
  console.log(`\nSaved to: unique-filenames.json`);

  // Show first 10 and last 10
  console.log(`\nFirst 10 filenames:`);
  sortedFilenames.slice(0, 10).forEach(f => console.log(`  ${f}`));

  console.log(`\nLast 10 filenames:`);
  sortedFilenames.slice(-10).forEach(f => console.log(`  ${f}`));
}

getUniqueFilenames();
