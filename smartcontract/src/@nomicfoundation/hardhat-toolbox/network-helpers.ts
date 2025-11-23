// Re-export loadFixture to match the expected import path
import hre from "hardhat";

// Simple loadFixture implementation using Hardhat's network helpers
const fixtureCache = new Map();

export async function loadFixture<T>(fixture: () => Promise<T>): Promise<T> {
  const fixtureName = fixture.name || "anonymous";
  const { networkHelpers } = await hre.network.connect();

  if (fixtureCache.has(fixtureName)) {
    const snapshot = fixtureCache.get(fixtureName);
    await snapshot.restore();
    return snapshot.data;
  }

  const data = await fixture();
  const restorer = await networkHelpers.takeSnapshot();
  fixtureCache.set(fixtureName, { data, restorer });

  return data;
}

