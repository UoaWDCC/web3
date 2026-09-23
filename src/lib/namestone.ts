import { createOffchainClient, ChainName } from "@thenamespace/offchain-manager";

const apiKey = process.env.NAMESPACE_API_KEY;
if (!apiKey) throw new Error("NAMESPACE_API_KEY not configured");

const client = createOffchainClient({
  mode: "mainnet",
  timeout: 10_000,
  defaultApiKey: apiKey,
});

interface SetNameParams {
  domain: string;
  name: string;
  address: string;
}

export async function setName({ domain, name, address }: SetNameParams) {
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
  return client.deleteSubname(`${name}.${domain}`);
}

export async function getNames(domain: string, limit = 50) {
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