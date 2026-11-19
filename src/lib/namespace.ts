import { createOffchainClient, ChainName } from "@thenamespace/offchain-manager";

let client: ReturnType<typeof createOffchainClient> | null = null;

function getClient() {
  if (client) return client;

  const apiKey = process.env.NAMESPACE_API_KEY;
  if (!apiKey) throw new Error("NAMESPACE_API_KEY not configured");

  client = createOffchainClient({
    mode: "mainnet",
    timeout: 10_000,
    defaultApiKey: apiKey,
  });

  return client;
}

interface SetNameParams {
  domain: string;
  name: string;
  address: string;
}

export async function setName({ domain, name, address }: SetNameParams) {
  const client = getClient();
  const fullName = `${name}.${domain}`;

  const { isAvailable } = await client.isSubnameAvailable(fullName);
  if (!isAvailable) {
    throw new Error(`${fullName} is already taken`);
  }

  return client.createSubname({
    label: name,
    parentName: domain,
    addresses: [{ chain: ChainName.Ethereum, value: address }],
    owner: address,
  });
}

export async function deleteName({
  domain,
  name,
}: {
  domain: string;
  name: string;
}) {
  const client = getClient();
  return client.deleteSubname(`${name}.${domain}`);
}

export async function getNames(domain: string, limit = 50) {
  const client = getClient();
  const page = await client.getFilteredSubnames({
    parentName: domain,
    page: 1,
    size: limit,
  });

  return page.items.map((item) => ({
    name: item.label,
    address: item.addresses?.["60"] ?? "",
  }));
}