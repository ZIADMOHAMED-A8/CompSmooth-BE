
import { prisma } from "../../lib/prisma.ts";
import { AppError } from "../../utils/AppError.js";

function getFastApiBaseUrl() {
  const baseUrl =
    process.env.FAST_API_BACKEND_URL || process.env.fAST_API_BACKEND_URL;

  if (!baseUrl) {
    throw new AppError("FAST_API_BACKEND_URL is not configured.", 500);
  }

  return baseUrl.replace(/\/$/, "");
}

function getFastApiKey() {
  const apiKey = process.env.FAST_API_BACKEND_API_KEY;

  if (!apiKey) {
    throw new AppError("FAST_API_BACKEND_API_KEY is not configured.", 500);
  }

  return apiKey;
}

async function requestComps(input) {
  const response = await fetch(`${getFastApiBaseUrl()}/comps`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getFastApiKey(),
    },
    body: JSON.stringify(input),
  });

  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new AppError(
        "FastAPI comps backend returned invalid JSON.",
        502
      );
    }
  }

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      `FastAPI comps backend failed with status ${response.status}.`;

    throw new AppError(message, 502);
  }

  return data;
}

function parseAddressParts(address) {
  const parts = address.split(",").map((part) => part.trim());

  const city = parts.at(-2);
  const stateZip = parts.at(-1) || "";
  const [state, zip] = stateZip.split(/\s+/);

  return {
    city,
    state,
    zip,
  };
}

function toNumber(value, fieldName) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new AppError(
      `FastAPI comps response is missing valid property field: ${fieldName}.`,
      502
    );
  }

  return number;
}

function toString(value, fieldName) {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new AppError(
      `FastAPI comps response is missing valid property field: ${fieldName}.`,
      502
    );
  }

  return value.trim();
}

function buildPropertyData(input, compsResult) {
  const property = compsResult.subject;
  const addressParts = parseAddressParts(input.address);

  return {
    propertyId: toString(
      property.property_id,
      "property_id"
    ),

    address: toString(
      compsResult.address,
      "address"
    ),

    city: toString(
      addressParts.city,
      "city"
    ),

    state: toString(
      addressParts.state,
      "state"
    ),

    zip: toString(
      addressParts.zip,
      "zip"
    ),

    latitude: toNumber(
      property.latitude,
      "latitude"
    ),

    longitude: toNumber(
      property.longitude,
      "longitude"
    ),

    beds: Math.round(
      toNumber(property.beds, "beds")
    ),

    baths: toNumber(
      property.baths,
      "baths"
    ),

    sqft: Math.round(
      toNumber(property.sqft, "sqft")
    ),

    year_bulit: Math.round(
      toNumber(property.year_built, "year_built")
    ),

    property_type: "single_family",
  };
}

export async function runComps(req, res) {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError(
      "Authentication token is required.",
      401
    );
  }

  const compsResult = await requestComps(req.body);

  const propertyData = buildPropertyData(
    req.body,
    compsResult
  );
  console.log(propertyData)

 const [property] = await prisma.$transaction([
  prisma.properties.upsert({
    where: {
      propertyId_provider: {
        propertyId: propertyData.propertyId,
        provider: propertyData.provider ?? "REALTOR",
      },
    },
    update: {},
    create: propertyData,
  }),

  prisma.usage_logs.create({
    data: {
      userId,
    },
  }),
]);

  res.status(201).json({
    success: true,
    data: {
      property,
      comps: compsResult,
    },
  });
}