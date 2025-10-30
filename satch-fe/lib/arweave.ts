export async function uploadToArweave(reviewText: string): Promise<string> {
  // TODO: Replace with real Arweave upload via Bundlr or Arweave SDK.
  // For hackathon demo, mock a network delay and return a fake tx id.
  await new Promise((r) => setTimeout(r, 1000));
  return "FAKE_ARWEAVE_HASH_FOR_TESTING";
}


