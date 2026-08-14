export const NAMESTONE_API_URL = "https://namestone.com/api/public_v1";

/**
 * NameStone has hung indefinitely on at least one endpoint before, which
 * stalls whichever admin request is waiting on it. Every call gets a timeout
 * so the route fails fast instead of never returning.
 */
const REQUEST_TIMEOUT_MS = 10_000;

const timeoutSignal = () => AbortSignal.timeout(REQUEST_TIMEOUT_MS);

/** Turns the runtime's generic abort error into something an admin can act on. */
function asNamestoneError(error: unknown) {
  if (error instanceof Error && error.name === "TimeoutError") {
    return new Error(
      `NameStone did not respond within ${REQUEST_TIMEOUT_MS / 1000}s`,
    );
  }
  return error;
}

interface SetNameParams {
  domain: string;
  name: string;
  address: string;
}

export async function setName({ domain, name, address }: SetNameParams) {
  const apiKey = process.env.NAMESTONE_API_KEY;
  if (!apiKey) throw new Error("NAMESTONE_API_KEY not configured");

  let response: Response;
  try {
    response = await fetch(`${NAMESTONE_API_URL}/set-name`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        domain,
        name,
        address,
      }),
      signal: timeoutSignal(),
    });
  } catch (error) {
    throw asNamestoneError(error);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NameStone API error: ${text}`);
  }

  return response.json();
}

export async function deleteName({
  domain,
  name,
}: {
  domain: string;
  name: string;
}) {
  const apiKey = process.env.NAMESTONE_API_KEY;
  if (!apiKey) throw new Error("NAMESTONE_API_KEY not configured");

  let response: Response;
  try {
    response = await fetch(`${NAMESTONE_API_URL}/delete-name`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        domain,
        name,
      }),
      signal: timeoutSignal(),
    });
  } catch (error) {
    throw asNamestoneError(error);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NameStone API error: ${text}`);
  }

  return response.json();
}

export async function getNames(domain: string, limit = 50) {
  const apiKey = process.env.NAMESTONE_API_KEY;
  if (!apiKey) throw new Error("NAMESTONE_API_KEY not configured");

  const url = new URL(`${NAMESTONE_API_URL}/get-names`);
  url.searchParams.append("domain", domain);
  url.searchParams.append("limit", limit.toString());

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: apiKey,
      },
      signal: timeoutSignal(),
    });
  } catch (error) {
    throw asNamestoneError(error);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NameStone API error: ${text}`);
  }

  return response.json();
}
