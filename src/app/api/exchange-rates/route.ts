"use server";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Mock exchange rates for development/offline
const MOCK_RATES: Record<string, Record<string, number>> = {
  INR: {
    USD: 0.012,
    EUR: 0.011,
    GBP: 0.0095,
    AUD: 0.018,
    CAD: 0.016,
    SGD: 0.016,
    JPY: 1.3,
  },
  USD: {
    INR: 83.12,
    EUR: 0.92,
    GBP: 0.79,
    AUD: 1.52,
    CAD: 1.36,
    SGD: 1.34,
    JPY: 110.12,
  },
  EUR: {
    INR: 90.32,
    USD: 1.09,
    GBP: 0.86,
    AUD: 1.66,
    CAD: 1.48,
    SGD: 1.47,
    JPY: 119.95,
  },
};

// Helper to fetch from external API
async function fetchExternalRates(
  baseCurrency: string
): Promise<Record<string, number> | null> {
  try {
    const apiKey = process.env.EXCHANGE_RATES_API_KEY;
    if (!apiKey) {
      console.warn("EXCHANGE_RATES_API_KEY not set, using mock rates");
      return null;
    }

    const response = await fetch(
      `https://openexchangerates.org/api/latest?app_id=${apiKey}&base=${baseCurrency}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      console.error("Failed to fetch exchange rates from API");
      return null;
    }

    const data = await response.json();
    return data.rates || null;
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return null;
  }
}

// Parse query parameters for currency pairs
function parseCurrencyPairs(pairsStr: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  const pairList = pairsStr.split(",");

  for (const pair of pairList) {
    const [from, to] = pair.trim().split("-");
    if (from && to) {
      pairs.push([from.toUpperCase(), to.toUpperCase()]);
    }
  }

  return pairs;
}

// GET /api/exchange-rates - Get exchange rates
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const pairs = searchParams.get("pairs");

    let currencyPairs: Array<[string, string]> = [];

    if (pairs) {
      currencyPairs = parseCurrencyPairs(pairs);
    } else if (from && to) {
      currencyPairs = [[from.toUpperCase(), to.toUpperCase()]];
    } else {
      return NextResponse.json(
        { error: "Provide either 'from' and 'to' or 'pairs' parameter" },
        { status: 400 }
      );
    }

    if (currencyPairs.length === 0) {
      return NextResponse.json(
        { error: "Invalid currency pair format" },
        { status: 400 }
      );
    }

    const rates: Record<string, number> = {};
    const now = new Date();
    const cacheExpiry = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    for (const [fromCurrency, toCurrency] of currencyPairs) {
      // Check cache first
      const cached = await prisma.exchangeRate.findUnique({
        where: {
          fromCurrency_toCurrency: {
            fromCurrency,
            toCurrency,
          },
        },
      });

      if (cached && cached.lastUpdated > cacheExpiry) {
        // Use cached rate if fresh
        rates[`${fromCurrency}-${toCurrency}`] = cached.rate;
      } else {
        // Fetch new rate
        let rate: number | null = null;

        // Try external API first
        const externalRates = await fetchExternalRates(fromCurrency);
        if (externalRates && externalRates[toCurrency]) {
          rate = externalRates[toCurrency];
        } else if (MOCK_RATES[fromCurrency]?.[toCurrency]) {
          // Fall back to mock rates
          rate = MOCK_RATES[fromCurrency][toCurrency];
        }

        if (rate !== null) {
          // Update cache
          await prisma.exchangeRate.upsert({
            where: {
              fromCurrency_toCurrency: {
                fromCurrency,
                toCurrency,
              },
            },
            update: { 
              rate, 
              lastUpdated: now,
              expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000)
            },
            create: { 
              fromCurrency, 
              toCurrency, 
              rate,
              expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000)
            },
          });

          rates[`${fromCurrency}-${toCurrency}`] = rate;
        } else {
          return NextResponse.json(
            { error: `Exchange rate not found for ${fromCurrency}-${toCurrency}` },
            { status: 404 }
          );
        }
      }
    }

    return NextResponse.json({
      rates,
      timestamp: now,
      source: "cache_or_external_api",
    });
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 500 }
    );
  }
}

// POST /api/exchange-rates - Refresh exchange rates
export async function POST(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const refresh = searchParams.get("refresh") === "true";

    if (!refresh) {
      return NextResponse.json(
        { error: "Use ?refresh=true to force refresh" },
        { status: 400 }
      );
    }

    // Clear old cache entries (older than 24 hours)
    const cacheExpiry = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const deleted = await prisma.exchangeRate.deleteMany({
      where: {
        lastUpdated: {
          lt: cacheExpiry,
        },
      },
    });

    return NextResponse.json({
      message: "Cache refresh completed",
      deletedEntries: deleted.count,
    });
  } catch (error) {
    console.error("Error refreshing exchange rates cache:", error);
    return NextResponse.json(
      { error: "Failed to refresh cache" },
      { status: 500 }
    );
  }
}
