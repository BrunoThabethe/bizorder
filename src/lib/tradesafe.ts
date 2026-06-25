// Hardcoded verified BizOrder Nexus seller token — no need to fetch it.
export const TRADESAFE_SELLER_TOKEN = "33W5ORqo0XMiraZYNMKC3";

export const GET_MY_TOKEN = `
  query {
    apiProfile {
      name
      token
    }
  }
`;

export const CREATE_BUYER_TOKEN = `
  mutation tokenCreate(
    $givenName: String
    $familyName: String
    $email: Email
    $mobile: String
  ) {
    tokenCreate(
      input: {
        user: {
          givenName: $givenName
          familyName: $familyName
          email: $email
          mobile: $mobile
        }
      }
    ) {
      id
      name
    }
  }
`;
tradeSafeQuery(CREATE_TRANSACTION, {
  title,
  description,
  industry,
  value,
  buyerToken,
  sellerToken,
});

export const CREATE_TRANSACTION = `
  mutation transactionCreate(
    $title: String!
    $description: String!
    $industry: Industry!
    $value: Float
    $buyerToken: String
    $sellerToken: String
  ) {
    transactionCreate(
      input: {
        title: $title
        description: $description
        industry: $industry
        currency: ZAR
        feeAllocation: AGENT
        allocations: {
          create: [
            {
              title: $title
              description: $description
              value: $value
              daysToDeliver: 7
              daysToInspect: 7
            }
          ]
        }
        parties: {
          create: [
            { token: $buyerToken, role: BUYER }
            { token: $sellerToken, role: SELLER }
          ]
        }
      }
    ) {
      id
    }
  }
`;

export const GET_CHECKOUT_LINK = `
  mutation checkoutLink($id: ID!) {
    checkoutLink(transactionId: $id)
  }
`;

interface GraphQLError {
  message: string;
}

interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: GraphQLError[];
}

export async function tradeSafeQuery<T = unknown>(query: string, variables: object = {}): Promise<T> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("VITE_SUPABASE_URL is not configured");
  }

  if (!supabaseAnonKey) {
    throw new Error("VITE_SUPABASE_ANON_KEY is not configured");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/tradesafe-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(responseText || `HTTP error ${response.status}`);
  }

  const result = (await response.json()) as GraphQLResponse<T>;

  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }

  if (result.data === undefined) {
    throw new Error("No data returned from TradeSafe");
  }

  return result.data;
}
